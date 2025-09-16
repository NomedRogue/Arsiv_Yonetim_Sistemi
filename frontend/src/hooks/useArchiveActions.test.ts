import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useArchiveActions } from './useArchiveActions';
import * as api from '@/api';
import { ArchiveState, Folder, FolderStatus, Checkout, CheckoutStatus, Department, Category, Log } from '@/types';
import { initialState } from '@/context/archiveReducer';

// Mock the entire api module
jest.mock('@/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock toast to prevent errors and allow assertions
jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));


describe("useArchiveActions Hook'u", () => {
  let mockState: ArchiveState;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    // Reset mocks and state before each test
    jest.clearAllMocks();
    mockState = {
      ...initialState,
      folders: [
        { id: 1, subject: 'Folder One', status: FolderStatus.Arsivde, departmentId: 101, fileCode: 'F1' } as Folder,
        { id: 2, subject: 'Folder Two', status: FolderStatus.Cikista, departmentId: 102, fileCode: 'F2' } as Folder,
      ],
      checkouts: [
        { id: 10, folderId: 2, status: CheckoutStatus.Cikista, personName: 'Jane Doe' } as Checkout
      ],
      departments: [
        {id: 101, name: 'Dept 1', category: Category.Idari},
        {id: 123, name: 'Dept ToDelete', category: Category.Idari}
      ]
    };
    mockDispatch = jest.fn();
  });

  it('bir klasör eklemeli ve iyimser güncellemeyi dispatch etmeli', async () => {
    const newFolderData = { subject: 'New Folder' } as Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
    const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));

    await act(async () => {
      await result.current.addFolder(newFolderData);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_FOLDERS',
      payload: expect.arrayContaining([
        expect.objectContaining({ subject: 'New Folder' })
      ]),
    });

    expect(mockedApi.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'New Folder' })
    );
    
    expect(mockedApi.addLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'create' })
    );
  });

  it('API hatası durumunda klasör eklemeyi geri almalı', async () => {
    const newFolderData = { subject: 'New Folder' } as Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
    mockedApi.createFolder.mockRejectedValue(new Error('API Error'));
    const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));

    await act(async () => {
      await result.current.addFolder(newFolderData);
    });

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_FOLDERS' }));
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_FOLDERS',
      payload: mockState.folders, // Reverted to original state
    });

    expect(mockedApi.addLogEntry).not.toHaveBeenCalled();
  });

  it('çıkış işlemini yapmalı ve klasör durumunu güncellemeli', async () => {
    const checkoutData = { folderId: 1, personName: 'Test' } as Omit<Checkout, 'id' | 'status' | 'checkoutDate'>;
    const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));

    await act(async () => {
      await result.current.addCheckout(checkoutData);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_CHECKOUTS',
      payload: expect.arrayContaining([
        expect.objectContaining({ folderId: 1, status: CheckoutStatus.Cikista })
      ]),
    });
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_FOLDERS',
      payload: expect.arrayContaining([
        expect.objectContaining({ id: 1, status: FolderStatus.Cikista })
      ]),
    });

    expect(mockedApi.createCheckout).toHaveBeenCalled();
    expect(mockedApi.updateFolder).toHaveBeenCalled();
    expect(mockedApi.addLogEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'checkout' }));
  });
  
  it('iade işlemini yapmalı ve klasör durumunu güncellemeli', async () => {
    const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));

    await act(async () => {
      await result.current.returnCheckout(10);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_CHECKOUTS',
      payload: expect.arrayContaining([
        expect.objectContaining({ id: 10, status: CheckoutStatus.IadeEdildi })
      ]),
    });
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_FOLDERS',
      payload: expect.arrayContaining([
        expect.objectContaining({ id: 2, status: FolderStatus.Arsivde })
      ]),
    });
    
    expect(mockedApi.updateCheckout).toHaveBeenCalled();
    expect(mockedApi.updateFolder).toHaveBeenCalled();
    expect(mockedApi.addLogEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'return' }));
  });
  
  it('çıkışta olan bir klasörü silmemeli', async () => {
    const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));
    
    await act(async () => {
        await result.current.deleteFolder(2);
    });
    
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockedApi.removeFolder).not.toHaveBeenCalled();
  });

  it('çıkışta olmayan bir klasörü silmeli', async () => {
    const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));
    
    await act(async () => {
        await result.current.deleteFolder(1);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_FOLDERS',
        payload: expect.not.arrayContaining([expect.objectContaining({ id: 1 })])
    });
    expect(mockedApi.removeFolder).toHaveBeenCalledWith(1);
    expect(mockedApi.addLogEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'delete' }));
  });

  it('içinde klasör olan bir birimi silmemeli', async () => {
     mockState.folders.push({ id: 3, departmentId: 123 } as Folder);
     const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));
     
     await act(async () => {
       await result.current.deleteDepartment(123);
     });
     
     expect(mockDispatch).not.toHaveBeenCalled();
     expect(mockedApi.saveConfigs).not.toHaveBeenCalled();
  });

  it('içinde klasör olmayan bir birimi silmeli', async () => {
     mockState.departments = [{ id: 123, name: 'ToDelete', category: Category.Idari }];
     const { result } = renderHook(() => useArchiveActions(mockState, mockDispatch));

     await act(async () => {
       await result.current.deleteDepartment(123);
     });
     
     expect(mockDispatch).toHaveBeenCalledWith({
         type: 'SET_DEPARTMENTS',
         payload: []
     });
     expect(mockedApi.saveConfigs).toHaveBeenCalledWith({ departments: [] });
  });
});