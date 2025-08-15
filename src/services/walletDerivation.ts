import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Buffer } from '../polyfills';

export interface DerivedWallet {
  chain: string;
  derivationPath: string;
  publicKey: string;
  privateKey: string;
  address: string;
  masterKey?: string;
  metadata?: any;
}

export interface ChainConfig {
  name: string;
  symbol: string;
  chainId?: number;
  derivationPaths: string[];
  network?: any;
  rpcUrl?: string;
  nativeToken?: string;
}

// Supported blockchain configurations
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  // Bitcoin and variants - MAINNET
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    derivationPaths: [
      "m/84'/0'/0'/0/0",  // Native SegWit (bc1...)
      "m/49'/0'/0'/0/0",  // Nested SegWit (3...)
      "m/44'/0'/0'/0/0",  // Legacy (1...)
    ],
    network: bitcoin.networks.bitcoin,
  },
  
  // Ethereum and EVM chains - MAINNET
  ETH: {
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    chainId: 1,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.ankr.com/eth',
  },
  BSC: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    chainId: 56,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://bsc-dataseed.binance.org/',
  },
  POLYGON: {
    name: 'Polygon Mainnet',
    symbol: 'MATIC',
    chainId: 137,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://polygon-rpc.com/',
  },
  AVALANCHE: {
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    chainId: 43114,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  },
  ARBITRUM: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    chainId: 42161,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  OPTIMISM: {
    name: 'Optimism',
    symbol: 'ETH',
    chainId: 10,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://mainnet.optimism.io',
    nativeToken: 'ETH',
  },
  BASE: {
    name: 'Base',
    symbol: 'ETH',
    chainId: 8453,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://mainnet.base.org',
    nativeToken: 'ETH',
  },
  FANTOM: {
    name: 'Fantom Opera',
    symbol: 'FTM',
    chainId: 250,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.ftm.tools/',
  },
  CRONOS: {
    name: 'Cronos',
    symbol: 'CRO',
    chainId: 25,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://evm.cronos.org',
  },
  CELO: {
    name: 'Celo',
    symbol: 'CELO',
    chainId: 42220,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://forno.celo.org',
  },
  LINEA: {
    name: 'Linea',
    symbol: 'ETH',
    chainId: 59144,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.linea.build',
    nativeToken: 'ETH',
  },
  METIS: {
    name: 'Metis Andromeda',
    symbol: 'METIS',
    chainId: 1088,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://andromeda.metis.io/',
  },
  GNOSIS: {
    name: 'Gnosis Chain',
    symbol: 'xDAI',
    chainId: 100,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.gnosischain.com',
  },
  MOONBEAM: {
    name: 'Moonbeam',
    symbol: 'GLMR',
    chainId: 1284,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.api.moonbeam.network',
  },
  MOONRIVER: {
    name: 'Moonriver',
    symbol: 'MOVR',
    chainId: 1285,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.api.moonriver.moonbeam.network',
  },
  SCROLL: {
    name: 'Scroll',
    symbol: 'ETH',
    chainId: 534352,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.scroll.io',
    nativeToken: 'ETH',
  },
  ZKSYNC: {
    name: 'zkSync Era',
    symbol: 'ETH',
    chainId: 324,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://mainnet.era.zksync.io',
    nativeToken: 'ETH',
  },
  BLAST: {
    name: 'Blast',
    symbol: 'ETH',
    chainId: 81457,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.blast.io',
    nativeToken: 'ETH',
  },

  // TESTNETS
  BTC_TESTNET: {
    name: 'Bitcoin Testnet',
    symbol: 'tBTC',
    derivationPaths: ["m/84'/1'/0'/0/0", "m/49'/1'/0'/0/0", "m/44'/1'/0'/0/0"],
    network: bitcoin.networks.testnet,
  },
  ETH_SEPOLIA: {
    name: 'Ethereum Sepolia',
    symbol: 'SepoliaETH',
    chainId: 11155111,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.sepolia.org',
  },
  ETH_GOERLI: {
    name: 'Ethereum Goerli',
    symbol: 'GoerliETH',
    chainId: 5,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  },
  BSC_TESTNET: {
    name: 'BNB Smart Chain Testnet',
    symbol: 'tBNB',
    chainId: 97,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  },
  POLYGON_MUMBAI: {
    name: 'Polygon Mumbai',
    symbol: 'MATIC',
    chainId: 80001,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
  },
  AVALANCHE_FUJI: {
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    chainId: 43113,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  },
  ARBITRUM_SEPOLIA: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    chainId: 421614,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  OPTIMISM_SEPOLIA: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    chainId: 11155420,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://sepolia.optimism.io',
    nativeToken: 'ETH',
  },
  BASE_SEPOLIA: {
    name: 'Base Sepolia',
    symbol: 'ETH',
    chainId: 84532,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://sepolia.base.org',
    nativeToken: 'ETH',
  },
  LINEA_SEPOLIA: {
    name: 'Linea Sepolia',
    symbol: 'ETH',
    chainId: 59141,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://rpc.sepolia.linea.build',
    nativeToken: 'ETH',
  },
  SCROLL_SEPOLIA: {
    name: 'Scroll Sepolia',
    symbol: 'ETH',
    chainId: 534351,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://sepolia-rpc.scroll.io',
    nativeToken: 'ETH',
  },
  ZKSYNC_SEPOLIA: {
    name: 'zkSync Sepolia',
    symbol: 'ETH',
    chainId: 300,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://sepolia.era.zksync.dev',
    nativeToken: 'ETH',
  },
  BLAST_SEPOLIA: {
    name: 'Blast Sepolia',
    symbol: 'ETH',
    chainId: 168587773,
    derivationPaths: ["m/44'/60'/0'/0/0"],
    rpcUrl: 'https://sepolia.blast.io',
    nativeToken: 'ETH',
  },
  
  // Other chains
  LTC: {
    name: 'Litecoin',
    symbol: 'LTC',
    derivationPaths: ["m/84'/2'/0'/0/0", "m/49'/2'/0'/0/0", "m/44'/2'/0'/0/0"],
    network: {
      messagePrefix: '\x19Litecoin Signed Message:\n',
      bech32: 'ltc',
      bip32: { public: 0x019da462, private: 0x019d9cfe },
      pubKeyHash: 0x30,
      scriptHash: 0x32,
      wif: 0xb0,
    },
  },
  DOGE: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    derivationPaths: ["m/44'/3'/0'/0/0"],
    network: {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bip32: { public: 0x02facafd, private: 0x02fac398 },
      pubKeyHash: 0x1e,
      scriptHash: 0x16,
      wif: 0x9e,
    },
  },
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    derivationPaths: ["m/44'/501'/0'/0'"],
  },
  ADA: {
    name: 'Cardano',
    symbol: 'ADA',
    derivationPaths: ["m/1852'/1815'/0'/0/0"],
  },
  DOT: {
    name: 'Polkadot',
    symbol: 'DOT',
    derivationPaths: ["m/44'/354'/0'/0/0"],
  },
  ATOM: {
    name: 'Cosmos',
    symbol: 'ATOM',
    derivationPaths: ["m/44'/118'/0'/0/0"],
  },
  TRX: {
    name: 'Tron',
    symbol: 'TRX',
    derivationPaths: ["m/44'/195'/0'/0/0"],
  },
  XRP: {
    name: 'Ripple',
    symbol: 'XRP',
    derivationPaths: ["m/44'/144'/0'/0/0"],
  },
  // Monero requires special handling
  XMR: {
    name: 'Monero',
    symbol: 'XMR',
    derivationPaths: ["m/44'/128'/0'/0/0"],
  },
};

export class WalletDerivationService {
  /**
   * Validate mnemonic phrase
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic.trim());
  }

  /**
   * Derive wallets for all supported chains from a mnemonic
   */
  static async deriveAllWallets(mnemonic: string, passphrase: string = ''): Promise<DerivedWallet[]> {
    const wallets: DerivedWallet[] = [];
    
    for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
      try {
        for (const derivationPath of config.derivationPaths) {
          const wallet = await this.deriveWallet(mnemonic, chainKey, derivationPath, passphrase);
          if (wallet) {
            wallets.push(wallet);
          }
        }
      } catch (error) {
        console.error(`Failed to derive wallet for ${chainKey}:`, error);
      }
    }
    
    return wallets;
  }

  /**
   * Derive a single wallet for a specific chain and path
   */
  static async deriveWallet(
    mnemonic: string,
    chain: string,
    derivationPath: string,
    passphrase: string = ''
  ): Promise<DerivedWallet | null> {
    try {
      const seed = await bip39.mnemonicToSeed(mnemonic.trim(), passphrase);
      const config = CHAIN_CONFIGS[chain];
      
      if (!config) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      // Special handling for different chain types
      if (chain === 'XMR') {
        // Monero requires special library
        return this.deriveMoneroWallet(mnemonic, derivationPath, passphrase);
      } else if (['ETH', 'BSC', 'POLYGON', 'AVALANCHE', 'ARBITRUM', 'OPTIMISM', 'BASE', 'FANTOM', 'CRONOS', 'CELO', 'LINEA', 'METIS', 'GNOSIS', 'MOONBEAM', 'MOONRIVER', 'SCROLL', 'ZKSYNC', 'BLAST', 'ETH_SEPOLIA', 'ETH_GOERLI', 'BSC_TESTNET', 'POLYGON_MUMBAI', 'AVALANCHE_FUJI', 'ARBITRUM_SEPOLIA', 'OPTIMISM_SEPOLIA', 'BASE_SEPOLIA', 'LINEA_SEPOLIA', 'SCROLL_SEPOLIA', 'ZKSYNC_SEPOLIA', 'BLAST_SEPOLIA'].includes(chain)) {
        return this.deriveEthereumWallet(seed, chain, derivationPath);
      } else if (['BTC', 'BTC_TESTNET', 'LTC', 'DOGE'].includes(chain)) {
        return this.deriveBitcoinWallet(seed, chain, derivationPath);
      } else if (chain === 'SOL') {
        return this.deriveSolanaWallet(seed, derivationPath);
      } else {
        // Generic derivation for other chains
        return this.deriveGenericWallet(seed, chain, derivationPath);
      }
    } catch (error) {
      console.error(`Error deriving wallet for ${chain}:`, error);
      return null;
    }
  }

  /**
   * Derive Ethereum-compatible wallet
   */
  private static deriveEthereumWallet(
    seed: Buffer,
    chain: string,
    derivationPath: string
  ): DerivedWallet {
    const hdKey = HDKey.fromMasterSeed(seed);
    const childKey = hdKey.derive(derivationPath);
    
    if (!childKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const privateKey = '0x' + Buffer.from(childKey.privateKey).toString('hex');
    const wallet = new ethers.Wallet(privateKey);
    
    return {
      chain,
      derivationPath,
      publicKey: wallet.signingKey.publicKey,
      privateKey: wallet.privateKey,
      address: wallet.address,
      masterKey: '0x' + Buffer.from(hdKey.privateKey!).toString('hex'),
      metadata: {
        chainId: CHAIN_CONFIGS[chain].chainId,
        compressed: false,
      },
    };
  }

  /**
   * Derive Bitcoin-compatible wallet
   */
  private static deriveBitcoinWallet(
    seed: Buffer,
    chain: string,
    derivationPath: string
  ): DerivedWallet {
    const network = CHAIN_CONFIGS[chain].network;
    const hdKey = HDKey.fromMasterSeed(seed);
    const childKey = hdKey.derive(derivationPath);
    
    if (!childKey.privateKey || !childKey.publicKey) {
      throw new Error('Failed to derive keys');
    }

    let address: string;
    
    // Determine address type based on derivation path
    if (derivationPath.includes("84'")) {
      // Native SegWit (bech32)
      const { address: bech32Address } = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(childKey.publicKey),
        network,
      });
      address = bech32Address!;
    } else if (derivationPath.includes("49'")) {
      // Nested SegWit (P2SH)
      const { address: p2shAddress } = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(childKey.publicKey),
          network,
        }),
        network,
      });
      address = p2shAddress!;
    } else {
      // Legacy
      const { address: legacyAddress } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(childKey.publicKey),
        network,
      });
      address = legacyAddress!;
    }

    console.log(`Generated ${chain} wallet:`, {
      derivationPath,
      publicKey: Buffer.from(childKey.publicKey).toString('hex'),
      address,
      addressType: derivationPath.includes("84'") ? 'bech32' : 
                   derivationPath.includes("49'") ? 'p2sh-segwit' : 'legacy',
    });

    return {
      chain,
      derivationPath,
      publicKey: Buffer.from(childKey.publicKey).toString('hex'),
      privateKey: Buffer.from(childKey.privateKey).toString('hex'),
      address,
      masterKey: Buffer.from(hdKey.privateKey!).toString('hex'),
      metadata: {
        network: chain,
        addressType: derivationPath.includes("84'") ? 'bech32' : 
                     derivationPath.includes("49'") ? 'p2sh-segwit' : 'legacy',
      },
    };
  }

  /**
   * Derive Solana wallet
   */
  private static deriveSolanaWallet(seed: Buffer, derivationPath: string): DerivedWallet {
    const hdKey = HDKey.fromMasterSeed(seed);
    const childKey = hdKey.derive(derivationPath);
    
    if (!childKey.privateKey || !childKey.publicKey) {
      throw new Error('Failed to derive keys');
    }

    // Solana uses Ed25519, this is a simplified implementation
    // In production, use @solana/web3.js
    return {
      chain: 'SOL',
      derivationPath,
      publicKey: Buffer.from(childKey.publicKey).toString('hex'),
      privateKey: Buffer.from(childKey.privateKey).toString('hex'),
      address: Buffer.from(childKey.publicKey).toString('hex').slice(0, 44),
      metadata: {
        curve: 'ed25519',
      },
    };
  }

  /**
   * Derive Monero wallet (placeholder - requires monero-javascript)
   */
  private static async deriveMoneroWallet(
    _mnemonic: string,
    derivationPath: string,
    _passphrase: string = ''
  ): Promise<DerivedWallet> {
    // This would require the monero-javascript library
    // which has specific build requirements
    return {
      chain: 'XMR',
      derivationPath,
      publicKey: 'XMR_PUBLIC_KEY_PLACEHOLDER',
      privateKey: 'XMR_PRIVATE_KEY_PLACEHOLDER',
      address: 'XMR_ADDRESS_PLACEHOLDER',
      metadata: {
        viewKey: 'XMR_VIEW_KEY_PLACEHOLDER',
        spendKey: 'XMR_SPEND_KEY_PLACEHOLDER',
      },
    };
  }

  /**
   * Generic wallet derivation for other chains
   */
  private static deriveGenericWallet(
    seed: Buffer,
    chain: string,
    derivationPath: string
  ): DerivedWallet {
    const hdKey = HDKey.fromMasterSeed(seed);
    const childKey = hdKey.derive(derivationPath);
    
    if (!childKey.privateKey || !childKey.publicKey) {
      throw new Error('Failed to derive keys');
    }

    return {
      chain,
      derivationPath,
      publicKey: Buffer.from(childKey.publicKey).toString('hex'),
      privateKey: Buffer.from(childKey.privateKey).toString('hex'),
      address: Buffer.from(childKey.publicKey).toString('hex').slice(0, 40),
      masterKey: Buffer.from(hdKey.privateKey!).toString('hex'),
      metadata: {
        derived: true,
      },
    };
  }

  /**
   * Generate a new mnemonic
   */
  static generateMnemonic(strength: 128 | 256 = 128): string {
    return bip39.generateMnemonic(strength);
  }
}