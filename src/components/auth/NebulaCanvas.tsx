import { useEffect, useRef } from "react";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);for(int i=0;i<6;i++){v+=a*n(p);p=R*p*2.02;a*=.5;}return v;}
float stars(vec2 uv,float s,float th){vec2 g=uv*s;vec2 id=floor(g);vec2 f=fract(g)-.5;float rnd=h(id);
if(rnd<th)return 0.;vec2 o=vec2(h(id+3.1),h(id+7.7))-.5;float d=length(f-o*.7);
float tw=.6+.4*sin(t*(1.+rnd*3.)+rnd*40.);return smoothstep(.06,0.,d)*tw*(rnd-th)/(1.-th);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;uv+=m*.03;
vec2 q=uv*1.6;float tt=t*.025;
vec2 w=vec2(fbm(q+tt),fbm(q+vec2(5.2,1.3)-tt));
float d=fbm(q+2.2*w+vec2(tt*.6,0.));
float core=exp(-2.4*length(uv-vec2(-.05,-.05)+.25*(w-.5)));
float dust=smoothstep(.55,.85,fbm(q*2.3+w*3.+9.));
vec3 deep=vec3(.01,.01,.04);vec3 blue=vec3(.08,.08,.35);vec3 vio=vec3(.42,.16,.75);vec3 mag=vec3(.75,.25,.85);vec3 cyan=vec3(.2,.8,1.);vec3 hot=vec3(1.,.95,1.);
float g=d*(.6+core*1.6);
vec3 c=deep;c=mix(c,blue,smoothstep(.2,.55,g));c=mix(c,vio,smoothstep(.45,.85,g));c=mix(c,mag,smoothstep(.75,1.1,g)*.7);
c=mix(c,cyan,smoothstep(.6,1.,w.y)*core*.5);c+=hot*pow(core,2.2)*smoothstep(.35,.8,d)*1.1;
c*=1.-dust*.45;
float s=stars(uv,60.,.94)+stars(uv+3.,140.,.97)*.7+stars(uv+7.,22.,.985)*1.6;
c+=vec3(.85,.93,1.)*s;
c*=smoothstep(1.7,.4,length(uv));
gl_FragColor=vec4(c,1.);}`;

export function NebulaCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false }); if (!gl) return;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram()!; gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uM = gl.getUniformLocation(pr, "m");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => { const rc = cv.getBoundingClientRect(); mouse.tx = (e.clientX - rc.left) / rc.width - .5; mouse.ty = .5 - (e.clientY - rc.top) / rc.height; };
    window.addEventListener("pointermove", onMove);
    const resize = () => { const dpr = Math.min(window.devicePixelRatio || 1, 1.5); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; gl.viewport(0, 0, cv.width, cv.height); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(cv);
    let raf = 0, last = 0; const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 33) return; last = now;
      mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 20 : (now - start) / 1000); gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduce) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
