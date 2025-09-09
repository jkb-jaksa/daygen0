import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

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

  return (
    <div className="relative bg-[#0b0b0c]">
      {/* Gray header strip with heading */}
      <section className="relative w-full overflow-hidden bg-gray-600 border-b border-white/5">
        <div className="mx-auto max-w-[85rem] px-6 py-16 justify-items-center">
          <h1 className="text-5xl font-light tracking-tight text-d-text sm:text-6xl -mt-1 text-center font-cabin">
            FAQ
          </h1>
        </div>
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* FAQ content section */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-[85rem]">
          {/* FAQ Items */}
          <div className="mx-auto max-w-4xl space-y-4">
            {faqData.map((item, index) => (
              <div
                key={index}
                className={`rounded-3xl overflow-hidden transition-all duration-200 ${
                  openIndex === index
                    ? "bg-zinc-800/50 border border-zinc-700/50"
                    : "bg-zinc-900/50 border border-zinc-800/50"
                }`}
              >
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors duration-200"
                >
                  <span className="text-d-white text-lg font-normal pr-4 font-raleway">
                    {item.question}
                  </span>
                  <div className="flex-shrink-0 size-8 flex items-center justify-center">
                    {openIndex === index ? (
                      <Minus className="text-d-white size-5" />
                    ) : (
                      <Plus className="text-d-white size-5" />
                    )}
                  </div>
                </button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    openIndex === index ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <div className="px-8 pb-6">
                    <p className="text-d-white text-base leading-relaxed font-raleway">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQSection;
