# [Archived] Quick Start Guide

This content is preserved. For the concise getting-started, see `./FRONTEND_GUIDE.md`.

## ✅ Status: Ready to Use!

Your frontend is now fully connected to the NestJS backend with comprehensive AI generation capabilities.

## 🚀 Start Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## 🔐 Authentication

1. **Sign up** with email and password (min 8 characters)
2. **Google OAuth** - Sign in with Google for quick access
3. You'll receive **20 free credits** to start
4. **Start generating** immediately!

## 🎨 Generate Images

1. **Navigate** to `/create/image` or click "Create" in the navbar
2. **Enter a prompt** (e.g., "A serene mountain landscape at sunset")
3. **Select an AI model** from the dropdown
4. **Choose aspect ratio** and quality settings
5. **Click "Generate"** and wait for the magic ✨
6. **Your image appears** and is automatically saved to your gallery

## 🎬 Generate Videos

1. **Navigate** to `/create/video` or select video from create menu
2. **Enter a video prompt** (e.g., "A cat playing with a ball of yarn")
3. **Select video model** and duration
4. **Configure camera movements** and style
5. **Click "Generate"** and wait for processing
6. **Preview and download** your video

## 💳 Credit System

- **Image generation**: 1 credit per image
- **Video generation**: 5-10 credits per video (varies by model)
- **Image upscale**: 2 credits per image
- **Batch generation**: 1 credit per image in batch
- **New users**: 20 free credits
- **Credit packages**: Buy more credits as needed
- **Subscriptions**: Monthly plans for heavy users
- **Check balance**: Top-right corner shows remaining credits

## 🔧 Available AI Models

### Image Generation
- **Gemini 3 Pro** - Google's latest, fast and versatile with experimental preview support
- **FLUX Pro 1.1** - Black Forest Labs, highest quality image generation
- **FLUX Ultra** - Premium quality with advanced features
- **FLUX Kontext Pro/Max** - Context-aware generation with multiple variants
- **DALL·E 3** - OpenAI's popular model with multiple variants
- **Runway Gen-4** - Professional image generation with cinematic quality
- **Ideogram V3** - Advanced text-to-image with turbo mode and style presets
- **Qwen Image** - Alibaba's high-quality model via DashScope API
- **Reve** - Fast image generation, editing, and remixing with advanced controls
- **Recraft V3** - Professional image generation with multiple styles and editing capabilities
- **Luma AI** - Dream Shaper, Realistic Vision, and Photon models for various styles

### Video Generation
- **Veo 3** - Google's latest cinematic video generation with advanced prompting
- **Runway Gen-4 Video** - Professional video generation with style consistency
- **Wan 2.2** - Alibaba's text-to-video generation with high quality output
- **Hailuo 02** - MiniMax video generation with frame control and editing
- **Kling** - Advanced video generation with multiple models and camera controls
- **Luma Ray 2** - Professional video generation with advanced features
- **Seedance 1.0 Pro** - High-quality video generation with smooth motion

## 🧪 Test Backend Connection

```bash
node test-backend-connection.js
```

This verifies the backend is accessible and working.

## 📁 Project Structure

```
daygen0/                         # Frontend (this directory)
├── src/
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks for AI generation
│   ├── auth/                   # Authentication context
│   └── utils/                  # Utilities (API config, etc.)
├── .env                        # Backend URL configuration
└── BACKEND_INTEGRATION.md      # Detailed integration docs

../daygen-backend/              # Backend (NestJS)
└── (configured separately)
```

## 🐛 Troubleshooting

### Backend connection issues
```bash
# Test if backend is accessible
curl https://daygen-backend-365299591811.europe-central2.run.app/health
```

### Authentication errors
- Clear localStorage and try again
- Check password is at least 8 characters
- Verify email format is correct

### Generation failures
- Check you have credits remaining
- Ensure you're logged in
- Try a different model if one fails

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📚 Documentation

- `BACKEND_INTEGRATION.md` - Complete backend integration details
- `README.md` - Full project documentation
- `FLUX_INTEGRATION_GUIDE.md` - FLUX model specifics
- `GEMINI_INTEGRATION.md` - Gemini model details
- Individual integration docs for other providers

## ⚙️ Environment Variables

Optional configuration overrides:

```bash
# Generation limits and timeouts
VITE_MAX_PARALLEL_GENERATIONS=5    # Max concurrent generations (default: 5)
VITE_LONG_POLL_THRESHOLD_MS=90000  # Long poll timeout in ms (default: 90000)
```

## 🆘 Need Help?

1. Check the browser console for errors (F12)
2. Check the Network tab to see API calls
3. Run the backend test script
4. Review `BACKEND_INTEGRATION.md` for detailed info

## 🎉 You're All Set!

Start creating amazing AI-generated content with DayGen!
