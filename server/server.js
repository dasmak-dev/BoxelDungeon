// VOXEL DUNGEON · servidor del cooperativo (modo Horda, hasta 4 jugadores)
//
// Hace dos cosas, sin dependencias externas (solo Node):
//  1. Reenvía mensajes entre los jugadores de una misma sala por WebSocket (ruta /ws).
//     El anfitrión es quien ejecuta la partida de verdad; el servidor solo hace de cartero.
//  2. Si se arranca desde la carpeta del juego, sirve también los archivos del juego,
//     así que en red local basta con `node server/server.js` y abrir http://IP:8080
//
// En Render: raíz del servicio = carpeta `server`, comando de inicio `node server.js`.
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, '..');          // carpeta del juego (para jugar en red local)
const MAX_PLAYERS = 4;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8',
};

// ---------------- HTTP: archivos del juego y comprobación de estado ----------------
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/daily') { daily(req, res); return; }
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end('ok ' + rooms.size); return; }
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || file.includes(`${path.sep}server${path.sep}`)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('VOXEL DUNGEON · servidor del cooperativo activo'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

// ---------------- Mazmorra diaria: clasificación ----------------
// GET /daily?date=AAAA-MM-DD → las 10 mejores marcas del día · POST /daily {date,id,name,score,floor,kills,time}
// Se guarda la mejor marca de cada jugador (por su identificador) en server/daily.json, sólo los
// últimos 7 días. En Render el disco se borra al reiniciar el servicio: la tabla vuelve a empezar.
const DAILY_FILE = path.join(__dirname, 'daily.json');
let boards = {};
try { boards = JSON.parse(fs.readFileSync(DAILY_FILE, 'utf8')) || {}; } catch (e) { boards = {}; }
let dailyDirty = false;
setInterval(() => { if (!dailyDirty) return; dailyDirty = false; fs.writeFile(DAILY_FILE, JSON.stringify(boards), () => {}); }, 30000);
function daily(req, res) {
  const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  const top = (date, id) => {
    const list = Object.values(boards[date] || {}).sort((a, b) => b.score - a.score || a.time - b.time);
    return { top: list.slice(0, 10).map((e) => ({ name: e.name, score: e.score, floor: e.floor, kills: e.kills, me: e.id === id })), total: list.length, pos: id ? list.findIndex((e) => e.id === id) + 1 : 0 };
  };
  const okDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Math.abs(Date.parse(d + 'T12:00:00Z') - Date.now()) < 2 * 86400000;
  if (req.method === 'OPTIONS') { res.writeHead(204, H); res.end(); return; }
  if (req.method === 'GET') {
    const q = new URL(req.url, 'http://x').searchParams, date = q.get('date') || new Date().toISOString().slice(0, 10);
    res.writeHead(200, H); res.end(JSON.stringify(top(date, q.get('id') || ''))); return;
  }
  if (req.method !== 'POST') { res.writeHead(405, H); res.end('{}'); return; }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 2000) req.destroy(); });
  req.on('end', () => {
    let m;
    try { m = JSON.parse(body); } catch (e) { res.writeHead(400, H); res.end('{}'); return; }
    const date = String(m.date || ''), id = String(m.id || '').slice(0, 40), score = Math.floor(+m.score || 0);
    if (!okDate(date) || !id || !(score >= 0 && score < 1e8)) { res.writeHead(400, H); res.end('{}'); return; }
    const b = boards[date] || (boards[date] = {});
    const prev = b[id];
    const name = String(m.name || 'Anónimo').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Anónimo';
    if (!prev || score > prev.score) b[id] = { id, name, score, floor: Math.floor(+m.floor || 0), kills: Math.floor(+m.kills || 0), time: Math.floor(+m.time || 0) };
    else prev.name = name;
    for (const k of Object.keys(boards)) if (Date.now() - Date.parse(k + 'T00:00:00Z') > 7 * 86400000) delete boards[k];
    dailyDirty = true;
    res.writeHead(200, H); res.end(JSON.stringify(top(date, id)));
  });
}

// ---------------- WebSocket mínimo (RFC 6455) ----------------
function sendFrame(sock, str, opcode = 1) {
  if (sock.destroyed) return;
  const data = Buffer.isBuffer(str) ? str : Buffer.from(str);
  const len = data.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | opcode;
  sock.write(Buffer.concat([head, data]));
}

server.on('upgrade', (req, sock) => {
  if (!(req.url || '').startsWith('/ws') || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const conn = { sock, id: -1, room: null, name: '', alive: true, send: (o) => sendFrame(sock, JSON.stringify(o)) };
  let buf = Buffer.alloc(0), frag = [];
  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > 4 * 1024 * 1024) { sock.destroy(); return; }
      const mOff = off; if (masked) off += 4;
      if (buf.length < off + len) return;
      let payload = buf.subarray(off, off + len);
      if (masked) { const m = buf.subarray(mOff, mOff + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      buf = buf.subarray(off + len);
      if (op === 8) { sendFrame(sock, '', 8); sock.end(); return; }
      if (op === 9) { sendFrame(sock, payload.toString(), 10); continue; }
      if (op === 10) { conn.alive = true; continue; }
      if (op === 1 || op === 2 || op === 0) {
        if (op) frag.op = op;
        frag.push(payload);
        if (fin) { const all = Buffer.concat(frag), o = frag.op; frag = []; if (o === 2) onBinary(conn, all); else onMessage(conn, all.toString()); }
      }
    }
  });
  sock.on('close', () => onClose(conn));
  sock.on('error', () => onClose(conn));
});

// latido: mantiene viva la conexión (y el servicio) y detecta jugadores caídos
setInterval(() => {
  for (const room of rooms.values()) for (const c of room.members.values()) {
    if (!c.alive) { c.sock.destroy(); continue; }
    c.alive = false;
    sendFrame(c.sock, 'p', 9);
  }
}, 20000);

// ---------------- Salas ----------------
const rooms = new Map();   // código → { code, host, members: Map(id → conn), nextId, started }
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += LETTERS[crypto.randomInt(LETTERS.length)]; } while (rooms.has(c));
  return c;
}
const roster = (room) => [...room.members.values()].map((c) => ({ id: c.id, name: c.name }));

function onMessage(conn, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  conn.alive = true;
  if (m.t === 'create') {
    if (conn.room) return;
    const room = { code: newCode(), host: conn, members: new Map(), nextId: 1, started: false, gone: new Map() };
    conn.token = String(m.token || '').slice(0, 40);
    conn.id = 0; conn.name = String(m.name || 'Anfitrión').slice(0, 16); conn.room = room;
    room.members.set(0, conn);
    rooms.set(room.code, room);
    conn.send({ t: 'created', code: room.code, id: 0, host: 0, bin: 1, players: roster(room) });
    console.log(`sala ${room.code} creada (${rooms.size} activas)`);
  } else if (m.t === 'join') {
    if (conn.room) return;
    const room = rooms.get(String(m.code || '').toUpperCase().trim());
    if (!room) { conn.send({ t: 'error', msg: 'No existe ninguna sala con ese código' }); return; }
    // reconexión: quien se fue (o perdió la conexión) vuelve con su mismo número
    const tok = String(m.token || '').slice(0, 40), back = tok && room.gone.get(tok);
    if (back && room.members.size < MAX_PLAYERS && !room.members.has(back.id)) {
      room.gone.delete(tok);
      conn.id = back.id; conn.name = back.name; conn.token = tok; conn.room = room;
      room.members.set(conn.id, conn);
      conn.send({ t: 'joined', code: room.code, id: conn.id, host: room.host.id, back: true, bin: 1, started: room.started, players: roster(room) });
      for (const c of room.members.values()) if (c !== conn) c.send({ t: 'peer', id: conn.id, name: conn.name, back: true, players: roster(room) });
      console.log(`sala ${room.code}: vuelve ${conn.id}`);
      return;
    }
    if (room.started) { conn.send({ t: 'error', msg: 'La partida de esa sala ya ha empezado' }); return; }
    if (room.members.size >= MAX_PLAYERS) { conn.send({ t: 'error', msg: 'La sala está llena (máximo 4)' }); return; }
    conn.id = room.nextId++; conn.name = String(m.name || 'Jugador').slice(0, 16); conn.room = room; conn.token = tok;
    room.members.set(conn.id, conn);
    conn.send({ t: 'joined', code: room.code, id: conn.id, host: room.host.id, bin: 1, players: roster(room) });
    for (const c of room.members.values()) if (c !== conn) c.send({ t: 'peer', id: conn.id, name: conn.name, players: roster(room) });
  } else if (m.t === 'started') {
    if (conn.room && conn.room.host === conn) conn.room.started = !!m.v;
  } else if (m.t === 'msg') {
    const room = conn.room;
    if (!room) return;
    const out = JSON.stringify({ t: 'msg', from: conn.id, d: m.d });
    if (m.to !== undefined && m.to !== null && m.to !== 'all') {
      const c = room.members.get(m.to);
      if (c) sendFrame(c.sock, out);
    } else if (conn === room.host || m.to === 'all') {
      for (const c of room.members.values()) if (c !== conn) sendFrame(c.sock, out);
    } else sendFrame(room.host.sock, out);
  }
}

// mensajes binarios (estado del cooperativo, 0.52): [destino u16][datos] → a cada destinatario [remitente u16][datos]
// destino 65535 = lo normal (anfitrión → todos, invitado → anfitrión), 65534 = todos, otro = ese jugador
function onBinary(conn, buf) {
  const room = conn.room;
  if (!room || buf.length < 2) return;
  conn.alive = true;
  const to = buf.readUInt16BE(0), out = Buffer.from(buf);
  out.writeUInt16BE(conn.id & 0xffff, 0);
  if (to < 65534) { const c = room.members.get(to); if (c) sendFrame(c.sock, out, 2); }
  else if (conn === room.host || to === 65534) { for (const c of room.members.values()) if (c !== conn) sendFrame(c.sock, out, 2); }
  else sendFrame(room.host.sock, out, 2);
}

function onClose(conn) {
  const room = conn.room;
  if (!room) return;
  conn.room = null;
  room.members.delete(conn.id);
  // se guarda su sitio 15 minutos por si vuelve (se le corta la conexión, recarga la página…)
  if (conn.token && room.gone) { room.gone.set(conn.token, { id: conn.id, name: conn.name, at: Date.now() }); for (const [k, v] of room.gone) if (Date.now() - v.at > 15 * 60000) room.gone.delete(k); }
  if (room.members.size === 0) {
    // nadie dentro: se cierra (si todos se han ido no hay partida a la que volver)
    rooms.delete(room.code);
    console.log(`sala ${room.code} cerrada (${rooms.size} activas)`);
  } else if (room.host === conn) {
    // se va el anfitrión: el que lleva más tiempo en la sala pasa a dirigir la partida
    const next = [...room.members.values()].sort((a, b) => a.id - b.id)[0];
    room.host = next;
    for (const c of room.members.values()) c.send({ t: 'host', id: next.id, left: conn.id, players: roster(room) });
    console.log(`sala ${room.code}: nuevo anfitrión ${next.id}`);
  } else {
    for (const c of room.members.values()) c.send({ t: 'leave', id: conn.id, players: roster(room) });
  }
}

server.listen(PORT, () => {
  console.log(`VOXEL DUNGEON · cooperativo en el puerto ${PORT}`);
  const nets = require('os').networkInterfaces();
  for (const list of Object.values(nets)) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`  En tu red local: http://${n.address}:${PORT}`);
});
