import { describe, it, expect } from '@jest/globals';
import { archiveReducer, initialState } from './archiveReducer';
import { ArchiveAction, Folder, FolderStatus, Log } from '@/types';

describe('archiveReducer', () => {
  it('bilinmeyen bir eylem için başlangıç durumunu döndürmeli', () => {
    expect(archiveReducer(initialState, {} as any)).toEqual(initialState);
  });

  it('SET_LOADING eylemini işlemeli', () => {
    const action: ArchiveAction = { type: 'SET_LOADING', payload: true };
    const state = archiveReducer(initialState, action);
    expect(state.loading).toBe(true);
  });

  it('SET_ERROR eylemini işlemeli', () => {
    const action: ArchiveAction = { type: 'SET_ERROR', payload: 'Bir hata oluştu' };
    const state = archiveReducer(initialState, action);
    expect(state.error).toBe('Bir hata oluştu');
  });

  it('SET_ALL_DATA eylemini işlemeli, logları sıralamalı ve başlangıç yedek/geri yükleme loglarını ayarlamalı', () => {
    const mockFolder: Folder = { id: 1, subject: 'Test', createdAt: new Date(), status: FolderStatus.Arsivde } as Folder;
    const mockLogs: Log[] = [
      { id: 1, timestamp: new Date('2023-01-01'), details: 'Eski log', type: 'test' },
      { id: 2, timestamp: new Date('2023-01-04'), details: 'Yedek alındı', type: 'backup' },
      { id: 3, timestamp: new Date('2023-01-03'), details: 'Geri yükleme yapıldı', type: 'restore' },
      { id: 4, timestamp: new Date('2023-01-05'), details: 'En yeni log', type: 'test' },
    ];
    const payload = { folders: [mockFolder], logs: mockLogs };
    const action: ArchiveAction = { type: 'SET_ALL_DATA', payload };
    
    const state = archiveReducer(initialState, action);
    
    expect(state.folders).toEqual([mockFolder]);
    expect(state.logs[0].details).toBe('En yeni log'); // Doğru sıralanmış
    expect(state.logs[1].details).toBe('Yedek alındı');
    
    expect(state.initialBackupLog).not.toBeNull();
    expect(state.initialBackupLog?.details).toBe('Yedek alındı');
    
    expect(state.initialRestoreLog).not.toBeNull();
    expect(state.initialRestoreLog?.details).toBe('Geri yükleme yapıldı');
  });

  it('SET_FOLDERS eylemini işlemeli', () => {
    const mockFolders: Folder[] = [{ id: 1, subject: 'Test', createdAt: new Date(), status: FolderStatus.Arsivde } as Folder];
    const action: ArchiveAction = { type: 'SET_FOLDERS', payload: mockFolders };
    const state = archiveReducer(initialState, action);
    expect(state.folders).toEqual(mockFolders);
  });

  it('SET_LOGS aracılığıyla ayarlandığında logları zaman damgasına göre sıralamalı', () => {
    const logs = [
      { id: 1, timestamp: new Date('2023-01-01'), details: 'Eski log' },
      { id: 2, timestamp: new Date('2023-01-03'), details: 'Yeni log' },
      { id: 3, timestamp: new Date('2023-01-02'), details: 'Orta log' },
    ] as Log[];
    const action: ArchiveAction = { type: 'SET_LOGS', payload: logs };
    const state = archiveReducer(initialState, action);
    expect(state.logs[0].details).toBe('Yeni log');
    expect(state.logs[1].details).toBe('Orta log');
    expect(state.logs[2].details).toBe('Eski log');
  });

  it('SET_SSE_CONNECTED eylemini işlemeli', () => {
    const action: ArchiveAction = { type: 'SET_SSE_CONNECTED', payload: true };
    const state = archiveReducer(initialState, action);
    expect(state.sseConnected).toBe(true);
  });
});