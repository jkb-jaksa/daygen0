import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, Outlet, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useFooter } from "./contexts/useFooter";
import { useAuth } from "./auth/useAuth";
import { layout, text, buttons, headings, glass } from "./styles/designSystem";
import { safeResolveNext, AUTH_ENTRY_PATH, setPendingAuthRedirect } from "./utils/navigation";
import { authMetrics } from "./utils/authMetrics";
import useParallaxHover from "./hooks/useParallaxHover";
import { Edit as EditIcon, Image as ImageIcon, Video as VideoIcon, Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { GenerationProvider } from "./components/create/contexts/GenerationContext";
import { GalleryProvider } from "./components/create/contexts/GalleryContext";
import { StyleModalProvider } from "./contexts/StyleModalProvider";
import { useStyleModal } from "./contexts/useStyleModal";


import { motion, AnimatePresence } from "framer-motion";

const Understand = lazy(() => import("./components/Understand"));
const AboutUs = lazy(() => import("./components/AboutUs"));
const Prompts = lazy(() => import("./components/Prompts"));
const Explore = lazy(() => import("./components/Explore"));
const KnowledgeBase = lazy(() => import("./components/KnowledgeBase"));
const LearnToolPage = lazy(() => import("./components/LearnToolPage"));
const CreateRoutes = lazy(() => import("./routes/CreateRoutes"));
const MasterRoutes = lazy(() => import("./routes/MasterRoutes"));
const Edit = lazy(() => import("./components/Edit"));
const Account = lazy(() => import("./components/Account"));
const AuthErrorBoundary = lazy(() => import("./components/AuthErrorBoundary"));
const Upgrade = lazy(() => import("./components/Upgrade"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Courses = lazy(() => import("./components/Courses"));
const GalleryRoutes = lazy(() => import("./routes/GalleryRoutes"));
const LearnLayout = lazy(() => import("./routes/LearnLayout"));
const Navbar = lazy(() => import("./components/Navbar"));
const FAQSection = lazy(() => import("./components/Faq"));
const Footer = lazy(() => import("./components/Footer"));
const GlobalSvgDefs = lazy(() => import("./components/GlobalSvgDefs"));
const ResetPasswordPage = lazy(() => import("./components/ResetPasswordPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PaymentSuccess = lazy(() => import("./components/payments/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const DebugPanel = lazy(() => import("./components/DebugPanel").then(({ DebugPanel }) => ({ default: DebugPanel })));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const ResetCache = lazy(() => import("./pages/ResetCache"));


function JobRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/app/image?jobId=${jobId}`} replace />;
}

function NavbarFallback() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-theme-black/40 backdrop-blur">
      <div className={`${layout.container} flex min-h-[2.75rem] items-center justify-between py-1`}>
        <div className="h-6 w-24 animate-pulse rounded bg-theme-white/10" />
        <div className="hidden items-center gap-3 md:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-theme-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-theme-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-theme-white/10" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-theme-white/10" />
      </div>
    </div>
  );
}

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-20">
      <div className="flex flex-col items-center gap-3 text-theme-white/70">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-theme-white/30 border-t-theme-white" aria-hidden="true" />
        <p className="font-raleway text-sm uppercase tracking-[0.3em]">Loading {label}…</p>
      </div>
    </div>
  );
}

function UseCaseCard({
  title,
  imageUrl,
  imageAlt,
  to,
  onClick,
  imageHeight = "h-40 sm:h-44 md:h-48",
  subtitle,
  delay = 0,
}: {
  title: string;
  imageUrl: string;
  imageAlt: string;
  to?: string;
  onClick?: () => void;
  imageHeight?: string;
  subtitle?: string;
  delay?: number;
}) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="relative parallax-large mouse-glow shadow-lg border border-theme-dark hover:border-theme-mid transition-all duration-100 rounded-2xl overflow-hidden cursor-pointer"
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
        className={`${imageHeight} w-full object-cover`}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-2 right-2 flex items-end">
        <div className="UseCaseDescription relative z-10 px-4 pt-1.5 pb-2 rounded-2xl">
          <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-white font-raleway whitespace-nowrap drop-shadow-md">{title}</h2>
          {subtitle && (
            <p className="text-sm font-normal text-white/90 font-raleway mt-0.5 drop-shadow-sm">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (to && !onClick) {
    return (
      <Link to={to} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

const HOME_CATEGORIES = [
  { id: "text", label: "text", Icon: EditIcon, gradient: "from-amber-300 via-amber-400 to-orange-500", iconColor: "text-amber-400" },
  { id: "image", label: "image", Icon: ImageIcon, gradient: "from-red-400 via-red-500 to-red-600", iconColor: "text-red-500" },
  { id: "video", label: "video", Icon: VideoIcon, gradient: "from-blue-400 via-blue-500 to-blue-600", iconColor: "text-blue-500" },
  { id: "audio", label: "audio", Icon: Volume2, gradient: "from-cyan-300 via-cyan-400 to-cyan-500", iconColor: "text-cyan-400" },
] as const;

function ModalityContainer({
  category,
  content,
  delay = 0,
}: {
  category: (typeof HOME_CATEGORIES)[number];
  content: string;
  delay?: number;
}) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={`${glass.surface} parallax-large relative overflow-hidden group flex flex-col rounded-3xl border border-theme-dark hover:border-theme-mid transition-all duration-100 aspect-[4/3]`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className={`absolute top-3 left-3 z-10 flex items-center gap-2 glass-liquid willchange-backdrop isolate backdrop-blur-[40px] bg-[color:var(--glass-dark-bg)] px-3 py-1.5 rounded-full border border-theme-dark`}>
        <category.Icon className={`w-3.5 h-3.5 ${category.iconColor}`} />
        <span className="text-theme-text font-raleway text-sm capitalize">{category.label}</span>
      </div>

      <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-theme-black/20">
        {category.id === 'text' && (
          <div className="w-full h-full p-6 flex items-center justify-center bg-gradient-to-br from-theme-black/40 to-theme-black/10">
            <p className="text-sm text-theme-text font-raleway text-center line-clamp-5 leading-relaxed selection:bg-amber-500/30">"{content}"</p>
          </div>
        )}
        {category.id === 'image' && (
          <img src={content} alt="Persona content" className="w-full h-full object-cover" />
        )}
        {category.id === 'video' && (
          <div className="relative w-full h-full">
            <img src={content} alt="Video thumbnail" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
        {category.id === 'audio' && (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-theme-black/40 to-theme-black/10 group-hover:bg-theme-black/5 transition-colors">
            <div className="flex items-center gap-1 h-12">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  style={{
                    height: `${Math.max(20, Math.random() * 100)}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-theme-white/70 truncate w-full text-center max-w-[80%]">"{content}"</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

type HomeCategoryId = (typeof HOME_CATEGORIES)[number]["id"];

const PERSONAS = [
  {
    id: "dominik",
    name: "Dominik",
    age: 21,
    //! ... (Personas data kept same)
    role: "CEO/Founder",
    image: "/dominik.jpg",
    bio: "Building the future of digital identity.",
    content: {
      text: "The future of digital identity is here. Create your copy today.",
      image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/lifestyle images.png",
      video: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/product visualizations.png",
      audio: "Welcome to Daygen. This is my digital voice.",
    }
  },
  {
    id: "kinga",
    name: "Kinga",
    age: 24,
    role: "Influencer",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
    bio: "Sharing my life and style with the world.",
    content: {
      text: "Just posted a new look! Check it out on my feed.",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
      video: "https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?q=80&w=1000&auto=format&fit=crop",
      audio: "Hey guys! Welcome back to my channel.",
    }
  },
  {
    id: "jakub",
    name: "Jakub",
    age: 31,
    role: "Educator",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop",
    bio: "Empowering the next generation of learners.",
    content: {
      text: "Learning is a lifelong journey. Let's explore together.",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1000&auto=format&fit=crop",
      video: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop",
      audio: "Today's lesson is about the power of AI.",
    }
  },
  {
    id: "michal",
    name: "Michał",
    age: 30,
    role: "Youtuber",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
    bio: "Creating content that entertains and inspires.",
    content: {
      text: "Don't forget to like and subscribe!",
      image: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1000&auto=format&fit=crop",
      video: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1000&auto=format&fit=crop",
      audio: "What's up everyone? It's Michał here.",
    }
  },
];

function ComingSoonPanel({ label, className }: { label: string; className?: string }) {
  const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`${glass.surface} rounded-3xl border-theme-dark px-6 py-16 text-center sm:px-8 ${className ?? ""} flex flex-col items-center justify-center bg-gradient-to-b from-white/5 to-transparent`}
    >
      <h2 className="text-xl font-raleway font-normal text-theme-text/80">{formattedLabel}</h2>
      <p className="mt-2 text-sm font-raleway text-theme-white/50 tracking-wider uppercase text-[0.7rem]">Coming soon</p>
    </motion.div>
  );
}

function Home() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { openStyleModal } = useStyleModal();
  const [activeCategory, setActiveCategory] = useState<HomeCategoryId>("image");
  const [pressedCategory, setPressedCategory] = useState<HomeCategoryId | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string>("dominik");

  const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = true;
      import("./routes/MasterRoutes");
    }
  }, []);

  useEffect(() => {
    if (location.hash === "#faq" && typeof window !== "undefined") {
      const timeout = window.setTimeout(() => {
        const faqSection = document.getElementById("faq");
        faqSection?.scrollIntoView({ behavior: "smooth" });
      }, 0);

      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [location.hash]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sidebar = sidebarRef.current;
    const content = contentRef.current;

    if (!sidebar || !content) {
      return undefined;
    }

    const updateHeight = () => {
      if (window.innerWidth < 1024) {
        sidebar.style.removeProperty("minHeight");
        return;
      }
      sidebar.style.minHeight = `${content.offsetHeight}px`;
    };

    updateHeight();

    let resizeObserver: ResizeObserver | undefined;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(content);
    }

    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      sidebar.style.removeProperty("minHeight");
    };
  }, [activeCategory]);

  // Redirect logged-in users to /app
  if (isLoading) {
    return <RouteFallback />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const activeCategoryInfo = HOME_CATEGORIES.find((category) => category.id === activeCategory);
  const activeCategoryLabel = activeCategoryInfo ? activeCategoryInfo.label : activeCategory;
  const isImageCategory = activeCategory === "image";

  return (
    <div className={`${layout.page} home-page overflow-x-hidden`}>
      <div className="relative z-10">
        <section className="relative min-h-[100dvh] pt-[calc(var(--nav-h,4rem)+16px)] pb-[calc(var(--nav-h)+0.5rem)]">
          <div className={`${layout.container}`}>
            <div className="flex flex-col gap-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="home-hero relative z-10 w-full"
              >
                <div className="flex items-start justify-between gap-4 w-full">
                  <div className="flex flex-col gap-2 lg:max-w-xl">
                    <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-left bg-gradient-to-r from-theme-text via-theme-text/80 to-theme-text/60 bg-clip-text text-transparent pb-1`}>
                      Create your Digital Copy.
                    </h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.8 }}
                      className={`${headings.tripleHeading.description} text-theme-text text-left mt-0 mb-1`}
                    >
                      Your Digital Soul. All in one place.
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-right flex-shrink-0 hidden lg:block font-normal opacity-50`}
                  >
                    daygen
                  </motion.div>
                </div>
              </motion.div>
              <div className="w-full flex flex-col gap-6">
                {/* Bio Card with integrated switcher */}
                <div className="w-full max-w-sm lg:w-80 relative group mx-auto lg:mx-0">
                  <button
                    onClick={() => {
                      const currentIndex = PERSONAS.findIndex(p => p.id === activePersonaId);
                      const prevIndex = (currentIndex - 1 + PERSONAS.length) % PERSONAS.length;
                      setActivePersonaId(PERSONAS[prevIndex].id);
                    }}
                    className={`${glass.promptDark} hover:border-theme-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text shadow-lg backdrop-blur-md`}
                    aria-label="Previous persona"
                  >
                    <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                  </button>

                  <div className="relative overflow-hidden rounded-[28px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activePersona.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <UseCaseCard
                          title={`${activePersona.name}, ${activePersona.age}`}
                          subtitle={activePersona.role}
                          imageUrl={activePersona.image}
                          imageAlt={activePersona.name}
                          onClick={openStyleModal}
                          imageHeight="h-52"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => {
                      const currentIndex = PERSONAS.findIndex(p => p.id === activePersonaId);
                      const nextIndex = (currentIndex + 1) % PERSONAS.length;
                      setActivePersonaId(PERSONAS[nextIndex].id);
                    }}
                    className={`${glass.promptDark} hover:border-theme-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text shadow-lg backdrop-blur-md`}
                    aria-label="Next persona"
                  >
                    <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                  </button>
                </div>

                {/* Modality Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
                  <AnimatePresence mode="wait">
                    {HOME_CATEGORIES.map((category, index) => {
                      const content = activePersona.content[category.id as keyof typeof activePersona.content];
                      return (
                        <div key={`${category.id}-${activePersonaId}`}>
                          <ModalityContainer
                            category={category}
                            content={content as string}
                            delay={index * 0.1}
                          />
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="relative min-h-[100dvh] pt-[calc(var(--nav-h,4rem)+16px)] pb-[calc(var(--nav-h)+0.5rem)]">
          <div className={`${layout.container}`}>
            <div className="flex flex-col gap-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="home-hero relative z-10 w-full"
              >
                <div className="flex items-start justify-between gap-4 w-full">
                  <div className="flex flex-col gap-2 lg:max-w-xl">
                    <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-left bg-gradient-to-r from-theme-text via-theme-text/80 to-theme-text/50 bg-clip-text text-transparent pb-1`}>
                      Create your Digital Copy.
                    </h1>
                    <p className={`${headings.tripleHeading.description} text-theme-text text-left mt-0 mb-1`}>
                      Your Digital Soul. All in one place.
                    </p>
                    <motion.div
                      className="home-hero-actions flex flex-wrap gap-2 pt-2"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <Link to="/learn/use-cases" className={buttons.ghost}>
                        Learn
                      </Link>
                      <Link
                        to="/app/image"
                        className={buttons.primary}
                        onMouseEnter={handlePrefetch}
                      >
                        Create
                      </Link>
                    </motion.div>
                  </div>
                  <div className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-right flex-shrink-0 hidden lg:block font-normal opacity-50`}>
                    daygen
                  </div>
                </div>
              </motion.div>
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[8rem,1fr] lg:gap-4 lg:items-stretch">
                <nav
                  className="rounded-3xl p-4 lg:px-0 lg:h-full"
                  ref={sidebarRef}
                  aria-label="Modality categories"
                >
                  <ul className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-2">
                    <AnimatePresence>
                      {HOME_CATEGORIES.map((category) => {
                        const isActive = category.id === activeCategory;
                        const Icon = category.Icon;

                        // Color-specific shadow mappings for each category
                        const shadowColorMap: Record<string, string> = {
                          text: "rgba(251, 191, 36, 0.15)",
                          image: "rgba(239, 68, 68, 0.15)",
                          video: "rgba(59, 130, 246, 0.15)",
                          audio: "rgba(34, 211, 238, 0.15)",
                        };

                        // Pressed state shadow colors (slightly higher opacity for subtle effect)
                        const pressedShadowColorMap: Record<string, string> = {
                          text: "rgba(251, 191, 36, 0.22)",
                          image: "rgba(239, 68, 68, 0.22)",
                          video: "rgba(59, 130, 246, 0.22)",
                          audio: "rgba(34, 211, 238, 0.22)",
                        };

                        // Color-specific border class mappings for each category (subtle, barely visible)
                        const borderColorMap: Record<string, string> = {
                          text: "border-amber-400/25",
                          image: "border-red-500/25",
                          video: "border-blue-500/25",
                          audio: "border-cyan-400/25",
                        };

                        const isPressed = pressedCategory === category.id;

                        // Enhanced shadow effect: slightly deeper when pressed (very subtle)
                        // Active items get colored shadow, inactive items get neutral shadow
                        const insetShadow = isPressed && isActive
                          ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em ${pressedShadowColorMap[category.id]}` }
                          : isPressed && !isActive
                            ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
                            : isActive
                              ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em ${shadowColorMap[category.id]}` }
                              : {};

                        return (
                          <li key={category.id}>
                            <motion.button
                              layout
                              type="button"
                              onClick={() => setActiveCategory(category.id)}
                              onMouseDown={() => setPressedCategory(category.id)}
                              onMouseUp={() => setPressedCategory(null)}
                              onMouseLeave={() => setPressedCategory(null)}
                              onTouchStart={() => setPressedCategory(category.id)}
                              onTouchEnd={() => setPressedCategory(null)}
                              whileTap={{ scale: 0.98 }}
                              className={`parallax-small relative overflow-hidden flex items-center justify-center lg:justify-start gap-2 rounded-2xl pl-4 pr-6 py-3 lg:py-2 lg:pl-4 w-full text-sm font-raleway transition-all duration-200 focus:outline-none group ${isActive
                                ? `border ${borderColorMap[category.id]} text-theme-text`
                                : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/5"
                                }`}
                              style={insetShadow}
                            >
                              <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-gradient-to-br ${category.gradient} transition-opacity duration-300 ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-10'}`} />
                              <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors ${isActive ? category.iconColor : "text-theme-text/80 group-hover:text-theme-text"}`} aria-hidden="true" />
                              <span className="relative z-10 font-medium tracking-wide">{category.label}</span>
                            </motion.button>
                          </li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </nav>
                <div className="flex-1 lg:h-full" ref={contentRef}>
                  {isImageCategory ? (
                    <motion.div
                      key="image-grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-full"
                    >
                      <div className="grid gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        <UseCaseCard
                          title="lifestyle images"
                          imageUrl="https://assets.daygen.ai/website-assets/lifestyle images.png"
                          imageAlt="Lifestyle images example"
                          onClick={openStyleModal}
                          delay={0.1}
                        />
                        <UseCaseCard
                          title="formal images"
                          imageUrl="https://assets.daygen.ai/website-assets/3b632ef0-3d13-4359-a2ba-5dec11fc3eab.png"
                          imageAlt="Business woman in a suit"
                          onClick={openStyleModal}
                          delay={0.15}
                        />
                        <UseCaseCard
                          title="artistic images"
                          imageUrl="https://assets.daygen.ai/website-assets/artistic images.png"
                          imageAlt="Artistic images example"
                          onClick={openStyleModal}
                          delay={0.2}
                        />
                        <UseCaseCard
                          title="add object/product"
                          imageUrl="https://assets.daygen.ai/website-assets/product visualizations.png"
                          imageAlt="Add object/product example"
                          onClick={openStyleModal}
                          delay={0.25}
                        />
                        <UseCaseCard
                          title="change outfit"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/virtual try-on.png"
                          imageAlt="Change outfit example"
                          onClick={openStyleModal}
                          delay={0.3}
                        />
                        <UseCaseCard
                          title="brand identity kits"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/brand identity.png"
                          imageAlt="Brand identity example"
                          onClick={openStyleModal}
                          delay={0.35}
                        />
                        <UseCaseCard
                          title="create your brand assets"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/brand identity.png"
                          imageAlt="Create your brand assets example"
                          onClick={openStyleModal}
                          delay={0.4}
                        />
                        <UseCaseCard
                          title="infographics"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/infographics.png"
                          imageAlt="Infographics example"
                          onClick={openStyleModal}
                          delay={0.45}
                        />
                        <UseCaseCard
                          title="upscale image"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/upscaling.png"
                          imageAlt="Upscale image example"
                          onClick={openStyleModal}
                          delay={0.5}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <ComingSoonPanel label={activeCategoryLabel} className="lg:h-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <Suspense fallback={<SectionFallback label="FAQ" />}>
          <FAQSection />
        </Suspense>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!user) {
    const nextPath = safeResolveNext(location, { isEditProtected: true });

    // Track guard redirects for monitoring
    authMetrics.increment('guard_redirect', location.pathname);

    setPendingAuthRedirect(nextPath);

    console.log('[RequireAuth] Redirecting to:', AUTH_ENTRY_PATH);
    return <Navigate to={AUTH_ENTRY_PATH} replace />;
  }

  // If user is authenticated but URL has query parameters, clean them up
  // Allowlisted params (like openStyleModal, jobId) should remain intact.
  if (location.search) {
    const searchParams = new URLSearchParams(location.search);
    const allowedParams = new Set(['openStyleModal', 'jobId']);
    const entries = Array.from(searchParams.entries());
    const disallowedEntries = entries.filter(([key]) => !allowedParams.has(key));

    if (disallowedEntries.length > 0) {
      const preservedEntries = entries.filter(([key]) => allowedParams.has(key));
      if (preservedEntries.length > 0) {
        const preservedParams = new URLSearchParams();
        preservedEntries.forEach(([key, value]) => preservedParams.set(key, value));
        const preservedSearch = preservedParams.toString();
        return (
          <Navigate
            to={{
              pathname: location.pathname,
              search: preservedSearch ? `?${preservedSearch}` : '',
            }}
            replace
          />
        );
      }

      // No allowlisted params left, clean up all query params
      return <Navigate to={location.pathname} replace />;
    }
  }

  return children;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-theme-white/40 border-t-theme-white"
        aria-hidden="true"
      />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

function CreateProtectedLayout({ fallbackRoute = "/app" }: { fallbackRoute?: string } = {}) {
  return (
    <RequireAuth>
      <GenerationProvider>
        <GalleryProvider>
          <Suspense fallback={<RouteFallback />}>
            <AuthErrorBoundary fallbackRoute={fallbackRoute} context="creation">
              <Outlet />
            </AuthErrorBoundary>
          </Suspense>
        </GalleryProvider>
      </GenerationProvider>
    </RequireAuth>
  );
}

function AppContent() {
  const { isFooterVisible, setFooterVisible } = useFooter();
  const location = useLocation();

  // Hide footer in app section
  useEffect(() => {
    const shouldHideFooter = location.pathname.startsWith("/app") || location.pathname.startsWith("/edit") || location.pathname.startsWith("/gallery");
    setFooterVisible(!shouldHideFooter);

    // Cleanup: restore footer visibility on unmount
    return () => {
      setFooterVisible(true);
    };
  }, [location.pathname, setFooterVisible]);

  const accountRouteElement = (
    <Suspense fallback={<RouteFallback />}>
      <AuthErrorBoundary fallbackRoute="/" context="authentication">
        <Account />
      </AuthErrorBoundary>
    </Suspense>
  );

  return (
    <StyleModalProvider>
      <div>
        <Suspense fallback={null}>
          <GlobalSvgDefs />
        </Suspense>
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/learn" element={<LearnLayout />}>
                <Route index element={<Navigate to="use-cases" replace />} />
                <Route path="use-cases" element={<Understand />} />
                <Route path="tools" element={<KnowledgeBase />} />
                <Route path="prompts" element={<Prompts />} />
                <Route path="courses" element={<Courses />} />
              </Route>
              <Route path="/use-cases" element={<Navigate to="/learn/use-cases" replace />} />
              <Route path="/learn/use-cases" element={<Navigate to="/learn/use-cases" replace />} />
              <Route path="/knowledge-base" element={<Navigate to="/learn/tools" replace />} />
              <Route path="/prompts" element={<Navigate to="/learn/prompts" replace />} />
              <Route path="/courses" element={<Navigate to="/learn/courses" replace />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/creator/:username" element={<CreatorProfile />} />
              <Route path="/reset-cache" element={<ResetCache />} />
              <Route path="/learn/tools/:toolSlug" element={<LearnToolPage />} />
              <Route path="/create/*" element={<CreateRoutes />} />
              <Route element={<CreateProtectedLayout />}>
                <Route path="/app/*" element={<MasterRoutes />} />
                <Route path="/job/:jobId/*" element={<JobRedirect />} />
              </Route>
              <Route
                path="/gallery/*"
                element={
                  <RequireAuth>
                    <Suspense fallback={<RouteFallback />}>
                      <AuthErrorBoundary fallbackRoute="/gallery" context="gallery">
                        <GalleryRoutes />
                      </AuthErrorBoundary>
                    </Suspense>
                  </RequireAuth>
                }
              />
              <Route path="/upgrade" element={<Upgrade />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route
                path="/edit"
                element={(
                  <RequireAuth>
                    <Suspense fallback={<RouteFallback />}>
                      <AuthErrorBoundary fallbackRoute="/app" context="editing">
                        <GenerationProvider>
                          <GalleryProvider>
                            <Edit />
                          </GalleryProvider>
                        </GenerationProvider>
                      </AuthErrorBoundary>
                    </Suspense>
                  </RequireAuth>
                )}
              />
              <Route path="/account" element={accountRouteElement} />
              <Route path="/signup" element={accountRouteElement} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {isFooterVisible && (
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        )}

        {/* Debug Panel - Development Only */}
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>

      </div>
    </StyleModalProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
