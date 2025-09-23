import type React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import { layout, text, cards } from "../styles/designSystem";

interface FAQItem {
  question: string;
  answer: string;
}

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
  const faqCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  const toggleQuestion = useCallback((index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  }, []);

  // Match product card hover glow/parallax behavior
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", `${x.toFixed(2)}%`);
    el.style.setProperty("--y", `${y.toFixed(2)}%`);
    const tx = (x - 50) / 10;
    const ty = (y - 50) / 10;
    el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
  }, []);

  const onEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  }, []);

  const onLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0.5");
  }, []);

  // Initialize cards with default glow state
  useEffect(() => {
    faqCardsRef.current.forEach((card) => {
      if (card) {
        card.style.setProperty("--l", "0.5");
        card.style.setProperty("--fade-ms", "200ms");
      }
    });
  }, []);

  return (
    <section className="faq-section relative overflow-hidden">
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
            const contentId = `faq-panel-${index}`;
            const triggerId = `faq-trigger-${index}`;

            return (
              <div
                key={item.question}
                ref={(el) => { faqCardsRef.current[index] = el; }}
                className={`${cards.shell} faq-card ${isOpen ? "faq-card--active" : ""}`}
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
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
