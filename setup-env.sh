#!/bin/bash

# Setup environment variables for Supabase Auth (Frontend)
echo "Setting up frontend environment variables..."

# Get real Supabase keys from the user
echo "Please enter your Supabase project details:"
read -p "Supabase URL (e.g., https://your-project.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY

# Create .env file with real Supabase configuration
cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL="${SUPABASE_URL}"
VITE_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"

# Backend API URL
VITE_API_BASE_URL="http://localhost:3000"
EOF

echo "Frontend environment file created with your Supabase keys!"
echo "You can find your keys in your Supabase dashboard under Settings > API"
