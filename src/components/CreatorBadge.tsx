import { badgeBaseClasses, badgeInnerGlowClass } from "./shared/badgeStyles";

type CreatorBadgeProps = {
    name: string;
    profileImage?: string;
    userId?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
    onClick?: (userId: string, name: string, profileImage?: string) => void;
};

const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
};

const avatarSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
};

export function CreatorBadge({ name, profileImage, userId, size = "md", className = "", onClick }: CreatorBadgeProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick && userId) {
            onClick(userId, name, profileImage);
        }
    };

    const isClickable = onClick && userId;

    return (
        <span
            className={`${badgeBaseClasses} ${sizeClasses[size]} ${className} ${isClickable ? 'cursor-pointer' : ''}`}
            title={`Created by ${name}`}
            aria-label={`Created by ${name}`}
            onClick={isClickable ? handleClick : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
        >
            <div className={badgeInnerGlowClass} />
            <div className="flex items-center gap-1">
                {profileImage ? (
                    <img
                        src={profileImage}
                        alt={name}
                        className={`${avatarSizeClasses[size]} rounded-full object-cover border border-theme-dark`}
                    />
                ) : (
                    <div className={`${avatarSizeClasses[size]} rounded-full flex items-center justify-center border border-theme-dark bg-[conic-gradient(from_0deg,_rgba(245,158,11,0.6),_rgba(239,68,68,0.6),_rgba(59,130,246,0.6),_rgba(34,211,238,0.6),_rgba(245,158,11,0.6))]`}>
                        <span className="text-[8px] font-raleway font-medium text-theme-text">{name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                )}
                <span className="leading-none max-w-[120px] truncate">{name}</span>
            </div>
        </span>
    );
}

export default CreatorBadge;
