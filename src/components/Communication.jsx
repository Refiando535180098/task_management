import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import OneSignal from 'react-onesignal';
import { 
  Inbox, Send, Edit3, Paperclip, Link as LinkIcon, ArrowLeft, 
  Search, Users, User, Clock, CheckCheck, FileText, X, AlertCircle,
  Reply, Forward, Trash2, EyeOff
} from 'lucide-react';

const Communication = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Navigation & UI State
  const [activeFolder, setActiveFolder] = useState('inbox'); // 'inbox', 'sent', 'compose', 'view'
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data State
  const [messages, setMessages] = useState([]);
  const [viewingMessage, setViewingMessage] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  
  // Compose Form State
  const [formTo, setFormTo] = useState([]);
  const [formCc, setFormCc] = useState([]);
  const [formBcc, setFormBcc] = useState([]); // NEW: Bcc State
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [linkedTask, setLinkedTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Khusus UI Dropdown & Search Modern
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [toSearch, setToSearch] = useState('');
  const [showCcDropdown, setShowCcDropdown] = useState(false);
  const [ccSearch, setCcSearch] = useState('');
  const [showBccDropdown, setShowBccDropdown] = useState(false);
  const [bccSearch, setBccSearch] = useState('');
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('syntegra_user_session'));
    if (!session) { navigate('/login'); return; }
    setUser(session);
    fetchUsers();
    fetchTasks(session.id);
  }, []);

  useEffect(() => {
    if (user) {
      if (activeFolder === 'inbox') fetchInbox();
      else if (activeFolder === 'sent') fetchSent();
    }
  }, [user, activeFolder]);

  // --- FETCH DATA FUNCTIONS ---
  const fetchUsers = async () => {
    const { data } = await supabase.from('initial_users').select('id, name, division, position').order('name');
    if (data) setAllUsers(data);
  };

  const fetchTasks = async (userId) => {
    try {
      const { data, error } = await supabase.from('initial_tasks').select('id, title, status').order('id', { ascending: false });
      if (data) setAvailableTasks(data);
    } catch (e) { console.error('Gagal mengambil data tasks:', e.message); }
  };

  const fetchInbox = async () => {
    setLoading(true);
    try {
      // Pastikan tabel portal_message_recipients memiliki kolom 'is_deleted' (default false)
      const { data, error } = await supabase
        .from('portal_message_recipients')
        .select(`
          id, is_read, recipient_type, is_deleted,
          portal_messages (
            id, sender_id, subject, body, created_at, linked_task_id, linked_task_title, attachment_name, attachment_url,
            initial_users!portal_messages_sender_id_fkey (id, name, division)
          )
        `)
        .eq('recipient_id', user.id)
        .eq('is_deleted', false) // Hindari pesan yang sudah dihapus
        .order('id', { ascending: false });

      if (error) throw error;
      
      const formatted = data.map(item => ({
        recipient_id: item.id,
        is_read: item.is_read,
        recipient_type: item.recipient_type,
        ...item.portal_messages,
        sender_id: item.portal_messages.sender_id, // Penting untuk fungsi Reply
        sender_name: item.portal_messages.initial_users?.name || 'Unknown',
        sender_division: item.portal_messages.initial_users?.division || '-'
      }));
      setMessages(formatted);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_messages')
        .select(`
          id, subject, body, created_at, linked_task_id, linked_task_title, attachment_name, attachment_url, is_deleted,
          portal_message_recipients ( recipient_type, initial_users (name) )
        `)
        .eq('sender_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- ACTIONS ---
  const handleOpenMessage = async (msg) => {
    setViewingMessage(msg);
    setActiveFolder('view');
    
    if (msg.recipient_id && !msg.is_read) {
      await supabase.from('portal_message_recipients').update({ is_read: true, read_at: new Date() }).eq('id', msg.recipient_id);
    }
  };

  // --- FITUR BARU: REPLY & FORWARD ---
  const handleAction = (type) => {
    if (!viewingMessage) return;
    
    const msg = viewingMessage;
    let newSubject = msg.subject;
    let quoteHeader = `\n\n\n--- Pesan Asli ---\nDari: ${msg.sender_name || 'Anda'}\nTanggal: ${formatDate(msg.created_at)}\nSubjek: ${msg.subject}\n\n`;
    let newBody = quoteHeader + msg.body;

    if (type === 'reply') {
      newSubject = newSubject.startsWith('Re:') ? newSubject : `Re: ${newSubject}`;
      // Jika membalas pesan masuk, Set 'TO' ke pengirim aslinya.
      if (activeFolder === 'inbox' && msg.sender_id) setFormTo([msg.sender_id]); 
      setFormCc([]);
      setFormBcc([]);
      setLinkedTask(msg.linked_task_id ? { id: msg.linked_task_id, title: msg.linked_task_title } : null);
    } 
    else if (type === 'forward') {
      newSubject = newSubject.startsWith('Fwd:') ? newSubject : `Fwd: ${newSubject}`;
      setFormTo([]); // Kosongkan penerima untuk diisi user
      setFormCc([]);
      setFormBcc([]);
      // Sertakan task bawaan jika ada
      setLinkedTask(msg.linked_task_id ? { id: msg.linked_task_id, title: msg.linked_task_title } : null);
      // Catatan: Attachment file tidak otomatis terikut di UI frontend tanpa logic re-upload, 
      // jadi user diberi tahu bahwa file harus diupload ulang atau cukup via Task.
    }

    setSubject(newSubject);
    setBody(newBody);
    setActiveFolder('compose');
  };

  // --- FITUR BARU: DELETE PESAN ---
  const handleDelete = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pesan ini?")) return;
    
    try {
      if (activeFolder === 'inbox') {
        // Hapus dari Inbox (Update recipient status)
        await supabase.from('portal_message_recipients').update({ is_deleted: true }).eq('id', viewingMessage.recipient_id);
      } else {
        // Hapus dari Sent items (Update message status)
        await supabase.from('portal_messages').update({ is_deleted: true }).eq('id', viewingMessage.id);
      }
      
      alert("Pesan berhasil dihapus.");
      setActiveFolder(activeFolder === 'inbox' ? 'inbox' : 'sent');
    } catch (err) {
      alert("Gagal menghapus pesan.");
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (formTo.length === 0) return alert("Pilih minimal 1 penerima (TO)!");
    if (!subject) return alert("Subjek tidak boleh kosong!");

    setIsSubmitting(true);
    try {
      let fileUrl = null;
      let fileName = null;

      if (attachment) {
        const ext = attachment.name.split('.').pop();
        fileName = `mail_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('message_attachments').upload(fileName, attachment);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('message_attachments').getPublicUrl(fileName);
        fileUrl = data.publicUrl;
        fileName = attachment.name;
      }

      const { data: msgData, error: msgErr } = await supabase.from('portal_messages').insert([{
        sender_id: user.id,
        subject,
        body,
        linked_task_id: linkedTask?.id || null,
        linked_task_title: linkedTask?.title || null,
        attachment_url: fileUrl,
        attachment_name: fileName
      }]).select().single();

      if (msgErr) throw msgErr;

      const recipientPayloads = [];
      formTo.forEach(id => recipientPayloads.push({ message_id: msgData.id, recipient_id: id, recipient_type: 'TO' }));
      formCc.forEach(id => recipientPayloads.push({ message_id: msgData.id, recipient_id: id, recipient_type: 'CC' }));
      formBcc.forEach(id => recipientPayloads.push({ message_id: msgData.id, recipient_id: id, recipient_type: 'BCC' })); // Tambahan BCC

      const { error: recErr } = await supabase.from('portal_message_recipients').insert(recipientPayloads);
      if (recErr) throw recErr;

      alert("Pesan berhasil dikirim!");
      setFormTo([]); setFormCc([]); setFormBcc([]); setSubject(''); setBody(''); setAttachment(null); setLinkedTask(null);
      setActiveFolder('sent');
    } catch (err) {
      alert("Gagal mengirim pesan: " + err.message);
    } finally { setIsSubmitting(false); }
  };

  // --- UI HELPERS ---
  const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const closeAllDropdowns = () => {
    setShowToDropdown(false);
    setShowCcDropdown(false);
    setShowBccDropdown(false);
    setShowTaskDropdown(false);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR FOLDERS */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-slate-800">
           <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white"><ArrowLeft size={16}/></div>
             <div>
                <h1 className="font-black text-white leading-tight">Syntegra<span className="text-indigo-400">Mail</span></h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Internal Comms</p>
             </div>
           </div>
        </div>
        
        <div className="p-4 flex-1">
          <button onClick={() => { setActiveFolder('compose'); setSubject(''); setBody(''); setFormTo([]); setFormCc([]); setFormBcc([]); }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl mb-6 shadow-md transition-all flex items-center justify-center gap-2">
            <Edit3 size={16} /> Tulis Pesan Baru
          </button>
          
          <div className="space-y-1">
            <button onClick={() => setActiveFolder('inbox')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeFolder === 'inbox' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800'}`}>
              <Inbox size={18} /> Kotak Masuk
            </button>
            <button onClick={() => setActiveFolder('sent')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeFolder === 'sent' ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-slate-800'}`}>
              <Send size={18} /> Pesan Terkirim
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 px-4 py-2 flex justify-around shadow-2xl">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 text-slate-400"><ArrowLeft size={20}/><span className="text-[9px] font-bold uppercase">Kembali</span></button>
        <button onClick={() => setActiveFolder('inbox')} className={`flex flex-col items-center gap-1 ${activeFolder==='inbox'?'text-indigo-400':'text-slate-400'}`}><Inbox size={20}/><span className="text-[9px] font-bold uppercase">Inbox</span></button>
        <button onClick={() => { setActiveFolder('compose'); setSubject(''); setBody(''); }} className="flex flex-col items-center gap-1 text-indigo-400 -mt-4 bg-slate-900 p-2 rounded-full border border-slate-800 shadow-lg"><div className="bg-indigo-600 p-2 rounded-full text-white"><Edit3 size={20}/></div></button>
        <button onClick={() => setActiveFolder('sent')} className={`flex flex-col items-center gap-1 ${activeFolder==='sent'?'text-indigo-400':'text-slate-400'}`}><Send size={20}/><span className="text-[9px] font-bold uppercase">Terkirim</span></button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden pb-16 md:pb-0 relative">
        <header className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
           <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">
             {activeFolder === 'compose' ? 'Tulis Pesan Baru' : activeFolder === 'view' ? 'Baca Pesan' : activeFolder === 'sent' ? 'Pesan Terkirim' : 'Kotak Masuk'}
           </h2>
           {(activeFolder === 'inbox' || activeFolder === 'sent') && (
             <div className="relative w-48 md:w-64">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="Cari pesan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold focus:outline-none focus:border-indigo-500" />
             </div>
           )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 md:p-6 bg-slate-50/50">
          
          {/* VIEW: INBOX & SENT (LIST) */}
          {(activeFolder === 'inbox' || activeFolder === 'sent') && (
            <div className="bg-white md:rounded-3xl md:shadow-sm border-y md:border border-slate-200 overflow-hidden divide-y divide-slate-100">
               {loading ? (
                 <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Memuat pesan...</div>
               ) : messages.length === 0 ? (
                 <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
                   <Inbox size={48} className="mb-4 opacity-50"/>
                   <p className="font-bold">Folder ini masih kosong.</p>
                 </div>
               ) : (
                 messages.filter(m => m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(msg => (
                   <div key={msg.id} onClick={() => handleOpenMessage(msg)} className={`p-4 md:p-5 flex items-start gap-4 cursor-pointer transition-colors ${activeFolder === 'inbox' && !msg.is_read ? 'bg-indigo-50/30 hover:bg-indigo-50/80' : 'hover:bg-slate-50'}`}>
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-black shadow-inner ${activeFolder === 'inbox' && !msg.is_read ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {activeFolder === 'inbox' ? getInitials(msg.sender_name) : 'ME'}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className={`text-sm truncate pr-2 ${activeFolder === 'inbox' && !msg.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                               {activeFolder === 'inbox' ? msg.sender_name : 'Kepada: ' + (msg.portal_message_recipients?.[0]?.initial_users?.name || 'Multiple')}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">{formatDate(msg.created_at)}</span>
                         </div>
                         <h5 className={`text-sm mb-1 truncate ${activeFolder === 'inbox' && !msg.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{msg.subject}</h5>
                         <p className="text-xs text-slate-500 truncate">{msg.body.replace(/\n/g, ' ')}</p>
                         
                         <div className="flex gap-2 mt-2">
                           {msg.linked_task_id && <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200"><LinkIcon size={10}/> Report Terlampir</span>}
                           {msg.attachment_url && <span className="inline-flex items-center gap-1 text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200"><Paperclip size={10}/> File</span>}
                           {activeFolder === 'inbox' && msg.recipient_type === 'CC' && <span className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded">CC</span>}
                           {activeFolder === 'inbox' && msg.recipient_type === 'BCC' && <span className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-800 text-white px-2 py-0.5 rounded">BCC</span>}
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          )}

          {/* VIEW: COMPOSE EMAIL */}
          {activeFolder === 'compose' && (
            <div className="flex-1 flex flex-col h-full bg-white md:bg-transparent animate-fade-in relative">
               {(showToDropdown || showCcDropdown || showBccDropdown || showTaskDropdown) && (
                  <div className="absolute inset-0 z-20" onClick={closeAllDropdowns}></div>
               )}

               <form onSubmit={handleSendEmail} className="flex flex-col h-full w-full max-w-5xl mx-auto md:py-4 md:px-6 relative z-30">
                  <div className="bg-white md:rounded-[2rem] md:shadow-xl md:border border-slate-200 flex flex-col h-full overflow-hidden relative">
                      
                      {/* TO FIELD */}
                      <div className="flex flex-col border-b border-slate-100 px-4 md:px-6 py-3 relative z-[60]">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">Kepada</label>
                          <div className="flex flex-wrap items-center gap-2 min-h-[38px]">
                              {formTo.map(id => {
                                  const u = allUsers.find(user => user.id === id);
                                  if (!u) return null;
                                  return (
                                      <span key={`to-${id}`} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                          {u.name}
                                          <button type="button" onClick={() => setFormTo(formTo.filter(i => i !== id))} className="text-indigo-400 hover:text-indigo-900"><X size={14}/></button>
                                      </span>
                                  );
                              })}
                              <input type="text" value={toSearch} onChange={(e) => { setToSearch(e.target.value); setShowToDropdown(true); }} onFocus={() => { closeAllDropdowns(); setShowToDropdown(true); }} placeholder={formTo.length === 0 ? "Ketik nama penerima..." : ""} className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 min-w-[150px] py-1" />
                          </div>
                          
                          {showToDropdown && (
                              <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-200 shadow-2xl rounded-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                 {allUsers.filter(u => u.id !== user.id && !formTo.includes(u.id) && u.name.toLowerCase().includes(toSearch.toLowerCase())).map(u => (
                                     <div key={`opt-to-${u.id}`} onClick={() => { setFormTo([...formTo, u.id]); setToSearch(''); setShowToDropdown(false); }} className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex flex-col">
                                         <span className="text-sm font-bold text-slate-800">{u.name}</span>
                                         <span className="text-[10px] text-slate-500">{u.division || 'Umum'} • {u.position || 'Staff'}</span>
                                     </div>
                                 ))}
                              </div>
                          )}
                      </div>

                      {/* CC & BCC ROW */}
                      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-100">
                        {/* CC FIELD */}
                        <div className="flex flex-col md:border-r border-b md:border-b-0 border-slate-100 px-4 md:px-6 py-3 relative z-[50]">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">Tembusan (Cc)</label>
                            <div className="flex flex-wrap items-center gap-2 min-h-[38px]">
                                {formCc.map(id => {
                                    const u = allUsers.find(user => user.id === id);
                                    if (!u) return null;
                                    return (
                                        <span key={`cc-${id}`} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                            {u.name}
                                            <button type="button" onClick={() => setFormCc(formCc.filter(i => i !== id))} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                        </span>
                                    );
                                })}
                                <input type="text" value={ccSearch} onChange={(e) => { setCcSearch(e.target.value); setShowCcDropdown(true); }} onFocus={() => { closeAllDropdowns(); setShowCcDropdown(true); }} placeholder="Tembusan..." className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 min-w-[100px] py-1" />
                            </div>
                            {showCcDropdown && (
                                <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-200 shadow-2xl rounded-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                   {allUsers.filter(u => u.id !== user.id && !formTo.includes(u.id) && !formCc.includes(u.id) && u.name.toLowerCase().includes(ccSearch.toLowerCase())).map(u => (
                                       <div key={`opt-cc-${u.id}`} onClick={() => { setFormCc([...formCc, u.id]); setCcSearch(''); setShowCcDropdown(false); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                                           <span className="text-sm font-bold text-slate-800">{u.name}</span>
                                       </div>
                                   ))}
                                </div>
                            )}
                        </div>

                        {/* BCC FIELD */}
                        <div className="flex flex-col px-4 md:px-6 py-3 relative z-[45]">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">Rahasia (Bcc)</label>
                            <div className="flex flex-wrap items-center gap-2 min-h-[38px]">
                                {formBcc.map(id => {
                                    const u = allUsers.find(user => user.id === id);
                                    if (!u) return null;
                                    return (
                                        <span key={`bcc-${id}`} className="flex items-center gap-1.5 bg-slate-800 text-slate-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                            {u.name}
                                            <button type="button" onClick={() => setFormBcc(formBcc.filter(i => i !== id))} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                        </span>
                                    );
                                })}
                                <input type="text" value={bccSearch} onChange={(e) => { setBccSearch(e.target.value); setShowBccDropdown(true); }} onFocus={() => { closeAllDropdowns(); setShowBccDropdown(true); }} placeholder="Bcc..." className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 min-w-[100px] py-1" />
                            </div>
                            {showBccDropdown && (
                                <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-200 shadow-2xl rounded-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                   {allUsers.filter(u => u.id !== user.id && !formTo.includes(u.id) && !formCc.includes(u.id) && !formBcc.includes(u.id) && u.name.toLowerCase().includes(bccSearch.toLowerCase())).map(u => (
                                       <div key={`opt-bcc-${u.id}`} onClick={() => { setFormBcc([...formBcc, u.id]); setBccSearch(''); setShowBccDropdown(false); }} className="px-4 py-3 hover:bg-slate-800 hover:text-white cursor-pointer border-b border-slate-50">
                                           <span className="text-sm font-bold">{u.name}</span>
                                       </div>
                                   ))}
                                </div>
                            )}
                        </div>
                      </div>

                      {/* SUBJECT */}
                      <div className="flex items-center border-b border-slate-100 px-4 md:px-6 py-4 bg-white shrink-0 z-30 relative">
                          <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} onFocus={closeAllDropdowns} placeholder="Subjek Pesan..." className="w-full bg-transparent text-lg md:text-xl font-black text-slate-800 placeholder-slate-300 focus:outline-none" />
                      </div>

                      {/* BODY */}
                      <div className="flex-1 bg-white relative z-20">
                          <textarea required value={body} onChange={e => setBody(e.target.value)} onFocus={closeAllDropdowns} placeholder="Ketikkan pesan, instruksi, atau laporan Anda di sini..." className="absolute inset-0 w-full h-full resize-none outline-none text-sm md:text-base leading-relaxed text-slate-700 placeholder-slate-300 custom-scrollbar p-4 md:p-6"></textarea>
                      </div>

                      {/* FOOTER ACTIONS */}
                      <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 z-40 shrink-0 relative">
                          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                              
                              {/* Linked Task Preview */}
                              {linkedTask ? (
                                 <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center justify-between gap-4 shadow-sm w-full md:w-auto">
                                    <div className="flex items-center gap-3 text-emerald-800 overflow-hidden">
                                       <div className="bg-emerald-200 p-1.5 rounded-lg shrink-0"><LinkIcon size={14}/></div>
                                       <div className="truncate">
                                          <p className="text-[9px] font-black uppercase tracking-wider">Laporan/Task Terlampir</p>
                                          <p className="text-xs font-bold truncate">{linkedTask.title}</p>
                                       </div>
                                    </div>
                                    <button type="button" onClick={() => setLinkedTask(null)} className="text-emerald-500 hover:bg-emerald-200 p-1 rounded-full shrink-0"><X size={14}/></button>
                                 </div>
                              ) : (
                                 <div className="relative w-full md:w-auto">
                                    <button type="button" onClick={() => { setShowTaskDropdown(!showTaskDropdown); setShowToDropdown(false); setShowCcDropdown(false); setShowBccDropdown(false); }} className="w-full flex justify-center items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-sm">
                                      <LinkIcon size={14} className="text-emerald-500" /> Tautkan Task
                                    </button>
                                    
                                    {showTaskDropdown && (
                                        <div className="absolute left-0 bottom-full mb-2 w-full md:w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 flex flex-col">
                                           <div className="px-2 pb-2 mb-2 border-b border-slate-100">
                                              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                                 <Search size={12} className="text-slate-400 mr-2 shrink-0"/>
                                                 <input type="text" autoFocus value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Cari task lama / baru..." className="bg-transparent border-none outline-none text-xs w-full font-bold"/>
                                              </div>
                                           </div>
                                           <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                               {availableTasks.filter(t => (t.title || '').toLowerCase().includes((taskSearch || '').toLowerCase())).map(t => (
                                                   <div key={`task-${t.id}`} onClick={() => { setLinkedTask(t); setShowTaskDropdown(false); setTaskSearch(''); }} className="p-3 hover:bg-emerald-50 rounded-xl cursor-pointer transition text-xs border-b border-slate-50 last:border-0 flex items-center gap-3">
                                                      <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-md shrink-0"><FileText size={14}/></div>
                                                      <div className="overflow-hidden">
                                                        <p className="font-bold text-slate-800 truncate">{t.title}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{t.status}</p>
                                                      </div>
                                                   </div>
                                               ))}
                                           </div>
                                        </div>
                                    )}
                                 </div>
                              )}

                              <label className="w-full md:w-auto flex justify-center items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 transition shadow-sm truncate max-w-[250px]">
                                 <Paperclip size={14} className="text-blue-500 shrink-0" /> 
                                 <span className="truncate">{attachment ? attachment.name : 'Lampirkan File'}</span>
                                 <input type="file" className="hidden" onChange={e => { setAttachment(e.target.files[0]); closeAllDropdowns(); }} />
                              </label>
                          </div>

                          <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
                            <Send size={16} /> {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
                          </button>
                      </div>
                  </div>
               </form>
            </div>
          )}

          {/* VIEW: READ MESSAGE */}
          {activeFolder === 'view' && viewingMessage && (
            <div className="max-w-4xl mx-auto bg-white md:rounded-[2rem] md:shadow-lg border-y md:border border-slate-200 overflow-hidden flex flex-col h-full md:h-auto">
               
               {/* Read Header */}
               <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-4">
                      <button onClick={() => setActiveFolder(activeFolder === 'sent' ? 'sent' : 'inbox')} className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline"><ArrowLeft size={14}/> Kembali ke Daftar</button>
                      
                      {/* ACTION BUTTONS (REPLY, FORWARD, DELETE) */}
                      <div className="flex gap-2">
                         <button onClick={() => handleAction('reply')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition">
                           <Reply size={14} /> Balas
                         </button>
                         <button onClick={() => handleAction('forward')} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition">
                           <Forward size={14} /> Teruskan
                         </button>
                         <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition">
                           <Trash2 size={14} /> Hapus
                         </button>
                      </div>
                  </div>
                  
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">{viewingMessage.subject}</h2>
                  
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-lg">
                           {getInitials(viewingMessage.sender_name)}
                        </div>
                        <div>
                           <p className="font-bold text-sm text-slate-800">{viewingMessage.sender_name} <span className="text-[10px] text-slate-400 font-normal ml-1">({viewingMessage.sender_division})</span></p>
                           <p className="text-[10px] text-slate-500">Kepada: Anda {viewingMessage.recipient_type ? `(${viewingMessage.recipient_type})` : ''}</p>
                        </div>
                     </div>
                     <span className="text-xs font-bold text-slate-400">{formatDate(viewingMessage.created_at)}</span>
                  </div>
               </div>

               {/* Read Body */}
               <div className="p-6 md:p-8 flex-1 bg-white overflow-y-auto">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{viewingMessage.body}</p>
               </div>

               {/* Read Footer (Attachments & Linked Task) */}
               {(viewingMessage.attachment_url || viewingMessage.linked_task_id) && (
                 <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {viewingMessage.linked_task_id && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><LinkIcon size={12}/> Referensi Laporan Task</p>
                        <div onClick={() => navigate(`/TaskManagement?taskId=${viewingMessage.linked_task_id}`)} className="bg-white border border-emerald-200 hover:border-emerald-500 hover:shadow-md cursor-pointer p-4 rounded-xl transition-all group flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg group-hover:scale-110 transition-transform"><FileText size={18}/></div>
                             <div>
                                <p className="font-bold text-slate-800 text-sm">{viewingMessage.linked_task_title || `Tugas #${viewingMessage.linked_task_id}`}</p>
                                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Klik untuk melihat detail lengkap &rarr;</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    )}

                    {viewingMessage.attachment_url && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Paperclip size={12}/> Lampiran File</p>
                        <a href={viewingMessage.attachment_url} target="_blank" rel="noreferrer" className="bg-white border border-blue-200 hover:border-blue-500 hover:shadow-md p-4 rounded-xl transition-all group flex justify-between items-center block">
                           <div className="flex items-center gap-3">
                             <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform"><Paperclip size={18}/></div>
                             <div className="truncate pr-4">
                                <p className="font-bold text-slate-800 text-sm truncate">{viewingMessage.attachment_name || 'Dokumen Terlampir'}</p>
                                <p className="text-[10px] text-blue-600 font-bold mt-0.5">Klik untuk mengunduh / melihat file</p>
                             </div>
                           </div>
                        </a>
                      </div>
                    )}
                 </div>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Communication;