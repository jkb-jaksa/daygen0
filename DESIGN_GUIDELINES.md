# DayGen Design Guidelines

> **Last Updated**: November 9, 2025  
> **Status**: ✅ Current and enforced across codebase

This document defines the complete design system standards for the DayGen frontend. All components must follow these patterns for visual consistency and maintainability.

---

## Table of Contents

1. [Typography Standards](#typography-standards)
2. [Button Standards](#button-standards)
3. [Card Standards](#card-standards)
4. [Border Radius Patterns](#border-radius-patterns)
5. [Spacing Strategy](#spacing-strategy)
6. [Icon Size Standards](#icon-size-standards)
7. [Interactive Effects](#interactive-effects)
8. [Glass Effect Usage](#glass-effect-usage)
9. [Color Token Usage](#color-token-usage)
10. [Quick Reference](#quick-reference)

---

## Typography Standards

### Font Weights

**RULE**: Only two font weights are permitted in components.

```tsx
// ✅ CORRECT - Body text
<p className="text-base font-raleway font-normal text-theme-white">
  Regular paragraph text
</p>

// ✅ CORRECT - Emphasis (headings, labels, buttons)
<h3 className="text-xl font-raleway font-medium text-theme-text">
  Section Heading
</h3>

// ✅ CORRECT - Button text
<button className="btn btn-white font-raleway text-base font-medium">
  Click Me
</button>

// ❌ WRONG - Never use font-bold or font-semibold
<p className="font-bold">Don't do this</p>
<span className="font-semibold">Or this</span>
```

### Font Family

**RULE**: Always use Raleway font family.

```tsx
// ✅ CORRECT - Explicit font family
<p className="font-raleway">Text content</p>

// ⚠️ ACCEPTABLE - Implicit (inherits from body)
<p>Text content</p>

// ❌ WRONG - Other fonts (unless specifically needed)
<p className="font-sans">Don't do this</p>
```

### Design System Text Classes

Use design system utilities for major text elements:

```tsx
import { text } from "../styles/designSystem";

// Hero headings
<h1 className={text.heroHeading}>Main Title</h1>

// Section headings
<h2 className={text.sectionHeading}>Section Title</h2>

// Body text
<p className={text.body}>Paragraph text</p>

// Fine print
<small className={text.finePrint}>Small text</small>
```

---

## Button Standards

### Primary CTA Button

**RULE**: Use `btn-white` for all primary call-to-action buttons.

```tsx
// ✅ CORRECT - Primary CTA
<button className="btn btn-white font-raleway text-base font-medium parallax-large">
  Get Started
</button>

// ✅ CORRECT - Using design system export
import { buttons } from "../styles/designSystem";

<button className={`${buttons.primary} gap-2`}>
  <Icon className="w-4 h-4" />
  Action
</button>
```

### Colorful Buttons (Semantic Use Only)

**RULE**: Use colored buttons ONLY for specific semantic purposes.

```tsx
// ✅ CORRECT - Pro tier (cyan)
<button className="btn btn-cyan font-raleway text-base font-medium">
  Subscribe to Pro
</button>

// ✅ CORRECT - Enterprise tier (red)
<button className="btn btn-red font-raleway text-base font-medium">
  Subscribe to Enterprise
</button>

// ✅ CORRECT - Brand accent (orange)
<button className="btn btn-orange font-raleway text-base font-medium">
  Special Action
</button>

// ❌ WRONG - Using colorful button as generic CTA
<button className="btn btn-cyan">Buy Now</button>
// Should be: <button className="btn btn-white">Buy Now</button>
```

### Ghost Buttons (Secondary Actions)

```tsx
// ✅ CORRECT - Ghost button
<button className="btn btn-ghost font-raleway text-base font-medium">
  Cancel
</button>

// ✅ CORRECT - Compact variant
<button className="btn btn-ghost btn-ghost-compact font-raleway text-base font-medium">
  More Options
</button>

// ✅ CORRECT - Using design system
<button className={buttons.ghost}>
  Secondary Action
</button>
```

### Button Anatomy (Required Classes)

**Every button MUST include**:

1. Base: `btn`
2. Variant: `btn-white`, `btn-cyan`, `btn-red`, `btn-ghost`, etc.
3. Font: `font-raleway text-base font-medium`
4. Interactive: `parallax-large` (for hover effect)

```tsx
// ✅ COMPLETE BUTTON
<button className="btn btn-white font-raleway text-base font-medium parallax-large">
  Complete Button
</button>

// ❌ INCOMPLETE - Missing font-medium
<button className="btn btn-white">Incomplete</button>

// ❌ INCOMPLETE - Missing parallax-large
<button className="btn btn-white font-raleway text-base font-medium">
  No Hover Effect
</button>
```

### Button Border Radius

**RULE**: All buttons use `rounded-full` (pill shape).

```tsx
// ✅ CORRECT - Built into .btn class
<button className="btn btn-white">Already rounded-full</button>

// ❌ WRONG - Don't override
<button className="btn btn-white rounded-lg">Wrong radius</button>
```

---

## Card Standards

### Basic Card Structure

**RULE**: Always use `${cards.shell}` for card containers.

```tsx
import { cards } from "../styles/designSystem";

// ✅ CORRECT - Basic card
<div className={`${cards.shell} p-6 bg-theme-black`}>
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

// ❌ WRONG - Custom border radius
<div className="rounded-lg border border-theme-dark p-6">
  Should use cards.shell
</div>
```

### Interactive Cards

**RULE**: Add `parallax-small mouse-glow` for interactive cards.

```tsx
import useParallaxHover from "../hooks/useParallaxHover";

const MyCard = () => {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  return (
    <div
      className={`${cards.shell} p-6 cursor-pointer parallax-small mouse-glow`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      Card content
    </div>
  );
};
```

---

## Border Radius Patterns

### Standard Patterns by Element Type

| Element Type | Border Radius | Class | Example |
|--------------|---------------|-------|---------|
| Buttons | Full rounded (pill) | `rounded-full` | Built into `.btn` |
| Cards | 28px | `rounded-[28px]` | Use `${cards.shell}` |
| Modals | 24px | `rounded-2xl` | Modal containers |
| Dropdowns | 24px | `rounded-2xl` | Menus, popovers |
| Input Fields | 16px | `rounded-xl` | Text inputs |
| Small Containers | 12px | `rounded-lg` | Badges, small boxes |
| Icon Containers | Full rounded | `rounded-full` | Avatar initials |

```tsx
// ✅ CORRECT - Modal
<div className="rounded-2xl border border-theme-mid">
  Modal content
</div>

// ✅ CORRECT - Input
<input className={inputs.compact} /> // Uses rounded-xl

// ✅ CORRECT - Badge
<div className="px-3 py-1 rounded-full border border-theme-dark">
  Badge
</div>

// ❌ WRONG - Inconsistent radius on button
<button className="btn btn-white rounded-lg">Wrong</button>
```

---

## Spacing Strategy

### Hybrid Approach (Best Practice)

**Layout-level**: Use design system tokens for consistency  
**Component-level**: Use Tailwind utilities for flexibility

```tsx
import { layout } from "../styles/designSystem";

// ✅ CORRECT - Layout-level spacing
<section className={`${layout.container} ${layout.sectionPadding}`}>
  {/* Uses CSS custom properties for responsive spacing */}
</section>

// ✅ CORRECT - Component-level spacing
<div className="p-6 gap-4 mb-4">
  {/* Uses Tailwind for quick adjustments */}
</div>

// ✅ CORRECT - Hybrid in practice
<section className={layout.container}>
  <div className={cards.shell + " p-6"}>
    <h2 className="mb-4">Title</h2>
    <p className="mb-2">Content</p>
  </div>
</section>
```

### When to Use Each

**Design System Tokens** (`var(--space-*)` or `${layout.*}`):
- Page-level padding
- Section spacing
- Major layout gaps
- Responsive breakpoints

**Tailwind Utilities** (`p-6`, `gap-2`, `mb-4`):
- Internal component padding
- Small gaps between elements
- Margins
- Fine-tuned spacing

---

## Icon Size Standards

### Size by Context

```tsx
// ✅ CORRECT - Button icons (16px)
<button className="btn btn-white">
  <Check className="w-4 h-4" />
  Confirm
</button>

// ✅ CORRECT - Feature icons (20px)
<div className="flex items-center gap-3">
  <Sparkles className="w-5 h-5 text-theme-text" />
  <span>Feature name</span>
</div>

// ✅ CORRECT - Small indicators (12px)
<div className="w-4 h-4 rounded-full bg-theme-text/20">
  <Check className="w-3 h-3 text-theme-text" />
</div>

// ⚠️ INCONSISTENT - Don't mix sizes without reason
<button>
  <Icon className="w-5 h-5" /> // Should be w-4 h-4
  Button
</button>
```

### Icon Button Containers

```tsx
import { iconButtons } from "../styles/designSystem";

// ✅ CORRECT - Using design system
<button className={iconButtons.sm}>
  <Search className="w-4 h-4" />
</button>

// ✅ CORRECT - Explicit sizing
<button className="inline-flex items-center justify-center size-8 rounded-full">
  <X className="w-4 h-4" />
</button>
```

---

## Interactive Effects

### Parallax Effects

**RULE**: Apply parallax consistently by element size.

```tsx
// ✅ CORRECT - Large cards
<div className={`${cards.shell} parallax-small mouse-glow`}>
  Large card
</div>

// ✅ CORRECT - Buttons
<button className="btn btn-white parallax-large">
  Button
</button>

// ✅ CORRECT - Small cards
<div className="rounded-lg border border-theme-dark parallax-small">
  Small card
</div>

// ❌ WRONG - Missing parallax on button
<button className="btn btn-white">Missing hover effect</button>
```

### Mouse Glow Effect

**RULE**: Only add `mouse-glow` to cards that benefit from the effect.

```tsx
// ✅ CORRECT - Pricing cards, feature cards
<div className={`${cards.shell} parallax-small mouse-glow`}>
  Interactive card with glow
</div>

// ❌ WRONG - Don't overuse
<div className="p-4 mouse-glow">
  Simple div doesn't need glow
</div>
```

**Note**: `mouse-glow` requires the `useParallaxHover` hook to function.

---

## Glass Effect Usage

### Glass Variants by Purpose

```tsx
import { glass } from "../styles/designSystem";

// ✅ CORRECT - Navbar, overlays, dropdowns (dark, heavy blur)
<nav className={glass.promptDark}>
  Navigation
</nav>

// ✅ CORRECT - Content cards, panels (lighter)
<div className={glass.surface}>
  Panel content
</div>

// ✅ CORRECT - Default containers
<div className={glass.base}>
  Generic container
</div>

// ✅ CORRECT - Tight corners variant
<div className={glass.tight}>
  Small box
</div>
```

### Custom Glass

If you need custom glass styling:

```tsx
// ✅ CORRECT - Following the pattern
<div className="glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-[color:var(--glass-border)] bg-[color:var(--glass-base-bg)]">
  Custom glass
</div>
```

---

## Color Token Usage

### Always Use CSS Variables

**RULE**: Never hardcode color values except for brand constants.

```tsx
// ✅ CORRECT - Theme-aware colors
<p className="text-theme-text">Primary text</p>
<p className="text-theme-white">Secondary text</p>
<div className="bg-theme-black border-theme-dark">Container</div>

// ✅ CORRECT - Brand colors (semantic)
<div className="text-cyan-lighter">Pro feature</div>
<div className="text-red-lighter">Enterprise feature</div>

// ❌ WRONG - Hardcoded colors
<p className="text-gray-300">Don't hardcode</p>
<div style={{ color: '#FAFAFA' }}>Don't inline</div>
```

### Theme Color Tokens

Available theme tokens:
- `--theme-text`: Primary text color (#FAFAFA in night mode)
- `--theme-white`: Secondary text (#B0B8B8)
- `--theme-light`: Tertiary text (#858a8a)
- `--theme-mid`: Border/hover states (#303636)
- `--theme-dark`: Default borders (#1b1d1d)
- `--theme-black`: Background (#060806)

Brand colors:
- `--brand-cyan`: rgb(3,188,189)
- `--brand-red`: rgb(243,36,54)
- `--brand-orange`: #FF8C00 (deprecated, use --theme-orange-1)

---

## Button Standards Reference

### Complete Button Patterns

```tsx
// PRIMARY CTA (most common)
<button className="btn btn-white font-raleway text-base font-medium parallax-large">
  Primary Action
</button>

// COLORFUL SEMANTIC (Pro tier)
<button className="btn btn-cyan font-raleway text-base font-medium parallax-large">
  Subscribe to Pro
</button>

// COLORFUL SEMANTIC (Enterprise tier)
<button className="btn btn-red font-raleway text-base font-medium parallax-large">
  Subscribe to Enterprise
</button>

// GHOST (secondary actions)
<button className="btn btn-ghost font-raleway text-base font-medium parallax-large">
  Cancel
</button>

// COMPACT VARIANT
<button className="btn btn-white btn-compact font-raleway text-base font-medium">
  Compact Button
</button>

// GHOST COMPACT
<button className="btn btn-ghost btn-ghost-compact font-raleway text-base font-medium">
  Ghost Compact
</button>

// BLOCK (full width)
<button className={buttons.blockPrimary}>
  Full Width Button
</button>

// GLASS PROMPT ACTION
<button className={buttons.glassPrompt}>
  <Icon className="w-4 h-4" />
  Prompt Action
</button>
```

### Button Sizing Guidelines

- **Default height**: 36px (built into `.btn`)
- **Compact height**: 32px (use `btn-compact`)
- **Minimum width**: 120px on desktop (auto on mobile)
- **Padding**: 0-24px default (16px on mobile)

### Disabled State

```tsx
// ✅ CORRECT - Disabled button
<button 
  className="btn btn-white font-raleway text-base font-medium opacity-50 cursor-not-allowed"
  disabled
>
  Processing...
</button>
```

---

## Card Standards

### Standard Card Pattern

```tsx
import { cards } from "../styles/designSystem";
import useParallaxHover from "../hooks/useParallaxHover";

// ✅ CORRECT - Complete interactive card
const MyCard = ({ title, content, onClick }) => {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();
  
  return (
    <div
      className={`${cards.shell} p-6 cursor-pointer bg-theme-black parallax-small mouse-glow transition-all duration-200`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      <h3 className="text-xl font-raleway font-medium text-theme-text mb-2">
        {title}
      </h3>
      <p className="text-base font-raleway font-normal text-theme-white">
        {content}
      </p>
    </div>
  );
};
```

### Non-Interactive Card

```tsx
// ✅ CORRECT - Static card (no parallax/glow)
<div className={`${cards.shell} p-6 bg-theme-black`}>
  <h3 className="text-lg font-medium text-theme-text">Title</h3>
  <p className="text-theme-white">Content</p>
</div>
```

---

## Quick Reference

### Common Patterns Cheat Sheet

```tsx
// PRIMARY BUTTON
btn btn-white font-raleway text-base font-medium parallax-large

// SECONDARY BUTTON
btn btn-ghost font-raleway text-base font-medium parallax-large

// SEMANTIC BUTTON (Pro)
btn btn-cyan font-raleway text-base font-medium parallax-large

// INTERACTIVE CARD
${cards.shell} p-6 parallax-small mouse-glow

// STATIC CARD
${cards.shell} p-6

// MODAL CONTAINER
rounded-2xl border border-theme-mid ${glass.surface} p-6

// DROPDOWN MENU
rounded-2xl ${glass.promptDark} p-2

// INPUT FIELD
${inputs.compact} // or ${inputs.base}

// ICON BUTTON
${iconButtons.sm}

// TEXT HEADING
text-xl font-raleway font-medium text-theme-text

// TEXT BODY
text-base font-raleway font-normal text-theme-white
```

### Decision Tree

**"What button should I use?"**
1. Is this a primary action? → `btn-white`
2. Is this Pro/Enterprise tier? → `btn-cyan` / `btn-red`
3. Is this a secondary/cancel action? → `btn-ghost`
4. Is this a brand accent? → `btn-orange`

**"What border radius?"**
1. Is it a button? → Already `rounded-full`
2. Is it a card? → Use `${cards.shell}` (includes `rounded-[28px]`)
3. Is it a modal/dropdown? → `rounded-2xl`
4. Is it an input? → `rounded-xl`
5. Is it a small container? → `rounded-lg`

**"What font weight?"**
1. Is it body text? → `font-normal`
2. Is it a heading/label/button? → `font-medium`
3. Is it bold text? → **NO** - use `font-medium`

**"What spacing?"**
1. Is it page/section layout? → Use design system tokens
2. Is it internal component spacing? → Use Tailwind utilities
3. Is it a card? → `p-6`

---

## Anti-Patterns (Don't Do This)

### Typography Anti-Patterns

```tsx
// ❌ WRONG - font-bold
<h1 className="font-bold">Never use bold</h1>

// ❌ WRONG - font-semibold
<p className="font-semibold">Never use semibold</p>

// ❌ WRONG - Missing font-raleway
<p className="text-base">Should specify font-raleway</p>
```

### Button Anti-Patterns

```tsx
// ❌ WRONG - Undefined class
<button className="btn btn-outline">Doesn't exist</button>

// ❌ WRONG - Undefined size
<button className="btn btn-sm">Use btn-compact instead</button>

// ❌ WRONG - Wrong radius
<button className="btn btn-white rounded-lg">Should be rounded-full</button>

// ❌ WRONG - Missing font-medium
<button className="btn btn-white font-raleway">Incomplete</button>

// ❌ WRONG - Using colorful button as generic CTA
<button className="btn btn-cyan">Download</button> // Should be btn-white
```

### Card Anti-Patterns

```tsx
// ❌ WRONG - Custom border radius
<div className="rounded-xl border border-theme-dark">
  Should use ${cards.shell}
</div>

// ❌ WRONG - Design token for component spacing
<div className={cards.shell + " p-[var(--space-6)]"}>
  Use p-6 instead
</div>

// ❌ WRONG - Mouse glow without parallax hook
<div className="mouse-glow">
  Needs useParallaxHover hook
</div>
```

### Color Anti-Patterns

```tsx
// ❌ WRONG - Hardcoded colors
<p className="text-gray-300">Use text-theme-white</p>
<div style={{ backgroundColor: '#060806' }}>Use bg-theme-black</div>

// ❌ WRONG - RGB values instead of tokens
<div className="bg-[rgb(250,250,250)]">Use bg-theme-text</div>
```

---

## Migration Checklist

When updating existing components to match design standards:

### Typography
- [ ] Replace all `font-bold` with `font-medium`
- [ ] Replace all `font-semibold` with `font-medium`
- [ ] Add explicit `font-normal` to body text
- [ ] Ensure all text has `font-raleway`

### Buttons
- [ ] Add `font-medium text-base` to all buttons
- [ ] Change generic CTAs to `btn-white`
- [ ] Keep colorful buttons only for semantic purposes
- [ ] Ensure all buttons have `parallax-large`
- [ ] Remove any `rounded-lg` or `rounded-2xl` from buttons

### Cards
- [ ] Replace custom border radius with `${cards.shell}`
- [ ] Change spacing from `p-[var(--space-*)]` to `p-6`
- [ ] Add `parallax-small` to interactive cards
- [ ] Ensure `mouse-glow` has parallax hook

### Colors
- [ ] Replace hardcoded colors with `text-theme-*` tokens
- [ ] Use `bg-theme-*` for backgrounds
- [ ] Use `border-theme-*` for borders

### Spacing
- [ ] Layout spacing uses design tokens
- [ ] Component spacing uses Tailwind
- [ ] Verify responsive behavior

---

## Examples from Codebase

### Pricing Card (Reference Implementation)

```tsx
// From: src/components/Pricing.tsx
<div
  className={`${cards.shell} p-6 cursor-pointer transition-all duration-200 parallax-small mouse-glow`}
  onPointerMove={onPointerMove}
  onPointerEnter={onPointerEnter}
  onPointerLeave={onPointerLeave}
>
  <h3 className="text-3xl font-raleway font-normal mb-1 text-theme-text">
    {tier.name}
  </h3>
  <p className="text-sm font-raleway text-theme-text">
    {tier.description}
  </p>
  
  {/* Features list */}
  <div className="space-y-2 mb-6">
    {tier.features.map((feature) => (
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-theme-text/20">
          <Check className="w-3 h-3 text-theme-text" />
        </div>
        <span className="text-sm font-raleway font-normal text-theme-white">
          {feature}
        </span>
      </div>
    ))}
  </div>
  
  {/* CTA */}
  <button className="w-full btn btn-cyan font-raleway text-base font-medium parallax-large">
    Subscribe
  </button>
</div>
```

### Navbar Link (Reference Implementation)

```tsx
// From: src/components/Navbar.tsx
<NavLink
  to={item.path}
  className={({ isActive }) =>
    `relative overflow-hidden group parallax-small transition-colors duration-200 px-4 h-9 flex items-center rounded-full font-normal ${
      isActive ? "text-theme-text" : "text-theme-white hover:text-theme-text"
    }`
  }
>
  {({ isActive }) => (
    <>
      <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-full transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
      <span className="relative z-10">{item.label}</span>
    </>
  )}
</NavLink>
```

---

## Testing Your Component

Before submitting, verify:

1. **Typography**
   - [ ] No `font-bold` or `font-semibold`
   - [ ] All buttons have `font-medium`
   - [ ] Body text has `font-normal`

2. **Buttons**
   - [ ] Primary actions use `btn-white`
   - [ ] All buttons have `font-raleway text-base font-medium parallax-large`
   - [ ] Border radius is `rounded-full` (built-in)
   - [ ] Icons are `w-4 h-4`

3. **Cards**
   - [ ] Using `${cards.shell}` for border radius
   - [ ] Spacing is `p-6` (not `p-[var(--space-6)]`)
   - [ ] Interactive cards have `parallax-small`

4. **Colors**
   - [ ] All colors use theme tokens
   - [ ] No hardcoded hex values (except brand)

5. **Border Radius**
   - [ ] Buttons: `rounded-full` ✓
   - [ ] Cards: `rounded-[28px]` ✓
   - [ ] Modals: `rounded-2xl` ✓

---

## Additional Resources

- **Design System Code**: `src/styles/designSystem.ts`
- **Technical Standards**: `docs/DESIGN_STANDARDS.md`
- **Frontend Guide**: `FRONTEND_GUIDE.md`
- **Architecture**: `agents.md`

---

## Questions?

If you're unsure about a pattern:
1. Check existing components for reference implementations
2. Look at `Pricing.tsx`, `Navbar.tsx`, or `Card.tsx` as gold standards
3. Review the design system exports in `src/styles/designSystem.ts`

---

*This guide is maintained alongside code changes. If you find inconsistencies, update both code and docs.*

