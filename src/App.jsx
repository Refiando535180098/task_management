import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.vkqrbcyowakcnnqhceyi.supabase.co;
const supabaseKey = import.meta.env.sb_publishable_aeI9Lp8G41z7jikyJ3MOcw_2peTH6w5;
const supabase = createClient(supabaseUrl, supabaseKey);
import { 
  Camera, LayoutDashboard, CheckSquare, Users, Plus, LogOut, Clock, CheckCircle2, AlertCircle,
  Search, Menu, X, ChevronDown, ChevronRight, MessageSquare, Paperclip, Send, FileText,
  Image as ImageIcon, BarChart3, Download, Calendar, TrendingUp, Briefcase, Printer,
  ShieldCheck, Building, Activity, Settings, UserPlus, Edit, Trash2, Bell, Lock, Check, Filter
} from 'lucide-react';

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
    done: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    mandiri: 'bg-purple-50 text-purple-600 border-purple-200',
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
    }
    e.target.value = ''; 
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

  const handleStatusUpdate = async (taskId, newStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({...selectedTask, status: newStatus});
    }

    if (newStatus === 'done') {
      setNotifications(prev => prev.filter(n => n.taskId !== taskId));
    }

    try {
      const { error } = await supabase
        .from('initial_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) {
        alert("Gagal mengupdate database: " + error.message);
      }
    } catch (error) {
      console.error(error);
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const assignedUserIds = currentUser.role === 'staff' ? [currentUser.id] : newTask.assignedTo;
    if (currentUser.role !== 'staff' && assignedUserIds.length === 0) return alert("Pilih minimal satu anggota atau tim!");

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
      
      const newUsers = [];
      for(let i = 1; i < lines.length; i++) {
        const [nik, password, name, role, division, position] = lines[i].split(',');
        
        if (nik && name) {
          const nameParts = name.trim().split(/\s+/);
          const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
          
          newUsers.push({
            nik: nik.trim(),
            password: password.trim(),
            name: name.trim(),
            role: role ? role.trim().toLowerCase() : 'staff',
            division: division ? division.trim() : 'Pusat',
            position: position ? position.trim() : '-',
            avatar: initials
          });
        }
      }

      if (newUsers.length === 0) return alert("Tidak ada data valid yang ditemukan dalam file CSV.");

      try {
        const { data, error } = await supabase.from('initial_users').insert(newUsers).select();
        
        if (!error && data) {
          setUsers([...users, ...data]);
          alert(`Berhasil menambahkan ${newUsers.length} pengguna secara massal!`);
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

    const newUsersToSave = validUsers.map(u => ({
      nik: u.nik.trim(),
      password: u.password.trim() || '123456',
      name: u.name.trim(),
      role: u.role || 'staff',
      division: u.division || 'Pusat',
      position: u.position.trim() || '-',
      avatar: u.name.trim().substring(0,2).toUpperCase()
    }));

    try {
      const { data, error } = await supabase.from('initial_users').insert(newUsersToSave).select();
      
      if (!error && data) {
        alert("Berhasil disimpan!");
        setUsers([...users, ...data]);
        setIsMassUserModalOpen(false);
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
              <img src="src/assets/Logo_apps.png" alt="Logo" />
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
  const myNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadNotifsCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row print:bg-white print:block">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-100 p-4 sticky top-0 z-30 print:hidden shadow-sm pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-1.5 rounded-lg shadow-sm">
            <img src="src/assets/Logo_apps.png" alt="Logo" className="w-6 h-6 object-contain" />
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

      {/* SIDEBAR NAVIGASI */}
      <aside className={`fixed md:relative top-0 bottom-0 left-0 w-72 bg-white/95 md:bg-white backdrop-blur-xl border-r border-slate-200/60 flex flex-col z-50 transition-all duration-300 ease-in-out print:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isSidebarOpen ? 'md:ml-0' : 'md:-ml-72'}`}>
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-2.5 rounded-2xl shadow-md"><img src="src/assets/Logo_apps.png" alt="Logo" /></div>
            <div><span className="font-black text-lg md:text-xl tracking-tight text-yellow-500 leading-none block uppercase">{sysConfig.brandName}<span className="text-xs md:text-sm text-slate-800 block mt-0.5"><br/>Task Management</span></span></div>
          </div>
          <button type="button" className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-full" onClick={() => setMobileMenuOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        
        <nav className="flex-1 p-4 md:p-5 space-y-1.5 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 mt-2">Menu Navigasi</p>
            <button type="button" onClick={() => navigateTo('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard className="w-5 h-5" /> Dashboard Kinerja</button>
            <button type="button" onClick={() => navigateTo('tasks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><CheckSquare className="w-5 h-5" /> Manajemen Pekerjaan</button>
            <button type="button" onClick={() => navigateTo('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <MessageSquare className="w-5 h-5" /> Pusat Pesan
            </button>

            {currentUser.role === 'staff' && <button type="button" onClick={() => navigateTo('laporan')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><FileText className="w-5 h-5" /> Laporan Hasil Saya</button>}
            
            {(currentUser.role !== 'staff') && <button type="button" onClick={() => navigateTo('laporan', () => setReportTargetUserId('ALL'))} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Printer className="w-5 h-5" /> Laporan & Cetak Global</button>}
            
            {(currentUser.role !== 'staff') && (
              <div className="pt-4 border-t border-slate-100 mt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3">Organisasi</p>
                <button type="button" onClick={() => setIsDivMenuOpen(!isDivMenuOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'division' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3"><Users className="w-5 h-5" /> Pantau Tim Divisi</div>
                  {isDivMenuOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isDivMenuOpen ? 'max-h-64 mt-2' : 'max-h-0'}`}>
                  <div className="ml-5 pl-4 border-l-2 border-slate-100 space-y-1 py-1">
                    {(currentUser.role === 'direksi' || currentUser.role === 'admin') && <button type="button" onClick={() => { navigateTo('division'); setSelectedDivision('Semua Divisi'); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${selectedDivision === 'Semua Divisi' && activeTab === 'division' ? 'text-indigo-700 bg-indigo-50 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>Semua Divisi</button>}
                    {divisions.filter(div => (currentUser.role === 'direksi' || currentUser.role === 'admin') || div === currentUser.division).map(div => (
                      <button type="button" key={div} onClick={() => { navigateTo('division'); setSelectedDivision(div); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${selectedDivision === div && activeTab === 'division' ? 'text-indigo-700 bg-indigo-50 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>Divisi {div}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className="pt-4 border-t border-slate-100 mt-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3">Sistem Super Admin</p>
                 <button type="button" onClick={() => navigateTo('admin_users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_users' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><UserPlus className="w-5 h-5" /> Kelola Pengguna</button>
                 <button type="button" onClick={() => navigateTo('admin_settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_settings' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Settings className="w-5 h-5" /> Konfigurasi Sistem</button>
              </div>
            )}
        </nav>

        <div className="p-4 md:p-5 border-t border-slate-200 bg-slate-50/50 shrink-0 mb-10 md:mb-0">
          <div className="flex items-center gap-3 mb-4 md:mb-5 px-2">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-white text-sm md:text-lg shadow-md shrink-0 ${currentUser.role === 'admin' ? 'bg-slate-800' : currentUser.role === 'direksi' ? 'bg-purple-600' : currentUser.role === 'manager' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{currentUser.avatar}</div>
            <div className="flex-1 overflow-hidden">
              <p className="font-extrabold text-xs md:text-sm text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{currentUser.role} • {currentUser.division}</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm">
            <LogOut className="w-4 h-4" /> Keluar Akun
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

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 md:space-y-8 print:hidden animate-in fade-in duration-300">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                  { title: 'Total Tugas', count: activeTasks.length, color: 'slate', icon: LayoutDashboard },
                  { title: 'Pending', count: activeTasks.filter(t => t.status === 'pending').length, color: 'orange', icon: Clock },
                  { title: 'In Progress', count: activeTasks.filter(t => t.status === 'in-progress').length, color: 'indigo', icon: Activity },
                  { title: 'Selesai', count: activeTasks.filter(t => t.status === 'done').length, color: 'emerald', icon: CheckCircle2 },
                ].map((stat, i) => {
                  const rate = activeTasks.length === 0 ? 0 : Math.round((activeTasks.filter(t => t.status === 'done').length / activeTasks.length) * 100);
                  return (
                    <Card key={i} className={`p-4 md:p-6 border-0 shadow-sm relative overflow-hidden group bg-white`}>
                      <div className={`absolute -right-4 -top-4 md:-right-6 md:-top-6 w-16 h-16 md:w-24 md:h-24 bg-${stat.color}-50 rounded-full opacity-60 z-0`}></div>
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-2 md:mb-4"><p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">{stat.title}</p><stat.icon className={`w-4 h-4 md:w-5 md:h-5 text-${stat.color}-500 hidden sm:block`} /></div>
                        <div className="flex flex-col sm:flex-row sm:items-end gap-1 md:gap-2">
                          <h3 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tighter">{stat.count}</h3>
                          {stat.title === 'Selesai' && <span className="text-[9px] md:text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md w-fit mb-0 md:mb-1.5">{rate}% Selesai</span>}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 space-y-6 md:space-y-8 overflow-hidden">
                  {(currentUser.role !== 'staff') && (
                    <Card className="border-0 shadow-sm overflow-hidden bg-white w-full">
                      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-black text-lg md:text-xl text-slate-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 md:w-6 h-6 text-emerald-500"/> Log Pekerjaan Selesai</h3>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-inner w-full sm:w-auto overflow-hidden">
                          <select value={dashDivFilter} onChange={(e) => setDashDivFilter(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 border-0 bg-transparent text-xs md:text-sm font-bold text-indigo-700 focus:outline-none cursor-pointer">
                            {(currentUser.role === 'direksi' || currentUser.role === 'admin') && <option value="Semua Divisi">Semua Divisi</option>}
                            {divisions.filter(div => (currentUser.role === 'direksi' || currentUser.role === 'admin') || div === currentUser.division).map(div => <option key={div} value={div}>{div}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-auto w-full custom-scrollbar pb-2">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                                <th className="p-3 md:p-5">Staf</th><th className="p-3 md:p-5">Tugas Diselesaikan</th><th className="p-3 md:p-5">Divisi</th><th className="p-3 md:p-5 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tasks.filter(t => t.status === 'done' && (dashDivFilter === 'Semua Divisi' || getAssigneesArray(t.assignedTo).some(id => users.find(u => u.id === id)?.division === dashDivFilter))).slice(0, 5).map((task) => {
                                  const assignees = getAssigneesArray(task.assignedTo);
                                  return (
                                    <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                      <td className="p-3 md:p-5 flex items-center gap-2 md:gap-3">
                                        <div className="flex -space-x-2">
                                          {assignees.map(id => (
                                            <div key={id} title={getUserName(id)} className="w-7 h-7 md:w-9 h-9 rounded-lg md:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[10px] md:text-sm border border-white relative">{getAvatar(id)}</div>
                                          ))}
                                        </div>
                                        <div><span className="font-bold text-slate-800 block line-clamp-1 max-w-[80px] md:max-w-[150px] text-[10px] md:text-xs">{getAssigneesNames(task.assignedTo)}</span></div>
                                      </td>
                                      <td className="p-3 md:p-5">
                                        <span className="font-bold text-slate-800 cursor-pointer hover:text-indigo-600 block line-clamp-2 md:truncate max-w-[150px] md:max-w-[250px] text-xs md:text-sm" onClick={() => setSelectedTask(task)}>{task.title}</span>
                                        <span className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> Selesai</span>
                                      </td>
                                      <td className="p-3 md:p-5 font-bold text-slate-600 text-xs md:text-sm"><Badge type="low">{users.find(u => u.id === assignees[0])?.division}</Badge></td>
                                      <td className="p-3 md:p-5 text-right"><Badge type="done">Done</Badge></td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                      </div>
                    </Card>
                  )}

                  {currentUser.role === 'staff' && (
                    <Card className="border-0 shadow-sm overflow-hidden bg-white">
                      <div className="p-4 md:p-6 border-b border-slate-100">
                        <h3 className="font-black text-lg md:text-xl text-slate-800 flex items-center gap-2"><AlertCircle className="w-5 h-5 md:w-6 h-6 text-orange-500"/> Prioritas Pekerjaan</h3>
                      </div>
                      <div className="p-0 max-h-[350px] overflow-y-auto custom-scrollbar">
                        {myTasks.filter(t => t.status !== 'done').sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5).map((task) => (
                          <div key={task.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 hover:bg-slate-50/80 border-b border-slate-100">
                              <div className="flex items-start gap-3 md:gap-4">
                                  <div className={`p-2.5 md:p-3 rounded-xl shadow-sm border ${task.priority === 'high' ? 'bg-red-50 text-red-500 border-red-100' : task.priority === 'medium' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}><Clock className="w-4 h-4 md:w-5 h-5" /></div>
                                  <div>
                                      <h4 className="font-bold text-sm md:text-base text-slate-800 cursor-pointer hover:text-indigo-600 line-clamp-2" onClick={() => setSelectedTask(task)}>{task.title}</h4>
                                      <div className="flex flex-wrap gap-2 text-[10px] md:text-xs text-slate-500 mt-1.5 font-bold"><span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {task.dueDate}</span><span className="hidden sm:inline">•</span><span>Oleh: {getUserName(task.assignedBy)}</span></div>
                                  </div>
                              </div>
                              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1.5 mt-2 sm:mt-0"><Badge type={task.status}>{task.status}</Badge><Badge type={task.priority}>{task.priority}</Badge></div>
                          </div>
                        ))}
                        {myTasks.filter(t => t.status !== 'done').length === 0 && <p className="p-6 text-center text-sm font-bold text-slate-400">Semua tugas sudah diselesaikan! 🎉</p>}
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-6 md:space-y-8">
                  <Card className="p-5 md:p-6 border-0 shadow-sm bg-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-indigo-50 rounded-bl-full -z-10"></div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`w-14 h-14 md:w-16 h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-lg shrink-0 ${currentUser.role === 'admin' ? 'bg-slate-800' : currentUser.role === 'direksi' ? 'bg-purple-600' : currentUser.role === 'manager' ? 'bg-blue-600' : 'bg-emerald-600'}`}>{currentUser.avatar}</div>
                      <div className="overflow-hidden">
                        <h4 className="font-black text-lg md:text-xl text-slate-800 tracking-tight truncate">{currentUser.name}</h4>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold mb-1 truncate">{currentUser.position || 'Admin Utama'}</p>
                        <Badge type="low">Divisi {currentUser.division}</Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 md:p-6 border-0 shadow-sm bg-white">
                    <h3 className="font-black text-sm md:text-base text-slate-800 mb-4 md:mb-6 border-b border-slate-100 pb-3 md:pb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 md:w-5 h-5 text-indigo-500"/> Ringkasan Beban Kerja</h3>
                    <div className="space-y-4 md:space-y-6">
                      {['high', 'medium', 'low'].map(prio => {
                        const count = activeTasks.filter(t => String(t.priority).toLowerCase().trim() === prio).length;
                        const total = activeTasks.length > 0 ? activeTasks.length : 1; 
                        
                        const colors = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' };
                        const bgColors = { high: 'bg-red-50', medium: 'bg-amber-50', low: 'bg-blue-50' };
                        const labels = { high: 'Prioritas Tinggi', medium: 'Prioritas Sedang', low: 'Prioritas Rendah' };
                        
                        return (
                          <div key={prio}>
                            <div className="flex justify-between text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 md:mb-2">
                              <span>{labels[prio]}</span>
                              <span className="text-slate-800">{count} Tugas</span>
                            </div>
                            <div className={`w-full ${bgColors[prio]} rounded-full h-2 md:h-2.5 overflow-hidden shadow-inner`}>
                              <div className={`${colors[prio]} h-full rounded-full transition-all duration-500`} style={{width: `${(count/total)*100}%`}}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 print:hidden animate-in fade-in duration-300">
               <Card className="p-3 md:p-4 bg-white border-slate-200 shadow-sm mb-4">
                 <div className="flex flex-col xl:flex-row gap-3 md:gap-4 items-start xl:items-center justify-between">
                   <div className="flex items-center gap-2 shrink-0">
                     <Filter className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                     <span className="font-bold text-slate-700 text-xs md:text-sm uppercase tracking-wider">Cari & Filter:</span>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full xl:w-auto">
                     <div className="flex items-center relative w-full sm:w-48 md:w-56 shrink-0">
                       <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 absolute left-3" />
                       <input type="text" placeholder="Ketik judul tugas..." value={taskSearchQuery} onChange={(e) => setTaskSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 md:py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white" />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Bulan:</label>
                       <input type="month" value={taskFilterMonth} onChange={(e) => {setTaskFilterMonth(e.target.value); setTaskFilterDate('');}} className="px-2 py-1.5 md:px-3 md:py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-indigo-500 outline-none w-full sm:w-auto" />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Tgl:</label>
                       <input type="date" value={taskFilterDate} onChange={(e) => {setTaskFilterDate(e.target.value); setTaskFilterMonth('');}} className="px-2 py-1.5 md:px-3 md:py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-indigo-500 outline-none w-full sm:w-auto" />
                     </div>
                     
                     {(taskFilterMonth || taskFilterDate || taskSearchQuery) && (
                       <button type="button" onClick={() => {setTaskSearchQuery(''); setTaskFilterMonth(''); setTaskFilterDate('');}} className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-100 px-3 py-1.5 md:py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm w-full sm:w-auto">Reset</button>
                     )}
                   </div>
                 </div>
               </Card>

               <div className="grid grid-cols-1 gap-3 md:gap-3 max-h-[calc(100vh-240px)] overflow-y-auto custom-scrollbar pr-1 md:pr-2 pb-24 md:pb-10">
                  {myTasks.filter(t => {
                   if (taskSearchQuery && !t.title.toLowerCase().includes(taskSearchQuery.toLowerCase())) return false;
                   if (taskFilterMonth && !t.dueDate.startsWith(taskFilterMonth)) return false;
                   if (taskFilterDate && t.dueDate !== taskFilterDate) return false;
                   return true;
                }).map(task => {
                  const assigneesArr = getAssigneesArray(task.assignedTo);
                  const isMandiri = assigneesArr.length === 1 && assigneesArr[0] === task.assignedBy;
                  
                  return (
                  <Card key={task.id} className="p-3 md:p-4 hover:shadow-md transition-all duration-300 border border-slate-200/60 relative overflow-hidden group bg-white">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'in-progress' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                    <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4 pl-2 md:pl-3">
                      <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <Badge type={task.status}>{task.status}</Badge>
                          <Badge type={task.priority}>PRIO: {task.priority}</Badge>
                          {isMandiri && <Badge type="mandiri">MANDIRI</Badge>}
                        </div>
                        <h3 className="font-black text-base md:text-lg text-slate-800 group-hover:text-indigo-600 transition-colors mb-1 tracking-tight line-clamp-1">{task.title}</h3>
                        <p className="text-slate-500 text-[11px] md:text-xs mb-2 md:mb-3 line-clamp-1 leading-relaxed font-medium">{task.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs font-bold text-slate-500">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-sm">
                            <Users className="w-3 h-3 md:w-4 h-4 text-slate-400" />
                            <div className="flex -space-x-1.5 md:-space-x-2 ml-1">
                              {assigneesArr.map(id => <div key={id} title={getUserName(id)} className="w-5 h-5 md:w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[8px] md:text-[10px] border border-white">{getAvatar(id)}</div>)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-sm">
                            <span className="font-black">Dari:</span> {getUserName(task.assignedBy)}
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-sm"><Clock className="w-3 h-3 md:w-4 h-4 text-slate-400" /> {task.dueDate}</div>
                          {task.comments?.length > 0 && <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-indigo-100 shadow-sm"><MessageSquare className="w-3 h-3 md:w-4 h-4" /> {task.comments.length}</div>}
                          {task.attachments?.length > 0 && <div className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-blue-100 shadow-sm"><Paperclip className="w-3 h-3 md:w-4 h-4" /> {task.attachments.length}</div>}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-center justify-center gap-2 min-w-0 md:min-w-[150px] pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 shrink-0">
                         <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-left md:text-center hidden md:block">Update Status</span>
                         <select 
                            value={task.status}
                            onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                            disabled={currentUser.role === 'admin' || currentUser.role === 'direksi'}
                            className={`w-full py-2 px-3 md:py-3 md:px-4 rounded-xl text-xs md:text-sm font-black border-2 focus:ring-4 focus:outline-none text-left md:text-center transition-all shadow-sm appearance-none
                              ${currentUser.role === 'admin' || currentUser.role === 'direksi' ? 'cursor-not-allowed opacity-80 ' : 'cursor-pointer '}
                              ${task.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : task.status === 'in-progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200'}`
                            }>
                            <option value="pending">PENDING</option><option value="in-progress">IN PROGRESS</option><option value="done">SELESAI</option>
                          </select>
                      </div>
                    </div>
                  </Card>
                )})}
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
                          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-white print:shadow-none shrink-0 print:rounded-none"><img src="src/assets/Logo_apps.png" alt="Logo" className="w-full h-full object-contain" /></div>
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
                          <table className="w-full text-left border-collapse border border-slate-200 print:border-black min-w-[400px]">
                            <thead>
                              <tr className="bg-slate-50 print:bg-gray-100 text-slate-800 print:text-black text-[8px] md:text-[9px] uppercase tracking-widest font-black border-b border-slate-200 print:border-black print:text-[8px]">
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black w-6 text-center print:p-1">No</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1">Deskripsi Tugas & Pekerjaan</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black print:p-1">Dikerjakan Oleh</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-r border-slate-200 print:border-black text-center print:p-1 w-16">Deadline</th>
                                <th className="px-2 py-1.5 md:px-3 md:py-2 border-slate-200 print:border-black text-center print:p-1 w-16">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {targetTasks.map((task, index) => { 
                                 return (
                                  <tr key={task.id} className="border-b border-slate-200 print:border-black print:text-[9px] hover:bg-slate-50 transition-colors">
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-bold text-slate-600 border-r border-slate-200 print:border-black print:text-black text-center print:p-1">{index + 1}</td>
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 font-bold text-slate-800 border-r border-slate-200 print:border-black print:text-black text-[10px] md:text-xs print:p-1 leading-tight">{task.title}</td>
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] font-bold text-indigo-600 border-r border-slate-200 print:border-black print:text-black print:p-1 line-clamp-1">{getAssigneesNames(task.assignedTo)}</td>
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-bold text-slate-600 border-r border-slate-200 print:border-black print:text-black text-center whitespace-nowrap print:p-1">{task.dueDate}</td>
                                    <td className="px-2 py-1.5 md:px-3 md:py-2 text-center border-slate-200 print:border-black print:text-black font-black uppercase text-[8px] md:text-[9px] tracking-wider print:p-1">
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
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 md:p-10">
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
                     <input 
                       type="text" 
                       placeholder="Cari nama atau NIK..." 
                       value={userSearchQuery} 
                       onChange={(e) => setUserSearchQuery(e.target.value)} 
                       className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white transition-colors" 
                     />
                   </div>
                 </div>

                 <div className="overflow-x-auto w-full custom-scrollbar pb-2">
                   <table className="w-full text-left border-collapse min-w-[500px]">
                     <thead>
                       <tr className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                         <th className="p-3 md:p-5 w-10 text-center">
                           <input 
                             type="checkbox" 
                             className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                             checked={
                               selectedUsers.length > 0 && 
                               selectedUsers.length === users.filter(u => 
                                 (!userSearchQuery || u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.nik?.toLowerCase().includes(userSearchQuery.toLowerCase())) && 
                                 u.role !== 'admin' 
                               ).length
                             }
                             onChange={(e) => handleSelectAllUsers(e, users)}
                           />
                         </th>
                         <th className="p-3 md:p-5">Pengguna & NIK</th><th className="p-3 md:p-5">Role Sistem</th><th className="p-3 md:p-5">Divisi</th><th className="p-3 md:p-5 text-right">Aksi</th>
                       </tr>
                     </thead>
                     <tbody>
                       {users
                         .filter(u => {
                           if (!userSearchQuery) return true;
                           const query = userSearchQuery.toLowerCase();
                           return (u.name?.toLowerCase().includes(query) || u.nik?.toLowerCase().includes(query));
                         })
                         .map(u => (
                         <tr key={u.id} className={`border-b hover:bg-slate-50/50 transition-colors ${selectedUsers.includes(u.id) ? 'bg-indigo-50/30 border-indigo-100' : 'border-slate-50'}`}>
                            <td className="p-3 md:p-5 text-center">
                              {u.role !== 'admin' && (
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  checked={selectedUsers.includes(u.id)}
                                  onChange={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                />
                              )}
                            </td>
                            <td className="p-3 md:p-5 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[10px] md:text-xs shrink-0">{u.avatar}</div>
                              <div>
                                <span className="font-bold text-slate-800 block text-xs md:text-sm">{u.name}</span>
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
                       {users.filter(u => !userSearchQuery || u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.nik?.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                         <tr>
                           <td colSpan="5" className="p-8 text-center text-sm font-bold text-slate-400">
                             Pengguna tidak ditemukan.
                           </td>
                         </tr>
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

          {/* === MODAL 1: DETAIL TUGAS === */}
          {selectedTask && activeTab !== 'chat' && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex justify-center items-end md:items-center md:p-8 print:hidden">
              <div className="w-full h-[85vh] md:max-w-6xl md:h-[90vh] bg-white rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 duration-300">
                
                <div className="w-full md:w-1/2 flex flex-col bg-white border-b md:border-b-0 md:border-r border-slate-200 h-[50%] md:h-full">
                  <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                    <h3 className="font-black text-base md:text-xl text-slate-800 tracking-tight">Detail Pekerjaan</h3>
                    <button type="button" onClick={() => setSelectedTask(null)} className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-full shadow-sm"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 md:p-8 overflow-y-auto flex-1 space-y-6 md:space-y-8 custom-scrollbar bg-slate-50/30">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                        <Badge type={selectedTask?.status || 'pending'}>{String(selectedTask?.status || 'pending').toUpperCase()}</Badge>
                        <Badge type={selectedTask?.priority || 'medium'}>{String(selectedTask?.priority || 'medium').toUpperCase()}</Badge>
                        <Badge type="admin">DIBERIKAN OLEH: {getUserName(selectedTask?.assignedBy)}</Badge>
                      </div>
                      <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight">{selectedTask?.title || 'Tanpa Judul'}</h2>
                      <div className="mt-3 md:mt-5 text-slate-700 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 font-medium text-xs md:text-sm">{selectedTask?.description || 'Tidak ada deskripsi.'}</div>
                    </div>
                    
                    {/* LAMPIRAN FILE/GAMBAR */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                        <div>
                          <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base"><Paperclip className="w-4 h-4 md:w-5 md:h-5 text-indigo-500"/> Lampiran Bukti</h4>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase">PDF / JPG / PNG Max 5MB</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="relative">
                            <input type="file" id="upload-bukti" accept=".pdf, image/png, image/jpeg" onChange={handleFileUpload} className="hidden" />
                            <label htmlFor="upload-bukti" className="text-[10px] md:text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shadow-sm">
                              <Plus className="w-3.5 h-3.5"/> Dari Galeri
                            </label>
                          </div>
                          <div className="relative">
                            <input type="file" id="upload-kamera" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                            <label htmlFor="upload-kamera" className="text-[10px] md:text-xs bg-slate-800 text-white font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 border border-slate-900 hover:bg-black transition-colors cursor-pointer shadow-sm">
                              <Camera className="w-3.5 h-3.5"/> Kamera
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 md:space-y-3 mt-4">
                        {(Array.isArray(selectedTask?.attachments) ? selectedTask.attachments : []).map(file => {
                          const isImage = file?.type?.startsWith('image/');
                          const isMine = file?.uploaderId === currentUser.id || currentUser.role === 'admin';
                          
                          return (
                            <div key={file?.id || Math.random()} className="flex items-center justify-between p-3 md:p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => file.url ? window.open(file.url, '_blank') : alert('File lama belum punya URL')}>
                                <div className={`p-2.5 md:p-3 rounded-lg shrink-0 ${isImage ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                  {isImage ? <ImageIcon className="w-4 h-4 md:w-5 md:h-5" /> : <FileText className="w-4 h-4 md:w-5 md:h-5" />}
                                </div>
                                <div className="min-w-0">
                                   <p className="text-xs md:text-sm font-bold text-slate-800 truncate hover:text-indigo-600">{file?.name || 'File'}</p>
                                   <p className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-0.5 uppercase truncate">Diunggah: {getUserName(file?.uploaderId)}</p>
                                </div>
                              </div>
                              
                              <div className="flex gap-1.5 md:gap-2 shrink-0 ml-2">
                                <button type="button" onClick={() => file.url ? window.open(file.url, '_blank') : alert('File lama tidak ada URL')} className="text-indigo-600 hover:bg-indigo-100 p-1.5 md:p-2 rounded-lg font-bold text-xs md:text-sm bg-white border border-slate-200 shadow-sm">
                                  <Download className="w-3.5 h-3.5 md:w-4 md:h-4"/>
                                </button>
                                
                                {isMine && (
                                  <button type="button" onClick={() => handleDeleteAttachment(file.id, file.name)} className="text-red-600 hover:bg-red-100 p-1.5 md:p-2 rounded-lg font-bold text-xs md:text-sm bg-white border border-slate-200 shadow-sm">
                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4"/>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {(!Array.isArray(selectedTask?.attachments) || selectedTask.attachments.length === 0) && (
                          <div className="text-center p-6 text-[11px] md:text-xs text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 uppercase tracking-widest">
                             Belum Ada Lampiran Disertakan
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col bg-slate-100 h-[50%] md:h-full relative border-t md:border-t-0 md:border-l border-slate-200">
                  <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                    <h3 className="font-black text-base md:text-xl text-slate-800 flex items-center gap-2"><MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Kolom Diskusi</h3>
                    <button type="button" onClick={() => setSelectedTask(null)} className="hidden md:flex text-slate-400 hover:text-red-500 bg-slate-50 p-2.5 rounded-full border border-slate-200"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
                    {(Array.isArray(selectedTask?.comments) ? selectedTask.comments : []).map((chat, idx) => {
                      const isMe = chat?.userId === currentUser?.id;
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
                  <div className="p-3 md:p-5 bg-white border-t border-slate-200 pb-10 shrink-0">
                    <form onSubmit={handleAddComment} className="flex gap-2 items-center pb-2 md:pb-0">
                      <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ketik pesan..." className="flex-1 px-3 py-2.5 md:px-4 md:py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-xs md:text-sm bg-slate-50 focus:bg-white" />
                      <button type="submit" disabled={!newComment.trim()} className="bg-indigo-600 text-white p-2.5 md:p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transform hover:-translate-y-0.5"><Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" /></button>
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

          {/* BOTTOM NAVIGATION MOBILE */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40 pb-safe print:hidden">
            <div className="flex justify-around items-center px-2 py-1.5 relative">
              
              <button type="button" onClick={() => navigateTo('dashboard')} className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 transition-all ${activeTab === 'dashboard' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                <div className={`p-1.5 rounded-full ${activeTab === 'dashboard' ? 'bg-indigo-50' : ''}`}><LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'fill-indigo-100' : ''}`} /></div>
                <span className="text-[9px] font-bold tracking-wide">Beranda</span>
              </button>
              
              <button type="button" onClick={() => navigateTo('tasks')} className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 transition-all ${activeTab === 'tasks' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                <div className={`p-1.5 rounded-full ${activeTab === 'tasks' ? 'bg-indigo-50' : ''}`}><CheckSquare className={`w-5 h-5 ${activeTab === 'tasks' ? 'fill-indigo-100' : ''}`} /></div>
                <span className="text-[9px] font-bold tracking-wide">Tugas</span>
              </button>
              
              <div className="relative -top-6 px-3 flex-shrink-0">
                 <button type="button" 
                   onClick={() => { if(activeTab === 'admin_users') setIsUserModalOpen(true); else setIsModalOpen(true); }} 
                   className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(79,70,229,0.4)] transform transition-transform hover:scale-105 active:scale-95 border-4 border-slate-50">
                   {activeTab === 'admin_users' ? <UserPlus className="w-6 h-6" /> : <Plus className="w-6 h-6" strokeWidth={3} />}
                 </button>
              </div>

              {(currentUser.role === 'staff') ? (
                <button type="button" onClick={() => navigateTo('laporan')} className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 transition-all ${activeTab === 'laporan' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                  <div className={`p-1.5 rounded-full ${activeTab === 'laporan' ? 'bg-indigo-50' : ''}`}><FileText className={`w-5 h-5 ${activeTab === 'laporan' ? 'fill-indigo-100' : ''}`} /></div>
                  <span className="text-[9px] font-bold tracking-wide">Laporan</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigateTo('division')} className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 transition-all ${activeTab === 'division' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                  <div className={`p-1.5 rounded-full ${activeTab === 'division' ? 'bg-indigo-50' : ''}`}><Users className={`w-5 h-5 ${activeTab === 'division' ? 'fill-indigo-100' : ''}`} /></div>
                  <span className="text-[9px] font-bold tracking-wide">Tim</span>
                </button>
              )}
              
              <button type="button" onClick={() => navigateTo('chat')} className={`flex flex-col items-center justify-center w-full py-1.5 gap-1 transition-all ${activeTab === 'chat' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                <div className={`p-1.5 rounded-full ${activeTab === 'chat' ? 'bg-indigo-50 relative' : 'relative'}`}>
                   <MessageSquare className={`w-5 h-5 ${activeTab === 'chat' ? 'fill-indigo-100' : ''}`} />
                   {unreadNotifsCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                </div>
                <span className="text-[9px] font-bold tracking-wide">Pesan</span>
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