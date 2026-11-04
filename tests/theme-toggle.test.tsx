// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from '../src/components/theme/ThemeProvider';
import { ThemeToggle } from '../src/components/theme/ThemeToggle';

describe('ThemeToggle Direct Binary Toggle Component', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders a single direct toggle button and switches theme on click', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // Initial state (defaults to light theme)
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeDefined();
    expect(toggleButton.getAttribute('aria-label')).toBe('Switch to dark theme');

    // Click button to toggle to dark theme
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(toggleButton.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('vlms-theme')).toBe('dark');

    // Click button again to toggle back to light theme
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(toggleButton.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('vlms-theme')).toBe('light');
  });
});
