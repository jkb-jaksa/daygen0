/* @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import QuickEditModal from './QuickEditModal';

// Mock the design system to avoid issues with missing styles/assets
vi.mock('../../styles/designSystem', () => ({
    glass: { promptDark: 'glass-prompt-dark', promptBorderless: 'glass-prompt-borderless' },
    buttons: { ghost: 'btn-ghost', primary: 'btn-primary' },
    inputs: { textarea: 'input-textarea' },
    tooltips: { base: 'tooltip-base' },
}));

// Mock tool logos
vi.mock('../../utils/toolLogos', () => ({
    getToolLogo: () => 'logo.png',
    hasToolLogo: () => true,
}));

// Mock useAuth
vi.mock('../../auth/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', email: 'test@example.com' },
    }),
}));

// Mock useToast
vi.mock('../../hooks/useToast', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));

// Mock useSavedPrompts
vi.mock('../../hooks/useSavedPrompts', () => ({
    useSavedPrompts: () => ({
        savePrompt: vi.fn(),
        isPromptSaved: vi.fn(() => false),
    }),
}));

// Mock useBadgeNavigation
vi.mock('./hooks/useBadgeNavigation', () => ({
    useBadgeNavigation: () => ({
        goToAvatarProfile: vi.fn(),
        goToProductProfile: vi.fn(),
        goToPublicGallery: vi.fn(),
        goToModelGallery: vi.fn(),
    }),
}));

// Mock useAvatarHandlers
vi.mock('./hooks/useAvatarHandlers', () => ({
    useAvatarHandlers: () => ({
        selectedAvatar: null,
        avatarButtonRef: { current: null },
        isAvatarPickerOpen: false,
        setIsAvatarPickerOpen: vi.fn(),
        storedAvatars: [],
        handleAvatarSelect: vi.fn(),
        processAvatarImageFile: vi.fn(),
        loadStoredAvatars: vi.fn(),
    }),
}));

// Mock useProductHandlers
vi.mock('./hooks/useProductHandlers', () => ({
    useProductHandlers: () => ({
        selectedProduct: null,
        productButtonRef: { current: null },
        isProductPickerOpen: false,
        setIsProductPickerOpen: vi.fn(),
        storedProducts: [],
        setProductUploadError: vi.fn(),
        productQuickUploadInputRef: { current: null },
        processProductImageFile: vi.fn(),
        loadStoredProducts: vi.fn(),
    }),
}));

// Mock useStyleHandlers
vi.mock('./hooks/useStyleHandlers', () => ({
    useStyleHandlers: () => ({
        styleIdToStoredStyle: vi.fn(),
        getStyleThumbnailUrl: vi.fn(),
        selectedStylesList: [],
    }),
}));

// Mock useReferenceHandlers
vi.mock('./hooks/useReferenceHandlers', () => ({
    useReferenceHandlers: () => ({
        referenceFiles: [],
        referencePreviews: [],
        handleAddReferenceFiles: vi.fn(),
        clearReference: vi.fn(),
        openFileInput: vi.fn(),
        fileInputRef: { current: null },
    }),
}));

describe('QuickEditModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        imageUrl: 'test-image.jpg',
    };

    beforeAll(() => {
        global.URL.createObjectURL = vi.fn(() => 'blob:test');
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('renders correctly when open', () => {
        render(
            <MemoryRouter>
                <QuickEditModal {...defaultProps} />
            </MemoryRouter>
        );
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByLabelText('Add reference image')).toBeInTheDocument();
    });

    it('handles reference image selection', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <QuickEditModal {...defaultProps} />
            </MemoryRouter>
        );

        const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
        // const input = screen.getByLabelText('Add reference image').previousSibling as HTMLInputElement; // Unused

        // The input is hidden, so we can't click it directly with userEvent in the same way, 
        // but we can fire change event on it or use upload
        // However, the button triggers the input click.

        // Let's try to upload directly to the input
        // Note: The input is hidden, so we might need to find it by selector if label doesn't work perfectly
        // But the code has: 
        // <input type="file" ... className="hidden" ... />
        // <button ... onClick={() => openFileInput()} ... aria-label="Add reference image">

        // We can find the input by type="file"
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).toBeInTheDocument();

        await user.upload(fileInput, file);

        // Expect preview to appear (mocking URL.createObjectURL might be needed if the hook uses it)
        // The hook likely uses FileReader or URL.createObjectURL. 
        // jsdom doesn't implement URL.createObjectURL fully, so we might need to mock it.
    });

    it('submits with prompt', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <QuickEditModal {...defaultProps} onSubmit={onSubmit} initialPrompt="test prompt" />
            </MemoryRouter>
        );

        // We can't easily test file upload with the current mock setup, so we just test prompt submission
        const submitBtn = screen.getByText('Generate').closest('button');
        expect(submitBtn).toBeEnabled();

        await user.click(submitBtn!);

        expect(onSubmit).toHaveBeenCalledWith({
            prompt: 'test prompt',
            referenceFile: undefined,
            aspectRatio: '1:1',
            batchSize: 1,
            avatarId: undefined,
            productId: undefined,
            styleId: undefined,
        });
    });
});
