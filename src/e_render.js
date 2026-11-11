/* ---------- 渲染管线 ---------- */
const hudc=$('hud'),hx=hudc.getContext('2d');
let W=1,H=1,HW=1,HH=1,ASP=1;
const QL=()=>QP[clamp(CFG.ql,0,3)];
const RT={sh:[null,null,null],lv:[],post:false,hdr:false,enc:1};
const DB={},SA=new Batch(8192),SS=new Batch(4096),SL=new Batch(4096),SB=new Batch(2048),SD=new Batch(4096),SR=new Batch(2048),VB=new Batch(8192),VBw=new Batch(4096),VS=new Batch(512);
function dB(m){return DB[m]||(DB[m]=new Batch(4096))}
function mkTex(w,h,hdr,nearest){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,hdr?HINT:gl.RGBA,w,h,0,gl.RGBA,hdr?HTYPE:gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nearest?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,nearest?gl.NEAREST:gl.LINEAR);return t}
function mkRT(w,h,hdr,depth,nearest){
  const tex=mkTex(w,h,hdr,nearest),fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);let rb=null;
  if(depth){rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb)}
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return {tex,fbo,rb,w,h,ok};
}
function freeRT(r){if(!r)return;gl.deleteTexture(r.tex);gl.deleteFramebuffer(r.fbo);if(r.rb)gl.deleteRenderbuffer(r.rb);if(r.crb)gl.deleteRenderbuffer(r.crb)}
function rebuildTargets(){
  const q=QL();
  freeRT(RT.scene);freeRT(RT.ms);freeRT(RT.refl);RT.lv.forEach(l=>{freeRT(l.A);freeRT(l.B)});RT.lv=[];RT.sh.forEach(freeRT);RT.sh=[null,null,null];RT.ms=null;RT.refl=null;RT.scene=null;
  RT.post=!!q.post;RT.hdr=HDR;
  if(RT.post){
    let s=mkRT(W,H,RT.hdr,true);if(!s.ok&&RT.hdr){freeRT(s);RT.hdr=false;s=mkRT(W,H,false,true)}
    if(!s.ok){freeRT(s);RT.post=false}else RT.scene=s;
  }
  RT.enc=RT.post&&!RT.hdr?.5:1;
  if(RT.post&&GL2&&q.msaa){
    try{const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);const crb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,crb);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER,q.msaa,RT.hdr?gl.RGBA16F:gl.RGBA8,W,H);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,crb);
      const rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,q.msaa,gl.DEPTH_COMPONENT24,W,H);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);
      const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if(ok)RT.ms={fbo,rb,crb,tex:null,w:W,h:H,ok};else{gl.deleteFramebuffer(fbo);gl.deleteRenderbuffer(crb);gl.deleteRenderbuffer(rb)}
    }catch(e){RT.ms=null}
  }
  if(RT.post)for(let i=0;i<q.bloom;i++){const w=Math.max(4,W>>(i+1)),h=Math.max(4,H>>(i+1));RT.lv.push({A:mkRT(w,h,RT.hdr,false),B:mkRT(w,h,RT.hdr,false),w,h})}
  if(q.refl&&RT.post){const r=mkRT(Math.max(4,W>>1),Math.max(4,H>>1),RT.hdr,true);if(r.ok)RT.refl=r;else freeRT(r)}
  if(q.sh){const n=q.sh===3?3:1;for(let i=0;i<n;i++){const k=q.sh===3?i:1;RT.sh[k]=mkRT(q.shsz,q.shsz,false,true,true)}}
}
function resize(){
  const dpr=Math.min(window.devicePixelRatio||1,1.5);
  HW=window.innerWidth;HH=window.innerHeight;
  W=Math.max(320,Math.floor(HW*CFG.q*dpr));H=Math.max(200,Math.floor(HH*CFG.q*dpr));
  cv.width=W;cv.height=H;hudc.width=HW;hudc.height=HH;ASP=W/H;
  rebuildTargets();
}
window.addEventListener('resize',resize);
let VPm=M4.id(),CAMP=[0,0,0],NOWT=0,spVP=null;
const CAMR=[1,0,0],CAMU=[0,1,0],CAMF=[0,0,-1];
const LPA=new Float32Array(32),LCA=new Float32Array(24);
const SU={lp:new Float32Array(12),lc:new Float32Array(9),dir:new Float32Array(4),en:new Float32Array(3),far:new Float32Array([1,1,1]),m:[M4.id(),M4.id(),M4.id()],used:[null,null,null]};
function setWorldAttribs(){attribs(15);gl.vertexAttribPointer(0,3,gl.FLOAT,false,48,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,48,12);gl.vertexAttribPointer(2,2,gl.FLOAT,false,48,24);gl.vertexAttribPointer(3,4,gl.FLOAT,false,48,32)}
function setSprAttribs(){attribs(7);gl.vertexAttribPointer(0,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(1,2,gl.FLOAT,false,36,12);gl.vertexAttribPointer(2,4,gl.FLOAT,false,36,20)}
function setPosAttrib(){attribs(1);gl.vertexAttribPointer(0,3,gl.FLOAT,false,48,0)}
/* ---- 灯光选择 + 阴影光源 ---- */
function chooseLights(cx,cy,cz,t,f){
  const q=QL();SU.used=[null,null,null];SU.en.fill(0);SU.lp.fill(0);
  const sh=RT.sh;
  // 吊顶主灯：最近的 1~2 盏
  const cand=[];
  if(q.sh){for(const l of lights){if(!l.key)continue;const d=Math.hypot(l.x-cx,l.z-cz);if(d<l.rad*1.15)cand.push({l,d:d-l.rad*.25})}cand.sort((a,b)=>a.d-b.d)}
  const slots=[null,cand[0]?cand[0].l:null,q.sh===3&&cand[1]?cand[1].l:null];
  for(let k=1;k<3;k++){const l=slots[k];if(!l)continue;SU.used[k]=l;const fl=l.fl?(Math.sin(t*37+l.x)>.55||Math.sin(t*11)>.8?.15:1):1;
    SU.lp.set([l.x,l.y-.15,l.z,l.rad],k*4);SU.lc.set([l.r*fl*1.25,l.g*fl*1.25,l.b*fl*1.25],k*3);
    if(sh[k]){const proj=M4.persp(125*D2R,1,.3,l.rad+3),view=M4.lookAt([l.x,l.y-.15,l.z],[0,-1,0],[0,0,-1]);SU.m[k]=M4.mul(proj,view);SU.far[k]=l.rad+3;SU.en[k]=1;SU.viewk=SU.viewk||[];}}
  // 手电（所有“中”及以上画质）
  if(q.post&&CFG.flash&&!P.dead&&G.state!=='title'){
    const e=[cx,cy-.05,cz];SU.used[0]={flash:1};SU.lp.set([cx,cy-.05,cz,26],0);SU.lc.set([1.25,1.3,1.5],0);SU.dir.set([f[0],f[1],f[2],.87]);
    if(sh[0]){const up=Math.abs(f[1])>.95?[0,0,-1]:[0,1,0];const proj=M4.persp(64*D2R,1,.2,28),view=M4.lookAt(e,f,up);SU.m[0]=M4.mul(proj,view);SU.far[0]=28;SU.en[0]=1}
  }
  // 普通 8 灯
  const c=[];
  for(const l of DL){const k=l.life/l.max;c.push({x:l.x,y:l.y,z:l.z,r:l.r*k,g:l.g*k,b:l.b*k,rad:l.rad,s:-1})}
  for(const l of lights){if(SU.used[1]===l||SU.used[2]===l)continue;const dx=l.x-cx,dz=l.z-cz,dy=l.y-cy;const d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d>l.rad+30)continue;
    const fl=l.fl?(Math.sin(t*37+l.x)>.55||Math.sin(t*11)>.8?.15:1):1;
    c.push({x:l.x,y:l.y,z:l.z,r:l.r*fl,g:l.g*fl,b:l.b*fl,rad:l.rad,s:d-l.rad*.7})}
  c.sort((a,b)=>a.s-b.s);
  LPA.fill(0);LCA.fill(0);
  const lamp=SU.used[0]?.05:.28;
  LPA[0]=cx;LPA[1]=cy+.1;LPA[2]=cz;LPA[3]=7;LCA[0]=lamp;LCA[1]=lamp*1.07;LCA[2]=lamp*1.28;
  for(let i=0;i<7&&i<c.length;i++){const l=c[i];LPA[(i+1)*4]=l.x;LPA[(i+1)*4+1]=l.y;LPA[(i+1)*4+2]=l.z;LPA[(i+1)*4+3]=l.rad;LCA[(i+1)*3]=l.r;LCA[(i+1)*3+1]=l.g;LCA[(i+1)*3+2]=l.b}
}
/* ---- 绘制 ---- */
function setMat(U,m){const q=QL();gl.uniform1f(U.uSpec,m.spec);gl.uniform1f(U.uGloss,m.gloss);gl.uniform1f(U.uBump,q.bump?m.bump:0);gl.uniform1f(U.uWet,m.wet)}
function setWorldCommon(VP,mode,eye,clip){
  const U=PW.u,q=QL();gl.useProgram(PW.p);
  gl.uniformMatrix4fv(U.uVP,false,VP);gl.uniform4fv(U.uLP,LPA);gl.uniform3fv(U.uLC,LCA);
  gl.uniform3f(U.uAmb,.085,.095,.145);gl.uniform3f(U.uFog,.03,.035,.06);gl.uniform1f(U.uFogD,.022);gl.uniform1f(U.uMode,mode);
  gl.uniform3f(U.uFlash,0,0,0);gl.uniform3f(U.uHit,0,0,0);gl.uniform3f(U.uEye,eye[0],eye[1],eye[2]);
  gl.uniform1f(U.uEnc,RT.enc);gl.uniform1f(U.uTM,RT.post?0:1);gl.uniform1f(U.uTime,NOWT);gl.uniform1f(U.uClip,clip?1:0);
  gl.uniform4fv(U.uSLP,SU.lp);gl.uniform3fv(U.uSLC,SU.lc);gl.uniform4fv(U.uSDir,SU.dir);gl.uniform1fv(U.uSEn,mode>1.5?new Float32Array(3):SU.en);gl.uniform1fv(U.uSFar,SU.far);
  gl.uniformMatrix4fv(U.uSM0,false,SU.m[0]);gl.uniformMatrix4fv(U.uSM1,false,SU.m[1]);gl.uniformMatrix4fv(U.uSM2,false,SU.m[2]);
  gl.uniform1f(U.uTexel,1/(q.shsz||1024));gl.uniform1f(U.uSoft,q.ca?.7:0);gl.uniform2f(U.uInvRes,1/(RT.cur?RT.cur.w:W),1/(RT.cur?RT.cur.h:H));
  gl.uniform1f(U.uReflOn,RT.refl&&mode<1.5?1:0);
  gl.uniform1i(U.uTex,0);gl.uniform1i(U.uSh0,1);gl.uniform1i(U.uSh1,2);gl.uniform1i(U.uSh2,3);gl.uniform1i(U.uRefl,4);
  for(let k=0;k<3;k++){gl.activeTexture(gl.TEXTURE1+k);gl.bindTexture(gl.TEXTURE_2D,RT.sh[k]&&mode<1.5?RT.sh[k].tex:DUMMY)}
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,RT.refl&&mode<1.5?RT.refl.tex:DUMMY);
  gl.activeTexture(gl.TEXTURE0);
}
function drawWorldGeo(){
  const U=PW.u;
  for(let i=0;i<MATS.length;i++){const m=MATS[i];if(!m.st)continue;setMat(U,m);gl.bindTexture(gl.TEXTURE_2D,m.tex);gl.bindBuffer(gl.ARRAY_BUFFER,m.st);setWorldAttribs();gl.drawArrays(gl.TRIANGLES,0,m.cnt)}
  for(const k in DB){const B=DB[k];if(!B.n)continue;const m=MATS[k];setMat(U,m);gl.bindTexture(gl.TEXTURE_2D,m.tex);gl.bindBuffer(gl.ARRAY_BUFFER,B.buf);setWorldAttribs();gl.drawArrays(gl.TRIANGLES,0,B.n/12)}
}
function drawShadowGeo(){
  for(let i=0;i<MATS.length;i++){const m=MATS[i];if(!m.st||m.name==='sign')continue;gl.bindBuffer(gl.ARRAY_BUFFER,m.st);setPosAttrib();gl.drawArrays(gl.TRIANGLES,0,m.cnt)}
  for(const k in DB){const B=DB[k];if(!B.n)continue;gl.bindBuffer(gl.ARRAY_BUFFER,B.buf);setPosAttrib();gl.drawArrays(gl.TRIANGLES,0,B.n/12)}
}
function renderShadow(k){
  const r=RT.sh[k];if(!r||!SU.en[k])return;
  gl.bindFramebuffer(gl.FRAMEBUFFER,r.fbo);gl.viewport(0,0,r.w,r.h);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(PD.p);gl.uniformMatrix4fv(PD.u.uVP,false,SU.m[k]);gl.uniform3f(PD.u.uLPos,SU.lp[k*4],SU.lp[k*4+1],SU.lp[k*4+2]);gl.uniform1f(PD.u.uFar,SU.far[k]);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
  drawShadowGeo();
}
const MREF=new Float32Array([1,0,0,0,0,-1,0,0,0,0,1,0,0,0,0,1]);
function renderRefl(eye,proj,view){
  const r=RT.refl;if(!r)return;
  RT.cur=r;gl.bindFramebuffer(gl.FRAMEBUFFER,r.fbo);gl.viewport(0,0,r.w,r.h);gl.clearColor(.03,.035,.06,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CW);
  setWorldCommon(M4.mul(M4.mul(proj,view),MREF),2,eye,true);drawWorldGeo();gl.frontFace(gl.CCW);RT.cur=null;
}
function drawSprites(B,tex,add,off){
  if(B.n===0)return;B.upload();gl.useProgram(PS.p);setSprAttribs();gl.uniformMatrix4fv(PS.u.uVP,false,spVP);gl.uniform1f(PS.u.uEnc,RT.enc);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(PS.u.uTex,0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,add?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  if(off){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-4)}
  gl.bindBuffer(gl.ARRAY_BUFFER,B.buf);setSprAttribs();gl.drawArrays(gl.TRIANGLES,0,B.n/9);
  if(off)gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.depthMask(true);gl.disable(gl.BLEND);
}
function bindScene(){
  const q=QL();
  if(RT.post){const t=RT.ms||RT.scene;gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);RT.cur={w:W,h:H}}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);RT.cur=null}
  gl.viewport(0,0,W,H);
}
function fsq(prog){gl.useProgram(prog.p);gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);attribs(1);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0)}
function pass(rt,w,h){gl.bindFramebuffer(gl.FRAMEBUFFER,rt?rt.fbo:null);gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE)}
function postFX(t){
  const q=QL(),sc=RT.scene,lv=RT.lv;
  if(RT.ms){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.ms.fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,sc.fbo);gl.blitFramebuffer(0,0,W,H,0,0,W,H,gl.COLOR_BUFFER_BIT,gl.NEAREST)}
  gl.activeTexture(gl.TEXTURE0);
  // 亮部提取 + 降采样链 + 高斯模糊
  for(let i=0;i<lv.length;i++){
    const L=lv[i];pass(L.A,L.w,L.h);
    if(i===0){fsq(PB);gl.bindTexture(gl.TEXTURE_2D,sc.tex);gl.uniform1i(PB.u.uTex,0);gl.uniform2f(PB.u.uPx,1/W,1/H);gl.uniform1f(PB.u.uThr,(RT.hdr?.8:.8)*RT.enc)}
    else{fsq(PCOPY);gl.bindTexture(gl.TEXTURE_2D,lv[i-1].A.tex);gl.uniform1i(PCOPY.u.uTex,0)}
    gl.drawArrays(gl.TRIANGLES,0,6);
    fsq(PG);gl.uniform1i(PG.u.uTex,0);
    pass(L.B,L.w,L.h);gl.bindTexture(gl.TEXTURE_2D,L.A.tex);gl.uniform2f(PG.u.uDir,1.4/L.w,0);gl.drawArrays(gl.TRIANGLES,0,6);
    pass(L.A,L.w,L.h);gl.bindTexture(gl.TEXTURE_2D,L.B.tex);gl.uniform2f(PG.u.uDir,0,1.4/L.h);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  // 合成
  pass(null,W,H);fsq(PC);const U=PC.u;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sc.tex);gl.uniform1i(U.uScene,0);
  for(let i=0;i<4;i++){gl.activeTexture(gl.TEXTURE1+i);gl.bindTexture(gl.TEXTURE_2D,lv[Math.min(i,lv.length-1)]?lv[Math.min(i,lv.length-1)].A.tex:DUMMY);gl.uniform1i(U['uB'+i],1+i)}
  const n=lv.length;const bw=[.42,.4,.4,.36].map((v,i)=>i<n?v*(n===2?1.15:1):0);
  gl.uniform4f(U.uBW,bw[0],bw[1],bw[2],bw[3]);gl.uniform1f(U.uDec,1/RT.enc);gl.uniform1f(U.uTime,(t*60%97)|0);
  const hurt=clamp(P.hurtT*2,0,1),fl=VM.flash>0?1:0;
  gl.uniform1f(U.uCA,(q.ca?.012:.004)+hurt*.04+fl*.012);gl.uniform1f(U.uGrain,q.grain?.045:.02);gl.uniform1f(U.uVig,.5+hurt*.3);gl.uniform2f(U.uRes,W,H);
  gl.uniform3f(U.uTint,1+hurt*.15,1-hurt*.12,1-hurt*.12);
  gl.drawArrays(gl.TRIANGLES,0,6);gl.activeTexture(gl.TEXTURE0);
}
let GLERR=0;
function renderFrame(cam,t){
  const {eye,f,fovr}=cam,q=QL();
  const proj=M4.persp(fovr,ASP,.06,150),view=M4.look(eye[0],eye[1],eye[2],f[0],f[1],f[2]);
  VPm=M4.mul(proj,view);spVP=VPm;CAMP=eye;CAMF[0]=f[0];CAMF[1]=f[1];CAMF[2]=f[2];
  {let rx=-f[2],rz=f[0];const l=Math.hypot(rx,rz)||1;rx/=l;rz/=l;CAMR[0]=rx;CAMR[1]=0;CAMR[2]=rz;const ux=-rz*f[1],uy=rz*f[0]-rx*f[2],uz=rx*f[1];CAMU[0]=ux;CAMU[1]=uy;CAMU[2]=uz}
  // 动态几何
  for(const k in DB)DB[k].n=0;SA.n=0;SS.n=0;SL.n=0;SB.n=0;SD.n=0;SR.n=0;
  worldDyn(t);particlesFx(t);
  for(const k in DB)if(DB[k].n)DB[k].upload();
  chooseLights(eye[0],eye[1],eye[2],t,f);
  for(let k=0;k<3;k++)renderShadow(k);
  if(RT.refl)renderRefl(eye,proj,view);
  bindScene();gl.clearColor(.02,.025,.045,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
  setWorldCommon(VPm,0,eye,false);drawWorldGeo();
  gl.disable(gl.CULL_FACE);
  drawSprites(SD,DECTEX,false,true);drawSprites(SS,SPRTEX,false);drawSprites(SB,BEAMTEX,true);drawSprites(SA,SPRTEX,true);drawSprites(SR,RINGTEX,true,true);drawSprites(SL,STRTEX,true);
  if(G.state!=='title'&&G.state!=='win')renderVM(t);
  gl.disable(gl.DEPTH_TEST);
  if(RT.post)postFX(t);
  if(DBG){const e=gl.getError();if(e&&GLERR++<5)console.error('GL error '+e)}
}
function renderVM(t){
  if(!viewModel(t))return;
  gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);
  const proj=M4.persp(58*D2R,ASP,.01,5);
  RT.cur=RT.post?{w:W,h:H}:null;
  setWorldCommon(proj,1,[0,0,0],false);const U=PW.u;gl.uniform3f(U.uAmb,.3,.32,.4);
  const fx=VM.flash>0?VM.flash/.06:0;gl.uniform3f(U.uFlash,fx*.9,fx*.7,fx*.3);
  gl.uniform1f(U.uGloss,28);gl.uniform1f(U.uSpec,1);
  gl.bindTexture(gl.TEXTURE_2D,MATS[MI.white].tex);
  for(const B of [VB,VBw]){if(!B.n)continue;B.upload();gl.uniform1f(U.uSpec,B===VB?1:0);gl.bindBuffer(gl.ARRAY_BUFFER,B.buf);setWorldAttribs();gl.drawArrays(gl.TRIANGLES,0,B.n/12)}
  gl.disable(gl.CULL_FACE);spVP=proj;
  CR=[1,0,0];CU=[0,1,0];
  drawSprites(VS,STARTEX,true);
  gl.disable(gl.DEPTH_TEST);
}
/* ---- 相机 / 帧 ---- */
function playerCam(){
  const bobY=Math.abs(Math.sin(P.bob))*.035*Math.min(1,P.speed/5)*(P.og?1:0),bobX=Math.cos(P.bob)*.02*Math.min(1,P.speed/5);
  const sh=P.shake*.012;
  const yaw=P.yaw+R(-sh,sh)*.5,pitch=clamp(P.pitch+P.kickP+R(-sh,sh)*.5,-1.5,1.5);
  const cp=Math.cos(pitch),f=[-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp];
  const eye=[P.x+Math.cos(yaw)*bobX*.5,P.y+eyeH()+bobY,P.z-Math.sin(yaw)*bobX*.5];
  const wd=INV[cw].d;
  const fovr=CFG.fov*D2R*lerp(1,wd.fov,P.ads*P.ads*(3-2*P.ads));
  return {eye,f,fovr};
}
// 动态分辨率
const PERF={acc:0,n:0,t:0,fps:60};
function perfTick(dt){
  PERF.acc+=dt;PERF.n++;
  if(PERF.acc>=1.5){PERF.fps=PERF.n/PERF.acc;PERF.acc=0;PERF.n=0;
    if(CFG.dyn&&G.state==='playing'&&!DBG&&document.visibilityState==='visible'){
      if(PERF.fps<28&&CFG.q>.55){CFG.q=Math.max(.55,+(CFG.q-.15).toFixed(2));resize()}
      else if(PERF.fps>57&&CFG.q<1&&CFG.qBase&&CFG.q<CFG.qBase){CFG.q=Math.min(CFG.qBase,+(CFG.q+.1).toFixed(2));resize()}
    }}
}
function frame(t,dt){
  NOWT=t;if(dt)perfTick(dt);
  let cam;
  if(G.state==='title'){const yy=Math.sin(t*.1)*.6;const cp=Math.cos(-.03);cam={eye:[Math.sin(t*.07)*3,1.7,19.5],f:[-Math.sin(yy)*cp,-.03,-Math.cos(yy)*cp],fovr:70*D2R}}
  else cam=playerCam();
  renderFrame(cam,t);
  auListener(cam.eye[0],cam.eye[1],cam.eye[2],cam.f[0],cam.f[1],cam.f[2]);
  drawHUD(cam);
}
