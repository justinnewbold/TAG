/**
 * Tests for GlobalErrorBoundary component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalErrorBoundary from './GlobalErrorBoundary';

// Component that throws an error for testing
function ThrowError({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    // Clear localStorage mock
    localStorage.getItem.mockClear();
    localStorage.setItem.mockClear();
    localStorage.removeItem.mockClear();
    // Suppress console errors during error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <GlobalErrorBoundary>
        <div>Test content</div>
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Please try refreshing/)).toBeInTheDocument();
  });

  it('shows Refresh Page button', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('shows Go to Home button', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Go to Home')).toBeInTheDocument();
  });

  it('shows try to recover option', () => {
    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Try to recover without refreshing')).toBeInTheDocument();
  });

  it('preserves user data when going home', () => {
    const mockStorage = JSON.stringify({
      state: {
        user: { id: 'test-user', name: 'Test' },
        settings: { theme: 'dark' },
        currentGame: { id: 'game-123' }, // This should be cleared
      },
      version: 1,
    });
    localStorage.getItem.mockReturnValue(mockStorage);

    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    // Click Go to Home
    fireEvent.click(screen.getByText('Go to Home'));

    // Verify setItem was called with preserved user and settings
    expect(localStorage.setItem).toHaveBeenCalled();
    const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
    expect(savedData.state.user).toEqual({ id: 'test-user', name: 'Test' });
    expect(savedData.state.settings).toEqual({ theme: 'dark' });
  });

  it('clears corrupted localStorage on Go Home', () => {
    // Return invalid JSON
    localStorage.getItem.mockReturnValue('invalid json');

    render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go to Home'));

    // Should call removeItem when JSON is corrupted
    expect(localStorage.removeItem).toHaveBeenCalledWith('tag-game-storage');
  });

  it('recovers from error when clicking try to recover', () => {
    const { rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click try to recover
    fireEvent.click(screen.getByText('Try to recover without refreshing'));

    // Rerender with non-throwing component
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
