import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import { 
  ArrowLeft, LayoutDashboard, Plus, PlusCircle, X, RefreshCw, FileText, Menu, Save, 
  Upload, Search, BarChart3, Car, Calendar, MapPin, ClipboardList, Clock, Store,
  Wallet, Users, TrendingUp, FileSpreadsheet, Trash2
} from 'lucide-react';

const ParkingDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  // Data
  const [incomes, setIncomes] = useState([]);
  const [marketList, setMarketList] = useState([]);
  
  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterMarket, setFilterMarket] = useState('');
  
  // Input Form States
  const [inputMode, setInputMode] = useState('manual');
  const [manualForm, setManualForm] = useState({ tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Pagi', shift_start: '08:00', shift_end: '16:00', income_casual: '', income_langganan: '' });
  const [pasteData, setPasteData] = useState('');
  const [massInputRows, setMassInputRows] = useState([{ id: Date.now(), tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Pagi', income_casual: '', income_langganan: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Cek Autentikasi
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));
    if (!session) { navigate('/login'); return; }
    
    const isAdmin = session.role === 'admin' || session.role === 'direksi';
    if (!session.pkr_access_menu && !isAdmin) {
      alert('Anda tidak memiliki izin mengakses Modul Parkir.');
      navigate('/'); return;
    }
    setUser(session);
  }, [navigate]);

  // 2. Fetch Data & Auto-Refresh 1 Menit
  useEffect(() => {
    if (!user) return;

    const fetchMarkets = async () => {
      try {
        const { data } = await supabase.from('portal_markets').select('name').order('name');
        if (data) setMarketList(data.map(m => m.name));
      } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('parking_incomes')
          .select('*, initial_users(name)')
          .order('tanggal', { ascending: false });

        if (error) throw error;
        setIncomes(data || []);
        setLastSync(new Date());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [user]);

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  // =====================================
  // FUNGSI AUTO-CORRECT NAMA PASAR
  // =====================================
  const standardizeMarketName = (inputName) => {
    if (!inputName) return "Pasar Tidak Diketahui";
    const inputLower = String(inputName).toLowerCase();
    
    for (let market of marketList) {
      const marketLower = market.toLowerCase();
      const keywords = marketLower.replace(/pasar|jaya|parkir/g, '').trim().split(' ');
      
      for (let word of keywords) {
        if (word.length > 2 && inputLower.includes(word)) {
          return market; 
        }
      }
    }
    return inputName; 
  };

  // =====================================
  // SECURITY & VISIBILITY (BERDASARKAN AKSES)
  // =====================================
  const isAdmin = user?.role === 'admin' || user?.role === 'direksi';
  const canViewDashboard = isAdmin || user?.pkr_view_dashboard || user?.pkr_view_monthly || user?.pkr_view_daily || user?.pkr_view_shift || user?.pkr_view_global;
  const canSubmit = isAdmin || user?.pkr_submit_report;
  const canViewGlobal = isAdmin || user?.pkr_view_global;
  const canViewMonthly = isAdmin || user?.pkr_view_monthly;
  const canViewDaily = isAdmin || user?.pkr_view_daily;
  const canViewShift = isAdmin || user?.pkr_view_shift;

  // Filter List Tabel Data
  const visibleIncomes = useMemo(() => {
    let data = incomes;
    if (!canViewGlobal) data = data.filter(i => String(i.created_by) === String(user?.id));
    if (filterMonth) data = data.filter(i => i.tanggal && i.tanggal.startsWith(filterMonth));
    if (filterMarket) {
      const keyword = filterMarket.replace(/pasar|jaya|parkir/gi, '').trim().toLowerCase();
      data = data.filter(i => (i.nama_pasar || '').toLowerCase().includes(keyword));
    }
    return data;
  }, [incomes, canViewGlobal, filterMonth, filterMarket, user?.id]);

  // =====================================
  // DATA CHART PROCESSING (4 GRAFIK)
  // =====================================
  const summaryData = useMemo(() => {
    let totalCasual = 0; let totalLangganan = 0;
    visibleIncomes.forEach(i => {
      totalCasual += Number(i.income_casual || 0);
      totalLangganan += Number(i.income_langganan || 0);
    });
    return { totalCasual, totalLangganan, grandTotal: totalCasual + totalLangganan };
  }, [visibleIncomes]);

  // 1. Grafik Harian
  const dailyChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      if (!curr.tanggal) return acc;
      if (!acc[curr.tanggal]) acc[curr.tanggal] = 0;
      acc[curr.tanggal] += Number(curr.total_income || 0);
      return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort().slice(-7); 
    return sortedDates.map(date => ({
       label: date.slice(8, 10) + '/' + date.slice(5, 7), 
       value: grouped[date]
    }));
  }, [visibleIncomes]);

  // 2. Grafik Shift
  const shiftChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      const s = curr.shift || 'Lainnya';
      if (!acc[s]) acc[s] = 0;
      acc[s] += Number(curr.total_income || 0);
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [visibleIncomes]);

  // 3. Grafik Per Pasar
  const marketChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      const m = curr.nama_pasar || 'Unknown';
      if (!acc[m]) acc[m] = 0;
      acc[m] += Number(curr.total_income || 0);
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
  }, [visibleIncomes]);

  // 4. Grafik Bulanan 12 Bulan Terakhir
  const monthlyChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      if (!curr.tanggal) return acc;
      const month = curr.tanggal.slice(0, 7); 
      if (!acc[month]) acc[month] = 0;
      acc[month] += Number(curr.total_income || 0);
      return acc;
    }, {});
    
    const result = [];
    for(let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);
      result.push({
         label: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
         value: grouped[mStr] || 0
      });
    }
    return result;
  }, [visibleIncomes]);

  // --- INI PENYEBAB ERROR KEMARIN (SEKARANG SUDAH ADA) ---
  const maxDailyValue = Math.max(...dailyChartData.map(d => d.value), 1);
  const maxShiftValue = Math.max(...shiftChartData.map(d => d.value), 1);
  const maxMarketValue = Math.max(...marketChartData.map(d => d.value), 1);
  const maxMonthlyValue = Math.max(...monthlyChartData.map(d => d.value), 1);

  // Tahan layar agar Hooks berurutan sempurna
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Sistem...</span>
        </div>
      </div>
    );
  }

  // =====================================
  // FUNGSI SUBMIT (SINGLE, EXCEL, COPY-PASTE)
  // =====================================
  const processPayload = async (payloads) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('parking_incomes').insert(payloads);
      if (error) throw error;
      alert(`Berhasil menyimpan ${payloads.length} baris data laporan parkir!`);
      
      setManualForm({ tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Pagi', shift_start: '08:00', shift_end: '16:00', income_casual: '', income_langganan: '' });
      setMassInputRows([{ id: Date.now(), tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Pagi', income_casual: '', income_langganan: '' }]);
      setPasteData('');
      
      const { data } = await supabase.from('parking_incomes').select('*, initial_users(name)').order('tanggal', { ascending: false });
      setIncomes(data || []);
      setLastSync(new Date());
    } catch (err) {
      alert('Gagal menyimpan data: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualForm.nama_pasar) return alert('Pilih pasar!');
    const payload = [{
       tanggal: manualForm.tanggal,
       nama_pasar: standardizeMarketName(manualForm.nama_pasar),
       shift: manualForm.shift,
       shift_start: manualForm.shift_start,
       shift_end: manualForm.shift_end,
       income_casual: Number(manualForm.income_casual || 0),
       income_langganan: Number(manualForm.income_langganan || 0),
       created_by: user.id
    }];
    processPayload(payload);
  };

  const handleMassTableSubmit = () => {
    const validRows = massInputRows.filter(r => r.nama_pasar && r.tanggal);
    if (validRows.length === 0) return alert("Isi minimal 1 baris data dengan Nama Pasar & Tanggal!");

    const payloads = validRows.map(row => ({
       tanggal: row.tanggal,
       nama_pasar: standardizeMarketName(row.nama_pasar),
       shift: row.shift,
       income_casual: Number(row.income_casual || 0),
       income_langganan: Number(row.income_langganan || 0),
       created_by: user.id
    }));
    processPayload(payloads);
  };

  const parseIndonesianDate = (rawStr) => {
    if(!rawStr) return new Date().toISOString().split('T')[0];
    if(typeof rawStr === 'number') {
        const date = new Date(Math.round((rawStr - 25569)*86400*1000));
        return date.toISOString().split('T')[0];
    }
    const str = String(rawStr).trim();
    const months = { "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "mei": "05", "jun": "06", "jul": "07", "aug": "08", "agu": "08", "sep": "09", "oct": "10", "okt": "10", "nov": "11", "dec": "12", "des": "12" };
    const parts = str.split(' ');
    if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let monthKey = parts[1].toLowerCase().substring(0,3);
        let month = months[monthKey] || "01";
        let year = parts[2];
        return `${year}-${month}-${day}`;
    }
    if (str.includes('/')) {
       const p = str.split('/');
       if(p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleCopyPasteSubmit = () => {
    if (!pasteData.trim()) return alert("Teks masih kosong!");
    
    const rows = pasteData.trim().split('\n');
    const payloads = [];

    for (let i = 0; i < rows.length; i++) {
       const cols = rows[i].split('\t');
       if (cols.length >= 4) {
          let tglRaw = cols[0].trim();
          let pasar = cols[1].trim();
          let shiftStr = 'Full';
          let casual = 0;
          let langganan = 0;

          if (cols.length >= 5) {
            shiftStr = cols[2].trim();
            casual = Number(cols[3].replace(/[^0-9.-]+/g, "")) || 0;
            langganan = Number(cols[4].replace(/[^0-9.-]+/g, "")) || 0;
          } else if (cols.length === 4) {
            casual = Number(cols[2].replace(/[^0-9.-]+/g, "")) || 0;
            langganan = Number(cols[3].replace(/[^0-9.-]+/g, "")) || 0;
          }

          payloads.push({
             tanggal: parseIndonesianDate(tglRaw),
             nama_pasar: standardizeMarketName(pasar),
             shift: shiftStr,
             income_casual: casual,
             income_langganan: langganan,
             created_by: user.id
          });
       }
    }

    if (payloads.length > 0) {
      processPayload(payloads);
    } else {
      alert("Gagal memproses data. Pastikan format dipisahkan oleh Tab/Kolom Excel.");
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
        
        let headerRowIndex = -1;
        for (let i = 0; i < 10; i++) {
            if (rows[i] && rows[i][0] && String(rows[i][0]).toLowerCase().includes("tanggal")) {
                headerRowIndex = i; break;
            }
        }

        if (headerRowIndex === -1) {
           return alert("Format Excel tidak sesuai! Sistem tidak menemukan kolom 'Tanggal'.");
        }

        const marketNamesRow = rows[headerRowIndex + 1]; 
        const typesRow = rows[headerRowIndex + 2]; 

        const colMap = {};
        let currentMarket = "";
        for (let col = 1; col < typesRow.length; col++) {
            if (marketNamesRow[col] && marketNamesRow[col].trim() !== "") {
                currentMarket = marketNamesRow[col].trim();
            }
            const typeStr = String(typesRow[col] || "").toLowerCase();
            if (typeStr.includes("casual") || typeStr.includes("cassual")) {
                colMap[col] = { market: currentMarket, type: "casual" };
            } else if (typeStr.includes("langganan")) {
                colMap[col] = { market: currentMarket, type: "langganan" };
            }
        }

        const payloads = [];
        for (let r = headerRowIndex + 3; r < rows.length; r++) {
            const rowData = rows[r];
            const dateRaw = rowData[0];
            if (!dateRaw || String(dateRaw).toLowerCase().includes("total")) continue;

            let parsedDate = parseIndonesianDate(dateRaw);
            const rowMarketData = {};

            for (let col = 1; col < rowData.length; col++) {
                if (colMap[col]) {
                    const market = colMap[col].market;
                    const type = colMap[col].type;
                    const valRaw = rowData[col];
                    const valNum = (valRaw === '-' || !valRaw) ? 0 : Number(String(valRaw).replace(/[^0-9]/g, ""));

                    if (!rowMarketData[market]) rowMarketData[market] = { casual: 0, langganan: 0 };
                    if (type === "casual") rowMarketData[market].casual = valNum;
                    if (type === "langganan") rowMarketData[market].langganan = valNum;
                }
            }

            for (const market in rowMarketData) {
                if (rowMarketData[market].casual > 0 || rowMarketData[market].langganan > 0) {
                    payloads.push({
                        tanggal: parsedDate,
                        nama_pasar: standardizeMarketName(market),
                        shift: "Full",
                        income_casual: rowMarketData[market].casual,
                        income_langganan: rowMarketData[market].langganan,
                        created_by: user.id
                    });
                }
            }
        }

        if (payloads.length > 0) {
          processPayload(payloads);
        } else {
          alert("Sistem tidak menemukan data angka yang bisa diproses.");
        }
      } catch (err) {
        alert("Gagal memproses Excel: " + err.message);
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-slate-300 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-black text-white"><Car size={18}/></div>
             <div>
                <h1 className="font-black text-white leading-tight">Syntegra<span className="text-purple-400">Park</span></h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Modul Parkir</p>
             </div>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
           <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm font-bold">
             <ArrowLeft size={16} className="text-purple-400"/> Kembali ke Portal
           </button>
           <div className="my-2 border-t border-slate-800"></div>
           
           {canViewDashboard && (
             <button onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'}`}>
               <BarChart3 size={18}/> Dashboard & Grafik
             </button>
           )}

           {canSubmit && (
             <button onClick={() => { setActiveTab('input'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'input' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'}`}>
               <PlusCircle size={18}/> Lapor Income Baru
             </button>
           )}
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden"></div>}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shrink-0 z-10">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><Menu size={20}/></button>
             <div>
                <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight">{activeTab === 'dashboard' ? 'Dashboard Parkir' : 'Input Data Parkir'}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">Sync: {lastSync.toLocaleTimeString('id-ID')}</span>
                  {loading && <RefreshCw size={10} className="animate-spin text-purple-500"/>}
                </div>
             </div>
           </div>
           <button onClick={() => {
              const fetchNewData = async () => {
                setLoading(true);
                const { data } = await supabase.from('parking_incomes').select('*, initial_users(name)').order('tanggal', { ascending: false });
                setIncomes(data || []);
                setLastSync(new Date());
                setLoading(false);
              };
              fetchNewData();
           }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm">
             <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Segarkan
           </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

          {/* TAB 1: DASHBOARD GRAFIK */}
          {activeTab === 'dashboard' && canViewDashboard && (
            <div className="animate-fade-in space-y-6">
              
              {/* FILTERING AREA */}
              {(canViewMonthly || canViewGlobal) && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                   {canViewMonthly && (
                     <div className="w-full md:w-auto">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter Bulan (Data Harian/Shift)</label>
                       <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500" />
                     </div>
                   )}
                   {canViewGlobal && (
                     <div className="w-full md:w-auto flex-1">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter Pasar / Area</label>
                       <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500">
                          <option value="">Semua Pasar</option>
                          {marketList.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                     </div>
                   )}
                </div>
              )}

              {/* KARTU SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 p-4"><Wallet size={64}/></div>
                  <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest block mb-1">Total Income Keseluruhan</span>
                  <h3 className="text-3xl font-black text-white">{formatRupiah(summaryData.grandTotal)}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-5 p-4"><Car size={64}/></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Income Casual (Harian)</span>
                  <h3 className="text-2xl font-black text-purple-600">{formatRupiah(summaryData.totalCasual)}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-5 p-4"><Users size={64}/></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Income Langganan / Member</span>
                  <h3 className="text-2xl font-black text-indigo-600">{formatRupiah(summaryData.totalLangganan)}</h3>
                </div>
              </div>

              {/* AREA GRAFIK */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Grafik Harian */}
                {canViewDaily && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/> Grafik Trend 7 Hari Terakhir</h4>
                    <div className="flex items-end gap-3 h-48 border-b border-slate-100 pb-2">
                       {dailyChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto">Belum ada data.</p> : dailyChartData.map((d, i) => (
                         <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                           <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 font-bold">{formatRupiah(d.value)}</div>
                           <div style={{height: `${Math.max((d.value / maxDailyValue) * 100, 1)}%`}} className="w-full max-w-[40px] bg-emerald-400 rounded-t-md group-hover:bg-emerald-500 transition-all"></div>
                           <span className="text-[9px] font-bold text-slate-500 mt-2">{d.label}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* 2. Grafik Shift */}
                {canViewShift && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><Clock size={16} className="text-amber-500"/> Sebaran Income Per Shift</h4>
                    <div className="flex items-end justify-around gap-4 h-48 border-b border-slate-100 pb-2 px-4">
                       {shiftChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto">Belum ada data.</p> : shiftChartData.map((d, i) => (
                         <div key={i} className="flex flex-col justify-end items-center group relative h-full w-20">
                           <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 font-bold">{formatRupiah(d.value)}</div>
                           <div style={{height: `${Math.max((d.value / maxShiftValue) * 100, 1)}%`}} className="w-full bg-amber-400 rounded-t-md group-hover:bg-amber-500 transition-all"></div>
                           <span className="text-[10px] font-black text-slate-700 mt-2 uppercase">{d.label}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* 3. Grafik Semua Pasar */}
                {canViewDashboard && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><Store size={16} className="text-blue-500"/> Laporan Total Pendapatan Seluruh Pasar</h4>
                    <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                       {marketChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto py-10">Belum ada data pasar.</p> : marketChartData.map((d, i) => (
                         <div key={i} className="flex items-center gap-3 w-full">
                           <span className="text-[10px] font-bold text-slate-600 w-32 truncate text-right shrink-0" title={d.label}>{d.label}</span>
                           <div className="flex-1 bg-slate-100 h-6 rounded-full overflow-hidden flex items-center group relative">
                             <div style={{width: `${Math.max((d.value / maxMarketValue) * 100, 0.5)}%`}} className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out flex items-center justify-end px-2">
                             </div>
                             <span className="absolute right-3 text-[10px] font-black text-slate-700">{formatRupiah(d.value)}</span>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* 4. Grafik Bulanan */}
                {canViewMonthly && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><Calendar size={16} className="text-purple-500"/> Grafik Pendapatan 12 Bulan Terakhir</h4>
                    <div className="flex items-end justify-between gap-2 h-64 border-b border-slate-100 pb-2 px-2 overflow-x-auto custom-scrollbar">
                       {monthlyChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto">Belum ada data bulanan.</p> : monthlyChartData.map((d, i) => (
                         <div key={i} className="flex flex-col justify-end items-center group relative h-full flex-1 min-w-[50px]">
                           <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 font-bold">{formatRupiah(d.value)}</div>
                           <div style={{height: `${Math.max((d.value / maxMonthlyValue) * 100, 1)}%`}} className="w-full max-w-[40px] bg-purple-400 rounded-t-md group-hover:bg-purple-500 transition-all duration-500"></div>
                           <span className="text-[9px] font-bold text-slate-500 mt-2 uppercase">{d.label}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

              </div>

              {/* DAFTAR REALTIME */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="font-black text-slate-800 text-sm flex items-center gap-2"><ClipboardList size={16} className="text-blue-500"/> Log Laporan Realtime</h4>
                </div>
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3">Tanggal & Waktu</th>
                        <th className="px-5 py-3">Pasar / Lokasi</th>
                        <th className="px-5 py-3">Dilaporkan Oleh</th>
                        <th className="px-5 py-3 text-right">Casual (Rp)</th>
                        <th className="px-5 py-3 text-right">Langganan (Rp)</th>
                        <th className="px-5 py-3 text-right">Total (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {visibleIncomes.length === 0 ? (
                        <tr><td colSpan="6" className="py-8 text-center text-xs font-bold text-slate-400">Belum ada data untuk filter ini.</td></tr>
                      ) : (
                        visibleIncomes.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                               <span className="font-black text-slate-800 block">{item.tanggal}</span>
                               <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Shift: {item.shift} {item.shift_start ? `(${item.shift_start} - ${item.shift_end})` : ''}
                               </span>
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-700">{item.nama_pasar}</td>
                            <td className="px-5 py-3 font-bold text-[10px] text-blue-600 uppercase">{item.initial_users?.name || user?.name || 'Sistem'}</td>
                            <td className="px-5 py-3 text-right font-medium text-slate-600">{formatRupiah(item.income_casual)}</td>
                            <td className="px-5 py-3 text-right font-medium text-slate-600">{formatRupiah(item.income_langganan)}</td>
                            <td className="px-5 py-3 text-right font-black text-purple-600">{formatRupiah(item.total_income)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* TAB 2: PELAPORAN (INPUT DATA) */}
          {activeTab === 'input' && canSubmit && (
            <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
              
              {/* SELECT MODE INPUT */}
              <div className="flex bg-slate-200 p-1.5 rounded-2xl w-max mx-auto shadow-inner">
                 <button onClick={() => setInputMode('manual')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'manual' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Form Manual</button>
                 <button onClick={() => setInputMode('tabel')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'tabel' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tabel Massal</button>
                 <button onClick={() => setInputMode('excel')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'excel' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Upload Excel</button>
              </div>

              {/* MODE MANUAL */}
              {inputMode === 'manual' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                   <h3 className="font-black text-lg text-slate-800 mb-6">Input Laporan Per Shift</h3>
                   <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tanggal Laporan</label>
                           <input type="date" required value={manualForm.tanggal} onChange={e => setManualForm({...manualForm, tanggal: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                         </div>
                         <div className="md:col-span-2 grid grid-cols-3 gap-2">
                           <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Shift Kerja</label>
                             <select required value={manualForm.shift} onChange={e => setManualForm({...manualForm, shift: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500">
                               <option value="Pagi">Pagi</option>
                               <option value="Siang">Siang</option>
                               <option value="Malam">Malam</option>
                               <option value="Full">Satu Hari Penuh (Full)</option>
                             </select>
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Jam Mulai</label>
                             <input type="time" value={manualForm.shift_start} onChange={e => setManualForm({...manualForm, shift_start: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Jam Selesai</label>
                             <input type="time" value={manualForm.shift_end} onChange={e => setManualForm({...manualForm, shift_end: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                           </div>
                         </div>
                         <div className="md:col-span-2">
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Pasar / Lokasi</label>
                           <select required value={manualForm.nama_pasar} onChange={e => setManualForm({...manualForm, nama_pasar: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500">
                             <option value="" disabled>-- Pilih Pasar --</option>
                             {marketList.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pendapatan Casual (Rp)</label>
                           <input type="number" min="0" required value={manualForm.income_casual} onChange={e => setManualForm({...manualForm, income_casual: e.target.value})} placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pendapatan Langganan (Rp)</label>
                           <input type="number" min="0" required value={manualForm.income_langganan} onChange={e => setManualForm({...manualForm, income_langganan: e.target.value})} placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                         </div>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(147,51,234,0.3)] transition-all">
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Laporan'}
                      </button>
                   </form>
                </div>
              )}

              {/* MODE TABEL MASSAL DINAMIS */}
              {inputMode === 'tabel' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                   <h3 className="font-black text-lg text-slate-800 mb-2">Input Tabel Massal</h3>
                   <p className="text-xs text-slate-500 font-medium mb-6">Anda dapat menambah baris untuk menginput banyak laporan sekaligus.</p>
                   
                   <div className="overflow-x-auto w-full mb-4">
                     <table className="min-w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border-y border-slate-200">
                           <th className="p-3 w-10 text-center">No</th>
                           <th className="p-3 min-w-[150px]">Tanggal</th>
                           <th className="p-3 min-w-[200px]">Pasar</th>
                           <th className="p-3 w-28">Shift</th>
                           <th className="p-3 min-w-[150px]">Casual (Rp)</th>
                           <th className="p-3 min-w-[150px]">Langganan (Rp)</th>
                           <th className="p-3 w-12 text-center">Aksi</th>
                         </tr>
                       </thead>
                       <tbody>
                         {massInputRows.map((row, idx) => (
                           <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="p-2 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                             <td className="p-2"><input type="date" value={row.tanggal} onChange={(e) => {const newRows = [...massInputRows]; newRows[idx].tanggal = e.target.value; setMassInputRows(newRows);}} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:border-purple-500 outline-none" /></td>
                             <td className="p-2">
                               <select value={row.nama_pasar} onChange={(e) => {const newRows = [...massInputRows]; newRows[idx].nama_pasar = e.target.value; setMassInputRows(newRows);}} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:border-purple-500 outline-none">
                                  <option value="" disabled>Pilih Pasar...</option>
                                  {marketList.map(m => <option key={m} value={m}>{m}</option>)}
                               </select>
                             </td>
                             <td className="p-2">
                               <select value={row.shift} onChange={(e) => {const newRows = [...massInputRows]; newRows[idx].shift = e.target.value; setMassInputRows(newRows);}} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:border-purple-500 outline-none">
                                 <option value="Pagi">Pagi</option><option value="Siang">Siang</option><option value="Malam">Malam</option><option value="Full">Full</option>
                               </select>
                             </td>
                             <td className="p-2"><input type="number" min="0" placeholder="0" value={row.income_casual} onChange={(e) => {const newRows = [...massInputRows]; newRows[idx].income_casual = e.target.value; setMassInputRows(newRows);}} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:border-purple-500 outline-none" /></td>
                             <td className="p-2"><input type="number" min="0" placeholder="0" value={row.income_langganan} onChange={(e) => {const newRows = [...massInputRows]; newRows[idx].income_langganan = e.target.value; setMassInputRows(newRows);}} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:border-purple-500 outline-none" /></td>
                             <td className="p-2 text-center"><button onClick={() => {if(massInputRows.length > 1) setMassInputRows(massInputRows.filter((_, i) => i !== idx))}} className="text-red-500 hover:bg-red-100 p-1.5 rounded"><Trash2 size={14}/></button></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   
                   <button onClick={() => setMassInputRows([...massInputRows, { id: Date.now(), tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Pagi', income_casual: '', income_langganan: '' }])} className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-600 font-black text-xs rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 mb-4">
                      <Plus size={14}/> Tambah Baris Baru
                   </button>
                   
                   <button onClick={handleMassTableSubmit} disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                     <Save size={16}/> {isSubmitting ? 'Memproses Data...' : 'Simpan Semua Baris'}
                   </button>
                </div>
              )}

              {/* MODE COPY PASTE MASSAL */}
              {inputMode === 'copypaste' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                   <h3 className="font-black text-lg text-slate-800 mb-2">Input via Copy-Paste Excel</h3>
                   <p className="text-xs text-slate-500 font-medium mb-6">Blok data di Excel Anda, lalu paste di kotak bawah. <br/><b>Format Urutan Kolom:</b> Tanggal (YYYY-MM-DD) | Nama Pasar | Shift | Income Casual | Income Langganan</p>
                   
                   <textarea 
                      rows="8" 
                      value={pasteData}
                      onChange={(e) => setPasteData(e.target.value)}
                      placeholder="Paste data dari Excel di sini..."
                      className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-mono focus:outline-none focus:border-purple-500 mb-4 whitespace-pre"
                   ></textarea>
                   
                   <button onClick={handleCopyPasteSubmit} disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                     <Save size={16}/> {isSubmitting ? 'Memproses Data...' : 'Proses & Simpan Data'}
                   </button>
                </div>
              )}

              {/* MODE UPLOAD EXCEL FILE (SMART PARSER) */}
              {inputMode === 'excel' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                   <h3 className="font-black text-lg text-slate-800 mb-2">Upload File Excel (.xlsx)</h3>
                   <p className="text-xs text-slate-500 font-medium mb-6">Sistem otomatis mendeteksi format tabel bersarang (Pivot Header) sesuai format laporan harian pasar.</p>
                   
                   <label className="flex flex-col items-center justify-center w-full p-10 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-purple-400 transition-all group">
                       <FileSpreadsheet className="w-12 h-12 text-slate-300 group-hover:text-purple-500 mb-3 transition-colors" />
                       <p className="text-sm font-black text-slate-700">Pilih atau Tarik File Excel Ke Sini</p>
                       <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} disabled={isSubmitting} />
                   </label>
                   {isSubmitting && <p className="text-center text-purple-500 text-xs font-bold mt-4 animate-pulse">Menyimpan data ke database... Mohon tunggu.</p>}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
};

export default ParkingDashboard;