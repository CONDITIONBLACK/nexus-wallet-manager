// Check if running in Electron
export const isElectron = () => {
  // @ts-ignore
  return window.electronAPI !== undefined;
};

// Mock storage for browser mode
class BrowserStorage {

  async initDatabase(password: string) {
    localStorage.setItem('nexus_initialized', 'true');
    // Store hashed password (simple hash for demo - use proper hashing in production)
    localStorage.setItem('nexus_password', btoa(password));
    return true;
  }

  async verifyPassword(password: string) {
    // For browser mode, check if initialized
    if (!password) {
      return localStorage.getItem('nexus_initialized') === 'true';
    }
    
    // Simple password check for browser mode
    const storedPassword = localStorage.getItem('nexus_password');
    if (!storedPassword) {
      return false;
    }
    
    // Decode and compare
    try {
      const decoded = atob(storedPassword);
      if (decoded === password) {
        return true;
      }
    } catch (e) {
      return false;
    }
    
    return false;
  }

  async storeWallet(walletData: any) {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    const newWallet = {
      ...walletData,
      id: Date.now(),
    };
    wallets.push(newWallet);
    localStorage.setItem('nexus_wallets', JSON.stringify(wallets));
    return { success: true, id: newWallet.id };
  }

  async getWallets(filters?: any) {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    // Ensure all wallets have an address field
    const walletsWithAddress = wallets.map((w: any) => {
      let address = w.address;
      
      // If address is missing or is a public key (66 chars starting with 02/03), mark as needing re-import
      if (!address || (address.length === 66 && (address.startsWith('02') || address.startsWith('03')))) {
        console.warn(`Wallet ${w.chain} has invalid address, using publicKey as fallback: ${address || 'missing'}`);
        address = w.publicKey; // Keep as fallback but this will trigger errors
      }
      
      return {
        ...w,
        address
      };
    });
    
    if (filters?.chain) {
      return walletsWithAddress.filter((w: any) => w.chain === filters.chain);
    }
    return walletsWithAddress;
  }

  async updateBalance(walletId: number, balance: string) {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    const index = wallets.findIndex((w: any) => w.id === walletId);
    if (index !== -1) {
      wallets[index].balance = balance;
      localStorage.setItem('nexus_wallets', JSON.stringify(wallets));
      return { success: true };
    }
    return { success: false };
  }

  async exportWallet(walletId: number, _format: string) {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    const wallet = wallets.find((w: any) => w.id === walletId);
    if (wallet) {
      return JSON.stringify(wallet, null, 2);
    }
    return null;
  }

  async deleteWallet(walletId: number) {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    const filteredWallets = wallets.filter((w: any) => w.id !== walletId);
    localStorage.setItem('nexus_wallets', JSON.stringify(filteredWallets));
    return true;
  }

  async deleteWallets(walletIds: number[]) {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    const filteredWallets = wallets.filter((w: any) => !walletIds.includes(w.id));
    localStorage.setItem('nexus_wallets', JSON.stringify(filteredWallets));
    return true;
  }

  async clearInvalidWallets() {
    const wallets = JSON.parse(localStorage.getItem('nexus_wallets') || '[]');
    console.log('Checking wallets for invalid addresses:', wallets.map(w => ({
      chain: w.chain,
      address: w.address,
      publicKey: w.publicKey,
      addressLength: w.address?.length,
      isPublicKey: w.address?.length === 66 && (w.address?.startsWith('02') || w.address?.startsWith('03'))
    })));
    
    const validWallets = wallets.filter((w: any) => {
      // Keep wallets that have proper addresses (not public keys)
      const address = w.address;
      return address && !(address.length === 66 && (address.startsWith('02') || address.startsWith('03')));
    });
    localStorage.setItem('nexus_wallets', JSON.stringify(validWallets));
    return wallets.length - validWallets.length; // Return count of removed wallets
  }

  async clearAllData() {
    localStorage.removeItem('nexus_wallets');
    localStorage.removeItem('nexus_rpc_nodes');
    localStorage.removeItem('nexus_password');
    localStorage.removeItem('nexus_initialized');
    console.log('All localStorage data cleared');
    return true;
  }
}

// Global debug function - accessible from browser console
(window as any).clearAppData = () => {
  localStorage.clear();
  console.log('🧹 All localStorage cleared via console command');
  window.location.reload();
};

// Create a unified API that works in both Electron and browser
const browserStorage = new BrowserStorage();

export const electronAPI = isElectron() 
  // @ts-ignore
  ? window.electronAPI 
  : browserStorage;

// Add type declaration for window
declare global {
  interface Window {
    electronAPI?: any;
  }
}