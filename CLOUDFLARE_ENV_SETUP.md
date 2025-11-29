# Cloudflare Pages Environment Variables Setup

## Problem
The frontend is missing Supabase environment variables, causing "Invalid Refresh Token" errors.

## Solution

You need to set these environment variables in the **Cloudflare Pages Dashboard**:

### Required Environment Variables

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Pages → Your Project → Settings → Environment Variables
3. Add these variables for **Production** environment:

```
VITE_SUPABASE_URL=https://kxrxsydlhfkkmvwypcqm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cnhzeWRsaGZra212d3lwY3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTgzOTEsImV4cCI6MjA3Mzk3NDM5MX0.odXDaM0gAoQT2hd09StEG2Jl1eBAVFDtahupZLU7v2k
VITE_API_BASE_URL=https://daygen-backend-365299591811.europe-central2.run.app
```

### After Setting Variables

1. **Trigger a new deployment** (push to main or manually redeploy)
2. The new build will include the Supabase configuration
3. Users may need to **clear their browser localStorage** to remove old invalid tokens:
   - Open browser DevTools (F12)
   - Go to Application → Local Storage → your domain
   - Delete the `daygen-auth` key

### Alternative: Set via Wrangler CLI

```bash
cd daygen0
wrangler pages project list  # Find your project name
wrangler pages secret put VITE_SUPABASE_URL --project-name=daygen
wrangler pages secret put VITE_SUPABASE_ANON_KEY --project-name=daygen
```

Note: For Vite environment variables, they should be set as **Build Environment Variables** not secrets, since they're needed at build time.

