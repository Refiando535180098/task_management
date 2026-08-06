import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import admin from "npm:firebase-admin@11.11.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// 1. Inisialisasi Firebase Admin dengan Private Key yang ada di Brankas (Secrets)
if (!admin.apps.length) {
  const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (serviceAccountStr) {
    const serviceAccount = JSON.parse(serviceAccountStr);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

  try {
    // 2. Tangkap data otomatis dari Webhook Supabase (tabel notifications)
    const payload = await req.json()
    const record = payload.record 
    
    if (!record || !record.userId) {
      return new Response('Bukan event insert yang valid', { headers: corsHeaders })
    }

    // 3. Akses tabel initial_users untuk mencari fcm_token milik target
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: user } = await supabase
      .from('initial_users')
      .select('fcm_token')
      .eq('id', record.userId)
      .single()

    // Jika karyawan tidak punya token (belum izinkan notifikasi web), batalkan pengiriman
    if (!user || !user.fcm_token) {
      console.log(`User ${record.userId} tidak memiliki FCM token aktif.`);
      return new Response('User tidak memiliki token FCM', { headers: corsHeaders })
    }

    // 4. Susun pesan notifikasi berdasarkan jenisnya
    let notifTitle = 'Pemberitahuan Sistem';
    if (record.type === 'chat') notifTitle = 'Pesan Internal Baru';
    else if (record.type === 'task' || record.type === 'system') notifTitle = 'Pekerjaan & Info Baru';

    const message = {
      notification: {
        title: notifTitle,
        body: record.message || 'Anda memiliki pemberitahuan baru.',
      },
      data: {
        // URL yang terbuka saat notif di-klik (bisa diarahkan ke /TaskManagement jika mau)
        click_action: '/', 
      },
      token: user.fcm_token, 
    }

    // 5. Tembakkan pesan ke Firebase
    const response = await admin.messaging().send(message)

    return new Response(
      JSON.stringify({ success: true, messageId: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Gagal mengirim FCM:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})