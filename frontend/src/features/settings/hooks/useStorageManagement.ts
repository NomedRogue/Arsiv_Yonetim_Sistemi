import { useState } from 'react';
import { StorageType, KompaktUnitConfig, ItemToDelete, EditingLocation } from '../types';
import { toast } from '@/lib/toast';

interface UseStorageManagementProps {
  addStorageUnit: (type: StorageType, config?: KompaktUnitConfig) => void | Promise<void>;
  deleteStorageUnit: (type: StorageType, id: number) => void | Promise<void>;
  updateStorageUnitShelves: (type: StorageType, id: number, shelfCount: number) => void | Promise<void> | Promise<boolean>;
}

export const useStorageManagement = ({
  addStorageUnit,
  deleteStorageUnit,
  updateStorageUnitShelves,
}: UseStorageManagementProps) => {
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<EditingLocation | null>(null);
  const [newShelfCount, setNewShelfCount] = useState(5);

  const [isKompaktAddModalOpen, setKompaktAddModalOpen] = useState(false);
  const initialKompaktConfig: KompaktUnitConfig = {
    hasFaceA: true,
    hasFaceB: true,
    hasFaceGizli: false,
    sectionsPerFace: 2,
    shelvesPerSection: 5,
  };
  const [kompaktConfig, setKompaktConfig] = useState<KompaktUnitConfig>(initialKompaktConfig);

  const [isStandAddModalOpen, setStandAddModalOpen] = useState(false);
  const [standShelfCount, setStandShelfCount] = useState(5);

  // Delete modal handlers
  const openDeleteModal = (type: 'department' | 'location', data: any) => {
    setItemToDelete({ type, data });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'location') {
        await deleteStorageUnit(itemToDelete.data.type, itemToDelete.data.id);
      }
    } catch (error: any) {
      toast.error(`Silme işlemi başarısız: ${error.message}`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Location edit modal handlers
  const openLocationModal = (type: StorageType, id: number, currentShelfCount: number) => {
    setEditingLocation({ type, id, shelfCount: currentShelfCount });
    setNewShelfCount(currentShelfCount);
    setLocationModalOpen(true);
  };

  const handleLocationSubmit = async () => {
    if (!editingLocation) return;
    await updateStorageUnitShelves(editingLocation.type, editingLocation.id, newShelfCount);
    setLocationModalOpen(false);
    setEditingLocation(null);
  };

  // Kompakt unit modal handlers
  const handleOpenKompaktModal = () => {
    setKompaktConfig(initialKompaktConfig);
    setKompaktAddModalOpen(true);
  };

  const handleCloseKompaktModal = () => {
    setKompaktAddModalOpen(false);
    setKompaktConfig(initialKompaktConfig);
  };

  const handleKompaktSubmit = async () => {
    await addStorageUnit(StorageType.Kompakt, kompaktConfig);
    handleCloseKompaktModal();
  };

  // Stand modal handlers
  const handleOpenStandModal = () => {
    setStandShelfCount(5);
    setStandAddModalOpen(true);
  };

  const handleCloseStandModal = () => {
    setStandAddModalOpen(false);
    setStandShelfCount(5);
  };

  const handleStandSubmit = async () => {
    await addStorageUnit(StorageType.Stand);
    handleCloseStandModal();
  };

  return {
    // Delete modal state
    isDeleteModalOpen,
    itemToDelete,
    openDeleteModal,
    handleConfirmDelete,
    setDeleteModalOpen,

    // Location edit modal state
    isLocationModalOpen,
    editingLocation,
    newShelfCount,
    openLocationModal,
    handleLocationSubmit,
    setNewShelfCount,
    setLocationModalOpen,

    // Kompakt unit state
    isKompaktAddModalOpen,
    kompaktConfig,
    handleOpenKompaktModal,
    handleCloseKompaktModal,
    handleKompaktSubmit,
    setKompaktConfig,

    // Stand state
    isStandAddModalOpen,
    standShelfCount,
    handleOpenStandModal,
    handleCloseStandModal,
    handleStandSubmit,
    setStandShelfCount,
  };
};
