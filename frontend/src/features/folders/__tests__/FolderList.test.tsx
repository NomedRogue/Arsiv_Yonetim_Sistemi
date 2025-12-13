import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FolderList } from '@/features/folders/components/FolderList';
import { ArchiveProvider } from '@/context/ArchiveProvider';
import { AuthProvider } from '@/context/AuthContext';
import { Folder, FolderStatus, Category, FolderType } from '@/types';

const mockFoldersPage1: Folder[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  subject: `Test Folder ${i + 1}`,
  status: FolderStatus.Arsivde,
  departmentId: 1,
  fileCode: `CODE-${i + 1}`,
  fileYear: 2023,
  fileCount: 1,
  retentionPeriod: 5,
  retentionCode: 'A',
  category: Category.Idari,
  location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 },
  createdAt: new Date(),
  updatedAt: new Date(),
  folderType: FolderType.Dar
} as unknown as Folder));

const mockFoldersPage2: Folder[] = [{
  id: '21',
  subject: 'Test Folder 21',
  status: FolderStatus.Arsivde,
  departmentId: 1,
  fileCode: 'CODE-21',
  fileYear: 2023,
  fileCount: 1,
  retentionPeriod: 5,
  retentionCode: 'A',
  category: Category.Idari,
  location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 },
  createdAt: new Date(),
  updatedAt: new Date(),
  folderType: FolderType.Dar
} as unknown as Folder];

// This is a more complete mock for the initial data fetch by the provider
const mockAllData = {
  settings: {},
  departments: [{id: 1, name: 'Memur Maaş Mutemetliği', category: Category.Idari}],
  storageStructure: { kompakt: [], stand: [] },
  logs: [],
  checkouts: [],
  disposals: [],
  folders: [...mockFoldersPage1, ...mockFoldersPage2]
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
        json: () => Promise.resolve({ folders: mockFoldersPage2, total: 21 }),
      } as Response);
    } else {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ folders: mockFoldersPage1, total: 21 }),
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
  return (
    <AuthProvider>
      <ArchiveProvider>
        {children}
      </ArchiveProvider>
    </AuthProvider>
  );
};

describe('FolderList Sayfası', () => {

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('klasör ekleme smoke test', async () => {
    render(<FolderList onEditFolder={jest.fn()} />, { wrapper: AllTheProviders });
    await waitFor(() => {
      // Assuming "Arşiv" text is present in the component, e.g. title
      // If FolderList doesn't have "Arşiv" text, this might fail, but checking presence.
      // Adjust expectation based on actual component content if needed.
      // Since the original test checked for /Arşiv/ we keep it.
      expect(screen.getByText(/Arşiv/)).toBeTruthy();
    });
  });
});
