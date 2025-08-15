import { app, BrowserWindow, ipcMain, dialog, systemPreferences } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import CryptoJS from 'crypto-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let encryptionKey: string | null = null;
let currentIdentityId: string | null = null;
let identityDb: Database.Database | null = null;

// Identity management
function initIdentityDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    const identityDbPath = path.join(userDataPath, 'nexus-identities.db');
    
    identityDb = new Database(identityDbPath);
    identityDb.pragma('journal_mode = WAL');
    
    // Create identities table
    identityDb.exec(`
      CREATE TABLE IF NOT EXISTS identities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_identities_name ON identities(name);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `);
    
    console.log('Identity database initialized');
    return true;
  } catch (error) {
    console.error('Identity database initialization error:', error);
    throw error;
  }
}

// Database initialization for specific identity
function initDatabase(password: string, identityId?: string) {
  try {
    const userDataPath = app.getPath('userData');
    console.log('User data path:', userDataPath);
    
    // If no identityId provided, use default database (legacy support)
    const dbName = identityId ? `nexus-${identityId}.db` : 'nexus-wallets.db';
    const dbPath = path.join(userDataPath, dbName);
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
    currentIdentityId = identityId || 'default';
    
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

// Identity management IPC handlers
ipcMain.handle('get-identities', async () => {
  if (!identityDb) {
    initIdentityDatabase();
  }
  
  try {
    const identities = identityDb!.prepare(`
      SELECT id, name, created_at, last_accessed, is_active 
      FROM identities 
      ORDER BY last_accessed DESC
    `).all();
    
    return identities.map((identity: any) => ({
      id: identity.id,
      name: identity.name,
      createdAt: identity.created_at,
      lastAccessed: identity.last_accessed,
      hasPassword: true,
      isActive: Boolean(identity.is_active)
    }));
  } catch (error) {
    console.error('Get identities error:', error);
    return [];
  }
});

ipcMain.handle('create-identity', async (_, { name, password }: { name: string, password: string }) => {
  if (!identityDb) {
    initIdentityDatabase();
  }
  
  try {
    const identityId = `identity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Insert new identity
    identityDb!.prepare(`
      INSERT INTO identities (id, name, password_hash)
      VALUES (?, ?, ?)
    `).run(identityId, name, passwordHash);
    
    // Initialize the database for this identity
    initDatabase(password, identityId);
    
    return { success: true, identityId };
  } catch (error: any) {
    console.error('Create identity error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('switch-identity', async (_, identityId: string, password: string) => {
  if (!identityDb) {
    initIdentityDatabase();
  }
  
  try {
    // Verify identity exists and password is correct
    const identity = identityDb!.prepare('SELECT * FROM identities WHERE id = ?').get(identityId) as any;
    if (!identity) {
      return { success: false, error: 'Identity not found' };
    }
    
    const isValidPassword = bcrypt.compareSync(password, identity.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' };
    }
    
    // Close current database if open
    if (db) {
      db.close();
      db = null;
    }
    
    // Set all identities to inactive
    identityDb!.prepare('UPDATE identities SET is_active = 0').run();
    
    // Set selected identity as active and update last accessed
    identityDb!.prepare(`
      UPDATE identities 
      SET is_active = 1, last_accessed = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(identityId);
    
    // Initialize database for the selected identity
    initDatabase(password, identityId);
    
    return { success: true };
  } catch (error: any) {
    console.error('Switch identity error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-identity', async (_, identityId: string) => {
  if (!identityDb) {
    return { success: false, error: 'Identity database not initialized' };
  }
  
  try {
    // Don't allow deleting active identity
    const identity = identityDb.prepare('SELECT is_active FROM identities WHERE id = ?').get(identityId) as any;
    if (identity?.is_active) {
      return { success: false, error: 'Cannot delete active identity' };
    }
    
    // Delete identity record
    identityDb.prepare('DELETE FROM identities WHERE id = ?').run(identityId);
    
    // Delete the database file
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, `nexus-${identityId}.db`);
    
    try {
      const fs = require('fs');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      // Also delete WAL and SHM files
      ['-wal', '-shm'].forEach(suffix => {
        const walPath = dbPath + suffix;
        if (fs.existsSync(walPath)) {
          fs.unlinkSync(walPath);
        }
      });
    } catch (fsError) {
      console.warn('Could not delete database files:', fsError);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Delete identity error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-current-identity', async () => {
  if (!identityDb) {
    return null;
  }
  
  try {
    const identity = identityDb.prepare('SELECT * FROM identities WHERE is_active = 1').get() as any;
    if (!identity) return null;
    
    return {
      id: identity.id,
      name: identity.name,
      createdAt: identity.created_at,
      lastAccessed: identity.last_accessed,
      hasPassword: true,
      isActive: true
    };
  } catch (error) {
    console.error('Get current identity error:', error);
    return null;
  }
});

// Biometric Authentication utilities
const execAsync = promisify(exec);

async function checkBiometricCapabilities() {
  try {
    if (process.platform === 'darwin') {
      // Check for Touch ID/Face ID on macOS
      const canPrompt = systemPreferences.canPromptTouchID();
      
      if (canPrompt) {
        // Try to determine if it's Touch ID or Face ID
        try {
          const { stdout } = await execAsync('system_profiler SPHardwareDataType | grep "Touch ID"');
          const biometryType = stdout.includes('Touch ID') ? 'touchID' : 'faceID';
          
          return {
            available: true,
            biometryType,
          };
        } catch {
          // Fallback - assume Face ID if Touch ID not found
          return {
            available: true,
            biometryType: 'faceID',
          };
        }
      }
    } else if (process.platform === 'win32') {
      // Check for Windows Hello
      try {
        const { stdout } = await execAsync('powershell "Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Hello-Face"');
        const faceAvailable = stdout.includes('Enabled');
        
        if (faceAvailable) {
          return {
            available: true,
            biometryType: 'faceID',
          };
        }
      } catch (error) {
        console.log('Windows Hello check failed:', error);
      }
    }

    return {
      available: false,
      biometryType: 'none',
      error: 'Biometric authentication not available on this platform'
    };
  } catch (error) {
    console.error('Error checking biometric capabilities:', error);
    return {
      available: false,
      biometryType: 'none',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function authenticateWithBiometrics(reason: string) {
  try {
    if (process.platform === 'darwin') {
      // Use Touch ID/Face ID on macOS
      await systemPreferences.promptTouchID(reason);
      return { success: true };
    } else if (process.platform === 'win32') {
      // Use Windows Hello
      try {
        await execAsync('powershell "if (Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Hello-Face | Where-Object {$_.State -eq \'Enabled\'}) { Write-Output \'success\' } else { throw \'Windows Hello not available\' }"');
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: 'Windows Hello authentication failed',
          errorCode: 'AUTH_FAILED'
        };
      }
    }

    return { 
      success: false, 
      error: 'Biometric authentication not supported on this platform',
      errorCode: 'NOT_SUPPORTED'
    };
  } catch (error) {
    console.error('Biometric authentication error:', error);
    
    // Handle specific Touch ID errors
    if (error instanceof Error) {
      if (error.message.includes('User canceled')) {
        return { 
          success: false, 
          error: 'Authentication was canceled by user',
          errorCode: 'USER_CANCEL'
        };
      } else if (error.message.includes('not enrolled')) {
        return { 
          success: false, 
          error: 'No biometric data enrolled',
          errorCode: 'NOT_ENROLLED'
        };
      }
    }

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Biometric authentication failed',
      errorCode: 'AUTH_FAILED'
    };
  }
}

// Biometric authentication IPC handlers
ipcMain.handle('check-biometric-capabilities', async () => {
  return await checkBiometricCapabilities();
});

ipcMain.handle('authenticate-with-biometrics', async (_, reason: string) => {
  return await authenticateWithBiometrics(reason);
});

ipcMain.handle('enable-biometric-auth', async (_, password: string) => {
  if (!identityDb) {
    return { success: false, error: 'Identity database not initialized' };
  }

  try {
    // Get current identity
    const identity = identityDb.prepare('SELECT * FROM identities WHERE is_active = 1').get() as any;
    if (!identity) {
      return { success: false, error: 'No active identity found' };
    }

    // Verify the provided password
    const isValidPassword = bcrypt.compareSync(password, identity.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' };
    }

    // First check if biometrics are available
    const capabilities = await checkBiometricCapabilities();
    if (!capabilities.available) {
      return { success: false, error: capabilities.error || 'Biometric authentication not available' };
    }

    // Test biometric authentication
    const authResult = await authenticateWithBiometrics('Enable biometric authentication for Nexus Wallet Manager');
    if (!authResult.success) {
      return authResult;
    }

    // Encrypt and store the password for biometric unlock
    const biometricKey = CryptoJS.SHA256(`biometric_${identity.id}_${Date.now()}`).toString();
    const encryptedPassword = CryptoJS.AES.encrypt(password, biometricKey).toString();

    // Store biometric settings
    identityDb.prepare(`
      INSERT OR REPLACE INTO settings (key, value) 
      VALUES ('biometric_enabled_${identity.id}', ?)
    `).run('true');

    identityDb.prepare(`
      INSERT OR REPLACE INTO settings (key, value) 
      VALUES ('biometric_key_${identity.id}', ?)
    `).run(biometricKey);

    identityDb.prepare(`
      INSERT OR REPLACE INTO settings (key, value) 
      VALUES ('biometric_password_${identity.id}', ?)
    `).run(encryptedPassword);

    return { success: true };
  } catch (error) {
    console.error('Error enabling biometric auth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to enable biometric authentication' };
  }
});

ipcMain.handle('disable-biometric-auth', async () => {
  if (!identityDb) {
    return { success: false, error: 'Identity database not initialized' };
  }

  try {
    // Get current identity
    const identity = identityDb.prepare('SELECT * FROM identities WHERE is_active = 1').get() as any;
    if (!identity) {
      return { success: false, error: 'No active identity found' };
    }

    // Remove biometric settings
    identityDb.prepare('DELETE FROM settings WHERE key = ?').run(`biometric_enabled_${identity.id}`);
    identityDb.prepare('DELETE FROM settings WHERE key = ?').run(`biometric_key_${identity.id}`);
    identityDb.prepare('DELETE FROM settings WHERE key = ?').run(`biometric_password_${identity.id}`);

    return { success: true };
  } catch (error) {
    console.error('Error disabling biometric auth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to disable biometric authentication' };
  }
});

ipcMain.handle('is-biometric-auth-enabled', async () => {
  if (!identityDb) {
    return false;
  }

  try {
    // Get current identity
    const identity = identityDb.prepare('SELECT * FROM identities WHERE is_active = 1').get() as any;
    if (!identity) {
      return false;
    }

    const setting = identityDb.prepare('SELECT value FROM settings WHERE key = ?').get(`biometric_enabled_${identity.id}`) as any;
    return setting?.value === 'true';
  } catch (error) {
    console.error('Error checking biometric auth status:', error);
    return false;
  }
});

ipcMain.handle('authenticate-and-get-password', async () => {
  if (!identityDb) {
    return { success: false, error: 'Identity database not initialized' };
  }

  try {
    // Get current identity
    const identity = identityDb.prepare('SELECT * FROM identities WHERE is_active = 1').get() as any;
    if (!identity) {
      return { success: false, error: 'No active identity found' };
    }

    // Check if biometric auth is enabled
    const enabledSetting = identityDb.prepare('SELECT value FROM settings WHERE key = ?').get(`biometric_enabled_${identity.id}`) as any;
    if (enabledSetting?.value !== 'true') {
      return { success: false, error: 'Biometric authentication not enabled' };
    }

    // Authenticate with biometrics
    const authResult = await authenticateWithBiometrics('Authenticate to unlock Nexus Wallet Manager');
    if (!authResult.success) {
      return authResult;
    }

    // Retrieve stored password
    const keySetting = identityDb.prepare('SELECT value FROM settings WHERE key = ?').get(`biometric_key_${identity.id}`) as any;
    const passwordSetting = identityDb.prepare('SELECT value FROM settings WHERE key = ?').get(`biometric_password_${identity.id}`) as any;

    if (!keySetting || !passwordSetting) {
      return { success: false, error: 'Biometric data not found' };
    }

    // Decrypt password
    const decryptedPassword = CryptoJS.AES.decrypt(passwordSetting.value, keySetting.value).toString(CryptoJS.enc.Utf8);
    
    if (!decryptedPassword) {
      return { success: false, error: 'Failed to decrypt stored password' };
    }

    return { success: true, password: decryptedPassword };
  } catch (error) {
    console.error('Error authenticating and getting password:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Biometric authentication failed' };
  }
});

// App event handlers
app.whenReady().then(() => {
  initIdentityDatabase();
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