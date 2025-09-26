import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateSidebar } from './CreateSidebar';

describe('CreateSidebar', () => {
  it('renders create categories and handles selection', async () => {
    const onSelectCategory = vi.fn();
    const user = userEvent.setup();

    render(
      <CreateSidebar
        activeCategory="text"
        onSelectCategory={onSelectCategory}
        onOpenMyFolders={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'text' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'video' }));
    expect(onSelectCategory).toHaveBeenCalledWith('video');
  });

  it('invokes folders callback independently', async () => {
    const onSelectCategory = vi.fn();
    const onOpenMyFolders = vi.fn();
    const user = userEvent.setup();

    render(
      <CreateSidebar
        activeCategory="gallery"
        onSelectCategory={onSelectCategory}
        onOpenMyFolders={onOpenMyFolders}
      />,
    );

    expect(screen.getByRole('button', { name: 'gallery' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'folders' }));

    expect(onOpenMyFolders).toHaveBeenCalledTimes(1);
    expect(onSelectCategory).not.toHaveBeenCalled();
  });
});
