import { ethers } from 'ethers';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceFormatted: string;
  usdValue?: number;
}

// Popular ERC20 tokens by chain
export const POPULAR_TOKENS: Record<number, TokenInfo[]> = {
  // Ethereum Mainnet
  1: [
    { address: '0xA0b86a33E6417c50C6c5c8B0e8b18bb7e22e98d8', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 1 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chainId: 1 },
    { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', name: 'SHIBA INU', decimals: 18, chainId: 1 },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'ChainLink Token', decimals: 18, chainId: 1 },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18, chainId: 1 },
  ],
  // BSC
  56: [
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, chainId: 56 },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18, chainId: 56 },
    { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'BUSD Token', decimals: 18, chainId: 56 },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', name: 'Ethereum Token', decimals: 18, chainId: 56 },
    { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', name: 'BTCB Token', decimals: 18, chainId: 56 },
    { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18, chainId: 56 },
  ],
  // Polygon
  137: [
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 137 },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 137 },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 137 },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chainId: 137 },
    { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chainId: 137 },
  ],
  // Arbitrum
  42161: [
    { address: '0xA0b86a33E6417c50C6c5c8B0e8b18bb7e22e98d8', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 42161 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 42161 },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 42161 },
    { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chainId: 42161 },
  ],
};

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export class TokenService {
  private static providers: Map<number, ethers.JsonRpcProvider> = new Map();

  private static getProvider(chainId: number, rpcUrl: string): ethers.JsonRpcProvider {
    if (!this.providers.has(chainId)) {
      this.providers.set(chainId, new ethers.JsonRpcProvider(rpcUrl));
    }
    return this.providers.get(chainId)!;
  }

  /**
   * Get token balances for an address on a specific chain
   */
  static async getTokenBalances(
    address: string,
    chainId: number,
    rpcUrl: string,
    tokenAddresses?: string[]
  ): Promise<TokenBalance[]> {
    try {
      const provider = this.getProvider(chainId, rpcUrl);
      const tokens = tokenAddresses 
        ? await this.getTokenInfos(tokenAddresses, chainId, provider)
        : POPULAR_TOKENS[chainId] || [];

      const balances: TokenBalance[] = [];

      for (const token of tokens) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(address);
          
          if (balance > 0n) {
            const balanceFormatted = ethers.formatUnits(balance, token.decimals);
            balances.push({
              token,
              balance: balance.toString(),
              balanceFormatted,
            });
          }
        } catch (error) {
          console.error(`Error getting balance for ${token.symbol}:`, error);
        }
      }

      return balances;
    } catch (error) {
      console.error('Error getting token balances:', error);
      return [];
    }
  }

  /**
   * Get token information for given addresses
   */
  private static async getTokenInfos(
    addresses: string[],
    chainId: number,
    provider: ethers.JsonRpcProvider
  ): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = [];

    for (const address of addresses) {
      try {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        const [symbol, name, decimals] = await Promise.all([
          contract.symbol(),
          contract.name(),
          contract.decimals(),
        ]);

        tokens.push({
          address,
          symbol,
          name,
          decimals,
          chainId,
        });
      } catch (error) {
        console.error(`Error getting token info for ${address}:`, error);
      }
    }

    return tokens;
  }

  /**
   * Get USD value for tokens (placeholder - would need price API integration)
   */
  static async getTokenPrices(tokens: TokenBalance[]): Promise<TokenBalance[]> {
    // Placeholder - integrate with CoinGecko, CoinMarketCap, or similar
    return tokens.map(token => ({
      ...token,
      usdValue: 0, // Would fetch real prices here
    }));
  }

  /**
   * Get all popular tokens for a chain
   */
  static getPopularTokens(chainId: number): TokenInfo[] {
    return POPULAR_TOKENS[chainId] || [];
  }
}