import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Search, Download, RefreshCw, QrCode, ArrowLeft, LogOut, X, User, MapPin, Briefcase, FileText, CheckCircle2, Archive, RotateCcw, Save, UserPlus, Edit, DownloadCloud, Trash2, Building2, Map, CheckSquare, Layers, Menu, ChevronDown, ChevronRight, Settings, PlusCircle } from 'lucide-react';

const AdminDashboard = ({ setAuth }) => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [masterSites, setMasterSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  
  // STATE NAVIGASI SIDEBAR & VIEW
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [currentView, setCurrentView] = useState({ module: 'RECRUITMENT', filter: 'PENDING', title: 'Pelamar Baru' });
  const [expandedMenus, setExpandedMenus] = useState({ recruitment: true, hris: false, regions: {} });
  
  // STATE FILTER GLOBAL
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJasa, setFilterJasa] = useState('');

  // STATE PLOTTING & MUTASI (SATUAN)
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [lokasiInput, setLokasiInput] = useState('');
  const [nikInput, setNikInput] = useState('');

  // STATE BULK MUTASI (MODAL BARU)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLokasi, setBulkLokasi] = useState('');

  // STATE EDIT PROFIL & BULK
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  const [user, setUser] = useState(
    JSON.parse(
      localStorage.getItem('syntegra_user_session')
    )
  );

  // STATE SETTINGS MASTER SITE (TAMBAH & EDIT) + KATEGORI KARYAWAN
  const [newSiteData, setNewSiteData] = useState({ region: '', name: '', info: '', kategori_karyawan: 'Pekerja Site' });
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [editSiteData, setEditSiteData] = useState({ region: '', name: '', info: '', kategori_karyawan: 'Pekerja Site' });

  useEffect(() => {
    const session = JSON.parse(
      localStorage.getItem('syntegra_user_session')
    );

    if (!session) {
      navigate('/');
      return;
    }

    const canAccess = session.has_portal_access === true;

    if (!canAccess) {
      alert('Anda tidak memiliki akses ke modul HRD');
      navigate('/');
      return;
    }

    fetchData();
  }, []);

  useEffect(() => { setSelectedIds([]); }, [currentView, searchTerm, filterJasa]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candRes, siteRes] = await Promise.all([
        supabase.from('candidates').select('*').order('created_at', { ascending: false }),
        supabase.from('master_sites').select('*').order('region', { ascending: true })
      ]);
      if (candRes.error) throw candRes.error;
      if (siteRes.error) throw siteRes.error;
      
      setCandidates(candRes.data || []);
      setMasterSites(siteRes.data || []);
    } catch (error) { alert("Gagal memuat data: " + error.message); } finally { setLoading(false); }
  };

  const handleRefresh = () => {
    setSearchTerm(''); setFilterJasa('');
    fetchData();
  };

  // --- LOGIKA MENU TOGGLE ---
  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };
  const toggleRegion = (region) => {
    setExpandedMenus(prev => ({ ...prev, regions: { ...prev.regions, [region]: !prev.regions[region] } }));
  };

  const handleNavClick = (module, filter, title) => {
    setCurrentView({ module, filter, title });
    if (window.innerWidth < 768) setIsSidebarOpen(false); 
  };

  // --- LOGIKA MASTER SITE (SETTINGS) ---
  const handleAddSite = async (e) => {
    if (!user?.can_create_hrd) {
      alert('Anda tidak memiliki hak tambah data');
      return;
    }
    e.preventDefault();
    try {
      const { error } = await supabase.from('master_sites').insert([newSiteData]);
      if (error) throw error;
      alert(`Cabang / Site "${newSiteData.name}" berhasil ditambahkan!`);
      setNewSiteData({ region: '', name: '', info: '', kategori_karyawan: 'Pekerja Site' });
      fetchData();
    } catch (error) { alert('Gagal menambah site: ' + error.message); }
  };

  const startEditSite = (site) => {
    setEditingSiteId(site.id);
    setEditSiteData({ 
      region: site.region, 
      name: site.name, 
      info: site.info || '',
      kategori_karyawan: site.kategori_karyawan || 'Pekerja Site' 
    });
  };

  // FITUR DIPERBARUI: Sync otomatis ke karyawan saat site di-update
  const handleUpdateSite = async (id) => {
    if (!user?.can_edit_hrd) {
      alert('Anda tidak memiliki hak edit data');
      return;
    }
    try {
      // Ambil nama site lama sebelum diupdate
      const originalSite = masterSites.find(s => s.id === id);

      const { error } = await supabase.from('master_sites').update(editSiteData).eq('id', id);
      if (error) throw error;

      // UPDATE MASSAL DATA KARYAWAN OTOMATIS
      if (originalSite && originalSite.name) {
        const { error: candError } = await supabase.from('candidates')
          .update({ 
             lokasi_penempatan: editSiteData.name, // Ikut ganti kalau nama site berubah
             kategori_karyawan: editSiteData.kategori_karyawan // Kategori disesuaikan
          })
          .eq('lokasi_penempatan', originalSite.name); // Cari karyawan di site lama
          
        if (candError) console.error("Gagal sinkronisasi kategori karyawan:", candError);
      }

      alert('Data Site diperbarui! Kategori seluruh karyawan di lokasi tersebut juga otomatis disesuaikan.');
      setEditingSiteId(null);
      fetchData(); // Refresh semua data (Sites dan Candidates)
    } catch (error) { alert('Gagal memperbarui data site: ' + error.message); }
  };

  const deleteSite = async (id, name) => {
    if (!user?.can_delete_hrd) {
      alert('Anda tidak memiliki hak hapus data');
      return;
    }
    if(!window.confirm(`Hapus Site "${name}" dari sistem?`)) return;
    try {
      const { error } = await supabase.from('master_sites').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) { alert('Gagal menghapus site: ' + error.message); }
  };

  // --- LOGIKA BULK ACTION ---
  const toggleSelectAll = (e, currentFilteredData) => {
    if (e.target.checked) setSelectedIds(currentFilteredData.map(c => c.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const bulkDeleteCandidates = async () => {
    if (!user?.can_delete_hrd) {
      alert('Anda tidak memiliki hak hapus data');
      return;
    }
    if(!window.confirm(`PERINGATAN: Hapus PERMANEN ${selectedIds.length} data yang dipilih?`)) return;
    try {
      const { error } = await supabase.from('candidates').delete().in('id', selectedIds);
      if (error) throw error;
      setCandidates(candidates.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      alert(`Berhasil menghapus ${selectedIds.length} data.`);
    } catch (error) {
      alert('Gagal menghapus data: ' + error.message);
    }
  };

  const bulkUpdateStatus = async (newStatus) => {
    if (!user?.can_edit_hrd) {
      alert('Anda tidak memiliki hak edit');
      return;
    }
    if(!window.confirm(`Pindahkan ${selectedIds.length} kandidat ke status ${newStatus}?`)) return;
    try {
      const { error } = await supabase.from('candidates').update({ status: newStatus }).in('id', selectedIds);
      if (error) throw error;
      setCandidates(candidates.map(c => selectedIds.includes(c.id) ? { ...c, status: newStatus } : c));
      setSelectedIds([]); alert(`Berhasil memindahkan ${selectedIds.length} kandidat ke ${newStatus}.`);
    } catch (error) { alert('Gagal update massal: ' + error.message); }
  };

  // LOGIKA DIPERBARUI: Eksekusi Mutasi Massal Otomatis Kategori
  const executeBulkMutasi = async () => {
    if (!user?.can_edit_hrd) {
      alert('Anda tidak memiliki hak mutasi / penempatan');
      return;
    }
    if (!bulkLokasi) {
      alert("Silakan pilih lokasi penempatan terlebih dahulu.");
      return;
    }
    
    // Cari kategori dari master site yang dipilih
    const selectedSite = masterSites.find(s => s.name === bulkLokasi);
    const targetKategori = selectedSite ? selectedSite.kategori_karyawan : 'Pekerja Site';

    if(!window.confirm(`Mutasi ${selectedIds.length} karyawan ke "${bulkLokasi}"? Kategori akan otomatis menjadi: ${targetKategori}`)) return;
    
    try {
      const payload = { 
        lokasi_penempatan: bulkLokasi, 
        kategori_karyawan: targetKategori 
      };
      const { error } = await supabase.from('candidates').update(payload).in('id', selectedIds);
      if (error) throw error;
      
      setCandidates(candidates.map(c => selectedIds.includes(c.id) ? { ...c, ...payload } : c));
      setSelectedIds([]); 
      setShowBulkModal(false);
      setBulkLokasi('');
      alert(`Berhasil memutasi ${selectedIds.length} karyawan.`);
    } catch (error) { 
      alert('Gagal mutasi data: ' + error.message); 
    }
  };

  // --- LOGIKA SATUAN ---
  const updateStatus = async (id, newStatus) => {
    if (!user?.can_edit_hrd) {
      alert('Anda tidak memiliki hak edit data');
      return;
    }
    if(!window.confirm(`Ubah status menjadi ${newStatus}?`)) return;
    try {
      const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setCandidates(candidates.map(c => c.id === id ? { ...c, status: newStatus } : c));
      setSelectedCandidate(null);
      setIsEditingProfile(false);
      alert('Status berhasil diubah.');
    } catch (error) { alert('Gagal mengupdate status: ' + error.message); }
  };

  // LOGIKA DIPERBARUI: Save Profil / Mutasi Satuan
  const saveCandidateInfo = async (id) => {
    if (!user?.can_edit_hrd) {alert('Anda tidak memiliki hak edit data'); return;}
    if(!window.confirm("Simpan perubahan Penempatan / Mutasi ini?")) return;
    try {
      // Cari kategori otomatis dari master site
      const selectedSite = masterSites.find(s => s.name === lokasiInput);
      const autoKategori = selectedSite ? selectedSite.kategori_karyawan : 'Pekerja Site';

      const payload = { lokasi_penempatan: lokasiInput, nik_karyawan: nikInput, kategori_karyawan: autoKategori };
      const { error } = await supabase.from('candidates').update(payload).eq('id', id);
      if (error) throw error;

      if (selectedCandidate.status === 'INTI' && selectedCandidate.nik_karyawan) {
         await supabase.from('initial_users').update({ nik: nikInput }).eq('nik', selectedCandidate.nik_karyawan);
      }
      alert('Data Mutasi berhasil disimpan!');
      setCandidates(candidates.map(c => c.id === id ? { ...c, ...payload } : c));
      setSelectedCandidate(null); setIsEditingProfile(false);
    } catch (error) { alert('Gagal menyimpan data: ' + error.message); }
  };

  const updateCandidateProfile = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('candidates').update(editProfileData).eq('id', selectedCandidate.id);
      if (error) throw error;
      
      if (selectedCandidate.status === 'INTI' && selectedCandidate.nik_karyawan) {
         await supabase.from('initial_users').update({ name: editProfileData.nama_lengkap, nik: editProfileData.nik_karyawan, division: editProfileData.bidang_jasa }).eq('nik', selectedCandidate.nik_karyawan); 
      }
      alert('Profil Karyawan berhasil diperbarui!');
      setCandidates(candidates.map(c => c.id === selectedCandidate.id ? { ...c, ...editProfileData } : c));
      setSelectedCandidate({ ...selectedCandidate, ...editProfileData }); setIsEditingProfile(false);
    } catch (error) { alert('Gagal memperbarui profil: ' + error.message); }
  };

  const syncToTaskManagement = async (candidate) => {
    if (!candidate.nik_karyawan) { alert("GAGAL: NIK Karyawan masih kosong!"); return; }
    if(!window.confirm(`Buatkan akun portal untuk ${candidate.nama_lengkap}?`)) return;
    try {
      const { data: existingUser } = await supabase.from('initial_users').select('nik').eq('nik', candidate.nik_karyawan).single();
      if (existingUser) { alert("Akun dengan NIK ini sudah terdaftar!"); return; }
      const payload = { nik: candidate.nik_karyawan, name: candidate.nama_lengkap, password: '12345678', role: 'staff', division: candidate.bidang_jasa || '', position: '', has_portal_access: false };
      const { error } = await supabase.from('initial_users').insert([payload]);
      if (error) throw error; alert(`SUKSES: Akun disinkronkan!`);
    } catch (error) { alert('Gagal sinkronisasi data: ' + error.message); }
  };

  const pullFromTaskManagement = async () => {
    if(!window.confirm("Tarik data dari Task Management ke Karyawan Inti HRIS?")) return;
    try {
      setLoading(true);
      const { data: tmUsers, error: tmErr } = await supabase.from('initial_users').select('*');
      if (tmErr) throw tmErr;

      const existingNiks = candidates.map(c => c.nik_karyawan).filter(Boolean);
      let newInserts = 0, failCount = 0;

      for (const u of tmUsers) {
        if (u.nik && !existingNiks.includes(u.nik)) {
          const payload = {
            nama_lengkap: u.name, nik_karyawan: u.nik, bidang_jasa: u.division || 'Umum', status: 'INTI',
            kategori_karyawan: 'Internal HO', lokasi_penempatan: 'Kantor Pusat (HO)', status_kontrak: 'Probation', tanggal_bergabung: new Date().toISOString().split('T')[0],
            nik_ktp: u.nik || '0000000000000000', no_hp: '000000000000', kewarganegaraan: 'WNI', jenis_kelamin: 'Laki-laki', tempat_lahir: '-', tanggal_lahir: new Date().toISOString().split('T')[0], agama: 'Islam', status_pernikahan: 'TK/0', golongan_darah: '-',
            alamat_lengkap: '-', tinggi_badan: 0, berat_badan: 0, ukuran_baju: 'M', ukuran_celana: '0', ukuran_sepatu: '0', bertato: 'Tidak', berkacamata: 'Tidak', patah_tulang: 'Tidak', riwayat_operasi: 'Tidak', sakit_serius: 'Tidak',
            bahasa_indonesia: 'Baik', bahasa_inggris: 'Cukup', bisa_berenang: 'Tidak', bisa_beladiri: 'Tidak', takut_tinggi: 'Tidak', info_lowongan: 'Internal', kenalan_syntegra: 'Tidak'
          };
          const { error } = await supabase.from('candidates').insert([payload]);
          if (error) failCount++; else newInserts++;
        }
      }
      if (newInserts > 0) { alert(`Berhasil! ${newInserts} karyawan lama ditarik.`); fetchData(); }
      else if (failCount > 0) alert(`Selesai, terdapat ${failCount} kegagalan.`);
      else alert(`Semua karyawan sudah ada di HRIS.`);
    } catch (error) { alert('Gagal menarik data: ' + error.message); } finally { setLoading(false); }
  };

  const safeParseJSON = (jsonStr) => { 
    if (!jsonStr) return []; 
    let parsed;
    if (typeof jsonStr === 'object') parsed = jsonStr;
    else try { parsed = JSON.parse(jsonStr); } catch (e) { return []; }
    return Array.isArray(parsed) ? parsed : []; 
  };

  const exportToExcel = () => {
    const dataToExport = displayData.map((c, index) => ({
      "No": index + 1, "Status Seleksi": c.status, "Kategori Karyawan": c.kategori_karyawan || 'Pekerja Site', "NIK Karyawan": c.nik_karyawan || 'Belum Ada', "Plotting Penempatan": c.lokasi_penempatan || 'Belum Diploting', "Bidang Jasa": c.bidang_jasa,
      "Nama Lengkap": c.nama_lengkap, "NIK KTP": c.nik_ktp, "Jenis Kelamin": c.jenis_kelamin, "No WhatsApp": c.no_hp
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data HRIS');
    XLSX.writeFile(workbook, `HR_SWS_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const groupedSites = masterSites.reduce((acc, site) => {
    if (!acc[site.region]) acc[site.region] = [];
    acc[site.region].push(site);
    return acc;
  }, {});

  let displayData = candidates;
  
  if (currentView.module === 'RECRUITMENT') {
    displayData = candidates.filter(c => c.status === currentView.filter); 
  } else if (currentView.module === 'HRIS') {
    displayData = candidates.filter(c => c.status === 'INTI'); 
    if (currentView.filter !== 'ALL') {
      displayData = displayData.filter(c => c.lokasi_penempatan === currentView.filter);
    }
  }

  if (searchTerm) displayData = displayData.filter(c => c.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || (c.nik_karyawan && c.nik_karyawan.includes(searchTerm)));
  if (filterJasa) displayData = displayData.filter(c => c.bidang_jasa === filterJasa);
  
  const isAllSelected = displayData.length > 0 && selectedIds.length === displayData.length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        {/* Logo Area */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950">S</div>
             <div>
                <h1 className="font-black text-white leading-tight">Syntegra<span className="text-amber-500">Hub</span></h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">HRIS System</p>
             </div>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
           <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-bold">
             <ArrowLeft size={16} className="text-amber-500"/> KEMBALI KE DASHBOARD UTAMA
           </button>

           <div className="my-2 border-t border-slate-800"></div>

           {/* MODULE: RECRUITMENT */}
           <div>
             <button onClick={() => toggleMenu('recruitment')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
                <div className="flex items-center gap-3 text-sm font-bold"><UserPlus size={16} className="text-blue-400"/> Recruitment</div>
                {expandedMenus.recruitment ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
             </button>
             {expandedMenus.recruitment && (
                <div className="ml-10 mt-1 space-y-1 border-l border-slate-800 pl-3">
                  <button onClick={() => handleNavClick('RECRUITMENT', 'PENDING', 'Pelamar Baru / Pending')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${currentView.module === 'RECRUITMENT' && currentView.filter === 'PENDING' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>Pelamar Baru</button>
                  <button onClick={() => handleNavClick('RECRUITMENT', 'BANK_DATA', 'Arsip Bank Data')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${currentView.module === 'RECRUITMENT' && currentView.filter === 'BANK_DATA' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>Bank Data</button>
                </div>
             )}
           </div>

           {/* MODULE: HRIS GROUPING BY CABANG/SITE */}
           <div className="mt-2">
             <button onClick={() => toggleMenu('hris')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
                <div className="flex items-center gap-3 text-sm font-bold"><Layers size={16} className="text-emerald-400"/> HRIS Karyawan</div>
                {expandedMenus.hris ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
             </button>
             {expandedMenus.hris && (
                <div className="ml-10 mt-1 space-y-1 border-l border-slate-800 pl-3">
                  <button onClick={() => handleNavClick('HRIS', 'ALL', 'Semua Karyawan Aktif')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors mb-2 ${currentView.module === 'HRIS' && currentView.filter === 'ALL' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-emerald-400'}`}>Semua Karyawan Inti</button>
                  
                  {Object.keys(groupedSites).map(region => (
                    <div key={region} className="mb-1">
                       <button onClick={() => toggleRegion(region)} className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                         {region} {expandedMenus.regions[region] ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                       </button>
                       {expandedMenus.regions[region] && (
                          <div className="ml-2 mt-1 space-y-1">
                            {groupedSites[region].map(site => (
                              <button 
                                key={site.id} 
                                onClick={() => handleNavClick('HRIS', site.name, `Site: ${site.name}`)}
                                className={`w-full text-left px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${currentView.module === 'HRIS' && currentView.filter === site.name ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span> {site.name}
                              </button>
                            ))}
                          </div>
                       )}
                    </div>
                  ))}
                </div>
             )}
           </div>

           <div className="my-2 border-t border-slate-800"></div>

           {/* MODULE: PENGATURAN SITE */}
           <div>
             <button onClick={() => handleNavClick('SETTINGS', 'MASTER_SITE', 'Pengaturan Master Cabang & Site')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${currentView.module === 'SETTINGS' ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Settings size={16}/> Pengaturan Site
             </button>
           </div>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden"></div>}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
        
        {/* HEADER TOP */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between z-10 shrink-0">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><Menu size={20}/></button>
             <div>
                <h2 className="font-black text-lg text-slate-800">{currentView.title}</h2>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">{currentView.module} MODULE</p>
             </div>
           </div>
           <div className="flex gap-2">
            <button 
              onClick={() => setShowQR(!showQR)}
              className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 md:px-4 md:py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <QrCode size={16}/> <span className="hidden md:inline">Generate QR</span>
            </button>
           </div>
        </header>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

          {/* QR CODE VIEW */}
          {showQR && (
            <div className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-200 mb-6 text-center flex flex-col items-center relative overflow-hidden max-w-4xl mx-auto animate-fade-in">
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-slate-800 font-bold text-sm">✕</button>
              </div>
              <h2 className="font-black text-slate-800 text-sm md:text-base mb-1">QR Code Pendaftaran Calon Karyawan</h2>
              <p className="text-[11px] text-slate-500 mb-4">Pelamar di site/lapangan dapat melakukan scan pada kode ini untuk mengisi formulir resmi</p>
              
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-3xl bg-white mb-4">
                <QRCodeCanvas id="qrCodeCanvas" value={`${window.location.origin}/FormRekrutmen`} size={160} level={"H"} />
              </div>
              
              <button 
                onClick={() => {
                  const canvas = document.getElementById("qrCodeCanvas");
                  if (canvas) {
                    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                    let downloadLink = document.createElement("a");
                    downloadLink.href = pngUrl;
                    downloadLink.download = "QR_Pendaftaran.png";
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                  }
                }} 
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 px-5 py-2.5 rounded-xl font-bold text-xs shadow transition-all"
              >
                Download Gambar QR (PNG)
              </button>
            </div>
          )}
          
          {/* ========================================================= */}
          {/* VIEW: SETTINGS DENGAN EDIT IN-LINE (PENGATURAN CABANG/SITE) */}
          {/* ========================================================= */}
          {currentView.module === 'SETTINGS' ? (
            <div className="max-w-5xl animate-fade-in">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-6">
                 <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><PlusCircle size={18} className="text-amber-500"/> Tambah Lokasi Cabang / Site Baru</h3>
                 {/* FORM TAMBAH LOKASI MODIFIED */}
                 <form onSubmit={handleAddSite} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Nama Cabang / Region</label>
                      <input type="text" value={newSiteData.region} onChange={e => setNewSiteData({...newSiteData, region: e.target.value})} placeholder="Cth: Jawa Barat" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Nama Spesifik Site</label>
                      <input type="text" value={newSiteData.name} onChange={e => setNewSiteData({...newSiteData, name: e.target.value})} placeholder="Cth: PTPN 1 Regional 1" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Info Tambahan</label>
                      <input type="text" value={newSiteData.info} onChange={e => setNewSiteData({...newSiteData, info: e.target.value})} placeholder="Cth: Perkebunan Sawit" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Kategori Karyawan Default</label>
                      <select value={newSiteData.kategori_karyawan} onChange={e => setNewSiteData({...newSiteData, kategori_karyawan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500 font-bold text-slate-700">
                         <option value="Pekerja Site">Pekerja Site / Client</option>
                         <option value="Internal HO">Internal Syntegra (HO)</option>
                      </select>
                    </div>
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition h-[42px]">Simpan Site</button>
                 </form>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-6 border-b border-slate-100"><h3 className="font-black text-slate-800">Daftar Lokasi Terdaftar</h3></div>
                 <table className="min-w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Region / Cabang</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Nama Site</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Info</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Kategori Karyawan</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterSites.map(site => (
                        <tr key={site.id} className="hover:bg-slate-50/50 transition-colors">
                          {editingSiteId === site.id ? (
                            /* --- ROW MODE EDIT (IN-LINE EDITING) --- */
                            <>
                              <td className="px-4 py-2">
                                <input type="text" value={editSiteData.region} onChange={e => setEditSiteData({...editSiteData, region: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-xs font-bold w-full focus:outline-none" />
                              </td>
                              <td className="px-4 py-2">
                                <input type="text" value={editSiteData.name} onChange={e => setEditSiteData({...editSiteData, name: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-xs font-black w-full focus:outline-none" />
                              </td>
                              <td className="px-4 py-2">
                                <input type="text" value={editSiteData.info} onChange={e => setEditSiteData({...editSiteData, info: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-xs w-full focus:outline-none" />
                              </td>
                              <td className="px-4 py-2">
                                <select value={editSiteData.kategori_karyawan} onChange={e => setEditSiteData({...editSiteData, kategori_karyawan: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-[11px] font-bold w-full focus:outline-none">
                                   <option value="Pekerja Site">Pekerja Site</option>
                                   <option value="Internal HO">Internal HO</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-center flex justify-center gap-1">
                                <button onClick={() => handleUpdateSite(site.id)} className="bg-emerald-500 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold shadow-sm">Simpan</button>
                                <button onClick={() => setEditingSiteId(null)} className="bg-slate-200 text-slate-700 text-[10px] px-2.5 py-1.5 rounded-lg font-bold">Batal</button>
                              </td>
                            </>
                          ) : (
                            /* --- ROW MODE LIHAT NORMAL --- */
                            <>
                              <td className="px-6 py-3.5 text-xs font-bold text-slate-700">{site.region}</td>
                              <td className="px-6 py-3.5 text-sm font-black text-slate-900">{site.name}</td>
                              <td className="px-6 py-3.5 text-xs text-slate-500">{site.info || '-'}</td>
                              <td className="px-6 py-3.5 text-xs font-bold">
                                {site.kategori_karyawan === 'Internal HO' ? <span className="bg-slate-900 text-white px-2 py-1 rounded-md text-[10px]">Internal HO</span> : <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-md text-[10px]">Pekerja Site</span>}
                              </td>
                              <td className="px-6 py-3.5 text-center flex justify-center gap-1">
                                <button onClick={() => startEditSite(site)} className="text-amber-600 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition" title="Koreksi Site"><Edit size={14}/></button>
                                <button onClick={() => deleteSite(site.id, site.name)} className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition"><Trash2 size={14}/></button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* FILTER BAR */}
              <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Pencarian Cepat</label>
                    <Search className="absolute left-3 top-[28px] text-slate-400" size={16} />
                    <input type="text" value={searchTerm} placeholder="Cari nama / NIK..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Filter Divisi</label>
                    <select value={filterJasa} onChange={(e) => setFilterJasa(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 text-slate-700 font-bold">
                      <option value="">Semua Divisi</option><option value="Security (Satpam)">Security</option><option value="Cleaning Service">Cleaning Service</option><option value="Parking Service">Parking</option><option value="Labour Supply (Tenaga Kerja)">Labour Supply</option>
                    </select>
                  </div>
                  <div className="flex gap-2 h-[42px]">
                    {currentView.module === 'HRIS' && (
                      <button onClick={pullFromTaskManagement} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-[10px] md:text-xs transition-colors shadow-sm px-2"><DownloadCloud size={14}/> <span className="hidden md:inline">Tarik dari TM</span></button>
                    )}
                    <button onClick={handleRefresh} className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl w-10 md:w-12 transition-colors shrink-0"><RefreshCw size={16}/></button>
                    <button onClick={exportToExcel} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[10px] md:text-xs transition-colors shadow-sm px-2"><Download size={14}/> Export</button>
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-[2rem] overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-blue-500 font-bold animate-pulse flex flex-col items-center"><RefreshCw className="animate-spin mb-2"/> Memuat Database...</div>
                ) : displayData.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center"><User size={32} className="mb-2 opacity-50"/> Tidak ada data yang sesuai filter.</div>
                ) : (
                  <div className="overflow-x-auto pb-10">
                    <table className="min-w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-4 w-10 text-center"><input type="checkbox" checked={isAllSelected} onChange={(e) => toggleSelectAll(e, displayData)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" /></th>
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{currentView.module === 'HRIS' ? 'Identitas Pegawai' : 'Profil Kandidat'}</th>
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Divisi & Kategori</th>
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">{currentView.module === 'HRIS' ? 'Penempatan & Kontrak' : 'Target Plotting'}</th>
                          <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.map((c) => (
                          <tr key={c.id} className={`transition-colors ${selectedIds.includes(c.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                            <td className="px-4 py-4 text-center align-top pt-5"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" /></td>
                            <td className="px-4 py-4">
                              <div className="font-black text-slate-900 text-sm">{c.nama_lengkap}</div>
                              {currentView.module === 'HRIS' ? (
                                <div className="text-[11px] font-bold text-blue-700 mt-1 flex items-center gap-1"><span className="bg-blue-100 px-2 py-0.5 rounded border border-blue-200">NIK: {c.nik_karyawan || 'Belum Diisi'}</span></div>
                              ) : (
                                <div className="text-[11px] font-medium text-slate-500 mt-0.5">{c.jenis_kelamin} • {c.tanggal_lahir}</div>
                              )}
                              <div className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> HP: {c.no_hp || '-'}</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-block bg-slate-100 text-slate-700 text-[10px] px-2 py-1 rounded-md font-bold mb-1.5 border border-slate-200">{c.bidang_jasa}</span>
                              {currentView.module === 'HRIS' ? (
                                <div className="mt-1">
                                  {c.kategori_karyawan === 'Internal HO' ? <span className="inline-flex items-center gap-1 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"><Building2 size={10}/> Karyawan Internal</span> : <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"><Map size={10}/> Pekerja Site</span>}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-500 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0"/> {c.alamat_domisili || '-'}</div>
                              )}
                              <div className="text-[11px] text-indigo-600 font-bold mt-1 md:hidden flex items-center gap-1">Loc: {c.lokasi_penempatan || '-'}</div>
                            </td>
                            <td className="px-4 py-4 hidden md:table-cell">
                              <div className="text-sm font-black text-slate-800">{c.lokasi_penempatan || <span className="text-slate-300 italic text-xs">Belum ditentukan</span>}</div>
                              {currentView.module === 'HRIS' && <div className="text-[10px] text-slate-500 font-bold mt-1">Status: <span className="text-emerald-600">{c.status_kontrak || 'Probation'}</span></div>}
                            </td>
                            <td className="px-4 py-4 text-center align-middle">
                              <button onClick={() => { setSelectedCandidate(c); setLokasiInput(c.lokasi_penempatan || ''); setNikInput(c.nik_karyawan || ''); setIsEditingProfile(false); setEditProfileData(c); }} className="bg-slate-100 hover:bg-slate-200 text-blue-700 border border-slate-200 text-xs px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm w-full md:w-auto">
                                Buka Profil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FLOATING ACTION BAR UNTUK BULK CHECKBOX */}
      {selectedIds.length > 0 && currentView.module !== 'SETTINGS' && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 md:px-6 py-3 md:py-4 rounded-full shadow-2xl flex items-center gap-3 md:gap-5 z-40 animate-fade-in-up border border-slate-700 whitespace-nowrap overflow-x-auto max-w-[90vw]">
          <span className="text-[10px] md:text-xs font-black bg-amber-500 text-slate-950 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0"><CheckSquare size={14}/> {selectedIds.length} Terpilih</span>
          <div className="h-6 w-px bg-slate-700 shrink-0"></div>
          
          {currentView.module === 'RECRUITMENT' && (
            <div className="flex items-center gap-2 shrink-0">
               <button onClick={() => bulkUpdateStatus('INTI')} className="text-[10px] md:text-xs font-bold hover:bg-emerald-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><CheckCircle2 size={12}/> Luluskan (INTI)</button>
               <button onClick={() => bulkUpdateStatus('BANK_DATA')} className="text-[10px] md:text-xs font-bold hover:bg-slate-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><Archive size={12}/> Ke Bank Data</button>
            </div>
          )}
          {currentView.module === 'HRIS' && (
            <div className="flex items-center gap-2 shrink-0">
               <span className="text-[9px] uppercase text-slate-400 font-bold hidden sm:inline">Aksi HRIS:</span>
               <button onClick={() => setShowBulkModal(true)} className="text-[10px] md:text-xs font-bold hover:bg-blue-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><MapPin size={12}/> Mutasi / Plotting Lokasi</button>
            </div>
          )}
          <div className="h-6 w-px bg-slate-700 shrink-0"></div>
          <button onClick={bulkDeleteCandidates} className="text-[10px] md:text-xs font-bold text-red-400 hover:text-white hover:bg-red-600 border border-transparent hover:border-red-500 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0"><Trash2 size={14}/> Hapus</button>
        </div>
      )}

      {/* MODAL BULK MUTASI (MODAL BARU) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
             <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
                <h3 className="font-black flex items-center gap-2"><MapPin size={18}/> Mutasi Massal ({selectedIds.length} Karyawan)</h3>
                <button onClick={() => setShowBulkModal(false)} className="text-blue-200 hover:text-white"><X size={20}/></button>
             </div>
             <div className="p-6 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Lokasi / Site Baru</label>
                   <select value={bulkLokasi} onChange={(e) => setBulkLokasi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold text-slate-800">
                      <option value="">-- Pilih Lokasi Master --</option>
                      {masterSites.map(site => <option key={site.id} value={site.name}>{site.name} ({site.region})</option>)}
                   </select>
                   {/* Feedback kategori otomatis */}
                   {bulkLokasi && (
                     <div className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
                       <span className="text-[10px] font-bold text-blue-700 uppercase">Kategori Karyawan:</span>
                       <span className="text-xs font-black bg-white px-2 py-1 rounded shadow-sm text-slate-800">
                         {masterSites.find(s => s.name === bulkLokasi)?.kategori_karyawan || '-'}
                       </span>
                     </div>
                   )}
                </div>
                <div className="pt-4 flex gap-3">
                   <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition">Batal</button>
                   <button onClick={executeBulkMutasi} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md">Simpan Mutasi</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL PROFIL LENGKAP (DOSSIER / HRIS RECORD) */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[50] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-50 w-full max-w-5xl h-[95vh] md:h-auto md:max-h-[90vh] md:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative">
            
            <div className="bg-white px-6 md:px-8 py-4 flex justify-between items-center border-b border-slate-200 sticky top-0 z-20">
              <div>
                <h2 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight">{isEditingProfile ? 'Koreksi Data Record' : (currentView.module === 'HRIS' ? `HRIS Record: ${selectedCandidate.nama_lengkap}` : `Dossier: ${selectedCandidate.nama_lengkap}`)}</h2>
                {!isEditingProfile && <p className="text-xs text-blue-600 font-bold flex items-center gap-1.5"><Briefcase size={12}/> {selectedCandidate.bidang_jasa} • {currentView.module === 'HRIS' ? `NIK: ${selectedCandidate.nik_karyawan || '-'}` : selectedCandidate.alamat_domisili}</p>}
              </div>
              <div className="flex items-center gap-2">
                {!isEditingProfile && (
                  <>
                    <button onClick={() => deleteCandidate(selectedCandidate.id, selectedCandidate.nama_lengkap)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors flex items-center gap-1.5 px-4" title="Hapus Data">
                      <Trash2 size={16}/> <span className="text-xs font-bold hidden md:inline">Hapus</span>
                    </button>
                    <button onClick={() => {setIsEditingProfile(true); setEditProfileData(selectedCandidate);}} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors flex items-center gap-1.5 px-4">
                      <Edit size={16}/> <span className="text-xs font-bold hidden md:inline">Edit Data Lengkap</span>
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedCandidate(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><X size={20}/></button>
              </div>
            </div>
            
            <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              
              {isEditingProfile ? (
                  <form onSubmit={updateCandidateProfile} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm mx-auto animate-fade-in max-w-4xl">
                     {currentView.module === 'HRIS' && (
                       <>
                         <h3 className="font-black text-blue-700 mb-4 text-sm uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><Layers size={16}/> Data Kepegawaian (HRIS)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                           <div><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 px-1">NIK Karyawan</label><input type="text" value={editProfileData.nik_karyawan || ''} onChange={e => setEditProfileData({...editProfileData, nik_karyawan: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-black text-blue-900" /></div>
                           <div><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 px-1">Tanggal Bergabung</label><input type="date" value={editProfileData.tanggal_bergabung || ''} onChange={e => setEditProfileData({...editProfileData, tanggal_bergabung: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold" /></div>
                           <div><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 px-1">Status Kontrak</label><select value={editProfileData.status_kontrak || ''} onChange={e => setEditProfileData({...editProfileData, status_kontrak: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold"><option value="Probation">Probation</option><option value="PKWT">PKWT (Kontrak)</option><option value="PKWTT">PKWTT (Tetap)</option><option value="Harian Lepas">Harian Lepas</option></select></div>
                         </div>
                       </>
                     )}

                     <h3 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest border-b border-slate-100 pb-2">1. Data Diri & Domisili</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Nama Lengkap</label><input type="text" value={editProfileData.nama_lengkap || ''} onChange={e => setEditProfileData({...editProfileData, nama_lengkap: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">NIK KTP</label><input type="number" value={editProfileData.nik_ktp || ''} onChange={e => setEditProfileData({...editProfileData, nik_ktp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Warga Negara</label><input type="text" value={editProfileData.kewarganegaraan || ''} onChange={e => setEditProfileData({...editProfileData, kewarganegaraan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tempat Lahir</label><input type="text" value={editProfileData.tempat_lahir || ''} onChange={e => setEditProfileData({...editProfileData, tempat_lahir: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tanggal Lahir</label><input type="date" value={editProfileData.tanggal_lahir || ''} onChange={e => setEditProfileData({...editProfileData, tanggal_lahir: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Jenis Kelamin</label><select value={editProfileData.jenis_kelamin || ''} onChange={e => setEditProfileData({...editProfileData, jenis_kelamin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Agama</label><select value={editProfileData.agama || ''} onChange={e => setEditProfileData({...editProfileData, agama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Islam">Islam</option><option value="Kristen">Kristen</option><option value="Katolik">Katolik</option><option value="Hindu">Hindu</option><option value="Buddha">Buddha</option><option value="Konghucu">Konghucu</option></select></div>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Divisi / Jasa</label><select value={editProfileData.bidang_jasa || ''} onChange={e => setEditProfileData({...editProfileData, bidang_jasa: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Security (Satpam)">Security (Satpam)</option><option value="Cleaning Service">Cleaning Service</option><option value="Parking Service">Parking Service</option><option value="Labour Supply (Tenaga Kerja)">Labour Supply</option></select></div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">No WhatsApp</label><input type="number" value={editProfileData.no_hp || ''} onChange={e => setEditProfileData({...editProfileData, no_hp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Telp Alternatif</label><input type="number" value={editProfileData.no_telp || ''} onChange={e => setEditProfileData({...editProfileData, no_telp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Alamat Domisili</label><textarea value={editProfileData.alamat_domisili || ''} onChange={e => setEditProfileData({...editProfileData, alamat_domisili: e.target.value})} rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"></textarea></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Alamat KTP Lengkap</label><textarea value={editProfileData.alamat_lengkap || ''} onChange={e => setEditProfileData({...editProfileData, alamat_lengkap: e.target.value})} rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"></textarea></div>
                     </div>

                     <h3 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest border-b border-slate-100 pb-2">2. Keluarga & Kontak Darurat</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Status Pernikahan (PTKP)</label>
                          <select value={editProfileData.status_pernikahan || ''} onChange={e => setEditProfileData({...editProfileData, status_pernikahan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500">
                             <optgroup label="Tidak Kawin"><option value="TK/0">TK/0</option><option value="TK/1">TK/1</option><option value="TK/2">TK/2</option><option value="TK/3">TK/3</option></optgroup>
                             <optgroup label="Kawin"><option value="K/0">K/0</option><option value="K/1">K/1</option><option value="K/2">K/2</option><option value="K/3">K/3</option></optgroup>
                          </select>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Data Anak/Tanggungan</label><textarea value={editProfileData.detail_anak || ''} onChange={e => setEditProfileData({...editProfileData, detail_anak: e.target.value})} rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"></textarea></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Nama Pasangan</label><input type="text" value={editProfileData.nama_pasangan || ''} onChange={e => setEditProfileData({...editProfileData, nama_pasangan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">TTL Pasangan</label><input type="text" value={editProfileData.pasangan_ttl || ''} onChange={e => setEditProfileData({...editProfileData, pasangan_ttl: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Kerja Pasangan</label><input type="text" value={editProfileData.pasangan_pekerjaan || ''} onChange={e => setEditProfileData({...editProfileData, pasangan_pekerjaan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                           <div><label className="block text-[10px] font-bold text-red-400 uppercase mb-1 px-1">Kontak Darurat (Nama)</label><input type="text" value={editProfileData.kontak_darurat_nama || ''} onChange={e => setEditProfileData({...editProfileData, kontak_darurat_nama: e.target.value})} className="w-full bg-white border border-red-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-red-500" /></div>
                           <div><label className="block text-[10px] font-bold text-red-400 uppercase mb-1 px-1">Hubungan</label><input type="text" value={editProfileData.kontak_darurat_hub || ''} onChange={e => setEditProfileData({...editProfileData, kontak_darurat_hub: e.target.value})} className="w-full bg-white border border-red-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-red-500" /></div>
                           <div><label className="block text-[10px] font-bold text-red-400 uppercase mb-1 px-1">No Telp Darurat</label><input type="number" value={editProfileData.kontak_darurat_telp || ''} onChange={e => setEditProfileData({...editProfileData, kontak_darurat_telp: e.target.value})} className="w-full bg-white border border-red-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-red-500" /></div>
                        </div>
                     </div>

                     <h3 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest border-b border-slate-100 pb-2">3. Fisik, Medis & Seragam</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="grid grid-cols-3 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tinggi (cm)</label><input type="number" value={editProfileData.tinggi_badan || ''} onChange={e => setEditProfileData({...editProfileData, tinggi_badan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Berat (kg)</label><input type="number" value={editProfileData.berat_badan || ''} onChange={e => setEditProfileData({...editProfileData, berat_badan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Gol Darah</label><select value={editProfileData.golongan_darah || ''} onChange={e => setEditProfileData({...editProfileData, golongan_darah: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="-">-</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option></select></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Baju</label><select value={editProfileData.ukuran_baju || ''} onChange={e => setEditProfileData({...editProfileData, ukuran_baju: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option></select></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Celana</label><input type="number" value={editProfileData.ukuran_celana || ''} onChange={e => setEditProfileData({...editProfileData, ukuran_celana: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Sepatu</label><input type="number" value={editProfileData.ukuran_sepatu || ''} onChange={e => setEditProfileData({...editProfileData, ukuran_sepatu: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Bertato?</label><select value={editProfileData.bertato || ''} onChange={e => setEditProfileData({...editProfileData, bertato: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Berkacamata?</label><select value={editProfileData.berkacamata || ''} onChange={e => setEditProfileData({...editProfileData, berkacamata: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Patah Tulang?</label><select value={editProfileData.patah_tulang || ''} onChange={e => setEditProfileData({...editProfileData, patah_tulang: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Takut Tinggi?</label><select value={editProfileData.takut_tinggi || ''} onChange={e => setEditProfileData({...editProfileData, takut_tinggi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:col-span-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Pernah Operasi?</label><select value={editProfileData.riwayat_operasi || ''} onChange={e => setEditProfileData({...editProfileData, riwayat_operasi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                           <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Jika Ya, Operasi Apa?</label><input type="text" value={editProfileData.detail_operasi || ''} onChange={e => setEditProfileData({...editProfileData, detail_operasi: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:col-span-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Sakit 1 thn Terakhir?</label><select value={editProfileData.sakit_serius || ''} onChange={e => setEditProfileData({...editProfileData, sakit_serius: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                           <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Jika Ya, Sakit Apa?</label><input type="text" value={editProfileData.detail_sakit || ''} onChange={e => setEditProfileData({...editProfileData, detail_sakit: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-amber-500" /></div>
                        </div>
                     </div>

                     <h3 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest border-b border-slate-100 pb-2">4. Pengalaman, Skill & Info Lain</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Penguasaan Bahasa ID</label><select value={editProfileData.bahasa_indonesia || ''} onChange={e => setEditProfileData({...editProfileData, bahasa_indonesia: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Baik">Baik</option><option value="Cukup">Cukup</option><option value="Kurang">Kurang</option></select></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Penguasaan Bahasa EN</label><select value={editProfileData.bahasa_inggris || ''} onChange={e => setEditProfileData({...editProfileData, bahasa_inggris: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Baik">Baik</option><option value="Cukup">Cukup</option><option value="Kurang">Kurang</option></select></div>
                        
                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Riwayat Pekerjaan</label><textarea value={editProfileData.riwayat_kerja || ''} onChange={e => setEditProfileData({...editProfileData, riwayat_kerja: e.target.value})} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"></textarea></div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Gaji Terakhir</label><input type="text" value={editProfileData.gaji_terakhir || ''} onChange={e => setEditProfileData({...editProfileData, gaji_terakhir: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Gaji Diharapkan</label><input type="text" value={editProfileData.gaji_diharapkan || ''} onChange={e => setEditProfileData({...editProfileData, gaji_diharapkan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Alasan Keluar</label><input type="text" value={editProfileData.alasan_keluar || ''} onChange={e => setEditProfileData({...editProfileData, alasan_keluar: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Bisa Berenang?</label><select value={editProfileData.bisa_berenang || ''} onChange={e => setEditProfileData({...editProfileData, bisa_berenang: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Bisa Beladiri?</label><select value={editProfileData.bisa_beladiri || ''} onChange={e => setEditProfileData({...editProfileData, bisa_beladiri: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Detail Beladiri</label><input type="text" value={editProfileData.detail_beladiri || ''} onChange={e => setEditProfileData({...editProfileData, detail_beladiri: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Keahlian Lainnya</label><input type="text" value={editProfileData.keterampilan_lain || ''} onChange={e => setEditProfileData({...editProfileData, keterampilan_lain: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>

                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Info Loker Dari?</label><select value={editProfileData.info_lowongan || ''} onChange={e => setEditProfileData({...editProfileData, info_lowongan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Iklan">Iklan / Media Sosial</option><option value="Teman">Teman</option><option value="Keluarga">Keluarga</option><option value="Teman Kerja">Teman Kerja</option></select></div>
                        <div className="grid grid-cols-3 gap-2">
                           <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Kenalan PT?</label><select value={editProfileData.kenalan_syntegra || ''} onChange={e => setEditProfileData({...editProfileData, kenalan_syntegra: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                           <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Siapa Namanya?</label><input type="text" value={editProfileData.detail_kenalan || ''} onChange={e => setEditProfileData({...editProfileData, detail_kenalan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>
                     </div>
                     
                     <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">Batal</button>
                        <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"><Save size={16}/> Simpan Semua Data</button>
                     </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {currentView.module === 'HRIS' && (
                      <div className="lg:col-span-2 bg-blue-50/50 p-5 rounded-3xl shadow-sm border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                           <h3 className="font-black text-blue-800 text-sm uppercase tracking-widest mb-1 flex items-center gap-1.5"><Layers size={16}/> Data Kepegawaian (HRIS)</h3>
                           <p className="text-xs text-blue-600 font-medium">Informasi HRIS internal perusahaan.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full md:w-auto bg-white p-3 rounded-2xl border border-blue-100 shadow-sm">
                           <div><span className="block text-[10px] font-bold text-slate-400 uppercase">NIK Pegawai</span><span className="font-black text-slate-900">{selectedCandidate.nik_karyawan || '-'}</span></div>
                           <div className="w-px bg-slate-100"></div>
                           <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Bergabung</span><span className="font-black text-slate-900">{selectedCandidate.tanggal_bergabung || '-'}</span></div>
                           <div className="w-px bg-slate-100"></div>
                           <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Status</span><span className="font-black text-emerald-600">{selectedCandidate.status_kontrak || 'Probation'}</span></div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 md:space-y-6">
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-1.5 h-full bg-blue-500 absolute left-0 top-0"></div>
                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">1. Identitas Pribadi</h3>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                          <div className="text-slate-500">NIK KTP</div><div className="font-bold text-slate-900 text-right">{selectedCandidate.nik_ktp}</div>
                          <div className="text-slate-500">Warga Negara</div><div className="font-bold text-slate-900 text-right">{selectedCandidate.kewarganegaraan}</div>
                          <div className="text-slate-500">TTL</div><div className="font-bold text-slate-900 text-right">{selectedCandidate.tempat_lahir}, {selectedCandidate.tanggal_lahir}</div>
                          <div className="text-slate-500">Agama / Gol. Darah</div><div className="font-bold text-slate-900 text-right">{selectedCandidate.agama} / {selectedCandidate.golongan_darah}</div>
                          <div className="col-span-2 pt-2 border-t border-slate-50 mt-1">
                            <span className="text-slate-500 block mb-1">Alamat Lengkap KTP</span>
                            <span className="font-bold text-slate-900 leading-relaxed">{selectedCandidate.alamat_lengkap}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-1.5 h-full bg-indigo-500 absolute left-0 top-0"></div>
                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">2. Keluarga & Darurat</h3>
                        <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl mb-3">
                          <span className="text-xs font-bold text-indigo-900">Status PTKP:</span> 
                          <span className="font-black bg-indigo-200 text-indigo-900 px-2.5 py-1 rounded-md text-[10px]">{selectedCandidate.status_pernikahan || '-'}</span>
                        </div>
                        {selectedCandidate.status_pernikahan && selectedCandidate.status_pernikahan !== 'TK/0' && (
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs mb-3 space-y-2">
                            {selectedCandidate.status_pernikahan?.startsWith('K') && (
                               <p><span className="text-slate-500">Suami/Istri:</span> <span className="font-bold">{selectedCandidate.nama_pasangan || '-'}</span> {selectedCandidate.pasangan_pekerjaan ? `(${selectedCandidate.pasangan_pekerjaan})` : ''}</p>
                            )}
                            <p><span className="text-slate-500">Tanggungan/Anak:</span> <span className="font-bold">{selectedCandidate.detail_anak || '-'}</span></p>
                          </div>
                        )}
                        <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 mt-2 flex flex-col">
                          <p className="font-black text-red-800 text-[10px] uppercase mb-1">📞 Kontak Darurat (Emergency)</p>
                          <p className="text-xs font-bold text-slate-900">{selectedCandidate.kontak_darurat_nama} <span className="text-slate-500 font-normal">({selectedCandidate.kontak_darurat_hub})</span></p>
                          <p className="text-sm font-black text-red-600 mt-1">{selectedCandidate.kontak_darurat_telp}</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-1.5 h-full bg-cyan-500 absolute left-0 top-0"></div>
                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">3. Pendidikan & Bahasa</h3>
                        <div className="space-y-3 mb-4">
                          {safeParseJSON(selectedCandidate.riwayat_pendidikan).map((edu, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="flex justify-between items-start mb-1">
                                 <span className="font-black text-xs text-slate-900">{edu.tingkat}</span>
                                 <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{edu.tahun_lulus}</span>
                              </div>
                              <p className="text-xs text-slate-700 font-bold">{edu.institusi} <span className="font-normal text-slate-500">({edu.kota})</span></p>
                              <p className="text-[10px] text-slate-500 uppercase mt-1">{edu.jurusan || 'Tanpa Jurusan'}</p>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Penguasaan Bahasa</p>
                          <div className="flex flex-wrap gap-2">
                            {safeParseJSON(selectedCandidate.kemampuan_bahasa).length > 0 ? (
                              safeParseJSON(selectedCandidate.kemampuan_bahasa).map((lang, idx) => (
                                 <span key={idx} className="bg-cyan-50 border border-cyan-100 text-cyan-800 text-[10px] font-bold px-2 py-1 rounded-md">
                                   {lang.nama_bahasa}: <span className="font-normal opacity-80">{lang.tingkat}</span>
                                 </span>
                              ))
                            ) : (
                               <div className="flex gap-2 w-full">
                                 <span className="flex-1 bg-slate-50 p-2 text-[10px] border border-slate-200 rounded-md"><span className="text-slate-400">ID:</span> <b className="text-slate-700">{selectedCandidate.bahasa_indonesia || '-'}</b></span>
                                 <span className="flex-1 bg-slate-50 p-2 text-[10px] border border-slate-200 rounded-md"><span className="text-slate-400">EN:</span> <b className="text-slate-700">{selectedCandidate.bahasa_inggris || '-'}</b></span>
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-1.5 h-full bg-rose-500 absolute left-0 top-0"></div>
                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">4. Fisik & Medis</h3>
                        <div className="flex gap-3 mb-4">
                          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                             <p className="text-[10px] text-slate-500 uppercase font-bold">Tinggi</p>
                             <p className="font-black text-slate-900">{selectedCandidate.tinggi_badan} <span className="text-xs font-normal text-slate-400">cm</span></p>
                          </div>
                          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                             <p className="text-[10px] text-slate-500 uppercase font-bold">Berat</p>
                             <p className="font-black text-slate-900">{selectedCandidate.berat_badan} <span className="text-xs font-normal text-slate-400">kg</span></p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mb-4">
                          <div className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Tato</span><b className="text-slate-900">{selectedCandidate.bertato}</b></div>
                          <div className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Kacamata</span><b className="text-slate-900">{selectedCandidate.berkacamata}</b></div>
                          <div className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Takut Tinggi</span><b className="text-slate-900">{selectedCandidate.takut_tinggi}</b></div>
                          <div className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Patah Tulang</span><b className="text-slate-900">{selectedCandidate.patah_tulang}</b></div>
                        </div>
                        <div className="space-y-2 text-xs bg-rose-50/50 p-3 rounded-xl border border-rose-100/50">
                          <div>
                            <span className="text-slate-500 block">Riwayat Operasi: <b className="text-slate-900">{selectedCandidate.riwayat_operasi}</b></span>
                            {selectedCandidate.riwayat_operasi === 'Ya' && <span className="text-rose-600 font-medium italic">"{selectedCandidate.detail_operasi}"</span>}
                          </div>
                          <div>
                            <span className="text-slate-500 block">Sakit 1 thn terakhir: <b className="text-slate-900">{selectedCandidate.sakit_serius}</b></span>
                            {selectedCandidate.sakit_serius === 'Ya' && <span className="text-rose-600 font-medium italic">"{selectedCandidate.detail_sakit}"</span>}
                          </div>
                        </div>
                        <div className="mt-3 bg-slate-800 text-white p-3 rounded-xl flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span>Seragam:</span>
                          <span>Baju: <b className="text-amber-400 text-xs">{selectedCandidate.ukuran_baju}</b></span>
                          <span>Celana: <b className="text-amber-400 text-xs">{selectedCandidate.ukuran_celana}</b></span>
                          <span>Sepatu: <b className="text-amber-400 text-xs">{selectedCandidate.ukuran_sepatu}</b></span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0"></div>
                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">5. Pelatihan & Karir</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-md">Berenang: {selectedCandidate.bisa_berenang}</span>
                          <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-md">Beladiri: {selectedCandidate.bisa_beladiri} {selectedCandidate.bisa_beladiri === 'Ya' ? `(${selectedCandidate.detail_beladiri})` : ''}</span>
                          {selectedCandidate.keterampilan_lain && <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-md">Skill: {selectedCandidate.keterampilan_lain}</span>}
                        </div>
                        <div className="space-y-2 mb-4">
                          {safeParseJSON(selectedCandidate.riwayat_pelatihan).filter(p => p.jenis_sertifikasi).map((pel, idx) => (
                            <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                              <div>
                                 <p className="font-bold text-xs text-slate-900">{pel.jenis_sertifikasi} <span className="font-normal text-slate-500">({pel.tingkat})</span></p>
                                 <p className="text-[10px] text-slate-500">{pel.institusi}</p>
                              </div>
                              <span className="font-black text-[10px] text-slate-400 bg-white px-2 py-1 rounded">{pel.tahun}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <p className="font-black text-slate-900 text-[10px] uppercase mb-2">Riwayat Pekerjaan Sebelumnya</p>
                           <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">{selectedCandidate.riwayat_kerja || '-'}</p>
                           <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-200 pt-3">
                              <div><span className="text-slate-400 block">Gaji Terakhir</span><b className="text-slate-700 text-xs">{selectedCandidate.gaji_terakhir || '-'}</b></div>
                              <div><span className="text-slate-400 block">Gaji Harapan</span><b className="text-slate-700 text-xs">{selectedCandidate.gaji_diharapkan || '-'}</b></div>
                              <div className="col-span-2 mt-1"><span className="text-slate-400 block">Alasan Keluar</span><b className="text-slate-700 text-xs">{selectedCandidate.alasan_keluar || '-'}</b></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!isEditingProfile && (
                  <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
                     <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="w-1.5 h-full bg-slate-400 absolute left-0 top-0"></div>
                        <h3 className="font-black text-slate-900 mb-4 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">6. Arsip Dokumen Pelamar</h3>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          {[
                            {url: selectedCandidate.berkas_pas_foto_url, label: "Foto", icon: "📷", style: "bg-blue-50 text-blue-700 border-blue-200"},
                            {url: selectedCandidate.berkas_ktp_url, label: "KTP", icon: "📄", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_kk_url, label: "KK", icon: "📄", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_ijazah_url, label: "Ijazah", icon: "🎓", style: "bg-emerald-50 text-emerald-700 border-emerald-200"},
                            {url: selectedCandidate.berkas_skck_url, label: "SKCK", icon: "📄", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_surat_sehat_url, label: "S.Sehat", icon: "🏥", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_buku_rek_url, label: "Rekening", icon: "💳", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_vaksin_url, label: "Vaksin", icon: "💉", style: "bg-purple-50 text-purple-700 border-purple-200"},
                            {url: selectedCandidate.berkas_referensi_kerja_url, label: "Ref.Kerja", icon: "💼", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_cv_url, label: "CV", icon: "📄", style: "bg-slate-100 text-slate-700 border-slate-200"},
                            {url: selectedCandidate.berkas_sertifikat_url, label: "Sertifikat", icon: "🏅", style: "bg-slate-100 text-slate-700 border-slate-200"}
                          ].map((doc, idx) => (
                             doc.url && (
                               <a key={idx} href={doc.url} target="_blank" rel="noreferrer" className={`px-3 py-2 rounded-xl border font-bold text-[10px] md:text-xs flex items-center gap-1.5 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all ${doc.style}`}>
                                 {doc.icon} {doc.label}
                               </a>
                             )
                          ))}
                        </div>
                     </div>

                     <div className="bg-blue-50 p-5 md:p-6 rounded-3xl border border-blue-100 relative overflow-hidden">
                       <div className="w-1.5 h-full bg-blue-500 absolute left-0 top-0"></div>
                       <h3 className="font-black text-blue-800 mb-4 text-xs uppercase tracking-widest border-b border-blue-200/50 pb-2 flex items-center gap-2"><FileText size={16}/> 7. Update Penempatan & Mutasi</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-[10px] font-black text-blue-800/70 uppercase mb-1.5">Lokasi Cabang / Site Baru</label>
                           <select value={lokasiInput} onChange={(e) => setLokasiInput(e.target.value)} className="bg-white border border-blue-200 rounded-xl p-3 w-full text-sm font-bold text-slate-800 focus:outline-none">
                              <option value="">-- Pilih Lokasi Master --</option>
                              {masterSites.map(site => <option key={site.id} value={site.name}>{site.name} ({site.region})</option>)}
                           </select>
                           {lokasiInput && (
                             <p className="text-[10px] text-blue-600 mt-2">Kategori Otomatis: <b className="bg-white px-1 py-0.5 rounded shadow-sm">{masterSites.find(s => s.name === lokasiInput)?.kategori_karyawan || '-'}</b></p>
                           )}
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-blue-800/70 uppercase mb-1.5">NIK Karyawan</label>
                           <input type="text" value={nikInput} onChange={(e) => setNikInput(e.target.value)} placeholder="Contoh: 2026001" className="bg-white border border-blue-200 rounded-xl p-3 w-full text-sm font-bold text-slate-800 focus:outline-none" />
                         </div>
                       </div>
                       <button onClick={() => saveCandidateInfo(selectedCandidate.id)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 w-full md:w-auto"><Save size={16}/> Simpan Data Penempatan (Mutasi)</button>
                     </div>
                  </div>
                )}
            </div>
            
            {/* Footer Modal */}
            {!isEditingProfile && (
              <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row justify-end gap-2 md:gap-3 z-20 sticky bottom-0 border-t border-slate-800">
                {currentView.module === 'RECRUITMENT' && selectedCandidate.status === 'PENDING' && (
                  <button onClick={() => updateStatus(selectedCandidate.id, 'INTI')} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg text-xs transition-all w-full md:w-auto">
                    <CheckCircle2 size={16}/> Lulus (Jadikan Karyawan)
                  </button>
                )}
                {currentView.module === 'RECRUITMENT' && selectedCandidate.status === 'BANK_DATA' && (
                  <button onClick={() => updateStatus(selectedCandidate.id, 'PENDING')} className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-xl font-bold shadow text-xs transition-all w-full md:w-auto">
                    <RotateCcw size={16}/> Kembalikan ke Seleksi
                  </button>
                )}
                {currentView.module === 'RECRUITMENT' && selectedCandidate.status === 'PENDING' && (
                  <button onClick={() => updateStatus(selectedCandidate.id, 'BANK_DATA')} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-xl font-bold shadow text-xs transition-all w-full md:w-auto">
                    <Archive size={16}/> Masuk Bank Data
                  </button>
                )}
                {currentView.module === 'HRIS' && (
                  <button onClick={() => syncToTaskManagement(selectedCandidate)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg text-xs transition-all w-full md:w-auto">
                    <UserPlus size={16}/> Sync Akun Portal
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;