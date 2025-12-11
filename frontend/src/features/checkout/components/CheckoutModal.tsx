import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Folder, CheckoutType, Checkout } from '@/types';
import { toast } from '@/lib/toast';
import { CheckoutFormState } from '../types';

const initialCheckoutData: CheckoutFormState = {
  checkoutType: CheckoutType.Tam,
  documentDescription: '',
  personName: '',
  personSurname: '',
  personPhone: '',
  reason: '',
  plannedReturnDate: new Date(new Date().setDate(new Date().getDate() + 15))
    .toISOString()
    .split('T')[0],
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: Folder | null;
  checkoutToEdit?: (Checkout & { folder?: Folder }) | null;
  onConfirm: (checkoutData: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  folder,
  checkoutToEdit,
  onConfirm,
}) => {
  const [formData, setFormData] = useState<CheckoutFormState>(initialCheckoutData);
  const isEditing = !!checkoutToEdit;
  const folderForDisplay = isEditing ? checkoutToEdit?.folder : folder;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && checkoutToEdit) {
        setFormData({
          checkoutType: checkoutToEdit.checkoutType,
          documentDescription: checkoutToEdit.documentDescription || '',
          personName: checkoutToEdit.personName,
          personSurname: checkoutToEdit.personSurname,
          personPhone: checkoutToEdit.personPhone || '',
          reason: checkoutToEdit.reason || '',
          plannedReturnDate: new Date(checkoutToEdit.plannedReturnDate)
            .toISOString()
            .split('T')[0],
        });
      } else {
        setFormData(initialCheckoutData);
      }
    }
  }, [isOpen, isEditing, checkoutToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'personPhone') {
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, personPhone: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, checkoutType: e.target.value as CheckoutType }));
  };

  const handleConfirm = () => {
    if (!formData.personName.trim() || !formData.personSurname.trim() || !formData.plannedReturnDate) {
      toast.warning('Lütfen zorunlu alanları doldurun: Ad, Soyad ve Planlanan İade Tarihi.');
      return;
    }
    if (formData.checkoutType === CheckoutType.Kismi && !formData.documentDescription.trim()) {
      toast.warning("Kısmi çıkış seçildiğinde 'Çıkarılan Belgelerin Açıklaması' alanı zorunludur.");
      return;
    }

    const commonPayload = {
      ...formData,
      plannedReturnDate: new Date(formData.plannedReturnDate),
      documentDescription: formData.checkoutType === CheckoutType.Tam ? '' : formData.documentDescription,
    };

    if (isEditing) {
      onConfirm({
        ...checkoutToEdit,
        ...commonPayload,
      });
    } else {
      onConfirm({
        folderId: folder!.id,
        ...commonPayload,
      });
    }
  };

  if (!isOpen || (!folder && !checkoutToEdit)) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={isEditing ? 'Çıkış Bilgilerini Düzenle' : 'Klasör Çıkış Formu'}
      confirmText={isEditing ? 'Güncelle' : 'Çıkış Ver'}
      confirmColor="bg-status-orange"
    >
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {/* Klasör Başlığı */}
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">
          {folderForDisplay?.subject}
        </h3>

        {/* Çıkış Tipi - Yatay */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">Çıkış Tipi:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              id="checkout-tam"
              type="radio"
              value={CheckoutType.Tam}
              name="checkoutType"
              checked={formData.checkoutType === CheckoutType.Tam}
              onChange={handleRadioChange}
              className="w-3.5 h-3.5 text-blue-600"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">Tam</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              id="checkout-kismi"
              type="radio"
              value={CheckoutType.Kismi}
              name="checkoutType"
              checked={formData.checkoutType === CheckoutType.Kismi}
              onChange={handleRadioChange}
              className="w-3.5 h-3.5 text-blue-600"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">Kısmi</span>
          </label>
        </div>

        {formData.checkoutType === CheckoutType.Kismi && (
          <div>
            <label htmlFor="documentDescription" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Çıkarılan Belgeler *</label>
            <textarea
              id="documentDescription"
              name="documentDescription"
              value={formData.documentDescription}
              onChange={handleChange}
              rows={1}
              placeholder="Çıkarılan belgeleri açıklayın..."
              className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Alan Kişi - 2 Kolon */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="personName" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ad *</label>
            <input
              id="personName"
              type="text"
              name="personName"
              value={formData.personName}
              onChange={handleChange}
              placeholder="Ad"
              className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="personSurname" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Soyad *</label>
            <input
              id="personSurname"
              type="text"
              name="personSurname"
              value={formData.personSurname}
              onChange={handleChange}
              placeholder="Soyad"
              className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Telefon ve Tarih - 2 Kolon */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="personPhone" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Telefon</label>
            <input
              id="personPhone"
              type="tel"
              pattern="[0-9]*"
              name="personPhone"
              value={formData.personPhone}
              onChange={handleChange}
              placeholder="05XX XXX XX XX"
              className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="plannedReturnDate" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">İade Tarihi *</label>
            <input
              id="plannedReturnDate"
              type="date"
              name="plannedReturnDate"
              value={formData.plannedReturnDate}
              onChange={handleChange}
              className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Çıkış Nedeni */}
        <div>
          <label htmlFor="reason" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Çıkış Nedeni</label>
          <input
            id="reason"
            type="text"
            name="reason"
            value={formData.reason}
            onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Opsiyonel"
            className="block w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500">* Zorunlu</p>
      </div>
    </Modal>
  );
};
