import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { TitleBar } from '@/components/TitleBar';

export const Login = () => {
    const { login } = useAuth();
    const { theme } = useTheme();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Load remembered username on mount
    useEffect(() => {
        const rememberedUsername = localStorage.getItem('rememberedUsername');
        if (rememberedUsername) {
            setUsername(rememberedUsername);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        try {
            await login(cleanUsername, cleanPassword, rememberMe);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Şifremi unuttum tıklandı'); // Debug
        
        toast.warning(
            'Güvenlik nedeniyle şifre sıfırlama işlemi sadece sistem yöneticisi tarafından yapılabilir. Lütfen yöneticiniz ile iletişime geçiniz.',
            { duration: 6000 }
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 login-page">
            <TitleBar title="Arşiv Yönetim Sistemi - Giriş" theme={theme} />
            <div className="flex flex-1">
            {/* Left Side - Visual & Branding */}
            <div className="hidden md:flex md:w-1/2 relative bg-archive-primary overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-800 to-blue-900 opacity-90"></div>
                {/* Abstract tech pattern instead of photo */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent opacity-40"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent opacity-40"></div>
                
                {/* Animated Shapes */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                
                <div className="relative z-10 text-white text-center p-12">
                    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 inline-block mb-8 shadow-2xl">
                        <img src="icon.ico" alt="Logo" className="w-20 h-20 drop-shadow-lg" />
                   </div>
                   <p className="text-xl text-teal-100 max-w-md mx-auto leading-relaxed">
                       Arşiv Yönetim Sistemi
                       <span className="block text-sm mt-4 opacity-80">Güvenli, Hızlı ve Modern Arşivleme</span>
                   </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-8 relative">
                <div className="absolute bottom-4 right-8 hidden md:block">
                     <div className="text-slate-300 dark:text-slate-600 text-xs font-light">
                        <span>Arşiv Yönetim Sistemi v1.0</span>
                     </div>
                </div>

                <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white p-2 mb-3 transition-transform hover:scale-110 duration-300">
                             <img src="icon.ico" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1.5">Hoş Geldiniz</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Lütfen hesap bilgilerinizle giriş yapın.</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-start animate-fade-in">
                            <div className="flex-shrink-0 text-red-500 mt-0.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="ml-2.5 text-sm text-red-600 dark:text-red-300 font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                             <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Kullanıcı Adı</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all shadow-sm"
                                    placeholder="Kullanıcı adınızı girin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onBlur={() => setUsername(prev => prev.trim())}
                                    onKeyDown={(e) => {
                                        if (e.key === ' ') {
                                            e.preventDefault();
                                        }
                                    }}
                                    required
                                />
                             </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Şifre</label>
                            </div>
                             <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                             </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 transition-colors cursor-pointer" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Beni Hatırla</span>
                            </label>
                            <button
                                type="button" 
                                onClick={handleForgotPassword}
                                className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
                            >
                                Şifremi Unuttum?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 text-sm bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Giriş Yap'}
                        </button>
                    </form>

                    <p className="mt-7 text-center text-xs text-slate-400 dark:text-slate-500">
                        © 2025 Arşiv Yönetim Sistemi. Tüm hakları saklıdır.
                    </p>
                </div>
            </div>
            </div> {/* Close flex container */}
        </div>
    );
};
