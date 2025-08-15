import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, FileText, Key, Shield, CheckCircle, AlertCircle,
  X, Download, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { electronAPI } from '../utils/electron';
import { useStore } from '../stores/appStore';

interface ImportWalletProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportWallet({ isOpen, onClose }: ImportWalletProps) {
  const { loadWallets } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [textInput, setTextInput] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    try {
      const fileContent = await file.text();
      await processImport(fileContent);
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const processImport = async (fileData: string) => {
    setIsImporting(true);
    try {
      // First try without password
      // @ts-ignore
      let result = await electronAPI.importWalletFile(fileData);
      
      // If password is required, show password input
      if (!result.success && result.error?.includes('Password required')) {
        setNeedsPassword(true);
        setIsImporting(false);
        return;
      }
      
      // If we have a password, try with it
      if (needsPassword && password) {
        // @ts-ignore
        result = await electronAPI.importWalletFile(fileData, password);
      }
      
      if (result.success) {
        toast.success(result.message || 'Wallet imported successfully');
        await loadWallets();
        resetForm();
        onClose();
      } else {
        toast.error(result.error || 'Import failed');
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      toast.error('Please enter a password');
      return;
    }
    
    const fileData = importMethod === 'file' ? '' : textInput;
    await processImport(fileData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      handleFileSelect(file);
    } else {
      toast.error('Please select a valid JSON wallet file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const resetForm = () => {
    setTextInput('');
    setPassword('');
    setNeedsPassword(false);
    setImportMethod('file');
    setIsDragging(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-8"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-panel-elevated w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-nexus-glass-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-light text-white mb-2">Import Wallet</h2>
              <p className="text-sm text-white/60">
                Import wallets from exported JSON or keystore files
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>

        {/* Method Selection */}
        <div className="p-6 border-b border-nexus-glass-border">
          <div className="flex space-x-4">
            <button
              onClick={() => setImportMethod('file')}
              className={`flex-1 p-4 rounded-lg border transition-colors ${
                importMethod === 'file'
                  ? 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto mb-2" />
              <div className="text-sm font-medium">Upload File</div>
            </button>
            <button
              onClick={() => setImportMethod('text')}
              className={`flex-1 p-4 rounded-lg border transition-colors ${
                importMethod === 'text'
                  ? 'bg-nexus-accent/10 border-nexus-accent/30 text-nexus-accent'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <FileText className="w-5 h-5 mx-auto mb-2" />
              <div className="text-sm font-medium">Paste JSON</div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {!needsPassword ? (
            <>
              {importMethod === 'file' && (
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-nexus-accent bg-nexus-accent/5'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Drop wallet file here
                    </h3>
                    <p className="text-sm text-white/60 mb-4">
                      Or click to browse for JSON or keystore files
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="glass-button-primary"
                    >
                      Browse Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {importMethod === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Wallet JSON Data
                    </label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste your wallet JSON data here..."
                      className="w-full h-48 p-4 bg-black/30 border border-white/10 rounded-lg text-white/80 text-sm font-mono resize-none focus:border-nexus-accent focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => processImport(textInput)}
                    disabled={!textInput.trim() || isImporting}
                    className="glass-button-primary w-full disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : 'Import Wallet'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="glass-panel p-4 bg-yellow-500/5 border-yellow-500/20">
                <div className="flex items-start space-x-3">
                  <Key className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400 mb-1">
                      Password Required
                    </h4>
                    <p className="text-xs text-yellow-400/80">
                      This keystore file is password protected. Enter the password to decrypt and import.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Keystore Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter keystore password"
                  className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-nexus-accent focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setNeedsPassword(false)}
                  className="flex-1 glass-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!password.trim() || isImporting}
                  className="flex-1 glass-button-primary disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="p-6 border-t border-nexus-glass-border bg-white/[0.02]">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-xs text-white/60">
              <p className="mb-2">
                <strong className="text-white/80">Supported formats:</strong>
              </p>
              <ul className="space-y-1">
                <li>• Nexus Wallet Manager exports (.json)</li>
                <li>• Ethereum keystore files (.json)</li>
                <li>• Raw wallet JSON with private keys</li>
              </ul>
              <p className="mt-3 text-yellow-400/80">
                <Shield className="w-3 h-3 inline mr-1" />
                Your private keys are encrypted and stored locally. Never share your wallet files.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}