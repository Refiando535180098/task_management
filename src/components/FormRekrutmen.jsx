import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; 
import { Briefcase, User, GraduationCap, Activity, Award, ShieldAlert, HelpCircle, FileUp, Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';

const FormRekrutmen = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    bidang_jasa: 'Security (Satpam)', posisi_jabatan: '', alamat_domisili: '', nama_lengkap: '', nik_ktp: '', kewarganegaraan: 'WNI', jenis_kelamin: 'Laki-laki', 
    tempat_lahir: '', tanggal_lahir: '', agama: 'Islam', status_pernikahan: 'TK/0', golongan_darah: '-', no_hp: '', alamat_lengkap: '',
    nama_pasangan: '', pasangan_ttl: '', pasangan_pekerjaan: '', detail_anak: '',
    kontak_darurat_nama: '', kontak_darurat_hub: '', kontak_darurat_telp: '',
    tinggi_badan: '', berat_badan: '', ukuran_baju: 'M', ukuran_celana: '', ukuran_sepatu: '',
    bertato: 'Tidak', berkacamata: 'Tidak', riwayat_operasi: 'Tidak', detail_operasi: '',
    patah_tulang: 'Tidak', sakit_serius: 'Tidak', detail_sakit: '',
    bahasa_indonesia: 'Baik', bahasa_inggris: 'Cukup',
    riwayat_kerja: '', gaji_terakhir: '', alasan_keluar: '', gaji_diharapkan: '', 
    bisa_berenang: 'Tidak', bisa_beladiri: 'Tidak', detail_beladiri: '',
    takut_tinggi: 'Tidak', detail_takut_tinggi: '', keterampilan_lain: '',
    info_lowongan: 'Iklan', kenalan_syntegra: 'Tidak', detail_kenalan: ''
  });

  const [pendidikanList, setPendidikanList] = useState([{ tingkat: 'SMA/SMK', institusi: '', jurusan: '', tahun_lulus: '', kota: '' }]);
  const [pelatihanList, setPelatihanList] = useState([{ jenis_sertifikasi: 'Gada Pratama', institusi: '', tahun: '', tingkat: '' }]);
  const [files, setFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [masterPositions, setMasterPositions] = useState([]);
  const [masterDivisions, setMasterDivisions] = useState([]);

  React.useEffect(() => {
    const fetchMasterData = async () => {
      const [posRes, usersRes] = await Promise.all([
        supabase.from('master_positions').select('*').order('name', { ascending: true }),
        supabase.from('initial_users').select('division')
      ]);

      if (!posRes.error && posRes.data) {
        setMasterPositions(posRes.data);
        if(posRes.data.length > 0) {
          setFormData(prev => ({...prev, posisi_jabatan: posRes.data[0].name}));
        }
      }

      const defaultDivisions = ["Security (Satpam)", "Cleaning Service", "Parking Service", "Labour Supply (Tenaga Kerja)"];
      let uniqueDivisions = defaultDivisions;

      if (!usersRes.error && usersRes.data) {
        const tmDivisions = usersRes.data.map(u => u.division).filter(Boolean);
        uniqueDivisions = [...new Set([...defaultDivisions, ...tmDivisions])].sort();
      }
      
      setMasterDivisions(uniqueDivisions);
      setFormData(prev => ({...prev, bidang_jasa: uniqueDivisions.includes(prev.bidang_jasa) ? prev.bidang_jasa : uniqueDivisions[0]}));
    };
    
    fetchMasterData();
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validasi ukuran maksimal 2MB (2 * 1024 * 1024 bytes)
      if (file.size > 2097152) {
        alert(`Gagal! Ukuran file ${file.name} terlalu besar. Maksimal 2MB per file.`);
        e.target.value = null; // Kosongkan input agar user memilih ulang
        return;
      }
      setFiles({ ...files, [e.target.name]: file });
    }
  };

  const handlePendidikanChange = (index, field, value) => { const newList = [...pendidikanList]; newList[index][field] = value; setPendidikanList(newList); };
  const addPendidikan = () => setPendidikanList([...pendidikanList, { tingkat: 'S1', institusi: '', jurusan: '', tahun_lulus: '', kota: '' }]);
  const removePendidikan = (index) => setPendidikanList(pendidikanList.filter((_, i) => i !== index));

  const handlePelatihanChange = (index, field, value) => { const newList = [...pelatihanList]; newList[index][field] = value; setPelatihanList(newList); };
  const addPelatihan = () => setPelatihanList([...pelatihanList, { jenis_sertifikasi: '', institusi: '', tahun: '', tingkat: '' }]);
  const removePelatihan = (index) => setPelatihanList(pelatihanList.filter((_, i) => i !== index));

  const uploadFile = async (file, pathName) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathName}_${formData.nik_ktp}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('dokumen').upload(fileName, file);
    if (error) { console.error(`Gagal upload ${pathName}:`, error.message); throw error; }
    const { data: publicUrlData } = supabase.storage.from('dokumen').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Variabel penampung URL sementara
    let uploadedUrls = {};

    // ==========================================
    // TAHAP 1: PROSES UPLOAD DOKUMEN KE STORAGE
    // ==========================================
    try {
      const [ktpUrl, kkUrl, fotoUrl, ijazahUrl, rekUrl] = await Promise.all([
        uploadFile(files.file_ktp, 'KTP'), uploadFile(files.file_kk, 'KK'),
        uploadFile(files.file_pas_foto, 'FOTO'), uploadFile(files.file_ijazah, 'IJAZAH'),
        uploadFile(files.file_rek, 'REK')
      ]);

      const [skckUrl, suratSehatUrl, vaksinUrl, cvUrl, npwpUrl] = await Promise.all([
        uploadFile(files.file_skck, 'SKCK'), uploadFile(files.file_surat_sehat, 'SEHAT'),
        uploadFile(files.file_vaksin, 'VAKSIN'), uploadFile(files.file_cv, 'CV'),
        uploadFile(files.file_npwp, 'NPWP')
      ]);

      const [bjsTkUrl, bjsKesUrl, simUrl, sertifikatUrl, refKerjaUrl] = await Promise.all([
        uploadFile(files.file_bpjs_tk, 'BPJS_TK'), uploadFile(files.file_bpjs_kes, 'BPJS_KES'),
        uploadFile(files.file_sim, 'SIM'), uploadFile(files.file_sertifikat, 'SERTIFIKAT'),
        uploadFile(files.file_referensi_kerja, 'REF_KERJA')
      ]);

      // Simpan URL ke variabel penampung
      uploadedUrls = { 
        ktpUrl, kkUrl, fotoUrl, ijazahUrl, rekUrl, 
        skckUrl, suratSehatUrl, vaksinUrl, cvUrl, npwpUrl, 
        bjsTkUrl, bjsKesUrl, simUrl, sertifikatUrl, refKerjaUrl 
      };

    } catch (error) {
      // JIKA MUNCUL ERROR INI: Berarti internet putus, di-blokir AdBlocker HP, atau nama Bucket salah.
      alert("❌ GAGAL UPLOAD FILE: Koneksi terputus (Failed to fetch). Matikan penghemat data / DNS AdBlocker di HP, lalu coba lagi.");
      setIsSubmitting(false);
      return; // Berhenti di sini, jangan lanjut simpan database
    }

    // ==========================================
    // TAHAP 2: SIMPAN TEKS KE TABEL DATABASE
    // ==========================================
    try {
      const payload = {
        ...formData, 
        tinggi_badan: parseInt(formData.tinggi_badan), 
        berat_badan: parseInt(formData.berat_badan),
        berkas_ktp_url: uploadedUrls.ktpUrl, berkas_kk_url: uploadedUrls.kkUrl, berkas_buku_rek_url: uploadedUrls.rekUrl, 
        berkas_skck_url: uploadedUrls.skckUrl, berkas_surat_sehat_url: uploadedUrls.suratSehatUrl, berkas_npwp_url: uploadedUrls.npwpUrl, 
        berkas_bpjs_tk_url: uploadedUrls.bjsTkUrl, berkas_bpjs_kes_url: uploadedUrls.bjsKesUrl, berkas_sim_url: uploadedUrls.simUrl,
        berkas_ijazah_url: uploadedUrls.ijazahUrl, berkas_pas_foto_url: uploadedUrls.fotoUrl, berkas_cv_url: uploadedUrls.cvUrl, 
        berkas_sertifikat_url: uploadedUrls.sertifikatUrl, berkas_referensi_kerja_url: uploadedUrls.refKerjaUrl, berkas_vaksin_url: uploadedUrls.vaksinUrl,
        riwayat_pendidikan: JSON.stringify(pendidikanList), riwayat_pelatihan: JSON.stringify(pelatihanList), 
        status: 'PENDING'
      };

      const { error } = await supabase.from('candidates').insert([payload]);
      
      if (error) {
         // JIKA MUNCUL ERROR INI: Berarti RLS (Security) tabel 'candidates' belum dibuka untuk Insert Publik.
         alert("❌ GAGAL SIMPAN DATABASE: " + error.message);
         setIsSubmitting(false);
         return;
      }
      
      alert("✅ Lamaran berhasil dikirim dan tersimpan di sistem!");
      window.location.reload();

    } catch (error) {
      alert("Terjadi kesalahan sistem yang tidak diketahui: " + error.message);
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 block p-3 transition-all outline-none";
  const labelClass = "block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto">
        
        <div className="bg-yellow-400 rounded-[2rem] p-8 md:p-10 text-white shadow-xl shadow-yellow-600/20 mb-8 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white opacity-10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-white opacity-10 blur-3xl rounded-full"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <img className="bottom-[-20%] left-[-10%] w-36 h-36" src="./Logo_apps.png" alt="" />
            <div>
              <div className="inline-block px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black tracking-widest uppercase mb-3 border border-yellow-400">Portal Karir Resmi</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Formulir Pendaftaran</h1>
              <p className="text-yellow-100 text-sm md:text-base max-w-lg">Silakan isi data diri Anda dengan lengkap dan sebenar-benarnya untuk proses seleksi calon karyawan.</p>
            </div>
            <button onClick={() => navigate('/cek-status')} className="bg-white text-yellow-600 hover:bg-yellow-50 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0">
              Cek Status Lamaran <ArrowRight size={16}/>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-yellow-100 text-yellow-600 p-2.5 rounded-xl"><Briefcase size={20}/></div>
              <h2 className="font-black text-lg text-slate-800">1. Posisi & Domisili</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Bidang Jasa (Divisi)</label>
                <select name="bidang_jasa" value={formData.bidang_jasa} onChange={handleInputChange} className={inputClass} required>
                  <option value="" disabled>-- Pilih Divisi --</option>
                  {masterDivisions.map((div, index) => (
                    <option key={index} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Posisi Jabatan Dilamar</label>
                  <select name="posisi_jabatan" value={formData.posisi_jabatan} onChange={handleInputChange} required className={inputClass}>
                    <option value="" disabled>-- Pilih Posisi --</option>
                  {masterPositions.map(pos => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Alamat Lengkap Domisili</label>
                <textarea name="alamat_domisili" placeholder="Sebutkan alamat tinggal saat ini..." onChange={handleInputChange} required className={inputClass} rows="2"></textarea>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl"><User size={20}/></div>
              <h2 className="font-black text-lg text-slate-800">2. Data Diri Pribadi</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div><label className={labelClass}>Nama Lengkap (Sesuai KTP)</label><input type="text" name="nama_lengkap" placeholder="Masukkan nama..." onChange={handleInputChange} required className={inputClass} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className={labelClass}>NIK KTP</label><input type="number" name="nik_ktp" placeholder="16 Digit NIK" onChange={handleInputChange} required className={inputClass} /></div>
                <div><label className={labelClass}>Warga Negara</label><input type="text" name="kewarganegaraan" value={formData.kewarganegaraan} onChange={handleInputChange} required className={inputClass} /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Tempat Lahir</label><input type="text" name="tempat_lahir" placeholder="Kota lahir" onChange={handleInputChange} required className={inputClass} /></div>
                <div><label className={labelClass}>Tanggal Lahir</label><input type="date" name="tanggal_lahir" onChange={handleInputChange} required className={inputClass} /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Jenis Kelamin</label><select name="jenis_kelamin" onChange={handleInputChange} className={inputClass}><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
                <div><label className={labelClass}>Golongan Darah</label><select name="golongan_darah" onChange={handleInputChange} className={inputClass}><option value="-">Tidak Tahu (-)</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option></select></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Agama</label><select name="agama" onChange={handleInputChange} className={inputClass}><option value="Islam">Islam</option><option value="Kristen">Kristen</option><option value="Katolik">Katolik</option><option value="Hindu">Hindu</option><option value="Buddha">Buddha</option><option value="Konghucu">Konghucu</option></select></div>
                <div>
                  <label className={labelClass}>Status Pernikahan (PTKP)</label>
                  <select name="status_pernikahan" onChange={handleInputChange} className={`${inputClass} font-bold text-yellow-700 bg-yellow-50 border-yellow-200`}>
                    <optgroup label="Tidak Kawin (TK)"><option value="TK/0">TK/0 (0 Tanggungan)</option><option value="TK/1">TK/1 (1 Tanggungan)</option><option value="TK/2">TK/2 (2 Tanggungan)</option><option value="TK/3">TK/3 (3 Tanggungan)</option></optgroup>
                    <optgroup label="Kawin (K)"><option value="K/0">K/0 (0 Tanggungan)</option><option value="K/1">K/1 (1 Tanggungan)</option><option value="K/2">K/2 (2 Tanggungan)</option><option value="K/3">K/3 (3 Tanggungan)</option></optgroup>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div><label className={labelClass}>WhatsApp Aktif</label><input type="number" name="no_hp" placeholder="Contoh: 0812..." onChange={handleInputChange} required className={inputClass} /></div>
                 <div><label className={labelClass}>Telp Alternatif</label><input type="number" name="no_telp" placeholder="Opsional" onChange={handleInputChange} className={inputClass} /></div>
              </div>
            </div>

            <div className="mb-6">
               <label className={labelClass}>Alamat Sesuai KTP</label>
               <textarea name="alamat_lengkap" placeholder="Ketik alamat lengkap sesuai kartu identitas..." onChange={handleInputChange} required className={inputClass} rows="2"></textarea>
            </div>

            {formData.status_pernikahan !== 'TK/0' && (
              <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl">
                <h3 className="text-sm font-black text-indigo-800 mb-4 border-b border-indigo-100 pb-2">Informasi Tanggungan Keluarga</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.status_pernikahan.startsWith('K/') && (
                    <>
                      <div><label className={labelClass}>Nama Suami/Istri</label><input type="text" name="nama_pasangan" onChange={handleInputChange} className={inputClass} /></div>
                      <div><label className={labelClass}>TTL Suami/Istri</label><input type="text" name="pasangan_ttl" onChange={handleInputChange} className={inputClass} /></div>
                      <div><label className={labelClass}>Pekerjaan Suami/Istri</label><input type="text" name="pasangan_pekerjaan" onChange={handleInputChange} className={inputClass} /></div>
                    </>
                  )}
                  {(!formData.status_pernikahan.endsWith('/0') || formData.status_pernikahan.startsWith('K/')) && (
                    <div className="md:col-span-3">
                      <label className={labelClass}>Data Anak / Tanggungan</label>
                      <textarea name="detail_anak" placeholder="Format: Nama Lengkap - Hubungan (Anak/OrangTua) - TTL. Pisahkan dengan enter jika lebih dari satu." onChange={handleInputChange} className={inputClass} rows="2"></textarea>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl"><GraduationCap size={20}/></div>
                <h2 className="font-black text-lg text-slate-800">3. Pendidikan Formal</h2>
              </div>
              <button type="button" onClick={addPendidikan} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"><Plus size={14}/> Tambah Pendidikan</button>
            </div>
            
            <div className="space-y-4">
              {pendidikanList.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  {pendidikanList.length > 1 && (
                    <button type="button" onClick={() => removePendidikan(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  )}
                  <div className="md:col-span-2"><label className={labelClass}>Tingkat</label><select value={item.tingkat} onChange={(e) => handlePendidikanChange(index, 'tingkat', e.target.value)} className={inputClass}><option value="SMA/SMK">SMA/SMK</option><option value="D3">D3</option><option value="S1">S1</option></select></div>
                  <div className="md:col-span-4"><label className={labelClass}>Nama Institusi</label><input type="text" value={item.institusi} onChange={(e) => handlePendidikanChange(index, 'institusi', e.target.value)} required className={inputClass} /></div>
                  <div className="md:col-span-3"><label className={labelClass}>Jurusan</label><input type="text" value={item.jurusan} onChange={(e) => handlePendidikanChange(index, 'jurusan', e.target.value)} className={inputClass} /></div>
                  <div className="md:col-span-1"><label className={labelClass}>Tahun</label><input type="number" value={item.tahun_lulus} onChange={(e) => handlePendidikanChange(index, 'tahun_lulus', e.target.value)} required className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Kota</label><input type="text" value={item.kota} onChange={(e) => handlePendidikanChange(index, 'kota', e.target.value)} required className={inputClass} /></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
               <div><label className={labelClass}>Penguasaan Bhs. Indonesia</label><select name="bahasa_indonesia" onChange={handleInputChange} className={inputClass}><option value="Baik">Baik</option><option value="Cukup">Cukup</option><option value="Kurang">Kurang</option></select></div>
               <div><label className={labelClass}>Penguasaan Bhs. Inggris</label><select name="bahasa_inggris" onChange={handleInputChange} className={inputClass}><option value="Baik">Baik</option><option value="Cukup">Cukup</option><option value="Kurang">Kurang</option></select></div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl"><Activity size={20}/></div>
              <h2 className="font-black text-lg text-slate-800">4. Kuesioner Fisik & Medis</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              <div><label className={labelClass}>Tinggi (cm)</label><input type="number" name="tinggi_badan" onChange={handleInputChange} required className={inputClass} /></div>
              <div><label className={labelClass}>Berat (kg)</label><input type="number" name="berat_badan" onChange={handleInputChange} required className={inputClass} /></div>
              <div><label className={labelClass}>Uk. Baju</label><select name="ukuran_baju" onChange={handleInputChange} className={inputClass}><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option></select></div>
              <div><label className={labelClass}>Uk. Celana</label><input type="number" placeholder="28-44" name="ukuran_celana" onChange={handleInputChange} required className={inputClass} /></div>
              <div className="col-span-2 sm:col-span-1 md:col-span-1"><label className={labelClass}>Uk. Sepatu</label><input type="number" placeholder="38-45" name="ukuran_sepatu" onChange={handleInputChange} required className={inputClass} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
               <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-sm font-bold text-slate-700">Apakah Punya Tato?</span>
                 <select name="bertato" onChange={handleInputChange} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-1.5 focus:ring-rose-500 font-bold"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select>
               </div>
               <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-sm font-bold text-slate-700">Memakai Kacamata?</span>
                 <select name="berkacamata" onChange={handleInputChange} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-1.5 focus:ring-rose-500 font-bold"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select>
               </div>
               <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                 <span className="text-sm font-bold text-slate-700">Pernah Patah Tulang?</span>
                 <select name="patah_tulang" onChange={handleInputChange} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-1.5 focus:ring-rose-500 font-bold"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select>
               </div>
               
               <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-bold text-slate-700">Pernah Dioperasi?</span>
                   <select name="riwayat_operasi" onChange={handleInputChange} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-1.5 focus:ring-rose-500 font-bold"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select>
                 </div>
                 {formData.riwayat_operasi === 'Ya' && <input type="text" name="detail_operasi" placeholder="Jelaskan operasi apa & kapan..." onChange={handleInputChange} className="mt-3 bg-rose-50 border-rose-200 rounded-lg p-2 text-xs text-rose-700" />}
               </div>

               <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-bold text-slate-700">Punya sakit serius 1 thn terakhir?</span>
                   <select name="sakit_serius" onChange={handleInputChange} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-1.5 focus:ring-rose-500 font-bold"><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select>
                 </div>
                 {formData.sakit_serius === 'Ya' && <input type="text" name="detail_sakit" placeholder="Jelaskan sakit apa..." onChange={handleInputChange} className="mt-3 bg-rose-50 border-rose-200 rounded-lg p-2 text-xs text-rose-700" />}
               </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl"><Award size={20}/></div>
                <h2 className="font-black text-lg text-slate-800">5. Sertifikasi & Riwayat Pekerjaan</h2>
              </div>
              <button type="button" onClick={addPelatihan} className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"><Plus size={14}/> Tambah Sertifikasi</button>
            </div>

            <div className="space-y-4 mb-8">
              {pelatihanList.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  {pelatihanList.length > 1 && (
                    <button type="button" onClick={() => removePelatihan(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  )}
                  <div className="md:col-span-4"><label className={labelClass}>Jenis Sertifikasi</label><input type="text" placeholder="Misal: Gada Pratama" value={item.jenis_sertifikasi} onChange={(e) => handlePelatihanChange(index, 'jenis_sertifikasi', e.target.value)} className={inputClass} /></div>
                  <div className="md:col-span-4"><label className={labelClass}>Penyelenggara</label><input type="text" placeholder="Misal: Polda Metro Jaya" value={item.institusi} onChange={(e) => handlePelatihanChange(index, 'institusi', e.target.value)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Tahun</label><input type="number" value={item.tahun} onChange={(e) => handlePelatihanChange(index, 'tahun', e.target.value)} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Tingkat</label><input type="text" placeholder="Dasar/Madya" value={item.tingkat} onChange={(e) => handlePelatihanChange(index, 'tingkat', e.target.value)} className={inputClass} /></div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Bisa Berenang?</label>
                  <select name="bisa_berenang" onChange={handleInputChange} className={inputClass}>
                    <option value="Tidak">Tidak</option><option value="Ya">Ya</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Bisa Beladiri?</label>
                  <select name="bisa_beladiri" onChange={handleInputChange} className={inputClass}>
                    <option value="Tidak">Tidak</option><option value="Ya">Ya</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <div><label className={labelClass}>Detail Beladiri</label><input type="text" name="detail_beladiri" placeholder="Misal: Karate Sabuk Hitam" onChange={handleInputChange} className={inputClass} /></div>
                <div><label className={labelClass}>Keahlian Lainnya</label><input type="text" name="keterampilan_lain" placeholder="Misal: Mengemudi, Komputer" onChange={handleInputChange} className={inputClass} /></div>
              </div>

             {/* RIWAYAT PEKERJAAN SEBELUMNYA & SKILL TAMBAHAN */}
            <div className="mt-4 pt-6 border-t border-slate-100">
              
              {/* Kotak Khusus Riwayat Pekerjaan */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 mb-6">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4 border-b border-slate-200 pb-3">Riwayat Pekerjaan Sebelumnya</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Deskripsi Riwayat Pekerjaan</label>
                    <textarea name="riwayat_kerja" placeholder="Tuliskan pengalaman kerja Anda (Contoh: PT. ABC, Security, 2 Tahun)" onChange={handleInputChange} rows="3" className={`${inputClass} bg-white`}></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelClass}>Gaji Terakhir</label><input type="text" name="gaji_terakhir" placeholder="Rp" onChange={handleInputChange} className={`${inputClass} bg-white`} /></div>
                    <div><label className={labelClass}>Gaji Diharapkan</label><input type="text" name="gaji_diharapkan" placeholder="Rp" onChange={handleInputChange} className={`${inputClass} bg-white`} /></div>
                  </div>
                  <div><label className={labelClass}>Alasan Keluar</label><input type="text" name="alasan_keluar" placeholder="Alasan resign dari tempat sebelumnya" onChange={handleInputChange} className={`${inputClass} bg-white`} /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-red-50/50 rounded-[2rem] p-6 md:p-8 shadow-sm border border-red-100">
              <div className="flex items-center gap-3 mb-6 border-b border-red-100 pb-4">
                <div className="bg-red-100 text-red-600 p-2.5 rounded-xl"><ShieldAlert size={20}/></div>
                <h2 className="font-black text-lg text-red-900">6. Kontak Darurat</h2>
              </div>
              <div className="space-y-4">
                <div><label className={`${labelClass} !text-red-700`}>Nama Kontak</label><input type="text" name="kontak_darurat_nama" placeholder="Keluarga yang tidak serumah" onChange={handleInputChange} required className={`${inputClass} border-red-200 focus:ring-red-500/20`} /></div>
                <div><label className={`${labelClass} !text-red-700`}>Hubungan</label><input type="text" name="kontak_darurat_hub" placeholder="Misal: Kakak / Ayah" onChange={handleInputChange} required className={`${inputClass} border-red-200 focus:ring-red-500/20`} /></div>
                <div><label className={`${labelClass} !text-red-700`}>No. Telepon / WA</label><input type="number" name="kontak_darurat_telp" onChange={handleInputChange} required className={`${inputClass} border-red-200 focus:ring-red-500/20`} /></div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="bg-purple-100 text-purple-600 p-2.5 rounded-xl"><HelpCircle size={20}/></div>
                <h2 className="font-black text-lg text-slate-800">7. Info Tambahan</h2>
              </div>
              <div className="space-y-5">
                 <div>
                   <label className={labelClass}>Sumber Informasi Lowongan</label>
                   <select name="info_lowongan" onChange={handleInputChange} className={inputClass}>
                      <option value="Iklan">Iklan / Media Sosial</option><option value="Teman">Teman</option><option value="Keluarga">Keluarga</option><option value="Teman Kerja">Teman Kerja</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className={labelClass}>Referensi Dari (Opsional)</label>
                   <input type="text" name="referensi_dari" placeholder="Misal: BLK Ciledug, Pak Supri, dll..." onChange={handleInputChange} className={inputClass} />
                 </div>

                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <label className={labelClass}>Ada Kenalan Internal Perusahaan?</label>
                   <select name="kenalan_syntegra" onChange={handleInputChange} className={`${inputClass} mb-3 font-bold`}><option value="Tidak">Tidak Ada</option><option value="Ya">Ya, Ada</option></select>
                   {formData.kenalan_syntegra === 'Ya' && (
                     <input type="text" name="detail_kenalan" placeholder="Sebutkan Nama & Jabatan kenalan Anda" onChange={handleInputChange} className={inputClass} />
                   )}
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-yellow-100 text-yellow-600 p-2.5 rounded-xl"><FileUp size={20}/></div>
              <div>
                <h2 className="font-black text-lg text-slate-800">8. Unggah Dokumen Berkas</h2>
                <p className="text-xs text-slate-500 font-medium">Format: JPG, PNG, atau PDF (Max 2MB per file)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Pas Foto Berwarna", name: "file_pas_foto", req: true }, { label: "KTP Asli", name: "file_ktp", req: true },
                { label: "Kartu Keluarga", name: "file_kk", req: true }, { label: "Ijazah Terakhir", name: "file_ijazah", req: true },
                { label: "Buku Rekening", name: "file_rek", req: true }, { label: "SKCK Aktif", name: "file_skck", req: true },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl hover:border-yellow-300 transition-colors">
                  <label className="block text-xs font-bold text-slate-700 mb-2 truncate">
                    {item.label} {item.req && <span className="text-red-500">*</span>}
                  </label>
                  <input type="file" name={item.name} onChange={handleFileChange} required={item.req} 
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200 cursor-pointer" 
                  />
                </div>
              ))}

              {[
                { label: "Surat Sehat", name: "file_surat_sehat", req: true }, { label: "Sertifikat Vaksin", name: "file_vaksin", req: true },
                { label: "Surat Referensi Kerja", name: "file_referensi_kerja" }, { label: "CV / Surat Lamaran", name: "file_cv" },
                { label: "Sertifikat Gada/Lainnya", name: "file_sertifikat" }, { label: "NPWP", name: "file_npwp" },
                { label: "BPJS Ketenagakerjaan", name: "file_bpjs_tk" }, { label: "BPJS Kesehatan", name: "file_bpjs_kes" }, { label: "SIM (A/C)", name: "file_sim" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50/50 border border-slate-200 border-dashed p-3 rounded-2xl hover:border-yellow-300 transition-colors">
                  <label className="block text-xs font-bold text-slate-500 mb-2 truncate">{item.label} <span className="font-normal text-[10px] italic">(Opsional)</span></label>
                  <input type="file" name={item.name} onChange={handleFileChange} 
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer" 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
             <div className="bg-yellow-50/80 border border-yellow-200 rounded-[2rem] p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-yellow-100 text-yellow-600 p-4 rounded-full shrink-0"><CheckCircle2 size={32}/></div>
                <p className="text-sm text-yellow-900 font-medium leading-relaxed text-center md:text-left">
                  "Dengan mengirimkan form ini, saya menyatakan sanggup untuk ditempatkan dimana saja sesuai kebutuhan Perusahaan. Pernyataan ini saya buat dengan sebenar-benarnya dan bersedia menerima konsekuensi apapun apabila dikemudian hari terbukti ada data yang dipalsukan."
                </p>
             </div>
             
             <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 md:static md:bg-transparent md:border-0 md:p-0 z-40">
               <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className={`w-full max-w-4xl mx-auto block font-black py-4 text-sm md:text-base rounded-2xl shadow-[0_8px_30px_rgb(37,99,235,0.3)] transition-all ${isSubmitting ? 'bg-slate-400 text-slate-200 shadow-none cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-white hover:-translate-y-1'}`}
               >
                 {isSubmitting ? 'MEMPROSES UPLOAD DOKUMEN (MOHON TUNGGU)...' : 'SAYA SETUJU & KIRIM LAMARAN SEKARANG'}
               </button>
             </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default FormRekrutmen;