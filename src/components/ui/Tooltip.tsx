import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { glass } from '../../styles/designSystem';

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

export function Tooltip({
    children,
    content,
    position = 'bottom',
    delay = 200,
    className = '',
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        showTimeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }
        hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, 150); // Small grace period to move cursor into tooltip
    };

    const handleMouseEnter = () => {
        showTooltip();
    };

    const handleMouseLeave = () => {
        hideTooltip();
    };

    useEffect(() => {
        if (!isVisible || !triggerRef.current) return;

        const updatePosition = () => {
            if (!triggerRef.current) return;

            const rect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current?.getBoundingClientRect();
            const gap = 8;

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = rect.top - (tooltipRect?.height || 32) - gap;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + gap;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - (tooltipRect?.width || 100) - gap;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + gap;
                    break;
            }

            // Clamp to viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const tooltipWidth = tooltipRect?.width || 100;
            const tooltipHeight = tooltipRect?.height || 32;

            if (position === 'top' || position === 'bottom') {
                left = Math.max(tooltipWidth / 2 + 8, Math.min(left, viewportWidth - tooltipWidth / 2 - 8));
            }
            if (position === 'left' || position === 'right') {
                top = Math.max(tooltipHeight / 2 + 8, Math.min(top, viewportHeight - tooltipHeight / 2 - 8));
            }

            setCoords({ top, left });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, position]);

    useEffect(() => {
        return () => {
            if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, []);

    const getTransformOrigin = () => {
        switch (position) {
            case 'top':
                return 'bottom center';
            case 'bottom':
                return 'top center';
            case 'left':
                return 'right center';
            case 'right':
                return 'left center';
        }
    };

    const getTransform = () => {
        switch (position) {
            case 'top':
            case 'bottom':
                return 'translateX(-50%)';
            case 'left':
            case 'right':
                return 'translateY(-50%)';
        }
    };

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                className="inline-flex"
            >
                {children}
            </div>
            {isVisible &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        role="tooltip"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className={`${glass.promptDark} fixed z-[100000] rounded-lg px-3 py-2 text-xs font-raleway text-theme-white shadow-lg transition-opacity duration-150 ${className}`}
                        style={{
                            top: coords.top,
                            left: coords.left,
                            transform: getTransform(),
                            transformOrigin: getTransformOrigin(),
                        }}
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </>
    );
}

export default Tooltip;
