import { BalanceResult } from './balanceChecker';

export interface WalletSummary {
  id: number;
  chain: string;
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  nativeUsdValue: number;
  tokenCount: number;
  tokenUsdValue: number;
  totalUsdValue: number;
  lastChecked: Date;
}

export interface ChainSummary {
  chain: string;
  walletCount: number;
  totalNativeValue: number;
  totalTokenValue: number;
  totalValue: number;
  symbol: string;
}

export interface PortfolioSummary {
  totalWallets: number;
  totalValue: number;
  totalNativeValue: number;
  totalTokenValue: number;
  chains: ChainSummary[];
  wallets: WalletSummary[];
  topTokens: Array<{
    symbol: string;
    name: string;
    totalValue: number;
    holders: number;
  }>;
}

export class PortfolioService {
  /**
   * Generate a complete portfolio summary from wallet data
   */
  static generatePortfolioSummary(
    wallets: Array<{
      id: number;
      chain: string;
      address: string;
      balance?: string;
      usdValue?: number;
      lastChecked?: Date;
    }>,
    balanceResults: BalanceResult[]
  ): PortfolioSummary {
    const walletSummaries: WalletSummary[] = [];
    const chainMap = new Map<string, ChainSummary>();
    const tokenMap = new Map<string, { 
      symbol: string; 
      name: string; 
      totalValue: number; 
      holders: Set<string> 
    }>();

    // Process each wallet
    for (const wallet of wallets) {
      const balanceResult = balanceResults.find(
        br => br.address === wallet.address && br.chain === wallet.chain
      );

      const nativeUsdValue = balanceResult?.usdValue || wallet.usdValue || 0;
      let tokenUsdValue = 0;
      let tokenCount = 0;

      // Calculate token values
      if (balanceResult?.tokens) {
        for (const token of balanceResult.tokens) {
          tokenCount++;
          const tokenValue = token.usdValue || 0;
          tokenUsdValue += tokenValue;

          // Track token across all wallets
          const tokenKey = `${token.token.symbol}-${token.token.chainId}`;
          if (!tokenMap.has(tokenKey)) {
            tokenMap.set(tokenKey, {
              symbol: token.token.symbol,
              name: token.token.name,
              totalValue: 0,
              holders: new Set(),
            });
          }
          const tokenData = tokenMap.get(tokenKey)!;
          tokenData.totalValue += tokenValue;
          tokenData.holders.add(wallet.address);
        }
      }

      const totalUsdValue = nativeUsdValue + tokenUsdValue;

      const walletSummary: WalletSummary = {
        id: wallet.id,
        chain: wallet.chain,
        address: wallet.address,
        nativeBalance: balanceResult?.formattedBalance || wallet.balance || '0',
        nativeSymbol: balanceResult?.symbol || this.getChainSymbol(wallet.chain),
        nativeUsdValue,
        tokenCount,
        tokenUsdValue,
        totalUsdValue,
        lastChecked: balanceResult?.lastChecked || wallet.lastChecked || new Date(),
      };

      walletSummaries.push(walletSummary);

      // Update chain summary
      if (!chainMap.has(wallet.chain)) {
        chainMap.set(wallet.chain, {
          chain: wallet.chain,
          walletCount: 0,
          totalNativeValue: 0,
          totalTokenValue: 0,
          totalValue: 0,
          symbol: this.getChainSymbol(wallet.chain),
        });
      }

      const chainSummary = chainMap.get(wallet.chain)!;
      chainSummary.walletCount++;
      chainSummary.totalNativeValue += nativeUsdValue;
      chainSummary.totalTokenValue += tokenUsdValue;
      chainSummary.totalValue += totalUsdValue;
    }

    // Calculate totals
    const totalValue = walletSummaries.reduce((sum, w) => sum + w.totalUsdValue, 0);
    const totalNativeValue = walletSummaries.reduce((sum, w) => sum + w.nativeUsdValue, 0);
    const totalTokenValue = walletSummaries.reduce((sum, w) => sum + w.tokenUsdValue, 0);

    // Get top tokens
    const topTokens = Array.from(tokenMap.values())
      .map(token => ({
        symbol: token.symbol,
        name: token.name,
        totalValue: token.totalValue,
        holders: token.holders.size,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return {
      totalWallets: wallets.length,
      totalValue,
      totalNativeValue,
      totalTokenValue,
      chains: Array.from(chainMap.values()).sort((a, b) => b.totalValue - a.totalValue),
      wallets: walletSummaries.sort((a, b) => b.totalUsdValue - a.totalUsdValue),
      topTokens,
    };
  }

  /**
   * Get formatted portfolio statistics
   */
  static getPortfolioStats(portfolio: PortfolioSummary) {
    const tokenPercentage = portfolio.totalValue > 0 
      ? (portfolio.totalTokenValue / portfolio.totalValue) * 100 
      : 0;

    const diversificationScore = this.calculateDiversificationScore(portfolio);
    
    return {
      totalValueFormatted: this.formatCurrency(portfolio.totalValue),
      tokenPercentage: tokenPercentage.toFixed(1),
      averageWalletValue: this.formatCurrency(
        portfolio.totalWallets > 0 ? portfolio.totalValue / portfolio.totalWallets : 0
      ),
      chainCount: portfolio.chains.length,
      diversificationScore,
      topChain: portfolio.chains[0]?.chain || 'N/A',
      topToken: portfolio.topTokens[0]?.symbol || 'N/A',
    };
  }

  /**
   * Calculate a simple diversification score (0-100)
   */
  private static calculateDiversificationScore(portfolio: PortfolioSummary): number {
    if (portfolio.totalValue === 0) return 0;

    // Factor 1: Chain diversification (max 40 points)
    const chainScore = Math.min(portfolio.chains.length * 8, 40);

    // Factor 2: Token diversification (max 30 points)
    const tokenScore = Math.min(portfolio.topTokens.length * 3, 30);

    // Factor 3: Distribution evenness (max 30 points)
    const topChainValue = portfolio.chains[0]?.totalValue || 0;
    const concentration = topChainValue / portfolio.totalValue;
    const distributionScore = Math.max(0, (1 - concentration) * 30);

    return Math.round(chainScore + tokenScore + distributionScore);
  }

  /**
   * Format currency value
   */
  private static formatCurrency(value: number): string {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }

  /**
   * Get chain symbol
   */
  private static getChainSymbol(chain: string): string {
    const symbols: Record<string, string> = {
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
      BTC: 'BTC',
      LTC: 'LTC',
      DOGE: 'DOGE',
      SOL: 'SOL',
      XMR: 'XMR',
    };
    
    return symbols[chain] || chain;
  }
}