import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Folder, CheckoutType, Checkout } from '@/types';
import { toast } from '@/lib/toast';

type CheckoutFormState = {
  checkoutType: CheckoutType;
  documentDescription: string;
  personName: string;
  personSurname: string;
  personPhone: string;
  reason: string;
  /** YYYY-MM-DD */
  plannedReturnDate: string;
};

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
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{folderForDisplay?.subject}</h3>

        <div>
          <label className="block text-sm font-medium">Çıkış Tipi</label>
          <div className="flex items-center space-x-4 mt-1 p-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300">
            <input
              id="checkout-tam"
              type="radio"
              value={CheckoutType.Tam}
              name="checkoutType"
              checked={formData.checkoutType === CheckoutType.Tam}
              onChange={handleRadioChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="checkout-tam">Tam</label>
            <input
              id="checkout-kismi"
              type="radio"
              value={CheckoutType.Kismi}
              name="checkoutType"
              checked={formData.checkoutType === CheckoutType.Kismi}
              onChange={handleRadioChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="checkout-kismi">Kısmi</label>
          </div>
        </div>

        {formData.checkoutType === CheckoutType.Kismi && (
          <div>
            <label htmlFor="documentDescription" className="block text-sm font-medium">
              Çıkarılan Belgelerin Açıklaması (Zorunlu)
            </label>
            <textarea
              id="documentDescription"
              name="documentDescription"
              value={formData.documentDescription}
              onChange={handleChange}
              rows={2}
              className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
            />
          </div>
        )}

        <div>
          <label htmlFor="personName" className="block text-sm font-medium">Alan Kişi Adı (Zorunlu)</label>
          <input
            id="personName"
            type="text"
            name="personName"
            value={formData.personName}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
          />
        </div>
        <div>
          <label htmlFor="personSurname" className="block text-sm font-medium">Alan Kişi Soyadı (Zorunlu)</label>
          <input
            id="personSurname"
            type="text"
            name="personSurname"
            value={formData.personSurname}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
          />
        </div>
        <div>
          <label htmlFor="personPhone" className="block text-sm font-medium">Telefon</label>
          <input
            id="personPhone"
            type="tel"
            pattern="[0-9]*"
            name="personPhone"
            value={formData.personPhone}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
          />
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium">Çıkış Nedeni</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={2}
            className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
          />
        </div>
        <div>
          <label htmlFor="plannedReturnDate" className="block text-sm font-medium">Planlanan İade Tarihi (Zorunlu)</label>
          <input
            id="plannedReturnDate"
            type="date"
            name="plannedReturnDate"
            value={formData.plannedReturnDate}
            onChange={handleChange}
            className="mt-1 block w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-slate-600 dark:border-gray-500 dark:text-white transition-colors duration-300"
          />
        </div>
      </div>
    </Modal>
  );
};