import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
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
        
        toast.warning(
            'Güvenlik nedeniyle şifre sıfırlama işlemi sadece sistem yöneticisi tarafından yapılabilir. Lütfen yöneticiniz ile iletişime geçiniz.',
            { duration: 6000 }
        );
    };

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-100 selection:bg-teal-500/30 overflow-hidden relative">
            <TitleBar title="Arşiv Yönetim Sistemi" theme="dark" />

            {/* GLOBAL ANIMATED BACKGROUND */}
            <div className="absolute inset-0 bg-slate-950 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 opacity-90"></div>
                {/* Large Ambient Blobs */}
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-purple-900/20 rounded-full blur-[120px] animate-pulse duration-[10s]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-teal-900/20 rounded-full blur-[120px] animate-pulse duration-[12s] delay-1000"></div>
                <div className="absolute top-[20%] left-[30%] w-[40vw] h-[40vw] bg-blue-900/10 rounded-full blur-[100px] animate-pulse duration-[15s] delay-3000"></div>
            </div>

            {/* CONTENT LAYER */}
            <div className="flex-1 flex w-full relative z-10">
                
                {/* LEFT SIDE - BRANDING (60%) */}
                {/* Transparent background to show global gradient */}
                <div className="hidden md:flex md:w-[60%] flex-col items-center justify-center p-12 text-center">
                    
                    <div className="backdrop-blur-sm bg-white/5 p-12 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-2xl transform transition-transform duration-700 hover:scale-[1.01] hover:bg-white/[0.07]">
                        <h1 className="text-5xl font-bold mb-6 tracking-tight drop-shadow-xl text-white">
                            Arşiv Yönetim <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Sistemi</span>
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed font-light tracking-wide drop-shadow-md">
                            Kurumsal belgelerinizi güvenle saklayın, yönetin ve saniyeler içinde erişin.
                        </p>
                        
                        {/* Decorative Pills */}
                        <div className="mt-10 flex gap-4 justify-center opacity-60">
                            <div className="h-1.5 w-16 bg-teal-500 rounded-full"></div>
                            <div className="h-1.5 w-8 bg-blue-500 rounded-full"></div>
                            <div className="h-1.5 w-4 bg-purple-500 rounded-full"></div>
                        </div>

                         <div className="mt-12 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/20 border border-white/5 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-xs font-mono text-slate-400">v1.2.0 System Active</span>
                         </div>
                    </div>

                </div>

                {/* RIGHT SIDE - LOGIN FORM (40%) */}
                {/* Full Height Glassmorphism Panel */}
                <div className="w-full md:w-[40%] h-full backdrop-blur-xl bg-slate-900/60 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.3)] flex items-center justify-center p-8">
                    
                    <div className="w-full max-w-md flex flex-col items-center">
                        
                        {/* RESTORED LOGO */}
                        <div className="mb-8 p-5 bg-gradient-to-br from-white/10 to-transparent rounded-[1.5rem] border border-white/10 shadow-xl relative group transition-all duration-300 hover:shadow-teal-500/20 hover:-translate-y-1">
                             <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
                             <img src="icon.ico" alt="Logo" className="w-20 h-20 relative z-10 drop-shadow-2xl" />
                        </div>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Hoş Geldiniz</h2>
                            <p className="text-slate-400 text-sm font-medium">Lütfen hesap bilgilerinizi giriniz</p>
                        </div>

                        {error && (
                            <div className="w-full mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3 animate-fade-in-right">
                                <span className="text-sm text-red-200 font-medium">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="w-full space-y-6">
                            {/* Username */}
                            <div className="group space-y-2">
                                <label className="block text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider group-focus-within:text-teal-400 transition-colors">Kullanıcı Adı</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 focus:bg-slate-900/80 transition-all duration-300 shadow-inner hover:border-slate-600/50"
                                        placeholder="Kullanıcı adınızı girin"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="group space-y-2">
                                 <label className="block text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider group-focus-within:text-teal-400 transition-colors">Şifre</label>
                                 <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-12 pr-12 py-4 bg-slate-950/50 border border-slate-700/50 rounded-2xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 focus:bg-slate-900/80 transition-all duration-300 shadow-inner hover:border-slate-600/50"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                 </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 px-1">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-teal-600 border-teal-600' : 'border-slate-600 bg-slate-800/50 group-hover:border-slate-500'}`}>
                                        {rememberMe && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="hidden" />
                                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors font-medium">Beni Hatırla</span>
                                </label>
                                
                                <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors offset-4 decoration-2 decoration-teal-400/30">
                                    Şifremi Unuttum?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/20 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center ring-1 ring-white/10 mt-4"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span>Giriş Yapılıyor...</span>
                                    </div>
                                ) : (
                                    <span className="tracking-wide">GİRİŞ YAP</span>
                                )}
                            </button>
                        </form>
                        
                        <div className="mt-auto pt-10 text-center w-full">
                            <p className="text-xs text-slate-600 font-medium">© 2025 Arşiv Yönetim Sistemi. v1.2.0</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
