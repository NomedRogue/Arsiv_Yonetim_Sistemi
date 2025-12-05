import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FolderForm } from '@/features/folders/components/FolderForm';
import { useArchive } from '@/context/ArchiveContext';
import { ArchiveContextType, Category, Folder, FolderStatus } from '@/types';
import { ALL_DEPARTMENTS, DEFAULT_SETTINGS, INITIAL_STORAGE_STRUCTURE } from '@/constants';
import * as api from '@/api';

// Mock the useArchive hook
jest.mock('@/context/ArchiveContext');
const mockUseArchive = useArchive as jest.Mock;

// Mock the api module
jest.mock('@/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock the toast module
jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockContextValue: Partial<ArchiveContextType> = {
  departments: ALL_DEPARTMENTS,
  addFolder: jest.fn(),
  updateFolder: jest.fn(),
  getOccupancy: jest.fn(() => ({ total: 100, used: 0, percentage: 0, folders: [] })),
  settings: DEFAULT_SETTINGS,
  storageStructure: INITIAL_STORAGE_STRUCTURE,
};

describe('FolderForm Bileşeni', () => {
  beforeEach(() => {
    mockUseArchive.mockReturnValue(mockContextValue);
  });

  it('klasör formu render smoke test', async () => {
    render(<FolderForm editingFolderId={null} setEditingFolderId={jest.fn()} setActivePage={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Klasör Bilgileri/)).toBeTruthy();
    });
  });
});
