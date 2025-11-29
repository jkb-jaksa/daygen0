import React from 'react';

export type OrbColor = 'cyan' | 'yellow' | 'orange' | 'red' | 'blue' | 'violet';

interface OrbProps {
  color: OrbColor;
  className?: string;
  'aria-hidden'?: boolean;
}

/**
 * Reusable Orb component extracted from homepage implementation
 * Creates animated background orbs with different color variants
 */
export const Orb: React.FC<OrbProps> = ({ 
  color, 
  className = '', 
  'aria-hidden': ariaHidden = true 
}) => {
  return (
    <div 
      className={`bg-orb bg-orb--${color} ${className}`}
      aria-hidden={ariaHidden}
    />
  );
};

/**
 * Container component for orb backgrounds
 * Provides the necessary backdrop and positioning context
 */
export const OrbBackground: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`orb-background ${className}`}>
      {children}
    </div>
  );
};


/**
 * Homepage hero section orb collection
 * Contains all the orbs used in the hero section
 */
export const HomepageHeroOrbs: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={className}>
      {/* Background effects */}
      <div className="home-hero-card__frame" aria-hidden="true" />
      <Orb color="cyan" />
      <Orb color="yellow" />
      <Orb color="orange" />
      <Orb color="red" />
      <Orb color="blue" />
      <Orb color="violet" />
      <div className="home-hero-card__spark" aria-hidden="true" />
    </div>
  );
};

export default Orb;

