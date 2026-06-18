import { fireEvent, render, screen } from '@testing-library/react';

import { ThemeToggle } from '@/app/ui/components/ThemeToggle';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockReturnValue({ matches, media: '', addEventListener: jest.fn() }),
  });
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockMatchMedia(false);
  });

  it('renders the three options with System selected by default', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  });

  it('hydrates from the stored preference', () => {
    globalThis.localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('applies and persists an explicit light choice', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
  });

  it('applies an explicit dark choice', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('follows the system setting when System is chosen', () => {
    mockMatchMedia(true);
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('defaults to light under System when matchMedia is unavailable', () => {
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('still applies the theme when persistence throws', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    setItem.mockRestore();
  });
});
