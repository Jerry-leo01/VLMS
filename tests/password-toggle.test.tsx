import { describe, it, expect, vi, beforeAll } from 'vitest';
import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../src/app/login/page';
import RegisterPage from '../src/app/register/page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('Show/Hide Password Toggle Feature', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('toggles password visibility between password and text on LoginPage', async () => {
    await act(async () => {
      render(<LoginPage />);
    });

    const passwordInput = screen.getByLabelText(/Password \*/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /Show password/i });
    expect(toggleButton).toBeInTheDocument();

    // Click to show password
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    // Click again to hide password
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    });
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /Show password/i })).toBeInTheDocument();
  });

  it('toggles password visibility on Staff Registration form on RegisterPage', async () => {
    await act(async () => {
      render(<RegisterPage />);
    });

    // In Staff registration mode by default
    const passwordInput = screen.getByLabelText(/Password \*/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /Show password/i });
    expect(toggleButton).toBeInTheDocument();

    // Click to reveal password
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    // Click to hide
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    });
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
