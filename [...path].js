const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sign = m => crypto.createHmac('sha256', process.env.SECRET || '').update(m).digest('base64');
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const authed = req => {
  const t = (req.headers.authorization || '').replace('Bearer ', ''), i = t.indexOf('.');
  if (i < 0) return false;
  return +t.slice(0, i) > Date.now() && t.slice(i + 1) === sign(t.slice(0, i));
};

let ready;
function getDb() {
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  ready = ready || (async () => {
    await sql`CREATE TABLE IF NOT EXISTS projects (id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, location TEXT, area TEXT, year TEXT, sort_order INTEGER DEFAULT 1, description TEXT, image TEXT, updated BIGINT)`;
    await sql`CREATE TABLE IF NOT EXISTS contacts (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, message TEXT, reply_via TEXT, created TIMESTAMPTZ DEFAULT now())`;
  })().catch(e => { ready = null; throw e; });
  return ready.then(() => sql);
}

module.exports = async (req, res) => {
  const J = (s, d, h) => { res.status(s); for (const k in (h || {})) res.setHeader(k, h[k]); res.json(d); };
  try {
    const p = new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '').split('/'), m = req.method;
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    const sql = await getDb();

    if (p[0] === 'projects' && m === 'GET') {
      const r = await sql`SELECT id,title,category,location,area,year,sort_order,description,updated FROM projects ORDER BY sort_order ASC, id DESC`;
      return J(200, r, { 'cache-control': 'no-store' });
    }
    if (p[0] === 'image' && m === 'GET') {
      const r = await sql`SELECT image FROM projects WHERE id=${parseInt(p[1]) || 0}`;
      if (!r[0] || !r[0].image) return res.status(404).end();
      const x = r[0].image.match(/^data:(.+?);base64,(.*)$/);
      res.setHeader('content-type', x[1]);
      res.setHeader('cache-control', 'public, max-age=31536000, immutable');
      return res.status(200).send(Buffer.from(x[2], 'base64'));
    }
    if (p[0] === 'contact' && m === 'POST') {
      if (!b.name || !(b.phone || b.email)) return J(400, { error: 'Preencha nome e telefone ou e-mail.' });
      await sql`INSERT INTO contacts(name,phone,email,address,message,reply_via) VALUES(${cut(b.name,120)},${cut(b.phone,40)},${cut(b.email,120)},${cut(b.address,200)},${cut(b.message,2000)},${cut(b.reply_via,20)})`;
      return J(200, { ok: true });
    }
    if (p[0] === 'login' && m === 'POST') {
      if (!process.env.ADMIN_PASSWORD || b.password !== process.env.ADMIN_PASSWORD) return J(401, { error: 'Senha incorreta.' });
      const e = Date.now() + 12 * 36e5;
      return J(200, { token: e + '.' + sign('' + e) });
    }

    if (!authed(req)) return J(401, { error: 'Não autorizado.' });

    if (p[0] === 'contacts') {
      if (m === 'GET') return J(200, await sql`SELECT * FROM contacts ORDER BY id DESC`);
      if (m === 'DELETE') { await sql`DELETE FROM contacts WHERE id=${parseInt(p[1]) || 0}`; return J(200, { ok: true }); }
    }
    if (p[0] === 'projects') {
      if (m === 'DELETE') { await sql`DELETE FROM projects WHERE id=${parseInt(p[1]) || 0}`; return J(200, { ok: true }); }
      if (!b.title || !b.category) return J(400, { error: 'Título e categoria são obrigatórios.' });
      if (b.image && b.image.length > 1500000) return J(400, { error: 'Imagem muito grande.' });
      const ord = parseInt(b.sort_order) || 1, img = b.image || null, now = Date.now();
      if (m === 'POST') {
        await sql`INSERT INTO projects(title,category,location,area,year,sort_order,description,image,updated) VALUES(${cut(b.title,120)},${cut(b.category,30)},${cut(b.location,120)},${cut(b.area,30)},${cut(b.year,10)},${ord},${cut(b.description,1500)},${img},${now})`;
        return J(200, { ok: true });
      }
      if (m === 'PUT') {
        await sql`UPDATE projects SET title=${cut(b.title,120)},category=${cut(b.category,30)},location=${cut(b.location,120)},area=${cut(b.area,30)},year=${cut(b.year,10)},sort_order=${ord},description=${cut(b.description,1500)},image=COALESCE(${img},image),updated=${now} WHERE id=${parseInt(p[1]) || 0}`;
        return J(200, { ok: true });
      }
    }
    return J(404, { error: 'Não encontrado.' });
  } catch (e) {
    return J(500, { error: 'Erro no servidor: ' + e.message });
  }
};
