#!/bin/bash
# Deploy script for Linode server
# Run this on your Linode server after pulling from GitHub

set -e

echo "🚀 Starting deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 3. Build the project
echo "🔨 Building project..."
npm run build

# 4. Set up environment file (if not exists)
if [ ! -f .env ]; then
    echo "⚠️  .env file not found! Creating from template..."
    cp .env.example .env 2>/dev/null || echo "No .env.example found - please create .env manually"
    echo "❗ Please edit .env with your API keys before continuing"
    exit 1
fi

# 5. Create log directory
sudo mkdir -p /var/log/dubdub-suppressor
sudo chown $USER:$USER /var/log/dubdub-suppressor

# 6. Restart with PM2
echo "🔄 Restarting PM2 process..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# 7. Save PM2 process list (for auto-start on reboot)
pm2 save

echo "✅ Deployment complete!"
echo "Check status with: pm2 status"
echo "View logs with: pm2 logs dubdub-suppressor"
