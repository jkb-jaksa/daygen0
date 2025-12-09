import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export type AngleOption = {
    id: string;
    name: string;
    description?: string;
};

/**
 * Popular camera angle options for image generation
 */
export const ANGLE_OPTIONS: readonly AngleOption[] = [
    { id: 'front-view', name: 'Front View', description: 'Straight-on view facing the subject' },
    { id: 'side-profile', name: 'Side Profile', description: 'Subject viewed from the side' },
    { id: 'three-quarter-view', name: 'Three-Quarter View', description: 'Angled between front and side' },
    { id: 'back-view', name: 'Back View', description: 'View from behind the subject' },
    { id: 'low-angle', name: 'Low Angle', description: 'Camera below subject looking up' },
    { id: 'high-angle', name: 'High Angle', description: 'Camera above subject looking down' },
    { id: 'dutch-angle', name: 'Dutch Angle', description: 'Tilted camera for dramatic effect' },
    { id: 'over-the-shoulder', name: 'Over the Shoulder', description: 'From behind one subject toward another' },
    { id: 'close-up', name: 'Close-up', description: 'Tight framing on face or details' },
    { id: 'full-body', name: 'Full Body', description: 'Complete figure from head to toe' },
    { id: 'medium-shot', name: 'Medium Shot', description: 'Waist-up framing' },
    { id: 'wide-shot', name: 'Wide Shot', description: 'Full scene with environment' },
] as const;

export function useAngleHandlers() {
    // Modal state
    const [isAngleModalOpen, setIsAngleModalOpen] = useState(false);
    const [tempSelectedAngle, setTempSelectedAngle] = useState<AngleOption | null>(null);

    // Refs
    const angleButtonRef = useRef<HTMLButtonElement | null>(null);

    // Handle escape key to close modal
    useEffect(() => {
        if (!isAngleModalOpen || typeof document === 'undefined') {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsAngleModalOpen(false);
                if (angleButtonRef.current) {
                    angleButtonRef.current.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isAngleModalOpen]);

    // Focus angle button
    const focusAngleButton = useCallback(() => {
        if (angleButtonRef.current) {
            angleButtonRef.current.focus();
        }
    }, []);

    // Handle angle selection
    const handleSelectAngle = useCallback((angle: AngleOption) => {
        setTempSelectedAngle(prev =>
            prev?.id === angle.id ? null : angle
        );
    }, []);

    // Handle apply (placeholder - no functionality yet)
    const handleApplyAngle = useCallback(() => {
        // TODO: Implement angle application logic
        setIsAngleModalOpen(false);
        focusAngleButton();
        return tempSelectedAngle;
    }, [tempSelectedAngle, focusAngleButton]);

    // Handle modal open
    const handleAngleModalOpen = useCallback(() => {
        setTempSelectedAngle(null);
        setIsAngleModalOpen(true);
    }, []);

    // Handle modal close
    const handleAngleModalClose = useCallback(() => {
        setIsAngleModalOpen(false);
        setTempSelectedAngle(null);
        focusAngleButton();
    }, [focusAngleButton]);

    // Get selected angle label
    const selectedAngleLabel = useMemo(() => {
        return tempSelectedAngle?.name ?? null;
    }, [tempSelectedAngle]);

    return {
        // State
        isAngleModalOpen,
        tempSelectedAngle,
        selectedAngleLabel,

        // Refs
        angleButtonRef,

        // Handlers
        handleSelectAngle,
        handleApplyAngle,
        handleAngleModalOpen,
        handleAngleModalClose,

        // Setters
        setIsAngleModalOpen,
        setTempSelectedAngle,

        // Constants
        ANGLE_OPTIONS,
    };
}

export type AngleHandlers = ReturnType<typeof useAngleHandlers>;
