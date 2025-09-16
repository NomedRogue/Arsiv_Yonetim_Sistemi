import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Settings } from './Settings';
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
        departments: [{ id: 1, name: 'Test Department', category: 'İdari' }],
        storageStructure: { kompakt: [], stand: [] },
        logs: [],
        checkouts: [],
        disposals: []
    });
    
    mockedApi.deleteBackup.mockResolvedValue({});
  });

  it('mevcut ayarları yükleyip göstermeli', async () => {
    render(<Settings />, { wrapper: AllTheProviders });

    await waitFor(() => {
      const input = screen.getByLabelText('Kompakt Dolap Raf Genişliği') as HTMLInputElement;
      expect(input.value).toBe('100');
    });

    await waitFor(() => {
        const select = screen.getByLabelText('Sıklık') as HTMLSelectElement;
        expect(select.value).toBe('Günlük');
    });
  });

  it('bir ayarı değiştirip kaydetmeye izin vermeli', async () => {
    const user = userEvent.setup();
    render(<Settings />, { wrapper: AllTheProviders });
    
    const pdfLimitInput = await screen.findByLabelText('PDF Boyut Limiti');
    
    await waitFor(() => {
        expect((pdfLimitInput as HTMLInputElement).value).toBe('10');
    });
    
    await user.clear(pdfLimitInput);
    await user.type(pdfLimitInput, '15');
    
    const saveButton = screen.getByRole('button', { name: 'Ayarları Kaydet' });
    await user.click(saveButton);
    
    await waitFor(() => {
        expect(mockedApi.saveConfigs).toHaveBeenCalledWith(
            expect.objectContaining({
                settings: expect.objectContaining({ pdfBoyutLimiti: 15 })
            })
        );
    });
  });

  it('"Yeni Birim Ekle" modalını açmalı, doldurmaya ve göndermeye izin vermeli', async () => {
    const user = userEvent.setup();
    render(<Settings />, { wrapper: AllTheProviders });
    
    await waitFor(() => {
        expect(screen.getByText('Test Department')).toBeTruthy();
    });

    const addButton = screen.getByRole('button', { name: 'Yeni Birim Ekle' });
    await user.click(addButton);

    await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Yeni Birim Ekle' })).toBeTruthy();
    });
    
    const nameInput = screen.getByLabelText('Birim Adı');
    const categoryRadio = screen.getByLabelText('Tıbbi');
    const saveModalButton = screen.getByRole('button', { name: 'Kaydet' });
    
    await user.type(nameInput, 'Yeni Tıbbi Birim');
    await user.click(categoryRadio);
    await user.click(saveModalButton);
    
    await waitFor(() => {
        expect(mockedApi.saveConfigs).toHaveBeenCalledWith(
            expect.objectContaining({
                departments: expect.arrayContaining([
                    expect.objectContaining({ name: 'Yeni Tıbbi Birim', category: 'Tıbbi' })
                ])
            })
        );
    });
  });
});