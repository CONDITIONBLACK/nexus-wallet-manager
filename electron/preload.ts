import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  initDatabase: (password: string) => ipcRenderer.invoke('init-database', password),
  verifyPassword: (password: string) => ipcRenderer.invoke('verify-password', password),
  
  // Wallet operations
  storeWallet: (walletData: any) => ipcRenderer.invoke('store-wallet', walletData),
  getWallets: (filters?: any) => ipcRenderer.invoke('get-wallets', filters),
  updateBalance: (walletId: number, balance: string) => ipcRenderer.invoke('update-balance', walletId, balance),
  exportWallet: (walletId: number, format: string) => ipcRenderer.invoke('export-wallet', walletId, format),
  importWalletFile: (fileData: string, password?: string) => ipcRenderer.invoke('import-wallet-file', fileData, password),
  deleteWallet: (walletId: number) => ipcRenderer.invoke('delete-wallet', walletId),
  deleteWallets: (walletIds: number[]) => ipcRenderer.invoke('delete-wallets', walletIds),
  
  // RPC node operations
  addRpcNode: (nodeData: any) => ipcRenderer.invoke('add-rpc-node', nodeData),
  getRpcNodes: (chain?: string) => ipcRenderer.invoke('get-rpc-nodes', chain),
  
  // System operations
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Identity management
  getIdentities: () => ipcRenderer.invoke('get-identities'),
  createIdentity: (data: any) => ipcRenderer.invoke('create-identity', data),
  switchIdentity: (identityId: string, password: string) => ipcRenderer.invoke('switch-identity', identityId, password),
  deleteIdentity: (identityId: string) => ipcRenderer.invoke('delete-identity', identityId),
  getCurrentIdentity: () => ipcRenderer.invoke('get-current-identity'),
  
  // Biometric authentication
  checkBiometricCapabilities: () => ipcRenderer.invoke('check-biometric-capabilities'),
  authenticateWithBiometrics: (reason: string) => ipcRenderer.invoke('authenticate-with-biometrics', reason),
  enableBiometricAuth: (password: string) => ipcRenderer.invoke('enable-biometric-auth', password),
  disableBiometricAuth: () => ipcRenderer.invoke('disable-biometric-auth'),
  isBiometricAuthEnabled: () => ipcRenderer.invoke('is-biometric-auth-enabled'),
  authenticateAndGetPassword: () => ipcRenderer.invoke('authenticate-and-get-password'),
  
  // Counter-forensics security
  startSecurityMonitoring: () => ipcRenderer.invoke('start-security-monitoring'),
  stopSecurityMonitoring: () => ipcRenderer.invoke('stop-security-monitoring'),
  getSecurityMetrics: () => ipcRenderer.invoke('get-security-metrics'),
  performSecurityCheck: () => ipcRenderer.invoke('perform-security-check'),
  checkScreenRecording: () => ipcRenderer.invoke('check-screen-recording'),
  secureMemoryWipe: () => ipcRenderer.invoke('secure-memory-wipe'),
});