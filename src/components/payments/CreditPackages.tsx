import { useState } from 'react';
import { Check, Star, Crown, Zap, Layers, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePayments } from '../../hooks/usePayments';
import { useStripeConfig } from '../../hooks/useStripeConfig';
import { cards } from '../../styles/designSystem';
import useParallaxHover from '../../hooks/useParallaxHover';
import { debugError } from '../../utils/debug';

interface CreditPackagesProps {
  onPurchase?: () => void;
}

export function CreditPackages({ onPurchase }: CreditPackagesProps) {
  const { config, loading: configLoading } = useStripeConfig();
  const { createCheckoutSession, loading, error } = usePayments();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isCheckoutLocked, setIsCheckoutLocked] = useState(false);

  const handlePurchase = async (packageId: string) => {
    // Prevent multiple simultaneous checkout attempts
    if (isCheckoutLocked) return;

    try {
      setIsCheckoutLocked(true);
      setSelectedPackage(packageId);
      await createCheckoutSession('one_time', packageId);
      onPurchase?.();
    } catch (err) {
      debugError('Purchase failed:', err);
    } finally {
      setSelectedPackage(null);
      setIsCheckoutLocked(false);
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
        <h2 className="text-3xl font-raleway font-normal text-theme-text mb-4">
          Buy Credits
        </h2>
        <p className="text-base font-raleway font-normal text-theme-white">
          Purchase credits to generate images, videos, and more
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-center" role="status" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {config.creditPackages.map((pkg, index) => (
          <div key={pkg.id} className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(25%-1rem)] min-w-[260px] max-w-[320px] flex-grow-0">
            <CreditPackageCard
              package={pkg}
              isSelected={selectedPackage === pkg.id}
              isLoading={loading && selectedPackage === pkg.id}
              isDisabled={isCheckoutLocked && selectedPackage !== pkg.id}
              onPurchase={() => handlePurchase(pkg.id)}
              index={index}
            />
          </div>
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
  isDisabled?: boolean;
  onPurchase: () => void;
  index: number;
}

function CreditPackageCard({ package: pkg, isSelected, isLoading, isDisabled = false, onPurchase, index }: CreditPackageCardProps) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const formatPricePerCredit = (priceInCents: number) => {
    const value = priceInCents / 100;
    // Show up to 4 decimal places, strip trailing zeros
    return `$${value.toFixed(4).replace(/\.?0+$/, '')}`;
  };

  // Determine Icon and Style based on credits
  const getPackageVisuals = (credits: number) => {
    if (credits >= 5000) {
      return { Icon: Gem, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    } else if (credits >= 1000) {
      return { Icon: Layers, color: 'text-theme-text', bg: 'bg-theme-text/10' };
    } else {
      return { Icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    }
  };

  const { Icon, color, bg } = getPackageVisuals(pkg.credits);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      onClick={isLoading || isDisabled ? undefined : onPurchase}
      onPointerMove={isLoading || isDisabled ? undefined : onPointerMove}
      onPointerEnter={isLoading || isDisabled ? undefined : onPointerEnter}
      onPointerLeave={isLoading || isDisabled ? undefined : onPointerLeave}
      className={`${cards.shell} ${isSelected ? 'border-theme-light' : ''} group relative overflow-hidden p-6 cursor-pointer transition-all duration-200 parallax-small mouse-glow ${isLoading || isDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
    >
      {/* Badge */}
      {pkg.badge && (
        <div className="absolute top-4 right-4 z-10">
          {pkg.badge === 'POPULAR' && (
            <div className="flex items-center gap-1.5 bg-theme-text text-theme-black px-3 py-1 rounded-full text-xs font-raleway font-medium shadow-lg">
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
        {/* Icon Header */}
        <div className="mb-4">
          <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <h3 className="text-xl font-raleway font-normal mb-1 text-theme-text">
            {pkg.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-raleway font-normal text-theme-white">
              {formatPrice(pkg.price)}
            </span>
          </div>
        </div>

        {/* Credits */}
        <div className="mb-6">
          <div className="text-2xl font-raleway font-normal text-theme-text mb-1 flex items-center gap-2">
            {pkg.credits.toLocaleString()} <span className="text-base text-theme-white/60">Credits</span>
          </div>
          <div className="inline-block px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs font-raleway font-medium text-emerald-400">
              {formatPricePerCredit(pkg.price / pkg.credits)} / credit
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-theme-text" />
            </div>
            <span className="text-sm font-raleway font-normal text-theme-white">
              Instant credit addition
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-theme-text" />
            </div>
            <span className="text-sm font-raleway font-normal text-theme-white">
              No expiration date
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-auto">
          <button
            disabled={isLoading}
            className={`w-full btn font-raleway text-base font-medium transition-all duration-200 parallax-large ${isLoading ? 'opacity-50 cursor-not-allowed btn-white' : 'btn-white hover:bg-theme-white hover:text-theme-black'
              } flex items-center justify-center gap-2`}
          >
            {isLoading ? 'Processing...' : (
              <>
                <Zap className="w-4 h-4" />
                Buy Now
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default CreditPackages;
