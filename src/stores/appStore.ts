import { create } from 'zustand';
import { DerivedWallet } from '../services/walletDerivation';
import { electronAPI } from '../utils/electron';

interface Wallet extends DerivedWallet {
  id?: number;
  balance?: string;
  usdValue?: number;
  lastChecked?: Date;
}

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  isInitialized: boolean;
  
  // Wallet state
  wallets: Wallet[];
  selectedWallet: Wallet | null;
  isLoading: boolean;
  
  // Mnemonic state
  mnemonics: string[];
  currentMnemonic: string;
  
  // RPC nodes
  rpcNodes: Record<string, string[]>;
  
  // Actions
  initialize: () => void;
  authenticate: (password: string) => Promise<boolean>;
  logout: () => void;
  
  // Wallet actions
  addWallets: (wallets: Wallet[]) => void;
  updateWalletBalance: (walletId: number, balance: string, usdValue?: number) => void;
  selectWallet: (wallet: Wallet | null) => void;
  deleteWallet: (walletId: number) => Promise<boolean>;
  deleteWallets: (walletIds: number[]) => Promise<boolean>;
  clearWallets: () => void;
  clearInvalidWallets: () => Promise<number>;
  clearAllData: () => Promise<boolean>;
  
  // Mnemonic actions
  setCurrentMnemonic: (mnemonic: string) => void;
  addMnemonic: (mnemonic: string) => void;
  clearMnemonics: () => void;
  
  // RPC actions
  addRpcNode: (chain: string, url: string) => void;
  removeRpcNode: (chain: string, url: string) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  isAuthenticated: false,
  isInitialized: false,
  wallets: [],
  selectedWallet: null,
  isLoading: false,
  mnemonics: [],
  currentMnemonic: '',
  rpcNodes: {
    ETH: ['https://mainnet.infura.io/v3/YOUR_KEY', 'https://eth.llamarpc.com'],
    BSC: ['https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.binance.org/'],
    POLYGON: ['https://polygon-rpc.com/', 'https://rpc-mainnet.maticvigil.com/'],
    AVALANCHE: ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche'],
    ARBITRUM: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    OPTIMISM: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  },
  
  // Actions
  initialize: () => {
    // Check if database is initialized
    set({ isInitialized: true });
  },
  
  authenticate: async (password: string) => {
    try {
      const success = await electronAPI.verifyPassword(password);
      if (success) {
        set({ isAuthenticated: true });
        // Load existing wallets
        const wallets = await electronAPI.getWallets();
        set({ wallets });
      }
      return success;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  },
  
  logout: () => {
    set({
      isAuthenticated: false,
      wallets: [],
      selectedWallet: null,
      mnemonics: [],
      currentMnemonic: '',
    });
  },
  
  addWallets: (wallets: Wallet[]) => {
    set((state) => ({
      wallets: [...state.wallets, ...wallets],
    }));
  },
  
  updateWalletBalance: (walletId: number, balance: string, usdValue?: number) => {
    set((state) => ({
      wallets: state.wallets.map((wallet) =>
        wallet.id === walletId
          ? { ...wallet, balance, usdValue, lastChecked: new Date() }
          : wallet
      ),
    }));
  },
  
  selectWallet: (wallet: Wallet | null) => {
    set({ selectedWallet: wallet });
  },

  deleteWallet: async (walletId: number) => {
    try {
      // Delete from database/storage
      const success = await electronAPI.deleteWallet(walletId);
      if (success) {
        set((state) => ({
          wallets: state.wallets.filter(w => w.id !== walletId),
          selectedWallet: state.selectedWallet?.id === walletId ? null : state.selectedWallet
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete wallet error:', error);
      return false;
    }
  },

  deleteWallets: async (walletIds: number[]) => {
    try {
      // Delete from database/storage
      const success = await electronAPI.deleteWallets(walletIds);
      if (success) {
        set((state) => ({
          wallets: state.wallets.filter(w => !walletIds.includes(w.id!)),
          selectedWallet: walletIds.includes(state.selectedWallet?.id!) ? null : state.selectedWallet
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete wallets error:', error);
      return false;
    }
  },
  
  clearWallets: () => {
    set({ wallets: [], selectedWallet: null });
  },

  clearInvalidWallets: async () => {
    try {
      const removedCount = await electronAPI.clearInvalidWallets();
      if (removedCount > 0) {
        // Reload wallets after clearing invalid ones
        const wallets = await electronAPI.getWallets();
        set({ wallets });
      }
      return removedCount;
    } catch (error) {
      console.error('Clear invalid wallets error:', error);
      return 0;
    }
  },

  clearAllData: async () => {
    try {
      const success = await electronAPI.clearAllData();
      if (success) {
        set({ 
          wallets: [], 
          selectedWallet: null,
          isAuthenticated: false,
          mnemonics: [],
          currentMnemonic: ''
        });
      }
      return success;
    } catch (error) {
      console.error('Clear all data error:', error);
      return false;
    }
  },
  
  setCurrentMnemonic: (mnemonic: string) => {
    set({ currentMnemonic: mnemonic });
  },
  
  addMnemonic: (mnemonic: string) => {
    set((state) => ({
      mnemonics: [...state.mnemonics, mnemonic],
    }));
  },
  
  clearMnemonics: () => {
    set({ mnemonics: [], currentMnemonic: '' });
  },
  
  addRpcNode: (chain: string, url: string) => {
    set((state) => ({
      rpcNodes: {
        ...state.rpcNodes,
        [chain]: [...(state.rpcNodes[chain] || []), url],
      },
    }));
  },
  
  removeRpcNode: (chain: string, url: string) => {
    set((state) => ({
      rpcNodes: {
        ...state.rpcNodes,
        [chain]: (state.rpcNodes[chain] || []).filter((u) => u !== url),
      },
    }));
  },
}));