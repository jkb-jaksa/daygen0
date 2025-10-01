# DayGen

A modern AI-powered content generation platform featuring image and video generation capabilities.

## 🚀 Features

### Image Generation
- **Gemini 2.0**: Google's latest text-to-image model with experimental preview support
- **FLUX Models**: High-quality image generation with multiple variants (Pro 1.1, Ultra, Kontext)
- **Ideogram V3**: Advanced text-to-image with turbo mode
- **Recraft v2/v3**: Professional image generation with multiple styles
- **Reve**: Fast image generation, editing, and remixing
- **Qwen Image**: Alibaba's text-to-image generation via DashScope
- **Runway Gen-4**: Professional image generation
- **SeeDream**: BytePlus Ark image generation
- **DALL·E**: OpenAI's image generation API

### Video Generation
- **Veo 3**: Google's latest cinematic video generation
- **Kling**: Advanced video generation with multiple models and camera controls
- **Runway Gen-4 Video**: Professional video generation
- **Wan 2.2**: Alibaba's text-to-video generation
- **Hailuo 02**: MiniMax video generation with frame control
- **Seedance 1.0 Pro**: High-quality video generation
- **Luma Ray 2**: Professional video generation

### Additional Features
- User authentication and profile management
- Gallery system for saved generations
- Prompt history and saved prompts
- Digital avatar creation
- Multiple aspect ratios and quality settings
- Negative prompt support
- Real-time generation status updates

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Backend**: NestJS (separate repository)
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Cloudflare R2
- **Deployment**: Vercel (Frontend), Google Cloud Run (Backend)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jkb-jaksa/daygen0.git
cd daygen0
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your API keys and configuration
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 📝 Environment Variables

See `.env.example` for required environment variables. You'll need API keys for the generation providers you want to use.

## 🔗 Backend

The backend is in a separate repository: [daygen-backend](https://github.com/skrrrt-and-boom/daygen-backend)

## 📚 Documentation

- [Backend Integration Guide](./BACKEND_INTEGRATION.md)
- [FLUX Integration Guide](./FLUX_INTEGRATION_GUIDE.md)
- [Gemini Integration](./GEMINI_INTEGRATION.md)
- [Ideogram Integration](./IDEOGRAM_INTEGRATION.md)
- [Recraft Integration](./RECRAFT_INTEGRATION.md)
- [Reve Integration](./REVE_INTEGRATION.md)
- [Runway Integration](./RUNWAY_INTEGRATION.md)
- [Quick Start Guide](./QUICK_START.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)

## 🌐 Live Demo

Visit [daygen0.vercel.app](https://daygen0.vercel.app)

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Please contact the maintainers for contribution guidelines.
