import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import { 
  ArrowLeft, Wallet, Receipt, CreditCard, LayoutDashboard, 
  Plus, CheckCircle2, X, RefreshCw, FileText, Menu, Settings, Save, Users,
  Upload, DownloadCloud, FileSpreadsheet, Trash2, Search, ShieldCheck, Check,
  BarChart3, MapPin, Building, Sparkles, TrendingUp, TrendingDown,
  Info, Activity, History, Printer, ChevronDown, ChevronRight, Edit
} from 'lucide-react';

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // States Data Database
  const [cashflows, setCashflows] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [userLocation, setUserLocation] = useState('Pusat (HO)');
  
  // Pengaturan Global Finance
  const [sysConfig, setSysConfig] = useState({
    finance_req_appv_cashflow: false, finance_req_appv_payroll: true, finance_req_appv_invoice: true
  });

  // States Filter Global
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // States Payroll Card View
  const [payrollFilterMonth, setPayrollFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activePayrollDivision, setActivePayrollDivision] = useState(null); 

  // States Report (Komparasi)
  const [reportViewMode, setReportViewMode] = useState('summary'); 
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  // States Pusat Approval & History Filter
  const [approvalSubTab, setApprovalSubTab] = useState('pending'); // 'pending' | 'history'
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyName, setHistoryName] = useState('');
  const [historyLocation, setHistoryLocation] = useState('');

  // States Modal Manual & View
  const [showCashflowModal, setShowCashflowModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Generate & Draft Payroll
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployees, setSelectedEmployees] = useState([]); // Untuk checkbox multiple input
  const [targetJamKerja, setTargetJamKerja] = useState(176); // Asumsi 22 hari x 8 jam
  const [potonganTerlambat, setPotonganTerlambat] = useState(25000); // Default potongan Rp 25.000 / jam
  const [upahHarian, setUpahHarian] = useState(150000); // Untuk pekerja site
  const [editingDraftId, setEditingDraftId] = useState(null); // Mode edit DRAFT
  const [genModalSiteFilter, setGenModalSiteFilter] = useState('');
  const [genModalSearch, setGenModalSearch] = useState('');
  const [shiftMasuk, setShiftMasuk] = useState('08:00');
  const [shiftKeluar, setShiftKeluar] = useState('17:00');
  const [toleransiMenit, setToleransiMenit] = useState(15);

  

  // States Modal Import Massal
  const [showImportCashflow, setShowImportCashflow] = useState(false);
  const [showImportPayroll, setShowImportPayroll] = useState(false);

  const [cashflowItems, setCashflowItems] = useState([
    { id: Date.now(), transaction_type: 'EXPENSE', category: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0] }
  ]);
  const [payrollForm, setPayrollForm] = useState({ user_id: '', period_month: new Date().toISOString().slice(0, 7), base_salary: '' });
  const [customComponents, setCustomComponents] = useState([]);
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ 
    invoice_number: '', client_name: '', site_location: '', total_amount: '', 
    issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' 
  });
  
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));
    if (!session) { navigate('/login'); return; }
    if (!session.can_access_finance && session.role !== 'admin' && session.role !== 'direksi') {
      alert('Anda tidak memiliki akses ke Modul Finance');
      navigate('/'); return;
    }
    setUser(session);
    fetchData(session);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) setSysConfig(data);
    } catch (error) { console.error("Gagal load settings", error); }
  };

  const fetchData = async (currentUser = user) => {
    setLoading(true);
    try {
      const [cashflowRes, payrollRes, invoiceRes, userRes, candidateRes] = await Promise.all([
        supabase.from('finance_cashflow').select('*, initial_users!finance_cashflow_created_by_fkey(name)').order('transaction_date', { ascending: false }),
        supabase.from('finance_payroll').select('*, initial_users!finance_payroll_user_id_fkey(name, nik, division, position)').order('created_at', { ascending: false }),
        supabase.from('finance_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('initial_users').select('id, name, nik, role, division, position, base_salary').in('role', ['staff', 'manager', 'direksi']),
        supabase.from('candidates').select('nik_karyawan, lokasi_penempatan, status_pernikahan') 
      ]);

      const locMap = {};
      const ptkpMap = {}; // <-- Tambahkan wadah baru ini
      
      if (candidateRes.data) {
        candidateRes.data.forEach(c => {
          if (c.nik_karyawan) {
             locMap[c.nik_karyawan] = c.lokasi_penempatan;
             ptkpMap[c.nik_karyawan] = c.status_pernikahan || 'TK/0'; // <-- Simpan status PTKP
          }
        });
      }

      if (currentUser?.nik) {
         setUserLocation(locMap[currentUser.nik] || currentUser.division || 'Pusat (HO)');
      }

      const enrichedEmployees = (userRes.data || []).map(u => ({
         ...u, 
         site_location: locMap[u.nik] || u.division || 'Pusat (HO)',
         status_pernikahan: ptkpMap[u.nik] || 'TK/0' // <-- Masukkan ke data karyawan
      }));

      const enrichedPayrolls = (payrollRes.data || []).map(p => ({
         ...p, site_location: locMap[p.initial_users?.nik] || p.initial_users?.division || 'Pusat (HO)'
      }));

      if (cashflowRes.data) setCashflows(cashflowRes.data);
      if (enrichedPayrolls) setPayrolls(enrichedPayrolls);
      if (invoiceRes.data) setInvoices(invoiceRes.data);
      if (enrichedEmployees) setEmployees(enrichedEmployees);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleNav = (tab) => { 
    setActiveTab(tab); 
    setSearchQuery(''); setFilterMonth(''); setFilterType(''); setActivePayrollDivision(null);
    setHistoryMonth(''); setHistoryName(''); setHistoryLocation(''); setApprovalSubTab('pending');
    if (window.innerWidth < 768) setIsSidebarOpen(false); 
  };
  
  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  const isAdminOrDireksi = user?.role === 'admin' || user?.role === 'direksi';
  const hasApprovalRight = user?.can_approve_finance || isAdminOrDireksi;

  const uniqueDivisions = [...new Set(employees.map(e => e.site_location).filter(Boolean))].sort();

  // ==========================================
  // LOGIKA ISOLASI HAK AKSES (VISIBILITY)
  // ==========================================
  const accessibleCashflows = useMemo(() => {
    return cashflows.filter(c => {
      if (isAdminOrDireksi) return true;
      return (c.site_location || 'Pusat (HO)') === userLocation;
    });
  }, [cashflows, isAdminOrDireksi, userLocation]);

  const accessibleInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (isAdminOrDireksi) return true;
      return (i.site_location || 'Pusat (HO)') === userLocation;
    });
  }, [invoices, isAdminOrDireksi, userLocation]);

  const accessiblePayrolls = useMemo(() => {
    return payrolls.filter(p => {
      if (isAdminOrDireksi) return true;
      return (p.site_location || 'Pusat (HO)') === userLocation;
    });
  }, [payrolls, isAdminOrDireksi, userLocation]);

  // ==========================================
  // PERHITUNGAN DASHBOARD & AI SUMMARY
  // ==========================================
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);

  const paidCashflows = accessibleCashflows.filter(c => c.status === 'PAID' || !c.status);
  const paidPayrolls = payrolls.filter(p => p.status === 'PAID' || !p.status);
  
  const totalIncomeAllTime = paidCashflows.filter(c => c.transaction_type === 'INCOME').reduce((s, c) => s + Number(c.amount), 0);
  const totalExpenseAllTime = paidCashflows.filter(c => c.transaction_type === 'EXPENSE').reduce((s, c) => s + Number(c.amount), 0);
  const currentBalance = totalIncomeAllTime - totalExpenseAllTime;
  
  const thisMonthIncome = paidCashflows.filter(c => c.transaction_type === 'INCOME' && c.transaction_date.startsWith(currentMonthStr)).reduce((s, c) => s + Number(c.amount), 0);
  const thisMonthExpense = paidCashflows.filter(c => c.transaction_type === 'EXPENSE' && c.transaction_date.startsWith(currentMonthStr)).reduce((s, c) => s + Number(c.amount), 0);
  
  const prevMonthIncome = paidCashflows.filter(c => c.transaction_type === 'INCOME' && c.transaction_date.startsWith(prevMonthStr)).reduce((s, c) => s + Number(c.amount), 0);
  const prevMonthExpense = paidCashflows.filter(c => c.transaction_type === 'EXPENSE' && c.transaction_date.startsWith(prevMonthStr)).reduce((s, c) => s + Number(c.amount), 0);

  const incomeGrowth = prevMonthIncome === 0 ? 100 : Math.round(((thisMonthIncome - prevMonthIncome) / prevMonthIncome) * 100);

  const topPayrollSite = useMemo(() => {
    const expensesBySite = paidPayrolls.filter(p => p.period_month === currentMonthStr).reduce((acc, p) => {
       acc[p.site_location] = (acc[p.site_location] || 0) + Number(p.net_salary);
       return acc;
    }, {});
    const sorted = Object.entries(expensesBySite).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0] : ['Belum Ada', 0];
  }, [paidPayrolls, currentMonthStr]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);
      const mName = d.toLocaleDateString('id-ID', { month: 'short' });
      
      const inc = paidCashflows.filter(c => c.transaction_type === 'INCOME' && c.transaction_date.startsWith(mStr)).reduce((s, c) => s + Number(c.amount), 0);
      const exp = paidCashflows.filter(c => c.transaction_type === 'EXPENSE' && c.transaction_date.startsWith(mStr)).reduce((s, c) => s + Number(c.amount), 0);
      data.push({ label: mName, fullDate: mStr, income: inc, expense: exp });
    }
    return data;
  }, [paidCashflows]);

  const maxChartValue = Math.max(...chartData.flatMap(d => [d.income, d.expense, 1000000])); 
  
  const avgIncome = chartData.reduce((sum, d) => sum + d.income, 0) / (chartData.length || 1);
  const avgExpense = chartData.reduce((sum, d) => sum + d.expense, 0) / (chartData.length || 1);
  const maxIncomeData = chartData.reduce((max, d) => d.income > max.income ? d : max, chartData[0] || {income:0, label:'-'});
  const maxExpenseData = chartData.reduce((max, d) => d.expense > max.expense ? d : max, chartData[0] || {expense:0, label:'-'});

  // ==========================================
  // LOGIKA REPORT (Realisasi vs Invoice)
  // ==========================================
  const reportData = useMemo(() => {
    const periods = [...new Set([
      ...paidPayrolls.map(p => p.period_month),
      ...paidCashflows.map(c => c.transaction_date.slice(0, 7)),
      ...accessibleInvoices.map(i => i.issue_date?.slice(0, 7)) // <-- UBAH KE accessibleInvoices
    ].filter(Boolean))].sort((a, b) => b.localeCompare(a));

    const summaryData = periods.map(period => {
      const pPayrolls = paidPayrolls.filter(p => p.period_month === period);
      const pCashflows = paidCashflows.filter(c => c.transaction_date.startsWith(period) && c.transaction_type === 'EXPENSE');
      const pInvoices = accessibleInvoices.filter(i => i.issue_date?.startsWith(period)); // <-- UBAH KE accessibleInvoices

      const mp = pPayrolls.length; 
      const manpowerCost = pPayrolls.reduce((sum, p) => sum + Number(p.base_salary) + (p.custom_details || []).filter(c=>c.type==='earning').reduce((s,c)=>s+Number(c.amount),0), 0);
      const operationCost = pCashflows.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalRealisasi = manpowerCost + operationCost;

      const totalInvoice = pInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
      const totalPendapatan = totalInvoice - totalRealisasi; 

      return { period, mp, totalInvoice, totalRealisasi, totalPendapatan, manpowerCost, operationCost };
    });

    const activeMonthInvoices = accessibleInvoices.filter(i => i.issue_date?.startsWith(reportMonth)); // <-- UBAH KE accessibleInvoices
    const projectNames = [...new Set([
      ...activeMonthInvoices.map(i => i.client_name),
      ...paidPayrolls.filter(p => p.period_month === reportMonth).map(p => p.site_location),
      ...paidCashflows.filter(c => c.transaction_date.startsWith(reportMonth)).map(c => c.site_location)
    ].filter(Boolean))];

    const monthlyData = projectNames.map(project => {
      const projInvoices = activeMonthInvoices.filter(i => i.client_name === project);
      const projCashflows = paidCashflows.filter(c => c.transaction_date.startsWith(reportMonth) && c.transaction_type === 'EXPENSE' && (c.site_location === project || c.category.includes(project)));
      const projPayrolls = paidPayrolls.filter(p => p.period_month === reportMonth && p.site_location === project);

      const mp = projPayrolls.length;
      const totalInvoice = projInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
      const manpowerCost = projPayrolls.reduce((sum, p) => sum + Number(p.base_salary) + (p.custom_details || []).filter(c=>c.type==='earning').reduce((s,c)=>s+Number(c.amount),0), 0);
      const operationCost = projCashflows.reduce((sum, c) => sum + Number(c.amount), 0);
      const managementFee = totalInvoice - (manpowerCost + operationCost);

      return { project, mp, totalInvoice, manpowerCost, operationCost, managementFee };
    });

    return { summaryData, monthlyData };
  }, [paidPayrolls, paidCashflows, accessibleInvoices, reportMonth]);

  // ==========================================
  // LOGIKA PENCARIAN & FILTERING
  // ==========================================
  const filteredCashflowsResult = accessibleCashflows.filter(c => {
    const matchMonth = !filterMonth || c.transaction_date.startsWith(filterMonth);
    const matchType = !filterType || c.transaction_type === filterType;
    const matchSearch = !searchQuery || c.category.toLowerCase().includes(searchQuery.toLowerCase()) || (c.site_location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchMonth && matchType && matchSearch;
  });

  const payrollsForSelectedMonth = payrolls.filter(p => {
    const matchMonth = p.period_month === payrollFilterMonth;
    const matchSearch = !searchQuery || p.initial_users?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.initial_users?.nik?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMonth && matchSearch;
  });

  const payrollsByDivision = useMemo(() => {
    return payrollsForSelectedMonth.reduce((acc, slip) => {
      const loc = slip.site_location || 'Pusat (HO)';
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(slip);
      return acc;
    }, {});
  }, [payrollsForSelectedMonth]);

  const filteredInvoices = accessibleInvoices.filter(i => {
    const matchMonth = !filterMonth || i.issue_date?.startsWith(filterMonth);
    const matchStatus = !invoiceFilterStatus || i.status === invoiceFilterStatus;
    const matchSearch = !searchQuery || i.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMonth && matchStatus && matchSearch;
  });

  // Badge Status Invoice
  const InvoiceStatusBadge = ({ status }) => {
    switch(status) {
      case 'DRAFT': return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">Draft</span>;
      case 'WAITING_APPROVAL': return <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[9px] font-black uppercase animate-pulse">Menunggu</span>;
      case 'SENT': return <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase">Terkirim</span>;
      case 'PAID': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase">Lunas</span>;
      case 'OVERDUE': return <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase">Jatuh Tempo</span>;
      default: return null;
    }
  };

  const openInvoiceModal = () => {
    setInvoiceForm({
      ...invoiceForm,
      invoice_number: `INV/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}/${Math.floor(1000 + Math.random() * 9000)}`
    });
    setShowInvoiceModal(true);
  };

  // Data Riwayat Approval
  const historyCashflows = accessibleCashflows.filter(c => c.status === 'PAID' || c.status === 'REJECTED').filter(c => {
    if (historyMonth && !c.transaction_date.startsWith(historyMonth)) return false;
    if (historyName && !(c.initial_users?.name?.toLowerCase().includes(historyName.toLowerCase()) || c.category.toLowerCase().includes(historyName.toLowerCase()))) return false;
    if (historyLocation && c.site_location !== historyLocation) return false;
    return true;
  });

  const historyPayrolls = payrolls.filter(p => p.status === 'PAID' || p.status === 'REJECTED').filter(p => {
    if (historyMonth && p.period_month !== historyMonth) return false;
    if (historyName && !p.initial_users?.name?.toLowerCase().includes(historyName.toLowerCase())) return false;
    if (historyLocation && p.site_location !== historyLocation) return false;
    return true;
  });

  const historyInvoices = invoices.filter(i => i.status !== 'DRAFT' && i.status !== 'WAITING_APPROVAL').filter(i => {
    if (historyMonth && !i.issue_date?.startsWith(historyMonth)) return false;
    if (historyName && !i.client_name.toLowerCase().includes(historyName.toLowerCase())) return false;
    if (historyLocation && i.site_location !== historyLocation) return false;
    return true;
  });

  // ==========================================
  // LOGIKA ARUS KAS (MULTIPLE / BATCH INPUT)
  // ==========================================
  const addCashflowItem = () => {
    setCashflowItems([...cashflowItems, { id: Date.now() + Math.random(), transaction_type: 'EXPENSE', category: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0] }]);
  };

  const updateCashflowItem = (id, field, value) => {
    setCashflowItems(cashflowItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeCashflowItem = (id) => {
    if (cashflowItems.length > 1) {
      setCashflowItems(cashflowItems.filter(item => item.id !== id));
    }
  };

  const handleSaveCashflow = async (e) => {
    e.preventDefault();
    const hasEmptyFields = cashflowItems.some(item => !item.category || !item.amount);
    if (hasEmptyFields) return alert("Mohon lengkapi semua kolom yang wajib diisi!");

    setIsSubmitting(true);
    try {
      const isAutoApproved = !sysConfig.finance_req_appv_cashflow; 
      
      const payloads = cashflowItems.map(item => ({
        transaction_date: item.transaction_date,
        transaction_type: item.transaction_type,
        category: item.category,
        amount: Number(item.amount),
        description: item.description,
        site_location: userLocation, 
        created_by: user.id,
        status: isAutoApproved ? 'PAID' : 'WAITING_APPROVAL',
        approved_by: isAutoApproved ? user.id : null
      }));
      
      const { error } = await supabase.from('finance_cashflow').insert(payloads);
      if (error) throw error;
      
      alert(isAutoApproved ? 'Transaksi Lunas berhasil disimpan!' : 'Semua Transaksi dikirim ke Pusat Approval!');
      setShowCashflowModal(false); 
      setCashflowItems([{ id: Date.now(), transaction_type: 'EXPENSE', category: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0] }]);
      fetchData();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); } finally { setIsSubmitting(false); }
  };

  // STATE & LOGIKA GROUPING ARUS KAS (DROPDOWN PAYROLL)
  const [expandedCashflowGroups, setExpandedCashflowGroups] = useState({});
  const toggleCashflowGroup = (groupId) => setExpandedCashflowGroups(prev => ({...prev, [groupId]: !prev[groupId]}));

  const groupedCashflowsResult = useMemo(() => {
    const result = [];
    const map = {};
    
    // Asumsi: filteredCashflowsResult sudah ada di kodinganmu
    filteredCashflowsResult.forEach(item => {
      // Jika kategori diawali "Payroll Area:", kita jadikan 1 grup (1 baris dropdown)
      if (item.category && item.category.startsWith('Payroll Area:')) {
        const groupKey = `${item.category}_${item.transaction_date}_${item.status}`;
        if (!map[groupKey]) {
          map[groupKey] = {
            id: groupKey, 
            isGroup: true, 
            transaction_date: item.transaction_date,
            category: item.category, 
            site_location: item.site_location,
            transaction_type: item.transaction_type, 
            status: item.status,
            amount: 0, 
            items: []
          };
          result.push(map[groupKey]);
        }
        map[groupKey].amount += Number(item.amount);
        map[groupKey].items.push(item);
      } else {
        // Transaksi kas biasa (bukan payroll), langsung push
        result.push(item);
      }
    });
    return result;
  }, [filteredCashflowsResult]);

  // ==========================================
  // LOGIKA PAYROLL MANUAL & APPROVAL
  // ==========================================
  const addComponent = (type) => setCustomComponents([...customComponents, { id: Date.now(), name: '', type, amount: '' }]);
  const removeComponent = (id) => setCustomComponents(customComponents.filter(c => c.id !== id));
  const updateComponent = (id, field, value) => setCustomComponents(customComponents.map(c => c.id === id ? { ...c, [field]: value } : c));

  const calculateNetSalary = () => {
    const base = Number(payrollForm.base_salary) || 0;
    const extras = customComponents.reduce((acc, curr) => acc + (curr.type === 'earning' ? Number(curr.amount) : -Number(curr.amount)), 0);
    return base + extras;
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const net = calculateNetSalary();
      const payload = {
        user_id: payrollForm.user_id, 
        period_month: payrollForm.period_month, 
        base_salary: Number(payrollForm.base_salary),
        custom_details: customComponents, 
        net_salary: net
        // Status tidak diatur di sini karena berbeda antara Edit dan Baru
      };
      
      if (editingDraftId) {
        // MODE EDIT: Update draf yang nilainya masih Rp 0
        await supabase.from('finance_payroll').update(payload).eq('id', editingDraftId);
        alert('Perhitungan Draft Slip Gaji berhasil diperbarui!');
      } else {
        // MODE MANUAL: Langsung buat draft baru
        payload.status = 'DRAFT';
        payload.created_by = user.id;
        await supabase.from('finance_payroll').insert([payload]);
        alert('Slip Gaji manual baru berhasil ditambahkan sebagai Draft!');
      }

      setShowPayrollModal(false); 
      setEditingDraftId(null);
      setPayrollForm({ user_id: '', period_month: new Date().toISOString().slice(0, 7), base_salary: '' }); 
      setCustomComponents([]);
      fetchData();
    } catch (err) { alert('Gagal memproses: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isAutoApproved = !sysConfig.finance_req_appv_invoice;
      const payload = {
        invoice_number: invoiceForm.invoice_number, client_name: invoiceForm.client_name, site_location: invoiceForm.site_location,
        total_amount: Number(invoiceForm.total_amount), issue_date: invoiceForm.issue_date, due_date: invoiceForm.due_date, notes: invoiceForm.notes,
        created_by: user.id, status: isAutoApproved ? 'SENT' : 'WAITING_APPROVAL', approved_by: isAutoApproved ? user.id : null
      };
      const { error } = await supabase.from('finance_invoices').insert([payload]);
      if (error) throw error;
      alert(isAutoApproved ? 'Invoice berhasil diterbitkan!' : 'Invoice dikirim ke Pusat Approval!');
      setShowInvoiceModal(false); 
      setInvoiceForm({ invoice_number: '', client_name: '', site_location: '', total_amount: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' });
      fetchData();
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  // Update Status Invoice (Misal dari Terkirim -> Lunas)
  const handleUpdateInvoiceStatus = async (id, status) => {
    if (!window.confirm(`Ubah status invoice ini menjadi ${status}?`)) return;
    try {
       const { error } = await supabase.from('finance_invoices').update({ status }).eq('id', id);
       if (error) throw error;
       fetchData();
    } catch(err) { alert("Gagal mengubah status: " + err.message); }
  };

  const processApproval = async (table, id, isApprove) => {
    if (!window.confirm(isApprove ? "Setujui data ini?" : "Tolak dan hapus data ini?")) return;
    try {
      if (!isApprove) {
        await supabase.from(table).delete().eq('id', id);
        alert('Data ditolak dan dihapus!');
      } else {
        const updatedStatus = table === 'finance_invoices' ? 'SENT' : 'PAID';
        await supabase.from(table).update({ status: updatedStatus, approved_by: user.id }).eq('id', id);

        // FITUR BARU: Auto-Insert ke Cashflow jika Payroll disetujui
        if (table === 'finance_payroll') {
           const { data: approvedPayroll } = await supabase.from('finance_payroll')
              .select('*, initial_users(name, nik)')
              .eq('id', id)
              .single();
              
           if (approvedPayroll) {
              await supabase.from('finance_cashflow').insert([{
                 transaction_date: new Date().toISOString().split('T')[0],
                 transaction_type: 'EXPENSE',
                 category: `Payroll Area: ${approvedPayroll.site_location || 'Pusat (HO)'} (${approvedPayroll.period_month})`, // <-- INI YANG BERUBAH
                 amount: approvedPayroll.net_salary,
                 description: `Gaji: ${approvedPayroll.initial_users?.name || 'Karyawan'} - ${approvedPayroll.initial_users?.nik || ''}`, // <-- INI YANG BERUBAH
                 site_location: approvedPayroll.site_location || 'Pusat (HO)',
                 status: 'PAID',
                 created_by: user.id,
                 approved_by: user.id
              }]);
           }
        }

        alert('Data berhasil disetujui!');
      }
      fetchData();
    } catch(err) { alert("Gagal memproses: " + err.message); }
  };

  const handleSaveSettings = async () => {
    try {
      await supabase.from('settings').update({
        finance_req_appv_cashflow: sysConfig.finance_req_appv_cashflow,
        finance_req_appv_payroll: sysConfig.finance_req_appv_payroll,
        finance_req_appv_invoice: sysConfig.finance_req_appv_invoice
      }).eq('id', 1);
      alert('Pengaturan Approval Finance berhasil disimpan!');
    } catch (error) { alert('Gagal menyimpan pengaturan.'); }
  };

  // ==========================================
  // LOGIKA BULK IMPORT PAYROLL MASSAL (EXCEL)
  // ==========================================
  const downloadTemplate = (type) => {
    let templateData = [];
    let name = '';
    if (type === 'cashflow') {
      templateData = [{ "Tanggal (YYYY-MM-DD)": "2026-06-25", "Tipe (INCOME/EXPENSE)": "INCOME", "Kategori Transaksi": "Pembayaran Klien A", "Nominal (Rp)": 15000000, "Keterangan": "Lunas" }];
      name = 'Template_Import_Cashflow.xlsx';
    } else {
      templateData = [{ "NIK Karyawan": "2026101", "Periode (YYYY-MM)": "2026-06", "Gaji Pokok": 3500000, "(+) Tunjangan Jabatan": 500000, "(+) Uang Makan": 300000, "(-) BPJS Kesehatan": 150000, "(-) Kasbon": 100000 }];
      name = 'Template_Import_Payroll.xlsx';
    }
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, name);
  };

  // Helper: Parser Waktu Excel TAHAN BANTING (Support DD/MM/YYYY dan YYYY-MM-DD)
  const parseExcelDateTime = (rawVal) => {
    if (!rawVal) return null;
    const strVal = String(rawVal).trim().toLowerCase();
    if (strVal.includes('belum')) return null;

    try {
       // Jika formatnya DD/MM/YYYY HH:mm
       if (strVal.includes('/')) {
          const [datePart, timePart] = strVal.split(' ');
          const [dd, mm, yyyy] = datePart.split('/');
          const [hh, min] = (timePart || '00:00').split(':');
          return new Date(yyyy, mm - 1, dd, hh, min);
       } 
       // Jika formatnya YYYY-MM-DD HH:mm:ss
       else if (strVal.includes('-')) {
          return new Date(String(rawVal).replace(' ', 'T'));
       }
    } catch(e) { return null; }
    return null;
  };

  // Helper: Mesin Hitung PPh 21 TER 2024
  const calculatePPh21TER = (bruto, ptkpStatus) => {
    let category = 'A';
    if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(ptkpStatus)) category = 'B';
    if (['K/3'].includes(ptkpStatus)) category = 'C';
    let rate = 0;
    if (category === 'A') {
       if (bruto <= 5400000) rate = 0; 
       else if (bruto <= 5650000) rate = 0.0025; 
       else if (bruto <= 5950000) rate = 0.005;  
       else if (bruto <= 6300000) rate = 0.0075; 
       else if (bruto <= 6750000) rate = 0.01;   
       else if (bruto <= 7500000) rate = 0.0125; 
       else rate = 0.015; 
    } else if (category === 'B') {
       if (bruto <= 6200000) rate = 0;
       else if (bruto <= 6500000) rate = 0.0025;
       else if (bruto <= 6850000) rate = 0.005;
       else rate = 0.0075;
    } else {
       if (bruto <= 6600000) rate = 0;
       else if (bruto <= 6950000) rate = 0.0025;
       else rate = 0.005;
    }
    return Math.round(bruto * rate);
  };

  const handleGenerateOtomatis = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true); setIsSubmitting(true);
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        // KUNCI PERBAIKAN: { raw: false } memaksa sistem membaca format teks persis seperti di Excel
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
        
        // Setup Standar Shift dalam wujud menit
        const [stdStartH, stdStartM] = shiftMasuk.split(':').map(Number);
        const standardTimeInMinutes = (stdStartH * 60) + stdStartM;
        
        // 1. Kalkulasi Absensi Harian (Cek Jam Masuk & Keluar)
        const attendanceSummary = {};
        data.forEach(row => {
          // Cari kolom NIK dan jadikan HURUF BESAR semua agar tidak ada miss-match
          const rawNik = row['NIK / Username'] || row['NIK'] || row['NIK Karyawan']; 
          if (!rawNik) return;
          
          const nik = String(rawNik).trim().toUpperCase(); 
          
          if (!attendanceSummary[nik]) {
            attendanceSummary[nik] = { totalDays: 0, totalHours: 0, totalLateDays: 0, lateMinutesTotal: 0, name: row['Nama Lengkap'] };
          }
          
          const tMasuk = parseExcelDateTime(row['Jam Masuk']);
          const tKeluar = parseExcelDateTime(row['Jam Keluar']);

          // Cek jika absen masuk dan keluar valid
          if (tMasuk && tKeluar && tKeluar > tMasuk) {
            attendanceSummary[nik].totalDays += 1;
            
            // A. Hitung Total Jam Kerja
            const diffHours = (tKeluar - tMasuk) / (1000 * 60 * 60);
            attendanceSummary[nik].totalHours += diffHours;

            // B. Evaluasi Keterlambatan
            const actualH = tMasuk.getHours();
            const actualM = tMasuk.getMinutes();
            const actualTimeInMinutes = (actualH * 60) + actualM;
            
            const lateMinutes = actualTimeInMinutes - standardTimeInMinutes;
            
            // Jika lewat dari waktu masuk + toleransi
            if (lateMinutes > toleransiMenit) {
               attendanceSummary[nik].totalLateDays += 1;
               attendanceSummary[nik].lateMinutesTotal += lateMinutes;
            }
          }
        });

        // 2. Ambil Karyawan yang cocok (Pastikan Huruf Besar Semua saat disamakan)
        const validNiks = Object.keys(attendanceSummary);
        const targetEmployees = employees.filter(emp => {
           if (!emp.nik) return false;
           const dbNik = String(emp.nik).trim().toUpperCase();
           return validNiks.includes(dbNik);
        });
        
        if (targetEmployees.length > 0) {
          await supabase.from('finance_payroll').delete().eq('period_month', selectedPeriod).in('user_id', targetEmployees.map(e => e.id));
        }

        // 3. Proses Pembentukan Gaji, Denda, dan Pajak
        const payloads = targetEmployees.map(emp => {
          const dbNik = String(emp.nik).trim().toUpperCase();
          const summary = attendanceSummary[dbNik];
          
          const isMonthly = Number(emp.base_salary) > 0;
          let baseSalary = isMonthly ? Number(emp.base_salary) : (summary.totalDays * upahHarian);
          const customDetails = [];
          let totalDeduction = 0;

          // A. POTONGAN KETERLAMBATAN
          if (summary.totalLateDays > 0) {
             const denda = summary.totalLateDays * potonganTerlambat;
             customDetails.push({ 
                id: Date.now()+Math.random(), 
                name: `Potongan Telat (${summary.totalLateDays}x / Total ${summary.lateMinutesTotal}m)`, 
                type: 'deduction', 
                amount: denda 
             });
             totalDeduction += denda;
          }

          // B. HITUNG BPJS
          const bpjsBase = Math.min(baseSalary, 12000000); 
          const bpjsKes = Math.round(bpjsBase * 0.01); 
          const bpjsJht = Math.round(bpjsBase * 0.02); 
          const bpjsJp = Math.round(Math.min(bpjsBase, 10042300) * 0.01); 

          if (bpjsKes > 0) { customDetails.push({ id: Date.now()+Math.random(), name: 'BPJS Kesehatan (1%)', type: 'deduction', amount: bpjsKes }); totalDeduction += bpjsKes; }
          if (bpjsJht > 0) { customDetails.push({ id: Date.now()+Math.random(), name: 'BPJS JHT (2%)', type: 'deduction', amount: bpjsJht }); totalDeduction += bpjsJht; }
          if (bpjsJp > 0)  { customDetails.push({ id: Date.now()+Math.random(), name: 'BPJS JP (1%)', type: 'deduction', amount: bpjsJp }); totalDeduction += bpjsJp; }

          // C. HITUNG PPH 21 TER
          const ptkp = emp.status_pernikahan || 'TK/0';
          const pph21 = calculatePPh21TER(baseSalary, ptkp);
          if (pph21 > 0) { customDetails.push({ id: Date.now()+Math.random(), name: `PPh 21 (TER - ${ptkp})`, type: 'deduction', amount: pph21 }); totalDeduction += pph21; }

          // (OPSIONAL) Tampilkan info total kehadiran jika gajinya harian
          if (!isMonthly && summary.totalDays > 0) {
             customDetails.unshift({ id: Date.now()+Math.random(), name: `Total Kehadiran (${summary.totalDays} Hari)`, type: 'earning', amount: baseSalary });
          }

          return {
            user_id: emp.id,
            period_month: selectedPeriod,
            base_salary: isMonthly ? baseSalary : 0, 
            custom_details: customDetails,
            net_salary: baseSalary - totalDeduction,
            site_location: emp.site_location || 'Pusat (HO)',
            status: 'DRAFT'
          };
        });

        if (payloads.length > 0) {
          const { error } = await supabase.from('finance_payroll').insert(payloads);
          if (error) throw error;
          alert(`Berhasil generate ${payloads.length} slip gaji!\nSistem menemukan NIK yang cocok dan menghitung keterlambatannya.`);
          setShowGenerateModal(false);
          fetchData();
        } else {
          alert(`Gagal: File Excel terbaca, tapi tidak ada NIK yang terdaftar di Database HRIS.`);
        }
      } catch (err) { alert("Gagal memproses data: " + err.message); } 
      finally { setLoading(false); setIsSubmitting(false); e.target.value = null; }
    };
    reader.readAsBinaryString(file);
  };

  const handleRilisPayslip = async (period) => {
    if (!window.confirm(`Rilis semua slip gaji (DRAFT) untuk periode ${period}? Karyawan dengan gaji Rp 0 harus diedit terlebih dahulu.`)) return;
    
    // Validasi: Jangan rilis jika ada gaji net yang masih 0 (belum diedit)
    const draftPayrolls = payrolls.filter(p => p.period_month === period && p.status === 'DRAFT');
    const hasZeroSalary = draftPayrolls.some(p => Number(p.net_salary) === 0);
    
    if (hasZeroSalary) {
       return alert("Terdapat karyawan dengan perhitungan gaji Rp 0 (Daily Worker). Silakan edit draft mereka terlebih dahulu sebelum merilis!");
    }

    try {
      const isAutoApproved = !sysConfig.finance_req_appv_payroll;
      const targetStatus = isAutoApproved ? 'PAID' : 'WAITING_APPROVAL';

      // 1. Update status di tabel finance_payroll
      await supabase.from('finance_payroll')
        .update({ status: targetStatus, approved_by: isAutoApproved ? user.id : null })
        .eq('period_month', period)
        .eq('status', 'DRAFT');

      // 2. Jika Auto-Approve, otomatis lempar ke pengeluaran Arus Kas
      if (isAutoApproved) {
        const cashflowPayloads = draftPayrolls.map(p => ({
           transaction_date: new Date().toISOString().split('T')[0],
           transaction_type: 'EXPENSE',
           category: `Payroll Area: ${p.site_location || 'Pusat (HO)'} (${p.period_month})`, // <-- INI YANG BERUBAH
           amount: Number(p.net_salary),
           description: `Gaji: ${p.initial_users?.name || 'Karyawan'} - ${p.initial_users?.nik || ''}`, // <-- INI YANG BERUBAH
           site_location: p.site_location || 'Pusat (HO)',
           status: 'PAID',
           created_by: user.id,
           approved_by: user.id
        }));
        await supabase.from('finance_cashflow').insert(cashflowPayloads);
      }

      alert("Payslip berhasil dirilis!");
      fetchData();
    } catch (error) {
      alert("Gagal merilis: " + error.message);
    }
  };

  // FUNGSI 1: IMPORT PAYROLL MASSAL (DARI TEMPLATE EXCEL MANUAL)
  const handleImportPayroll = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        // { raw: false } agar angka dan periode (YYYY-MM) dibaca persis seperti tampilan excel
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
        
        const payloads = [];
        const isAutoApproved = !sysConfig.finance_req_appv_payroll;

        data.forEach(row => {
          // 1. Cocokkan NIK Karyawan (Anti-Gagal: jadikan String & Huruf Besar)
          const rawNik = row['NIK Karyawan'] || row['NIK'];
          if (!rawNik) return; // Skip baris ini jika NIK kosong

          const nikStr = String(rawNik).trim().toUpperCase();
          const emp = employees.find(u => u.nik && String(u.nik).trim().toUpperCase() === nikStr);

          // Jika NIK tidak ditemukan di database master HRIS, skip baris ini
          if (!emp) return; 

          const comps = [];
          let totalEarn = 0;
          let totalDed = 0;

          // 2. Looping semua nama kolom di baris Excel ini untuk mencari (+) dan (-)
          Object.keys(row).forEach(key => {
            const val = Number(row[key]) || 0;
            const cleanKey = key.trim();

            if (cleanKey.startsWith('(+)')) {
              comps.push({ 
                id: Date.now() + Math.random(), 
                name: cleanKey.replace('(+)', '').trim(), 
                type: 'earning', 
                amount: val 
              });
              totalEarn += val;
            } else if (cleanKey.startsWith('(-)')) {
              comps.push({ 
                id: Date.now() + Math.random(), 
                name: cleanKey.replace('(-)', '').trim(), 
                type: 'deduction', 
                amount: val 
              });
              totalDed += val;
            }
          });

          // 3. Kalkulasi Net Salary
          const base = Number(row['Gaji Pokok']) || 0;
          const net = base + totalEarn - totalDed;
          const periodStr = row['Periode (YYYY-MM)'] || new Date().toISOString().slice(0, 7);

          // 4. Siapkan Data Payload
          payloads.push({
            user_id: emp.id,
            period_month: periodStr,
            base_salary: base,
            custom_details: comps,
            net_salary: net,
            site_location: emp.site_location || 'Pusat (HO)',
            status: isAutoApproved ? 'PAID' : 'WAITING_APPROVAL',
            approved_by: isAutoApproved ? user.id : null,
            created_by: user.id
          });
        });

        if (payloads.length > 0) {
          const { error } = await supabase.from('finance_payroll').insert(payloads);
          if (error) throw error;
          alert(`Berhasil mengimpor ${payloads.length} Slip Gaji Manual dari Excel!`);
          setShowImportPayroll(false); 
          fetchData();
        } else { 
          alert("Data gagal diproses. Pastikan format kolom Excel sesuai Template (NIK Karyawan, Gaji Pokok, dsb) dan NIK terdaftar di sistem HRIS."); 
        }
      } catch (err) { 
        alert("Gagal memproses data Excel: " + err.message); 
      } finally { 
        setLoading(false); 
        e.target.value = null; // Reset input file
      }
    };
    reader.readAsBinaryString(file);
  };

  // FUNGSI 2: IMPORT CASHFLOW (Arus Kas)
  const handleImportCashflow = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const isAutoApproved = !sysConfig.finance_req_appv_cashflow;

        const formattedData = jsonData.map((row) => ({
          transaction_date: row['Tanggal (YYYY-MM-DD)'] || new Date().toISOString().split('T')[0],
          transaction_type: row['Tipe (INCOME/EXPENSE)'] || 'EXPENSE',
          category: row['Kategori Transaksi'] || 'Lain-lain',
          amount: Number(row['Nominal (Rp)']) || 0,
          description: row['Keterangan'] || '',
          site_location: userLocation === 'Pusat (HO)' ? (row['Lokasi'] || 'Pusat (HO)') : userLocation,
          status: isAutoApproved ? 'PAID' : 'WAITING_APPROVAL',
          created_by: user.id,
          approved_by: isAutoApproved ? user.id : null
        }));

        const { error } = await supabase.from('finance_cashflow').insert(formattedData);
        
        if (error) throw error;
        alert(`Berhasil! ${formattedData.length} data arus kas telah di-import.`);
        
        setShowImportCashflow(false);
        fetchData(); 
      } catch (error) {
        console.error('Error import:', error);
        alert('Gagal import data. Pastikan format kolom Excel sesuai template terbaru.');
      } finally {
        setLoading(false);
        e.target.value = null; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-slate-300 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-slate-950">F</div>
             <div>
                <h1 className="font-black text-white leading-tight">Syntegra<span className="text-emerald-500">Finance</span></h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ERP System</p>
             </div>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
           <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm font-bold">
             <ArrowLeft size={16} className="text-emerald-500"/> Kembali ke Portal
           </button>
           <div className="my-2 border-t border-slate-800"></div>
           
           {(user?.can_access_finance_dashboard || isAdminOrDireksi) && (
             <button onClick={() => handleNav('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
               <LayoutDashboard size={18}/> Dashboard Finance
             </button>
           )}

           {(user?.can_access_cashflow || isAdminOrDireksi) && (
             <button onClick={() => handleNav('cashflow')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'cashflow' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
               <Wallet size={18}/> Arus Kas (Cashflow)
             </button>
           )}

           {(user?.can_manage_payroll || isAdminOrDireksi) && (
             <button onClick={() => handleNav('payroll')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'payroll' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
               <CreditCard size={18}/> Payroll Karyawan
             </button>
           )}

           {(user?.can_access_invoice || isAdminOrDireksi) && (
             <button onClick={() => handleNav('invoice')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'invoice' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
               <Receipt size={18}/> Tagihan (Invoice)
             </button>
           )}
           
           {/* Sebelumnya hanya isAdminOrDireksi, sekarang ditambahkan hak akses spesifik laporan */}
           {(user?.can_access_finance_report || isAdminOrDireksi) && (
             <button onClick={() => handleNav('report')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'report' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}>
                <BarChart3 size={18}/> Laporan {isAdminOrDireksi ? 'HO (Global)' : 'Cabang'}
             </button>
           )}

           <div className="my-2 border-t border-slate-800"></div>
           
           {/* Pusat Approval Tetap Menggunakan Logika Lama */}
           {hasApprovalRight && (
             <button onClick={() => handleNav('approval')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold justify-between ${activeTab === 'approval' ? 'bg-amber-500 text-slate-950' : 'hover:bg-slate-800 text-amber-400'}`}>
               <div className="flex items-center gap-3"><ShieldCheck size={18}/> Pusat Approval</div>
               {(accessibleCashflows.filter(c => c.status === 'WAITING_APPROVAL').length + payrolls.filter(p => p.status === 'WAITING_APPROVAL').length + invoices.filter(i => i.status === 'WAITING_APPROVAL').length) > 0 && (
                 <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                   {accessibleCashflows.filter(c => c.status === 'WAITING_APPROVAL').length + payrolls.filter(p => p.status === 'WAITING_APPROVAL').length + invoices.filter(i => i.status === 'WAITING_APPROVAL').length}
                 </span>
               )}
             </button>
           )}

           {/* Sebelumnya hanya isAdminOrDireksi, sekarang ditambahkan hak akses spesifik pengaturan */}
           {(user?.can_access_finance_settings || isAdminOrDireksi) && (
             <button onClick={() => handleNav('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-bold ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
               <Settings size={18}/> Pengaturan Keuangan
             </button>
           )}
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden"></div>}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><Menu size={20}/></button>
             <div>
                <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight">{activeTab.replace('_', ' ')}</h2>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Modul Keuangan {isAdminOrDireksi ? '• (Pusat)' : `• (Wilayah: ${userLocation})`}
                </p>
             </div>
           </div>
           <button onClick={() => fetchData()} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            
            {/* ========================================== */}
            {/* 1. DASHBOARD BERBASIS GRAFIK & AI (EXECUTIVE VIEW) */}
            {/* ========================================== */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in space-y-6">
                
                {/* AI Executive Summary Card */}
                {isAdminOrDireksi && (
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles size={120}/></div>
                    <div className="relative z-10">
                       <h3 className="text-sm font-black text-blue-200 tracking-widest uppercase mb-4 flex items-center gap-2"><Sparkles size={16}/> Laporan Eksekutif Otomatis</h3>
                       <p className="text-sm md:text-lg leading-relaxed font-medium">
                         Selamat {new Date().getHours() < 12 ? 'pagi' : new Date().getHours() < 15 ? 'siang' : 'sore'} Direksi. Berdasarkan data valid (berstatus PAID) pada periode <b>{currentMonthStr}</b>, 
                         pemasukan perusahaan tercatat sebesar <b>{formatRupiah(thisMonthIncome)}</b> 
                         <span className={incomeGrowth > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}> ({incomeGrowth > 0 ? '+' : ''}{incomeGrowth}% dari bulan lalu)</span>. 
                         Sementara total pengeluaran mencapai <b>{formatRupiah(thisMonthExpense)}</b>. 
                         Beban penggajian (*Payroll Cost*) tertinggi bulan ini berada pada site penempatan <b>{topPayrollSite[0]}</b> dengan total pencairan <b>{formatRupiah(topPayrollSite[1])}</b>.
                       </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Saldo Kas Aktif <Info size={12}/></span>
                    <h3 className="text-3xl font-black text-emerald-400">{formatRupiah(currentBalance)}</h3>
                    <p className="text-[9px] text-slate-400 mt-3 border-t border-slate-800 pt-2 leading-relaxed"><b>Asal Angka:</b> Total pemasukan <b>dikurangi</b> total pengeluaran sejak awal perusahaan berdiri, khusus transaksi berstatus LUNAS (PAID).</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute right-6 opacity-10"><TrendingUp size={48} className="text-blue-500"/></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Pemasukan Bulan Ini <Info size={12}/></span>
                    <h3 className="text-2xl font-black text-slate-800">{formatRupiah(thisMonthIncome)}</h3>
                    <p className="text-[9px] text-slate-500 mt-3 border-t border-slate-100 pt-2 leading-relaxed"><b>Asal Angka:</b> Total Kas Masuk (INCOME) pada bulan berjalan ({currentMonthStr}), yang sudah diapprove (PAID).</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute right-6 opacity-10"><TrendingDown size={48} className="text-red-500"/></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Pengeluaran Bulan Ini <Info size={12}/></span>
                    <h3 className="text-2xl font-black text-slate-800">{formatRupiah(thisMonthExpense)}</h3>
                    <p className="text-[9px] text-slate-500 mt-3 border-t border-slate-100 pt-2 leading-relaxed"><b>Asal Angka:</b> Total Kas Keluar (EXPENSE) termasuk pembelian seragam, alat, dll pada bulan berjalan ({currentMonthStr}), berstatus LUNAS.</p>
                  </div>
                </div>

                {/* Grafik Batang Arus Kas & Insight */}
                {isAdminOrDireksi && (
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-blue-500"/> Grafik Arus Kas (6 Bulan Terakhir)</h3>
                    
                    {/* CSS Based Bar Chart */}
                    <div className="flex items-end gap-2 md:gap-6 h-48 md:h-64 pt-6 border-b border-slate-100 relative">
                       {chartData.map((data, idx) => (
                         <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-1.5 h-full group relative">
                            <div className="absolute -top-12 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                               In: {formatRupiah(data.income)} <br/> Out: {formatRupiah(data.expense)}
                            </div>
                            
                            <div className="w-full flex justify-center items-end gap-1 h-full">
                               <div style={{height: `${Math.max((data.income / maxChartValue) * 100, 2)}%`}} className="w-1/3 bg-blue-500 rounded-t-md hover:bg-blue-600 transition-all"></div>
                               <div style={{height: `${Math.max((data.expense / maxChartValue) * 100, 2)}%`}} className="w-1/3 bg-red-400 rounded-t-md hover:bg-red-500 transition-all"></div>
                            </div>
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-2">{data.label}</span>
                         </div>
                       ))}
                    </div>
                    
                    <div className="flex justify-center gap-6 mt-6 pb-6 border-b border-slate-100">
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-xs font-bold text-slate-600">Pemasukan</span></div>
                       <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400"></span><span className="text-xs font-bold text-slate-600">Pengeluaran</span></div>
                    </div>

                    {/* AI CHART INSIGHTS (Analisis Grafik) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity size={12}/> Rata-Rata Masuk</h4>
                         <p className="text-sm font-black text-blue-600">{formatRupiah(avgIncome)}<span className="text-[10px] font-bold text-slate-400 ml-1">/bln</span></p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity size={12}/> Rata-Rata Keluar</h4>
                         <p className="text-sm font-black text-red-600">{formatRupiah(avgExpense)}<span className="text-[10px] font-bold text-slate-400 ml-1">/bln</span></p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                         <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={12}/> Puncak Pemasukan</h4>
                         <p className="text-sm font-black text-blue-800">{maxIncomeData.label} <span className="font-bold text-[10px]">({formatRupiah(maxIncomeData.income)})</span></p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                         <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingDown size={12}/> Puncak Pengeluaran</h4>
                         <p className="text-sm font-black text-red-800">{maxExpenseData.label} <span className="font-bold text-[10px]">({formatRupiah(maxExpenseData.expense)})</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. CASHFLOW */}
            {activeTab === 'cashflow' && (
              <div className="animate-fade-in space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                  <h3 className="font-black text-slate-800">Catatan Arus Kas {isAdminOrDireksi ? '' : `(${userLocation})`}</h3>
                  {(user.can_manage_cashflow || user.role === 'admin') && (
                    <div className="flex gap-2">
                      <button onClick={() => setShowImportCashflow(true)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"><Upload size={14}/> Import Excel</button>
                      <button onClick={() => setShowCashflowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"><Plus size={14}/> Input Manual</button>
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2">
                   <div className="flex w-full items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus-within:border-emerald-300 transition-colors">
                     <Search className="w-5 h-5 text-slate-400 shrink-0" />
                     <input type="text" placeholder="Cari deskripsi atau penempatan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700" />
                   </div>
                   <div className="flex w-full md:w-auto gap-2">
                     <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none" />
                     <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none">
                        <option value="">Semua Tipe</option><option value="INCOME">Pemasukan</option><option value="EXPENSE">Pengeluaran</option>
                     </select>
                   </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Tanggal</th>
                          <th className="px-6 py-4">Kategori & Penempatan</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {groupedCashflowsResult.length === 0 ? (
                          <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold text-xs">Data tidak ditemukan.</td></tr>
                        ) : (
                          groupedCashflowsResult.map(item => {
                            // JIKA INI ADALAH GRUP PAYROLL (DROPDOWN BISA DI-KLIK)
                            if (item.isGroup) {
                              const isExpanded = expandedCashflowGroups[item.id];
                              return (
                                <React.Fragment key={item.id}>
                                  <tr onClick={() => toggleCashflowGroup(item.id)} className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-blue-500">
                                    <td className="px-6 py-4 font-bold text-slate-700">{item.transaction_date}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="bg-blue-100 text-blue-600 p-1 rounded-md">{isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</div>
                                        <div>
                                          <span className="font-black text-slate-800 block">{item.category} <span className="text-[10px] text-slate-400 font-normal ml-1">({item.items.length} Data)</span></span>
                                          {item.site_location && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mt-1 inline-flex items-center gap-1"><MapPin size={10}/> {item.site_location}</span>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-700">Pengeluaran (Batch)</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-red-600">-{formatRupiah(item.amount)}</td>
                                  </tr>
                                  {/* RENDER ANAK-ANAKNYA JIKA EXPANDED (DETAIL PAYROLL) */}
                                  {isExpanded && item.items.map(child => (
                                    <tr key={child.id} className="bg-slate-50/50 hover:bg-slate-100">
                                      <td className="px-6 py-3 pl-10 text-[11px] text-slate-500 font-medium">{child.transaction_date}</td>
                                      <td className="px-6 py-3 text-[11px] text-slate-600 font-bold">↳ {child.description}</td>
                                      <td className="px-6 py-3 text-[10px] text-slate-400 font-bold uppercase">{child.status}</td>
                                      <td className="px-6 py-3 text-right text-[11px] font-bold text-red-500">-{formatRupiah(child.amount)}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            }
                            
                            // JIKA INI TRANSAKSI KAS BIASA
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{item.transaction_date}</td>
                                <td className="px-6 py-4">
                                  <span className="font-black text-slate-800 block">{item.category}</span>
                                  {item.site_location && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mt-1 inline-flex items-center gap-1"><MapPin size={10}/> {item.site_location}</span>}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 w-max">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.transaction_type === 'INCOME' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.transaction_type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</span>
                                    {item.status === 'WAITING_APPROVAL' && <span className="text-[9px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded animate-pulse">Menunggu Approval</span>}
                                  </div>
                                </td>
                                <td className={`px-6 py-4 text-right font-black ${item.transaction_type === 'INCOME' ? 'text-blue-600' : 'text-red-600'}`}>{item.transaction_type === 'INCOME' ? '+' : '-'}{formatRupiah(item.amount)}</td>
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

            {/* 3. PAYROLL (Sistem Card Cabang) */}
            {activeTab === 'payroll' && (
              <div className="animate-fade-in space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                  <h3 className="font-black text-slate-800">Manajemen Penggajian {isAdminOrDireksi ? '' : `(${userLocation})`}</h3>
                  {(user.can_manage_payroll || user.role === 'admin') && (
                    <div className="flex gap-2">
                      {/* Bagian Tombol Atas */}
                      <div className="flex gap-2">
                        <button onClick={() => setShowGenerateModal(true)} className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                          <Sparkles size={14}/> Generate Otomatis
                        </button>
                        <button onClick={() => setShowImportPayroll(true)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                          <FileSpreadsheet size={14}/> Import Excel
                        </button>
                      </div>
                      <button onClick={() => setShowPayrollModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"><Plus size={14}/> Buat Manual</button>
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2">
                   <div className="flex w-full items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus-within:border-blue-300 transition-colors">
                     <Search className="w-5 h-5 text-slate-400 shrink-0" />
                     <input type="text" placeholder="Pencarian spesifik nama/NIK karyawan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700" />
                   </div>
                   <div className="flex w-full md:w-auto gap-2">
                     <input type="month" value={payrollFilterMonth} onChange={(e) => { setPayrollFilterMonth(e.target.value); setActivePayrollDivision(null); }} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none text-slate-700" />
                   </div>
                </div>
                
                {/* Mode Master-Detail (Card Layout) */}
                {!activePayrollDivision ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {Object.entries(payrollsByDivision).map(([division, slips]) => {
                       const totalTHP = slips.reduce((sum, s) => sum + Number(s.net_salary), 0);
                       const totalWaiting = slips.filter(s => s.status === 'WAITING_APPROVAL').length;
                       return (
                         <div key={division} onClick={() => setActivePayrollDivision(division)} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                               <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Building size={24}/></div>
                               {totalWaiting > 0 && <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-full animate-pulse">{totalWaiting} Menunggu</span>}
                            </div>
                            <h4 className="font-black text-slate-800 text-lg mb-1">{division}</h4>
                            <p className="text-xs text-slate-500 font-bold mb-4">{slips.length} Slip Gaji (Bulan Ini)</p>
                            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                               <span className="text-[10px] font-black text-slate-400 uppercase">Total THP Area</span>
                               <span className="font-black text-blue-600">{formatRupiah(totalTHP)}</span>
                            </div>
                         </div>
                       )
                    })}
                    {Object.keys(payrollsByDivision).length === 0 && (
                       <div className="col-span-1 md:col-span-3 text-center py-12 bg-white rounded-3xl border border-slate-200">
                          <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-3"/>
                          <p className="text-slate-500 font-bold text-sm">Belum ada slip gaji yang diinput untuk periode {payrollFilterMonth}.</p>
                          <p className="text-slate-400 text-xs mt-1">Kartu penempatan site/cabang akan otomatis muncul di sini setelah slip gaji dibuat.</p>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 animate-fade-in-up">
                    <button onClick={() => setActivePayrollDivision(null)} className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-max">
                       <ArrowLeft size={14}/> Kembali ke Area Cabang
                    </button>
                    
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                         <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><MapPin size={16}/></div>
                         <div><h4 className="font-black text-slate-800 text-sm">{activePayrollDivision}</h4><p className="text-[10px] font-bold text-slate-500">Rincian Slip Gaji Karyawan</p></div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead className="bg-white border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <tr>
                              {/* TAMBAHKAN KOLOM CHECKBOX HEADER DI SINI */}
                              <th className="px-4 py-4 w-10 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={payrollsByDivision[activePayrollDivision].length > 0 && selectedEmployees.length === payrollsByDivision[activePayrollDivision].length} 
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Pilih semua ID user di tabel ini
                                      setSelectedEmployees(payrollsByDivision[activePayrollDivision].map(p => p.user_id));
                                    } else {
                                      setSelectedEmployees([]);
                                    }
                                  }} 
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" 
                                />
                              </th>
                              <th className="px-6 py-4">Periode</th>
                              <th className="px-6 py-4">Data Karyawan</th>
                              <th className="px-6 py-4 text-right">Gaji Pokok</th>
                              <th className="px-6 py-4 text-right">THP (Bersih)</th>
                              <th className="px-6 py-4 text-center">Aksi / Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {payrollsByDivision[activePayrollDivision].map(slip => (
                                <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                                  {/* TAMBAHKAN KOLOM CHECKBOX BARIS DI SINI */}
                                  <td className="px-4 py-4 text-center align-middle">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedEmployees.includes(slip.user_id)} 
                                      onChange={() => {
                                        if (selectedEmployees.includes(slip.user_id)) {
                                          setSelectedEmployees(selectedEmployees.filter(id => id !== slip.user_id));
                                        } else {
                                          setSelectedEmployees([...selectedEmployees, slip.user_id]);
                                        }
                                      }} 
                                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer" 
                                    />
                                  </td>
                                  <td className="px-6 py-4 font-black text-slate-800">{slip.period_month}</td>
                                  <td className="px-6 py-4">
                                    <span className="font-black text-slate-800 block">{slip.initial_users?.name || 'Unknown'}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">NIK: {slip.initial_users?.nik}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-600">{formatRupiah(slip.base_salary)}</td>
                                  <td className="px-6 py-4 text-right font-black text-emerald-600">{formatRupiah(slip.net_salary)}</td>
                                  <td className="px-6 py-4 text-center align-middle">
                                    <div className="flex flex-col items-center gap-2">
                                      {/* Warna Badge Berdasarkan Status */}
                                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest w-max shadow-sm 
                                        ${slip.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 
                                          slip.status === 'WAITING_APPROVAL' ? 'bg-orange-100 text-orange-700 animate-pulse' : 
                                          slip.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {slip.status.replace('_', ' ')}
                                      </span>
                                      
                                      <div className="flex gap-1">
                                        <button onClick={() => setViewPayslip(slip)} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-[9px] font-black transition-colors uppercase flex items-center gap-1 shadow-sm"><FileText size={10} /> Lihat Slip</button>
                                        
                                        {/* Tombol Edit Khusus Status DRAFT */}
                                        {slip.status === 'DRAFT' && (
                                          <button onClick={() => {
                                            setEditingDraftId(slip.id);
                                            setPayrollForm({ user_id: slip.user_id, period_month: slip.period_month, base_salary: slip.base_salary });
                                            setCustomComponents(slip.custom_details || []);
                                            setShowPayrollModal(true);
                                          }} className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                            <Edit size={10} className="inline mr-1"/> Edit
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Tombol Rilis Eksekusi (Tampil jika ada DRAFT di area tersebut) */}
                    {payrollsByDivision[activePayrollDivision].some(p => p.status === 'DRAFT') && (
                      <div className="p-4 bg-amber-50 border-t border-amber-200 flex justify-between items-center rounded-b-[2rem]">
                         <div>
                           <h4 className="font-black text-amber-800 text-sm">Pratinjau Payroll (Draft)</h4>
                           <p className="text-[10px] text-amber-600 font-bold">Harap periksa dan edit kalkulasi yang belum sesuai (Rp 0) sebelum dirilis ke Arus Kas.</p>
                         </div>
                         <button onClick={() => handleRilisPayslip(payrollFilterMonth)} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all">
                           <CheckCircle2 size={16}/> Rilis Semua Payslip
                         </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. LAPORAN KOMPARASI */}
            {activeTab === 'report' && isAdminOrDireksi && (
              <div className="animate-fade-in space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                  <h3 className="font-black text-slate-800">Laporan Komparasi: Realisasi vs Invoice</h3>
                  <div className="flex gap-2">
                    <select value={reportViewMode} onChange={e => setReportViewMode(e.target.value)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-blue-500">
                       <option value="summary">Tabel Summary (Rekap Tahunan)</option>
                       <option value="monthly">Tabel Detail Project (Per Bulan)</option>
                    </select>
                    {reportViewMode === 'monthly' && (
                       <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="bg-white border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-blue-500"/>
                    )}
                  </div>
                </div>

                {reportViewMode === 'summary' ? (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                            <tr>
                              <th className="px-6 py-4" rowSpan={2}>Periode</th>
                              <th className="px-6 py-4 text-center border-l border-slate-200" rowSpan={2}>MP</th>
                              <th className="px-6 py-2 text-center border-l border-slate-200 border-b" colSpan={3}>Invoice</th>
                              <th className="px-6 py-4 text-right border-l border-slate-200" rowSpan={2}>Total Realisasi</th>
                              <th className="px-6 py-4 text-right border-l border-slate-200" rowSpan={2}>Total Pendapatan</th>
                            </tr>
                            <tr>
                              <th className="px-6 py-2 border-l border-slate-200 text-right bg-slate-50">Cost (Estimasi)</th>
                              <th className="px-6 py-2 border-l border-slate-200 text-right bg-slate-50">M. Fee</th>
                              <th className="px-6 py-2 border-l border-slate-200 text-right bg-slate-50">Total Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {reportData.summaryData.length === 0 ? (
                               <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-bold text-xs">Belum ada data keuangan yang tercatat.</td></tr>
                            ) : (
                               reportData.summaryData.map((row, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-black text-slate-800">{row.period}</td>
                                    <td className="px-6 py-4 text-center border-l border-slate-100 font-bold">{row.mp}</td>
                                    <td className="px-6 py-4 text-right border-l border-slate-100 font-medium text-slate-500">{formatRupiah(row.totalRealisasi)}</td>
                                    <td className="px-6 py-4 text-right border-l border-slate-100 font-medium text-slate-500">{formatRupiah(row.totalPendapatan)}</td>
                                    <td className="px-6 py-4 text-right border-l border-slate-100 font-black text-slate-800">{formatRupiah(row.totalInvoice)}</td>
                                    <td className="px-6 py-4 text-right border-l border-slate-100 font-black text-red-600">{formatRupiah(row.totalRealisasi)}</td>
                                    <td className="px-6 py-4 text-right border-l border-slate-100 font-black text-emerald-600">{formatRupiah(row.totalPendapatan)}</td>
                                 </tr>
                               ))
                            )}
                          </tbody>
                        </table>
                     </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                          <thead className="bg-slate-800 text-white text-[10px] font-black text-center uppercase tracking-wider">
                            <tr>
                              <th rowSpan="2" className="px-4 py-3 border border-slate-700 align-middle">No</th>
                              <th rowSpan="2" className="px-6 py-3 border border-slate-700 align-middle">Site</th>
                              <th rowSpan="2" className="px-4 py-3 border border-slate-700 align-middle">Jumlah MP</th>
                              <th colSpan="1" className="px-6 py-2 border border-slate-700 bg-slate-700">Jasa Keamanan</th>
                              <th colSpan="2" className="px-6 py-2 border border-slate-700 bg-slate-700">Total Biaya Operasional</th>
                              <th rowSpan="2" className="px-6 py-3 border border-slate-700 align-middle">Management Fee</th>
                            </tr>
                            <tr>
                              <th className="px-6 py-2 border border-slate-700 bg-slate-800">Nilai Tagihan</th>
                              <th className="px-6 py-2 border border-slate-700 bg-slate-800">Gaji Pokok & Tunjangan</th>
                              <th className="px-6 py-2 border border-slate-700 bg-slate-800">Pengeluaran Kas</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {reportData.monthlyData.length === 0 ? (
                               <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-bold text-xs">Tidak ada transaksi tercatat di bulan {reportMonth}.</td></tr>
                            ) : (
                               reportData.monthlyData.map((row, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-center border border-slate-200 font-medium text-slate-500">{idx + 1}</td>
                                    <td className="px-6 py-3 border border-slate-200 font-black text-slate-800">{row.project || 'Pusat (HO)'}</td>
                                    <td className="px-4 py-3 text-center border border-slate-200 font-bold">{row.mp}</td>
                                    <td className="px-6 py-3 text-right border border-slate-200 font-black text-slate-800">{formatRupiah(row.totalInvoice)}</td>
                                    <td className="px-6 py-3 text-right border border-slate-200 font-medium text-red-600">{formatRupiah(row.manpowerCost)}</td>
                                    <td className="px-6 py-3 text-right border border-slate-200 font-medium text-red-600">{formatRupiah(row.operationCost)}</td>
                                    <td className="px-6 py-3 text-right border border-slate-200 font-black text-emerald-600">{formatRupiah(row.managementFee)}</td>
                                 </tr>
                               ))
                            )}
                          </tbody>
                          {reportData.monthlyData.length > 0 && (
                            <tfoot className="bg-slate-100 font-black text-slate-900 text-sm">
                              <tr>
                                 <td colSpan="2" className="px-6 py-4 border border-slate-300 text-center uppercase tracking-widest text-slate-600">Total Keseluruhan</td>
                                 <td className="px-4 py-4 border border-slate-300 text-center">{reportData.monthlyData.reduce((sum, row) => sum + row.mp, 0)}</td>
                                 <td className="px-6 py-4 border border-slate-300 text-right">{formatRupiah(reportData.monthlyData.reduce((sum, row) => sum + row.totalInvoice, 0))}</td>
                                 <td className="px-6 py-4 border border-slate-300 text-right text-red-600">{formatRupiah(reportData.monthlyData.reduce((sum, row) => sum + row.manpowerCost, 0))}</td>
                                 <td className="px-6 py-4 border border-slate-300 text-right text-red-600">{formatRupiah(reportData.monthlyData.reduce((sum, row) => sum + row.operationCost, 0))}</td>
                                 <td className="px-6 py-4 border border-slate-300 text-right text-emerald-600">{formatRupiah(reportData.monthlyData.reduce((sum, row) => sum + row.managementFee, 0))}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                     </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. TAGIHAN / INVOICE */}
            {activeTab === 'invoice' && (
              <div className="animate-fade-in space-y-4 print:hidden">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800">Manajemen Tagihan (Invoice)</h3>
                    {(user.can_manage_finance || isAdminOrDireksi) && (
                      <button onClick={() => openInvoiceModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"><Plus size={14}/> Buat Invoice Baru</button>
                    )}
                 </div>

                 {/* Filter Bar Invoice */}
                 <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2">
                   <div className="flex w-full items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus-within:border-blue-300 focus-within:bg-white transition-colors">
                     <Search className="w-5 h-5 text-slate-400 shrink-0" />
                     <input type="text" placeholder="Cari Nama Klien atau Nomor Invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700" />
                   </div>
                   <div className="flex w-full md:w-auto gap-2">
                     <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none" />
                     <select value={invoiceFilterStatus} onChange={(e) => setInvoiceFilterStatus(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none">
                        <option value="">Semua Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="WAITING_APPROVAL">Menunggu Approval</option>
                        <option value="SENT">Terkirim (Belum Lunas)</option>
                        <option value="PAID">Lunas</option>
                     </select>
                   </div>
                 </div>

                 {/* Tabel Invoice */}
                 <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Nomor Invoice</th>
                            <th className="px-6 py-4">Klien & Lokasi</th>
                            <th className="px-6 py-4">Tanggal (Issue & Due)</th>
                            <th className="px-6 py-4 text-right">Total Tagihan</th>
                            <th className="px-6 py-4 text-center">Status / Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredInvoices.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold text-xs">Data invoice tidak ditemukan.</td></tr>
                          ) : (
                            filteredInvoices.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-800">{inv.invoice_number}</td>
                                <td className="px-6 py-4">
                                  <span className="font-black text-slate-800 block">{inv.client_name}</span>
                                  <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1 mt-1"><MapPin size={10}/> {inv.site_location}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Diterbitkan: {inv.issue_date}</span>
                                  <span className="text-[10px] font-bold text-red-500">Jatuh Tempo: {inv.due_date}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-800">{formatRupiah(inv.total_amount)}</td>
                                <td className="px-6 py-4 text-center align-middle">
                                  <div className="flex flex-col items-center gap-2">
                                    <InvoiceStatusBadge status={inv.status} />
                                    <div className="flex gap-1 mt-1">
                                       <button onClick={() => setViewInvoice(inv)} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-[9px] font-black transition-colors uppercase flex items-center gap-1 shadow-sm"><FileText size={10} /> Detail</button>
                                       {inv.status === 'SENT' && (
                                         <button onClick={() => handleUpdateInvoiceStatus(inv.id, 'PAID')} className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black transition-colors uppercase flex items-center gap-1 shadow-sm"><Check size={10} /> Lunas</button>
                                       )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>
            )}

            {/* 6. PUSAT APPROVAL & RIWAYAT (DENGAN FILTER CANGGIH) */}
            {activeTab === 'approval' && hasApprovalRight && (
              <div className="animate-fade-in space-y-4">
                 <div className="flex gap-2 border-b border-slate-200 mb-6">
                   <button onClick={() => setApprovalSubTab('pending')} className={`px-4 py-3 text-sm font-black transition-colors ${approvalSubTab === 'pending' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>Menunggu Persetujuan</button>
                   <button onClick={() => setApprovalSubTab('history')} className={`px-4 py-3 text-sm font-black transition-colors ${approvalSubTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Riwayat Approval</button>
                 </div>

                 {/* SEKSI BARU: MENUNGGU PERSETUJUAN INVOICE */}
                       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden mt-6">
                          <div className="bg-purple-50 border-b border-purple-100 p-4">
                            <h3 className="font-black text-purple-800 text-sm flex items-center gap-2">
                              <Receipt size={16}/> Menunggu Persetujuan Invoice
                            </h3>
                          </div>
                          <div className="p-4">
                            {invoices.filter(i => i.status === 'WAITING_APPROVAL').length === 0 ? (
                              <p className="text-center text-xs text-slate-400 font-bold py-6">Tidak ada invoice yang perlu di-approve.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invoices.filter(i => i.status === 'WAITING_APPROVAL').map(inv => (
                                  <div key={inv.id} className="border border-slate-200 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                     <div className="flex justify-between items-start mb-2">
                                       <div>
                                         <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-purple-100 text-purple-700">Invoice</span>
                                         <h4 className="font-black text-slate-800 mt-1">{inv.client_name}</h4>
                                         <span className="text-[9px] font-bold text-slate-500 block">No: {inv.invoice_number}</span>
                                         {inv.site_location && <span className="text-[9px] font-bold text-blue-600">Lokasi: {inv.site_location}</span>}
                                       </div>
                                       <span className="font-black text-blue-600">{formatRupiah(inv.total_amount)}</span>
                                     </div>
                                     <p className="text-[10px] text-slate-500 mb-3">Tgl Terbit: {inv.issue_date} • Jatuh Tempo: {inv.due_date}</p>
                                     <div className="flex gap-2">
                                       <button onClick={() => processApproval('finance_invoices', inv.id, true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 shadow-sm">
                                         <Check size={12}/> Setujui (Kirim)
                                       </button>
                                       <button onClick={() => processApproval('finance_invoices', inv.id, false)} className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 shadow-sm">
                                         <X size={12}/> Tolak & Hapus
                                       </button>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                       </div>

                 {/* TAB: PENDING APPROVAL */}
                 {approvalSubTab === 'pending' && (
                    <div className="space-y-6">
                       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                          <div className="bg-amber-50 border-b border-amber-100 p-4"><h3 className="font-black text-amber-800 text-sm flex items-center gap-2"><Wallet size={16}/> Menunggu Persetujuan Arus Kas</h3></div>
                          <div className="p-4">
                            {accessibleCashflows.filter(c => c.status === 'WAITING_APPROVAL').length === 0 ? (
                              <p className="text-center text-xs text-slate-400 font-bold py-6">Tidak ada permintaan kas yang perlu di-approve.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {accessibleCashflows.filter(c => c.status === 'WAITING_APPROVAL').map(item => (
                                  <div key={item.id} className="border border-slate-200 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                     <div className="flex justify-between items-start mb-2">
                                       <div>
                                         <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${item.transaction_type === 'INCOME' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.transaction_type}</span>
                                         <h4 className="font-black text-slate-800 mt-1">{item.category}</h4>
                                         {item.site_location && <span className="text-[9px] font-bold text-blue-600">Penempatan: {item.site_location}</span>}
                                       </div>
                                       <span className="font-black text-emerald-600">{formatRupiah(item.amount)}</span>
                                     </div>
                                     <p className="text-[10px] text-slate-500 mb-3">Tgl: {item.transaction_date} • Oleh: {item.initial_users?.name || 'Sistem'}</p>
                                     <div className="flex gap-2">
                                       <button onClick={() => processApproval('finance_cashflow', item.id, true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 shadow-sm"><Check size={12}/> Setujui</button>
                                       <button onClick={() => processApproval('finance_cashflow', item.id, false)} className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 shadow-sm"><X size={12}/> Tolak</button>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                       </div>

                       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                          <div className="bg-blue-50 border-b border-blue-100 p-4"><h3 className="font-black text-blue-800 text-sm flex items-center gap-2"><CreditCard size={16}/> Menunggu Persetujuan Slip Gaji</h3></div>
                          <div className="p-4">
                            {payrolls.filter(p => p.status === 'WAITING_APPROVAL').length === 0 ? (
                              <p className="text-center text-xs text-slate-400 font-bold py-6">Tidak ada slip gaji yang perlu di-approve.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                                    <tr>
                                      <th className="px-4 py-3">Periode</th><th className="px-4 py-3">Karyawan & Penempatan</th><th className="px-4 py-3 text-right">Total THP</th><th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-sm">
                                    {payrolls.filter(p => p.status === 'WAITING_APPROVAL').map(slip => (
                                      <tr key={slip.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-700">{slip.period_month}</td>
                                        <td className="px-4 py-3">
                                           <span className="font-black text-slate-800">{slip.initial_users?.name}</span><br/>
                                           <span className="text-[10px] text-slate-500">{slip.site_location || 'Pusat (HO)'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-600">{formatRupiah(slip.net_salary)}</td>
                                        <td className="px-4 py-3">
                                          <div className="flex justify-center gap-2">
                                            <button onClick={() => setViewPayslip(slip)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm flex items-center gap-1"><FileText size={12}/> Detail</button>
                                            <button onClick={() => processApproval('finance_payroll', slip.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm flex items-center gap-1"><Check size={12}/> Approve</button>
                                            <button onClick={() => processApproval('finance_payroll', slip.id, false)} className="bg-white hover:bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm flex items-center gap-1"><X size={12}/> Hapus</button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                 )}

                 {/* TAB: HISTORY APPROVAL */}
                 {approvalSubTab === 'history' && (
                    <div className="space-y-4">
                       <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2">
                         <div className="flex w-full items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus-within:border-blue-300 transition-colors">
                           <Search className="w-5 h-5 text-slate-400 shrink-0" />
                           <input type="text" placeholder="Cari nama karyawan / deskripsi..." value={historyName} onChange={(e) => setHistoryName(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700" />
                         </div>
                         <div className="flex w-full md:w-auto gap-2">
                           <input type="month" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none" />
                           <select value={historyLocation} onChange={(e) => setHistoryLocation(e.target.value)} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none text-slate-600">
                              <option value="">Semua Lokasi</option>
                              {uniqueDivisions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                           </select>
                         </div>
                       </div>

                       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-100 p-4"><h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><History size={16}/> Riwayat Persetujuan Modul Finance</h3></div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                                <tr>
                                  <th className="px-6 py-4">Tipe Data</th>
                                  <th className="px-6 py-4">Keterangan / Karyawan</th>
                                  <th className="px-6 py-4 text-right">Total (Rp)</th>
                                  <th className="px-6 py-4 text-center">Status Akhir</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-slate-100">
                                {historyCashflows.length === 0 && historyPayrolls.length === 0 ? (
                                  <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold text-xs">Riwayat tidak ditemukan berdasarkan filter.</td></tr>
                                ) : (
                                  <>
                                    {historyCashflows.map(c => (
                                      <tr key={`c-${c.id}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                           <span className="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded text-[10px] uppercase">Arus Kas</span>
                                           <p className="text-[10px] text-slate-500 font-bold mt-1">{c.transaction_date}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                           <span className="font-black text-slate-800">{c.category}</span><br/>
                                           <span className="text-[10px] text-slate-500">Penempatan: {c.site_location || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-700">{formatRupiah(c.amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                           <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${c.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{c.status === 'PAID' ? 'DISETUJUI' : 'DITOLAK'}</span>
                                        </td>
                                      </tr>
                                    ))}
                                    {historyPayrolls.map(p => (
                                      <tr key={`p-${p.id}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                           <span className="font-black text-blue-700 bg-blue-50 px-2 py-1 rounded text-[10px] uppercase">Slip Gaji</span>
                                           <p className="text-[10px] text-slate-500 font-bold mt-1">Periode: {p.period_month}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                           <span className="font-black text-slate-800">{p.initial_users?.name}</span><br/>
                                           <span className="text-[10px] text-slate-500">Penempatan: {p.site_location || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600">{formatRupiah(p.net_salary)}</td>
                                        <td className="px-6 py-4 text-center">
                                           <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{p.status === 'PAID' ? 'DISETUJUI' : 'DITOLAK'}</span>
                                           <button onClick={() => setViewPayslip(p)} className="block mx-auto mt-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-[9px] font-black transition-colors uppercase w-max shadow-sm"><FileText size={10} className="inline mr-1"/> Detail</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
            )}

            {/* 7. PENGATURAN FINANCE GLOBAL */}
            {activeTab === 'settings' && isAdminOrDireksi && (
              <div className="animate-fade-in max-w-3xl mx-auto mt-4">
                 <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <h3 className="font-black text-slate-800 text-lg mb-2 flex items-center gap-2"><Settings className="text-blue-600"/> Pengaturan Aturan Modul Keuangan</h3>
                    <p className="text-xs text-slate-500 mb-6 font-medium">Atur apakah setiap staf yang menginput data wajib melewati tahapan persetujuan (approval) atau tidak. Jika dimatikan, semua input akan otomatis Lunas (PAID).</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSysConfig({...sysConfig, finance_req_appv_cashflow: !sysConfig.finance_req_appv_cashflow})}>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">Wajibkan Approval untuk Arus Kas</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Jika aktif, semua input kas masuk/keluar dari semua staf akan berstatus 'Menunggu Approval'.</p>
                        </div>
                        <div className={`w-12 h-6 ${sysConfig.finance_req_appv_cashflow ? 'bg-blue-600' : 'bg-slate-300'} rounded-full relative transition-colors shadow-inner`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${sysConfig.finance_req_appv_cashflow ? 'translate-x-7' : 'translate-x-1'}`}></div></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSysConfig({...sysConfig, finance_req_appv_payroll: !sysConfig.finance_req_appv_payroll})}>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">Wajibkan Approval untuk Slip Gaji</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Jika aktif, slip gaji yang digenerate tidak akan langsung valid (PAID) sebelum disetujui di Pusat Approval.</p>
                        </div>
                        <div className={`w-12 h-6 ${sysConfig.finance_req_appv_payroll ? 'bg-blue-600' : 'bg-slate-300'} rounded-full relative transition-colors shadow-inner`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${sysConfig.finance_req_appv_payroll ? 'translate-x-7' : 'translate-x-1'}`}></div></div>
                      </div>
                    </div>

                    <button onClick={handleSaveSettings} className="w-full mt-6 bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                       <Save size={16}/> Simpan Pengaturan Sistem
                    </button>
                 </div>
              </div>
            )}
        </div>
      </main>

      {/* ========================================== */}
      {/* MODAL GENERATE PAYROLL (DENGAN ABSENSI EXCEL) */}
      {/* ========================================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg tracking-tight flex items-center gap-2"><Sparkles size={18} className="text-amber-400"/> Generate Payroll via Absensi</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Sistem akan otomatis menghitung potongan jam, BPJS, dan PPh 21.</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-5 flex-1">
              
              {/* Box Pengaturan Parameter */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
                 
                 <div className="md:col-span-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Jam Masuk Standar</label>
                      <input type="time" value={shiftMasuk} onChange={e => setShiftMasuk(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Jam Keluar Standar</label>
                      <input type="time" value={shiftKeluar} onChange={e => setShiftKeluar(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500" />
                    </div>
                 </div>

                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Toleransi Telat</label>
                   <div className="flex items-center">
                     <input type="number" value={toleransiMenit} onChange={e => setToleransiMenit(Number(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-l-xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500" />
                     <span className="bg-blue-200 text-blue-800 px-3 py-2.5 rounded-r-xl text-sm font-bold">Menit</span>
                   </div>
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Potongan Keterlambatan</label>
                   <div className="flex items-center">
                     <span className="bg-blue-200 text-blue-800 px-3 py-2.5 rounded-l-xl text-sm font-bold">Rp</span>
                     <input type="number" value={potonganTerlambat} onChange={e => setPotonganTerlambat(Number(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-r-xl text-sm font-black text-red-600 focus:outline-none focus:border-blue-500" />
                   </div>
                 </div>

                 <div className="md:col-span-4 pt-2 border-t border-blue-200/50">
                   <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Upah Harian (Hanya Untuk Karyawan Non-Tetap/Rp 0)</label>
                   <div className="flex items-center w-full md:w-1/2">
                     <span className="bg-emerald-100 text-emerald-800 px-3 py-2.5 rounded-l-xl text-sm font-bold">Rp</span>
                     <input type="number" value={upahHarian} onChange={e => setUpahHarian(Number(e.target.value))} className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-r-xl text-sm font-black text-emerald-600 focus:outline-none focus:border-emerald-500" />
                   </div>
                 </div>
              </div>

              {/* Area Upload Excel */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Langkah Terakhir: Upload Excel Absensi</p>
                <label className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-amber-400 transition-all group">
                    <Upload className="w-10 h-10 text-slate-300 group-hover:text-amber-500 mb-3 transition-colors" />
                    <p className="text-sm font-black text-slate-700">Pilih atau Tarik File Excel Ke Sini</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Sistem akan mencocokkan NIK dan memproses Draf secara instan.</p>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleGenerateOtomatis} disabled={isSubmitting} />
                </label>
                {isSubmitting && <p className="text-center text-amber-500 text-xs font-bold mt-4 animate-pulse">Menghitung Jam, Pajak, dan BPJS... Mohon tunggu.</p>}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL IMPORT EXCEL ARUS KAS (CASHFLOW) */}
      {/* ========================================== */}
      {showImportCashflow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col border border-slate-200">
            <div className="p-5 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg tracking-tight">Import Massal Arus Kas</h3>
                <p className="text-[10px] text-emerald-100 mt-0.5">Unggah data menggunakan format template.</p>
              </div>
              <button onClick={() => setShowImportCashflow(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <button onClick={() => downloadTemplate('cashflow')} className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm">
                <FileText size={16}/> Unduh Template Excel
              </button>
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-emerald-400 transition-colors relative group">
                <input 
                   type="file" 
                   accept=".xlsx, .xls" 
                   onChange={handleImportCashflow} 
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="group-hover:scale-110 transition-transform duration-300">
                   <Plus size={32} className="mx-auto text-emerald-500 mb-3"/>
                </div>
                <p className="text-sm font-black text-slate-700">Klik atau Seret file Excel ke sini</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Hanya mendukung format .xlsx</p>
                {loading && <p className="text-xs font-bold text-emerald-600 mt-3 animate-pulse">Memproses data... mohon tunggu.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL IMPORT EXCEL PAYROLL (SLIP GAJI) */}
      {/* ========================================== */}
      {showImportPayroll && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col border border-slate-200">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg tracking-tight">Import Massal Slip Gaji</h3>
                <p className="text-[10px] text-blue-100 mt-0.5">Pastikan NIK Karyawan valid dan terdaftar.</p>
              </div>
              <button onClick={() => setShowImportPayroll(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <button onClick={() => downloadTemplate('payroll')} className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors shadow-sm">
                <FileText size={16}/> Unduh Template Excel
              </button>
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors relative group">
                <input 
                   type="file" 
                   accept=".xlsx, .xls" 
                   onChange={handleImportPayroll} 
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="group-hover:scale-110 transition-transform duration-300">
                   <FileText size={32} className="mx-auto text-blue-500 mb-3"/>
                </div>
                <p className="text-sm font-black text-slate-700">Klik atau Seret file Excel ke sini</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Hanya mendukung format .xlsx</p>
                {loading && <p className="text-xs font-bold text-blue-600 mt-3 animate-pulse">Memproses data... mohon tunggu.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL POP-UP LIHAT / CETAK SLIP GAJI */}
      {/* ========================================== */}
      {viewPayslip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col relative border border-slate-200">
            <div className="p-6 border-b border-slate-200 text-center bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Slip Gaji Karyawan</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">Periode: {viewPayslip.period_month}</p>
            </div>
            
            <div className="p-6 space-y-4 bg-white">
               <div className="grid grid-cols-2 gap-3 text-xs">
                 <div><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Nama Karyawan</span><b className="text-slate-800">{viewPayslip.initial_users?.name}</b></div>
                 <div><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Nomor NIK</span><b className="text-slate-800">{viewPayslip.initial_users?.nik}</b></div>
                 <div><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Posisi Jabatan</span><b className="text-slate-800">{viewPayslip.initial_users?.position}</b></div>
                 <div><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Area Penempatan</span><b className="text-slate-800">{viewPayslip.site_location || 'Pusat (HO)'}</b></div>
               </div>
               
               <div className="border-t border-slate-200 pt-4 mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-600">Gaji Pokok Utama</span>
                    <span className="text-sm font-black text-slate-800">{formatRupiah(viewPayslip.base_salary)}</span>
                  </div>
                  
                  {(viewPayslip.custom_details || []).map((comp, i) => (
                    <div key={i} className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-600">{comp.type === 'earning' ? '(+) ' : '(-) '}{comp.name}</span>
                      <span className={`text-xs font-black ${comp.type === 'earning' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {comp.type === 'earning' ? '+' : '-'}{formatRupiah(comp.amount)}
                      </span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
               <span className="text-xs font-black uppercase tracking-widest">Take Home Pay</span>
               <span className="text-2xl font-black">{formatRupiah(viewPayslip.net_salary)}</span>
            </div>
            
            <button onClick={() => setViewPayslip(null)} className="absolute top-4 right-4 bg-slate-200/50 text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors"><X size={16}/></button>
          </div>
        </div>
      )}

      {/* MODAL INPUT CASHFLOW MANUAL (BULK/MULTIPLE ROWS) */}
      {showCashflowModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 bg-emerald-600 text-white flex justify-between items-center shrink-0">
              <div><h3 className="font-black text-lg tracking-tight">Input Transaksi Kas Manual</h3></div>
              <button onClick={() => setShowCashflowModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSaveCashflow} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex gap-2 items-center text-emerald-800 mb-2">
                <MapPin size={16} className="shrink-0"/>
                <p className="text-[10px] font-bold">Data kas ini akan diinput secara otomatis untuk penempatan: <b>{userLocation}</b></p>
              </div>
              
              <div className="space-y-3">
                {cashflowItems.map((item) => (
                   <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 md:p-3 rounded-xl border border-slate-200 relative">
                     {cashflowItems.length > 1 && (
                       <button type="button" onClick={() => removeCashflowItem(item.id)} className="md:hidden absolute top-2 right-2 text-red-500 p-1 bg-red-100 rounded-md"><X size={14}/></button>
                     )}
                     <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Tanggal</label>
                       <input required type="date" value={item.transaction_date} onChange={e => updateCashflowItem(item.id, 'transaction_date', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-emerald-500" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Tipe</label>
                       <select required value={item.transaction_type} onChange={e => updateCashflowItem(item.id, 'transaction_type', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-emerald-500">
                          <option value="EXPENSE">Pengeluaran (-)</option>
                          <option value="INCOME">Pemasukan (+)</option>
                       </select>
                     </div>
                     <div className="md:col-span-3">
                       <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Kategori / Judul</label>
                       <input required type="text" placeholder="Cth: ATK, Seragam" value={item.category} onChange={e => updateCashflowItem(item.id, 'category', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-emerald-500" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Nominal (Rp)</label>
                       <input required type="number" min="0" value={item.amount} onChange={e => updateCashflowItem(item.id, 'amount', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-black text-emerald-600 text-xs outline-none focus:border-emerald-500" />
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Keterangan Tambahan</label>
                       <input type="text" placeholder="Opsional" value={item.description} onChange={e => updateCashflowItem(item.id, 'description', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-xs outline-none focus:border-emerald-500" />
                     </div>
                     <div className="hidden md:flex md:col-span-1 justify-center pb-0.5">
                       <button type="button" onClick={() => removeCashflowItem(item.id)} disabled={cashflowItems.length === 1} className={`p-2 rounded-lg transition-colors ${cashflowItems.length === 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-red-500 bg-red-100 hover:bg-red-200'}`}><Trash2 size={16}/></button>
                     </div>
                   </div>
                ))}
              </div>
              
              <button type="button" onClick={addCashflowItem} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 font-black text-xs rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                <Plus size={14}/> Tambah Baris Transaksi
              </button>
              
              <div className="pt-4 flex gap-3 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setShowCashflowModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 text-white font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"><Save size={16}/> {isSubmitting ? 'Menyimpan...' : `Simpan ${cashflowItems.length} Transaksi`}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT PAYROLL MANUAL */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
              <div><h3 className="font-black text-lg tracking-tight">Buat Slip Gaji Karyawan</h3><p className="text-[10px] text-blue-100 font-medium mt-0.5">Tambah komponen gaji & potongan sesuka hati.</p></div>
              <button onClick={() => setShowPayrollModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSavePayroll} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Users size={12}/> Pilih Karyawan</label>
                  <select required value={payrollForm.user_id} onChange={e => setPayrollForm({...payrollForm, user_id: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 text-slate-700">
                    <option value="" disabled>-- Pilih Karyawan --</option>
                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name} (Penempatan: {emp.site_location})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Periode Bulan</label>
                  <input required type="month" value={payrollForm.period_month} onChange={e => setPayrollForm({...payrollForm, period_month: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Gaji Pokok Utama (Rp)</label>
                  <input required type="number" min="0" value={payrollForm.base_salary} onChange={e => setPayrollForm({...payrollForm, base_salary: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* RENDER KOMPONEN CUSTOM */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex justify-between">Komponen Kustom</h4>
                 {customComponents.map((comp) => (
                    <div key={comp.id} className="flex items-center gap-2">
                       <input type="text" placeholder="Nama (Cth: Lembur)" value={comp.name} onChange={e => updateComponent(comp.id, 'name', e.target.value)} className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500" required/>
                       <input type="number" min="0" placeholder="Nominal (Rp)" value={comp.amount} onChange={e => updateComponent(comp.id, 'amount', e.target.value)} className={`w-1/3 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 ${comp.type === 'earning' ? 'text-blue-600' : 'text-red-600'}`} required/>
                       <span className="text-[10px] font-black text-slate-400 w-6 text-center">{comp.type === 'earning' ? '(+)' : '(-)'}</span>
                       <button type="button" onClick={() => removeComponent(comp.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                 ))}
                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => addComponent('earning')} className="flex-1 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-[10px] font-black uppercase tracking-wider">+ Pendapatan</button>
                    <button type="button" onClick={() => addComponent('deduction')} className="flex-1 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-[10px] font-black uppercase tracking-wider">- Potongan</button>
                 </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                 <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Est. Take Home Pay</span>
                 <span className="text-xl font-black text-blue-600">{formatRupiah(calculateNetSalary())}</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPayrollModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"><CreditCard size={16}/> {isSubmitting ? 'Memproses...' : 'Buat Slip Gaji'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT INVOICE MANUAL (BARU) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
            <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
              <div><h3 className="font-black text-lg tracking-tight">Terbitkan Tagihan (Invoice) Baru</h3></div>
              <button onClick={() => setShowInvoiceModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
                <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Sparkles size={14}/> Auto-Generate dari Payroll Lunas</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-blue-700 uppercase mb-1">Pilih Site Area</label>
                    <select id="autoInvSite" className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500">
                        <option value="">-- Pilih Site --</option>
                        {uniqueDivisions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-blue-700 uppercase mb-1">Periode Gaji (Bulan)</label>
                    <input type="month" id="autoInvPeriod" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-1">
                    <button type="button" onClick={() => {
                        const site = document.getElementById('autoInvSite').value;
                        const period = document.getElementById('autoInvPeriod').value;
                        if(!site || !period) return alert('Pilih site dan periode terlebih dahulu!');
                        
                        const sitePayrolls = payrolls.filter(p => p.site_location === site && p.period_month === period && p.status === 'PAID');
                        if(sitePayrolls.length === 0) return alert('Tidak ada slip gaji berstatus LUNAS (PAID) untuk area dan periode tersebut.');
                        
                        const totalNet = sitePayrolls.reduce((sum, p) => sum + Number(p.net_salary), 0);
                        const margin = totalNet * 0.1; // Default Management Fee 10%
                        const totalInvoice = totalNet + margin;
                        
                        setInvoiceForm({
                          ...invoiceForm,
                          client_name: site,
                          site_location: site,
                          total_amount: totalInvoice,
                          notes: `Tagihan Layanan & Operasional Area: ${site}\nPeriode: ${period}\n\nRincian:\n- Total Personel: ${sitePayrolls.length} Orang\n- Total Biaya Gaji (Payroll): Rp ${formatRupiah(totalNet)}\n- Management Fee (10%): Rp ${formatRupiah(margin)}\n\nPembayaran harap ditransfer secara penuh sebelum jatuh tempo.`
                        });
                        alert('Berhasil menarik data payroll ke form Invoice! Silakan edit nominal atau catatan jika diperlukan sebelum diterbitkan.');
                    }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm h-[34px]">Tarik Data</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Klien / Perusahaan Tujuan</label>
                  <input required type="text" value={invoiceForm.client_name} onChange={e => setInvoiceForm({...invoiceForm, client_name: e.target.value})} placeholder="Cth: PT. JS CORP BOYOLALI SEC" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Penempatan Area (Opsional)</label>
                  <input type="text" value={invoiceForm.site_location} onChange={e => setInvoiceForm({...invoiceForm, site_location: e.target.value})} placeholder="Cth: Boyolali" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tanggal Terbit</label>
                  <input required type="date" value={invoiceForm.issue_date} onChange={e => setInvoiceForm({...invoiceForm, issue_date: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Jatuh Tempo (Due Date)</label>
                  <input required type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm({...invoiceForm, due_date: e.target.value})} className="w-full px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl font-bold text-red-600 text-sm outline-none focus:border-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Total Tagihan (Rp)</label>
                  <input required type="number" min="0" value={invoiceForm.total_amount} onChange={e => setInvoiceForm({...invoiceForm, total_amount: e.target.value})} placeholder="Masukkan Total Bersih + Margin" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600 text-lg outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Catatan Tambahan / Rekening Tujuan</label>
                  <textarea rows="3" value={invoiceForm.notes} onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})} placeholder="Pembayaran harap ditransfer ke Bank..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none focus:border-blue-500 resize-none"></textarea>
                </div>
              </div>

              <div className="pt-2 flex gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"><Save size={16}/> {isSubmitting ? 'Memproses...' : 'Terbitkan Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL & TEMPLATE CETAK INVOICE (STANDAR ACCURATE PROFESSIONAL) */}
      {/* ========================================================= */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4 print:p-0 print:bg-transparent print:block print:relative print:z-auto">
          
          {/* Kontainer Utama */}
          <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col relative print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:border-none print:block">
            
            {/* Header Aksi (Hanya Tampil di Layar, Hilang Saat Print) */}
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center z-10 print:hidden">
               <h3 className="font-black text-slate-800 flex items-center gap-2">
                 <FileText size={18} className="text-blue-600"/> Pratinjau Invoice Resmi
               </h3>
               <div className="flex gap-2">
                  <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all">
                    <Printer size={16}/> Cetak / Simpan PDF
                  </button>
                  <button onClick={() => setViewInvoice(null)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                    <X size={16}/> Tutup
                  </button>
               </div>
            </div>

            {/* KERTAS INVOICE (Area yang Akan Dicetak) */}
            <div id="official-invoice-print" className="p-8 md:p-12 bg-white text-slate-900 print:p-0 print:m-0">
               
               {/* 1. Header Perusahaan & Tulisan INVOICE */}
               <div className="flex justify-between items-start border-b-[3px] border-slate-800 pb-6 mb-6">
                  <div className="max-w-sm">
                     <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">{sysConfig?.brandName || 'SYNTEGRA SERVICES'}</h1>
                     <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                       Gedung Perkantoran Pusat, Lantai 3<br/>
                       Jl. Jalur Utama No. 123, Banten, Indonesia<br/>
                       Telp: (021) 1234-5678 | Email: finance@syntegra.co.id
                     </p>
                  </div>
                  <div className="text-right">
                     <h2 className="text-4xl font-black text-blue-800 tracking-tighter mb-3">FAKTUR / INVOICE</h2>
                     <table className="text-xs text-left ml-auto border-collapse">
                       <tbody>
                         <tr><td className="py-1 pr-4 font-bold text-slate-500">No. Invoice</td><td className="py-1 font-black text-slate-800">: {viewInvoice.invoice_number}</td></tr>
                         <tr><td className="py-1 pr-4 font-bold text-slate-500">Tanggal Faktur</td><td className="py-1 font-bold text-slate-800">: {viewInvoice.issue_date}</td></tr>
                         <tr><td className="py-1 pr-4 font-bold text-slate-500">Jatuh Tempo</td><td className="py-1 font-black text-red-600">: {viewInvoice.due_date}</td></tr>
                       </tbody>
                     </table>
                  </div>
               </div>

               {/* 2. Info Klien (Bill To) */}
               <div className="mb-8">
                  <div className="bg-slate-100 px-3 py-1.5 border-l-4 border-blue-600 w-max mb-3">
                     <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Tagihan Kepada (Bill To):</h3>
                  </div>
                  <div className="pl-1">
                     <h4 className="text-lg font-black text-slate-900 uppercase">{viewInvoice.client_name}</h4>
                     <p className="text-sm text-slate-600 mt-1 font-medium">Area Penempatan / Site: <span className="font-bold text-slate-800">{viewInvoice.site_location || '-'}</span></p>
                  </div>
               </div>

               {/* 3. Tabel Rincian Standard Accurate */}
               <div className="min-h-[200px]">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider">
                       <th className="py-3 px-4 border border-slate-800 font-bold w-12 text-center">No</th>
                       <th className="py-3 px-4 border border-slate-800 font-bold">Deskripsi Layanan & Item</th>
                       <th className="py-3 px-4 border border-slate-800 font-bold w-20 text-center">Qty</th>
                       <th className="py-3 px-4 border border-slate-800 font-bold w-36 text-right">Harga Satuan</th>
                       <th className="py-3 px-4 border border-slate-800 font-bold w-40 text-right">Total Jumlah</th>
                     </tr>
                   </thead>
                   <tbody className="text-sm">
                     {/* Baris Isi Data */}
                     <tr className="border-b border-slate-300 align-top">
                       <td className="py-4 px-4 border-x border-slate-300 text-center font-bold text-slate-600">1</td>
                       <td className="py-4 px-4 border-x border-slate-300">
                          <p className="font-bold text-slate-800">Biaya Manajemen & Operasional Pengamanan</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">Periode layanan sesuai dengan tagihan BAST berjalan.</p>
                       </td>
                       <td className="py-4 px-4 border-x border-slate-300 text-center font-medium">1 Ls</td>
                       <td className="py-4 px-4 border-x border-slate-300 text-right font-medium">{formatRupiah(viewInvoice.total_amount)}</td>
                       <td className="py-4 px-4 border-x border-slate-300 text-right font-bold text-slate-900">{formatRupiah(viewInvoice.total_amount)}</td>
                     </tr>
                     {/* Baris Kosong (Agar tabel membentang ke bawah persis faktur sungguhan) */}
                     <tr className="h-16">
                       <td className="border-x border-b border-slate-300"></td>
                       <td className="border-x border-b border-slate-300"></td>
                       <td className="border-x border-b border-slate-300"></td>
                       <td className="border-x border-b border-slate-300"></td>
                       <td className="border-x border-b border-slate-300"></td>
                     </tr>
                   </tbody>
                 </table>
               </div>

               {/* 4. Kalkulasi Total & Keterangan Bank */}
               <div className="flex flex-col md:flex-row justify-between items-start mt-6 gap-8 page-break-inside-avoid">
                  
                  {/* Kiri: Keterangan / Rekening */}
                  <div className="w-full md:w-7/12">
                     <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                       <h4 className="text-xs font-black text-slate-700 uppercase mb-2">Informasi Pembayaran:</h4>
                       <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                         {viewInvoice.notes || "Mohon lakukan pembayaran penuh sebelum jatuh tempo melalui transfer ke rekening berikut:\n\nBank: MANDIRI\nNo. Rek: 123-456-7890\nAtas Nama: PT. SYNTEGRA SERVICES"}
                       </p>
                     </div>
                  </div>
                  
                  {/* Kanan: Kalkulasi Matematika */}
                  <div className="w-full md:w-5/12">
                     <table className="w-full text-sm border-collapse">
                       <tbody>
                         <tr>
                           <td className="py-2 px-4 font-bold text-slate-600 border-b border-slate-300">Subtotal</td>
                           <td className="py-2 px-4 font-bold text-slate-900 text-right border-b border-slate-300">{formatRupiah(viewInvoice.total_amount)}</td>
                         </tr>
                         <tr>
                           <td className="py-2 px-4 font-bold text-slate-600 border-b border-slate-300">PPN (11%)</td>
                           {/* Jika nanti sistem Anda pakai PPN, masukkan variabelnya disini, sementara statis 0 menyesuaikan format Anda */}
                           <td className="py-2 px-4 font-bold text-slate-900 text-right border-b border-slate-300">Rp 0</td>
                         </tr>
                         <tr className="bg-slate-800 text-white">
                           <td className="py-3 px-4 font-black uppercase tracking-wider text-sm border border-slate-800">Total Tagihan</td>
                           <td className="py-3 px-4 font-black text-right text-base border border-slate-800">{formatRupiah(viewInvoice.total_amount)}</td>
                         </tr>
                       </tbody>
                     </table>
                  </div>
               </div>

               {/* 5. Tanda Tangan Otorisasi */}
               <div className="flex justify-between items-end mt-16 pt-8 page-break-inside-avoid">
                  <div className="text-center w-48">
                     <p className="text-xs font-bold text-slate-500 mb-20">Diterima Oleh,</p>
                     <p className="border-b border-slate-400 mb-1.5"></p>
                     <p className="text-xs font-bold text-slate-700">Nama Lengkap & Cap Perusahaan</p>
                  </div>
                  <div className="text-center w-48">
                     <p className="text-xs font-bold text-slate-500 mb-20">Hormat Kami,</p>
                     <p className="border-b border-slate-800 mb-1.5 font-black text-slate-900">Finance & Accounting</p>
                     <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{sysConfig?.brandName || 'SYNTEGRA SERVICES'}</p>
                  </div>
               </div>
               
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `        
        @media print {
          /* Atur ukuran kertas dan hilangkan margin default browser */
          @page { size: A4 portrait; margin: 0; }
          
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          
          /* Sembunyikan elemen background dan navigasi */
          #root > div > aside, 
          #root > div > main,
          .print\\:hidden {
            display: none !important;
          }
          
          /* KUNCI PERBAIKAN MIRING: Hancurkan posisi tengah (flex/fixed) pada modal */
          .fixed.inset-0 {
            position: relative !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* KUNCI PERBAIKAN UKURAN: Lepas batasan lebar max-w-4xl agar full A4 */
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }

          /* Hilangkan bayangan & lengkungan pada kertas */
          .shadow-2xl, .rounded-2xl {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          
          /* Beri padding/jarak aman standar kertas fisik (15mm) */
          #official-invoice-print {
            padding: 15mm !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* PASTIKAN WARNA KELUAR DI KERTAS / PDF */
          .bg-slate-800 { background-color: #1e293b !important; color: white !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-blue-600 { background-color: #2563eb !important; color: white !important; }
          .text-blue-800 { color: #1e40af !important; }
          .text-red-600 { color: #dc2626 !important; }
          
          .border-slate-800 { border-color: #1e293b !important; }
          .border-blue-600 { border-color: #2563eb !important; }
          
          .page-break-inside-avoid {
             page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
};

export default FinanceDashboard;