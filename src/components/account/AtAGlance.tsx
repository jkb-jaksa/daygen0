import { glass } from "../../styles/designSystem";

export type AtAGlanceProps = {
  generatedCount: number;
  creditsRemaining: number;
  subscriptionCredits?: number;
  topUpCredits?: number;
};

export function AtAGlance({
  generatedCount,
  creditsRemaining,
  subscriptionCredits,
  topUpCredits
}: AtAGlanceProps) {
  const hasDualWallet = subscriptionCredits !== undefined && topUpCredits !== undefined;

  return (
    <div className={`${glass.surface} p-5`}>
      <h3 className="text-lg font-raleway mb-3 text-theme-text">At a glance</h3>
      <ul className="text-sm font-raleway text-theme-white space-y-2">
        <li>
          Generated images: <strong>{generatedCount}</strong>
        </li>
        {hasDualWallet ? (
          <>
            <li className="flex justify-between items-center">
              <span>Subscription credits:</span>
              <strong className="text-purple-400">{subscriptionCredits.toLocaleString()}</strong>
            </li>
            <li className="flex justify-between items-center">
              <span>Top-up credits:</span>
              <strong className="text-emerald-400">{topUpCredits.toLocaleString()}</strong>
            </li>
            <li className="flex justify-between items-center pt-1 border-t border-theme-dark/50">
              <span>Total credits:</span>
              <strong>{creditsRemaining.toLocaleString()}</strong>
            </li>
          </>
        ) : (
          <li>
            Credits remaining: <strong>{creditsRemaining}</strong>
          </li>
        )}
      </ul>
    </div>
  );
}

export default AtAGlance;

