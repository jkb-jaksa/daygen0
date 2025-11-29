# Localhost Google OAuth Setup Instructions

## ✅ Code Changes Complete

The frontend code has been updated to use Supabase's native OAuth flow. Now you need to complete the manual configuration steps.

---

## 📋 Step 1: Google Cloud Console Configuration

### Instructions:

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Navigate to Credentials**
   - Click on the menu (☰) in the top-left
   - Go to: **APIs & Services** → **Credentials**

3. **Edit Your OAuth 2.0 Client**
   - Find your OAuth 2.0 Client ID: `365299591811-m1osaqqjlptr324g02jn9b8k5srppc32`
   - Click on it to edit

4. **Add Authorized Redirect URIs**
   - Scroll down to **Authorized redirect URIs**
   - Click **+ ADD URI** and add these TWO URIs:
     ```
     http://localhost:5173/auth/callback
     ```
     ```
     https://kxrxsydlhfkkmvwypcqm.supabase.co/auth/v1/callback
     ```
   - **IMPORTANT**: Make sure there are NO trailing slashes
   - Click **SAVE**

5. **Verify**
   - You should see both URIs listed under "Authorized redirect URIs"
   - Keep the existing production URIs (don't delete them)

---

## 📋 Step 2: Supabase Dashboard Configuration

### Instructions:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your project: `kxrxsydlhfkkmvwypcqm` (or find it by name)

3. **Navigate to Authentication Settings**
   - In the left sidebar, click **Authentication**
   - Then click **URL Configuration**

4. **Add Site URL (if not already set)**
   - Find **Site URL** field
   - Set to: `http://localhost:5173`
   - Click **Save**

5. **Add Redirect URLs**
   - Scroll down to **Redirect URLs**
   - Click **Add URL** and add:
     ```
     http://localhost:5173/**
     ```
   - This wildcard allows all localhost routes
   - Click **Save**

6. **Verify Google Provider is Enabled**
   - Go to **Authentication** → **Providers**
   - Find **Google** in the list
   - Make sure it's **Enabled** (toggle should be ON)
   - Your Client ID should already be set: `365299591811-m1osaqqjlptr324g02jn9b8k5srppc32`

---

## 🧪 Step 3: Test the Setup

### Start the Servers:

1. **Start Backend** (Terminal 1):
   ```bash
   cd /Users/jakubst/Desktop/daygen-backend
   npm run start:dev
   ```
   - Wait for: "Nest application successfully started"
   - Backend should be running on: http://localhost:3000

2. **Start Frontend** (Terminal 2):
   ```bash
   cd /Users/jakubst/Desktop/daygen0
   npm run dev
   ```
   - Wait for: "Local: http://localhost:5173/"
   - Frontend should be running on: http://localhost:5173

### Test Google Login:

1. **Open your browser**
   - Go to: http://localhost:5173

2. **Click "Sign in with Google"**
   - Should redirect to Google OAuth consent screen
   - You may see "This app isn't verified" warning in development
   - Click **Advanced** → **Go to [App Name] (unsafe)**

3. **Select your account**
   - Choose: `jstach.net@gmail.com`
   - Grant permissions

4. **Verify Success**
   - Should redirect back to: http://localhost:5173/auth/callback
   - Should show "Completing authentication..."
   - Should redirect to home page
   - You should be logged in

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: Redirect URI not added to Google Console
**Fix**: 
- Double-check you added BOTH URIs to Google Cloud Console
- Make sure there are NO trailing slashes
- Wait a few minutes for changes to propagate

### Error: "Invalid redirect URL"
**Cause**: Redirect URL not added to Supabase
**Fix**:
- Go to Supabase → Authentication → URL Configuration
- Add `http://localhost:5173/**` to Redirect URLs
- Save and try again

### Stuck on "Completing authentication..."
**Cause**: Backend not running or connection issue
**Fix**:
- Make sure backend is running on port 3000
- Check backend logs for errors
- Check browser console for errors

### "Access blocked: This app's request is invalid"
**Cause**: Google OAuth client not properly configured
**Fix**:
- Verify OAuth client ID matches in all places
- Make sure Google+ API is enabled
- Check that OAuth consent screen is configured

### Still redirecting to daygen.ai
**Cause**: Old Supabase configuration or cache
**Fix**:
- Clear browser cache and cookies
- In Supabase, verify Site URL is set to `http://localhost:5173`
- Check that Redirect URLs includes `http://localhost:5173/**`

---

## ✅ Checklist

- [ ] Added `http://localhost:5173/auth/callback` to Google Cloud Console
- [ ] Added `https://kxrxsydlhfkkmvwypcqm.supabase.co/auth/v1/callback` to Google Cloud Console
- [ ] Added `http://localhost:5173/**` to Supabase Redirect URLs
- [ ] Set Supabase Site URL to `http://localhost:5173`
- [ ] Verified Google provider is enabled in Supabase
- [ ] Backend is running on port 3000
- [ ] Frontend is running on port 5173
- [ ] Successfully logged in with `jstach.net@gmail.com`

---

## 📝 What Was Changed

### Frontend Code Update:
- **File**: `src/auth/SupabaseAuthContext.tsx`
- **Change**: Replaced custom backend call with Supabase's native `signInWithOAuth()` method
- **Benefit**: Simpler, more secure, works on both localhost and production

### Why This Works:
1. Supabase SDK handles the entire OAuth flow
2. Redirects to Google with proper parameters
3. Google redirects back to Supabase
4. Supabase exchanges code for session tokens
5. Supabase redirects to your app with session
6. Your app's `AuthCallback` component handles the session

---

## 🚀 Production Deployment

When deploying to production, remember to:
1. Add production redirect URIs to Google Console (`https://daygen.ai/auth/callback`)
2. Update Supabase Site URL to production domain
3. Add production domain to Supabase Redirect URLs
4. Update `.env.production` with production URLs

---

**Once you complete these steps, Google OAuth will work perfectly on localhost!** 🎉

