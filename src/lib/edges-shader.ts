const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_hover;
uniform vec3 u_anil;
uniform vec3 u_coral;
uniform vec3 u_gelo;
uniform vec3 u_base;
out vec4 o;

const float THICK = 0.36;  // até onde a luz avança no trecho mais forte, em frações do lado menor
const float BAND = 0.4;    // largura da rampa: luz rasa fica na cor de fora, funda chega à mais clara
const float SOFT = 0.5;    // transição entre as cores (0 = degrau, 1 = gradiente)
const float GRAIN = 0.32;  // quanto o grão espalha os pixels entre as faixas

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float noise3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v / 0.875;
}
float grain(vec2 p) {
  uvec2 q = uvec2(ivec2(p) + 4096);
  uint h = (q.x * 1597334677u) ^ (q.y * 3812015801u);
  h = (h ^ (h >> 16u)) * 0x45d9f3bu;
  h ^= h >> 16u;
  return float(h) / 4294967295.0;
}

void main() {
  float m = min(u_res.x, u_res.y);
  vec2 size = u_res / m;
  vec2 p = gl_FragCoord.xy / m;
  float t = u_time * 0.06;

  // distância até a borda mais próxima, cantos arredondados por um mínimo suave; a luz avança menos
  // nas bordas que encostam no texto: em cima e embaixo no desktop, nas laterais no celular
  float asp = size.x / size.y;
  vec2 d2 = min(p, size - p) * vec2(mix(1.0, 1.7, smoothstep(0.95, 0.6, asp)), mix(1.0, 1.6, smoothstep(1.1, 1.9, asp)));
  float k = 0.08;
  float h = clamp(0.5 + 0.5 * (d2.y - d2.x) / k, 0.0, 1.0);
  float edge = mix(d2.y, d2.x, h) - k * h * (1.0 - h);

  // espessura fluida: trechos da borda apagam de vez, em outros a luz avança
  vec2 q = p * 1.3;
  vec2 w = vec2(noise3(q + vec2(0.0, t)), noise3(q + vec2(5.2, -t * 0.8)));
  float n = noise3(q + 1.8 * w + vec2(t * 0.7, -t * 0.4));
  float thick = THICK * smoothstep(0.3, 0.85, n);

  // ponteiro perto da borda: a luz estica até ele
  vec2 md = p - u_mouse * size;
  thick += 0.3 * u_hover * exp(-dot(md, md) * 6.0);

  float shape0 = clamp((thick - edge) / BAND, 0.0, 1.0);
  float shape = shape0 + GRAIN * (grain(gl_FragCoord.xy) - 0.5);

  // Nuvens lentas variam a tonalidade da mesma cor da marca, como uma nebulosa.
  float clouds = noise3(p * 2.1 + 1.4 * w + vec2(-t * 0.25, t * 0.18));
  float detail = noise(p * 7.0 + w * 2.0);
  float tone = clamp(clouds * 0.85 + detail * 0.15, 0.0, 1.0);
  vec3 nebula = mix(u_anil, u_coral, smoothstep(0.2, 0.66, tone));
  nebula = mix(nebula, u_gelo, smoothstep(0.58, 0.9, tone) * 0.72);

  // rampa de 4 cores sobre o fundo
  float s = clamp(shape - 0.125, 0.0, 1.0);
  float alpha = smoothstep(0.0, SOFT, clamp(s * 4.0, 0.0, 1.0));
  float x = s * 3.0;
  float lo = 0.5 - 0.5 * SOFT, hi = 0.5 + 0.5 * SOFT;
  vec3 col = u_anil;
  col = mix(col, u_coral, smoothstep(lo, hi, clamp(x, 0.0, 1.0)));
  col = mix(col, u_gelo, smoothstep(lo, hi, clamp(x - 1.0, 0.0, 1.0)));
  col = mix(col, u_anil, smoothstep(lo, hi, clamp(x - 2.0, 0.0, 1.0)));
  col = mix(col, nebula, 0.78);
  alpha *= mix(0.78, 1.12, smoothstep(0.2, 0.82, clouds));
  // o escuro fica escuro: o grão não leva pontos claros para longe da luz
  float light = alpha * smoothstep(0.0, 0.3, shape0);
  col *= light;
  o = vec4(mix(u_base, col, light), 1.0);
}`;
const vertexSource = `#version 300 es
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

/** Browser-only entry point: no graphics or DOM work at module evaluation. */
export function mountEdgesShader(host: HTMLElement): () => void {
  const stage = host.parentElement;
  if (!stage) return () => {};
  const canvas = document.createElement("canvas");
  host.prepend(canvas);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl) { host.classList.add("no-gl"); return () => canvas.remove(); }
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    shaders.forEach(s => gl.deleteShader(s));
    if (program) gl.deleteProgram(program);
    host.classList.add("no-gl"); canvas.remove(); return () => {};
  }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program);
    host.classList.add("no-gl"); canvas.remove(); return () => {};
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao); gl.useProgram(program);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const res = uniform("u_res"), time = uniform("u_time"), mouse = uniform("u_mouse"), hover = uniform("u_hover");
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = 1;
  const ctx = colorCanvas.getContext("2d", { willReadFrequently: true });
  const probe = document.createElement("span");
  host.append(probe);
  const palette = () => {
    for (const [name, token] of [["u_anil", "--edge-deep"], ["u_coral", "--edge-mid"], ["u_gelo", "--edge-ice"], ["u_base", "--background"]] as const) {
      if (!ctx) continue;
      probe.style.color = `var(${token})`;
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1);
      const c = ctx.getImageData(0, 0, 1, 1).data;
      gl.uniform3f(uniform(name), (c[0] ?? 0) / 255, (c[1] ?? 0) / 255, (c[2] ?? 0) / 255);
    }
  };
  let frame = 0, last = 0, visible = true, disposed = false;
  let x = 0.5, y = 0.5, tx = 0.5, ty = 0.5, h = 0, th = 0;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const started = performance.now();
  const draw = (stamp: number, still = false) => {
    const dt = Math.min(100, Math.max(1, stamp - last));
    x += (tx - x) * (1 - Math.pow(0.94, dt / 16.667));
    y += (ty - y) * (1 - Math.pow(0.94, dt / 16.667));
    h += (th - h) * (1 - Math.pow(0.96, dt / 16.667));
    if (still) { x = tx; y = ty; h = th; }
    gl.uniform2f(res, canvas.width, canvas.height);
    gl.uniform1f(time, motion.matches ? 18 : (stamp - started) / 1000);
    gl.uniform2f(mouse, x, y); gl.uniform1f(hover, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    last = stamp;
  };
  const tick = (stamp: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden || motion.matches) return;
    if (stamp - last >= 33) draw(stamp);
    frame = requestAnimationFrame(tick);
  };
  const resume = () => {
    cancelAnimationFrame(frame); frame = 0;
    if (disposed || !visible || document.hidden) return;
    if (motion.matches) draw(performance.now(), true);
    else frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    const top = Math.max(0, bounds.top);
    const height = Math.max(1, window.innerHeight - top);
    host.style.left = `${Math.max(0, bounds.left)}px`;
    host.style.top = `${top}px`;
    host.style.width = `${bounds.width}px`;
    host.style.height = `${height}px`;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    palette(); draw(performance.now(), motion.matches);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const bounds = host.getBoundingClientRect();
    tx = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
    ty = 1 - Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height));
    th = 1;
    if (motion.matches) draw(performance.now(), true);
  };
  const leave = () => { th = 0; if (motion.matches) draw(performance.now(), true); };
  const ro = new ResizeObserver(resize); ro.observe(stage);
  const io = new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting); resume();
  }, { rootMargin: "100px" }); io.observe(stage);
  const themes = new MutationObserver(() => { palette(); if (motion.matches) draw(performance.now(), true); });
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerleave", leave);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", resume);
  motion.addEventListener("change", resume);
  resize(); resume();
  return () => {
    disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); themes.disconnect();
    stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerleave", leave);
    window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", resume);
    motion.removeEventListener("change", resume);
    shaders.forEach(s => gl.deleteShader(s)); gl.deleteVertexArray(vao); gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove(); probe.remove();
  };
}
