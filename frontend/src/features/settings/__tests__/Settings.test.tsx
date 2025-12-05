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
    await act(async () => {
      render(<Settings />, { wrapper: AllTheProviders });
    });
    await waitFor(() => {
      // Birden fazla "Ayarlar" metni olabileceği için getAllByText ile kontrol
      expect(screen.getAllByText(/Ayarlar/).length).toBeGreaterThan(0);
    });
  });
});
