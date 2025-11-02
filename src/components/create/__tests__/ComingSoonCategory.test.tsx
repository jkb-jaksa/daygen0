/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import React from 'react';

import ComingSoonCategory from '../ComingSoonCategory';

describe('ComingSoonCategory', () => {
  it('renders coming soon text for text category', () => {
    render(<ComingSoonCategory category="text" />);

    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });

  it('renders coming soon text for audio category', () => {
    render(<ComingSoonCategory category="audio" />);

    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });
});

