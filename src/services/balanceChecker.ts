import axios from 'axios';
import { ethers } from 'ethers';
import { TokenService, TokenBalance as TokenBalanceInfo } from './tokenService';
import { APIErrorHandler } from './apiErrorHandler';
import { APINotificationManager } from '../components/APIStatusNotification';

export interface BalanceResult {
  chain: string;
  address: string;
  balance: string;
  formattedBalance: string;
  symbol: string;
  usdValue?: number;
  lastChecked: Date;
  error?: string;
  tokens?: TokenBalanceInfo[];
}

export interface TokenBalance {
  contract: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  usdValue?: number;
}

export class BalanceChecker {
  private static providers: Map<string, ethers.JsonRpcProvider> = new Map();
  
  // Initialize providers for EVM chains
  static initProviders(rpcUrls: Record<string, string>) {
    for (const [chain, url] of Object.entries(rpcUrls)) {
      this.providers.set(chain, new ethers.JsonRpcProvider(url));
    }
  }

  /**
   * Check balance for a single address
   */
  static async checkBalance(
    chain: string,
    address: string,
    rpcUrl?: string
  ): Promise<BalanceResult> {
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
          return await this.checkEVMBalance(chain, address, rpcUrl);
        
        case 'BTC':
        case 'BTC_TESTNET':
          return await this.checkBitcoinBalance(chain, address);
        
        case 'LTC':
          return await this.checkLitecoinBalance(address);
        
        case 'DOGE':
          return await this.checkDogeBalance(address);
        
        case 'SOL':
          return await this.checkSolanaBalance(address);
        
        case 'XMR':
          return await this.checkMoneroBalance(address);
        
        default:
          return {
            chain,
            address,
            balance: '0',
            formattedBalance: '0',
            symbol: chain,
            lastChecked: new Date(),
            error: 'Chain not supported for balance checking',
          };
      }
    } catch (error: any) {
      return {
        chain,
        address,
        balance: '0',
        formattedBalance: '0',
        symbol: chain,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Check EVM chain balance
   */
  private static async checkEVMBalance(
    chain: string,
    address: string,
    customRpcUrl?: string
  ): Promise<BalanceResult> {
    // Default RPC URLs for each chain with fallbacks
    const defaultRpcs: Record<string, string[]> = {
      // Mainnet
      ETH: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com', 'https://eth.llamarpc.com'],
      BSC: ['https://bsc-dataseed1.binance.org', 'https://rpc.ankr.com/bsc', 'https://bsc.publicnode.com'],
      POLYGON: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon', 'https://polygon.publicnode.com'],
      AVALANCHE: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
      ARBITRUM: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
      OPTIMISM: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
      BASE: ['https://mainnet.base.org', 'https://base.llamarpc.com'],
      FANTOM: ['https://rpc.ftm.tools', 'https://rpc.ankr.com/fantom'],
      CRONOS: ['https://evm.cronos.org'],
      CELO: ['https://forno.celo.org', 'https://rpc.ankr.com/celo'],
      LINEA: ['https://rpc.linea.build'],
      METIS: ['https://andromeda.metis.io'],
      GNOSIS: ['https://rpc.gnosischain.com', 'https://gnosis.publicnode.com'],
      MOONBEAM: ['https://rpc.api.moonbeam.network'],
      MOONRIVER: ['https://rpc.api.moonriver.moonbeam.network'],
      SCROLL: ['https://rpc.scroll.io'],
      ZKSYNC: ['https://mainnet.era.zksync.io'],
      BLAST: ['https://rpc.blast.io'],
      // Testnets
      ETH_SEPOLIA: ['https://rpc.sepolia.org', 'https://ethereum-sepolia.publicnode.com'],
      ETH_GOERLI: ['https://goerli.publicnode.com', 'https://rpc.ankr.com/eth_goerli'],
      BSC_TESTNET: ['https://data-seed-prebsc-1-s1.binance.org:8545', 'https://bsc-testnet.publicnode.com'],
      POLYGON_MUMBAI: ['https://polygon-mumbai.g.alchemy.com/v2/demo', 'https://rpc.ankr.com/polygon_mumbai'],
      AVALANCHE_FUJI: ['https://api.avax-test.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche_fuji'],
      ARBITRUM_SEPOLIA: ['https://sepolia-rollup.arbitrum.io/rpc'],
      OPTIMISM_SEPOLIA: ['https://sepolia.optimism.io'],
      BASE_SEPOLIA: ['https://sepolia.base.org'],
      LINEA_SEPOLIA: ['https://rpc.sepolia.linea.build'],
      SCROLL_SEPOLIA: ['https://sepolia-rpc.scroll.io'],
      ZKSYNC_SEPOLIA: ['https://sepolia.era.zksync.dev'],
      BLAST_SEPOLIA: ['https://sepolia.blast.io'],
    };
    
    let provider = this.providers.get(chain);
    
    if (customRpcUrl) {
      provider = new ethers.JsonRpcProvider(customRpcUrl);
    } else if (!provider) {
      // Try each RPC URL until one works
      const rpcUrls = defaultRpcs[chain];
      if (rpcUrls && rpcUrls.length > 0) {
        for (const rpcUrl of rpcUrls) {
          try {
            console.log(`🔌 Trying RPC for ${chain}: ${rpcUrl}`);
            provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Test the connection
            await provider.getNetwork();
            console.log(`✅ Connected to ${chain} via ${rpcUrl}`);
            this.providers.set(chain, provider);
            break;
          } catch (error) {
            console.warn(`❌ Failed to connect to ${chain} via ${rpcUrl}:`, error);
            provider = null;
          }
        }
      }
    }
    
    if (!provider) {
      throw new Error(`No provider configured for ${chain}`);
    }

    console.log(`Checking balance for ${chain} at ${address} using RPC: ${customRpcUrl || defaultRpcs[chain]}`);
    
    let balance;
    try {
      balance = await provider.getBalance(address);
    } catch (rpcError: any) {
      console.error(`RPC Error for ${chain}:`, rpcError);
      // Try with backup RPCs if the first one fails
      if (!customRpcUrl && defaultRpcs[chain] && defaultRpcs[chain].length > 1) {
        console.log(`Retrying with backup RPCs for ${chain}`);
        let backupSuccess = false;
        
        // Try remaining RPC URLs
        for (let i = 1; i < defaultRpcs[chain].length; i++) {
          try {
            const backupRpcUrl = defaultRpcs[chain][i];
            console.log(`🔄 Trying backup RPC ${i} for ${chain}: ${backupRpcUrl}`);
            const backupProvider = new ethers.JsonRpcProvider(backupRpcUrl);
            balance = await backupProvider.getBalance(address);
            console.log(`✅ Backup RPC ${i} succeeded for ${chain}`);
            
            // Update the cached provider to the working one
            this.providers.set(chain, backupProvider);
            backupSuccess = true;
            break;
          } catch (backupError) {
            console.warn(`❌ Backup RPC ${i} failed for ${chain}:`, backupError);
          }
        }
        
        if (!backupSuccess) {
          throw new Error(`All RPC URLs failed for ${chain}: ${rpcError.message}`);
        }
      } else {
        throw new Error(`RPC connection failed: ${rpcError.message}`);
      }
    }
    
    const formattedBalance = ethers.formatEther(balance);
    
    // Get USD value from price API
    const usdValue = await this.getUSDValue(chain, formattedBalance);
    
    // Get token balances for EVM chains (optional, don't fail if it errors)
    let tokens;
    try {
      const chainId = this.getChainId(chain);
      const rpcUrl = customRpcUrl || defaultRpcs[chain]?.[0] || 'https://rpc.ankr.com/eth';
      tokens = await TokenService.getTokenBalances(address, chainId, rpcUrl);
    } catch (tokenError) {
      console.warn(`Failed to fetch token balances for ${address} on ${chain}:`, tokenError);
      tokens = [];
    }
    
    return {
      chain,
      address,
      balance: balance.toString(),
      formattedBalance,
      symbol: this.getSymbol(chain),
      usdValue,
      lastChecked: new Date(),
      tokens,
    };
  }

  /**
   * Check Bitcoin balance using public API
   */
  private static async checkBitcoinBalance(
    chain: string,
    address: string
  ): Promise<BalanceResult> {
    const isTestnet = chain === 'BTC_TESTNET';
    
    // Use proxy URLs to avoid CORS issues
    const apis = isTestnet ? [
      {
        name: 'Blockstream Testnet',
        url: `/api/blockstream/testnet/api/address/${address}`,
        parser: (data: any) => {
          const funded = data.chain_stats.funded_txo_sum || 0;
          const spent = data.chain_stats.spent_txo_sum || 0;
          return funded - spent;
        }
      },
      {
        name: 'BlockCypher Testnet',
        url: `/api/blockcypher/v1/btc/test3/addrs/${address}/balance`,
        parser: (data: any) => data.balance
      }
    ] : [
      {
        name: 'Blockstream',
        url: `/api/blockstream/api/address/${address}`,
        parser: (data: any) => {
          const funded = data.chain_stats.funded_txo_sum || 0;
          const spent = data.chain_stats.spent_txo_sum || 0;
          return funded - spent;
        }
      },
      {
        name: 'BlockCypher',
        url: `/api/blockcypher/v1/btc/main/addrs/${address}/balance`,
        parser: (data: any) => data.balance
      },
      {
        name: 'Blockchain.info',
        url: `/api/blockchain/rawaddr/${address}`,
        parser: (data: any) => data.final_balance
      }
    ];
    
    let lastError: any = null;
    
    for (let i = 0; i < apis.length; i++) {
      const api = apis[i];
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔍 Trying ${api.name} for address ${address} (attempt ${retryCount + 1})`);
          
          const response = await axios.get(api.url, {
            timeout: 10000, // Increased timeout
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'MultiWalletChecker/1.0'
            }
          });
          
          const balanceSatoshis = api.parser(response.data);
          const balanceBTC = balanceSatoshis / 100000000;
          
          const usdValue = !isTestnet ? await this.getUSDValue('BTC', balanceBTC.toString()) : 0;
          
          console.log(`✅ Success: ${address} has ${balanceBTC} BTC via ${api.name}`);
          
          // Show success notification only for the first success
          if (i === 0 && retryCount === 0) {
            APINotificationManager.apiSuccess(api.name, 1);
          }
          
          return {
            chain,
            address,
            balance: balanceSatoshis.toString(),
            formattedBalance: balanceBTC.toFixed(8),
            symbol: isTestnet ? 'tBTC' : 'BTC',
            usdValue,
            lastChecked: new Date(),
          };
          
        } catch (error) {
          const apiError = APIErrorHandler.analyzeError(error);
          APIErrorHandler.logError(apiError, `Bitcoin-${api.name}`, retryCount + 1);
          
          // Show appropriate notifications
          if (apiError.type === 'CORS') {
            APINotificationManager.corsError(api.name);
          } else if (apiError.type === 'RATE_LIMIT') {
            APINotificationManager.rateLimit(api.name, apiError.retryAfter || 60);
          } else if (apiError.type === 'NETWORK') {
            APINotificationManager.networkError(api.name);
          }
          
          lastError = error;
          
          // If it's a fatal error, skip to next API
          if (apiError.isFatal) {
            console.log(`💀 Fatal error with ${api.name}, trying next API...`);
            break;
          }
          
          // Check if we should retry
          if (APIErrorHandler.shouldRetry(apiError, retryCount, maxRetries)) {
            const delay = APIErrorHandler.getRetryDelay(apiError, retryCount);
            if (delay > 0) {
              console.log(`⏳ Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            retryCount++;
          } else {
            break;
          }
        }
      }
    }
    
    // If all APIs failed, return an error result with user-friendly message
    const finalError = APIErrorHandler.analyzeError(lastError);
    const userMessage = APIErrorHandler.getUserMessage(finalError);
    
    console.error(`All APIs failed for address ${address}:`, userMessage);
    return {
      chain,
      address,
      balance: '0',
      formattedBalance: '0',
      symbol: isTestnet ? 'tBTC' : 'BTC',
      usdValue: 0,
      lastChecked: new Date(),
      error: userMessage,
    };
  }

  /**
   * Check Litecoin balance
   */
  private static async checkLitecoinBalance(address: string): Promise<BalanceResult> {
    try {
      const response = await axios.get(
        `/api/blockcypher/v1/ltc/main/addrs/${address}/balance`
      );
      const balanceSatoshis = response.data.balance;
      const balanceLTC = balanceSatoshis / 100000000;
      
      const usdValue = await this.getUSDValue('LTC', balanceLTC.toString());
      
      return {
        chain: 'LTC',
        address,
        balance: balanceSatoshis.toString(),
        formattedBalance: balanceLTC.toFixed(8),
        symbol: 'LTC',
        usdValue,
        lastChecked: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check Dogecoin balance
   */
  private static async checkDogeBalance(address: string): Promise<BalanceResult> {
    try {
      const response = await axios.get(
        `/api/blockcypher/v1/doge/main/addrs/${address}/balance`
      );
      const balanceSatoshis = response.data.balance;
      const balanceDOGE = balanceSatoshis / 100000000;
      
      const usdValue = await this.getUSDValue('DOGE', balanceDOGE.toString());
      
      return {
        chain: 'DOGE',
        address,
        balance: balanceSatoshis.toString(),
        formattedBalance: balanceDOGE.toFixed(8),
        symbol: 'DOGE',
        usdValue,
        lastChecked: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check Solana balance
   */
  private static async checkSolanaBalance(address: string): Promise<BalanceResult> {
    try {
      const response = await axios.post(
        'https://api.mainnet-beta.solana.com',
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }
      );
      
      const balanceLamports = response.data.result.value;
      const balanceSOL = balanceLamports / 1000000000;
      
      const usdValue = await this.getUSDValue('SOL', balanceSOL.toString());
      
      return {
        chain: 'SOL',
        address,
        balance: balanceLamports.toString(),
        formattedBalance: balanceSOL.toFixed(9),
        symbol: 'SOL',
        usdValue,
        lastChecked: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check Monero balance (requires view key)
   */
  private static async checkMoneroBalance(address: string): Promise<BalanceResult> {
    // Monero balance checking requires view key and is more complex
    // This is a placeholder
    return {
      chain: 'XMR',
      address,
      balance: '0',
      formattedBalance: '0',
      symbol: 'XMR',
      lastChecked: new Date(),
      error: 'Monero balance checking requires view key',
    };
  }

  /**
   * Check ERC20/BEP20 token balances
   */
  static async checkTokenBalances(
    chain: string,
    address: string,
    tokenContracts: string[],
    rpcUrl?: string
  ): Promise<TokenBalance[]> {
    const provider = rpcUrl 
      ? new ethers.JsonRpcProvider(rpcUrl)
      : this.providers.get(chain);
    
    if (!provider) {
      throw new Error(`No provider configured for ${chain}`);
    }

    const balances: TokenBalance[] = [];
    const ERC20_ABI = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)',
    ];

    for (const contractAddress of tokenContracts) {
      try {
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
        const [balance, decimals, symbol, name] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
          contract.symbol(),
          contract.name(),
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        balances.push({
          contract: contractAddress,
          name,
          symbol,
          decimals,
          balance: balance.toString(),
          formattedBalance,
        });
      } catch (error) {
        console.error(`Error checking token ${contractAddress}:`, error);
      }
    }

    return balances;
  }

  /**
   * Batch check balances for multiple addresses
   */
  static async batchCheckBalances(
    wallets: Array<{ chain: string; address: string; rpcUrl?: string }>
  ): Promise<BalanceResult[]> {
    const promises = wallets.map(wallet =>
      this.checkBalance(wallet.chain, wallet.address, wallet.rpcUrl)
    );
    
    return Promise.all(promises);
  }

  /**
   * Get USD value for a given amount
   */
  private static async getUSDValue(
    symbol: string,
    amount: string
  ): Promise<number | undefined> {
    try {
      // Map chain symbols to CoinGecko IDs
      const coinGeckoIds: Record<string, string> = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        BNB: 'binancecoin',
        MATIC: 'matic-network',
        AVAX: 'avalanche-2',
        LTC: 'litecoin',
        DOGE: 'dogecoin',
        SOL: 'solana',
        XMR: 'monero',
      };

      const coinId = coinGeckoIds[symbol] || symbol.toLowerCase();
      const response = await axios.get(
        `/api/coingecko/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      );
      
      const price = response.data[coinId]?.usd;
      if (price) {
        return parseFloat(amount) * price;
      }
    } catch (error) {
      console.error(`Error fetching USD value for ${symbol}:`, error);
    }
    
    return undefined;
  }

  /**
   * Get symbol for chain
   */
  private static getSymbol(chain: string): string {
    const symbols: Record<string, string> = {
      // Mainnet
      ETH: 'ETH',
      BSC: 'BNB',
      POLYGON: 'MATIC',
      AVALANCHE: 'AVAX',
      ARBITRUM: 'ETH',
      OPTIMISM: 'ETH',
      BASE: 'ETH',
      FANTOM: 'FTM',
      CRONOS: 'CRO',
      CELO: 'CELO',
      LINEA: 'ETH',
      METIS: 'METIS',
      GNOSIS: 'xDAI',
      MOONBEAM: 'GLMR',
      MOONRIVER: 'MOVR',
      SCROLL: 'ETH',
      ZKSYNC: 'ETH',
      BLAST: 'ETH',
      // Testnets
      ETH_SEPOLIA: 'SepoliaETH',
      ETH_GOERLI: 'GoerliETH',
      BSC_TESTNET: 'tBNB',
      POLYGON_MUMBAI: 'MATIC',
      AVALANCHE_FUJI: 'AVAX',
      ARBITRUM_SEPOLIA: 'ETH',
      OPTIMISM_SEPOLIA: 'ETH',
      BASE_SEPOLIA: 'ETH',
      LINEA_SEPOLIA: 'ETH',
      SCROLL_SEPOLIA: 'ETH',
      ZKSYNC_SEPOLIA: 'ETH',
      BLAST_SEPOLIA: 'ETH',
      // Other chains
      BTC: 'BTC',
      BTC_TESTNET: 'tBTC',
      LTC: 'LTC',
      DOGE: 'DOGE',
      SOL: 'SOL',
      XMR: 'XMR',
    };
    
    return symbols[chain] || chain;
  }

  /**
   * Get chain ID for EVM chains
   */
  private static getChainId(chain: string): number {
    const chainIds: Record<string, number> = {
      // Mainnet
      ETH: 1,
      BSC: 56,
      POLYGON: 137,
      AVALANCHE: 43114,
      ARBITRUM: 42161,
      OPTIMISM: 10,
      BASE: 8453,
      FANTOM: 250,
      CRONOS: 25,
      CELO: 42220,
      LINEA: 59144,
      METIS: 1088,
      GNOSIS: 100,
      MOONBEAM: 1284,
      MOONRIVER: 1285,
      SCROLL: 534352,
      ZKSYNC: 324,
      BLAST: 81457,
      // Testnets
      ETH_SEPOLIA: 11155111,
      ETH_GOERLI: 5,
      BSC_TESTNET: 97,
      POLYGON_MUMBAI: 80001,
      AVALANCHE_FUJI: 43113,
      ARBITRUM_SEPOLIA: 421614,
      OPTIMISM_SEPOLIA: 11155420,
      BASE_SEPOLIA: 84532,
      LINEA_SEPOLIA: 59141,
      SCROLL_SEPOLIA: 534351,
      ZKSYNC_SEPOLIA: 300,
      BLAST_SEPOLIA: 168587773,
    };
    
    return chainIds[chain] || 1;
  }
}