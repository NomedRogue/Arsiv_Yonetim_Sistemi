import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import { errorLogger } from '../lib/errorLogger';

// Mock errorLogger
jest.mock('../lib/errorLogger', () => ({
  errorLogger: {
    logError: jest.fn()
  }
}));

const mockedErrorLogger = errorLogger as jest.Mocked<typeof errorLogger>;

// Test component that throws error on demand
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Test component working</div>;
};

describe('EnhancedErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'development'; // Detay butonları için
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={false} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Test component working')).toBeInTheDocument();
  });

  it('should catch error and display error boundary UI', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Bir Sorun Oluştu')).toBeInTheDocument();
    const errorMessages = screen.getAllByText(/Test error message/);
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Sayfayı Yenile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ana Sayfaya Dön/i })).toBeInTheDocument();
  });

  it('should log error when error occurs', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(mockedErrorLogger.logError).toHaveBeenCalled();
    const loggedError = mockedErrorLogger.logError.mock.calls[0][0];
    expect(loggedError.message).toBe('Test error message');
  });

  it('should call custom onError handler when provided', () => {
    const onErrorMock = jest.fn();
    
    render(
      <EnhancedErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalled();
  });

  it('should reset error state when refresh button is clicked', () => {
    const { rerender } = render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Bir Sorun Oluştu')).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /Sayfayı Yenile/i });
    fireEvent.click(refreshButton);

    // Rerender with no error
    rerender(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={false} />
      </EnhancedErrorBoundary>
    );

    // DOM güncellemesini bekle
    expect(screen.findByText('Test component working')).resolves.toBeInTheDocument();
  });

  it('should use custom fallback component when provided', () => {
    const CustomFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <EnhancedErrorBoundary fallbackComponent={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument();
  });

  it('should display error details when "Detayları Göster" is clicked', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // 'Hata Detayları' summary elementini bulup tıkla
    const summary = screen.getByText('Hata Detayları');
    fireEvent.click(summary);

    // Hata mesajı ve stack trace açıldı mı kontrol et
    expect(screen.getByText('Hata Mesajı:')).toBeInTheDocument();
    expect(screen.getByText('Stack Trace:')).toBeInTheDocument();
  });

  it('should toggle error details visibility when summary is clicked', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EnhancedErrorBoundary>
    );

    // Details elementi başlangıçta açık (open attribute var)
    const details = document.querySelector('details');
    expect(details).toHaveAttribute('open');
    
    // Summary'ye tıklayarak kapat
    const summary = screen.getByText('Hata Detayları');
    fireEvent.click(summary);
    
    // Details kapandı mı kontrol et
    expect(details).not.toHaveAttribute('open');
  });
});