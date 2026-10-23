import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Search, Download, RefreshCw, QrCode, ArrowLeft, LogOut, X, User, MapPin, Briefcase, FileText, CheckCircle2, Archive, RotateCcw, Save, UserPlus, Edit, DownloadCloud, Trash2, Building2, Map, CheckSquare, Layers, Menu, ChevronDown, ChevronRight, Settings, PlusCircle, Upload, Info, Printer, Trophy, AlertCircle } from 'lucide-react';

const AdminDashboard = ({ setAuth }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // STATE UTAMA (DATA)
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [masterSites, setMasterSites] = useState([]);
  const [masterPositions, setMasterPositions] = useState([]);
  const [masterDivisions, setMasterDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  // --- STATE PAYROLL HRD ---
  const [payrollStep, setPayrollStep] = useState(0);
  const [selectedPayrollSite, setSelectedPayrollSite] = useState('');
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7));

  // STATE REKAP ABSENSI (DATABASE)
  const [attendanceData, setAttendanceData] = useState([]);
  const [searchAttendance, setSearchAttendance] = useState('');
  const [filterPeriodAttendance, setFilterPeriodAttendance] = useState('');
  const [siteTimeConfig, setSiteTimeConfig] = useState({});
  const [expandedAttendanceRow, setExpandedAttendanceRow] = useState(null);
  const [searchConfigSite, setSearchConfigSite] = useState('');
  
  // STATE EDIT & APPROVAL HAPUS ABSENSI
  const [editingAtt, setEditingAtt] = useState(null);
  const [editAttData, setEditAttData] = useState({ jamMasuk: '', jamKeluar: '', keterangan_asli: '' });
  const [pendingDeletes, setPendingDeletes] = useState([]); 

  // STATE PARAMETER KPI ABSENSI (DATABASE)
  const [kpiConfig, setKpiConfig] = useState({ baseScore: 100, potongMangkir: 20, potongIzin: 5, potongTelatPerMenit: 0.5 });
  const [isKpiConfigExpanded, setIsKpiConfigExpanded] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // STATE BARU: Parameter Absen HRD
  const [totalHariKerjaSebulan, setTotalHariKerjaSebulan] = useState(22); // Pembagi Gaji Prorata
  const [jamMasukKerja, setJamMasukKerja] = useState('08:00');
  const [jamKeluarKerja, setJamKeluarKerja] = useState('17:00');
  const [nominalPotonganTelat, setNominalPotonganTelat] = useState(0);

  const [parsedAttendance, setParsedAttendance] = useState([]);
  const [isEditingPayroll, setIsEditingPayroll] = useState(false);
  const [showPayrollSuccessModal, setShowPayrollSuccessModal] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [showPayrollInfoModal, setShowPayrollInfoModal] = useState(false);
  
  // State untuk penyesuaian gaji (Step 2 - Tunjangan & Potongan)
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [payrollColumns, setPayrollColumns] = useState([]); // [{id: 'col_1', name: 'Lembur', type: 'addition'}]
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('addition');
  const [newComponent, setNewComponent] = useState({ name: '', type: 'addition', amount: 0, appliedToAll: true, selectedNiks: [] });
  
  // STATE NAVIGASI SIDEBAR & VIEW
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [currentView, setCurrentView] = useState({ module: 'DASHBOARD', filter: 'OVERVIEW', title: 'Dashboard HRD' });
  
  // STATE DASHBOARD ANALYTICS (Variabel yang sempat terhapus)
  const [dashSearch, setDashSearch] = useState('');
  const [dashSortBy, setDashSortBy] = useState('terbaru');
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false); 

  // STATE FILTER ABSENSI DASHBOARD
  const todayStr = new Date().toISOString().split('T')[0];
  const [attFilterStartDate, setAttFilterStartDate] = useState(todayStr); // Default Hari Berjalan
  const [attFilterEndDate, setAttFilterEndDate] = useState(todayStr);
  const [attFilterPeriod, setAttFilterPeriod] = useState('');
  const [attFilterSite, setAttFilterSite] = useState('');
  const [attSelectedCategory, setAttSelectedCategory] = useState(null); // 'HADIR', 'MANGKIR', 'IZIN', 'CUTI'

  // STATE LEADERBOARD KPI
  const [leaderboardFilterPeriod, setLeaderboardFilterPeriod] = useState(new Date().toISOString().slice(0, 7)); // Default bulan ini
  const [leaderboardFilterType, setLeaderboardFilterType] = useState('ALL'); // 'ALL', 'ABSENSI', 'TASK'
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [isGeneratingKpiPdf, setIsGeneratingKpiPdf] = useState(false);
  
  const [expandedMenus, setExpandedMenus] = useState({ recruitment: true, hris: false, payroll: false, attendance: false, regions: {} });
  
  // STATE FILTER GLOBAL
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJasa, setFilterJasa] = useState('');

  // STATE FILTER SPESIFIK RECRUITMENT
  const [filterGender, setFilterGender] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterEdu, setFilterEdu] = useState('');
  const [filterHeight, setFilterHeight] = useState('');

  // Tambahkan di bagian atas bersama state lainnya
  const [applicants, setApplicants] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // STATE PLOTTING & MUTASI (SATUAN)
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [lokasiInput, setLokasiInput] = useState('');
  const [nikInput, setNikInput] = useState('');

  // STATE BULK MUTASI (MODAL BARU)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLokasi, setBulkLokasi] = useState('');

  // STATE TAMBAH MANUAL & BULK EDIT BARU
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [newManualData, setNewManualData] = useState({ nama_lengkap: '', nik_karyawan: '', bidang_jasa: '', posisi_jabatan: '', lokasi_penempatan: '', status_kontrak: 'Probation', base_salary: 0 });
  
  // UBAH STATE BULK EDIT MENJADI INI:
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditList, setBulkEditList] = useState([]); // <-- Menyimpan array karyawan yang mau diedit

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // STATE CUSTOM EXPORT & IMPORT
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // STATE SETTINGS MASTER SITE
  const [newSiteData, setNewSiteData] = useState({ region: '', name: '', info: '', kategori_karyawan: 'Pekerja Site' });
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [editSiteData, setEditSiteData] = useState({ region: '', name: '', info: '', kategori_karyawan: 'Pekerja Site' });

  // STATE SETTINGS MASTER POSISI JABATAN
  const [newPositionName, setNewPositionName] = useState('');
  const [editingPosId, setEditingPosId] = useState(null);
  const [editPosName, setEditPosName] = useState('');

  const [user, setUser] = useState(
    JSON.parse(
      localStorage.getItem('syntegra_user_session')
    )
  );

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));
    if (!session) { navigate('/'); return; }
    if (!session.has_portal_access) { alert('Anda tidak memiliki akses ke modul HRD'); navigate('/'); return; }
    fetchData();
  }, []);

  useEffect(() => { setSelectedIds([]); }, [currentView, searchTerm, filterJasa]);
  
  const EXPORT_OPTIONS = [
    { 
      group: 'Data Kepegawaian & Identitas', 
      fields: [
        { key: 'nama_lengkap', label: 'Nama Lengkap' }, { key: 'nik_karyawan', label: 'NIK Karyawan' },
        { key: 'nik_ktp', label: 'NIK KTP' }, { key: 'bidang_jasa', label: 'Divisi/Jasa' },
        { key: 'posisi_jabatan', label: 'Jabatan' }, { key: 'level_jabatan', label: 'Level Portal' },
        { key: 'kategori_karyawan', label: 'Kategori' }, { key: 'lokasi_penempatan', label: 'Penempatan' },
        { key: 'status_kontrak', label: 'Status Kontrak' }, { key: 'tanggal_bergabung', label: 'Tgl Bergabung' },
        { key: 'base_salary', label: 'Gaji Pokok Utama' }
      ] 
    },
    { 
      group: 'Personal & Domisili', 
      fields: [
        { key: 'tempat_lahir', label: 'Tempat Lahir' }, { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
        { key: 'jenis_kelamin', label: 'Jenis Kelamin' }, { key: 'agama', label: 'Agama' },
        { key: 'kewarganegaraan', label: 'Warga Negara' }, { key: 'no_hp', label: 'No WhatsApp' }, 
        { key: 'no_telp', label: 'Telp Alternatif' }, { key: 'alamat_domisili', label: 'Alamat Domisili' },
        { key: 'alamat_lengkap', label: 'Alamat KTP Lengkap' }
      ] 
    },
    { 
      group: 'Keluarga & Darurat', 
      fields: [
        { key: 'status_pernikahan', label: 'Status PTKP' }, { key: 'nama_pasangan', label: 'Nama Pasangan' },
        { key: 'pasangan_ttl', label: 'TTL Pasangan' }, { key: 'pasangan_pekerjaan', label: 'Pekerjaan Pasangan' },
        { key: 'detail_anak', label: 'Data Anak' }, { key: 'kontak_darurat_nama', label: 'Nama Kontak Darurat' },
        { key: 'kontak_darurat_telp', label: 'No Darurat' }, { key: 'kontak_darurat_hub', label: 'Hubungan Darurat' }
      ] 
    },
    { 
      group: 'Fisik & Medis', 
      fields: [
        { key: 'tinggi_badan', label: 'Tinggi Badan (cm)' }, { key: 'berat_badan', label: 'Berat Badan (kg)' },
        { key: 'golongan_darah', label: 'Golongan Darah' }, { key: 'ukuran_baju', label: 'Uk. Baju' },
        { key: 'ukuran_celana', label: 'Uk. Celana' }, { key: 'ukuran_sepatu', label: 'Uk. Sepatu' }, 
        { key: 'bertato', label: 'Bertato?' }, { key: 'berkacamata', label: 'Berkacamata?' }, 
        { key: 'patah_tulang', label: 'Patah Tulang?' }, { key: 'takut_tinggi', label: 'Takut Tinggi?' }, 
        { key: 'riwayat_operasi', label: 'Pernah Operasi?' }, { key: 'detail_operasi', label: 'Detail Operasi' },
        { key: 'sakit_serius', label: 'Sakit 1 thn Terakhir?' }, { key: 'detail_sakit', label: 'Detail Sakit' }
      ] 
    },
    { 
      group: 'Pengalaman, Skill & Info Lain', 
      fields: [
        { key: 'bahasa_indonesia', label: 'Bahasa ID' }, { key: 'bahasa_inggris', label: 'Bahasa EN' },
        { key: 'riwayat_kerja', label: 'Riwayat Pekerjaan' }, { key: 'gaji_terakhir', label: 'Gaji Terakhir' },
        { key: 'gaji_diharapkan', label: 'Gaji Diharapkan' }, { key: 'alasan_keluar', label: 'Alasan Keluar' },
        { key: 'bisa_berenang', label: 'Bisa Berenang?' }, { key: 'bisa_beladiri', label: 'Bisa Beladiri?' },
        { key: 'detail_beladiri', label: 'Detail Beladiri' }, { key: 'keterampilan_lain', label: 'Keahlian Lainnya' },
        { key: 'info_lowongan', label: 'Info Loker Dari' }, { key: 'kenalan_syntegra', label: 'Kenalan PT' },
        { key: 'detail_kenalan', label: 'Nama Kenalan' }, { key: 'info_lowongan', label: 'Info Loker Dari' },
        { key: 'kenalan_syntegra', label: 'Kenalan PT' }, { key: 'detail_kenalan', label: 'Nama Kenalan' }, 
        { key: 'referensi_dari', label: 'Referensi Dari' }
      ] 
    }
  ];

  const [selectedExportFields, setSelectedExportFields] = useState(['nama_lengkap', 'nik_karyawan', 'bidang_jasa', 'posisi_jabatan', 'lokasi_penempatan', 'no_hp']);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candRes, siteRes, posRes, usersRes, payRes, attRes, settingsRes, tasksRes] = await Promise.all([
        supabase.from('candidates').select('*').order('created_at', { ascending: false }),
        supabase.from('master_sites').select('*').order('region', { ascending: true }),
        supabase.from('master_positions').select('*').order('name', { ascending: true }),
        supabase.from('initial_users').select('id, division, nik, name'), 
        supabase.from('finance_payroll').select('*, initial_users!finance_payroll_user_id_fkey(name, nik)').order('created_at', { ascending: false }),
        supabase.from('hrd_attendance_records').select('*').order('tanggal', { ascending: true }),
        supabase.from('hrd_settings').select('*'),
        supabase.from('initial_tasks').select('*') // <-- INI PENTING
      ]);
      
      if (candRes.error) throw candRes.error;
      if (siteRes.error) throw siteRes.error;
      if (posRes.error) throw posRes.error;
      
      setCandidates(candRes.data || []);
      setMasterSites(siteRes.data || []);
      setMasterPositions(posRes.data || []);
      setPayrollHistory(payRes.data || []);
      setUsers(usersRes.data || []); 
      if (tasksRes && tasksRes.data) {
          setTasks(tasksRes.data); // MENYIMPAN DATA TUGAS KE DALAM STATE 'tasks'
      }
      
      // Sinkronisasi Pengaturan HRD (Jam Site & KPI)
      if (settingsRes.data) {
         const siteCfg = settingsRes.data.find(s => s.setting_type === 'SITE_TIME');
         if (siteCfg) setSiteTimeConfig(siteCfg.setting_data);
         
         const kpiCfg = settingsRes.data.find(s => s.setting_type === 'KPI_CONFIG');
         if (kpiCfg) setKpiConfig(kpiCfg.setting_data);
      }

      // Formatting Data Absensi (Konversi struktur datar DB ke bentuk hierarki / grouped yang dipakai tabel Dashboard)
      if (attRes.data) {
         const groupedAtt = {};
         attRes.data.forEach(r => {
             if (!groupedAtt[r.nik_karyawan]) {
                 groupedAtt[r.nik_karyawan] = {
                    nik: r.nik_karyawan,
                    nama: r.nama_karyawan,
                    periode: r.periode_bulan,
                    site: r.site_penempatan,
                    records: []
                 };
             }
             groupedAtt[r.nik_karyawan].records.push({
                 id: r.id, // ID Supabase untuk kemudahan hapus/edit
                 hari: r.hari,
                 tanggal: r.tanggal,
                 jamMasuk: r.jam_masuk,
                 jamKeluar: r.jam_keluar,
                 telatMenit: r.telat_menit,
                 keterangan_asli: r.keterangan
             });
         });
         setAttendanceData(Object.values(groupedAtt));
      }
      
      // Sinkronisasi Divisi dari Task Management & HRIS
      let tmDivisions = [];
      if (usersRes.data) tmDivisions = usersRes.data.map(u => u.division).filter(Boolean);
      let candDivisions = candRes.data.map(c => c.bidang_jasa).filter(Boolean);
      const uniqueDivisions = [...new Set([...tmDivisions, ...candDivisions])].sort();
      setMasterDivisions(uniqueDivisions);

    } catch (error) { 
      alert("Gagal memuat data: " + error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleRefresh = () => { 
    setSearchTerm(''); setFilterJasa(''); 
    setFilterGender(''); setFilterAge(''); setFilterEdu(''); setFilterHeight(''); 
    fetchData(); 
  };

  const toggleMenu = (menu) => { setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] })); };
  const toggleRegion = (region) => { setExpandedMenus(prev => ({ ...prev, regions: { ...prev.regions, [region]: !prev.regions[region] } })); };
  const handleNavClick = (module, filter, title) => { setCurrentView({ module, filter, title }); if (window.innerWidth < 768) setIsSidebarOpen(false); };

  // --- CRUD MASTER SITE ---
  const handleAddSite = async (e) => {
    if (!user?.can_create_hrd) { alert('Anda tidak memiliki hak tambah data'); return; }
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
    setEditSiteData({ region: site.region, name: site.name, info: site.info || '', kategori_karyawan: site.kategori_karyawan || 'Pekerja Site' });
  };

  const handleUpdateSite = async (id) => {
    if (!user?.can_edit_hrd) { alert('Anda tidak memiliki hak edit data'); return; }
    try {
      const originalSite = masterSites.find(s => s.id === id);
      const { error } = await supabase.from('master_sites').update(editSiteData).eq('id', id);
      if (error) throw error;

      if (originalSite && originalSite.name) {
        const { error: candError } = await supabase.from('candidates')
          .update({ lokasi_penempatan: editSiteData.name, kategori_karyawan: editSiteData.kategori_karyawan })
          .eq('lokasi_penempatan', originalSite.name);
        if (candError) console.error("Gagal sinkronisasi kategori karyawan:", candError);
      }
      alert('Data Site diperbarui!'); setEditingSiteId(null); fetchData();
    } catch (error) { alert('Gagal memperbarui data site: ' + error.message); }
  };

  const deleteSite = async (id, name) => {
    if (!user?.can_delete_hrd) { alert('Anda tidak memiliki hak hapus data'); return; }
    if(!window.confirm(`Hapus Site "${name}" dari sistem?`)) return;
    try {
      const { error } = await supabase.from('master_sites').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) { alert('Gagal menghapus site: ' + error.message); }
  };

  // --- CRUD MASTER POSISI ---
  const handleAddPosition = async (e) => {
    e.preventDefault();
    if (!user?.can_create_hrd) { alert('Akses ditolak'); return; }
    try {
      const { error } = await supabase.from('master_positions').insert([{ name: newPositionName }]);
      if (error) throw error;
      alert(`Posisi "${newPositionName}" berhasil ditambahkan!`);
      setNewPositionName('');
      fetchData();
    } catch (error) { alert('Gagal menambah posisi: ' + error.message); }
  };

  const handleUpdatePosition = async (id) => {
    if (!user?.can_edit_hrd) { alert('Akses ditolak'); return; }
    try {
      const { error } = await supabase.from('master_positions').update({ name: editPosName }).eq('id', id);
      if (error) throw error;
      alert('Posisi berhasil diperbarui!');
      setEditingPosId(null);
      fetchData();
    } catch (error) { alert('Gagal update posisi: ' + error.message); }
  };

  const deletePosition = async (id, name) => {
    if (!user?.can_delete_hrd) { alert('Akses ditolak'); return; }
    if(!window.confirm(`Hapus posisi "${name}"?`)) return;
    try {
      const { error } = await supabase.from('master_positions').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) { alert('Gagal menghapus posisi: ' + error.message); }
  };

  // --- SELECT & BULK ACTIONS ---
  const toggleSelectAll = (e, currentFilteredData) => {
    if (e.target.checked) setSelectedIds(currentFilteredData.map(c => c.id)); else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id)); else setSelectedIds([...selectedIds, id]);
  };

  const bulkDeleteCandidates = async () => {
    if (!user?.can_delete_hrd) { alert('Anda tidak memiliki hak hapus data'); return; }
    if(!window.confirm(`PERINGATAN: Hapus PERMANEN ${selectedIds.length} data yang dipilih?`)) return;
    try {
      const { error } = await supabase.from('candidates').delete().in('id', selectedIds);
      if (error) throw error;
      setCandidates(candidates.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]); alert(`Berhasil menghapus ${selectedIds.length} data.`);
    } catch (error) { alert('Gagal menghapus data: ' + error.message); }
  };

  const bulkUpdateStatus = async (newStatus) => {
    if (!user?.can_edit_hrd) { alert('Anda tidak memiliki hak edit'); return; }
    if(!window.confirm(`Pindahkan ${selectedIds.length} kandidat ke status ${newStatus}?`)) return;
    try {
      const { error } = await supabase.from('candidates').update({ status: newStatus }).in('id', selectedIds);
      if (error) throw error;
      setCandidates(candidates.map(c => selectedIds.includes(c.id) ? { ...c, status: newStatus } : c));
      setSelectedIds([]); alert(`Berhasil memindahkan ${selectedIds.length} kandidat ke ${newStatus}.`);
    } catch (error) { alert('Gagal update massal: ' + error.message); }
  };

  const executeBulkMutasi = async () => {
    if (!user?.can_edit_hrd) { alert('Anda tidak memiliki hak mutasi'); return; }
    if (!bulkLokasi) { alert("Silakan pilih lokasi penempatan."); return; }
    
    const selectedSite = masterSites.find(s => s.name === bulkLokasi);
    const targetKategori = selectedSite ? selectedSite.kategori_karyawan : 'Pekerja Site';

    if(!window.confirm(`Mutasi ${selectedIds.length} karyawan ke "${bulkLokasi}"?`)) return;
    
    try {
      const payload = { lokasi_penempatan: bulkLokasi, kategori_karyawan: targetKategori };
      const { error } = await supabase.from('candidates').update(payload).in('id', selectedIds);
      if (error) throw error;
      
      setCandidates(candidates.map(c => selectedIds.includes(c.id) ? { ...c, ...payload } : c));
      setSelectedIds([]); setShowBulkModal(false); setBulkLokasi('');
      alert(`Berhasil memutasi ${selectedIds.length} karyawan.`);
    } catch (error) { alert('Gagal mutasi data: ' + error.message); }
  };

  const updateStatus = async (id, newStatus) => {
    if (!user?.can_edit_hrd) { alert('Anda tidak memiliki hak edit data'); return; }
    if(!window.confirm(`Ubah status menjadi ${newStatus}?`)) return;
    try {
      const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setCandidates(candidates.map(c => c.id === id ? { ...c, status: newStatus } : c));
      setSelectedCandidate(null); setIsEditingProfile(false);
    } catch (error) { alert('Gagal mengupdate status: ' + error.message); }
  };

  const saveCandidateInfo = async (id) => {
    if (!user?.can_edit_hrd) {alert('Anda tidak memiliki hak edit data'); return;}
    if(!window.confirm("Simpan perubahan Penempatan / Mutasi ini?")) return;
    try {
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
  
  // TAMBAHKAN BARIS INI UNTUK MEMBLOKIR AKSES
  if (!user?.can_edit_hrd) { 
    alert('Akses Ditolak: Anda tidak memiliki hak untuk mengubah profil karyawan.'); 
    return; 
  }

  try {
    const { error } = await supabase.from('candidates').update(editProfileData).eq('id', selectedCandidate.id);
      if (error) throw error;
      
      if (selectedCandidate.status === 'INTI' && selectedCandidate.nik_karyawan) {
        await supabase.from('initial_users').update({ 
          name: editProfileData.nama_lengkap, 
          nik: editProfileData.nik_karyawan, 
          division: editProfileData.bidang_jasa,
          position: editProfileData.posisi_jabatan || '',
          role: editProfileData.level_jabatan || 'staff',
          base_salary: Number(editProfileData.base_salary) || 0 // <-- SINKRONISASI GAJI KE TABEL FINANCE
        }).eq('nik', selectedCandidate.nik_karyawan); 
      }
      alert('Profil Karyawan berhasil diperbarui!');
      setCandidates(candidates.map(c => c.id === selectedCandidate.id ? { ...c, ...editProfileData } : c));
      setSelectedCandidate({ ...selectedCandidate, ...editProfileData }); setIsEditingProfile(false);
    } catch (error) { alert('Gagal memperbarui profil: ' + error.message); }
  };

  const fetchApplicants = async () => {
      if (!user) return;
      
      let query = supabase
          .from('applicants')
          .select('*');

      // Perbaikan: Gunakan user.tenant_id jika sistem multi-tenant digunakan
      if (user.tenant_id) {
          query = query.eq('tenant_id', user.tenant_id);
      }

      // Logika Filter Tanggal Berdasarkan kolom 'created_at'
      if (startDate) {
          query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
          query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
      }

      // Logika Sorting: Pelamar terbaru muncul paling atas
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
          console.error("Gagal mengambil data pelamar:", error);
      } else {
          setApplicants(data);
      }
  };

  // Gunakan useEffect untuk memanggil fetchApplicants setiap kali filter berubah
  useEffect(() => {
    fetchApplicants(); 
  }, [startDate, endDate]);

  // --- UPLOAD DOKUMEN ---
  const handleUploadDokumen = async (e, fieldKey) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingDoc(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${fieldKey}_${Date.now()}.${fileExt}`;
      const filePath = `berkas_karyawan/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('berkas').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('berkas').getPublicUrl(filePath);
      
      setEditProfileData({ ...editProfileData, [fieldKey]: publicUrlData.publicUrl });
      alert('Dokumen berhasil diunggah!');
    } catch (err) {
      alert('Gagal mengunggah dokumen. Error: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const renderDocInput = (label, fieldKey) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
      <div className="flex items-center gap-2">
         <input type="text" value={editProfileData[fieldKey] || ''} onChange={e => setEditProfileData({...editProfileData, [fieldKey]: e.target.value})} placeholder="URL Dokumen..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500" />
         <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition shrink-0">
           {uploadingDoc ? '...' : 'Upload'}
           <input type="file" className="hidden" onChange={(e) => handleUploadDokumen(e, fieldKey)} disabled={uploadingDoc} />
         </label>
      </div>
    </div>
  );

  // --- SINKRONISASI PORTAL TASK MANAGEMENT ---
  const syncToTaskManagement = async (candidate) => {
    if (!candidate.nik_karyawan) { alert("GAGAL: NIK Karyawan masih kosong!"); return; }
    if(!window.confirm(`Buatkan akun portal untuk ${candidate.nama_lengkap}?`)) return;
    try {
      const { data: existingUser } = await supabase.from('initial_users').select('nik').eq('nik', candidate.nik_karyawan).single();
      if (existingUser) { alert("Akun dengan NIK ini sudah terdaftar!"); return; }
      
      const payload = { 
        nik: candidate.nik_karyawan, 
        name: candidate.nama_lengkap, 
        password: '12345678', 
        role: candidate.level_jabatan || 'staff',
        division: candidate.bidang_jasa || '', 
        position: candidate.posisi_jabatan || '', 
        has_portal_access: false 
      };
      
      const { error } = await supabase.from('initial_users').insert([payload]);
      if (error) throw error; alert(`SUKSES: Akun disinkronkan!`);
    } catch (error) { alert('Gagal sinkronisasi data: ' + error.message); }
  };

  const bulkSyncToTaskManagement = async () => {
    const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
    const validCandidates = selectedCandidates.filter(c => c.nik_karyawan && c.nik_karyawan.trim() !== '');
    
    if (validCandidates.length === 0) { alert("GAGAL: Dari data yang dipilih, tidak ada yang memiliki NIK."); return; }
    if(!window.confirm(`Proses sinkronisasi ${validCandidates.length} karyawan ke portal TM?`)) return;

    setLoading(true);
    try {
      const validNiks = validCandidates.map(c => c.nik_karyawan);
      const { data: existingUsers, error: fetchErr } = await supabase.from('initial_users').select('nik').in('nik', validNiks);
      if (fetchErr) throw fetchErr;

      const existingNiks = existingUsers.map(u => u.nik);
      const payloadToInsert = validCandidates
        .filter(c => !existingNiks.includes(c.nik_karyawan))
        .map(c => ({
          nik: c.nik_karyawan, 
          name: c.nama_lengkap, 
          password: '12345678', 
          role: c.level_jabatan || 'staff',
          division: c.bidang_jasa || '', 
          position: c.posisi_jabatan || '', 
          has_portal_access: false
        }));

      if (payloadToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('initial_users').insert(payloadToInsert);
        if (insertErr) throw insertErr;
        alert(`SUKSES: ${payloadToInsert.length} akun berhasil dibuat di Portal!`);
      } else { alert("Semua karyawan yang dipilih sudah terdaftar di Portal."); }
      setSelectedIds([]);
    } catch (error) { alert("Gagal melakukan sinkronisasi massal: " + error.message); } finally { setLoading(false); }
  };

  // --- FUNGSI RESIGN & AKTIFASI KEMBALI KARYAWAN ---
  const processResign = async (candidate, isBulk = false) => {
    if (!user?.can_edit_hrd && user?.role !== 'admin') { alert('Akses ditolak'); return; }
    
    let targetIds = isBulk ? selectedIds : [candidate.id];
    let targetNiks = isBulk 
      ? candidates.filter(c => selectedIds.includes(c.id) && c.nik_karyawan).map(c => c.nik_karyawan)
      : (candidate.nik_karyawan ? [candidate.nik_karyawan] : []);

    if (!window.confirm(`Yakin ingin memproses RESIGN untuk ${targetIds.length} karyawan? Akses login aplikasi ERP mereka akan otomatis ditutup.`)) return;

    setLoading(true);
    try {
      // 1. Pindahkan status menjadi RESIGN di HRIS (TAMBAHKAN PENANGKAP ERROR)
      const { error: err1 } = await supabase.from('candidates').update({ status: 'RESIGN' }).in('id', targetIds);
      if (err1) throw err1;
      
      // 2. Cabut hak akses portal di task management (TIDAK BISA LOGIN LAGI)
      if (targetNiks.length > 0) {
        const { error: err2 } = await supabase.from('initial_users').update({ has_portal_access: false }).in('nik', targetNiks);
        if (err2) console.warn("Peringatan: Gagal cabut akses portal:", err2.message);
      }

      // 3. UPDATE STATE LOKAL: UI Langsung Berubah Tanpa Perlu Refresh Data
      setCandidates(candidates.map(c => targetIds.includes(c.id) ? { ...c, status: 'RESIGN' } : c));

      alert(`SUKSES: ${targetIds.length} karyawan berhasil di-resign dan aksesnya dicabut.`);
      
      // 4. Bersihkan centang atau tutup modal pop-up
      if (isBulk) setSelectedIds([]);
      else setSelectedCandidate(null);
      
    } catch (error) {
      alert('Gagal memproses resign: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const processReactivate = async (candidate, isBulk = false) => {
    if (!user?.can_edit_hrd && user?.role !== 'admin') { alert('Akses ditolak'); return; }
    
    let targetIds = isBulk ? selectedIds : [candidate.id];
    let targetNiks = isBulk 
      ? candidates.filter(c => selectedIds.includes(c.id) && c.nik_karyawan).map(c => c.nik_karyawan)
      : (candidate.nik_karyawan ? [candidate.nik_karyawan] : []);

    if (!window.confirm(`Yakin ingin MENGAKTIFKAN KEMBALI ${targetIds.length} karyawan? Akses login aplikasi ERP mereka akan dibuka lagi.`)) return;

    setLoading(true);
    try {
      // 1. Kembalikan status menjadi INTI di HRIS
      const { error: err1 } = await supabase.from('candidates').update({ status: 'INTI' }).in('id', targetIds);
      if (err1) throw err1;
      
      // 2. Buka kembali hak akses portal di task management
      if (targetNiks.length > 0) {
        const { error: err2 } = await supabase.from('initial_users').update({ has_portal_access: true }).in('nik', targetNiks);
        if (err2) console.warn("Peringatan: Gagal aktivasi portal:", err2.message);
      }

      // 3. UPDATE STATE LOKAL: UI Langsung Berubah Tanpa Perlu Refresh Data
      setCandidates(candidates.map(c => targetIds.includes(c.id) ? { ...c, status: 'INTI' } : c));

      alert(`SUKSES: ${targetIds.length} karyawan berhasil diaktifkan kembali.`);
      
      // 4. Bersihkan centang atau tutup modal pop-up
      if (isBulk) setSelectedIds([]);
      else setSelectedCandidate(null);
      
    } catch (error) {
      alert('Gagal mengaktifkan kembali: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FITUR TAMBAH MANUAL & EDIT MASSAL ---
  const handleAddManualSubmit = async (e) => {
    e.preventDefault();
    if (!user?.can_create_hrd && user?.role !== 'admin') { alert('Akses Ditolak'); return; }
    try {
      // Set default status INTI agar langsung masuk ke HRIS Karyawan
      const payload = { ...newManualData, status: 'INTI' };
      const { error } = await supabase.from('candidates').insert([payload]);
      if (error) throw error;
      alert('Berhasil menambah karyawan manual!');
      setShowAddManualModal(false);
      setNewManualData({ nama_lengkap: '', nik_karyawan: '', bidang_jasa: '', posisi_jabatan: '', lokasi_penempatan: '', status_kontrak: 'Probation', base_salary: 0 });
      fetchData(); // Refresh table
    } catch (err) { alert('Gagal menambah data: ' + err.message); }
  };

  const executeSpreadsheetBulkEdit = async () => {
    if (!user?.can_edit_hrd && user?.role !== 'admin') { alert('Akses Ditolak'); return; }
    if (!window.confirm(`Simpan seluruh perubahan untuk ${bulkEditList.length} karyawan?`)) return;
    
    setLoading(true);
    try {
      // Loop untuk menyimpan data setiap karyawan yang ada di tabel bulk edit
      const updatePromises = bulkEditList.map(item => {
        const updateData = {};
        // Mapping semua kolom yang akan diupdate ke DB
        BULK_EDIT_FIELDS.forEach(field => {
           updateData[field.key] = item[field.key];
        });
        return supabase.from('candidates').update(updateData).eq('id', item.id);
      });

      await Promise.all(updatePromises);
      
      alert(`SUKSES: Seluruh data untuk ${bulkEditList.length} karyawan berhasil diperbarui secara massal!`);
      setShowBulkEditModal(false);
      setSelectedIds([]);
      fetchData(); // Refresh table
    } catch (err) {
      alert('Gagal menyimpan data massal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FITUR IMPORT DAN UPDATE MASSAL EXCEL ---
  const downloadImportTemplate = () => {
    // Baris pertama ini adalah CONTOH pengisian.
    // Sistem dirancang untuk MENGABAIKAN baris ini saat diupload berdasarkan kata "CONTOH".
    const templateData = [
      {
        "NIK Karyawan": "CONTOH-12345",
        "Nama Lengkap": "Joss Karyawan (Jangan Hapus Baris Ini)",
        "Posisi Jabatan": "Staff Administrasi",
        "Divisi / Bidang Jasa": "Finance",
        "Penempatan Kerja": "Head Office",
        "Level Akses Portal": "staff (Pilih: staff/manager/director/admin)"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Melebarkan ukuran kolom Excel otomatis agar rapi saat didownload HRD
    worksheet['!cols'] = [
      { wch: 20 }, // NIK
      { wch: 35 }, // Nama
      { wch: 25 }, // Posisi
      { wch: 25 }, // Divisi
      { wch: 25 }, // Penempatan
      { wch: 45 }  // Level Akses
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import Data Karyawan');
    XLSX.writeFile(workbook, 'Template_Import_Karyawan.xlsx');
  };

  // --- FUNGSI DOWNLOAD TEMPLATE REKAP ABSENSI ---
  const downloadAttendanceTemplate = () => {
    const templateData = [
      {
        "Nama Lengkap": "REFIANDO VANDANA",
        "NIK / Username": "O-31-140225-00047",
        "Jam Masuk": "2026-09-14 09:21:31",
        "Jam Keluar": "2026-09-14 18:05:00",
        "Keterangan (Opsional)": "Tepat Waktu"
      },
      {
        "Nama Lengkap": "KUSNADI",
        "NIK / Username": "O-31-191124-00014",
        "Jam Masuk": "2026-09-15 08:00:00",
        "Jam Keluar": "Belum Checkout",
        "Keterangan (Opsional)": "Lupa Absen Pulang"
      },
      {
        "Nama Lengkap": "Sari Rahma",
        "NIK / Username": "O-31-200525-00030",
        "Jam Masuk": "2026-09-16",
        "Jam Keluar": "",
        "Keterangan (Opsional)": "OFF"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [ { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 30 } ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Absensi');
    XLSX.writeFile(workbook, 'Template_Upload_Absensi.xlsx');
  };

  const handleSiteTimeConfigChange = async (siteName, field, value) => {
    const newConfig = {
      ...siteTimeConfig,
      [siteName]: { ...siteTimeConfig[siteName], [field]: value }
    };
    setSiteTimeConfig(newConfig);
    // Simpan otomatis ke Supabase saat jam diubah
    try {
        const { data: existing } = await supabase.from('hrd_settings').select('id').eq('setting_type', 'SITE_TIME').single();
        if (existing) {
            await supabase.from('hrd_settings').update({ setting_data: newConfig }).eq('id', existing.id);
        } else {
            await supabase.from('hrd_settings').insert([{ setting_type: 'SITE_TIME', setting_data: newConfig }]);
        }
    } catch (err) { console.error("Gagal menyimpan konfigurasi jam site:", err); }
  };

  const handleUploadRekapAbsensi = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if(!window.confirm("Unggah dan masukkan data absensi ini ke dalam Database? Data yang duplikat pada tanggal yang sama tidak akan tertimpa otomatis, pastikan data yang diunggah belum pernah dimasukkan.")) return;
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const payloadToInsert = [];

        data.forEach(row => {
           const nik = String(row['NIK'] || row['NIK / Username'] || row['NIK Karyawan'] || '').trim();
           if (!nik) return;

           const dbKaryawan = candidates.find(c => c.nik_karyawan === nik);
           const nama = row['Nama Lengkap'] || row['Nama'] || dbKaryawan?.nama_lengkap || 'Tanpa Nama';
           // BACA RAW DATA TANPA STRING() AGAR TIPE DATE & NUMBER EXCEL TIDAK RUSAK
           const rawMasuk = row['Jam Masuk'] || row['jam masuk'] || '';
           const rawKeluar = row['Jam Keluar'] || row['jam keluar'] || '';
           const rawKet = row['Keterangan'] || row['Keterangan (Opsional)'] || row['keterangan'] || row['Jadwal'] || row['jadwal'] || ''; 
           
           const siteKaryawan = dbKaryawan?.lokasi_penempatan || 'Site Tidak Terdaftar';
           
           let tanggalExcel = row['Tanggal'] || '';
           let jamMasuk = null;
           let jamKeluar = null;
           
           const processDateTime = (rawVal) => {
               if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '' || String(rawVal).toLowerCase().includes('belum')) return { tgl: '', jam: null };
               
               // 1. JIKA EXCEL MENGUBAHNYA MENJADI FORMAT TANGGAL ASLI JAVASCRIPT
               if (rawVal instanceof Date) {
                   if (isNaN(rawVal)) return { tgl: '', jam: null };
                   // PENTING: Gunakan getUTC...() agar jam asli Excel tidak ditambah +7 jam oleh komputer Anda!
                   const yy = rawVal.getUTCFullYear();
                   const mm = String(rawVal.getUTCMonth() + 1).padStart(2, '0');
                   const dd = String(rawVal.getUTCDate()).padStart(2, '0');
                   const h = String(rawVal.getUTCHours()).padStart(2, '0');
                   const m = String(rawVal.getUTCMinutes()).padStart(2, '0');
                   return { tgl: `${yy}-${mm}-${dd}`, jam: `${h}:${m}` };
               }
               
               // 2. JIKA EXCEL MENGUBAHNYA MENJADI ANGKA SERI (SERIAL NUMBER EXCEL)
               if (typeof rawVal === 'number') {
                   // Perhitungan manual ini menghasilkan waktu UTC baku
                   const dateObj = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
                   if (isNaN(dateObj)) return { tgl: '', jam: null };
                   const yy = dateObj.getUTCFullYear();
                   const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                   const dd = String(dateObj.getUTCDate()).padStart(2, '0');
                   const h = String(dateObj.getUTCHours()).padStart(2, '0');
                   const m = String(dateObj.getUTCMinutes()).padStart(2, '0');
                   return { tgl: `${yy}-${mm}-${dd}`, jam: `${h}:${m}` };
               }

               // 3. JIKA EXCEL MEMBACANYA SEBAGAI TEKS STRING BIASA
               const str = String(rawVal).trim();
               const matchIso = str.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::\d{2})?)?/);
               if (matchIso) return { tgl: `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`, jam: matchIso[4] ? `${matchIso[4]}:${matchIso[5]}` : null };
               
               const matchId = str.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::\d{2})?)?/);
               if (matchId) return { tgl: `${matchId[3]}-${matchId[2]}-${matchId[1]}`, jam: matchId[4] ? `${matchId[4]}:${matchId[5]}` : null };
               
               const matchTime = str.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
               if (matchTime) return { tgl: '', jam: `${matchTime[1].padStart(2, '0')}:${matchTime[2]}` };
               
               return { tgl: '', jam: null };
           };

           const parsedMasuk = processDateTime(rawMasuk);
           const parsedKeluar = processDateTime(rawKeluar);

           if (parsedMasuk.tgl) tanggalExcel = parsedMasuk.tgl;
           else if (parsedKeluar.tgl) tanggalExcel = parsedKeluar.tgl;

           jamMasuk = parsedMasuk.jam;
           jamKeluar = parsedKeluar.jam;

           let periode = '';
           let hari = '';
           let dateStr = '-';
           
           if (tanggalExcel) {
             if (typeof tanggalExcel === 'number') {
                const dateObj = new Date((tanggalExcel - (25567 + 2)) * 86400 * 1000);
                if (!isNaN(dateObj)) {
                   dateStr = dateObj.toISOString().split('T')[0];
                   periode = dateStr.slice(0, 7);
                   const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                   hari = days[dateObj.getDay()];
                }
             } else if (typeof tanggalExcel === 'string') {
                const parts = tanggalExcel.split('-');
                if (parts.length === 3) {
                   dateStr = tanggalExcel;
                   periode = `${parts[0]}-${parts[1]}`;
                   const localDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
                   const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                   hari = days[localDate.getDay()];
                }
             }
           }

           const isLibur = String(rawKet).toUpperCase().includes('LIBUR') || String(rawKet).toUpperCase().includes('OFF');
           let batasMasuk = siteTimeConfig[siteKaryawan]?.masuk || '08:00'; 
           
           if (!isLibur && rawKet) {
               const matchJadwal = String(rawKet).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
               if (matchJadwal) batasMasuk = `${matchJadwal[1].padStart(2, '0')}:${matchJadwal[2]}`;
           }
           
           let telatMenit = 0;
           if (!isLibur && jamMasuk && jamMasuk > batasMasuk) {
              const [masukH, masukM] = jamMasuk.split(':').map(Number);
              const [batasH, batasM] = batasMasuk.split(':').map(Number);
              telatMenit = ((masukH * 60) + masukM) - ((batasH * 60) + batasM);
           }
           
           if(dateStr !== '-') {
               payloadToInsert.push({
                   nik_karyawan: nik,
                   nama_karyawan: nama,
                   periode_bulan: filterPeriodAttendance || periode || new Date().toISOString().slice(0, 7),
                   tanggal: dateStr,
                   hari: hari || '-',
                   jam_masuk: jamMasuk || '-',
                   jam_keluar: jamKeluar || '-',
                   keterangan: isLibur ? 'OFF / Libur' : rawKet,
                   telat_menit: telatMenit > 0 ? telatMenit : 0,
                   site_penempatan: siteKaryawan
               });
           }
        });

        if (payloadToInsert.length > 0) {
            const { error: insertErr } = await supabase.from('hrd_attendance_records').insert(payloadToInsert);
            if (insertErr) throw insertErr;
            alert(`Berhasil menyimpan ${payloadToInsert.length} rekaman absensi ke Database!`);
            fetchData(); // Refresh UI langsung dari Database
        } else {
            alert("Tidak ada data valid dengan format tanggal yang ditemukan untuk disimpan.");
        }
      } catch (err) { 
        alert("Gagal menyimpan ke database: " + err.message); 
      } finally { 
        setLoading(false);
        e.target.value = null; 
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- FUNGSI EDIT & HAPUS REKAP ABSENSI ---
  const handleEditAttClick = (nik, rIdx, rec) => {
    if (!user?.can_edit_hrd && user?.role !== 'admin') { alert("Akses ditolak"); return; }
    setEditingAtt({ nik, rIdx });
    setEditAttData({ jamMasuk: rec.jamMasuk !== '-' ? rec.jamMasuk : '', jamKeluar: rec.jamKeluar !== '-' ? rec.jamKeluar : '', keterangan_asli: rec.keterangan_asli });
  };

  const handleSaveAttEdit = async () => {
    if (!editingAtt) return;
    const { nik, rIdx } = editingAtt;
    const empData = attendanceData.find(item => item.nik === nik);
    if (!empData) return;
    
    const recordId = empData.records[rIdx].id; // Harus punya ID Supabase

    let batasMasuk = siteTimeConfig[empData.site]?.masuk || '08:00';
    const isLibur = String(editAttData.keterangan_asli).toUpperCase().includes('LIBUR') || String(editAttData.keterangan_asli).toUpperCase().includes('OFF');
    
    if (!isLibur && editAttData.keterangan_asli) {
        const matchJadwal = String(editAttData.keterangan_asli).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
        if (matchJadwal) batasMasuk = `${matchJadwal[1].padStart(2, '0')}:${matchJadwal[2]}`;
    }

    let telatMenit = 0;
    if (!isLibur && editAttData.jamMasuk && editAttData.jamMasuk > batasMasuk) {
        const [masukH, masukM] = editAttData.jamMasuk.split(':').map(Number);
        const [batasH, batasM] = batasMasuk.split(':').map(Number);
        telatMenit = ((masukH * 60) + masukM) - ((batasH * 60) + batasM);
    }

    try {
        setLoading(true);
        const payloadUpdate = {
            jam_masuk: editAttData.jamMasuk || '-',
            jam_keluar: editAttData.jamKeluar || '-',
            keterangan: isLibur ? 'OFF / Libur' : editAttData.keterangan_asli,
            telat_menit: telatMenit > 0 ? telatMenit : 0
        };

        const { error } = await supabase.from('hrd_attendance_records').update(payloadUpdate).eq('id', recordId);
        if (error) throw error;
        
        alert("Berhasil mengupdate data absensi.");
        setEditingAtt(null);
        fetchData();
    } catch (err) { alert("Gagal update data: " + err.message); } finally { setLoading(false); }
  };

  const handleDeleteAttClick = async (nik, rIdx) => {
    const empData = attendanceData.find(item => item.nik === nik);
    const recordId = empData?.records[rIdx]?.id;
    if (!recordId) return;

    if (user?.role === 'admin') {
        if(window.confirm('Hapus data absen ini secara PERMANEN dari Database?')) {
            try {
                setLoading(true);
                const { error } = await supabase.from('hrd_attendance_records').delete().eq('id', recordId);
                if (error) throw error;
                alert("Data berhasil dihapus.");
                fetchData();
            } catch (err) { alert("Gagal hapus: " + err.message); } finally { setLoading(false); }
        }
    } else {
        // Jika bukan admin, hanya simulasi di UI untuk minta approval
        if(window.confirm('Anda bukan Admin. Kirim permohonan hapus data ini ke Admin untuk approval?')) {
            setPendingDeletes([...pendingDeletes, { nik, rIdx, recordId }]);
            alert('Permohonan hapus (Approval) telah dikirim ke Admin.');
        }
    }
  };

  const handleApproveDelete = async (nik, rIdx) => {
    if (user?.role !== 'admin') return;
    const req = pendingDeletes.find(p => p.nik === nik && p.rIdx === rIdx);
    if (!req) return;

    try {
        setLoading(true);
        const { error } = await supabase.from('hrd_attendance_records').delete().eq('id', req.recordId);
        if (error) throw error;
        alert('Penghapusan disetujui dan data dihilangkan permanen.');
        setPendingDeletes(pendingDeletes.filter(p => !(p.nik === nik && p.rIdx === rIdx)));
        fetchData();
    } catch (err) { alert("Gagal menyetujui hapus: " + err.message); } finally { setLoading(false); }
  };

  const handleRejectDelete = (nik, rIdx) => {
    if (user?.role !== 'admin') return;
    setPendingDeletes(pendingDeletes.filter(p => !(p.nik === nik && p.rIdx === rIdx)));
    alert('Permohonan hapus ditolak.');
  };

  // --- FUNGSI CETAK LAPORAN KPI KE PDF ---
  const handlePrintKpiReport = async () => {
    if (!window.html2pdf) {
       // Panggil CDN html2pdf secara dinamis jika belum ada di index.html
       const script = document.createElement('script');
       script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
       document.head.appendChild(script);
       script.onload = () => executePdfGeneration();
    } else {
       executePdfGeneration();
    }
  };

  const executePdfGeneration = () => {
    setIsGeneratingKpiPdf(true);
    setTimeout(() => {
      const element = document.getElementById('kpi-report-print-area');
      const opt = {
        margin:       [10, 10, 10, 10], 
        filename:     `Laporan_KPI_Karyawan_${leaderboardFilterPeriod || 'All-Time'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      window.html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingKpiPdf(false);
      });
    }, 2000); // Naikkan jeda waktu agar layout stabil sebelum dipotret
  };
  
  // (Tambahan) Update fungsi Simpan Pengaturan KPI agar masuk ke Database
  const saveKpiConfigToDB = async () => {
     try {
        const { data: existing } = await supabase.from('hrd_settings').select('id').eq('setting_type', 'KPI_CONFIG').single();
        if (existing) {
            await supabase.from('hrd_settings').update({ setting_data: kpiConfig }).eq('id', existing.id);
        } else {
            await supabase.from('hrd_settings').insert([{ setting_type: 'KPI_CONFIG', setting_data: kpiConfig }]);
        }
        alert('Parameter KPI berhasil disimpan ke Database!'); 
        setIsKpiConfigExpanded(false);
    } catch (err) { alert("Gagal menyimpan KPI: " + err.message); }
  };

  // --- FUNGSI PAYROLL HRD OTOMATIS ---
  const handleUploadAttendance = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if(!selectedPayrollSite) { alert("Pilih lokasi cabang terlebih dahulu."); return; }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const siteCandidates = candidates.filter(c => c.lokasi_penempatan === selectedPayrollSite && c.status === 'INTI');
        const groupedData = {};

        data.forEach(row => {
           const nik = String(row['NIK / Username'] || '').trim();
           if (!nik) return;

           const dbKaryawan = siteCandidates.find(c => c.nik_karyawan === nik);
           
           if (!groupedData[nik]) {
               groupedData[nik] = {
                  nik: nik,
                  nama: row['Nama Lengkap'] || dbKaryawan?.nama_lengkap || 'Tidak Terdaftar DB',
                  valid_db: !!dbKaryawan,
                  gaji_pokok_bulanan: dbKaryawan ? Number(dbKaryawan.base_salary || 0) : 0,
                  total_hari_kerja: 0,
                  total_potongan_telat: 0,
                  custom_values: {} // Tempat nyimpan nilai kolom dinamis
               };
           }

           // Logika Regex Pintar Membaca Jam dari Format Apapun
           const rawMasuk = row['Jam Masuk'] || row['jam masuk'] || row['Jam masuk'];
           let jamAbsen = null;
           
           if (typeof rawMasuk === 'string') {
               const match = rawMasuk.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
               if (match) jamAbsen = `${match[1].padStart(2, '0')}:${match[2]}`;
           } else if (rawMasuk instanceof Date) {
               jamAbsen = rawMasuk.toTimeString().substring(0,5);
           }

           let isTelat = false;
           let potonganHariIni = 0;

           // Cek telat (hanya membandingkan jika format jam valid)
           if (jamAbsen && jamAbsen !== '00:00' && jamAbsen > jamMasukKerja) {
               isTelat = true;
               potonganHariIni = Number(nominalPotonganTelat);
           }

           // Tambah Kehadiran & Potongan Hari Ini ke Karyawan Tersebut
           if (jamAbsen || rawMasuk) {
               groupedData[nik].total_hari_kerja += 1;
               groupedData[nik].total_potongan_telat += potonganHariIni;
           }
        });
        
        // Finalisasi Kalkulasi Prorata Gaji (Gaji / Total Hari Sebulan x Kehadiran)
        const validData = Object.values(groupedData).filter(item => item.valid_db).map(item => {
            const gajiProrata = Math.round((item.gaji_pokok_bulanan / Number(totalHariKerjaSebulan)) * item.total_hari_kerja);
            return { ...item, gaji_prorata: gajiProrata };
        });
        
        if(validData.length === 0) { alert("Data Excel tidak cocok dengan NIK karyawan di cabang ini."); return; }

        setParsedAttendance(validData);
        setPayrollStep(1);
      } catch (err) { alert("Gagal memproses file excel: " + err.message); } finally { e.target.value = null; }
    };
    reader.readAsBinaryString(file);
  };

  // Logika Menambahkan Kolom Bebas (Tunjangan / Potongan)
  const handleAddCustomColumn = (e) => {
      e.preventDefault();
      if(!newColName) return;
      const newId = 'col_' + Date.now();
      
      setPayrollColumns([...payrollColumns, { id: newId, name: newColName, type: newColType }]);
      
      // Beri nilai default 0 untuk semua orang di kolom baru ini
      const updatedData = parsedAttendance.map(emp => ({
          ...emp, custom_values: { ...emp.custom_values, [newId]: 0 }
      }));
      setParsedAttendance(updatedData);
      setShowAddComponent(false);
      setNewColName('');
  };

  const handleCustomValueChange = (empNik, colId, value) => {
      const updated = parsedAttendance.map(emp => {
          if(emp.nik === empNik) {
              return { ...emp, custom_values: { ...emp.custom_values, [colId]: Number(value) } };
          }
          return emp;
      });
      setParsedAttendance(updated);
  };

  const hitungTHP = (item) => {
      // Mulai dari Gaji yang sudah diprorata sesuai hari masuk, dikurangi telat
      let total = Number(item.gaji_prorata) - Number(item.total_potongan_telat);
      
      // Tambah/Kurang nilai dari kolom-kolom custom buatan HRD
      payrollColumns.forEach(col => {
          const val = Number(item.custom_values?.[col.id] || 0);
          if(col.type === 'addition') total += val;
          else if(col.type === 'deduction') total -= val;
      });
      return total > 0 ? total : 0; // Cegah minus
  };

  const submitToFinance = async () => {
      if (parsedAttendance.length === 0) {
          alert("Tidak ada data payroll untuk dikirim.");
          return;
      }

      try {
          setLoading(true);
          const currentMonth = new Date().toISOString().slice(0, 7);

          // Ambil data karyawan di database berdasarkan NIK untuk mendapatkan user_id
          const { data: dbUsers, error: userErr } = await supabase.from('initial_users').select('id, nik');
          if (userErr) throw userErr;

          const userNikMap = {};
          if (dbUsers) {
              dbUsers.forEach(u => { if (u.nik) userNikMap[u.nik] = u.id; });
          }

          // Siapkan payload untuk dimasukkan ke tabel finance_payroll Supabase
          const payloads = parsedAttendance.map(item => {
              const userId = userNikMap[item.nik];
              const finalThp = hitungTHP(item);

              return {
                  user_id: userId || null,
                  period_month: payrollPeriod, // <-- Gunakan periode yang dipilih HRD, bukan bulan otomatis lagi
                  base_salary: Number(item.gaji_pokok_bulanan || item.gaji_prorata || 0),
                  custom_details: [
                      ...(item.komponen_tambahan || []).map(k => ({ name: k.name, type: 'earning', amount: k.amount })),
                      ...(item.komponen_potongan || []).map(k => ({ name: k.name, type: 'deduction', amount: k.amount })),
                      { name: 'Potongan Keterlambatan', type: 'deduction', amount: Number(item.total_potongan_telat || 0) }
                  ],
                  net_salary: finalThp,
                  site_location: selectedPayrollSite,
                  status: 'WAITING_APPROVAL' // <-- STATUS KRUSIAL AGAR MUNCUL DI FINANCE
              };
          }).filter(p => p.user_id !== null); // Pastikan user_id ditemukan di sistem

          if (payloads.length === 0) {
              alert("Gagal: NIK karyawan pada absensi tidak ditemukan di tabel user portal (initial_users). Pastikan sudah disinkronkan.");
              setLoading(false);
              return;
          }

          // Kirim ke database Supabase tabel finance_payroll
          const { error: insertErr } = await supabase.from('finance_payroll').insert(payloads);
          if (insertErr) throw insertErr;

          // Tampilkan Animasi Sukses
          setShowPayrollSuccessModal(true);
          setTimeout(() => {
              setShowPayrollSuccessModal(false);
              setPayrollStep(0);
              setParsedAttendance([]);
              handleNavClick('PAYROLL', 'SUMMARY', 'Ringkasan Data Payroll');
          }, 3000);

      } catch (err) {
          alert("Gagal mengirim payroll ke Finance: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const executeImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm(`Mulai proses import data dari file ${file.name}?`)) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("File Excel kosong atau format tidak sesuai!");
          return;
        }

        // ========================================================
        // 1. LOGIKA AUTO-MASTER POSISI JABATAN (SMART MAPPING)
        // ========================================================
        // Tarik data posisi dari DB
        const { data: dbPositions } = await supabase.from('master_positions').select('*');
        const currentPositions = dbPositions || [];
        
        // Buat Kamus Pencarian Huruf Kecil (Case Insensitive)
        const positionMap = {};
        currentPositions.forEach(p => {
          positionMap[p.name.toLowerCase()] = p.name; // Simpan nama asli dari DB
        });

        const toInsertPositions = [];
        
        // Pindai (scan) Excel untuk mendeteksi posisi baru
        data.forEach(row => {
          const rawPosisi = String(row['Posisi Jabatan'] || '').trim();
          if (rawPosisi) {
            const lowerPos = rawPosisi.toLowerCase();
            // Jika posisi tidak ditemukan di sistem, siapkan untuk ditambah ke master
            if (!positionMap[lowerPos]) {
              toInsertPositions.push({ name: rawPosisi }); 
              positionMap[lowerPos] = rawPosisi; // Tambah ke kamus lokal agar tdk dobel jika ada di baris berikutnya
            }
          }
        });

        // Masukkan posisi baru ke database master
        if (toInsertPositions.length > 0) {
          const { error: posErr } = await supabase.from('master_positions').insert(toInsertPositions);
          if (posErr) throw posErr;
        }

        // ========================================================
        // 2. PERSIAPAN DATA KARYAWAN & PORTAL TM
        // ========================================================
        const { data: existingDB } = await supabase.from('candidates').select('id, nik_karyawan');
        const existingMap = {};
        if (existingDB) {
          existingDB.forEach(d => { if (d.nik_karyawan) existingMap[d.nik_karyawan] = d.id; });
        }

        const { data: existingUsers } = await supabase.from('initial_users').select('id, nik');
        const existingUserMap = {};
        if (existingUsers) {
          existingUsers.forEach(u => { if (u.nik) existingUserMap[u.nik] = u.id; });
        }

        const toInsertCandidates = [];
        const toUpdateCandidates = [];
        const toInsertUsers = [];
        const toUpdateUsers = [];

        data.forEach(row => {
          const nikExcel = String(row['NIK Karyawan'] || '').trim();
          
          // Lewati baris jika kosong atau berisi contoh
          if (!nikExcel || nikExcel.toUpperCase().includes('CONTOH')) return;

          let rawLevel = String(row['Level Akses Portal'] || 'staff').split(' ')[0].toLowerCase().trim();
          const validLevels = ['staff', 'manager', 'director', 'admin'];
          const levelAkses = validLevels.includes(rawLevel) ? rawLevel : 'staff';

          // Gunakan kamus untuk mendapatkan penulisan Posisi yang 100% akurat dari database
          const rawPosisiExcel = String(row['Posisi Jabatan'] || '').trim();
          const finalPosisiJabatan = rawPosisiExcel ? positionMap[rawPosisiExcel.toLowerCase()] : '';

          const payloadHRIS = {
            nama_lengkap: row['Nama Lengkap'] || 'Tanpa Nama',
            nik_karyawan: nikExcel,
            posisi_jabatan: finalPosisiJabatan, // <-- Posisi otomatis mengikuti sistem
            bidang_jasa: row['Divisi / Bidang Jasa'] || '',
            lokasi_penempatan: row['Penempatan Kerja'] || '',
            level_jabatan: levelAkses,
            status: 'INTI',
            kategori_karyawan: 'Pekerja Site',
            status_kontrak: 'Probation',
            tanggal_bergabung: new Date().toISOString().split('T')[0]
          };

          if (existingMap[nikExcel]) {
            toUpdateCandidates.push({ id: existingMap[nikExcel], ...payloadHRIS });
          } else {
            toInsertCandidates.push(payloadHRIS);
          }

          const payloadTM = {
            nik: nikExcel,
            name: payloadHRIS.nama_lengkap,
            password: '12345678',
            role: levelAkses,
            division: payloadHRIS.bidang_jasa,
            position: payloadHRIS.posisi_jabatan,
            has_portal_access: false 
          };

          if (existingUserMap[nikExcel]) {
            toUpdateUsers.push({ id: existingUserMap[nikExcel], ...payloadTM });
          } else {
            toInsertUsers.push(payloadTM);
          }
        });

        // ========================================================
        // 3. EKSEKUSI PENYIMPANAN
        // ========================================================
        if (toInsertCandidates.length > 0) await supabase.from('candidates').insert(toInsertCandidates);
        if (toUpdateCandidates.length > 0) {
          for (const item of toUpdateCandidates) {
            const { id, ...updateData } = item;
            await supabase.from('candidates').update(updateData).eq('id', id);
          }
        }

        if (toInsertUsers.length > 0) await supabase.from('initial_users').insert(toInsertUsers);
        if (toUpdateUsers.length > 0) {
          for (const item of toUpdateUsers) {
            const { id, ...updateData } = item;
            await supabase.from('initial_users').update(updateData).eq('id', id);
          }
        }

        alert(`SUKSES IMPORT!\n- ${toInsertPositions.length} Posisi Jabatan Baru Didaftarkan Sistem\n- ${toInsertCandidates.length} Karyawan Baru\n- ${toUpdateCandidates.length} Karyawan Diperbarui`);
        setShowImportModal(false);
        fetchData(); // Refresh UI untuk memunculkan Karyawan & Posisi Baru
      } catch (err) {
        alert("Gagal memproses data Excel: " + err.message);
      } finally {
        setLoading(false);
        e.target.value = null; 
      }
    };
    reader.readAsBinaryString(file);
  };

  // RUMUS HELPER DASHBOARD ANALYTICS
  const safeParseJSON = (jsonStr) => { 
    if (!jsonStr) return []; 
    let parsed;
    if (typeof jsonStr === 'object') parsed = jsonStr;
    else try { parsed = JSON.parse(jsonStr); } catch (e) { return []; }
    return Array.isArray(parsed) ? parsed : []; 
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getHighestEducation = (riwayatString) => {
    if (!riwayatString) return 'Tidak Diketahui';
    try {
      const history = JSON.parse(riwayatString);
      if (Array.isArray(history) && history.length > 0) return history[0]?.tingkat || 'Tidak Diketahui';
    } catch (e) {
      // Jika HRD mengetik manual teks biasa (bukan format array JSON recruitment), langsung gunakan teksnya
      return String(riwayatString).trim();
    }
    return typeof riwayatString === 'string' ? riwayatString : 'Tidak Diketahui';
  };

  // KALKULASI DATA CARD DASHBOARD
  const statsInti = candidates.filter(c => c.status === 'INTI').length;
  const statsResign = candidates.filter(c => c.status === 'RESIGN').length;
  const statsPending = candidates.filter(c => c.status === 'PENDING').length;
  const statsBank = candidates.filter(c => c.status === 'BANK_DATA').length;
  const statsSiteClient = masterSites.filter(s => s.kategori_karyawan === 'Pekerja Site').length;

  // DATA TABLE DASHBOARD (Dengan Sorting & Filter)
  let dashboardData = candidates.filter(c => c.status === 'INTI');
  
  if (dashSearch) {
    dashboardData = dashboardData.filter(c => 
      c.nama_lengkap?.toLowerCase().includes(dashSearch.toLowerCase()) || 
      c.nik_karyawan?.includes(dashSearch)
    );
  }
  dashboardData.sort((a, b) => {
    if (dashSortBy === 'umur_tua') return calculateAge(b.tanggal_lahir) - calculateAge(a.tanggal_lahir);
    if (dashSortBy === 'umur_muda') return calculateAge(a.tanggal_lahir) - calculateAge(b.tanggal_lahir);
    if (dashSortBy === 'nama_asc') return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
    if (dashSortBy === 'nama_desc') return (b.nama_lengkap || '').localeCompare(a.nama_lengkap || '');
    return new Date(b.created_at) - new Date(a.created_at); // terbaru default
  });

  // --- KALKULASI DEMOGRAFI HR ANALYTICS ---
  const ages = dashboardData.map(c => calculateAge(c.tanggal_lahir)).filter(a => a > 0);
  
  // Menghitung jumlah per kelompok umur
  const usiaMuda = ages.filter(age => age <= 25).length; // Gen Z / *Fresh Graduate*
  const usiaMenengah = ages.filter(age => age > 25 && age < 40).length; // Milenial / Produktif
  const usiaSenior = ages.filter(age => age >= 40).length; // Senior / Berpengalaman

  const totalLaki = dashboardData.filter(c => c.jenis_kelamin === 'Laki-laki').length;
  const totalPerempuan = dashboardData.filter(c => c.jenis_kelamin === 'Perempuan').length;

  const totalSMA = dashboardData.filter(c => {
    const edu = getHighestEducation(c.riwayat_pendidikan).toLowerCase();
    return edu.includes('sma') || edu.includes('smk') || edu.includes('slta') || edu.includes('stm');
  }).length;

  const totalKuliah = dashboardData.filter(c => {
    const edu = getHighestEducation(c.riwayat_pendidikan).toLowerCase();
    return edu.includes('s1') || edu.includes('d3') || edu.includes('d4') || edu.includes('sarjana') || edu.includes('diploma') || edu.includes('s2');
  }).length;

  // KALKULASI DASHBOARD KEHADIRAN & KPI (BERDASARKAN FILTER)
  const activeEmployeesForAtt = candidates.filter(c => c.status === 'INTI' && (!attFilterSite || c.lokasi_penempatan === attFilterSite));

  const attendanceSummary = activeEmployeesForAtt.map(emp => {
    const empAtt = attendanceData.find(a => a.nik === emp.nik_karyawan);
    
    // Variabel Default jika tidak ada record
    let status = 'MANGKIR'; 
    let timeIn = '-';
    let timeOut = '-';
    let ket = '-';
    let dateMatched = '-';
    
    // Variabel Akumulatif
    let totalLateMinutes = 0;
    let totalMangkir = 0;
    let totalIzin = 0;
    let totalHadir = 0;
    let totalLibur = 0;
    let totalCuti = 0;

    if (empAtt && empAtt.records.length > 0) {
      // 1. Saring record berdasarkan filter tanggal (jika ada)
      const validRecords = empAtt.records.filter(r => {
        // Cek filter bulan: pastikan format disamakan ke YYYY-MM
        if (attFilterPeriod) {
           let filterBulan = attFilterPeriod; // Misal bentuknya sudah '2026-10'
           // Jika bentuknya 'October 2026', kita conver ke '2026-10'
           if (filterBulan.includes(' ')) {
              const d = new Date(filterBulan);
              if (!isNaN(d)) filterBulan = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
           }
           if (!r.tanggal.startsWith(filterBulan)) return false;
        }
        
        if (!attFilterPeriod && attFilterStartDate && r.tanggal < attFilterStartDate) return false;
        if (!attFilterPeriod && attFilterEndDate && r.tanggal > attFilterEndDate) return false;
        return true;
      });

      // 2. Hitung statistik kumulatif dari semua record yang valid
      validRecords.forEach(r => {
         const k = String(r.keterangan_asli || '').toLowerCase();
         if (k.includes('izin')) totalIzin++;
         else if (k.includes('cuti')) totalCuti++;
         else if (k.includes('libur') || k.includes('off')) totalLibur++; 
         else if (r.jamMasuk !== '-' || k.includes('hadir')) {
             totalHadir++;
             totalLateMinutes += (r.telatMenit || 0);
         } else {
             totalMangkir++; 
         }
      });

      // 3. Menentukan Status Utama untuk ditampilkan di tabel
      // Prioritas: Apa pun yang paling mendominasi di rentang waktu tersebut, 
      // tapi jika hanya lihat 1 hari, maka status hari itulah yang dipakai.
      if (validRecords.length > 0) {
        const lastRec = validRecords[validRecords.length - 1]; // Mengambil hari terakhir sebagai representasi detail
        
        // Logika Status Utama
        if (totalHadir > 0) status = 'HADIR';
        else if (totalMangkir > 0 && totalHadir === 0) status = 'MANGKIR';
        else if (totalIzin > 0) status = 'IZIN';
        else if (totalLibur > 0) status = 'LIBUR';
        else if (totalCuti > 0) status = 'CUTI';

        timeIn = lastRec.jamMasuk;
        timeOut = lastRec.jamKeluar;
        ket = lastRec.keterangan_asli || (status === 'HADIR' ? 'Hadir (Mesin/Web)' : status);
        dateMatched = lastRec.tanggal;
      } else {
         // Jika filter menghasilkan 0 record valid, berarti dia mangkir
         totalMangkir = 1;
      }
    } else {
       // Jika tidak ada data absen sama sekali untuk NIK ini, dihitung mangkir
       totalMangkir = 1;
    }

    // --- RUMUS OTOMATIS KPI ABSENSI ---
    let kpiScore = Number(kpiConfig.baseScore) 
                   - (totalMangkir * Number(kpiConfig.potongMangkir)) 
                   - (totalIzin * Number(kpiConfig.potongIzin)) 
                   - (totalLateMinutes * Number(kpiConfig.potongTelatPerMenit));
                   
    if (kpiScore < 0) kpiScore = 0; // Cegah nilai KPI minus

    return { 
      ...emp, 
      statusAbsen: status, 
      timeIn, 
      timeOut, 
      ket, 
      dateMatched, 
      kpiScore: Number(kpiScore.toFixed(2)), 
      totalLateMinutes,
      // Tambahan data statistik untuk metrics di Dashboard
      stats: { totalHadir, totalMangkir, totalIzin, totalCuti, totalLibur } 
    };
  });

  const attMetrics = {
    HADIR: attendanceSummary.filter(a => a.statusAbsen === 'HADIR').length,
    MANGKIR: attendanceSummary.filter(a => a.statusAbsen === 'MANGKIR').length,
    IZIN: attendanceSummary.filter(a => a.statusAbsen === 'IZIN').length,
    CUTI: attendanceSummary.filter(a => a.statusAbsen === 'CUTI').length,
    LIBUR: attendanceSummary.filter(a => a.statusAbsen === 'LIBUR').length, // HITUNG TOTAL LIBUR
  };

  // ======================================================
  // BLOK KODE YANG SEBELUMNYA TIDAK SENGAJA TERHAPUS
  const groupedSites = masterSites.reduce((acc, site) => {
    if (!acc[site.region]) acc[site.region] = [];
    acc[site.region].push(site);
    return acc;
  }, {});

  let displayData = candidates;
  if (currentView.module === 'RECRUITMENT') {
    displayData = candidates.filter(c => c.status === currentView.filter); 
  } else if (currentView.module === 'HRIS') {
    if (currentView.filter === 'ALL') {
      displayData = candidates.filter(c => c.status === 'INTI'); 
    } else if (currentView.filter === 'RESIGN') {
      displayData = candidates.filter(c => c.status === 'RESIGN');
    } else {
      displayData = candidates.filter(c => c.status === 'INTI' && c.lokasi_penempatan === currentView.filter);
    }
  }

  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    displayData = displayData.filter(c => 
      (c.nama_lengkap && c.nama_lengkap.toLowerCase().includes(lowerSearch)) ||
      (c.nik_karyawan && c.nik_karyawan.includes(searchTerm)) ||
      (c.referensi_dari && c.referensi_dari.toLowerCase().includes(lowerSearch))
    );
  }
  if (filterJasa) displayData = displayData.filter(c => c.bidang_jasa === filterJasa);

  // FILTER SPESIFIK RECRUITMENT
  if (currentView.module === 'RECRUITMENT') {
    if (filterGender) displayData = displayData.filter(c => c.jenis_kelamin === filterGender);
    if (filterHeight) displayData = displayData.filter(c => Number(c.tinggi_badan) >= Number(filterHeight));
    if (filterAge) {
      displayData = displayData.filter(c => {
        const age = calculateAge(c.tanggal_lahir);
        if (filterAge === 'under_25') return age > 0 && age <= 25;
        if (filterAge === '26_35') return age >= 26 && age <= 35;
        if (filterAge === '36_45') return age >= 36 && age <= 45;
        if (filterAge === 'over_45') return age > 45;
        return true;
      });
    }
    if (filterEdu) {
      displayData = displayData.filter(c => {
        const edu = getHighestEducation(c.riwayat_pendidikan).toLowerCase();
        if (filterEdu === 'sma') return edu.includes('sma') || edu.includes('smk') || edu.includes('slta') || edu.includes('stm');
        if (filterEdu === 'diploma') return edu.includes('d3') || edu.includes('d4') || edu.includes('diploma') || edu.includes('akademi');
        if (filterEdu === 'sarjana') return edu.includes('s1') || edu.includes('sarjana') || edu.includes('s2') || edu.includes('s3');
        return true;
      });
    }
  }

  if (startDate || endDate) {
    displayData = displayData.filter(c => {
      if (!c.created_at) return true; 
      const applyDate = new Date(c.created_at).getTime();
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      if (start && applyDate < start) return false;
      if (end && applyDate > end) return false;
      return true;
    });
  }
  // ======================================================
  
  const isAllSelected = displayData.length > 0 && selectedIds.length === displayData.length;

  const allExportKeys = EXPORT_OPTIONS.flatMap(g => g.fields.map(f => f.key));
  const isAllExportSelected = selectedExportFields.length === allExportKeys.length;

  const handleToggleSelectAllExport = () => {
    if (isAllExportSelected) setSelectedExportFields([]); 
    else setSelectedExportFields(allExportKeys); 
  };

  const executeCustomExport = () => {
    const allFields = EXPORT_OPTIONS.flatMap(g => g.fields);
    const dataToExport = displayData.map((c, index) => {
      let row = { "No": index + 1 };
      selectedExportFields.forEach(fieldKey => {
        const fieldDef = allFields.find(f => f.key === fieldKey);
        if (fieldDef) row[fieldDef.label] = c[fieldKey] || '-'; 
      });
      return row;
    });

    if (dataToExport.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Database SWS');

    const defaultName = `HR_SWS_Data_${new Date().toISOString().split('T')[0]}`;
    const finalFileName = exportFileName.trim() ? exportFileName.trim() : defaultName;
    XLSX.writeFile(workbook, `${finalFileName}.xlsx`);
    setShowExportModal(false);
  };

  const toggleExportField = (fieldKey) => {
    if (selectedExportFields.includes(fieldKey)) setSelectedExportFields(selectedExportFields.filter(k => k !== fieldKey));
    else setSelectedExportFields([...selectedExportFields, fieldKey]);
  };

  // KONFIGURASI KOLOM UNTUK SPREADSHEET BULK EDIT (KESELURUHAN DATA KECUALI LAMPIRAN)
  // KONFIGURASI KOLOM UNTUK SPREADSHEET BULK EDIT (KESELURUHAN DATA KECUALI LAMPIRAN)
  const BULK_EDIT_FIELDS = [
    { key: 'nama_lengkap', label: 'Nama Lengkap', type: 'text' },
    { key: 'nik_karyawan', label: 'NIK Karyawan', type: 'text' },
    { key: 'nik_ktp', label: 'NIK KTP', type: 'text' },
    { key: 'bidang_jasa', label: 'Divisi/Jasa', type: 'select', options: masterDivisions },
    { key: 'posisi_jabatan', label: 'Jabatan', type: 'select', options: masterPositions.map(p => p.name) },
    { key: 'level_jabatan', label: 'Level Portal', type: 'select', options: ['staff','manager','director','admin'] },
    { key: 'lokasi_penempatan', label: 'Penempatan', type: 'select', options: masterSites.map(s => s.name) },
    { key: 'kategori_karyawan', label: 'Kategori Karyawan', type: 'select', options: ['Pekerja Site', 'Internal HO'] },
    { key: 'status_kontrak', label: 'Status Kontrak', type: 'select', options: ['Probation', 'PKWT', 'PKWTT', 'Harian Lepas'] },
    { key: 'tanggal_bergabung', label: 'Tgl Bergabung', type: 'date' },
    { key: 'base_salary', label: 'Gaji Pokok Utama', type: 'number' },
    { key: 'kewarganegaraan', label: 'Warga Negara', type: 'text' },
    { key: 'tempat_lahir', label: 'Tempat Lahir', type: 'text' },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date' },
    { key: 'jenis_kelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'] },
    { key: 'agama', label: 'Agama', type: 'select', options: ['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu'] },
    { key: 'no_hp', label: 'No WhatsApp', type: 'text' },
    { key: 'no_telp', label: 'Telp Alternatif', type: 'text' },
    { key: 'alamat_domisili', label: 'Alamat Domisili', type: 'text' },
    { key: 'alamat_lengkap', label: 'Alamat KTP Lengkap', type: 'text' },
    { key: 'riwayat_pendidikan', label: 'Pendidikan Terakhir', type: 'text' },
    { key: 'status_pernikahan', label: 'Status PTKP', type: 'select', options: ['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'] },
    { key: 'detail_anak', label: 'Data Anak', type: 'text' },
    { key: 'nama_pasangan', label: 'Nama Pasangan', type: 'text' },
    { key: 'pasangan_ttl', label: 'TTL Pasangan', type: 'text' },
    { key: 'pasangan_pekerjaan', label: 'Pekerjaan Pasangan', type: 'text' },
    { key: 'kontak_darurat_nama', label: 'Darurat (Nama)', type: 'text' },
    { key: 'kontak_darurat_hub', label: 'Darurat (Hub)', type: 'text' },
    { key: 'kontak_darurat_telp', label: 'Darurat (Telp)', type: 'text' },
    { key: 'tinggi_badan', label: 'Tinggi (cm)', type: 'number' },
    { key: 'berat_badan', label: 'Berat (kg)', type: 'number' },
    { key: 'golongan_darah', label: 'Gol. Darah', type: 'select', options: ['-','A','B','AB','O'] },
    { key: 'ukuran_baju', label: 'Uk. Baju', type: 'select', options: ['S','M','L','XL','XXL'] },
    { key: 'ukuran_celana', label: 'Uk. Celana', type: 'text' },
    { key: 'ukuran_sepatu', label: 'Uk. Sepatu', type: 'text' },
    { key: 'bertato', label: 'Bertato?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'berkacamata', label: 'Berkacamata?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'patah_tulang', label: 'Patah Tulang?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'takut_tinggi', label: 'Takut Tinggi?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'riwayat_operasi', label: 'Pernah Operasi?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'detail_operasi', label: 'Detail Operasi', type: 'text' },
    { key: 'sakit_serius', label: 'Sakit 1thn Terakhir?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'detail_sakit', label: 'Detail Sakit', type: 'text' },
    { key: 'bahasa_indonesia', label: 'B. Indonesia', type: 'select', options: ['Baik','Cukup','Kurang'] },
    { key: 'bahasa_inggris', label: 'B. Inggris', type: 'select', options: ['Baik','Cukup','Kurang'] },
    { key: 'riwayat_kerja', label: 'Riwayat Kerja', type: 'text' },
    { key: 'gaji_terakhir', label: 'Gaji Terakhir', type: 'text' },
    { key: 'gaji_diharapkan', label: 'Gaji Diharapkan', type: 'text' },
    { key: 'alasan_keluar', label: 'Alasan Keluar', type: 'text' },
    { key: 'bisa_berenang', label: 'Bisa Berenang?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'bisa_beladiri', label: 'Bisa Beladiri?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'detail_beladiri', label: 'Detail Beladiri', type: 'text' },
    { key: 'keterampilan_lain', label: 'Keahlian Lain', type: 'text' },
    { key: 'info_lowongan', label: 'Info Loker', type: 'select', options: ['Iklan','Teman','Keluarga','Teman Kerja'] },
    { key: 'kenalan_syntegra', label: 'Kenalan PT?', type: 'select', options: ['Tidak','Ya'] },
    { key: 'detail_kenalan', label: 'Nama Kenalan', type: 'text' },
    { key: 'referensi_dari', label: 'Referensi', type: 'text' }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
           <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-bold">
             <ArrowLeft size={16} className="text-amber-500"/> KEMBALI KE DASHBOARD UTAMA
           </button>
           <div className="my-2 border-t border-slate-800"></div>
           
           {/* MENU DASHBOARD UTAMA */}
           <div className="mb-2">
             <button 
               onClick={() => handleNavClick('DASHBOARD', 'OVERVIEW', 'Dashboard HRD')} 
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${currentView.module === 'DASHBOARD' ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-slate-800 hover:text-white'}`}
             >
                <Layers size={16}/> Dashboard Utama
             </button>
           </div>
           {(user?.can_access_recruitment || user?.role === 'admin') && (
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
           )}

           {/* MENU HRIS */}
           {(user?.can_access_hris || user?.role === 'admin') && (
             <div className="mt-2">
               <button onClick={() => toggleMenu('hris')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
                  <div className="flex items-center gap-3 text-sm font-bold"><Layers size={16} className="text-emerald-400"/> HRIS Karyawan</div>
                  {expandedMenus.hris ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
               </button>
               {expandedMenus.hris && (
                  <div className="ml-10 mt-1 space-y-1 border-l border-slate-800 pl-3">
                    <button onClick={() => handleNavClick('HRIS', 'ALL', 'Semua Karyawan Aktif')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 ${currentView.module === 'HRIS' && currentView.filter === 'ALL' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-emerald-400'}`}>Semua Karyawan Inti</button>
                    <button onClick={() => handleNavClick('HRIS', 'RESIGN', 'Data Karyawan Resign')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors mb-2 ${currentView.module === 'HRIS' && currentView.filter === 'RESIGN' ? 'bg-rose-600 text-white' : 'hover:bg-slate-800 text-rose-400'}`}>Karyawan Resign</button>
                    
                    {Object.keys(groupedSites).map(region => (
                      <div key={region} className="mb-1">
                         <button onClick={() => toggleRegion(region)} className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                           {region} {expandedMenus.regions[region] ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                         </button>
                         {expandedMenus.regions[region] && (
                            <div className="ml-2 mt-1 space-y-1">
                              {groupedSites[region].map(site => (
                                <button key={site.id} onClick={() => handleNavClick('HRIS', site.name, `Site: ${site.name}`)} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${currentView.module === 'HRIS' && currentView.filter === site.name ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}>
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
           )}

           <div className="my-2 border-t border-slate-800"></div>

           {/* MENU PAYROLL */}
           {(user?.can_access_hris || user?.role === 'admin') && (
             <div className="mt-2">
               <button onClick={() => toggleMenu('payroll')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
                  <div className="flex items-center gap-3 text-sm font-bold"><FileText size={16} className="text-purple-400"/> Sistem Payroll</div>
                  {expandedMenus.payroll ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
               </button>
               {expandedMenus.payroll && (
                  <div className="ml-10 mt-1 space-y-1 border-l border-slate-800 pl-3">
                    <button onClick={() => handleNavClick('PAYROLL', 'PROCESS', 'Proses Payroll Karyawan')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 ${currentView.module === 'PAYROLL' && currentView.filter === 'PROCESS' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-purple-400'}`}>Proses Payroll</button>
                    <button onClick={() => handleNavClick('PAYROLL', 'SUMMARY', 'Ringkasan Data Payroll')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${currentView.module === 'PAYROLL' && currentView.filter === 'SUMMARY' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-purple-400'}`}>Ringkasan Payroll</button>
                  </div>
               )}
             </div>
           )}

           {/* MENU REKAP ABSENSI */}
           {(user?.can_access_hris || user?.role === 'admin') && (
             <div className="mt-2 mb-2">
               <button onClick={() => toggleMenu('attendance')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
                  <div className="flex items-center gap-3 text-sm font-bold"><CheckSquare size={16} className="text-teal-400"/> Rekap Absensi</div>
                  {expandedMenus.attendance ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
               </button>
               {expandedMenus.attendance && (
                  <div className="ml-10 mt-1 space-y-1 border-l border-slate-800 pl-3">
                    <button onClick={() => handleNavClick('ATTENDANCE', 'SUMMARY', 'Rekap & Data Absensi Karyawan')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 ${currentView.module === 'ATTENDANCE' && currentView.filter === 'SUMMARY' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-teal-400'}`}>Data Upload Absensi</button>
                    <button onClick={() => handleNavClick('ATTENDANCE', 'LEADERBOARD', 'Leaderboard & Ranking KPI')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors mb-1 ${currentView.module === 'ATTENDANCE' && currentView.filter === 'LEADERBOARD' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 text-teal-400'}`}>Ranking KPI Pegawai</button>
                  </div>
               )}
             </div>
           )}

           {/* MENU PENGATURAN SITE (HANYA ADMIN) */}
           {user?.role === 'admin' && (
             <div>
               <button onClick={() => handleNavClick('SETTINGS', 'MASTER_SITE', 'Pengaturan Master Cabang & Site')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${currentView.module === 'SETTINGS' ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-slate-800 hover:text-white'}`}>
                  <Settings size={16}/> Pengaturan Site
               </button>
             </div>
           )}
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden"></div>}

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between z-10 shrink-0">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><Menu size={20}/></button>
             <div>
                <h2 className="font-black text-lg text-slate-800">{currentView.title}</h2>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">{currentView.module} MODULE</p>
             </div>
           </div>
           <div className="flex gap-2">
            <button onClick={() => setShowQR(!showQR)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 md:px-4 md:py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
              <QrCode size={16}/> <span className="hidden md:inline">Generate QR</span>
            </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

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
                    downloadLink.href = pngUrl; downloadLink.download = "QR_Pendaftaran.png";
                    document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);
                  }
                }} 
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 px-5 py-2.5 rounded-xl font-bold text-xs shadow transition-all"
              >
                Download Gambar QR (PNG)
              </button>
            </div>
          )}

          {currentView.module === 'DASHBOARD' ? (
            <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
              
              {/* HEADER WELCOME */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-2xl md:text-3xl font-black mb-2">Welcome to HRIS Dashboard</h1>
                  <p className="text-slate-300 text-sm md:text-base max-w-2xl">Ringkasan statistik kepegawaian, performa rekrutmen, dan analitik profil karyawan secara *real-time*.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10"><Layers size={200} /></div>
              </div>

              {/* TOP CARDS: 5 BLOK INFORMASI UTAMA */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-emerald-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Karyawan Aktif</p>
                    <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg"><User size={16}/></div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{statsInti || 0}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Total Pegawai INTI</p>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-rose-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data Resign</p>
                    <div className="bg-rose-100 text-rose-600 p-1.5 rounded-lg"><LogOut size={16}/></div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{statsResign || 0}</h3>
                  <p className="text-[10px] text-rose-600 font-bold mt-1">Riwayat Keluar/Resign</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-blue-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pelamar Terkini</p>
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><UserPlus size={16}/></div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{statsPending || 0}</h3>
                  <p className="text-[10px] text-blue-600 font-bold mt-1">Belum di-review (Pending)</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-amber-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank Data</p>
                    <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Archive size={16}/></div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{statsBank || 0}</h3>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">Arsip Calon Pekerja</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-indigo-500 col-span-2 md:col-span-1">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Site Client</p>
                    <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><MapPin size={16}/></div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{statsSiteClient || 0}</h3>
                  <p className="text-[10px] text-indigo-600 font-bold mt-1">Penempatan Tersedia</p>
                </div>
              </div>

              {/* LIVE ABSENSI DASHBOARD */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                 <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
                    <div>
                       <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><CheckSquare size={20} className="text-teal-500"/> Live Absensi & Kehadiran</h3>
                       <p className="text-xs text-slate-500 font-medium mt-1">Pilih filter tanggal atau site untuk mensortir data dari rekap absensi yang diupload.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                       {/* FILTER SITE */}
                       <div className="flex-1 md:w-36">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Filter Site</label>
                          <select value={attFilterSite} onChange={e => { setAttFilterSite(e.target.value); setAttSelectedCategory(null); }} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 text-slate-700">
                             <option value="">Semua Site</option>
                             {masterSites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                       </div>
                       {/* FILTER PERIODE BULAN */}
                       <div className="flex-1 md:w-32">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cari Perbulan</label>
                          <input 
                             type="month" 
                             value={attFilterPeriod} 
                             onChange={e => { setAttFilterPeriod(e.target.value); setAttFilterStartDate(''); setAttFilterEndDate(''); setAttSelectedCategory(null); }} 
                             className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 text-slate-800" 
                             pattern="[0-9]{4}-[0-9]{2}"
                          />
                       </div>
                       {/* FILTER RANGE TANGGAL */}
                       <div className="flex-1 md:w-32">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dari Tanggal</label>
                          <input type="date" disabled={!!attFilterPeriod} value={attFilterStartDate} onChange={e => { setAttFilterStartDate(e.target.value); setAttSelectedCategory(null); }} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 disabled:opacity-50" />
                       </div>
                       <div className="flex-1 md:w-32">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Sampai Tanggal</label>
                          <input type="date" disabled={!!attFilterPeriod} value={attFilterEndDate} onChange={e => { setAttFilterEndDate(e.target.value); setAttSelectedCategory(null); }} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 disabled:opacity-50" />
                       </div>
                    </div>
                 </div>

                 {attendanceData.length === 0 ? (
                    <div className="text-center py-6 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs text-amber-700 font-bold flex items-center justify-center gap-2"><Info size={16}/> Belum ada database absensi. Buka menu Rekap Absensi dan Upload Excel terlebih dahulu.</p>
                    </div>
                 ) : (
                    <>
                      {/* INTERACTIVE CARDS */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                         <div onClick={() => setAttSelectedCategory(attSelectedCategory === 'HADIR' ? null : 'HADIR')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all transform hover:-translate-y-1 ${attSelectedCategory === 'HADIR' ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-emerald-100 hover:border-emerald-300 shadow-sm'}`}>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Sudah Absen</p>
                            <h3 className="text-3xl font-black text-emerald-700">{attMetrics?.HADIR || 0}</h3>
                         </div>
                         <div onClick={() => setAttSelectedCategory(attSelectedCategory === 'MANGKIR' ? null : 'MANGKIR')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all transform hover:-translate-y-1 ${attSelectedCategory === 'MANGKIR' ? 'bg-rose-50 border-rose-500 shadow-md' : 'bg-white border-rose-100 hover:border-rose-300 shadow-sm'}`}>
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider mb-1">Mangkir (Alpa)</p>
                            <h3 className="text-3xl font-black text-rose-700">{attMetrics?.MANGKIR || 0}</h3>
                         </div>
                         <div onClick={() => setAttSelectedCategory(attSelectedCategory === 'LIBUR' ? null : 'LIBUR')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all transform hover:-translate-y-1 ${attSelectedCategory === 'LIBUR' ? 'bg-slate-100 border-slate-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Jadwal Off / Libur</p>
                            <h3 className="text-3xl font-black text-slate-700">{attMetrics?.LIBUR || 0}</h3>
                         </div>
                         <div onClick={() => setAttSelectedCategory(attSelectedCategory === 'IZIN' ? null : 'IZIN')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all transform hover:-translate-y-1 ${attSelectedCategory === 'IZIN' ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-white border-amber-100 hover:border-amber-300 shadow-sm'}`}>
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Sedang Izin</p>
                            <h3 className="text-3xl font-black text-amber-700">{attMetrics?.IZIN || 0}</h3>
                         </div>
                         <div onClick={() => setAttSelectedCategory(attSelectedCategory === 'CUTI' ? null : 'CUTI')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all transform hover:-translate-y-1 ${attSelectedCategory === 'CUTI' ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-blue-100 hover:border-blue-300 shadow-sm'}`}>
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-1">Sedang Cuti</p>
                            <h3 className="text-3xl font-black text-blue-700">{attMetrics?.CUTI || 0}</h3>
                         </div>
                      </div>

                      {/* DATA TABLE YANG MUNCUL KETIKA KARTU DI KLIK */}
                      {attSelectedCategory && (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden animate-fade-in shadow-inner bg-slate-50">
                          
                          {/* HEADER TABEL DENGAN TAMBAHAN WARNA LIBUR */}
                          <div className={`px-4 py-3 text-xs font-black text-white uppercase tracking-widest ${attSelectedCategory === 'HADIR' ? 'bg-emerald-500' : attSelectedCategory === 'MANGKIR' ? 'bg-rose-500' : attSelectedCategory === 'LIBUR' ? 'bg-slate-600' : attSelectedCategory === 'IZIN' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                             Daftar Karyawan ({attSelectedCategory})
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                             <table className="w-full text-left text-sm whitespace-nowrap bg-white">
                               <thead className="bg-slate-50 sticky top-0 text-[10px] text-slate-500 uppercase z-10 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)]">
                                 <tr>
                                   <th className="px-4 py-3 font-black">Nama / NIK</th>
                                   <th className="px-4 py-3 font-black">Lokasi Penempatan</th>
                                   <th className="px-4 py-3 font-black text-center">Tanggal Record</th>
                                   <th className="px-4 py-3 font-black text-center">Jam Absen</th>
                                   <th className="px-4 py-3 font-black text-center">Score KPI</th>
                                   <th className="px-4 py-3 font-black text-right">Keterangan</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                 {attendanceSummary && attendanceSummary.filter(a => a.statusAbsen === attSelectedCategory).map((emp, i) => (
                                   <tr key={i} className="hover:bg-slate-50">
                                     <td className="px-4 py-2">
                                        <p className="font-bold text-slate-800 text-xs">{emp.nama_lengkap}</p>
                                        <p className="text-[10px] text-slate-400">NIK: {emp.nik_karyawan}</p>
                                     </td>
                                     <td className="px-4 py-2 text-xs font-medium text-slate-600">{emp.lokasi_penempatan}</td>
                                     <td className="px-4 py-2 text-center text-xs text-slate-500">{emp.dateMatched}</td>
                                     <td className="px-4 py-2 text-center text-xs font-bold text-slate-700">
                                        {attSelectedCategory === 'HADIR' ? <span className="text-emerald-600">{emp.timeIn} - {emp.timeOut}</span> : '-'}
                                     </td>
                                     <td className="px-4 py-2 text-center">
                                        <span className={`px-2 py-1.5 rounded-lg text-[11px] font-black border shadow-sm ${emp.kpiScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : emp.kpiScore >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                          {emp.kpiScore}
                                        </span>
                                        {emp.totalLateMinutes > 0 && <span className="block text-[9px] text-red-500 font-bold mt-1.5">Telat {emp.totalLateMinutes} mnt</span>}
                                     </td>
                                     <td className="px-4 py-2 text-right">
                                        {/* LABEL KETERANGAN DENGAN TAMBAHAN WARNA LIBUR */}
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${attSelectedCategory === 'HADIR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : attSelectedCategory === 'MANGKIR' ? 'bg-rose-50 text-rose-700 border border-rose-100' : attSelectedCategory === 'LIBUR' ? 'bg-slate-200 text-slate-700 border border-slate-300' : attSelectedCategory === 'IZIN' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                          {emp.ket}
                                        </span>
                                     </td>
                                   </tr>
                                 ))}
                                 {attendanceSummary && attendanceSummary.filter(a => a.statusAbsen === attSelectedCategory).length === 0 && (
                                   <tr><td colSpan="5" className="text-center py-6 text-xs text-slate-400 italic">Tidak ada data untuk kategori ini.</td></tr>
                                 )}
                               </tbody>
                             </table>
                          </div>
                        </div>
                      )}
                    </>
                 )}
              </div>

              {/* HR ANALYTICS TABLE (SEKARANG BISA COLLAPSE) */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div 
                  className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                >
                  <div>
                    <h3 className="font-black text-slate-800 flex items-center gap-2"><Briefcase size={18} className="text-amber-500"/> Analitik Data Karyawan Aktif</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Gunakan fitur sortir untuk memetakan demografi usia, pendidikan, dan NIK.</p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-widest">{dashboardData ? dashboardData.length : 0} Karyawan</span>
                    <button className="text-slate-400 border border-slate-300 p-2 rounded-lg bg-white">
                      {isAnalyticsExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>
                  </div>
                </div>

                {isAnalyticsExpanded && (
                  <div className="animate-fade-in">
                    
                    {/* DEMOGRAFI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender Pegawai</span>
                            <p className="text-xs font-bold text-slate-700">L: <span className="text-blue-600">{totalLaki}</span> | P: <span className="text-rose-600">{totalPerempuan}</span></p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center text-center h-full">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-100 pb-1">Distribusi Umur</span>
                            <div className="flex justify-center gap-3 text-[10px] font-bold">
                               <div className="flex flex-col"><span className="text-slate-400">&lt;25 thn</span><span className="text-emerald-600 text-xs">{usiaMuda} org</span></div>
                               <div className="w-px bg-slate-100"></div>
                               <div className="flex flex-col"><span className="text-slate-400">26-39 thn</span><span className="text-blue-600 text-xs">{usiaMenengah} org</span></div>
                               <div className="w-px bg-slate-100"></div>
                               <div className="flex flex-col"><span className="text-slate-400">&gt;40 thn</span><span className="text-orange-600 text-xs">{usiaSenior} org</span></div>
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lulusan SMA / SMK</span>
                            <p className="text-xs font-bold text-amber-600">{totalSMA} Orang</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lulusan Kuliah</span>
                            <p className="text-xs font-bold text-indigo-600">{totalKuliah} Orang</p>
                        </div>
                    </div>

                    <div className="p-4 bg-white border-b border-slate-100 flex gap-2 w-full">
                      <div className="relative flex-1 md:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Cari NIK / Nama..." value={dashSearch} onChange={(e) => setDashSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-bold" />
                      </div>
                      <select value={dashSortBy} onChange={(e) => setDashSortBy(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 shrink-0">
                        <option value="terbaru">Data Terbaru</option>
                        <option value="umur_tua">Umur: Paling Tua</option>
                        <option value="umur_muda">Umur: Paling Muda</option>
                        <option value="nama_asc">Nama: A - Z</option>
                        <option value="nama_desc">Nama: Z - A</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                      <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-[10px] text-slate-500 uppercase">
                          <tr>
                            <th className="px-6 py-4 font-black">Karyawan & NIK</th>
                            <th className="px-6 py-4 font-black text-center">Umur</th>
                            <th className="px-6 py-4 font-black">Pendidikan Tertinggi</th>
                            <th className="px-6 py-4 font-black">Divisi & Jabatan</th>
                            <th className="px-6 py-4 font-black text-right">Site Penempatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {dashboardData && dashboardData.length > 0 ? (
                            dashboardData.map((emp, idx) => {
                              const age = calculateAge(emp.tanggal_lahir);
                              const edu = getHighestEducation(emp.riwayat_pendidikan);
                              return (
                                <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                  <td className="px-6 py-3">
                                    <div className="font-black text-slate-800 text-sm">{emp.nama_lengkap}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">NIK: <span className="text-blue-600">{emp.nik_karyawan || 'Belum Diatur'}</span></div>
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                    {age > 0 ? <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${age >= 40 ? 'bg-orange-50 text-orange-700 border-orange-200' : age <= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{age} Thn</span> : <span className="text-slate-300 text-[10px]">-</span>}
                                  </td>
                                  <td className="px-6 py-3 text-xs font-bold text-slate-700">{edu}</td>
                                  <td className="px-6 py-3">
                                    <div className="font-bold text-slate-800 text-xs">{emp.bidang_jasa || '-'}</div>
                                    <div className="text-[10px] text-slate-500">{emp.posisi_jabatan || '-'}</div>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold">{emp.lokasi_penempatan || 'Belum Diatur'}</span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-medium text-xs">
                                Tidak ada data karyawan yang cocok.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
          </div>
          ) : currentView.module === 'ATTENDANCE' && currentView.filter === 'SUMMARY' ? (
             <div className="animate-fade-in max-w-7xl mx-auto">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-6">
                   <h2 className="font-black text-2xl text-slate-800 mb-2 flex items-center gap-2"><CheckSquare className="text-teal-500"/> Rekap & Upload Absensi</h2>
                   <p className="text-slate-500 text-sm mb-6">Atur jam masuk/keluar per site, lalu unggah file Excel absen untuk melihat hasil ringkasan dan kalkulasi jam keterlambatan.</p>
                   
                   {/* KONFIGURASI PARAMETER KPI ABSENSI */}
                   <div className="bg-white p-0 rounded-2xl border border-slate-200 mb-6 overflow-hidden shadow-sm">
                     <div 
                        className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setIsKpiConfigExpanded(!isKpiConfigExpanded)}
                     >
                        <div>
                           <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                             <Settings size={16} className="text-amber-500"/> Atur Parameter Score KPI
                           </h3>
                           <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">
                             Tentukan nilai awal dan bobot pemotongan (Alpa, Izin, Telat) untuk hitung otomatis Score KPI Karyawan.
                           </p>
                        </div>
                        <button className="text-slate-400 bg-white border border-slate-200 p-1.5 rounded-lg">
                           {isKpiConfigExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        </button>
                     </div>

                     {isKpiConfigExpanded && (
                       <div className="p-5 border-t border-slate-100 bg-white animate-fade-in">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nilai Awal (Base)</label>
                               <input type="number" value={kpiConfig.baseScore} onChange={e => setKpiConfig({...kpiConfig, baseScore: e.target.value})} className="w-full text-xs font-bold text-slate-800 p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-black text-rose-400 uppercase mb-1">Potong Mangkir (Poin)</label>
                               <input type="number" value={kpiConfig.potongMangkir} onChange={e => setKpiConfig({...kpiConfig, potongMangkir: e.target.value})} className="w-full text-xs font-bold text-rose-600 p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-rose-50" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-black text-amber-400 uppercase mb-1">Potong Izin (Poin)</label>
                               <input type="number" value={kpiConfig.potongIzin} onChange={e => setKpiConfig({...kpiConfig, potongIzin: e.target.value})} className="w-full text-xs font-bold text-amber-600 p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-amber-50" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-black text-orange-400 uppercase mb-1">Potong Telat (/Menit)</label>
                               <input type="number" step="0.1" value={kpiConfig.potongTelatPerMenit} onChange={e => setKpiConfig({...kpiConfig, potongTelatPerMenit: e.target.value})} className="w-full text-xs font-bold text-orange-600 p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-orange-50" />
                            </div>
                         </div>
                         <button onClick={() => { localStorage.setItem('syntegra_kpi_config', JSON.stringify(kpiConfig)); alert('Parameter KPI berhasil disimpan!'); setIsKpiConfigExpanded(false); }} className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition w-full md:w-auto shadow-md">
                            <Save size={14}/> Simpan Pengaturan KPI
                         </button>
                       </div>
                     )}
                   </div>

                   {/* KONFIGURASI JAM SITE (DESAIN BARU DINAMIS) */}
                   <div className="bg-white p-0 rounded-2xl border border-slate-200 mb-6 overflow-hidden shadow-sm">
                     {/* Header Accordion */}
                     <div 
                        className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                     >
                        <div>
                           <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                             <Settings size={16} className="text-teal-600"/> Atur Jam Masuk & Keluar Tiap Site
                           </h3>
                           <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5">
                             Tentukan batas jam masuk per-site agar kalkulasi telat akurat. Default: 08:00 - 17:00.
                           </p>
                        </div>
                        <button className="text-slate-400 bg-white border border-slate-200 p-1.5 rounded-lg">
                           {isConfigExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        </button>
                     </div>

                     {/* Body Accordion (Tampil jika expanded) */}
                     {isConfigExpanded && (
                       <div className="p-4 border-t border-slate-100 bg-white">
                         {/* Search Bar untuk mencari Site */}
                         <div className="relative max-w-sm mb-4">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                           <input 
                              type="text" 
                              placeholder="Cari nama site..." 
                              value={searchConfigSite}
                              onChange={(e) => setSearchConfigSite(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-medium"
                           />
                         </div>

                         {/* List Konfigurasi (Tampilan List Vertikal 2 Kolom di Desktop, 1 Kolom di Mobile) */}
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           {masterSites
                             .filter(site => site.name.toLowerCase().includes(searchConfigSite.toLowerCase()))
                             .map(site => (
                               <div key={site.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-teal-300 transition-colors group">
                                 {/* Nama Site & Region */}
                                 <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                                      <p className="font-black text-xs text-slate-800 truncate" title={site.name}>{site.name}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 ml-3.5 truncate">{site.region || 'Region Tidak Diketahui'}</p>
                                 </div>

                                 {/* Input Jam */}
                                 <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                                   <div className="relative">
                                     <span className="absolute -top-2 left-2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase leading-none">Masuk</span>
                                     <input 
                                        type="time" 
                                        value={siteTimeConfig[site.name]?.masuk || '08:00'} 
                                        onChange={(e) => handleSiteTimeConfigChange(site.name, 'masuk', e.target.value)} 
                                        className="w-[85px] text-[11px] py-1.5 px-2 bg-transparent border-none outline-none font-bold text-emerald-700 cursor-pointer text-center" 
                                     />
                                   </div>
                                   <span className="text-slate-300 text-xs">-</span>
                                   <div className="relative">
                                     <span className="absolute -top-2 left-2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase leading-none">Keluar</span>
                                     <input 
                                        type="time" 
                                        value={siteTimeConfig[site.name]?.keluar || '17:00'} 
                                        onChange={(e) => handleSiteTimeConfigChange(site.name, 'keluar', e.target.value)} 
                                        className="w-[85px] text-[11px] py-1.5 px-2 bg-transparent border-none outline-none font-bold text-blue-700 cursor-pointer text-center" 
                                     />
                                   </div>
                                 </div>
                               </div>
                           ))}
                           {masterSites.filter(site => site.name.toLowerCase().includes(searchConfigSite.toLowerCase())).length === 0 && (
                             <div className="col-span-full text-center py-6 text-xs font-bold text-slate-400">
                               Site tidak ditemukan.
                             </div>
                           )}
                         </div>
                       </div>
                     )}
                   </div>

                   {/* FILTER & UPLOAD */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cari Nama / NIK</label>
                       <input type="text" value={searchAttendance} onChange={e => setSearchAttendance(e.target.value)} placeholder="Ketik pencarian..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-teal-500" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Periode Bulanan</label>
                       <input type="month" value={filterPeriodAttendance} onChange={e => setFilterPeriodAttendance(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-teal-500 font-bold" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1. Format Excel Baru</label>
                       <button onClick={downloadAttendanceTemplate} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-xl transition font-bold text-sm shadow-sm">
                         <Download size={16} className="text-teal-600"/> Download Template
                       </button>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2. Upload Data Excel</label>
                       <label className="flex items-center justify-center w-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 py-2 rounded-xl cursor-pointer transition font-bold text-sm shadow-sm">
                         <Upload size={16} className="mr-2"/> Upload Absen
                         <input type="file" className="hidden" accept=".xls, .xlsx" onChange={handleUploadRekapAbsensi} />
                       </label>
                     </div>
                   </div>

                   {/* TABEL HASIL */}
                   <div className="overflow-x-auto border border-slate-200 rounded-xl">
                     <table className="min-w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-slate-100 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-3 font-black">Karyawan (NIK)</th>
                           <th className="px-4 py-3 font-black text-center">Periode</th>
                           <th className="px-4 py-3 font-black text-center">Site Penempatan</th>
                           <th className="px-4 py-3 font-black text-center">Detail Kehadiran</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {attendanceData
                           .filter(item => 
                             (item.nama.toLowerCase().includes(searchAttendance.toLowerCase()) || item.nik.includes(searchAttendance)) &&
                             (filterPeriodAttendance === '' || item.periode === filterPeriodAttendance)
                           )
                           .map((item, idx) => (
                           <React.Fragment key={idx}>
                             <tr className="hover:bg-slate-50 transition-colors">
                               <td className="px-4 py-3">
                                 <div className="font-bold text-slate-800">{item.nama}</div>
                                 <div className="text-[10px] text-slate-500">NIK: {item.nik}</div>
                               </td>
                               <td className="px-4 py-3 text-center font-bold text-teal-700 bg-teal-50/50">{item.periode}</td>
                               <td className="px-4 py-3 text-center text-xs font-medium text-slate-600">{item.site}</td>
                               <td className="px-4 py-3 text-center">
                                 <button onClick={() => setExpandedAttendanceRow(expandedAttendanceRow === idx ? null : idx)} className="text-teal-600 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-100 transition flex items-center gap-1 mx-auto shadow-sm">
                                   {expandedAttendanceRow === idx ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Buka {item.records.length} Hari Kehadiran
                                 </button>
                               </td>
                             </tr>
                             {/* DROPDOWN EXPAND ROW */}
                             {expandedAttendanceRow === idx && (
                               <tr>
                                 <td colSpan="4" className="bg-slate-50 p-4 border-b border-slate-200 shadow-inner">
                                   <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-white custom-scrollbar">
                                     <table className="w-full text-left text-xs">
                                       <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase text-slate-500 shadow-sm z-10">
                                         <tr>
                                           <th className="px-4 py-2">Hari, Tanggal</th>
                                           <th className="px-4 py-2 text-center">Jam Masuk</th>
                                           <th className="px-4 py-2 text-center">Jam Keluar</th>
                                           <th className="px-4 py-2 text-right">Keterangan</th>
                                           <th className="px-4 py-2 text-center">Aksi</th>
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                         {item.records.map((rec, rIdx) => {
                                           const isEditing = editingAtt?.nik === item.nik && editingAtt?.rIdx === rIdx;
                                           const isPendingDelete = pendingDeletes.some(p => p.nik === item.nik && p.rIdx === rIdx);

                                           return (
                                           <tr key={rIdx} className={`hover:bg-slate-50 ${isPendingDelete ? 'bg-rose-50/50' : ''}`}>
                                             <td className="px-4 py-2 font-medium">{rec.hari}, {rec.tanggal}</td>
                                             {isEditing ? (
                                                <>
                                                  <td className="px-4 py-2 text-center"><input type="time" value={editAttData.jamMasuk} onChange={e => setEditAttData({...editAttData, jamMasuk: e.target.value})} className="border rounded px-1 py-1 text-xs focus:outline-blue-500" /></td>
                                                  <td className="px-4 py-2 text-center"><input type="time" value={editAttData.jamKeluar} onChange={e => setEditAttData({...editAttData, jamKeluar: e.target.value})} className="border rounded px-1 py-1 text-xs focus:outline-blue-500" /></td>
                                                  <td className="px-4 py-2 text-right"><input type="text" value={editAttData.keterangan_asli} onChange={e => setEditAttData({...editAttData, keterangan_asli: e.target.value})} className="border rounded px-2 py-1 text-xs w-full focus:outline-blue-500" /></td>
                                                  <td className="px-4 py-2 text-center flex items-center justify-center gap-2">
                                                    <button onClick={handleSaveAttEdit} className="text-emerald-600 hover:text-white hover:bg-emerald-500 border border-emerald-500 rounded px-2 py-1 transition">Simpan</button>
                                                    <button onClick={() => setEditingAtt(null)} className="text-slate-500 hover:text-slate-800 bg-slate-200 rounded px-2 py-1 transition">Batal</button>
                                                  </td>
                                                </>
                                             ) : (
                                                <>
                                                  <td className="px-4 py-2 text-center font-bold text-emerald-600">{rec.jamMasuk}</td>
                                                  <td className="px-4 py-2 text-center font-bold text-blue-600">{rec.jamKeluar}</td>
                                                  <td className="px-4 py-2 text-right">
                                                    <div className="flex flex-col items-end">
                                                      <span className="font-bold">{rec.keterangan_asli}</span>
                                                      {rec.telatMenit > 0 ? (
                                                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-[9px] border border-red-100 mt-1">Telat {rec.telatMenit} Menit</span>
                                                      ) : (
                                                        <span className="text-slate-400 text-[9px] font-bold mt-1">Tepat Waktu</span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-2 text-center align-middle">
                                                    {isPendingDelete ? (
                                                        user?.role === 'admin' ? (
                                                          <div className="flex flex-col gap-1 items-center">
                                                            <span className="text-[9px] text-rose-600 font-bold border border-rose-200 bg-white px-2 rounded-full mb-1">Menunggu Approval Hapus</span>
                                                            <div className="flex justify-center gap-1.5">
                                                              <button onClick={() => handleApproveDelete(item.nik, rIdx)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm transition">Setuju</button>
                                                              <button onClick={() => handleRejectDelete(item.nik, rIdx)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px] font-bold transition">Tolak</button>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <span className="text-[10px] text-orange-500 font-bold bg-orange-50 border border-orange-200 px-2 py-1 rounded animate-pulse">Menunggu Approval Admin...</span>
                                                        )
                                                    ) : (
                                                        <div className="flex justify-center gap-2">
                                                          <button onClick={() => handleEditAttClick(item.nik, rIdx, rec)} className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition" title="Edit Baris"><Edit size={14}/></button>
                                                          <button onClick={() => handleDeleteAttClick(item.nik, rIdx)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg transition" title="Hapus Baris"><Trash2 size={14}/></button>
                                                        </div>
                                                    )}
                                                  </td>
                                                </>
                                             )}
                                           </tr>
                                           );
                                         })}
                                       </tbody>
                                     </table>
                                   </div>
                                 </td>
                               </tr>
                             )}
                           </React.Fragment>
                         ))}
                         {attendanceData.length === 0 && (
                           <tr><td colSpan="4" className="text-center py-12 text-slate-400 text-xs font-bold bg-slate-50/50">Belum ada data absensi yang diunggah. Silahkan upload excel terlebih dahulu.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                </div>
             </div>
             ) : currentView.module === 'ATTENDANCE' && currentView.filter === 'LEADERBOARD' ? (
             <div className="animate-fade-in max-w-7xl mx-auto">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-6">
                   <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
                      <div>
                         <h2 className="font-black text-2xl text-slate-800 mb-2 flex items-center gap-2"><Briefcase className="text-amber-500"/> Leaderboard & Ranking KPI</h2>
                         <p className="text-slate-500 text-sm">Akumulasi performa karyawan berdasarkan kedisiplinan (Absensi) dan kinerja tugas (Task Management).</p>
                      </div>
                   </div>

                   {/* FILTER LEADERBOARD & TOMBOL CETAK */}
                   <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 flex flex-col xl:flex-row gap-4 xl:items-end justify-between">
                      <div className="flex flex-col md:flex-row gap-4 flex-1">
                          <div className="flex-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cari Karyawan / NIK</label>
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input type="text" value={leaderboardSearch} onChange={e => setLeaderboardSearch(e.target.value)} placeholder="Ketik pencarian..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm" />
                             </div>
                          </div>
                          <div className="flex-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Periode Bulan</label>
                             <input type="month" value={leaderboardFilterPeriod} onChange={e => setLeaderboardFilterPeriod(e.target.value)} className="w-full py-2.5 px-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm" />
                          </div>
                          <div className="flex-1">
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tampilkan Nilai</label>
                             <select value={leaderboardFilterType} onChange={e => setLeaderboardFilterType(e.target.value)} className="w-full py-2.5 px-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm cursor-pointer">
                                <option value="ALL">Total (Absen + Task)</option>
                                <option value="ABSENSI">Hanya KPI Absensi</option>
                                <option value="TASK">Hanya KPI Task Management</option>
                             </select>
                          </div>
                      </div>
                      
                      {/* Tombol Cetak Dipindah Kesini agar Rapi */}
                      <div className="shrink-0 pt-2 xl:pt-0 border-t border-slate-200 xl:border-0 mt-2 xl:mt-0">
                         <button onClick={handlePrintKpiReport} disabled={isGeneratingKpiPdf} className={`w-full xl:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black shadow-md transition-all text-xs md:text-sm ${isGeneratingKpiPdf ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-black text-white hover:-translate-y-0.5'}`}>
                            <Printer size={16} /> {isGeneratingKpiPdf ? 'Menyusun Dokumen...' : 'Cetak Laporan PDF'}
                         </button>
                      </div>
                   </div>

                   {/* KALKULASI RANKING KPI (DESAIN LIST TUNGGAL & LAPORAN) */}
                   {(() => {
                      // 1. Ambil data SEMUA karyawan Inti
                      const activeKaryawan = candidates.filter(c => c.status === 'INTI');
                      
                      // 2. Kalkulasi Nilai untuk setiap karyawan
                      let rankingData = activeKaryawan.map(emp => {
                         let kpiAbsen = 0; let totalMangkir = 0; let totalIzin = 0; let totalTelat = 0; let totalHadir = 0;
                         let hasAbsensiData = false; 
                         
                         const empAtt = attendanceData.find(a => a.nik === emp.nik_karyawan);
                         if (empAtt) {
                            const filteredRecords = empAtt.records.filter(r => r.tanggal.startsWith(leaderboardFilterPeriod));
                            if (filteredRecords.length > 0) {
                                hasAbsensiData = true; 
                                filteredRecords.forEach(r => {
                                   const k = String(r.keterangan_asli || '').toLowerCase();
                                   if (k.includes('izin')) totalIzin++;
                                   else if (k.includes('cuti') || k.includes('libur') || k.includes('off')) { /* Aman */ }
                                   else if (r.jamMasuk !== '-' || k.includes('hadir')) { 
                                       totalHadir++; totalTelat += (r.telatMenit || 0); 
                                   } else { totalMangkir++; }
                                });
                                kpiAbsen = kpiConfig.baseScore - (totalMangkir * kpiConfig.potongMangkir) - (totalIzin * kpiConfig.potongIzin) - (totalTelat * kpiConfig.potongTelatPerMenit);
                                if (kpiAbsen < 0) kpiAbsen = 0;
                            }
                         }

                         const matchedUser = users.find(u => u.nik === emp.nik_karyawan);
                         let uPending = 0; let uProgress = 0; let uOnTime = 0; let uLate = 0; let uOverdue = 0;
                         let skorKinerja = 0; let persentaseKualitas = 0; let taskTotal = 0;
                         const pad = (n) => String(n).padStart(2, '0');
                         const d = new Date();
                         const nowLocalStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                         
                         if (matchedUser && tasks && tasks.length > 0) {
                             const userTasks = tasks.filter(task => {
                                 let assignees = [];
                                 try { assignees = typeof task.assignedTo === 'string' ? JSON.parse(task.assignedTo) : task.assignedTo; } catch(e) { assignees = [task.assignedTo]; }
                                 if (!Array.isArray(assignees)) assignees = [assignees];
                                 if (!assignees.map(String).includes(String(matchedUser.id))) return false;
                                 if (leaderboardFilterPeriod && (!task.dueDate || !task.dueDate.startsWith(leaderboardFilterPeriod))) return false;
                                 return true;
                             });
                             
                             taskTotal = userTasks.length;
                             userTasks.forEach(task => {
                                 const hasDue = !!task.dueDate;
                                 if (task.status === 'done') {
                                     if (hasDue && task.completed_at && task.completed_at > task.dueDate) uLate++; else uOnTime++;
                                 } else if (task.status === 'laporan-cleaning') uOnTime++;
                                 else if (task.status === 'pending') { if (hasDue && task.dueDate < nowLocalStr) uOverdue++; else uPending++; } 
                                 else { if (hasDue && task.dueDate < nowLocalStr) uOverdue++; else uProgress++; }
                             });
                             
                             skorKinerja = (uOnTime * 10) + (uLate * 5) - (uOverdue * 5);
                             const maxPossibleScore = (uOnTime + uLate + uOverdue) * 10 || 1;
                             persentaseKualitas = Math.round((skorKinerja / maxPossibleScore) * 100);
                             if (persentaseKualitas < 0) persentaseKualitas = 0;
                             if (taskTotal === 0) { persentaseKualitas = 0; skorKinerja = 0; }
                         }

                         let totalKpi = 0;
                         if (hasAbsensiData && taskTotal > 0) totalKpi = (kpiAbsen + skorKinerja) / 2;
                         else if (hasAbsensiData) totalKpi = kpiAbsen; 
                         else if (taskTotal > 0) totalKpi = skorKinerja;

                         return {
                            ...emp,
                            kpiAbsen: Number(kpiAbsen.toFixed(2)),
                            taskStats: { 
                               taskTotal: taskTotal, 
                               taskPending: uPending, 
                               taskProgress: uProgress, 
                               taskTepat: uOnTime, 
                               taskTelat: uLate, 
                               taskOverdue: uOverdue, 
                               skorKinerja: skorKinerja, 
                               kual: `${persentaseKualitas}%` 
                            },
                            totalKpi: Number(totalKpi.toFixed(2)),
                            hasData: hasAbsensiData || taskTotal > 0,
                            hasAbsensi: hasAbsensiData
                         };
                      });

                      // Terapkan Filter & Sorting
                      if (leaderboardSearch) {
                         const lowerS = leaderboardSearch.toLowerCase();
                         rankingData = rankingData.filter(r => (r.nama_lengkap && r.nama_lengkap.toLowerCase().includes(lowerS)) || (r.nik_karyawan && r.nik_karyawan.includes(leaderboardSearch)));
                      }
                      
                      rankingData.sort((a, b) => {
                         if (leaderboardFilterType === 'ABSENSI') return b.kpiAbsen - a.kpiAbsen;
                         if (leaderboardFilterType === 'TASK') return b.taskStats.skorKinerja - a.taskStats.skorKinerja;
                         return b.totalKpi - a.totalKpi; 
                      });

                      const getMedalClass = (index, hasData) => {
                         if (!hasData) return 'bg-slate-100 text-slate-400 border-slate-200';
                         if (index === 0) return 'bg-yellow-300 text-yellow-900 border-yellow-400 shadow-md'; 
                         if (index === 1) return 'bg-slate-300 text-slate-700 border-slate-400 shadow-sm'; 
                         if (index === 2) return 'bg-orange-300 text-orange-900 border-orange-400 shadow-sm'; 
                         return 'bg-white text-slate-500 border-slate-200';
                      };

                      // Analisis Sorotan Eksekutif (Top 3 Terbaik & 3 Terbawah)
                      const validStaff = rankingData.filter(r => r.hasData);
                      const topPerformers = validStaff.slice(0, 3);
                      // Karyawan terburuk adalah mereka yang punya skor totalKpi < 60 atau mangkir/overdue berlebih
                      const bottomPerformers = [...validStaff].reverse().filter(r => r.totalKpi < 60 || r.taskStats.taskOverdue > 2).slice(0, 3);

                      return (
                         <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm relative ${isGeneratingKpiPdf ? 'overflow-visible' : 'overflow-hidden'}`}>
                            {/* === AREA YANG AKAN MASUK KE DALAM CETAKAN PDF === */}
                            <div id="kpi-report-print-area" className={`${isGeneratingKpiPdf ? 'p-8 text-black bg-white w-[740px] m-0 origin-top-left' : 'p-0 w-full'}`}>
                               
                               {/* KOP SURAT PROFESIONAL (HANYA MUNCUL DI PDF) */}
                               {isGeneratingKpiPdf && (
                                 <div className="flex justify-between items-start border-b-[3px] border-black pb-4 mb-5 w-full">
                                    <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 shrink-0">
                                         <img src="/Logo_apps.png" alt="Logo Perusahaan" className="w-full h-full object-contain" />
                                      </div>
                                      <div>
                                        <h1 className="text-xl font-black uppercase tracking-widest text-black leading-none">Syntegra Hub</h1>
                                        <p className="text-xs font-bold text-black mt-1 uppercase">Laporan Evaluasi & Kinerja Karyawan (KPI)</p>
                                        <p className="text-[9px] text-black mt-0.5 font-medium">Komp. Ruko BSD Sektor VII, Jl. Pahlawan Seribu No.63 - 64, Tangerang Selatan</p>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end shrink-0">
                                       <div className="border-[1.5px] border-black px-3 py-1 mb-1.5 inline-block">
                                          <p className="text-xs font-black text-black uppercase tracking-widest leading-none">RAPOR KPI</p>
                                       </div>
                                       <p className="text-[10px] font-bold text-black">Periode: {leaderboardFilterPeriod ? new Date(leaderboardFilterPeriod + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Semua Waktu'}</p>
                                       <p className="text-[8px] text-black mt-1 font-bold">Dicetak: {new Date().toLocaleDateString('id-ID')} | {new Date().toLocaleTimeString('id-ID')}</p>
                                    </div>
                                 </div>
                               )}

                               {/* KESIMPULAN KINERJA KARYAWAN (SOROTAN DIREKSI) */}
                               {isGeneratingKpiPdf && (
                                 <div className="mb-5 grid grid-cols-2 gap-4 break-inside-avoid w-full">
                                    {/* Kolom Terbaik */}
                                    <div className="border border-black overflow-hidden bg-white">
                                       <div className="bg-gray-100 px-3 py-1.5 border-b border-black flex items-center justify-between">
                                          <h3 className="font-black text-[10px] text-black uppercase tracking-widest">Kinerja Terbaik (Top 3)</h3>
                                          <span className="text-[8px] font-bold text-black border border-black px-1.5 py-0.5">Target Bonus</span>
                                       </div>
                                       <div className="p-2.5 bg-white space-y-1.5">
                                          {topPerformers.length === 0 ? <p className="text-[9px] text-black font-bold italic text-center py-1">Belum ada data.</p> :
                                           topPerformers.map((emp, i) => (
                                              <div key={i} className="flex justify-between items-center border-b border-gray-300 pb-1 last:border-0 last:pb-0">
                                                 <div className="flex flex-col truncate pr-2">
                                                    <span className="font-black text-black text-[10px] truncate">{emp.nama_lengkap}</span>
                                                    <span className="text-black text-[8px] font-bold mt-0.5 truncate">{emp.posisi_jabatan}</span>
                                                 </div>
                                                 <span className="font-black text-black text-sm shrink-0">{emp.totalKpi}</span>
                                              </div>
                                           ))
                                          }
                                       </div>
                                    </div>

                                    {/* Kolom Terburuk */}
                                    <div className="border border-black overflow-hidden bg-white">
                                       <div className="bg-gray-100 px-3 py-1.5 border-b border-black flex items-center justify-between">
                                          <h3 className="font-black text-[10px] text-black uppercase tracking-widest">Sorotan Evaluasi (Bottom 3)</h3>
                                          <span className="text-[8px] font-bold text-black border border-black px-1.5 py-0.5">Butuh Teguran</span>
                                       </div>
                                       <div className="p-2.5 bg-white space-y-1.5">
                                          {bottomPerformers.length === 0 ? <p className="text-[9px] text-black font-bold italic text-center py-1">Aman.</p> :
                                           bottomPerformers.map((emp, i) => (
                                              <div key={i} className="flex justify-between items-center border-b border-gray-300 pb-1 last:border-0 last:pb-0">
                                                 <div className="flex flex-col truncate pr-2">
                                                    <span className="font-black text-black text-[10px] truncate">{emp.nama_lengkap}</span>
                                                    <span className="text-black text-[8px] font-bold mt-0.5 truncate">{emp.posisi_jabatan}</span>
                                                 </div>
                                                 <span className="font-black text-black text-sm shrink-0">{emp.totalKpi}</span>
                                              </div>
                                           ))
                                          }
                                       </div>
                                    </div>
                                 </div>
                               )}

                               {/* TABEL LEADERBOARD UTAMA */}
                               <div className={`${isGeneratingKpiPdf ? 'pb-4 w-full' : 'overflow-x-auto custom-scrollbar pb-6 w-full'}`}>
                                  {/* PENTING: Tambahkan table-fixed dan break-words agar teks panjang turun ke bawah, tidak melebarkan tabel */}
                                  <table className={`w-full text-left ${isGeneratingKpiPdf ? 'border-collapse border border-black bg-white table-fixed break-words' : 'text-xs min-w-full whitespace-nowrap'}`}>
                                     
                                     {/* HEADER TABEL: GAYA DASHBOARD VS GAYA EXCEL */}
                                     <thead className={`font-black uppercase tracking-widest ${isGeneratingKpiPdf ? 'text-[8px] bg-gray-100 text-black border-b border-black' : 'text-[10px] text-slate-400 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 shadow-sm'}`}>
                                        <tr>
                                           <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[6%]' : 'px-4 py-4 text-center w-12 border-r border-slate-200'}`}>Rank</th>
                                           <th className={`${isGeneratingKpiPdf ? 'border border-black px-1.5 py-1.5 w-[30%]' : 'px-4 py-4 border-r border-slate-200'}`}>Karyawan & NIK</th>
                                           <th className={`${isGeneratingKpiPdf ? 'border border-black px-1.5 py-1.5 w-[24%]' : 'px-4 py-4 border-r border-slate-200'}`}>Lokasi & Jabatan</th>
                                           
                                           {leaderboardFilterType === 'TASK' && (
                                              <>
                                                <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[8%]' : 'px-3 py-4 text-center'}`}>Kerja</th>
                                                <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[8%]' : 'px-3 py-4 text-center text-blue-500'}`}>Progres</th>
                                                <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[8%]' : 'px-3 py-4 text-center text-emerald-500'}`}>Tepat</th>
                                                <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[8%]' : 'px-3 py-4 text-center text-amber-500'}`}>Telat</th>
                                                <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[8%]' : 'px-3 py-4 text-center text-red-500 border-r border-slate-200'}`}>Overdue</th>
                                              </>
                                           )}
                                           
                                           {(leaderboardFilterType === 'ALL' || leaderboardFilterType === 'TASK') && (
                                              <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[12%]' : 'px-4 py-4 text-center border-r border-slate-200 ' + (leaderboardFilterType === 'ALL' ? 'bg-white text-indigo-600' : 'bg-indigo-50/50 text-indigo-600')}`}>Skor TM</th>
                                           )}
                                           
                                           {(leaderboardFilterType === 'ALL' || leaderboardFilterType === 'ABSENSI') && (
                                              <th className={`${isGeneratingKpiPdf ? 'border border-black px-1 py-1.5 text-center w-[12%]' : 'px-4 py-4 text-center border-r border-slate-200 ' + (leaderboardFilterType === 'ALL' ? 'bg-white text-blue-600' : 'bg-blue-50/50 text-blue-600')}`}>Skor Absen</th>
                                           )}
                                           
                                           {leaderboardFilterType === 'ALL' && (
                                              <th className={`${isGeneratingKpiPdf ? 'border border-black px-1.5 py-1.5 text-center w-[16%] bg-gray-100' : 'px-6 py-4 text-center border-r border-slate-200 w-40 bg-indigo-50/50'}`}>
                                                 {isGeneratingKpiPdf ? 'TOTAL SCORE' : (
                                                    <>
                                                       <div className="font-black uppercase tracking-widest text-[10px] text-indigo-700">TOTAL SCORE</div>
                                                       <div className="text-[8px] font-bold mt-1 text-indigo-500">Gabungan</div>
                                                    </>
                                                 )}
                                              </th>
                                           )}
                                        </tr>
                                     </thead>
                                     
                                     {/* ISI TABEL: GAYA DASHBOARD VS GAYA EXCEL */}
                                     <tbody className={isGeneratingKpiPdf ? 'bg-white text-[9px]' : 'divide-y divide-slate-100 text-xs'}>
                                        {rankingData.map((emp, idx) => (
                                           <tr key={emp.id} className={`${isGeneratingKpiPdf ? 'text-black bg-white border-b border-black' : 'transition-colors ' + (!emp.hasData ? 'opacity-60 bg-slate-50/50' : 'hover:bg-slate-50')} break-inside-avoid`}>
                                              
                                              {/* Kolom Rank */}
                                              <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-4 py-3 text-center align-middle border-r border-slate-100'}`}>
                                                 {isGeneratingKpiPdf ? (
                                                    <span className="font-bold">{idx + 1}</span>
                                                 ) : (
                                                    <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-black border ${getMedalClass(idx, emp.hasData)}`}>{idx + 1}</div>
                                                 )}
                                              </td>
                                              
                                              {/* Kolom Nama & NIK */}
                                              <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1.5 py-1.5 align-middle truncate' : 'px-4 py-3 align-middle border-r border-slate-100'}`}>
                                                 <div className={`font-black ${isGeneratingKpiPdf ? 'text-[9px] text-black truncate' : 'text-xs md:text-sm text-slate-800'}`}>{emp.nama_lengkap}</div>
                                                 <div className={`font-bold uppercase tracking-wider ${isGeneratingKpiPdf ? 'text-[7px] text-black mt-0.5 truncate' : 'text-[9px] text-slate-400 mt-0.5'}`}>NIK: {emp.nik_karyawan || '-'}</div>
                                              </td>

                                              {/* Kolom Jabatan */}
                                              <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1.5 py-1.5 align-middle truncate' : 'px-4 py-3 align-middle border-r border-slate-100'}`}>
                                                 <div className={`font-bold ${isGeneratingKpiPdf ? 'text-[8px] text-black truncate' : 'text-xs text-slate-600'}`}>{emp.lokasi_penempatan || 'Site Tdk Terdaftar'}</div>
                                                 <div className={`font-medium ${isGeneratingKpiPdf ? 'text-[7px] text-black mt-0.5 truncate' : 'text-[9px] text-slate-400 mt-0.5'}`}>{emp.bidang_jasa} • {emp.posisi_jabatan}</div>
                                              </td>

                                              {/* Kolom Detail Kerja (Khusus Mode Filter Task) */}
                                              {leaderboardFilterType === 'TASK' && (
                                                 <>
                                                    <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-3 py-3 text-center align-middle font-black text-sm text-slate-800'}`}>{emp.taskStats.taskTotal}</td>
                                                    <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-3 py-3 text-center align-middle font-bold text-blue-600'}`}>{emp.taskStats.taskPending}</td>
                                                    <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-3 py-3 text-center align-middle font-black text-emerald-600'}`}>{emp.taskStats.taskTepat}</td>
                                                    <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-3 py-3 text-center align-middle font-bold text-amber-500'}`}>{emp.taskStats.taskTelat}</td>
                                                    <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-3 py-3 text-center align-middle font-black text-red-600 border-r border-slate-100'}`}>{emp.taskStats.taskOverdue}</td>
                                                 </>
                                              )}
                                              
                                              {/* Kolom Skor TM */}
                                              {(leaderboardFilterType === 'ALL' || leaderboardFilterType === 'TASK') && (
                                                 <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-4 py-3 text-center align-middle border-r border-slate-100 ' + (leaderboardFilterType === 'ALL' ? 'bg-white' : 'bg-indigo-50/20')}`}>
                                                    {emp.taskStats.taskTotal > 0 ? (
                                                       <div className="flex flex-col items-center justify-center h-full">
                                                          <span className={`font-black ${isGeneratingKpiPdf ? 'text-[10px] text-black' : 'text-lg ' + (leaderboardFilterType === 'ALL' ? 'text-slate-800' : 'text-indigo-700')}`}>{emp.taskStats.skorKinerja}</span>
                                                       </div>
                                                    ) : (
                                                       <div className={`flex flex-col items-center justify-center h-full ${isGeneratingKpiPdf ? 'text-black' : 'opacity-60'}`}>
                                                          <span className={`font-black ${isGeneratingKpiPdf ? 'text-[10px]' : 'text-lg text-slate-300'}`}>0</span>
                                                          {!isGeneratingKpiPdf && <span className="bg-slate-100 text-slate-400 border border-slate-200 text-[8px] font-black px-2 py-0.5 rounded-full mt-1">N/A</span>}
                                                       </div>
                                                    )}
                                                 </td>
                                              )}

                                              {/* Kolom Skor Absen */}
                                              {(leaderboardFilterType === 'ALL' || leaderboardFilterType === 'ABSENSI') && (
                                                 <td className={`${isGeneratingKpiPdf ? 'border-r border-black px-1 py-1.5 text-center align-middle' : 'px-4 py-3 text-center align-middle border-r border-slate-100 ' + (leaderboardFilterType === 'ALL' ? 'bg-white' : 'bg-blue-50/20')}`}>
                                                    {emp.hasData && emp.kpiAbsen > 0 ? (
                                                       <div className="flex flex-col items-center justify-center h-full">
                                                          <span className={`font-black ${isGeneratingKpiPdf ? 'text-[10px] text-black' : 'text-lg text-slate-800'}`}>{emp.kpiAbsen}</span>
                                                       </div>
                                                    ) : (
                                                       <div className={`flex flex-col items-center justify-center h-full ${isGeneratingKpiPdf ? 'text-black' : 'opacity-60'}`}>
                                                          <span className={`font-black ${isGeneratingKpiPdf ? 'text-[10px]' : 'text-lg text-slate-300'}`}>0</span>
                                                          {!isGeneratingKpiPdf && <span className="bg-slate-100 text-slate-400 border border-slate-200 text-[8px] font-black px-2 py-0.5 rounded-full mt-1">N/A</span>}
                                                       </div>
                                                    )}
                                                 </td>
                                              )}

                                              {/* Kolom Total Gabungan */}
                                              {leaderboardFilterType === 'ALL' && (
                                                 <td className={`${isGeneratingKpiPdf ? 'px-2 py-1.5 text-center align-middle bg-gray-100' : 'px-6 py-3 text-center align-middle border-r border-slate-100 bg-indigo-50/20'}`}>
                                                    {emp.hasData ? (
                                                       <div className="flex flex-col items-center justify-center h-full">
                                                          <span className={`font-black ${isGeneratingKpiPdf ? 'text-xs text-black' : 'text-xl md:text-2xl ' + (emp.totalKpi >= 90 ? 'text-emerald-600' : emp.totalKpi >= 70 ? 'text-amber-500' : 'text-rose-600')}`}>
                                                             {emp.totalKpi}
                                                          </span>
                                                       </div>
                                                    ) : (
                                                       <div className={`flex flex-col items-center justify-center h-full ${isGeneratingKpiPdf ? 'text-black' : 'opacity-60'}`}>
                                                          <span className={`font-black ${isGeneratingKpiPdf ? 'text-xs' : 'text-xl text-slate-300'}`}>0</span>
                                                       </div>
                                                    )}
                                                 </td>
                                              )}
                                           </tr>
                                        ))}
                                     </tbody>
                                  </table>
                               </div>

                               {/* TANDA TANGAN (HANYA MUNCUL DI PDF) */}
                               {isGeneratingKpiPdf && (
                                  <div className="flex justify-between mt-8 pt-4 px-8 break-inside-avoid w-full">
                                     <div className="text-center w-48">
                                        <p className="mb-20 font-bold text-black text-[10px]">Mengetahui,<br/>Direktur Utama / HR Manager</p>
                                        <p className="font-bold text-black border-t border-black pt-1 uppercase text-[10px]">
                                           ( ......................................... )
                                        </p>
                                     </div>
                                     <div className="text-center w-48">
                                        <p className="mb-20 font-bold text-black text-[10px]">Tangerang Selatan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>System Admin / Pembuat Laporan</p>
                                        <p className="font-bold text-black border-t border-black pt-1 uppercase text-[10px]">
                                           {currentUser?.name || 'Administrator'}
                                        </p>
                                     </div>
                                  </div>
                               )}
                            </div>
                         </div>
                      );
                   })()}
                </div>
             </div>
          ) : currentView.module === 'PAYROLL' ? (
             <div className="animate-fade-in max-w-7xl mx-auto">
                {currentView.filter === 'PROCESS' && (
                   <>
                     {/* STEP 0: SETUP OTOMATISASI & UPLOAD */}
                     {payrollStep === 0 && (
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 max-w-3xl mx-auto mt-6">
                           <div className="text-center mb-6">
                             <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"><FileText size={32}/></div>
                             <h2 className="font-black text-2xl text-slate-800 mb-2">Sistem Payroll Otomatis</h2>
                             <p className="text-slate-500 text-sm">Atur parameter pembagi gaji, lalu unggah absensi. Sistem akan memproses prorata dan keterlambatan secara instan.</p>
                           </div>
                           
                           <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 mb-6">
                              <h3 className="font-black text-purple-900 mb-4 text-sm uppercase tracking-widest flex items-center gap-2"><Settings size={16}/> 1. Parameter Perhitungan</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                   <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Lokasi Cabang/Client</label>
                                   <select value={selectedPayrollSite} onChange={(e) => setSelectedPayrollSite(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 font-bold text-slate-800">
                                      <option value="">-- Pilih Lokasi --</option>
                                      {masterSites.map(site => <option key={site.id} value={site.name}>{site.name}</option>)}
                                   </select>
                                </div>
                                {/* TAMBAHAN INPUT PERIODE DI SINI */}
                                <div>
                                   <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Periode Gaji</label>
                                   <input type="month" value={payrollPeriod} onChange={(e) => setPayrollPeriod(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 font-bold text-slate-800" />
                                </div>
                                <div>
                                   <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Total Hari Kerja</label>
                                   <input type="number" value={totalHariKerjaSebulan} onChange={(e) => setTotalHariKerjaSebulan(e.target.value)} placeholder="Contoh: 22 atau 26" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 font-black text-blue-700" />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                   <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Jam Masuk (Batas)</label>
                                   <input type="time" value={jamMasukKerja} onChange={(e) => setJamMasukKerja(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 font-bold" />
                                </div>
                                <div>
                                   <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Jam Keluar (Batas)</label>
                                   <input type="time" value={jamKeluarKerja} onChange={(e) => setJamKeluarKerja(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 font-bold" />
                                </div>
                                <div>
                                   <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Potongan / Telat (Rp)</label>
                                   <input type="number" value={nominalPotonganTelat} onChange={(e) => setNominalPotonganTelat(e.target.value)} placeholder="0" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 font-black text-red-600" />
                                </div>
                              </div>
                           </div>

                           <div className="mb-2">
                             <h3 className="font-black text-purple-900 mb-2 text-sm uppercase tracking-widest">2. Upload File Absen</h3>
                           </div>
                           <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition group ${selectedPayrollSite ? 'border-purple-300 bg-purple-50 hover:bg-purple-100' : 'border-slate-300 bg-slate-50 opacity-60 cursor-not-allowed'}`}>
                              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                  <Upload className={`w-8 h-8 mb-2 ${selectedPayrollSite ? 'text-purple-500' : 'text-slate-400'}`} />
                                  <p className="text-sm font-bold text-slate-600">Klik untuk Upload File Absen (Excel)</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Sistem akan otomatis menghitung hari kerja & potongan telat</p>
                              </div>
                              <input type="file" className="hidden" accept=".xls, .xlsx" onChange={handleUploadAttendance} disabled={!selectedPayrollSite} />
                           </label>
                        </div>
                     )}

                     {/* STEP 1: VALIDASI REKAP OTOMATIS */}
                     {payrollStep === 1 && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                           <div className="p-6 border-b border-slate-100 bg-purple-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                              <div>
                                 <h3 className="font-black text-purple-900 flex items-center gap-2">Step 1: Kalkulasi Prorata & Keterlambatan</h3>
                                 <p className="text-xs text-purple-700 font-bold mt-1">Sistem otomatis menghitung gaji berdasarkan {totalHariKerjaSebulan} hari kerja. Telat = Rp{Number(nominalPotonganTelat).toLocaleString()}</p>
                              </div>
                              <button onClick={() => setIsEditingPayroll(!isEditingPayroll)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${isEditingPayroll ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                 {isEditingPayroll ? <><CheckCircle2 size={14}/> Selesai Edit Manual</> : <><Edit size={14}/> Edit Hasil Sistem</>}
                              </button>
                           </div>
                           <div className="overflow-x-auto">
                              <table className="min-w-full text-left text-sm">
                                 <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                       <th className="px-6 py-4 font-black">Karyawan (NIK)</th>
                                       <th className="px-6 py-4 font-black text-center">Kehadiran / Sebulan</th>
                                       <th className="px-6 py-4 font-black text-blue-700">Gaji Prorata (Sesuai Hadir)</th>
                                       <th className="px-6 py-4 font-black text-red-500">Auto Potongan Telat</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {parsedAttendance.map((item, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4">
                                             <div className="font-bold text-slate-800">{item.nama}</div>
                                             <div className="text-[10px] text-slate-500 font-medium">NIK: {item.nik} | Gapok: Rp{item.gaji_pokok_bulanan.toLocaleString()}</div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                             {isEditingPayroll ? (
                                                <input type="number" value={item.total_hari_kerja} onChange={(e) => {
                                                   const val = Number(e.target.value);
                                                   const newData=[...parsedAttendance]; 
                                                   newData[idx].total_hari_kerja = val;
                                                   newData[idx].gaji_prorata = Math.round((newData[idx].gaji_pokok_bulanan / totalHariKerjaSebulan) * val);
                                                   setParsedAttendance(newData);
                                                }} className="border border-blue-300 w-16 text-center rounded p-1 outline-none text-xs font-bold"/>
                                             ) : (
                                                <span className="bg-blue-100 text-blue-800 font-black px-3 py-1.5 rounded-lg text-sm shadow-sm">{item.total_hari_kerja} / {totalHariKerjaSebulan}</span>
                                             )}
                                          </td>
                                          <td className="px-6 py-4 font-black text-blue-700 text-base">
                                             Rp {item.gaji_prorata.toLocaleString()}
                                          </td>
                                          <td className="px-6 py-4">
                                             {isEditingPayroll ? (
                                                <input type="number" value={item.total_potongan_telat} onChange={(e) => { const newData=[...parsedAttendance]; newData[idx].total_potongan_telat=e.target.value; setParsedAttendance(newData); }} className="border border-red-300 focus:border-red-500 rounded p-1.5 w-full text-xs text-red-600 font-black outline-none bg-red-50"/>
                                             ) : (
                                                <span className="text-red-600 font-black bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">-Rp {item.total_potongan_telat.toLocaleString()}</span>
                                             )}
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                           <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                              <button onClick={() => setPayrollStep(0)} className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs transition">Batal</button>
                              <button onClick={() => { if(isEditingPayroll) { alert("Selesaikan mode edit terlebih dahulu!"); return; } setPayrollStep(2); }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transform hover:-translate-y-0.5 transition">Lanjut Penyesuaian Gaji <ChevronRight size={16}/></button>
                           </div>
                        </div>
                     )}

                     {/* STEP 2: PENYESUAIAN FLEKSIBEL (SPREADSHEET MODE) */}
                     {payrollStep === 2 && (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
                           <div className="p-6 border-b border-slate-100 bg-slate-900 flex flex-col md:flex-row justify-between md:items-center gap-4 text-white">
                              <div>
                                 <h3 className="font-black flex items-center gap-2">Step 2: Penyesuaian Komponen Gaji (Fleksibel)</h3>
                                 <p className="text-xs text-slate-400 mt-1">Tambahkan kolom tunjangan/potongan sesuai kebutuhan lalu ketik nominal langsung di tabel.</p>
                              </div>
                              <button onClick={() => setShowAddComponent(!showAddComponent)} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"><PlusCircle size={14}/> Tambah Kolom Baru</button>
                           </div>

                           {/* FORM BUAT KOLOM BARU */}
                           {showAddComponent && (
                              <div className="bg-slate-800 p-6 border-b border-slate-700 animate-fade-in text-white">
                                 <form onSubmit={handleAddCustomColumn} className="flex flex-col md:flex-row items-end gap-4 max-w-2xl">
                                    <div className="flex-1 w-full">
                                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nama Kolom (Cth: Lembur, Kasbon, PPN)</label>
                                       <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ketik nama kolom..." required className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl py-2.5 px-4 text-xs outline-none focus:border-purple-500"/>
                                    </div>
                                    <div className="flex-1 w-full">
                                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Sifat Angka</label>
                                       <select value={newColType} onChange={e => setNewColType(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white font-bold rounded-xl py-2.5 px-4 text-xs outline-none focus:border-purple-500">
                                          <option value="addition">Tunjangan (+)</option>
                                          <option value="deduction">Potongan (-)</option>
                                       </select>
                                    </div>
                                    <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-2.5 px-6 rounded-xl text-xs h-[42px] transition shadow-md w-full md:w-auto">Buat Kolom</button>
                                 </form>
                              </div>
                           )}

                           <div className="overflow-x-auto">
                              <table className="min-w-full text-left text-sm whitespace-nowrap">
                                 <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                       <th className="px-6 py-4 font-black sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Karyawan</th>
                                       <th className="px-4 py-4 font-black text-blue-700 bg-blue-50/50">Gaji (Prorata)</th>
                                       <th className="px-4 py-4 font-black text-red-500 bg-red-50/50">Pot. Telat</th>
                                       
                                       {/* Render Kolom Dinamis HRD */}
                                       {payrollColumns.map(col => (
                                          <th key={col.id} className={`px-4 py-4 font-black ${col.type === 'addition' ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'}`}>
                                             {col.name} {col.type === 'addition' ? '(+)' : '(-)'}
                                          </th>
                                       ))}

                                       <th className="px-6 py-4 font-black bg-purple-100 text-purple-900 text-right">TOTAL TERIMA (THP)</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {parsedAttendance.map((item, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                          <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                             <div className="font-black text-slate-800">{item.nama}</div>
                                             <div className="text-[10px] text-slate-400 mt-0.5">NIK: {item.nik}</div>
                                          </td>
                                          <td className="px-4 py-4 font-bold text-slate-700 bg-blue-50/10">Rp {item.gaji_prorata.toLocaleString()}</td>
                                          <td className="px-4 py-4 font-bold text-red-500 bg-red-50/10">- Rp {Number(item.total_potongan_telat).toLocaleString()}</td>
                                          
                                          {/* Render Input untuk setiap Kolom Dinamis */}
                                          {payrollColumns.map(col => (
                                             <td key={col.id} className="px-4 py-4 align-middle">
                                                <div className="relative">
                                                   <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                                                   <input 
                                                      type="number" 
                                                      value={item.custom_values[col.id] || ''} 
                                                      onChange={(e) => handleCustomValueChange(item.nik, col.id, e.target.value)}
                                                      className={`pl-8 pr-3 py-2 w-32 border rounded-xl text-xs font-bold outline-none transition-colors ${col.type === 'addition' ? 'border-emerald-200 focus:border-emerald-500 text-emerald-700 bg-emerald-50/30' : 'border-rose-200 focus:border-rose-500 text-rose-700 bg-rose-50/30'}`}
                                                      placeholder="0"
                                                   />
                                                </div>
                                             </td>
                                          ))}

                                          <td className="px-6 py-4 font-black text-lg text-purple-900 bg-purple-50/50 text-right border-l border-purple-100">
                                             Rp {hitungTHP(item).toLocaleString()}
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                           <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                              <button onClick={() => setPayrollStep(1)} className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs"><ArrowLeft size={14} className="inline mr-1"/> Kembali</button>
                              <button onClick={submitToFinance} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl font-black text-sm shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition"><Save size={16}/> Kirim THP ke Finance</button>
                           </div>

                           {/* MODAL SUCCESS ANIMASI */}
                           {showPayrollSuccessModal && (
                              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                 <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl"><CheckCircle2 size={56} className="text-emerald-500" /></div>
                                 <h2 className="text-3xl font-black text-slate-900 mb-2">Sukses Terkirim!</h2>
                                 <p className="text-slate-600 font-bold max-w-md bg-white p-4 rounded-xl border border-slate-200 shadow-sm">Data Final Payroll cabang {selectedPayrollSite} telah dikirim ke Dashboard Finance untuk dieksekusi pembayarannya.</p>
                              </div>
                           )}
                        </div>
                     )}

                     {/* TOMBOL BANTUAN INTERAKTIF DI BAWAH STEP 1 & 2 */}
                     {(payrollStep === 1 || payrollStep === 2) && (
                        <div className="mt-4 text-center animate-fade-in-up">
                           <button onClick={() => setShowPayrollInfoModal(true)} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all transform hover:scale-105">
                              <span className="w-5 h-5 bg-purple-500 rounded-full text-white flex items-center justify-center font-black">?</span>
                              Bagaimana Sistem Menghitung Gaji Ini?
                           </button>
                        </div>
                     )}
                   </>
                )}

                {/* HALAMAN RINGKASAN PAYROLL (RIWAYAT HRD) */}
                {currentView.filter === 'SUMMARY' && (
                   <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                      <div className="p-6 border-b border-slate-100 bg-purple-50 flex items-center gap-3">
                         <div className="bg-purple-200 text-purple-700 p-2 rounded-xl"><Archive size={20}/></div>
                         <div>
                            <h3 className="font-black text-purple-900 text-lg">Ringkasan Riwayat Payroll</h3>
                            <p className="text-xs text-purple-700 font-bold mt-0.5">Pantau status tagihan slip gaji karyawan yang sudah dikirim ke Finance.</p>
                         </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                           <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                              <tr>
                                 <th className="px-6 py-4 font-black">Periode</th>
                                 <th className="px-6 py-4 font-black">Karyawan & Penempatan</th>
                                 <th className="px-6 py-4 font-black text-right">Total Netto (THP)</th>
                                 <th className="px-6 py-4 font-black text-center">Status Pembayaran</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {payrollHistory.length === 0 ? (
                                 <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold text-xs"><RefreshCw size={32} className="mx-auto mb-2 text-slate-200"/>Belum ada riwayat pengiriman payroll.</td></tr>
                              ) : (
                                 payrollHistory.map(slip => (
                                    <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                                       <td className="px-6 py-4 font-black text-slate-800">{slip.period_month}</td>
                                       <td className="px-6 py-4">
                                          <div className="font-bold text-slate-800">{slip.initial_users?.name || 'Karyawan'}</div>
                                          <div className="text-[10px] text-slate-500 font-medium">NIK: {slip.initial_users?.nik} • {slip.site_location || '-'}</div>
                                       </td>
                                       <td className="px-6 py-4 text-right font-black text-emerald-600">Rp {Number(slip.net_salary).toLocaleString('id-ID')}</td>
                                       <td className="px-6 py-4 text-center">
                                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm 
                                             ${slip.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 
                                               slip.status === 'WAITING_APPROVAL' ? 'bg-orange-100 text-orange-700 animate-pulse border border-orange-200' : 
                                               slip.status === 'PENDING_PAYROLL' ? 'bg-rose-100 text-rose-700' : 
                                               slip.status === 'PARTIALLY_PAID' ? 'bg-cyan-100 text-cyan-700' : 
                                               slip.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                             {slip.status === 'PENDING_PAYROLL' ? 'TERTUNDA / KAS KURANG' : 
                                              slip.status === 'WAITING_APPROVAL' ? 'MENUNGGU FINANCE' : 
                                              slip.status === 'PARTIALLY_PAID' ? 'DICICIL (SPLIT)' :
                                              slip.status === 'PAID' ? 'LUNAS TERBAYAR' : slip.status.replace('_', ' ')}
                                          </span>
                                       </td>
                                    </tr>
                                 ))
                              )}
                           </tbody>
                        </table>
                      </div>
                   </div>
                )}
             </div>
          ) : currentView.module === 'SETTINGS' ? (
            <div className="max-w-5xl animate-fade-in">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-6">
                 <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><PlusCircle size={18} className="text-amber-500"/> Tambah Lokasi Cabang / Site Baru</h3>
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

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden mb-6">
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
                            <>
                              <td className="px-4 py-2"><input type="text" value={editSiteData.region} onChange={e => setEditSiteData({...editSiteData, region: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-xs font-bold w-full focus:outline-none" /></td>
                              <td className="px-4 py-2"><input type="text" value={editSiteData.name} onChange={e => setEditSiteData({...editSiteData, name: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-xs font-black w-full focus:outline-none" /></td>
                              <td className="px-4 py-2"><input type="text" value={editSiteData.info} onChange={e => setEditSiteData({...editSiteData, info: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-xs w-full focus:outline-none" /></td>
                              <td className="px-4 py-2">
                                <select value={editSiteData.kategori_karyawan} onChange={e => setEditSiteData({...editSiteData, kategori_karyawan: e.target.value})} className="bg-white border border-amber-500 rounded-lg p-1.5 text-[11px] font-bold w-full focus:outline-none">
                                   <option value="Pekerja Site">Pekerja Site</option><option value="Internal HO">Internal HO</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-center flex justify-center gap-1">
                                <button onClick={() => handleUpdateSite(site.id)} className="bg-emerald-500 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold shadow-sm">Simpan</button>
                                <button onClick={() => setEditingSiteId(null)} className="bg-slate-200 text-slate-700 text-[10px] px-2.5 py-1.5 rounded-lg font-bold">Batal</button>
                              </td>
                            </>
                          ) : (
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

              {/* PENGATURAN MASTER POSISI JABATAN */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-6">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Pengaturan Posisi Jabatan (Master)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div className="lg:col-span-1">
                      <form onSubmit={handleAddPosition} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Tambah Posisi Baru</label>
                          <input type="text" value={newPositionName} onChange={e => setNewPositionName(e.target.value)} placeholder="Contoh: Staff IT, Danru..." required className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 mb-3" />
                          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">Simpan Posisi</button>
                      </form>
                    </div>

                    <div className="lg:col-span-2">
                      <div className="flex flex-wrap gap-2">
                          {masterPositions.length === 0 ? <p className="text-xs text-slate-400 italic">Belum ada data posisi.</p> : null}
                          {masterPositions.map(pos => (
                            <div key={pos.id} className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg">
                              {editingPosId === pos.id ? (
                                <>
                                  <input type="text" value={editPosName} onChange={(e) => setEditPosName(e.target.value)} className="bg-slate-50 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none" autoFocus />
                                  <button onClick={() => handleUpdatePosition(pos.id)} className="text-emerald-500 hover:text-emerald-700"><CheckCircle2 size={16}/></button>
                                  <button onClick={() => setEditingPosId(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-bold text-slate-700">{pos.name}</span>
                                  <button onClick={() => { setEditingPosId(pos.id); setEditPosName(pos.name); }} className="text-amber-500 hover:text-amber-600 ml-2"><Edit size={14}/></button>
                                  <button onClick={() => deletePosition(pos.id, pos.name)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                </>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                </div>
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
                    <select 
                      value={filterJasa} 
                      onChange={(e) => setFilterJasa(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 text-slate-700 font-bold"
                    >
                      <option value="">-- Semua Divisi --</option>
                      {masterDivisions.map((div, index) => (
                        <option key={index} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* FILTER TANGGAL ELEGANT */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Dari Tanggal</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-700 font-bold focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-700 font-bold focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                      />
                    </div>
                    
                    {/* Tombol Reset dibuat dinamis: Hanya muncul jika ada tanggal yang dipilih */}
                    {(startDate || endDate) && (
                      <button
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="h-[42px] px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 hover:border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center shrink-0"
                        title="Reset Filter Tanggal"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* FILTER TAMBAHAN KHUSUS RECRUITMENT */}
                {currentView.module === 'RECRUITMENT' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Filter Gender</label>
                      <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 text-slate-700 font-bold">
                        <option value="">Semua Gender</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Filter Umur</label>
                      <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 text-slate-700 font-bold">
                        <option value="">Semua Umur</option>
                        <option value="under_25">Gen Z (Maks 25 Thn)</option>
                        <option value="26_35">Milenial (26 - 35 Thn)</option>
                        <option value="36_45">Senior (36 - 45 Thn)</option>
                        <option value="over_45">Veteran (&gt; 45 Thn)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Pendidikan Terakhir</label>
                      <select value={filterEdu} onChange={(e) => setFilterEdu(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 text-slate-700 font-bold">
                        <option value="">Semua Pendidikan</option>
                        <option value="sma">SMA / SMK / Sederajat</option>
                        <option value="diploma">D3 / Diploma</option>
                        <option value="sarjana">S1 / Sarjana ke atas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Min. Tinggi (cm)</label>
                      <input type="number" value={filterHeight} onChange={(e) => setFilterHeight(e.target.value)} placeholder="Contoh: 165" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 text-slate-700 font-bold" />
                    </div>
                  </div>
                )}

                  <div className="flex gap-2 h-[42px] overflow-x-auto">
                    {currentView.module === 'HRIS' && (
                      <>
                        <button onClick={() => setShowAddManualModal(true)} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[10px] md:text-xs transition-colors shadow-sm px-3 whitespace-nowrap"><UserPlus size={14}/> Tambah Manual</button>
                        <button onClick={() => setShowImportModal(true)} className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-[10px] md:text-xs transition-colors shadow-sm px-3 whitespace-nowrap"><Upload size={14}/> Import</button>
                      </>
                    )}
                    <button onClick={handleRefresh} className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl w-10 md:w-12 transition-colors shrink-0"><RefreshCw size={16}/></button>
                    <button onClick={() => { setExportFileName(`Data_HRIS_${currentView.filter}_${new Date().toISOString().split('T')[0]}`); setShowExportModal(true); }} className="flex flex-1 items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[10px] md:text-xs transition-colors shadow-sm px-3 whitespace-nowrap"><Download size={14}/> Export</button>
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
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Divisi & Jabatan</th>
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">{currentView.module === 'HRIS' ? 'Penempatan & Kontrak' : 'Target Plotting'}</th>
                          <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayData.map((c) => {
                          const edu = getHighestEducation(c.riwayat_pendidikan);
                          const age = calculateAge(c.tanggal_lahir);
                          return (
                          <tr key={c.id} className={`transition-colors ${selectedIds.includes(c.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                            <td className="px-4 py-4 text-center align-top pt-5"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" /></td>
                            <td className="px-4 py-4">
                              <div className="font-black text-slate-900 text-sm">{c.nama_lengkap}</div>
                              {currentView.module === 'HRIS' && (
                                <div className="text-[11px] font-bold text-blue-700 mt-1 mb-1 flex items-center gap-1"><span className="bg-blue-100 px-2 py-0.5 rounded border border-blue-200 shadow-sm">NIK: {c.nik_karyawan || 'Belum Diatur'}</span></div>
                              )}
                              <div className="text-[10px] font-medium mt-0.5 flex flex-wrap items-center gap-1">
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                  {c.jenis_kelamin || 'Gender (-)'} {age > 0 ? `• ${age} Thn` : ''}
                                </span>
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold">
                                  {edu !== 'Tidak Diketahui' ? edu : 'Pendidikan (-)'}
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 mt-1.5 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm"></span> HP: {c.no_hp || '-'}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-bold text-slate-800 text-[11px] mb-1">{c.bidang_jasa}</div>
                              {c.posisi_jabatan && <span className="inline-block bg-slate-100 text-slate-700 text-[10px] px-2 py-1 rounded-md font-bold mb-1.5 border border-slate-200">{c.posisi_jabatan}</span>}
                              
                              {currentView.module === 'HRIS' ? (
                                <div className="mt-1">

<Map size={10}/>
{c.kategori_karyawan === 'Internal HO' ? <span className="inline-flex items-center gap-1 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"><Building2 size={10}/> Karyawan Internal</span> : <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"> Pekerja Site</span>}
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
                              <button onClick={() => { setSelectedCandidate(c); setLokasiInput(c.lokasi_penempatan || ''); setNikInput(c.nik_karyawan || ''); setIsEditingProfile(false); setEditProfileData(c); }} className="bg-slate-100 hover:bg-slate-200 text-blue-700 border border-slate-200 text-xs px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm w-full md:w-auto">Buka Profil</button>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODAL TAMBAH MANUAL KARYAWAN */}
          {showAddManualModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-emerald-600 p-5 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black flex items-center gap-2"><UserPlus size={18}/> Tambah Karyawan Manual</h3>
                    <button onClick={() => setShowAddManualModal(false)} className="text-emerald-100 hover:text-white transition"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <form id="manual-add-form" onSubmit={handleAddManualSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Lengkap *</label>
                        <input type="text" required value={newManualData.nama_lengkap} onChange={e => setNewManualData({...newManualData, nama_lengkap: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NIK Karyawan *</label>
                        <input type="text" required value={newManualData.nik_karyawan} onChange={e => setNewManualData({...newManualData, nik_karyawan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Divisi / Jasa *</label>
                        <select required value={newManualData.bidang_jasa} onChange={e => setNewManualData({...newManualData, bidang_jasa: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-bold">
                          <option value="">-- Pilih Divisi --</option>
                          {masterDivisions.map((div, i) => <option key={i} value={div}>{div}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Posisi Jabatan *</label>
                        <select required value={newManualData.posisi_jabatan} onChange={e => setNewManualData({...newManualData, posisi_jabatan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-bold">
                          <option value="">-- Pilih Posisi --</option>
                          {masterPositions.map(pos => <option key={pos.id} value={pos.name}>{pos.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Lokasi Penempatan *</label>
                        <select required value={newManualData.lokasi_penempatan} onChange={e => setNewManualData({...newManualData, lokasi_penempatan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-bold">
                          <option value="">-- Pilih Lokasi --</option>
                          {masterSites.map(site => <option key={site.id} value={site.name}>{site.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Kontrak</label>
                        <select value={newManualData.status_kontrak} onChange={e => setNewManualData({...newManualData, status_kontrak: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-bold">
                          <option value="Probation">Probation</option>
                          <option value="PKWT">PKWT</option>
                          <option value="PKWTT">PKWTT</option>
                          <option value="Harian Lepas">Harian Lepas</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0">
                    <button onClick={() => setShowAddManualModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition">Batal</button>
                    <button type="submit" form="manual-add-form" className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-sm transition shadow-md">Simpan Data Karyawan</button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL EDIT MASSAL KESELURUHAN DATA (SPREADSHEET MODE) */}
          {showBulkEditModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                
                {/* HEADER */}
                <div className="bg-blue-600 p-5 flex justify-between items-center text-white shrink-0">
                    <div>
                       <h3 className="font-black flex items-center gap-2 text-base md:text-lg"><Edit size={20}/> Edit Massal Data Karyawan (Mode Spreadsheet)</h3>
                       <p className="text-blue-100 text-[10px] md:text-xs mt-1 font-bold">Mengedit {bulkEditList.length} karyawan sekaligus. Gulir (scroll) tabel ke kanan untuk melihat dan mengubah seluruh kolom data diri hingga gaji.</p>
                    </div>
                    <button onClick={() => setShowBulkEditModal(false)} className="bg-blue-700/50 hover:bg-blue-700 p-2 rounded-full transition"><X size={20}/></button>
                </div>

                {/* TABLE CONTAINER SPREADSHEET */}
                <div className="flex-1 overflow-auto bg-slate-50 p-4 custom-scrollbar relative">
                   <table className="min-w-max w-full border-collapse bg-white shadow-sm rounded-xl overflow-hidden">
                      <thead className="bg-slate-100 sticky top-0 z-20 shadow-sm">
                         <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase sticky left-0 bg-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-30">Identitas Pegawai</th>
                            {BULK_EDIT_FIELDS.map((f, i) => (
                               <th key={i} className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase border-l border-slate-200">{f.label}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {bulkEditList.map((item, rowIndex) => (
                            <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                               
                               {/* KOLOM FIX DI KIRI AGAR NAMA TIDAK HILANG SAAT DI SCROLL KANAN */}
                               <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-blue-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 z-10 align-top">
                                  <div className="font-black text-slate-800 text-xs w-40 truncate" title={item.nama_lengkap}>{item.nama_lengkap || 'Tanpa Nama'}</div>
                                  <div className="text-[10px] text-blue-600 font-bold mt-0.5">NIK: {item.nik_karyawan || '-'}</div>
                               </td>

                               {/* KOLOM DINAMIS MENGGUNAKAN LOOPING KONFIGURASI */}
                               {BULK_EDIT_FIELDS.map((f, colIndex) => (
                                  <td key={colIndex} className="px-2 py-2 border-l border-slate-100 align-top">
                                     {f.type === 'select' ? (
                                        <select 
                                           value={item[f.key] || ''} 
                                           onChange={(e) => {
                                              const newData = [...bulkEditList];
                                              newData[rowIndex][f.key] = e.target.value;
                                              setBulkEditList(newData);
                                           }}
                                           className="w-36 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        >
                                           <option value="">-- Pilih --</option>
                                           {f.options?.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
                                        </select>
                                     ) : (
                                        <input 
                                           type={f.type} 
                                           value={item[f.key] || ''} 
                                           onChange={(e) => {
                                              const newData = [...bulkEditList];
                                              newData[rowIndex][f.key] = e.target.value;
                                              setBulkEditList(newData);
                                           }}
                                           placeholder="-"
                                           className={`w-36 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${f.key === 'base_salary' ? 'font-black text-emerald-700' : 'font-medium text-slate-700'}`}
                                        />
                                     )}
                                  </td>
                               ))}
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                {/* FOOTER ACTION */}
                <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                   <button onClick={() => setShowBulkEditModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl text-sm transition-colors">Batalkan</button>
                   <button onClick={executeSpreadsheetBulkEdit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3 rounded-xl text-sm transition-all shadow-md flex items-center gap-2">
                      {loading ? 'Menyimpan...' : <><Save size={16}/> Simpan Semua Perubahan ({bulkEditList.length} Data)</>}
                   </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL IMPORT EXCEL BARU */}
          {showImportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-blue-600 p-5 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black flex items-center gap-2"><Upload size={18}/> Import Data Karyawan (Excel)</h3>
                    <button onClick={() => setShowImportModal(false)} className="text-blue-100 hover:text-white transition"><X size={20}/></button>
                </div>
                <div className="p-6">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
                     <p className="text-xs text-blue-800 font-bold mb-3">Langkah 1: Gunakan format template resmi.</p>
                     <button onClick={downloadImportTemplate} className="w-full bg-white hover:bg-blue-100 text-blue-700 font-bold text-xs py-2.5 rounded-xl border border-blue-200 transition shadow-sm flex items-center justify-center gap-2"><Download size={14}/> Download Template Excel</button>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-600 font-bold mb-3">Langkah 2: Upload file yang sudah diisi.</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition" />
                            <p className="text-xs text-slate-500 font-bold">Klik untuk memilih file Excel (.xlsx)</p>
                        </div>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={executeImportExcel} disabled={loading} />
                    </label>
                    {loading && <p className="text-center text-blue-500 text-xs font-bold mt-4 animate-pulse">Memproses file Excel, mohon tunggu...</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL CUSTOM EXPORT EXCEL */}
          {showExportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-emerald-500 p-5 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black flex items-center gap-2"><DownloadCloud size={18}/> Custom Export Data Excel</h3>
                    <button onClick={() => setShowExportModal(false)} className="text-emerald-100 hover:text-white transition"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nama Dokumen Excel</label>
                      <input type="text" value={exportFileName} onChange={(e) => setExportFileName(e.target.value)} placeholder="Contoh: Laporan_Karyawan_Bulan_Ini" className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div className="mb-4 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={isAllExportSelected} onChange={handleToggleSelectAllExport} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
                          <span className="text-xs font-black text-slate-700 uppercase">Pilih / Cek Semua Komponen</span>
                      </label>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">{selectedExportFields.length} Kolom Terpilih</span>
                    </div>
                    <div className="space-y-4">
                      {EXPORT_OPTIONS.map((group, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100"><span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{group.group}</span></div>
                          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-white">
                            {group.fields.map(field => (
                              <label key={field.key} className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={selectedExportFields.includes(field.key)} onChange={() => toggleExportField(field.key)} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
                                <span className={`text-[11px] font-bold transition-colors ${selectedExportFields.includes(field.key) ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>{field.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0">
                    <button onClick={() => setShowExportModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition">Batal</button>
                    <button onClick={executeCustomExport} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-sm transition shadow-md flex justify-center items-center gap-2"><Download size={16}/> Unduh Sekarang ({displayData.length} Baris)</button>
                </div>
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
          {currentView.module === 'HRIS' && currentView.filter !== 'RESIGN' && (
            <div className="flex items-center gap-2 shrink-0">
               <span className="text-[9px] uppercase text-slate-400 font-bold hidden sm:inline">Aksi HRIS:</span>
               <button onClick={() => setShowBulkEditModal(true)} className="text-[10px] md:text-xs font-bold hover:bg-amber-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><Edit size={12}/> Edit Massal</button>
               <button onClick={() => setShowBulkModal(true)} className="text-[10px] md:text-xs font-bold hover:bg-blue-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><MapPin size={12}/> Mutasi Lokasi</button>
               <button onClick={() => processResign(null, true)} className="text-[10px] md:text-xs font-bold hover:bg-rose-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><LogOut size={12}/> Resign Massal</button>
            </div>
          )}

          {currentView.module === 'HRIS' && currentView.filter === 'RESIGN' && (
            <div className="flex items-center gap-2 shrink-0">
               <button onClick={() => processReactivate(null, true)} className="text-[10px] md:text-xs font-bold hover:bg-emerald-600 hover:text-white border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"><RotateCcw size={12}/> Aktifkan Kembali Massal</button>
            </div>
          )}
          <div className="h-6 w-px bg-slate-700 shrink-0"></div>
          <button onClick={bulkDeleteCandidates} className="text-[10px] md:text-xs font-bold text-red-400 hover:text-white hover:bg-red-600 border border-transparent hover:border-red-500 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0"><Trash2 size={14}/> Hapus</button>
        </div>
      )}

      {/* MODAL BULK MUTASI */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
             <div className="bg-blue-600 p-5 flex justify-between items-center text-white"><h3 className="font-black flex items-center gap-2"><MapPin size={18}/> Mutasi Massal ({selectedIds.length} Karyawan)</h3><button onClick={() => setShowBulkModal(false)} className="text-blue-200 hover:text-white"><X size={20}/></button></div>
             <div className="p-6 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Lokasi / Site Baru</label>
                   <select value={bulkLokasi} onChange={(e) => setBulkLokasi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold text-slate-800">
                      <option value="">-- Pilih Lokasi Master --</option>
                      {masterSites.map(site => <option key={site.id} value={site.name}>{site.name} ({site.region})</option>)}
                   </select>
                   {bulkLokasi && (<div className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center"><span className="text-[10px] font-bold text-blue-700 uppercase">Kategori Karyawan:</span><span className="text-xs font-black bg-white px-2 py-1 rounded shadow-sm text-slate-800">{masterSites.find(s => s.name === bulkLokasi)?.kategori_karyawan || '-'}</span></div>)}
                </div>
                <div className="pt-4 flex gap-3">
                   <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition">Batal</button>
                   <button onClick={executeBulkMutasi} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md">Simpan Mutasi</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL BANTUAN PAYROLL INTERAKTIF */}
      {showPayrollInfoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative transform transition-all scale-100">
             
             {/* Header Gradient */}
             <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 md:p-8 text-white text-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Info size={120} className="transform rotate-12"/></div>
                <button onClick={() => setShowPayrollInfoModal(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors z-10"><X size={20}/></button>
                <div className="relative z-10">
                   <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner"><Layers size={32}/></div>
                   <h2 className="text-2xl font-black tracking-tight mb-1">Panduan Rumus Payroll Pintar</h2>
                   <p className="text-purple-100 text-xs font-medium">Pelajari bagaimana sistem Syntegra menghitung gaji karyawan secara otomatis dari Excel.</p>
                </div>
             </div>

             {/* Konten Scroll */}
             <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-50 space-y-6">
                
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                   <h3 className="font-black text-slate-800 text-sm mb-2 flex items-center gap-2"><div className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">1</div>Kalkulasi Prorata (Kehadiran)</h3>
                   <p className="text-xs text-slate-600 leading-relaxed mb-3">Sistem membaca jumlah kehadiran di Excel, lalu membaginya dengan target hari sebulan. Jika karyawan absen (tidak <i>full</i>), gajinya akan otomatis terpotong proporsional.</p>
                   <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 font-mono text-[10px] md:text-xs text-center shadow-inner">
                      Rumus: ( Gaji Pokok HRIS ÷ Target Hari Sebulan ) × Total Hadir di Excel
                   </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                   <h3 className="font-black text-slate-800 text-sm mb-2 flex items-center gap-2"><div className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">2</div>Denda Keterlambatan Otomatis</h3>
                   <p className="text-xs text-slate-600 leading-relaxed mb-3">Sistem menyeleksi <b>Jam Masuk</b> di Excel. Jika jam tersebut melewati "Batas Jam Masuk" yang kamu tentukan di awal, maka karyawan dianggap telat dan langsung dikalikan denda.</p>
                   <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 font-mono text-[10px] md:text-xs text-center shadow-inner">
                      Rumus: Total Hari Telat × Nominal Denda Telat (Rp)
                   </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                   <h3 className="font-black text-slate-800 text-sm mb-2 flex items-center gap-2"><div className="bg-emerald-100 text-emerald-600 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">3</div>Penyesuaian Manual (Step 2)</h3>
                   <p className="text-xs text-slate-600 leading-relaxed mb-3">Di tahap ini, kamu punya kendali penuh. Kamu bisa menimpa <i>(override)</i> potongan sistem dengan angka aslimu sendiri, atau menambah kolom baru seperti Lembur (+), Kasbon (-), PPN, dan BPJS.</p>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-md text-center">
                   <h3 className="font-black text-amber-400 text-sm uppercase tracking-widest mb-2">Final: Total Terima (THP)</h3>
                   <p className="text-xs text-slate-400 mb-4 font-medium">Angka akhir yang dikirim ke Finance merupakan gabungan dari seluruh proses di atas.</p>
                   <div className="inline-block bg-slate-800 px-4 py-3 rounded-2xl border border-slate-700 text-xs md:text-sm font-black text-emerald-400 shadow-inner">
                      THP = Gaji Prorata - Denda Telat + Tunjangan - Potongan Lain
                   </div>
                </div>

             </div>
             
             <div className="p-5 border-t border-slate-100 bg-white text-center">
                <button onClick={() => setShowPayrollInfoModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold text-sm transition shadow-sm w-full md:w-auto">Mengerti, Tutup Panduan</button>
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
                    {/* Bungkus tombol hapus (opsional, jika belum dibungkus) */}
                    {user?.can_delete_hrd && (
                      <button onClick={() => deleteCandidate(selectedCandidate.id, selectedCandidate.nama_lengkap)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors flex items-center gap-1.5 px-4" title="Hapus Data">
                        <Trash2 size={16}/> <span className="text-xs font-bold hidden md:inline">Hapus</span>
                      </button>
                    )}
                    
                    {/* Bungkus tombol Edit ini */}
                    {user?.can_edit_hrd && (
                      <button onClick={() => {setIsEditingProfile(true); setEditProfileData(selectedCandidate);}} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors flex items-center gap-1.5 px-4">
                        <Edit size={16}/> <span className="text-xs font-bold hidden md:inline">Edit Data Lengkap</span>
                      </button>
                    )}
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
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <div>
                              <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 px-1">NIK Karyawan</label>
                              <input type="text" value={editProfileData.nik_karyawan || ''} onChange={e => setEditProfileData({...editProfileData, nik_karyawan: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-black text-blue-900" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 px-1">Tanggal Bergabung</label>
                              <input type="date" value={editProfileData.tanggal_bergabung || ''} onChange={e => setEditProfileData({...editProfileData, tanggal_bergabung: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 px-1">Status Kontrak</label>
                              <select value={editProfileData.status_kontrak || ''} onChange={e => setEditProfileData({...editProfileData, status_kontrak: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold">
                                <option value="Probation">Probation</option>
                                <option value="PKWT">PKWT (Kontrak)</option>
                                <option value="PKWTT">PKWTT (Tetap)</option>
                                <option value="Harian Lepas">Harian Lepas</option>
                              </select>
                            </div>
                            {/* TAMBAHAN KOLOM GAJI POKOK */}
                            <div>
                              <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1 px-1">Gaji Pokok Utama (Bulan)</label>
                              <input 
                                type="number" 
                                placeholder="Ksgkn jika harian" 
                                value={editProfileData.base_salary || ''} 
                                onChange={e => setEditProfileData({...editProfileData, base_salary: e.target.value})} 
                                className="w-full bg-white border border-emerald-300 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-black text-emerald-700 placeholder-emerald-200" 
                              />
                            </div>
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
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Divisi / Bidang Jasa</label>
                          <select value={editProfileData.bidang_jasa || ''} onChange={e => setEditProfileData({...editProfileData, bidang_jasa: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold text-slate-700">
                            <option value="" disabled>-- Pilih Divisi --</option>
                            {masterDivisions.map((divisi, index) => <option key={index} value={divisi}>{divisi}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Posisi Jabatan</label>
                            <select value={editProfileData.posisi_jabatan || ''} onChange={e => setEditProfileData({...editProfileData, posisi_jabatan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 font-bold text-slate-700">
                              <option value="" disabled>-- Pilih Posisi --</option>
                              {masterPositions.map(pos => <option key={pos.id} value={pos.name}>{pos.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Level Akses (Portal TM)</label>
                            <select value={editProfileData.level_jabatan || 'staff'} onChange={e => setEditProfileData({...editProfileData, level_jabatan: e.target.value})} className="w-full bg-indigo-50 border border-indigo-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-indigo-500 font-bold text-indigo-900">
                              <option value="staff">Staff</option>
                              <option value="manager">Manager</option>
                              <option value="director">Director</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>

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
                        
                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Pendidikan Terakhir</label><textarea value={editProfileData.riwayat_pendidikan || ''} onChange={e => setEditProfileData({...editProfileData, riwayat_pendidikan: e.target.value})} placeholder="Contoh: S1 Sistem Informasi - Univ Brawijaya / SMA Negeri 1" rows="2" className="w-full bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-indigo-500"></textarea></div>

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
                        <div className="mt-2">
                           <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Referensi Dari</label>
                           <input type="text" value={editProfileData.referensi_dari || ''} onChange={e => setEditProfileData({...editProfileData, referensi_dari: e.target.value})} placeholder="Opsional" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                     </div>

                     <h3 className="font-black text-slate-900 mb-4 mt-8 text-sm uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><Upload size={16}/> 5. Arsip Dokumen Pelamar (Upload File)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {renderDocInput("Pas Foto", "berkas_pas_foto_url")}
                        {renderDocInput("KTP", "berkas_ktp_url")}
                        {renderDocInput("Kartu Keluarga (KK)", "berkas_kk_url")}
                        {renderDocInput("Ijazah", "berkas_ijazah_url")}
                        {renderDocInput("SKCK", "berkas_skck_url")}
                        {renderDocInput("Surat Sehat", "berkas_surat_sehat_url")}
                        {renderDocInput("Buku Rekening", "berkas_buku_rek_url")}
                        {renderDocInput("Vaksin", "berkas_vaksin_url")}
                        {renderDocInput("Referensi Kerja", "berkas_referensi_kerja_url")}
                        {renderDocInput("CV", "berkas_cv_url")}
                        <div className="md:col-span-2">{renderDocInput("Sertifikat Lainnya", "berkas_sertifikat_url")}</div>
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
                              <div className="mt-1"><span className="text-slate-400 block">Alasan Keluar</span><b className="text-slate-700 text-xs">{selectedCandidate.alasan_keluar || '-'}</b></div>
                              <div className="mt-1"><span className="text-blue-500 block">Referensi Dari</span><b className="text-blue-700 text-xs">{selectedCandidate.referensi_dari || '-'}</b></div>
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
                {currentView.module === 'HRIS' && selectedCandidate.status === 'INTI' && (
                  <>
                    <button onClick={() => processResign(selectedCandidate, false)} className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-5 py-3 rounded-xl font-bold shadow-sm text-xs transition-all w-full md:w-auto">
                      <LogOut size={16}/> Resign (Nonaktifkan)
                    </button>
                    <button onClick={() => syncToTaskManagement(selectedCandidate)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg text-xs transition-all w-full md:w-auto">
                      <UserPlus size={16}/> Sync Akun Portal
                    </button>
                  </>
                )}
                
                {currentView.module === 'HRIS' && selectedCandidate.status === 'RESIGN' && (
                  <button onClick={() => processReactivate(selectedCandidate, false)} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg text-xs transition-all w-full md:w-auto">
                    <RotateCcw size={16}/> Aktifkan Kembali Karyawan
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* --- CSS KHUSUS UNTUK CETAK LAPORAN PDF --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:text-black { color: #000 !important; }
          .print\\:bg-white { background-color: #fff !important; }
          .print\\:bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-white { background-color: #fff !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
    </div>
  );
};

export default AdminDashboard;