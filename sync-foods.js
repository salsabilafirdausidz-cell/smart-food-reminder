// POST /api/sync-foods
// Dipanggil setiap kali daftar bahan berubah (tambah/hapus/pakai),
// supaya backend selalu punya data terbaru untuk dicek saat cron jalan.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, foods, notifyH1, notifyH3 } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    const updates = { foods: foods || [], updated_at: new Date().toISOString() };
    if (notifyH1 !== undefined) updates.notify_h1 = notifyH1;
    if (notifyH3 !== undefined) updates.notify_h3 = notifyH3;

    const { error } = await supabase
      .from('push_subscriptions')
      .update(updates)
      .eq('endpoint', endpoint);

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sync-foods error:', err);
    return res.status(500).json({ error: 'Failed to sync foods' });
  }
};
