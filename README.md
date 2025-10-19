# DayGen

A modern AI-powered content generation platform featuring comprehensive image and video generation capabilities with a beautiful, intuitive interface.

## 🚀 Features

### Image Generation
- **Gemini 2.5 Flash**: Google's latest text-to-image model with experimental preview support
- **FLUX Models**: High-quality image generation with multiple variants (Pro 1.1, Ultra, Kontext Pro/Max)
- **Ideogram V3**: Advanced text-to-image with turbo mode and style presets
- **Recraft v2/v3**: Professional image generation with multiple styles and editing capabilities
- **Reve**: Fast image generation, editing, and remixing with advanced controls
- **Qwen Image**: Alibaba's text-to-image generation via DashScope API
- **Runway Gen-4**: Professional image generation with cinematic quality
- **DALL·E**: OpenAI's image generation API with multiple model variants
- **Luma AI**: Dream Shaper, Realistic Vision, and Photon models for various styles

### Video Generation
- **Veo 3**: Google's latest cinematic video generation with advanced prompting
- **Kling**: Advanced video generation with multiple models and camera controls
- **Runway Gen-4 Video**: Professional video generation with style consistency
- **Wan 2.2**: Alibaba's text-to-video generation with high quality output
- **Hailuo 02**: MiniMax video generation with frame control and editing
- **Seedance 1.0 Pro**: High-quality video generation with smooth motion
- **Luma Ray 2**: Professional video generation with advanced features

### Core Features
- **User Authentication**: Supabase Auth with Google OAuth integration
- **Gallery System**: Personal gallery with organization, folders, and sharing
- **Prompt Management**: Save, organize, and reuse prompts with history
- **Digital Avatars**: Create and manage AI-generated avatars
- **Product Visualization**: Generate product mockups and visualizations
- **Real-time Updates**: WebSocket integration for live generation status
- **Credit System**: Flexible pricing with credit packages and subscriptions
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Advanced Features
- **Batch Processing**: Generate multiple images/videos simultaneously
- **Style Presets**: Pre-configured styles for different use cases
- **Aspect Ratio Control**: Multiple aspect ratios for different platforms
- **Negative Prompts**: Fine-tune generation with negative prompting
- **Image Editing**: Built-in editor with cropping, filters, and adjustments
- **Export Options**: Multiple export formats and quality settings
- **Sharing**: Direct sharing to social media and export options
- **Usage Analytics**: Track generation history and credit usage

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API with custom hooks
- **Routing**: React Router v7 with lazy loading
- **UI Components**: Custom components with Lucide React icons
- **Animation**: Framer Motion for smooth animations
- **Storage**: IndexedDB for local caching + Cloudflare R2
- **Authentication**: Supabase Auth with JWT backend integration
- **Payments**: Stripe integration for credits and subscriptions
- **Deployment**: Vercel with edge functions

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
