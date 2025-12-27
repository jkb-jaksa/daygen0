import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, Scaling, Scan } from "lucide-react";
import { glass } from "../../styles/designSystem";
import { SIDEBAR_TOP_PADDING, SIDEBAR_WIDTH, SIDEBAR_PROMPT_GAP } from "../create/layoutConstants";
import { LIBRARY_CATEGORIES, FOLDERS_ENTRY } from "../create/sidebarData";
import { scrollLockExemptAttr } from "../../hooks/useGlobalScrollLock";

export type EditModeType = 'quick-edit' | 'resize' | 'inpaint';

export interface EditSidebarProps {
    activeMode: EditModeType;
    onSelectMode: (mode: EditModeType) => void;
    reservedBottomSpace?: number;
    isFullSizeOpen?: boolean;
}

const EDIT_MODES = [
    { key: 'quick-edit' as EditModeType, label: 'Text Edit', Icon: Wand2, iconColor: 'text-red-500', gradient: 'from-red-400 via-red-500 to-red-600' },
    { key: 'inpaint' as EditModeType, label: 'Inpaint', Icon: Scan, iconColor: 'text-red-500', gradient: 'from-red-400 via-red-500 to-red-600' },
    { key: 'resize' as EditModeType, label: 'Resize', Icon: Scaling, iconColor: 'text-red-500', gradient: 'from-red-400 via-red-500 to-red-600' },
] as const;

function EditSidebarComponent({
    activeMode,
    onSelectMode,
    reservedBottomSpace = 0,
    isFullSizeOpen = false,
}: EditSidebarProps) {
    const navigate = useNavigate();
    const [pressedItem, setPressedItem] = useState<string | null>(null);
    const topOffset = SIDEBAR_TOP_PADDING;
    const minimumReservedSpace = SIDEBAR_PROMPT_GAP + 12;
    const effectiveReservedSpace = Math.max(reservedBottomSpace, minimumReservedSpace);

    const sidebarHeight = isFullSizeOpen
        ? `calc(100vh - var(--nav-h) - 32px)`
        : `calc(100vh - var(--nav-h) - ${topOffset}px - ${effectiveReservedSpace}px)`;

    // Desktop positioning (fixed)
    const desktopTop = isFullSizeOpen
        ? `calc(var(--nav-h) + 16px)`
        : `calc(var(--nav-h) + ${SIDEBAR_TOP_PADDING}px)`;

    const zIndex = isFullSizeOpen ? 'z-[120]' : 'lg:z-30 z-20';

    // Container classes - now visible on mobile as a block (horizontal)
    const responsiveClass = isFullSizeOpen ? '' : 'block w-full lg:w-auto';

    // Nav classes - switch between horizontal (mobile) and vertical (desktop)
    const navClasses = isFullSizeOpen
        ? `${glass.promptDark} border-theme-dark rounded-2xl flex flex-col fixed left-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] w-[152px] ${zIndex} px-3 py-4`
        : `${glass.promptDark} border-theme-dark rounded-2xl flex flex-row lg:flex-col items-center lg:items-stretch overflow-x-auto lg:overflow-x-visible no-scrollbar lg:fixed lg:left-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] w-full lg:w-[152px] ${zIndex} px-3 py-2 lg:py-4 gap-2 lg:gap-0 sticky top-[calc(var(--nav-h)+1rem)] lg:top-auto`;

    // Dynamic styles for desktop fixed positioning vs mobile static/sticky
    const navStyles = isFullSizeOpen
        ? { height: sidebarHeight, maxHeight: sidebarHeight, top: desktopTop, width: SIDEBAR_WIDTH }
        : {
            // Desktop: Fixed height and position
            '--desktop-height': sidebarHeight,
            '--desktop-top': desktopTop,
            // Mobile: Auto height, explicit width overrides
        } as React.CSSProperties;

    // Color-specific shadow mappings for edit modes (all use red/image theme)
    const shadowColorMap: Record<EditModeType, string> = {
        'quick-edit': "rgba(239, 68, 68, 0.15)",
        'inpaint': "rgba(239, 68, 68, 0.15)",
        'resize': "rgba(239, 68, 68, 0.15)",
    };

    const pressedShadowColorMap: Record<EditModeType, string> = {
        'quick-edit': "rgba(239, 68, 68, 0.22)",
        'inpaint': "rgba(239, 68, 68, 0.22)",
        'resize': "rgba(239, 68, 68, 0.22)",
    };

    const borderColorMap: Record<EditModeType, string> = {
        'quick-edit': "border-red-500/25",
        'inpaint': "border-red-500/25",
        'resize': "border-red-500/25",
    };

    // Navigation handler for library categories
    const handleLibraryNavigation = (key: string) => {
        if (key === 'gallery') {
            navigate('/gallery');
        } else if (key === 'avatars') {
            navigate('/app/avatars');
        } else if (key === 'products') {
            navigate('/app/products');
        } else if (key === 'my-folders') {
            navigate('/gallery/folders');
        }
    };

    return (
        <div className={responsiveClass} style={{ width: isFullSizeOpen ? SIDEBAR_WIDTH : undefined }} id="edit-sidebar-container">
            <style>{`
                @media (min-width: 1024px) {
                    #edit-sidebar-nav {
                        height: var(--desktop-height) !important;
                        max-height: var(--desktop-height) !important;
                        top: var(--desktop-top) !important;
                        width: ${SIDEBAR_WIDTH}px !important;
                    }
                    #edit-sidebar-container {
                        width: ${SIDEBAR_WIDTH}px !important;
                    }
                }
            `}</style>
            <nav
                id="edit-sidebar-nav"
                data-edit-sidebar="true"
                aria-label="Edit navigation"
                className={navClasses}
                style={navStyles}
            >
                <aside
                    className="flex flex-row lg:flex-col lg:flex-1 gap-2 lg:gap-0 lg:overflow-y-auto lg:pr-1 items-center lg:items-stretch"
                    {...(isFullSizeOpen ? { [scrollLockExemptAttr]: "true" } : {})}
                >
                    {/* EDIT Section Header - Hidden on mobile to save space */}
                    <div className="hidden lg:flex items-center px-2 text-[12px] text-theme-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
                        edit
                    </div>

                    {/* Edit Mode Buttons */}
                    {EDIT_MODES.map(({ key, label, Icon, gradient, iconColor }) => {
                        const isActive = activeMode === key;
                        const isPressed = pressedItem === key;

                        const insetShadow = isPressed && isActive && gradient
                            ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em ${pressedShadowColorMap[key]}` }
                            : isPressed && !isActive
                                ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
                                : isActive && gradient
                                    ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em ${shadowColorMap[key]}` }
                                    : {};

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onSelectMode(key)}
                                onMouseDown={() => setPressedItem(key)}
                                onMouseUp={() => setPressedItem(null)}
                                onMouseLeave={() => setPressedItem(null)}
                                onTouchStart={() => setPressedItem(key)}
                                onTouchEnd={() => setPressedItem(null)}
                                className={`parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-3 pr-3 lg:pl-4 lg:pr-4 py-2 flex-shrink-0 text-sm font-raleway transition-all duration-100 focus:outline-none group ${isActive
                                    ? `border ${borderColorMap[key]} text-theme-text`
                                    : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                                    }`}
                                style={insetShadow}
                                aria-pressed={isActive}
                            >
                                {gradient && (
                                    <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-gradient-to-br ${gradient} transition-opacity duration-100 ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'}`} />
                                )}
                                <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-100 ${isActive && iconColor ? iconColor : 'text-theme-text group-hover:text-theme-text'}`} />
                                <span className="relative z-10 whitespace-nowrap">{label}</span>
                            </button>
                        );
                    })}

                    {/* Divider - Vertical on Mobile, Horizontal on Desktop */}
                    <div className="hidden lg:block border-t border-theme-dark my-2" />
                    <div className="lg:hidden h-6 w-px bg-theme-dark mx-1" />

                    {/* MY WORKS Section Header - Hidden on mobile */}
                    <div className="hidden lg:flex items-center px-2 text-[12px] text-theme-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
                        My works
                    </div>

                    {/* Library Categories */}
                    {LIBRARY_CATEGORIES.map(({ key, label, Icon }) => {
                        const isPressed = pressedItem === key;

                        const insetShadow = isPressed
                            ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
                            : {};

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleLibraryNavigation(key)}
                                onMouseDown={() => setPressedItem(key)}
                                onMouseUp={() => setPressedItem(null)}
                                onMouseLeave={() => setPressedItem(null)}
                                onTouchStart={() => setPressedItem(key)}
                                onTouchEnd={() => setPressedItem(null)}
                                className="parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-3 pr-3 lg:pl-4 lg:pr-4 py-2 flex-shrink-0 text-sm font-raleway transition-all duration-100 focus:outline-none group border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                                style={insetShadow}
                            >
                                <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 opacity-0 group-hover:opacity-20" />
                                <Icon className="h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-100 text-theme-text group-hover:text-theme-text" />
                                <span className="relative z-10 whitespace-nowrap hidden sm:inline">{label}</span>
                                <span className="relative z-10 sm:hidden">{label === 'Avatars' ? 'Avatars' : label === 'Products' ? 'Products' : ''}</span>
                            </button>
                        );
                    })}

                    {/* Folders Entry */}
                    <button
                        type="button"
                        onClick={() => handleLibraryNavigation(FOLDERS_ENTRY.key)}
                        onMouseDown={() => setPressedItem(FOLDERS_ENTRY.key)}
                        onMouseUp={() => setPressedItem(null)}
                        onMouseLeave={() => setPressedItem(null)}
                        onTouchStart={() => setPressedItem(FOLDERS_ENTRY.key)}
                        onTouchEnd={() => setPressedItem(null)}
                        className="parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-3 pr-3 lg:pl-4 lg:pr-4 py-2 flex-shrink-0 text-sm font-raleway transition-all duration-100 focus:outline-none group border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                        style={pressedItem === FOLDERS_ENTRY.key ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` } : {}}
                    >
                        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 opacity-0 group-hover:opacity-20" />
                        <FOLDERS_ENTRY.Icon className="h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-100 text-theme-text group-hover:text-theme-text" />
                        <span className="relative z-10 whitespace-nowrap hidden sm:inline">{FOLDERS_ENTRY.label}</span>
                    </button>
                </aside>
            </nav>
        </div>
    );
}

export const EditSidebar = memo(EditSidebarComponent);

export default EditSidebar;
