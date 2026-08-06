import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// --- MODIFIKASI: Import Supabase Client ---
import { supabase } from '../supabase';

const CekStatus = () => {
  const [nik, setNik] = useState('');
  const [hasil, setHasil] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // --- MODIFIKASI: Ubah menjadi async function untuk memanggil database ---
  const handleCek = async (e) => {
    e.preventDefault();
    setError(''); 
    setHasil(null);
    
    try {
      // --- MODIFIKASI: MENCARI DATA BERDASARKAN NIK DI SUPABASE ---
      const { data, error: fetchError } = await supabase
        .from('candidates')
        .select('nama_lengkap, status, lokasi_penempatan')
        .eq('nik_ktp', nik)
        .single(); // Menggunakan .single() karena NIK KTP seharusnya unik

      if (fetchError || !data) {
        // Jika data tidak ditemukan di Supabase
        setError('Data pelamar dengan NIK tersebut tidak ditemukan.');
      } else {
        // Jika ditemukan, set hasil untuk ditampilkan di layar
        setHasil({
          nama_lengkap: data.nama_lengkap,
          status: data.status,
          lokasi_penempatan: data.lokasi_penempatan
        });
      }
    } catch (err) {
      // Tangkapan jika terjadi error koneksi atau server
      setError('Terjadi kesalahan saat memeriksa data lamaran.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded shadow-lg max-w-md w-full border-t-4 border-blue-600">
        <h2 className="text-xl font-bold mb-4 text-center">Cek Status Lamaran</h2>
        <form onSubmit={handleCek} className="mb-4">
          <input 
            type="number" 
            placeholder="Masukkan 16 Digit NIK KTP" 
            required 
            className="w-full p-2 border rounded mb-4" 
            onChange={(e) => setNik(e.target.value)} 
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold">
            Cari Data
          </button>
        </form>

        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        
        {hasil && (
          <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
            <p className="font-bold text-lg mb-2">{hasil.nama_lengkap}</p>
            <div className="inline-block px-4 py-1 rounded-full text-sm font-bold text-white mb-2 shadow" 
                 style={{ backgroundColor: hasil.status === 'INTI' ? 'green' : hasil.status === 'BANK_DATA' ? 'gray' : '#ca8a04' }}>
              {hasil.status === 'INTI' ? 'ANDA LOLOS' : hasil.status === 'BANK_DATA' ? 'KAMI AKAN HUBUNGI KEMBALI' : 'SEDANG DISELEKSI'}
            </div>
            {hasil.status === 'INTI' && hasil.lokasi_penempatan && (
              <p className="text-sm mt-2 text-gray-700">Penempatan: <b>{hasil.lokasi_penempatan}</b></p>
            )}
          </div>
        )}
        
        <button onClick={() => navigate('../FormRekrutmen')} className="mt-6 w-full text-blue-600 underline text-sm">
          Kembali ke Form Pendaftaran
        </button>
      </div>
    </div>
  );
};

export default CekStatus;