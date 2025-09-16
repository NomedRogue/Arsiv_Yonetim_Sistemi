import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FolderList } from './FolderList';
import { ArchiveProvider } from '@/context/ArchiveProvider';
import { Folder, FolderStatus, Category } from '@/types';

const mockFoldersPage1: Folder[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  subject: `Test Folder ${i + 1}`,
  status: FolderStatus.Arsivde,
  departmentId: 1,
  fileCode: `CODE-${i + 1}`,
  fileYear: 2023,
  fileCount: 1,
  retentionPeriod: 5,
  retentionCode: 'A',
  category: 'İdari',
  location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 },
} as Folder));

const mockFoldersPage2: Folder[] = [{
  id: 21,
  subject: 'Test Folder 21',
  status: FolderStatus.Arsivde,
  departmentId: 1,
  fileCode: 'CODE-21',
  fileYear: 2023,
  fileCount: 1,
  retentionPeriod: 5,
  retentionCode: 'A',
  category: 'İdari',
  location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 },
} as Folder];

// This is a more complete mock for the initial data fetch by the provider
const mockAllData = {
    settings: {},
    departments: [{id: 1, name: 'Memur Maaş Mutemetliği', category: Category.Idari}],
    storageStructure: { kompakt: [], stand: [] },
    logs: [],
    checkouts: [],
    disposals: []
};

(global.fetch as jest.Mock) = jest.fn((url: any) => {
  const urlString = url.toString();
  if (urlString.includes('/api/all-data')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockAllData),
    } as Response);
  }
  if (urlString.includes('/folders')) {
    // page=2 returns page 2, otherwise page 1
    if (urlString.includes('page=2')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: mockFoldersPage2, total: 21 }),
      } as Response);
    } else {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: mockFoldersPage1, total: 21 }),
      } as Response);
    }
  }
  // fallback: empty
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response);
});

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ArchiveProvider>{children}</ArchiveProvider>;
};

describe('FolderList Sayfası', () => {

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('klasörlerin bir listesini ve sayfalama kontrollerini render etmeli', async () => {
    render(<FolderList onEditFolder={jest.fn()} />, { wrapper: AllTheProviders });

    await waitFor(() => {
      expect(screen.getByText('Tüm Klasörler (21)')).toBeTruthy();
    });

    // Daha spesifik regex: /Test Folder 1$/i, "Test Folder 10" ile eşleşmez
    expect(screen.getByRole('heading', { name: /Test Folder 1$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Test Folder 20/i })).toBeTruthy();
    expect(screen.queryByText(/Test Folder 21/i)).toBeNull();
    expect(screen.getByText('Sayfa 1 / 2')).toBeTruthy();
  });

  it('"Sonraki" butonuna tıklandığında sonraki sayfayı getirmeli ve göstermeli', async () => {
    const user = userEvent.setup();
    render(<FolderList onEditFolder={jest.fn()} />, { wrapper: AllTheProviders });

    await waitFor(() => expect(screen.getByText('Tüm Klasörler (21)')).toBeTruthy());

    const nextButton = screen.getByRole('button', { name: /Sonraki/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Test Folder 21/i)).toBeTruthy();
    });

    expect(screen.queryByText(/Test Folder 1$/i)).toBeNull();
    expect(screen.getByText('Sayfa 2 / 2')).toBeTruthy();
  });

  it('çıkış butonuna tıklandığında çıkış modalını açmalı', async () => {
    const user = userEvent.setup();
    render(<FolderList onEditFolder={jest.fn()} />, { wrapper: AllTheProviders });
    await waitFor(() => expect(screen.getByRole('heading', { name: /Test Folder 1$/i })).toBeTruthy());

    const checkoutButtons = screen.getAllByTitle('Çıkış Ver');
    await user.click(checkoutButtons[0]);

    await waitFor(() => {
        expect(screen.getByText('Klasör Çıkış Formu')).toBeTruthy();
    });
  });

  it('sil butonuna tıklandığında silme modalını açmalı', async () => {
    const user = userEvent.setup();
    render(<FolderList onEditFolder={jest.fn()} />, { wrapper: AllTheProviders });
    await waitFor(() => expect(screen.getByRole('heading', { name: /Test Folder 1$/i })).toBeTruthy());
    
    const deleteButtons = screen.getAllByTitle('Sil');
    await user.click(deleteButtons[0]);
    
    await waitFor(() => {
        expect(screen.getByText('Klasörü Sil')).toBeTruthy();
        expect(screen.getByText(/kalıcı olarak silmek istiyor musunuz/i)).toBeTruthy();
    });
  });
});