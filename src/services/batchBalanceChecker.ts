import { ethers } from 'ethers';
import { BalanceChecker, BalanceResult } from './balanceChecker';

interface CachedBalance {
  result: BalanceResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface QueueItem {
  chain: string;
  address: string;
  resolve: (result: BalanceResult) => void;
  reject: (error: Error) => void;
}

export class BatchBalanceChecker {
  private static cache = new Map<string, CachedBalance>();
  private static queue = new Map<string, QueueItem[]>(); // Group by chain
  private static isProcessing = new Map<string, boolean>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly BATCH_SIZE = 3; // Process 3 addresses per batch (reduced for stability)
  private static readonly BATCH_DELAY = 3000; // 3 seconds between batches (increased)
  private static readonly RATE_LIMIT_DELAY = 1500; // 1.5 seconds between individual requests
  private static readonly MAX_RETRIES = 2; // Maximum retries per request
  private static readonly EXPONENTIAL_BACKOFF_BASE = 1000; // Base delay for exponential backoff

  /**
   * Get cached balance or queue for batch processing
   */
  static async getBalance(chain: string, address: string): Promise<BalanceResult> {
    const cacheKey = `${chain}:${address}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${chain}:${address}`);
      return cached.result;
    }

    // Return promise that will be resolved when batch processes
    return new Promise((resolve, reject) => {
      const queueKey = chain;
      
      if (!this.queue.has(queueKey)) {
        this.queue.set(queueKey, []);
      }
      
      this.queue.get(queueKey)!.push({
        chain,
        address,
        resolve,
        reject
      });

      // Start processing if not already processing
      if (!this.isProcessing.get(queueKey)) {
        this.processBatch(queueKey);
      }
    });
  }

  /**
   * Process queued balance checks in batches
   */
  private static async processBatch(queueKey: string) {
    this.isProcessing.set(queueKey, true);
    
    try {
      while (this.queue.has(queueKey) && this.queue.get(queueKey)!.length > 0) {
        const batch = this.queue.get(queueKey)!.splice(0, this.BATCH_SIZE);
        
        console.log(`Processing batch of ${batch.length} addresses for ${queueKey}`);
        
        // Process batch with delays and retry logic
        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          
          let lastError: Error | null = null;
          let success = false;
          
          // Retry with exponential backoff
          for (let retry = 0; retry <= this.MAX_RETRIES && !success; retry++) {
            try {
              if (retry > 0) {
                const backoffDelay = this.EXPONENTIAL_BACKOFF_BASE * Math.pow(2, retry - 1);
                console.log(`Retry ${retry} for ${item.chain}:${item.address} after ${backoffDelay}ms`);
                await this.delay(backoffDelay);
              }
              
              const result = await BalanceChecker.checkBalance(item.chain, item.address);
              
              // Cache the result
              this.cacheResult(item.chain, item.address, result);
              
              // Resolve the promise
              item.resolve(result);
              success = true;
              
            } catch (error) {
              lastError = error as Error;
              console.warn(`Attempt ${retry + 1} failed for ${item.chain}:${item.address}:`, error);
              
              // Check if it's a rate limiting error
              if (this.isRateLimitError(error)) {
                console.log(`Rate limit detected, increasing delay...`);
                await this.delay(this.RATE_LIMIT_DELAY * 2); // Double the delay for rate limits
              }
            }
          }
          
          // If all retries failed, reject the promise
          if (!success && lastError) {
            console.error(`All retries failed for ${item.chain}:${item.address}`, lastError);
            item.reject(lastError);
          }
          
          // Add delay between requests to avoid rate limiting
          if (i < batch.length - 1) {
            await this.delay(this.RATE_LIMIT_DELAY);
          }
        }
        
        // Delay between batches
        if (this.queue.get(queueKey)!.length > 0) {
          console.log(`Waiting ${this.BATCH_DELAY}ms before next batch...`);
          await this.delay(this.BATCH_DELAY);
        }
      }
    } finally {
      this.isProcessing.set(queueKey, false);
    }
  }

  /**
   * Use multicall for EVM chains to batch multiple balance checks in a single call
   */
  static async getBalancesBatch(requests: Array<{ chain: string; address: string }>): Promise<BalanceResult[]> {
    // Group by chain for efficient processing
    const chainGroups = new Map<string, string[]>();
    
    requests.forEach(({ chain, address }) => {
      if (!chainGroups.has(chain)) {
        chainGroups.set(chain, []);
      }
      chainGroups.get(chain)!.push(address);
    });

    const results: BalanceResult[] = [];
    
    for (const [chain, addresses] of chainGroups) {
      if (this.isEVMChain(chain)) {
        // Use multicall for EVM chains
        const batchResults = await this.getEVMBalancesBatch(chain, addresses);
        results.push(...batchResults);
      } else {
        // Process non-EVM chains individually with rate limiting
        for (const address of addresses) {
          try {
            const result = await this.getBalance(chain, address);
            results.push(result);
          } catch (error) {
            console.error(`Failed to get balance for ${chain}:${address}`, error);
            results.push({
              chain,
              address,
              balance: '0',
              formattedBalance: '0',
              symbol: chain,
              lastChecked: new Date(),
              error: (error as Error).message,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Use multicall contract to batch balance checks for EVM chains
   */
  private static async getEVMBalancesBatch(chain: string, addresses: string[]): Promise<BalanceResult[]> {
    const rpcUrls = this.getDefaultRpcs();
    const rpcUrlArray = rpcUrls[chain];
    
    if (!rpcUrlArray || rpcUrlArray.length === 0) {
      throw new Error(`No RPC URLs configured for ${chain}`);
    }

    let provider: ethers.JsonRpcProvider | null = null;
    let lastError: Error | null = null;

    // Try each RPC URL until one works
    for (const rpcUrl of rpcUrlArray) {
      try {
        console.log(`Trying RPC for ${chain}: ${rpcUrl}`);
        provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Test the connection with a simple call
        await provider.getNetwork();
        console.log(`✅ Successfully connected to ${chain} via ${rpcUrl}`);
        break;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${chain} via ${rpcUrl}:`, error);
        lastError = error as Error;
        provider = null;
      }
    }

    if (!provider) {
      throw new Error(`All RPC URLs failed for ${chain}. Last error: ${lastError?.message}`);
    }
    
    try {
      // Use eth_getBalance in a batch request for better efficiency
      const balancePromises = addresses.map(async (address) => {
        try {
          const balance = await provider.getBalance(address);
          const formattedBalance = ethers.formatEther(balance);
          
          const result: BalanceResult = {
            chain,
            address,
            balance: balance.toString(),
            formattedBalance,
            symbol: this.getSymbol(chain),
            lastChecked: new Date(),
          };
          
          // Cache the result
          this.cacheResult(chain, address, result);
          
          return result;
        } catch (error) {
          console.error(`Failed to get balance for ${address} on ${chain}:`, error);
          return {
            chain,
            address,
            balance: '0',
            formattedBalance: '0',
            symbol: this.getSymbol(chain),
            lastChecked: new Date(),
            error: (error as Error).message,
          };
        }
      });

      return await Promise.all(balancePromises);
    } catch (error) {
      console.error(`Batch balance check failed for ${chain}:`, error);
      throw error;
    }
  }

  /**
   * Cache balance result
   */
  private static cacheResult(chain: string, address: string, result: BalanceResult) {
    const cacheKey = `${chain}:${address}`;
    const ttl = result.error ? 30000 : this.CACHE_TTL; // Cache errors for only 30 seconds
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  static clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  static getCacheStats() {
    const now = Date.now();
    const valid = Array.from(this.cache.values()).filter(
      cached => now - cached.timestamp < cached.ttl
    ).length;
    
    return {
      total: this.cache.size,
      valid,
      expired: this.cache.size - valid
    };
  }

  /**
   * Helper methods
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code;
    
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('429') ||
      errorCode === 429 ||
      errorCode === 'NETWORK_ERROR' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('throttled')
    );
  }

  private static isEVMChain(chain: string): boolean {
    return [
      'ETH', 'BSC', 'POLYGON', 'AVALANCHE', 'ARBITRUM', 'OPTIMISM', 'BASE',
      'FANTOM', 'CRONOS', 'CELO', 'LINEA', 'METIS', 'GNOSIS', 'MOONBEAM',
      'MOONRIVER', 'SCROLL', 'ZKSYNC', 'BLAST', 'ETH_SEPOLIA', 'ETH_GOERLI',
      'BSC_TESTNET', 'POLYGON_MUMBAI', 'AVALANCHE_FUJI', 'ARBITRUM_SEPOLIA',
      'OPTIMISM_SEPOLIA', 'BASE_SEPOLIA', 'LINEA_SEPOLIA', 'SCROLL_SEPOLIA',
      'ZKSYNC_SEPOLIA', 'BLAST_SEPOLIA'
    ].includes(chain);
  }

  private static getDefaultRpcs(): Record<string, string[]> {
    return {
      // Mainnet - Multiple fallback URLs for reliability
      ETH: [
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com',
        'https://eth.llamarpc.com',
        'https://cloudflare-eth.com'
      ],
      BSC: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org', 
        'https://rpc.ankr.com/bsc',
        'https://bsc.publicnode.com'
      ],
      POLYGON: [
        'https://polygon-rpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon.llamarpc.com',
        'https://polygon.publicnode.com'
      ],
      AVALANCHE: [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche',
        'https://avax.meowrpc.com',
        'https://avalanche.publicnode.com'
      ],
      ARBITRUM: [
        'https://arb1.arbitrum.io/rpc',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum.llamarpc.com',
        'https://arbitrum.publicnode.com'
      ],
      OPTIMISM: [
        'https://mainnet.optimism.io',
        'https://rpc.ankr.com/optimism',
        'https://optimism.llamarpc.com',
        'https://optimism.publicnode.com'
      ],
      BASE: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base.publicnode.com'
      ],
      FANTOM: [
        'https://rpc.ftm.tools',
        'https://rpc.ankr.com/fantom',
        'https://fantom.publicnode.com'
      ],
      CRONOS: [
        'https://evm.cronos.org',
        'https://cronos.w3node.com'
      ],
      CELO: [
        'https://forno.celo.org',
        'https://rpc.ankr.com/celo'
      ],
      LINEA: [
        'https://rpc.linea.build',
        'https://linea.blockpi.network/v1/rpc/public'
      ],
      METIS: [
        'https://andromeda.metis.io',
        'https://metis.api.onfinality.io/public'
      ],
      GNOSIS: [
        'https://rpc.gnosischain.com',
        'https://gnosis.publicnode.com'
      ],
      MOONBEAM: [
        'https://rpc.api.moonbeam.network',
        'https://moonbeam.publicnode.com'
      ],
      MOONRIVER: [
        'https://rpc.api.moonriver.moonbeam.network',
        'https://moonriver.publicnode.com'
      ],
      SCROLL: [
        'https://rpc.scroll.io',
        'https://scroll.blockpi.network/v1/rpc/public'
      ],
      ZKSYNC: [
        'https://mainnet.era.zksync.io',
        'https://zksync.meowrpc.com'
      ],
      BLAST: [
        'https://rpc.blast.io',
        'https://blast.blockpi.network/v1/rpc/public'
      ],
      // Testnets
      ETH_SEPOLIA: [
        'https://rpc.sepolia.org',
        'https://ethereum-sepolia.publicnode.com',
        'https://sepolia.drpc.org'
      ],
      ETH_GOERLI: [
        'https://goerli.publicnode.com',
        'https://rpc.ankr.com/eth_goerli'
      ],
      BSC_TESTNET: [
        'https://data-seed-prebsc-1-s1.binance.org:8545',
        'https://data-seed-prebsc-2-s1.binance.org:8545',
        'https://bsc-testnet.publicnode.com'
      ],
      POLYGON_MUMBAI: [
        'https://polygon-mumbai.g.alchemy.com/v2/demo',
        'https://rpc.ankr.com/polygon_mumbai',
        'https://polygon-testnet.public.blastapi.io'
      ],
      AVALANCHE_FUJI: [
        'https://api.avax-test.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche_fuji',
        'https://avalanche-fuji.publicnode.com'
      ],
      ARBITRUM_SEPOLIA: [
        'https://sepolia-rollup.arbitrum.io/rpc',
        'https://arbitrum-sepolia.publicnode.com'
      ],
      OPTIMISM_SEPOLIA: [
        'https://sepolia.optimism.io',
        'https://optimism-sepolia.publicnode.com'
      ],
      BASE_SEPOLIA: [
        'https://sepolia.base.org',
        'https://base-sepolia.publicnode.com'
      ],
      LINEA_SEPOLIA: [
        'https://rpc.sepolia.linea.build'
      ],
      SCROLL_SEPOLIA: [
        'https://sepolia-rpc.scroll.io'
      ],
      ZKSYNC_SEPOLIA: [
        'https://sepolia.era.zksync.dev'
      ],
      BLAST_SEPOLIA: [
        'https://sepolia.blast.io'
      ],
    };
  }

  private static getSymbol(chain: string): string {
    const symbols: Record<string, string> = {
      ETH: 'ETH', BSC: 'BNB', POLYGON: 'MATIC', AVALANCHE: 'AVAX',
      ARBITRUM: 'ETH', OPTIMISM: 'ETH', BASE: 'ETH', FANTOM: 'FTM',
      CRONOS: 'CRO', CELO: 'CELO', LINEA: 'ETH', METIS: 'METIS',
      GNOSIS: 'xDAI', MOONBEAM: 'GLMR', MOONRIVER: 'MOVR',
      SCROLL: 'ETH', ZKSYNC: 'ETH', BLAST: 'ETH',
      ETH_SEPOLIA: 'SepoliaETH', ETH_GOERLI: 'GoerliETH',
      BSC_TESTNET: 'tBNB', POLYGON_MUMBAI: 'MATIC',
      AVALANCHE_FUJI: 'AVAX', ARBITRUM_SEPOLIA: 'ETH',
      OPTIMISM_SEPOLIA: 'ETH', BASE_SEPOLIA: 'ETH',
      LINEA_SEPOLIA: 'ETH', SCROLL_SEPOLIA: 'ETH',
      ZKSYNC_SEPOLIA: 'ETH', BLAST_SEPOLIA: 'ETH',
    };
    
    return symbols[chain] || chain;
  }
}

// Auto-cleanup expired cache entries every 5 minutes
setInterval(() => {
  BatchBalanceChecker.clearExpiredCache();
}, 5 * 60 * 1000);