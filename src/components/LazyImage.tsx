import React, { useState, useCallback, memo } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    /** Optional skeleton animation class - defaults to shimmer */
    skeletonClassName?: string;
    /** Optional wrapper className for the container */
    wrapperClassName?: string;
    /** Whether to show the skeleton animation */
    showSkeleton?: boolean;
}

/**
 * LazyImage - Progressive loading image component with skeleton placeholder
 * 
 * Shows an animated skeleton placeholder while the image loads, then
 * fades in the image smoothly once loaded for better perceived performance.
 */
const LazyImage = memo<LazyImageProps>(({
    src,
    alt,
    className = '',
    skeletonClassName = '',
    wrapperClassName = '',
    showSkeleton = true,
    onLoad,
    onError,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        setIsLoaded(true);
        onLoad?.(e);
    }, [onLoad]);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        setHasError(true);
        setIsLoaded(true); // Hide skeleton on error too
        onError?.(e);
    }, [onError]);

    return (
        <div className={`relative ${wrapperClassName}`}>
            {/* Skeleton placeholder - visible until image loads */}
            {showSkeleton && !isLoaded && (
                <div
                    className={`absolute inset-0 bg-theme-dark/50 animate-pulse ${skeletonClassName}`}
                    aria-hidden="true"
                >
                    {/* Shimmer effect */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-theme-white/5 to-transparent animate-shimmer"
                        style={{
                            backgroundSize: '200% 100%',
                        }}
                    />
                </div>
            )}

            {/* Actual image with fade-in transition */}
            <img
                src={src}
                alt={alt}
                className={`${className} transition-opacity duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'
                    } ${hasError ? 'invisible' : ''}`}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
                {...props}
            />
        </div>
    );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
