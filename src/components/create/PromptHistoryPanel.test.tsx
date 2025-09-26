import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PromptHistoryPanel } from './PromptHistoryPanel';
import type { PromptEntry } from '../../lib/promptHistory';

describe('PromptHistoryPanel', () => {
  const history: PromptEntry[] = [{ text: 'Generate a sunrise over mountains', ts: 123 }];

  it('lazy-loads history chips and wires prompt interactions', async () => {
    const onSelect = vi.fn();
    const onRun = vi.fn();
    const onClear = vi.fn();
    const user = userEvent.setup();

    render(
      <PromptHistoryPanel history={history} onSelect={onSelect} onRun={onRun} onClear={onClear} />,
    );

    const promptButton = await screen.findByRole('button', { name: 'Generate a sunrise over mountains' });
    await user.click(promptButton);
    expect(onSelect).toHaveBeenCalledWith('Generate a sunrise over mountains');

    const rerunButton = await screen.findByRole('button', { name: /rerun/i });
    await user.click(rerunButton);
    expect(onRun).toHaveBeenCalledWith('Generate a sunrise over mountains');

    const clearButton = await screen.findByRole('button', { name: 'Clear' });
    await user.click(clearButton);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
