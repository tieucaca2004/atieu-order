// Máy chủ trung gian gửi tin Telegram cho A. Tiểu.
//
// Vì sao cần: token bot hiện nằm trong index.html - file mà mọi khách hàng đều
// tải về máy khi mở atieu.com. Ai bấm Ctrl+U cũng đọc được, rồi gửi đơn giả vào
// nhóm Bếp hoặc đọc trộm tin trong 4 nhóm. Đưa token lên đây thì token nằm ở
// máy chủ, khách không tải về được.
//
// Chủ quán đặt 3 biến môi trường trong Netlify (Environment variables):
//   TG_TOKEN_ORDER  - bot dùng cho nhóm Chủ quán và nhóm Bếp
//   TG_TOKEN_TN     - bot nhóm Thu Ngân
//   TG_TOKEN_SHIP   - bot nhóm Shipper
//
// Chưa đặt biến nào thì trả về 503, và web TỰ ĐỘNG quay lại cách gửi cũ
// (token trong index.html) nên việc nhận đơn không bao giờ bị gián đoạn.

const json = (obj, statusCode) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  // Mở bằng trình duyệt (GET) -> báo máy chủ đang sống, tiện kiểm tra
  if (event.httpMethod === 'GET') {
    return json({
      ok: false,
      description: 'May chu trung gian dang chay. Chi nhan POST.',
      da_cau_hinh: {
        order: !!process.env.TG_TOKEN_ORDER,
        tn: !!process.env.TG_TOKEN_TN,
        ship: !!process.env.TG_TOKEN_SHIP,
      },
    }, 200);
  }

  if (event.httpMethod !== 'POST') return json({ ok: false, description: 'Chi nhan POST' }, 405);

  var body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return json({ ok: false, description: 'Du lieu gui len khong hop le' }, 400); }

  var tokens = {
    order: process.env.TG_TOKEN_ORDER,
    tn: process.env.TG_TOKEN_TN,
    ship: process.env.TG_TOKEN_SHIP,
  };

  var bot = body.bot;
  if (!Object.prototype.hasOwnProperty.call(tokens, bot))
    return json({ ok: false, description: 'Ten bot khong hop le' }, 400);
  if (!body.chat_id || !body.text)
    return json({ ok: false, description: 'Thieu chat_id hoac text' }, 400);

  var token = tokens[bot];
  // Chưa cấu hình token -> 503 để web tự quay về cách gửi cũ
  if (!token) return json({ ok: false, description: 'Bot chua duoc cau hinh tren may chu' }, 503);

  var payload = { chat_id: body.chat_id, text: body.text, parse_mode: 'HTML' };
  if (body.reply_markup) payload.reply_markup = body.reply_markup;

  try {
    var r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var data = await r.json();
    return json(data, r.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, description: 'Khong goi duoc Telegram: ' + e.message }, 502);
  }
};
