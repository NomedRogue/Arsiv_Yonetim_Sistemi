import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trash2, UserPlus, Shield, User as UserIcon, KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL } from '@/constants';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  isApproved: boolean;
  createdAt: string;
}

export const UserManagement: React.FC = () => {
    const { token, user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToChangePassword, setUserToChangePassword] = useState<User | null>(null);

    // Form states
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
    
    // Change password form state (Admin override)
    const [adminNewPassword, setAdminNewPassword] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Kullanıcılar getirilemedi');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error('Kullanıcı listesi alınamadı.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Kullanıcı eklenemedi');

            toast.success('Kullanıcı başarıyla eklendi.');
            setIsAddModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            const res = await fetch(`${API_BASE_URL}/auth/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Silme işlemi başarısız');
            }

            toast.success('Kullanıcı silindi.');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    
    const handleApproveUser = async (user: User) => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/users/${user.id}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
             
            if (!res.ok) {
                 const data = await res.json();
                 throw new Error(data.error || 'Onaylama başarısız');
            }
             
            toast.success('Kullanıcı onaylandı.');
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isApproved: true } : u));
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleAdminChangePassword = async () => {
        if (!userToChangePassword || !adminNewPassword) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/auth/users/${userToChangePassword.id}/password`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ newPassword: adminNewPassword })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Şifre güncellenemedi');
            }
            
            toast.success('Şifre başarıyla güncellendi.');
            setIsChangePasswordModalOpen(false);
            setAdminNewPassword('');
            setUserToChangePassword(null);
        } catch(error: any) {
            toast.error(error.message);
        }
    };

    const resetForm = () => {
        setNewUsername('');
        setNewPassword('');
        setNewRole('user');
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm xl:text-base text-gray-800 dark:text-gray-200">Sistem Kullanıcıları</h3>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center px-3 py-1.5 xl:px-4 xl:py-2 border border-transparent text-xs xl:text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                >
                    <UserPlus className="mr-2 h-3.5 w-3.5 xl:h-4 xl:w-4" />
                    Yeni Kullanıcı
                </button>
            </div>

            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-4 py-2 xl:px-6 xl:py-3 text-left text-[10px] xl:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                            <th className="px-4 py-2 xl:px-6 xl:py-3 text-left text-[10px] xl:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rol</th>
                            <th className="px-4 py-2 xl:px-6 xl:py-3 text-left text-[10px] xl:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                            <th className="px-4 py-2 xl:px-6 xl:py-3 text-left text-[10px] xl:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kayıt Tarihi</th>
                            <th className="px-4 py-2 xl:px-6 xl:py-3 text-right text-[10px] xl:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                <td className="px-4 py-2 xl:px-6 xl:py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-6 w-6 xl:h-8 xl:w-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                                            <span className="text-teal-600 dark:text-teal-400 font-medium text-xs xl:text-sm">{u.username.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div className="ml-3 xl:ml-4">
                                            <div className="text-xs xl:text-sm font-medium text-gray-900 dark:text-white">{u.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-2 xl:px-6 xl:py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-[10px] xl:text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1 inline self-center" /> : <UserIcon className="w-3 h-3 mr-1 inline self-center" />}
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-2 xl:px-6 xl:py-4 whitespace-nowrap">
                                    {u.isApproved ? (
                                        <span className="px-2 inline-flex text-[10px] xl:text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                            Aktif
                                        </span>
                                    ) : (
                                        <span className="px-2 inline-flex text-[10px] xl:text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                            Onay Bekliyor
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-2 xl:px-6 xl:py-4 whitespace-nowrap text-xs xl:text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2 xl:px-6 xl:py-4 whitespace-nowrap text-right text-xs xl:text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        {!u.isApproved && (
                                            <button
                                                onClick={() => handleApproveUser(u)}
                                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded transition-colors"
                                                title="Onayla ve Aktifleştir"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setUserToChangePassword(u); setIsChangePasswordModalOpen(true); }}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition-colors"
                                            title="Şifre Değiştir (Admin)"
                                        >
                                            <KeyRound className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                        </button>
                                        
                                        {u.id !== currentUser?.id && (
                                            <button 
                                                onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true); }}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Yeni Kullanıcı Ekle"
                onConfirm={handleAddUser}
                confirmText="Ekle"
                confirmColor="bg-teal-600"
            >
                <div className="space-y-3 xl:space-y-4">
                    <div>
                        <label className="block text-xs xl:text-sm font-medium text-gray-700 dark:text-gray-300">Kullanıcı Adı</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 xl:p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-xs xl:text-sm bg-white dark:bg-slate-700 dark:text-white"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs xl:text-sm font-medium text-gray-700 dark:text-gray-300">Şifre</label>
                        <input 
                            type="password" 
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 xl:p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-xs xl:text-sm bg-white dark:bg-slate-700 dark:text-white"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs xl:text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
                        <select
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 xl:p-2 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-xs xl:text-sm bg-white dark:bg-slate-700 dark:text-white"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                        >
                            <option value="user">Kullanıcı (User)</option>
                            <option value="admin">Yönetici (Admin)</option>
                        </select>
                    </div>
                </div>
            </Modal>
            
            {/* Admin Change Password Modal */}
            <Modal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setIsChangePasswordModalOpen(false)}
                title={`Şifre Değiştir: ${userToChangePassword?.username}`}
                onConfirm={handleAdminChangePassword}
                confirmText="Güncelle"
                confirmColor="bg-blue-600"
            >
                <div className="space-y-3 xl:space-y-4">
                    <p className="text-xs xl:text-sm text-gray-500 dark:text-gray-400">
                        Bu kullanıcının şifresini yönetici olarak sıfırlıyorsunuz.
                    </p>
                    <div>
                        <label className="block text-xs xl:text-sm font-medium text-gray-700 dark:text-gray-300">Yeni Şifre</label>
                        <input 
                            type="password" 
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 xl:p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs xl:text-sm bg-white dark:bg-slate-700 dark:text-white"
                            value={adminNewPassword}
                            onChange={(e) => setAdminNewPassword(e.target.value)}
                            placeholder="Yeni şifreyi girin"
                        />
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Kullanıcıyı Sil"
                onConfirm={handleDeleteUser}
                confirmText="Sil"
                type="danger"
                showIcon
            >
                <p>
                    <span className="font-bold text-gray-900 dark:text-white">{userToDelete?.username}</span> kullanıcısını silmek istediğinizden emin misiniz?
                </p>
            </Modal>
        </div>
    );
};
