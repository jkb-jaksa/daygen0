# Backend Integration Guide

## Overview

This frontend is now connected to the NestJS backend deployed on Google Cloud:
- **Backend URL**: `https://daygen-backend-365299591811.europe-central2.run.app/`

## Architecture

### Backend (NestJS - Google Cloud)
- **Authentication**: JWT Bearer tokens
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: Cloudflare R2
- **Deployment**: Google Cloud Run

### Frontend (React + Vite)
- **Framework**: React 19 with TypeScript
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Authentication**: JWT stored in localStorage

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
  - Body: `{ email, password, displayName }`
  - Response: `{ accessToken, user }`
- `POST /api/auth/login` - Login with credentials
  - Body: `{ email, password }`
  - Response: `{ accessToken, user }`
- `GET /api/auth/me` - Get current user profile
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ id, email, displayName, credits, ... }`
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### User Management
- `PATCH /api/users/me` - Update user profile
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ displayName?, profileImage? }`

### Image Generation
All image providers are now exposed via dedicated endpoints under `/api/image/<provider>`.

- `POST /api/image/gemini` – Google Gemini 2.5 Flash Image
- `POST /api/image/flux` – Flux Pro 1.1 / Flux Pro 1.1 Ultra / Flux Kontext Pro & Max
- `POST /api/image/chatgpt` – OpenAI DALL·E 3 (ChatGPT Image)
- `POST /api/image/ideogram` – Ideogram 3.0
- `POST /api/image/qwen` – Alibaba Qwen Image
- `POST /api/image/runway` – Runway Gen-4 & Gen-4 Turbo
- `POST /api/image/reve` – Rêve Image
- `POST /api/image/recraft` – Recraft v3 / Recraft v2
- `POST /api/image/luma` – Luma Photon 1 & Luma Photon Flash 1

Common request fields:

```json
{
  "prompt": "string",
  "model": "specific-model-name",           // optional if endpoint already implies the default
  "imageBase64": "data:image/png;base64,...", // optional image-to-image input
  "references": ["data:image/png;base64,..."], // optional reference images
  "providerOptions": { ... }                  // optional provider-specific options (size, quality, etc.)
}
```

Each endpoint returns a payload containing either an R2 URL (`dataUrl`, `image`, etc.) or provider metadata. The backend normalises provider responses and uploads persistent assets to Cloudflare R2.

### Health Check
- `GET /health` - Check backend status
  - Response: `{ status: "ok", info: { database: { status: "up" } } }`

## Environment Configuration

### Development (.env)
```bash
VITE_API_BASE_URL=https://daygen-backend-365299591811.europe-central2.run.app
VITE_SITE_PASSWORD=your_dev_password_here
```

### Production (.env.production)
```bash
VITE_API_BASE_URL=https://daygen-backend-365299591811.europe-central2.run.app
```

### Local Backend Development (.env.local - optional)
If you want to test with a local backend:
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_SITE_PASSWORD=your_dev_password_here
```

## How It Works

### API URL Resolution
The frontend uses `src/utils/api.ts` to determine the API base URL:
1. Checks `VITE_API_BASE_URL` environment variable
2. Falls back to `VITE_BASE_URL`
3. If neither is set, uses relative paths (which will use Vite dev proxy in development)

### Authentication Flow
1. User signs up or logs in via `AuthContext`
2. Backend returns JWT `accessToken` and user object
3. Frontend stores token in `localStorage` with key `daygen:authToken`
4. All subsequent API requests include `Authorization: Bearer <token>` header
5. Backend validates JWT and extracts user info
6. Backend checks user credits before allowing generation

### Credit System
- Users start with 3 credits (configured in backend)
- Each image generation costs 1 credit
- Credits are deducted by the backend before processing
- Frontend displays remaining credits in UI
- When credits run out, backend returns error and frontend shows message

### Image Generation Flow
1. User enters prompt and selects model
2. Frontend calls the corresponding `/api/image/<provider>` endpoint with the JWT token
3. Backend:
   - Validates JWT and checks user credits
   - Deducts 1 credit
   - Routes request to appropriate AI provider
   - Waits for generation (5-30 seconds depending on model)
   - **Uploads image to Cloudflare R2** (persistent storage)
   - Creates R2File record in database with metadata
   - Returns R2 public URL (not base64 data)
4. Frontend receives R2 URL and displays the generated image
5. Image is saved to user's gallery with R2 URL
6. Image remains accessible at R2 URL: `https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/generated-images/*`

**Note**: Images are stored permanently in Cloudflare R2, not just as temporary data. This ensures:
- Fast loading times (CDN-backed)
- Persistent storage (images don't disappear)
- Efficient API responses (URLs vs base64)
- Shareable links
- Gallery functionality across devices

## Supported AI Providers

The backend integrates with these providers (configured via environment variables):
- **Flux** (Black Forest Labs) - `flux-pro-1.1`, `flux-pro-1.1-ultra`, `flux-kontext-pro`, `flux-kontext-max`
- **Gemini 2.5 Flash Image** (Google) - `gemini-2.5-flash-image-preview`
- **Ideogram V3** - `ideogram`
- **Qwen Image** (Alibaba) - `qwen-image`
- **Runway Gen-4** - `runway-gen4`, `runway-gen4-turbo`
- **DALL-E 3** (OpenAI) - `chatgpt-image`
- **Rêve** - `reve-image`
- **Recraft** - `recraft-v3`, `recraft-v2`
- **Luma Photon** - `luma-photon-1`, `luma-photon-flash-1`

## Development

### Start Frontend (with Google Cloud Backend)
```bash
npm run dev
# or
vite
```
This will start the frontend on `http://localhost:5173` (or similar) and connect to the Google Cloud backend.

### Start Frontend with Local Backend
1. Edit `.env` to use `VITE_API_BASE_URL=http://localhost:3001`
2. Start backend: `cd ../daygen-backend && npm run start:dev`
3. Start frontend: `npm run dev`

### Build for Production
```bash
npm run build
# Creates optimized build in /dist directory
```

## Troubleshooting

### CORS Issues
If you see CORS errors in the browser console:
- Check that the backend has proper CORS configuration
- Verify the frontend origin is allowed in backend CORS settings
- In NestJS backend, check `main.ts` for `app.enableCors()` configuration

### Authentication Errors
- Check that JWT_SECRET is properly configured in backend
- Verify token is being sent in Authorization header
- Check token expiration (tokens expire after configured duration)
- Clear localStorage and re-login if needed

### API Connection Issues
- Verify backend is running: `curl https://daygen-backend-365299591811.europe-central2.run.app/health`
- Check `.env` file has correct `VITE_API_BASE_URL`
- Restart Vite dev server after changing `.env`
- Check browser network tab for actual API calls

### Generation Failures
- Check user has sufficient credits
- Verify API keys are configured in backend environment
- Check backend logs for provider-specific errors
- Ensure image data is properly formatted (base64 with mime type)

## Security Notes

1. **JWT Tokens**: Stored in localStorage, automatically included in requests
2. **API Keys**: All AI provider API keys are stored securely in backend environment
3. **No Client-Side Keys**: Frontend never exposes API keys (except for VITE_SITE_PASSWORD which is client-side auth)
4. **Credit System**: Prevents abuse by limiting generations per user
5. **JWT Validation**: Backend validates every request to ensure authenticated access

## Next Steps

1. ✅ Backend deployed to Google Cloud
2. ✅ Frontend configured to connect to backend
3. ✅ Environment variables set up
4. 🔄 Test authentication flow
5. 🔄 Test image generation with one provider
6. 🔄 Test credit system
7. 🔄 Deploy frontend to production

## Testing the Integration

Test the connection by running:
```bash
# Test health endpoint
curl https://daygen-backend-365299591811.europe-central2.run.app/health

# Test auth endpoint (should return validation error)
curl -X POST https://daygen-backend-365299591811.europe-central2.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"short"}'
```

Both should return responses (not connection errors), confirming the backend is accessible.
