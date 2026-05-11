import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Camera, LayoutDashboard, CheckSquare, Users, Plus, LogOut, Clock, CheckCircle2, AlertCircle,
  Search, Menu, X, ChevronDown, ChevronRight, MessageSquare, Paperclip, Send, FileText,
  Image as ImageIcon, BarChart3, Download, Calendar, TrendingUp, Briefcase, Printer,
  ShieldCheck, Building, Activity, Settings, UserPlus, Edit, Trash2, Bell, Lock, Check, Filter
} from 'lucide-react';

// --- KUNCI SUPABASE LANGSUNG DIMASUKKAN KE SINI ---
const supabaseUrl = 'https://vkqrbcyowakcnnqhceyi.supabase.co';
const supabaseKey = 'sb_publishable_aeI9Lp8G41z7jikyJ3MOcw_2peTH6w5';
const supabase = createClient(supabaseUrl, supabaseKey);
// ==========================================
// 2. KOMPONEN UI PENDUKUNG
// ==========================================
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type }) => {
  const styles = {
    high: 'bg-red-50 text-red-600 border-red-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    low: 'bg-blue-50 text-blue-600 border-blue-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    'in-progress': 'bg-indigo-50 text-indigo-600 border-indigo-200',
    'waiting-approval': 'bg-orange-100 text-orange-700 border-orange-300 animate-pulse', // Animasi berkedip
    done: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    overdue: 'bg-red-600 text-white border-red-700 font-bold', // Merah pekat
    admin: 'bg-slate-800 text-white border-slate-900',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-black tracking-widest uppercase border shadow-sm whitespace-nowrap ${styles[String(type)] || 'bg-gray-100'}`}>
      {children}
    </span>
  );
};

// ==========================================
// 3. KOMPONEN UTAMA APLIKASI
// ==========================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]); 
  const [notifications, setNotifications] = useState([]); 
  const [divisions, setDivisions] = useState([]);
  
  const [sysConfig, setSysConfig] = useState({ brandName: 'SYNTEGRA SERVICES', autoEmail: false, maintenanceMode: false });
  const [configForm, setConfigForm] = useState(sysConfig); 

  const [loginNik, setLoginNik] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeChatId, setActiveChatId] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDivMenuOpen, setIsDivMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newDivName, setNewDivName] = useState('');
  
  const [selectedDivision, setSelectedDivision] = useState('Semua Divisi');
  const [dashDivFilter, setDashDivFilter] = useState('Semua Divisi');
  const [reportTargetUserId, setReportTargetUserId] = useState('ALL'); 

  const [taskFilterMonth, setTaskFilterMonth] = useState('');
  const [taskFilterDate, setTaskFilterDate] = useState('');
  const [reportFilterMonth, setReportFilterMonth] = useState('');
  
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isUploading, setIsUploading] = useState(false);

  const [isMassUserModalOpen, setIsMassUserModalOpen] = useState(false);
  const [massUsersData, setMassUsersData] = useState([
    { nik: '', password: '', name: '', role: 'staff', division: '', position: '' },
    { nik: '', password: '', name: '', role: 'staff', division: '', position: '' },
    { nik: '', password: '', name: '', role: 'staff', division: '', position: '' }
  ]);


  // --- FUNGSI UPLOAD LAMPIRAN KE SUPABASE STORAGE ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return alert('Format file ditolak! Mohon hanya unggah file JPG, PNG, atau PDF.');
    }

    // NYALAKAN LOADING
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${currentUser.id}.${fileExt}`;

      // Upload ke bucket 'task-attachments' di Supabase
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Ambil URL Publik
      const { data: publicUrlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      const newAttachment = {
        id: Date.now(),
        name: file.name,
        url: publicUrlData.publicUrl,
        type: file.type,
        uploaderId: currentUser.id
      };

      const currentAttachments = Array.isArray(selectedTask.attachments) ? selectedTask.attachments : [];
      const updatedAttachments = [...currentAttachments, newAttachment];

      // Update tabel tasks
      const { error: updateError } = await supabase
        .from('initial_tasks')
        .update({ attachments: updatedAttachments })
        .eq('id', selectedTask.id);

      if (updateError) throw updateError;

      const updatedTask = { ...selectedTask, attachments: updatedAttachments };
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));

    } catch (err) {
      alert('Error terhubung ke server saat upload: ' + err.message);
      console.error(err);
    } finally {
      // MATIKAN LOADING (Baik saat berhasil maupun gagal)
      setIsUploading(false);
      e.target.value = ''; 
    }
  };

  // --- FUNGSI HAPUS MASSAL ---
  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedUsers.length} pengguna secara massal? Data tidak dapat dikembalikan.`)) return;

    try {
      const { error } = await supabase
        .from('initial_users')
        .delete()
        .in('id', selectedUsers);
      
      if (!error) {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]); 
        alert(`${selectedUsers.length} Pengguna berhasil dihapus!`);
      } else {
        alert('Gagal menghapus: ' + error.message);
      }
    } catch (error) {
      alert('Gagal terhubung ke server database.');
      console.error(error);
    }
  };

  const handleSelectAllUsers = (e, filteredUsers) => {
    if (e.target.checked) {
      setSelectedUsers(filteredUsers.filter(u => u.role !== 'admin').map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // --- FUNGSI HAPUS LAMPIRAN DARI DATABASE ---
  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`Yakin ingin menghapus dokumen "${fileName}"?`)) return;

    try {
      const filtered = (selectedTask.attachments || []).filter(a => a.id !== attachmentId);
      
      const { error } = await supabase
        .from('initial_tasks')
        .update({ attachments: filtered })
        .eq('id', selectedTask.id);
      
      if(!error) {
        const updatedTask = { ...selectedTask, attachments: filtered };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      } else {
        alert('Gagal menghapus: ' + error.message);
      }
    } catch (err) {
      alert('Gagal terhubung ke server saat hapus file.');
    }
  };

  // --- FUNGSI KIRIM CHAT ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const targetTaskId = (activeTab === 'chat' && activeChatId) ? activeChatId : selectedTask?.id;
    if (!targetTaskId) return;

    const commentObj = { 
      id: Date.now(), 
      userId: currentUser?.id, 
      text: newComment, 
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) 
    };

    let updatedCommentsArray = [];

    const targetTask = tasks.find(t => t.id === targetTaskId);
    if (!targetTask) return;

    const currentComments = Array.isArray(targetTask.comments) ? targetTask.comments : [];
    updatedCommentsArray = [...currentComments, commentObj];

    // Update state local
    const updatedTask = { ...targetTask, comments: updatedCommentsArray };
    setTasks(tasks.map(t => t.id === targetTaskId ? updatedTask : t));
    setNewComment('');

    if (selectedTask && selectedTask.id === targetTaskId) {
        setSelectedTask(updatedTask);
    }

    // Kirim Notifikasi
    const relevantUserIds = new Set([...getAssigneesArray(targetTask.assignedTo), targetTask.assignedBy]);
    relevantUserIds.forEach(targetUserId => {
      if (targetUserId && targetUserId !== currentUser.id) {
          addNotification(targetUserId, 'chat', `Pesan baru dari ${currentUser.name} di tugas: "${targetTask.title}"`, targetTask.id);
      }
    });

    // Proses ke Supabase
    try {
      await supabase
        .from('initial_tasks')
        .update({ comments: updatedCommentsArray })
        .eq('id', targetTaskId);
    } catch (err) {
      console.error("Koneksi error saat simpan chat", err);
    }
  };

  // --- FUNGSI SIMPAN PENGATURAN KE DATABASE ---
  const handleSaveConfig = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({
           brand_name: configForm.brandName,
           auto_email: configForm.autoEmail,
           maintenance_mode: configForm.maintenanceMode
        })
        .eq('id', 1);
      
      if (!error) {
        setSysConfig(configForm); 
        alert('Pengaturan sistem berhasil disimpan permanen!');
      } else {
        alert('Gagal menyimpan pengaturan: ' + error.message);
      }
    } catch (error) {
      alert('Error gagal terhubung ke server saat menyimpan pengaturan.');
    }
  };

  // --- LOGIKA UPDATE STATUS (SISI STAFF) ---
  const handleStatusUpdate = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const assignees = getAssigneesArray(task.assignedTo);
    
    // Deteksi Tugas Mandiri: Saya yang buat, saya yang ngerjain sendirian
    const isSelfTask = assignees.length === 1 && 
                       String(assignees[0]) === String(currentUser.id) && 
                       String(task.assignedBy) === String(currentUser.id);

    let statusToSave = newStatus;
    
    // Jika STAFF klik 'done' tapi ini BUKAN tugas mandiri -> masuk ke approval
    if (newStatus === 'done' && currentUser.role === 'staff' && !isSelfTask) {
      statusToSave = 'waiting-approval';
      alert("Tugas dikirim untuk menunggu persetujuan.");
    }

    try {
      const updatePayload = { status: statusToSave };
      
      // Jika tugas Selesai (karena mandiri atau diubah admin), catat tanggal & siapa yang selesaikan
      if (statusToSave === 'done') {
        updatePayload.completed_at = new Date().toISOString().split('T')[0];
        updatePayload.approved_by = currentUser.id; // Catat siapa yang klik selesai
      }

      const { error } = await supabase
        .from('initial_tasks')
        .update(updatePayload)
        .eq('id', taskId);
      
      if (!error) {
        loadTasksFromDB();
      } else {
        alert("Gagal mengupdate database: Cek apakah Supabase mengizinkan status baru ini.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- LOGIKA APPROVAL (SISI PEMBERI TUGAS / ADMIN) ---
  const handleApproveTask = async (taskId, isApproved) => {
    const finalStatus = isApproved ? 'done' : 'in-progress';
    const today = new Date().toISOString().split('T')[0];

    try {
      const updatePayload = { 
        status: finalStatus,
        completed_at: isApproved ? today : null,
        approved_by: isApproved ? currentUser.id : null // Catat ID si pemberi approval
      };

      const { error } = await supabase
        .from('initial_tasks')
        .update(updatePayload)
        .eq('id', taskId);
      
      if (!error) {
        alert(isApproved ? "Berhasil di-approve!" : "Tugas dikembalikan untuk direvisi.");
        loadTasksFromDB();
        // Update tampilan modal seketika
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, ...updatePayload });
        }
      } else {
        alert("Gagal memproses: " + error.message);
      }
    } catch (error) {
      alert("Koneksi bermasalah.");
    }
  };

  // --- FUNGSI HAPUS TUGAS (KHUSUS ADMIN) ---
  const handleDeleteTask = async (taskId, taskTitle) => {
    if (currentUser.role !== 'admin') {
      return alert("Akses ditolak. Hanya Admin yang dapat menghapus tugas.");
    }
    
    // Popup Konfirmasi sebelum menghapus
    if (!window.confirm(`PERINGATAN: Yakin ingin menghapus tugas "${taskTitle}"?\n\nData tugas, riwayat chat, dan lampiran tidak dapat dikembalikan jika sudah dihapus.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('initial_tasks')
        .delete()
        .eq('id', taskId);

      if (!error) {
        alert("Tugas berhasil dihapus permanen!");
        
        // Hilangkan tugas dari layar secara otomatis tanpa harus refresh halaman
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
        
        // Tutup modal pop-up secara otomatis jika sedang dibuka
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(null);
        }
      } else {
        alert("Gagal menghapus tugas: " + error.message);
      }
    } catch (err) {
      alert("Gagal terhubung ke database saat menghapus tugas.");
      console.error(err);
    }
  };

  const loadTasksFromDB = async () => {
    try {
      const { data, error } = await supabase.from('initial_tasks').select('*').order('id', { ascending: false });
      if (data) {
        setTasks(data);
        if (currentUser) {
          const myUnfinishedTasks = data.filter(t => 
            t.status !== 'done' && getAssigneesArray(t.assignedTo).includes(currentUser.id)
          );

          if (myUnfinishedTasks.length > 0) {
            setNotifications(prev => {
              let currentNotifs = [...prev];
              myUnfinishedTasks.forEach(task => {
                const isAlreadyNotified = currentNotifs.some(n => n.taskId === task.id && !n.read);
                if (!isAlreadyNotified) {
                  currentNotifs.unshift({
                    id: Date.now() + Math.random(),
                    userId: currentUser.id,
                    type: 'reminder',
                    message: `PENGINGAT: Tugas "${task.title}" belum dikerjakan!`, 
                    read: false,
                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    taskId: task.id
                  });
                }
              });
              return currentNotifs;
            });
          }
        }
      }
    } catch (error) {
      console.error('Gagal mengambil data tasks:', error);
      setTasks([]);
    }
  }
  
  useEffect(() => {
    if (currentUser) {
      loadTasksFromDB();
      
      const fetchNotifications = async () => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('userId', currentUser.id)
            .order('id', { ascending: false });
            
          if (data) {
             // Mapping read_status ke read untuk UI
            setNotifications(data.map(n => ({...n, read: n.read_status})));
          }
        } catch (error) {
          console.error("Gagal menarik notifikasi:", error);
        }
      };
      fetchNotifications();
    }
  }, [currentUser]);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [newComment, setNewComment] = useState(''); 
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: [], priority: 'medium', dueDate: '' });
  const [newUser, setNewUser] = useState({ nik: '', password: '', name: '', role: 'staff', division: '', position: '' });

  const chatEndRef = useRef(null);

  useEffect(() => {
    const activeSession = localStorage.getItem('syntegra_user_session');
    if (activeSession) {
      setCurrentUser(JSON.parse(activeSession)); 
    }

    const savedNik = localStorage.getItem('syntegra_saved_nik');
    const savedPassword = localStorage.getItem('syntegra_saved_password');
    
    if(savedNik && savedPassword) { 
      setLoginNik(savedNik); 
      setLoginPassword(savedPassword);
      setRememberMe(true); 
    } else if (savedNik) {
      setLoginNik(savedNik);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (selectedTask) {
      setNotifications(prev => prev.filter(n => n.taskId !== selectedTask.id));
    }
  }, [selectedTask]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (data) {
          const mappedSettings = {
            brandName: data.brand_name,
            autoEmail: data.auto_email,
            maintenanceMode: data.maintenance_mode
          };
          setSysConfig(mappedSettings);
          setConfigForm(mappedSettings); 
        }
      } catch (error) {
        console.error("Gagal menarik pengaturan sistem", error);
      }
    };
    fetchSettings();
  }, []); 

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTask?.comments]);

  useEffect(() => {
    const fetchInitialGlobalData = async () => {
      try {
        const { data, error } = await supabase.from('initial_users').select('*');
        if (data) {
          const processedUsers = data.map(u => {
            const nameParts = (u.name || 'User').trim().split(/\s+/);
            const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return { ...u, avatar: initials };
          });
          setUsers(processedUsers);
        }
      } catch (error) {
        console.error('Gagal mengambil data users:', error);
      }
    };
    fetchInitialGlobalData();
  }, []);

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const { data, error } = await supabase.from('initial_divisions').select('*');
        if (data) {
          const defaultDivs = ['Pusat', 'Direksi'];
          const dbDivs = data.map(d => d.name);
          setDivisions([...new Set([...defaultDivs, ...dbDivs])]);
        }
      } catch (error) {
        console.error("Gagal ambil divisi:", error);
      }
    };
    fetchDivisions();
  }, []);

  const getAssigneesArray = (assignedTo) => {
    if (!assignedTo) return [];
    if (typeof assignedTo === 'string') {
      try { return JSON.parse(assignedTo).map(Number); } catch (e) { return [Number(assignedTo)]; }
    }
    return Array.isArray(assignedTo) ? assignedTo.map(Number) : [Number(assignedTo)];
  };
  const getUserName = (id) => users.find(u => u.id === id)?.name || 'Unknown';
  const getAvatar = (id) => users.find(u => u.id === id)?.avatar || '??';
  const getAssigneesNames = (assignedTo) => getAssigneesArray(assignedTo).map(id => getUserName(id)).filter(name => name !== 'Unknown').join(', ') || 'Belum Ada';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
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

      if (sysConfig.maintenanceMode && user.role !== 'admin') {
        return setLoginError('Sistem sedang maintenance. Akses ditolak.');
      }
      
      localStorage.setItem('syntegra_user_session', JSON.stringify(user));
      if(rememberMe) {
        localStorage.setItem('syntegra_saved_nik', loginNik);
        localStorage.setItem('syntegra_saved_password', loginPassword);
      } else {
        localStorage.removeItem('syntegra_saved_nik');
        localStorage.removeItem('syntegra_saved_password');
      }

      setCurrentUser(user);
      setActiveTab('dashboard');
      setLoginError('');
      
    } catch (error) {
      setLoginError('Gagal terhubung ke database.');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('syntegra_user_session');
    setCurrentUser(null);
    setMobileMenuOpen(false);
    setSelectedTask(null);
    setActiveTab('dashboard');
  };

  const navigateTo = (tab, customAction = null) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setSelectedTask(null); 
    if (customAction) customAction();
  };

  const addNotification = async (userId, type, message, taskId) => {
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const newNotif = { id: Date.now(), userId, type, message, read: false, time: timeNow, taskId };
    setNotifications(prev => [newNotif, ...prev]);

    try {
      await supabase.from('notifications').insert([{
        userId: userId, type: type, message: message, time: timeNow, taskId: taskId, read_status: false
      }]);
    } catch (error) {
      console.error('Gagal simpan notifikasi ke DB', error);
    }
  };

  // --- STATE UNTUK ANIMASI LOADING TUGAS BARU ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FUNGSI SIMPAN TUGAS ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    const assignedUserIds = currentUser.role === 'staff' ? [currentUser.id] : newTask.assignedTo;
    if (currentUser.role !== 'staff' && assignedUserIds.length === 0) return alert("Pilih minimal satu anggota atau tim!");

    setIsSubmitting(true); // MULAI ANIMASI LOADING

    const taskData = {
      title: newTask.title,
      description: newTask.description,
      assignedTo: assignedUserIds,
      assignedBy: currentUser.id,
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      status: 'pending',
      comments: [],
      attachments: []
    };

    try {
      const { error } = await supabase.from('initial_tasks').insert([taskData]);
      
      if (!error) {
        setIsModalOpen(false);
        setNewTask({ title: '', description: '', assignedTo: [], priority: 'medium', dueDate: '' });
        loadTasksFromDB(); 
      } else {
        alert("Gagal menyimpan: " + error.message);
      }
    } catch (error) {
      alert("Error gagal terhubung ke server.");
      console.error(error);
    } finally {
      setIsSubmitting(false); // MATIKAN ANIMASI LOADING (baik sukses maupun gagal)
    }
  };

  const handleAddDivision = async () => {
    if(!newDivName.trim()) return;
    try {
      const { error } = await supabase.from('initial_divisions').insert([{ name: newDivName.trim() }]);
      if (!error) {
        setDivisions([...divisions, newDivName.trim()]);
        setNewDivName('');
      } else {
        alert("Gagal tambah divisi: " + error.message);
      }
    } catch (error) {
      alert("Koneksi server terputus.");
    }
  };

  const handleDeleteDivision = async (divName) => {
    if(!window.confirm(`Hapus divisi ${divName}?`)) return;
    try {
      const { error } = await supabase.from('initial_divisions').delete().eq('name', divName);
      if (!error) {
        setDivisions(divisions.filter(d => d !== divName));
      }
    } catch (error) {
      alert("Gagal menghapus.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // VALIDASI CEK DUPLIKAT (NIK atau Nama tidak boleh sama)
    const isExist = users.some(u => 
      u.nik === newUser.nik.trim() || 
      u.name.toLowerCase() === newUser.name.trim().toLowerCase()
    );

    if (isExist) {
      return alert(`Pendaftaran Dibatalkan!\nNIK atau Nama Karyawan "${newUser.name}" sudah terdaftar di sistem.`);
    }

    try {
      const nameParts = (newUser.name || 'User').trim().split(/\s+/);
      const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      const userToInsert = { ...newUser, avatar: initials };
      
      const { data, error } = await supabase.from('initial_users').insert([userToInsert]).select();
      
      if (!error && data) {
        setUsers([...users, data[0]]);
        setIsUserModalOpen(false);
        setNewUser({ nik: '', password: '', name: '', role: 'staff', division: '', position: '' });
        alert('Pengguna baru berhasil ditambahkan!');
      } else {
        alert('Gagal: ' + error?.message);
      }
    } catch (err) {
      alert('Gagal terhubung ke database.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const nameParts = (editingUser.name || 'User').trim().split(/\s+/);
      const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      const userToUpdate = { 
        name: editingUser.name, role: editingUser.role, division: editingUser.division, 
        position: editingUser.position, crossDivision: editingUser.crossDivision, avatar: initials
      };

      const { error } = await supabase.from('initial_users').update(userToUpdate).eq('id', editingUser.id);
      
      if (!error) {
        setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, avatar: initials } : u));
        setIsEditUserModalOpen(false);
        alert('Perubahan data berhasil disimpan!');
      } else {
        alert('Gagal mengupdate: ' + error.message);
      }
    } catch (err) {
      alert('Gagal terhubung ke server database.');
    }
  }; 

  const handleDeleteUser = async (userId) => {
    if(window.confirm('Yakin ingin menghapus user ini dari database?')) {
      try {
        const { error } = await supabase.from('initial_users').delete().eq('id', userId);
        if (!error) {
          setUsers(users.filter(u => u.id !== userId));
          alert('User berhasil dihapus!');
        } else {
          alert('Gagal menghapus user: ' + error.message);
        }
      } catch (error) {
        alert('Gagal terhubung ke database.');
      }
    }
  };
  
  const handleDownloadPDF = () => window.print();

  const handleDownloadTemplateCSV = () => {
    const headers = "nik,password,name,role,division,position\n";
    const sampleData = "STF099,password123,Nama Lengkap,staff,Pusat,Staff Keamanan\n";
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Format_Tambah_Massal_User.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleMassUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      return alert("Harap unggah file dengan format .csv");
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== ''); 
      
      const uniqueNewUsers = [];
      const duplicateNames = [];

      for(let i = 1; i < lines.length; i++) {
        const [nik, password, name, role, division, position] = lines[i].split(',');
        
        if (nik && name) {
          const uNik = nik.trim();
          const uName = name.trim();
          const nameParts = uName.split(/\s+/);
          const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();

          const isExistInDB = users.some(existing => existing.nik === uNik || existing.name.toLowerCase() === uName.toLowerCase());
          const isExistInBatch = uniqueNewUsers.some(newU => newU.nik === uNik || newU.name.toLowerCase() === uName.toLowerCase());

          if (isExistInDB || isExistInBatch) {
            duplicateNames.push(uName);
          } else {
            uniqueNewUsers.push({
              nik: uNik,
              password: password ? password.trim() : '123456',
              name: uName,
              role: role ? role.trim().toLowerCase() : 'staff',
              division: division ? division.trim() : 'Pusat',
              position: position ? position.trim() : '-',
              avatar: initials
            });
          }
        }
      }

      if (uniqueNewUsers.length === 0) {
        return alert("Upload dibatalkan!\nSemua data di dalam CSV (NIK/Nama) sudah terdaftar di sistem.");
      }

      try {
        const { data, error } = await supabase.from('initial_users').insert(uniqueNewUsers).select();
        
        if (!error && data) {
          setUsers([...users, ...data]);
          
          let msg = `Berhasil mengimpor ${uniqueNewUsers.length} pengguna dari CSV!`;
          if (duplicateNames.length > 0) {
            msg += `\n\nDIABAIKAN (${duplicateNames.length} data duplikat/sudah ada):\n- ${duplicateNames.join('\n- ')}`;
          }
          alert(msg);
        } else {
          alert("Gagal menyimpan ke database: " + error?.message);
        }
      } catch (err) { 
        alert("Gagal terhubung ke server database.");
      }
    };
    reader.readAsText(file); 
    e.target.value = ''; 
  };

  const handleMassChange = (index, field, value) => {
    const newData = [...massUsersData];
    newData[index][field] = value;
    setMassUsersData(newData);
  };

  const addMassRow = () => {
    setMassUsersData([...massUsersData, { nik: '', password: '', name: '', role: 'staff', division: '', position: '' }]);
  };

  const removeMassRow = (index) => {
    setMassUsersData(massUsersData.filter((_, i) => i !== index));
  };

  const handleSaveMassTable = async () => {
    const validUsers = massUsersData.filter(u => u.nik.trim() !== '' && u.name.trim() !== '');
    if (validUsers.length === 0) return alert("Isi minimal 1 data pengguna (NIK & Nama)!");

    // WADAH UNTUK MEMISAHKAN YANG BARU DAN YANG DUPLIKAT
    const uniqueNewUsers = [];
    const duplicateNames = [];

    validUsers.forEach(u => {
      const uNik = u.nik.trim();
      const uName = u.name.trim();

      // Cek apakah sudah ada di Database ATAU ada duplikat di dalam inputan itu sendiri
      const isExistInDB = users.some(existing => existing.nik === uNik || existing.name.toLowerCase() === uName.toLowerCase());
      const isExistInBatch = uniqueNewUsers.some(newU => newU.nik === uNik || newU.name.toLowerCase() === uName.toLowerCase());

      if (isExistInDB || isExistInBatch) {
        duplicateNames.push(uName); // Catat yang ditolak
      } else {
        uniqueNewUsers.push({
          nik: uNik,
          password: u.password.trim() || '123456',
          name: uName,
          role: u.role || 'staff',
          division: u.division || 'Pusat',
          position: u.position.trim() || '-',
          avatar: uName.substring(0,2).toUpperCase()
        });
      }
    });

    if (uniqueNewUsers.length === 0) {
      return alert("Upload dibatalkan!\nSemua data yang Anda masukkan (NIK/Nama) sudah terdaftar di sistem.");
    }

    try {
      const { data, error } = await supabase.from('initial_users').insert(uniqueNewUsers).select();
      
      if (!error && data) {
        setUsers([...users, ...data]);
        setIsMassUserModalOpen(false);
        
        // Pesan Dinamis jika ada yang diabaikan
        let msg = `Berhasil menyimpan ${uniqueNewUsers.length} pengguna!`;
        if (duplicateNames.length > 0) {
          msg += `\n\nDIABAIKAN (${duplicateNames.length} data duplikat/sudah ada):\n- ${duplicateNames.join('\n- ')}`;
        }
        alert(msg);
        
        // Reset form ke 3 baris kosong
        setMassUsersData([
          { nik: '', password: '', name: '', role: 'staff', division: '', position: '' },
          { nik: '', password: '', name: '', role: 'staff', division: '', position: '' },
          { nik: '', password: '', name: '', role: 'staff', division: '', position: '' }
        ]);
      } else {
        alert("Gagal: " + error?.message);
      }
    } catch (err) {
      alert("Gagal terhubung ke server database.");
    }
  };

  // --- RENDER LOGIN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-yellow-400 flex items-center justify-center p-4">
        <div className="absolute inset-0 z-0 opacity-5" style={{backgroundImage: `radial-gradient(#4f46e5 1px, transparent 1px)`, backgroundSize: `24px 24px`}}></div>
        <Card className="w-full max-w-md p-6 md:p-8 shadow-2xl shadow-indigo-100 border-0 bg-white/95 backdrop-blur-xl relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl transform hover:rotate-3 transition-transform">
              <img src="/Logo_apps.png" alt="Logo" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-yellow-500 tracking-tight uppercase">{sysConfig.brandName}<br/><span className="text-slate-800 text-lg md:text-xl">Task Management</span></h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Sistem Manajemen Kinerja Terpadu</p>
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
        </Card>
      </div>
    );
  }

  // ==========================================
  // LOGIKA HAK AKSES TINGKAT LANJUT (OCCUPATION)
  // ==========================================
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  const myTasks = safeTasks.filter(t => {
    if (!t) return false;
    
    const assignees = getAssigneesArray(t.assignedTo);
    const creator = users.find(u => u.id === t.assignedBy) || {};
    const assigneesData = assignees.map(id => users.find(u => u.id === id) || {});

    if (currentUser.role === 'admin') return true;

    if (currentUser.role === 'direksi') {
      const isTaskAdmin = creator.role === 'admin' || assigneesData.some(u => u.role === 'admin');
      return !isTaskAdmin; 
    }

    if (currentUser.role === 'manager') {
      const isMyOwnTask = assignees.includes(currentUser.id) || t.assignedBy === currentUser.id;
      const isMyDivision = creator.division === currentUser.division || assigneesData.some(u => u.division === currentUser.division);

      if (currentUser.crossDivision) {
        const isStaffTask = assigneesData.some(u => u.role === 'staff');
        return isMyOwnTask || isMyDivision || isStaffTask;
      }
      
      return isMyOwnTask || isMyDivision;
    }

    if (currentUser.role === 'staff') {
      return assignees.includes(currentUser.id) || t.assignedBy === currentUser.id;
    }

    return false;
  });

  const activeTasks = myTasks;
  // --- LOGIKA FILTER TUGAS MENDESAK (Urgent) ---
  const urgentTasks = activeTasks.filter(t => {
    if (t.status === 'done') return false; // Abaikan yang sudah selesai
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(t.dueDate);
    
    // Hitung selisih hari
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Muncul jika: Sudah lewat deadline (diffDays < 0) ATAU deadline dalam 3 hari ke depan (0-3)
    return diffDays <= 3;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); // Urutkan dari yang paling telat

  const myNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadNotifsCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row print:bg-white print:block">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-100 p-4 sticky top-0 z-30 print:hidden shadow-sm pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-1.5 rounded-lg shadow-sm">
            <img src="/Logo_apps.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-slate-900 uppercase leading-none block">{sysConfig.brandName}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{activeTab === 'dashboard' ? 'Beranda' : activeTab === 'tasks' ? 'Pekerjaan' : activeTab === 'chat' ? 'Pusat Pesan' : 'Sistem'}</span>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
            <button type="button" onClick={() => setIsNotifOpen(!isNotifOpen)} className="text-slate-400 hover:text-indigo-600 relative">
                <Bell className="w-6 h-6" />
                {unreadNotifsCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">{unreadNotifsCount}</span>}
            </button>
            
            <button type="button" onClick={() => setMobileMenuOpen(true)} className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shadow-sm border-2 border-white ring-1 ring-slate-200 ${currentUser.role === 'admin' ? 'bg-slate-800' : currentUser.role === 'direksi' ? 'bg-purple-600' : currentUser.role === 'manager' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {currentUser.avatar}
            </button>
        </div>
      </div>

      {/* OVERLAY MOBILE SIDEBAR */}
      <div className={`fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setMobileMenuOpen(false)}></div>

      {/* SIDEBAR NAVIGASI (DENGAN FITUR BUKA-TUTUP MINI) */}
      <aside className={`fixed md:relative top-0 bottom-0 left-0 bg-white/95 md:bg-white backdrop-blur-xl border-r border-slate-200/60 flex flex-col z-50 transition-all duration-300 ease-in-out print:hidden ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} ${isSidebarOpen ? 'md:w-72 md:translate-x-0' : 'md:w-20 md:translate-x-0'}`}>
        
        {/* HEADER SIDEBAR (LOGO SEBAGAI TOMBOL TOGGLE) */}
        <div className={`p-4 md:p-6 border-b border-slate-100 flex items-center justify-between`}>
          
          {/* LOGO AREA (Bisa diklik untuk Buka/Tutup di PC) */}
          <div 
            onClick={() => window.innerWidth >= 768 && setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-3 cursor-pointer group w-full ${!isSidebarOpen ? 'justify-center' : ''}`}
            title="Klik untuk Buka/Tutup Menu"
          >
            {/* Ikon Logo */}
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-md shrink-0 transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
              <img src="/Logo_apps.png" alt="Logo" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
            </div>
            
            {/* Teks Logo */}
            {isSidebarOpen && (
              <div className="flex flex-col animate-in fade-in duration-300 overflow-hidden">
                <span className="font-black text-sm md:text-base tracking-tight text-yellow-500 uppercase leading-tight truncate">
                  {sysConfig.brandName}
                </span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase tracking-widest mt-0.5 truncate">
                  Task Management
                </span>
              </div>
            )}
          </div>
          
          {/* Tombol Tutup Khusus Mobile (Tetap ada agar user HP tidak bingung) */}
          <button type="button" className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-full shrink-0 ml-2" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* LIST MENU NAVIGASI */}
        <nav className="flex-1 p-3 md:p-4 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
            {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 mt-2 whitespace-nowrap">Menu Navigasi</p>}
            
            <button type="button" title="Dashboard Kinerja" onClick={() => navigateTo('dashboard')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <LayoutDashboard className="w-5 h-5 shrink-0" /> 
              {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Dashboard Kinerja</span>}
            </button>
            
            <button type="button" title="Manajemen Pekerjaan" onClick={() => navigateTo('tasks')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <CheckSquare className="w-5 h-5 shrink-0" /> 
              {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Manajemen Pekerjaan</span>}
            </button>
            
            <button type="button" title="Pusat Pesan" onClick={() => navigateTo('chat')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <MessageSquare className="w-5 h-5 shrink-0" /> 
              {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Pusat Pesan</span>}
            </button>

            {currentUser.role === 'staff' && (
              <button type="button" title="Laporan Hasil Saya" onClick={() => navigateTo('laporan')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <FileText className="w-5 h-5 shrink-0" /> 
                {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Laporan Hasil Saya</span>}
              </button>
            )}
            
            {(currentUser.role !== 'staff') && (
              <button type="button" title="Laporan & Cetak" onClick={() => navigateTo('laporan', () => setReportTargetUserId('ALL'))} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Printer className="w-5 h-5 shrink-0" /> 
                {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Laporan & Cetak</span>}
              </button>
            )}
            
            {(currentUser.role !== 'staff') && (
              <div className={`pt-4 border-t border-slate-100 mt-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
                {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 whitespace-nowrap">Organisasi</p>}
                
                <button type="button" title="Pantau Tim Divisi" 
                  onClick={() => { 
                    if(!isSidebarOpen) setIsSidebarOpen(true); // Otomatis buka sidebar jika tertutup
                    setIsDivMenuOpen(!isDivMenuOpen); 
                  }} 
                  className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'division' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3"><Users className="w-5 h-5 shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Pantau Tim Divisi</span>}</div>
                  {isSidebarOpen && (isDivMenuOpen ? <ChevronDown className="w-4 h-4 shrink-0"/> : <ChevronRight className="w-4 h-4 shrink-0"/>)}
                </button>
                
                {/* Sub Menu Divisi (Hanya muncul jika sidebar terbuka) */}
                <div className={`overflow-hidden transition-all duration-300 ${isDivMenuOpen && isSidebarOpen ? 'max-h-64 mt-2' : 'max-h-0'}`}>
                  <div className="ml-5 pl-4 border-l-2 border-slate-100 space-y-1 py-1">
                    {(currentUser.role === 'direksi' || currentUser.role === 'admin') && <button type="button" onClick={() => { navigateTo('division'); setSelectedDivision('Semua Divisi'); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${selectedDivision === 'Semua Divisi' && activeTab === 'division' ? 'text-indigo-700 bg-indigo-50 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>Semua Divisi</button>}
                    {divisions.filter(div => (currentUser.role === 'direksi' || currentUser.role === 'admin') || div === currentUser.division).map(div => (
                      <button type="button" key={div} onClick={() => { navigateTo('division'); setSelectedDivision(div); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${selectedDivision === div && activeTab === 'division' ? 'text-indigo-700 bg-indigo-50 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>Divisi {div}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className={`pt-4 border-t border-slate-100 mt-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
                 {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 whitespace-nowrap">Sistem Super Admin</p>}
                 <button type="button" title="Kelola Pengguna" onClick={() => navigateTo('admin_users')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_users' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><UserPlus className="w-5 h-5 shrink-0" /> {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Kelola Pengguna</span>}</button>
                 <button type="button" title="Konfigurasi Sistem" onClick={() => navigateTo('admin_settings')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_settings' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Settings className="w-5 h-5 shrink-0" /> {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Pengaturan Sistem</span>}</button>
              </div>
            )}
        </nav>

        {/* AREA PROFIL BAWAH */}
        <div className="p-3 md:p-5 border-t border-slate-200 bg-slate-50/50 shrink-0 mb-10 md:mb-0">
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3 px-2' : 'justify-center px-0'} mb-4`}>
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-white text-sm md:text-lg shadow-md shrink-0 ${currentUser.role === 'admin' ? 'bg-slate-800' : currentUser.role === 'direksi' ? 'bg-purple-600' : currentUser.role === 'manager' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {currentUser.avatar}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                <p className="font-extrabold text-xs md:text-sm text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{currentUser.role} • {currentUser.division}</p>
              </div>
            )}
          </div>
          <button type="button" title="Keluar Akun" onClick={handleLogout} className={`w-full flex items-center justify-center ${isSidebarOpen ? 'gap-2 px-4' : 'px-0'} text-red-600 bg-white border border-red-100 hover:bg-red-50 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm`}>
            <LogOut className="w-4 h-4 shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 w-full h-full overflow-y-auto custom-scrollbar bg-slate-50 print:m-0 print:p-0 print:bg-white relative">
        <div className="p-3 pb-32 md:p-6 md:pb-6 w-full max-w-[1600px] mx-auto h-full flex flex-col">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8 print:hidden">
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                {activeTab === 'dashboard' && 'Beranda Kinerja'}
                {activeTab === 'tasks' && (currentUser.role === 'admin' ? 'Seluruh Daftar Pekerjaan' : 'Daftar Pekerjaan')}
                {activeTab === 'laporan' && 'Laporan Kinerja'}
                {activeTab === 'division' && `Pantauan: ${selectedDivision}`}
                {activeTab === 'admin_users' && 'Manajemen Pengguna'}
                {activeTab === 'admin_settings' && 'Pengaturan Sistem'}
              </h1>
              <p className="text-slate-500 mt-1 md:mt-2 font-medium flex items-center gap-2 text-xs md:text-sm">
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <div className="flex flex-row items-center gap-2 md:gap-4 w-full md:w-auto overflow-visible">
               <div className="relative hidden md:block">
                 <button type="button" onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm relative">
                   <Bell className="w-5 h-5" />
                   {unreadNotifsCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">{unreadNotifsCount}</span>}
                 </button>
               </div>
               
               {isNotifOpen && (
                   <div className="absolute top-20 right-16 md:right-16 md:top-20 md:mt-20 w-[calc(100vw-2rem)] md:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                     <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                       <h4 className="font-bold text-slate-800">Notifikasi Terbaru</h4>
                       {unreadNotifsCount > 0 && <button type="button" onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider">Tandai Dibaca</button>}
                     </div>
                     <div className="max-h-[60vh] md:max-h-80 overflow-y-auto custom-scrollbar">
                       {myNotifications.length === 0 ? (
                         <div className="p-6 text-center text-slate-400 text-sm">Tidak ada notifikasi baru.</div>
                       ) : (
                         myNotifications.map(notif => (
                           <div key={notif.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-indigo-50/30' : ''}`} onClick={() => {
                               setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                               if (notif.taskId) { const task = tasks.find(t => t.id === notif.taskId); if (task) { setSelectedTask(task); setIsNotifOpen(false); navigateTo('tasks'); } }
                             }}>
                             <div className={`p-2 rounded-full h-fit shrink-0 ${notif.type === 'chat' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{notif.type === 'chat' ? <MessageSquare className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}</div>
                             <div><p className={`text-xs md:text-sm ${!notif.read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{notif.message}</p><p className="text-[10px] md:text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {notif.time}</p></div>
                             {!notif.read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0 ml-auto"></div>}
                           </div>
                         ))
                       )}
                     </div>
                   </div>
               )}

               {activeTab !== 'laporan' && activeTab !== 'admin_users' && activeTab !== 'admin_settings' && (
                  <button type="button" onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all flex-1 md:flex-none text-xs md:text-sm">
                    <Plus className="w-4 h-4 md:w-5 h-5" /> {currentUser.role === 'staff' ? 'Tugas Baru' : 'Instruksi Baru'}
                  </button>
               )}
               {activeTab === 'admin_users' && (
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-end md:flex-none">
                  <button type="button" onClick={() => setIsMassUserModalOpen(true)} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs md:text-sm">
                    <Users className="w-4 h-4" /> Input Tabel
                  </button>
                  <button type="button" onClick={handleDownloadTemplateCSV} className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs md:text-sm">
                    <Download className="w-4 h-4" /> Template CSV
                  </button>
                  <input type="file" id="upload-massal-user" accept=".csv" onChange={handleMassUploadCSV} className="hidden" />
                  <label htmlFor="upload-massal-user" className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs md:text-sm cursor-pointer">
                    <Paperclip className="w-4 h-4" /> Import CSV
                  </label>
                  <button type="button" onClick={() => setIsUserModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-xs md:text-sm">
                    <UserPlus className="w-4 h-4 md:w-5 md:h-5" /> Tambah Manual
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TAB: INBOX PESAN */}
          {activeTab === 'chat' && (
            <div className="bg-white md:rounded-2xl shadow-sm md:border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] animate-in fade-in duration-300 print:hidden -mx-4 md:mx-0 mt-[-16px] md:mt-0 border-t">
              <div className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col bg-slate-50 ${selectedTask ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 md:p-5 border-b border-slate-200 bg-white shrink-0">
                  <h3 className="font-black text-base md:text-lg text-slate-800 flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-indigo-500"/> Pesan Aktif</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Cari judul pesan..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white transition-colors" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {myTasks
                    .filter(t => Array.isArray(t.comments) && t.comments.length > 0)
                    .sort((a, b) => b.comments[b.comments.length - 1].id - a.comments[a.comments.length - 1].id) 
                    .map(task => {
                      const latestChat = task.comments[task.comments.length - 1];
                      const isMe = latestChat.userId === currentUser.id;
                      const isActive = selectedTask?.id === task.id; 
                      
                      return (
                        <div 
                          key={task.id} 
                          onClick={() => isActive ? setSelectedTask(null) : setSelectedTask(task)} 
                          className={`p-3 md:p-4 border-b border-slate-100 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                        >
                          <h4 className="font-bold text-xs md:text-sm text-slate-800 line-clamp-1">{task.title}</h4>
                          <p className="text-[10px] md:text-xs text-slate-500 mt-1 font-medium line-clamp-1 md:line-clamp-2">
                            <span className="font-black text-slate-700">{isMe ? 'Anda' : getUserName(latestChat.userId)}:</span> {latestChat.text}
                          </p>
                          <p className="text-[8px] md:text-[9px] text-slate-400 font-bold mt-1.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5 md:w-3 md:h-3"/> {latestChat.timestamp}</p>
                        </div>
                      )
                    })
                  }
                </div>
              </div>

              <div className={`w-full md:w-2/3 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95 h-full ${!selectedTask ? 'hidden md:flex' : 'flex'}`}>
                {selectedTask ? (
                  <>
                    <div onClick={() => window.innerWidth < 768 && setSelectedTask(null)} className="px-3 py-2.5 md:px-6 md:py-4 border-b border-slate-200 bg-white shadow-sm flex items-center gap-2 md:gap-3 shrink-0 md:cursor-default cursor-pointer active:bg-slate-50">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedTask(null); }} className="md:hidden p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200"><ChevronRight className="w-4 h-4 md:w-5 md:h-5 rotate-180" /></button>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-xs md:text-base text-slate-800 line-clamp-1">{selectedTask.title}</h3>
                        <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5 truncate"><Users className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0"/> {getAssigneesNames(selectedTask.assignedTo)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-3 md:space-y-4 custom-scrollbar bg-slate-100/50">
                      {(Array.isArray(selectedTask?.comments) ? selectedTask.comments : []).map((chat, idx) => {
                        const isMe = chat?.userId === currentUser?.id;
                        return (
                          <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`p-2.5 md:p-4 rounded-2xl shadow-sm max-w-[85%] ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                              <p className="text-[10px] md:text-sm font-medium leading-relaxed">{chat?.text || ''}</p>
                            </div>
                            <span className="text-[7px] md:text-[10px] font-black tracking-widest text-slate-400 mt-1 px-1 uppercase">{isMe ? 'Anda' : getUserName(chat?.userId)} • {chat?.timestamp || ''}</span>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-2 md:p-5 bg-white border-t border-slate-200 pb-20 md:pb-safe shrink-0">
                      <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ketik balasan diskusi..." className="flex-1 px-3 py-2 md:px-4 md:py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 text-[10px] md:text-sm bg-slate-50 focus:bg-white font-medium" />
                        <button type="submit" disabled={!newComment.trim()} className="bg-indigo-600 text-white p-2 md:p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transform hover:-translate-y-0.5 shadow-sm shrink-0"><Send className="w-3.5 h-3.5 md:w-5 md:h-5 ml-0.5" /></button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-200 rounded-full flex items-center justify-center mb-3 md:mb-4"><MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-slate-400"/></div>
                    <h3 className="font-black text-lg md:text-xl text-slate-700">Pilih Pesan</h3>
                    <p className="text-xs md:text-sm font-bold text-slate-500 mt-2 max-w-[250px] md:max-w-none">Klik salah satu daftar diskusi di sebelah kiri untuk mulai membaca dan membalas pesan.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: DASHBOARD (DESAIN ALA M-BANKING + URGENT TASK) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 md:space-y-8 print:hidden animate-in fade-in duration-300 pb-20 md:pb-0 mb-5">
              
              {/* Profil Singkat Mobile */}
              <div className="md:hidden flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3.5">
                   <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-xl shadow-inner ${currentUser.role === 'admin' ? 'bg-slate-800' : currentUser.role === 'direksi' ? 'bg-purple-600' : currentUser.role === 'manager' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{currentUser.avatar}</div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Selamat Datang,</p>
                     <h2 className="text-sm font-black text-slate-800 leading-none">{currentUser.name}</h2>
                   </div>
                </div>
                <Badge type="low">{currentUser.role}</Badge>
              </div>

              {/* Main "Balance" Card */}
              <div className="bg-indigo-600 rounded-[2rem] p-6 md:p-8 text-white shadow-[0_15px_40px_rgba(79,70,229,0.3)] relative overflow-hidden flex flex-col justify-between min-h-[160px] md:min-h-[200px]">
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                 <div className="relative z-10">
                   <p className="text-indigo-100 text-xs md:text-sm font-bold tracking-wide uppercase mb-1">Total Pekerjaan Anda</p>
                   <h1 className="text-5xl md:text-6xl font-black flex items-baseline gap-2">
                     {activeTasks.length} <span className="text-lg md:text-xl font-medium opacity-80 mb-1 md:mb-2">Tugas</span>
                   </h1>
                 </div>
                 <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-indigo-500/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] md:text-xs font-bold text-indigo-200">Selesai (KPI)</span>
                      <span className="text-sm md:text-base font-black">{activeTasks.length === 0 ? 0 : Math.round((activeTasks.filter(t => t.status === 'done').length / activeTasks.length) * 100)}%</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] md:text-xs font-bold text-indigo-200">Divisi</span>
                      <span className="text-sm md:text-base font-black">{currentUser.division}</span>
                    </div>
                 </div>
              </div>

              {/* FITUR BARU: SECTION PERHATIAN KHUSUS (URGENT TASKS) */}
              {urgentTasks.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-sm md:text-base text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 animate-pulse" /> Perhatian Khusus ({urgentTasks.length})
                    </h3>
                  </div>
                  
                  {/* List Horizontal/Scrollable untuk Tugas Mendesak */}
                  <div className="flex gap-4 overflow-x-auto pb-2 px-1 custom-scrollbar">
                    {urgentTasks.map(task => {
                       const isOverdue = task.dueDate < new Date().toISOString().split('T')[0];
                       return (
                         <div 
                          key={task.id} 
                          onClick={() => setSelectedTask(task)}
                          className={`min-w-[280px] md:min-w-[320px] p-4 rounded-[1.5rem] border-2 shadow-md cursor-pointer transition-all active:scale-95 bg-white
                            ${isOverdue ? 'border-red-200' : 'border-orange-200'}`}
                         >
                            <div className="flex justify-between items-start mb-3">
                              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isOverdue ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                {isOverdue ? 'Sudah Lewat Deadline' : 'Mendekati Deadline'}
                              </span>
                              <Badge type={task.priority}>{task.priority}</Badge>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 line-clamp-1 mb-2">{task.title}</h4>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                               <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                 <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                                 {task.dueDate}
                               </div>
                               <span className="text-[10px] font-bold text-indigo-500">Klik Detail &rarr;</span>
                            </div>
                         </div>
                       )
                    })}
                  </div>
                </div>
              )}

              {/* Grid Status Cepat */}
              <div className="grid grid-cols-3 gap-3 md:gap-6">
                {[
                  { title: 'Pending', count: activeTasks.filter(t => t.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-100' },
                  { title: 'Diproses', count: activeTasks.filter(t => t.status === 'in-progress').length, color: 'text-blue-600', bg: 'bg-blue-100' },
                  { title: 'Selesai', count: activeTasks.filter(t => t.status === 'done').length, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center justify-center gap-2">
                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center font-black text-lg md:text-2xl`}>
                      {stat.count}
                    </div>
                    <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">{stat.title}</span>
                  </div>
                ))}
              </div>

              {/* Daftar Aktivitas Terkini (ala Recent Transactions) */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden w-full">
                <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-base md:text-lg text-slate-800">Semua Aktivitas</h3>
                  <button onClick={() => navigateTo('tasks')} className="text-xs font-bold text-indigo-600">Lihat Semua</button>
                </div>
                <div className="p-2 md:p-4 mb-5">
                  {activeTasks.slice(0, 5).map((task) => (
                    <div key={task.id} onClick={() => setSelectedTask(task)} className="flex items-center justify-between p-3 md:p-4 hover:bg-slate-50 rounded-2xl cursor-pointer border border-transparent">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm
                          ${task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {task.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 line-clamp-1">{task.title}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Deadline: {task.dueDate}</p>
                        </div>
                      </div>
                      <Badge type={task.status}>{task.status.replace('-', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS (DESAIN ALA M-BANKING) */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 print:hidden animate-in fade-in duration-300 pb-20 md:pb-0">
               
               {/* Search Bar Ala Kolom Pencarian Transaksi */}
               <div className="bg-white p-2 md:p-3 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center gap-2">
                 <div className="flex w-full items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus-within:border-indigo-300 focus-within:bg-white transition-colors">
                   <Search className="w-5 h-5 text-slate-400 shrink-0" />
                   <input type="text" placeholder="Cari nama pekerjaan..." value={taskSearchQuery} onChange={(e) => setTaskSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                 </div>
                 
                 <div className="flex w-full md:w-auto gap-2">
                   <input type="month" value={taskFilterMonth} onChange={(e) => {setTaskFilterMonth(e.target.value); setTaskFilterDate('');}} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-300" />
                   {(taskFilterMonth || taskFilterDate || taskSearchQuery) && (
                     <button type="button" onClick={() => {setTaskSearchQuery(''); setTaskFilterMonth(''); setTaskFilterDate('');}} className="px-4 py-2 bg-red-50 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 shrink-0">Reset</button>
                   )}
                 </div>
               </div>

               {/* Task List (Desain Riwayat) */}
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-3 md:p-6 min-h-[50vh]">
                 <h3 className="px-2 text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">Daftar Pekerjaan</h3>
                 
                 <div className="space-y-1 overflow-y-auto custom-scrollbar">
                  {myTasks.filter(t => {
                    if (taskSearchQuery && !t.title.toLowerCase().includes(taskSearchQuery.toLowerCase())) return false;
                    if (taskFilterMonth && !t.dueDate.startsWith(taskFilterMonth)) return false;
                    if (taskFilterDate && t.dueDate !== taskFilterDate) return false;
                    return true;
                  }).map(task => {
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = task.dueDate < today && task.status !== 'done';
                    const assigneesArr = getAssigneesArray(task.assignedTo);
                    
                    return (  
                      <div key={task.id} onClick={() => setSelectedTask(task)} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-slate-100 gap-4">
                        
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white
                            ${isOverdue ? 'bg-red-100 text-red-600' : task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : task.status === 'waiting-approval' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-500'}`}>
                            {task.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : isOverdue ? <AlertCircle className="w-6 h-6"/> : <FileText className="w-6 h-6" />}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm md:text-base font-black text-slate-800 line-clamp-1 mb-1">{task.title}</h4>
                            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {task.dueDate}</span>
                              <span>•</span>
                              <span className="truncate">Oleh: {getUserName(task.assignedBy)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badges di Kanan */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 pl-16 sm:pl-0">
                          {isOverdue && <span className="text-[9px] font-black text-white bg-red-600 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Overdue</span>}
                          {!isOverdue && <Badge type={task.status}>{task.status.replace('-', ' ')}</Badge>}
                          
                          {/* Avatar tumpuk pembuat/penerima (Hanya Desktop) */}
                          <div className="hidden sm:flex -space-x-2 mt-1">
                            {assigneesArr.slice(0,3).map(id => <div key={id} title={getUserName(id)} className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-[9px] border-2 border-white relative z-10">{getAvatar(id)}</div>)}
                            {assigneesArr.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[9px] border-2 border-white relative z-0">+{assigneesArr.length - 3}</div>}
                          </div>
                        </div>

                      </div>
                    )
                  })}
                  {myTasks.length === 0 && <div className="p-10 text-center text-sm font-bold text-slate-400">Tidak ada data pekerjaan yang ditemukan.</div>}
                 </div>
               </div>
            </div>
          )}

          {/* TAB: LAPORAN */}
          {activeTab === 'laporan' && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 print:space-y-0">
              <Card className="p-3 md:p-4 mb-3 md:mb-4 bg-white border-indigo-200 border-2 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
                  <div className="w-full md:w-1/2">
                    <h3 className="font-black text-sm md:text-base text-slate-800 mb-3 md:mb-4 flex items-center gap-2"><Filter className="w-4 h-4 md:w-5 md:h-5 text-indigo-500"/> Filter Periode Laporan</h3>
                    <div className="flex items-center gap-3">
                      <input type="month" value={reportFilterMonth} onChange={(e) => setReportFilterMonth(e.target.value)} className="w-full md:w-2/3 px-3 py-2 md:px-4 md:py-3 border border-slate-300 rounded-xl font-bold text-sm md:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
                      {reportFilterMonth && <button type="button" onClick={() => setReportFilterMonth('')} className="text-xs md:text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-2 rounded-xl">Reset</button>}
                    </div>
                  </div>

                  {(currentUser.role !== 'staff') && (
                    <div className="w-full md:w-1/2">
                      <h3 className="font-black text-sm md:text-base text-slate-800 mb-3 md:mb-4 flex items-center gap-2"><Users className="w-4 h-4 md:w-5 md:h-5 text-indigo-500"/> Pilih Laporan Karyawan</h3>
                      <select value={reportTargetUserId} onChange={(e) => setReportTargetUserId(e.target.value)} className="w-full px-3 py-2 md:px-4 md:py-3 border border-slate-300 flex items-center rounded-xl font-bold text-sm md:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm">
                         <option value="ALL">-- CETAK LAPORAN SEMUA KARYAWAN --</option>
                         {users.filter(u => (u.role === 'staff' || u.role === 'manager') && (currentUser.role === 'admin' || currentUser.role === 'direksi' || u.division === currentUser.division)).map(u => (
                           <option key={u.id} value={u.id}>{u.name} - {u.role.toUpperCase()} (Divisi {u.division})</option>
                         ))}
                      </select>
                    </div>
                  )}
                </div>
              </Card>

              {(() => {
                const isGlobalMode = (currentUser.role !== 'staff') && (reportTargetUserId === 'ALL');
                let targetUser = null;

                if (isGlobalMode) {
                  targetUser = { id: 'ALL', name: 'Semua Karyawan & Staff', position: 'Berbagai Posisi', division: 'Seluruh Divisi' };
                } else if (currentUser.role === 'staff') {
                  targetUser = currentUser; 
                } else {
                  targetUser = users.find(u => String(u.id) === String(reportTargetUserId));
                }
                
                if (!targetUser) return (
                   <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
                      <p className="text-slate-500 font-bold text-sm">Silakan pilih karyawan di atas.</p>
                   </div>
                );

                let targetTasks = isGlobalMode ? tasks : tasks.filter(t => getAssigneesArray(t.assignedTo).includes(targetUser.id));
                if (reportFilterMonth) {
                  targetTasks = targetTasks.filter(t => t.dueDate.startsWith(reportFilterMonth));
                }

                const tDone = targetTasks.filter(t => t.status === 'done').length;
                const tTotal = targetTasks.length;
                const tRate = tTotal === 0 ? 0 : Math.round((tDone / tTotal) * 100);

                const periodeCetak = reportFilterMonth 
                  ? new Date(reportFilterMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) 
                  : new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                return (
                  <div className="max-h-[calc(100vh-260px)] overflow-y-auto custom-scrollbar print:max-h-none print:overflow-visible pb-10 print:pb-0">
                    <Card className="p-0 border-0 shadow-sm bg-white print:shadow-none print:border-none print:w-full overflow-hidden print-page">
                      <div className="p-3 md:p-5 print:p-0 print:pb-2 border-b-2 md:border-b-4 border-indigo-600 bg-white print:border-b-2 print:border-black flex flex-col md:flex-row justify-between items-start md:items-center relative">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-white print:shadow-none shrink-0 print:rounded-none"><img src="/Logo_apps.png" alt="Logo" className="w-full h-full object-contain" /></div>
                          <div>
                            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight print:text-black uppercase print:text-lg leading-tight">{sysConfig.brandName}</h1>
                            <p className="text-[8px] md:text-[10px] font-bold text-slate-500 print:text-black mt-0.5 leading-tight">Komp. Ruko BSD Sektor VII, Jl. Pahlawan Seribu No.63 - 64 Blok RN,<br /> WetanTangerang, Kec. Serpong, Banten 15310</p>
                            <p className="text-[8px] md:text-[10px] text-slate-500 print:text-black">Telp: 0800 1778889</p>
                          </div>
                        </div>
                        <div className="flex gap-2 print:hidden absolute top-3 right-3 md:static">
                          <button type="button" onClick={handleDownloadPDF} className="flex items-center justify-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold text-[10px] md:text-xs transition-colors shadow-sm"><Printer className="w-3.5 h-3.5"/> Cetak PDF</button>
                        </div>
                      </div>

                      <div className="text-center py-3 md:py-4 print:py-2 bg-white">
                        <h2 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-widest print:text-black print:text-base underline underline-offset-2 decoration-2">
                          {isGlobalMode ? 'Laporan Kinerja Global' : 'Laporan Kinerja Karyawan'}
                        </h2>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold mt-1 print:text-black print:text-[10px]">Periode: {periodeCetak}</p>
                      </div>

                      <div className="px-3 md:px-5 print:px-0 pb-3 print:pb-2 bg-white">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] md:text-xs border border-slate-200 print:border print:border-black rounded-xl print:rounded-none p-2.5 md:p-3 print:p-2">
                          <div><span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest print:text-black print:text-[8px]">Karyawan / Target</span><span className="font-black text-slate-800 text-xs md:text-sm print:text-black print:text-xs truncate block">{targetUser.name}</span></div>
                          <div><span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest print:text-black print:text-[8px]">Posisi Jabatan</span><span className="font-bold text-slate-800 text-xs md:text-sm print:text-black print:text-xs truncate block">{targetUser.position}</span></div>
                          <div><span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest print:text-black print:text-[8px]">Departemen</span><span className="font-bold text-slate-800 text-xs md:text-sm print:text-black print:text-xs truncate block">{targetUser.division}</span></div>
                          <div><span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest print:text-black print:text-[8px]">Penyelesaian (KPI)</span><span className="font-black text-emerald-600 text-sm md:text-base print:text-black print:text-sm">{tRate}% ({tDone}/{tTotal})</span></div>
                        </div>
                      </div>

                      <div className="px-3 md:px-5 print:px-0 pb-4 md:pb-6 bg-white">
                        <h3 className="text-xs md:text-sm font-black text-slate-800 mb-2 print:text-black flex items-center gap-2 print:text-xs"><FileText className="w-3.5 h-3.5 print:w-3 print:h-3"/> Rincian Aktivitas Pekerjaan</h3>
                        <div className="overflow-x-auto print:overflow-visible w-full custom-scrollbar">
                          <table className="w-full text-left border-collapse border border-slate-200 print:border-black min-w-[650px]">
                            <thead>
                              <tr className="bg-slate-50 print:bg-gray-100 text-slate-800 print:text-black text-[8px] md:text-[9px] uppercase tracking-widest font-black border-b border-slate-200 print:border-black print:text-[8px]">
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black w-6 text-center print:p-1">No</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1">Deskripsi Tugas & Pekerjaan</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1">Dikerjakan Oleh</th>
                                {/* KOLOM BARU: TIMELINE (TGL DIBUAT + DEADLINE + OVERDUE) */}
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1">Timeline Pekerjaan</th>
                                {/* KOLOM BARU: APPROVAL (TGL SELESAI + SIAPA YANG APPROVE) */}
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1">Data Approval</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-slate-200 print:border-black text-center print:p-1 w-16">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {targetTasks.map((task, index) => { 
                                 // LOGIKA DETEKSI OVERDUE (TERLAMBAT)
                                 const today = new Date().toISOString().split('T')[0];
                                 const isOverdue = task.dueDate < today && task.status !== 'done';

                                 return (
                                  <tr key={task.id} className="border-b border-slate-200 print:border-black print:text-[9px] hover:bg-slate-50 transition-colors">
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-bold text-slate-600 border-r border-slate-200 print:border-black print:text-black text-center print:p-1 align-top">{index + 1}</td>
                                    
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 font-bold text-slate-800 border-r border-slate-200 print:border-black print:text-black text-[10px] md:text-xs print:p-1 leading-tight align-top">{task.title}</td>
                                    
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] font-bold text-indigo-600 border-r border-slate-200 print:border-black print:text-black print:p-1 align-top whitespace-nowrap">{getAssigneesNames(task.assignedTo)}</td>
                                    
                                    {/* DATA TIMELINE */}
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1 align-top whitespace-nowrap">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] md:text-[10px] text-slate-500 print:text-black">Diberikan: <span className="font-bold text-slate-700 print:text-black">{task.created_at ? task.created_at.split('T')[0] : '-'}</span></span>
                                        <span className={`text-[9px] md:text-[10px] ${isOverdue ? 'text-red-600 print:text-red-600 font-black' : 'text-slate-500 print:text-black'}`}>
                                          Deadline: <span className="font-bold">{task.dueDate}</span>
                                        </span>
                                        {/* LABEL TERLAMBAT MUNCUL JIKA OVERDUE */}
                                        {isOverdue && <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.5 rounded border border-red-200 w-fit font-bold mt-0.5 print:border-none print:p-0 print:text-red-600">TERLAMBAT</span>}
                                      </div>
                                    </td>

                                    {/* DATA APPROVAL */}
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1 align-top whitespace-nowrap">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] md:text-[10px] text-slate-500 print:text-black">Selesai: <span className="font-bold text-emerald-600 print:text-black">{task.completed_at || '-'}</span></span>
                                        <span className="text-[9px] md:text-[10px] text-slate-500 print:text-black">Oleh: <span className="font-bold text-indigo-600 print:text-black">{task.approved_by ? getUserName(task.approved_by) : '-'}</span></span>
                                      </div>
                                    </td>

                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-center border-slate-200 print:border-black print:text-black font-black uppercase text-[8px] md:text-[9px] tracking-wider print:p-1 align-top">
                                        <span className="print:hidden"><Badge type={task.status}>{String(task.status).toUpperCase()}</Badge></span>
                                        <span className="hidden print:inline">{task.status === 'done' ? 'SELESAI' : String(task.status).toUpperCase()}</span>
                                    </td>
                                  </tr>
                                 )
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="hidden print:flex justify-between mt-12 pt-4">
                          <div className="text-center w-48">
                             <p className="mb-16 font-bold text-black text-[10px] md:text-xs">Mengetahui,<br/>{isGlobalMode ? 'Direktur Utama' : 'Manager Divisi'}</p>
                             <p className="font-bold text-black border-t border-black pt-1 uppercase text-[10px] md:text-xs"></p>
                          </div>
                          <div className="text-center w-48">
                             <p className="mb-16 font-bold text-black text-[10px] md:text-xs">Tangerang Selatan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<br/>{isGlobalMode ? 'System Admin' : 'Pembuat Laporan'}</p>
                             <p className="font-bold text-black border-t border-black pt-1 uppercase text-[10px] md:text-xs">{isGlobalMode ? currentUser.name : targetUser.name}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              })()}
            </div>
          )}

          {/* TAB: TIM DIVISI */}
          {activeTab === 'division' && (currentUser.role !== 'staff') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 print:hidden animate-in fade-in duration-300 md:p-10">
              {users.filter(u => (u.role === 'staff' || u.role === 'manager') && (selectedDivision === 'Semua Divisi' || u.division === selectedDivision)).map(staff => {
                  const staffTasks = tasks.filter(t => getAssigneesArray(t.assignedTo).includes(staff.id));
                  return (
                    <Card key={staff.id} className="p-0 flex flex-col items-center text-center hover:-translate-y-1 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white">
                      <div className="absolute top-0 w-full h-1.5 md:h-2 bg-gradient-to-r from-indigo-500 to-indigo-800"></div>
                      <div className="p-5 md:p-6 w-full flex flex-col items-center">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 text-slate-700 font-black text-xl md:text-2xl rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-slate-100">{staff.avatar}</div>
                        <h3 className="font-black text-base md:text-lg text-slate-800 tracking-tight line-clamp-1">{staff.name}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold mb-3">{staff.position}</p>
                        <Badge type="low">Divisi {staff.division}</Badge>
                      </div>
                      <div className="w-full grid grid-cols-3 gap-0.5 mt-auto bg-slate-50 border-t border-slate-100 p-1">
                          <div className="flex flex-col items-center py-2"><span className="text-lg md:text-xl font-black text-slate-600">{staffTasks.filter(t=>t.status==='pending').length}</span><span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Pending</span></div>
                          <div className="flex flex-col items-center py-2 border-l border-r border-slate-200 bg-indigo-50/50"><span className="text-lg md:text-xl font-black text-indigo-600">{staffTasks.filter(t=>t.status==='in-progress').length}</span><span className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Progress</span></div>
                          <div className="flex flex-col items-center py-2"><span className="text-lg md:text-xl font-black text-emerald-600">{staffTasks.filter(t=>t.status==='done').length}</span><span className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Selesai</span></div>
                      </div>
                    </Card>
                  )
              })}
            </div>
          )}

          {/* TAB: KELOLA PENGGUNA */}
          {activeTab === 'admin_users' && currentUser.role === 'admin' && (
            // PERBAIKAN 1: Tambahkan pb-28 agar bagian bawah tidak tertutup menu HP
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 md:p-10 pb-28 md:pb-0">
              <Card className="border-0 shadow-sm overflow-hidden bg-white">
                 <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                     <h3 className="font-black text-base md:text-xl text-slate-800 flex items-center gap-2 shrink-0"><Users className="w-4 h-4 md:w-5 md:h-5 text-indigo-500"/> Kelola Daftar Pengguna</h3>
                     {selectedUsers.length > 0 && (
                       <button type="button" onClick={handleBulkDeleteUsers} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 transition-colors animate-in zoom-in">
                         <Trash2 className="w-3.5 h-3.5" /> Hapus {selectedUsers.length} Terpilih
                       </button>
                     )}
                   </div>
                   
                   <div className="relative w-full md:w-64 shrink-0">
                     <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input type="text" placeholder="Cari nama atau NIK..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white transition-colors" />
                   </div>
                 </div>

                 {/* PERBAIKAN 2: Tambahkan overflow-auto dan max-h-[65vh] agar tabel bisa di-scroll vertikal */}
                 <div className="overflow-auto w-full max-h-[65vh] md:max-h-[75vh] custom-scrollbar pb-2 relative">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      {/* PERBAIKAN 3: Jadikan header tabel 'sticky' agar tidak ikut tergulung */}
                      <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                        <tr className="text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                          <th className="p-3 md:p-5 w-10 text-center bg-slate-50">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={selectedUsers.length > 0 && selectedUsers.length === users.filter(u => (!userSearchQuery || (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.nik || '').toLowerCase().includes(userSearchQuery.toLowerCase())) && u.role !== 'admin').length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const selectable = users.filter(u => (!userSearchQuery || (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.nik || '').toLowerCase().includes(userSearchQuery.toLowerCase())) && u.role !== 'admin');
                                  setSelectedUsers(selectable.map(u => u.id));
                                } else {
                                  setSelectedUsers([]);
                                }
                              }}
                            />
                          </th>
                          <th className="p-3 md:p-5 bg-slate-50">Pengguna & NIK</th>
                          <th className="p-3 md:p-5 bg-slate-50">Role Sistem</th>
                          <th className="p-3 md:p-5 bg-slate-50">Divisi</th>
                          <th className="p-3 md:p-5 text-right bg-slate-50">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => {
                            if (!userSearchQuery) return true;
                            const query = userSearchQuery.toLowerCase();
                            return ((u.name || '').toLowerCase().includes(query) || (u.nik || '').toLowerCase().includes(query));
                          }).map(u => (
                          <tr key={u.id} className={`border-b hover:bg-slate-50/50 transition-colors ${selectedUsers.includes(u.id) ? 'bg-indigo-50/30 border-indigo-100' : 'border-slate-50'}`}>
                             <td className="p-3 md:p-5 text-center">
                               {u.role !== 'admin' && (
                                 <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={selectedUsers.includes(u.id)} onChange={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} />
                               )}
                             </td>
                             <td className="p-3 md:p-5 flex items-center gap-3">
                               <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[10px] md:text-xs shrink-0">{u.avatar}</div>
                               <div>
                                 <span className="font-bold text-slate-800 block text-xs md:text-sm">{u.name || 'Tanpa Nama'}</span>
                                 <span className="text-[9px] md:text-[10px] text-slate-500">{u.position} • <span className="font-bold text-indigo-500">{u.nik}</span></span>
                               </div>
                             </td>
                             <td className="p-3 md:p-5"><Badge type={u.role === 'admin' ? 'admin' : u.role === 'direksi' ? 'high' : u.role === 'manager' ? 'low' : 'done'}>{u.role}</Badge></td>
                             <td className="p-3 md:p-5 font-bold text-slate-600 text-[10px] md:text-xs">{u.division}</td>
                             <td className="p-3 md:p-5 text-right">
                               <div className="flex justify-end gap-1.5 md:gap-2">
                                   <button type="button" onClick={() => {setEditingUser(u); setIsEditUserModalOpen(true);}} className="p-1.5 md:p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg shadow-sm"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                   {u.id !== currentUser.id && u.role !== 'admin' && (
                                     <button type="button" onClick={() => handleDeleteUser(u.id)} className="p-1.5 md:p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                   )}
                               </div>
                             </td>
                          </tr>
                        ))}
                        {users.filter(u => !userSearchQuery || (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.nik || '').toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                          <tr><td colSpan="5" className="p-8 text-center text-sm font-bold text-slate-400">Pengguna tidak ditemukan.</td></tr>
                        )}
                      </tbody>
                    </table>
                 </div>
              </Card>
            </div>
          )}

          {/* TAB: PENGATURAN */}
          {activeTab === 'admin_settings' && currentUser.role === 'admin' && (
            <div className="max-w-2xl space-y-4 md:space-y-6 animate-in fade-in duration-300 md:p-10">
              <Card className="p-5 md:p-8 border-0 shadow-sm bg-white">
                <h3 className="font-black text-base md:text-xl text-slate-800 mb-4 md:mb-6 border-b border-slate-100 pb-3 md:pb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500"/> Pengaturan Sistem Global</h3>
                <div className="space-y-5 md:space-y-6">
                  <div>
                    <label className="block text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Nama Perusahaan (Brand)</label>
                    <input type="text" className="w-full px-4 py-3 md:py-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-indigo-500" value={configForm.brandName} onChange={(e) => setConfigForm({...configForm, brandName: e.target.value})} />
                  </div>
                  
                  {/* Pengelolaan Divisi */}
                  <div className="mb-8">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                      Daftar Divisi Aktif
                    </label>
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        value={newDivName} 
                        onChange={e => setNewDivName(e.target.value)} 
                        placeholder="Nama divisi baru..." 
                        className="flex-1 px-4 py-2 border-2 rounded-xl font-bold"
                      />
                      <button onClick={handleAddDivision} className="bg-indigo-600 text-white px-6 rounded-xl font-bold">
                        Tambah
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {divisions.map(d => (
                        <div key={d} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="font-bold text-sm text-slate-700">{d}</span>
                          <button onClick={() => handleDeleteDivision(d)} className="text-red-500 p-1 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                      Role Sistem (Standard)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['admin', 'direksi', 'manager', 'staff'].map(r => (
                        <Badge key={r} type={r === 'admin' ? 'admin' : 'low'}>{r}</Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">* Role sistem bersifat permanen untuk menjaga keamanan hak akses.</p>
                  </div>

                  <div className="flex items-center justify-between p-3.5 md:p-5 border-2 border-slate-100 rounded-xl bg-slate-50 mt-5 md:mt-6 cursor-pointer" onClick={() => setConfigForm({...configForm, autoEmail: !configForm.autoEmail})}>
                    <div>
                      <h4 className="font-bold text-slate-800 text-[11px] md:text-sm">Kirim Notifikasi Laporan Harian</h4>
                      <p className="text-[9px] md:text-xs text-slate-500 mt-0.5 font-medium">Email otomatis ke staff jika ada deadline.</p>
                    </div>
                    <div className={`w-10 h-5 md:w-12 md:h-6 ${configForm.autoEmail ? 'bg-indigo-500' : 'bg-slate-300'} rounded-full relative transition-colors shrink-0`}><div className={`w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full absolute top-[3px] md:top-1 transition-all ${configForm.autoEmail ? 'right-1' : 'left-1'}`}></div></div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3.5 md:p-5 border-2 border-slate-100 rounded-xl bg-slate-50 cursor-pointer" onClick={() => setConfigForm({...configForm, maintenanceMode: !configForm.maintenanceMode})}>
                    <div>
                      <h4 className="font-bold text-slate-800 text-[11px] md:text-sm">Mode Perbaikan (Maintenance)</h4>
                      <p className="text-[9px] md:text-xs text-slate-500 mt-0.5 font-medium">Kunci akses sistem untuk semua non-Admin.</p>
                    </div>
                    <div className={`w-10 h-5 md:w-12 md:h-6 ${configForm.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'} rounded-full relative transition-colors shrink-0`}><div className={`w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full absolute top-[3px] md:top-1 transition-all ${configForm.maintenanceMode ? 'right-1' : 'left-1'}`}></div></div>
                  </div>
                  
                  <button type="button" onClick={handleSaveConfig} className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors text-xs md:text-sm">Simpan Pengaturan</button>
                </div>
              </Card>
            </div>
          )}

          {/* === MODAL 1: DETAIL TUGAS & APPROVAL === */}
          {selectedTask && activeTab !== 'chat' && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex justify-center items-end md:items-center md:p-8 print:hidden">
              <div className="w-full h-[85vh] md:max-w-6xl md:h-[90vh] bg-white rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 duration-300">
                
                {/* PANEL KIRI: INFO TUGAS */}
                <div className="w-full md:w-1/2 flex flex-col bg-white border-b md:border-b-0 md:border-r border-slate-200 h-[50%] md:h-full">
                  <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-base md:text-xl text-slate-800 tracking-tight">Informasi Pekerjaan</h3>
                      
                      {/* FITUR BARU: TOMBOL HAPUS DI DALAM MODAL DETAIL (KHUSUS ADMIN) */}
                      {currentUser?.role === 'admin' && (
                        <button 
                          type="button" 
                          onClick={() => handleDeleteTask(selectedTask.id, selectedTask.title)} 
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg border border-red-200 text-[10px] font-black transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      )}
                    </div>
                    {/* Tombol exit khusus Mobile/HP */}
                    <button type="button" onClick={() => setSelectedTask(null)} className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-full shadow-sm"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="p-5 md:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-slate-50/30">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {selectedTask.dueDate < new Date().toISOString().split('T')[0] && selectedTask.status !== 'done' && (
                          <Badge type="overdue">OVERDUE (TERLAMBAT)</Badge>
                        )}
                        <Badge type={selectedTask.status}>{String(selectedTask.status).replace('-', ' ').toUpperCase()}</Badge>
                        <Badge type={selectedTask.priority}>PRIORITAS {selectedTask.priority.toUpperCase()}</Badge>
                      </div>
                      
                      <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight">{selectedTask.title}</h2>
                      
                      {/* RIWAYAT TANGGAL & APPROVAL */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diberikan Pada</span>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500"/> 
                            {selectedTask.created_at ? selectedTask.created_at.split('T')[0] : '-'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col border-l border-slate-100 pl-3 md:pl-4">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Batas Waktu</span>
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedTask.dueDate < new Date().toISOString().split('T')[0] && selectedTask.status !== 'done' ? 'text-red-600' : 'text-slate-700'}`}>
                            <Clock className="w-3.5 h-3.5"/> {selectedTask.dueDate}
                          </span>
                        </div>
                        
                        <div className="flex flex-col pt-3 md:pt-0 md:border-l border-slate-100 md:pl-4 col-span-2 md:col-span-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tgl Selesai</span>
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedTask.status === 'done' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3.5 h-3.5"/> {selectedTask.completed_at || '-'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col pt-3 md:pt-0 border-l border-slate-100 pl-3 md:pl-4 col-span-2 md:col-span-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Di-Approve Oleh</span>
                          <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedTask.approved_by ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <ShieldCheck className="w-3.5 h-3.5"/> {selectedTask.approved_by ? getUserName(selectedTask.approved_by) : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-700 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 font-medium text-xs md:text-sm leading-relaxed shadow-sm">
                        <span className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Instruksi Detail:</span>
                        {selectedTask.description || 'Tidak ada deskripsi tambahan.'}
                      </div>
                    </div>

                    {/* AREA APPROVAL KHUSUS PEMBERI TUGAS / ADMIN */}
                    {(String(selectedTask.assignedBy) === String(currentUser.id) || currentUser.role === 'admin') && selectedTask.status === 'waiting-approval' && (
                      <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl animate-pulse shadow-sm">
                        <p className="text-xs font-black text-orange-700 uppercase mb-3 text-center">Butuh Konfirmasi Penyelesaian</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => handleApproveTask(selectedTask.id, true)}
                            className="bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md"
                          >
                            <Check className="w-4 h-4"/> Approve Selesai
                          </button>
                          <button 
                            onClick={() => handleApproveTask(selectedTask.id, false)}
                            className="bg-white text-red-600 border border-red-200 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 shadow-sm"
                          >
                            <X className="w-4 h-4"/> Tolak & Revisi
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LAMPIRAN BUKTI */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                        <div>
                          <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base">
                            <Paperclip className="w-4 h-4 text-indigo-500"/> Lampiran Bukti
                          </h4>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase">PDF / JPG / PNG Max 5MB</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {/* 1. TOMBOL UPLOAD FILE/GALERI */}
                          <input type="file" id="upload-bukti" accept=".pdf, image/*" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                          <label htmlFor={isUploading ? "" : "upload-bukti"} className={`text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm ${isUploading ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 cursor-pointer hover:bg-indigo-100 border border-indigo-200'}`}>
                            {isUploading ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Proses...
                              </>
                            ) : (
                              <><Plus className="w-3.5 h-3.5"/> Galeri</>
                            )}
                          </label>

                          {/* 2. TOMBOL KAMERA KHUSUS HP (Otomatis buka kamera) */}
                          <input type="file" id="upload-kamera" accept="image/*" capture="environment" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                          <label htmlFor={isUploading ? "" : "upload-kamera"} className={`text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm ${isUploading ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 text-white cursor-pointer hover:bg-black border border-slate-900'}`}>
                            <Camera className="w-3.5 h-3.5"/> Kamera
                          </label>
                        </div>
                      </div>

                      {/* DAFTAR FILE LAMPIRAN */}
                      <div className="space-y-2">
                          {(selectedTask.attachments || []).map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => window.open(file.url, '_blank')}>
                                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm"><ImageIcon className="w-4 h-4 text-slate-400"/></div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-700 truncate block hover:text-indigo-600">{file.name}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase truncate">Oleh: {getUserName(file.uploaderId)}</span>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => window.open(file.url, '_blank')} className="text-indigo-600 p-1.5 hover:bg-indigo-100 rounded-lg bg-white border border-slate-200 shadow-sm"><Download className="w-4 h-4"/></button>
                                {(String(file.uploaderId) === String(currentUser.id) || currentUser.role === 'admin') && (
                                  <button onClick={() => handleDeleteAttachment(file.id, file.name)} className="text-red-600 p-1.5 hover:bg-red-100 rounded-lg bg-white border border-slate-200 shadow-sm"><Trash2 className="w-4 h-4"/></button>
                                )}
                              </div>
                            </div>
                          ))}
                          {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4 border-2 border-dashed border-slate-100 rounded-xl">Belum Ada Lampiran</p>
                          )}
                        </div>
                      </div>
                  </div>
                </div>

                {/* PANEL KANAN: CHAT & TOMBOL EXIT */}
                <div className="w-full md:w-1/2 flex flex-col bg-slate-100 h-[50%] md:h-full relative border-t md:border-t-0 md:border-l border-slate-200">
                  
                  {/* Header Chat & Tombol Exit (Desktop) */}
                  <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                    <h3 className="font-black text-base md:text-xl text-slate-800 flex items-center gap-2"><MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Kolom Diskusi</h3>
                    {/* Tombol exit khusus Desktop/PC */}
                    <button type="button" onClick={() => setSelectedTask(null)} className="hidden md:flex text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 p-2 rounded-full border border-slate-200 transition-colors shadow-sm"><X className="w-5 h-5" /></button>
                  </div>

                  {/* Isi Chat */}
                  <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
                    {(Array.isArray(selectedTask?.comments) ? selectedTask.comments : []).map((chat, idx) => {
                      const isMe = String(chat?.userId) === String(currentUser?.id);
                      return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 md:p-4 rounded-2xl shadow-sm max-w-[85%] ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                            <p className="text-[11px] md:text-sm font-medium leading-relaxed">{chat?.text || ''}</p>
                          </div>
                          <span className="text-[8px] md:text-[10px] font-black tracking-widest text-slate-400 mt-1 px-1 uppercase">{isMe ? 'Anda' : getUserName(chat?.userId)} • {chat?.timestamp || ''}</span>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input form untuk Chat */}
                  <div className="p-3 md:p-5 bg-white border-t border-slate-200 pb-10 md:pb-safe shrink-0">
                    <form onSubmit={handleAddComment} className="flex gap-2 items-center pb-2 md:pb-0">
                      <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ketik pesan..." className="flex-1 px-3 py-2.5 md:px-4 md:py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-xs md:text-sm bg-slate-50 focus:bg-white font-bold transition-colors" />
                      <button type="submit" disabled={!newComment.trim()} className="bg-indigo-600 text-white p-2.5 md:p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transform hover:-translate-y-0.5 shadow-sm shrink-0 transition-transform"><Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" /></button>
                    </form>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* === MODAL 2: TUGAS BARU === */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex justify-end md:justify-center items-end md:items-center md:p-4 print:hidden">
              <Card className="w-full h-[90vh] md:h-auto md:max-w-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in duration-300 border-0 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] md:shadow-2xl rounded-t-[2rem] rounded-b-none md:rounded-2xl mt-auto md:mt-0 relative bg-white"> 
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-indigo-500 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                  <div>
                     <h3 className="font-black text-base md:text-xl tracking-tight">{currentUser.role === 'staff' ? 'Catat Tugas Mandiri' : 'Form Instruksi Baru'}</h3>
                     <p className="text-indigo-200 text-[9px] md:text-[10px] font-medium mt-0.5">Isi rincian detail pekerjaan.</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
                
                <form id="createTaskForm" onSubmit={handleCreateTask} className="flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto custom-scrollbar flex-1 bg-white p-5 md:p-8 space-y-4 md:space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Judul Pekerjaan</label>
                        <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Prioritas</label>
                          <select className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Deadline</label>
                          <input required type="date" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})}/>
                        </div>
                      </div>
                      {currentUser.role !== 'staff' && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pilih Penerima</label>
                          <div className="max-h-32 md:max-h-40 overflow-y-auto border-2 border-slate-200 rounded-xl p-2 space-y-1 custom-scrollbar bg-slate-50">
                            {users.filter(u => (currentUser.role === 'direksi' || currentUser.role === 'admin') ? (u.role === 'manager' || u.role === 'staff') : u.role === 'staff').map(user => (
                              <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg cursor-pointer transition-colors shadow-sm">
                                <input type="checkbox" checked={newTask.assignedTo.includes(user.id)} onChange={(e) => setNewTask(p => ({ ...p, assignedTo: e.target.checked ? [...p.assignedTo, user.id] : p.assignedTo.filter(id => id !== user.id) }))} className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                                <span className="text-[11px] md:text-xs font-bold text-slate-700">{user.name} <span className="text-[9px] text-slate-400 font-bold ml-1">({user.division})</span></span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Instruksi Detail</label>
                        <textarea required rows="3" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none resize-none font-medium min-h-[100px]" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}></textarea>
                      </div>
                  </div>
                  <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-100 bg-slate-50 pb-10 shrink-0">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 md:px-5 md:py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                      <button type="submit" className="px-4 py-2.5 md:px-5 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-md">Simpan Pekerjaan</button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* === MODAL 3: TAMBAH PENGGUNA === */}
          {isUserModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex justify-end md:justify-center items-end md:items-center md:p-4 print:hidden">
              <Card className="w-full h-[90vh] md:h-auto md:max-w-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in duration-300 border-0 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] md:shadow-2xl rounded-t-[2rem] rounded-b-none md:rounded-2xl mt-auto md:mt-0 relative bg-white">
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-white shrink-0">
                  <div>
                     <h3 className="font-black text-base md:text-xl tracking-tight">Tambah Pengguna</h3>
                     <p className="text-slate-400 text-[12px] md:text-[13px] font-medium mt-0.5">Buat akun untuk karyawan baru.</p>
                  </div>
                  <button type="button" onClick={() => setIsUserModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
                <form onSubmit={handleCreateUser} className="flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto custom-scrollbar flex-1 bg-white p-5 md:p-8 space-y-4 md:space-y-6">  
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">NIK (Username Login)</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newUser.nik} onChange={e => setNewUser({...newUser, nik: e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Role Akses</label>
                        <select className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="staff">Staff</option><option value="manager">Manager</option><option value="direksi">Direksi</option><option value="admin">Admin</option></select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Divisi</label>
                        <select required className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={newUser.division} onChange={e => setNewUser({...newUser, division: e.target.value})}><option value="">-- Pilih Divisi --</option>{divisions.map(div => <option key={div} value={div}>{div}</option>)}</select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Posisi Jabatan</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" placeholder="Contoh: Staff Logistik" value={newUser.position} onChange={e => setNewUser({...newUser, position: e.target.value})}/>
                    </div>
                  </div>
                  <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-100 bg-slate-50 pb-10 shrink-0">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2.5 md:px-5 md:py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                    <button type="submit" className="px-4 py-2.5 md:px-5 md:py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs md:text-sm shadow-md">Simpan Pengguna</button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* === MODAL 4: EDIT PENGGUNA === */}
          {isEditUserModalOpen && editingUser && (
            <div className="fixed inset-0 bg-slate-900/70 z-[80] flex justify-center md:items-center md:p-4 print:hidden">
              <Card className="w-full h-full md:h-auto md:max-w-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in duration-300 border-0 shadow-2xl md:rounded-2xl">
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-indigo-600 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                  <div>
                     <h3 className="font-black text-base md:text-xl tracking-tight">Edit Data Pengguna</h3>
                     <p className="text-indigo-200 text-[9px] md:text-[10px] font-medium mt-0.5">Ubah informasi divisi atau jabatan.</p>
                  </div>
                  <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
                <form onSubmit={handleUpdateUser} className="flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto custom-scrollbar flex-1 bg-white p-5 md:p-8 space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Role Akses</label>
                        <select className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}><option value="staff">Staff</option><option value="manager">Manager</option><option value="direksi">Direksi</option><option value="admin">Admin</option></select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Divisi</label>
                        <select required className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={editingUser.division} onChange={e => setEditingUser({...editingUser, division: e.target.value})}>{divisions.map(div => <option key={div} value={div}>{div}</option>)}</select>
                      </div>
                    </div>

                    {editingUser.role === 'manager' && (
                      <label className="flex items-start gap-3 p-4 border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={editingUser.crossDivision || false} 
                          onChange={(e) => setEditingUser({...editingUser, crossDivision: e.target.checked})}
                          className="w-5 h-5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs md:text-sm font-black text-indigo-900 block">Izin Pantau Lintas Divisi</span>
                          <span className="text-[10px] md:text-[11px] font-medium text-indigo-600 block mt-0.5">Berikan akses ke manager ini untuk melihat tugas seluruh staf di luar divisinya.</span>
                        </div>
                      </label>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Posisi Jabatan</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold" value={editingUser.position} onChange={e => setEditingUser({...editingUser, position: e.target.value})}/>
                    </div>
                  </div>
                  <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-100 bg-slate-50 pb-10 shrink-0">
                    <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="px-4 py-2.5 md:px-5 md:py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                    <button type="submit" className="px-4 py-2.5 md:px-5 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-md">Simpan Perubahan</button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* === MODAL 5: INPUT PENGGUNA MASSAL (TABEL) === */}
          {isMassUserModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex justify-center items-center p-4 print:hidden">
              <Card className="w-full h-[90vh] md:max-w-6xl flex flex-col overflow-hidden animate-in zoom-in duration-300 border-0 shadow-2xl rounded-2xl relative bg-slate-50"> 
                
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-emerald-500 flex justify-between items-center bg-emerald-600 text-white shrink-0">
                  <div>
                    <h3 className="font-black text-base md:text-xl tracking-tight">Input Pengguna Massal</h3>
                    <p className="text-emerald-100 text-[10px] md:text-xs font-medium mt-0.5">Ketik data langsung di tabel bawah ini. Kosongkan baris yang tidak dipakai.</p>
                  </div>
                  <button type="button" onClick={() => setIsMassUserModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
                
                <div className="overflow-auto custom-scrollbar flex-1 p-4 md:p-6 bg-white">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 text-[10px] md:text-xs uppercase tracking-widest font-black border-y border-slate-200">
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3 w-32">NIK *</th>
                        <th className="p-3">Nama Lengkap *</th>
                        <th className="p-3 w-32">Password</th>
                        <th className="p-3 w-32">Role</th>
                        <th className="p-3 w-40">Divisi</th>
                        <th className="p-3 w-48">Jabatan</th>
                        <th className="p-3 w-12 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {massUsersData.map((row, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 focus-within:bg-indigo-50/30">
                          <td className="p-2 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                          <td className="p-2"><input type="text" placeholder="NIK..." value={row.nik} onChange={(e) => handleMassChange(index, 'nik', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none" /></td>
                          <td className="p-2"><input type="text" placeholder="Nama Lengkap..." value={row.name} onChange={(e) => handleMassChange(index, 'name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none" /></td>
                          <td className="p-2"><input type="text" placeholder="123456" value={row.password} onChange={(e) => handleMassChange(index, 'password', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none" title="Kosongkan jika ingin password default: 123456" /></td>
                          <td className="p-2">
                            <select value={row.role} onChange={(e) => handleMassChange(index, 'role', e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none bg-white">
                              <option value="staff">Staff</option><option value="manager">Manager</option><option value="direksi">Direksi</option><option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select value={row.division} onChange={(e) => handleMassChange(index, 'division', e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none bg-white">
                              <option value="">-- Pilih --</option>
                              {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                            </select>
                          </td>
                          <td className="p-2"><input type="text" placeholder="Posisi..." value={row.position} onChange={(e) => handleMassChange(index, 'position', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none" /></td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => removeMassRow(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <button type="button" onClick={addMassRow} className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-xs md:text-sm px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 border-dashed w-full justify-center">
                    <Plus className="w-4 h-4" /> Tambah Baris Kosong Baru
                  </button>
                </div>

                <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-200 bg-slate-100 shrink-0">
                  <button type="button" onClick={() => setIsMassUserModalOpen(false)} className="px-4 py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                  <button type="button" onClick={handleSaveMassTable} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-md flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Simpan Semua Data
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* BOTTOM NAVIGATION MOBILE (ALA M-BANKING) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-[60]">
            {/* Tambahan pb-safe untuk iPhone agar tidak menabrak garis bawah layar */}
            <div className="flex justify-between items-center h-[72px] pb-safe px-4">
              
              <button type="button" onClick={() => navigateTo('dashboard')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                <LayoutDashboard className={`w-6 h-6 ${activeTab === 'dashboard' ? 'text-indigo-600 fill-indigo-50' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-black tracking-wide ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>Beranda</span>
              </button>
              
              <button type="button" onClick={() => navigateTo('tasks')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                <CheckSquare className={`w-6 h-6 ${activeTab === 'tasks' ? 'text-indigo-600 fill-indigo-50' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-black tracking-wide ${activeTab === 'tasks' ? 'text-indigo-600' : 'text-slate-400'}`}>Tugas</span>
              </button>
              
              {/* TOMBOL TENGAH (FLOATING ACTION BUTTON TULEN) */}
              <div className="relative -top-5 flex justify-center w-16 shrink-0">
                 <button type="button" 
                   onClick={() => { if(activeTab === 'admin_users') setIsUserModalOpen(true); else setIsModalOpen(true); }} 
                   className="bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(79,70,229,0.35)] border-4 border-slate-50 transform transition-transform hover:scale-105 active:scale-95">
                   {activeTab === 'admin_users' ? <UserPlus className="w-6 h-6" /> : <Plus className="w-7 h-7" strokeWidth={3} />}
                 </button>
              </div>

              {(currentUser.role === 'staff') ? (
                <button type="button" onClick={() => navigateTo('laporan')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                  <FileText className={`w-6 h-6 ${activeTab === 'laporan' ? 'text-indigo-600 fill-indigo-50' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-black tracking-wide ${activeTab === 'laporan' ? 'text-indigo-600' : 'text-slate-400'}`}>Laporan</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigateTo('division')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                  <Users className={`w-6 h-6 ${activeTab === 'division' ? 'text-indigo-600 fill-indigo-50' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-black tracking-wide ${activeTab === 'division' ? 'text-indigo-600' : 'text-slate-400'}`}>Tim</span>
                </button>
              )}
              
              <button type="button" onClick={() => navigateTo('chat')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 relative transition-colors">
                <div className="relative">
                   <MessageSquare className={`w-6 h-6 ${activeTab === 'chat' ? 'text-indigo-600 fill-indigo-50' : 'text-slate-400'}`} />
                   {unreadNotifsCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </div>
                <span className={`text-[10px] font-black tracking-wide ${activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}>Pesan</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* --- STYLES CSS UNTUK PRINT --- */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .mb-safe { margin-bottom: env(safe-area-inset-bottom); }

        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print-page { overflow: visible !important; height: auto !important; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-black { border-color: #000 !important; }
          .print\\:text-black { color: #000 !important; }
          .print\\:bg-black { background-color: #000 !important; color: white !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
        }
      `}} />
    </div>
  );
}