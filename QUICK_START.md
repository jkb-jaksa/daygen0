# Quick Start Guide

## ✅ Status: Ready to Use!

Your frontend is now fully connected to the NestJS backend on Google Cloud.

## 🚀 Start Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## 🔐 Authentication

1. Sign up with email and password (min 8 characters)
2. You'll receive 3 free credits
3. Start generating!

## 🎨 Generate Images

1. Enter a prompt (e.g., "A serene mountain landscape at sunset")
2. Select an AI model from the dropdown
3. Click "Generate"
4. Wait for the magic ✨
5. Your image appears and is saved to your gallery

## 💳 Credit System

- Each generation costs **1 credit**
- New users get **3 free credits**
- Check your remaining credits in the top-right corner

## 🔧 Available AI Models

### Image Generation
- **Gemini 2.5 Flash** - Fast and versatile
- **FLUX Pro 1.1** - High quality
- **ChatGPT Image (DALL-E 3)** - Popular choice
- **Runway Gen-4** - Professional grade
- **Ideogram V3** - Great for text in images
- **Qwen Image** - Alibaba's model
- **Rêve** - Artistic style
- **Recraft V3** - Brand and layout control
- **Luma Photon** - Latest and fast

### Video Generation
- **Veo 3** - Google's cinematic model
- **Runway Gen-4 Video** - Professional video
- **Wan 2.2** - Alibaba video
- **Hailuo 02** - MiniMax video
- **Kling** - ByteDance hyper-realistic
- **Luma Ray 2** - High quality video

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

## 🆘 Need Help?

1. Check the browser console for errors (F12)
2. Check the Network tab to see API calls
3. Run the backend test script
4. Review `BACKEND_INTEGRATION.md` for detailed info

## 🎉 You're All Set!

Start creating amazing AI-generated content with DayGen!
