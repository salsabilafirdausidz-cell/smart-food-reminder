// POST /api/subscribe
// Dipanggil sekali saat user pertama kali mengizinkan notifikasi.
// Menyimpan push subscription + data bahan awal ke database.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // CORS — izinkan dipanggil dari domain PWA manapun (静态 hosting terpisah dari backend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, userName, foods, notifyH1, notifyH3 } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_name: userName || '',
        foods: foods || [],
        notify_h1: notifyH1 !== undefined ? notifyH1 : true,
        notify_h3: notifyH3 !== undefined ? notifyH3 : true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
};
