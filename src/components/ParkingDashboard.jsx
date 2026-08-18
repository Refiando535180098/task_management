import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import { 
  ArrowLeft, LayoutDashboard, Plus, PlusCircle, X, RefreshCw, FileText, Menu, Save, 
  Upload, Search, BarChart3, Car, Calendar, MapPin, ClipboardList, Clock, Store,
  Wallet, Users, TrendingUp, FileSpreadsheet, Trash2, Settings, Download, FileImage, Image as ImageIcon
} from 'lucide-react';

const ParkingDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  const [incomes, setIncomes] = useState([]);
  const [marketList, setMarketList] = useState([]);
  
  const [filterMonth, setFilterMonth] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  
  const [inputMode, setInputMode] = useState('manual');
  
  const [manualForm, setManualForm] = useState({ 
    tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Shift 1', shift_start: '08:00', shift_end: '16:00', 
    inc_motor: '', inc_manual_motor: '', inc_mobil: '', inc_box: '', inc_truck: '', inc_pkl: '', income_langganan: '',
    qty_motor: '', qty_manual_motor: '', qty_mobil: '', qty_box: '', qty_truck: '', qty_pkl: '', qty_langganan: '',
    tm_qty: '', tm_nominal: '', tm_photos: []
  });
  
  const [massInputRows, setMassInputRows] = useState([{ 
    id: Date.now(), tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Shift 1', 
    inc_motor: '', inc_manual_motor: '', inc_mobil: '', inc_box: '', inc_truck: '', inc_pkl: '', income_langganan: '',
    qty_motor: '', qty_manual_motor: '', qty_mobil: '', qty_box: '', qty_truck: '', qty_pkl: '', qty_langganan: '' 
  }]);
  
  const [pasteData, setPasteData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [markups, setMarkups] = useState({});
  const [markupForm, setMarkupForm] = useState({ month: new Date().toISOString().slice(0, 7), percentage: 10 });
  const [isSavingMarkup, setIsSavingMarkup] = useState(false);

  const fetchMarkups = async () => {
    try {
      const { data } = await supabase.from('parking_markups').select('*');
      if (data) {
        const markupObj = {};
        data.forEach(item => { markupObj[item.month] = item.percentage; });
        setMarkups(markupObj);
      }
    } catch (e) { console.warn("Tabel markups blm ada.", e); }
  };

  const handleSaveMarkup = async (e) => {
    e.preventDefault();
    setIsSavingMarkup(true);
    try {
      await supabase.from('parking_markups').delete().eq('month', markupForm.month);
      const { error } = await supabase.from('parking_markups').insert([{ month: markupForm.month, percentage: Number(markupForm.percentage) }]);
      if (error) throw error;
      alert(`Markup ${markupForm.percentage}% untuk bulan ${markupForm.month} berhasil diterapkan!`);
      setMarkups(prev => ({...prev, [markupForm.month]: Number(markupForm.percentage)}));
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSavingMarkup(false); }
  };

  const handleDeleteMarkup = async (month) => {
    if(!window.confirm(`Yakin hapus markup bulan ${month}?`)) return;
    try {
      await supabase.from('parking_markups').delete().eq('month', month);
      const newMarkups = {...markups}; delete newMarkups[month]; setMarkups(newMarkups);
    } catch (err) { alert('Gagal: ' + err.message); }
  };

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));
    if (!session) { navigate('/login'); return; }
    const isAdmin = session.role === 'admin' || session.role === 'direksi';
    if (!session.pkr_access_menu && !isAdmin) { alert('Akses Ditolak.'); navigate('/'); return; }
    setUser(session);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchMarkets = async () => {
      try { const { data } = await supabase.from('portal_markets').select('name').order('name');
            if (data) setMarketList(data.map(m => m.name)); } catch (e) {}
    };
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('parking_incomes').select('*, initial_users(name)').order('tanggal', { ascending: false });
        if (error) throw error; setIncomes(data || []); setLastSync(new Date());
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchMarkets(); fetchMarkups(); fetchData();
    const intervalId = setInterval(() => { fetchData(); }, 60000);
    return () => clearInterval(intervalId);
  }, [user]);

  const standardizeMarketName = (inputName) => {
    if (!inputName) return "Pasar Tidak Diketahui";
    const rawString = String(inputName).trim();
    const inputClean = rawString.toLowerCase().replace(/pasar|jaya|parkir/g, '').trim();
    
    let bestMatch = null;
    let maxMatchScore = 0;

    for (let market of marketList) {
      const marketClean = market.toLowerCase().replace(/pasar|jaya|parkir/g, '').trim();
      if (inputClean === marketClean) return market;
      
      const keywords = marketClean.split(' ').filter(w => w.length > 2);
      if (keywords.length === 0) continue;
      
      let allMatch = true;
      for (let word of keywords) {
        if (!inputClean.includes(word)) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch && keywords.length > maxMatchScore) {
        const inputKeywords = inputClean.split(' ').filter(w => w.length > 2);
        if (inputKeywords.length === keywords.length) {
            maxMatchScore = keywords.length;
            bestMatch = market;
        }
      }
    }
    
    if (!bestMatch) {
        return rawString.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }
    return bestMatch; 
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'direksi';
  const canViewDashboard = isAdmin || user?.pkr_view_dashboard || user?.pkr_view_chart_daily || user?.pkr_view_chart_shift || user?.pkr_view_chart_market || user?.pkr_view_chart_monthly;
  const canSubmit = isAdmin || user?.pkr_submit_report;
  const canViewGlobal = isAdmin || user?.pkr_view_global;
  const canViewChartDaily = isAdmin || user?.pkr_view_chart_daily;
  const canViewChartShift = isAdmin || user?.pkr_view_chart_shift;
  const canViewChartMarket = isAdmin || user?.pkr_view_chart_market;
  const canViewChartMonthly = isAdmin || user?.pkr_view_chart_monthly;
  const canViewLog = isAdmin || user?.pkr_view_log_harian;
  const canAccessSetting = isAdmin || user?.pkr_access_setting;
  const isMarkupViewer = user?.pkr_view_markup;
  const canViewQty = isAdmin || user?.pkr_view_qty; 

  const [chartMetric, setChartMetric] = useState('income'); 

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  const formatGrafik = (angka) => chartMetric === 'qty' ? new Intl.NumberFormat('id-ID').format(angka) + ' Unit' : formatRupiah(angka);

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

  const summaryData = useMemo(() => {
    let incMotor = 0, incManualMotor = 0, incMobil = 0, incBox = 0, incTruck = 0, incPkl = 0, incLangganan = 0, grandTotal = 0;
    visibleIncomes.forEach(i => {
      const monthStr = i.tanggal?.slice(0, 7);
      const multiplier = (isMarkupViewer && monthStr && markups[monthStr]) ? (1 - (markups[monthStr] / 100)) : 1;
      incMotor += Number(i.inc_motor || 0) * multiplier;
      incManualMotor += Number(i.inc_manual_motor || 0) * multiplier;
      incMobil += Number(i.inc_mobil || 0) * multiplier;
      incBox += Number(i.inc_box || 0) * multiplier;
      incTruck += Number(i.inc_truck || 0) * multiplier;
      incPkl += Number(i.inc_pkl || 0) * multiplier;
      incLangganan += Number(i.income_langganan || 0) * multiplier;
      grandTotal += Number(i.total_income || 0) * multiplier;
    });
    return { incMotor, incManualMotor, incMobil, incBox, incTruck, incPkl, incLangganan, grandTotal };
  }, [visibleIncomes, isMarkupViewer, markups]);

  const qtySummaryData = useMemo(() => {
    let totalMotor = 0, totalManualMotor = 0, totalMobil = 0, totalBox = 0, totalTruck = 0, totalPkl = 0, totalLangganan = 0;
    visibleIncomes.forEach(i => {
       totalMotor += Number(i.qty_motor || 0); totalManualMotor += Number(i.qty_manual_motor || 0); totalMobil += Number(i.qty_mobil || 0);
       totalBox += Number(i.qty_box || 0); totalTruck += Number(i.qty_truck || 0); totalPkl += Number(i.qty_pkl || 0);
       totalLangganan += Number(i.qty_langganan || 0);
    });
    return { totalMotor, totalManualMotor, totalMobil, totalBox, totalTruck, totalPkl, totalLangganan, grandTotalQty: totalMotor + totalManualMotor + totalMobil + totalBox + totalTruck + totalPkl + totalLangganan };
  }, [visibleIncomes]);

  const dailyChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      if (!curr.tanggal) return acc;
      const monthStr = curr.tanggal.slice(0, 7);
      const multiplier = (isMarkupViewer && markups[monthStr]) ? (1 - (markups[monthStr] / 100)) : 1;
      const val = chartMetric === 'qty' ? Number(curr.qty_total || 0) : Number(curr.total_income || 0) * multiplier;
      if (!acc[curr.tanggal]) acc[curr.tanggal] = 0; acc[curr.tanggal] += val;
      return acc;
    }, {});
    return Object.keys(grouped).sort().slice(-7).map(date => ({ label: date.slice(8, 10) + '/' + date.slice(5, 7), value: grouped[date] }));
  }, [visibleIncomes, isMarkupViewer, markups, chartMetric]);

  const shiftChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      const monthStr = curr.tanggal?.slice(0, 7);
      const multiplier = (isMarkupViewer && monthStr && markups[monthStr]) ? (1 - (markups[monthStr] / 100)) : 1;
      const val = chartMetric === 'qty' ? Number(curr.qty_total || 0) : Number(curr.total_income || 0) * multiplier;
      const s = curr.shift || 'Lainnya';
      if (!acc[s]) acc[s] = 0; acc[s] += val;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [visibleIncomes, isMarkupViewer, markups, chartMetric]);

  const marketChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      const monthStr = curr.tanggal?.slice(0, 7);
      const multiplier = (isMarkupViewer && monthStr && markups[monthStr]) ? (1 - (markups[monthStr] / 100)) : 1;
      const val = chartMetric === 'qty' ? Number(curr.qty_total || 0) : Number(curr.total_income || 0) * multiplier;
      const m = curr.nama_pasar || 'Unknown';
      if (!acc[m]) acc[m] = 0; acc[m] += val;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);
  }, [visibleIncomes, isMarkupViewer, markups, chartMetric]);

  const monthlyChartData = useMemo(() => {
    const grouped = visibleIncomes.reduce((acc, curr) => {
      if (!curr.tanggal) return acc;
      const monthStr = curr.tanggal.slice(0, 7);
      const multiplier = (isMarkupViewer && markups[monthStr]) ? (1 - (markups[monthStr] / 100)) : 1;
      const val = chartMetric === 'qty' ? Number(curr.qty_total || 0) : Number(curr.total_income || 0) * multiplier;
      if (!acc[monthStr]) acc[monthStr] = 0; acc[monthStr] += val;
      return acc;
    }, {});
    const result = [];
    for(let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);
      result.push({ label: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }), value: grouped[mStr] || 0 });
    }
    return result;
  }, [visibleIncomes, isMarkupViewer, markups, chartMetric]);

  const maxDailyValue = Math.max(...dailyChartData.map(d => d.value), 1);
  const maxShiftValue = Math.max(...shiftChartData.map(d => d.value), 1);
  const maxMarketValue = Math.max(...marketChartData.map(d => d.value), 1);
  const maxMonthlyValue = Math.max(...monthlyChartData.map(d => d.value), 1);

  if (!user) return ( <div className="flex h-screen w-full items-center justify-center bg-slate-50"><RefreshCw className="w-8 h-8 animate-spin text-purple-500" /></div> );

  const processPayload = async (payloads) => {
    setIsSubmitting(true); 
    try {
      const uniqueMarkets = [...new Set(payloads.map(p => p.nama_pasar))];
      const newMarkets = uniqueMarkets.filter(m => !marketList.includes(m) && m !== "Pasar Tidak Diketahui");
      
      let currentMarkets = [...marketList];
      for (let m of newMarkets) {
         const { error: marketErr } = await supabase.from('portal_markets').insert([{ name: m }]);
         if (!marketErr) currentMarkets.push(m);
      }
      if (newMarkets.length > 0) setMarketList(currentMarkets);

      for (const p of payloads) {
         const { data: existing, error: selectErr } = await supabase.from('parking_incomes')
           .select('id')
           .eq('tanggal', p.tanggal)
           .eq('nama_pasar', p.nama_pasar)
           .eq('shift', p.shift)
           .maybeSingle();

         if (selectErr) throw selectErr;

         if (existing) {
             const updateData = {};
             if (p.isIncomeFile === true) {
                 if (p.isLangganan) {
                     updateData.income_langganan = p.updates.income_langganan;
                     updateData.total_income = p.updates.total_income;
                 } else {
                     updateData.inc_motor = p.updates.inc_motor; updateData.inc_mobil = p.updates.inc_mobil;
                     updateData.inc_box = p.updates.inc_box; updateData.inc_truck = p.updates.inc_truck; updateData.inc_pkl = p.updates.inc_pkl;
                     updateData.income_casual = p.updates.income_casual;
                     updateData.total_income = p.updates.total_income;
                 }
             } else if (p.isIncomeFile === false) {
                 if (p.isLangganan) {
                     updateData.qty_langganan = p.updates.qty_langganan;
                     updateData.qty_total = p.updates.qty_total;
                 } else {
                     updateData.qty_motor = p.updates.qty_motor; updateData.qty_mobil = p.updates.qty_mobil;
                     updateData.qty_box = p.updates.qty_box; updateData.qty_truck = p.updates.qty_truck; updateData.qty_pkl = p.updates.qty_pkl;
                     updateData.qty_total = p.updates.qty_total;
                 }
             } else {
                 Object.assign(updateData, p.updates); 
             }
             const { error: upErr } = await supabase.from('parking_incomes').update(updateData).eq('id', existing.id);
             if (upErr) throw upErr;
         } else {
             const insertData = { tanggal: p.tanggal, nama_pasar: p.nama_pasar, shift: p.shift, created_by: user.id, ...p.updates };
             const { error: inErr } = await supabase.from('parking_incomes').insert([insertData]);
             if (inErr) throw inErr;
         }
      }

      alert(`Berhasil memproses dan mensinkronkan ${payloads.length} entri data!`);
      
      setManualForm({ tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Shift 1', shift_start: '08:00', shift_end: '16:00', inc_motor: '', inc_mobil: '', inc_box: '', inc_truck: '', inc_pkl: '', income_langganan: '', qty_motor: '', qty_mobil: '', qty_box: '', qty_truck: '', qty_pkl: '', qty_langganan: '', tm_qty: '', tm_nominal: '', tm_photo: null });
      setMassInputRows([{ id: Date.now(), tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Shift 1', inc_motor: '', inc_mobil: '', inc_box: '', inc_truck: '', inc_pkl: '', income_langganan: '', qty_motor: '', qty_mobil: '', qty_box: '', qty_truck: '', qty_pkl: '', qty_langganan: '' }]);
      
      const { data } = await supabase.from('parking_incomes').select('*, initial_users(name)').order('tanggal', { ascending: false });
      setIncomes(data || []); setLastSync(new Date());
    } catch (err) { alert('Gagal memproses data: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.nama_pasar) return alert('Pilih pasar!');
    setIsSubmitting(true);

    let uploadedUrls = [];
    if (manualForm.tm_photos && manualForm.tm_photos.length > 0) {
      // Fungsi internal untuk kompres gambar
      const compressImage = (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800; // Maksimal lebar 800px agar ringan
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              // Kompres ke JPEG dengan kualitas 70%
              canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.7);
            };
          };
        });
      };

      try {
        for (let i = 0; i < manualForm.tm_photos.length; i++) {
           const file = manualForm.tm_photos[i];
           const compressedBlob = await compressImage(file);
           const fileName = `tm_${Date.now()}_${i}.jpg`;
           
           const { error: uploadError } = await supabase.storage.from('parking_attachments').upload(fileName, compressedBlob);
           if (uploadError) throw uploadError;
           
           const { data } = supabase.storage.from('parking_attachments').getPublicUrl(fileName);
           uploadedUrls.push(data.publicUrl);
        }
      } catch (err) {
        alert("Gagal mengupload beberapa foto: " + err.message);
        setIsSubmitting(false); return;
      }
    }

    const incM = Number(manualForm.inc_motor||0), incMM = Number(manualForm.inc_manual_motor||0), incMb = Number(manualForm.inc_mobil||0), incB = Number(manualForm.inc_box||0), incT = Number(manualForm.inc_truck||0), incP = Number(manualForm.inc_pkl||0), incL = Number(manualForm.income_langganan||0);
    const qtyM = Number(manualForm.qty_motor||0), qtyMM = Number(manualForm.qty_manual_motor||0), qtyMb = Number(manualForm.qty_mobil||0), qtyB = Number(manualForm.qty_box||0), qtyT = Number(manualForm.qty_truck||0), qtyP = Number(manualForm.qty_pkl||0), qtyL = Number(manualForm.qty_langganan||0);
    const tmQ = Number(manualForm.tm_qty||0), tmNom = Number(manualForm.tm_nominal||0);

    const payload = [{
       tanggal: manualForm.tanggal, nama_pasar: standardizeMarketName(manualForm.nama_pasar), shift: manualForm.shift,
       updates: {
           inc_motor: incM, inc_manual_motor: incMM, inc_mobil: incMb, inc_box: incB, inc_truck: incT, inc_pkl: incP, income_langganan: incL, income_casual: (incM + incMM + incMb + incB + incT + incP),
           total_income: (incM + incMM + incMb + incB + incT + incP + incL) - tmNom,
           qty_motor: qtyM, qty_manual_motor: qtyMM, qty_mobil: qtyMb, qty_box: qtyB, qty_truck: qtyT, qty_pkl: qtyP, qty_langganan: qtyL,
           qty_total: qtyM + qtyMM + qtyMb + qtyB + qtyT + qtyP + qtyL,
           tm_qty: tmQ, tm_nominal: tmNom, 
           tm_photo_urls: uploadedUrls, // <--- Simpan ke array
           is_manual: true,
           shift_start: manualForm.shift_start, shift_end: manualForm.shift_end
       }
    }];
    
    // ProcessPayload akan mengurus notif alert dan reset form
    processPayload(payload);
  };

  const handleMassTableSubmit = () => {
    const validRows = massInputRows.filter(r => r.nama_pasar && r.tanggal);
    if (validRows.length === 0) return alert("Isi minimal 1 baris data!");

    const payloads = validRows.map(row => {
       const incM = Number(row.inc_motor||0), incMM = Number(row.inc_manual_motor||0), incMb = Number(row.inc_mobil||0), incB = Number(row.inc_box||0), incT = Number(row.inc_truck||0), incP = Number(row.inc_pkl||0), incL = Number(row.income_langganan||0);
       const qtyM = Number(row.qty_motor||0), qtyMM = Number(row.qty_manual_motor||0), qtyMb = Number(row.qty_mobil||0), qtyB = Number(row.qty_box||0), qtyT = Number(row.qty_truck||0), qtyP = Number(row.qty_pkl||0), qtyL = Number(row.qty_langganan||0);
       return {
           tanggal: row.tanggal, nama_pasar: standardizeMarketName(row.nama_pasar), shift: row.shift,
           updates: {
               inc_motor: incM, inc_manual_motor: incMM, inc_mobil: incMb, inc_box: incB, inc_truck: incT, inc_pkl: incP, income_langganan: incL, income_casual: (incM + incMM + incMb + incB + incT + incP),
               total_income: incM + incMM + incMb + incB + incT + incP + incL,
               qty_motor: qtyM, qty_manual_motor: qtyMM, qty_mobil: qtyMb, qty_box: qtyB, qty_truck: qtyT, qty_pkl: qtyP, qty_langganan: qtyL,
               qty_total: qtyM + qtyMM + qtyMb + qtyB + qtyT + qtyP + qtyL,
               is_manual: true
           }
       };
    });
    processPayload(payloads);
  };

  const parseIndonesianDate = (rawStr) => {
    if(!rawStr) return new Date().toISOString().split('T')[0];
    if(typeof rawStr === 'number') { return new Date(Math.round((rawStr - 25569)*86400*1000)).toISOString().split('T')[0]; }
    const str = String(rawStr).trim();
    const months = { "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "mei": "05", "jun": "06", "jul": "07", "aug": "08", "agu": "08", "sep": "09", "oct": "10", "okt": "10", "nov": "11", "dec": "12", "des": "12" };
    const parts = str.split(' ');
    if (parts.length === 3) return `${parts[2]}-${months[parts[1].toLowerCase().substring(0,3)] || "01"}-${parts[0].padStart(2, '0')}`;
    if (str.includes('/')) { const p = str.split('/'); if(p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; }
    return new Date().toISOString().split('T')[0];
  };

  // Parser Excel Baru: Dinamis membaca Pivot/Merge Header aslimu (Sudah Fix Tanpa Error)
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
        
        // 1. CARI BARIS "SHIFT 1" (Fokus utama ke Shift 1)
        let headerRowIdx = -1;
        let s1Idx = -1, s2Idx = -1;
        
        for (let i = 0; i < 20; i++) { 
            if (!rows[i]) continue;
            const rStr = rows[i].map(c => String(c).toLowerCase().trim());
            const tempS1 = rStr.findIndex(c => c.includes('shift 1'));
            
            // Jika menemukan kata "shift 1", catat barisnya lalu berhenti mencari
            if (tempS1 > -1) { 
                headerRowIdx = i; 
                s1Idx = tempS1;
                s2Idx = rStr.findIndex(c => c.includes('shift 2') || c.includes('shift 02'));
                break; 
            }
        }

        if (headerRowIdx === -1 || s1Idx === -1) {
           return alert("Gagal menemukan Header 'Shift 1'. Gunakan file Template yang tersedia.");
        }

        // 2. CARI NAMA PASAR 
        let marketRaw = "";
        for (let i = 0; i <= headerRowIdx; i++) {
           if(!rows[i]) continue;
           const rStr = rows[i].map(c => String(c).toLowerCase().trim());
           const locIdx = rStr.findIndex(c => c.includes('pasar') && !c.includes('nama lokasi'));
           if (locIdx > -1) { marketRaw = rows[i][locIdx]; break; }
        }
        
        if (!marketRaw) {
           for(let i = 0; i <= headerRowIdx; i++) {
               const nameLocIdx = rows[i]?.findIndex(c => String(c).toLowerCase().includes('nama lokasi'));
               if(nameLocIdx > -1 && rows[i+1]) { marketRaw = rows[i+1][nameLocIdx] || rows[i+1][nameLocIdx + 1]; break; }
           }
        }
        
        if (!marketRaw && rows[1] && rows[1][1]) {
           marketRaw = rows[1][1];
        }

        const marketName = standardizeMarketName(marketRaw);

        // 3. MAPPING KOLOM KOMPONEN KENDARAAN
        const subHeaderRow = rows[headerRowIdx + 1] || [];
        const shiftRow = rows[headerRowIdx]; 
        
        // MENCARI KOLOM TM
        let tmIdx = -1;
        for(let i=0; i<subHeaderRow.length; i++){
            const val = String(subHeaderRow[i] || '').toLowerCase().trim();
            if(val === 'tm' || val === 'tiket masalah') {
                tmIdx = i; break;
            }
        }
        
        const blocks = [];
        for(let i = 0; i < subHeaderRow.length; i++) {
            const val = String(subHeaderRow[i] || '').toLowerCase().trim();
            if(val.includes('motor') && !val.includes('man.')) {
                let sName = "Shift " + (blocks.length + 1);
                for(let k = i; k >= 0; k--) {
                    const cellVal = String(shiftRow[k] || '').trim();
                    if(cellVal !== '' && !cellVal.toLowerCase().includes('total') && !cellVal.toLowerCase().includes('pendapatan')) {
                        sName = cellVal; break;
                    }
                }
                
                let cols = { motor: i, manual_motor: -1, mobil: -1, box: -1, truck: -1, pkl: -1 };
                for(let j = i + 1; j < i + 10 && j < subHeaderRow.length; j++) {
                    const subVal = String(subHeaderRow[j] || '').toLowerCase().trim();
                    if(subVal.includes('motor') && !subVal.includes('man.')) break; 
                    if(subVal.includes('man. moto') || subVal.includes('manual motor')) cols.manual_motor = j;
                    else if(subVal.includes('mobil')) cols.mobil = j;
                    else if(subVal.includes('box')) cols.box = j;
                    else if(subVal.includes('truck') || subVal.includes('truk')) cols.truck = j;
                    else if(subVal.includes('pkl')) cols.pkl = j;
                }
                blocks.push({ shiftName: sName, cols });
            }
        }

        // DETEKSI OTOMATIS: File Income (Uang) atau Qty (Unit)?
        let isIncomeFile = false;
        if (blocks.length > 0 && rows[headerRowIdx + 2]) {
           const testValStr = String(rows[headerRowIdx + 2][blocks[0].cols.motor] || '0').replace(/[^0-9]/g, '');
           if (Number(testValStr) > 20000) isIncomeFile = true; 
        }

        // BACA DATA PER BARIS & EKSTRAK
        const payloads = [];
        for (let r = headerRowIdx + 2; r < rows.length; r++) {
            if(!rows[r]) continue;
            const dateRaw = rows[r][0]; 
            if (!dateRaw || String(dateRaw).toLowerCase().includes('total')) break; 
            
            const tanggal = parseIndonesianDate(dateRaw);
            const parseVal = (idx) => {
                if (idx === -1) return 0;
                const raw = String(rows[r][idx] || '0').trim();
                if (raw === '-' || raw === '') return 0;
                return Number(raw.replace(/[^0-9.-]+/g, "")) || 0;
            };

            // Baca Nominal TM (Ubah minus jadi positif agar gampang dipotong)
            let tmNominal = 0;
            if (tmIdx > -1 && isIncomeFile) {
                const rawTm = String(rows[r][tmIdx] || '0').trim();
                tmNominal = Math.abs(Number(rawTm.replace(/[^0-9.-]+/g, "")) || 0);
            }
            
            blocks.forEach((block, index) => {
                const m = parseVal(block.cols.motor);
                const mm = parseVal(block.cols.manual_motor);
                const mb = parseVal(block.cols.mobil);
                const bx = parseVal(block.cols.box);
                const t = parseVal(block.cols.truck);
                const p = parseVal(block.cols.pkl);
                const tot = m + mm + mb + bx + t + p;

                // Memasukkan data jika ada income/qty ATAU ada TM yang harus dilaporkan
                if (tot > 0 || (index === 0 && tmNominal > 0)) {
                    const isLangganan = block.shiftName.toLowerCase().includes('langganan');
                    
                    // TM hanya dipotong di Shift pertama agar kerugian tidak dihitung double
                    const appliedTm = (index === 0 && !isLangganan) ? tmNominal : 0;

                    let updates = {};
                    if (isIncomeFile) {
                        if (isLangganan) {
                            updates = { income_langganan: tot, total_income: tot };
                        } else {
                            updates = { 
                                inc_motor: m, inc_manual_motor: mm, inc_mobil: mb, inc_box: bx, inc_truck: t, inc_pkl: p, 
                                income_casual: tot, 
                                tm_nominal: appliedTm,
                                total_income: tot - appliedTm // PENGURANGAN TM EXCEL
                            };
                        }
                    } else {
                        if (isLangganan) updates = { qty_langganan: tot, qty_total: tot };
                        else updates = { qty_motor: m, qty_manual_motor: mm, qty_mobil: mb, qty_box: bx, qty_truck: t, qty_pkl: p, qty_total: tot };
                    }
                    payloads.push({ tanggal, nama_pasar: marketName, shift: isLangganan ? 'Langganan' : block.shiftName, isIncomeFile, isLangganan, updates });
                }
            });
        }

        if (payloads.length > 0) processPayload(payloads); 
        else alert("Data kosong / Format kolom Excel tidak cocok.");
        
      } catch (err) { alert("Gagal memproses Excel: " + err.message); } finally { e.target.value = null; }
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

           {canViewLog && (
             <button onClick={() => { setActiveTab('summary'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'summary' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'}`}>
               <FileImage size={18}/> Ringkasan Laporan
             </button>
           )}

           {canAccessSetting && (
             <button onClick={() => { setActiveTab('settings'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'settings' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800'}`}>
               <Settings size={18}/> Setting Dashboard
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
                <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight">
                    {activeTab === 'dashboard' ? 'Dashboard Parkir' : activeTab === 'input' ? 'Input Data Parkir' : activeTab === 'summary' ? 'Ringkasan Laporan Masalah' : 'Setting Dashboard'}
                </h2>
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
              {(canViewChartMonthly || canViewGlobal) && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                   {canViewChartMonthly && (
                     <div className="w-full md:w-auto">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter Bulan Sortir</label>
                       <div className="flex items-center gap-2">
                          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500" />
                          {filterMonth && (
                              <button onClick={() => setFilterMonth('')} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors" title="Tampilkan Semua">
                                <X size={16}/>
                              </button>
                          )}
                        </div>
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

              {/* TOGGLE METRIK & KARTU SUMMARY */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-2 mt-4">
                 <h3 className="font-black text-slate-800 text-lg">Ringkasan Data Dashboard</h3>
                 {canViewQty && (
                   <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner w-max">
                      <button onClick={() => setChartMetric('income')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${chartMetric === 'income' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Nominal Income</button>
                      <button onClick={() => setChartMetric('qty')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${chartMetric === 'qty' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Qty Kendaraan</button>
                   </div>
                 )}
              </div>

              {chartMetric === 'income' ? (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <div className="col-span-2 md:col-span-2 bg-gradient-to-br from-purple-900 to-indigo-900 p-5 rounded-3xl shadow-lg relative overflow-hidden text-white">
                      <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest block mb-1">Total Keseluruhan Income</span>
                      <h3 className="text-3xl font-black">{formatRupiah(summaryData.grandTotal)}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Motor</span>
                      <h3 className="text-lg font-black text-purple-600 truncate" title={formatRupiah(summaryData.incMotor + summaryData.incManualMotor)}>{formatRupiah(summaryData.incMotor + summaryData.incManualMotor).replace('Rp','')}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobil</span>
                      <h3 className="text-lg font-black text-purple-600 truncate" title={formatRupiah(summaryData.incMobil)}>{formatRupiah(summaryData.incMobil).replace('Rp','')}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Box & Truck</span>
                      <h3 className="text-lg font-black text-purple-600 truncate" title={formatRupiah(summaryData.incBox + summaryData.incTruck)}>{formatRupiah(summaryData.incBox + summaryData.incTruck).replace('Rp','')}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Langganan & PKL</span>
                      <h3 className="text-lg font-black text-purple-600 truncate" title={formatRupiah(summaryData.incLangganan + summaryData.incPkl)}>{formatRupiah(summaryData.incLangganan + summaryData.incPkl).replace('Rp','')}</h3>
                    </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <div className="col-span-2 md:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-3xl shadow-lg relative overflow-hidden text-white">
                      <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest block mb-1">Total Qty Kendaraan</span>
                      <h3 className="text-xl font-black text-slate-800">{new Intl.NumberFormat('id-ID').format(qtySummaryData.totalMotor + qtySummaryData.totalManualMotor)}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Motor</span>
                      <h3 className="text-xl font-black text-slate-800">{new Intl.NumberFormat('id-ID').format(qtySummaryData.totalMotor)}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobil</span>
                      <h3 className="text-xl font-black text-slate-800">{new Intl.NumberFormat('id-ID').format(qtySummaryData.totalMobil)}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Box / Truck</span>
                      <h3 className="text-xl font-black text-slate-800">{new Intl.NumberFormat('id-ID').format(qtySummaryData.totalBox + qtySummaryData.totalTruck)}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Langganan & PKL</span>
                      <h3 className="text-xl font-black text-slate-800">{new Intl.NumberFormat('id-ID').format(qtySummaryData.totalLangganan + qtySummaryData.totalPkl)}</h3>
                    </div>
                  </div>
              )}

              {/* AREA GRAFIK */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Grafik Harian */}
                {canViewChartDaily && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><TrendingUp size={16} className={chartMetric==='qty'?'text-emerald-500':'text-purple-500'}/> Grafik Trend 7 Hari Terakhir</h4>
                    <div className="flex items-end gap-3 h-48 border-b border-slate-100 pb-2">
                       {dailyChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto">Belum ada data.</p> : dailyChartData.map((d, i) => (
                         <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                           <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 font-bold">{formatGrafik(d.value)}</div>
                           <div style={{height: `${Math.max((d.value / maxDailyValue) * 100, 1)}%`}} className={`w-full max-w-[40px] rounded-t-md transition-all ${chartMetric==='qty'?'bg-emerald-400 group-hover:bg-emerald-500':'bg-purple-400 group-hover:bg-purple-500'}`}></div>
                           <span className="text-[9px] font-bold text-slate-500 mt-2">{d.label}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* 2. Grafik Shift */}
                {canViewChartShift && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><Clock size={16} className="text-amber-500"/> Sebaran Data Per Shift</h4>
                    <div className="flex items-end justify-around gap-4 h-48 border-b border-slate-100 pb-2 px-4">
                       {shiftChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto">Belum ada data.</p> : shiftChartData.map((d, i) => (
                         <div key={i} className="flex flex-col justify-end items-center group relative h-full w-20">
                           <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 font-bold">{formatGrafik(d.value)}</div>
                           <div style={{height: `${Math.max((d.value / maxShiftValue) * 100, 1)}%`}} className={`w-full rounded-t-md transition-all ${chartMetric==='qty'?'bg-emerald-400 group-hover:bg-emerald-500':'bg-amber-400 group-hover:bg-amber-500'}`}></div>
                           <span className="text-[10px] font-black text-slate-700 mt-2 uppercase">{d.label}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* 3. Grafik Semua Pasar */}
                {canViewChartMarket && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><Store size={16} className="text-blue-500"/> Laporan Total Seluruh Pasar</h4>
                    <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                       {marketChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto py-10">Belum ada data pasar.</p> : marketChartData.map((d, i) => (
                         <div key={i} className="flex items-center gap-3 w-full">
                           <span className="text-[10px] font-bold text-slate-600 w-32 truncate text-right shrink-0" title={d.label}>{d.label}</span>
                           <div className="flex-1 bg-slate-100 h-6 rounded-full overflow-hidden flex items-center group relative">
                             <div style={{width: `${Math.max((d.value / maxMarketValue) * 100, 0.5)}%`}} className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end px-2 ${chartMetric==='qty'?'bg-gradient-to-r from-emerald-400 to-emerald-600':'bg-gradient-to-r from-blue-400 to-blue-600'}`}>
                             </div>
                             <span className="absolute right-3 text-[10px] font-black text-slate-700">{formatGrafik(d.value)}</span>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* 4. Grafik Bulanan */}
                {canViewChartMonthly && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h4 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><Calendar size={16} className={chartMetric==='qty'?'text-emerald-500':'text-purple-500'}/> Grafik Data 12 Bulan Terakhir</h4>
                    <div className="flex items-end justify-between gap-2 h-64 border-b border-slate-100 pb-2 px-2 overflow-x-auto custom-scrollbar">
                       {monthlyChartData.length === 0 ? <p className="text-xs text-slate-400 m-auto">Belum ada data bulanan.</p> : monthlyChartData.map((d, i) => (
                         <div key={i} className="flex flex-col justify-end items-center group relative h-full flex-1 min-w-[50px]">
                           <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 font-bold">{formatGrafik(d.value)}</div>
                           <div style={{height: `${Math.max((d.value / maxMonthlyValue) * 100, 1)}%`}} className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 ${chartMetric==='qty'?'bg-emerald-400 group-hover:bg-emerald-500':'bg-purple-400 group-hover:bg-purple-500'}`}></div>
                           <span className="text-[9px] font-bold text-slate-500 mt-2 uppercase">{d.label}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

              </div>

              {/* DAFTAR REALTIME LOG */}
              {canViewLog && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-2"><ClipboardList size={16} className="text-blue-500"/> Log Laporan Realtime</h4>
                  </div>
                  <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3">Tanggal & Shift</th>
                          <th className="px-5 py-3">Pasar / Lokasi</th>
                          <th className="px-5 py-3">PIC Lapangan</th>
                          <th className="px-3 py-3 text-right">Motor</th>
                          <th className="px-3 py-3 text-right">Mobil</th>
                          <th className="px-3 py-3 text-right">Box</th>
                          <th className="px-3 py-3 text-right">Truck</th>
                          <th className="px-3 py-3 text-right">PKL</th>
                          <th className="px-3 py-3 text-right">Langganan</th>
                          <th className="px-5 py-3 text-right border-l border-slate-200 bg-purple-50/50">Total Bersih</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] font-medium divide-y divide-slate-100">
                        {visibleIncomes.length === 0 ? (
                          <tr><td colSpan={10} className="py-8 text-center text-xs font-bold text-slate-400">Belum ada data untuk filter ini.</td></tr>
                        ) : (
                          visibleIncomes.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                <span className="font-black text-slate-800 block whitespace-nowrap">{item.tanggal}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">{item.shift}</span>
                              </td>
                              <td className="px-5 py-3 font-bold text-slate-700 whitespace-nowrap">{item.nama_pasar}</td>
                              <td className="px-5 py-3 font-bold text-[10px] text-blue-600 uppercase">{item.initial_users?.name || user?.name || 'Sistem'}</td>
                              
                              <td className="px-3 py-2 text-right">
                                 <div className="text-slate-800">{formatRupiah(item.inc_motor).replace('Rp','')}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_motor || 0} Unit</div>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                 <div className="text-slate-800">{formatRupiah(item.inc_mobil).replace('Rp','')}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_mobil || 0} Unit</div>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                 <div className="text-slate-800">{formatRupiah(item.inc_box).replace('Rp','')}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_box || 0} Unit</div>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                 <div className="text-slate-800">{formatRupiah(item.inc_truck).replace('Rp','')}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_truck || 0} Unit</div>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                 <div className="text-slate-800">{formatRupiah(item.inc_pkl).replace('Rp','')}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_pkl || 0} Unit</div>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                 <div className="text-slate-800">{formatRupiah(item.income_langganan).replace('Rp','')}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_langganan || 0} Unit</div>}
                              </td>

                              <td className="px-5 py-2 text-right border-l border-slate-100 bg-purple-50/20">
                                 <div className="font-black text-purple-600 text-xs">{formatRupiah(item.total_income)}</div>
                                 {canViewQty && <div className="text-[10px] font-bold text-emerald-600">{item.qty_total || 0} Unit</div>}
                                 {Number(item.tm_nominal) > 0 && <div className="text-[9px] font-bold text-red-500 mt-1">Dikurangi TM</div>}
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
          )}


          {/* TAB 2: PELAPORAN (INPUT DATA) */}
          {activeTab === 'input' && canSubmit && (
            <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
              
              <div className="flex bg-slate-200 p-1.5 rounded-2xl w-max mx-auto shadow-inner overflow-x-auto">
                 <button onClick={() => setInputMode('manual')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${inputMode === 'manual' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Form Manual</button>
                 <button onClick={() => setInputMode('tabel')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${inputMode === 'tabel' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tabel Massal</button>
                 <button onClick={() => setInputMode('excel')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${inputMode === 'excel' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Upload Excel</button>
              </div>

              {/* MODE MANUAL (+ TIKET MASALAH) */}
              {inputMode === 'manual' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                   <h3 className="font-black text-lg text-slate-800 mb-6">Input Laporan Per Shift</h3>
                   <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tanggal Laporan</label>
                           <input type="date" required value={manualForm.tanggal} onChange={e => setManualForm({...manualForm, tanggal: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Pasar / Lokasi</label>
                           <select required value={manualForm.nama_pasar} onChange={e => setManualForm({...manualForm, nama_pasar: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500">
                             <option value="" disabled>-- Pilih Pasar --</option>
                             {marketList.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                         </div>
                         <div>
                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Shift Kerja (Ketik / Pilih)</label>
                             <input type="text" list="shift-options" required value={manualForm.shift} onChange={e => setManualForm({...manualForm, shift: e.target.value})} placeholder="Contoh: Shift 3, Shift Malam..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-purple-500"/>
                             <datalist id="shift-options">
                               <option value="Shift 1"/> <option value="Shift 2"/> <option value="Shift 3"/> <option value="Langganan"/>
                             </datalist>
                         </div>

                         <div className="md:col-span-2 h-px bg-slate-200 my-2"></div>
                         <div className="md:col-span-2"><span className="text-xs font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-lg">1. Nominal Income (Rupiah)</span></div>
                         
                         <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Motor (Rp)</label><input type="number" min="0" value={manualForm.inc_motor} onChange={e => setManualForm({...manualForm, inc_motor: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mobil (Rp)</label><input type="number" min="0" value={manualForm.inc_mobil} onChange={e => setManualForm({...manualForm, inc_mobil: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Box (Rp)</label><input type="number" min="0" value={manualForm.inc_box} onChange={e => setManualForm({...manualForm, inc_box: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Truck (Rp)</label><input type="number" min="0" value={manualForm.inc_truck} onChange={e => setManualForm({...manualForm, inc_truck: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">PKL (Rp)</label><input type="number" min="0" value={manualForm.inc_pkl} onChange={e => setManualForm({...manualForm, inc_pkl: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Langganan (Rp)</label><input type="number" min="0" value={manualForm.income_langganan} onChange={e => setManualForm({...manualForm, income_langganan: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold"/></div>
                         </div>

                         <div className="md:col-span-2 h-px bg-slate-200 my-2"></div>
                         <div className="md:col-span-2"><span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">2. Quantity (Unit Kendaraan)</span></div>
                         
                         <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mtr (Unit)</label><input type="number" min="0" value={manualForm.qty_motor} onChange={e => setManualForm({...manualForm, qty_motor: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-emerald-50/30"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mbl (Unit)</label><input type="number" min="0" value={manualForm.qty_mobil} onChange={e => setManualForm({...manualForm, qty_mobil: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-emerald-50/30"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Box (Unit)</label><input type="number" min="0" value={manualForm.qty_box} onChange={e => setManualForm({...manualForm, qty_box: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-emerald-50/30"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Trk (Unit)</label><input type="number" min="0" value={manualForm.qty_truck} onChange={e => setManualForm({...manualForm, qty_truck: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-emerald-50/30"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">PKL (Unit)</label><input type="number" min="0" value={manualForm.qty_pkl} onChange={e => setManualForm({...manualForm, qty_pkl: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-emerald-50/30"/></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Langganan (Unit)</label><input type="number" min="0" value={manualForm.qty_langganan} onChange={e => setManualForm({...manualForm, qty_langganan: e.target.value})} placeholder="0" className="w-full px-3 py-2 border rounded-xl text-sm font-bold bg-emerald-50/30"/></div>
                         </div>

                         {/* SEKSI TIKET MASALAH (TM) */}
                         <div className="md:col-span-2 h-px bg-slate-200 my-2"></div>
                         <div className="md:col-span-2 flex items-center justify-between">
                             <span className="text-xs font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-lg">3. Tiket Masalah (TM) / Kerugian (Opsional)</span>
                             <span className="text-[10px] font-bold text-slate-400">*Otomatis mengurangi Total Income</span>
                         </div>
                         
                         <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                               <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Jumlah Qty TM</label>
                               <input type="number" min="0" value={manualForm.tm_qty} onChange={e => setManualForm({...manualForm, tm_qty: e.target.value})} placeholder="0 Unit" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-red-500"/>
                            </div>
                            <div>
                               <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Nominal Kerugian TM (Rp)</label>
                               <input type="number" min="0" value={manualForm.tm_nominal} onChange={e => setManualForm({...manualForm, tm_nominal: e.target.value})} placeholder="0" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-red-500"/>
                            </div>
                            <div className="md:col-span-3">
                               <div className="md:col-span-3">
                               <div className="flex justify-between items-center mb-1.5">
                                  <label className="block text-[10px] font-black text-slate-500 uppercase">Lampirkan Bukti Foto (Bisa lebih dari 1)</label>
                                  <span className="text-[9px] font-bold text-slate-400">{manualForm.tm_photos?.length || 0} Foto Terpilih</span>
                               </div>
                               
                               <div className="flex gap-2 mb-2">
                                  {/* Tombol 1: Langsung Buka Kamera */}
                                  <label className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-black text-center transition-colors shadow-sm flex items-center justify-center gap-2">
                                     📷 Jepret Kamera
                                     <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                                        if (e.target.files.length > 0) {
                                           const newFiles = Array.from(e.target.files);
                                           setManualForm({...manualForm, tm_photos: [...manualForm.tm_photos, ...newFiles]});
                                        }
                                        e.target.value = null; 
                                     }} />
                                  </label>

                                  {/* Tombol 2: Buka Galeri / File Manager */}
                                  <label className="flex-1 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-black text-center transition-colors shadow-sm flex items-center justify-center gap-2">
                                     📁 Pilih Galeri
                                     <input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                                        if (e.target.files.length > 0) {
                                           const newFiles = Array.from(e.target.files);
                                           setManualForm({...manualForm, tm_photos: [...manualForm.tm_photos, ...newFiles]});
                                        }
                                        e.target.value = null; 
                                     }} />
                                  </label>
                               </div>
                               
                               {/* Preview Foto yang Akan Diupload */}
                               {manualForm.tm_photos?.length > 0 && (
                                  <div className="flex flex-wrap gap-3 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                     {manualForm.tm_photos.map((file, idx) => (
                                        <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden shadow-sm border border-slate-300">
                                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => {
                                               const filtered = manualForm.tm_photos.filter((_, i) => i !== idx);
                                               setManualForm({...manualForm, tm_photos: filtered});
                                            }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus Foto"><X size={10}/></button>
                                        </div>
                                     ))}
                                  </div>
                               )}
                            </div>
                               <input type="file" multiple accept="image/*" onChange={e => {
                                  // Menggabungkan foto yang sudah ada dengan foto yang baru dipilih
                                  const newFiles = Array.from(e.target.files);
                                  setManualForm({...manualForm, tm_photos: [...manualForm.tm_photos, ...newFiles]});
                                  e.target.value = null; // Reset input agar bisa pilih file yang sama lagi kalau mau
                               }} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 bg-white mb-2" />
                               
                               {/* Preview Foto yang Akan Diupload */}
                               {manualForm.tm_photos?.length > 0 && (
                                  <div className="flex flex-wrap gap-3 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                     {manualForm.tm_photos.map((file, idx) => (
                                        <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden shadow-sm border border-slate-300">
                                            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => {
                                               const filtered = manualForm.tm_photos.filter((_, i) => i !== idx);
                                               setManualForm({...manualForm, tm_photos: filtered});
                                            }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                                        </div>
                                     ))}
                                  </div>
                               )}
                            </div>
                         </div>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(147,51,234,0.3)] transition-all">
                        {isSubmitting ? 'Memproses Laporan & Upload Foto...' : 'Simpan Laporan & Kalkulasi'}
                      </button>
                   </form>
                </div>
              )}

              {/* MODE TABEL MASSAL DINAMIS */}
              {inputMode === 'tabel' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                   <h3 className="font-black text-lg text-slate-800 mb-2">Input Tabel Massal</h3>
                   <p className="text-xs text-slate-500 font-medium mb-6">Kotak Atas = Input Rp | Kotak Bawah = Input Qty (Unit)</p>
                   
                   <div className="overflow-x-auto w-full mb-4">
                     <table className="min-w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border-y border-slate-200">
                           <th className="p-3 w-8 text-center">No</th>
                           <th className="p-3 min-w-[130px]">Tanggal</th>
                           <th className="p-3 min-w-[140px]">Pasar</th>
                           <th className="p-3 w-28">Shift</th>
                           <th className="p-3 w-20 text-center">Motor</th>
                           <th className="p-3 w-20 text-center">Mobil</th>
                           <th className="p-3 w-20 text-center">Box</th>
                           <th className="p-3 w-20 text-center">Truck</th>
                           <th className="p-3 w-20 text-center">PKL</th>
                           <th className="p-3 w-20 text-center">Langganan</th>
                           <th className="p-3 w-10 text-center">Aksi</th>
                         </tr>
                       </thead>
                       <tbody>
                         {massInputRows.map((row, idx) => (
                           <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="p-2 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                             <td className="p-2"><input type="date" value={row.tanggal} onChange={(e) => {const n = [...massInputRows]; n[idx].tanggal = e.target.value; setMassInputRows(n);}} className="w-full px-2 py-1.5 border rounded focus:border-purple-500 outline-none text-[11px]" /></td>
                             <td className="p-2">
                               <select value={row.nama_pasar} onChange={(e) => {const n = [...massInputRows]; n[idx].nama_pasar = e.target.value; setMassInputRows(n);}} className="w-full px-2 py-1.5 border rounded focus:border-purple-500 outline-none text-[11px]">
                                  <option value="" disabled>Pilih Pasar...</option>
                                  {marketList.map(m => <option key={m} value={m}>{m}</option>)}
                               </select>
                             </td>
                             <td className="p-2">
                               <input type="text" list="shift-mass" placeholder="Shift..." value={row.shift} onChange={(e) => {const n = [...massInputRows]; n[idx].shift = e.target.value; setMassInputRows(n);}} className="w-full px-2 py-1.5 border rounded focus:border-purple-500 outline-none text-[11px]" />
                               <datalist id="shift-mass"><option value="Shift 1"/> <option value="Shift 2"/> <option value="Langganan"/></datalist>
                             </td>
                             
                             <td className="p-1">
                                <input type="number" placeholder="Rp" value={row.inc_motor} onChange={(e)=>{const n=[...massInputRows]; n[idx].inc_motor=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] mb-1 p-1.5 border rounded outline-none font-bold" />
                                <input type="number" placeholder="Qty" value={row.qty_motor} onChange={(e)=>{const n=[...massInputRows]; n[idx].qty_motor=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] p-1.5 border rounded bg-emerald-50 outline-none" />
                             </td>
                             <td className="p-1">
                                <input type="number" placeholder="Rp" value={row.inc_mobil} onChange={(e)=>{const n=[...massInputRows]; n[idx].inc_mobil=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] mb-1 p-1.5 border rounded outline-none font-bold" />
                                <input type="number" placeholder="Qty" value={row.qty_mobil} onChange={(e)=>{const n=[...massInputRows]; n[idx].qty_mobil=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] p-1.5 border rounded bg-emerald-50 outline-none" />
                             </td>
                             <td className="p-1">
                                <input type="number" placeholder="Rp" value={row.inc_box} onChange={(e)=>{const n=[...massInputRows]; n[idx].inc_box=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] mb-1 p-1.5 border rounded outline-none font-bold" />
                                <input type="number" placeholder="Qty" value={row.qty_box} onChange={(e)=>{const n=[...massInputRows]; n[idx].qty_box=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] p-1.5 border rounded bg-emerald-50 outline-none" />
                             </td>
                             <td className="p-1">
                                <input type="number" placeholder="Rp" value={row.inc_truck} onChange={(e)=>{const n=[...massInputRows]; n[idx].inc_truck=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] mb-1 p-1.5 border rounded outline-none font-bold" />
                                <input type="number" placeholder="Qty" value={row.qty_truck} onChange={(e)=>{const n=[...massInputRows]; n[idx].qty_truck=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] p-1.5 border rounded bg-emerald-50 outline-none" />
                             </td>
                             <td className="p-1">
                                <input type="number" placeholder="Rp" value={row.inc_pkl} onChange={(e)=>{const n=[...massInputRows]; n[idx].inc_pkl=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] mb-1 p-1.5 border rounded outline-none font-bold" />
                                <input type="number" placeholder="Qty" value={row.qty_pkl} onChange={(e)=>{const n=[...massInputRows]; n[idx].qty_pkl=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] p-1.5 border rounded bg-emerald-50 outline-none" />
                             </td>
                             <td className="p-1">
                                <input type="number" placeholder="Rp" value={row.income_langganan} onChange={(e)=>{const n=[...massInputRows]; n[idx].income_langganan=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] mb-1 p-1.5 border rounded outline-none font-bold" />
                                <input type="number" placeholder="Qty" value={row.qty_langganan} onChange={(e)=>{const n=[...massInputRows]; n[idx].qty_langganan=e.target.value; setMassInputRows(n);}} className="w-full text-[10px] p-1.5 border rounded bg-emerald-50 outline-none" />
                             </td>

                             <td className="p-2 text-center"><button onClick={() => {if(massInputRows.length > 1) setMassInputRows(massInputRows.filter((_, i) => i !== idx))}} className="text-red-500 hover:bg-red-100 p-1.5 rounded"><Trash2 size={14}/></button></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   
                   <button onClick={() => setMassInputRows([...massInputRows, { id: Date.now(), tanggal: new Date().toISOString().split('T')[0], nama_pasar: '', shift: 'Shift 1', inc_motor: '', inc_mobil: '', inc_box: '', inc_truck: '', inc_pkl: '', income_langganan: '', qty_motor: '', qty_mobil: '', qty_box: '', qty_truck: '', qty_pkl: '', qty_langganan: '' }])} className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-600 font-black text-xs rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 mb-4">
                      <Plus size={14}/> Tambah Baris Baru
                   </button>
                   
                   <button onClick={handleMassTableSubmit} disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                     <Save size={16}/> {isSubmitting ? 'Memproses Data...' : 'Simpan Semua Baris'}
                   </button>
                </div>
              )}

              {/* MODE UPLOAD EXCEL FILE (SMART PARSER) */}
              {inputMode === 'excel' && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                   <div className="flex justify-between items-center mb-6">
                       <div className="text-left">
                           <h3 className="font-black text-lg text-slate-800 mb-1">Upload File Excel (.xlsx)</h3>
                           <p className="text-xs text-slate-500 font-medium">Sistem mendeteksi otomatis format Income (Rp) dan Qty (Unit).</p>
                       </div>
                       <button onClick={() => {
                          const ws_data = [
                            ["Tanggal", "Nama Lokasi (Ketik Nama Pasar di bawah ini)"],
                            ["", "PASAR CIBUBUR"],
                            ["", "Shift 1", "", "", "", "", "", "Total", "Shift 2", "", "", "", "", "", "Total", "Langganan", "", "", "", "", "", "Total", "TM", "Income Gabungan"],
                            ["", "Motor", "Man. Moto", "Mobil", "Box", "Truck", "PKL", "Total", "Motor", "Man. Moto", "Mobil", "Box", "Truck", "PKL", "Total", "Motor", "Man. Moto", "Mobil", "Box", "Truck", "PKL", "Total", "TM", "Income Gabungan"]
                          ];
                          const ws = XLSX.utils.aoa_to_sheet(ws_data);
                          ws['!cols'] = [
                            {wch: 15}, {wch: 12}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}, 
                            {wch: 12}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}, 
                            {wch: 12}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}, 
                            {wch: 10}, {wch: 15}
                          ];

                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Template_Upload");
                          XLSX.writeFile(wb, "Template_Laporan_Parkir.xlsx");
                       }} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors border border-emerald-200">
                          <Download size={14}/> Download Template Format
                       </button>
                   </div>
                   
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

          {/* TAB 3: RINGKASAN LAPORAN MANUAL (+ FOTO TM) */}
          {activeTab === 'summary' && canViewLog && (
            <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                 <h3 className="font-black text-lg text-slate-800 mb-2 flex items-center gap-2"><FileImage className="text-purple-600" size={24}/> Ringkasan Laporan Masalah Lapangan</h3>
                 <p className="text-xs text-slate-500 mb-6 font-medium">Rekapitulasi lengkap khusus dari inputan Form Manual. Menampilkan detail kerugian Tiket Masalah (TM) dan lampiran bukti foto lapangan.</p>
                 
                 <div className="overflow-x-auto w-full">
                    <table className="min-w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-y border-slate-200">
                           <th className="p-4">Tanggal & Shift</th>
                           <th className="p-4">Lokasi & PIC</th>
                           <th className="p-4 text-right">Income Kotor</th>
                           <th className="p-4 text-center border-x border-slate-100 bg-red-50/50 text-red-500">Info TM (Kerugian)</th>
                           <th className="p-4 text-right">Net Income Bersih</th>
                           <th className="p-4 text-center">Bukti Foto</th>
                         </tr>
                       </thead>
                       <tbody className="text-xs font-medium divide-y divide-slate-100">
                         {visibleIncomes.filter(i => i.is_manual).length === 0 ? (
                           <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold">Belum ada data pelaporan manual yang memuat TM / Foto.</td></tr>
                         ) : (
                           visibleIncomes.filter(i => i.is_manual).map((item) => {
                              const kotor = Number(item.total_income || 0) + Number(item.tm_nominal || 0);
                              return (
                               <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-4">
                                     <span className="font-black text-slate-800 block">{item.tanggal}</span>
                                     <span className="text-[10px] text-slate-500 uppercase font-bold">{item.shift}</span>
                                 </td>
                                 <td className="p-4">
                                     <span className="font-bold text-slate-700 block">{item.nama_pasar}</span>
                                     <span className="text-[10px] text-blue-600 uppercase font-bold">{item.initial_users?.name || 'Sistem'}</span>
                                 </td>
                                 <td className="p-4 text-right text-slate-600">{formatRupiah(kotor)}</td>
                                 <td className="p-4 text-center border-x border-slate-100 bg-red-50/20">
                                     {Number(item.tm_qty) > 0 ? (
                                        <>
                                          <div className="font-black text-red-600 text-sm">-{formatRupiah(item.tm_nominal).replace('Rp','')}</div>
                                          <div className="text-[10px] text-red-500 font-bold">{item.tm_qty} Tiket Hilang</div>
                                        </>
                                     ) : <span className="text-slate-400">-</span>}
                                 </td>
                                 <td className="p-4 text-right font-black text-purple-600 text-sm">{formatRupiah(item.total_income)}</td>
                                 <td className="p-4">
                                     {item.tm_photo_urls && item.tm_photo_urls.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 justify-center">
                                           {item.tm_photo_urls.map((url, idx) => (
                                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded overflow-hidden shadow-sm border border-slate-200 block hover:scale-150 hover:shadow-lg transition-transform z-10 hover:z-50 relative origin-center">
                                                 <img src={url} alt="Lampiran" className="w-full h-full object-cover" />
                                              </a>
                                           ))}
                                        </div>
                                     ) : <span className="text-[10px] text-slate-400 block text-center">Tanpa lampiran</span>}
                                 </td>
                               </tr>
                              );
                           })
                         )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTING MARKUP ADMIN */}
          {activeTab === 'settings' && canAccessSetting && (
            <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                 <h3 className="font-black text-lg text-slate-800 mb-2 flex items-center gap-2"><Settings className="text-purple-600" size={24}/> Pengaturan Markup Income</h3>
                 <p className="text-xs text-slate-500 mb-6 font-medium">Tentukan target bulan dan persentase markup. Markup hanya berlaku bagi grafik yang dilihat oleh akun yang secara eksplisit dicentang <b className="text-purple-600">"Lihat Data Termarkup"</b> di Akses HRD. Data sesungguhnya di database tidak diubah.</p>
                 
                 <form onSubmit={handleSaveMarkup} className="space-y-4 max-w-lg bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Bulan Target</label>
                      <input type="month" required value={markupForm.month} onChange={e => setMarkupForm({...markupForm, month: e.target.value})} className="w-full px-4 py-3 border rounded-xl font-bold"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Persentase Pengurang (%)</label>
                      <input type="number" min="0" step="0.1" required value={markupForm.percentage} onChange={e => setMarkupForm({...markupForm, percentage: e.target.value})} placeholder="Contoh: 15" className="w-full px-4 py-3 border rounded-xl font-bold"/>
                    </div>
                    <button type="submit" disabled={isSavingMarkup} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-md transition-all flex justify-center gap-2">
                      {isSavingMarkup ? 'Menyimpan...' : 'Simpan Setelan Markup'}
                    </button>
                 </form>

                 <div className="mt-10">
                   <h4 className="font-black text-sm text-slate-800 mb-4 border-b border-slate-100 pb-2">Daftar Bulan Termarkup</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {Object.entries(markups).map(([month, percent]) => (
                        <div key={month} className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                           <div><p className="text-[10px] font-black text-slate-400 uppercase">Periode</p><p className="font-bold text-slate-800">{month}</p></div>
                           <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">Markup</p><p className="font-black text-red-500 text-lg">-{percent}%</p></div>
                           <button onClick={() => handleDeleteMarkup(month)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                     ))}
                   </div>
                 </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};

export default ParkingDashboard;