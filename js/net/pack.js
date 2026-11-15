// Empaquetado binario del estado del cooperativo (0.52).
// El anfitrión manda 15 veces por segundo dónde está cada jugador y cada enemigo. Antes iba en JSON
// completo; ahora va en binario y, de cada fila (jugador o enemigo), sólo los campos que han cambiado
// desde el envío anterior (delta). Cada segundo se manda todo entero (fotograma clave) para quien
// acabe de entrar o vuelva a conectarse. Lo que se sincroniza es lo mismo que antes: sólo pesa menos.
(function () {
  'use strict';
  // ---- escritura ----
  class Writer {
    constructor() { this.buf = new ArrayBuffer(4096); this.dv = new DataView(this.buf); this.u8 = new Uint8Array(this.buf); this.n = 0; }
    need(k) {
      if (this.n + k <= this.buf.byteLength) return;
      let sz = this.buf.byteLength * 2; while (sz < this.n + k) sz *= 2;
      const nb = new ArrayBuffer(sz); new Uint8Array(nb).set(this.u8.subarray(0, this.n));
      this.buf = nb; this.dv = new DataView(nb); this.u8 = new Uint8Array(nb);
    }
    u8w(v) { this.need(1); this.dv.setUint8(this.n++, v); }
    u16(v) { this.need(2); this.dv.setUint16(this.n, v); this.n += 2; }
    i8(v) { this.need(1); this.dv.setInt8(this.n++, v); }
    i16(v) { this.need(2); this.dv.setInt16(this.n, v); this.n += 2; }
    i32(v) { this.need(4); this.dv.setInt32(this.n, v); this.n += 4; }
    f32(v) { this.need(4); this.dv.setFloat32(this.n, v); this.n += 4; }
    f64(v) { this.need(8); this.dv.setFloat64(this.n, v); this.n += 8; }
    str(s) { const b = enc.encode(s); this.u16(b.length); this.need(b.length); this.u8.set(b, this.n); this.n += b.length; }
    // valor con etiqueta: números enteros o con 2-3 decimales en 1-3 bytes, textos, listas
    val(v) {
      if (v === null || v === undefined || v === false) { this.u8w(0); return; }
      if (v === true) { this.u8w(10); return; }
      if (typeof v === 'number') {
        if (Number.isInteger(v)) {
          if (v >= -128 && v < 128) { this.u8w(1); this.i8(v); } else if (v >= -32768 && v < 32768) { this.u8w(2); this.i16(v); } else if (Math.abs(v) < 2147483648) { this.u8w(3); this.i32(v); } else { this.u8w(9); this.f64(v); }
          return;
        }
        const c = Math.round(v * 100);
        if (Math.abs(c - v * 100) < 1e-6 && c >= -32768 && c < 32768) { this.u8w(7); this.i16(c); return; }
        const m = Math.round(v * 1000);
        if (Math.abs(m - v * 1000) < 1e-6 && m >= -32768 && m < 32768) { this.u8w(8); this.i16(m); return; }
        this.u8w(4); this.f32(v); return;
      }
      if (typeof v === 'string') { this.u8w(5); this.str(v); return; }
      if (Array.isArray(v)) { this.u8w(6); this.u16(v.length); for (const x of v) this.val(x); return; }
      this.u8w(11); this.str(JSON.stringify(v));
    }
    bytes() { return this.u8.slice(0, this.n); }
  }
  // ---- lectura ----
  class Reader {
    constructor(u8) { this.u8 = u8; this.dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.n = 0; }
    u8r() { return this.dv.getUint8(this.n++); }
    u16() { const v = this.dv.getUint16(this.n); this.n += 2; return v; }
    str() { const l = this.u16(); const s = dec.decode(this.u8.subarray(this.n, this.n + l)); this.n += l; return s; }
    val() {
      const t = this.u8r(), dv = this.dv;
      let v;
      switch (t) {
        case 0: return 0;
        case 1: v = dv.getInt8(this.n); this.n += 1; return v;
        case 2: v = dv.getInt16(this.n); this.n += 2; return v;
        case 3: v = dv.getInt32(this.n); this.n += 4; return v;
        case 4: v = dv.getFloat32(this.n); this.n += 4; return v;
        case 5: return this.str();
        case 6: { const l = this.u16(), a = new Array(l); for (let i = 0; i < l; i++) a[i] = this.val(); return a; }
        case 7: v = dv.getInt16(this.n) / 100; this.n += 2; return v;
        case 8: v = dv.getInt16(this.n) / 1000; this.n += 2; return v;
        case 9: v = dv.getFloat64(this.n); this.n += 8; return v;
        case 10: return true;
        case 11: return JSON.parse(this.str());
        default: throw new Error('paquete roto');
      }
    }
  }
  const enc = new TextEncoder(), dec = new TextDecoder();
  const same = (a, b) => a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]))) || ((a === 0 || a === false || a == null) && (b === 0 || b === false || b == null));

  // filas con id en la posición 0: se escribe el id, una máscara de campos cambiados y sólo esos campos
  function writeRows(w, rows, prev, full) {
    w.u16(rows.length);
    const keep = new Set();
    for (const r of rows) {
      const id = r[0], p = full ? null : prev.get(id);
      keep.add(id);
      let mask = 0;
      for (let i = 1; i < r.length && i < 32; i++) if (!p || !same(r[i], p[i])) mask |= 1 << (i - 1);
      w.val(id); w.u8w(r.length); w.i32(mask);
      for (let i = 1; i < r.length && i < 32; i++) if (mask & (1 << (i - 1))) w.val(r[i]);
      prev.set(id, r);
    }
    for (const id of prev.keys()) if (!keep.has(id)) prev.delete(id);
  }
  function readRows(rd, cache) {
    const n = rd.u16(), out = [];
    const keep = new Set();
    for (let k = 0; k < n; k++) {
      const id = rd.val(), len = rd.u8r(), mask = rd.dv.getInt32(rd.n); rd.n += 4;
      const p = cache.get(id), r = new Array(len);
      r[0] = id;
      let ok = true;
      for (let i = 1; i < len; i++) {
        if (mask & (1 << (i - 1))) r[i] = rd.val();
        else if (p) r[i] = p[i];
        else ok = false;   // aún no tenemos esta fila entera: llegará en el próximo fotograma clave
      }
      keep.add(id);
      if (ok) { cache.set(id, r); out.push(r); }
    }
    for (const id of cache.keys()) if (!keep.has(id)) cache.delete(id);
    return out;
  }

  const KEY_EVERY = 15;   // fotograma clave: 1 por segundo
  VX.Pack = {
    // anfitrión
    enc: { pl: new Map(), en: new Map(), n: 0 },
    encodeSnap(d) {
      const E = this.enc, full = E.n++ % KEY_EVERY === 0, w = new Writer();
      w.u8w(1); w.u8w(full ? 1 : 0);
      w.val(d.rid || 0); w.val(d.w || 0);
      writeRows(w, d.pl, E.pl, full);
      writeRows(w, d.en, E.en, full);
      return w.bytes();
    },
    resetEnc() { this.enc = { pl: new Map(), en: new Map(), n: 0 }; },
    // invitado
    dec: { pl: new Map(), en: new Map() },
    decodeSnap(u8) {
      const rd = new Reader(u8);
      if (rd.u8r() !== 1) return null;
      rd.u8r();
      const rid = rd.val(), w = rd.val();
      const pl = readRows(rd, this.dec.pl), en = readRows(rd, this.dec.en);
      return { k: 's', pl, en, w: w || null, rid: rid || null };
    },
    resetDec() { this.dec = { pl: new Map(), en: new Map() }; },
  };
})();
