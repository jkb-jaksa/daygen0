import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, CreditCard, Zap, Crown } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import { useAuth } from '../../auth/useAuth';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCreating: () => void;
}

export function WelcomeModal({ isOpen, onClose, onStartCreating }: WelcomeModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [isOpen]);

  const steps = [
    {
      icon: <Sparkles className="w-8 h-8 text-cyan-400" />,
      title: "Welcome to Daygen!",
      content: (
        <div className="space-y-4">
          <p className="text-theme-white">
            You have <span className="text-cyan-400 font-bold">{user?.credits || 20}</span> free credits to get started!
          </p>
          <div className="bg-theme-dark/50 border border-theme-mid rounded-lg p-4">
            <h4 className="text-theme-text font-raleway mb-2">What are credits?</h4>
            <p className="text-theme-white text-sm">
              Credits are used to generate AI images, videos, and other content. Each generation typically costs 1 credit.
            </p>
          </div>
        </div>
      )
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: "How to Generate Content",
      content: (
        <div className="space-y-4">
          <p className="text-theme-white">
            Creating amazing content is easy! Here's how:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-400 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-theme-text text-sm font-medium">Write a prompt</p>
                <p className="text-theme-white text-sm">Describe what you want to create in detail</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-400 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-theme-text text-sm font-medium">Choose a model</p>
                <p className="text-theme-white text-sm">Select from our premium AI models</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-400 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-theme-text text-sm font-medium">Generate & enjoy</p>
                <p className="text-theme-white text-sm">Watch your creation come to life!</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Crown className="w-8 h-8 text-purple-400" />,
      title: "Get More Credits",
      content: (
        <div className="space-y-4">
          <p className="text-theme-white">
            Need more credits? We've got you covered!
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-theme-dark/50 border border-theme-mid rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span className="text-theme-text text-sm font-medium">Buy Credits</span>
              </div>
              <p className="text-theme-white text-sm">Purchase credit packages as needed</p>
            </div>
            <div className="bg-theme-dark/50 border border-theme-mid rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-purple-400" />
                <span className="text-theme-text text-sm font-medium">Subscribe</span>
              </div>
              <p className="text-theme-white text-sm">Get monthly credits with a subscription</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onStartCreating();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  if (!isOpen || !isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`${glass.surface} relative max-w-lg w-full p-6 rounded-lg transform transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-theme-dark/50 border border-theme-mid rounded-full flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <div>
              <h2 className="text-xl font-raleway text-theme-text">{currentStepData.title}</h2>
              <p className="text-sm text-theme-white">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-theme-mid hover:text-theme-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-theme-dark/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-6 min-h-[200px]">
          {currentStepData.content}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="btn btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="btn btn-cyan flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onStartCreating}
                className="btn btn-cyan flex items-center gap-2"
              >
                Start Creating
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="mt-4 pt-4 border-t border-theme-mid text-center">
          <button
            onClick={handleClose}
            className="text-theme-text hover:text-theme-white text-sm underline"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}
