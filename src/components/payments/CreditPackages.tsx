import React, { useState } from 'react';
import { Check, Star, Crown } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useStripeConfig } from '../../hooks/useStripeConfig';
import { cards, glass } from '../../styles/designSystem';
import useParallaxHover from '../../hooks/useParallaxHover';

interface CreditPackagesProps {
  onPurchase?: () => void;
}

export function CreditPackages({ onPurchase }: CreditPackagesProps) {
  const { config, loading: configLoading } = useStripeConfig();
  const { createCheckoutSession, loading, error } = usePayments();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    try {
      setSelectedPackage(packageId);
      await createCheckoutSession('one_time', packageId);
      onPurchase?.();
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setSelectedPackage(null);
    }
  };

  if (configLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-theme-white">Failed to load credit packages</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-raleway font-light text-theme-text mb-4">
          Buy Credits
        </h2>
        <p className="text-theme-white">
          Purchase credits to generate images, videos, and more
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {config.creditPackages.map((pkg) => (
          <CreditPackageCard
            key={pkg.id}
            package={pkg}
            isSelected={selectedPackage === pkg.id}
            isLoading={loading && selectedPackage === pkg.id}
            onPurchase={() => handlePurchase(pkg.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface CreditPackageCardProps {
  package: {
    id: string;
    name: string;
    credits: number;
    price: number;
    badge?: string;
  };
  isSelected: boolean;
  isLoading: boolean;
  onPurchase: () => void;
}

function CreditPackageCard({ package: pkg, isSelected, isLoading, onPurchase }: CreditPackageCardProps) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  return (
    <div
      onClick={onPurchase}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={`${cards.shell} ${isSelected ? 'border-theme-light' : ''} group relative overflow-hidden p-6 cursor-pointer transition-all duration-200 parallax-small mouse-glow ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {/* Badge */}
      {pkg.badge && (
        <div className="absolute top-4 right-4 z-10">
          {pkg.badge === 'POPULAR' && (
            <div className="flex items-center gap-1.5 bg-brand-cyan text-theme-black px-3 py-1 rounded-full text-xs font-raleway font-medium shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              Popular
            </div>
          )}
          {pkg.badge === 'BEST_VALUE' && (
            <div className="flex items-center gap-1.5 bg-brand-red text-theme-black px-3 py-1 rounded-full text-xs font-raleway font-medium shadow-lg">
              <Crown className="w-3 h-3 fill-current" />
              Best Value
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-raleway font-light mb-2 text-theme-text">
            {pkg.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-raleway font-light text-theme-text">
              {formatPrice(pkg.price)}
            </span>
          </div>
        </div>

        {/* Credits */}
        <div className="mb-4">
          <div className="text-2xl font-raleway font-medium text-theme-white">
            {pkg.credits.toLocaleString()} Credits
          </div>
          <div className="text-sm text-theme-text">
            {formatPrice(pkg.price / pkg.credits)} per credit
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-theme-text" />
            </div>
            <span className="text-sm font-raleway text-theme-text">
              Instant credit addition
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-theme-text" />
            </div>
            <span className="text-sm font-raleway text-theme-text">
              No expiration date
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-auto">
          <button
            disabled={isLoading}
            className={`w-full btn font-raleway text-sm transition-colors duration-200 parallax-large ${
              isLoading ? 'btn-disabled' : 'btn-cyan'
            }`}
          >
            {isLoading ? 'Processing...' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreditPackages;
