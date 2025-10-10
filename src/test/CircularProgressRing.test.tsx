import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircularProgressRing } from '../components/CircularProgressRing';

// Mock requestAnimationFrame
const mockRequestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16);
};

const mockCancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: mockRequestAnimationFrame,
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: mockCancelAnimationFrame,
});

describe('CircularProgressRing', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with initial progress', () => {
    render(<CircularProgressRing progress={25} />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('animates progress smoothly', async () => {
    const { rerender } = render(<CircularProgressRing progress={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();

    // Update progress
    rerender(<CircularProgressRing progress={50} />);
    
    // Fast-forward time to see animation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // The progress should be animating towards 50%
    const progressText = screen.getByText(/\d+%/);
    expect(progressText).toBeInTheDocument();
  });

  it('prevents progress from going backwards', async () => {
    const { rerender } = render(<CircularProgressRing progress={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Try to set progress to a lower value
    rerender(<CircularProgressRing progress={30} />);
    
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Progress should not go below 50%
    const progressText = screen.getByText(/\d+%/);
    const progressValue = parseInt(progressText.textContent?.replace('%', '') || '0');
    expect(progressValue).toBeGreaterThanOrEqual(50);
  });

  it('handles rapid progress updates smoothly', async () => {
    const { rerender } = render(<CircularProgressRing progress={0} />);
    
    // Rapidly update progress
    act(() => {
      rerender(<CircularProgressRing progress={20} />);
      vi.advanceTimersByTime(50);
    });
    
    act(() => {
      rerender(<CircularProgressRing progress={40} />);
      vi.advanceTimersByTime(50);
    });
    
    act(() => {
      rerender(<CircularProgressRing progress={60} />);
      vi.advanceTimersByTime(50);
    });

    // Progress should be animating smoothly
    const progressText = screen.getByText(/\d+%/);
    expect(progressText).toBeInTheDocument();
  });

  it('respects reduced motion preference', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { rerender } = render(<CircularProgressRing progress={0} />);
    rerender(<CircularProgressRing progress={100} />);
    
    // With reduced motion, progress should jump immediately
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
