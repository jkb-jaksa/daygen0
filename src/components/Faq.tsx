import type React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import { layout, text, cards } from "../styles/designSystem";

interface FAQItem {
  question: string;
  answer: string;
}

type PointerState = {
  x: number;
  y: number;
  tx: number;
  ty: number;
};

const DEFAULT_POINTER_STATE: PointerState = {
  x: 50,
  y: 50,
  tx: 0,
  ty: 0,
};

const isFinePointer = (pointerType: string) => pointerType === "mouse" || pointerType === "pen";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const FAQ_DATA: FAQItem[] = [
  {
    question: "What is Creative AI?",
    answer:
      "By Creative AI, we simply mean generative AI tools used for creative purposes, like image, video or music, in both art & business.",
  },
  {
    question: "What is it used for?",
    answer:
      "Creative AI is used for generating images, videos, music, and other creative content for both artistic and commercial purposes.",
  },
  {
    question: "Will AI replace my creative job?",
    answer:
      "AI is a tool that enhances creativity rather than replacing it. It helps creatives work more efficiently and explore new possibilities.",
  },
  {
    question: "I'm an artist. Why would I want AI to do my art for me?",
    answer:
      "AI doesn't do art for you—it's a collaborator that can help with ideation, iteration, and exploration of new creative directions.",
  },
  {
    question: "Isn't AI making us less creative?",
    answer:
      "AI can actually enhance creativity by removing technical barriers and allowing more people to express their creative ideas.",
  },
  {
    question: "Isn't AI simply remixing the creations of other artists?",
    answer:
      "AI learns patterns from training data but generates new, unique outputs. It's a tool for creation, not just remixing.",
  },
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const faqCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const pointerStateRef = useRef<PointerState[]>([]);
  const animationFrameRef = useRef<(number | null)[]>([]);
  const prefersReducedMotionRef = useRef(false);

  const toggleQuestion = useCallback((index: number) => {
    // Immediate visual feedback
    setClickedIndex(index);
    
    // Clear the clicked state after a short delay
    setTimeout(() => setClickedIndex(null), 150);
    
    // Toggle the open state
    setOpenIndex(prev => (prev === index ? null : index));
  }, []);

  const applyPointerState = useCallback((index: number) => {
    const card = faqCardsRef.current[index];
    const state = pointerStateRef.current[index];

    animationFrameRef.current[index] = null;

    if (!card || !state) {
      return;
    }

    card.style.setProperty("--x", `${state.x}%`);
    card.style.setProperty("--y", `${state.y}%`);
    card.style.setProperty("--tx", `${state.tx}px`);
    card.style.setProperty("--ty", `${state.ty}px`);
  }, []);

  const cancelScheduledAnimation = useCallback((index: number) => {
    const frameId = animationFrameRef.current[index];
    if (frameId != null) {
      cancelAnimationFrame(frameId);
      animationFrameRef.current[index] = null;
    }
  }, []);

  const schedulePointerUpdate = useCallback(
    (index: number) => {
      if (typeof window === "undefined") {
        return;
      }

      if (animationFrameRef.current[index] != null) {
        return;
      }

      animationFrameRef.current[index] = window.requestAnimationFrame(() => {
        applyPointerState(index);
      });
    },
    [applyPointerState],
  );

  const handlePointerMove = useCallback(
    (index: number, event: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotionRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      const card = faqCardsRef.current[index];
      if (!card) {
        return;
      }

      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
      const relativeY = ((event.clientY - rect.top) / rect.height) * 100;
      const clampedX = clamp(relativeX, 0, 100);
      const clampedY = clamp(relativeY, 0, 100);

      pointerStateRef.current[index] = {
        x: clampedX,
        y: clampedY,
        tx: (clampedX - 50) / 10,
        ty: (clampedY - 50) / 10,
      };

      schedulePointerUpdate(index);
    },
    [schedulePointerUpdate],
  );

  const handlePointerEnter = useCallback(
    (index: number, event: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotionRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      const card = faqCardsRef.current[index];
      if (!card) {
        return;
      }

      card.style.setProperty("--fade-ms", "200ms");
      card.style.setProperty("--l", "1");
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (index: number, event: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotionRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      const card = faqCardsRef.current[index];
      if (!card) {
        return;
      }

      card.style.setProperty("--fade-ms", "400ms");
      card.style.setProperty("--l", "0.5");

      pointerStateRef.current[index] = { ...DEFAULT_POINTER_STATE };

      cancelScheduledAnimation(index);
      schedulePointerUpdate(index);
    },
    [cancelScheduledAnimation, schedulePointerUpdate],
  );

  // Initialize cards with default glow state
  useEffect(() => {
    faqCardsRef.current.forEach((card, index) => {
      if (card) {
        card.style.setProperty("--l", "0.5");
        card.style.setProperty("--fade-ms", "200ms");
      }

      pointerStateRef.current[index] = { ...DEFAULT_POINTER_STATE };
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mediaQuery.matches;

    const handleChange = (event: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = event.matches;
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    const frameIds = animationFrameRef.current;
    return () => {
      frameIds.forEach((frameId) => {
        if (frameId != null) {
          cancelAnimationFrame(frameId);
        }
      });
    };
  }, []);

  return (
    <section id="faq" className="faq-section relative overflow-hidden">
      <div className="faq-section__halo faq-section__halo--cyan" aria-hidden="true" />
      <div className="faq-section__halo faq-section__halo--orange" aria-hidden="true" />
      <div className="faq-section__halo faq-section__halo--violet" aria-hidden="true" />
      <div className="faq-section__grid" aria-hidden="true" />

      <div className={`${layout.container} relative z-10 ${layout.sectionPaddingTight}`}>
        <div className="faq-section__header">
          <h2 className={`${text.sectionHeading} faq-section__title`}>
            <span>FAQ</span>
          </h2>
          <span className="faq-section__divider" aria-hidden="true" />
        </div>

        <div className="faq-section__content">
          {FAQ_DATA.map((item, index) => {
            const isOpen = openIndex === index;
            const isClicked = clickedIndex === index;
            const contentId = `faq-panel-${index}`;
            const triggerId = `faq-trigger-${index}`;

            return (
              <div
                key={item.question}
                ref={(el) => { faqCardsRef.current[index] = el; }}
                className={`${cards.shell} faq-card ${isOpen ? "faq-card--active" : ""} ${isClicked ? "faq-card--clicked" : ""}`}
                onPointerMove={(event) => handlePointerMove(index, event)}
                onPointerEnter={(event) => handlePointerEnter(index, event)}
                onPointerLeave={(event) => handlePointerLeave(index, event)}
              >
                <span className="faq-card__halo" aria-hidden="true" />

                <button
                  id={triggerId}
                  aria-controls={contentId}
                  aria-expanded={isOpen}
                  onClick={() => toggleQuestion(index)}
                  className="faq-card__trigger"
                >
                  <span className="faq-card__label">
                    {item.question}
                  </span>
                  <span className="faq-card__icon" aria-hidden="true">
                    {isOpen ? (
                      <Minus className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </span>
                </button>

                <div
                  id={contentId}
                  role="region"
                  aria-labelledby={triggerId}
                  className={`faq-card__answer ${isOpen ? "faq-card__answer--open" : ""}`}
                >
                  <div className="faq-card__answer-inner">
                    <p className="faq-card__copy">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FAQSection;
