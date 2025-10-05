import { layout, text, cards, glass } from "../styles/designSystem";

const POLICY_SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    copy: "We collect only the data required to deliver the daygen experience, improve our creative tooling, and keep your account secure.",
  },
  {
    id: "data-we-collect",
    title: "Data We Collect",
    copy: "Account details, generation preferences, and usage analytics help us personalise the platform. Uploaded assets stay private unless you explicitly publish them.",
  },
  {
    id: "how-we-use-data",
    title: "How We Use Data",
    copy: "Your data powers core features like prompt history, gallery organisation, and billing. We never sell personal information or share creative assets with third parties without consent.",
  },
  {
    id: "control-and-deletion",
    title: "Control & Deletion",
    copy: "Update profile details, manage marketing preferences, or request permanent deletion at any time from the My Account area or by emailing privacy@daygen.ai.",
  },
];

export default function PrivacyPolicy() {
  return (
    <main className={`${layout.page}`}> 
      <section className={`${layout.container} pt-[calc(var(--nav-h)+2.5rem)] pb-24`}> 
        <header className="max-w-3xl mb-12">
          <h1 className={`${text.sectionHeading} text-theme-white mb-4`}>Privacy Policy</h1>
          <p className="text-theme-white/70 font-raleway text-lg">
            Transparency matters. This summary explains how daygen handles data and keeps your creative work safe. Reach out if you need the full legal version.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {POLICY_SECTIONS.map((section) => (
            <article
              key={section.id}
              className={`${cards.shell} ${glass.promptDark} flex flex-col gap-4 p-6 rounded-[24px] text-left`}
            >
              <h2 className="font-raleway text-2xl font-medium text-theme-white">{section.title}</h2>
              <p className="text-sm text-theme-white/70 font-raleway leading-relaxed">{section.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
