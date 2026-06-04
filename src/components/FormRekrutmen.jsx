import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; 
import { Briefcase, User, GraduationCap, Activity, Award, ShieldAlert, HelpCircle, FileUp, Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';

const FormRekrutmen = () => {
  const navigate = useNavigate();
  
  // ==========================================
  // SEMUA STATE & FUNGSI LOGIKA TETAP SAMA
  // ==========================================
  const [formData, setFormData] = useState({
    bidang_jasa: 'Security (Satpam)', alamat_domisili: '', nama_lengkap: '', nik_ktp: '', kewarganegaraan: 'WNI', jenis_kelamin: 'Laki-laki', 
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

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFiles({ ...files, [e.target.name]: e.target.files[0] });

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
    try {
      const ktpUrl = await uploadFile(files.file_ktp, 'KTP'); const kkUrl = await uploadFile(files.file_kk, 'KK'); const rekUrl = await uploadFile(files.file_rek, 'REK');
      const skckUrl = await uploadFile(files.file_skck, 'SKCK'); const suratSehatUrl = await uploadFile(files.file_surat_sehat, 'SEHAT'); const npwpUrl = await uploadFile(files.file_npwp, 'NPWP');
      const bjsTkUrl = await uploadFile(files.file_bpjs_tk, 'BPJS_TK'); const bjsKesUrl = await uploadFile(files.file_bpjs_kes, 'BPJS_KES'); const simUrl = await uploadFile(files.file_sim, 'SIM');
      const ijazahUrl = await uploadFile(files.file_ijazah, 'IJAZAH'); const fotoUrl = await uploadFile(files.file_pas_foto, 'FOTO'); const cvUrl = await uploadFile(files.file_cv, 'CV');
      const sertifikatUrl = await uploadFile(files.file_sertifikat, 'SERTIFIKAT'); const refKerjaUrl = await uploadFile(files.file_referensi_kerja, 'REF_KERJA'); const vaksinUrl = await uploadFile(files.file_vaksin, 'VAKSIN');
      
      const payload = {
        ...formData, tinggi_badan: parseInt(formData.tinggi_badan), berat_badan: parseInt(formData.berat_badan),
        berkas_ktp_url: ktpUrl, berkas_kk_url: kkUrl, berkas_buku_rek_url: rekUrl, berkas_skck_url: skckUrl, berkas_surat_sehat_url: suratSehatUrl,
        berkas_npwp_url: npwpUrl, berkas_bpjs_tk_url: bjsTkUrl, berkas_bpjs_kes_url: bjsKesUrl, berkas_sim_url: simUrl,
        berkas_ijazah_url: ijazahUrl, berkas_pas_foto_url: fotoUrl, berkas_cv_url: cvUrl, berkas_sertifikat_url: sertifikatUrl,
        berkas_referensi_kerja_url: refKerjaUrl, berkas_vaksin_url: vaksinUrl,
        riwayat_pendidikan: JSON.stringify(pendidikanList), riwayat_pelatihan: JSON.stringify(pelatihanList), status: 'PENDING'
      };

      const { error } = await supabase.from('candidates').insert([payload]);
      if (error) throw error;
      
      alert("Lamaran berhasil dikirim dan tersimpan di sistem!");
      window.location.reload();
    } catch (error) {
      alert("Terjadi kesalahan saat mengirim lamaran: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper class untuk input yang rapi dan konsisten
  const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 transition-all outline-none";
  const labelClass = "block mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER HERO SECTION */}
        <div className="bg-blue-600 rounded-[2rem] p-8 md:p-10 text-white shadow-xl shadow-blue-600/20 mb-8 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white opacity-10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-white opacity-10 blur-3xl rounded-full"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-block px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black tracking-widest uppercase mb-3 border border-blue-400">Portal Karir Resmi</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Formulir Pendaftaran</h1>
              <p className="text-blue-100 text-sm md:text-base max-w-lg">Silakan isi data diri Anda dengan lengkap dan sebenar-benarnya untuk proses seleksi calon karyawan.</p>
            </div>
            <button onClick={() => navigate('/cek-status')} className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0">
              Cek Status Lamaran <ArrowRight size={16}/>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: POSISI */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl"><Briefcase size={20}/></div>
              <h2 className="font-black text-lg text-slate-800">1. Posisi & Domisili</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Bidang Jasa yang Dilamar</label>
                <select name="bidang_jasa" onChange={handleInputChange} className={inputClass}>
                  <option value="Security (Satpam)">Security (Satpam)</option>
                  <option value="Cleaning Service">Cleaning Service</option>
                  <option value="Parking Service">Parking Service</option>
                  <option value="Labour Supply (Tenaga Kerja)">Labour Supply (Tenaga Kerja Umum)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Alamat Lengkap Domisili</label>
                <textarea name="alamat_domisili" placeholder="Sebutkan alamat tinggal saat ini..." onChange={handleInputChange} required className={inputClass} rows="2"></textarea>
              </div>
            </div>
          </div>

          {/* SECTION 2: DATA DIRI & KELUARGA */}
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
                  <select name="status_pernikahan" onChange={handleInputChange} className={`${inputClass} font-bold text-blue-700 bg-blue-50 border-blue-200`}>
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

            {/* FORM KELUARGA DINAMIS */}
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

          {/* SECTION 3: PENDIDIKAN */}
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

          {/* SECTION 4: FISIK & MEDIS */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl"><Activity size={20}/></div>
              <h2 className="font-black text-lg text-slate-800">4. Kuesioner Fisik & Medis</h2>
            </div>
            
            {/* Row 1: Ukuran */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              <div><label className={labelClass}>Tinggi (cm)</label><input type="number" name="tinggi_badan" onChange={handleInputChange} required className={inputClass} /></div>
              <div><label className={labelClass}>Berat (kg)</label><input type="number" name="berat_badan" onChange={handleInputChange} required className={inputClass} /></div>
              <div><label className={labelClass}>Uk. Baju</label><select name="ukuran_baju" onChange={handleInputChange} className={inputClass}><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option></select></div>
              <div><label className={labelClass}>Uk. Celana</label><input type="number" placeholder="28-44" name="ukuran_celana" onChange={handleInputChange} required className={inputClass} /></div>
              <div className="col-span-2 sm:col-span-1 md:col-span-1"><label className={labelClass}>Uk. Sepatu</label><input type="number" placeholder="38-45" name="ukuran_sepatu" onChange={handleInputChange} required className={inputClass} /></div>
            </div>

            {/* Row 2: Pertanyaan Ya/Tidak */}
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

          {/* SECTION 5: SERTIFIKASI */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl"><Award size={20}/></div>
                <h2 className="font-black text-lg text-slate-800">5. Pelatihan & Sertifikasi</h2>
              </div>
              <button type="button" onClick={addPelatihan} className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"><Plus size={14}/> Tambah Sertifikasi</button>
            </div>

            <div className="space-y-4">
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
          </div>

          {/* SECTION 6 & 7 (Grid 2 Kolom di Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Kontak Darurat */}
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

            {/* Pertanyaan Tambahan */}
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

          {/* SECTION 8: UPLOAD DOKUMEN */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl"><FileUp size={20}/></div>
              <div>
                <h2 className="font-black text-lg text-slate-800">8. Unggah Dokumen Berkas</h2>
                <p className="text-xs text-slate-500 font-medium">Format: JPG, PNG, atau PDF (Max 2MB per file)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Berkas Wajib */}
              {[
                { label: "Pas Foto Berwarna", name: "file_pas_foto", req: true }, { label: "KTP Asli", name: "file_ktp", req: true },
                { label: "Kartu Keluarga", name: "file_kk", req: true }, { label: "Ijazah Terakhir", name: "file_ijazah", req: true },
                { label: "Buku Rekening", name: "file_rek", req: true }, { label: "SKCK Aktif", name: "file_skck", req: true },
                { label: "Surat Sehat", name: "file_surat_sehat", req: true }, { label: "Sertifikat Vaksin", name: "file_vaksin", req: true },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl hover:border-blue-300 transition-colors">
                  <label className="block text-xs font-bold text-slate-700 mb-2 truncate">
                    {item.label} {item.req && <span className="text-red-500">*</span>}
                  </label>
                  <input type="file" name={item.name} onChange={handleFileChange} required={item.req} 
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" 
                  />
                </div>
              ))}

              {/* Berkas Opsional */}
              {[
                { label: "Surat Referensi Kerja", name: "file_referensi_kerja" }, { label: "CV / Surat Lamaran", name: "file_cv" },
                { label: "Sertifikat Gada/Lainnya", name: "file_sertifikat" }, { label: "NPWP", name: "file_npwp" },
                { label: "BPJS Ketenagakerjaan", name: "file_bpjs_tk" }, { label: "BPJS Kesehatan", name: "file_bpjs_kes" }, { label: "SIM (A/C)", name: "file_sim" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50/50 border border-slate-200 border-dashed p-3 rounded-2xl hover:border-blue-300 transition-colors">
                  <label className="block text-xs font-bold text-slate-500 mb-2 truncate">{item.label} <span className="font-normal text-[10px] italic">(Opsional)</span></label>
                  <input type="file" name={item.name} onChange={handleFileChange} 
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* PERNYATAAN & SUBMIT AREA */}
          <div className="pt-6">
             <div className="bg-blue-50/80 border border-blue-200 rounded-[2rem] p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-blue-100 text-blue-600 p-4 rounded-full shrink-0"><CheckCircle2 size={32}/></div>
                <p className="text-sm text-blue-900 font-medium leading-relaxed text-center md:text-left">
                  "Dengan mengirimkan form ini, saya menyatakan sanggup untuk ditempatkan dimana saja sesuai kebutuhan Perusahaan. Pernyataan ini saya buat dengan sebenar-benarnya dan bersedia menerima konsekuensi apapun apabila dikemudian hari terbukti ada data yang dipalsukan."
                </p>
             </div>
             
             {/* Tombol Submit Besar & Menarik */}
             <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 md:static md:bg-transparent md:border-0 md:p-0 z-40">
               <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className={`w-full max-w-4xl mx-auto block font-black py-4 text-sm md:text-base rounded-2xl shadow-[0_8px_30px_rgb(37,99,235,0.3)] transition-all ${isSubmitting ? 'bg-slate-400 text-slate-200 shadow-none cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-1'}`}
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