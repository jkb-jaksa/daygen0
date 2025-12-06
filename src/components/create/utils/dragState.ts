/**
 * Global state for tracking the currently dragged image URL and floating preview.
 * This is needed because browser security prevents reading dataTransfer.getData()
 * during dragover events - only during drop events.
 * 
 * This allows showing a preview of the dragged image in drop targets while dragging.
 */

let currentDraggingImageUrl: string | null = null;
let floatingImageElement: HTMLDivElement | null = null;

export const setDraggingImageUrl = (url: string | null) => {
    currentDraggingImageUrl = url;
};

export const getDraggingImageUrl = (): string | null => {
    return currentDraggingImageUrl;
};

export const clearDraggingImageUrl = () => {
    currentDraggingImageUrl = null;
};

// Create and show the floating drag image that follows the cursor
export const showFloatingDragImage = (url: string) => {
    if (floatingImageElement) {
        hideFloatingDragImage();
    }

    floatingImageElement = document.createElement('div');
    floatingImageElement.id = 'floating-drag-preview';
    floatingImageElement.style.cssText = `
    position: fixed;
    width: 80px;
    height: 80px;
    border-radius: 12px;
    overflow: hidden;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.85;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transform: translate(-50%, -50%);
    transition: opacity 0.15s ease-out;
  `;

    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
  `;

    floatingImageElement.appendChild(img);
    document.body.appendChild(floatingImageElement);
};

// Update the position of the floating drag image
export const updateFloatingDragImage = (x: number, y: number) => {
    if (floatingImageElement) {
        floatingImageElement.style.left = `${x}px`;
        floatingImageElement.style.top = `${y}px`;
    }
};

// Hide the floating drag image (when over Avatar/Product buttons)
export const setFloatingDragImageVisible = (visible: boolean) => {
    if (floatingImageElement) {
        floatingImageElement.style.opacity = visible ? '0.85' : '0';
    }
};

// Remove the floating drag image completely
export const hideFloatingDragImage = () => {
    if (floatingImageElement && floatingImageElement.parentNode) {
        floatingImageElement.parentNode.removeChild(floatingImageElement);
    }
    floatingImageElement = null;
};
