// GET/POST /api/cron/check-expiry
// Dipanggil otomatis 1x/hari oleh Vercel Cron (lihat vercel.json).
// Untuk setiap user terdaftar: cek bahan yang kadaluarsa hari ini atau
// dalam 3 hari, lalu kirim push notification kalau ada yang cocok.

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

module.exports = async (req, res) => {
  // Lindungi endpoint ini — hanya boleh dipanggil oleh Vercel Cron,
  // bukan sembarang orang yang tahu URL-nya.
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) throw error;

    let sent = 0;
    let cleaned = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const sub of subscriptions || []) {
      const foods = Array.isArray(sub.foods) ? sub.foods : [];
      const wantH1 = sub.notify_h1 !== false; // default true
      const wantH3 = sub.notify_h3 !== false; // default true

      const urgent = wantH1 ? foods.filter(f => daysUntil(f.expiryDate) <= 1) : [];
      const warn = wantH3 ? foods.filter(f => {
        const d = daysUntil(f.expiryDate);
        return d === 2 || d === 3;
      }) : [];

      if (urgent.length === 0 && warn.length === 0) continue;

      // Susun pesan notifikasi
      let title, body;
      if (urgent.length > 0) {
        const names = urgent.map(f => f.name).join(', ');
        title = '⚠️ Ada bahan kadaluarsa hari ini!';
        body = `${names} perlu segera dipakai atau dibuang.`;
      } else {
        const names = warn.map(f => f.name).join(', ');
        title = '🟡 Bahan akan kadaluarsa dalam 2-3 hari';
        body = `${names} — cek resep yang cocok di aplikasi!`;
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({ title, body, url: './', badgeCount: urgent.length + warn.length })
        );
        sent++;

        await supabase
          .from('push_subscriptions')
          .update({ last_notified_date: today })
          .eq('endpoint', sub.endpoint);

      } catch (pushErr) {
        // 404/410 = subscription sudah tidak valid (user uninstall/block notif)
        if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          cleaned++;
        } else {
          console.error('Push error for', sub.endpoint, pushErr.message);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      checked: subscriptions?.length || 0,
      notificationsSent: sent,
      invalidRemoved: cleaned,
    });
  } catch (err) {
    console.error('cron check-expiry error:', err);
    return res.status(500).json({ error: 'Cron job failed' });
  }
};
