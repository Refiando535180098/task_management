export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { targetUserIds, title, message } = req.body;

  try {
    const response = await fetch('https://onesignal.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // GANTI INI DENGAN REST API KEY YANG ASLI (LIHAT LANGKAH 3)
        'Authorization': 'Basic os_v2_app_6g3tdf7fvzgdla4cffwxevwydz2aonqqw2auwinl6izhgueslnblwsib547gqdsqzn5cd5ircbb2nkvovya3zd5iujb5zlrusgvflxa'
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