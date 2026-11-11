/* ---------- 程序化模型 / 特效 ---------- */
function pb(B,M,x,y,z,hx_,hy_,hz_,c,em,bev,tile){box(B,Mt(M,x,y,z),hx_,hy_,hz_,c[0],c[1],c[2],em||0,tile||.8,false,bev===undefined?.35:bev)}
function mix(c,w,k){return [c[0]+(w-c[0])*k,c[1]+(w-c[1])*k,c[2]+(w-c[2])*k]}
let SEG=10,LAT=6,LON=9;
function pc(B,M,x,y,z,rt,rb,h,c,em){cyl(B,Mt(M,x,y,z),rt,rb,h,SEG,c[0],c[1],c[2],em||0)}
function ps(B,M,x,y,z,rx,ry,rz,c,em){sph(B,Mt(M,x,y,z),rx,ry,rz,LAT,LON,c[0],c[1],c[2],em||0)}
function limb(B,M,a,b,r0,r1,c,em){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1e-3;
  const Rm=M4.alignY(dx/l,dy/l,dz/l);
  cyl(B,M4.mul(Mt(M,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),Rm),r1,r0,l,SEG,c[0],c[1],c[2],em||0);
}
function mSentry(e,M,c,g,gc,gm,sw,hv,t,far){
  const Bm=dB(MI.metal),Bw=dB(MI.white);
  const dk=mix(c,0,.45),md=mix(c,0,.2),lt=mix(c,1,.18);
  const hipY=.86-e.crouchV*.22,cb=e.crouchV*.9;
  // 腿
  for(const s of [-1,1]){
    const a=sw*s*1.05+cb,b=a-Math.abs(sw)*.7-e.crouchV*1.3;
    const hp=[s*.13,hipY,0],kn=[hp[0],hp[1]-.4*Math.cos(a),hp[2]-.4*Math.sin(a)];
    const an=[kn[0],kn[1]-.4*Math.cos(b),kn[2]-.4*Math.sin(b)];
    ps(Bm,M,hp[0],hp[1],hp[2],.085,.085,.085,dk);
    limb(Bm,M,hp,kn,.075,.062,c);
    ps(Bm,M,kn[0],kn[1],kn[2],.07,.07,.07,dk);
    pb(Bm,M,kn[0],kn[1]+.02,kn[2]-.07,.055,.05,.04,lt,0,.5);
    limb(Bm,M,kn,an,.06,.045,md);
    pb(Bm,M,an[0],an[1]-.03,an[2]-.06,.07,.04,.13,dk,0,.5);
    if(!far)pb(Bw,M,an[0]+s*.072,an[1]-.02,an[2]-.06,.004,.012,.08,gc,gm*.7,0);
  }
  const M2=Mt(M,0,hipY-.86,0);
  pb(Bm,M2,0,.92,0,.2,.1,.13,dk,0,.5);
  pc(Bm,M2,0,1.06,0,.14,.17,.2,md);
  pb(Bm,M2,0,1.24,.0,.27,.26,.17,c,0,.4);
  pb(Bm,M2,0,1.27,-.165,.2,.2,.035,lt,0,.45);
  pb(Bw,M2,0,1.33,-.2,.13,.025,.006,gc,gm,0);pb(Bw,M2,0,1.24,-.2,.09,.015,.006,gc,gm*.8,0);
  if(!far){for(let i=0;i<3;i++)pb(Bm,M2,0,1.15+i*.035,-.2,.14,.008,.006,dk,0,0);
    pb(Bm,M2,0,1.3,.22,.2,.24,.085,dk,0,.4);pc(Bm,M2,-.13,1.62,.22,.008,.012,.3,dk);pb(Bw,M2,-.13,1.78,.22,.015,.015,.015,gc,gm,0);
    for(const s of [-1,1])pb(Bw,M2,s*.1,1.0,.0,.012,.01,.14,gc,gm*.4,0)}
  pc(Bm,M2,0,1.47,0,.07,.07,.1,dk);
  pb(Bm,M2,0,1.62,0,.14,.13,.15,md,0,.55);
  pb(Bm,M2,0,1.75,.0,.115,.03,.14,c,0,.6);
  pb(Bw,M2,0,1.63,-.152,.115,.036,.01,gc,gm*(e.flashT>0?1.6:1.15),0);
  if(!far){for(const s of [-1,1]){pc(Bm,M2,s*.15,1.6,.02,.04,.04,.05,dk);ps(Bw,M2,s*.062,1.63,-.153,.016,.016,.01,[1,1,1],gm*.9)}}
  // 手臂 + 枪
  const sh=[[-.34,1.4,0],[.34,1.4,0]],el=[[-.38,1.17,-.22],[.37,1.2,-.2]],hd=[[-.1,1.27,-.62],[.24,1.31,-.5]];
  for(let i=0;i<2;i++){
    ps(Bm,M2,sh[i][0],sh[i][1],sh[i][2],.11,.1,.11,hv?[.9,.45,.12]:lt);
    limb(Bm,M2,sh[i],el[i],.06,.05,c);ps(Bm,M2,el[i][0],el[i][1],el[i][2],.055,.055,.055,dk);
    limb(Bm,M2,el[i],hd[i],.05,.04,md);ps(Bm,M2,hd[i][0],hd[i][1],hd[i][2],.05,.05,.05,dk);
  }
  pb(Bm,M2,.24,1.31,-.55,.045,.065,.26,dk,0,.3);
  pb(Bm,M2,.24,1.37,-.5,.02,.02,.14,md,0,.2);
  limb(Bm,M2,[.24,1.33,-.78],[.24,1.33,-1.0],.02,.017,dk);
  pb(Bw,M2,.24,1.33,-1.02,.018,.018,.012,gc,gm*(e.tele>0?1.6:.4),0);
  pb(Bm,M2,.24,1.22,-.46,.018,.07,.025,dk,0,.2);
  if(hv){for(const s of [-1,1]){pb(Bm,M2,s*.4,1.5,0,.14,.07,.2,[.9,.45,.12],0,.5);}pb(Bm,M2,0,1.6,.0,.12,.1,.12,[.9,.45,.12],0,.4);pb(Bw,M2,0,1.3,-.215,.04,.04,.006,gc,gm,0)}
}
function mDrone(e,M,c,gc,gm,t,far,fall){
  const Bm=dB(MI.metal),Bw=dB(MI.white),dk=mix(c,0,.45);
  ps(Bm,M,0,0,0,.27,.16,.32,c);
  pb(Bm,M,0,-.12,.05,.18,.05,.22,dk,0,.5);
  ps(Bw,M,0,0,-.28,.1,.1,.06,gc,gm);
  tor(Bm,Mt(M4.mul(M,M4.RX(Math.PI/2)),0,-.0,.28),.115,.018,SEG,5,.1,.1,.12,0);
  pb(Bm,M,0,.17,.08,.06,.04,.12,dk,0,.4);pc(Bm,M,.0,.3,.14,.006,.008,.2,dk);
  for(const s of [-1,1]){
    limb(Bm,M,[s*.2,0,.05],[s*.5,.04,.05],.035,.03,dk);
    pc(Bm,Mt(M,s*.52,.05,.05),0,0,0,.04,.04,.1,dk);
    const Mr=M4.mul(Mt(M,s*.52,.12,.05),M4.RY(t*(e.dead?0:28)*s));
    pb(Bw,Mr,0,0,0,.26,.006,.025,[.55,.85,1],e.dead?0:.55,0);pb(Bw,Mr,0,0,0,.025,.006,.26,[.55,.85,1],e.dead?0:.55,0);
    if(!e.dead)ps(Bw,M,s*.52,-.06,.05,.03,.02,.03,gc,.9);
  }
  if(!far)pb(Bw,M,0,.2,.12,.07,.012,.08,gc,gm,0);
}
function mRusher(e,M,c,gc,gm,t,far){
  const Bm=dB(MI.metal),Bw=dB(MI.white),dk=mix(c,0,.45);
  const fz=e.fuse>0&&Math.sin(t*50)>0;
  ps(Bm,M,0,.32,0,.26,.14,.36,c);
  ps(Bm,M,0,.4,-.32,.15,.11,.13,mix(c,0,.2));
  ps(Bw,M,0,.4,-.42,.1,.05,.03,fz?[1,1,1]:gc,1);
  for(const s of [-1,1]){pc(Bm,M4.mul(M,M4.RX(Math.PI/2)),s*.08,-.46,.43,.025,.04,.1,dk)}
  ps(Bw,M,0,.47,.08,.11,.07,.15,fz?[1,.9,.9]:gc,e.fuse>0?(fz?2.2:.4):gm);
  const nl=far?2:3;
  for(let i=0;i<nl;i++)for(const s of [-1,1]){
    const ph=e.walk*1.6+i*2.1+(s>0?3.14:0),z0=-.2+i*(far?.3:.22);
    const hp=[s*.22,.32,z0],kn=[s*.55,.62,z0-.1+Math.sin(ph)*.08],ft=[s*.7,Math.max(.02,.04+Math.max(0,Math.sin(ph))*.14),z0-.18+Math.cos(ph)*.12];
    limb(Bm,M,hp,kn,.03,.025,dk);limb(Bm,M,kn,ft,.025,.012,mix(c,0,.3));
  }
}
function mPylon(e,M,c,t){
  const Bm=dB(MI.metal),Bw=dB(MI.white),dk=mix(c,0,.4);
  pc(Bm,M,0,.28,0,.55,.7,.56,c);tor(Bm,Mt(M,0,.58,0),.55,.06,12,5,.3,.3,.35,0);
  if(e.dead){pc(Bm,M,0,.7,0,.3,.4,.3,dk);return}
  pc(Bm,M,0,2.1,0,.2,.26,3.2,c);
  for(const y of [1,1.8,2.6,3.3]){tor(Bw,Mt(M,0,y,0),.24,.03,SEG,4,1,.5,.1,1)}
  for(const a of [0,2.09,4.19])pb(Bm,M4.mul(Mt(M,0,.9,0),M4.RY(a)),0,0,-.3,.04,.5,.12,dk,0,.2);
  const Mr=M4.mul(Mt(M,0,3.95,0),M4.mul(M4.RY(t*1.5),M4.RX(.6)));
  const cc=e.flash>0?[1,1,1]:[1,.55,.15];
  pb(Bw,Mr,0,0,0,.34,.34,.34,cc,1.2,.4);
  pb(Bw,M4.mul(Mt(M,0,3.95,0),M4.RY(-t*2)),0,.5,0,.05,.12,.05,cc,1,0);pb(Bw,M4.mul(Mt(M,0,3.95,0),M4.RY(-t*2)),0,-.5,0,.05,.12,.05,cc,1,0);
  CR=CAMR;CU=CAMU;spr(SA,e.x,e.y+3.95,e.z,1.7,1,.5,.15,.55)
}
function mCore(e,t){
  if(e.dead)return;
  const Bm=dB(MI.metal),Bw=dB(MI.white);
  const open=G.pylons>0?0:1;e.open=lerp(e.open||0,open,.03);
  const M=M4.T(e.x,e.y+Math.sin(t*1.2)*.12,e.z);const col=e.flash>0?[1,1,1]:(open?[1,.3,.15]:[.2,.9,1]);
  ps(Bw,M,0,0,0,.55,.55,.55,col,1.5);
  const Mc2=M4.mul(M,M4.mul(M4.RY(-t*.7),M4.RZ(t*.5)));pb(Bw,Mc2,0,0,0,.4,.4,.4,[1,1,1],1.6,.2);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.4,r=1.25+e.open*.6;const Mp=M4.mul(M,M4.mul(M4.RY(a),M4.T(0,0,-r)));pb(Bm,Mp,0,0,0,.5,.9,.08,[.45,.45,.5],0,.3);pb(Bw,Mp,0,0,.1,.4,.05,.012,[1,.4,.2],1.2,0);pb(Bw,Mp,0,.75,.1,.3,.03,.012,[1,.4,.2],1,0)}
  for(let i=0;i<3;i++){const Mr=M4.mul(M,M4.mul(M4.RY(t*(.8+i*.4)),M4.RX(i*1.05)));
    tor(Bw,M4.mul(Mr,M4.RX(Math.PI/2)),1.8,.045,36,4,.9,.35,.15,1.1);
    for(const s of [-1,1])pb(Bm,Mr,s*1.8,0,0,.07,.07,.4,[.4,.4,.45],0,.4)}
  CR=CAMR;CU=CAMU;spr(SA,e.x,e.y,e.z,3.2,col[0],col[1],col[2],.55+.15*Math.sin(t*5));
  if(G.pylons>0){spr(SA,e.x,e.y,e.z,3.6,.2,.8,1,.18+(e.shield>0?.5:0))}
}
function enemyModels(t){
  for(const e of EN){
    const T=e.T,far=dist2(e.x,e.z,CAMP[0],CAMP[2])>400;
    SEG=far?6:10;LAT=far?4:6;LON=far?6:9;
    if(T.kind==='pylon'){mPylon(e,M4.T(e.x,e.y,e.z),e.flash>0?mix(T.tint,1.4,e.flash):T.tint,t);continue}
    if(T.kind==='core'){mCore(e,t);continue}
    if(e.dead&&T.melee)continue;
    const d=e.walk-(e.pw||0);e.pw=e.walk;e.swA=(e.swA||0)+(((d>.002)?1:0)-(e.swA||0))*.15;
    const sw=Math.sin(e.walk)*.75*e.swA;
    let M=M4.mul(M4.T(e.x,e.y,e.z),M4.RY(e.yaw));
    const fall=e.dead?Math.min(1,e.dt*2.4):0;
    if(fall)M=M4.mul(M,M4.RX(-fall*1.5));
    let c=T.tint;if(e.flash>0)c=mix(c,1.4,Math.min(1,e.flash));
    const g=e.dead?[.05,.05,.05]:T.glow;const gm=e.dead?0:1.15;
    const teleK=e.tele>0?2.2:1;const gc=[g[0]*teleK,g[1]*teleK,g[2]*teleK];
    if(e.type==='sentry'||e.type==='heavy'){
      const hv=e.type==='heavy';if(hv)M=M4.mul(M,M4.S(1.28,1.22,1.28));
      mSentry(e,M,c,g,gc,gm,sw,hv,t,far);
    }else if(e.type==='drone'){
      const bob=Math.sin(t*3+e.hx)*.04;M=M4.mul(M,M4.T(0,bob,0));
      if(fall){M=M4.mul(M4.T(e.x,Math.max(.2,e.y-fall*e.y),e.z),M4.RY(e.yaw+fall*3))}
      mDrone(e,M,c,gc,gm,t,far,fall);
    }else if(e.type==='rusher'){mRusher(e,M,c,gc,gm,t,far)}
    if(!e.dead){CR=CAMR;CU=CAMU;
      if(e.tele>0)spr(SA,e.x-Math.sin(e.yaw)*.5,e.y+T.gunY,e.z-Math.cos(e.yaw)*.5,.3,g[0],g[1],g[2],.9);
      if(!far&&!T.kind){const hy=T.fly?0:(e.type==='heavy'?2.2:1.63);spr(SA,e.x-Math.sin(e.yaw)*.2,e.y+hy,e.z-Math.cos(e.yaw)*.2,.22,g[0],g[1],g[2],.35)}}
  }
  SEG=10;LAT=6;LON=9;
}
function worldDyn(t){
  const Bm=dB(MI.metal),Bw=dB(MI.white);SEG=10;
  for(const d of doors){const M=M4.T(d.cx,d.dh/2+d.open*3.4,d.cz);const hx_=d.axis==='x'?.15:(d.b-d.a)/2,hz_=d.axis==='x'?(d.b-d.a)/2:.15;
    box(Bm,M,hx_,d.dh/2,hz_,.5,.55,.65,0,2,false,.12);
    const col=d.locked?[1,.15,.2]:d.open>.5?[.3,1,.5]:d.col;const L=(d.b-d.a)/2;
    if(d.axis==='x'){box(Bw,M,.18,.05,L-.2,col[0],col[1],col[2],1.2,1,false,0);
      for(const s of [-1,1])for(const yy of [-.9,.9])box(Bm,Mt(M,s*.17,yy,0),.03,.12,L*.8,.3,.34,.4,0,1,false,.3)}
    else{box(Bw,M,L-.2,.05,.18,col[0],col[1],col[2],1.2,1,false,0);
      for(const s of [-1,1])for(const yy of [-.9,.9])box(Bm,Mt(M,0,yy,s*.17),L*.8,.12,.03,.3,.34,.4,0,1,false,.3)}
    box(Bw,Mt(M,0,0.9,0),d.axis==='x'?.17:.12,.4,d.axis==='x'?.12:.17,col[0],col[1],col[2],1.2,1,false,.2);
    CR=CAMR;CU=CAMU;if(!d.open||d.open<.9)spr(SA,d.cx,1.3,d.cz,1.0,col[0],col[1],col[2],.22);
  }
  for(const n of nodes){const M=M4.mul(M4.T(n.x,0,n.z),M4.RY(n.face>0?Math.PI/2:-Math.PI/2));
    pb(Bm,M,0,.6,0,.7,.6,.6,[.5,.55,.65],0,.12);pb(Bm,M,0,1.28,.0,.62,.04,.64,[.38,.42,.5],0,.2);
    pb(dB(MI.node),Mt(M4.mul(M,M4.RX(-.28)),0,1.7,-.12),.58,.5,.04,[1,1,1],0,.1,1.2);
    pb(Bm,M,0,1.65,.38,.6,.55,.14,[.3,.33,.4],0,.2);
    const col=n.done?[.2,1,.4]:(n.prog>0?[1,.8,.2]:[.2,.9,1]);pb(Bw,M,0,2.3,-.05,.35,.12,.3,col,1.3,.3);
    pb(Bw,M,0,1.05,-.62,.5,.04,.02,col,1.3,0);
    for(const s of [-1,1]){pb(Bm,M,s*.6,1.0,-.25,.06,.1,.12,[.25,.28,.34]);pb(Bw,M,s*.6,1.0,-.38,.03,.03,.01,col,1.3,0)}
    CR=CAMR;CU=CAMU;spr(SA,n.x+(n.face>0?.9:-.9),2.0,n.z,1.1,col[0],col[1],col[2],.5)}
  for(const it of ITEMS){if(it.taken)continue;const y=.55+Math.sin(it.t*2.4)*.09;const M=M4.mul(M4.T(it.x,y,it.z),M4.RY(it.t*1.6));let g;
    if(it.type==='hp'){g=[.2,1,.4];pb(Bm,M,0,0,0,.22,.16,.3,[.9,.95,.95],0,.5);pb(Bw,M,0,.17,0,.14,.012,.04,g,1.4,0);pb(Bw,M,0,.17,0,.04,.012,.14,g,1.4,0)}
    else if(it.type==='ar'){g=[.3,.6,1];ps(Bw,M,0,0,0,.2,.2,.1,g,1.1);pb(Bm,M,0,0,.08,.16,.16,.06,[.3,.35,.5],0,.5)}
    else if(it.type==='ammo'){g=[1,.8,.2];pb(Bm,M,0,0,0,.26,.14,.17,[.55,.5,.3],0,.4);pb(Bw,M,0,.15,0,.16,.012,.08,g,1.4,0);for(const s of [-1,1])pb(Bm,M,s*.27,0,0,.015,.1,.12,[.3,.28,.2],0,.2)}
    else{g=[.3,.95,1];pb(Bm,M,0,0,0,.08,.08,.5,[.25,.28,.35],0,.4);pb(Bw,M,0,.09,0,.015,.015,.4,g,1.4,0);pb(Bm,M,0,-.1,.3,.06,.12,.06,[.2,.22,.28],0,.3)}
    CR=CAMR;CU=CAMU;spr(SA,it.x,y,it.z,.8,g[0],g[1],g[2],.45);spr(SA,it.x,.05,it.z,.7,g[0],g[1],g[2],.3)}
  enemyModels(t);
  debrisDraw();
}
/* ---- 碎片 / 弹孔 ---- */
const DEB=[],DEC=[];let decI=0;
function addDebris(x,y,z,n,col,sp,em){
  const q=QL();n=Math.round(n*q.part);if(n<=0)return;
  for(let i=0;i<n&&DEB.length<160;i++){const a=R(TAU),e=R(-.2,1),s=R(.4,1)*(sp||5);
    DEB.push({x,y,z,vx:Math.cos(a)*s*(1-e*.3),vy:e*s+1.5,vz:Math.sin(a)*s*(1-e*.3),rx:R(TAU),ry:R(TAU),wx:R(-12,12),wy:R(-12,12),s:R(.025,.075),life:R(1.5,3.2),col:[col[0]*R(.7,1.1),col[1]*R(.7,1.1),col[2]*R(.7,1.1)],em:em?R(.6,1.2):0,ground:0})}
}
function updDebris(dt){
  for(let i=DEB.length-1;i>=0;i--){const p=DEB[i];p.life-=dt;if(p.life<=0){DEB.splice(i,1);continue}
    if(!p.ground){p.vy-=14*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rx+=p.wx*dt;p.ry+=p.wy*dt;
      if(p.y<p.s){p.y=p.s;if(Math.abs(p.vy)>1.2){p.vy=-p.vy*.35;p.vx*=.6;p.vz*=.6;p.wx*=.5;p.wy*=.5}else p.ground=1}
      else if(typeof solidAt==='function'&&false){}}
  }
}
function debrisDraw(){
  const B=dB(MI.metal);const Bw=dB(MI.white);
  for(const p of DEB){const M=M4.mul(M4.T(p.x,p.y,p.z),M4.mul(M4.RY(p.ry),M4.RX(p.rx)));const k=Math.min(1,p.life*1.5);
    box(p.em?Bw:B,M,p.s,p.s*.5,p.s*.8,p.col[0],p.col[1],p.col[2],p.em,.3,false,.3)}
}
function addDecal(x,y,z,nx,ny,nz,s,kind){
  const q=QL();if(!q.decals)return;
  const d={x:x+nx*.012,y:y+ny*.012,z:z+nz*.012,nx,ny,nz,s:s||.07,kind:kind||0,rot:R(TAU),t:NOWT};
  if(DEC.length<q.decals)DEC.push(d);else{DEC[decI%DEC.length]=d;decI++}
}
function drawDecals(t){
  CR=CAMR;CU=CAMU;
  for(const d of DEC){
    if(dist2(d.x,d.z,CAMP[0],CAMP[2])>900)continue;
    let tx,ty,tz;if(Math.abs(d.ny)>.9){tx=1;ty=0;tz=0}else{tx=-d.nz;ty=0;tz=d.nx;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l}
    let bx=d.ny*tz-d.nz*ty,by=d.nz*tx-d.nx*tz,bz=d.nx*ty-d.ny*tx;
    const c=Math.cos(d.rot),sn=Math.sin(d.rot);const ax=(tx*c+bx*sn)*d.s,ay=(ty*c+by*sn)*d.s,az=(tz*c+bz*sn)*d.s;const cx_=(-tx*sn+bx*c)*d.s,cy_=(-ty*sn+by*c)*d.s,cz_=(-tz*sn+bz*c)*d.s;
    const age=t-d.t;const col=d.kind?.0:.0;const a=d.kind?.85:.9;
    const P=[d.x-ax-cx_,d.y-ay-cy_,d.z-az-cz_,0,0,d.x+ax-cx_,d.y+ay-cy_,d.z+az-cz_,1,0,d.x+ax+cx_,d.y+ay+cy_,d.z+az+cz_,1,1,d.x-ax+cx_,d.y-ay+cy_,d.z-az+cz_,0,1];
    sprQ(SD,P,.02,.02,.025,a);
    if(age<3.5){const hk=1-age/3.5;const Q=P.slice();sprQ(SR,Q,d.kind?1:.9,d.kind?.55:.6,.15,hk*hk*1.1)}
  }
}
/* ---- 粒子 / 光束 / 尘埃 ---- */
const DUSTP=Array.from({length:70},(_,i)=>{const r=mulberry(i*91+5);return {x:r()*16,y:r()*5,z:r()*16,s:.01+r()*.02,a:r()*TAU}});
function particlesFx(t){
  CR=CAMR;CU=CAMU;const q=QL();
  for(const p of PT){const k=p.life/p.max;
    if(p.add&&p.gr){strk(SL,p.x,p.y,p.z,p.x-p.vx*.04,p.y-p.vy*.04,p.z-p.vz*.04,p.s*.35,p.r,p.g,p.b,k,CAMP[0],CAMP[1],CAMP[2]);spr(SA,p.x,p.y,p.z,p.s*1.2,p.r,p.g,p.b,k*.5)}
    else{const B=p.add?SA:SS;spr(B,p.x,p.y,p.z,p.s*(p.grow?1:(.5+.5*k)),p.r,p.g,p.b,p.a*(p.add?k:k*.8),p.rot)}}
  for(const l of TR){const k=l.life/l.max;strk(SL,l.x0,l.y0,l.z0,l.x1,l.y1,l.z1,l.w*(.5+k),l.col[0]*1.4,l.col[1]*1.4,l.col[2]*1.4,k,CAMP[0],CAMP[1],CAMP[2])}
  for(const p of PR){spr(SA,p.x,p.y,p.z,p.size*3,p.col[0],p.col[1],p.col[2],.7);spr(SA,p.x,p.y,p.z,p.size*1.3,1,1,1,1)}
  let nb=0;const bl=q.beams?[]:null;
  for(const l of lights){const dx=l.x-CAMP[0],dz=l.z-CAMP[2],d2=dx*dx+dz*dz;if(d2>38*38)continue;const f=l.fl?(Math.sin(t*37+l.x)>.55?.15:1):1;
    spr(SA,l.x,l.y,l.z,Math.min(1.6,l.rad*.1),l.r*f*.55,l.g*f*.55,l.b*f*.55,.35);
    if(bl&&l.key&&d2<30*30)bl.push({l,d2,f})}
  if(bl){bl.sort((a,b)=>a.d2-b.d2);const n=[0,3,6,10][q.beams];
    for(let i=0;i<n&&i<bl.length;i++){const {l,d2,f}=bl[i];const fade=1-Math.sqrt(d2)/30;const h=l.y;
      beam(SB,l.x,h-.1,Math.max(.05,0),l.z,.18,Math.min(2.4,l.rad*.2),l.r,l.g,l.b,.1*fade*f,CAMP[0],CAMP[2]);
      beam(SB,l.x,h-.1,.05,l.z,.1,Math.min(1.6,l.rad*.13),l.r,l.g,l.b,.07*fade*f,CAMP[0]+.001,CAMP[2])}}
  if(q.beams){const nd=q.beams===1?24:q.beams===2?44:70;
    for(let i=0;i<nd;i++){const d=DUSTP[i];
      const x=((d.x+t*d.s*3+Math.sin(t*.3+d.a)*.4-CAMP[0])%16+24)%16-8+CAMP[0],y=((d.y+t*d.s*-1.2-CAMP[1]+2.5)%5+10)%5-2.5+CAMP[1]+.0,z=((d.z+Math.cos(t*.25+d.a)*.4-CAMP[2])%16+24)%16-8+CAMP[2];
      if(y<.05)continue;spr(SA,x,y,z,d.s,.5,.7,.9,.35)}}
  drawDecals(t);
}
/* ---- 第一人称武器 ---- */
function viewModel(t){
  VB.n=0;VBw.n=0;VS.n=0;const w=INV[cw],d=w.d,ads=P.ads;
  if(P.dead||(d.id==='dmr'&&ads>.88))return false;
  SEG=12;
  const gunC=[.2,.22,.28],dark=[.08,.09,.12],glove=[.06,.065,.08],cyan=[.2,.95,1],steel=[.34,.36,.42];
  let x=lerp(.19,0,ads),y=lerp(-.2,-.052,ads),z=lerp(-.5,-.4,ads);
  const bobK=(1-ads*.8)*Math.min(1,P.speed/5);x+=Math.sin(P.bob)*.007*bobK;y+=Math.abs(Math.cos(P.bob))*-.006*bobK;
  z+=VM.kick*.05;
  let rx=-VM.kick*.07*(1-ads*.4),ry=0,rz=0;
  if(P.rl){const tt=1-P.rlT/d.reload;const dip=d.perShell?.5:Math.sin(clamp(tt,0,1)*Math.PI);y-=dip*.1;rx+=dip*.35;rz+=dip*.4;x-=dip*.04}
  if(P.swT>0){const a=P.swT>.18?(.36-P.swT)/.18:P.swT/.18;y-=a*.28;rx+=a*.6}
  if(P.sprint&&P.speed>3){x-=.07;ry+=.5;rx-=.15;y-=.03}
  VM.sx=(VM.sx||0)*.9-IN.dx*.00018;VM.sy=(VM.sy||0)*.9+IN.dy*.00018;x+=clamp(VM.sx,-.04,.04);y+=clamp(VM.sy,-.04,.04);
  const M=M4.mul(M4.T(x,y,z),M4.mul(M4.RY(ry),M4.mul(M4.RX(rx),M4.mul(M4.RZ(rz),M4.S(.55,.55,.55)))));
  const Bm=VB,Bw=VBw;
  const bx=(x_,y_,z_,a,b,c_,col,em,B,bv)=>box(B||Bm,Mt(M,x_,y_,z_),a,b,c_,col[0],col[1],col[2],em||0,.1,false,bv===undefined?.3:bv);
  const bxr=(x_,y_,z_,rxx,a,b,c_,col,em,B)=>box(B||Bm,M4.mul(Mt(M,x_,y_,z_),M4.RX(rxx)),a,b,c_,col[0],col[1],col[2],em||0,.1,false,.3);
  const zc=(x_,y_,z0,z1,r,col,r2,em,B)=>{const Ma=M4.mul(Mt(M,x_,y_,(z0+z1)/2),M4.alignY(0,0,-1));cyl(B||Bm,Ma,r2===undefined?r:r2,r,Math.abs(z1-z0),12,col[0],col[1],col[2],em||0)};
  const hand=(x_,y_,z_,sx)=>{bx(x_,y_,z_,.036,.032,.05,glove,0,Bm,.7);for(let i=0;i<4;i++)bx(x_+(i-1.5)*.017*(sx||1),y_+.01,z_-.055,.008,.012,.03,glove,0,Bm,.8)};
  const sleeve=(x0,y0,z0,x1,y1,z1)=>{const dx=x1-x0,dy=y1-y0,dz=z1-z0,l=Math.hypot(dx,dy,dz);cyl(Bm,M4.mul(Mt(M,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2),M4.alignY(dx/l,dy/l,dz/l)),.045,.038,l,10,.1,.11,.14,0)};
  if(d.id==='rifle'){
    bx(0,0,-.05,.034,.05,.22,gunC);bx(0,.062,-.08,.014,.012,.14,dark,0,Bm,.1);bx(0,.075,.05,.012,.016,.02,dark);bx(0,.075,-.2,.006,.014,.006,dark);
    zc(0,.015,-.27,-.62,.017,dark);zc(0,.012,-.36,-.52,.026,steel);zc(0,.015,-.6,-.72,.014,steel,.02);
    bx(0,.0,-.45,.02,.026,.07,gunC);
    bxr(0,-.1,-.015,.18,.02,.07,.04,dark);bx(0,-.095,.1,.02,.06,.024,dark);bx(0,-.01,.3,.024,.04,.1,gunC);bx(0,-.01,.4,.03,.05,.012,dark);
    bx(.0352,.02,-.06,.002,.012,.12,cyan,1.4,Bw,0);bx(-.0352,.02,-.06,.002,.012,.12,cyan,1.4,Bw,0);bx(0,.0,-.725,.01,.01,.004,cyan,1.4,Bw,0);bx(.0,.052,.14,.014,.002,.03,cyan,1.2,Bw,0);
    bx(.036,-.005,.06,.002,.012,.03,[1,.5,.1],1.2,Bw,0);
    hand(0,-.03,.12);hand(-.02,-.01,-.26);sleeve(-.1,-.1,-.05,-.05,-.08,.3);sleeve(0,-.05,.33,-.1,-.25,.6);
  }else if(d.id==='shot'){
    bx(0,0,-.02,.038,.05,.2,gunC);zc(0,.012,-.2,-.62,.016,dark);zc(0,-.03,-.2,-.58,.016,dark);zc(0,-.03,-.62,-.64,.02,steel);
    const pump=VM.pump>.0?Math.sin(VM.pump*Math.PI)*.09:0;bx(0,-.03,-.3+pump,.03,.03,.075,[.35,.28,.2],0,Bm,.5);
    for(let i=0;i<4;i++)bx(0,-.03,-.35+pump+i*.03,.032,.005,.004,dark,0,Bm,0);
    bx(0,-.01,.28,.026,.045,.12,[.3,.22,.15]);bxr(0,-.095,.06,-.2,.02,.06,.024,dark);
    bx(0,.05,-.62,.006,.012,.006,cyan,1.3,Bw,0);bx(.039,.012,-.04,.002,.015,.1,[1,.5,.15],1.3,Bw,0);bx(-.039,.012,-.04,.002,.015,.1,[1,.5,.15],1.3,Bw,0);
    hand(0,-.03,.1);hand(-.015,-.015,-.3+pump);sleeve(-.1,-.1,-.08,-.05,-.08,.3);sleeve(0,-.05,.3,-.1,-.25,.6);
  }else{
    bx(0,0,-.05,.03,.045,.26,gunC);zc(0,.01,-.3,-.88,.009,dark);zc(0,.012,-.3,-.5,.02,steel);zc(0,.012,-.84,-.9,.014,steel,.018);
    bx(0,.085,-.04,.02,.022,.11,dark);zc(0,.085,-.2,-.12,.026,dark,.026);bx(0,.085,-.16,.024,.026,.006,cyan,1.2,Bw,0);bx(0,.085,.07,.022,.024,.008,cyan,.8,Bw,0);
    bxr(0,-.1,-.02,.1,.02,.06,.035,dark);bx(0,-.09,.12,.02,.06,.024,dark);bx(0,-.01,.34,.024,.045,.12,gunC);
    bx(.031,.015,-.08,.002,.01,.14,cyan,1.4,Bw,0);bx(-.031,.015,-.08,.002,.01,.14,cyan,1.4,Bw,0);
    hand(0,-.03,.13);hand(-.02,-.01,-.28);sleeve(-.1,-.1,-.06,-.05,-.08,.3);sleeve(0,-.05,.34,-.1,-.25,.6);
  }
  if(VM.flash>0){CR=[1,0,0];CU=[0,1,0];const mz=d.id==='shot'?-.78:d.id==='dmr'?-.92:-.76;
    const pz=Mt(M,0,.014,mz);const s=(d.id==='shot'?.24:.15)*(VM.flash/.06*.5+.5);spr(VS,pz[12],pz[13],pz[14],s,1,.85,.5,1,R(TAU));spr(VS,pz[12],pz[13],pz[14],s*.6,1,1,1,1,R(TAU));
    VM.fx=VM.flash/.06*1.6}
  SEG=10;
  return true;
}
