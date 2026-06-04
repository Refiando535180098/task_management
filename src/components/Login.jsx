import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; // Pastikan path ini benar mengarah ke file supabaseClient.js Anda

export default function Login() {
  const navigate = useNavigate();
  const [loginNik, setLoginNik] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Konfigurasi sistem statis (agar logo/nama tampil di login)
  const sysConfig = { brandName: 'SYNTEGRA SERVICES' };

  useEffect(() => {
    // Cek apakah sudah login, jika sudah langsung lempar ke halaman Portal
    const activeSession = localStorage.getItem('syntegra_user_session');
    if (activeSession) {
      navigate('/');
    }

    // Cek Remember Me
    const savedNik = localStorage.getItem('syntegra_saved_nik');
    const savedPassword = localStorage.getItem('syntegra_saved_password');
    if (savedNik && savedPassword) {
      setLoginNik(savedNik);
      setLoginPassword(savedPassword);
      setRememberMe(true);
    } else if (savedNik) {
      setLoginNik(savedNik);
      setRememberMe(true);
    }
  }, [navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(''); // Reset pesan error
    
    try {
      // KONEKSI LANGSUNG KE SUPABASE: Mencocokkan NIK dan Password
      const { data: user, error } = await supabase
        .from('initial_users')
        .select('*')
        .eq('nik', loginNik)
        .eq('password', loginPassword)
        .single();

      if (error || !user) {
        setLoginError('NIK atau Password yang Anda masukkan salah!');
        return;
      }

      // Jika berhasil, Simpan Sesi
      localStorage.setItem('syntegra_user_session', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Simpan Remember Me
      if (rememberMe) {
        localStorage.setItem('syntegra_saved_nik', loginNik);
        localStorage.setItem('syntegra_saved_password', loginPassword);
      } else {
        localStorage.removeItem('syntegra_saved_nik');
        localStorage.removeItem('syntegra_saved_password');
      }
      
      // Arahkan ke halaman portal utama
      navigate('/');
      
    } catch (error) {
      setLoginError('Gagal terhubung ke database.');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-yellow-400 flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-5" style={{backgroundImage: `radial-gradient(#4f46e5 1px, transparent 1px)`, backgroundSize: `24px 24px`}}></div>
      <div className="w-full max-w-md p-6 md:p-8 shadow-2xl shadow-blue-100 border-0 bg-white/95 backdrop-blur-xl relative z-10 rounded-2xl">
        <div className="text-center mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl transform hover:rotate-3 transition-transform">
            <img src="/Logo_apps.png" alt="Logo" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-yellow-500 tracking-tight uppercase">{sysConfig.brandName}<br/><span className="text-slate-800 text-lg md:text-xl">SYNTEGRA ERP SYSTEM</span></h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Sistem ERP Terintegrasi</p>
        </div>
        
        <form onSubmit={handleLoginSubmit} className="space-y-4 md:space-y-5">
          {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs md:text-sm font-bold border border-red-200 text-center">{loginError}</div>}
          <div>
            <label className="block text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">NIK Karyawan</label>
            <input required type="text" value={loginNik} onChange={(e) => setLoginNik(e.target.value)} placeholder="Masukkan NIK" className="w-full px-4 py-3 md:py-3.5 border-2 border-slate-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 font-bold bg-slate-50 focus:bg-white outline-none transition-all text-sm"/>
          </div>
          <div>
            <label className="block text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Kata Sandi (Password)</label>
            <input required type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Masukkan Password" className="w-full px-4 py-3 md:py-3.5 border-2 border-slate-200 rounded-xl focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 font-bold bg-slate-50 focus:bg-white outline-none transition-all text-sm"/>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded border-slate-300 focus:ring-yellow-500 cursor-pointer"/>
            <label htmlFor="remember" className="text-xs md:text-sm font-bold text-slate-600 cursor-pointer">
              Ingat Login Saya
            </label>
          </div>
          <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-white py-3 md:py-3.5 rounded-xl font-bold shadow-lg transform hover:-translate-y-0.5 transition-all text-sm md:text-base">
            Masuk ke Sistem
          </button>
          <p className="text-center text-[10px] md:text-xs text-slate-400 font-medium pt-2">Hubungi HR / Admin bila lupa akses.</p>
        </form>
      </div>
      <div className="absolute bottom-6 md:bottom-8 left-0 right-0 flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300 z-10 cursor-default">
         <div className="flex items-center gap-2 text-[10px] md:text-xs font-black text-yellow-900/50 uppercase tracking-widest">
           <span>© {new Date().getFullYear()}</span>
           <span className="w-1.5 h-1.5 rounded-full bg-yellow-600/40"></span>
           <span>{sysConfig.brandName}</span>
         </div>
         <p className="text-[8px] md:text-[9px] font-bold text-yellow-900/40 mt-1 uppercase tracking-widest flex items-center gap-1">
           Crafted by <span className="text-yellow-800/60 font-black">Vanda Tech</span>
         </p>
      </div>
    </div>
  );
}