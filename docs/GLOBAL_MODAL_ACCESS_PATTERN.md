# Global Modal Access Pattern

This document describes the pattern for making modals accessible from anywhere on the website, with automatic navigation and modal opening.

## Overview

This pattern allows any component in your application to trigger a modal that lives on a specific route (e.g., `/create/image`). The system automatically handles:
1. Navigation to the target route if not already there
2. Passing a query parameter to trigger auto-opening
3. Preserving the query parameter through authentication checks
4. Auto-opening the modal once the target component is ready

## Architecture Components

### 1. Global Modal Context (`StyleModalContext.ts` and `StyleModalProvider.tsx`)

Provides a global way to trigger modal opening from anywhere in the app.

**Key Features:**
- `openStyleModal()` - Opens modal immediately if on target page, otherwise navigates with query param
- `closeStyleModal()` - Closes the modal
- Auto-closes modal on navigation away from target page

**Implementation:**
```typescript
// Context definition
export type StyleModalContextValue = {
  openStyleModal: () => void;
  closeStyleModal: () => void;
};

// Provider implementation
export function StyleModalProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnTargetPage = location.pathname === "/target/page";

  const openStyleModal = useCallback(() => {
    if (isOnTargetPage) {
      // Already on target page - dispatch custom event
      window.dispatchEvent(new CustomEvent(MODAL_OPEN_EVENT));
    } else {
      // Navigate to target page with query param
      navigate({
        pathname: "/target/page",
        search: "?openModal=true"
      }, { replace: false });
    }
  }, [isOnTargetPage, navigate]);

  return <StyleModalContext.Provider value={{ openStyleModal, closeStyleModal }}>{children}</StyleModalContext.Provider>;
}
```

### 2. Query Parameter Handling in Target Component

The component that renders the modal (e.g., `PromptForm`) detects the query parameter and opens the modal.

**Key Features:**
- Uses `useSearchParams` to read query parameter
- Uses `useRef` to track if already processed (prevents double-opening)
- Retries with `requestAnimationFrame` if modal handler isn't ready immediately
- Cleans up query param after modal opens

**Implementation:**
```typescript
const hasProcessedQueryParamRef = useRef(false);

useEffect(() => {
  const openModal = searchParams.get('openModal');
  
  // Reset ref if query param is removed
  if (openModal !== 'true') {
    hasProcessedQueryParamRef.current = false;
    return;
  }

  // Only process if we haven't already and the modal isn't open
  if (!hasProcessedQueryParamRef.current && !modalHandlers.isModalOpen) {
    hasProcessedQueryParamRef.current = true;
    
    // Try to open immediately if handler is available
    const tryOpenNow = () => {
      if (modalHandlers.openModal && typeof modalHandlers.openModal === 'function') {
        modalHandlers.openModal();
        // Clean up query param after modal opens
        setTimeout(() => {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('openModal');
          setSearchParams(newSearchParams, { replace: true });
        }, 500);
        return true;
      }
      return false;
    };
    
    // Try immediately first
    if (!tryOpenNow()) {
      // If not ready, retry with requestAnimationFrame
      let attempts = 0;
      const maxAttempts = 30;
      
      const retry = () => {
        attempts++;
        
        if (tryOpenNow()) {
          return; // Success
        }
        
        if (attempts < maxAttempts) {
          requestAnimationFrame(retry);
        }
      };
      
      requestAnimationFrame(retry);
    }
  }
}, [searchParams.toString()]);
```

### 3. Preserving Query Parameters in Auth Guards

If your target route is protected by authentication, you need to preserve the query parameter through the auth check.

**Implementation in `RequireAuth`:**
```typescript
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!user) {
    // Handle unauthenticated user
    setPendingAuthRedirect(location.pathname);
    return <Navigate to="/signup" replace />;
  }

  // If user is authenticated but URL has query parameters, clean them up
  // BUT preserve the modal query param
  if (location.search) {
    const searchParams = new URLSearchParams(location.search);
    const hasOpenModal = searchParams.has('openModal');
    
    // Check if there are any query params other than openModal
    const hasOtherParams = Array.from(searchParams.keys()).some(key => key !== 'openModal');
    
    if (hasOpenModal && !hasOtherParams) {
      // Only openModal is present - no need to redirect
    } else if (hasOpenModal && hasOtherParams) {
      // Has openModal but also other params - preserve openModal and remove others
      const preservedParams = new URLSearchParams();
      preservedParams.set('openModal', searchParams.get('openModal') || 'true');
      return <Navigate to={{ pathname: location.pathname, search: `?${preservedParams.toString()}` }} replace />;
    } else {
      // No openModal param, clean up all query params
      return <Navigate to={location.pathname} replace />;
    }
  }
  
  return children;
}
```

### 4. Event Listener for Direct Opens

When already on the target page, use custom events for direct modal opening.

**In Provider:**
```typescript
const MODAL_OPEN_EVENT = "modal:open";
const MODAL_CLOSE_EVENT = "modal:close";

// When on target page, dispatch event
window.dispatchEvent(new CustomEvent(MODAL_OPEN_EVENT));
```

**In Target Component:**
```typescript
useEffect(() => {
  const handleOpenEvent = () => {
    if (!modalHandlers.isModalOpen) {
      modalHandlers.openModal();
    }
  };

  const handleCloseEvent = () => {
    if (modalHandlers.isModalOpen) {
      modalHandlers.closeModal();
    }
  };

  window.addEventListener(MODAL_OPEN_EVENT, handleOpenEvent);
  window.addEventListener(MODAL_CLOSE_EVENT, handleCloseEvent);

  return () => {
    window.removeEventListener(MODAL_OPEN_EVENT, handleOpenEvent);
    window.removeEventListener(MODAL_CLOSE_EVENT, handleCloseEvent);
  };
}, [modalHandlers]);
```

## Step-by-Step Implementation

### Step 1: Create Global Modal Context

1. Create `src/contexts/ModalContext.ts`:
   ```typescript
   import { createContext } from "react";
   
   export type ModalContextValue = {
     openModal: () => void;
     closeModal: () => void;
   };
   
   export const ModalContext = createContext<ModalContextValue | null>(null);
   ```

2. Create `src/contexts/ModalProvider.tsx`:
   - Implement provider with navigation logic
   - Add event constants
   - Handle location changes

### Step 2: Create Hook

Create `src/contexts/useModal.ts`:
```typescript
import { useContext } from "react";
import { ModalContext } from "./ModalContext";

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
}
```

### Step 3: Integrate Provider

Wrap your app content with the provider:
```typescript
<ModalProvider>
  <AppContent />
</ModalProvider>
```

### Step 4: Update Auth Guard

Modify `RequireAuth` to preserve the query parameter (see implementation above).

### Step 5: Add Query Param Detection

In your target component (where the modal lives):
- Add `useSearchParams` hook
- Add effect to detect query param
- Implement retry logic with `requestAnimationFrame`
- Add event listeners for direct opens

### Step 6: Add Triggers

From any component:
```typescript
import { useModal } from './contexts/useModal';

const { openModal } = useModal();

<button onClick={openModal}>Open Modal</button>
```

## Query Parameter Naming Convention

Use descriptive query parameter names:
- Style modal: `?openStyleModal=true`
- Settings modal: `?openSettingsModal=true`
- Product modal: `?openProductModal=true`

## Best Practices

1. **Use refs to track processed state** - Prevents double-opening on re-renders
2. **Use requestAnimationFrame for retries** - Faster and less likely to be interrupted
3. **Clean up query params** - Remove them after modal opens to keep URLs clean
4. **Handle auth redirects** - Preserve query params through authentication checks
5. **Use event constants** - Export event names for consistency
6. **Dependency arrays** - Keep them minimal (use `.toString()` for searchParams)

## Troubleshooting

### Modal doesn't open after navigation
- Check if query param is preserved through auth guards
- Verify the target component is rendering
- Check if modal handler is available (use retry logic)

### Infinite redirect loops
- Ensure auth guard only redirects when necessary
- Check if query param preservation logic is correct
- Verify no conflicting redirects

### Timer/retry issues
- Use `requestAnimationFrame` instead of `setTimeout` for retries
- Use refs to store timers, not local variables
- Minimize effect dependencies

## Example: Complete Implementation

See `src/contexts/StyleModalProvider.tsx` and `src/components/create/PromptForm.tsx` for a complete working example of this pattern.
