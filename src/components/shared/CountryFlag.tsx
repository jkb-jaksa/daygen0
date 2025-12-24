type CountryFlagProps = {
    code: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};

/**
 * Convert ISO 3166-1 alpha-2 country code to emoji flag
 * Works by converting each letter to its regional indicator symbol
 */
function codeToEmoji(code: string): string {
    const upperCode = code.toUpperCase();
    if (upperCode.length !== 2) return '';

    // Regional indicator symbols start at 0x1F1E6 (🇦)
    // A is ASCII 65, so we offset by that
    const firstChar = 0x1F1E6 + (upperCode.charCodeAt(0) - 65);
    const secondChar = 0x1F1E6 + (upperCode.charCodeAt(1) - 65);

    return String.fromCodePoint(firstChar, secondChar);
}

export function CountryFlag({ code, size = 'md', className = '' }: CountryFlagProps) {
    if (!code) return null;

    const emoji = codeToEmoji(code);
    if (!emoji) return null;

    return (
        <span
            className={`${sizeClasses[size]} ${className}`}
            title={code.toUpperCase()}
            role="img"
            aria-label={`Flag of ${code.toUpperCase()}`}
        >
            {emoji}
        </span>
    );
}

export default CountryFlag;
