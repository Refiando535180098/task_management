import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Users, LogOut, Settings, X, Search, LayoutDashboard, ImagePlus, Trash2, Calendar, UserCircle, RefreshCw, KeyRound, ShieldAlert, Bell, Paperclip, PlusCircle } from 'lucide-react';
import { supabase } from '../supabase';

const PortalHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile'); // 'profile' atau 'access'
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  
  // State untuk Banner
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // State untuk Fungsi Ubah Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // --- STATE UNTUK INFORMASI/PENGUMUMAN ---
  const [announcements, setAnnouncements] = useState([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoForm, setInfoForm] = useState({ title: '', content: '', file: null });
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);

  // Fungsi mengambil data pengumuman
  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('portal_announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  // Panggil fetchAnnouncements di dalam useEffect yang sudah ada
  useEffect(() => {
    // ... kode yang sudah ada ...
    fetchAnnouncements();
  }, []);

  // Fungsi Tambah Informasi
  const handleAddInfo = async (e) => {
    e.preventDefault();
    setIsSubmittingInfo(true);
    try {
      let attachmentUrl = null;

      // Jika ada file yang diunggah
      if (infoForm.file) {
        const fileExt = infoForm.file.name.split('.').pop();
        const fileName = `attach_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('portal_attachments')
          .upload(fileName, infoForm.file);
        
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('portal_attachments').getPublicUrl(fileName);
        attachmentUrl = data.publicUrl;
      }

      // Simpan ke database
      const { error } = await supabase.from('portal_announcements').insert([{
        title: infoForm.title,
        content: infoForm.content,
        attachment_url: attachmentUrl,
        author_id: user.id // <-- Tambahkan baris ini untuk mencatat siapa pembuatnya
      }]);

      if (error) throw error;

      alert('Informasi berhasil dipublikasikan!');
      setIsInfoModalOpen(false);
      setInfoForm({ title: '', content: '', file: null });
      fetchAnnouncements();
    } catch (err) {
      alert('Gagal menambahkan informasi: ' + err.message);
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  // Fungsi Hapus Informasi
  const deleteInfo = async (id) => {
    if (!window.confirm('Hapus informasi ini dari portal?')) return;
    const { error } = await supabase.from('portal_announcements').delete().eq('id', id);
    if (!error) fetchAnnouncements();
  };

  const refreshUserData = async () => {
  const session = JSON.parse(
    localStorage.getItem('syntegra_user_session')
    );

    if (!session?.id) return;

    const { data, error } = await supabase
      .from('initial_users')
      .select('*')
      .eq('id', session.id)
      .single();

    if (!error && data) {
      setUser(data);

      localStorage.setItem(
        'syntegra_user_session',
        JSON.stringify(data)
      );
    }
  };

  const updatePermission = async (
    userId,
    field,
    value
  ) => {
    await fetchUsers();
    await refreshUserData();

    const { error } = await supabase
      .from('initial_users')
      .update({
        [field]: value
      })
      .eq('id', userId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchUsers();
  };

  useEffect(() => {
    refreshUserData();

    const session = JSON.parse(
      localStorage.getItem('syntegra_user_session')
    );

    if (session?.role === 'admin')
      fetchUsers();

    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    setCurrentDate(
      new Date().toLocaleDateString(
        'id-ID',
        dateOptions
      )
    );

    fetchBanners();
  }, []);

  // Efek Slideshow Otomatis
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('initial_users').select('*').order('name', { ascending: true });
    setAllUsers(data || []);
  };

  const toggleAccess = async (targetUser) => {
    if (
      user?.role !== 'admin' &&
      user?.can_manage_hrd_users !== true
    ) {
      alert('Anda tidak memiliki hak mengelola akses');
      return;
    }
    try {
      const newStatus = !targetUser.has_portal_access;

      const { error } = await supabase
        .from('initial_users')
        .update({
          has_portal_access: newStatus
        })
        .eq('id', targetUser.id);

      if (error) throw error;

      await fetchUsers();

      alert(
        `${targetUser.name} ${
          newStatus
            ? 'berhasil diberikan akses HRD'
            : 'berhasil dicabut akses HRD'
        }`
      );
    } catch (err) {
      alert('Gagal mengubah akses: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('syntegra_user_session');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  const canAccessRecruitment = () => {
    if (!user) return false;

    return user.has_portal_access === true;
  };

  const fetchBanners = async () => {
    const { data } = await supabase.storage.from('portal_banners').list();
    if (data) {
      const validFiles = data.filter(file => file.name !== '.emptyFolderPlaceholder' && file.id);
      const urls = validFiles.map(file => ({
        name: file.name,
        url: supabase.storage.from('portal_banners').getPublicUrl(file.name).data.publicUrl
      }));
      setBanners(urls);
    }
  };

  const handleBannerUpload = async (e) => {
    const fileInput = e.target;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
    
    try {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert('Gagal: Ukuran gambar terlalu besar! Maksimal 2MB.');
        fileInput.value = ''; 
        return;
      }

      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `banner_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from('portal_banners').upload(fileName, file);
      if (error) {
        alert('Gagal upload banner: ' + error.message);
      } else {
        await fetchBanners(); 
        alert('Banner baru berhasil diterapkan!');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem saat memproses gambar.');
    } finally {
      setIsUploading(false);
      if (fileInput) fileInput.value = ''; 
    }
  };

  const deleteBanner = async (fileName) => {
    if (!window.confirm('Hapus banner ini?')) return;
    const { error } = await supabase.storage.from('portal_banners').remove([fileName]);
    if (!error) {
      fetchBanners();
      setCurrentSlide(0);
    }
  };

  // PROSES LOGIKA UBAH PASSWORD SEKURITI
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (currentPassword !== user.password) {
      setPasswordError('Password saat ini tidak sesuai!');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal harus 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok!');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase
        .from('initial_users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (error) throw error;

      setPasswordSuccess('Password Akun Anda berhasil diperbarui!');
      
      // Update data sesi lokal agar sinkron
      const updatedSession = { ...user, password: newPassword };
      localStorage.setItem('syntegra_user_session', JSON.stringify(updatedSession));
      setUser(updatedSession);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError('Gagal menyimpan ke server: ' + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) return null;

  const canManageInfo = user.role === 'admin' || user.can_manage_portal_info === true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-10">
      
      {/* HEADER NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-lg shadow-md">
              <img src="/Logo_apps.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 hidden md:block">
              SYNTEGRA ERP SYSTEM <span className="text-yellow-600/60">( S . E . S )</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Tombol Settings Desktop: Hanya muncul di komputer (hidden md:block) */}
            <button 
              onClick={() => { setIsSettingsModalOpen(true); setActiveSettingsTab('profile'); }} 
              className="hidden md:block p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition-all text-slate-700 shadow-sm" 
              title="Pengaturan Akun & Akses"
            >
              <Settings size={18} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-full font-bold text-xs md:text-sm shadow-md hover:bg-slate-800 transition-all">
              <LogOut size={14} /> <span className="hidden md:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-10">
        
        {/* BARIS ATAS: KARTU DATA KARYAWAN */}
        <div className="bg-slate-950 rounded-3xl p-6 md:p-8 mb-8 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest mb-2">
                  <Calendar size={14} /> {currentDate}
                </div>
                <h2 className="text-2xl md:text-4xl font-black mb-1">Selamat Datang, <span className="text-yellow-400">{user.name}</span></h2>
                <p className="text-slate-400 text-xs md:text-sm">Portal Hub ERP SYNTEGRA System</p>
              </div>

              {/* Box Detail Akun */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl w-full md:w-auto min-w-[280px]">
                <div className="flex items-center gap-3 mb-2 border-b border-white/10 pb-2">
                   <div className="bg-yellow-500 p-1.5 rounded-full text-slate-950"><UserCircle size={18}/></div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Nomor Induk Karyawan</p>
                     <p className="font-black text-xs md:text-sm text-slate-100">{user.nik || '-'}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase font-bold">Divisi</p>
                     <p className="font-bold text-yellow-400 truncate">{user.division || user.role}</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase font-bold">Jabatan</p>
                     <p className="font-bold text-white truncate">{user.position || user.role}</p>
                   </div>
                </div>
              </div>
           </div>
        </div>

        {(announcements.length > 0 || canManageInfo) && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 px-2">
               <h3 className="font-black text-slate-800 text-sm md:text-lg flex items-center gap-2">
                 <Bell size={18} className="text-amber-500" /> Pengumuman
               </h3>
               {canManageInfo && (
                 <button 
                   onClick={() => setIsInfoModalOpen(true)}
                   className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                 >
                   <PlusCircle size={14} /> Tambah Info
                 </button>
               )}
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((info) => (
                  <div key={info.id} className="bg-white border-l-4 border-amber-500 border-y border-r border-slate-200 p-4 md:p-5 rounded-r-2xl shadow-sm relative group transition-all hover:shadow-md">
                    {/* Tombol Hapus (Admin bisa hapus semua, User hanya bisa hapus buatannya sendiri) */}
                    {(user.role === 'admin' || (user.can_manage_portal_info && info.author_id === user.id)) && (
                      <button 
                        onClick={() => deleteInfo(info.id)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                        title="Hapus Informasi"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <h4 className="font-bold text-slate-900 text-sm md:text-base pr-8 mb-1">{info.title}</h4>
                    <p className="text-slate-600 text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{info.content}</p>
                    
                    {/* Tampilkan Lampiran Jika Ada */}
                    {info.attachment_url && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <a 
                          href={info.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg transition-colors"
                        >
                          <Paperclip size={12} /> Buka Lampiran
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-white/50 text-slate-400 text-xs font-medium">
                Belum ada pengumuman tertulis.
              </div>
            )}
          </div>
        )}

        {/* BANNER SLIDESHOW */}
        {(banners.length > 0 || user.role === 'admin') && (
          <div className="mb-10 relative">
            <div className="flex justify-between items-center mb-3 px-2">
               <h3 className="font-black text-slate-800 text-sm md:text-lg">Banner Informasi Event</h3>
               {user.role === 'admin' && (
                 <label className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-sm transition-all">
                    {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {isUploading ? 'Proses...' : 'Upload Banner'}
                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={isUploading} />
                 </label>
               )}
            </div>

            {/* Slideshow Area */}
            {banners.length > 0 ? (
              <div className="relative w-full h-auto bg-slate-100/50 rounded-3xl overflow-hidden shadow-md border border-slate-200 group flex items-center justify-center">
                <img 
                  src={banners[currentSlide].url} 
                  alt="Banner Internal" 
                  /* PERUBAHAN UTAMA: 
                     1. Hapus max-h agar tinggi menyesuaikan otomatis.
                     2. Ganti object-cover menjadi object-contain.
                     3. Pastikan w-full dan h-auto. */
                  className="w-full h-auto object-contain transition-all duration-500 ease-in-out"
                />
                
                {/* Tombol Hapus (Khusus Admin) - Muncul saat di hover */}
                {user.role === 'admin' && (
                   <button 
                     onClick={() => deleteBanner(banners[currentSlide].name)}
                     className="absolute top-4 right-4 bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                     title="Hapus Banner Ini"
                   >
                     <Trash2 size={16} />
                   </button>
                )}

                {/* Indikator Titik (Dots) */}
                {banners.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 bg-gradient-to-t from-black/20 to-transparent pt-4 pb-2">
                    {banners.map((_, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentSlide ? 'bg-amber-400 w-6' : 'bg-white/60 w-1.5 hover:bg-white'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-[140px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white p-4 text-center">
                 <p className="font-bold text-xs">Belum ada papan pengumuman digital yang diunggah.</p>
              </div>
            )}
          </div>
        )}

        {/* PAPAN INFORMASI TERTULIS */}
        

        {/* GRID MENU UTAMA APLIKASI */}
        <h3 className="font-black text-slate-800 text-sm md:text-lg mb-4 px-2">Menu Layanan</h3>
        
        {/* Pengondisian Layout Grid Otomatis Menyesuaikan Tengah Jika Hanya 1 Menu */}
        <div className={`grid grid-cols-1 ${canAccessRecruitment() ? 'md:grid-cols-2' : 'max-w-xl'} gap-6`}>
          
          {/* Menu Task Management */}
          <div 
            onClick={() => navigate('/TaskManagement')}
            className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="w-12 h-12 bg-slate-950 text-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <ClipboardList size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Task Management</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6">Kelola dan pantau seluruh laporan target kinerja divisi operasional harian.</p>
            <span className="font-bold text-xs text-amber-600 group-hover:underline">Buka Dashboard &rarr;</span>
          </div>

          {canAccessRecruitment() && (
            <div 
              onClick={() => navigate('/recruitment-admin')}
              className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-yellow-500 text-slate-950 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Users size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Menu HRD</h3>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6">Database screening pelamar, kuesioner fisik, uji kompetensi, dan plotting penempatan.</p>
              <span className="font-bold text-xs text-amber-600 group-hover:underline">Masuk Modul HRD &rarr;</span>
            </div>
          )}

        </div>
      </main>

      {/* COMBINED TABBED SETTINGS MODAL (PROFIL + AKSES ADMIN) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">PENGATURAN KONTROL PORTAL</h3>
                <p className="text-xs text-slate-500">Kelola akun pribadi Anda dan hak keamanan sistem</p>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {/* TAB NAVIGATOR: Khusus Admin Bisa Lihat 2 Tab, User Biasa Hanya Lihat Tab Profil */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
              <button 
                onClick={() => setActiveSettingsTab('profile')}
                className={`py-3 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-all ${activeSettingsTab === 'profile' ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-400'}`}
              >
                Keamanan Akun (Password)
              </button>
              
              {(
                user?.role === 'admin' ||
                user?.can_manage_hrd_users === true
              ) && (
                <button
                  onClick={() => setActiveSettingsTab('access')}
                  className={`py-3 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-all ${
                    activeSettingsTab === 'access'
                      ? 'border-slate-950 text-slate-950'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  Kelola Akses HRD
                </button>
              )}
            </div>
            
            {/* ISI PANEL MODAL */}
            <div className="flex-1 overflow-y-auto p-6 pb-8 bg-white">
              
              {/* TAB 1: FORM GANTI PASSWORD */}
              {activeSettingsTab === 'profile' && (
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md mx-auto py-2">
                  <div className="text-center mb-6">
                    <p className="text-xs text-slate-500 font-medium">Demi keamanan, ganti kata sandi Anda secara berkala secara rahasia.</p>
                  </div>

                  {passwordError && <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-200 font-bold text-xs text-center">{passwordError}</div>}
                  {passwordSuccess && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 font-bold text-xs text-center">{passwordSuccess}</div>}

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kata Sandi Saat Ini</label>
                    <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Masukkan password sekarang" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:border-amber-500 text-sm font-bold"/>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kata Sandi Baru</label>
                    <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:border-amber-500 text-sm font-bold"/>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ulangi Kata Sandi Baru</label>
                    <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ketik ulang password baru" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:border-amber-500 text-sm font-bold"/>
                  </div>

                  <button type="submit" disabled={isUpdatingPassword} className="w-full mt-4 bg-slate-950 text-white font-bold py-3 rounded-xl shadow-md hover:bg-slate-800 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                     <KeyRound size={14}/> {isUpdatingPassword ? 'Menyimpan...' : 'Perbarui Kata Sandi Saya'}
                  </button>
                </form>
              )}

              {/* TAB 2: MANAGEMENT AKSES REKRUTMEN (KONTROL ADMIN) */}
              {activeSettingsTab === 'access' &&(  user?.role === 'admin' ||  user?.can_manage_hrd_users === true) && (
                <div className="space-y-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                      type="text" placeholder="Ketik nama karyawan untuk mencari..." onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-amber-500 text-xs md:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    {allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                      <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 transition-all gap-3">
                        <div>
                          <p className="font-black text-xs md:text-sm text-slate-900">{u.name}</p>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{u.role} • {u.division || 'Umum'} • NIK: {u.nik || '-'}</p>
                        </div>
                        <tr key={u.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={u.has_portal_access || false}
                              onChange={(e) =>
                                updatePermission(
                                  u.id,
                                  'has_portal_access',
                                  e.target.checked
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={u.can_create_hrd || false}
                              onChange={(e) =>
                                updatePermission(
                                  u.id,
                                  'can_create_hrd',
                                  e.target.checked
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={u.can_edit_hrd || false}
                              onChange={(e) =>
                                updatePermission(
                                  u.id,
                                  'can_edit_hrd',
                                  e.target.checked
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={u.can_delete_hrd || false}
                              onChange={(e) =>
                                updatePermission(
                                  u.id,
                                  'can_delete_hrd',
                                  e.target.checked
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={u.can_manage_hrd_users || false}
                              onChange={(e) =>
                                updatePermission(
                                  u.id,
                                  'can_manage_hrd_users',
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                            <input
                              type="checkbox"
                              id={`manage_info_${u.id}`}
                              checked={u.can_manage_portal_info || false}
                              onChange={(e) =>
                                updatePermission(
                                  u.id,
                                  'can_manage_portal_info',
                                  e.target.checked
                                )
                              }
                            />
                            <label htmlFor={`manage_info_${u.id}`} className="text-[9px] font-bold text-slate-600 uppercase cursor-pointer">
                              Kelola Info
                            </label>
                          </td>
                        </tr>
                      </div>
                    ))}
                    
                    {allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">Karyawan tidak ditemukan.</div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH INFORMASI (KHUSUS ADMIN) */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase">Buat Pengumuman Baru</h3>
              <button onClick={() => setIsInfoModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddInfo} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Judul Informasi</label>
                <input required type="text" value={infoForm.title} onChange={e => setInfoForm({...infoForm, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500" placeholder="Contoh: Jadwal Maintenance Server" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Isi Pesan</label>
                <textarea required rows="4" value={infoForm.content} onChange={e => setInfoForm({...infoForm, content: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-amber-500" placeholder="Tuliskan detail informasi..." />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Lampiran File / Gambar (Opsional)</label>
                <input type="file" onChange={e => setInfoForm({...infoForm, file: e.target.files[0]})} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer" />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={isSubmittingInfo} className="w-full bg-slate-950 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all text-xs uppercase tracking-wider">
                  {isSubmittingInfo ? 'Memproses...' : 'Publikasikan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVBAR (Gaya M-Banking Profesional) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-200 z-50 px-4 py-2 flex justify-around items-center shadow-[0_-4px_24px_-10px_rgba(0,0,0,0.15)]">
        
        {/* Tombol Home */}
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5 text-amber-500 flex-1 py-1">
          <LayoutDashboard size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
        </button>

        {/* Tombol Task Management */}
        <button onClick={() => navigate('/TaskManagement')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-900 transition-colors flex-1 py-1">
          <ClipboardList size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Tasks</span>
        </button>

        {/* Tombol Recruitment: HANYA MUNCUL DI HP JIKA USER MEMILIKI AKSES */}
        {canAccessRecruitment() && (
          <button onClick={() => navigate('/recruitment-admin')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-900 transition-colors flex-1 py-1">
            <Users size={22} />
            <span className="text-[9px] font-bold uppercase tracking-wider">HRD</span>
          </button>
        )}

        {/* Tombol Settings Mobile: Selalu muncul untuk semua jenis akun di HP */}
        <button 
          onClick={() => { setIsSettingsModalOpen(true); setActiveSettingsTab('profile'); }} 
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-900 transition-colors flex-1 py-1"
        >
          <Settings size={22} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Setting</span>
        </button>
      </div>

    </div>
  );
};

export default PortalHome;