import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import { supabase } from '../supabase';
import html2pdf from 'html2pdf.js';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { 
  Camera, LayoutDashboard, CheckSquare, Users, Plus, LogOut, Clock, CheckCircle2, AlertCircle,
  Search, Menu, X, ChevronDown, ChevronRight, MessageSquare, Paperclip, Send, FileText,
  Image as ImageIcon, BarChart3, Download, Calendar, TrendingUp, Briefcase, Printer,
  ShieldCheck, Building, Activity, Settings, UserPlus, Edit, Trash2, Bell, Lock, Check, Filter,
  Archive, DatabaseBackup, AlertTriangle, GripVertical, Loader2, PlusCircle, Info
} from 'lucide-react';


// ==========================================
// 2. KOMPONEN UI PENDUKUNG
// ==========================================
const Card = ({ children, className = '', id }) => (
  <div id={id} className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type }) => {
  const styles = {
    high: 'bg-red-50 text-red-600 border-red-200',
    medium: 'bg-blue-50 text-blue-600 border-blue-200',
    low: 'bg-blue-50 text-blue-600 border-blue-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    'in-progress': 'bg-blue-50 text-blue-600 border-blue-200',
    'waiting-approval': 'bg-orange-100 text-orange-700 border-orange-300 animate-pulse', 
    done: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    overdue: 'bg-red-600 text-white border-red-700 font-bold',
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
export default function TaskManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const [currentUser, setCurrentUser] = useState(null);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]); 
  const [notifications, setNotifications] = useState([]); 
  const [divisions, setDivisions] = useState([]);
  const prevUnreadCount = useRef(0); 
  
  // --- PEMICU SUARA NOTIFIKASI INTERNAL ---
  const isFirstLoad = useRef(true);

  // --- MINTA IZIN BROWSER UNTUK PUSH NOTIFICATION ---
  useEffect(() => {
    if (currentUser?.id) { 
      OneSignal.init({
        appId: "69d9f780-2a9f-4490-8aef-a7e8fa96fe2f", 
      }).then(() => {
        OneSignal.login(String(currentUser?.id)); 
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const currentUnread = notifications.filter(n => n.userId === currentUser.id && !n.read).length;
    
    if (isFirstLoad.current) {
       isFirstLoad.current = false;
       prevUnreadCount.current = currentUnread;
       return; 
    }

    if (currentUnread > prevUnreadCount.current) {
      const notifSound = new Audio('/Notif_suara.mp3'); 
      notifSound.play().catch(err => console.warn("Browser butuh interaksi klik sebelum bisa memutar suara."));
    }
    prevUnreadCount.current = currentUnread;
  }, [notifications, currentUser]);

  const [roles, setRoles] = useState(['admin', 'direksi', 'manager', 'staff']);
  const [newRoleName, setNewRoleName] = useState('');

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const cleanRole = newRoleName.trim().toLowerCase();
    if (roles.includes(cleanRole)) return alert('Role ini sudah ada!');
    setRoles([...roles, cleanRole]);
    setNewRoleName('');
  };

  const handleDeleteRole = (roleToDelete) => {
    if (roleToDelete === 'admin' || roleToDelete === 'staff') {
      return alert('Ditolak: Role Admin dan Staff adalah role inti sistem dan tidak boleh dihapus.');
    }
    if (window.confirm(`Yakin ingin menghapus role "${roleToDelete}"?`)) {
      setRoles(roles.filter(r => r !== roleToDelete));
    }
  };

  const handleEditRole = (oldRole) => {
    if (oldRole === 'admin' || oldRole === 'staff') {
      return alert('Ditolak: Role Admin dan Staff adalah role inti sistem dan tidak boleh diubah.');
    }
    const newRole = window.prompt(`Ubah nama role "${oldRole}" menjadi:`, oldRole);
    if (newRole && newRole.trim() !== '' && newRole.trim() !== oldRole) {
       const cleanNewRole = newRole.trim().toLowerCase();
       if (roles.includes(cleanNewRole)) return alert('Nama role tersebut sudah digunakan!');
       setRoles(roles.map(r => r === oldRole ? cleanNewRole : r));
    }
  };
  
  const savedProjectCodes = localStorage.getItem('syntegra_project_codes') || 'PRJ-001, PRJ-002, PROJECT-X';
  const savedTaskCodes = localStorage.getItem('syntegra_task_codes') || 'KOMPLAIN, INSIDEN, REGULER';

  const [sysConfig, setSysConfig] = useState({ 
    brandName: 'SYNTEGRA SERVICES', 
    autoEmail: false, 
    maintenanceMode: false,
    maxUploadSize: '5',
    sessionTimeout: '60',
    strictMode: false,
    projectCodes: savedProjectCodes,
    taskCodes: savedTaskCodes
  });
  const [configForm, setConfigForm] = useState(sysConfig); 

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupStep, setBackupStep] = useState(1);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [backupPdfs, setBackupPdfs] = useState([]);
  const [deleteDateLimit, setDeleteDateLimit] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsActiveTab, setSettingsActiveTab] = useState('pengguna'); // <-- State baru untuk Tab Pengaturan
  const [activeChatId, setActiveChatId] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDivMenuOpen, setIsDivMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showKpiInfoModal, setShowKpiInfoModal] = useState(false); // <-- State Modal Info KPI
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newDivName, setNewDivName] = useState('');
  // --- STATE BARU UNTUK TREE & DRAG DROP ---
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedDeptForDiv, setSelectedDeptForDiv] = useState('Tanpa Departemen');
  const [expandedDepts, setExpandedDepts] = useState({'Tanpa Departemen': true});
  const [movingDivName, setMovingDivName] = useState(null); // Untuk loading animasi
  const [expandedUserDepts, setExpandedUserDepts] = useState({}); // <-- State untuk Dropdown Departemen Pengguna
  
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

  const [recipientSearchQuery, setRecipientSearchQuery] = useState(''); 

  // --- EFEK UNTUK MEMBUKA TASK DARI LINK URL ---
  useEffect(() => {
    if (taskIdFromUrl && tasks.length > 0) {
      const taskToOpen = tasks.find(t => String(t.id) === String(taskIdFromUrl));
      if (taskToOpen) {
        setActiveTab('tasks');
        setSelectedTask(taskToOpen);
        searchParams.delete('taskId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [taskIdFromUrl, tasks, searchParams, setSearchParams]);

  // --- 1. FUNGSI PEMBANTU ---
  const getLocalTimeWithOffset = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const offset = dateObj.getTimezoneOffset();
    const sign = offset > 0 ? '-' : '+';
    const absOffset = Math.abs(offset);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    const pad = (n) => String(n).padStart(2, '0');
    
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}${sign}${hours}:${minutes}`;
  };

  const getNowStr = () => getLocalTimeWithOffset(new Date());

  const formatDateTime = (val) => {
    if (!val) return '-';
    try {
      const dateObj = new Date(val);
      if (isNaN(dateObj.getTime())) {
        return val.substring(0, 16).replace('T', ' ');
      }
      const pad = (n) => String(n).padStart(2, '0');
      return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    } catch (error) {
      return val.substring(0, 16).replace('T', ' ');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedAttachments = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const isValid = file.type.startsWith('image/') || file.type === 'application/pdf' || ['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt);

        if (!isValid) {
          alert(`File "${file.name}" ditolak. Hanya format JPG, PNG, atau PDF yang diizinkan.`);
          continue;
        }

        const fileName = `lampiran_${Date.now()}_${i}_${currentUser.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('task-attachments').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('task-attachments').getPublicUrl(fileName);

        uploadedAttachments.push({
          id: Date.now() + i,
          name: file.name,
          url: publicUrlData.publicUrl,
          type: file.type,
          uploaderId: currentUser.id
        });
      }

      if (uploadedAttachments.length > 0) {
        const currentAttachments = Array.isArray(selectedTask.attachments) ? selectedTask.attachments : [];
        const updatedAttachments = [...currentAttachments, ...uploadedAttachments];

        const { error: updateError } = await supabase.from('initial_tasks').update({ attachments: updatedAttachments }).eq('id', selectedTask.id);
        if (updateError) throw updateError;

        const updatedTask = { ...selectedTask, attachments: updatedAttachments };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      }
    } catch (err) {
      alert('Error terhubung ke server saat upload: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = ''; 
    }
  };

  // 1. Fungsi Membuka Modal Backup
  const handleOpenBackup = () => {
    // Cari semua file PDF dari seluruh task
    const allPdfs = [];
    tasks.forEach(task => {
      (task.attachments || []).forEach(att => {
        if (att.type === 'application/pdf' || att.name.endsWith('.pdf')) {
          allPdfs.push(att);
        }
      });
    });
    setBackupPdfs(allPdfs);
    setBackupStep(allPdfs.length > 0 ? 1 : 2); // Jika ada PDF mulai dari step 1, jika tidak langsung step 2 (Excel)
    setDeleteConfirmText('');
    setIsBackupModalOpen(true);
  };

  // 2. Fungsi Download Semua PDF (Dijadikan .zip) - VERSI TAHAN BANTING
  const handleDownloadPDFs = async () => {
    setIsProcessingBackup(true);
    try {
      const zip = new JSZip();
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < backupPdfs.length; i++) {
        const pdf = backupPdfs[i];
        
        try {
          // Deteksi apakah ini link Supabase
          const isSupabase = pdf.url && pdf.url.includes('/task-attachments/');
          let blob;

          if (isSupabase) {
             const urlParts = pdf.url.split('/task-attachments/');
             let storageFileName = urlParts.length > 1 ? urlParts[1] : null;
             
             if (storageFileName) {
                storageFileName = storageFileName.split('?')[0]; // Bersihkan param
                const { data, error } = await supabase.storage.from('task-attachments').download(storageFileName);
                if (error) throw error;
                blob = data;
             }
          }

          // Jika bukan Supabase atau gagal, coba fetch URL biasa
          if (!blob && pdf.url) {
             const response = await fetch(pdf.url);
             if (!response.ok) throw new Error(`Gagal akses URL (Status: ${response.status})`);
             blob = await response.blob();
          }

          // Jika berhasil dapat file-nya, masukkan ke dalam ZIP
          if (blob) {
             zip.file(pdf.name || `dokumen_${i}.pdf`, blob);
             successCount++;
          } else {
             throw new Error("File tidak ditemukan atau kosong");
          }
        } catch (fileErr) {
          // JIKA 1 FILE GAGAL, HANYA CATAT DI CONSOLE, JANGAN STOP PROSES
          console.warn(`Melewati file rusak (${pdf.name}):`, fileErr.message);
          failCount++;
        }
      }

      // Generate file ZIP jika ada minimal 1 file yang sukses didownload
      if (successCount > 0) {
        const zipContent = await zip.generateAsync({ type: 'blob' });
        saveAs(zipContent, `Backup_PDF_Tasks_${new Date().getTime()}.zip`);
      } else if (backupPdfs.length > 0) {
        alert("Perhatian: Semua file PDF gagal didownload. Kemungkinan URL di database adalah URL lama yang sudah mati.");
      }

      // Beri info jika ada file yang gagal terdownload (opsional)
      if (failCount > 0) {
         console.log(`Berhasil: ${successCount} PDF. Gagal/Dilewati: ${failCount} PDF.`);
      }

      setBackupStep(2); // Lanjut otomatis ke step download Excel
    } catch (error) {
      alert("Terjadi kesalahan sistem saat membuat file ZIP: " + error.message);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // 3. Fungsi Download Excel (beserta Gambar di dalamnya)
  const handleDownloadExcel = async () => {
    setIsProcessingBackup(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data Tasks');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Judul Tugas', key: 'title', width: 30 },
        { header: 'Deskripsi', key: 'description', width: 40 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Dibuat Oleh', key: 'assignedBy', width: 20 },
        { header: 'Deadline', key: 'dueDate', width: 20 },
        { header: 'Lampiran Gambar', key: 'image', width: 40 }
      ];

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const row = worksheet.addRow({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          assignedBy: getUserName(t.assignedBy),
          dueDate: t.dueDate
        });

        // Cari lampiran gambar
        const images = (t.attachments || []).filter(a => a.type?.startsWith('image/') || a.name?.match(/\.(jpeg|jpg|png)$/i));
        
        if (images.length > 0) {
          row.height = 100; // Tinggikan baris untuk gambar
          try {
            const urlParts = images[0].url.split('/task-attachments/');
            const storageFileName = urlParts.length > 1 ? urlParts[1] : null;
            
            let buffer;
            if (storageFileName) {
               // Gunakan Supabase SDK untuk menarik data gambar
               const { data, error } = await supabase.storage.from('task-attachments').download(storageFileName);
               if (error) throw error;
               buffer = await data.arrayBuffer();
            } else {
               const response = await fetch(images[0].url);
               buffer = await response.arrayBuffer();
            }

            const imageId = workbook.addImage({
              buffer: buffer,
              extension: 'png',
            });
            
            worksheet.addImage(imageId, {
              tl: { col: 6, row: row.number - 1 },
              ext: { width: 100, height: 100 }
            });
          } catch (imgErr) {
            console.warn("Gagal memuat gambar untuk excel:", imgErr);
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Backup_Tasks_${new Date().getTime()}.xlsx`);
      setBackupStep(3); // Lanjut ke step reset database
    } catch (error) {
      alert("Gagal membuat Excel: " + error.message);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  // 4. Fungsi Kosongkan Database (Berdasarkan Tanggal)
  const handleEmptyDatabase = async () => {
    if (!deleteDateLimit) {
      return alert('Pilih batas tanggal penghapusan terlebih dahulu!');
    }
    if (deleteConfirmText !== 'kosongkan') {
      return alert('Ketik "kosongkan" dengan benar untuk melanjutkan!');
    }
    
    setIsProcessingBackup(true);
    try {
      // Menambahkan waktu 23:59:59 agar mencakup seluruh hari pada tanggal yang dipilih
      const cutoffDate = `${deleteDateLimit}T23:59:59.999Z`;

      // Menghapus data task yang tanggal dibuatnya (created_at) SEBELUM atau SAMA DENGAN cutoffDate
      const { error } = await supabase
        .from('initial_tasks')
        .delete()
        .lte('created_at', cutoffDate);

      if (error) throw error;
      
      alert(`Berhasil! Data pekerjaan sampai tanggal ${deleteDateLimit} telah dihapus permanen.`);
      
      // Memuat ulang data dari database agar layar langsung ter-update
      loadTasksFromDB(); 
      
      setIsBackupModalOpen(false);
      setDeleteConfirmText('');
      setDeleteDateLimit('');
    } catch (error) {
      alert("Gagal menghapus database: " + error.message);
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedUsers.length} pengguna secara massal? Data tidak dapat dikembalikan.`)) return;

    try {
      const { error } = await supabase.from('initial_users').delete().in('id', selectedUsers);
      if (!error) {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]); 
        alert(`${selectedUsers.length} Pengguna berhasil dihapus!`);
      } else {
        alert('Gagal menghapus: ' + error.message);
      }
    } catch (error) {
      alert('Gagal terhubung ke server database.');
    }
  };

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`Yakin ingin menghapus dokumen "${fileName}"?`)) return;

    try {
      const filtered = (selectedTask.attachments || []).filter(a => a.id !== attachmentId);
      const { error } = await supabase.from('initial_tasks').update({ attachments: filtered }).eq('id', selectedTask.id);
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

    const updatedTask = { ...targetTask, comments: updatedCommentsArray };
    setTasks(tasks.map(t => t.id === targetTaskId ? updatedTask : t));
    setNewComment('');

    if (selectedTask && selectedTask.id === targetTaskId) {
        setSelectedTask(updatedTask);
    }

    const relevantUserIds = new Set([...getAssigneesArray(targetTask.assignedTo), targetTask.assignedBy]);
    const notifsToInsert = [];
    
    relevantUserIds.forEach(targetUserId => {
      if (targetUserId && String(targetUserId) !== String(currentUser.id)) {
         notifsToInsert.push({
            userId: targetUserId,
            type: 'chat',
            message: `Pesan dari ${currentUser.name}: "${commentObj.text.substring(0, 30)}..."`,
            read_status: false,
            time: commentObj.timestamp,
            taskId: targetTaskId
         });
      }
    });

    try {
      if (notifsToInsert.length > 0) {
         await supabase.from('notifications').insert(notifsToInsert);
      }
      await supabase.from('initial_tasks').update({ comments: updatedCommentsArray }).eq('id', targetTaskId);
    } catch (err) {
      console.error("Koneksi error saat simpan chat", err);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .update({
           brand_name: configForm.brandName,
           auto_email: configForm.autoEmail,
           maintenance_mode: configForm.maintenanceMode,
           max_upload_size: configForm.maxUploadSize, 
           session_timeout: configForm.sessionTimeout, 
           strict_mode: configForm.strictMode,
           project_codes: configForm.projectCodes,
           task_codes: configForm.taskCodes
        })
        .eq('id', 1);
      
      if (!error) {
        localStorage.setItem('syntegra_project_codes', configForm.projectCodes || '');
        localStorage.setItem('syntegra_task_codes', configForm.taskCodes || '');
        setSysConfig(configForm); 
        alert('Pengaturan sistem berhasil disimpan permanen!');
      } else {
        alert('Gagal menyimpan pengaturan.');
      }
    } catch (error) {
      alert('Error gagal terhubung ke server saat menyimpan pengaturan.');
    }
  };

  const handleSaveDirekturAccess = async (direktur) => {
    try {
        const { error } = await supabase.from('initial_users')
            .update({ 
                crossDivision: direktur.crossDivision, 
                accessible_divisions: direktur.accessible_divisions 
            })
            .eq('id', direktur.id);
            
        if (!error) {
            alert(`Hak akses untuk Direktur ${direktur.name} berhasil disimpan!`);
        } else {
            alert("Gagal menyimpan: " + error.message);
        }
    } catch (err) {
        alert("Error koneksi server database.");
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // ===== TAMBAHAN: VALIDASI MODE DISIPLIN =====
    if (newStatus === 'done' && sysConfig.strictMode) {
      if (!task.attachments || task.attachments.length === 0) {
        alert("MODE DISIPLIN AKTIF: Anda wajib melampirkan minimal 1 bukti (foto/dokumen) sebelum menyelesaikan tugas ini!");
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...task }); 
        }
        return; 
      }
    }
    // ============================================

    const assignees = getAssigneesArray(task.assignedTo);
    const isSelfTask = assignees.length === 1 && String(assignees[0]) === String(currentUser.id) && String(task.assignedBy) === String(currentUser.id);

    let statusToSave = newStatus;
    
    if (newStatus === 'done' && currentUser.role === 'staff' && !isSelfTask) {
      statusToSave = 'waiting-approval';
      alert("Tugas dikirim untuk menunggu persetujuan.");
    }

    try {
      const updatePayload = { status: statusToSave };
      
      if (statusToSave === 'done') {
        updatePayload.completed_at = getNowStr();
        updatePayload.approved_by = currentUser.id; 
      } else if (statusToSave !== 'waiting-approval') {
        updatePayload.completed_at = null;
        updatePayload.approved_by = null;
      }

      const { error } = await supabase.from('initial_tasks').update(updatePayload).eq('id', taskId);
      
      if (!error) {
        loadTasksFromDB();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, ...updatePayload });
        }

        if (String(task.assignedBy) !== String(currentUser.id)) {
           await supabase.from('notifications').insert([{
              userId: task.assignedBy,
              type: 'system',
              message: `📝 ${currentUser.name} mengubah status tugas "${task.title}" menjadi ${newStatus.toUpperCase()}`,
              read_status: false,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              taskId: taskId
           }]);
        }
      } else {
        alert("Gagal mengupdate database.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const [taskFormType, setTaskFormType] = useState('regular');
  const [taskAssignMode, setTaskAssignMode] = useState('personal'); // 'personal' | 'delegate'
  const [cleaningPhotos, setCleaningPhotos] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // STATE KANBAN & ANIMASI
  const [expandedTaskDates, setExpandedTaskDates] = useState({});
  const [movingTaskId, setMovingTaskId] = useState(null);

  // FUNGSI AUTO-COLLAPSE SIDEBAR SAAT BUKA DETAIL
  const handleOpenTaskDetail = (task) => {
    setSelectedTask(task);
    setIsChatOpen(false); // PASTIKAN BARIS INI ADA: Tutup chat saat buka tugas baru
    setIsEditingDesc(false);
    setEditingMsgId(null);
    if (window.innerWidth >= 768) setIsSidebarOpen(false); // Otomatis tutup sidebar di Laptop/PC
  };

  // FUNGSI OTOMATIS BUKA SIDEBAR KEMBALI SAAT TUTUP DETAIL
  const handleCloseTaskDetail = () => {
    setSelectedTask(null);
    setIsChatOpen(false);
    setIsEditingDesc(false);
    if (window.innerWidth >= 768) setIsSidebarOpen(true); // Buka kembali sidebar di Laptop/PC
  };

  // FUNGSI DRAG & DROP KANBAN TASK
  const handleDropTask = async (e, targetStatus, targetDateKey) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setMovingTaskId(null);
    if (!taskId) return;

    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task) return;
    if (task.status === targetStatus && task.dueDate?.startsWith(targetDateKey)) return; // Tidak ada perubahan

    if (targetStatus === 'done' && sysConfig.strictMode && (!task.attachments || task.attachments.length === 0)) {
       return alert("MODE DISIPLIN AKTIF: Anda wajib melampirkan minimal 1 bukti (foto/dokumen) sebelum menyelesaikan tugas ini! Silakan klik tugas untuk melampirkan.");
    }

    const assignees = getAssigneesArray(task.assignedTo);
    const isSelfTask = assignees.length === 1 && String(assignees[0]) === String(currentUser.id) && String(task.assignedBy) === String(currentUser.id);
    
    let finalStatus = targetStatus;
    if (targetStatus === 'done' && currentUser.role === 'staff' && !isSelfTask) {
       finalStatus = 'waiting-approval';
       alert("Pekerjaan digeser ke Selesai. Menunggu persetujuan (Approval) Atasan.");
    }

    // Ganti Tanggal jika dipindah ke Accordion hari lain
    let newDueDate = task.dueDate;
    if (targetDateKey !== 'Tanpa Tanggal' && !task.dueDate?.startsWith(targetDateKey)) {
       const oldTime = task.dueDate ? task.dueDate.substring(11) : '23:59:00';
       newDueDate = `${targetDateKey}T${oldTime}`;
    }

    // Optimistic Update (Ubah di layar dulu agar cepat)
    setTasks(tasks.map(t => String(t.id) === String(taskId) ? { ...t, status: finalStatus, dueDate: newDueDate } : t));

    try {
      const updatePayload = { status: finalStatus, dueDate: newDueDate };
      if (finalStatus === 'done') {
        updatePayload.completed_at = getNowStr();
        updatePayload.approved_by = currentUser.id;
      } else if (finalStatus !== 'waiting-approval') {
        updatePayload.completed_at = null;
        updatePayload.approved_by = null;
      }
      const { error } = await supabase.from('initial_tasks').update(updatePayload).eq('id', taskId);
      if (error) loadTasksFromDB(); // Rollback jika error
    } catch (error) { loadTasksFromDB(); }
  };

  const handleOpenTaskModal = (formType, assignMode = 'personal') => {
    try {
      setTaskFormType(formType);
      setTaskAssignMode(assignMode);
      setCleaningPhotos([]); // Bersihkan sisa lampiran sebelumnya
      
      // Keamanan ekstra untuk memastikan ID User terbaca
      const safeAssignees = (assignMode === 'personal' && currentUser?.id) ? [currentUser.id] : [];
      
      setNewTask({ 
        title: '', 
        description: '', 
        assignedTo: safeAssignees, 
        priority: 'medium', 
        dueDate: '',
        projectCode: '',
        taskCode: ''
      });
      
      // Eksekusi pembukaan modal
      setIsModalOpen(true);
    } catch (error) {
      console.error("[ERROR] Gagal membuka formulir tugas:", error);
      alert("Terjadi kesalahan sistem saat membuka formulir. Silakan refresh halaman.");
    }
  };

  const handleUploadCleaningPhoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    
    setIsUploadingPhoto(true);
    try {
      const uploadedPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const isValid = file.type.startsWith('image/') || file.type === 'application/pdf' || ['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt);

        if (!isValid) {
          alert(`File "${file.name}" ditolak. Hanya format JPG, PNG, atau PDF yang diizinkan.`);
          continue;
        }

        const fileName = `lampiran_${Date.now()}_${i}_${currentUser.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('task-attachments').upload(fileName, file);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('task-attachments').getPublicUrl(fileName);
        
        uploadedPhotos.push({
          id: Date.now() + i, 
          name: file.name, 
          url: publicUrlData.publicUrl, 
          type: file.type, 
          uploaderId: currentUser.id
        });
      }

      if (uploadedPhotos.length > 0) {
        setCleaningPhotos(prev => [...prev, ...uploadedPhotos]);
      }
    } catch (err) {
      alert('Gagal upload lampiran: ' + err.message);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleApproveTask = async (taskId, isApproved) => {
    const finalStatus = isApproved ? 'done' : 'in-progress';
    try {
      const updatePayload = { 
        status: finalStatus,
        completed_at: isApproved ? getNowStr() : null,
        approved_by: isApproved ? currentUser.id : null 
      };

      const { error } = await supabase.from('initial_tasks').update(updatePayload).eq('id', taskId);
      
      if (!error) {
        alert(isApproved ? "Berhasil di-approve!" : "Tugas dikembalikan untuk direvisi.");
        loadTasksFromDB();
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, ...updatePayload });
        }

        const task = tasks.find(t => t.id === taskId);
        const assignees = getAssigneesArray(task.assignedTo);
        
        const notifsToInsert = assignees
           .filter(id => String(id) !== String(currentUser.id))
           .map(id => ({
              userId: id,
              type: 'system',
              message: isApproved ? `✅ Tugas "${task.title}" telah di-approve!` : `❌ Tugas "${task.title}" ditolak dan butuh direvisi.`,
              read_status: false,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              taskId: taskId
           }));

        if (notifsToInsert.length > 0) {
           await supabase.from('notifications').insert(notifsToInsert);
        }
      } else {
        alert("Gagal memproses: " + error.message);
      }
    } catch (error) {
      alert("Koneksi bermasalah.");
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (currentUser.role !== 'admin' && !currentUser.tm_delete_tasks) return alert("Akses ditolak. Anda tidak memiliki hak untuk menghapus tugas.");
    if (!window.confirm(`PERINGATAN: Yakin ingin menghapus tugas "${taskTitle}"?`)) return;

    try {
      const { error } = await supabase.from('initial_tasks').delete().eq('id', taskId);
      if (!error) {
        alert("Tugas berhasil dihapus permanen!");
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
        if (selectedTask && selectedTask.id === taskId) handleCloseTaskDetail();
      } else {
        alert("Gagal menghapus tugas: " + error.message);
      }
    } catch (err) {
      alert("Gagal terhubung ke database saat menghapus tugas.");
    }
  };

  const loadTasksFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('initial_tasks')
        .select('*')
        .order('id', { ascending: false });
        
      if (data) {
        setTasks(data);
      }
    } catch (error) {
      console.error("Gagal memuat data tugas:", error);
      setTasks([]);
    }
  };
  
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userId', currentUser.id)
        .order('id', { ascending: false });
        
      if (data) setNotifications(data.map(n => ({...n, read: false})));
    } catch (error) {
      console.error("Gagal menarik notifikasi:", error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    loadTasksFromDB();
    fetchNotifications();

    const notifChannel = supabase
        .channel('realtime-notifs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
           fetchNotifications();

           if (String(payload.new.userId) === String(currentUser.id)) {
              const notifSound = new Audio('/Notif_suara.mp3');
              notifSound.play().catch(e => console.log("Suara standby"));

              if ("Notification" in window && Notification.permission === "granted") {
                 const notifTitle = payload.new.type === 'chat' ? "Pesan Baru" : "Tugas Baru";
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

    const taskChannel = supabase
      .channel('realtime-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'initial_tasks' }, () => {
         loadTasksFromDB();
      })
      .subscribe();

    const fallbackInterval = setInterval(() => {
      loadTasksFromDB();
      fetchNotifications();
    }, 5000);

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(taskChannel);
      clearInterval(fallbackInterval);
    };
  }, [currentUser]);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [newComment, setNewComment] = useState(''); 
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: [], priority: 'medium', dueDate: '', projectCode: '', taskCode: '' });
  
  // STATE BARU: UI Modal & Fitur Interaktif
  const [isChatOpen, setIsChatOpen] = useState(false); // Toggle Split View
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescText, setEditDescText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editMsgText, setEditMsgText] = useState('');

  // Reset state saat modal dibuka/tutup
  useEffect(() => {
    setIsChatOpen(false);
    setIsEditingDesc(false);
    setEditingMsgId(null);
  }, [selectedTask?.id]);

  // FUNGSI UPDATE KETERANGAN TUGAS
  const handleSaveDescription = async () => {
    if (!selectedTask || !editDescText.trim()) return;
    try {
      const { error } = await supabase.from('initial_tasks').update({ description: editDescText }).eq('id', selectedTask.id);
      if (!error) {
        const updatedTask = { ...selectedTask, description: editDescText };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
        setIsEditingDesc(false);
      }
    } catch (err) { alert("Gagal update keterangan."); }
  };

  // FUNGSI HAPUS PESAN
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Yakin ingin menghapus pesan ini?")) return;
    try {
      const newComments = selectedTask.comments.filter(c => c.id !== msgId);
      const { error } = await supabase.from('initial_tasks').update({ comments: newComments }).eq('id', selectedTask.id);
      if (!error) {
        const updatedTask = { ...selectedTask, comments: newComments };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      }
    } catch (err) { alert("Gagal menghapus pesan."); }
  };

  // FUNGSI EDIT PESAN
  const handleSaveEditMessage = async (msgId) => {
    if (!editMsgText.trim()) return;
    try {
      const newComments = selectedTask.comments.map(c => c.id === msgId ? { ...c, text: editMsgText, isEdited: true } : c);
      const { error } = await supabase.from('initial_tasks').update({ comments: newComments }).eq('id', selectedTask.id);
      if (!error) {
        const updatedTask = { ...selectedTask, comments: newComments };
        setSelectedTask(updatedTask);
        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
        setEditingMsgId(null);
      }
    } catch (err) { alert("Gagal mengedit pesan."); }
  };
  const [newUser, setNewUser] = useState({ nik: '', password: '', name: '', role: 'staff', division: '', position: '' });
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    setShowMobileChat(false);
  }, [selectedTask]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    const activeSession = localStorage.getItem('syntegra_user_session');
    if (activeSession) {
      setCurrentUser(JSON.parse(activeSession)); 
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedTask) setNotifications(prev => prev.filter(n => n.taskId !== selectedTask.id));
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
            maintenanceMode: data.maintenance_mode,
            maxUploadSize: data.max_upload_size,
            sessionTimeout: data.session_timeout,
            strictMode: data.strict_mode,
            projectCodes: data.project_codes || '',
            taskCodes: data.task_codes || ''
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
        const { data, error } = await supabase.from('initial_users').select('*').neq('can_access_task', false);
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
          // Gunakan .startsWith agar semua yang berawalan [DEPT_ONLY] disembunyikan
          const validDivs = data.filter(d => !d.name.startsWith('[DEPT_ONLY]')); 
          setDivisions(validDivs);

          // Kumpulkan semua nama departemen unik
          const depts = [...new Set(data.filter(d => d.name !== '[DEPT_ONLY]' && d.name).map(d => d.department_name || 'Tanpa Departemen'))];
          setDepartments(depts);
        }
      } catch (error) {
        console.error("Gagal ambil divisi:", error);
      }
    };
    fetchDivisions();
  }, []);

  // --- FUNGSI PEMBANTU DEPARTEMEN ---
  const getDepartment = (divName) => {
     if (!divName) return 'Tanpa Departemen';
     const div = divisions.find(d => d.name === divName);
     return div ? (div.department_name || 'Tanpa Departemen') : 'Tanpa Departemen'; 
  };

  // --- FUNGSI DRAG & DROP PENGGUNA (SATUAN & MASSAL) ---
  const handleDropUser = async (e, targetDept) => {
    e.preventDefault();
    const draggedUserId = e.dataTransfer.getData('userId');
    if (!draggedUserId) return;

    // Tentukan siapa saja yang mau dipindah (Jika yang ditarik ada di dalam checkbox terpilih, pindahkan semua yang dicentang!)
    let usersToMove = [];
    if (selectedUsers.includes(Number(draggedUserId)) || selectedUsers.includes(String(draggedUserId))) {
       usersToMove = users.filter(u => selectedUsers.includes(u.id) || selectedUsers.includes(String(u.id)));
    } else {
       usersToMove = users.filter(u => String(u.id) === String(draggedUserId));
    }

    // Filter: Hanya proses karyawan yang departemen asalnya berbeda dengan departemen target
    usersToMove = usersToMove.filter(u => getDepartment(u.division) !== targetDept);
    if (usersToMove.length === 0) return;

    // Cari divisi pertama yang ada di departemen target untuk dijadikan default sementara
    const targetDivisions = divisions.filter(d => d.department_name === targetDept && !d.name.startsWith('[DEPT_ONLY]'));
    const defaultDiv = targetDivisions.length > 0 ? targetDivisions[0].name : '';

    if (!defaultDiv) {
       alert(`Departemen ${targetDept} belum memiliki divisi aktif. Buat divisi terlebih dahulu.`);
       return;
    }

    const isBulkMode = usersToMove.length > 1;
    if (isBulkMode) {
       if (!window.confirm(`Mutasi Massal: Pindahkan ${usersToMove.length} karyawan terpilih ke Departemen ${targetDept} (Divisi Default: ${defaultDiv})?`)) return;
    }

    try {
      const userIds = usersToMove.map(u => u.id);
      const userNiks = usersToMove.map(u => u.nik).filter(Boolean);

      // Update Database Task Management
      const { error } = await supabase.from('initial_users').update({ division: defaultDiv }).in('id', userIds);
      
      if (!error) {
        // Update State Lokal
        setUsers(users.map(u => userIds.includes(u.id) ? { ...u, division: defaultDiv } : u));
        
        // Sinkronisasi Massal ke HRIS Induk
        if (userNiks.length > 0) {
           await supabase.from('candidates').update({ bidang_jasa: defaultDiv }).in('nik_karyawan', userNiks);
        }
        
        setSelectedUsers([]); // Bersihkan centang setelah berhasil

        if (isBulkMode) {
           alert(`${usersToMove.length} karyawan berhasil dimutasi ke departemen ${targetDept}. Jika ada spesialisasi divisi, silakan edit manual satu per satu.`);
        } else {
           // Jika hanya 1 orang, buka otomatis Modal Edit agar Admin bisa langsung menyesuaikan Divisi aslinya
           setEditingUser({ ...usersToMove[0], division: defaultDiv, department: targetDept });
           setIsEditUserModalOpen(true);
        }
      }
    } catch (err) {}
  };

  // --- FUNGSI MENCARI DATA USER & TUGAS ---
  const getAssigneesArray = (assignedTo) => {
    if (!assignedTo) return [];
    if (typeof assignedTo === 'string') {
      try { return JSON.parse(assignedTo).map(Number); } catch (e) { return [Number(assignedTo)]; }
    }
    return Array.isArray(assignedTo) ? assignedTo.map(Number) : [Number(assignedTo)];
  };

  const getUserName = (id) => users.find(u => String(u.id) === String(id))?.name || 'Unknown';
  const getAvatar = (id) => users.find(u => String(u.id) === String(id))?.avatar || '??';
  const getAssigneesNames = (assignedTo) => getAssigneesArray(assignedTo).map(id => getUserName(id)).filter(name => name !== 'Unknown').join(', ') || 'Belum Ada';

  
  const handleLogout = () => {
    localStorage.removeItem('syntegra_user_session');
    localStorage.removeItem('isAuthenticated');
    setCurrentUser(null);
    navigate('/login');
  };

  const navigateTo = (tab, customAction = null) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    handleCloseTaskDetail(); 
    if (customAction) customAction();
  };

  const handleReadNotification = async (notif) => {
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    try { 
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notif.id); 
    } catch (err) {
      console.error("Gagal menghapus notifikasi:", err);
    }
    if (notif.taskId) {
      const task = tasks.find(t => t.id === notif.taskId);
      if (task) {
        setSelectedTask(task);
        setIsNotifOpen(false); 
        if (notif.type === 'chat') {
          navigateTo('chat');       
          setShowMobileChat(true);  
        } else {
          navigateTo('tasks');      
        }
      }
    }
  };

  const handleReadAllNotifs = async () => {
    setNotifications([]);
    try { 
      await supabase
        .from('notifications')
        .delete()
        .eq('userId', currentUser.id); 
    } catch (err) {
      console.error("Gagal membersihkan semua notifikasi:", err);
    }
    setIsNotifOpen(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let taskData = {};
    let assignedUserIds = [];

    if (taskFormType === 'cleaning') {
      if (cleaningPhotos.length === 0) {
        setIsSubmitting(false);
        return alert("Mohon lampirkan minimal 1 foto laporan hasil kerja!");
      }
      taskData = {
        title: newTask.title,
        description: newTask.description,
        assignedTo: [currentUser.id], 
        assignedBy: currentUser.id,
        priority: 'low',
        dueDate: getNowStr(), 
        completed_at: getNowStr(), 
        status: 'laporan-cleaning', 
        comments: [],
        attachments: cleaningPhotos
      };
    } 
    else if (taskFormType === 'ticketing') {
      const itUsers = users.filter(u => u.role === 'admin' || (u.division && u.division.toLowerCase() === 'it')).map(u => u.id);
      
      if (itUsers.length === 0) {
        setIsSubmitting(false);
        return alert("Maaf, belum ada akun Tim IT yang menerima tiket.");
      }

      assignedUserIds = itUsers;

      taskData = {
        title: `[TIKET IT] ${newTask.title}`,
        description: newTask.description,
        assignedTo: assignedUserIds,
        assignedBy: currentUser.id,
        priority: newTask.priority,
        dueDate: getNowStr(),
        status: 'pending', 
        comments: [],
        attachments: cleaningPhotos
      };
    }
    else {
      assignedUserIds = (taskAssignMode === 'personal') ? [currentUser.id] : newTask.assignedTo;
      if (taskAssignMode === 'delegate' && assignedUserIds.length === 0) {
         setIsSubmitting(false);
         return alert("Pilih minimal satu anggota atau tim untuk didelegasikan!");
      }
      const prefixTitle = (newTask.projectCode || newTask.taskCode) ? `[${newTask.projectCode || '-'}] [${newTask.taskCode || '-'}] ` : '';
      const prefixDesc = (newTask.projectCode || newTask.taskCode) ? `📌 KODE PROJECT: ${newTask.projectCode || '-'}\n📌 KODE TUGAS: ${newTask.taskCode || '-'}\n\n` : '';

      taskData = {
        title: prefixTitle + newTask.title,
        description: prefixDesc + newTask.description,
        assignedTo: assignedUserIds,
        assignedBy: currentUser.id,
        priority: newTask.priority,
        dueDate: newTask.dueDate ? getLocalTimeWithOffset(new Date(newTask.dueDate)) : null, 
        status: 'pending',
        comments: [],
        attachments: cleaningPhotos
      };
    }

    try {
      const { data: newTasks, error } = await supabase.from('initial_tasks').insert([taskData]).select();
      if (!error && newTasks && newTasks.length > 0) {
        setIsModalOpen(false);
        setNewTask({ title: '', description: '', assignedTo: [], priority: 'medium', dueDate: '' });
        setCleaningPhotos([]); 
        setTaskFormType('regular'); 
        loadTasksFromDB();

        if (taskFormType !== 'cleaning') {
          const insertedTask = newTasks[0];
          const notifsToInsert = assignedUserIds.filter(id => String(id) !== String(currentUser.id)).map(id => ({
            userId: id, type: 'task', message: taskFormType === 'ticketing' ? `🚨 Tiket IT Baru: "${insertedTask.title}"` : `Tugas Baru: "${insertedTask.title}"`, read_status: false,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), taskId: insertedTask.id
          }));
          if (notifsToInsert.length > 0) {
             await supabase.from('notifications').insert(notifsToInsert);
          }
          
          if (taskFormType === 'ticketing') alert("Tiket IT berhasil dikirim. Tim akan segera mengecek!");
        } else {
          alert("Laporan Cleaning berhasil dikirim!");
        }
      } else {
        alert("Gagal menyimpan: " + error?.message);
      }
    } catch (error) {
      alert("Error gagal terhubung ke server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNGSI TREE DEPARTEMEN & DIVISI ---
  const toggleDept = (dept) => setExpandedDepts(prev => ({...prev, [dept]: !prev[dept]}));

  const handleAddDepartment = async () => {
    if(!newDeptName.trim()) return;
    try {
      // Buat nama bayangan menjadi unik dengan menyisipkan nama departemennya
      const uniqueDummyName = `[DEPT_ONLY] - ${newDeptName.trim()}`;
      
      const { error } = await supabase.from('initial_divisions').insert([{ name: uniqueDummyName, department_name: newDeptName.trim() }]);
      if (!error) {
        setDepartments(prev => [...new Set([...prev, newDeptName.trim()])]);
        setExpandedDepts(prev => ({...prev, [newDeptName.trim()]: true}));
        setNewDeptName('');
      } else {
        alert("Gagal menambah departemen. Pastikan nama departemen tidak duplikat.");
      }
    } catch (err) {}
  };

  const handleAddDivision = async () => {
    if(!newDivName.trim()) return;
    try {
      const { error } = await supabase.from('initial_divisions').insert([{ name: newDivName.trim(), department_name: selectedDeptForDiv }]);
      if (!error) {
        setDivisions([...divisions, { name: newDivName.trim(), department_name: selectedDeptForDiv }]);
        setExpandedDepts(prev => ({...prev, [selectedDeptForDiv]: true}));
        setNewDivName('');
      } else alert("Gagal menambah divisi.");
    } catch (error) {}
  };

  const handleDeleteDivision = async (divName) => {
    if(!window.confirm(`Hapus divisi ${divName}?`)) return;
    try {
      const { error } = await supabase.from('initial_divisions').delete().eq('name', divName);
      if (!error) setDivisions(divisions.filter(d => d.name !== divName));
    } catch (error) {}
  };

  // --- FUNGSI DRAG AND DROP ---
  const handleDragStart = (e, divName, sourceDept) => {
    e.dataTransfer.setData('divName', divName);
    e.dataTransfer.setData('sourceDept', sourceDept);
  };

  const handleDrop = async (e, targetDept) => {
    e.preventDefault();
    const divName = e.dataTransfer.getData('divName');
    const sourceDept = e.dataTransfer.getData('sourceDept');
    
    if (sourceDept === targetDept || !divName) return; // Tidak ada perubahan

    setMovingDivName(divName); // Tampilkan animasi loading
    
    try {
      const { error } = await supabase.from('initial_divisions').update({ department_name: targetDept }).eq('name', divName);
      if (!error) {
        // Update state lokal tanpa refresh layar utuh
        setDivisions(divisions.map(d => d.name === divName ? { ...d, department_name: targetDept } : d));
        setExpandedDepts(prev => ({...prev, [targetDept]: true})); // Buka folder target otomatis
      } else alert("Gagal memindahkan divisi.");
    } catch (err) {
    } finally {
      setMovingDivName(null); // Matikan loading
    }
  };

  const handleDragOver = (e) => e.preventDefault(); // Wajib agar onDrop bisa berjalan

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const isExist = users.some(u => u.nik === newUser.nik.trim() || u.name.toLowerCase() === newUser.name.trim().toLowerCase());
    if (isExist) return alert(`Pendaftaran Dibatalkan!\nNIK atau Nama Karyawan "${newUser.name}" sudah terdaftar.`);

    try {
      const nameParts = (newUser.name || 'User').trim().split(/\s+/);
      const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const userToInsert = { 
        ...newUser, 
        avatar: initials,
        tm_access_all_tasks: newUser.tm_access_all_tasks || false,
        tm_delete_tasks: newUser.tm_delete_tasks || false,
        tm_helpdesk_viewer: newUser.tm_helpdesk_viewer || false,
        tm_monitor_division: newUser.tm_monitor_division || false,
        tm_print_reports: newUser.tm_print_reports || false,
        tm_manage_system: newUser.tm_manage_system || false,
        tm_assign_tasks: newUser.tm_assign_tasks || false,
        tm_view_executive_summary: newUser.tm_view_executive_summary || false,
      };
      const { data, error } = await supabase.from('initial_users').insert([userToInsert]).select();
      
      if (!error && data) {
        setUsers([...users, data[0]]);
        setIsUserModalOpen(false);
        setNewUser({ nik: '', password: '', name: '', role: 'staff', division: '', position: '' });
        alert('Pengguna baru berhasil ditambahkan!');
      } else {
        alert('Gagal: ' + error?.message);
      }
    } catch (err) { alert('Gagal terhubung ke database.'); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const nameParts = (editingUser.name || 'User').trim().split(/\s+/);
      const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const userToUpdate = { 
        name: editingUser.name, role: editingUser.role, division: editingUser.division, 
        position: editingUser.position, crossDivision: editingUser.crossDivision,
        accessible_divisions: editingUser.accessible_divisions,
        avatar: initials,
        cleaningAccess: editingUser.cleaningAccess,
        tm_access_all_tasks: editingUser.tm_access_all_tasks || false,
        tm_delete_tasks: editingUser.tm_delete_tasks || false,
        tm_helpdesk_viewer: editingUser.tm_helpdesk_viewer || false,
        tm_monitor_division: editingUser.tm_monitor_division || false,
        tm_print_reports: editingUser.tm_print_reports || false,
        tm_manage_system: editingUser.tm_manage_system || false,
        tm_assign_tasks: editingUser.tm_assign_tasks || false,
        tm_view_executive_summary: editingUser.tm_view_executive_summary || false,
      };

      // 1. Update ke database Task Management
      const { error } = await supabase.from('initial_users').update(userToUpdate).eq('id', editingUser.id);
      
      if (!error) {
        // 2. SINKRONISASI 2 ARAH: Update juga ke database HRIS Induk jika punya NIK
        if (editingUser.nik) {
           await supabase.from('candidates').update({
              nama_lengkap: editingUser.name,
              level_jabatan: editingUser.role,
              bidang_jasa: editingUser.division,
              posisi_jabatan: editingUser.position
           }).eq('nik_karyawan', editingUser.nik);
        }

        setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, avatar: initials } : u));
        setIsEditUserModalOpen(false);
        alert('Perubahan data berhasil disimpan dan otomatis disinkronkan ke HRIS!');
      } else {
        alert('Gagal mengupdate: ' + error.message);
      }
    } catch (err) { alert('Gagal terhubung ke server database.'); }
  }; 

  const handleDeleteUser = async (userId) => {
    if(window.confirm('Cabut hak akses karyawan ini dari Task Management? \n\n(Data inti HRIS tetap aman, ia hanya disembunyikan dari modul ini)')) {
      try {
        // Ganti delete() menjadi update() can_access_task ke false
        const { error } = await supabase.from('initial_users').update({ can_access_task: false }).eq('id', userId);
        if (!error) {
          setUsers(users.filter(u => u.id !== userId));
          alert('Akses Task Management berhasil dicabut!');
        } else {
          alert('Gagal menghapus user.');
        }
      } catch (error) { alert('Gagal terhubung ke database.'); }
    }
  };
  
  const handleDownloadExecutiveSummary = () => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      try {
        const element = document.getElementById('executive-summary-print');
        if (!element) {
          alert('Gagal memproses: Elemen Executive Summary tidak ditemukan.');
          return setIsGeneratingPDF(false);
        }
        const opt = {
          margin:       [10, 10, 15, 10], 
          filename:     `Executive_Summary_${new Date().toISOString().split('T')[0]}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
        setIsGeneratingPDF(false); 
      } catch (error) {
        console.error("Error:", error);
        setIsGeneratingPDF(false); 
      }
    }, 800); 
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      try {
        const element = document.getElementById('report-pdf-content');
        if (!element) {
          alert('Gagal memproses: Elemen Laporan tidak ditemukan.');
          return setIsGeneratingPDF(false);
        }
        const opt = {
          margin:       [10, 10, 15, 10], 
          filename:     `Laporan_Kinerja_${new Date().toISOString().split('T')[0]}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
        setIsGeneratingPDF(false); 
      } catch (error) {
        console.error("Error:", error);
        setIsGeneratingPDF(false); 
      }
    }, 800); 
  };

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
    if (!file.name.endsWith('.csv')) return alert("Harap unggah file dengan format .csv");

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

          if (isExistInDB || isExistInBatch) duplicateNames.push(uName);
          else {
            uniqueNewUsers.push({
              nik: uNik, password: password ? password.trim() : '123456', name: uName,
              role: role ? role.trim().toLowerCase() : 'staff', division: division ? division.trim() : 'Pusat',
              position: position ? position.trim() : '-', avatar: initials
            });
          }
        }
      }

      if (uniqueNewUsers.length === 0) return alert("Upload dibatalkan!\nSemua data di dalam CSV (NIK/Nama) sudah terdaftar di sistem.");

      try {
        const { data, error } = await supabase.from('initial_users').insert(uniqueNewUsers).select();
        if (!error && data) {
          setUsers([...users, ...data]);
          let msg = `Berhasil mengimpor ${uniqueNewUsers.length} pengguna dari CSV!`;
          if (duplicateNames.length > 0) msg += `\n\nDIABAIKAN (${duplicateNames.length} data duplikat):\n- ${duplicateNames.join('\n- ')}`;
          alert(msg);
        } else alert("Gagal menyimpan ke database: " + error?.message);
      } catch (err) { alert("Gagal terhubung ke server database."); }
    };
    reader.readAsText(file); 
    e.target.value = ''; 
  };

  const handleMassChange = (index, field, value) => {
    const newData = [...massUsersData];
    newData[index][field] = value;
    setMassUsersData(newData);
  };

  const addMassRow = () => setMassUsersData([...massUsersData, { nik: '', password: '', name: '', role: 'staff', division: '', position: '' }]);
  const removeMassRow = (index) => setMassUsersData(massUsersData.filter((_, i) => i !== index));

  const handleSaveMassTable = async () => {
    const validUsers = massUsersData.filter(u => u.nik.trim() !== '' && u.name.trim() !== '');
    if (validUsers.length === 0) return alert("Isi minimal 1 data pengguna (NIK & Nama)!");

    const uniqueNewUsers = [];
    const duplicateNames = [];

    validUsers.forEach(u => {
      const uNik = u.nik.trim();
      const uName = u.name.trim();
      const isExistInDB = users.some(existing => existing.nik === uNik || existing.name.toLowerCase() === uName.toLowerCase());
      const isExistInBatch = uniqueNewUsers.some(newU => newU.nik === uNik || newU.name.toLowerCase() === uName.toLowerCase());

      if (isExistInDB || isExistInBatch) duplicateNames.push(uName); 
      else {
        uniqueNewUsers.push({
          nik: uNik, password: u.password.trim() || '123456', name: uName,
          role: u.role || 'staff', division: u.division || 'Pusat',
          position: u.position.trim() || '-', avatar: uName.substring(0,2).toUpperCase()
        });
      }
    });

    if (uniqueNewUsers.length === 0) return alert("Upload dibatalkan!\nSemua data sudah terdaftar.");

    try {
      const { data, error } = await supabase.from('initial_users').insert(uniqueNewUsers).select();
      if (!error && data) {
        setUsers([...users, ...data]);
        setIsMassUserModalOpen(false);
        let msg = `Berhasil menyimpan ${uniqueNewUsers.length} pengguna!`;
        if (duplicateNames.length > 0) msg += `\n\nDIABAIKAN (${duplicateNames.length} duplikat):\n- ${duplicateNames.join('\n- ')}`;
        alert(msg);
        setMassUsersData([{ nik: '', password: '', name: '', role: 'staff', division: '', position: '' }]);
      } else alert("Gagal: " + error?.message);
    } catch (err) { alert("Gagal terhubung ke server database."); }
  };

  // ==========================================
  // LOGIKA HAK AKSES TINGKAT LANJUT (OCCUPATION)
  // ==========================================
  if (!currentUser) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }
  
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  const myTasks = safeTasks.filter(t => {
    if (!t) return false;
    const assignees = getAssigneesArray(t.assignedTo);
    const creator = users.find(u => String(u.id) === String(t.assignedBy)) || {};
    const assigneesData = assignees.map(id => users.find(u => String(u.id) === String(id)) || {});

    if (currentUser.role === 'admin' || currentUser.tm_access_all_tasks) return true;

    const isMyOwnTask = assignees.includes(currentUser.id) || String(t.assignedBy) === String(currentUser.id);

    if (currentUser.role === 'direksi' || currentUser.role === 'manager' || currentUser.tm_monitor_division) {
      const isTaskAdmin = creator.role === 'admin' || assigneesData.some(u => u.role === 'admin');
      if (isTaskAdmin && !isMyOwnTask && !currentUser.tm_access_all_tasks) return false; 
      
      // 1. Cek Hierarki Departemen (Otomatis)
      const getDepartment = (divName) => {
         const div = divisions.find(d => d.name === divName);
         return div ? div.department_name : divName; 
      };
      
      const myDept = getDepartment(currentUser.division);
      const isMyDepartment = myDept && (
         getDepartment(creator.division) === myDept || 
         assigneesData.some(u => getDepartment(u.division) === myDept)
      );
      
      // 2. Cek Divisi Langsung
      const isMyDivision = creator.division === currentUser.division || assigneesData.some(u => u.division === currentUser.division);
      
      // 3. Cek Custom Override (Hak Akses Tambahan Lintas Departemen)
      const allowedCustom = currentUser.accessible_divisions || [];
      const hasCustomAccess = allowedCustom.length > 0 && (
         allowedCustom.includes(creator.division) || allowedCustom.includes(getDepartment(creator.division)) ||
         assigneesData.some(u => allowedCustom.includes(u.division) || allowedCustom.includes(getDepartment(u.division)))
      );

      // Gabungkan semua izin
      if (isMyDivision || isMyDepartment || hasCustomAccess) return true;
    }

    return isMyOwnTask;
  });

  const activeTasks = myTasks;
  const isHelpdeskViewer = currentUser?.division?.toLowerCase() === 'it' || ['admin', 'direksi', 'manager'].includes(currentUser?.role) || currentUser?.tm_helpdesk_viewer;
  const urgentTasks = activeTasks.filter(t => {
    if (t.status === 'done') return false; 
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(t.dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const myNotifications = notifications.filter(n => String(n.userId) === String(currentUser.id));
  const unreadNotifsCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className={`${isGeneratingPDF ? 'min-h-screen h-auto overflow-visible' : 'h-screen overflow-hidden'} bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row print:bg-white print:block`}>
      
      {/* HEADER MOBILE GLOBAL */}
        <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex justify-between items-center shadow-sm print:hidden">
          <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex items-center gap-2.5 active:scale-95 transition-transform text-left">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-2 rounded-xl shadow-sm shrink-0">
              <img src="/Logo_apps.png" alt="Logo" className="w-4 h-4 object-contain" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-xs tracking-tight text-yellow-500 uppercase leading-none truncate">{sysConfig.brandName}</span>
              <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest mt-0.5 truncate">Task Management</span>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setShowKpiInfoModal(true)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Info Perhitungan KPI">
              <Info className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}
            </button>
          </div>
        </div>

        <div className={`fixed inset-0 bg-slate-900/40 z-[70] md:hidden backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setMobileMenuOpen(false)}></div>

        {/* SIDEBAR NAVIGASI */}
        <aside className={`fixed md:relative top-0 bottom-0 left-0 bg-white/95 md:bg-white backdrop-blur-xl border-r border-slate-200/60 flex flex-col z-[80] transition-all duration-300 ease-in-out print:hidden ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} ${isSidebarOpen ? 'md:w-72 md:translate-x-0' : 'md:w-20 md:translate-x-0'}`}>
        
        <div className={`p-4 md:p-6 border-b border-slate-100 flex items-center justify-between`}>
          <div onClick={() => window.innerWidth >= 768 && setIsSidebarOpen(!isSidebarOpen)} className={`flex items-center gap-3 cursor-pointer group w-full ${!isSidebarOpen ? 'justify-center' : ''}`} title="Klik untuk Buka/Tutup Menu">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-md shrink-0 transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
              <img src="/Logo_apps.png" alt="Logo" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col animate-in fade-in duration-300 overflow-hidden">
                <span className="font-black text-sm md:text-base tracking-tight text-yellow-500 uppercase leading-tight truncate">{sysConfig.brandName}</span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase tracking-widest mt-0.5 truncate">Task Management</span>
              </div>
            )}
          </div>
          <button type="button" className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-full shrink-0 ml-2" onClick={() => setMobileMenuOpen(false)}><X className="w-4 h-4" /></button>
        </div>
        
        <nav className="flex-1 p-3 md:p-4 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
            {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 mt-2 whitespace-nowrap">Menu Navigasi</p>}
            
            <button type="button" title="Dashboard Kinerja" onClick={() => navigateTo('dashboard')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <LayoutDashboard className="w-5 h-5 shrink-0" /> 
              {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Dashboard Kinerja</span>}
            </button>
            
            <button type="button" title="Manajemen Pekerjaan" onClick={() => navigateTo('tasks')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tasks' ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <CheckSquare className="w-5 h-5 shrink-0" /> 
              {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Manajemen Pekerjaan</span>}
            </button>
            
            <button type="button" title="Pusat Pesan" onClick={() => navigateTo('chat')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <MessageSquare className="w-5 h-5 shrink-0" /> 
              {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Pusat Pesan</span>}
            </button>

            {/* MENU BARU: HELPDESK IT */}
            {isHelpdeskViewer && (
              <button type="button" title="Helpdesk IT" onClick={() => navigateTo('tiket_it')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tiket_it' ? 'bg-purple-50 text-purple-700 border border-purple-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Activity className="w-5 h-5 shrink-0" /> 
                {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Helpdesk IT</span>}
              </button>
            )}

            {!(currentUser.role === 'admin' || currentUser.role === 'direksi' || currentUser.role === 'manager' || currentUser.tm_print_reports) && (
              <button type="button" title="Laporan Hasil Saya" onClick={() => navigateTo('laporan')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <FileText className="w-5 h-5 shrink-0" /> 
                {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Laporan Hasil Saya</span>}
              </button>
            )}
            
            {(currentUser.role === 'admin' || currentUser.role === 'direksi' || currentUser.role === 'manager' || currentUser.tm_print_reports) && (
              <button type="button" title="Laporan & Cetak" onClick={() => navigateTo('laporan', () => setReportTargetUserId('ALL'))} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'laporan' ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Printer className="w-5 h-5 shrink-0" /> 
                {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Laporan & Cetak</span>}
              </button>
            )}
            
            {(currentUser.role === 'admin' || currentUser.role === 'direksi' || currentUser.role === 'manager' || currentUser.tm_monitor_division) && (
              <div className={`pt-4 border-t border-slate-100 mt-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
                {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 whitespace-nowrap">Organisasi</p>}
                
                <button type="button" title="Pantau Tim Divisi" 
                  onClick={() => { 
                    if(!isSidebarOpen) setIsSidebarOpen(true); 
                    setIsDivMenuOpen(!isDivMenuOpen); 
                  }} 
                  className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'division' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3"><Users className="w-5 h-5 shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Pantau Tim Divisi</span>}</div>
                  {isSidebarOpen && (isDivMenuOpen ? <ChevronDown className="w-4 h-4 shrink-0"/> : <ChevronRight className="w-4 h-4 shrink-0"/>)}
                </button>
                
                {/* LIST DIVISI */}
                <div className={`transition-all duration-300 ${isDivMenuOpen && isSidebarOpen ? 'max-h-[400px] overflow-y-auto custom-scrollbar mt-2' : 'max-h-0 overflow-hidden'}`}>
                  <div className="ml-5 pl-4 border-l-2 border-slate-100 space-y-1 py-1 pr-1">
                    <button type="button" onClick={() => { navigateTo('division'); setSelectedDivision('Semua Divisi'); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${selectedDivision === 'Semua Divisi' && activeTab === 'division' ? 'text-blue-700 bg-blue-50 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>Semua Pantauan Tim</button>
                    {divisions.filter(div => {
                       if (currentUser?.role === 'admin' || currentUser?.tm_access_all_tasks) return true;
                       
                       // Jika level Staff, HANYA izinkan lihat divisinya sendiri
                       if (currentUser?.role === 'staff') {
                          return div.name === currentUser?.division;
                       }
                       
                       // Jika Manager/Direksi, izinkan lihat departemennya & hak akses silang
                       const getDepartment = (divName) => {
                          const found = divisions.find(d => d.name === divName);
                          return found ? found.department_name : divName;
                       };
                       const myDept = getDepartment(currentUser?.division);
                       const uDept = div.department_name;
                       const allowedCustom = currentUser?.accessible_divisions || [];
                       
                       return (uDept === myDept || div.name === currentUser?.division || allowedCustom.includes(uDept) || allowedCustom.includes(div.name));
                    }).map(div => (
                      <button type="button" key={div.name} onClick={() => { navigateTo('division'); setSelectedDivision(div.name); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${selectedDivision === div.name && activeTab === 'division' ? 'text-blue-700 bg-blue-50 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>Divisi {div.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(currentUser.role === 'admin' || currentUser.tm_manage_system) && (
              <div className={`pt-4 border-t border-slate-100 mt-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
                 {isSidebarOpen && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 whitespace-nowrap">Sistem Super Admin</p>}
                 <button type="button" title="Konfigurasi & Pengguna" onClick={() => navigateTo('admin_settings')} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_settings' ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Settings className="w-5 h-5 shrink-0" /> {isSidebarOpen && <span className="ml-3 whitespace-nowrap">Konfigurasi Sistem</span>}</button>
              </div>
            )}
        </nav>

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
          <div className='mt-4'>
            <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 bg-white text-amber-500 border border-amber-500 py-2.5 rounded-xl text-xs font-black mb-4 hover:bg-red-50 transition-all">
              <LayoutDashboard size={16} /> KEMBALI KE DASHBOARD UTAMA
            </button>
          </div>
          
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className={`flex-1 w-full ${isGeneratingPDF ? 'h-auto overflow-visible' : 'h-full overflow-y-auto'} custom-scrollbar bg-slate-50 print:m-0 print:p-0 print:bg-white relative`}>
        <div className="p-3 pb-32 md:p-6 md:pb-6 w-full max-w-[1600px] mx-auto h-full flex flex-col">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8 print:hidden">
            <div>
              <h1 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight">
                {activeTab === 'dashboard' && 'Beranda Kinerja'}
                {activeTab === 'tasks' && (currentUser.role === 'admin' || currentUser.tm_access_all_tasks ? 'Seluruh Daftar Pekerjaan' : 'Daftar Pekerjaan')}
                {activeTab === 'laporan' && 'Laporan Kinerja'}
                {activeTab === 'division' && `Pantauan: ${selectedDivision}`}
                {activeTab === 'admin_users' && 'Manajemen Pengguna'}
                {activeTab === 'admin_settings' && 'Pengaturan Sistem'}
              </h1>
              <p className="text-slate-500 mt-1 md:mt-2 font-medium flex items-center gap-2 text-xs md:text-sm">
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <div className="flex flex-row items-center gap-2 md:gap-4 w-full md:w-auto overflow-visible">
               <div className="relative hidden md:flex items-center gap-3">
                 <button type="button" onClick={() => setShowKpiInfoModal(true)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2" title="Informasi Sistem KPI">
                   <Info className="w-5 h-5" /> <span className="text-xs font-bold hidden lg:inline">Info KPI</span>
                 </button>
                 <button type="button" onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm relative">
                   <Bell className="w-5 h-5" />
                   {unreadNotifsCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">{unreadNotifsCount}</span>}
                 </button>
               </div>
               
               {isNotifOpen && (
                   <>
                   <div className="fixed inset-0 z-[90] cursor-default" onClick={() => setIsNotifOpen(false)}></div>
                   <div className="fixed top-20 left-4 right-4 md:absolute md:inset-auto md:top-14 md:right-0 md:w-[400px] bg-white border border-slate-200/80 rounded-2xl shadow-2xl z-[100] overflow-hidden transform origin-top md:origin-top-right transition-all animate-in fade-in zoom-in-95">
                     
                     <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/90 backdrop-blur-md">
                       <h4 className="font-black text-slate-800 text-sm md:text-base">Notifikasi Baru</h4>
                       {unreadNotifsCount > 0 && (
                         <button type="button" onClick={handleReadAllNotifs} className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm">
                           Bersihkan Semua
                         </button>
                       )}
                     </div>
                     
                     <div className="max-h-[60vh] md:max-h-[450px] overflow-y-auto custom-scrollbar bg-white">
                       {myNotifications.filter(n => !n.read).length === 0 ? (
                         <div className="p-10 flex flex-col items-center justify-center text-center">
                           <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                             <Bell className="w-6 h-6 text-blue-300 animate-bounce" />
                           </div>
                           <p className="text-slate-500 text-xs md:text-sm font-bold">Semua pesan sudah dibaca.</p>
                         </div>
                       ) : (
                         myNotifications.filter(n => !n.read).map(notif => (
                           <div key={notif.id} onClick={() => handleReadNotification(notif)} className="p-4 border-b border-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer flex gap-3.5 bg-blue-50/10">
                             <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 shadow-sm border-2 border-white flex items-center justify-center ${notif.type === 'chat' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                               {notif.type === 'chat' ? <MessageSquare className="w-4 h-4 md:w-5 md:h-5" /> : <CheckSquare className="w-4 h-4 md:w-5 md:h-5" />}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-xs md:text-sm leading-snug line-clamp-2 pr-2 font-black text-slate-800">{notif.message}</p>
                               <p className="text-[9px] md:text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-bold tracking-wide">
                                 <Clock className="w-3 h-3"/> {notif.time}
                               </p>
                             </div>
                             <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                  </>
               )}

               {/* AREA TOMBOL ATAS TELAH DIPINDAHKAN KE DALAM MENU MANAJEMEN TUGAS */}

               {activeTab === 'admin_settings' && settingsActiveTab === 'pengguna' && (
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-end md:flex-none animate-in fade-in zoom-in duration-300">
                  <button type="button" onClick={() => setIsMassUserModalOpen(true)} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs md:text-sm">
                    <Users className="w-4 h-4" /> Input Tabel
                  </button>
                  <button type="button" onClick={handleDownloadTemplateCSV} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs md:text-sm">
                    <Download className="w-4 h-4" /> Template CSV
                  </button>
                  <input type="file" id="upload-massal-user" accept=".csv" onChange={handleMassUploadCSV} className="hidden" />
                  <label htmlFor="upload-massal-user" className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs md:text-sm cursor-pointer">
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
                  <h3 className="font-black text-base md:text-lg text-slate-800 flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-500"/> Pesan Aktif</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Cari judul pesan..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs md:text-sm font-bold focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-colors" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {myTasks
                    .filter(t => Array.isArray(t.comments) && t.comments.length > 0)
                    .sort((a, b) => b.comments[b.comments.length - 1].id - a.comments[a.comments.length - 1].id) 
                    .map(task => {
                      const latestChat = task.comments[task.comments.length - 1];
                      const isMe = String(latestChat.userId) === String(currentUser.id);
                      const isActive = selectedTask?.id === task.id; 
                      
                      return (
                        <div key={task.id} onClick={() => isActive ? handleCloseTaskDetail() : handleOpenTaskDetail(task)} className={`p-3 md:p-4 border-b border-slate-100 cursor-pointer transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
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
                        const isMe = String(chat?.userId) === String(currentUser?.id);
                        return (
                          <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`p-2.5 md:p-4 rounded-2xl shadow-sm max-w-[85%] ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                              <p className="text-[10px] md:text-sm font-medium leading-relaxed">{chat?.text || ''}</p>
                            </div>
                            <span className="text-[7px] md:text-[10px] font-black tracking-widest text-slate-400 mt-1 px-1 uppercase">{isMe ? 'Anda' : getUserName(chat?.userId)} • {chat?.timestamp || ''}</span>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-2 md:p-5 bg-white border-t border-slate-200 pb-20 md:pb-safe shrink-0">
                      <form onSubmit={handleAddComment} className="flex gap-2 items-center md:pb-safe">
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ketik balasan diskusi..." className="flex-1 px-3 py-2 md:px-4 md:py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 text-[10px] md:text-sm bg-slate-50 focus:bg-white font-medium" />
                        <button type="submit" disabled={!newComment.trim()} className="bg-blue-600 text-white p-2 md:p-3.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transform hover:-translate-y-0.5 shadow-sm shrink-0"><Send className="w-3.5 h-3.5 md:w-5 md:h-5 ml-0.5" /></button>
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
            <div className="space-y-6 md:space-y-8 print:hidden animate-in fade-in duration-300 pb-20 md:pb-0 mb-5">
              
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

              {/* === EXECUTIVE SUMMARY BLOCK (ENTERPRISE EDITION) === */}
              {(currentUser.role === 'admin' || currentUser.role === 'direksi' || currentUser.tm_view_executive_summary) && (() => {
                const totalExec = activeTasks.length;
                let doneOnTimeExec = 0;
                let doneLateExec = 0;
                let progressExec = 0;
                let pendingExec = 0;
                let overdueExec = 0;
                let highPriorityExec = 0;
                let highPriorityTasksList = []; // Array untuk menampung data tugas prioritas
                const nowStrExec = getNowStr();

                activeTasks.forEach(t => {
                   // Hanya hitung dan masukkan ke daftar jika prioritas High DAN status belum Selesai
                   if (t.priority === 'high' && t.status !== 'done') {
                      highPriorityExec++;
                      highPriorityTasksList.push(t);
                   }

                   if (t.status === 'done') {
                      if (t.completed_at && t.completed_at > t.dueDate) doneLateExec++;
                      else doneOnTimeExec++;
                   } else if (t.status === 'laporan-cleaning') {
                      doneOnTimeExec++; // Laporan OB dihitung tepat waktu
                   } else if (t.status === 'pending') {
                      if (t.dueDate < nowStrExec) overdueExec++;
                      else pendingExec++;
                   } else {
                      if (t.dueDate < nowStrExec) overdueExec++;
                      else progressExec++;
                   }
                });

                const totalDoneExec = doneOnTimeExec + doneLateExec;
                const kpiRateExec = totalExec === 0 ? 0 : Math.round(((doneOnTimeExec * 1) + (doneLateExec * 0.5)) / totalExec * 100);
                const completionRateExec = totalExec === 0 ? 0 : Math.round((totalDoneExec / totalExec) * 100);
                const healthRisk = overdueExec > 0 ? (overdueExec / totalExec * 100) : 0;

                return (
                  <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div id="executive-summary-print" className={`bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden ${isGeneratingPDF ? 'p-8' : ''}`}>
                      
                      {/* 1. Header Laporan Eksekutif */}
                      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-900 text-white gap-4 relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                             <TrendingUp className="w-6 h-6"/>
                          </div>
                          <div>
                            <h3 className="font-black text-lg md:text-2xl tracking-tight uppercase">Executive Summary Report</h3>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-bold tracking-wider">
                               OPERATIONAL PERFORMANCE • {(currentUser.role === 'admin' || currentUser.role === 'direksi') ? 'GLOBAL SYSTEM' : 'INDIVIDUAL/TEAM'}
                            </p>
                          </div>
                        </div>
                        {!isGeneratingPDF && (
                          <button onClick={handleDownloadExecutiveSummary} className="relative z-10 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(37,99,235,0.3)] hover:-translate-y-0.5">
                            <Download className="w-4 h-4"/> Unduh Laporan (PDF)
                          </button>
                        )}
                      </div>
                      
                      {/* 2. Key Performance Indicators (Highlight) */}
                      <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 bg-slate-50/50">
                         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <div className={`absolute top-0 w-full h-1.5 ${kpiRateExec >= 80 ? 'bg-emerald-500' : kpiRateExec >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><BarChart3 className="w-3 h-3"/> Score KPI Aktual</span>
                            <span className={`text-4xl md:text-5xl font-black tracking-tighter ${kpiRateExec >= 80 ? 'text-emerald-500' : kpiRateExec >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{kpiRateExec}%</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-2 bg-slate-50 px-2 py-1 rounded-md">Indeks Kinerja Utama</span>
                         </div>
                         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1.5 bg-blue-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Completion Rate</span>
                            <span className="text-4xl md:text-5xl font-black tracking-tighter text-blue-600">{completionRateExec}%</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-2 bg-slate-50 px-2 py-1 rounded-md">{totalDoneExec} dari {totalExec} Selesai</span>
                         </div>
                         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1.5 bg-orange-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Health Risk / Overdue</span>
                            <span className="text-4xl md:text-5xl font-black tracking-tighter text-slate-800">{overdueExec} <span className="text-lg text-slate-400">Tgs</span></span>
                            <span className="text-[9px] font-bold text-slate-400 mt-2 bg-slate-50 px-2 py-1 rounded-md">{healthRisk.toFixed(1)}% Risiko Keterlambatan</span>
                         </div>
                         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1.5 bg-purple-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Activity className="w-3 h-3"/> High Priority Active</span>
                            <span className="text-4xl md:text-5xl font-black tracking-tighter text-slate-800">{highPriorityExec}</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-2 bg-slate-50 px-2 py-1 rounded-md">Membutuhkan Perhatian</span>
                         </div>
                      </div>

                      {/* 3. Operational Health & Breakdown */}
                      <div className="px-6 md:px-8 pb-6 bg-slate-50/50">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Operational Status Breakdown</h4>
                           
                           {/* Custom Progress Bar Chart */}
                           <div className="w-full h-4 md:h-6 flex rounded-full overflow-hidden mb-4 bg-slate-100 shadow-inner">
                             <div style={{ width: `${totalExec === 0 ? 0 : (doneOnTimeExec/totalExec)*100}%` }} className="bg-emerald-500 h-full transition-all duration-1000" title="Tepat Waktu"></div>
                             <div style={{ width: `${totalExec === 0 ? 0 : (doneLateExec/totalExec)*100}%` }} className="bg-amber-400 h-full transition-all duration-1000" title="Selesai Telat"></div>
                             <div style={{ width: `${totalExec === 0 ? 0 : (progressExec/totalExec)*100}%` }} className="bg-blue-500 h-full transition-all duration-1000" title="Sedang Diproses"></div>
                             <div style={{ width: `${totalExec === 0 ? 0 : (overdueExec/totalExec)*100}%` }} className="bg-red-500 h-full transition-all duration-1000" title="Terlambat (Overdue)"></div>
                             <div style={{ width: `${totalExec === 0 ? 0 : (pendingExec/totalExec)*100}%` }} className="bg-slate-300 h-full transition-all duration-1000" title="Pending"></div>
                           </div>

                           <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                             <div className="bg-slate-50 p-2 rounded-xl"><span className="block text-xl font-black text-emerald-600">{doneOnTimeExec}</span><span className="text-[9px] font-bold text-slate-500 uppercase">Tepat Waktu</span></div>
                             <div className="bg-slate-50 p-2 rounded-xl"><span className="block text-xl font-black text-amber-500">{doneLateExec}</span><span className="text-[9px] font-bold text-slate-500 uppercase">Selesai Telat</span></div>
                             <div className="bg-slate-50 p-2 rounded-xl"><span className="block text-xl font-black text-blue-600">{progressExec}</span><span className="text-[9px] font-bold text-slate-500 uppercase">Sedang Proses</span></div>
                             <div className="bg-slate-50 p-2 rounded-xl"><span className="block text-xl font-black text-red-500">{overdueExec}</span><span className="text-[9px] font-bold text-slate-500 uppercase">Lewat Batas</span></div>
                             <div className="bg-slate-50 p-2 rounded-xl col-span-2 md:col-span-1"><span className="block text-xl font-black text-slate-500">{pendingExec}</span><span className="text-[9px] font-bold text-slate-500 uppercase">Belum Mulai</span></div>
                           </div>
                        </div>
                      </div>

                      {/* 4. Daftar High Priority Aktif (MUNCUL JIKA ADA TUGAS HIGH PRIORITY SAJA) */}
                      {highPriorityTasksList.length > 0 && (
                        <div className="px-6 md:px-8 pb-6 bg-slate-50/50 print:hidden">
                           <h4 className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity className="w-3.5 h-3.5"/> Pekerjaan Prioritas Darurat (High Priority)</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                             {highPriorityTasksList.map(t => (
                               <div key={t.id} onClick={() => handleOpenTaskDetail(t)} className="bg-white p-3 md:p-4 rounded-xl border border-purple-200 shadow-sm cursor-pointer hover:border-purple-500 hover:shadow-md transition-all group flex flex-col gap-2 relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                                 <div className="flex justify-between items-start pl-2">
                                    <h5 className="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-purple-700 transition-colors">{t.title}</h5>
                                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase shrink-0">High</span>
                                 </div>
                                 <div className="pl-2 mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                       <Users className="w-3 h-3 text-slate-400"/>
                                       <span className="text-[9px] font-bold text-blue-600 truncate max-w-[150px]">{getAssigneesNames(t.assignedTo)}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-purple-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Buka <ChevronRight className="w-3 h-3"/></span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}

                      {/* 5. Detail Table in Executive Summary */}
                      <div className="p-6 md:p-8 border-t border-slate-100 bg-white">
                         <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-blue-500"/> Critical Action Items (Status Aktif)
                         </h4>
                         <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="text-[9px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-200">
                                   <th className="pb-3 px-2">Keterangan Pekerjaan</th>
                                   <th className="pb-3 px-2 hidden md:table-cell">PIC / Penanggung Jawab</th>
                                   <th className="pb-3 px-2">Tenggat Waktu</th>
                                   <th className="pb-3 px-2 text-center">Status Laporan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTasks.filter(t => t.status !== 'done').slice(0, 10).map(t => {
                                   const isOverdue = t.dueDate < nowStrExec && t.status !== 'done';
                                   return (
                                     <tr key={t.id} onClick={() => handleOpenTaskDetail(t)} className="border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer group">
                                        <td className="py-3 px-2">
                                           <div className="font-bold text-slate-800 text-[10px] md:text-xs truncate max-w-[250px] md:max-w-[400px] group-hover:text-blue-700 transition-colors">{t.title}</div>
                                           <div className="text-[9px] text-slate-400 font-bold md:hidden mt-0.5 group-hover:text-blue-500">{getAssigneesNames(t.assignedTo)}</div>
                                        </td>
                                        <td className="py-3 px-2 font-bold text-blue-600 text-[10px] md:text-xs hidden md:table-cell">{getAssigneesNames(t.assignedTo)}</td>
                                        <td className="py-3 px-2 font-bold text-slate-500 text-[10px] md:text-xs flex items-center gap-1.5"><Clock className="w-3 h-3"/> {formatDateTime(t.dueDate)}</td>
                                        <td className="py-3 px-2 text-center">
                                           {isOverdue ? <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-red-200 shadow-sm">OVERDUE</span> : <Badge type={t.status}>{t.status.replace('-', ' ')}</Badge>}
                                        </td>
                                     </tr>
                                   )
                                })}
                                {activeTasks.filter(t => t.status !== 'done').length === 0 && <tr><td colSpan="4" className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">Semua tugas kritis telah diselesaikan. Luar biasa!</td></tr>}
                              </tbody>
                            </table>
                         </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* === MODAL INFO KPI (MUNCUL JIKA TOMBOL INFO DIKLIK) === */}
              {showKpiInfoModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in print:hidden">
                  <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative transform transition-all max-h-[95vh]">
                     <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 text-white text-center relative overflow-hidden shrink-0">
                        <button onClick={() => setShowKpiInfoModal(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors z-10"><X size={20}/></button>
                        <div className="relative z-10">
                           <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner"><Info size={28}/></div>
                           <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">Panduan Perhitungan & Metrik Dashboard</h2>
                           <p className="text-blue-100 text-[10px] md:text-xs font-medium">Penjelasan Indikator Kinerja Utama (KPI) & Executive Summary</p>
                        </div>
                     </div>
                     
                     <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-50 space-y-6 flex-1">
                        
                        {/* BAGIAN 1: RUMUS KPI */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                           <h3 className="font-black text-slate-800 text-sm mb-3 border-b border-slate-100 pb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500"/> Bagaimana Sistem Menghitung Skor KPI?</h3>
                           <p className="text-xs text-slate-600 leading-relaxed mb-4">Sistem Syntegra menggunakan perhitungan otomatis berbasis <b>Tenggat Waktu (Deadline)</b>. Setiap tugas dievaluasi saat statusnya diubah menjadi Selesai (Done).</p>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                 <div className="bg-emerald-500 text-white rounded-md p-1.5 w-fit mb-2"><CheckCircle2 size={14}/></div>
                                 <p className="text-[11px] font-black text-emerald-800 leading-tight">Tepat Waktu (Nilai 100%)</p>
                                 <p className="text-[9px] text-emerald-600 mt-1 font-bold">Tugas selesai SEBELUM melewati batas deadline.</p>
                              </div>
                              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                 <div className="bg-amber-500 text-white rounded-md p-1.5 w-fit mb-2"><Clock size={14}/></div>
                                 <p className="text-[11px] font-black text-amber-800 leading-tight">Terlambat Selesai (Nilai 50%)</p>
                                 <p className="text-[9px] text-amber-600 mt-1 font-bold">Tugas diselesaikan SETELAH melewati batas deadline.</p>
                              </div>
                              <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                 <div className="bg-red-500 text-white rounded-md p-1.5 w-fit mb-2"><AlertCircle size={14}/></div>
                                 <p className="text-[11px] font-black text-red-800 leading-tight">Belum Selesai (Nilai 0%)</p>
                                 <p className="text-[9px] text-red-600 mt-1 font-bold">Tugas berstatus Pending, Proses, atau Overdue.</p>
                              </div>
                           </div>

                           <div className="bg-slate-900 p-4 rounded-xl text-white shadow-md text-center mt-2">
                              <h3 className="font-black text-amber-400 text-[10px] uppercase tracking-widest mb-2 border-b border-slate-700 pb-2">Rumus Baku Sistem</h3>
                              <div className="inline-block w-full bg-slate-800 px-4 py-2.5 rounded-lg border border-slate-700 text-[10px] md:text-xs font-black text-emerald-400 shadow-inner">
                                 Skor KPI = [ (Tepat Waktu x 1) + (Terlambat x 0.5) ]<br/> <span className="text-slate-400 block my-1 border-b border-slate-600 w-1/2 mx-auto"></span> Total Seluruh Pekerjaan (Selesai + Aktif)
                              </div>
                           </div>
                        </div>

                        {/* BAGIAN 2: PENJELASAN EXECUTIVE SUMMARY */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                           <h3 className="font-black text-slate-800 text-sm mb-3 border-b border-slate-100 pb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500"/> Arti Komponen Laporan Executive</h3>
                           <p className="text-xs text-slate-600 leading-relaxed mb-4">Berikut adalah penjelasan metrik Enterprise standar yang muncul di Dashboard Laporan Eksekutif Anda:</p>
                           
                           <div className="space-y-4">
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Completion Rate (Tingkat Penyelesaian)</h4>
                                 <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed font-medium">Menunjukkan persentase total tugas yang sudah berstatus <b>Selesai</b> (baik tepat waktu maupun terlambat) dibandingkan dengan keseluruhan total tugas. Fokus utamanya adalah melihat "seberapa banyak target pekerjaan yang telah dituntaskan".</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <h4 className="text-xs font-black text-orange-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Health Risk / Overdue (Risiko Operasional)</h4>
                                 <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed font-medium">Persentase tingkat bahaya operasional. Dihitung dari jumlah tugas yang sudah <b>melewati batas waktu (Overdue) tapi belum dikerjakan/selesai</b>. Semakin tinggi persentasenya, semakin berisiko kinerja divisi tersebut (indikator Bottleneck).</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <h4 className="text-xs font-black text-purple-600 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> High Priority Active (Prioritas Tinggi)</h4>
                                 <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed font-medium">Total pekerjaan berlabel <b>Tinggi (High Priority)</b> yang saat ini masih aktif (belum selesai). Angka ini menjadi acuan utama bagi Direksi/Manager untuk segera menegur atau mengeksekusi pekerjaan yang paling mendesak di lapangan.</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5"/> Operational Status Breakdown (Grafik Bar)</h4>
                                 <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed font-medium">Visualisasi warna yang merepresentasikan rasio kesehatan tugas. <b>Hijau</b> (Tepat), <b>Kuning</b> (Telat), <b>Biru</b> (Diproses), <b>Merah</b> (Bahaya/Overdue), dan <b>Abu-abu</b> (Belum Dimulai). Berguna untuk *scanning* kondisi lapangan dalam hitungan detik.</p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <h4 className="text-xs font-black text-red-600 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Critical Action Items (Tabel Tugas Aktif)</h4>
                                 <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed font-medium">Menampilkan maksimal 10 daftar pekerjaan yang <b>belum selesai / Overdue</b>. Sangat penting untuk pelacakan (<i>tracking</i>) detail tentang pekerjaan apa yang tertunda beserta siapa Penanggung Jawabnya (PIC).</p>
                              </div>
                           </div>
                        </div>

                     </div>
                     <div className="p-4 md:p-5 border-t border-slate-100 bg-white text-center shrink-0">
                        <button onClick={() => setShowKpiInfoModal(false)} className="bg-slate-900 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold text-xs transition shadow-md w-full md:w-auto">SAYA MENGERTI, TUTUP PANDUAN</button>
                     </div>
                  </div>
                </div>
              )}

              {urgentTasks.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-sm md:text-base text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 animate-pulse" /> Perhatian Khusus ({urgentTasks.length})
                    </h3>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 px-1 custom-scrollbar">
                    {urgentTasks.map(t => {
                       const nowLocalStr = getNowStr();
                       const isOverdue = t.dueDate < nowLocalStr && t.status !== 'done' && t.status !== 'laporan-cleaning';
                       return (
                         <div key={t.id} onClick={() => handleOpenTaskDetail(t)} className={`min-w-[280px] md:min-w-[320px] p-4 rounded-[1.5rem] border-2 shadow-md cursor-pointer transition-all active:scale-95 bg-white ${isOverdue ? 'border-red-200' : 'border-orange-200'}`}>
                            <div className="flex justify-between items-start mb-3">
                              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isOverdue ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                {isOverdue ? 'Sudah Lewat Deadline' : 'Mendekati Deadline'}
                              </span>
                              <Badge type={t.priority}>{t.priority}</Badge>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 line-clamp-1 mb-2">{t.title}</h4>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                               <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                 <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                                 {formatDateTime(t.dueDate)}
                               </div>
                               <span className="text-[10px] font-bold text-blue-500">Klik Detail &rarr;</span>
                            </div>
                         </div>
                       )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 md:gap-6">
                {[
                  { title: 'Pending', count: activeTasks.filter(t => t.status === 'pending').length, color: 'text-blue-600', bg: 'bg-blue-100' },
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

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden w-full">
                <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-base md:text-lg text-slate-800">Semua Aktivitas</h3>
                  <button onClick={() => navigateTo('tasks')} className="text-xs font-bold text-blue-600">Lihat Semua</button>
                </div>
                <div className="p-2 md:p-4 mb-5">
                  {activeTasks.slice(0, 5).map((t) => (
                    <div key={t.id} onClick={() => handleOpenTaskDetail(t)} className="flex items-center justify-between p-3 md:p-4 hover:bg-slate-50 rounded-2xl cursor-pointer border border-transparent">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm ${t.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {t.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 line-clamp-1">{t.title}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Deadline: {formatDateTime(t.dueDate)}</p>
                        </div>
                      </div>
                      <Badge type={t.status}>{t.status.replace('-', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS (KANBAN BOARD VIEW) */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 md:space-y-6 print:hidden animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
               
               {/* BARIS TOMBOL PEMBUATAN TUGAS BARU */}
               <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-wrap items-center gap-2 md:gap-3 relative z-[60]">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block mr-2">BUAT TUGAS :</span>
                 
                 {(currentUser?.role !== 'staff' || currentUser?.tm_assign_tasks) ? (
                   <>
                     <button type="button" onClick={() => handleOpenTaskModal('regular', 'personal')} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-xs md:text-sm active:scale-95 cursor-pointer">
                       <CheckSquare className="w-4 h-4 pointer-events-none" /> Tugas Saya
                     </button>
                     <button type="button" onClick={() => handleOpenTaskModal('regular', 'delegate')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-xs md:text-sm active:scale-95 cursor-pointer">
                       <Users className="w-4 h-4 pointer-events-none" /> Beri Tugas
                     </button>
                   </>
                 ) : (
                   <button type="button" onClick={() => handleOpenTaskModal('regular', 'personal')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-xs md:text-sm active:scale-95 cursor-pointer">
                     <Plus className="w-4 h-4 pointer-events-none" /> Tugas Baru
                   </button>
                 )}
                 
                 <button type="button" onClick={() => handleOpenTaskModal('ticketing', 'personal')} className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-xs md:text-sm active:scale-95 cursor-pointer">
                   <Activity className="w-4 h-4 pointer-events-none" /> Request IT
                 </button>
                 
                 {currentUser?.cleaningAccess && (
                   <button type="button" onClick={() => handleOpenTaskModal('cleaning', 'personal')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-xs md:text-sm active:scale-95 cursor-pointer">
                     <Camera className="w-4 h-4 pointer-events-none" /> Laporan OB
                   </button>
                 )}
               </div>

               {/* BARIS PENCARIAN & FILTER */}
               <div className="bg-white p-2 md:p-3 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center gap-2">
                 <div className="flex w-full items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus-within:border-blue-300 focus-within:bg-white transition-colors">
                   <Search className="w-5 h-5 text-slate-400 shrink-0" />
                   <input type="text" placeholder="Cari pekerjaan atau PIC..." value={taskSearchQuery} onChange={(e) => setTaskSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                 </div>
                 
                 <div className="flex w-full md:w-auto gap-2">
                   <input type="month" value={taskFilterMonth} onChange={(e) => {setTaskFilterMonth(e.target.value); setTaskFilterDate('');}} className="w-full md:w-auto px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-blue-300" />
                   {(taskFilterMonth || taskFilterDate || taskSearchQuery) && (
                     <button type="button" onClick={() => {setTaskSearchQuery(''); setTaskFilterMonth(''); setTaskFilterDate('');}} className="px-4 py-2 bg-red-50 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 shrink-0">Reset</button>
                   )}
                 </div>
                 
                 {currentUser?.role === 'admin' && (
                   <div className="flex w-full md:w-auto mt-2 md:mt-0 md:ml-auto">
                      <button type="button" onClick={handleOpenBackup} className="w-full md:w-auto px-4 py-2 bg-slate-800 text-white font-bold text-xs md:text-sm rounded-xl hover:bg-black shadow-md flex items-center justify-center gap-2 transition-all">
                        <DatabaseBackup className="w-4 h-4"/> Backup DB
                      </button>
                   </div>
                 )}
               </div>

               {/* KANBAN BOARD GROUPED BY DATE */}
               <div className="min-h-[60vh]">
                  {(() => {
                     // Filter Tugas
                     const filteredKanbanTasks = myTasks.filter(t => {
                        if (isHelpdeskViewer && t.title && t.title.startsWith('[TIKET IT]')) return false;
                        if (taskSearchQuery) {
                          const query = taskSearchQuery.toLowerCase();
                          return t.title.toLowerCase().includes(query) || getAssigneesNames(t.assignedTo).toLowerCase().includes(query);
                        }
                        if (taskFilterMonth && !t.dueDate?.startsWith(taskFilterMonth)) return false;
                        return true;
                     });

                     // Kelompokkan Berdasarkan Tanggal
                     const groupedByDate = filteredKanbanTasks.reduce((acc, t) => {
                        const dateKey = t.dueDate ? t.dueDate.substring(0, 10) : 'Tanpa Tanggal';
                        if (!acc[dateKey]) acc[dateKey] = [];
                        acc[dateKey].push(t);
                        return acc;
                     }, {});

                     // Urutkan Tanggal (Terbaru di atas)
                     const sortedDates = Object.keys(groupedByDate).sort((a,b) => {
                        if (a === 'Tanpa Tanggal') return 1;
                        if (b === 'Tanpa Tanggal') return -1;
                        return new Date(b) - new Date(a); 
                     });

                     if (sortedDates.length === 0) return <div className="bg-white p-10 text-center rounded-[2rem] border border-slate-200 shadow-sm text-slate-400 font-bold text-sm">Tidak ada pekerjaan ditemukan.</div>;

                     return sortedDates.map((dateKey, index) => {
                        const isExpanded = expandedTaskDates[dateKey] !== false; // Default Terbuka
                        const tasksInDate = groupedByDate[dateKey];
                        const dateLabel = dateKey === 'Tanpa Tanggal' ? dateKey : new Date(dateKey).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

                        // Komponen Card Kecil
                        const renderKanbanCard = (t) => {
                           const isOverdue = t.dueDate < getNowStr() && t.status !== 'done';
                           return (
                             <div 
                               key={t.id}
                               draggable
                               onDragStart={(e) => { e.dataTransfer.setData('taskId', t.id); setMovingTaskId(t.id); }}
                               onDragEnd={() => setMovingTaskId(null)}
                               onClick={() => handleOpenTaskDetail(t)}
                               className={`bg-white p-3 md:p-4 rounded-2xl shadow-sm border cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-md transition-all group flex flex-col gap-2 ${movingTaskId === t.id ? 'opacity-50 border-blue-400 scale-95' : isOverdue ? 'border-red-200' : 'border-slate-200'}`}
                             >
                                <div className="flex justify-between items-start mb-1">
                                   <Badge type={t.priority}>{t.priority}</Badge>
                                   {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse"/>}
                                   {t.status === 'waiting-approval' && <ShieldCheck className="w-3.5 h-3.5 text-orange-500"/>}
                                </div>
                                <h5 className="font-bold text-xs md:text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{t.title}</h5>
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                                   <div className="flex -space-x-2">
                                      {getAssigneesArray(t.assignedTo).slice(0,3).map(id => <div key={id} title={getUserName(id)} className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-black text-[8px] border-2 border-white shadow-sm">{getAvatar(id)}</div>)}
                                      {getAssigneesArray(t.assignedTo).length > 3 && <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[8px] border-2 border-white shadow-sm">+{getAssigneesArray(t.assignedTo).length - 3}</div>}
                                   </div>
                                   {t.dueDate && <span className={`text-[9px] font-black tracking-widest ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>{t.dueDate.substring(11, 16)}</span>}
                                </div>
                             </div>
                           )
                        };

                        return (
                          <div key={dateKey} className="mb-4 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                             {/* ACCORDION HEADER */}
                             <button 
                               onClick={() => setExpandedTaskDates(prev => ({...prev, [dateKey]: !isExpanded}))}
                               className="w-full bg-slate-50/80 px-5 py-4 flex items-center justify-between border-b border-slate-100 hover:bg-blue-50/50 transition-colors"
                             >
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner shrink-0"><Calendar className="w-4 h-4"/></div>
                                   <h4 className="font-black text-slate-800 text-sm tracking-tight">{dateLabel}</h4>
                                   <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">{tasksInDate.length} Tugas</span>
                                </div>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400"/> : <ChevronRight className="w-5 h-5 text-slate-400"/>}
                             </button>

                             {/* KANBAN COLUMNS */}
                             <div className={`transition-all duration-500 ${isExpanded ? 'p-4 md:p-6 block' : 'hidden'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                   
                                   {/* KOLOM PENDING */}
                                   <div 
                                      onDragOver={(e) => e.preventDefault()} 
                                      onDrop={(e) => handleDropTask(e, 'pending', dateKey)}
                                      className="bg-slate-50 rounded-[1.5rem] p-3 md:p-4 border-2 border-dashed border-slate-200 min-h-[150px] flex flex-col"
                                   >
                                      <h4 className="font-black text-slate-500 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
                                         <span className="w-2 h-2 rounded-full bg-slate-400"></span> Pending <span className="ml-auto bg-slate-200 text-slate-600 px-1.5 rounded">{tasksInDate.filter(t => t.status === 'pending').length}</span>
                                      </h4>
                                      <div className="space-y-3 flex-1">
                                         {tasksInDate.filter(t => t.status === 'pending').map(renderKanbanCard)}
                                         {tasksInDate.filter(t => t.status === 'pending').length === 0 && <div className="h-full flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase">Tarik Ke Sini</div>}
                                      </div>
                                   </div>

                                   {/* KOLOM IN PROGRESS */}
                                   <div 
                                      onDragOver={(e) => e.preventDefault()} 
                                      onDrop={(e) => handleDropTask(e, 'in-progress', dateKey)}
                                      className="bg-blue-50/50 rounded-[1.5rem] p-3 md:p-4 border-2 border-dashed border-blue-200 min-h-[150px] flex flex-col"
                                   >
                                      <h4 className="font-black text-blue-600 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-blue-100">
                                         <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Sedang Diproses <span className="ml-auto bg-blue-200 text-blue-700 px-1.5 rounded">{tasksInDate.filter(t => t.status === 'in-progress').length}</span>
                                      </h4>
                                      <div className="space-y-3 flex-1">
                                         {tasksInDate.filter(t => t.status === 'in-progress').map(renderKanbanCard)}
                                         {tasksInDate.filter(t => t.status === 'in-progress').length === 0 && <div className="h-full flex items-center justify-center text-[10px] font-bold text-blue-300/50 uppercase">Tarik Ke Sini</div>}
                                      </div>
                                   </div>

                                   {/* KOLOM DONE & WAITING */}
                                   <div 
                                      onDragOver={(e) => e.preventDefault()} 
                                      onDrop={(e) => handleDropTask(e, 'done', dateKey)}
                                      className="bg-emerald-50/50 rounded-[1.5rem] p-3 md:p-4 border-2 border-dashed border-emerald-200 min-h-[150px] flex flex-col"
                                   >
                                      <h4 className="font-black text-emerald-600 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-emerald-100">
                                         <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Selesai / Review <span className="ml-auto bg-emerald-200 text-emerald-700 px-1.5 rounded">{tasksInDate.filter(t => t.status === 'done' || t.status === 'waiting-approval').length}</span>
                                      </h4>
                                      <div className="space-y-3 flex-1">
                                         {tasksInDate.filter(t => t.status === 'done' || t.status === 'waiting-approval').map(renderKanbanCard)}
                                         {tasksInDate.filter(t => t.status === 'done' || t.status === 'waiting-approval').length === 0 && <div className="h-full flex items-center justify-center text-[10px] font-bold text-emerald-300/50 uppercase">Tarik Ke Sini</div>}
                                      </div>
                                   </div>

                                </div>
                             </div>
                          </div>
                        );
                     });
                  })()}
               </div>
            </div>
          )}

          {/* TAB: HELPDESK IT (KHUSUS TIM IT & MANAGER) */}
          {activeTab === 'tiket_it' && isHelpdeskViewer && (
            <div className="space-y-4 print:hidden animate-in fade-in duration-300 pb-20 md:pb-0">
               <div className="bg-white p-2 md:p-3 rounded-2xl shadow-sm border border-purple-200/60 flex flex-col md:flex-row items-center gap-2">
                 <div className="flex w-full items-center bg-purple-50/50 rounded-xl px-4 py-2 border border-purple-100 focus-within:border-purple-300 focus-within:bg-white transition-colors">
                   <Search className="w-5 h-5 text-purple-400 shrink-0" />
                   <input type="text" placeholder="Cari laporan kendala IT..." value={taskSearchQuery} onChange={(e) => setTaskSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none pl-3 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                 </div>
                 
                 <div className="flex w-full md:w-auto gap-2">
                   <input type="month" value={taskFilterMonth} onChange={(e) => {setTaskFilterMonth(e.target.value); setTaskFilterDate('');}} className="w-full md:w-auto px-4 py-2 bg-purple-50/50 border border-purple-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-purple-300" />
                   {(taskFilterMonth || taskFilterDate || taskSearchQuery) && (
                     <button type="button" onClick={() => {setTaskSearchQuery(''); setTaskFilterMonth(''); setTaskFilterDate('');}} className="px-4 py-2 bg-red-50 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 shrink-0">Reset</button>
                   )}
                 </div>
               </div>

               <div className="bg-white rounded-[2rem] shadow-sm border border-purple-200/60 p-3 md:p-6 min-h-[50vh] pb-20 md:pb-6">
                 <h3 className="px-2 text-xs md:text-sm font-black text-purple-600 uppercase tracking-widest mb-4 border-b border-purple-100 pb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4"/> Daftar Tiket & Kendala Sistem
                 </h3>
                 <div className="space-y-1 overflow-y-auto custom-scrollbar">
                  {myTasks.filter(t => {
                    // HANYA TAMPILKAN YANG JUDULNYA TIKET IT
                    if (!t.title || !t.title.startsWith('[TIKET IT]')) return false; 
                    
                    if (taskSearchQuery) {
                      const query = taskSearchQuery.toLowerCase();
                      const matchTitle = t.title.toLowerCase().includes(query);
                      const assigneesNames = getAssigneesNames(t.assignedTo).toLowerCase();
                      const matchAssignee = assigneesNames.includes(query);
                      if (!matchTitle && !matchAssignee) return false;
                    }
                    if (taskFilterMonth && !t.dueDate.startsWith(taskFilterMonth)) return false;
                    return true;
                  }).map(t => {
                    const nowLocalStr = getNowStr();
                    const isOverdue = t.dueDate < nowLocalStr && t.status !== 'done';
                    const assigneesArr = getAssigneesArray(t.assignedTo);
                    
                    return (  
                      <div key={t.id} onClick={() => handleOpenTaskDetail(t)} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 hover:bg-purple-50/30 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-purple-100 gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white ${isOverdue ? 'bg-red-100 text-red-600' : t.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'}`}>
                            {t.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : isOverdue ? <AlertCircle className="w-6 h-6"/> : <Activity className="w-6 h-6" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm md:text-base font-black text-slate-800 line-clamp-1 mb-1">{t.title.replace('[TIKET IT] ', '')}</h4>
                            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {formatDateTime(t.dueDate)}</span>
                              <span>•</span>
                              <span className="truncate">Pelapor: {getUserName(t.assignedBy)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 pl-16 sm:pl-0">
                          {isOverdue && <span className="text-[9px] font-black text-white bg-red-600 px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Overdue</span>}
                          {!isOverdue && <Badge type={t.status}>{t.status.replace('-', ' ')}</Badge>}
                          <div className="hidden sm:flex -space-x-2 mt-1">
                            {assigneesArr.slice(0,3).map(id => <div key={id} title={getUserName(id)} className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-[9px] border-2 border-white relative z-10">{getAvatar(id)}</div>)}
                            {assigneesArr.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[9px] border-2 border-white relative z-0">+{assigneesArr.length - 3}</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {myTasks.filter(t => t.title && t.title.startsWith('[TIKET IT]')).length === 0 && <div className="p-10 text-center text-sm font-bold text-slate-400">Belum ada kendala IT yang dilaporkan.</div>}
                 </div>
               </div>
            </div>
          )}

          {/* TAB: LAPORAN */}
          {activeTab === 'laporan' && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 print:space-y-0 pb-24 md:pb-0">
              {/* Notifikasi khusus HP */}
              <div className="md:hidden bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-4 shadow-sm text-center">
                 <Printer className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                 <h4 className="text-blue-800 font-black text-sm">Mode Cetak Aktif</h4>
                 <p className="text-blue-600 font-medium text-[10px] mt-1">Disarankan mengunduh PDF melalui perangkat Komputer/Laptop untuk hasil terbaik.</p>
              </div>

              <Card className="p-3 md:p-4 mb-3 md:mb-4 bg-white border-blue-200 border-2 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
                  <div className="w-full md:w-1/2">
                    <h3 className="font-black text-sm md:text-base text-slate-800 mb-3 md:mb-4 flex items-center gap-2"><Filter className="w-4 h-4 md:w-5 md:h-5 text-blue-500"/> Filter Periode Laporan</h3>
                    <div className="flex items-center gap-3">
                      <input type="month" value={reportFilterMonth} onChange={(e) => setReportFilterMonth(e.target.value)} className="w-full md:w-2/3 px-3 py-2 md:px-4 md:py-3 border border-slate-300 rounded-xl font-bold text-sm md:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                      {reportFilterMonth && <button type="button" onClick={() => setReportFilterMonth('')} className="text-xs md:text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-2 rounded-xl">Reset</button>}
                    </div>
                  </div>

                  {(currentUser.role !== 'staff' || currentUser.tm_print_reports) && (
                    <div className="w-full md:w-1/2">
                      <h3 className="font-black text-sm md:text-base text-slate-800 mb-3 md:mb-4 flex items-center gap-2"><Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500"/> Pilih Laporan Karyawan</h3>
                      <select value={reportTargetUserId} onChange={(e) => setReportTargetUserId(e.target.value)} className="w-full px-3 py-2 md:px-4 md:py-3 border border-slate-300 flex items-center rounded-xl font-bold text-sm md:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
                         <option value="ALL">-- CETAK LAPORAN SEMUA KARYAWAN --</option>
                         {users.filter(u => (u.role === 'staff' || u.role === 'manager') && (currentUser.role === 'admin' || currentUser.tm_access_all_tasks || currentUser.crossDivision || (currentUser.role === 'direksi' && (currentUser.accessible_divisions || []).includes(u.division)) || u.division === currentUser.division)).map(u => (
                           <option key={u.id} value={u.id}>{u.name} - {u.role.toUpperCase()} (Divisi {u.division})</option>
                         ))}
                      </select>
                    </div>
                  )}
                </div>
              </Card>

              {(() => {
                const isGlobalMode = (currentUser.role !== 'staff' || currentUser.tm_print_reports) && (reportTargetUserId === 'ALL');
                let targetUser = null;

                if (isGlobalMode) {
                  targetUser = { id: 'ALL', name: 'Semua Karyawan & Staff', position: 'Berbagai Posisi', division: 'Seluruh Divisi' };
                } else if (currentUser.role === 'staff' && !currentUser.tm_print_reports) {
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

                const tTotal = targetTasks.length;
                let totalKpiScore = 0;
                let tDoneOnTime = 0;
                let tDoneLate = 0;

                targetTasks.forEach(t => {
                  if (t.status === 'done') {
                    if (t.completed_at && t.completed_at > t.dueDate) {
                      tDoneLate++;
                      totalKpiScore += 0.5; 
                    } else {
                      tDoneOnTime++;
                      totalKpiScore += 1;   
                    }
                  }
                });

                const tRate = tTotal === 0 ? 0 : Math.round((totalKpiScore / tTotal) * 100);
                const tDoneTotal = tDoneOnTime + tDoneLate;
                const periodeCetak = reportFilterMonth 
                  ? new Date(reportFilterMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) 
                  : new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                return (
                  <div className={`${isGeneratingPDF ? '' : 'max-h-[calc(100vh-260px)] overflow-y-auto custom-scrollbar'} pb-10`}>
                    
                    <Card id="report-pdf-content" className={`p-4 md:p-6 border-0 shadow-sm bg-white ${isGeneratingPDF ? 'text-black overflow-visible' : 'overflow-hidden'}`}>
                      
                      <div className="border-b-4 border-amber-600 pb-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className={`${isGeneratingPDF ? 'w-20 h-20' : 'w-12 h-12 md:w-16 md:h-16'} flex items-center justify-center shrink-0`}>
                            <img src="/Logo_apps.png" alt="Logo" className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1">
                            <h1 className={`${isGeneratingPDF ? 'text-3xl' : 'text-lg md:text-xl'} font-black text-slate-900 tracking-tight uppercase leading-tight`}>{sysConfig.brandName}</h1>
                            <p className={`${isGeneratingPDF ? 'text-sm' : 'text-[8px] md:text-[12px]'} font-bold text-slate-600 mt-1 leading-snug`}>Komp. Ruko BSD Sektor VII, Jl. Pahlawan Seribu No.63 - 64 Blok RN,<br /> WetanTangerang, Kec. Serpong, Banten 15310</p>
                            <p className={`${isGeneratingPDF ? 'text-sm' : 'text-[8px] md:text-[12px]'} font-bold text-slate-600`}>Telp: 0800 1778889</p>
                          </div>
                        </div>

                        {!isGeneratingPDF && (
                          <div className="flex w-full md:w-auto justify-end shrink-0 pt-3 md:pt-0">
                            <button type="button" onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 px-6 py-3 w-full md:w-auto bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs md:text-sm shadow-md transition-all">
                              <Download className="w-4 h-4 md:w-5 md:h-5"/> Unduh PDF
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-center py-2 mb-4">
                        <h2 className={`${isGeneratingPDF ? 'text-2xl' : 'text-base md:text-lg'} font-black text-slate-800 uppercase tracking-widest underline underline-offset-4 decoration-2`}>
                          {isGlobalMode ? 'Laporan Kinerja Global' : 'Laporan Kinerja Karyawan'}
                        </h2>
                        <p className={`${isGeneratingPDF ? 'text-sm' : 'text-[10px] md:text-xs'} text-slate-500 font-bold mt-2`}>Periode: {periodeCetak}</p>
                      </div>

                      <div className="mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-slate-300 rounded-xl p-3 md:p-4">
                          <div><span className={`block ${isGeneratingPDF ? 'text-xs' : 'text-[8px] md:text-[9px]'} font-black text-slate-400 uppercase tracking-widest`}>Karyawan / Target</span><span className={`font-black text-slate-800 ${isGeneratingPDF ? 'text-base' : 'text-xs md:text-sm'} block mt-1`}>{targetUser.name}</span></div>
                          <div><span className={`block ${isGeneratingPDF ? 'text-xs' : 'text-[8px] md:text-[9px]'} font-black text-slate-400 uppercase tracking-widest`}>Posisi Jabatan</span><span className={`font-bold text-slate-800 ${isGeneratingPDF ? 'text-base' : 'text-xs md:text-sm'} block mt-1`}>{targetUser.position}</span></div>
                          <div><span className={`block ${isGeneratingPDF ? 'text-xs' : 'text-[8px] md:text-[9px]'} font-black text-slate-400 uppercase tracking-widest`}>Departemen</span><span className={`font-bold text-slate-800 ${isGeneratingPDF ? 'text-base' : 'text-xs md:text-sm'} block mt-1`}>{targetUser.division}</span></div>
                          <div>
                            <span className={`block ${isGeneratingPDF ? 'text-xs' : 'text-[8px] md:text-[9px]'} font-black text-slate-400 uppercase tracking-widest`}>Penyelesaian (KPI)</span>
                            <span className={`font-black text-emerald-600 ${isGeneratingPDF ? 'text-xl' : 'text-sm md:text-base'} block`}>{tRate}%</span>
                            <span className={`block ${isGeneratingPDF ? 'text-[10px]' : 'text-[7px] md:text-[8px]'} font-bold text-slate-500 mt-1`}>Tepat: {tDoneOnTime} | Telat: {tDoneLate} | Total: {tTotal}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full">
                        <h3 className={`${isGeneratingPDF ? 'text-base' : 'text-xs md:text-sm'} font-black text-slate-800 mb-3 flex items-center gap-2`}><FileText className="w-4 h-4"/> Rincian Aktivitas Pekerjaan</h3>
                        <table className="w-full text-left border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 uppercase tracking-widest font-black border-b border-slate-300">
                              <th className={`px-3 py-2 border-r border-slate-300 text-center ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>No</th>
                              <th className={`px-3 py-2 border-r border-slate-300 ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>Deskripsi Tugas</th>
                              <th className={`px-3 py-2 border-r border-slate-300 ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>Dikerjakan Oleh</th>
                              <th className={`px-3 py-2 border-r border-slate-300 ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>Pemberi Tugas & Waktu</th>
                              <th className={`px-3 py-2 border-r border-slate-300 ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>Data Approval</th>
                              <th className={`px-3 py-2 border-slate-300 text-center ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {targetTasks.map((t, index) => { 
                              const nowLocalStr = getNowStr();
                              const isNotDoneOverdue = t.dueDate < nowLocalStr && t.status !== 'done';
                              const isDoneLate = t.status === 'done' && t.completed_at && t.completed_at > t.dueDate;
                              
                              return (
                                <tr key={t.id} onClick={() => handleOpenTaskDetail(t)} className="border-b border-slate-300 break-inside-avoid cursor-pointer hover:bg-slate-50 transition-colors">
                                  <td className={`px-3 py-2 font-bold text-slate-600 border-r border-slate-300 text-center align-top ${isGeneratingPDF ? 'text-xs' : 'text-[10px]'}`}>{index + 1}</td>
                                  <td className={`px-3 py-2 font-bold text-slate-800 border-r border-slate-300 align-top ${isGeneratingPDF ? 'text-xs' : 'text-[10px]'}`}>{t.title}</td>
                                  <td className={`px-3 py-2 font-bold text-blue-600 border-r border-slate-300 align-top ${isGeneratingPDF ? 'text-xs' : 'text-[10px]'}`}>{getAssigneesNames(t.assignedTo)}</td>
                                  
                                  <td className="px-3 py-2 border-r border-slate-300 align-top">
                                    <div className={`flex flex-col gap-1 ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>
                                      <span className="text-slate-600">Oleh: <span className="font-bold text-blue-600">{getUserName(t.assignedBy)}</span></span>
                                      <span className="text-slate-600">Diberikan: <span className="font-bold text-slate-800">{t.created_at ? formatDateTime(t.created_at) : '-'}</span></span>
                                      <span className="text-slate-600">Deadline: <span className={`font-bold ${isNotDoneOverdue ? 'text-red-600' : 'text-slate-800'}`}>{t.dueDate ? formatDateTime(t.dueDate) : '-'}</span></span>
                                    </div>
                                  </td>

                                  <td className="px-3 py-2 border-r border-slate-300 align-top">
                                    <div className={`flex flex-col gap-1 ${isGeneratingPDF ? 'text-xs' : 'text-[9px]'}`}>
                                      <span className="text-slate-600">Selesai: <span className="font-bold text-emerald-600">{t.completed_at ? formatDateTime(t.completed_at) : '-'}</span></span>
                                      <span className="text-slate-600">Approve: <span className="font-bold text-blue-600">{t.approved_by ? getUserName(t.approved_by) : '-'}</span></span>
                                    </div>
                                  </td>

                                  <td className={`px-3 py-2 text-center border-slate-300 font-black uppercase tracking-wider align-top ${isGeneratingPDF ? 'text-xs' : 'text-[8px]'}`}>
                                    <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                                      {isGeneratingPDF ? (
                                         <span className={`font-black ${t.status === 'done' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                           {t.status === 'done' ? 'SELESAI' : String(t.status).toUpperCase()}
                                         </span>
                                      ) : (
                                         <Badge type={t.status}>{String(t.status).toUpperCase()}</Badge>
                                      )}
                                      
                                      {isDoneLate && <span className={`bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded shadow-sm w-fit mx-auto ${isGeneratingPDF ? 'text-[9px]' : 'text-[7px]'}`}>SELESAI TELAT</span>}
                                      {isNotDoneOverdue && <span className={`bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded shadow-sm w-fit mx-auto ${isGeneratingPDF ? 'text-[9px]' : 'text-[7px]'}`}>TERLAMBAT</span>}
                                    </div>
                                  </td>
                                </tr>
                               )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className={`${isGeneratingPDF ? 'flex' : 'hidden md:flex'} justify-between mt-16 pt-8 break-inside-avoid px-8`}>
                        <div className="text-center w-48">
                           <p className={`mb-20 font-bold text-slate-800 ${isGeneratingPDF ? 'text-sm' : 'text-xs'}`}>Mengetahui,<br/>{isGlobalMode ? 'Direktur Utama' : 'Manager Divisi'}</p>
                           <p className={`font-bold text-slate-800 border-t border-slate-400 pt-2 uppercase ${isGeneratingPDF ? 'text-sm' : 'text-xs'}`}>
                              ( ......................................... )
                           </p>
                        </div>
                        <div className="text-center w-48">
                           <p className={`mb-20 font-bold text-slate-800 ${isGeneratingPDF ? 'text-sm' : 'text-xs'}`}>Tangerang Selatan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<br/>{isGlobalMode ? 'System Admin' : 'Pembuat Laporan'}</p>
                           <p className={`font-bold text-slate-800 border-t border-slate-400 pt-2 uppercase ${isGeneratingPDF ? 'text-sm' : 'text-xs'}`}>
                              {isGlobalMode ? currentUser.name : targetUser.name}
                           </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              })()}
            </div>
          )}

          {/* TAB: TIM DIVISI */}
          {activeTab === 'division' && (currentUser.role === 'admin' || currentUser.role === 'direksi' || currentUser.role === 'manager' || currentUser.tm_monitor_division) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 print:hidden animate-in fade-in duration-300 md:p-10">
              {users.filter(u => {
                 // 1. Hanya tampilkan staff dan manager
                 if (!(u.role === 'staff' || u.role === 'manager')) return false;

                 // 2. Jika Admin memfilter 1 divisi spesifik dari Sidebar
                 if (selectedDivision !== 'Semua Divisi') {
                    return u.division === selectedDivision;
                 }

                 // 3. Jika memilih "Semua Pantauan Tim"
                 if (currentUser.role === 'admin' || currentUser.tm_access_all_tasks) return true;

                 // Fungsi pembantu untuk mencari nama Departemen
                 const getDepartment = (divName) => {
                    const div = divisions.find(d => d.name === divName);
                    return div ? div.department_name : divName;
                 };

                 const uDept = getDepartment(u.division);
                 const myDept = getDepartment(currentUser.division);

                 // 4. Aturan Hak Akses Pantauan Divisi
                 if (currentUser.role === 'staff') {
                    // Staff HANYA bisa memantau rekan di divisinya sendiri secara spesifik
                    if (u.division === currentUser.division) return true;
                 } else {
                    // Manager/Direksi bisa memantau seluruh departemennya
                    if (uDept === myDept || u.division === currentUser.division) return true;
                    // Dan juga memantau hak akses silang khusus dari Admin
                    const allowedCustom = currentUser.accessible_divisions || [];
                    if (allowedCustom.includes(uDept) || allowedCustom.includes(u.division)) return true;
                 }

                 return false;
              }).map(staff => {
                  const staffTasks = tasks.filter(t => getAssigneesArray(t.assignedTo).includes(staff.id));
                  return (
                    <Card key={staff.id} className="p-0 flex flex-col items-center text-center hover:-translate-y-1 transition-transform border border-slate-200 shadow-sm relative overflow-hidden bg-white">
                      <div className="absolute top-0 w-full h-1.5 md:h-2 bg-gradient-to-r from-blue-500 to-blue-800"></div>
                      <div className="p-5 md:p-6 w-full flex flex-col items-center">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 text-slate-700 font-black text-xl md:text-2xl rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-slate-100">{staff.avatar}</div>
                        <h3 className="font-black text-base md:text-lg text-slate-800 tracking-tight line-clamp-1">{staff.name}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold mb-3">{staff.position}</p>
                        <Badge type="low">Divisi {staff.division}</Badge>
                      </div>
                      <div className="w-full grid grid-cols-3 gap-0.5 mt-auto bg-slate-50 border-t border-slate-100 p-1">
                          <div className="flex flex-col items-center py-2"><span className="text-lg md:text-xl font-black text-slate-600">{staffTasks.filter(t=>t.status==='pending').length}</span><span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Pending</span></div>
                          <div className="flex flex-col items-center py-2 border-l border-r border-slate-200 bg-blue-50/50"><span className="text-lg md:text-xl font-black text-blue-600">{staffTasks.filter(t=>t.status==='in-progress').length}</span><span className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">Progress</span></div>
                          <div className="flex flex-col items-center py-2"><span className="text-lg md:text-xl font-black text-emerald-600">{staffTasks.filter(t=>t.status==='done').length}</span><span className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Selesai</span></div>
                      </div>
                    </Card>
                  )
              })}
            </div>
          )}

          {/* TAB: PENGATURAN & PENGGUNA (UNIFIED VIEW) */}
          {activeTab === 'admin_settings' && (currentUser.role === 'admin' || currentUser.tm_manage_system) && (
            <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] animate-in fade-in duration-300 pb-20 md:pb-0 -mx-3 md:mx-0">
              
              {/* HEADER TAB NAVIGATION (PIL) */}
              <div className="flex overflow-x-auto custom-scrollbar gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-full md:w-fit mb-4 md:mb-6 shadow-inner border border-slate-200/60 shrink-0 px-3 md:px-1.5 mx-3 md:mx-0">
                 <button onClick={() => setSettingsActiveTab('pengguna')} className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${settingsActiveTab === 'pengguna' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                   <Users size={16}/> Kelola Pengguna
                 </button>
                 <button onClick={() => setSettingsActiveTab('struktur')} className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${settingsActiveTab === 'struktur' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                   <Building size={16}/> Struktur Organisasi
                 </button>
                 <button onClick={() => setSettingsActiveTab('keamanan')} className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${settingsActiveTab === 'keamanan' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                   <ShieldCheck size={16}/> Keamanan & Sistem
                 </button>
              </div>

              {/* TAB CONTENTS (RENDERED DYNAMICALLY) */}
              <div className="flex-1 overflow-hidden relative mx-3 md:mx-0">
                 
                 {/* 1. KONTEN KELOLA PENGGUNA */}
                 {settingsActiveTab === 'pengguna' && (
                    <div className="h-full flex flex-col animate-in slide-in-from-right-8 fade-in duration-500">
                      <Card className="border-0 shadow-sm overflow-hidden bg-white flex flex-col h-full rounded-[2rem]">
                         <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-slate-50/50">
                           <div className="flex items-center gap-3">
                             <h3 className="font-black text-base md:text-xl text-slate-800 flex items-center gap-2 shrink-0"><Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500"/> Daftar Akun Karyawan</h3>
                             {selectedUsers.length > 0 && (
                               <button type="button" onClick={handleBulkDeleteUsers} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 transition-colors animate-in zoom-in">
                                 <Trash2 className="w-3.5 h-3.5" /> Hapus {selectedUsers.length} Terpilih
                               </button>
                             )}
                           </div>
                           <div className="relative w-full md:w-64 shrink-0">
                             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                             <input type="text" placeholder="Cari nama atau NIK..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs md:text-sm font-bold focus:border-blue-500 outline-none bg-white shadow-sm transition-colors" />
                           </div>
                         </div>

                         <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50 p-4 space-y-6">
                            <p className="text-[10px] text-slate-500 mb-2 font-medium flex items-center gap-2"><GripVertical size={14}/> <i>Tarik dan lepas (Drag & Drop) kartu karyawan ke kolom departemen lain untuk memutasi mereka secara instan.</i></p>
                            
                            {departments.map(dept => {
                               const deptUsers = users.filter(u => getDepartment(u.division) === dept && (!userSearchQuery || (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.nik || '').toLowerCase().includes(userSearchQuery.toLowerCase())));
                               const isExpanded = expandedUserDepts[dept] === true; // Defaultnya tertutup (collapse)
                               const isAllSelected = deptUsers.length > 0 && deptUsers.every(u => selectedUsers.includes(u.id));
                               
                               return (
                                 <div 
                                    key={dept} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropUser(e, dept)}
                                    className={`border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden transition-all ${isExpanded ? 'pb-2' : ''}`}
                                 >
                                    <div 
                                       className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition-colors"
                                       onClick={() => setExpandedUserDepts(p => ({...p, [dept]: !isExpanded}))}
                                    >
                                       <div className="flex items-center gap-3">
                                         <button 
                                            onClick={(e) => { 
                                               e.stopPropagation(); 
                                               if (isAllSelected) { 
                                                  setSelectedUsers(selectedUsers.filter(id => !deptUsers.find(u => u.id === id))); 
                                               } else { 
                                                  const newSel = [...selectedUsers]; 
                                                  deptUsers.forEach(u => { if(!newSel.includes(u.id)) newSel.push(u.id); }); 
                                                  setSelectedUsers(newSel); 
                                               } 
                                            }} 
                                            className="mt-0.5"
                                         >
                                           <input type="checkbox" checked={isAllSelected} onChange={() => {}} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                         </button>
                                         <h4 className="font-black text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
                                           <Building className="w-4 h-4 text-blue-600"/> {dept}
                                         </h4>
                                       </div>
                                       <div className="flex items-center gap-3">
                                         <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">{deptUsers.length} Orang</span>
                                         {isExpanded ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                                       </div>
                                    </div>

                                    <div className={`transition-all duration-300 ${isExpanded ? 'p-4 block' : 'hidden'}`}>
                                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {deptUsers.length === 0 && <div className="col-span-full p-6 text-center text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">Area Drop Karyawan</div>}
                                          
                                          {deptUsers.map(u => (
                                             <div 
                                                key={u.id}
                                                draggable
                                                onDragStart={(e) => { e.dataTransfer.setData('userId', u.id); }}
                                                className={`bg-white p-4 rounded-2xl border shadow-sm cursor-grab active:cursor-grabbing transition-all flex flex-col gap-3 group ${selectedUsers.includes(u.id) ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}
                                             >
                                                <div className="flex items-start justify-between">
                                                   <div className="flex items-center gap-3">
                                                      <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-sm shadow-inner shrink-0">{u.avatar}</div>
                                                      <div>
                                                         <span className="font-black text-slate-800 text-sm block line-clamp-1">{u.name}</span>
                                                         <span className="text-[10px] font-bold text-slate-400">{u.nik || '-'}</span>
                                                      </div>
                                                   </div>
                                                   <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => {setEditingUser({...u, department: dept}); setIsEditUserModalOpen(true);}} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-100" title="Edit Pengguna"><Edit size={14}/></button>
                                                      {u.id !== currentUser.id && u.role !== 'admin' && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-100" title="Cabut Akses"><Trash2 size={14}/></button>
                                                      )}
                                                   </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                   <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]" title={u.division}>{u.division || 'Belum ada divisi'}</span>
                                                   <Badge type={u.role === 'admin' ? 'admin' : u.role === 'direksi' ? 'high' : u.role === 'manager' ? 'low' : 'done'}>{u.role}</Badge>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                      </Card>
                    </div>
                 )}

                 {/* 2. KONTEN STRUKTUR & IDENTITAS (GRID SPLIT) */}
                 {settingsActiveTab === 'struktur' && (
                    <div className="h-full overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 fade-in duration-500 pb-20 md:pb-6">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                         
                         {/* KOLOM KIRI (Brand & Role) */}
                         <div className="lg:col-span-5 space-y-6">
                            <Card className="p-5 md:p-6 bg-white overflow-hidden shadow-sm border-0">
                              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Identitas Brand
                              </h4>
                              <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nama Perusahaan (Tampil di Laporan)</label>
                              <input type="text" 
                                className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-black text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-50 focus:bg-white" 
                                value={configForm.brandName} 
                                onChange={(e) => setConfigForm({...configForm, brandName: e.target.value})} 
                              />
                            </Card>

                            <Card className="p-5 md:p-6 bg-white overflow-hidden shadow-sm border-0">
                              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Master Kode (Project & Tugas)
                              </h4>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kode Project (Pisahkan dengan koma)</label>
                                  <textarea rows="2" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all" value={configForm.projectCodes || ''} onChange={(e) => setConfigForm({...configForm, projectCodes: e.target.value})} placeholder="Contoh: PRJ-001, PRJ-002, PROJECT-X"></textarea>
                                </div>
                                <div>
                                  <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kode Tugas / Kategori Masalah</label>
                                  <textarea rows="2" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all" value={configForm.taskCodes || ''} onChange={(e) => setConfigForm({...configForm, taskCodes: e.target.value})} placeholder="Contoh: KOMPLAIN, INSIDEN, REGULER"></textarea>
                                </div>
                              </div>
                            </Card>
                         </div>

                         {/* KOLOM KANAN (Struktur Tree) */}
                         <Card className="lg:col-span-7 p-5 md:p-6 bg-white overflow-hidden shadow-sm h-full flex flex-col border-0">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Struktur Organisasi Berjenjang
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 p-4 bg-slate-50/50 rounded-2xl border border-slate-200 shadow-inner">
                               <div>
                                 <label className="block text-[9px] font-bold text-blue-600 uppercase mb-1">1. Buat Departemen Baru</label>
                                 <div className="flex gap-2">
                                   <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Nama Departemen..." className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs focus:border-blue-500 outline-none" />
                                   <button onClick={handleAddDepartment} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-xl font-bold transition shadow-sm"><PlusCircle size={16}/></button>
                                 </div>
                               </div>
                               <div>
                                 <label className="block text-[9px] font-bold text-emerald-600 uppercase mb-1">2. Tambah Divisi Ke Departemen</label>
                                 <div className="flex gap-2">
                                   <select value={selectedDeptForDiv} onChange={e => setSelectedDeptForDiv(e.target.value)} className="w-1/3 px-2 border-2 border-slate-200 rounded-xl font-bold text-[10px] focus:border-emerald-500 outline-none truncate bg-white">
                                     {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                   </select>
                                   <input type="text" value={newDivName} onChange={e => setNewDivName(e.target.value)} placeholder="Nama Divisi..." className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs focus:border-emerald-500 outline-none" />
                                   <button onClick={handleAddDivision} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-xl font-bold transition shadow-sm"><PlusCircle size={16}/></button>
                                 </div>
                               </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mb-4 font-medium flex items-center gap-2"><GripVertical size={14}/> <i>Tips: Klik dan tahan divisi (Drag & Drop) untuk memindahkannya antar folder departemen.</i></p>

                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                              {departments.map(dept => {
                                const deptDivisions = divisions.filter(d => d.department_name === dept);
                                return (
                                <div key={dept} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dept)} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-blue-300">
                                   <button onClick={() => toggleDept(dept)} className="w-full flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                                      <div className="flex items-center gap-2">
                                        <Building className="w-4 h-4 text-blue-600"/>
                                        <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{dept}</span>
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[9px] font-black">{deptDivisions.length} Div</span>
                                      </div>
                                      {expandedDepts[dept] ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                                   </button>
                                   <div className={`transition-all duration-300 ${expandedDepts[dept] ? 'p-3 md:p-4 block' : 'hidden'}`}>
                                     <div className="flex flex-wrap gap-2.5 min-h-[40px] bg-slate-50/30 p-2 border-2 border-dashed border-slate-200 rounded-xl">
                                       {deptDivisions.length === 0 && <span className="text-[10px] text-slate-400 font-bold m-auto">Area Drop Divisi Kosong</span>}
                                       {deptDivisions.map(div => (
                                         <div key={div.name} draggable onDragStart={(e) => handleDragStart(e, div.name, dept)} className={`group flex items-center gap-2 px-3 py-1.5 md:px-3 md:py-2 bg-white border shadow-sm rounded-lg cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 hover:shadow-md ${movingDivName === div.name ? 'border-amber-400 bg-amber-50 opacity-50' : 'border-slate-200 hover:border-blue-400'}`}>
                                           {movingDivName === div.name ? <Loader2 className="w-3 h-3 text-amber-500 animate-spin" /> : <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />}
                                           <span className="font-bold text-xs text-slate-700">{div.name}</span>
                                           <button onClick={() => handleDeleteDivision(div.name)} className="text-slate-300 hover:text-red-500 ml-1 transition-colors p-1 bg-slate-50 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                </div>
                              )})}
                            </div>
                         </Card>

                      </div>
                    </div>
                 )}

                 {/* 3. KONTEN KEAMANAN & OTOMASI */}
                 {settingsActiveTab === 'keamanan' && (
                    <div className="h-full overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 fade-in duration-500 pb-20 md:pb-6">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                          
                          {/* KOLOM KIRI (Batasan & Otomasi) */}
                          <div className="space-y-6">
                            <Card className="p-5 md:p-6 bg-white overflow-hidden shadow-sm border-0">
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-5 border-b border-slate-100 pb-3">
                                <span className="w-2 h-2 rounded-full bg-slate-500"></span> Pembatasan & Keamanan Akun
                              </h4>
                              <div className="space-y-5">
                                <div className="flex flex-col">
                                   <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Batas Ukuran Lampiran Server</label>
                                   <select value={configForm.maxUploadSize || '5'} onChange={(e) => setConfigForm({...configForm, maxUploadSize: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none cursor-pointer transition-all">
                                     <option value="2">2 MB (Hemat Penyimpanan - Cepat)</option>
                                     <option value="5">5 MB (Rekomendasi Standar)</option>
                                     <option value="10">10 MB (Kualitas Tinggi)</option>
                                     <option value="20">20 MB (Dokumen Ekstra Besar)</option>
                                   </select>
                                </div>
                                <div className="flex flex-col">
                                   <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Otomatis Keluar (Sesi Timeout)</label>
                                   <select value={configForm.sessionTimeout || '60'} onChange={(e) => setConfigForm({...configForm, sessionTimeout: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none cursor-pointer transition-all">
                                     <option value="30">30 Menit (Sangat Ketat)</option>
                                     <option value="60">1 Jam (Standar Keamanan Normal)</option>
                                     <option value="720">12 Jam (Cocok untuk 1 Shift Kerja)</option>
                                     <option value="0">Tidak Pernah Logout (Keep Alive)</option>
                                   </select>
                                </div>
                              </div>
                            </Card>

                            <Card className="p-2 bg-white overflow-hidden shadow-sm border-0">
                              <h4 className="px-4 pt-4 text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Toggle Mode Sistem & Otomasi
                              </h4>
                              <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors" onClick={() => setConfigForm({...configForm, strictMode: !configForm.strictMode})}>
                                <div className="pr-4">
                                  <h4 className="font-black text-slate-800 text-xs md:text-sm">Mode Disiplin (Wajib Lampirkan Bukti)</h4>
                                  <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 font-bold leading-relaxed">Karyawan tidak bisa klik selesai jika bukti foto kosong.</p>
                                </div>
                                <div className={`w-12 h-6 ${configForm.strictMode ? 'bg-amber-500' : 'bg-slate-200'} rounded-full relative transition-colors duration-300 shrink-0 shadow-inner`}><div className={`w-4 h-4 bg-white rounded-full shadow-md absolute top-1 transition-transform duration-300 ${configForm.strictMode ? 'translate-x-7' : 'translate-x-1'}`}></div></div>
                              </div>
                              <div className="h-px bg-slate-100 mx-5"></div>
                              <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors" onClick={() => setConfigForm({...configForm, autoEmail: !configForm.autoEmail})}>
                                <div className="pr-4">
                                  <h4 className="font-black text-slate-800 text-xs md:text-sm">Auto Push Notifikasi Harian</h4>
                                  <p className="text-[9px] md:text-[10px] text-slate-500 mt-1 font-bold leading-relaxed">Sistem Broadcast mengingatkan tugas via Notifikasi Pagi.</p>
                                </div>
                                <div className={`w-12 h-6 ${configForm.autoEmail ? 'bg-amber-500' : 'bg-slate-200'} rounded-full relative transition-colors duration-300 shrink-0 shadow-inner`}><div className={`w-4 h-4 bg-white rounded-full shadow-md absolute top-1 transition-transform duration-300 ${configForm.autoEmail ? 'translate-x-7' : 'translate-x-1'}`}></div></div>
                              </div>
                              <div className="h-px bg-slate-100 mx-5"></div>
                              <div className="flex items-center justify-between p-4 hover:bg-red-50/50 rounded-2xl cursor-pointer transition-colors" onClick={() => setConfigForm({...configForm, maintenanceMode: !configForm.maintenanceMode})}>
                                <div className="pr-4">
                                  <h4 className="font-black text-red-600 text-xs md:text-sm">Aktifkan Mode Maintenance (Perbaikan)</h4>
                                  <p className="text-[9px] md:text-[10px] text-red-500/80 mt-1 font-bold leading-relaxed">Memblokir akses karyawan sementara selama perbaikan Server.</p>
                                </div>
                                <div className={`w-12 h-6 ${configForm.maintenanceMode ? 'bg-red-500' : 'bg-slate-200'} rounded-full relative transition-colors duration-300 shrink-0 shadow-inner`}><div className={`w-4 h-4 bg-white rounded-full shadow-md absolute top-1 transition-transform duration-300 ${configForm.maintenanceMode ? 'translate-x-7' : 'translate-x-1'}`}></div></div>
                              </div>
                            </Card>
                          </div>

                          {/* KOLOM KANAN (Pemetaan Hak Akses Direktur) */}
                          <Card className="p-5 md:p-6 bg-white overflow-hidden shadow-sm h-full border-0">
                              <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Pemetaan Hak Akses Level Direksi
                              </h4>
                              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                 {users.filter(u => u.role === 'direksi').length === 0 ? (
                                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50"><p className="text-xs font-bold text-slate-400">Belum ada akun pengguna dengan Role "Direksi".</p></div>
                                 ) : (
                                    users.filter(u => u.role === 'direksi').map(direktur => (
                                       <div key={direktur.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-purple-200 transition-colors shadow-sm">
                                          <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200/60">
                                             <div>
                                                <span className="font-black text-slate-800 text-sm">{direktur.name}</span>
                                                <span className="text-[9px] ml-2 font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded uppercase tracking-widest">NIK: {direktur.nik}</span>
                                             </div>
                                             <button onClick={() => handleSaveDirekturAccess(direktur)} className="text-[10px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-purple-700 transition-colors">
                                                Simpan Akses
                                             </button>
                                          </div>
                                          
                                          <label className="flex items-center gap-2 cursor-pointer mb-3 p-2 bg-purple-50/50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors">
                                             <input type="checkbox" checked={direktur.crossDivision || false} onChange={(e) => { setUsers(users.map(u => u.id === direktur.id ? {...u, crossDivision: e.target.checked} : u)); }} className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"/>
                                             <span className="text-xs font-black text-purple-800">Direktur Utama (Beri Akses Pantau Ke Semua Area)</span>
                                          </label>
                                          
                                          {!direktur.crossDivision && (
                                             <div className="pl-3 border-l-2 border-purple-200">
                                                <p className="text-[9px] font-bold text-slate-500 mb-2">Pilih Departemen yang dikepalai:</p>
                                                <div className="flex flex-wrap gap-2">
                                                  {departments.map(dept => (
                                                     <label key={dept} className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-purple-300 shadow-sm transition-colors">
                                                        <input type="checkbox" checked={(direktur.accessible_divisions || []).includes(dept)} onChange={(e) => { const current = direktur.accessible_divisions || []; const updated = e.target.checked ? [...current, dept] : current.filter(d => d !== dept); setUsers(users.map(u => u.id === direktur.id ? {...u, accessible_divisions: updated} : u)); }} className="w-4 h-4 text-purple-600 rounded border-slate-300 cursor-pointer"/>
                                                        <span className="text-[10px] font-bold text-slate-700">{dept}</span>
                                                     </label>
                                                  ))}
                                                </div>
                                             </div>
                                          )}
                                       </div>
                                    ))
                                 )}
                              </div>
                          </Card>
                       </div>
                    </div>
                 )}

              </div>
              
              {/* TOMBOL SIMPAN GLOBAL MENGAMBANG (Muncul jika BUKAN tab pengguna) */}
              <div className={`fixed bottom-6 right-6 z-40 transition-all duration-300 print:hidden ${settingsActiveTab !== 'pengguna' ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <button type="button" onClick={handleSaveConfig} className="py-3.5 px-6 bg-blue-600 text-white rounded-2xl font-black shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all text-sm flex items-center justify-center gap-2">
                   <CheckCircle2 className="w-5 h-5"/> Simpan Pengaturan
                </button>
              </div>

            </div>
          )}

          {/* === MODAL 1: DETAIL TUGAS & APPROVAL (SPLIT VIEW DYNAMIC) === */}
                    {selectedTask && activeTab !== 'chat' && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex justify-center items-end md:items-center md:p-8 print:hidden">
                        {/* Ukuran Modal Berubah Dinamis: max-w-3xl (Single) menjadi max-w-6xl (Split) */}
                        <div className={`w-full h-[85vh] md:h-[90vh] bg-white rounded-t-[2rem] md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 duration-300 transition-all ease-in-out ${isChatOpen ? 'md:max-w-6xl' : 'md:max-w-3xl'}`}>
                          
                          {/* --- PANEL KIRI: DETAIL TUGAS --- */}
                          <div className={`w-full flex-col bg-white h-full md:h-full ${isChatOpen ? 'hidden md:flex md:w-1/2 border-r border-slate-200' : 'flex md:w-full'}`}>
                            <div className="px-5 py-4 md:px-8 md:py-5 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                              <div className="flex items-center gap-3">
                                <h3 className="font-black text-base md:text-xl text-slate-800 tracking-tight flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-blue-600"/> Detail Tugas
                                </h3>
                                {(currentUser?.role === 'admin' || currentUser?.tm_delete_tasks || String(selectedTask.assignedBy) === String(currentUser.id)) && (
                                  <button type="button" onClick={() => handleDeleteTask(selectedTask.id, selectedTask.title)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 text-[10px] font-black shadow-sm transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Hapus Tugas</span>
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                 {/* Tombol Toggle Chat Split */}
                                 <button type="button" onClick={() => setIsChatOpen(!isChatOpen)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-[10px] md:text-xs shadow-sm transition-colors border ${isChatOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'}`}>
                                   <MessageSquare className="w-4 h-4"/> 
                                   <span className="hidden md:inline">{isChatOpen ? 'Tutup Diskusi' : 'Buka Diskusi / Chat'}</span>
                                   <span className="md:hidden">Chat</span>
                                 </button>
                                 <button type="button" onClick={handleCloseTaskDetail} className="p-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 rounded-xl shadow-sm transition-colors"><X className="w-5 h-5" /></button>
                              </div>
                            </div>
          
                            <div className="p-5 md:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-slate-50/30 pb-10">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                  {selectedTask.status === 'laporan-cleaning' ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black tracking-widest rounded-md uppercase flex items-center gap-1.5 shadow-sm">🧹 Laporan Cleaning / OB</span>
                                  ) : (
                                    <>
                                        {selectedTask.dueDate < getNowStr() && selectedTask.status !== 'done' && (
                                          <Badge type="overdue">OVERDUE (TERLAMBAT)</Badge>
                                        )}
                                        <Badge type={selectedTask.status}>{String(selectedTask.status).replace('-', ' ').toUpperCase()}</Badge>
                                        <Badge type={selectedTask.priority}>PRIORITAS {selectedTask.priority.toUpperCase()}</Badge>
                                    </>
                                  )}
                                </div>
                                
                                <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight">{selectedTask.title}</h2>
                                
                                  {selectedTask.status === 'laporan-cleaning' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm">
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Dikirim / Diselesaikan Pada</span>
                                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5"/> 
                                          {selectedTask.completed_at ? formatDateTime(selectedTask.completed_at) : (selectedTask.created_at ? formatDateTime(selectedTask.created_at) : '-')}
                                        </span>
                                      </div>
                                      <div className="flex flex-col border-t md:border-t-0 md:border-l border-emerald-200 pt-3 md:pt-0 md:pl-4">
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Dilaporkan Oleh</span>
                                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                          <Users className="w-3.5 h-3.5"/> 
                                          {getUserName(selectedTask.assignedBy)}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diberikan Pada</span>
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-blue-500"/> 
                                          {selectedTask.created_at ? formatDateTime(selectedTask.created_at) : '-'}
                                        </span>
                                      </div>
                                      
                                      <div className="flex flex-col border-l border-slate-100 pl-3 md:pl-4">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Batas Waktu (Deadline)</span>
                                        <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedTask.dueDate < getNowStr() && selectedTask.status !== 'done' ? 'text-red-600' : 'text-slate-700'}`}>
                                          <Clock className="w-3.5 h-3.5"/> {formatDateTime(selectedTask.dueDate)}
                                        </span>
                                      </div>
                                      
                                      <div className="flex flex-col pt-3 md:pt-0 md:border-l border-slate-100 md:pl-4 col-span-2 md:col-span-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tgl Selesai</span>
                                        <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedTask.status === 'done' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                          <CheckCircle2 className="w-3.5 h-3.5"/> {selectedTask.completed_at ? formatDateTime(selectedTask.completed_at) : '-'}
                                        </span>
                                      </div>
                                      
                                      <div className="flex flex-col pt-3 md:pt-0 border-l border-slate-100 pl-3 md:pl-4 col-span-2 md:col-span-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Di-Approve</span>
                                        <span className={`text-xs font-bold flex items-center gap-1.5 ${selectedTask.approved_by ? 'text-blue-600' : 'text-slate-400'}`}>
                                          <ShieldCheck className="w-3.5 h-3.5"/> {selectedTask.approved_by ? getUserName(selectedTask.approved_by) : '-'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
          
                                <div className="text-slate-700 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 font-medium text-xs md:text-sm leading-relaxed shadow-sm">
                                  <span className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Detail Pekerjaan:</span>
                                  {selectedTask.description || 'Tidak ada deskripsi tambahan.'}
                                </div>
                              </div>
          
                              {(getAssigneesArray(selectedTask.assignedTo).includes(currentUser?.id) || String(selectedTask.assignedBy) === String(currentUser?.id) || ['admin', 'direksi', 'manager'].includes(currentUser?.role)) && (
                                  <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Update Status Pekerjaan</label>
                                    <select 
                                      value={selectedTask.status} 
                                      onChange={(e) => handleStatusUpdate(selectedTask.id, e.target.value)}
                                      disabled={currentUser?.role === 'staff' && selectedTask.status === 'waiting-approval'}
                                      className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed bg-slate-50 focus:bg-white transition-colors"
                                    >
                                      <option value="pending">Pending (Belum Dikerjakan)</option>
                                      <option value="in-progress">In Progress (Sedang Diproses)</option>
                                      <option value="done">Done (Selesai)</option>
                                    </select>
                                    {currentUser?.role === 'staff' && selectedTask.status === 'waiting-approval' && (
                                      <p className="text-[9px] md:text-[10px] text-orange-500 mt-2 font-bold uppercase tracking-wider">
                                        * Status terkunci: Menunggu persetujuan (Approval) Atasan.
                                      </p>
                                    )}
                                  </div>
                                )}
          
                              {((String(selectedTask.assignedBy) === String(currentUser.id) || currentUser.role === 'admin' || currentUser.tm_access_all_tasks) && selectedTask.status === 'waiting-approval') && (
                                <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl animate-pulse shadow-sm">
                                  <p className="text-xs font-black text-orange-700 uppercase mb-3 text-center">Butuh Konfirmasi Penyelesaian</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleApproveTask(selectedTask.id, true)} className="bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md">
                                      <Check className="w-4 h-4"/> Approve Selesai
                                    </button>
                                    <button onClick={() => handleApproveTask(selectedTask.id, false)} className="bg-white text-red-600 border border-red-200 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 shadow-sm">
                                      <X className="w-4 h-4"/> Tolak & Revisi
                                    </button>
                                  </div>
                                </div>
                              )}
          
                              <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                                  <div>
                                    <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base"><Paperclip className="w-4 h-4 text-blue-500"/> Lampiran Bukti</h4>
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase">PDF / JPG / PNG Max {configForm.maxUploadSize}MB</p>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <input type="file" id="upload-bukti" multiple={true} onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                                    <label htmlFor={isUploading ? "" : "upload-bukti"} className={`text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm ${isUploading ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 border border-blue-200'}`}>
                                      {isUploading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> Proses...</>) : (<><Paperclip className="w-3.5 h-3.5"/> Galeri/Multi</>)}
                                    </label>
          
                                    <input type="file" id="upload-kamera" accept="image/*" capture="environment" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
                                    <label htmlFor={isUploading ? "" : "upload-kamera"} className={`text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm ${isUploading ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 text-white cursor-pointer hover:bg-black border border-slate-900'}`}>
                                      <Camera className="w-3.5 h-3.5"/> Kamera
                                    </label>
                                  </div>
                                </div>
          
                                <div className="space-y-2">
                                  {(selectedTask.attachments || []).map(file => {
                                    const isImage = file.type?.startsWith('image/') || file.url?.match(/\.(jpeg|jpg|gif|png)$/i);
                                    
                                    return (
                                    <div key={file.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-100 transition-colors">
                                       <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => window.open(file.url, '_blank')}>
                                          {isImage ? (
                                             <img src={file.url} alt="preview" className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0" />
                                          ) : (
                                             <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0"><ImageIcon className="w-4 h-4 text-slate-400"/></div>
                                          )}
                                          
                                          <div className="min-w-0">
                                            <span className="text-xs font-bold text-slate-700 truncate block hover:text-blue-600">{file.name}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase truncate">Oleh: {getUserName(file.uploaderId)}</span>
                                          </div>
                                       </div>
                                       <div className="flex gap-2 shrink-0">
                                         <button onClick={() => window.open(file.url, '_blank')} className="text-blue-600 p-1.5 hover:bg-blue-100 rounded-lg bg-white border border-slate-200 shadow-sm"><Download className="w-4 h-4"/></button>
                                         {(String(file.uploaderId) === String(currentUser.id) || currentUser.role === 'admin') && (
                                           <button onClick={() => handleDeleteAttachment(file.id, file.name)} className="text-red-600 p-1.5 hover:bg-red-100 rounded-lg bg-white border border-slate-200 shadow-sm"><Trash2 className="w-4 h-4"/></button>
                                         )}
                                       </div>
                                    </div>
                                  )})}
                                  {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4 border-2 border-dashed border-slate-100 rounded-xl">Belum Ada Lampiran</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
          
                          {/* --- PANEL KANAN: KOLOM DISKUSI (MUNCUL JIKA isChatOpen TRUE) --- */}
                          {isChatOpen && (
                          <div className="w-full md:w-1/2 flex flex-col bg-slate-50 h-full md:h-full relative border-t md:border-t-0 animate-in slide-in-from-right-10 duration-300">
                            <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                              <div className="flex items-center gap-3">
                                 <h3 className="font-black text-sm md:text-lg text-slate-800 flex items-center gap-2"><MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Kolom Diskusi Pesan</h3>
                              </div>
                              {/* Di HP bisa ditutup via icon ini */}
                              <button type="button" onClick={() => setIsChatOpen(false)} className="p-1.5 md:hidden bg-slate-100 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-full border border-slate-200 transition-colors shadow-sm"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                            </div>
          
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
                              {(!Array.isArray(selectedTask?.comments) || selectedTask.comments.length === 0) && (
                                 <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                    <MessageSquare className="w-12 h-12 text-slate-300 mb-3"/>
                                    <p className="text-xs font-bold text-slate-500">Belum ada diskusi. Mulai percakapan sekarang!</p>
                                 </div>
                              )}
                              {(Array.isArray(selectedTask?.comments) ? selectedTask.comments : []).map((chat, idx) => {
                                const isMe = String(chat?.userId) === String(currentUser?.id);
                                const isEditingThis = editingMsgId === chat.id;
          
                                return (
                                  <div key={chat.id || idx} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                                    
                                    {/* Buble Chat Text / Input Edit */}
                                    {isEditingThis ? (
                                       <div className="w-[85%] bg-white border-2 border-indigo-200 rounded-2xl p-3 shadow-lg animate-in zoom-in-95">
                                         <textarea 
                                            value={editMsgText} 
                                            onChange={(e) => setEditMsgText(e.target.value)}
                                            className="w-full text-xs md:text-sm focus:outline-none resize-none bg-transparent mb-2"
                                            rows="2"
                                            autoFocus
                                         />
                                         <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                                            <button onClick={() => setEditingMsgId(null)} className="text-[10px] font-bold text-slate-500 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Batal</button>
                                            <button onClick={() => handleSaveEditMessage(chat.id)} className="text-[10px] font-black text-white px-3 py-1.5 bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">Simpan Pesan</button>
                                         </div>
                                       </div>
                                    ) : (
                                       <div className={`p-3 md:p-4 rounded-[1.2rem] shadow-sm max-w-[85%] relative ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                                         <p className="text-[11px] md:text-sm font-medium leading-relaxed whitespace-pre-wrap">{chat?.text || ''}</p>
                                         
                                         {/* Tombol Edit/Hapus Pesan (Muncul Saat Hover jika milik sendiri) */}
                                         {isMe && (
                                            <div className="absolute top-0 -left-16 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                              <button onClick={() => { setEditingMsgId(chat.id); setEditMsgText(chat.text); }} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit size={12}/></button>
                                              <button onClick={() => handleDeleteMessage(chat.id)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"><Trash2 size={12}/></button>
                                            </div>
                                         )}
                                       </div>
                                    )}
          
                                    <span className="text-[8px] md:text-[9px] font-black tracking-widest text-slate-400 mt-1.5 px-1 uppercase">
                                       {isMe ? 'Anda' : getUserName(chat?.userId)} • {chat?.timestamp || ''} {chat?.isEdited && <span className="text-indigo-400 italic">(Diedit)</span>}
                                    </span>
                                  </div>
                                );
                              })}
                              <div ref={chatEndRef} />
                            </div>
          
                            {/* FLOATING INPUT FORM (Lebih Elegan & Tidak Menempel Bawah) */}
                            <div className="p-4 md:p-6 bg-gradient-to-t from-slate-100 to-transparent shrink-0">
                              <form onSubmit={handleAddComment} className="flex items-end gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <textarea 
                                  value={newComment} 
                                  onChange={(e) => setNewComment(e.target.value)} 
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                       e.preventDefault();
                                       if (newComment.trim()) handleAddComment(e);
                                    }
                                  }}
                                  placeholder="Ketik balasan Anda di sini... (Shift+Enter untuk baris baru)" 
                                  className="flex-1 px-3 py-2 border-none focus:ring-0 resize-none max-h-32 text-xs md:text-sm bg-transparent font-medium text-slate-700 outline-none" 
                                  rows="1"
                                />
                                <button type="submit" disabled={!newComment.trim()} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transform active:scale-95 shadow-md shrink-0 transition-all mb-0.5 mr-0.5">
                                   <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                                </button>
                              </form>
                            </div>
                          </div>
                          )}
          
                        </div>
                      </div>
                    )}

          {/* === MODAL 2: TUGAS BARU === */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex justify-end md:justify-center items-end md:items-center md:p-4 print:hidden">
              <Card className="w-full h-[90vh] md:h-auto md:max-w-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in duration-300 border-0 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] md:shadow-2xl rounded-t-[2rem] rounded-b-none md:rounded-2xl mt-auto md:mt-0 relative bg-white"> 
                <div className={`px-5 py-4 md:px-8 md:py-6 border-b flex justify-between items-center text-white shrink-0 transition-colors duration-500 ${taskFormType === 'cleaning' ? 'bg-emerald-600 border-emerald-500' : taskFormType === 'ticketing' ? 'bg-purple-600 border-purple-500' : taskAssignMode === 'delegate' ? 'bg-indigo-600 border-indigo-500' : 'bg-blue-600 border-blue-500'}`}>
                  <div>
                     <h3 className="font-black text-base md:text-xl tracking-tight">
                       {taskFormType === 'cleaning' ? 'Laporan Kebersihan (OB)' : 
                        taskFormType === 'ticketing' ? 'Buat Tiket Bantuan IT' : 
                        taskAssignMode === 'delegate' ? 'Delegasi Tugas Baru' : 'Catat Tugas Pribadi'}
                     </h3>
                     <p className="text-white/70 text-[9px] md:text-[10px] font-medium mt-0.5">Isi rincian detail pekerjaan di bawah ini.</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
                
                <form id="createTaskForm" onSubmit={handleCreateTask} className="flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto custom-scrollbar flex-1 bg-white p-5 md:p-8 space-y-4 md:space-y-6">
                      
                      {/* === FORM TUGAS REGULER === */}
                      {taskFormType === 'regular' && (
                        <>
                          <div className={`grid ${newTask.projectCode ? 'grid-cols-2' : 'grid-cols-1'} gap-3 md:gap-5 mb-4 transition-all duration-300`}>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kode Project (Opsional)</label>
                              <select className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold cursor-pointer bg-slate-50 focus:bg-white transition-colors" value={newTask.projectCode || ''} onChange={e => setNewTask({...newTask, projectCode: e.target.value, taskCode: ''})}>
                                <option value="">-- Tanpa Kode --</option>
                                {(sysConfig.projectCodes || '').split(',').map(c => c.trim()).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            
                            {newTask.projectCode && (
                              <div className="animate-in fade-in zoom-in-95 duration-300">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kode Tugas / Insiden</label>
                                <select required className="w-full px-3 py-2.5 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 text-xs md:text-sm outline-none font-bold cursor-pointer bg-indigo-50 focus:bg-white transition-colors text-indigo-900" value={newTask.taskCode || ''} onChange={e => setNewTask({...newTask, taskCode: e.target.value})}>
                                  <option value="">-- Pilih Kode Tugas --</option>
                                  {(sysConfig.taskCodes || '').split(',').map(c => c.trim()).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Judul Pekerjaan</label>
                            <input required type="text" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}/>
                          </div>
                          <div className="grid grid-cols-2 gap-3 md:gap-5">
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Prioritas</label>
                              <select className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Batas Waktu / Deadline</label>
                              <input required type="datetime-local" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})}/>
                            </div>
                          </div>
                          {(currentUser?.role !== 'staff' || currentUser?.tm_assign_tasks) && taskAssignMode === 'delegate' && (
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                              <div className="flex justify-between items-end mb-2">
                                <label className="block text-[10px] font-black text-indigo-800 uppercase tracking-widest">Pilih Penerima Delegasi Tugas</label>
                              </div>
                              <div className="relative mb-3">
                                <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" placeholder="Cari nama karyawan..." value={recipientSearchQuery} onChange={(e) => setRecipientSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border-2 border-white rounded-xl text-xs font-bold outline-none focus:border-indigo-400 bg-white shadow-sm transition-colors" />
                              </div>
                              <div className="max-h-32 md:max-h-40 overflow-y-auto border-2 border-white rounded-xl p-2 space-y-1 bg-white shadow-inner custom-scrollbar">
                                {users.filter(u => {
                                   let hasAccess = false;
                                   if (currentUser?.role === 'direksi' || currentUser?.role === 'admin' || currentUser?.tm_access_all_tasks) hasAccess = (u.role === 'manager' || u.role === 'staff');
                                   else if (currentUser?.role === 'manager' || currentUser?.tm_monitor_division) hasAccess = (u.role === 'staff' || u.role === 'manager'); 
                                   else hasAccess = (u.role === 'staff');
                                   if (!hasAccess) return false;
                                   
                                   // ATURAN PEMBATASAN WILAYAH DIVISI UNTUK STAFF
                                   if (currentUser?.role === 'staff' && !currentUser?.tm_access_all_tasks) {
                                      if (u.division !== currentUser.division) return false;
                                   } else if (currentUser?.role !== 'admin' && !currentUser?.tm_access_all_tasks) {
                                      const getDepartment = (divName) => {
                                         const div = divisions.find(d => d.name === divName);
                                         return div ? div.department_name : divName;
                                      };
                                      const myDept = getDepartment(currentUser?.division);
                                      const uDept = getDepartment(u.division);
                                      const allowedCustom = currentUser?.accessible_divisions || [];
                                      if (uDept !== myDept && u.division !== currentUser?.division && !allowedCustom.includes(uDept) && !allowedCustom.includes(u.division)) return false;
                                   }

                                   if (recipientSearchQuery) return u.name.toLowerCase().includes(recipientSearchQuery.toLowerCase());
                                   return true;
                                }).map(user => (
                                  <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg cursor-pointer bg-white shadow-sm">
                                    <input type="checkbox" checked={newTask.assignedTo.includes(user.id)} onChange={(e) => setNewTask(p => ({ ...p, assignedTo: e.target.checked ? [...p.assignedTo, user.id] : p.assignedTo.filter(id => id !== user.id) }))} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                                    <span className="text-xs font-bold text-slate-700">{user.name} <span className="text-[10px] text-gray-400 font-bold ml-1">({user.division})</span></span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Detail Pekerjaan</label>
                            <textarea required rows="3" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none resize-none font-medium min-h-[100px]" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}></textarea>
                          </div>
                        </>
                      )}

                      {/* === FORM REQUEST TIKET IT === */}
                      {taskFormType === 'ticketing' && (
                        <>
                          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-2">
                             <p className="text-xs font-bold text-purple-800">Sistem akan mengirimkan laporan kendala ini secara langsung ke tim IT Pusat.</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kategori / Judul Kendala</label>
                            <input required type="text" placeholder="Contoh: Printer Error, Lupa Password, Jaringan Lambat..." className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-purple-500 text-xs md:text-sm outline-none font-bold" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}/>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tingkat Urgensi (Prioritas)</label>
                            <select className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-purple-500 text-xs md:text-sm outline-none font-bold" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                              <option value="low">Biasa (Tidak Mengganggu Kerja Utama)</option>
                              <option value="medium">Sedang (Butuh Bantuan Segera)</option>
                              <option value="high">Darurat (Sistem Mati / Operasional Terhenti)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Detail Masalah</label>
                            <textarea required rows="4" placeholder="Jelaskan secara detail masalah yang Anda alami..." className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-purple-500 text-xs md:text-sm outline-none resize-none font-medium" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}></textarea>
                          </div>
                        </>
                      )}

                      {/* === FORM KHUSUS CLEANING === */}
                      {taskFormType === 'cleaning' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Area / Judul Pembersihan</label>
                            <input required type="text" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-emerald-500 text-xs md:text-sm outline-none font-bold" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}/>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Keterangan Tambahan (Opsional)</label>
                            <textarea rows="3" placeholder="Contoh: Lantai lobi sudah dipel dan kaca dibersihkan..." className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-emerald-500 text-xs md:text-sm outline-none resize-none font-medium" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}></textarea>
                          </div>
                        </>
                      )}

                      {/* === AREA UPLOAD LAMPIRAN UNTUK SEMUA TUGAS === */}
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {taskFormType === 'cleaning' ? 'Upload Foto Laporan OB *' : 'Lampiran Dokumen / Foto (Opsional)'}
                          </label>
                          <div className="flex gap-2">
                            <input type="file" id="upload-foto-cleaning" multiple={true} onChange={handleUploadCleaningPhoto} disabled={isUploadingPhoto} className="hidden" />
                            <label htmlFor={isUploadingPhoto ? "" : "upload-foto-cleaning"} className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${isUploadingPhoto ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}`}>
                              {isUploadingPhoto ? <><Loader2 className="w-3 h-3 animate-spin"/> Uploading...</> : <><Paperclip className="w-4 h-4"/> Galeri/Multi</>}
                            </label>

                            <input type="file" id="upload-kamera-baru" accept="image/*" capture="environment" onChange={handleUploadCleaningPhoto} disabled={isUploadingPhoto} className="hidden" />
                            <label htmlFor={isUploadingPhoto ? "" : "upload-kamera-baru"} className={`text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${isUploadingPhoto ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-black'}`}>
                              <Camera className="w-4 h-4"/> Kamera
                            </label>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-3">
                          {cleaningPhotos.map(photo => {
                            const isPdf = photo.name.endsWith('.pdf') || photo.type === 'application/pdf';
                            return (
                              <div key={photo.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 shadow-sm gap-3">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  {isPdf ? (
                                    <div className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-md border border-red-100 shrink-0"><FileText className="w-5 h-5"/></div>
                                  ) : (
                                    <img src={photo.url} alt="preview" className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-slate-600 truncate">{photo.name}</span>
                                </div>
                                <button type="button" onClick={() => setCleaningPhotos(cleaningPhotos.filter(p => p.id !== photo.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md shrink-0"><X className="w-4 h-4"/></button>
                              </div>
                            )
                          })}
                          {cleaningPhotos.length === 0 && <p className="text-[10px] text-slate-400 font-bold text-center py-4">{taskFormType === 'cleaning' ? 'Belum ada foto. Wajib lampirkan minimal 1 foto.' : 'Belum ada lampiran yang dipilih.'}</p>}
                        </div>
                      </div>
                  </div>
                  <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-100 bg-slate-50 pb-10 shrink-0">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 md:px-5 md:py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                      <button type="submit" disabled={isSubmitting} className={`px-4 py-2.5 md:px-5 md:py-2.5 text-white rounded-xl font-bold text-xs md:text-sm shadow-md ${taskFormType === 'cleaning' ? 'bg-emerald-600 hover:bg-emerald-700' : taskFormType === 'ticketing' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {taskFormType === 'cleaning' ? 'Kirim Laporan OB' : taskFormType === 'ticketing' ? 'Kirim Tiket IT' : 'Simpan Pekerjaan'}
                      </button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* === MODAL 3: TAMBAH PENGGUNA === */}
          {isUserModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex justify-end md:justify-center items-end md:items-center md:p-4 print:hidden">
              <Card className="w-full h-[95vh] md:h-auto md:max-h-[90vh] md:max-w-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in duration-300 border-0 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] md:shadow-2xl rounded-t-[2rem] rounded-b-none md:rounded-2xl mt-auto md:mt-0 relative bg-white">
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
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newUser.nik} onChange={e => setNewUser({...newUser, nik: e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Role Akses</label>
                        <select className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newUser.role} onChange={e => {
                            const role = e.target.value;
                            let perms = {};
                            if(role === 'admin') perms = { tm_assign_tasks: true, tm_access_all_tasks: true, tm_delete_tasks: true, tm_helpdesk_viewer: true, tm_monitor_division: true, tm_print_reports: true, tm_manage_system: true, crossDivision: true, tm_view_executive_summary: true };
                            else if(role === 'direksi') perms = { tm_assign_tasks: true, tm_access_all_tasks: true, tm_delete_tasks: false, tm_helpdesk_viewer: true, tm_monitor_division: true, tm_print_reports: true, tm_manage_system: false, crossDivision: true, tm_view_executive_summary: true };
                            else if(role === 'manager') perms = { tm_assign_tasks: true, tm_access_all_tasks: false, tm_delete_tasks: false, tm_helpdesk_viewer: false, tm_monitor_division: true, tm_print_reports: false, tm_manage_system: false, crossDivision: false, tm_view_executive_summary: false };
                            else perms = { tm_assign_tasks: false, tm_access_all_tasks: false, tm_delete_tasks: false, tm_helpdesk_viewer: false, tm_monitor_division: false, tm_print_reports: false, tm_manage_system: false, crossDivision: false, tm_view_executive_summary: false };
                            setNewUser({...newUser, role, ...perms});
                        }}><option value="staff">Staff</option><option value="manager">Manager</option><option value="direksi">Direksi</option><option value="admin">Admin</option></select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Departemen</label>
                        <select required className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold bg-white" value={newUser.department || ''} onChange={e => setNewUser({...newUser, department: e.target.value, division: ''})}>
                           <option value="">-- Pilih Departemen --</option>
                           {departments.map(dept => <option key={`new-dept-${dept}`} value={dept}>{dept}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Divisi Spesifik</label>
                        <select required className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold bg-blue-50 border-blue-200 text-blue-900" value={newUser.division} onChange={e => {
                            const division = e.target.value;
                            let extra = {};
                            if(division.toLowerCase().includes('it')) extra.tm_helpdesk_viewer = true;
                            if(division.toLowerCase().includes('cleaning') || division.toLowerCase().includes('ob')) extra.cleaningAccess = true;
                            setNewUser({...newUser, division, ...extra});
                        }}>
                           <option value="">-- Pilih Divisi --</option>
                           {divisions.filter(d => !d.name.startsWith('[DEPT_ONLY]') && d.department_name === newUser.department).map((div, index) => <option key={`new-div-${index}`} value={div.name}>{div.name}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    {/* CUSTOM OVERRIDE DEPARTEMEN UNTUK ADD USER */}
                    {['manager', 'direksi', 'admin'].includes(newUser.role) && !newUser.tm_access_all_tasks && (
                      <div className="bg-indigo-50/50 p-4 border-2 border-indigo-100 rounded-2xl mt-4">
                         <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Akses Lintas Departemen (Opsional)</h4>
                         <p className="text-[9px] font-medium text-indigo-500 mb-3">Pilih departemen tambahan yang boleh dipantau oleh akun ini.</p>
                         
                         <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-indigo-100 max-h-40 overflow-y-auto custom-scrollbar">
                           {departments.map(dept => (
                              <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-indigo-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-200">
                                 <input 
                                   type="checkbox" 
                                   checked={(newUser.accessible_divisions || []).includes(dept)}
                                   onChange={(e) => {
                                      const currentAcc = newUser.accessible_divisions || [];
                                      const newAcc = e.target.checked ? [...currentAcc, dept] : currentAcc.filter(d => d !== dept);
                                      setNewUser({...newUser, accessible_divisions: newAcc});
                                   }}
                                   className="w-4 h-4 text-indigo-600 rounded border-indigo-300 cursor-pointer"
                                 />
                                 <span className="text-[10px] font-bold text-slate-700 truncate">{dept}</span>
                              </label>
                           ))}
                         </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Posisi Jabatan</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={newUser.position || ''} onChange={e => setNewUser({...newUser, position: e.target.value})}/>
                    </div>

                    <div className="border-t border-slate-100 pt-5 mt-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Kustomisasi Hak Akses Task Manager</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_assign_tasks || false} onChange={e => setNewUser({...newUser, tm_assign_tasks: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Beri & Delegasi Tugas</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat memberikan instruksi/tugas ke pengguna lain.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_access_all_tasks || false} onChange={e => setNewUser({...newUser, tm_access_all_tasks: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Akses Semua Pekerjaan</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat melihat tugas seluruh divisi tanpa batas wilayah.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_delete_tasks || false} onChange={e => setNewUser({...newUser, tm_delete_tasks: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Hapus Tugas (Bypass)</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat menghapus data tugas dari database secara permanen.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_helpdesk_viewer || false} onChange={e => setNewUser({...newUser, tm_helpdesk_viewer: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Admin Helpdesk IT</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Membuka menu & menerima notifikasi laporan kendala IT.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_monitor_division || false} onChange={e => setNewUser({...newUser, tm_monitor_division: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Pantau Tim Divisi</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Mengizinkan melihat menu pantauan KPI anggota tim.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_print_reports || false} onChange={e => setNewUser({...newUser, tm_print_reports: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Cetak Laporan Global</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat mengakses menu laporan KPI dan mengunduh rekap PDF.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={newUser.tm_view_executive_summary || false} onChange={e => setNewUser({...newUser, tm_view_executive_summary: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Executive Summary</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Mengizinkan melihat dan mengunduh ringkasan performa di Dashboard.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 p-4 mt-2 border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors mb-2">
                      <input type="checkbox" checked={newUser.cleaningAccess || false} onChange={(e) => setNewUser({...newUser, cleaningAccess: e.target.checked})} className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"/>
                      <div>
                        <span className="text-xs md:text-sm font-black text-emerald-900 block">Beri Akses Fitur Laporan OB/Cleaning</span>
                        <span className="text-[10px] md:text-[11px] font-medium text-emerald-600 block mt-0.5">Pengguna dapat mengirim laporan kebersihan cepat tanpa batas waktu/deadline.</span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2.5 md:px-5 md:py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                    <button type="submit" className="px-4 py-2.5 md:px-5 md:py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs md:text-sm shadow-md">Simpan Pengguna</button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* === MODAL 4: EDIT PENGGUNA === */}
          {isEditUserModalOpen && editingUser && (
            <div className="fixed inset-0 bg-slate-900/70 z-[80] flex justify-end md:justify-center items-end md:items-center md:p-4 print:hidden">
              <Card className="w-full h-[95vh] md:h-auto md:max-h-[90vh] md:max-w-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in duration-300 border-0 shadow-2xl rounded-t-[2rem] rounded-b-none md:rounded-2xl mt-auto md:mt-0 relative bg-white">
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-blue-600 flex justify-between items-center bg-blue-600 text-white shrink-0">
                  <div>
                     <h3 className="font-black text-base md:text-xl tracking-tight">Edit Data Pengguna</h3>
                     <p className="text-blue-200 text-[9px] md:text-[10px] font-medium mt-0.5">Ubah informasi divisi atau jabatan.</p>
                  </div>
                  <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
                </div>
                <form onSubmit={handleUpdateUser} className="flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto custom-scrollbar flex-1 bg-white p-5 md:p-8 space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Role Akses</label>
                        <select className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={editingUser.role} onChange={e => {
                            const role = e.target.value;
                            let perms = {};
                            if(role === 'admin') perms = { tm_assign_tasks: true, tm_access_all_tasks: true, tm_delete_tasks: true, tm_helpdesk_viewer: true, tm_monitor_division: true, tm_print_reports: true, tm_manage_system: true, crossDivision: true };
                            else if(role === 'direksi') perms = { tm_assign_tasks: true, tm_access_all_tasks: true, tm_delete_tasks: false, tm_helpdesk_viewer: true, tm_monitor_division: true, tm_print_reports: true, tm_manage_system: false, crossDivision: true };
                            else if(role === 'manager') perms = { tm_assign_tasks: true, tm_access_all_tasks: false, tm_delete_tasks: false, tm_helpdesk_viewer: false, tm_monitor_division: true, tm_print_reports: false, tm_manage_system: false, crossDivision: false };
                            else perms = { tm_assign_tasks: false, tm_access_all_tasks: false, tm_delete_tasks: false, tm_helpdesk_viewer: false, tm_monitor_division: false, tm_print_reports: false, tm_manage_system: false, crossDivision: false };
                            setEditingUser({...editingUser, role, ...perms});
                        }}><option value="staff">Staff</option><option value="manager">Manager</option><option value="direksi">Direksi</option><option value="admin">Admin</option></select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Departemen</label>
                        <select required className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold bg-white" value={editingUser.department || getDepartment(editingUser.division)} onChange={e => setEditingUser({...editingUser, department: e.target.value, division: ''})}>
                           <option value="">-- Pilih Departemen --</option>
                           {departments.map(dept => <option key={`dept-${dept}`} value={dept}>{dept}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Divisi Spesifik</label>
                        <select required className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold bg-blue-50 border-blue-200 text-blue-900" value={editingUser.division} onChange={e => {
                            const division = e.target.value;
                            let extra = {};
                            if(division.toLowerCase().includes('it')) extra.tm_helpdesk_viewer = true;
                            if(division.toLowerCase().includes('cleaning') || division.toLowerCase().includes('ob')) extra.cleaningAccess = true;
                            setEditingUser({...editingUser, division, ...extra});
                        }}>
                           <option value="">-- Pilih Divisi --</option>
                           {divisions.filter(d => !d.name.startsWith('[DEPT_ONLY]') && d.department_name === (editingUser.department || getDepartment(editingUser.division))).map((div, index) => <option key={`edit-div-${index}`} value={div.name}>{div.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* CUSTOM OVERRIDE DEPARTEMEN */}
                    {['manager', 'direksi', 'admin'].includes(editingUser.role) && !editingUser.tm_access_all_tasks && (
                      <div className="bg-indigo-50/50 p-4 border-2 border-indigo-100 rounded-2xl mt-4">
                         <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Akses Silang (Custom Override)</h4>
                         <p className="text-[9px] font-medium text-indigo-500 mb-3">Orang ini otomatis memantau divisinya. Centang departemen lain jika Anda ingin memberinya akses ekstra lintas departemen.</p>
                         
                         <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-indigo-100 max-h-40 overflow-y-auto custom-scrollbar">
                           {departments.map(dept => (
                              <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-indigo-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-200">
                                 <input 
                                   type="checkbox" 
                                   checked={(editingUser.accessible_divisions || []).includes(dept)}
                                   onChange={(e) => {
                                      const currentAcc = editingUser.accessible_divisions || [];
                                      const newAcc = e.target.checked ? [...currentAcc, dept] : currentAcc.filter(d => d !== dept);
                                      setEditingUser({...editingUser, accessible_divisions: newAcc});
                                   }}
                                   className="w-4 h-4 text-indigo-600 rounded border-indigo-300 cursor-pointer"
                                 />
                                 <span className="text-[10px] font-bold text-slate-700 truncate">{dept}</span>
                              </label>
                           ))}
                         </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Posisi Jabatan</label>
                      <input required type="text" className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 text-xs md:text-sm outline-none font-bold" value={editingUser.position} onChange={e => setEditingUser({...editingUser, position: e.target.value})}/>
                    </div>

                    <div className="border-t border-slate-100 pt-5 mt-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Kustomisasi Hak Akses Task Manager</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_assign_tasks || false} onChange={e => setEditingUser({...editingUser, tm_assign_tasks: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Beri & Delegasi Tugas</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat memberikan instruksi/tugas ke pengguna lain.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_access_all_tasks || false} onChange={e => setEditingUser({...editingUser, tm_access_all_tasks: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Akses Semua Pekerjaan</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat melihat tugas seluruh divisi tanpa batas wilayah.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_delete_tasks || false} onChange={e => setEditingUser({...editingUser, tm_delete_tasks: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Hapus Tugas (Bypass)</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat menghapus data tugas dari database secara permanen.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_helpdesk_viewer || false} onChange={e => setEditingUser({...editingUser, tm_helpdesk_viewer: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Admin Helpdesk IT</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Membuka menu & menerima notifikasi laporan kendala IT.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_monitor_division || false} onChange={e => setEditingUser({...editingUser, tm_monitor_division: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Pantau Tim Divisi</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Mengizinkan melihat menu pantauan KPI anggota tim.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_print_reports || false} onChange={e => setEditingUser({...editingUser, tm_print_reports: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Cetak Laporan Global</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Dapat mengakses menu laporan KPI dan mengunduh rekap PDF.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-white hover:border-blue-300 transition-colors shadow-sm">
                                <input type="checkbox" checked={editingUser.tm_manage_system || false} onChange={e => setEditingUser({...editingUser, tm_manage_system: e.target.checked})} className="w-4 h-4 text-blue-600 rounded mt-0.5"/>
                                <div>
                                    <span className="text-[11px] font-black text-slate-800 block mb-0.5">Akses Super Admin</span>
                                    <span className="text-[9px] font-medium text-slate-500 leading-tight block">Membuka menu Kelola Pengguna dan Konfigurasi Sistem.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <label className="flex items-start gap-3 p-4 mt-2 border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors mb-2">
                      <input 
                        type="checkbox" 
                        checked={editingUser.cleaningAccess || false} 
                        onChange={(e) => setEditingUser({...editingUser, cleaningAccess: e.target.checked})} 
                        className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs md:text-sm font-black text-emerald-900 block">Beri Akses Fitur Laporan OB/Cleaning</span>
                        <span className="text-[10px] md:text-[11px] font-medium text-emerald-600 block mt-0.5">Pengguna dapat mengirim laporan kebersihan cepat tanpa batas waktu/deadline.</span>
                      </div>
                    </label>

                  </div>
                  <div className="p-4 md:p-6 flex justify-end gap-2 md:gap-3 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="px-4 py-2.5 md:px-5 md:py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs md:text-sm">Batal</button>
                    <button type="submit" className="px-4 py-2.5 md:px-5 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-md">Simpan Perubahan</button>
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
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 focus-within:bg-blue-50/30">
                          <td className="p-2 text-center font-bold text-slate-400 text-xs">{index + 1}</td>
                          <td className="p-2"><input type="text" placeholder="NIK..." value={row.nik} onChange={(e) => handleMassChange(index, 'nik', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none" /></td>
                          <td className="p-2"><input type="text" placeholder="Nama Lengkap..." value={row.name} onChange={(e) => handleMassChange(index, 'name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none" /></td>
                          <td className="p-2"><input type="text" placeholder="123456" value={row.password} onChange={(e) => handleMassChange(index, 'password', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none" title="Kosongkan jika ingin password default: 123456" /></td>
                          <td className="p-2">
                            <select value={row.role} onChange={(e) => handleMassChange(index, 'role', e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none bg-white">
                              <option value="staff">Staff</option><option value="manager">Manager</option><option value="direksi">Direksi</option><option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select value={row.division} onChange={(e) => handleMassChange(index, 'division', e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none bg-white">
                              <option value="">-- Pilih --</option>
                              {divisions.filter(d => d.name).map((div, i) => <option key={`mass-${index}-${i}`} value={div.name}>{div.name}</option>)}
                            </select>
                          </td>
                          <td className="p-2"><input type="text" placeholder="Posisi..." value={row.position} onChange={(e) => handleMassChange(index, 'position', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none" /></td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => removeMassRow(index)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <button type="button" onClick={addMassRow} className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-xs md:text-sm px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 border-dashed w-full justify-center">
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
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-[60] print:hidden">
            <div className="flex justify-between items-center h-[72px] pb-safe px-4">
              
              <button type="button" onClick={() => navigateTo('dashboard')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                <LayoutDashboard className={`w-6 h-6 ${activeTab === 'dashboard' ? 'text-blue-600 fill-blue-50' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-black tracking-wide ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>Beranda</span>
              </button>
              
              <button type="button" onClick={() => navigateTo('tasks')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                <CheckSquare className={`w-6 h-6 ${activeTab === 'tasks' ? 'text-blue-600 fill-blue-50' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-black tracking-wide ${activeTab === 'tasks' ? 'text-blue-600' : 'text-slate-400'}`}>Tugas</span>
              </button>
              
              <div className="relative -top-5 flex justify-center w-16 shrink-0 z-50">
                 <button type="button" 
                   onClick={(e) => { 
                     e.preventDefault();
                     if (activeTab === 'admin_users') {
                        setIsUserModalOpen(true); 
                     } else {
                        const mode = (currentUser?.role !== 'staff' || currentUser?.tm_assign_tasks) ? 'delegate' : 'personal';
                        handleOpenTaskModal('regular', mode); 
                     }
                   }} 
                   className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(79,70,229,0.35)] border-4 border-slate-50 transform transition-transform hover:scale-105 active:scale-95">
                   {activeTab === 'admin_users' ? <UserPlus className="w-6 h-6" /> : <Plus className="w-7 h-7" strokeWidth={3} />}
                 </button>
              </div>

              {(currentUser.role === 'staff' && !currentUser.tm_print_reports) ? (
                <button type="button" onClick={() => navigateTo('laporan')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                  <FileText className={`w-6 h-6 ${activeTab === 'laporan' ? 'text-blue-600 fill-blue-50' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-black tracking-wide ${activeTab === 'laporan' ? 'text-blue-600' : 'text-slate-400'}`}>Laporan</span>
                </button>
              ) : (
                <button type="button" onClick={() => navigateTo('division')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 transition-colors">
                  <Users className={`w-6 h-6 ${activeTab === 'division' ? 'text-blue-600 fill-blue-50' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-black tracking-wide ${activeTab === 'division' ? 'text-blue-600' : 'text-slate-400'}`}>Tim</span>
                </button>
              )}
              
              <button type="button" onClick={() => navigateTo('chat')} className="flex flex-col items-center justify-center w-14 h-full gap-1.5 relative transition-colors">
                <div className="relative">
                   <MessageSquare className={`w-6 h-6 ${activeTab === 'chat' ? 'text-blue-600 fill-blue-50' : 'text-slate-400'}`} />
                   {unreadNotifsCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </div>
                <span className={`text-[10px] font-black tracking-wide ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}>Pesan</span>
              </button>
            </div>
          </div>

          <div className="md:hidden mt-auto pt-8 pb-8 flex flex-col items-center text-center print:hidden cursor-default opacity-80">
            <div className="h-px w-10 bg-slate-200 mb-3"></div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">
              © {new Date().getFullYear()} {sysConfig.brandName}
            </p>
            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Crafted by <span className="font-black text-slate-500">Vanda Tech</span>
            </p>
          </div>
        </div>

        {/* === MODAL BACKUP & RESET DATABASE === */}
        {isBackupModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex justify-center items-center p-4 print:hidden">
            <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
              <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-black text-lg flex items-center gap-2"><Archive className="w-5 h-5"/> Proses Backup & Reset</h3>
                {!isProcessingBackup && <button onClick={() => setIsBackupModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>}
              </div>
              
              <div className="p-6 space-y-6">
                {/* STEP 1: DOWNLOAD PDF */}
                <div className={`p-4 rounded-xl border-2 transition-all ${backupStep === 1 ? 'border-blue-500 bg-blue-50' : 'border-slate-100 opacity-50 grayscale pointer-events-none'}`}>
                  <h4 className="font-black text-slate-800 mb-2">Langkah 1: Amankan File PDF</h4>
                  <p className="text-xs text-slate-600 mb-4 font-medium">Ditemukan <strong>{backupPdfs.length}</strong> file PDF terlampir. File ini akan dibungkus dalam format .zip.</p>
                  <button onClick={handleDownloadPDFs} disabled={isProcessingBackup || backupStep !== 1} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
                    {isProcessingBackup && backupStep === 1 ? 'Mendownload...' : `Download ${backupPdfs.length} PDF (.zip)`}
                  </button>
                </div>

                {/* STEP 2: DOWNLOAD EXCEL */}
                <div className={`p-4 rounded-xl border-2 transition-all ${backupStep === 2 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 opacity-50 grayscale pointer-events-none'}`}>
                  <h4 className="font-black text-slate-800 mb-2">Langkah 2: Backup Data Utama (Excel)</h4>
                  <p className="text-xs text-slate-600 mb-4 font-medium">Download seluruh riwayat tugas beserta lampiran foto fisik ke dalam format Excel (.xlsx).</p>
                  <button onClick={handleDownloadExcel} disabled={isProcessingBackup || backupStep !== 2} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">
                    {isProcessingBackup && backupStep === 2 ? 'Menyusun Excel...' : 'Download Data ke Excel'}
                  </button>
                </div>

                {/* STEP 3: KOSONGKAN DATABASE */}
                <div className={`p-4 rounded-xl border-2 transition-all ${backupStep === 3 ? 'border-red-500 bg-red-50' : 'border-slate-100 opacity-50 grayscale pointer-events-none'}`}>
                  <h4 className="font-black text-red-700 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Langkah 3: Bersihkan Database</h4>
                  <p className="text-xs text-red-600/80 mb-3 font-bold">Pastikan file Excel dan PDF sudah sukses ter-download dan bisa dibuka di laptop kamu!</p>
                  
                  <div className="bg-white p-3 rounded-lg border border-red-200 mb-3">
                    <label className="block text-xs font-black text-slate-700 mb-1.5">Hapus Semua Data Sampai Tanggal:</label>
                    <input 
                        type="date" 
                        value={deleteDateLimit} 
                        onChange={e => setDeleteDateLimit(e.target.value)} 
                        disabled={backupStep !== 3} 
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-red-500 outline-none text-sm font-bold" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Hanya tugas yang dibuat pada dan sebelum tanggal ini yang akan dihapus.</p>
                  </div>

                  <p className="text-xs text-slate-700 mb-2 font-medium">Ketik kata <strong>kosongkan</strong> di bawah ini untuk konfirmasi.</p>
                  <input type="text" placeholder="Ketik kosongkan..." value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} disabled={backupStep !== 3} className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-red-500 outline-none text-sm font-bold mb-3" />
                  
                  <button onClick={handleEmptyDatabase} disabled={isProcessingBackup || backupStep !== 3 || deleteConfirmText !== 'kosongkan' || !deleteDateLimit} className="w-full bg-red-600 text-white py-2.5 rounded-lg font-black text-sm hover:bg-red-700 disabled:opacity-50">
                    {isProcessingBackup && backupStep === 3 ? 'Menghapus...' : 'Hapus Data Terpilih'}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

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