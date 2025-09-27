import type React from "react";
import { useCallback, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { layout, text } from "../styles/designSystem";
import useParallaxHover from "../hooks/useParallaxHover";

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

  const toggleQuestion = useCallback((index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  }, []);

  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>({
    enterLight: "0.9",
    leaveFadeMs: "200ms",
    resetOnLeave: true,
  });

  return (
    <section id="faq" className="faq-section">
      <div className={`${layout.container} ${layout.sectionPaddingTight}`}>
        <div className="faq-section__header">
          <h2 className={`${text.sectionHeading} faq-section__title pb-4`}>
            <span>FAQ</span>
          </h2>
        </div>

        <div className="faq-section__content">
          {FAQ_DATA.map((item, index) => {
            const isOpen = openIndex === index;
            const contentId = `faq-panel-${index}`;
            const triggerId = `faq-trigger-${index}`;

            return (
              <div
                key={item.question}
                className={`faq-card parallax-small mouse-glow ${isOpen ? "faq-card--active" : ""}`}
                onPointerMove={onPointerMove}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
              >
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
