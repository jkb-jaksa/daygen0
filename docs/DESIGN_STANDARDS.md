# DayGen Design Standards - Technical Reference

> **Last Updated**: November 9, 2025  
> **For**: Developers implementing components  
> **See Also**: [DESIGN_GUIDELINES.md](../DESIGN_GUIDELINES.md) for comprehensive patterns

This document provides quick technical reference for implementing DayGen components with correct design patterns.

---

## Quick Reference Tables

### Button Class Matrix

| Use Case | Classes | Example |
|----------|---------|---------|
| Primary CTA | `btn btn-white font-raleway text-base font-medium parallax-large` | Sign Up, Get Started, Buy Now |
| Pro Tier | `btn btn-cyan font-raleway text-base font-medium parallax-large` | Subscribe to Pro |
| Enterprise Tier | `btn btn-red font-raleway text-base font-medium parallax-large` | Subscribe to Enterprise |
| Brand Accent | `btn btn-orange font-raleway text-base font-medium parallax-large` | Special promotions |
| Secondary/Cancel | `btn btn-ghost font-raleway text-base font-medium parallax-large` | Cancel, Back, More |
| Compact Primary | `btn btn-white btn-compact font-raleway text-base font-medium` | Navbar CTAs |
| Compact Ghost | `btn btn-ghost btn-ghost-compact font-raleway text-base font-medium` | Navbar secondary |
| Full Width | `btn btn-white w-full font-raleway text-base font-medium` | Modal buttons |
| Glass Action | `glass-prompt-action` or `buttons.glassPrompt` | Prompt bar actions |

### Border Radius Reference

| Element | Radius | CSS Class | When to Use |
|---------|--------|-----------|-------------|
| Button | Full (pill) | `rounded-full` | Built into `.btn` - don't override |
| Card | 28px | `rounded-[28px]` | Use `${cards.shell}` - all cards |
| Modal | 24px | `rounded-2xl` | Modal containers, dialogs |
| Dropdown | 24px | `rounded-2xl` | Menus, select dropdowns |
| Input | 16px | `rounded-xl` | Text inputs (via `${inputs.base}`) |
| Small box | 12px | `rounded-lg` | Badges, small containers |
| Avatar | Full | `rounded-full` | Profile pictures, initials |

### Icon Size by Context

| Context | Size | Class | Usage |
|---------|------|-------|-------|
| Button icon | 16px | `w-4 h-4` | Icons inside buttons |
| Feature icon | 20px | `w-5 h-5` | Standalone feature icons |
| Checkmark | 12px | `w-3 h-3` | Success indicators in lists |
| Badge icon | 12px | `w-3 h-3` | Icons in small badges |
| Large feature | 24px | `w-6 h-6` | Hero section icons |

### Typography Weight Rules

| Use | Weight | Class | Examples |
|-----|--------|-------|----------|
| Body text | 400 | `font-normal` | Paragraphs, descriptions |
| Headings | 400 | `font-normal` | All h1-h6 (use size for hierarchy) |
| Emphasis | 500 | `font-medium` | Labels, buttons, badges |
| Never use | 600+ | `font-semibold`, `font-bold` | ❌ Not allowed |

### Spacing Decision Matrix

| Type | Use | Example |
|------|-----|---------|
| Layout | Design tokens | `${layout.container}`, `${layout.sectionPadding}` |
| Major gaps | Design tokens | `gap-[var(--space-4)]` |
| Card padding | Tailwind | `p-6` (not `p-[var(--space-6)]`) |
| Small gaps | Tailwind | `gap-2`, `gap-3`, `gap-4` |
| Margins | Tailwind | `mb-4`, `mt-2`, `mx-auto` |
| Internal padding | Tailwind | `px-4`, `py-2` |

---

## Before/After Examples

### Example 1: Button Migration

**Before** (Incorrect):
```tsx
<button className="btn btn-cyan rounded-lg">
  Download
</button>
```

**After** (Correct):
```tsx
<button className="btn btn-white font-raleway text-base font-medium parallax-large">
  Download
</button>
```

**Changes**:
- ❌ Removed `btn-cyan` (should only be used for Pro tier)
- ✅ Changed to `btn-white` (standard primary CTA)
- ❌ Removed `rounded-lg` (buttons are always rounded-full)
- ✅ Added `font-raleway text-base font-medium` (required)
- ✅ Added `parallax-large` (interactive effect)

### Example 2: Card Migration

**Before** (Incorrect):
```tsx
<div className="rounded-xl border border-theme-dark p-[var(--space-6)] hover:border-theme-mid">
  <h3 className="text-xl font-bold">Title</h3>
  <p className="text-theme-white">Content</p>
</div>
```

**After** (Correct):
```tsx
import { cards } from "../styles/designSystem";

<div className={`${cards.shell} p-6`}>
  <h3 className="text-xl font-raleway font-medium text-theme-text">Title</h3>
  <p className="text-base font-raleway font-normal text-theme-white">Content</p>
</div>
```

**Changes**:
- ✅ Use `${cards.shell}` (includes rounded-[28px], border, hover)
- ✅ Changed `p-[var(--space-6)]` to `p-6` (component-level spacing)
- ✅ Fixed `font-bold` to `font-medium`
- ✅ Added explicit `font-raleway` and `font-normal` to paragraph

### Example 3: Interactive Card

**Before** (Incorrect):
```tsx
<div className="rounded-2xl border border-theme-dark p-4 cursor-pointer">
  <h3>Card</h3>
</div>
```

**After** (Correct):
```tsx
import { cards } from "../styles/designSystem";
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
      <h3 className="text-xl font-raleway font-medium text-theme-text">Card</h3>
    </div>
  );
};
```

**Changes**:
- ✅ Use `${cards.shell}` for proper border radius
- ✅ Changed `p-4` to `p-6` (standard card padding)
- ✅ Added `parallax-small mouse-glow` for interactivity
- ✅ Added parallax hover handlers
- ✅ Proper typography on heading

### Example 4: Typography

**Before** (Incorrect):
```tsx
<div>
  <h2 className="text-2xl font-semibold">Heading</h2>
  <p className="font-bold">Important text</p>
  <span>Normal text</span>
</div>
```

**After** (Correct):
```tsx
<div>
  <h2 className="text-2xl font-raleway font-medium text-theme-text">Heading</h2>
  <p className="text-base font-raleway font-medium text-theme-white">Important text</p>
  <span className="text-base font-raleway font-normal text-theme-white">Normal text</span>
</div>
```

**Changes**:
- ✅ Fixed `font-semibold` to `font-medium`
- ✅ Fixed `font-bold` to `font-medium`
- ✅ Added explicit `font-raleway font-normal` to span
- ✅ Added explicit color tokens

---

## Anti-Patterns Reference

### Typography Anti-Patterns

| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `font-bold` | `font-medium` | Only two weights allowed |
| `font-semibold` | `font-medium` | Standardize to medium |
| `text-gray-300` | `text-theme-white` | Use theme tokens |
| Missing `font-raleway` | Add `font-raleway` | Consistent font family |
| Missing weight | Add `font-normal` or `font-medium` | Explicit is better |

### Button Anti-Patterns

| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `btn-outline` | `btn-ghost` | Undefined class |
| `btn-sm` | `btn-compact` or custom sizing | Undefined class |
| `rounded-lg` on button | Remove (already `rounded-full`) | Buttons are always pills |
| `btn-cyan` for generic CTA | `btn-white` | Cyan is for Pro tier only |
| Missing `font-medium` | Add `font-medium` | Required for all buttons |
| Missing `parallax-large` | Add `parallax-large` | Interactive effect |

### Card Anti-Patterns

| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `rounded-xl` | `${cards.shell}` | Use design system |
| `rounded-2xl` | `${cards.shell}` | Consistent radius (28px) |
| `p-[var(--space-6)]` | `p-6` | Component-level spacing |
| `p-4` | `p-6` | Standard card padding |
| `mouse-glow` without hook | Add `useParallaxHover` | Glow needs JS |

### Color Anti-Patterns

| ❌ Wrong | ✅ Correct | Why |
|---------|-----------|-----|
| `text-gray-300` | `text-theme-white` | Theme-aware |
| `bg-black` | `bg-theme-black` | CSS variables |
| `#FAFAFA` | `text-theme-text` | No hardcoded colors |
| `rgb(250,250,250)` | `text-theme-text` | Use tokens |

---

## Migration Guide

### Migrating Buttons

**Step 1**: Identify button purpose
- Primary action? → `btn-white`
- Pro tier? → `btn-cyan`
- Enterprise tier? → `btn-red`
- Secondary action? → `btn-ghost`

**Step 2**: Add required classes
```tsx
// Start with base
<button className="btn">

// Add variant
<button className="btn btn-white">

// Add typography
<button className="btn btn-white font-raleway text-base font-medium">

// Add interactive effect
<button className="btn btn-white font-raleway text-base font-medium parallax-large">

// Add icon if needed
<button className="btn btn-white font-raleway text-base font-medium parallax-large">
  <Icon className="w-4 h-4" />
  Label
</button>
```

**Step 3**: Remove wrong classes
- Remove `rounded-lg`, `rounded-2xl`, `rounded-xl`
- Remove `btn-outline`, `btn-sm`
- Remove `font-bold`, `font-semibold`

### Migrating Cards

**Step 1**: Import design system
```tsx
import { cards } from "../styles/designSystem";
```

**Step 2**: Replace custom classes
```tsx
// Before
<div className="rounded-2xl border border-theme-dark hover:border-theme-mid transition-all">

// After
<div className={cards.shell}>
```

**Step 3**: Fix spacing
```tsx
// Before
<div className={cards.shell + " p-[var(--space-6)]"}>

// After
<div className={cards.shell + " p-6"}>
```

**Step 4**: Add interactivity (if needed)
```tsx
import useParallaxHover from "../hooks/useParallaxHover";

const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

<div
  className={`${cards.shell} p-6 parallax-small mouse-glow`}
  onPointerMove={onPointerMove}
  onPointerEnter={onPointerEnter}
  onPointerLeave={onPointerLeave}
>
```

### Migrating Typography

**Find and replace patterns**:

```bash
# Find all font-bold instances
font-bold → font-medium

# Find all font-semibold instances  
font-semibold → font-medium

# Add explicit font-normal to body text
<p className="text-base"> → <p className="text-base font-raleway font-normal">

# Add explicit font-medium to buttons
<button className="btn"> → <button className="btn ... font-medium">
```

---

## Component Implementation Checklist

Use this checklist when creating or updating components:

### New Component Checklist

- [ ] **Imports**
  - [ ] Import design system utilities if needed
  - [ ] Import parallax hook if card is interactive
  
- [ ] **Typography**
  - [ ] All text has `font-raleway`
  - [ ] Body text uses `font-normal`
  - [ ] Headings/labels use `font-medium` (not bold)
  - [ ] Sizes use design system text classes or custom clamp
  
- [ ] **Buttons**
  - [ ] Primary actions use `btn-white`
  - [ ] All buttons have: `btn [variant] font-raleway text-base font-medium parallax-large`
  - [ ] Icons inside buttons are `w-4 h-4`
  - [ ] Border radius is `rounded-full` (built-in, don't override)
  
- [ ] **Cards**
  - [ ] Use `${cards.shell}` for container
  - [ ] Padding is `p-6` (not design tokens)
  - [ ] Interactive cards have `parallax-small`
  - [ ] Glow effect includes `mouse-glow` with hook
  
- [ ] **Colors**
  - [ ] All colors use theme tokens (`text-theme-*`, `bg-theme-*`)
  - [ ] No hardcoded hex values
  - [ ] Theme-aware (works in day/night mode)
  
- [ ] **Spacing**
  - [ ] Layout spacing uses design system tokens
  - [ ] Component spacing uses Tailwind
  - [ ] Verify responsive behavior
  
- [ ] **Interactive Effects**
  - [ ] Large elements have `parallax-small`
  - [ ] Buttons have `parallax-large`
  - [ ] Mouse glow has proper hook setup
  
- [ ] **Accessibility**
  - [ ] Buttons have `aria-label` if no text
  - [ ] Focus states are visible
  - [ ] Keyboard navigation works

### Code Review Checklist

When reviewing PRs, verify:

- [ ] ✅ No `font-bold` or `font-semibold` anywhere
- [ ] ✅ No undefined classes (`btn-outline`, `btn-sm`)
- [ ] ✅ All buttons have `font-medium`
- [ ] ✅ All buttons are `rounded-full`
- [ ] ✅ Cards use `${cards.shell}`
- [ ] ✅ No `p-[var(--space-*)]` in cards (use `p-6`)
- [ ] ✅ All colors use theme tokens
- [ ] ✅ Proper parallax classes applied
- [ ] ✅ Icon sizes match context

---

## Common Patterns Library

### Pattern: Pricing Card

```tsx
import { cards } from "../styles/designSystem";
import useParallaxHover from "../hooks/useParallaxHover";

const PricingCard = ({ tier, onSelect }) => {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();
  
  return (
    <div
      className={`${cards.shell} p-6 cursor-pointer parallax-small mouse-glow`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onSelect}
    >
      {/* Badge */}
      {tier.popular && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center gap-1.5 bg-brand-cyan text-theme-black px-4 py-1.5 rounded-full text-sm font-raleway font-medium">
            <Star className="w-4 h-4 fill-current" />
            Most Popular
          </div>
        </div>
      )}
      
      {/* Header */}
      <h3 className="text-3xl font-raleway font-normal mb-1 text-cyan-lighter">
        {tier.name}
      </h3>
      <p className="text-sm font-raleway font-normal text-theme-text">
        {tier.description}
      </p>
      
      {/* Price */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-raleway font-normal text-cyan-lighter">
          {tier.price}
        </span>
        <span className="font-raleway font-normal text-theme-text">
          /month
        </span>
      </div>
      
      {/* Features */}
      <div className="space-y-2 mb-6">
        {tier.features.map((feature, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-brand-cyan/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-cyan-lighter" />
            </div>
            <span className="text-sm font-raleway font-normal text-theme-white">
              {feature}
            </span>
          </div>
        ))}
      </div>
      
      {/* CTA */}
      <div className="mt-auto parallax-isolate">
        <button className="w-full btn btn-cyan font-raleway text-base font-medium parallax-large">
          Subscribe
        </button>
      </div>
    </div>
  );
};
```

### Pattern: Modal

```tsx
import { glass } from "../styles/designSystem";

const MyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center">
      <div className={`${glass.surface} rounded-2xl w-full max-w-md p-6`}>
        <h3 className="text-xl font-raleway font-medium text-theme-text mb-4">
          Modal Title
        </h3>
        <p className="text-base font-raleway font-normal text-theme-white mb-6">
          Modal content goes here.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="btn btn-ghost font-raleway text-base font-medium parallax-large"
          >
            Cancel
          </button>
          <button className="btn btn-white font-raleway text-base font-medium parallax-large">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Pattern: Feature List

```tsx
const features = [
  { icon: Sparkles, text: "Feature one" },
  { icon: Zap, text: "Feature two" },
];

<div className="space-y-3">
  {features.map((feature, i) => (
    <div key={i} className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
        <feature.icon className="w-4 h-4 text-theme-text" />
      </div>
      <span className="text-base font-raleway font-normal text-theme-white">
        {feature.text}
      </span>
    </div>
  ))}
</div>
```

### Pattern: Tab Toggle

```tsx
const [activeTab, setActiveTab] = useState('credits');

<div className="flex items-center justify-center gap-2">
  <button
    onClick={() => setActiveTab('credits')}
    className={`px-6 py-2 rounded-full font-raleway text-base font-medium transition-colors duration-200 parallax-large ${
      activeTab === 'credits'
        ? 'bg-theme-text text-theme-black'
        : 'text-theme-white hover:text-theme-text'
    }`}
  >
    Buy Credits
  </button>
  <button
    onClick={() => setActiveTab('subscriptions')}
    className={`px-6 py-2 rounded-full font-raleway text-base font-medium transition-colors duration-200 parallax-large ${
      activeTab === 'subscriptions'
        ? 'bg-theme-text text-theme-black'
        : 'text-theme-white hover:text-theme-text'
    }`}
  >
    Subscriptions
  </button>
</div>
```

### Pattern: Icon Button

```tsx
import { iconButtons } from "../styles/designSystem";

// Using design system utility
<button className={iconButtons.sm} aria-label="Close">
  <X className="w-4 h-4" />
</button>

// Or explicit with hover effect
<button className="relative overflow-hidden group inline-flex items-center justify-center size-8 rounded-full bg-transparent text-theme-white hover:text-theme-text transition-colors duration-200">
  <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  <Search className="w-4 h-4 relative z-10" />
</button>
```

---

## Testing Patterns

### Visual Testing

Test components across:
- **Themes**: Night mode (default) and Day mode
- **Breakpoints**: Mobile (360px), Tablet (768px), Desktop (1440px)
- **States**: Default, hover, active, focus, disabled

### Automated Checks

Create simple tests to catch violations:

```tsx
// Example: Test for forbidden font weights
const component = render(<MyComponent />);
const element = screen.getByRole('button');

// Should NOT have font-bold or font-semibold
expect(element.className).not.toMatch(/font-bold/);
expect(element.className).not.toMatch(/font-semibold/);

// Should have font-medium for buttons
expect(element.className).toMatch(/font-medium/);
```

---

## Performance Considerations

### When to Use Mouse Glow

`mouse-glow` requires JavaScript tracking. Use sparingly:

**✅ Good candidates**:
- Pricing cards (high-value interaction)
- Feature cards on landing page
- Large interactive cards

**❌ Avoid**:
- Small buttons
- List items
- Text links
- Every card on a page with 50+ items

### Parallax Effects

Parallax effects use CSS transforms. Generally safe but:
- Use `parallax-small` for cards
- Use `parallax-large` for buttons
- Don't nest parallax elements deeply
- Respect `prefers-reduced-motion`

---

## Reference Implementations

These components demonstrate correct patterns:

1. **Pricing.tsx** - Cards, buttons, typography, spacing
2. **Navbar.tsx** - Navigation, dropdowns, icon buttons
3. **Card.tsx** - Interactive cards with parallax
4. **CreditPackages.tsx** - Grid of cards with CTAs
5. **AuthModal.tsx** - Modals, forms, tab toggles

Study these for examples of correct implementation.

---

## Border Radius Detailed Guide

### Decision Tree

```
Is it a button?
├─ Yes → rounded-full (built into .btn)
└─ No → Is it a card?
    ├─ Yes → Use ${cards.shell} (rounded-[28px])
    └─ No → Is it a modal/dropdown?
        ├─ Yes → rounded-2xl
        └─ No → Is it an input?
            ├─ Yes → rounded-xl
            └─ No → Is it a small container?
                ├─ Yes → rounded-lg
                └─ No → rounded-full (avatars, badges)
```

### Visual Reference

```
rounded-full (9999px)  → ●  Buttons, avatars, badges
rounded-[28px] (28px)  → ▢  Cards (via cards.shell)
rounded-2xl (24px)     → □  Modals, dropdowns
rounded-xl (16px)      → ⬜  Input fields
rounded-lg (12px)      → ▫  Small containers
```

---

## Troubleshooting

### "My button looks wrong"

Check:
1. Does it have `btn-white` or another variant?
2. Does it have `font-raleway text-base font-medium`?
3. Does it have `parallax-large`?
4. Are you trying to override `rounded-full`? Don't.

### "My card border radius doesn't match"

Check:
1. Are you using `${cards.shell}`?
2. Did you add a custom `rounded-*` class? Remove it.
3. Is it actually a card or a modal? (Modals use `rounded-2xl`)

### "Text looks too bold"

Check:
1. Replace `font-bold` with `font-medium`
2. Replace `font-semibold` with `font-medium`
3. Body text should use `font-normal`

### "My spacing is wrong"

Check:
1. Layout-level? Use `${layout.container}` or design tokens
2. Component-level? Use Tailwind (`p-6`, `gap-4`)
3. Are you using `p-[var(--space-6)]`? Change to `p-6`

---

## Common Questions

**Q: When should I use colorful buttons?**  
A: Only for semantic purposes:
- `btn-cyan`: Pro tier subscriptions
- `btn-red`: Enterprise tier subscriptions  
- `btn-orange`: Brand accents, special promotions
- All other CTAs: `btn-white`

**Q: Can I use font-bold for emphasis?**  
A: No. Use `font-medium` instead. The design system uses only two weights.

**Q: What border radius for dropdowns?**  
A: `rounded-2xl` - same as modals.

**Q: Should I use design tokens or Tailwind for padding?**  
A: Hybrid approach - design tokens for layout, Tailwind for components. Cards use `p-6`.

**Q: How do I add mouse glow to a card?**  
A: Add `mouse-glow` class and use `useParallaxHover` hook:
```tsx
const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();
<div className="mouse-glow" onPointerMove={onPointerMove} ...>
```

---

## Related Documentation

- **[DESIGN_GUIDELINES.md](../DESIGN_GUIDELINES.md)** - Comprehensive design patterns
- **[FRONTEND_GUIDE.md](../FRONTEND_GUIDE.md)** - Frontend development guide
- **[agents.md](../agents.md)** - Architecture overview
- **[src/styles/designSystem.ts](../src/styles/designSystem.ts)** - Design system code

---

*Keep this document updated when design patterns change.*

