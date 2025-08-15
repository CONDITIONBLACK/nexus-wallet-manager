# CLAUDE.md - Nexus Wallet Manager

## Project Overview
Nexus Wallet Manager is a professional-grade, multi-chain cryptocurrency wallet management system with enterprise security features, beautiful glassmorphic UI, and support for 40+ blockchains.

## Key Features & Requirements

### Core Functionality
- **Multi-Chain Support**: 40+ blockchains including Bitcoin, Ethereum, all major EVM chains, and testnets
- **HD Wallet Management**: BIP32/BIP39/BIP44 compliant with multiple derivation paths
- **Smart Balance Checking**: Direct RPC calls to avoid rate limits, 10-minute intelligent caching
- **Bulk Operations**: Import/export multiple wallets, batch balance checking
- **Token Support**: ERC-20, BEP-20, and other token standards

### Security Architecture
- **Military-Grade Encryption**: AES-256-GCM for all sensitive data
- **Multi-Identity System**: Separate encrypted databases per user identity
- **Biometric Authentication**: Face ID and Touch ID support required
- **Counter-Forensics**: Memory protection, secure deletion, anti-debugging
- **Zero-Knowledge**: No telemetry, analytics, or external data collection
- **Plausible Deniability**: Hidden wallet support

### UI/UX Requirements
- **MUST MAINTAIN**: Current glassmorphic aesthetic - NO material changes to look/feel
- **Design System**: See DESIGN_SYSTEM.md for complete guidelines
- **Particle Effects**: Dynamic background animations on login/main pages
- **Smooth Animations**: Framer Motion for all transitions
- **Responsive Design**: Perfect on all screen sizes

### Technical Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom glassmorphism
- **State Management**: Zustand
- **Animation**: Framer Motion
- **Desktop**: Electron with SQLCipher
- **Blockchain**: Ethers.js, BitcoinJS, @scure/bip32
- **Security**: bcrypt, crypto-js, SQLCipher

## Current Issues & TODOs

### High Priority
1. **Fix Export Functionality**: Currently not working properly
2. **Implement Import Feature**: Need ability to import exported wallets
3. **Multi-Identity System**: Create separate databases per identity
4. **Biometric Auth**: Implement Face/Touch ID
5. **Counter-Forensics**: Add memory protection and secure deletion

### Medium Priority
6. **Particle Effects**: Add to login/main pages
7. **GitHub Repository**: Set up ConditionBlack/nexus-wallet-manager
8. **CI/CD Pipeline**: Automated testing and deployment
9. **Documentation**: Comprehensive guides and API docs
10. **Testing Suite**: Unit and E2E tests

### Completed Features
- ✅ 40+ blockchain support with mainnet/testnet
- ✅ Smart balance checking without rate limits
- ✅ Glassmorphic UI design system
- ✅ Bulk import with validation
- ✅ Portfolio overview and analytics
- ✅ Secure local storage
- ✅ Responsive design

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode, no any types
- **Components**: Functional with hooks
- **Styling**: Tailwind utilities, custom glass classes
- **State**: Zustand stores, no prop drilling
- **Security**: Never log sensitive data

### Git Workflow
1. Feature branches: `feature/description`
2. Detailed commit messages
3. Pull requests with documentation
4. No sensitive data in commits
5. Regular syncs with main

### Testing Requirements
- Unit tests for utilities
- Integration tests for services
- E2E tests for critical flows
- Security audit before releases

## API & Service Configuration

### RPC Endpoints (Public)
- **Ethereum**: https://rpc.ankr.com/eth
- **BSC**: https://bsc-dataseed1.binance.org
- **Polygon**: https://polygon-rpc.com
- **Bitcoin**: Mempool.space API

### Rate Limiting Strategy
- Direct RPC calls (no rate limits)
- 10-minute cache duration
- Smart request batching
- Fallback API rotation

## Security Considerations

### Data Protection
- All mnemonics encrypted with AES-256
- Passwords hashed with bcrypt (10 rounds)
- Memory wiped after use
- No plain text storage

### Attack Vectors
- Keylogger protection via secure input
- Memory dump protection
- Timing attack mitigation
- Side-channel resistance

## Build & Deployment

### Development
```bash
npm run dev          # Web development
npm run electron:dev # Electron development
```

### Production
```bash
npm run build        # Web build
npm run electron:build # Electron build
npm run dist         # Package for distribution
```

### Environment Variables
```env
VITE_DEV_MODE=true
# No API keys stored - all public endpoints
```

## File Structure
```
src/
├── components/      # React components (maintain aesthetic!)
├── services/       # Blockchain/crypto services
│   ├── walletDerivation.ts  # HD wallet generation
│   ├── smartBalanceChecker.ts # Balance checking
│   └── apiErrorHandler.ts   # Error handling
├── stores/         # Zustand state management
├── styles/         # Global styles (don't change!)
└── utils/          # Helper functions
```

## Important Notes

### Design Aesthetic
**CRITICAL**: The glassmorphic UI design is perfect and must NOT be materially altered. Any new features must:
- Use existing glass panel styles
- Follow color palette exactly
- Maintain smooth animations
- Respect spacing system
- Keep dark theme

### Security Requirements
- Zero external dependencies for crypto operations
- All encryption happens client-side
- No network calls for sensitive data
- Regular security audits required

### Performance Targets
- Initial load < 2 seconds
- Balance check < 1 second (cached)
- Wallet derivation < 100ms
- Animation @ 60fps

## Contact & Support
- Repository: github.com/ConditionBlack/nexus-wallet-manager
- Issues: GitHub Issues
- Security: security@nexuslabs.io

---

Last Updated: 2024-01-15
Version: 1.0.0