/* @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        render(<QuickEditModal {...defaultProps} />);
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByLabelText('Add reference image')).toBeInTheDocument();
    });

    it('handles reference image selection', async () => {
        const user = userEvent.setup();
        render(<QuickEditModal {...defaultProps} />);

        const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
        const input = screen.getByLabelText('Add reference image').previousSibling as HTMLInputElement;

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

    it('submits with prompt and reference', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(<QuickEditModal {...defaultProps} onSubmit={onSubmit} initialPrompt="test prompt" />);

        const file = new File(['test'], 'ref.png', { type: 'image/png' });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(fileInput, file);

        const submitBtn = screen.getByText('Generate').closest('button');
        expect(submitBtn).toBeEnabled();

        await user.click(submitBtn!);

        expect(onSubmit).toHaveBeenCalledWith('test prompt', file);
    });
});
