import { useState } from 'react';
import { Department, Category } from '../types';
import { toast } from '@/lib/toast';

interface UseDepartmentManagementProps {
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id'>) => void | Promise<void>;
  updateDepartment: (dept: Department) => void | Promise<void>;
  deleteDepartment: (id: number) => void | Promise<void>;
}

export const useDepartmentManagement = ({
  departments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
}: UseDepartmentManagementProps) => {
  const [isDepartmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentModalMode, setDepartmentModalMode] = useState<'add' | 'edit'>('add');
  const [currentDepartment, setCurrentDepartment] = useState<Omit<Department, 'id'>>({
    name: '',
    code: '',
    category: Category.Idari,
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDepartment((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenDepartmentModal = () => {
    setDepartmentModalMode('add');
    setCurrentDepartment({ name: '', code: '', category: Category.Idari });
    setEditingDepartmentId(null);
    setDepartmentModalOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setDepartmentModalMode('edit');
    setCurrentDepartment({ name: dept.name, code: dept.code || '', category: dept.category });
    setEditingDepartmentId(dept.id);
    setDepartmentModalOpen(true);
  };

  const handleCloseDepartmentModal = () => {
    setDepartmentModalOpen(false);
    setCurrentDepartment({ name: '', code: '', category: Category.Idari });
    setEditingDepartmentId(null);
  };

  const handleDepartmentSubmit = async () => {
    if (!currentDepartment.name.trim()) {
      toast.error('Birim adı boş olamaz.');
      return;
    }

    if (!currentDepartment.code.trim()) {
      toast.error('Birim kodu boş olamaz.');
      return;
    }

    if (departmentModalMode === 'add') {
      await addDepartment(currentDepartment);
    } else if (editingDepartmentId !== null) {
      const updatedDept: Department = { id: editingDepartmentId, ...currentDepartment };
      await updateDepartment(updatedDept);
    }
    handleCloseDepartmentModal();
  };

  return {
    isDepartmentModalOpen,
    departmentModalMode,
    currentDepartment,
    editingDepartmentId,
    handleDepartmentChange,
    handleOpenDepartmentModal,
    handleEditDepartment,
    handleCloseDepartmentModal,
    handleDepartmentSubmit,
  };
};
