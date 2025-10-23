# Ensure No Border Hover Effect on Active Items

## Current State

Active items have:
```tsx
"border border-theme-dark text-theme-text"
```

There's no hover border modifier, so technically the border doesn't change. However, to make this explicit and prevent any potential hover effects, we should add `hover:border-theme-dark` to ensure the border color stays the same on hover.

## Changes Required

### Current Active State:
```tsx
? "border border-theme-dark text-theme-text"
```

### New Active State:
```tsx
? "border border-theme-dark hover:border-theme-dark text-theme-text"
```

## Files to Update

1. `src/App.tsx` - Homepage sidebar (line 227)
2. `src/components/KnowledgeBase.tsx` - Learn/Tools (line 187)
3. `src/components/Understand.tsx` - Learn/Use-cases (line 221)
4. `src/components/Prompts.tsx` - Learn/Prompts (line 92)
5. `src/components/Courses.tsx` - Learn/Courses (line 92)

## Result

- ✅ Explicitly prevents border color change on hover for active items
- ✅ Border stays theme-dark even when hovering
- ✅ More explicit and maintainable code

