// Máy chủ trung gian gửi tin Telegram cho A. Tiểu.
//
// Mục đích: token của bot nằm ở BIẾN MÔI TRƯỜNG trên Netlify, không nằm trong
// index.html nữa, nên người ngoài xem mã nguồn web (hoặc bung file APK) không
// lấy được token để gửi đơn giả vào nhóm Bếp.
//
// Chủ quán cần đặt 3 biến môi trường trong Netlify:
//   TG_TOKEN_ORDER  - bot dùng cho nhóm Chủ quán và nhóm Bếp
//   TG_TOKEN_TN     - bot dùng cho nhóm Thu Ngân
//   TG_TOKEN_SHIP   - bot dùng cho nhóm Shipper
// Chưa đặt biến nào thì hàm trả về 503, và web tự động quay lại cách gửi cũ
// để việc nhận đơn không bị gián đoạn.

const TOKENS = {
  order: process.env.TG_TOKEN_ORDER,
  tn:    process.env.TG_TOKEN_TN,
  ship:  process.env.TG_TOKEN_SHIP,
};

const json = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, description: 'Chi nhan POST' }, 405);

  let body;
  try { body = await req.json(); }
  catch { return json({ ok: false, description: 'Du lieu gui len khong hop le' }, 400); }

  const { bot, chat_id, text, reply_markup } = body || {};

  if (!Object.prototype.hasOwnProperty.call(TOKENS, bot))
    return json({ ok: false, description: 'Ten bot khong hop le' }, 400);
  if (!chat_id || !text)
    return json({ ok: false, description: 'Thieu chat_id hoac text' }, 400);

  const token = TOKENS[bot];
  // Chưa cấu hình token -> báo 503 để web tự quay về cách gửi cũ
  if (!token) return json({ ok: false, description: 'Bot chua duoc cau hinh tren may chu' }, 503);

  const payload = { chat_id, text, parse_mode: 'HTML' };
  if (reply_markup) payload.reply_markup = reply_markup;

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({ ok: false, description: 'Telegram tra ve du lieu la' }));
    return json(data, r.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, description: 'Khong goi duoc Telegram: ' + e.message }, 502);
  }
};
