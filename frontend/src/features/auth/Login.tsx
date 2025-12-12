import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TitleBar } from '@/components/TitleBar';
import { toast } from '@/lib/toast';
import { 
    Mail, Lock, User, X, ShieldCheck, Search, UploadCloud 
} from 'lucide-react';
import './Login.css';
import { API_BASE_URL } from '@/constants';

export const Login = () => {
    const { login } = useAuth();
    
    // State
    const [isActivePopup, setIsActivePopup] = useState(false); // Controls if popup is visible
    const [isRegisterMode, setIsRegisterMode] = useState(false); // Controls Login vs Register view
    const [showAboutModal, setShowAboutModal] = useState(false);
    
    // Form States
    const [loginEmail, setLoginEmail] = useState(''); // Treating username as email input in UI or just text
    const [loginPassword, setLoginPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regTerms, setRegTerms] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    // Initial load
    useEffect(() => {
        const storedUser = localStorage.getItem('rememberedUsername');
        if (storedUser) {
            setLoginEmail(storedUser);
            setRememberMe(true);
        }
    }, []);

    // Handlers
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(loginEmail, loginPassword, rememberMe);
            toast.success('Giriş başarılı!');
        } catch (error: any) {
            toast.error(error.message || 'Giriş başarısız.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regTerms) {
            toast.warning('Lütfen şartları kabul edin.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: regUsername,
                    email: regEmail,
                    password: regPassword
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Kayıt başarısız');

            toast.success('Kayıt başarılı! Hesabınız yönetici onayına sunulmuştur.');
            setIsRegisterMode(false); // Switch back to login
            setLoginEmail(regUsername); // Pre-fill username
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-body">
            {/* Window TitleBar - Absolute to sit on top of everything */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 2000 }}>
                <TitleBar title="Arşiv Yönetim Sistemi" theme="dark" />
            </div>

            <header>
                <nav className="navigation" style={{ marginTop: '30px' }}> {/* Adjust for TitleBar */}
                    <a href="#" className="logo">
                       <img src="/logo-5.png" alt="Arşiv Yönetim Sistemi" />
                    </a>
                    
                    <ul className="nav-links">
                        <li><a href="#about" onClick={(e) => { e.preventDefault(); setShowAboutModal(true); }}>Hakkında</a></li>
                        <li><a href="mailto:bekir.yildiz1@outlook.com">İletişim</a></li>
                    </ul>
                    
                    <button 
                        className="btnLogin-popup" 
                        onClick={() => setIsActivePopup(true)}
                    >
                        Giriş Yap
                    </button>
                </nav>
            </header>

            {/* Main Wrapper for Forms */}
            <div className={`wrapper ${isActivePopup ? 'active-popup' : ''} ${isRegisterMode ? 'active' : ''}`}>
                <span className="icon-close" onClick={() => setIsActivePopup(false)}>
                    <X />
                </span>

                {/* Login Form */}
                <div className="form-box login">
                    <h2>Giriş Yap</h2>
                    <form onSubmit={handleLoginSubmit}>
                        <div className="input-box">
                            <span className="icon"><User /></span>
                            <input 
                                type="text" 
                                required 
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                            />
                            <label>Kullanıcı Adı</label>
                        </div>
                        <div className="input-box">
                            <span className="icon"><Lock /></span>
                            <input 
                                type="password" 
                                required 
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                            />
                            <label>Şifre</label>
                        </div>
                        <div className="remember-forgot">
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                /> Beni Hatırla
                            </label>
                            <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Lütfen yöneticinizle iletişime geçin.'); }}>Şifremi Unuttum?</a>
                        </div>
                        <button type="submit" className="btn" disabled={isLoading}>
                            {isLoading ? 'Yükleniyor...' : 'Giriş Yap'}
                        </button>
                        <div className="login-register">
                            <p>Hesabınız yok mu? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setIsRegisterMode(true); }}>Kayıt Ol</a></p>
                        </div>
                    </form>
                </div>

                {/* Register Form */}
                <div className="form-box register">
                    <h2>Kayıt Ol</h2>
                    <form onSubmit={handleRegisterSubmit}>
                        <div className="input-box">
                            <span className="icon"><User /></span>
                            <input 
                                type="text" 
                                required 
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                            />
                            <label>Kullanıcı Adı</label>
                        </div>
                        <div className="input-box">
                            <span className="icon"><Mail /></span>
                            <input 
                                type="email" 
                                required 
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                            />
                            <label>E-Posta</label>
                        </div>
                        <div className="input-box">
                            <span className="icon"><Lock /></span>
                            <input 
                                type="password" 
                                required 
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                            />
                            <label>Şifre</label>
                        </div>
                        <div className="remember-forgot">
                            <label>
                                <input 
                                    type="checkbox" 
                                    required
                                    checked={regTerms}
                                    onChange={(e) => setRegTerms(e.target.checked)}
                                /> Şartları ve koşulları kabul ediyorum
                            </label>
                        </div>
                        <button type="submit" className="btn" disabled={isLoading}>
                             {isLoading ? 'İşleniyor...' : 'Kayıt Ol'}
                        </button>
                        <div className="login-register">
                            <p>Zaten hesabınız var mı? <a href="#" className="login-link" onClick={(e) => { e.preventDefault(); setIsRegisterMode(false); }}>Giriş Yap</a></p>
                        </div>
                    </form>
                </div>
            </div>

            {/* About Modal */}
            {showAboutModal && (
                <div className="about-modal" onClick={() => setShowAboutModal(false)}>
                    <div className="about-content" onClick={(e) => e.stopPropagation()}>
                        <span className="close-about" onClick={() => setShowAboutModal(false)}>&times;</span>
                        <h2>Arşiv Yönetim Sistemi Hakkında</h2>
                        <p>
                            <strong>Arşiv Yönetim Sistemi</strong>, kurumsal belgelerinizi güvenle 
                            saklayın, yönetin ve saniyeler içinde erişin.
                        </p>
                        <div className="about-features">
                            <div className="feature">
                                <ShieldCheck className="icon" />
                                <span>Güvenli Depolama</span>
                            </div>
                            <div className="feature">
                                <Search className="icon" />
                                <span>Hızlı Arama</span>
                            </div>
                            <div className="feature">
                                <UploadCloud className="icon" />
                                <span>Kolay Yükleme</span>
                            </div>
                        </div>
                        <p className="version">v1.2.0 System Archive</p>
                    </div>
                </div>
            )}
        </div>
    );
};
