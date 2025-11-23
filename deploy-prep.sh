#!/bin/bash

# GUIDER Architecture - Deployment Preparation Script
# This script prepares the repository for Portainer deployment

set -e

echo "🚀 Preparing GUIDER Architecture for deployment..."

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "❌ dist/ folder not found. Running build..."
    yarn build
else
    echo "✅ dist/ folder found"
fi

# Temporarily remove dist from .gitignore
echo "📝 Updating .gitignore to allow dist/ folder..."
sed -i.bak '/^dist$/d' .gitignore
sed -i.bak '/^dist-ssr$/d' .gitignore

echo "✅ .gitignore updated (backup saved as .gitignore.bak)"

# Add files to git
echo "📦 Adding deployment files to git..."
git add dist/
git add docker-compose.yml
git add nginx.conf
git add .dockerignore
git add README.deployment.md
git add .gitignore

echo "✅ Files staged for commit"

echo ""
echo "📋 Next steps:"
echo "1. Commit the changes:"
echo "   git commit -m 'Add deployment configuration and dist folder'"
echo ""
echo "2. Push to your repository:"
echo "   git push origin main"
echo ""
echo "3. In Portainer:"
echo "   - Go to Stacks → Add Stack → Git Repository"
echo "   - Repository URL: https://github.com/YOUR_USERNAME/guider-architecture"
echo "   - Compose path: docker-compose.yml"
echo "   - Click 'Deploy the stack'"
echo ""
echo "🎉 Preparation complete!"
