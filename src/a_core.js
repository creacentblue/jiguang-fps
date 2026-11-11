'use strict';
/* 寂光回路 V2 · Faustus Studio · 浮士德工作室 —— 单文件 3D FPS（自研 WebGL2/WebGL1 渲染器：阴影贴图、HDR 泛光、平面反射、程序化模型，零外部依赖） */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2,D2R=Math.PI/180;
const R=(a,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const dist2=(a,b,c,d)=>(a-c)*(a-c)+(b-d)*(b-d);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const CFG={sens:1,fov:78,vol:70,diff:1,inv:false,q:1,ql:-1,dyn:true,flash:true};
try{Object.assign(CFG,JSON.parse(localStorage.getItem('jgcfg2')||'{}'))}catch(e){}
function saveCfg(){try{localStorage.setItem('jgcfg2',JSON.stringify(CFG))}catch(e){}}
const DBG=/[?&]test=1/.test(location.search);
const QP=[
 {n:'低',sh:0,shsz:0,bloom:0,msaa:0,refl:0,bump:0,beams:0,decals:24,part:.5,post:0,lod:1},
 {n:'中',sh:1,shsz:1024,bloom:2,msaa:0,refl:0,bump:1,beams:1,decals:48,part:.8,post:1,lod:1},
 {n:'高',sh:3,shsz:1024,bloom:3,msaa:4,refl:1,bump:1,beams:2,decals:96,part:1,post:1,lod:0},
 {n:'极高',sh:3,shsz:2048,bloom:4,msaa:4,refl:1,bump:1,beams:3,decals:160,part:1.4,post:1,lod:0,ca:1,grain:1}];

/* ---------- mat4 (列主序) ---------- */
const M4={
 id(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
 T(x,y,z){const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m},
 RX(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
 RY(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
 RZ(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])},
 S(x,y,z){return new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1])},
 persp(fov,asp,n,f){const t=1/Math.tan(fov/2);return new Float32Array([t/asp,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])},
 look(ex,ey,ez,fx,fy,fz){let rx=-fz,rz=fx;const rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;
  const ux=-rz*fy,uy=rz*fx-rx*fz,uz=rx*fy;
  return new Float32Array([rx,ux,-fx,0,0,uy,-fy,0,rz,uz,-fz,0,-(rx*ex+rz*ez),-(ux*ex+uy*ey+uz*ez),fx*ex+fy*ey+fz*ez,1])},
 lookAt(e,f,up){ // f 为单位前向
  let rx=f[1]*up[2]-f[2]*up[1],ry=f[2]*up[0]-f[0]*up[2],rz=f[0]*up[1]-f[1]*up[0];const rl=Math.hypot(rx,ry,rz)||1;rx/=rl;ry/=rl;rz/=rl;
  const ux=ry*f[2]-rz*f[1],uy=rz*f[0]-rx*f[2],uz=rx*f[1]-ry*f[0];
  return new Float32Array([rx,ux,-f[0],0,ry,uy,-f[1],0,rz,uz,-f[2],0,-(rx*e[0]+ry*e[1]+rz*e[2]),-(ux*e[0]+uy*e[1]+uz*e[2]),f[0]*e[0]+f[1]*e[1]+f[2]*e[2],1])},
 // 把局部 +Y 对齐到方向 d
 alignY(dx,dy,dz){let ax=1,ay=0,az=0;if(Math.abs(dx)>.9){ax=0;ay=0;az=1}
  let zx=dy*az-dz*ay,zy=dz*ax-dx*az,zz=dx*ay-dy*ax;const zl=Math.hypot(zx,zy,zz)||1;zx/=zl;zy/=zl;zz/=zl;
  const xx=dy*zz-dz*zy,xy=dz*zx-dx*zz,xz=dx*zy-dy*zx;
  return new Float32Array([xx,xy,xz,0,dx,dy,dz,0,zx,zy,zz,0,0,0,0,1])}
};
function Mt(M,x,y,z){const o=new Float32Array(M);o[12]=M[0]*x+M[4]*y+M[8]*z+M[12];o[13]=M[1]*x+M[5]*y+M[9]*z+M[13];o[14]=M[2]*x+M[6]*y+M[10]*z+M[14];return o}

/* ---------- GL 上下文：优先 WebGL2，回退 WebGL1 ---------- */
const cv=$('gl');
let gl=null,GL2=false;
const ctxOpt={antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:DBG};
if(!/[?&]gl=1/.test(location.search)){gl=cv.getContext('webgl2',ctxOpt);GL2=!!gl}
if(!gl)gl=cv.getContext('webgl',ctxOpt)||cv.getContext('experimental-webgl',ctxOpt);
if(!gl){document.body.innerHTML='<p style="color:#fff;padding:40px;font-size:20px">你的浏览器不支持 WebGL，无法运行本游戏。请换用最新版 Chrome / Edge / Firefox。</p>';throw new Error('no webgl')}
const EXT={anis:gl.getExtension('EXT_texture_filter_anisotropic'),deriv:GL2?true:!!gl.getExtension('OES_standard_derivatives')};
let HDR=false,HINT=0,HTYPE=0,GPUNAME='';
try{const di=gl.getExtension('WEBGL_debug_renderer_info');GPUNAME=di?gl.getParameter(di.UNMASKED_RENDERER_WEBGL):''}catch(e){}
function detectHDR(){
  let ok=false;
  if(GL2){const a=gl.getExtension('EXT_color_buffer_float'),b=gl.getExtension('EXT_color_buffer_half_float');if(a||b){HINT=gl.RGBA16F;HTYPE=gl.HALF_FLOAT;ok=true}}
  else{const hf=gl.getExtension('OES_texture_half_float'),cb=gl.getExtension('EXT_color_buffer_half_float'),lin=gl.getExtension('OES_texture_half_float_linear');if(hf&&cb&&lin){HINT=gl.RGBA;HTYPE=hf.HALF_FLOAT_OES;ok=true}}
  if(ok){ // 试建一个 FBO 验证
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,HINT,4,4,0,gl.RGBA,HTYPE,null);
    const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(f);gl.deleteTexture(t);
  }
  HDR=ok;
}
detectHDR();
function shSrc(src,frag){
  if(GL2)return '#version 300 es\n'+(frag?'precision highp float;\nout vec4 fragColor;\n#define varying in\n#define texture2D texture\n#define gl_FragColor fragColor\n':'#define attribute in\n#define varying out\n')+'#define HAS_DERIV 1\n'+src;
  return (frag?(EXT.deriv?'#extension GL_OES_standard_derivatives : enable\n':'')+'#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n'+(EXT.deriv?'#define HAS_DERIV 1\n':''):'')+src;
}
function mkProg(vs,fs,attrs){
  const p=gl.createProgram();
  for(const [t,s] of [[gl.VERTEX_SHADER,shSrc(vs,false)],[gl.FRAGMENT_SHADER,shSrc(fs,true)]]){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh)}
  attrs.forEach((a,i)=>gl.bindAttribLocation(p,i,a));
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name.replace('[0]','')]=gl.getUniformLocation(p,inf.name)}
  return {p,u};
}
/* ---------- 着色器 ---------- */
const PACK=`vec4 packD(float d){vec4 e=fract(d*vec4(1.,255.,65025.,16581375.));e-=e.yzww*vec4(1./255.,1./255.,1./255.,0.);return e;}
float unpackD(vec4 c){return dot(c,vec4(1.,1./255.,1./65025.,1./16581375.));}`;
function slotCode(k){return `
 if(uSLP[${k}].w>0.){vec3 d=uSLP[${k}].xyz-vW;float dd=dot(d,d);float r=uSLP[${k}].w;float a=clamp(1.-dd/(r*r),0.,1.);a*=a;vec3 L=d*inversesqrt(dd+1e-4);
  float ndl=max(dot(n,L),0.);float cone=1.;${k===0?'cone=smoothstep(uSDir.w,uSDir.w+.1,dot(-L,uSDir.xyz));':''}
  float sh=1.;if(uSEn[${k}]>.5&&uMode<1.5){vec4 lp=uSM${k}*vec4(vW+vN*.04,1.);if(lp.w>0.){vec3 pp=lp.xyz/lp.w;vec2 uv=pp.xy*.5+.5;float edge=max(abs(pp.x),abs(pp.y));
    if(edge<1.){float dz=(sqrt(dd)-.05-.12*(1.-ndl))/uSFar[${k}];sh=0.;
     for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){sh+=step(dz,unpackD(texture2D(uSh${k},uv+vec2(float(i),float(j))*uTexel*(1.+uSoft))));}
     sh/=9.;sh=mix(sh,1.,smoothstep(.85,1.,edge));}}}
  float w=a*cone*sh;lit+=uSLC[${k}]*w*(ndl*.85+.15*${k===0?'0.':'1.'});
  vec3 H=normalize(L+V);spc+=uSLC[${k}]*w*pow(max(dot(n,H),0.),uGloss)*step(0.,ndl);}`}
const VS_W=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;attribute vec4 aC;
uniform mat4 uVP;varying vec3 vW;varying vec3 vN;varying vec2 vT;varying vec4 vC;varying float vD;
void main(){vec4 p=uVP*vec4(aP,1.);gl_Position=p;vW=aP;vN=aN;vT=aT;vC=aC;vD=p.w;}`;
const FS_W=PACK+`uniform sampler2D uTex;uniform sampler2D uSh0;uniform sampler2D uSh1;uniform sampler2D uSh2;uniform sampler2D uRefl;
uniform vec4 uLP[8];uniform vec3 uLC[8];uniform vec3 uAmb;uniform vec3 uFog;uniform vec3 uEye;uniform float uFogD;uniform float uMode;uniform vec3 uFlash;uniform vec3 uHit;
uniform float uEnc;uniform float uTM;uniform float uSpec;uniform float uGloss;uniform float uBump;uniform float uWet;uniform float uTime;uniform float uReflOn;uniform float uTexel;uniform float uSoft;uniform float uClip;uniform vec2 uInvRes;
uniform vec4 uSLP[3];uniform vec3 uSLC[3];uniform vec4 uSDir;uniform float uSEn[3];uniform float uSFar[3];uniform mat4 uSM0;uniform mat4 uSM1;uniform mat4 uSM2;
varying vec3 vW;varying vec3 vN;varying vec2 vT;varying vec4 vC;varying float vD;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
#ifdef HAS_DERIV
vec3 bumpN(vec3 n,float h){vec3 dpx=dFdx(vW),dpy=dFdy(vW);float hx=dFdx(h),hy=dFdy(h);vec3 r1=cross(dpy,n),r2=cross(n,dpx);float det=dot(dpx,r1);vec3 g=sign(det)*(hx*r1+hy*r2);return normalize(abs(det)*n-g);}
#endif
void main(){
 if(uClip>.5&&vW.y<.02)discard;
 vec4 t=texture2D(uTex,vT);vec3 base=t.rgb*vC.rgb;vec3 n=normalize(vN);float em=vC.a;
 float mx=max(t.r,max(t.g,t.b));vec3 gl2=t.rgb*vC.rgb*smoothstep(.86,1.,mx)*1.6*step(1.5,uGloss);
 vec3 V=normalize(uEye-vW);vec3 lit;vec3 spc=vec3(0.);
 if(uMode>.5&&uMode<1.5){
  #ifdef HAS_DERIV
  #endif
  vec3 Ld=normalize(vec3(.35,.8,.5));float nl=max(dot(n,Ld),0.);vec3 Vv=vec3(0.,0.,1.);vec3 H=normalize(Ld+Vv);
  lit=uAmb*.9+vec3(.9,.95,1.)*nl*.75+uFlash;
  spc=vec3(.9,.95,1.)*pow(max(dot(n,H),0.),uGloss)*.9+vec3(.2,.9,1.)*pow(1.-max(n.z,0.),3.)*.35;
  float lm=dot(base,vec3(.33));
  vec3 col=base*lit*(1.-em)+base*em*1.5+spc*uSpec*(.4+lm)+uHit;
  col*=uEnc;gl_FragColor=vec4(col,1.);return;
 }
 float sp=uSpec;
 #ifdef HAS_DERIV
 if(uBump>0.&&uMode<1.5)n=bumpN(n,dot(t.rgb,vec3(.3,.55,.15))*uBump);
 #endif
 float puddle=1.;
 if(uWet>0.){puddle=smoothstep(.35,.65,vnoise(vW.xz*.45+3.)*.6+vnoise(vW.xz*1.7)*.4);sp*=(.5+puddle);n=normalize(mix(n,vN,puddle*.8));}
 lit=uAmb*(.55+.45*n.y);
 for(int i=0;i<8;i++){vec3 d=uLP[i].xyz-vW;float r=uLP[i].w;if(r>0.){float dd=dot(d,d);float a=clamp(1.-dd/(r*r),0.,1.);a*=a;vec3 L=d*inversesqrt(dd+1e-4);float ndl=max(dot(n,L),0.);lit+=uLC[i]*a*(ndl*.8+.2);
  if(uMode<1.5){vec3 H=normalize(L+V);spc+=uLC[i]*a*pow(max(dot(n,H),0.),uGloss)*step(0.,ndl);}}}
 `+slotCode(0)+slotCode(1)+slotCode(2)+`
 lit*=mix(.62,1.,smoothstep(0.,1.6,vW.y));
 float lm=dot(base,vec3(.33));
 vec3 col=base*lit*(1.-em)+base*em*1.5+gl2;
 if(uMode<1.5){col+=spc*sp*(.25+lm*1.2)*(1.-em);}
 if(uWet>0.&&uReflOn>.5&&uMode<1.5){vec2 suv=gl_FragCoord.xy*uInvRes;vec2 off=(n.xz-vN.xz)*.35+(vec2(vnoise(vW.xz*6.+uTime*.1),vnoise(vW.xz*6.+9.))-.5)*.012*puddle;
  vec3 rf=(texture2D(uRefl,suv+off).rgb+texture2D(uRefl,suv+off+vec2(.004,0.)).rgb+texture2D(uRefl,suv+off-vec2(.004,0.)).rgb)*.3333/uEnc;
  float fr=pow(1.-max(dot(n,V),0.),4.)*.8+.07;col=mix(col,rf*.9+col*.15,clamp(fr*puddle*uWet*1.05,0.,.85));}
 col+=uHit;
 float hf=1.+.9*exp(-max(vW.y,0.)*.5);
 float f=clamp(1.-exp(-vD*uFogD*hf),0.,1.);
 vec3 fc=uFog;
 col=mix(col,fc,f);
 if(uTM>.5)col=col/(1.+col*.18);
 col*=uEnc;gl_FragColor=vec4(col,1.);}`;
const PW=mkProg(VS_W,FS_W,['aP','aN','aT','aC']);
const PS=mkProg(`attribute vec3 aP;attribute vec2 aT;attribute vec4 aC;uniform mat4 uVP;varying vec2 vT;varying vec4 vC;
void main(){gl_Position=uVP*vec4(aP,1.);vT=aT;vC=aC;}`,
`uniform sampler2D uTex;uniform float uEnc;varying vec2 vT;varying vec4 vC;void main(){vec4 t=texture2D(uTex,vT);float a=t.a*vC.a;gl_FragColor=vec4(vC.rgb*a*uEnc,a);}`,['aP','aT','aC']);
const PD=mkProg(`attribute vec3 aP;uniform mat4 uVP;varying vec3 vW;void main(){gl_Position=uVP*vec4(aP,1.);vW=aP;}`,
PACK+`uniform vec3 uLPos;uniform float uFar;varying vec3 vW;void main(){gl_FragColor=packD(clamp(length(vW-uLPos)/uFar,0.,.9999));}`,['aP']);
const VS_Q=`attribute vec2 aP;varying vec2 vUv;void main(){vUv=aP*.5+.5;gl_Position=vec4(aP,0.,1.);}`;
const PB=mkProg(VS_Q,`uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;varying vec2 vUv;
void main(){vec3 c=(texture2D(uTex,vUv+uPx*vec2(-.5,-.5)).rgb+texture2D(uTex,vUv+uPx*vec2(.5,-.5)).rgb+texture2D(uTex,vUv+uPx*vec2(-.5,.5)).rgb+texture2D(uTex,vUv+uPx*vec2(.5,.5)).rgb)*.25;
 float l=max(c.r,max(c.g,c.b));float k=clamp((l-uThr)/(l+.0001),0.,1.);c*=k*k*(3.-2.*k)*1.0+k*.25;gl_FragColor=vec4(min(c,vec3(8.)),1.);}`,['aP']);
const PG=mkProg(VS_Q,`uniform sampler2D uTex;uniform vec2 uDir;varying vec2 vUv;
void main(){vec3 c=texture2D(uTex,vUv).rgb*.227027;
 c+=texture2D(uTex,vUv+uDir*1.3846).rgb*.3162162+texture2D(uTex,vUv-uDir*1.3846).rgb*.3162162;
 c+=texture2D(uTex,vUv+uDir*3.2308).rgb*.0702703+texture2D(uTex,vUv-uDir*3.2308).rgb*.0702703;gl_FragColor=vec4(c,1.);}`,['aP']);
const PC=mkProg(VS_Q,`uniform sampler2D uScene;uniform sampler2D uB0;uniform sampler2D uB1;uniform sampler2D uB2;uniform sampler2D uB3;
uniform vec4 uBW;uniform float uDec;uniform float uTime;uniform float uCA;uniform float uGrain;uniform float uVig;uniform vec2 uRes;uniform vec3 uTint;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec2 d=vUv-.5;float r2=dot(d,d);vec2 o=d*r2*uCA;
 vec3 c;c.r=texture2D(uScene,vUv-o).r;c.g=texture2D(uScene,vUv).g;c.b=texture2D(uScene,vUv+o).b;c*=uDec;
 vec3 b=texture2D(uB0,vUv).rgb*uBW.x+texture2D(uB1,vUv).rgb*uBW.y+texture2D(uB2,vUv).rgb*uBW.z+texture2D(uB3,vUv).rgb*uBW.w;
 c+=b*uDec;
 c*=1.;c=aces(c);c=pow(c,vec3(.82));
 float l=dot(c,vec3(.3,.59,.11));c=mix(vec3(l),c,1.12);
 c*=mix(vec3(.93,1.,1.1),vec3(1.07,1.,.92),smoothstep(.15,.85,l));c*=uTint;
 c*=1.-uVig*smoothstep(.25,.85,r2*2.2);
 c+=(hash(vUv*uRes+uTime)-.5)*uGrain+(hash(vUv*uRes*1.7+7.)-.5)/255.;
 gl_FragColor=vec4(c,1.);}`,['aP']);
const PCOPY=mkProg(VS_Q,`uniform sampler2D uTex;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(uTex,vUv).rgb,1.);}`,['aP']);
const quadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
function attribs(mask){for(let i=0;i<4;i++){if(mask&(1<<i))gl.enableVertexAttribArray(i);else gl.disableVertexAttribArray(i)}}

/* ---------- 批次与几何 ---------- */
class Batch{constructor(c=4096){this.a=new Float32Array(c);this.n=0;this.buf=null}
 reserve(k){if(this.n+k>this.a.length){const b=new Float32Array(Math.max(this.a.length*2,this.n+k));b.set(this.a);this.a=b}}
 upload(){if(!this.buf)this.buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,this.a.subarray(0,this.n),gl.DYNAMIC_DRAW)}}
const FC=[[1,0,0,0,0,-1,0,1,0],[-1,0,0,0,0,1,0,1,0],[0,1,0,1,0,0,0,0,-1],[0,-1,0,1,0,0,0,0,1],[0,0,1,1,0,0,0,1,0],[0,0,-1,-1,0,0,0,1,0]];
const SXY=[[-1,-1],[1,-1],[1,1],[-1,1]],TRI=[0,1,2,0,2,3],_v=new Float32Array(32);
function box(B,M,hx,hy,hz,r,g,b,em,tile,world,bev){
  B.reserve(432);const a=B.a;let n=B.n;const inv=1/tile;bev=bev||0;
  for(let f=0;f<6;f++){
    const F=FC[f],nx=F[0],ny=F[1],nz=F[2],ux=F[3],uy=F[4],uz=F[5],vx=F[6],vy=F[7],vz=F[8];
    const hn=Math.abs(nx)*hx+Math.abs(ny)*hy+Math.abs(nz)*hz,hu=Math.abs(ux)*hx+Math.abs(uy)*hy+Math.abs(uz)*hz,hv=Math.abs(vx)*hx+Math.abs(vy)*hy+Math.abs(vz)*hz;
    const ax=f<2?0:f<4?1:2;
    for(let k=0;k<4;k++){
      const su=SXY[k][0],sv=SXY[k][1];
      const lx=nx*hn+ux*su*hu+vx*sv*hv,ly=ny*hn+uy*su*hu+vy*sv*hv,lz=nz*hn+uz*su*hu+vz*sv*hv;
      const wx=M[0]*lx+M[4]*ly+M[8]*lz+M[12],wy=M[1]*lx+M[5]*ly+M[9]*lz+M[13],wz=M[2]*lx+M[6]*ly+M[10]*lz+M[14];
      let tu,tv;const sx=world?wx:lx,sy=world?wy:ly,sz=world?wz:lz;
      if(ax===0){tu=sz;tv=sy}else if(ax===1){tu=sx;tv=sz}else{tu=sx;tv=sy}
      const qx=nx+bev*(ux*su+vx*sv),qy=ny+bev*(uy*su+vy*sv),qz=nz+bev*(uz*su+vz*sv);
      const o=k*8;_v[o]=wx;_v[o+1]=wy;_v[o+2]=wz;_v[o+3]=tu*inv;_v[o+4]=tv*inv;
      _v[o+5]=M[0]*qx+M[4]*qy+M[8]*qz;_v[o+6]=M[1]*qx+M[5]*qy+M[9]*qz;_v[o+7]=M[2]*qx+M[6]*qy+M[10]*qz;
    }
    for(let q=0;q<6;q++){const o=TRI[q]*8;a[n++]=_v[o];a[n++]=_v[o+1];a[n++]=_v[o+2];a[n++]=_v[o+5];a[n++]=_v[o+6];a[n++]=_v[o+7];a[n++]=_v[o+3];a[n++]=_v[o+4];a[n++]=r;a[n++]=g;a[n++]=b;a[n++]=em}
  }
  B.n=n;
}
function vtx(B,M,px,py,pz,nx,ny,nz,u,v,r,g,b,em,sx,sy,sz){
  // 局部点 (px..) 先按 sx,sy,sz 缩放再用 M 变换；法线按逆缩放
  const lx=px*sx,ly=py*sy,lz=pz*sz;const a=B.a;let n=B.n;
  a[n++]=M[0]*lx+M[4]*ly+M[8]*lz+M[12];a[n++]=M[1]*lx+M[5]*ly+M[9]*lz+M[13];a[n++]=M[2]*lx+M[6]*ly+M[10]*lz+M[14];
  const qx=nx/sx,qy=ny/sy,qz=nz/sz;a[n++]=M[0]*qx+M[4]*qy+M[8]*qz;a[n++]=M[1]*qx+M[5]*qy+M[9]*qz;a[n++]=M[2]*qx+M[6]*qy+M[10]*qz;
  a[n++]=u;a[n++]=v;a[n++]=r;a[n++]=g;a[n++]=b;a[n++]=em;B.n=n;
}
const TRIG={};function trig(s){return TRIG[s]||(TRIG[s]={c:Array.from({length:s+1},(_,i)=>Math.cos(i/s*TAU)),s:Array.from({length:s+1},(_,i)=>Math.sin(i/s*TAU))})}
// 圆柱/圆台（Y 轴，中心在原点，高 h）
function cyl(B,M,rt,rb,h,seg,r,g,b,em,sc){
  sc=sc||[1,1,1];const T=trig(seg);B.reserve(seg*30+10);const hh=h/2,tu=.5;const sl=(rb-rt)/h;
  for(let i=0;i<seg;i++){
    const c0=T.c[i],s0=T.s[i],c1=T.c[i+1],s1=T.s[i+1];const l0=Math.hypot(1,sl);
    const n0=[c0/l0,sl/l0,s0/l0],n1=[c1/l0,sl/l0,s1/l0];const u0=i/seg*2,u1=(i+1)/seg*2;
    const V=(px,py,pz,nn,u,v)=>vtx(B,M,px,py,pz,nn[0],nn[1],nn[2],u,v,r,g,b,em,sc[0],sc[1],sc[2]);
    V(rb*c0,-hh,rb*s0,n0,u0,0);V(rt*c0,hh,rt*s0,n0,u0,1);V(rt*c1,hh,rt*s1,n1,u1,1);
    V(rb*c0,-hh,rb*s0,n0,u0,0);V(rt*c1,hh,rt*s1,n1,u1,1);V(rb*c1,-hh,rb*s1,n1,u1,0);
    if(rt>0){V(0,hh,0,[0,1,0],.5,.5);V(rt*c1,hh,rt*s1,[0,1,0],.5+c1*.5,.5+s1*.5);V(rt*c0,hh,rt*s0,[0,1,0],.5+c0*.5,.5+s0*.5)}
    if(rb>0){V(0,-hh,0,[0,-1,0],.5,.5);V(rb*c0,-hh,rb*s0,[0,-1,0],.5+c0*.5,.5+s0*.5);V(rb*c1,-hh,rb*s1,[0,-1,0],.5+c1*.5,.5+s1*.5)}
  }
}
function sph(B,M,rx,ry,rz,lat,lon,r,g,b,em){
  const Tl=trig(lon);B.reserve(lat*lon*6*12+12);
  const V=(i,j)=>{const th=i/lat*Math.PI,st=Math.sin(th),ct=Math.cos(th),c=Tl.c[j],s=Tl.s[j];vtx(B,M,st*c,ct,st*s,st*c,ct,st*s,j/lon*2,i/lat,r,g,b,em,rx,ry,rz)};
  for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){V(i+1,j);V(i,j);V(i,j+1);V(i+1,j);V(i,j+1);V(i+1,j+1)}
}
function tor(B,M,Rr,rr,us,vs,r,g,b,em){
  B.reserve(us*vs*72+12);const Tu=trig(us),Tv=trig(vs);
  const V=(i,j)=>{const cu=Tu.c[i],su=Tu.s[i],cv=Tv.c[j],sv=Tv.s[j];vtx(B,M,(Rr+rr*cv)*cu,rr*sv,(Rr+rr*cv)*su,cv*cu,sv,cv*su,i/us*4,j/vs,r,g,b,em,1,1,1)};
  for(let i=0;i<us;i++)for(let j=0;j<vs;j++){V(i,j);V(i+1,j+1);V(i+1,j);V(i,j);V(i,j+1);V(i+1,j+1)}
}
function quad(B,p,uv,r,g,b,em,nx,ny,nz){
  B.reserve(72);const a=B.a;let n=B.n;
  for(let q=0;q<6;q++){const k=TRI[q];a[n++]=p[k*3];a[n++]=p[k*3+1];a[n++]=p[k*3+2];a[n++]=nx;a[n++]=ny;a[n++]=nz;a[n++]=uv[k*2];a[n++]=uv[k*2+1];a[n++]=r;a[n++]=g;a[n++]=b;a[n++]=em}
  B.n=n;
}
/* sprites */
let CR=[1,0,0],CU=[0,1,0];
function spr(B,x,y,z,s,r,g,b,a,rot){
  B.reserve(54);const A=B.a;let n=B.n;let rx=CR[0],ry=CR[1],rz=CR[2],ux=CU[0],uy=CU[1],uz=CU[2];
  if(rot){const c=Math.cos(rot),sn=Math.sin(rot);const ax=rx*c+ux*sn,ay=ry*c+uy*sn,az=rz*c+uz*sn;ux=-rx*sn+ux*c;uy=-ry*sn+uy*c;uz=-rz*sn+uz*c;rx=ax;ry=ay;rz=az}
  rx*=s;ry*=s;rz*=s;ux*=s;uy*=s;uz*=s;
  const P=[x-rx-ux,y-ry-uy,z-rz-uz,0,0,x+rx-ux,y+ry-uy,z+rz-uz,1,0,x+rx+ux,y+ry+uy,z+rz+uz,1,1,x-rx+ux,y-ry+uy,z-rz+uz,0,1];
  for(let q=0;q<6;q++){const k=TRI[q]*5;A[n++]=P[k];A[n++]=P[k+1];A[n++]=P[k+2];A[n++]=P[k+3];A[n++]=P[k+4];A[n++]=r;A[n++]=g;A[n++]=b;A[n++]=a}
  B.n=n;
}
function sprQ(B,P,r,g,b,a){B.reserve(54);const A=B.a;let n=B.n;for(let q=0;q<6;q++){const k=TRI[q]*5;A[n++]=P[k];A[n++]=P[k+1];A[n++]=P[k+2];A[n++]=P[k+3];A[n++]=P[k+4];A[n++]=r;A[n++]=g;A[n++]=b;A[n++]=a}B.n=n}
function strk(B,x0,y0,z0,x1,y1,z1,w,r,g,b,a,ex,ey,ez){
  let dx=x1-x0,dy=y1-y0,dz=z1-z0;const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;
  let tx=ex-(x0+x1)/2,ty=ey-(y0+y1)/2,tz=ez-(z0+z1)/2;
  let px=dy*tz-dz*ty,py=dz*tx-dx*tz,pz=dx*ty-dy*tx;const pl=Math.hypot(px,py,pz)||1;px=px/pl*w;py=py/pl*w;pz=pz/pl*w;
  sprQ(B,[x0-px,y0-py,z0-pz,0,0,x1-px,y1-py,z1-pz,1,0,x1+px,y1+py,z1+pz,1,1,x0+px,y0+py,z0+pz,0,1],r,g,b,a);
}
// 圆柱形广告牌（光束）：沿竖直方向，水平面朝向相机
function beam(B,x,y0,y1,z,w0,w1,r,g,b,a,ex,ez){
  let dx=ex-x,dz=ez-z;const l=Math.hypot(dx,dz)||1;const px=-dz/l,pz=dx/l;
  sprQ(B,[x-px*w1,y0,z-pz*w1,0,0,x+px*w1,y0,z+pz*w1,1,0,x+px*w0,y1,z+pz*w0,1,1,x-px*w0,y1,z-pz*w0,0,1],r,g,b,a);
}

/* ---------- 程序化纹理（512，含 凹凸/发光 信息） ---------- */
const MATS=[];let SEEDN=7;
function glTex(c,tile,mip=true){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  if(mip){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);if(EXT.anis)gl.texParameterf(gl.TEXTURE_2D,EXT.anis.TEXTURE_MAX_ANISOTROPY_EXT,8)}
  else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  return t;
}
const MATP={metal:[.95,46,.022,0],floor:[.7,64,.016,1],ceil:[.2,22,.012,0],hazard:[.35,24,.02,0],crate:[.4,30,.03,0],lab:[.55,50,.012,0],rack:[.7,44,.015,0],conc:[.06,8,.03,0],white:[0,1,0,0],tank:[.9,90,0,0],node:[.7,40,0,0],vent:[.5,30,.02,0],glass:[.9,80,0,0],sign:[.3,30,0,0]};
function mkMat(name,sz,tile,fn){
  const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');
  x.scale(sz/256,sz/256);fn(x,256,mulberry(SEEDN++*7919));x.setTransform(1,0,0,1,0,0);
  const p=MATP[name]||[0,1,0,0];
  const m={name,tex:glTex(c,tile),tile,st:null,cnt:0,spec:p[0],gloss:p[1],bump:p[2],wet:p[3]};MATS.push(m);return MATS.length-1;
}
function grain(x,sz,rng,amt){const w=x.canvas.width;const id=x.getImageData(0,0,w,w),d=id.data;for(let i=0;i<d.length;i+=4){const n=(rng()-.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n}x.putImageData(id,0,0)}
function scratches(x,sz,rng,n,col){x.strokeStyle=col;x.lineWidth=1;for(let i=0;i<n;i++){const a=rng()*sz,b=rng()*sz,l=10+rng()*50,an=rng()*TAU;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.cos(an)*l,b+Math.sin(an)*l);x.stroke()}}
function grime(x,s,r,n,col){for(let i=0;i<n;i++){const px=r()*s,w=2+r()*8,h=30+r()*120,py=r()*s;const g=x.createLinearGradient(0,py,0,py+h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.3,col);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px,py,w,h)}}
function rust(x,s,r,n){for(let i=0;i<n;i++){x.fillStyle=`rgba(${120+r()*40|0},${60+r()*20|0},20,${.04+r()*.07})`;x.beginPath();x.arc(r()*s,r()*s,5+r()*26,0,TAU);x.fill()}}
const MI={};
function makeTextures(){
 const SZ=512;
 MI.metal=mkMat('metal',SZ,2,(x,s,r)=>{
  x.fillStyle='#2b3345';x.fillRect(0,0,s,s);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){const g=x.createLinearGradient(0,j*128,0,j*128+128);const v=r()*10|0;g.addColorStop(0,`rgb(${56+v},${66+v},${90+v})`);g.addColorStop(1,'#262d3d');x.fillStyle=g;x.fillRect(i*128+3,j*128+3,122,122)}
  x.fillStyle='#0c0f17';for(let i=0;i<2;i++){x.fillRect(i*128,0,3,s);x.fillRect(0,i*128,s,3)}
  x.fillStyle='rgba(150,180,230,.4)';for(let i=0;i<2;i++){x.fillRect(i*128+3,0,1,s);x.fillRect(0,i*128+3,s,1)}
  x.fillStyle='rgba(0,0,0,.35)';for(let i=0;i<2;i++){x.fillRect(i*128+4,0,2,s);x.fillRect(0,i*128+4,s,2)}
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(const [a,b] of [[11,11],[117,11],[11,117],[117,117]]){x.fillStyle='#0d1018';x.beginPath();x.arc(i*128+a,j*128+b,3.4,0,TAU);x.fill();x.fillStyle='#4b5670';x.beginPath();x.arc(i*128+a-.8,j*128+b-.8,2,0,TAU);x.fill()}
  x.fillStyle='#10131c';for(let k=0;k<6;k=k+1){x.fillRect(150,20+k*8,60,4)}x.fillStyle='#3a4560';for(let k=0;k<6;k++)x.fillRect(150,20+k*8,60,1);
  x.fillStyle='#4ff';x.fillRect(20,100,34,3);x.fillStyle='#fa4';x.fillRect(60,100,10,3);x.fillStyle='#4f8';x.fillRect(150,200,18,3);x.fillStyle='#4ff';x.fillRect(190,206,40,2);
  grime(x,s,r,16,'rgba(0,0,0,.25)');rust(x,s,r,10);scratches(x,s,r,34,'rgba(210,225,255,.09)');grain(x,s,r,18)});
 MI.floor=mkMat('floor',SZ,2.5,(x,s,r)=>{
  x.fillStyle='#10131b';x.fillRect(0,0,s,s);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){const v=22+r()*16|0;const g=x.createLinearGradient(i*64,j*64,i*64+64,j*64+64);g.addColorStop(0,`rgb(${v+6},${v+10},${v+22})`);g.addColorStop(1,`rgb(${v},${v+4},${v+14})`);x.fillStyle=g;x.fillRect(i*64+2,j*64+2,60,60)}
  x.fillStyle='rgba(90,170,230,.2)';for(let i=0;i<4;i++){x.fillRect(i*64+2,0,1,s);x.fillRect(0,i*64+2,s,1)}
  x.fillStyle='rgba(0,0,0,.6)';for(let i=0;i<4;i++){x.fillRect(i*64,0,2,s);x.fillRect(0,i*64,s,2)}
  x.fillStyle='#fb3';x.fillRect(8,8,4,4);x.fillRect(200,136,4,4);
  grime(x,s,r,18,'rgba(0,0,0,.35)');x.fillStyle='rgba(0,0,0,.4)';for(let k=0;k<40;k++)x.fillRect(r()*s,r()*s,r()*16,2);
  scratches(x,s,r,26,'rgba(180,210,255,.07)');grain(x,s,r,16)});
 MI.ceil=mkMat('ceil',SZ,3,(x,s,r)=>{
  x.fillStyle='#1b202b';x.fillRect(0,0,s,s);x.fillStyle='#0a0c12';x.fillRect(0,0,s,4);x.fillRect(0,0,4,s);x.fillRect(0,126,s,4);x.fillRect(126,0,4,s);
  x.fillStyle='#2b3342';for(let i=0;i<3;i++)x.fillRect(20+i*14,60,8,60);x.fillStyle='#0a0c12';for(let i=0;i<10;i++)x.fillRect(150,10+i*11,90,4);
  grime(x,s,r,10,'rgba(0,0,0,.3)');grain(x,s,r,14)});
 MI.hazard=mkMat('hazard',SZ,1.5,(x,s,r)=>{
  x.fillStyle='#14161a';x.fillRect(0,0,s,s);x.fillStyle='#d9a91c';
  for(let k=-s;k<s*2;k+=64){x.beginPath();x.moveTo(k,0);x.lineTo(k+32,0);x.lineTo(k+32-s,s);x.lineTo(k-s,s);x.fill()}
  scratches(x,s,r,40,'rgba(0,0,0,.4)');grime(x,s,r,10,'rgba(0,0,0,.3)');grain(x,s,r,32)});
 MI.crate=mkMat('crate',SZ,1.4,(x,s,r)=>{
  x.fillStyle='#3a404d';x.fillRect(0,0,s,s);x.fillStyle='#2a2f3a';x.fillRect(14,14,s-28,s-28);
  x.strokeStyle='#505869';x.lineWidth=8;x.strokeRect(10,10,s-20,s-20);
  x.strokeStyle='#232833';x.lineWidth=10;x.beginPath();x.moveTo(20,20);x.lineTo(s-20,s-20);x.moveTo(s-20,20);x.lineTo(20,s-20);x.stroke();
  x.fillStyle='#d1a020';for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]]){x.beginPath();x.moveTo(a*s,b*s);x.lineTo(a*s+(a?-34:34),b*s);x.lineTo(a*s,b*s+(b?-34:34));x.fill()}
  x.fillStyle='#0e1118';for(const [a,b] of [[30,30],[s-30,30],[30,s-30],[s-30,s-30]]){x.beginPath();x.arc(a,b,4,0,TAU);x.fill()}
  x.fillStyle='#4ff';x.fillRect(100,s-20,56,3);x.fillStyle='#e8e8e8';x.font='bold 20px sans-serif';x.fillText('JG-07',90,s/2+6);
  rust(x,s,r,14);scratches(x,s,r,36,'rgba(255,255,255,.08)');grain(x,s,r,24)});
 MI.lab=mkMat('lab',SZ,2,(x,s,r)=>{
  x.fillStyle='#a4b0b8';x.fillRect(0,0,s,s);
  for(let i=0;i<4;i++)for(let j=0;j<2;j++){const v=r()*10|0;const g=x.createLinearGradient(0,j*128,0,j*128+124);g.addColorStop(0,`rgb(${172+v},${186+v},${194+v})`);g.addColorStop(1,`rgb(${156+v},${170+v},${178+v})`);x.fillStyle=g;x.fillRect(i*64+2,j*128+2,60,124)}
  x.fillStyle='#5a646c';for(let i=0;i<4;i++)x.fillRect(i*64,0,2,s);x.fillRect(0,0,s,2);x.fillRect(0,128,s,2);
  x.fillStyle='#3f4850';x.fillRect(0,s-30,s,30);x.fillStyle='#5d6a74';x.fillRect(0,s-30,s,2);x.fillStyle='#4f6';x.fillRect(12,s-18,6,6);
  grime(x,s,r,10,'rgba(0,0,0,.18)');grain(x,s,r,14);scratches(x,s,r,16,'rgba(0,0,0,.1)')});
 MI.rack=mkMat('rack',SZ,2.6,(x,s,r)=>{
  x.fillStyle='#0f1219';x.fillRect(0,0,s,s);
  for(let j=0;j<8;j++){x.fillStyle='#1a1f2b';x.fillRect(6,j*32+4,s-12,26);x.fillStyle='#2a3142';x.fillRect(6,j*32+4,s-12,1);x.fillStyle='#07090d';for(let k=0;k<7;k++)x.fillRect(150+k*14,j*32+8,9,2);
   for(let k=0;k<12;k++){const c=['#3f6','#2df','#fb2','#f45','#3f6','#6af'][r()*6|0];x.fillStyle=r()<.8?c:'#222';x.fillRect(14+k*10,j*32+10,5,4);x.fillRect(14+k*10,j*32+18,5,4)}}
  grime(x,s,r,8,'rgba(0,0,0,.3)');grain(x,s,r,10)});
 MI.conc=mkMat('conc',SZ,3,(x,s,r)=>{x.fillStyle='#4e535b';x.fillRect(0,0,s,s);for(let k=0;k<50;k++){x.fillStyle=`rgba(0,0,0,${.03+r()*.08})`;x.beginPath();x.arc(r()*s,r()*s,10+r()*40,0,TAU);x.fill()}grain(x,s,r,40);grime(x,s,r,10,'rgba(0,0,0,.2)');x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,s,2);x.fillRect(0,0,2,s)});
 MI.white=mkMat('white',8,1,(x,s)=>{x.fillStyle='#fff';x.fillRect(0,0,s,s)});
 MI.tank=mkMat('tank',SZ,2,(x,s,r)=>{
  const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#0c4a48');g.addColorStop(1,'#062a30');x.fillStyle=g;x.fillRect(0,0,s,s);
  for(let k=0;k<70;k++){x.fillStyle=`rgba(190,255,235,${.5+r()*.5})`;x.beginPath();x.arc(r()*s,r()*s,1+r()*3,0,TAU);x.fill()}
  x.fillStyle='#d8fff5';for(let k=0;k<8;k++)x.fillRect(r()*s,r()*s,2,2);
  x.fillStyle='#10201f';x.fillRect(0,0,s,8);x.fillRect(0,s-8,s,8)});
 MI.node=mkMat('node',SZ,2,(x,s,r)=>{
  x.fillStyle='#10141c';x.fillRect(0,0,s,s);x.fillStyle='#1d2535';x.fillRect(8,8,s-16,s-16);
  x.fillStyle='#021822';x.fillRect(24,24,s-48,100);x.fillStyle='#6ff';for(let k=0;k<8;k++){x.fillRect(32+k*24,120-r()*80,14,r()*80+4)}
  x.fillStyle='#fb3';for(let k=0;k<6;k++)x.fillRect(30+k*34,150,22,10);
  x.fillStyle='#3f8';for(let k=0;k<3;k++){x.beginPath();x.arc(50+k*60,200,10,0,TAU);x.fill()}grain(x,s,r,10)});
 MI.vent=mkMat('vent',128,1,(x,s,r)=>{x.fillStyle='#0a0b10';x.fillRect(0,0,s,s);x.fillStyle='#2b3140';for(let k=0;k<10;k++)x.fillRect(6,6+k*12,s-12,6);grain(x,s,r,10)});
 MI.glass=mkMat('glass',128,1,(x,s,r)=>{x.fillStyle='#071827';x.fillRect(0,0,s,s);x.strokeStyle='#2ef';x.lineWidth=1;for(let k=0;k<s;k+=16){x.globalAlpha=.4;x.beginPath();x.moveTo(k,0);x.lineTo(k,s);x.moveTo(0,k);x.lineTo(s,k);x.stroke()}x.globalAlpha=1;x.fillStyle='#8ff';for(let k=0;k<30;k++)x.fillRect(r()*s,r()*s,2,2)});
 // 精灵纹理
 const mk=(w,h,fn,mip)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return glTex(c,1,false)};
 SPRTEX=mk(64,64,(x)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(.6,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});
 STRTEX=mk(32,32,(x)=>{const g=x.createLinearGradient(0,0,32,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.15,'rgba(255,255,255,1)');g.addColorStop(.85,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);x.globalCompositeOperation='destination-in';const g2=x.createLinearGradient(0,0,0,32);g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(.5,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g2;x.fillRect(0,0,32,32)});
 BEAMTEX=mk(32,64,(x,w,h)=>{const id=x.createImageData(w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const u=(i/(w-1))*2-1,v=j/(h-1);const a=Math.exp(-u*u*3.2)*Math.pow(1-v,1.2)*Math.min(1,v*8+.1);const k=(j*w+i)*4;id.data[k]=id.data[k+1]=id.data[k+2]=255;id.data[k+3]=a*255}x.putImageData(id,0,0)});
 DECTEX=mk(64,64,(x)=>{const g=x.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.28,'rgba(0,0,0,.95)');g.addColorStop(.45,'rgba(10,8,6,.6)');g.addColorStop(.75,'rgba(10,8,6,.18)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
  x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=1.3;for(let i=0;i<9;i++){const a=i/9*TAU+.3;x.beginPath();x.moveTo(32+Math.cos(a)*10,32+Math.sin(a)*10);x.lineTo(32+Math.cos(a)*(18+(i*7%9)),32+Math.sin(a)*(18+(i*7%9)));x.stroke()}});
 RINGTEX=mk(64,64,(x)=>{const g=x.createRadialGradient(32,32,6,32,32,30);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.3,'rgba(255,255,255,.9)');g.addColorStop(.5,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});
 STARTEX=mk(64,64,(x)=>{x.translate(32,32);for(let i=0;i<4;i++){const g=x.createLinearGradient(0,0,30,0);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(0,-2.5);x.lineTo(30,0);x.lineTo(0,2.5);x.fill();x.rotate(Math.PI/2)}x.setTransform(1,0,0,1,0,0);const g=x.createRadialGradient(32,32,0,32,32,14);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});
 const wc=document.createElement('canvas');wc.width=wc.height=1;wc.getContext('2d').fillStyle='#fff';wc.getContext('2d').fillRect(0,0,1,1);DUMMY=glTex(wc,1,false);
}
let SPRTEX,STRTEX,BEAMTEX,DECTEX,RINGTEX,STARTEX,DUMMY;
function makeSign(text,sub,col,w=512,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.fillStyle='#050912';x.fillRect(0,0,w,h);x.strokeStyle=col;x.lineWidth=4;x.strokeRect(4,4,w-8,h-8);
  x.fillStyle=col;x.shadowColor=col;x.shadowBlur=14;x.textAlign='center';x.textBaseline='middle';
  const F='"Noto Sans CJK SC","Microsoft YaHei","PingFang SC",sans-serif';
  if(sub){x.font=`900 ${h*.42}px ${F}`;x.fillText(text,w/2,h*.38);x.font=`600 ${h*.2}px ${F}`;x.fillText(sub,w/2,h*.77)}
  else{x.font=`900 ${h*.52}px ${F}`;x.fillText(text,w/2,h/2)}
  const m={name:'sign',tex:glTex(c,1),tile:1,st:null,cnt:0,spec:.3,gloss:30,bump:0,wet:0};MATS.push(m);return MATS.length-1;
}
