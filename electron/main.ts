import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let encryptionKey: string | null = null;

// Database initialization
function initDatabase(password: string) {
  try {
    const userDataPath = app.getPath('userData');
    console.log('User data path:', userDataPath);
    
    const dbPath = path.join(userDataPath, 'nexus-wallets.db');
    console.log('Database path:', dbPath);
    
    db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mnemonic_encrypted TEXT NOT NULL,
      chain TEXT NOT NULL,
      derivation_path TEXT NOT NULL,
      public_key TEXT NOT NULL,
      address TEXT NOT NULL,
      private_key_encrypted TEXT NOT NULL,
      master_key_encrypted TEXT,
      balance TEXT DEFAULT '0',
      last_checked DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      fee TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );
    
    CREATE TABLE IF NOT EXISTS rpc_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT,
      is_active BOOLEAN DEFAULT 1,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_wallets_chain ON wallets(chain);
    CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON wallets(public_key);
    CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
    CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
  `);

  // Migration: Add address column if it doesn't exist and populate it
  try {
    // Check if address column exists
    const columns = db.prepare("PRAGMA table_info(wallets)").all() as any[];
    const hasAddressColumn = columns.some(col => col.name === 'address');
    
    if (!hasAddressColumn) {
      console.log('Adding address column to existing wallets table...');
      db.exec('ALTER TABLE wallets ADD COLUMN address TEXT');
      
      // Update existing wallets to set address = public_key as fallback
      db.prepare('UPDATE wallets SET address = public_key WHERE address IS NULL OR address = ""').run();
    }
  } catch (migrationError) {
    console.warn('Migration warning:', migrationError);
  }
  
  // Store password hash
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT OR REPLACE INTO settings (id, key, value) VALUES (1, ?, ?)').run('password_hash', passwordHash);
  
    // Generate encryption key from password
    encryptionKey = CryptoJS.SHA256(password).toString();
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Encryption utilities
function encrypt(text: string): string {
  if (!encryptionKey) throw new Error('Encryption key not set');
  return CryptoJS.AES.encrypt(text, encryptionKey).toString();
}

function decrypt(ciphertext: string): string {
  if (!encryptionKey) throw new Error('Encryption key not set');
  const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0A0A0A',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar' as const,
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../public/icon.svg'),
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('init-database', async (_, password: string) => {
  try {
    return initDatabase(password);
  } catch (error) {
    console.error('Database init error:', error);
    return false;
  }
});

ipcMain.handle('verify-password', async (_, password: string) => {
  if (!db) return false;
  
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('password_hash') as any;
    if (!row) return false;
    
    const isValid = bcrypt.compareSync(password, row.value);
    if (isValid) {
      encryptionKey = CryptoJS.SHA256(password).toString();
    }
    return isValid;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
});

ipcMain.handle('store-wallet', async (_, walletData: any) => {
  if (!db || !encryptionKey) return { success: false, error: 'Database not initialized' };
  
  try {
    const stmt = db.prepare(`
      INSERT INTO wallets (
        mnemonic_encrypted, chain, derivation_path, 
        public_key, address, private_key_encrypted, master_key_encrypted,
        balance, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      encrypt(walletData.mnemonic),
      walletData.chain,
      walletData.derivationPath,
      walletData.publicKey,
      walletData.address,
      encrypt(walletData.privateKey),
      walletData.masterKey ? encrypt(walletData.masterKey) : null,
      walletData.balance || '0',
      JSON.stringify(walletData.metadata || {})
    );
    
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Store wallet error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-wallets', async (_, filters?: any) => {
  if (!db) return [];
  
  try {
    let query = 'SELECT * FROM wallets';
    const params: any[] = [];
    
    if (filters?.chain) {
      query += ' WHERE chain = ?';
      params.push(filters.chain);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rows = db.prepare(query).all(...params) as any[];
    
    // Decrypt sensitive data
    return rows.map(row => ({
      id: row.id,
      chain: row.chain,
      derivationPath: row.derivation_path,
      publicKey: row.public_key,
      address: row.address || row.public_key, // Fallback for old data
      balance: row.balance,
      lastChecked: row.last_checked,
      mnemonic: decrypt(row.mnemonic_encrypted),
      privateKey: decrypt(row.private_key_encrypted),
      masterKey: row.master_key_encrypted ? decrypt(row.master_key_encrypted) : null,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  } catch (error) {
    console.error('Get wallets error:', error);
    return [];
  }
});

ipcMain.handle('update-balance', async (_, walletId: number, balance: string) => {
  if (!db) return false;
  
  try {
    db.prepare('UPDATE wallets SET balance = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?')
      .run(balance, walletId);
    return true;
  } catch (error) {
    console.error('Update balance error:', error);
    return false;
  }
});

ipcMain.handle('delete-wallet', async (_, walletId: number) => {
  if (!db) return false;
  
  try {
    db.prepare('DELETE FROM wallets WHERE id = ?').run(walletId);
    return true;
  } catch (error) {
    console.error('Delete wallet error:', error);
    return false;
  }
});

ipcMain.handle('delete-wallets', async (_, walletIds: number[]) => {
  if (!db) return false;
  
  try {
    const placeholders = walletIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM wallets WHERE id IN (${placeholders})`).run(...walletIds);
    return true;
  } catch (error) {
    console.error('Delete wallets error:', error);
    return false;
  }
});

ipcMain.handle('export-wallet', async (_, walletId: number, format: string) => {
  if (!db) return null;
  
  try {
    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId) as any;
    if (!wallet) return null;
    
    const decrypted = {
      chain: wallet.chain,
      derivationPath: wallet.derivation_path,
      publicKey: wallet.public_key,
      address: wallet.address,
      privateKey: decrypt(wallet.private_key_encrypted),
      mnemonic: decrypt(wallet.mnemonic_encrypted),
      balance: wallet.balance,
      lastChecked: wallet.last_checked,
      createdAt: wallet.created_at,
      metadata: wallet.metadata ? JSON.parse(wallet.metadata) : null
    };
    
    if (format === 'json') {
      const exportData = {
        version: '1.0.0',
        type: 'nexus-wallet-export',
        timestamp: new Date().toISOString(),
        wallet: decrypted
      };
      return JSON.stringify(exportData, null, 2);
    } else if (format === 'keystore') {
      // Ethereum-compatible keystore format
      const keystoreData = {
        version: 3,
        id: `nexus-${wallet.id}-${Date.now()}`,
        address: wallet.address,
        chain: wallet.chain,
        derivationPath: wallet.derivation_path,
        crypto: {
          cipher: 'aes-128-ctr',
          ciphertext: encrypt(decrypted.privateKey),
          kdf: 'scrypt',
          kdfparams: {
            dklen: 32,
            salt: CryptoJS.lib.WordArray.random(32).toString(),
            n: 262144,
            r: 8,
            p: 1
          },
          mac: CryptoJS.SHA256(decrypted.privateKey).toString()
        },
        nexus: {
          mnemonic: encrypt(decrypted.mnemonic),
          balance: wallet.balance,
          exportedAt: new Date().toISOString()
        }
      };
      return JSON.stringify(keystoreData, null, 2);
    }
    
    return JSON.stringify(decrypted, null, 2);
  } catch (error) {
    console.error('Export wallet error:', error);
    return null;
  }
});

// Import wallet functionality
ipcMain.handle('import-wallet-file', async (_, fileData: string, password?: string) => {
  if (!db || !encryptionKey) return { success: false, error: 'Database not initialized' };
  
  try {
    const data = JSON.parse(fileData);
    
    // Handle different import formats
    let walletData: any = null;
    
    if (data.type === 'nexus-wallet-export' && data.wallet) {
      // Nexus native export format
      walletData = data.wallet;
    } else if (data.version === 3 && data.crypto) {
      // Keystore format
      if (!password) {
        return { success: false, error: 'Password required for keystore import' };
      }
      
      // Decrypt keystore (simplified - would need proper keystore decryption)
      walletData = {
        chain: data.chain,
        derivationPath: data.derivationPath,
        address: data.address,
        privateKey: decrypt(data.crypto.ciphertext),
        mnemonic: data.nexus ? decrypt(data.nexus.mnemonic) : null,
        balance: data.nexus ? data.nexus.balance : '0'
      };
    } else if (data.privateKey || data.mnemonic) {
      // Direct wallet object
      walletData = data;
    } else {
      return { success: false, error: 'Unsupported wallet format' };
    }
    
    if (!walletData.privateKey || !walletData.chain) {
      return { success: false, error: 'Invalid wallet data - missing required fields' };
    }
    
    // Check if wallet already exists
    const existingWallet = db.prepare(
      'SELECT id FROM wallets WHERE chain = ? AND (address = ? OR public_key = ?)'
    ).get(walletData.chain, walletData.address, walletData.publicKey);
    
    if (existingWallet) {
      return { success: false, error: 'Wallet already exists in database' };
    }
    
    // Insert imported wallet
    const result = db.prepare(`
      INSERT INTO wallets (
        mnemonic_encrypted, chain, derivation_path, public_key, address,
        private_key_encrypted, balance, last_checked, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      walletData.mnemonic ? encrypt(walletData.mnemonic) : encrypt(''),
      walletData.chain,
      walletData.derivationPath || "m/44'/0'/0'/0/0",
      walletData.publicKey || '',
      walletData.address || walletData.publicKey || '',
      encrypt(walletData.privateKey),
      walletData.balance || '0',
      walletData.lastChecked || null,
      walletData.metadata ? JSON.stringify(walletData.metadata) : null
    );
    
    return { 
      success: true, 
      walletId: result.lastInsertRowid,
      message: 'Wallet imported successfully'
    };
    
  } catch (error) {
    console.error('Import wallet error:', error);
    return { 
      success: false, 
      error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
});

ipcMain.handle('add-rpc-node', async (_, nodeData: any) => {
  if (!db) return false;
  
  try {
    db.prepare('INSERT INTO rpc_nodes (chain, url, name, priority) VALUES (?, ?, ?, ?)')
      .run(nodeData.chain, nodeData.url, nodeData.name, nodeData.priority || 0);
    return true;
  } catch (error) {
    console.error('Add RPC node error:', error);
    return false;
  }
});

ipcMain.handle('get-rpc-nodes', async (_, chain?: string) => {
  if (!db) return [];
  
  try {
    let query = 'SELECT * FROM rpc_nodes WHERE is_active = 1';
    const params: any[] = [];
    
    if (chain) {
      query += ' AND chain = ?';
      params.push(chain);
    }
    
    query += ' ORDER BY priority DESC, created_at ASC';
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('Get RPC nodes error:', error);
    return [];
  }
});

// File dialog handlers
ipcMain.handle('show-save-dialog', async (_, options: any) => {
  if (!mainWindow) return { canceled: true };
  
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Save dialog error:', error);
    return { canceled: true };
  }
});

ipcMain.handle('show-open-dialog', async (_, options: any) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  } catch (error) {
    console.error('Open dialog error:', error);
    return { canceled: true, filePaths: [] };
  }
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// Security
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});