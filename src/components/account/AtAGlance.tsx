import { glass } from "../../styles/designSystem";

export type AtAGlanceProps = {
  generatedCount: number;
  creditsRemaining: number;
};

export function AtAGlance({ generatedCount, creditsRemaining }: AtAGlanceProps) {
  return (
    <div className={`${glass.surface} p-5`}>
      <h3 className="text-lg font-raleway mb-3 text-theme-text">At a glance</h3>
      <ul className="text-sm font-raleway text-theme-white space-y-1">
        <li>
          Generated images: <strong>{generatedCount}</strong>
        </li>
        <li>
          Credits remaining: <strong>{creditsRemaining}</strong>
        </li>
      </ul>
    </div>
  );
}

export default AtAGlance;
