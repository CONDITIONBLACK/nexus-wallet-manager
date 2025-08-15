import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, CheckCircle, Loader,
  Plus, X, Zap, Shield, Globe, Upload, FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStore } from '../stores/appStore';
import { WalletDerivationService, CHAIN_CONFIGS } from '../services/walletDerivation';
import { BatchBalanceChecker } from '../services/batchBalanceChecker';
import { electronAPI } from '../utils/electron';

export default function MnemonicInput() {
  const [mnemonics, setMnemonics] = useState<string[]>(['']);
  const [passphrases, setPassphrases] = useState<string[]>(['']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedChains, setSelectedChains] = useState<string[]>(Object.keys(CHAIN_CONFIGS).filter(chain => !chain.includes('TESTNET') && !chain.includes('SEPOLIA') && !chain.includes('GOERLI') && !chain.includes('MUMBAI') && !chain.includes('FUJI')));
  const [checkBalances, setCheckBalances] = useState(true);
  const [importMode, setImportMode] = useState<'manual' | 'text'>('manual');
  const [textImport, setTextImport] = useState('');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'mainnet' | 'testnet'>('mainnet');
  
  const { addWallets, addMnemonic } = useStore();

  const handleMnemonicChange = (index: number, value: string) => {
    const updated = [...mnemonics];
    updated[index] = value;
    setMnemonics(updated);
  };

  const handlePassphraseChange = (index: number, value: string) => {
    const updated = [...passphrases];
    updated[index] = value;
    setPassphrases(updated);
  };

  const addMnemonicField = () => {
    setMnemonics([...mnemonics, '']);
    setPassphrases([...passphrases, '']);
  };

  const removeMnemonicField = (index: number) => {
    setMnemonics(mnemonics.filter((_, i) => i !== index));
    setPassphrases(passphrases.filter((_, i) => i !== index));
  };

  const parseTextImport = () => {
    const lines = textImport.split('\n').map(line => line.trim()).filter(line => line);
    const validMnemonics: string[] = [];
    const validPassphrases: string[] = [];
    const invalidLines: string[] = [];
    
    console.log(`Processing ${lines.length} lines from text import`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains a potential passphrase (separated by colon or pipe)
      const parts = line.split(/[:|]/);
      const mnemonic = parts[0].trim();
      const passphrase = parts[1]?.trim() || '';
      
      // Validate mnemonic
      const words = mnemonic.split(/\s+/);
      console.log(`Line ${i + 1}: ${words.length} words`);
      
      if (words.length === 12 || words.length === 24) {
        try {
          // Basic validation - check if it's valid BIP39
          const isValid = WalletDerivationService.validateMnemonic(mnemonic);
          if (isValid) {
            validMnemonics.push(mnemonic);
            validPassphrases.push(passphrase);
            console.log(`✓ Valid mnemonic ${validMnemonics.length}: ${words.length} words`);
          } else {
            invalidLines.push(`Line ${i + 1}: Invalid BIP39 mnemonic`);
            console.log(`✗ Invalid BIP39 on line ${i + 1}`);
          }
        } catch (e) {
          invalidLines.push(`Line ${i + 1}: Validation error - ${(e as Error).message}`);
          console.log(`✗ Error validating line ${i + 1}:`, e);
        }
      } else {
        invalidLines.push(`Line ${i + 1}: Must be 12 or 24 words (found ${words.length})`);
        console.log(`✗ Wrong word count on line ${i + 1}: ${words.length} words`);
      }
    }
    
    if (validMnemonics.length === 0) {
      toast.error('No valid mnemonics found in text');
      if (invalidLines.length > 0) {
        console.error('Invalid lines:', invalidLines);
      }
      return;
    }
    
    setMnemonics(validMnemonics);
    setPassphrases(validPassphrases);
    setImportMode('manual');
    
    let message = `Imported ${validMnemonics.length} valid mnemonics`;
    if (invalidLines.length > 0) {
      message += ` (${invalidLines.length} skipped)`;
      console.warn('Skipped lines:', invalidLines);
    }
    
    toast.success(message);
  };

  const toggleChain = (chain: string) => {
    setSelectedChains(prev => 
      prev.includes(chain) 
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  const getFilteredChains = () => {
    const allChains = Object.keys(CHAIN_CONFIGS);
    
    if (networkFilter === 'mainnet') {
      return allChains.filter(chain => 
        !chain.includes('TESTNET') && 
        !chain.includes('SEPOLIA') && 
        !chain.includes('GOERLI') && 
        !chain.includes('MUMBAI') && 
        !chain.includes('FUJI')
      );
    } else if (networkFilter === 'testnet') {
      return allChains.filter(chain => 
        chain.includes('TESTNET') || 
        chain.includes('SEPOLIA') || 
        chain.includes('GOERLI') || 
        chain.includes('MUMBAI') || 
        chain.includes('FUJI')
      );
    }
    
    return allChains;
  };

  const selectAllChains = () => {
    const filteredChains = getFilteredChains();
    setSelectedChains(filteredChains);
  };

  const deselectAllChains = () => {
    setSelectedChains([]);
  };

  const handleNetworkFilterChange = (filter: 'all' | 'mainnet' | 'testnet') => {
    setNetworkFilter(filter);
    
    // Update selected chains to match the new filter
    const filteredChains = filter === 'mainnet' ? 
      Object.keys(CHAIN_CONFIGS).filter(chain => 
        !chain.includes('TESTNET') && 
        !chain.includes('SEPOLIA') && 
        !chain.includes('GOERLI') && 
        !chain.includes('MUMBAI') && 
        !chain.includes('FUJI')
      ) : filter === 'testnet' ?
      Object.keys(CHAIN_CONFIGS).filter(chain => 
        chain.includes('TESTNET') || 
        chain.includes('SEPOLIA') || 
        chain.includes('GOERLI') || 
        chain.includes('MUMBAI') || 
        chain.includes('FUJI')
      ) : Object.keys(CHAIN_CONFIGS);
    
    setSelectedChains(filteredChains);
  };

  const validateAndFilterMnemonics = (): { validMnemonics: string[], invalidCount: number } => {
    const validMnemonics: string[] = [];
    let invalidCount = 0;
    
    for (const mnemonic of mnemonics) {
      if (!mnemonic.trim()) continue;
      
      const words = mnemonic.trim().split(/\s+/);
      if (words.length !== 12 && words.length !== 24) {
        console.warn(`Skipping invalid mnemonic: Must be 12 or 24 words (found ${words.length})`);
        invalidCount++;
        continue;
      }
      
      if (!WalletDerivationService.validateMnemonic(mnemonic)) {
        console.warn(`Skipping invalid mnemonic: Failed checksum validation`);
        invalidCount++;
        continue;
      }
      
      validMnemonics.push(mnemonic);
    }
    
    return { validMnemonics, invalidCount };
  };

  const handleImport = async () => {
    const { validMnemonics, invalidCount } = validateAndFilterMnemonics();
    
    if (validMnemonics.length === 0) {
      toast.error('No valid mnemonics found to import');
      return;
    }
    
    if (invalidCount > 0) {
      toast.info(`Found ${validMnemonics.length} valid mnemonics, skipping ${invalidCount} invalid ones`);
    }
    
    // Test wallet derivation service
    console.log('🧪 Testing wallet derivation service...');
    try {
      const testWallet = await WalletDerivationService.deriveWallet(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'BTC',
        "m/84'/0'/0'/0/0",
        ''
      );
      console.log('🧪 Test derivation result:', testWallet);
    } catch (testError) {
      console.error('🧪 Test derivation failed:', testError);
    }
    
    // validMnemonics already filtered above

    setIsProcessing(true);
    const toastId = toast.loading('Processing wallets...');

    try {
      let totalWallets = 0;
      let failedWallets = 0;
      
      for (let i = 0; i < validMnemonics.length; i++) {
        const mnemonic = validMnemonics[i];
        const passphrase = passphrases[i] || '';
        
        try {
          // Add mnemonic to store
          addMnemonic(mnemonic);
          
          // Derive wallets for selected chains
          for (const chain of selectedChains) {
            const config = CHAIN_CONFIGS[chain];
            if (!config) continue;
            
            toast.loading(`Deriving ${config.name} wallets (${i+1}/${validMnemonics.length})...`, { id: toastId });
            
            for (const path of config.derivationPaths) {
              try {
                const wallet = await WalletDerivationService.deriveWallet(mnemonic, chain, path, passphrase);
                
                if (wallet) {
                  console.log(`Storing wallet for ${chain}:`, {
                    publicKey: wallet.publicKey,
                    address: wallet.address,
                    addressLength: wallet.address?.length
                  });

                  // Validation: Don't store wallets without proper addresses
                  if (!wallet.address || wallet.address === wallet.publicKey) {
                    console.error(`❌ Skipping ${chain} wallet - no proper address generated. Address: ${wallet.address}, PublicKey: ${wallet.publicKey}`);
                    failedWallets++;
                    continue;
                  }
                  
                  try {
                    // Store wallet in database
                    const result = await electronAPI.storeWallet({
                      mnemonic,
                      chain: wallet.chain,
                      derivationPath: wallet.derivationPath,
                      publicKey: wallet.publicKey,
                      address: wallet.address,
                      privateKey: wallet.privateKey,
                      masterKey: wallet.masterKey,
                      balance: '0',
                      metadata: wallet.metadata,
                    });
                    
                    if (result.success) {
                      // Add to store with ID
                      addWallets([{ ...wallet, id: result.id }]);
                      totalWallets++;
                      
                      // Check balance if enabled (will be batched automatically)
                      if (checkBalances && wallet.address) {
                        try {
                          const balance = await BatchBalanceChecker.getBalance(
                            wallet.chain,
                            wallet.address
                          );
                          
                          if (balance && !balance.error) {
                            await electronAPI.updateBalance(
                              result.id,
                              balance.balance
                            );
                          }
                        } catch (error) {
                          console.error(`Failed to check balance for ${wallet.address}:`, error);
                        }
                      }
                    } else {
                      console.error(`Failed to store wallet for ${chain}:`, result.error);
                      failedWallets++;
                    }
                  } catch (storeError) {
                    console.error(`Failed to store wallet for ${chain} ${path}:`, storeError);
                    failedWallets++;
                  }
                }
              } catch (deriveError) {
                console.error(`Failed to derive wallet for ${chain} ${path}:`, deriveError);
                failedWallets++;
              }
            }
          }
        } catch (mnemonicError) {
          console.error(`Failed to process mnemonic ${i+1}:`, mnemonicError);
          failedWallets++;
        }
      }
      
      let message = `Successfully imported ${totalWallets} wallets`;
      if (failedWallets > 0) {
        message += ` (${failedWallets} failed)`;
      }
      toast.success(message, { id: toastId });
      
      // Clear form
      setMnemonics(['']);
      setPassphrases(['']);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to import wallets', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-nexus-accent/10 border border-nexus-accent/30">
            <Shield className="w-6 h-6 text-nexus-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-2">Import Wallets</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Enter your 12 or 24-word recovery phrases below. Each phrase will generate wallets
              across all selected blockchains. Your mnemonics are encrypted and stored locally.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Import Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6"
      >
        <h4 className="text-sm font-medium text-white mb-4">Import Method</h4>
        <div className="flex space-x-4">
          <button
            onClick={() => setImportMode('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              importMode === 'manual'
                ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30'
                : 'bg-nexus-glass text-white/60 border border-nexus-border hover:bg-white/5'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setImportMode('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              importMode === 'text'
                ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30'
                : 'bg-nexus-glass text-white/60 border border-nexus-border hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 mr-2 inline" />
            Bulk Import
          </button>
        </div>
      </motion.div>

      {/* Text Import */}
      {importMode === 'text' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6"
        >
          <h4 className="text-sm font-medium text-white mb-4">
            <Upload className="w-4 h-4 mr-2 inline text-nexus-accent" />
            Bulk Import from Text
          </h4>
          <p className="text-xs text-white/50 mb-4">
            Enter one mnemonic per line. For passphrases, use format: "mnemonic phrase : passphrase" or "mnemonic phrase | passphrase"
          </p>
          <textarea
            value={textImport}
            onChange={(e) => setTextImport(e.target.value)}
            placeholder={`abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
word1 word2 word3 ... word12 : passphrase1
another mnemonic phrase here | another passphrase`}
            className="glass-textarea w-full h-32 mb-4"
          />
          <button
            onClick={parseTextImport}
            className="glass-button-primary"
          >
            Parse and Import
          </button>
        </motion.div>
      )}

      {/* Chain selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white flex items-center">
            <Globe className="w-4 h-4 mr-2 text-nexus-accent" />
            Select Blockchains ({selectedChains.length}/{getFilteredChains().length})
          </h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllChains}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent hover:bg-nexus-accent/20 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAllChains}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-nexus-glass border border-nexus-glass-border text-white/60 hover:text-white transition-colors"
            >
              None
            </button>
          </div>
        </div>
        
        {/* Network filter */}
        <div className="mb-4">
          <div className="flex space-x-2">
            {['mainnet', 'testnet', 'all'].map((filter) => (
              <button
                key={filter}
                onClick={() => handleNetworkFilterChange(filter as 'all' | 'mainnet' | 'testnet')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all capitalize ${
                  networkFilter === filter
                    ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/30'
                    : 'bg-nexus-glass text-white/60 border border-nexus-border hover:bg-white/5'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {getFilteredChains().map((key) => {
            const config = CHAIN_CONFIGS[key];
            return (
              <button
                key={key}
                onClick={() => toggleChain(key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedChains.includes(key)
                    ? 'bg-nexus-accent/20 border border-nexus-accent/50 text-nexus-accent'
                    : 'bg-nexus-glass border border-nexus-glass-border text-white/60 hover:text-white'
                }`}
                title={config.name}
              >
                {config.symbol}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Mnemonic inputs */}
      <div className="space-y-4">
        {mnemonics.map((mnemonic, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-panel p-6"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white/70">
                    Recovery Phrase #{index + 1}
                  </label>
                  {mnemonics.length > 1 && (
                    <button
                      onClick={() => removeMnemonicField(index)}
                      className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <textarea
                  value={mnemonic}
                  onChange={(e) => handleMnemonicChange(index, e.target.value)}
                  className="glass-textarea min-h-[100px]"
                  placeholder="Enter your 12 or 24 word recovery phrase..."
                  disabled={isProcessing}
                />

                <div>
                  <label className="text-xs font-medium text-white/50 mb-2 block">
                    Passphrase (optional - 13th/25th word)
                  </label>
                  <input
                    type="text"
                    value={passphrases[index] || ''}
                    onChange={(e) => handlePassphraseChange(index, e.target.value)}
                    className="glass-input"
                    placeholder="Optional passphrase..."
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Also known as the 13th or 25th word. Leave empty if not used.
                  </p>
                </div>
                
                {mnemonic && (
                  <div className="flex items-center space-x-2">
                    {WalletDerivationService.validateMnemonic(mnemonic) ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-nexus-accent" />
                        <span className="text-xs text-nexus-accent">
                          Valid {mnemonic.trim().split(/\s+/).length}-word phrase
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs text-yellow-500">
                          Invalid phrase format
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add more button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={addMnemonicField}
          disabled={isProcessing}
          className="glass-button flex items-center space-x-2 text-nexus-accent"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Phrase</span>
        </button>
      </motion.div>

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-6"
      >
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checkBalances}
            onChange={(e) => setCheckBalances(e.target.checked)}
            className="w-4 h-4 rounded border-nexus-glass-border bg-nexus-glass text-nexus-accent focus:ring-nexus-accent"
          />
          <span className="text-sm text-white/70">
            Check balances after import (may take longer)
          </span>
        </label>
      </motion.div>

      {/* Import button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end space-x-4"
      >
        <button
          onClick={handleImport}
          disabled={isProcessing || mnemonics.every(m => !m.trim())}
          className="glass-button-primary flex items-center space-x-2 px-8"
        >
          {isProcessing ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Import Wallets</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}