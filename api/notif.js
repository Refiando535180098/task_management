export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUserIds, title, message } = req.body;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // GANTI INI DENGAN REST API KEY YANG ASLI (LIHAT LANGKAH 3)
        'Authorization': 'Basic os_v2_app_6g3tdf7fvzgdla4cffwxevwyd2uwqadq6c6ugceju6723bq2hqb2uaitvn6c6f3ytqzqv2j5cdg6zrii7jrg3wcpmj4d7bfg4bqxszy'
      },
      body: JSON.stringify({
        app_id: "f1b73197-e5ae-4c35-8382-296d7256d81e",
        include_external_user_ids: targetUserIds,
        headings: { en: title },
        contents: { en: message },
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}