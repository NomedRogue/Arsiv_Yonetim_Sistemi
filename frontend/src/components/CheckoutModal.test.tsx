import React from 'react';
import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CheckoutModal } from '@/features/checkout';
import { Folder, CheckoutType, Checkout } from '@/types';

const mockFolder: Folder = {
  id: 1,
  subject: 'Sample Folder Subject',
} as Folder;

const mockCheckoutToEdit: Checkout & { folder: Folder } = {
  id: 101,
  folderId: 1,
  checkoutType: CheckoutType.Kismi,
  documentDescription: 'Specific document',
  personName: 'Jane',
  personSurname: 'Doe',
  personPhone: '5551234567',
  reason: 'Research',
  plannedReturnDate: new Date('2025-01-01'),
  folder: mockFolder,
} as Checkout & { folder: Folder };


describe('CheckoutModal Bileşeni', () => {
  let onConfirmMock: jest.Mock;
  let onCloseMock: jest.Mock;

  beforeEach(() => {
    onConfirmMock = jest.fn();
    onCloseMock = jest.fn();
  });

  it('yeni bir çıkış için doğru şekilde render edilir', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={onCloseMock}
        folder={mockFolder}
        onConfirm={onConfirmMock}
      />
    );
    expect(screen.getByText('Klasör Çıkış Formu')).toBeTruthy();
    expect(screen.getByText(mockFolder.subject)).toBeTruthy();
    expect((screen.getByLabelText('Ad *') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Çıkış Ver' })).toBeTruthy();
  });

  it('düzenleme modunda formu verilerle doldurur', () => {
    render(
      <CheckoutModal
        isOpen={true}
        onClose={onCloseMock}
        checkoutToEdit={mockCheckoutToEdit}
        onConfirm={onConfirmMock}
      />
    );
    expect(screen.getByText('Çıkış Bilgilerini Düzenle')).toBeTruthy();
    expect((screen.getByLabelText('Ad *') as HTMLInputElement).value).toBe('Jane');
    expect((screen.getByLabelText('Soyad *') as HTMLInputElement).value).toBe('Doe');
    expect(screen.getByText(/Specific document/i)).toBeTruthy(); // Description is visible
    expect(screen.getByRole('button', { name: 'Güncelle' })).toBeTruthy();
  });
  
  it('çıkış tipine göre belge açıklamasını gösterir ve gizler', async () => {
    const user = userEvent.setup();
    render(
      <CheckoutModal
        isOpen={true}
        onClose={onCloseMock}
        folder={mockFolder}
        onConfirm={onConfirmMock}
      />
    );
    // Initially, description is not visible (Tam is selected by default)
    expect(screen.queryByLabelText(/çıkarılan belgeler/i)).toBeNull();
    // Click 'Kısmi'
    const kismiRadio = screen.getByLabelText('Kısmi');
    await act(async () => {
      await user.click(kismiRadio);
    });
    // Now it should be visible
    expect(screen.getByLabelText(/çıkarılan belgeler/i)).toBeTruthy();
    // Click 'Tam'
    const tamRadio = screen.getByLabelText('Tam');
    await act(async () => {
      await user.click(tamRadio);
    });
    // It should be hidden again
    expect(screen.queryByLabelText(/çıkarılan belgeler/i)).toBeNull();
  });

  it('gönderildiğinde onConfirm fonksiyonunu doğru verilerle çağırır', async () => {
    const user = userEvent.setup();
    render(
      <CheckoutModal
        isOpen={true}
        onClose={onCloseMock}
        folder={mockFolder}
        onConfirm={onConfirmMock}
      />
    );
    await act(async () => {
      await user.type(screen.getByLabelText('Ad *'), 'John');
      await user.type(screen.getByLabelText('Soyad *'), 'Smith');
    });
    // userEvent.type does not work reliably with date inputs in JSDOM, use fireEvent.change
    await act(async () => {
      fireEvent.change(screen.getByLabelText('İade Tarihi *'), {
        target: { value: '2025-02-15' },
      });
    });
    const confirmButton = screen.getByRole('button', { name: 'Çıkış Ver' });
    await act(async () => {
      await user.click(confirmButton);
    });
    expect(onConfirmMock).toHaveBeenCalledWith({
      folderId: mockFolder.id,
      checkoutType: CheckoutType.Tam,
      documentDescription: '',
      personName: 'John',
      personSurname: 'Smith',
      personPhone: '',
      reason: '',
      plannedReturnDate: new Date('2025-02-15T00:00:00.000Z'),
    });
  });
});
