import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import { 
  ClipboardList, Users, LogOut, Settings, X, Search, LayoutDashboard, ImagePlus, 
  Trash2, Calendar, UserCircle, RefreshCw, KeyRound, ShieldAlert, Bell, BellOff, // <-- Tambahkan BellOff
  Paperclip, PlusCircle, CreditCard, FileText, Car, Store, Mail, MessageSquare, CheckSquare
} from 'lucide-react';
import { supabase } from '../supabase'; 
import * as XLSX from 'xlsx';

const PortalHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');

  // Tambahkan di area deklarasi state (di bawah state pengguna/pencarian)
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Menghitung jumlah notifikasi yang belum dibaca
  const unreadNotifsCount = notifications.filter(n => !n.read_status).length;
  
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

  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  // ==========================================
  // FITUR: PREFERENSI NOTIFIKASI PER MENU
  // ==========================================
  const [menuNotifPrefs, setMenuNotifPrefs] = useState({
    task: true,
    mail: true,
    payslip: true,
    finance: true,
    hrd: true
  });

  // Load preferensi saat user login
  useEffect(() => {
    if (user?.id) { 
      try {
        OneSignal.init({
          appId: "69d9f780-2a9f-4490-8aef-a7e8fa96fe2f",
        }).then(() => {
          OneSignal.login(String(user.id)); 
        });
      } catch (error) {
        console.error("OneSignal Error:", error);
      }
    }
  }, [user]);

  // Fungsi toggle per menu
  const handleToggleMenuNotif = async (e, menuKey, menuName) => {
    e.stopPropagation(); // Mencegah klik tombol memicu navigasi ke menu

    // Jika user menyalakan notif tapi izin browser belum ada
    if (!menuNotifPrefs[menuKey] && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await handleAllowNotification(); // Fungsi bawaan Anda untuk generate token
      } else {
        alert("Izin notifikasi browser belum diberikan. Silakan izinkan di pengaturan browser Anda.");
        return;
      }
    }

    // Update state dan LocalStorage
    const newPrefs = { ...menuNotifPrefs, [menuKey]: !menuNotifPrefs[menuKey] };
    setMenuNotifPrefs(newPrefs);
    localStorage.setItem(`syntegra_notif_prefs_${user.id}`, JSON.stringify(newPrefs));
  };

  // ==========================================
  //     FITUR: SLIP GAJI PRIBADI KARYAWAN
  // ==========================================
  const [myPayslips, setMyPayslips] = useState([]);
  const [showMyPayslipsModal, setShowMyPayslipsModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // ==========================================
  //     FITUR BARU: HITUNG KENDARAAN PASAR
  // ==========================================
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [motorIn, setMotorIn] = useState(0);
  const [motorOut, setMotorOut] = useState(0);
  const [motorInNoTicket, setMotorInNoTicket] = useState(0);
  const [motorOutNoTicket, setMotorOutNoTicket] = useState(0);
  const [mobilIn, setMobilIn] = useState(0);
  const [mobilOut, setMobilOut] = useState(0);
  const [mobilInNoTicket, setMobilInNoTicket] = useState(0);
  const [mobilOutNoTicket, setMobilOutNoTicket] = useState(0);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [marketNote, setMarketNote] = useState('');
  const [marketList, setMarketList] = useState([]);
  const [newMarketName, setNewMarketName] = useState('');

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  // Fungsi mengambil data pengumuman
  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('portal_announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  // Fungsi Fetch Daftar Pasar dari Database
  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase.from('portal_markets').select('id, name').order('name', { ascending: true });
      if (data && !error) {
        setMarketList(data);
      }
    } catch (err) {
      console.log("Belum ada tabel portal_markets atau terjadi error:", err);
    }
  };

  // Pengecekan status notifikasi setiap kali login / refresh
  useEffect(() => {
    if ("Notification" in window) {
      // Jika belum diizinkan ATAU malah diblokir, paksa munculkan modal
      if (Notification.permission === "default" || Notification.permission === "denied") {
        setShowNotifPrompt(true); 
      } else {
        setShowNotifPrompt(false);
      }
    } else {
      alert("Peringatan Sistem: Browser HP ini tidak mendukung Notifikasi. Pastikan Anda menggunakan Google Chrome / Safari terbaru.");
    }
  }, []);

  // Fungsi saat tombol Izinkan diklik
  const handleAllowNotification = async () => {
    try {
      // Meminta izin lewat OneSignal
      await OneSignal.Notifications.requestPermission();
      
      // Cek apakah karyawan mengeklik "Allow" atau "Block" di browser
      if (Notification.permission === "granted") {
        setShowNotifPrompt(false);
        // FORCE REFRESH: Otomatis memuat ulang halaman agar update terbaru Vercel masuk
        window.location.reload(); 
      } else if (Notification.permission === "denied") {
        // Jika ditolak, modal tetap menahan layar (tidak bisa ditutup)
        setShowNotifPrompt(true);
      }
    } catch (error) {
      console.error("Gagal meminta izin:", error);
    }
  };
  
  // Opsional: Hapus token saat logout agar tidak menerima notif jika sudah "tidak login"
  const handleLogout = async () => {
    if (user?.id) {
      await supabase.from('initial_users').update({ fcm_token: null }).eq('id', user.id);
    }
    localStorage.removeItem('syntegra_user_session');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  // Fungsi Tambah Informasi
  const handleAddInfo = async (e) => {
    e.preventDefault();
    setIsSubmittingInfo(true);
    try {
      let attachmentUrl = null;
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

      const { error } = await supabase.from('portal_announcements').insert([{
        title: infoForm.title,
        content: infoForm.content,
        attachment_url: attachmentUrl,
        author_id: user.id
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
    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));
    if (!session?.id) return;

    const { data, error } = await supabase
      .from('initial_users')
      .select('*')
      .eq('id', session.id)
      .single();

    if (!error && data) {
      setUser(data);
      localStorage.setItem('syntegra_user_session', JSON.stringify(data));
      
      const { data: payslipData, error: payslipError } = await supabase
        .from('finance_payroll')
        .select('*')
        .eq('user_id', data.id)
        .eq('status', 'PAID')
        .order('period_month', { ascending: false });
      
      if (payslipError) {
        console.error("Gagal menarik data slip:", payslipError);
      }
      
      if (payslipData && payslipData.length > 0) {
        const gabunganSlipGaji = payslipData.map(slip => ({
          ...slip,
          initial_users: {
            name: data.name,
            nik: data.nik,
            division: data.division,
            position: data.position
          }
        }));
        setMyPayslips(gabunganSlipGaji);
      } else {
        setMyPayslips([]);
      }
    }
  };

  const updatePermission = async (userId, field, value) => {
    await fetchUsers();
    await refreshUserData();

    const { error } = await supabase
      .from('initial_users')
      .update({ [field]: value })
      .eq('id', userId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchUsers();
  };

  useEffect(() => {
    refreshUserData();
    fetchAnnouncements();
    fetchMarkets();

    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));

    if (session?.role === 'admin') fetchUsers();

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('id-ID', dateOptions));
    fetchBanners(); 
  }, []);

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
    if (user?.role !== 'admin' && user?.can_manage_hrd_users !== true) {
      alert('Anda tidak memiliki hak mengelola akses');
      return;
    }
    try {
      const newStatus = !targetUser.has_portal_access;
      const { error } = await supabase.from('initial_users').update({ has_portal_access: newStatus }).eq('id', targetUser.id);
      if (error) throw error;
      await fetchUsers();
      alert(`${targetUser.name} ${newStatus ? 'berhasil diberikan akses HRD' : 'berhasil dicabut akses HRD'}`);
    } catch (err) {
      alert('Gagal mengubah akses: ' + err.message);
    }
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
      const { error } = await supabase.from('initial_users').update({ password: newPassword }).eq('id', user.id);
      if (error) throw error;

      setPasswordSuccess('Password Akun Anda berhasil diperbarui!');
      
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

  // --- LOGIC SIMPAN DAN CETAK EXCEL HITUNG PASAR ---
  const handleSaveMarketCount = async () => {
    if (!selectedMarket) return alert('Silakan pilih atau ketik nama pasar terlebih dahulu!');
    if (motorIn === 0 && motorOut === 0 && motorInNoTicket === 0 && motorOutNoTicket === 0 && mobilIn === 0 && mobilOut === 0 && mobilInNoTicket === 0 && mobilOutNoTicket === 0) return alert('Perhitungan masih 0, tidak ada yang perlu disimpan.');

    try {
      // 1. Export Excel menggunakan library xlsx
      const header = ["Nama Pasar", "Motor IN", "Motor OUT", "Motor IN (Non Karcis)", "Motor OUT (Non Karcis)", "Mobil IN", "Mobil OUT", "Mobil IN (Non Karcis)", "Mobil OUT (Non Karcis)", "Nama PIC", "Keterangan Tambahan", "Tanggal Perhitungan"];
      const dateStr = new Date().toLocaleString('id-ID');
      const dataRow = [selectedMarket, motorIn, motorOut, motorInNoTicket, motorOutNoTicket, mobilIn, mobilOut, mobilInNoTicket, mobilOutNoTicket, user.name, marketNote, dateStr];
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, dataRow]);
      
      // Mengatur lebar kolom agar rapi saat dibuka di Excel
      ws['!cols'] = [{wch: 25}, {wch: 12}, {wch: 12}, {wch: 22}, {wch: 22}, {wch: 12}, {wch: 12}, {wch: 22}, {wch: 22}, {wch: 25}, {wch: 40}, {wch: 25}];
      
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Parkir");
      
      // Bersihkan nama file dari karakter aneh
      const safeMarketName = selectedMarket.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Laporan_Parkir_${safeMarketName}_${Date.now()}.xlsx`;
      
      XLSX.writeFile(wb, fileName);

      // 2. (Opsional) Simpan ke Database Supabase
      const { error } = await supabase.from('market_parking_logs').insert([{
          market_name: selectedMarket,
          motor_in: motorIn,
          motor_out: motorOut,
          motor_in_no_ticket: motorInNoTicket,
          motor_out_no_ticket: motorOutNoTicket,
          mobil_in: mobilIn,
          mobil_out: mobilOut,
          mobil_in_no_ticket: mobilInNoTicket,
          mobil_out_no_ticket: mobilOutNoTicket,
          pic_name: user.name,
          notes: marketNote
      }]);

      if (error) {
         console.warn('Data berhasil di-export ke Excel, namun gagal dicadangkan ke Cloud DB:', error.message);
         alert('Excel berhasil di-download! (Note: Gagal backup ke database)');
      } else {
         alert('Laporan berhasil disimpan dan di-download dalam format Excel!');
      }

      // 3. Reset Perhitungan Menjadi Nol Kembali
      setMotorIn(0);
      setMotorOut(0);
      setMotorInNoTicket(0);
      setMotorOutNoTicket(0);
      setMobilIn(0);
      setMobilOut(0);
      setMobilInNoTicket(0);
      setMobilOutNoTicket(0);
      setMarketNote('');
      // Membiarkan selectedMarket tetap ada agar PIC bisa langsung hitung sesi selanjutnya jika mau.
      
    } catch (err) {
      alert('Terjadi kesalahan sistem saat proses export: ' + err.message);
    }
  };

  const handleAddMarket = async (e) => {
    e.preventDefault();
    if(!newMarketName) return;
    try {
      const { error } = await supabase.from('portal_markets').insert([{ name: newMarketName }]);
      if (error) throw error;
      setNewMarketName('');
      fetchMarkets();
      alert('Nama pasar baru berhasil ditambahkan ke dalam opsi!');
    } catch (error) {
      alert('Gagal menambah pasar: ' + error.message);
    }
  };

  const deleteMarket = async (id) => {
    if(!window.confirm('Yakin ingin menghapus pasar ini dari opsi?')) return;
    const { error } = await supabase.from('portal_markets').delete().eq('id', id);
    if (!error) fetchMarkets();
  };

  // Fungsi mengambil notifikasi
  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', user.id)
      .order('id', { ascending: false });

    if (data && !error) {
      setNotifications(data);
    }
  };

  // Effect untuk Realtime & Pop-up Browser
  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();

    const notifChannel = supabase
      .channel('portal-realtime-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        // Hanya proses jika notifikasi ditujukan untuk user yang sedang login
        if (String(payload.new.userId) === String(user.id)) {
          fetchNotifications();

          // 1. Putar Suara
          const notifSound = new Audio('/Notif_suara.mp3');
          notifSound.play().catch(e => console.log("Suara standby menunggu interaksi user"));

          // 2. Munculkan Pop-up Browser/Status Bar HP
          if ("Notification" in window && Notification.permission === "granted") {
            const notifTitle = payload.new.type === 'chat' ? "Pesan Baru" : "Notifikasi Sistem";
            new Notification(notifTitle, {
              body: payload.new.message,
              icon: '/Logo_apps.png',
              badge: '/Logo_apps.png',
              vibrate: [200, 100, 200]
            });
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => fetchNotifications())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  const handleReadNotification = async (notif) => {
    try {
      // Tandai sudah dibaca di database
      await supabase.from('notifications').update({ read_status: true }).eq('id', notif.id);
      fetchNotifications();
      
      setIsNotifOpen(false); // Tutup dropdown

      // Arahkan otomatis ke halaman yang sesuai
      if (notif.type === 'chat') {
        navigate('/communication');
      } else if (notif.taskId) {
        navigate(`/TaskManagement?taskId=${notif.taskId}`);
      } else {
        navigate('/TaskManagement');
      }
    } catch (err) {
      console.error("Gagal update notifikasi:", err);
    }
  };

  const handleReadAllNotifs = async () => {
    try {
      // Tandai semua notifikasi milik user ini sebagai terbaca
      await supabase.from('notifications').update({ read_status: true }).eq('userId', user.id);
      fetchNotifications();
    } catch (err) {
      console.error("Gagal membersihkan notifikasi:", err);
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
          
          <div className="flex items-center gap-2 md:gap-3">
  
          {/* LONCENG NOTIFIKASI */}
          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition-all text-slate-700 shadow-sm relative" title="Notifikasi">
              <Bell size={18} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* DROPDOWN NOTIFIKASI */}
            {isNotifOpen && (
              <>
                {/* Overlay transparan untuk menutup dropdown jika klik di luar */}
                <div className="fixed inset-0 z-[90]" onClick={() => setIsNotifOpen(false)}></div>
                
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fade-in">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="font-black text-slate-800 text-sm">Pusat Notifikasi</h4>
                    {unreadNotifsCount > 0 && (
                      <button onClick={handleReadAllNotifs} className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg uppercase transition-colors">
                        Tandai Semua Dibaca
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[60vh] md:max-h-80 overflow-y-auto custom-scrollbar bg-white">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Bell className="w-6 h-6 text-slate-300"/>
                        </div>
                        <p className="text-xs font-bold">Belum ada notifikasi.</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} onClick={() => handleReadNotification(notif)} className={`p-4 border-b border-slate-50 cursor-pointer flex gap-3 hover:bg-slate-50 transition-colors ${!notif.read_status ? 'bg-blue-50/10' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${notif.type === 'chat' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {notif.type === 'chat' ? <MessageSquare size={16} /> : <CheckSquare size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug line-clamp-2 ${!notif.read_status ? 'font-black text-slate-800' : 'font-medium text-slate-600'}`}>{notif.message}</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-bold">{notif.time}</p>
                          </div>
                          {!notif.read_status && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={() => { setIsSettingsModalOpen(true); setActiveSettingsTab('profile'); }} className="hidden md:block p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition-all text-slate-700 shadow-sm" title="Pengaturan Akun & Akses">
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

        {/* PENGUMUMAN */}
        {(announcements.length > 0 || canManageInfo) && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 px-2">
               <h3 className="font-black text-slate-800 text-sm md:text-lg flex items-center gap-2">
                 <Bell size={18} className="text-amber-500" /> Pengumuman
               </h3>
               {canManageInfo && (
                 <button onClick={() => setIsInfoModalOpen(true)} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all">
                   <PlusCircle size={14} /> Tambah Info
                 </button>
               )}
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((info) => (
                  <div key={info.id} className="bg-white border-l-4 border-amber-500 border-y border-r border-slate-200 p-4 md:p-5 rounded-r-2xl shadow-sm relative group transition-all hover:shadow-md">
                    {(user.role === 'admin' || (user.can_manage_portal_info && info.author_id === user.id)) && (
                      <button onClick={() => deleteInfo(info.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors" title="Hapus Informasi">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <h4 className="font-bold text-slate-900 text-sm md:text-base pr-8 mb-1">{info.title}</h4>
                    <p className="text-slate-600 text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{info.content}</p>
                    {info.attachment_url && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <a href={info.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg transition-colors">
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
            {banners.length > 0 ? (
              <div className="relative w-full h-auto bg-slate-100/50 rounded-3xl overflow-hidden shadow-md border border-slate-200 group flex items-center justify-center">
                <img src={banners[currentSlide].url} alt="Banner Internal" className="w-full h-auto object-contain transition-all duration-500 ease-in-out"/>
                {user.role === 'admin' && (
                   <button onClick={() => deleteBanner(banners[currentSlide].name)} className="absolute top-4 right-4 bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10" title="Hapus Banner Ini">
                     <Trash2 size={16} />
                   </button>
                )}
                {banners.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 bg-gradient-to-t from-black/20 to-transparent pt-4 pb-2">
                    {banners.map((_, idx) => (
                      <div key={idx} onClick={() => setCurrentSlide(idx)} className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentSlide ? 'bg-amber-400 w-6' : 'bg-white/60 w-1.5 hover:bg-white'}`}/>
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

        <h3 className="font-black text-slate-800 text-sm md:text-lg mb-4 px-2">Menu Layanan</h3>
        
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
          
          {/* MENU TASK MANAGEMENT */}
          <div onClick={() => navigate('/TaskManagement')} className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-950 text-amber-400 rounded-2xl flex items-center justify-center shadow-sm">
                <ClipboardList size={24} strokeWidth={2.5} />
              </div>
              <button 
                onClick={(e) => handleToggleMenuNotif(e, 'task', 'Task Management')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all z-10 border ${menuNotifPrefs.task ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                title={menuNotifPrefs.task ? "Matikan Notifikasi Task" : "Nyalakan Notifikasi Task"}
              >
                {menuNotifPrefs.task ? <Bell size={12} /> : <BellOff size={12} />}
                <span className="hidden md:inline">{menuNotifPrefs.task ? 'Notif Aktif' : 'Notif Mati'}</span>
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Task Management</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 flex-1">Kelola dan pantau seluruh laporan target kinerja divisi operasional harian.</p>
            <span className="font-bold text-xs text-amber-600 group-hover:underline mt-auto">Buka Dashboard &rarr;</span>
          </div>

          {/* MENU COMMUNICATION / INTERNAL MAIL */}
          <div onClick={() => navigate('/communication')} className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-sm">
                <Mail size={24} strokeWidth={2.5} />
              </div>
              <button 
                onClick={(e) => handleToggleMenuNotif(e, 'mail', 'Pesan Internal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all z-10 border ${menuNotifPrefs.mail ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
              >
                {menuNotifPrefs.mail ? <Bell size={12} /> : <BellOff size={12} />}
                <span className="hidden md:inline">{menuNotifPrefs.mail ? 'Notif Aktif' : 'Notif Mati'}</span>
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Pesan Internal (Mail)</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 flex-1">Kirim instruksi, koordinasi dengan divisi lain, dan tautkan langsung laporan tugas Anda ke dalam pesan.</p>
            <span className="font-bold text-xs text-indigo-600 group-hover:underline mt-auto">Buka Kotak Masuk &rarr;</span>
          </div>

          {/* MENU SLIP GAJI */}
          <div onClick={() => setShowMyPayslipsModal(true)} className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-sm">
                <FileText size={24} strokeWidth={2.5} />
              </div>
              <button 
                onClick={(e) => handleToggleMenuNotif(e, 'payslip', 'Slip Gaji')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all z-10 border ${menuNotifPrefs.payslip ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
              >
                {menuNotifPrefs.payslip ? <Bell size={12} /> : <BellOff size={12} />}
                <span className="hidden md:inline">{menuNotifPrefs.payslip ? 'Notif Aktif' : 'Notif Mati'}</span>
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Slip Gaji Saya</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 flex-1">Lihat dan unduh riwayat slip gaji bulanan Anda yang telah diterbitkan perusahaan.</p>
            <span className="font-bold text-xs text-blue-600 group-hover:underline mt-auto">Buka Slip Gaji &rarr;</span>
          </div>

          {/* MENU FINANCE */}
          {(user.can_access_finance || user.role === 'admin' || user.role === 'direksi') && (
            <div onClick={() => navigate('/finance')} className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-sm">
                  <CreditCard size={24} strokeWidth={2.5} />
                </div>
                <button 
                  onClick={(e) => handleToggleMenuNotif(e, 'finance', 'Finance')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all z-10 border ${menuNotifPrefs.finance ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                >
                  {menuNotifPrefs.finance ? <Bell size={12} /> : <BellOff size={12} />}
                  <span className="hidden md:inline">{menuNotifPrefs.finance ? 'Notif Aktif' : 'Notif Mati'}</span>
                </button>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Modul Finance</h3>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 flex-1">Kelola arus kas, penggajian (payroll), tagihan klien, dan validasi reimbursement.</p>
              <span className="font-bold text-xs text-emerald-600 group-hover:underline mt-auto">Buka Keuangan &rarr;</span>
            </div>
          )}

          {/* MENU HRD */}
          {canAccessRecruitment() && (
            <div onClick={() => navigate('/recruitment-admin')} className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-yellow-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-sm">
                  <Users size={24} strokeWidth={2.5} />
                </div>
                <button 
                  onClick={(e) => handleToggleMenuNotif(e, 'hrd', 'HRD')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all z-10 border ${menuNotifPrefs.hrd ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                >
                  {menuNotifPrefs.hrd ? <Bell size={12} /> : <BellOff size={12} />}
                  <span className="hidden md:inline">{menuNotifPrefs.hrd ? 'Notif Aktif' : 'Notif Mati'}</span>
                </button>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Menu HRD</h3>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 flex-1">Database screening pelamar, kuesioner fisik, uji kompetensi, dan plotting penempatan.</p>
              <span className="font-bold text-xs text-amber-600 group-hover:underline mt-auto">Masuk Modul HRD &rarr;</span>
            </div>
          )}

          {/* MENU PARKIR */}
          {(user.pkr_access_menu || user.role === 'admin' || user.role === 'direksi') && (
            <div onClick={() => navigate('/parking')} className="group bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-purple-500 text-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Car size={24} strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Modul Parkir</h3>
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-6 flex-1">Kelola laporan harian, pantau grafik income per shift dan bulanan secara realtime.</p>
              <span className="font-bold text-xs text-purple-600 group-hover:underline mt-auto">Buka Dashboard Parkir &rarr;</span>
            </div>
          )}

        </div>
      </main>

      {/* MODAL SETTINGS & AKSES */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">PENGATURAN KONTROL PORTAL</h3>
                <p className="text-xs text-slate-500">Kelola akun pribadi Anda dan hak keamanan sistem</p>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 overflow-x-auto custom-scrollbar">
              <button onClick={() => setActiveSettingsTab('profile')} className={`py-3 px-4 whitespace-nowrap text-xs font-black tracking-wider uppercase border-b-2 transition-all ${activeSettingsTab === 'profile' ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-400'}`}>
                Keamanan Akun
              </button>
              {(user?.role === 'admin' || user?.can_manage_hrd_users === true) && (
                <button onClick={() => setActiveSettingsTab('access')} className={`py-3 px-4 whitespace-nowrap text-xs font-black tracking-wider uppercase border-b-2 transition-all ${activeSettingsTab === 'access' ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-400'}`}>
                  Kelola Akses
                </button>
              )}
              {/* {user?.role === 'admin' && (
                <button onClick={() => setActiveSettingsTab('markets')} className={`py-3 px-4 whitespace-nowrap text-xs font-black tracking-wider uppercase border-b-2 transition-all ${activeSettingsTab === 'markets' ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-400'}`}>
                  Daftar Pasar
                </button>
              )} */}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-8 bg-white custom-scrollbar">
              {activeSettingsTab === 'profile' && (
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md mx-auto py-2">
                  <div className="text-center mb-6"><p className="text-xs text-slate-500 font-medium">Demi keamanan, ganti kata sandi Anda secara berkala secara rahasia.</p></div>
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

              {/* TAB ADMIN: DAFTAR PASAR */}
              {activeSettingsTab === 'markets' && user?.role === 'admin' && (
                <div className="space-y-4 max-w-md mx-auto py-2">
                   <div className="text-center mb-6">
                     <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3"><Store size={24}/></div>
                     <h4 className="font-black text-slate-900 text-sm">Input Dropdown Pasar</h4>
                     <p className="text-xs text-slate-500 mt-1">Tambahkan opsi daftar nama pasar yang bisa dipilih oleh PIC saat melakukan perhitungan parkir.</p>
                   </div>
                   
                   <form onSubmit={handleAddMarket} className="flex gap-2 relative">
                      <input required type="text" value={newMarketName} onChange={e => setNewMarketName(e.target.value)} placeholder="Ketik Nama Pasar Baru..." className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500 text-sm shadow-sm"/>
                      <button type="submit" className="bg-purple-600 text-white px-5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-purple-700 transition shadow-md whitespace-nowrap">Tambah</button>
                   </form>

                   <div className="mt-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Daftar Pasar Aktif</h5>
                      <div className="space-y-2">
                        {marketList.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Belum ada pasar yang ditambahkan.</p>}
                        {marketList.map((m) => (
                            <div key={m.id || m.name} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                                <span className="font-bold text-sm text-slate-800">{m.name}</span>
                                <button onClick={() => deleteMarket(m.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Hapus"><Trash2 size={16}/></button>
                            </div>
                        ))}
                      </div>
                   </div>
                </div>
              )}

              {activeSettingsTab === 'access' && (user?.role === 'admin' || user?.can_manage_hrd_users === true) && (
                <div className="space-y-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" placeholder="Ketik nama karyawan untuk mencari..." onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-amber-500 text-xs md:text-sm"/>
                  </div>
                  <div className="space-y-2">
                    {allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                      <div key={u.id} className="flex flex-col p-4 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 transition-all gap-3">
                        <div className="flex sm:items-center justify-between">
                            <div>
                              <p className="font-black text-xs md:text-sm text-slate-900">{u.name}</p>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{u.role} • {u.division || 'Umum'} • NIK: {u.nik || '-'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                             
                             {/* TAMBAHAN MENU HITUNG PASAR */}
                             <div className="col-span-2 md:col-span-3 h-px bg-slate-200 my-1"></div>
                             <div className="col-span-2 md:col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Akses Operasional Lapangan</div>
                             {/* <label className="flex items-center gap-2 cursor-pointer bg-purple-50/50 px-2 py-1.5 rounded-lg border border-purple-200">
                                <input type="checkbox" checked={u.can_access_market_counter || false} onChange={(e) => updatePermission(u.id, 'can_access_market_counter', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-800">Akses Hitung Parkir Pasar</span>
                             </label> */}
                             <div className="col-span-2 md:col-span-3 h-px bg-slate-200 my-1"></div>

                             {/* --- KUSTOMISASI AKSES MODUL PARKIR --- */}
                             <div className="col-span-2 md:col-span-3 h-px bg-slate-200 my-1"></div>
                             <div className="col-span-2 md:col-span-3 text-[9px] font-black text-purple-600 uppercase tracking-widest">Akses Modul Parkir</div>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_access_menu || false} onChange={(e) => updatePermission(u.id, 'pkr_access_menu', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Akses Menu Parkir</span>
                             </label>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_submit_report || false} onChange={(e) => updatePermission(u.id, 'pkr_submit_report', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Input Data Laporan</span>
                             </label>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_view_dashboard || false} onChange={(e) => updatePermission(u.id, 'pkr_view_dashboard', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Dashboard Grafik</span>
                             </label>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_view_daily || false} onChange={(e) => updatePermission(u.id, 'pkr_view_daily', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Lihat Data Harian</span>
                             </label>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_view_shift || false} onChange={(e) => updatePermission(u.id, 'pkr_view_shift', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Lihat Data Shift</span>
                             </label>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_view_monthly || false} onChange={(e) => updatePermission(u.id, 'pkr_view_monthly', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Lihat Data Bulanan</span>
                             </label>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-purple-50 transition-colors">
                                <input type="checkbox" checked={u.pkr_view_global || false} onChange={(e) => updatePermission(u.id, 'pkr_view_global', e.target.checked)} className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Data Global (Semua)</span>
                             </label>
                             <div className="col-span-2 md:col-span-3 h-px bg-slate-200 my-1"></div>

                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.has_portal_access || false} onChange={(e) => updatePermission(u.id, 'has_portal_access', e.target.checked)} className="w-3.5 h-3.5"/>
                                <span className="text-[10px] font-bold text-slate-700">Akses HRD</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_create_hrd || false} onChange={(e) => updatePermission(u.id, 'can_create_hrd', e.target.checked)} className="w-3.5 h-3.5"/>
                                <span className="text-[10px] font-bold text-slate-700">Akses Buat Data</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_edit_hrd || false} onChange={(e) => updatePermission(u.id, 'can_edit_hrd', e.target.checked)} className="w-3.5 h-3.5"/>
                                <span className="text-[10px] font-bold text-slate-700">Akses Edit Data</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_delete_hrd || false} onChange={(e) => updatePermission(u.id, 'can_delete_hrd', e.target.checked)} className="w-3.5 h-3.5"/>
                                <span className="text-[10px] font-bold text-slate-700">Akses Hapus Data</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_manage_hrd_users || false} onChange={(e) => updatePermission(u.id, 'can_manage_hrd_users', e.target.checked)} className="w-3.5 h-3.5"/>
                                <span className="text-[10px] font-bold text-slate-700">Kelola Akses Management Users</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_manage_portal_info || false} onChange={(e) => updatePermission(u.id, 'can_manage_portal_info', e.target.checked)} className="w-3.5 h-3.5"/>
                                <span className="text-[10px] font-bold text-slate-700">Kelola Info</span>
                             </label>

                              <div className="col-span-2 md:col-span-3 h-px bg-slate-200 my-1"></div>
                              <div className="col-span-2 md:col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Akses Sub-Menu HRD</div>

                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_recruitment || false} onChange={(e) => updatePermission(u.id, 'can_access_recruitment', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu Recruitment</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_hris || false} onChange={(e) => updatePermission(u.id, 'can_access_hris', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu HRIS</span>
                              </label>

                              <div className="col-span-2 md:col-span-3 h-px bg-slate-200 my-1"></div>
                              <div className="col-span-2 md:col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Akses Sub-Menu Finance</div>

                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_finance_dashboard || false} onChange={(e) => updatePermission(u.id, 'can_access_finance_dashboard', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu Dashboard</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_finance || false} onChange={(e) => updatePermission(u.id, 'can_access_finance', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Akses Modul</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_manage_cashflow || false} onChange={(e) => updatePermission(u.id, 'can_manage_cashflow', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Kelola Arus Kas</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_manage_payroll || false} onChange={(e) => updatePermission(u.id, 'can_manage_payroll', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Kelola Payroll</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_manage_finance || false} onChange={(e) => updatePermission(u.id, 'can_manage_finance', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Kelola Invoice</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_approve_finance || false} onChange={(e) => updatePermission(u.id, 'can_approve_finance', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Hak Approval</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_cashflow || false} onChange={(e) => updatePermission(u.id, 'can_access_cashflow', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu Arus Kas</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_invoice || false} onChange={(e) => updatePermission(u.id, 'can_access_invoice', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu Invoice</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_finance_report || false} onChange={(e) => updatePermission(u.id, 'can_access_finance_report', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu Laporan</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                                <input type="checkbox" checked={u.can_access_finance_settings || false} onChange={(e) => updatePermission(u.id, 'can_access_finance_settings', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"/>
                                <span className="text-[10px] font-bold text-slate-700">Menu Setting</span>
                              </label>
                        </div>
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

      {/* MODAL HITUNG PARKIR PASAR */}
      {isMarketModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-purple-600 text-white shrink-0">
              <h3 className="font-black text-sm tracking-tight uppercase flex items-center gap-2">
                 <Car size={18} /> Kalkulator Parkir Pasar
              </h3>
              <button onClick={() => setIsMarketModalOpen(false)} className="text-purple-200 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-4 md:p-6 space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Dropdown Pilihan Pasar */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Pilih Lokasi Pasar</label>
                <select 
                  value={selectedMarket} 
                  onChange={e => setSelectedMarket(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-purple-500 appearance-none shadow-sm"
                >
                  <option value="" disabled>-- Pilih Area Pasar --</option>
                  {marketList.map((m) => (
                    <option key={m.id || m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
                {user.role === 'admin' && (
                  <p className="text-[9px] text-slate-400 mt-1.5">*Admin: Anda dapat menambah daftar pasar di menu Settings &gt; Daftar Pasar.</p>
                )}
              </div>

                            {/* Tombol Besar Counter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                
                {/* Blok Motor */}
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 md:p-5 shadow-sm">
                  <h4 className="font-black text-slate-800 mb-4 uppercase tracking-widest text-sm border-b border-slate-100 pb-3 text-center">🏍️ MOTOR</h4>
                  <div className="flex flex-col gap-3">
                     <div className="flex flex-col md:flex-row md:items-center bg-emerald-50/50 p-3 md:p-2.5 rounded-2xl border border-emerald-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-tight block">IN (Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMotorIn(Math.max(0, motorIn - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{motorIn}</span>
                          <button onClick={() => setMotorIn(motorIn + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row md:items-center bg-rose-50/50 p-3 md:p-2.5 rounded-2xl border border-rose-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-rose-700 uppercase tracking-widest leading-tight block">OUT (Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMotorOut(Math.max(0, motorOut - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{motorOut}</span>
                          <button onClick={() => setMotorOut(motorOut + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                     <div className="h-px bg-slate-100 my-1 md:my-0"></div>
                     <div className="flex flex-col md:flex-row md:items-center bg-amber-50/50 p-3 md:p-2.5 rounded-2xl border border-amber-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-amber-700 uppercase tracking-widest leading-tight block">IN (Non Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMotorInNoTicket(Math.max(0, motorInNoTicket - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{motorInNoTicket}</span>
                          <button onClick={() => setMotorInNoTicket(motorInNoTicket + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row md:items-center bg-orange-50/50 p-3 md:p-2.5 rounded-2xl border border-orange-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-orange-700 uppercase tracking-widest leading-tight block">OUT (Non Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMotorOutNoTicket(Math.max(0, motorOutNoTicket - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{motorOutNoTicket}</span>
                          <button onClick={() => setMotorOutNoTicket(motorOutNoTicket + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                  </div>
                </div>
                
                {/* Blok Mobil */}
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 md:p-5 shadow-sm">
                  <h4 className="font-black text-slate-800 mb-4 uppercase tracking-widest text-sm border-b border-slate-100 pb-3 text-center">🚗 MOBIL</h4>
                  <div className="flex flex-col gap-3">
                     <div className="flex flex-col md:flex-row md:items-center bg-emerald-50/50 p-3 md:p-2.5 rounded-2xl border border-emerald-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-tight block">IN (Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMobilIn(Math.max(0, mobilIn - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{mobilIn}</span>
                          <button onClick={() => setMobilIn(mobilIn + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row md:items-center bg-rose-50/50 p-3 md:p-2.5 rounded-2xl border border-rose-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-rose-700 uppercase tracking-widest leading-tight block">OUT (Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMobilOut(Math.max(0, mobilOut - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{mobilOut}</span>
                          <button onClick={() => setMobilOut(mobilOut + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                     <div className="h-px bg-slate-100 my-1 md:my-0"></div>
                     <div className="flex flex-col md:flex-row md:items-center bg-amber-50/50 p-3 md:p-2.5 rounded-2xl border border-amber-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-amber-700 uppercase tracking-widest leading-tight block">IN (Non Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMobilInNoTicket(Math.max(0, mobilInNoTicket - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{mobilInNoTicket}</span>
                          <button onClick={() => setMobilInNoTicket(mobilInNoTicket + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                     <div className="flex flex-col md:flex-row md:items-center bg-orange-50/50 p-3 md:p-2.5 rounded-2xl border border-orange-100 gap-2 md:gap-0">
                        <div className="w-full md:w-28 shrink-0 text-center md:text-left">
                           <span className="text-[11px] md:text-[10px] font-black text-orange-700 uppercase tracking-widest leading-tight block">OUT (Non Karcis)</span>
                        </div>
                        <div className="flex items-center flex-1 gap-2 md:gap-2 w-full">
                          <button onClick={() => setMobilOutNoTicket(Math.max(0, mobilOutNoTicket - 1))} className="flex-1 h-14 md:h-10 bg-white border-2 border-red-100 text-red-500 rounded-xl text-3xl md:text-xl font-black active:bg-red-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">-</button>
                          <span className="w-16 md:w-14 text-3xl md:text-2xl font-black text-slate-900 text-center tabular-nums">{mobilOutNoTicket}</span>
                          <button onClick={() => setMobilOutNoTicket(mobilOutNoTicket + 1)} className="flex-1 h-14 md:h-10 bg-white border-2 border-emerald-100 text-emerald-500 rounded-xl text-3xl md:text-xl font-black active:bg-emerald-100 active:scale-95 transition-all shadow-sm select-none touch-manipulation">+</button>
                        </div>
                     </div>
                  </div>
                </div>

              </div>

              {/* Area Keterangan & Save */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Keterangan Tambahan PIC</label>
                  <textarea 
                    rows="2" 
                    value={marketNote} 
                    onChange={e => setMarketNote(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-purple-500" 
                    placeholder="Tuliskan catatan kondisi lapangan (cuaca, kendala, dll)..." 
                  />
                </div>
                
                <button 
                  onClick={handleSaveMarketCount} 
                  className="w-full bg-purple-600 text-white font-black py-4 rounded-xl hover:bg-purple-700 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  <FileText size={18} /> Simpan Data & Export Excel
                </button>
              </div>

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

      {/* --- MODAL PUSH NOTIFICATION --- */}
      {showNotifPrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center animate-fade-in-up border border-slate-200">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-inner">
              <Bell size={32} />
            </div>
            <h3 className="font-black text-slate-900 text-xl mb-2">Akses Notifikasi Wajib</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Sistem mewajibkan Anda mengaktifkan notifikasi agar tidak tertinggal instruksi tugas dan update operasional dari perusahaan.</p>
            
            {Notification.permission === "denied" ? (
               <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold mb-4 border border-red-200 text-left">
                 <span className="block font-black uppercase tracking-widest mb-1 text-center">Akses Terblokir 🔒</span>
                 Anda telah memblokir notifikasi sebelumnya. Silakan klik ikon <b>Gembok/Pengaturan</b> di samping kiri URL browser Anda (di bagian atas layar), lalu ubah izin Notifikasi menjadi <b>"Allow / Izinkan"</b>.
               </div>
            ) : (
               <div className="space-y-3">
                 <button onClick={handleAllowNotification} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1">
                   <Bell size={18}/> Aktifkan Sekarang
                 </button>
                 <p className="text-[10px] font-bold text-slate-400 mt-3">* Anda tidak dapat menutup layar ini sebelum izin diberikan.</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DAFTAR SLIP GAJI SAYA */}
      {/* ========================================== */}
      {showMyPayslipsModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white shrink-0">
              <div>
                <h3 className="font-black text-lg tracking-tight">Riwayat Slip Gaji</h3>
                <p className="text-[10px] text-blue-100 mt-0.5">Hanya menampilkan slip yang sudah disetujui (PAID).</p>
              </div>
              <button onClick={() => setShowMyPayslipsModal(false)} className="text-white hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              {myPayslips.length === 0 ? (
                <div className="text-center py-10">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3"/>
                  <p className="text-slate-500 font-bold text-sm">Belum ada slip gaji yang diterbitkan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPayslips.map(slip => (
                    <div key={slip.id} onClick={() => setSelectedPayslip(slip)} className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
                       <div>
                         <h4 className="font-black text-slate-800 text-sm">Periode {slip.period_month}</h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1">THP: <span className="text-emerald-600">{formatRupiah(slip.net_salary)}</span></p>
                       </div>
                       <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Buka</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL POP-UP DETAIL / CETAK SLIP GAJI */}
      {/* ========================================== */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
          
          <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col relative">
            
            {/* Header Aksi (TIDAK AKAN TAMPIL DI PDF) */}
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center z-10">
               <h3 className="font-black text-slate-800 flex items-center gap-2">
                 <FileText size={18} className="text-blue-600"/> Pratinjau Slip Gaji
               </h3>
               <div className="flex gap-2">
                  <button 
                     onClick={async () => {
                        // 1. Ambil elemen kertas slip gaji
                        const element = document.getElementById('official-payslip-print');
                        // 2. Load library html2pdf secara dinamis
                        const html2pdf = (await import('html2pdf.js')).default;
                        
                        // 3. Konfigurasi PDF
                        const opt = {
                          margin:       10,
                          filename:     `Slip_Gaji_${selectedPayslip.initial_users?.name}_${selectedPayslip.period_month}.pdf`,
                          image:        { type: 'jpeg', quality: 0.98 },
                          html2canvas:  { scale: 2, useCORS: true }, // scale: 2 agar kualitas gambar tidak pecah
                          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };
                        
                        // 4. Eksekusi Download
                        html2pdf().from(element).set(opt).save();
                     }} 
                     className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all"
                  >
                    <FileText size={16}/> Download PDF
                  </button>
                  <button onClick={() => setSelectedPayslip(null)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                    <X size={16}/> Tutup
                  </button>
               </div>
            </div>

            {/* KERTAS SLIP GAJI (AREA YANG AKAN DIJADIKAN PDF) */}
            <div id="official-payslip-print" className="p-8 md:p-12 bg-white text-black font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
               <div className="border-[3px] border-black p-4 mb-6 relative flex flex-col items-center justify-center bg-green-50/30">
                  <div className="absolute left-4 top-4 w-20 h-20 flex flex-col items-center justify-center">
                    <img src="/Logo_apps.png" alt="Logo" className="w-12 h-12 object-contain" />
                  </div>
                  <div className="text-center">
                     <h1 className="text-3xl font-black uppercase tracking-widest">PAY SLIP</h1>
                     <h2 className="text-xl font-medium mt-1 text-slate-800">PT Satria Wira Sriwijaya</h2>
                     <h3 className="text-lg font-bold mt-1 text-slate-900">{selectedPayslip.period_month}</h3>
                  </div>
               </div>

               <div className="mb-6 px-2">
                  <table className="text-sm font-medium">
                     <tbody>
                        <tr><td className="w-40 py-1 text-slate-700">Employee ID</td><td className="px-2">:</td><td className="font-bold">{selectedPayslip.initial_users?.nik || '-'}</td></tr>
                        <tr><td className="py-1 text-slate-700">Employee Name</td><td className="px-2">:</td><td className="font-bold">{selectedPayslip.initial_users?.name || '-'}</td></tr>
                        <tr><td className="py-1 text-slate-700">Position</td><td className="px-2">:</td><td className="font-bold">{selectedPayslip.initial_users?.position || '-'}</td></tr>
                        <tr><td className="py-1 text-slate-700">Area / Site</td><td className="px-2">:</td><td className="font-bold">{selectedPayslip.initial_users?.division || 'Pusat (HO)'}</td></tr>
                     </tbody>
                  </table>
               </div>

               <table className="w-full border-collapse border-[3px] border-black text-sm mb-8">
                  <thead>
                     <tr className="bg-blue-100 border-b-[3px] border-black">
                        <th className="border-r border-black p-2 text-center w-1/4 font-black">Earning</th>
                        <th className="border-r-[3px] border-black p-2 text-center w-1/4 font-black">Amount</th>
                        <th className="border-r border-black p-2 text-center w-1/4 font-black">Deductions</th>
                        <th className="p-2 text-center w-1/4 font-black">Amount</th>
                     </tr>
                  </thead>
                  <tbody>
                     {(() => {
                        const earnings = [{ name: 'Basic Salary', amount: selectedPayslip.base_salary }, ...(selectedPayslip.custom_details || []).filter(c => c.type === 'earning')];
                        const deductions = (selectedPayslip.custom_details || []).filter(c => c.type === 'deduction');
                        const totalEarning = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
                        const totalDeduction = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                        
                        const maxRows = Math.max(earnings.length, deductions.length) || 1; 
                        const rows = [];
                        
                        for (let i = 0; i < maxRows; i++) {
                           rows.push(
                              <tr key={i} className="border-b border-black align-top">
                                 <td className="border-r border-black p-2">{earnings[i] ? earnings[i].name : ''}</td>
                                 <td className="border-r-[3px] border-black p-2 text-right">{earnings[i] ? formatRupiah(earnings[i].amount).replace('Rp', '') : ''}</td>
                                 <td className="border-r border-black p-2">{deductions[i] ? deductions[i].name : ''}</td>
                                 <td className="p-2 text-right">{deductions[i] ? formatRupiah(deductions[i].amount).replace('Rp', '') : ''}</td>
                              </tr>
                           );
                        }
                        
                        return (
                           <>
                              {rows}
                              <tr className="border-t-[3px] border-black font-black">
                                 <td className="border-r border-black p-2">Total Earning</td>
                                 <td className="border-r-[3px] border-black p-2 text-right">{formatRupiah(totalEarning)}</td>
                                 <td className="border-r border-black p-2">Total Deductions</td>
                                 <td className="p-2 text-right">{formatRupiah(totalDeduction)}</td>
                              </tr>
                              <tr className="font-black bg-slate-50 border-t-[3px] border-black">
                                 <td colSpan="2" className="border-r-[3px] border-black p-2 bg-white"></td>
                                 <td className="border-r border-black p-3 text-base">Take Home Pay</td>
                                 <td className="p-3 text-right text-lg">{formatRupiah(selectedPayslip.net_salary)}</td>
                              </tr>
                           </>
                        );
                     })()}
                  </tbody>
               </table>

               <div className="mt-12 text-xs font-bold text-red-600 italic px-2">
                  <p>*This Pay Slip is computer generated printout and no signature required.</p>
                  <p>Please note that the contents of this statement should be treated with absolute confidential.</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVBAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-200 z-50 px-4 py-2 flex justify-around items-center shadow-[0_-4px_24px_-10px_rgba(0,0,0,0.15)]">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5 text-amber-500 flex-1 py-1"><LayoutDashboard size={22} /><span className="text-[9px] font-black uppercase tracking-wider">Home</span></button>
        <button onClick={() => navigate('/TaskManagement')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-900 transition-colors flex-1 py-1"><ClipboardList size={22} /><span className="text-[9px] font-bold uppercase tracking-wider">Tasks</span></button>
        {canAccessRecruitment() && (<button onClick={() => navigate('/recruitment-admin')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-900 transition-colors flex-1 py-1"><Users size={22} /><span className="text-[9px] font-bold uppercase tracking-wider">HRD</span></button>)}
        <button onClick={() => { setIsSettingsModalOpen(true); setActiveSettingsTab('profile'); }} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-900 transition-colors flex-1 py-1"><Settings size={22} /><span className="text-[9px] font-bold uppercase tracking-wider">Setting</span></button>
      </div>

    </div>
  );
};

export default PortalHome;