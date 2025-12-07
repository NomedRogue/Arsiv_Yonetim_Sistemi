import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Settings } from '../Settings';
import { ArchiveProvider } from '@/context/ArchiveProvider';
import * as api from '@/api';

jest.mock('@/api');
const mockedApi = api as jest.Mocked<typeof api>;

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ArchiveProvider>{children}</ArchiveProvider>;
};

// Mock useAuth
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
    isAuthenticated: true,
  }),
}));

// Mock useAccordionState
jest.mock('../hooks', () => ({
  ...(jest.requireActual('../hooks') as object),
  useAccordionState: () => ({
    openSections: { system: true },
    toggleSection: jest.fn(),
  }),
}));

// Mock UserManagement component
jest.mock('../components/UserManagement', () => ({
  UserManagement: () => <div>User Management Component</div>
}));


describe('Ayarlar Sayfası', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getAllData.mockResolvedValue({
      settings: { kompaktRafGenisligi: 100, pdfBoyutLimiti: 10, backupFrequency: 'Günlük' },
      departments: [
        { id: 1, name: 'Test Department', category: 'İdari' },
        { id: 2, name: 'Yeni Tıbbi Birim', category: 'Tıbbi' }
      ],
      storageStructure: { kompakt: [], stand: [] },
      logs: [],
      checkouts: [],
      disposals: []
    });
    mockedApi.deleteBackup.mockResolvedValue({});
  });

  it('ayarlar yükleniyor smoke test', async () => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    await act(async () => {
      render(<Settings />, { wrapper: AllTheProviders });
    });
    await waitFor(() => {
      expect(screen.getByText(/Sistem Ayarları/)).toBeInTheDocument();
    });
  });
});
