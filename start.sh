#!/bin/bash

# Nexus Wallet Manager Startup Script

echo "🚀 Starting Nexus Wallet Manager..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the application in development mode
echo "✨ Launching Nexus..."
npm run electron:dev

# Alternative: For production build
# npm run build
# npm run electron