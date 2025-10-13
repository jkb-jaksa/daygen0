# Supabase Setup Guide

## 1. Get Your Supabase API Keys

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `kxrxsydlhfkkmvwypcqm`
3. Go to Settings > API
4. Copy the following values:
   - **Project URL** (e.g., `https://kxrxsydlhfkkmvwypcqm.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 2. Update Environment Variables

Run the setup script to configure your environment:

```bash
cd /Users/dominiknowak/code/daygen0
./setup-env.sh
```

Or manually update `.env` file with your real keys.

## 3. Configure Google OAuth App Name

To fix the "random symbols" issue in Google OAuth:

1. Go to Supabase Dashboard > Authentication > Providers
2. Click on Google provider
3. In the "Site URL" field, enter: `http://localhost:5173` (or your frontend URL)
4. In the "Redirect URLs" field, add: `http://localhost:5173/auth/callback`
5. **Important**: In Google Cloud Console, update your OAuth consent screen:
   - Go to https://console.cloud.google.com/
   - Select your project
   - Go to APIs & Services > OAuth consent screen
   - Update "Application name" to "DayGen"
   - Add your logo
   - Update "Authorized domains" to include your domain

## 4. Configure Email Settings

1. Go to Supabase Dashboard > Authentication > Email Templates
2. Customize the email templates with your branding
3. Update the "Site URL" in Authentication > URL Configuration

## 5. Test the Setup

1. Start the frontend: `npm run dev`
2. Start the backend: `npm run start:dev`
3. Test all authentication flows:
   - Sign up with email
   - Sign in with email
   - Google OAuth
   - Password reset

## Troubleshooting

- **401 Unauthorized**: Check that your Supabase keys are correct
- **Google OAuth shows random symbols**: Update OAuth consent screen in Google Cloud Console
- **Magic links not working**: Check redirect URLs in Supabase settings
