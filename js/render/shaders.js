// Shaders GLSL: cubos instanciados con oclusión ambiental por vértice,
// luces puntuales (antorchas), linterna con sombras y niebla.
VX.MAX_LIGHTS = 16;

VX.Shaders = {
  vertex: `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec3 i_pos;
layout(location=3) in vec3 i_scale;
layout(location=4) in vec4 i_quat;
layout(location=5) in vec4 i_col;
layout(location=6) in vec4 i_ao0;
layout(location=7) in vec4 i_ao1;

uniform mat4 u_proj;
uniform mat4 u_view;

out vec3 v_nrm;
out vec3 v_lnrm;
out vec3 v_local;
out vec3 v_scale;
out vec4 v_col;
out vec3 v_world;
out float v_depth;
out float v_ao;

vec3 qrot(vec4 q, vec3 v) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

void main() {
  vec3 p = qrot(i_quat, a_pos * i_scale) + i_pos;
  v_nrm = qrot(i_quat, a_nrm);
  v_lnrm = a_nrm;
  v_local = a_pos;
  v_scale = i_scale;
  v_col = i_col;
  v_world = p;
  float ax = step(0.0, a_pos.x), ay = step(0.0, a_pos.y), az = step(0.0, a_pos.z);
  vec4 sel = mix(i_ao0, i_ao1, az);
  v_ao = mix(mix(sel.x, sel.y, ax), mix(sel.z, sel.w, ax), ay);
  vec4 vp = u_view * vec4(p, 1.0);
  v_depth = -vp.z;
  gl_Position = u_proj * vp;
}`,

  fragment: `#version 300 es
precision highp float;
precision highp sampler2DShadow;

in vec3 v_nrm;
in vec3 v_lnrm;
in vec3 v_local;
in vec3 v_scale;
in vec4 v_col;
in vec3 v_world;
in float v_depth;
in float v_ao;

uniform vec4 u_lights[16];     // xyz posición, w radio
uniform vec3 u_lightCols[16];
uniform int u_numLights;

uniform vec3 u_spotPos;
uniform vec3 u_spotDir;
uniform vec3 u_spotCol;
uniform vec2 u_spotCone;       // cos interior, cos exterior
uniform mat4 u_shadowMat;
uniform sampler2DShadow u_shadowMap;
uniform float u_shadowOn;
uniform float u_shadowTexel;
uniform mat4 u_shadowMat2;           // sombra de la antorcha más cercana (luz 0)
uniform sampler2DShadow u_shadowMap2;
uniform float u_shadowOn2;

uniform vec3 u_ambient;
uniform vec3 u_camPos;
uniform vec3 u_fogColor;
uniform float u_fogNear;
uniform float u_fogFar;
uniform float u_edge;
uniform float u_glass;          // 1 en la pasada de cristales

out vec4 o_color;

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Ventana con habitación detrás ("interior mapping"): se traza un rayo dentro de una
// caja virtual (fondo, paredes, suelo y techo) para ver el piso con profundidad real.
vec3 interiorWindow(vec3 n, float seed, out float emis) {
  vec3 an = abs(v_lnrm);
  vec3 sc = v_scale;
  // la cara grande es la que mira hacia fuera (eje más fino de la caja)
  float thin = min(sc.x, min(sc.y, sc.z));
  float faceThin = an.x > 0.5 ? sc.x : (an.y > 0.5 ? sc.y : sc.z);
  emis = 0.0;
  if (faceThin > thin + 0.0001 || an.y > 0.5) return vec3(0.05, 0.05, 0.055);   // marco
  vec3 T = an.x > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  float wu = an.x > 0.5 ? sc.z : sc.x, wv = sc.y;
  vec3 lp = v_local * sc;
  vec2 q = vec2(dot(lp, T), lp.y);
  vec3 r = normalize(v_world - u_camPos);
  float rn = max(dot(r, -n), 0.02);
  float ru = dot(r, T), rv = r.y;
  float hu = wu * 0.85 + 0.6, hv = wv * 0.62 + 0.35, D = 2.8;
  float tb = D / rn;
  float tu = abs(ru) < 1e-4 ? 1e9 : ((ru > 0.0 ? hu : -hu) - q.x) / ru;
  float tv = abs(rv) < 1e-4 ? 1e9 : ((rv > 0.0 ? hv : -hv) - q.y) / rv;
  float t = min(tb, min(tu, tv));
  vec2 hp = q + vec2(ru, rv) * t;
  float dep = rn * t / D;                      // 0 = ventana, 1 = fondo
  float lit = step(0.5, seed);
  float k = fract(seed * 7.13);
  vec3 wall = mix(vec3(0.55, 0.47, 0.38), vec3(0.42, 0.5, 0.55), step(0.5, fract(seed * 13.7)));
  wall = mix(wall, vec3(0.6, 0.35, 0.3), step(0.8, fract(seed * 5.3)));
  vec3 c;
  if (t == tb) {
    c = wall;
    // muebles al fondo: sofá o estantería, y un cuadro
    float fu = fract(seed * 3.7) * 2.0 - 1.0;
    if (hp.y < -hv + 0.55 && abs(hp.x - fu * hu * 0.4) < hu * 0.45) c = mix(vec3(0.25, 0.12, 0.1), vec3(0.15, 0.2, 0.3), step(0.5, fract(seed * 9.1)));
    else if (abs(hp.y - 0.15) < 0.28 && abs(hp.x + fu * hu * 0.3) < 0.35) c = vec3(0.2, 0.25, 0.18) + 0.25 * fract(seed * 17.0);
    else if (fract(seed * 2.3) > 0.6 && abs(hp.x - hu * 0.7) < 0.3 && hp.y < hv - 0.4) c = vec3(0.3, 0.2, 0.12);
  } else if (t == tu) c = wall * 0.8;
  else if (rv < 0.0) c = mix(vec3(0.28, 0.18, 0.1), vec3(0.3, 0.3, 0.32), step(0.6, fract(seed * 4.1)));   // suelo
  else c = vec3(0.62, 0.6, 0.56);                                                                        // techo
  vec3 col;
  if (lit > 0.5) {
    // lámpara del techo: más luz cerca del centro y del techo
    vec3 lc = mix(vec3(1.0, 0.72, 0.42), vec3(0.75, 0.85, 1.0), step(0.75, k));
    float fall = 1.0 / (1.0 + 2.5 * dot(vec2(hp.x / hu, (hp.y - hv) / hv), vec2(hp.x / hu, (hp.y - hv) / hv)) + 1.5 * dep);
    col = pow(c, vec3(2.2)) * lc * (0.35 + 1.4 * fall) * (0.6 + 0.4 * k);
    // cortinas en los lados
    if (abs(q.x) > wu * 0.36 && fract(seed * 11.0) > 0.4) col = pow(vec3(0.5, 0.28, 0.22), vec3(2.2)) * lc * 0.5;
    emis = 1.0;
  } else {
    // a oscuras: se intuye la habitación con la luz de la calle
    col = pow(c, vec3(2.2)) * (0.015 + 0.02 * (1.0 - dep)) + u_ambient * 0.3;
    // a veces el brillo azulado de una tele
    if (fract(seed * 19.0) > 0.85) col += vec3(0.05, 0.08, 0.16) * (0.6 + 0.4 * sin(u_fogNear * 0.0 + seed * 50.0));
  }
  // marco y cruceta de la ventana
  vec2 eb = vec2(wu, wv) * 0.5 - abs(q);
  if (min(eb.x, eb.y) < 0.05 || abs(q.x) < 0.025) { col = vec3(0.04); emis = 0.0; }
  // reflejo del cristal
  vec3 V = -r;
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  col = mix(col, u_fogColor * 1.6 + vec3(0.02), fres * 0.6);
  return col;
}

float shadowAt(vec3 wp, vec3 n) {
  if (u_shadowOn < 0.5) return 1.0;
  vec4 sp = u_shadowMat * vec4(wp + n * 0.025, 1.0);
  vec3 p = sp.xyz / sp.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float t = u_shadowTexel;
  float z = p.z - 0.0006;
  float s = texture(u_shadowMap, vec3(p.xy + vec2(-t, -t), z));
  s += texture(u_shadowMap, vec3(p.xy + vec2( t, -t), z));
  s += texture(u_shadowMap, vec3(p.xy + vec2(-t,  t), z));
  s += texture(u_shadowMap, vec3(p.xy + vec2( t,  t), z));
  return s * 0.25;
}

float shadowAt2(vec3 wp, vec3 n) {
  vec4 sp = u_shadowMat2 * vec4(wp + n * 0.04, 1.0);
  if (sp.w <= 0.0) return 1.0;
  vec3 p = sp.xyz / sp.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float t = 1.0 / 1024.0;
  float z = p.z - 0.0012;
  float s = texture(u_shadowMap2, vec3(p.xy + vec2(-t, -t), z));
  s += texture(u_shadowMap2, vec3(p.xy + vec2( t, -t), z));
  s += texture(u_shadowMap2, vec3(p.xy + vec2(-t,  t), z));
  s += texture(u_shadowMap2, vec3(p.xy + vec2( t,  t), z));
  return 0.12 + 0.88 * s * 0.25;
}

void main() {
  vec3 n = normalize(v_nrm);

  if (v_col.a < -1.5) {
    // ventana con piso detrás (sin tonemapping de nuevo: se calcula en lineal)
    float em;
    vec3 wc = interiorWindow(n, -v_col.a - 2.0, em);
    vec3 cc = (wc * (2.51 * wc + 0.03)) / (wc * (2.43 * wc + 0.59) + 0.14);
    cc = pow(clamp(cc, 0.0, 1.0), vec3(1.0 / 2.2));
    float fog0 = smoothstep(u_fogNear, u_fogFar, v_depth);
    o_color = vec4(mix(cc, u_fogColor, fog0), 1.0);
    return;
  }

  // Bordes de cada cara ligeramente oscurecidos (lectura del vóxel)
  vec3 d = (0.5 - abs(v_local)) * v_scale;
  vec3 an = abs(v_lnrm);
  float e = an.x > 0.5 ? min(d.y, d.z) : (an.y > 0.5 ? min(d.x, d.z) : min(d.x, d.y));
  float shade = mix(0.78, 1.0, smoothstep(0.0, u_edge, e));

  vec3 base = pow(max(v_col.rgb, vec3(0.0)), vec3(2.2));
  vec3 V = normalize(u_camPos - v_world);
  float ao = clamp(v_ao, 0.0, 1.2);

  vec3 diff = u_ambient * (0.6 + 0.4 * n.y) * ao;
  vec3 spec = vec3(0.0);
  // alfa > 0: emisivo · alfa < 0: material brillante (metal, agua, ácido, cristal)
  float emis = max(v_col.a, 0.0), shiny = clamp(-v_col.a, 0.0, 1.0);
  float sAmt = mix(0.22, 2.4, shiny), sExp = mix(18.0, 90.0, shiny);

  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec3 L = u_lights[i].xyz - v_world;
    float dist = length(L);
    float att = clamp(1.0 - dist / u_lights[i].w, 0.0, 1.0);
    att *= att;
    vec3 l = L / max(dist, 0.001);
    float ndl = max(dot(n, l), 0.0);
    float ts = (i == 0 && u_shadowOn2 > 0.5 && ndl > 0.0) ? shadowAt2(v_world, n) : 1.0;
    diff += u_lightCols[i] * ndl * att * ts * (0.45 + 0.55 * ao);
    vec3 h = normalize(l + V);
    spec += u_lightCols[i] * pow(max(dot(n, h), 0.0), sExp) * att * ts * 0.18 * sAmt;
  }

  // Linterna con sombras
  float sh = shadowAt(v_world, n);
  {
    vec3 L = u_spotPos - v_world;
    float dist = length(L);
    vec3 l = L / max(dist, 0.001);
    float c = dot(-l, u_spotDir);
    float cone = smoothstep(u_spotCone.y, u_spotCone.x, c);
    float att = 1.0 / (1.0 + 0.05 * dist * dist + 0.15 * dist);
    float ndl = max(dot(n, l), 0.0);
    diff += u_spotCol * ndl * att * cone * sh * (0.6 + 0.4 * ao);
    vec3 h = normalize(l + V);
    spec += u_spotCol * pow(max(dot(n, h), 0.0), sExp * 1.4) * att * cone * sh * 0.25 * sAmt;
  }

  vec3 col = (base * diff + spec * 0.6) * shade;
  // reflejo tenue del entorno en las superficies brillantes (bordes de Fresnel)
  float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0) * shiny;
  col += u_ambient * 6.0 * fres + spec * 0.2 * shiny;
  col = mix(col, base * 2.2, emis);

  // Tonemapping filmico (ACES aprox.)
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

  float fog = smoothstep(u_fogNear, u_fogFar, v_depth);
  col = mix(col, u_fogColor, fog);
  if (u_glass > 0.5) {
    // cristal: casi transparente de frente, más reflejo en ángulo y con los brillos
    float ndv = max(dot(n, V), 0.0);
    float a = 0.12 + pow(1.0 - ndv, 3.0) * 0.55 + clamp(dot(spec, vec3(0.3, 0.5, 0.2)) * 0.6, 0.0, 0.5);
    o_color = vec4(col + vec3(0.015, 0.02, 0.03), clamp(a, 0.0, 0.85));
    return;
  }
  o_color = vec4(col, 1.0);
}`,

  depthVertex: `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=2) in vec3 i_pos;
layout(location=3) in vec3 i_scale;
layout(location=4) in vec4 i_quat;
layout(location=5) in vec4 i_col;
uniform mat4 u_lightVP;
vec3 qrot(vec4 q, vec3 v) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}
void main() {
  vec3 p = qrot(i_quat, a_pos * i_scale) + i_pos;
  // los objetos totalmente emisivos (llamas, chispas) no proyectan sombra
  gl_Position = i_col.a > 0.95 ? vec4(2.0, 2.0, 2.0, 1.0) : u_lightVP * vec4(p, 1.0);
}`,

  depthFragment: `#version 300 es
precision mediump float;
out vec4 o;
void main() { o = vec4(1.0); }`,
};
