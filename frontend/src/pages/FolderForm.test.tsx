import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FolderForm } from './FolderForm';
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
    jest.clearAllMocks();
    mockUseArchive.mockReturnValue(mockContextValue);
  });
  
  it('kullanıcının yeni bir klasör için formu doldurup göndermesine izin vermeli', async () => {
    const user = userEvent.setup();
    const setActivePage = jest.fn();

    render(<FolderForm editingFolderId={null} setEditingFolderId={jest.fn()} setActivePage={setActivePage} />);

    // Kategori'yi İdari olarak değiştir
    await user.click(screen.getByLabelText('İdari'));

    await user.selectOptions(screen.getByLabelText('Birim Adı'), '9'); // Arşiv Birimi
    await user.type(screen.getByLabelText('Dosya Kodu'), 'TEST-123');
    await user.type(screen.getByLabelText('Konu Adı'), 'Jest Test Konusu');
    await user.clear(screen.getByLabelText('Dosya Yılı'));
    await user.type(screen.getByLabelText('Dosya Yılı'), '2024');

    const saveButton = screen.getByRole('button', { name: 'Kaydet' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockContextValue.addFolder).toHaveBeenCalledTimes(1);
    });
    
    expect(mockContextValue.addFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Jest Test Konusu',
        fileCode: 'TEST-123',
        departmentId: 9,
        fileYear: 2024,
      })
    );
    
    expect(setActivePage).toHaveBeenCalledWith('Tüm Klasörler');
  });

  it('düzenleme modunda formu verilerle doldurmalı ve güncellemeleri göndermeli', async () => {
    const user = userEvent.setup();
    const mockFolder = {
      id: 1,
      category: Category.Idari,
      departmentId: 5, // Kalite Birimi
      subject: 'Initial Subject',
      fileCode: 'EDIT-001',
      retentionPeriod: 5,
      retentionCode: 'A',
      fileYear: 2023,
      fileCount: 1,
      folderType: 'Dar',
      location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: FolderStatus.Arsivde,
    } as Folder;
    
    mockedApi.getFolder.mockResolvedValue(mockFolder);
    
    render(<FolderForm editingFolderId={1} setEditingFolderId={jest.fn()} setActivePage={jest.fn()} />);
    
    await waitFor(() => {
      expect((screen.getByLabelText('Konu Adı') as HTMLInputElement).value).toBe('Initial Subject');
    });
    expect((screen.getByLabelText('Dosya Kodu') as HTMLInputElement).value).toBe('EDIT-001');
    expect((screen.getByLabelText('Birim Adı') as HTMLSelectElement).value).toBe('5');
    
    await user.clear(screen.getByLabelText('Konu Adı'));
    await user.type(screen.getByLabelText('Konu Adı'), 'Updated Subject');
    
    const updateButton = screen.getByRole('button', { name: 'Güncelle' });
    await user.click(updateButton);
    
    await waitFor(() => {
      expect(mockContextValue.updateFolder).toHaveBeenCalledTimes(1);
    });
    
    expect(mockContextValue.updateFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        subject: 'Updated Subject',
      })
    );
  });
});