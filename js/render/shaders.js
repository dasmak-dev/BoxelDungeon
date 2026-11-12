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

uniform vec3 u_ambient;
uniform vec3 u_camPos;
uniform vec3 u_fogColor;
uniform float u_fogNear;
uniform float u_fogFar;
uniform float u_edge;

out vec4 o_color;

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

void main() {
  vec3 n = normalize(v_nrm);

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

  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec3 L = u_lights[i].xyz - v_world;
    float dist = length(L);
    float att = clamp(1.0 - dist / u_lights[i].w, 0.0, 1.0);
    att *= att;
    vec3 l = L / max(dist, 0.001);
    float ndl = max(dot(n, l), 0.0);
    diff += u_lightCols[i] * ndl * att * (0.45 + 0.55 * ao);
    vec3 h = normalize(l + V);
    spec += u_lightCols[i] * pow(max(dot(n, h), 0.0), 28.0) * att * 0.18;
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
    spec += u_spotCol * pow(max(dot(n, h), 0.0), 40.0) * att * cone * sh * 0.25;
  }

  vec3 col = (base * diff + spec * 0.6) * shade;
  col = mix(col, base * 2.2, v_col.a);

  // Tonemapping filmico (ACES aprox.)
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

  float fog = smoothstep(u_fogNear, u_fogFar, v_depth);
  col = mix(col, u_fogColor, fog);
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
