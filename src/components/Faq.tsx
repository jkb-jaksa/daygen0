import type React from "react";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { layout, text, cards } from "../styles/designSystem";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqData: FAQItem[] = [
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

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Match product card hover glow/parallax behavior
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0");
  };

  return (
    <div className="relative bg-black">
      {/* Gray header strip with heading */}
      <section className={layout.sectionDivider}>
        <div className={`${layout.container} py-16 justify-items-center`}>
          <h2 className={`${text.sectionHeading} text-center`}>
            FAQ
          </h2>
        </div>
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* FAQ content section */}
      <section className={`${layout.container} ${layout.sectionPaddingTight}`}>
        {/* FAQ Items */}
        <div className="mx-auto max-w-4xl space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className={`${cards.shell} cursor-pointer overflow-hidden`}
              onMouseMove={onMove}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="flex w-full items-center justify-between px-8 py-3 text-left appearance-none bg-transparent border-0 focus:outline-none focus:ring-0"
              >
                <span className="pr-4 text-base font-normal font-raleway text-d-text">
                  {item.question}
                </span>
                <div className="flex size-8 flex-shrink-0 items-center justify-center">
                  {openIndex === index ? (
                    <Minus className="size-4 text-d-white" />
                  ) : (
                    <Plus className="size-4 text-d-white" />
                  )}
                </div>
              </button>

              {/* Answer */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  openIndex === index ? "max-h-48" : "max-h-0"
                }`}
              >
                <div className="px-8 pb-4">
                  <p className="text-base font-raleway leading-relaxed text-d-white">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FAQSection;
