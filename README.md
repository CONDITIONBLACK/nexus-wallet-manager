# Nexus Wallet Manager

A revolutionary multi-chain cryptocurrency wallet manager with military-grade encryption and cutting-edge glassmorphic design.

## Features

### 🔐 Security First
- **AES-256 Encryption**: All wallet data encrypted at rest
- **Bcrypt Password Hashing**: Secure master password protection
- **Local Storage Only**: Your keys never leave your device
- **Auto-lock**: Configurable security timeout

### 🌍 Multi-Chain Support
- **Bitcoin** (BTC) - Legacy, SegWit, Native SegWit
- **Ethereum** (ETH) & EVM Chains
- **Binance Smart Chain** (BSC)
- **Polygon** (MATIC)
- **Avalanche** (AVAX)
- **Arbitrum** & **Optimism**
- **Solana** (SOL)
- **Litecoin** (LTC)
- **Dogecoin** (DOGE)
- **Monero** (XMR)
- And many more...

### ✨ Advanced Features
- **Batch Import**: Process multiple mnemonics simultaneously
- **Balance Checking**: Real-time balance updates with USD conversion
- **HD Wallet Support**: Multiple derivation paths per chain
- **Transaction Signing**: Sign and broadcast transactions
- **Export Options**: JSON and Keystore formats
- **Custom RPC Nodes**: Add your own nodes for any chain

### 🎨 Revolutionary Design
- **Glassmorphic UI**: Cutting-edge transparent design
- **Dark Mode**: Optimized for extended use
- **Responsive Layout**: Adapts to any screen size
- **Smooth Animations**: Fluid interactions throughout

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- macOS, Windows, or Linux

### Installation

1. Clone the repository:
```bash
cd ~/Development/MultiWalletChecker
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
./start.sh
# or
npm run electron:dev
```

## Usage

### Initial Setup
1. Launch the application
2. Create a strong master password (minimum 8 characters)
3. Your encrypted database will be initialized

### Importing Wallets
1. Navigate to the Import tab
2. Enter your 12 or 24-word mnemonic phrases
3. Select desired blockchains
4. Click "Import Wallets"

### Managing Wallets
- **View Details**: Click any wallet card
- **Check Balance**: Click refresh icon
- **Export**: Access via wallet detail modal
- **Copy Address**: One-click copy to clipboard

### Security Best Practices
- Never share your master password
- Keep mnemonic phrases offline
- Export wallets only to secure locations
- Enable auto-lock for inactive periods

## Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Desktop**: Electron
- **Styling**: Tailwind CSS + Custom Glassmorphism
- **State**: Zustand
- **Database**: SQLite with encryption
- **Crypto**: ethers.js, bitcoinjs-lib, @scure/bip32

### Security Implementation
```
User Password → Bcrypt Hash → AES-256 Key Generation
                     ↓
              Encrypt/Decrypt
                     ↓
           SQLite Database (Encrypted)
```

## Development

### Project Structure
```
MultiWalletChecker/
├── electron/          # Electron main process
├── src/              
│   ├── components/   # React components
│   ├── services/     # Blockchain services
│   ├── stores/       # State management
│   ├── styles/       # Global styles
│   └── types/        # TypeScript types
├── public/           # Static assets
└── dist/            # Build output
```

### Building for Production
```bash
npm run build
npm run dist
```

### Custom Chain Integration
To add a new blockchain:

1. Update `CHAIN_CONFIGS` in `walletDerivation.ts`
2. Add balance checking logic in `balanceChecker.ts`
3. Update UI components as needed

## Performance

- **Parallel Processing**: Derive multiple wallets simultaneously
- **Lazy Loading**: Load wallet details on demand
- **Optimized Rendering**: Virtual scrolling for large lists
- **Caching**: Smart caching of balance queries

## Troubleshooting

### Database Issues
- Location: `~/Library/Application Support/nexus-wallet-manager/`
- Reset: Delete `nexus-wallets.db` file

### Build Issues
```bash
rm -rf node_modules package-lock.json
npm install
npm run electron:dev
```

## Security Disclosure

Found a security issue? Please email security@nexuslabs.io

## License

MIT License - See LICENSE file for details

## Acknowledgments

Built with passion using:
- React & TypeScript for robust development
- Electron for cross-platform desktop
- Tailwind CSS for beautiful styling
- The broader crypto community for inspiration

---

**Nexus Wallet Manager** - Where Security Meets Elegance

Created with vision, built with precision, designed to inspire.