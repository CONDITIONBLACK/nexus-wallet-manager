import axios from 'axios';
import { ethers } from 'ethers';

export interface BalanceResult {
  chain: string;
  address: string;
  balance: string;
  formattedBalance: string;
  symbol: string;
  usdValue?: number;
  lastChecked: Date;
  error?: string;
}

export class SmartBalanceChecker {
  private static cache = new Map<string, { result: BalanceResult; expires: number }>();
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Check balance with smart caching and batching
   */
  static async checkBalance(chain: string, address: string): Promise<BalanceResult> {
    const cacheKey = `${chain}:${address}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      console.log(`💾 Cache hit for ${chain}:${address}`);
      return cached.result;
    }

    let result: BalanceResult;

    try {
      switch (chain) {
        case 'ETH':
        case 'BSC':
        case 'POLYGON':
        case 'AVALANCHE':
        case 'ARBITRUM':
        case 'OPTIMISM':
        case 'BASE':
        case 'FANTOM':
        case 'CRONOS':
        case 'CELO':
        case 'LINEA':
        case 'METIS':
        case 'GNOSIS':
        case 'MOONBEAM':
        case 'MOONRIVER':
        case 'SCROLL':
        case 'ZKSYNC':
        case 'BLAST':
        case 'ETH_SEPOLIA':
        case 'ETH_GOERLI':
        case 'BSC_TESTNET':
        case 'POLYGON_MUMBAI':
        case 'AVALANCHE_FUJI':
        case 'ARBITRUM_SEPOLIA':
        case 'OPTIMISM_SEPOLIA':
        case 'BASE_SEPOLIA':
        case 'LINEA_SEPOLIA':
        case 'SCROLL_SEPOLIA':
        case 'ZKSYNC_SEPOLIA':
        case 'BLAST_SEPOLIA':
          result = await this.checkEVMBalance(chain, address);
          break;
        
        case 'BTC':
        case 'BTC_TESTNET':
          result = await this.checkBitcoinBalance(chain, address);
          break;
        
        default:
          result = {
            chain,
            address,
            balance: '0',
            formattedBalance: '0',
            symbol: chain,
            lastChecked: new Date(),
            error: 'Chain not supported',
          };
      }

      // Cache successful results
      if (!result.error) {
        this.cache.set(cacheKey, {
          result,
          expires: Date.now() + this.CACHE_DURATION
        });
      }

      return result;

    } catch (error) {
      console.error(`Error checking balance for ${chain}:${address}`, error);
      return {
        chain,
        address,
        balance: '0',
        formattedBalance: '0',
        symbol: chain,
        lastChecked: new Date(),
        error: 'Failed to fetch balance',
      };
    }
  }

  /**
   * Check EVM balance using direct RPC (no rate limits!)
   */
  private static async checkEVMBalance(chain: string, address: string): Promise<BalanceResult> {
    const rpcUrls = this.getRPCUrls();
    const rpcUrl = rpcUrls[chain]?.[0];
    
    if (!rpcUrl) {
      throw new Error(`No RPC URL for ${chain}`);
    }

    try {
      console.log(`🔗 Checking ${chain} balance via RPC: ${address}`);
      
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      return {
        chain,
        address,
        balance: balance.toString(),
        formattedBalance,
        symbol: this.getSymbol(chain),
        lastChecked: new Date(),
      };
    } catch (error) {
      console.error(`RPC error for ${chain}:`, error);
      throw error;
    }
  }

  /**
   * Check Bitcoin balance using free APIs with generous limits
   */
  private static async checkBitcoinBalance(chain: string, address: string): Promise<BalanceResult> {
    const isTestnet = chain === 'BTC_TESTNET';
    
    // Use APIs with better rate limits and CORS support
    const apis = [
      {
        name: 'Mempool.space',
        url: isTestnet 
          ? `https://mempool.space/testnet/api/address/${address}`
          : `https://mempool.space/api/address/${address}`,
        parser: (data: any) => {
          const funded = data.chain_stats?.funded_txo_sum || 0;
          const spent = data.chain_stats?.spent_txo_sum || 0;
          return funded - spent;
        }
      },
      {
        name: 'Sochain',
        url: isTestnet
          ? `https://sochain.com/api/v2/get_address_balance/BTCTEST/${address}`
          : `https://sochain.com/api/v2/get_address_balance/BTC/${address}`,
        parser: (data: any) => {
          const balance = parseFloat(data.data.confirmed_balance || '0');
          return Math.round(balance * 100000000); // Convert to satoshis
        }
      }
    ];

    for (const api of apis) {
      try {
        console.log(`🔍 Trying ${api.name} for Bitcoin address ${address}`);
        
        const response = await axios.get(api.url, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MultiWalletChecker/1.0'
          }
        });

        const balanceSatoshis = api.parser(response.data);
        const balanceBTC = balanceSatoshis / 100000000;

        console.log(`✅ Success: ${address} has ${balanceBTC} BTC via ${api.name}`);

        return {
          chain,
          address,
          balance: balanceSatoshis.toString(),
          formattedBalance: balanceBTC.toFixed(8),
          symbol: isTestnet ? 'tBTC' : 'BTC',
          lastChecked: new Date(),
        };

      } catch (error) {
        console.warn(`Failed ${api.name}:`, error);
        continue;
      }
    }

    throw new Error('All Bitcoin APIs failed');
  }

  /**
   * Batch check multiple addresses (when supported)
   */
  static async batchCheckBalances(
    requests: Array<{ chain: string; address: string }>
  ): Promise<BalanceResult[]> {
    console.log(`🚀 Batch checking ${requests.length} balances`);
    
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
      // For EVM chains, we can batch via multicall
      if (this.isEVMChain(chain)) {
        try {
          const batchResults = await this.batchEVMBalances(chain, addresses);
          results.push(...batchResults);
        } catch (error) {
          console.error(`Batch failed for ${chain}, falling back to individual calls`);
          // Fallback to individual calls
          for (const address of addresses) {
            try {
              const result = await this.checkBalance(chain, address);
              results.push(result);
            } catch (err) {
              console.error(`Individual fallback failed for ${chain}:${address}`, err);
            }
          }
        }
      } else {
        // For non-EVM chains, check individually with delays
        for (let i = 0; i < addresses.length; i++) {
          try {
            const result = await this.checkBalance(chain, addresses[i]);
            results.push(result);
            
            // Small delay to avoid overwhelming APIs
            if (i < addresses.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Failed to check ${chain}:${addresses[i]}`, error);
          }
        }
      }
    }

    return results;
  }

  /**
   * Batch check EVM balances using multicall
   */
  private static async batchEVMBalances(chain: string, addresses: string[]): Promise<BalanceResult[]> {
    const rpcUrls = this.getRPCUrls();
    const rpcUrl = rpcUrls[chain]?.[0];
    
    if (!rpcUrl) {
      throw new Error(`No RPC URL for ${chain}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Use Promise.all with a reasonable batch size
    const batchSize = 10;
    const results: BalanceResult[] = [];
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (address) => {
        try {
          const balance = await provider.getBalance(address);
          const formattedBalance = ethers.formatEther(balance);
          
          return {
            chain,
            address,
            balance: balance.toString(),
            formattedBalance,
            symbol: this.getSymbol(chain),
            lastChecked: new Date(),
          };
        } catch (error) {
          console.error(`Failed to get balance for ${address}:`, error);
          return {
            chain,
            address,
            balance: '0',
            formattedBalance: '0',
            symbol: this.getSymbol(chain),
            lastChecked: new Date(),
            error: 'Failed to fetch',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Helper methods
   */
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

  private static getRPCUrls(): Record<string, string[]> {
    return {
      ETH: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      BSC: ['https://bsc-dataseed1.binance.org', 'https://rpc.ankr.com/bsc'],
      POLYGON: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
      AVALANCHE: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
      ARBITRUM: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
      OPTIMISM: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
      BASE: ['https://mainnet.base.org', 'https://base.llamarpc.com'],
      // ... add others as needed
    };
  }

  private static getSymbol(chain: string): string {
    const symbols: Record<string, string> = {
      ETH: 'ETH', BSC: 'BNB', POLYGON: 'MATIC', AVALANCHE: 'AVAX',
      ARBITRUM: 'ETH', OPTIMISM: 'ETH', BASE: 'ETH', FANTOM: 'FTM',
      // ... add others
    };
    return symbols[chain] || chain;
  }

  /**
   * Cache management
   */
  static clearCache() {
    this.cache.clear();
    console.log('🧹 Cleared balance cache');
  }

  static getCacheStats() {
    const now = Date.now();
    const valid = Array.from(this.cache.values()).filter(item => now < item.expires).length;
    return {
      total: this.cache.size,
      valid,
      expired: this.cache.size - valid
    };
  }
}