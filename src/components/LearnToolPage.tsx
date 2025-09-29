import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { layout, glass } from "../styles/designSystem";
import {
  buildFallbackTool,
  getLearnToolBySlug,
  type LearnToolCategory,
} from "../data/learnTools";
import { getToolLogo } from "../utils/toolLogos";

const CATEGORY_LABELS: Record<LearnToolCategory, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  avatars: "Avatars",
};

const sectionCardStyles = "rounded-2xl border border-d-dark/60 bg-d-black/35 p-6";

export default function LearnToolPage() {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const tool = getLearnToolBySlug(toolSlug);
  const toolContent = tool ?? buildFallbackTool(toolSlug ?? "tool");
  const logo = useMemo(() => getToolLogo(toolContent.name), [toolContent.name]);
  const hasUseCases = toolContent.useCases.length > 0;
  const hasFeatures = toolContent.features.length > 0;
  const hasGettingStarted = toolContent.gettingStarted.length > 0;
  const hasResources = Boolean(toolContent.resources && toolContent.resources.length > 0);

  return (
    <div className={layout.page}>
      <div className={layout.backdrop} aria-hidden />
      <section className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className={layout.container}>
          <Link
            to="/learn/tools"
            className="inline-flex items-center gap-2 text-sm font-raleway text-d-white/80 transition-colors duration-150 hover:text-d-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-d-black"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to knowledge base
          </Link>

          <div className={`${glass.surface} mt-6 rounded-3xl border-d-dark px-6 py-8 sm:px-10 sm:py-10`}>
            <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-d-dark/50 bg-d-black/60">
                  {logo ? (
                    <img src={logo} alt={`${toolContent.name} logo`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold uppercase text-d-white/80">
                      {toolContent.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-d-white/60 font-raleway">
                    Learn · Tool guide
                  </p>
                  <h1 className="text-3xl font-raleway font-light text-d-text sm:text-4xl">
                    {toolContent.name}
                  </h1>
                  <p className="text-base font-raleway font-light text-d-white sm:text-lg">
                    {toolContent.tagline}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {toolContent.categories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center rounded-full border border-d-dark/60 bg-d-black/40 px-3 py-1 text-xs font-raleway uppercase tracking-[0.25em] text-d-white/70"
                  >
                    {CATEGORY_LABELS[category]}
                  </span>
                ))}
              </div>
            </header>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <section className={sectionCardStyles}>
                  <h2 className="text-xl font-raleway font-medium text-d-text">Overview</h2>
                  <p className="mt-3 text-sm font-raleway leading-relaxed text-d-white">
                    {toolContent.overview}
                  </p>
                </section>

                <section className={sectionCardStyles}>
                  <h2 className="text-xl font-raleway font-medium text-d-text">Use cases</h2>
                  {hasUseCases ? (
                    <ul className="mt-3 space-y-2 text-sm font-raleway text-d-white/90">
                      {toolContent.useCases.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-d-white/70" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm font-raleway text-d-white/70">
                      We'll add example workflows for this tool soon.
                    </p>
                  )}
                </section>

                <section className={sectionCardStyles}>
                  <h2 className="text-xl font-raleway font-medium text-d-text">Key features</h2>
                  {hasFeatures ? (
                    <ul className="mt-3 space-y-4 text-sm font-raleway text-d-white/90">
                      {toolContent.features.map((feature) => (
                        <li key={feature.title}>
                          <p className="text-base font-raleway font-medium text-d-text">{feature.title}</p>
                          <p className="mt-1 text-sm font-raleway text-d-white/80">{feature.description}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm font-raleway text-d-white/70">
                      Feature highlights will appear here as soon as the guide is ready.
                    </p>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className={sectionCardStyles}>
                  <h2 className="text-xl font-raleway font-medium text-d-text">Pricing snapshot</h2>
                  <p className="mt-3 text-sm font-raleway leading-relaxed text-d-white/90">
                    {toolContent.pricing}
                  </p>
                </section>

                <section className={sectionCardStyles}>
                  <h2 className="text-xl font-raleway font-medium text-d-text">Getting started</h2>
                  {hasGettingStarted ? (
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-raleway text-d-white/90">
                      {toolContent.gettingStarted.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-sm font-raleway text-d-white/70">
                      Setup steps will be added soon. In the meantime, explore the official resources below.
                    </p>
                  )}
                </section>

                <section className={sectionCardStyles}>
                  <h2 className="text-xl font-raleway font-medium text-d-text">Resources</h2>
                  {hasResources ? (
                    <ul className="mt-3 space-y-2 text-sm font-raleway text-d-white/90">
                      {toolContent.resources?.map((resource) => (
                        <li key={resource.href}>
                          <a
                            href={resource.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-d-white/80 transition-colors duration-150 hover:text-d-text"
                          >
                            {resource.label}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm font-raleway text-d-white/70">
                      We'll curate documentation, tutorials, and workflow templates here shortly.
                    </p>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
