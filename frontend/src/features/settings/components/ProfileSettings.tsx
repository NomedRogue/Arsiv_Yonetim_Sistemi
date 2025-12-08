import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/constants';
import { toast } from '@/lib/toast';

export const ProfileSettings: React.FC = () => {
    const { token, user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error('Yeni şifreler uyuşmuyor.');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Yeni şifre en az 6 karakter olmalıdır.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Şifre değiştirilemedi');
            }
            
            toast.success('Şifreniz başarıyla değiştirildi.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch(error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                        {user?.username?.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {user?.username}
                            {user?.role === 'admin' && (
                                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full flex items-center gap-1">
                                    <ShieldCheck size={10} /> Admin
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Hesap durumu: Aktif
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <KeyRound size={16} />
                    Şifre Değiştir
                </h4>
                
                <form onSubmit={handleChangePassword} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                             <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mevcut Şifre</label>
                             <input 
                                 type="password"
                                 required
                                 className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm bg-white dark:bg-slate-700 dark:text-white"
                                 value={currentPassword}
                                 onChange={(e) => setCurrentPassword(e.target.value)}
                             />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Şifre</label>
                            <input 
                                type="password"
                                required
                                minLength={6}
                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm bg-white dark:bg-slate-700 dark:text-white"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Şifre (Tekrar)</label>
                            <input 
                                type="password"
                                required
                                minLength={6}
                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm bg-white dark:bg-slate-700 dark:text-white"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex justify-center py-1.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
