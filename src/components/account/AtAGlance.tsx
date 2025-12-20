import { glass } from "../../styles/designSystem";

import { WalletBalanceCard } from "../payments/WalletBalanceCard";

export type AtAGlanceProps = {
  generatedCount: number;
};

export function AtAGlance({
  generatedCount
}: AtAGlanceProps) {
  return (
    <div className={`${glass.surface} p-5`}>
      <h3 className="text-lg font-raleway mb-3 text-theme-text">At a glance</h3>
      <div className="space-y-4">
        <div className="text-sm font-raleway text-theme-white">
          Generated images: <strong>{generatedCount}</strong>
        </div>

        <WalletBalanceCard embedded className="mt-2" />
      </div>
    </div>
  );
}

export default AtAGlance;

