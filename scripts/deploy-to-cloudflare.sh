#!/bin/bash

# Deploy Frontend to Cloudflare Pages with Payment Integration Fixes
# This script builds and deploys the frontend with updated environment variables

set -e

echo "🚀 Deploying Frontend Payment Integration Fixes to Cloudflare Pages..."

# Configuration
PROJECT_NAME="daygen"
BACKEND_URL="https://daygen-backend-365299591811.europe-central2.run.app"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if user is authenticated with Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not authenticated with Cloudflare. Please run 'wrangler login' first."
    exit 1
fi

# Navigate to frontend directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building frontend..."
npm run build

# Update wrangler.jsonc with the correct backend URL
echo "📝 Updating configuration..."
cat > wrangler.jsonc << EOF
{
  "name": "daygen",
  "account_id": "205ebd867bad50a18d438fa71fcfcb09",
  "compatibility_date": "2025-10-06",
  "pages_build_output_dir": "./dist",
  "vars": {
    "VITE_API_BASE_URL": "${BACKEND_URL}"
  }
}
EOF

# Deploy to Cloudflare Pages
echo "🚀 Deploying to Cloudflare Pages..."

# Check if this is a new deployment or update
if wrangler pages project list | grep -q "${PROJECT_NAME}"; then
    echo "📝 Updating existing project..."
    wrangler pages deploy dist --project-name="${PROJECT_NAME}"
else
    echo "🆕 Creating new project..."
    wrangler pages project create "${PROJECT_NAME}"
    wrangler pages deploy dist --project-name="${PROJECT_NAME}"
fi

# Get the deployment URL
echo "🔍 Getting deployment URL..."
DEPLOYMENT_URL=$(wrangler pages project list | grep "${PROJECT_NAME}" | awk '{print $2}' | head -1)

if [ -n "${DEPLOYMENT_URL}" ]; then
    echo "✅ Deployment completed!"
    echo "🌐 Frontend URL: https://${DEPLOYMENT_URL}"
    
    # Test the deployment
    echo "🔍 Testing deployment..."
    if curl -f "https://${DEPLOYMENT_URL}" > /dev/null 2>&1; then
        echo "✅ Frontend is accessible!"
    else
        echo "⚠️  Frontend might not be ready yet. Please check in a few minutes."
    fi
else
    echo "⚠️  Could not determine deployment URL. Please check Cloudflare dashboard."
fi

echo ""
echo "📋 Next steps:"
echo "1. Update your Stripe webhook URL to: ${BACKEND_URL}/webhooks/stripe"
echo "2. Test the payment flow end-to-end"
echo "3. Verify subscription information displays correctly in account page"
echo ""
echo "🎉 Frontend payment integration fixes deployed successfully!"
