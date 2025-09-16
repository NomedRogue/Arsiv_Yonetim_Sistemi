import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import App from './App';

// Mock child components to isolate App component logic
jest.mock('@/pages/Dashboard', () => ({
  __esModule: true,
  default: () => <div>Dashboard Page</div>,
  Dashboard: () => <div>Dashboard Page</div>
}));
jest.mock('@/pages/FolderList', () => ({
  __esModule: true,
  default: () => <div>FolderList Page</div>,
  FolderList: () => <div>FolderList Page</div>
}));
jest.mock('@/pages/Settings', () => ({
  __esModule: true,
  default: () => <div>Settings Page</div>,
  Settings: () => <div>Settings Page</div>
}));
jest.mock('@/pages/Search', () => ({
  __esModule: true,
  default: () => <div>Search Page</div>,
  Search: () => <div>Search Page</div>
}));
jest.mock('@/pages/CheckoutReturn', () => ({
  __esModule: true,
  default: () => <div>CheckoutReturn Page</div>,
  CheckoutReturn: () => <div>CheckoutReturn Page</div>
}));
jest.mock('@/pages/Disposal', () => ({
  __esModule: true,
  default: () => <div>Disposal Page</div>,
  Disposal: () => <div>Disposal Page</div>
}));
jest.mock('@/pages/FolderForm', () => ({
  __esModule: true,
  default: () => <div>FolderForm Page</div>,
  FolderForm: () => <div>FolderForm Page</div>
}));

// Mock the provider to prevent it from running its real logic (hooks, state, etc.)
// which simplifies testing the App component's routing/layout.
jest.mock('@/context/ArchiveProvider', () => ({
  ArchiveProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Uygulama Navigasyonu', () => {
  beforeEach(() => {
    // No setup needed here anymore since the provider is mocked.
  });
  
  it('varsayılan olarak Dashboard sayfasını render etmeli', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Dashboard Page')).toBeTruthy();
  });

  it('kenar çubuğu linkine tıklandığında "Tüm Klasörler" sayfasına gitmeli', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Find the button by its text content
    const folderListLink = screen.getByRole('button', { name: /Tüm Klasörler/i });
    
    await act(async () => {
      fireEvent.click(folderListLink);
    });

    // Verify that the FolderList component is rendered
    expect(screen.getByText('FolderList Page')).toBeTruthy();
    expect(screen.queryByText('Dashboard Page')).toBeNull();
  });

  it('kenar çubuğu linkine tıklandığında "Ayarlar" sayfasına gitmeli', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const settingsLink = screen.getByRole('button', { name: /Ayarlar/i });
    
    await act(async () => {
      fireEvent.click(settingsLink);
    });

    expect(screen.getByText('Settings Page')).toBeTruthy();
  });
});
