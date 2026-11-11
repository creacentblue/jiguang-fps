/* ---------- 游戏状态 ---------- */
const IN={keys:{},md:false,mr:false,edge:0,dx:0,dy:0,ax:0,ay:0};
const DF=[{dmg:.55,err:1.5,hp:.85},{dmg:1,err:1,hp:1},{dmg:1.35,err:.75,hp:1.2}];
const P={x:0,y:0,z:19,vx:0,vz:0,vy:0,yaw:0,pitch:0,hp:100,ar:0,og:true,crouch:0,crouched:false,sprint:false,bob:0,stepT:0,kickP:0,heat:0,ads:0,fireCd:0,rl:0,rlT:0,swT:0,swTo:0,dead:false,roll:0,shake:0,hurtT:0,speed:0,lastCw:0,r:.34};
const G={state:'title',time:0,kills:0,shots:0,hits:0,deaths:0,phase:0,cp:0,god:false,nodesDone:0,pylons:4,boss:null,win:false,winT:0,bot:false,enemyCount:0,said:{}};
const EN=[],PR=[],PT=[],TR=[],DL=[],ITEMS=[],HM=[],DI=[];// DL 动态光 HM 命中标记 DI 伤害方向
const CPS=[{x:0,z:19,yaw:0},{x:0,z:-3,yaw:0},{x:0,z:-3,yaw:0},{x:0,z:-33,yaw:0}];
const eyeH=()=>lerp(1.62,1.08,P.crouch), bodyH=()=>lerp(1.8,1.2,P.crouch);

/* ---------- 武器 ---------- */
const WD=[
 {id:'rifle',name:'MK-9 脉冲步枪',auto:true,rpm:640,dmg:15,pel:1,mag:30,res0:120,maxRes:240,reload:1.95,hs:2,spread:.3,heat:.32,heatMax:3.4,heatDec:5.5,moveSp:1.6,adsSp:.35,kick:.52,kickY:.2,adsKick:.65,fov:.72,noise:24,sfx:'rifle',range:120,sway:1},
 {id:'shot',name:'裂隙-12 霰弹枪',auto:false,rpm:68,dmg:10.5,pel:9,mag:6,res0:24,maxRes:48,reload:.55,perShell:true,hs:1.5,spread:4.6,heat:0,heatMax:0,heatDec:1,moveSp:1.5,adsSp:.7,kick:3.6,kickY:.5,adsKick:.8,fov:.85,noise:32,sfx:'shot',range:60,fall:[9,26],sway:1.3},
 {id:'dmr',name:'银针 精确射手步枪',auto:false,rpm:150,dmg:64,pel:1,mag:10,res0:30,maxRes:60,reload:2.4,hs:2.4,spread:1.8,heat:.8,heatMax:2.5,heatDec:3.5,moveSp:3.5,adsSp:.01,kick:1.9,kickY:.3,adsKick:.7,fov:.3,noise:30,sfx:'dmr',range:200,sway:.7}
];
const INV=WD.map(d=>({d,mag:d.mag,res:d.res0,have:d.id==='rifle'}));
let cw=0;
function camBasis(){
  const p=P.pitch+P.kickP,cy=Math.cos(P.yaw),sy=Math.sin(P.yaw),cp=Math.cos(p),sp=Math.sin(p);
  const f=[-sy*cp,sp,-cy*cp],r=[cy,0,-sy];
  const u=[-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]];
  return {f,r,u};
}
function eyePos(){return [P.x,P.y+eyeH(),P.z]}
function curSpread(){
  const d=INV[cw].d;let s=d.spread;
  s*=lerp(1,d.adsSp,P.ads);
  const sp=P.speed;s+=d.moveSp*clamp(sp/5,0,1.4)*(1-P.ads*.6);
  if(!P.og)s+=d.moveSp*1.5;if(P.crouched)s*=.7;
  return s+P.heat;
}
function rayBox(ox,oy,oz,dx,dy,dz,x0,y0,z0,x1,y1,z1){
  let a=0,b=1e9;
  for(let i=0;i<3;i++){const o=i===0?ox:i===1?oy:oz,d=i===0?dx:i===1?dy:dz,lo=i===0?x0:i===1?y0:z0,hi=i===0?x1:i===1?y1:z1;
    if(Math.abs(d)<1e-9){if(o<lo||o>hi)return null}else{let t0=(lo-o)/d,t1=(hi-o)/d;if(t0>t1){const t=t0;t0=t1;t1=t}if(t0>a)a=t0;if(t1<b)b=t1;if(a>b)return null}}
  return b<0?null:a;
}
function raySphere(ox,oy,oz,dx,dy,dz,cx,cy,cz,r){
  const lx=cx-ox,ly=cy-oy,lz=cz-oz,tc=lx*dx+ly*dy+lz*dz;if(tc<0)return null;
  const d2=lx*lx+ly*ly+lz*lz-tc*tc;if(d2>r*r)return null;return tc-Math.sqrt(r*r-d2);
}
function rayEnemies(ox,oy,oz,dx,dy,dz,maxT){
  let best=null;
  for(const e of EN){if(e.dead)continue;const T=e.T,b=T.bb;
    const tb=rayBox(ox,oy,oz,dx,dy,dz,e.x-b.r,e.y+b.y0,e.z-b.r,e.x+b.r,e.y+b.y1,e.z+b.r);
    let th=null;if(T.head)th=raySphere(ox,oy,oz,dx,dy,dz,e.x,e.y+T.head.y,e.z,T.head.r);
    let t=null,head=false;
    if(th!==null&&(tb===null||th<=tb+.35)){t=th;head=true}else if(tb!==null)t=tb;
    if(t!==null&&t<maxT&&(!best||t<best.t))best={e,t,head};
  }
  return best;
}
function addDL(x,y,z,r,g,b,rad,life){DL.push({x,y,z,r,g,b,rad,life,max:life})}
function spark(x,y,z,nx,ny,nz,n,r,g,b,sp){
  n=Math.max(1,Math.round(n*QL().part));
  for(let i=0;i<n;i++){const s=(sp||4)*(.3+Math.random());PT.push({x,y,z,vx:nx*s+R(-2,2),vy:ny*s+R(-1,3),vz:nz*s+R(-2,2),life:R(.15,.45),max:.45,s:.05+Math.random()*.04,r,g,b,gr:9,add:1,a:1})}
}
function puff(x,y,z,n,s0,r,g,b,life,up){for(let i=0;i<n;i++)PT.push({x:x+R(-.2,.2),y:y+R(-.1,.2),z:z+R(-.2,.2),vx:R(-.8,.8),vy:R(.2,1.2)*(up||1),vz:R(-.8,.8),life:R(.5,1)*life,max:life,s:s0*R(.7,1.2),r,g,b,gr:-.2,add:0,a:.35,grow:1.6})}
function boomFx(x,y,z,sz,col){
  col=col||[1,.55,.2];
  for(let i=0;i<28;i++){const a=R(TAU),e=R(-.6,1),sp=R(2,9)*sz;PT.push({x,y,z,vx:Math.cos(a)*sp*(1-Math.abs(e)*.4),vy:e*sp+2,vz:Math.sin(a)*sp*(1-Math.abs(e)*.4),life:R(.3,.8),max:.8,s:R(.1,.25)*sz,r:col[0],g:col[1],b:col[2],gr:8,add:1,a:1})}
  puff(x,y,z,8,.9*sz,.25,.25,.28,1.6);addDebris(x,y,z,Math.round(10*sz),[.35,.37,.42],6*sz,0);addDebris(x,y,z,Math.round(4*sz),col,5*sz,1);if(y<3&&sz>.5)addDecal(x,.012,z,0,1,0,.7*sz,1);
  PT.push({x,y,z,vx:0,vy:0,vz:0,life:.35,max:.35,s:2.6*sz,r:col[0],g:col[1],b:col[2],gr:0,add:1,a:1,grow:1.3});
  addDL(x,y,z,col[0]*2.5,col[1]*2.5,col[2]*2.5,10*sz,.5);
}
function noiseAt(x,z,rad){
  for(const e of EN){if(e.dead||e.T.static)continue;
    if(e.state==='idle'||e.state==='alert'){if(dist2(e.x,e.z,x,z)<rad*rad){e.state='alert';e.lastX=x;e.lastZ=z;e.aware=Math.max(e.aware,.5);e.alertT=6}}}
}
/* 开火 */
function startReload(){
  const w=INV[cw];if(P.rl||w.mag>=w.d.mag||w.res<=0||P.swT>0)return;
  P.rl=1;P.rlT=w.d.reload;SFX.reload(w.d.perShell?1:0);
}
function fireShot(){
  const w=INV[cw],d=w.d;w.mag--;P.fireCd=60/d.rpm;G.shots++;
  const sp=curSpread()*D2R;const {f,r,u}=camBasis();const [ex,ey,ez]=eyePos();
  const mx=ex+f[0]*.9+r[0]*.2-u[0]*.14,my=ey+f[1]*.9+r[1]*.2-u[1]*.14,mz=ez+f[2]*.9+r[2]*.2-u[2]*.14;
  let any=false,killed=false,head=false;
  for(let k=0;k<d.pel;k++){
    const a=Math.sqrt(Math.random())*Math.tan(sp),ph=Math.random()*TAU,ca=Math.cos(ph)*a,sa=Math.sin(ph)*a;
    let dx=f[0]+r[0]*ca+u[0]*sa,dy=f[1]+r[1]*ca+u[1]*sa,dz=f[2]+r[2]*ca+u[2]*sa;const l=Math.hypot(dx,dy,dz);dx/=l;dy/=l;dz/=l;
    const rw=rayWorld(ex,ey,ez,dx,dy,dz,d.range),re=rayEnemies(ex,ey,ez,dx,dy,dz,d.range);
    let t=rw.t,hit=null;
    if(re&&re.t<rw.t){t=re.t;hit=re}
    const hx=ex+dx*t,hy=ey+dy*t,hz=ez+dz*t;
    if(hit){
      let dm=d.dmg*(hit.head?d.hs:1);if(d.fall)dm*=clamp(1-(t-d.fall[0])/d.fall[1],.25,1);
      const was=hit.e.dead;hurtEnemy(hit.e,dm,hit.head,t);any=true;if(hit.head)head=true;if(hit.e.dead&&!was)killed=true;
      spark(hx,hy,hz,-dx,.3,-dz,hit.e.T.kind?5:4,.4,.9,1,5);
    }else if(rw.n){
      addDecal(hx,hy,hz,rw.n[0],rw.n[1],rw.n[2],d.id==='shot'?.045:.07,0);if(k<2)addDebris(hx,hy,hz,2,[.4,.42,.48],2.5,0);
      spark(hx,hy,hz,rw.n[0],rw.n[1],rw.n[2],5,1,.8,.4,4);puff(hx+rw.n[0]*.05,hy+rw.n[1]*.05,hz+rw.n[2]*.05,1,.25,.5,.5,.55,.5,.3);
      if(k===0||d.pel<3)addDL(hx+rw.n[0]*.2,hy+rw.n[1]*.2,hz+rw.n[2]*.2,1,.7,.3,2.5,.07);
    }
    if(k<3||d.pel<3)TR.push({x0:mx,y0:my,z0:mz,x1:hx,y1:hy,z1:hz,life:.07,max:.07,col:d.id==='dmr'?[.6,.9,1]:d.id==='shot'?[1,.8,.4]:[.4,1,1],w:d.id==='dmr'?.03:.018});
  }
  if(any){G.hits++;HM.push({t:.22,kill:killed,head});SFX.hit(head)}
  if(killed)SFX.kill();
  const ak=lerp(1,d.adsKick,P.ads),kk=d.kick*ak*R(.85,1.15)*D2R;
  P.kickP+=kk;P.pitch+=kk*.55;P.yaw+=R(-1,1)*d.kickY*ak*D2R;P.heat=Math.min(d.heatMax,P.heat+d.heat);P.shake=Math.max(P.shake,d.id==='shot'?.5:.18);
  VM.kick=1;VM.flash=.06;VM.pump=d.id==='shot'?1:0;
  addDL(mx,my,mz,2.2,1.6,.8,7,.06);
  SFX[d.sfx]();noiseAt(P.x,P.z,d.noise);
  if(d.id==='shot')setTimeout(()=>{if(G.state==='playing')SFX.pump()},300);
  if(w.mag<=0&&w.res>0)setTimeout(()=>{if(G.state==='playing'&&INV[cw]===w)startReload()},200);
}
const VM={kick:0,flash:0,pump:0,bob:0,sw:0};
function switchTo(i){
  if(i===cw&&P.swT<=0||!INV[i].have||P.swT>0&&P.swTo===i)return;
  P.lastCw=cw;P.swTo=i;P.swT=.36;P.rl=0;SFX.swap();
}
function updWeapon(dt){
  const w=INV[cw],d=w.d;
  P.fireCd-=dt;P.heat=Math.max(0,P.heat-d.heatDec*dt);P.kickP*=Math.exp(-9*dt);
  if(P.swT>0){const before=P.swT;P.swT-=dt;if(before>.18&&P.swT<=.18){cw=P.swTo;P.heat=0}if(P.swT<=0)P.swT=0}
  const ww=INV[cw];
  const want=IN.mr&&!P.sprint&&!P.rl&&P.swT<=0&&!P.dead;
  P.ads=clamp(P.ads+(want?1:-1)*dt*(ww.d.id==='dmr'?6:9),0,1);
  if(P.rl){P.rlT-=dt;
    if(ww.d.perShell){
      if(P.rlT<=0){ww.mag++;ww.res--;SFX.reload(1);if(ww.mag<ww.d.mag&&ww.res>0)P.rlT=ww.d.reload;else{P.rl=0;SFX.pump()}}
      if(IN.md&&ww.mag>0&&P.fireCd<=0){P.rl=0}
    }else if(P.rlT<=0){const n=Math.min(ww.d.mag-ww.mag,ww.res);ww.mag+=n;ww.res-=n;P.rl=0}
  }
  if(P.swT<=0&&!P.rl&&!P.dead&&P.fireCd<=0){
    const trig=ww.d.auto?IN.md:IN.edge>0;
    if(trig){
      if(ww.mag>0&&!(P.sprint&&P.speed>6)){fireShot();IN.edge=0}
      else if(ww.mag<=0){if(ww.res>0)startReload();else if(IN.edge>0){SFX.empty()}IN.edge=0;P.fireCd=.2}
    }
  }
  IN.edge=Math.max(0,IN.edge-dt*6);
}
/* ---------- 玩家 ---------- */
function updPlayer(dt){
  const k=IN.keys;
  const fw=clamp((k.KeyW?1:0)-(k.KeyS?1:0)+IN.ay,-1,1),st=clamp((k.KeyD?1:0)-(k.KeyA?1:0)+IN.ax,-1,1);
  P.sprint=!!(k.ShiftLeft||k.ShiftRight)&&fw>0&&!P.crouched&&P.ads<.3&&!(IN.md&&INV[cw].mag>0&&P.fireCd>-.2&&false);
  const cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);
  let wx=-sn*fw+cs*st,wz=-cs*fw-sn*st;const wl=Math.hypot(wx,wz);if(wl>1){wx/=wl;wz/=wl}
  let spd=P.crouched?2.4:P.sprint?7.1:4.7;spd*=lerp(1,.68,P.ads);if(P.rl&&INV[cw].d.id==='dmr')spd*=.9;
  const acc=P.og?13:2.6;const tx=wx*spd,tz=wz*spd;
  P.vx+=(tx-P.vx)*Math.min(1,acc*dt);P.vz+=(tz-P.vz)*Math.min(1,acc*dt);
  P.crouch=clamp(P.crouch+(P.crouched?1:-1)*dt*7,0,1);
  const h=bodyH();P.hitx=P.hitz=false;
  moveXZ(P,P.r,h,P.vx*dt,P.vz*dt,.52,P.og);
  if(P.hitx)P.vx*=.2;if(P.hitz)P.vz*=.2;
  if(k.Space&&P.og&&!P.crouched){P.vy=6.7;P.og=false;SFX.step(1.4)}
  P.vy-=19*dt;const pv=P.vy;const res=moveY(P,P.r,h,P.vy*dt);
  if(res===-1){if(!P.og&&pv<-5){SFX.land();P.shake=Math.max(P.shake,.15)}P.og=true;P.vy=0}else{if(res===1)P.vy=0;if(P.vy<-.3||P.vy>0)P.og=false}
  if(P.y<-30)P.y=0;
  P.speed=Math.hypot(P.vx,P.vz);
  if(P.og&&P.speed>1){P.bob+=dt*P.speed*1.5;P.stepT-=dt*P.speed;if(P.stepT<=0){P.stepT=P.sprint?3.4:2.5;SFX.step(P.crouched?.4:P.sprint?1.3:1)}}
  P.roll+=((st*-.012*(P.speed>1?1:0))-P.roll)*Math.min(1,8*dt);
  P.shake=Math.max(0,P.shake-dt*2.5);P.hurtT=Math.max(0,P.hurtT-dt);
}
function hurtPlayer(dm,sx,sz){
  if(P.dead||G.state!=='playing')return;dm*=DF[CFG.diff].dmg;
  if(G.god)return;
  const ab=Math.min(P.ar,dm*.6);P.ar-=ab;P.hp-=dm-ab;P.hurtT=.5;P.shake=Math.max(P.shake,.35);SFX.hurt();
  if(sx!==undefined){const a=Math.atan2(sx-P.x,-(sz-P.z));DI.push({a,t:1.6})}// 相对世界北(-z)
  if(P.hp<=0){P.hp=0;playerDie()}
}
/* ---------- 拾取 ---------- */
function addItem(type,x,z,o){ITEMS.push(Object.assign({type,x,y:0,z,taken:false,t:Math.random()*6},o||{}))}
function giveAmmo(f){for(const w of INV)if(w.have)w.res=Math.min(w.d.maxRes,w.res+Math.round(w.d.res0*.4*f))}
function updItems(dt){
  for(const it of ITEMS){if(it.taken)continue;it.t+=dt;
    if(Math.abs(it.x-P.x)<1.15&&Math.abs(it.z-P.z)<1.15&&Math.abs(it.y-P.y)<2){
      let ok=true;
      if(it.type==='hp'){if(P.hp>=100)ok=false;else{P.hp=Math.min(100,P.hp+40);toast('生命 +40')}}
      else if(it.type==='ar'){if(P.ar>=100)ok=false;else{P.ar=Math.min(100,P.ar+50);toast('护甲 +50')}}
      else if(it.type==='ammo'){const full=INV.every(w=>!w.have||w.res>=w.d.maxRes);if(full)ok=false;else{giveAmmo(1);toast('弹药补充')}}
      else if(it.type==='w_shot'||it.type==='w_dmr'){const w=INV[it.type==='w_shot'?1:2];w.have=true;w.mag=w.d.mag;w.res=Math.max(w.res,w.d.res0);toast('获得 '+w.d.name);switchTo(INV.indexOf(w));
        if(it.type==='w_shot')say('白鹭','是裂隙-12 霰弹枪，近距离一枪一个，注意换弹。',4.5);else say('白鹭',TOUCH?'银针精确射手步枪。点「开镜」键瞄准头部。':'银针精确射手步枪。右键开镜，瞄准头部。',4.5)}
      if(ok){it.taken=true;SFX.pickup();addDL(it.x,.8,it.z,.6,1,.8,4,.25)}
    }
  }
}
function dropAt(x,z){const r=Math.random();if(r<.12)addItem('hp',x,z);else if(r<.2)addItem('ar',x,z);else if(r<.42)addItem('ammo',x,z)}

/* ---------- 敌人 ---------- */
const ET={
 sentry:{n:'哨兵',hp:75,speed:3.1,r:.36,h:1.85,eye:1.55,gunY:1.28,bb:{r:.36,y0:0,y1:1.5},head:{y:1.68,r:.23},sight:32,fov:2.3,rMin:6,rMax:20,burst:3,gap:.13,cd:[.9,1.7],tele:.3,dmg:7,bolt:34,errMax:4.2,errMin:1.4,react:.55,cover:true,tint:[.62,.66,.82],glow:[1,.25,.85],drop:.35},
 heavy:{n:'重装',hp:320,speed:2.0,r:.5,h:2.3,eye:1.9,gunY:1.5,bb:{r:.52,y0:0,y1:1.95},head:{y:2.12,r:.27},sight:34,fov:2.2,rMin:8,rMax:24,burst:4,gap:.12,cd:[1.5,2.5],tele:.5,dmg:9,bolt:36,errMax:3.5,errMin:1.2,react:.7,armor:.55,cover:false,tint:[.72,.5,.4],glow:[1,.55,.1],drop:.8},
 drone:{n:'悬浮机',hp:55,speed:4.3,r:.4,h:.7,eye:.3,fly:true,gunY:0,bb:{r:.4,y0:-.3,y1:.35},head:null,sight:34,fov:6.3,rMin:7,rMax:18,burst:1,gap:.1,cd:[1.0,1.9],tele:.42,dmg:9,bolt:23,errMax:3.2,errMin:1.5,react:.7,tint:[.6,.7,.8],glow:[.2,1,1],drop:.2},
 rusher:{n:'自爆机',hp:36,speed:6.8,r:.32,h:.6,bb:{r:.34,y0:0,y1:.5},head:null,sight:28,fov:3,melee:true,react:.1,tint:[.55,.5,.55],glow:[1,.2,.2],drop:0},
 pylon:{n:'防护柱',hp:230,r:.6,static:true,kind:'pylon',bb:{r:.62,y0:0,y1:4.2},head:null,tint:[.5,.45,.45],glow:[1,.5,.1]},
 core:{n:'回响核心',hp:2400,r:1.2,static:true,kind:'core',bb:{r:1.3,y0:-1.3,y1:1.3},head:null,tint:[.5,.5,.55],glow:[1,.3,.15]}
};
function addEn(type,x,z,o){
  o=o||{};const T=ET[type],hpm=DF[CFG.diff].hp;
  const e={type,T,x,y:o.y!==undefined?o.y:(T.fly?2.3:0),z,hx:x,hz:z,yaw:o.yaw||0,hp:T.hp*hpm,max:T.hp*hpm,state:'idle',aware:0,senseT:Math.random()*.2,see:false,lostT:0,lastX:x,lastZ:z,t:Math.random()*10,flash:0,dead:false,dt:0,vy:0,
   patrol:o.patrol||null,pi:0,wait:R(.5,2),fireT:R(.6,1.4),burst:0,shotT:0,tele:0,react:0,focus:0,strafe:Math.random()<.5?1:-1,strafeT:R(1,2.5),coverCd:R(0,3),coverPh:0,coverT:0,cp:null,recent:0,walk:0,path:null,pathT:0,fuse:0,alertT:0,crouchV:0,sneakBonus:1,wave:!!o.wave,orbit:Math.random()<.5?1:-1};
  EN.push(e);return e;
}
function toCombat(e,delay){
  if(e.state==='combat'||e.state==='cover')return;e.state='combat';e.react=delay!==undefined?delay:e.T.react;e.lostT=0;e.focus=0;
  for(const o of EN){if(o===e||o.dead||o.T.static||o.state==='combat'||o.state==='cover')continue;
    if(dist2(o.x,o.z,e.x,e.z)<15*15){o.state='alert';o.lastX=P.x;o.lastZ=P.z;o.aware=Math.max(o.aware,.7);o.alertT=5}}
}
function hurtEnemy(e,dm,head,dist){
  const T=e.T;
  if(T.static){const c=EN.find(o=>o.T.kind==='core');if(c&&!c.active&&e!==c){SFX.ping([e.x,e.y,e.z]);return}if(e===c&&!c.active){return}}
  if(T.kind==='core'){if(G.pylons>0){e.shield=.3;if(!G.said.shield){G.said.shield=1;say('白鹭','核心有护盾！先打掉周围的四根防护柱！',4)}SFX.ping([e.x,e.y,e.z]);return}
    e.flash=1;e.hp-=dm;if(e.hp<=0)killEnemy(e);return}
  if(T.armor&&!head)dm*=T.armor;
  if((e.state==='idle'||e.state==='alert')&&!e.see)dm*=1.4;
  e.hp-=dm;e.flash=1;e.recent+=dm;
  if(T.kind==='pylon'){SFX.ping([e.x,e.y,e.z]);if(e.hp<=0)killEnemy(e);return}
  if(e.state==='idle'||e.state==='alert'){toCombat(e,.25);e.lastX=P.x;e.lastZ=P.z}
  if(e.hp<=0)killEnemy(e);else SFX.ping([e.x,e.y+1,e.z]);
}
function killEnemy(e){
  if(e.dead)return;e.dead=true;e.dt=0;e.hp=0;
  const T=e.T;
  if(T.kind==='pylon'){G.pylons--;boomFx(e.x,e.y+2,e.z,1.2);SFX.boom([e.x,e.y,e.z]);G.shakeAll=.6;say(G.pylons>0?'白鹭':'白鹭',G.pylons>0?`防护柱已摧毁，还剩 ${G.pylons} 根。`:'四根防护柱全毁，核心暴露了，集火它！',4);if(G.pylons===0)setObj('击毁回响核心','护盾已失效——攻击核心中心的发光体');return}
  if(T.kind==='core'){coreDeath(e);return}
  G.kills++;
  if(T.melee){boomFx(e.x,e.y+.3,e.z,.7);SFX.boom([e.x,e.y,e.z])}
  else{boomFx(e.x,e.y+(T.fly?0:1),e.z,T.hp>200?1.1:.55,T.glow);SFX.boom([e.x,e.y,e.z]);if(Math.random()<(T.drop||0))dropAt(e.x,e.z);}
  for(const o of EN)if(o!==e&&!o.dead&&o.wave===false&&false)0;
}
function wrapA(a){while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a}
function senseE(e){
  const T=e.T,dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz);let see=false;
  const ey=e.y+(T.eye||0.5);
  if(d<T.sight&&!P.dead){
    const ang=Math.abs(wrapA(Math.atan2(-dx,-dz)-e.yaw));
    if((e.state==='combat'||e.state==='cover')||ang<T.fov/2||d<5){
      see=hasLOS(e.x,ey,e.z,P.x,P.y+eyeH()*.85,P.z);
    }
  }
  e.see=see;
  if(see){e.lastX=P.x;e.lastZ=P.z;e.lostT=0;
    if(e.state==='idle'||e.state==='alert'){e.aware+=.14*(1.4+3.5*(1-d/T.sight))*(P.crouched?.7:1)*(P.sprint?1.3:1);if(e.aware>=1)toCombat(e)}
  }else{e.aware=Math.max(0,e.aware-.04)}
}
function goTo(e,tx,tz,spd,dt,face){
  let wx=tx,wz=tz;const T=e.T;
  if(!gridLine(e.x,e.z,tx,tz)){
    e.pathT-=dt;
    if(!e.path||e.pathT<=0||dist2(e.ptx||0,e.ptz||0,tx,tz)>4){e.path=navPath(e.x,e.z,tx,tz);e.ptx=tx;e.ptz=tz;e.pathT=.8+Math.random()*.4}
    if(e.path&&e.path.length){while(e.path.length>1&&dist2(e.x,e.z,e.path[0][0],e.path[0][1])<.45)e.path.shift();wx=e.path[0][0];wz=e.path[0][1]}
  }else e.path=null;
  let dx=wx-e.x,dz=wz-e.z;const l=Math.hypot(dx,dz);if(l<.05)return 0;dx/=l;dz/=l;
  const step=Math.min(spd*dt,l+.2);const ox=e.x,oz=e.z;
  e.hitx=e.hitz=false;moveXZ(e,T.r,T.h,dx*step,dz*step,.5,!T.fly);
  if(face!==false)e.yaw+=wrapA(Math.atan2(-dx,-dz)-e.yaw)*Math.min(1,10*dt);
  const mv=Math.hypot(e.x-ox,e.z-oz);e.walk+=mv*3;return mv;
}
function faceP(e,dt,rate){const a=Math.atan2(-(P.x-e.x),-(P.z-e.z));e.yaw+=wrapA(a-e.yaw)*Math.min(1,(rate||9)*dt)}
function enemyFire(e,tele){
  const T=e.T,dm=T.dmg;
  const sx=e.x-Math.sin(e.yaw)*.45,sz=e.z-Math.cos(e.yaw)*.45,sy=e.y+T.gunY;
  const tx=P.x,ty=P.y+eyeH()*.6,tz=P.z;
  let dx=tx-sx,dy=ty-sy,dz=tz-sz;const l=Math.hypot(dx,dy,dz);dx/=l;dy/=l;dz/=l;
  const err=lerp(T.errMax,T.errMin,clamp(e.focus,0,1))*DF[CFG.diff].err*(1+P.speed*.12)*D2R;
  const a=Math.random()*TAU,m=Math.random()*Math.tan(err);
  // 垂直于 dir 的偏移
  let px=-dz,pz=dx;const pl=Math.hypot(px,pz)||1;px/=pl;pz/=pl;
  dx+=px*Math.cos(a)*m;dz+=pz*Math.cos(a)*m;dy+=Math.sin(a)*m;const l2=Math.hypot(dx,dy,dz);dx/=l2;dy/=l2;dz/=l2;
  PR.push({x:sx,y:sy,z:sz,vx:dx*T.bolt,vy:dy*T.bolt,vz:dz*T.bolt,life:3,dmg:dm,col:T.glow,size:T.fly?.16:.1,own:e});
  SFX.efire([sx,sy,sz],e.type);addDL(sx,sy,sz,T.glow[0]*1.5,T.glow[1]*1.5,T.glow[2]*1.5,4,.06);
}
function findCover(e){
  let best=null,bd=1e9;
  for(const c of coverPts){const dd=dist2(c.x,c.z,e.x,e.z);if(dd>14*14||dd>bd)continue;
    if(dist2(c.x,c.z,P.x,P.z)<5*5)continue;
    if(hasLOS(c.x,1.3,c.z,P.x,P.y+eyeH()*.8,P.z))continue;// 要能挡住玩家视线
    if(!nvOK(nvI(c.x),nvJ(c.z)))continue;
    bd=dd;best=c}
  return best;
}
function updEnemy(e,dt){
  const T=e.T;e.t+=dt;e.flash=Math.max(0,e.flash-dt*5);
  if(e.dead){e.dt+=dt;return}
  if(T.kind==='pylon'){return}
  if(T.kind==='core'){updCore(e,dt);return}
  e.senseT-=dt;if(e.senseT<=0){e.senseT=.12+Math.random()*.05;senseE(e)}
  e.recent=Math.max(0,e.recent-dt*10);e.coverCd-=dt;e.react-=dt;
  const dxp=P.x-e.x,dzp=P.z-e.z,dp=Math.hypot(dxp,dzp);
  e.crouchV+=((e.state==='cover'&&e.coverPh===1?1:0)-e.crouchV)*Math.min(1,8*dt);
  if(!T.fly){e.vy-=20*dt;const r=moveY(e,T.r,T.h,e.vy*dt);if(r===-1)e.vy=0}
  else{const ty=2.3+Math.sin(e.t*1.6)*.25;e.y+=(ty-e.y)*Math.min(1,3*dt)}
  if(e.state==='idle'){
    if(e.patrol&&e.patrol.length>1){
      const w=e.patrol[e.pi];
      if(e.wait>0){e.wait-=dt}
      else{goTo(e,w[0],w[1],T.speed*.45,dt);if(dist2(e.x,e.z,w[0],w[1])<.7){e.pi=(e.pi+1)%e.patrol.length;e.wait=R(1,2.5)}}
    }else{e.yaw+=Math.sin(e.t*.5+e.hx)*dt*.35;if(T.fly)goTo(e,e.hx+Math.sin(e.t*.4)*2,e.hz+Math.cos(e.t*.4)*2,1.2,dt,false)}
  }else if(e.state==='alert'){
    e.alertT-=dt;
    if(dist2(e.x,e.z,e.lastX,e.lastZ)>1.2)goTo(e,e.lastX,e.lastZ,T.speed*.75,dt);else{e.yaw+=Math.sin(e.t*1.7)*dt*1.4}
    if(e.alertT<=0){e.state='idle';e.aware=0;e.path=null}
  }else if(e.state==='combat'||e.state==='cover'){
    if(!e.see){e.lostT+=dt;e.focus=Math.max(0,e.focus-dt*.5)}else e.focus=Math.min(1,e.focus+dt*.28);
    if(e.lostT>7&&e.state==='combat'){e.state='alert';e.alertT=5;e.aware=.5}
    if(T.melee)combatRusher(e,dt,dp);
    else if(T.fly)combatDrone(e,dt,dp);
    else combatGun(e,dt,dp);
  }
  // 分离
  for(const o of EN){if(o===e||o.dead||o.T.static)continue;const ddx=e.x-o.x,ddz=e.z-o.z,dd=ddx*ddx+ddz*ddz,rr=(T.r+o.T.r)*1.1;if(dd<rr*rr&&dd>1e-5){const l=Math.sqrt(dd),push=(rr-l)*.3;moveXZ(e,T.r,T.h,ddx/l*push,ddz/l*push,.3,!T.fly)}}
}
function shootLogic(e,dt,dp,canFire){
  const T=e.T;
  if(canFire&&e.see&&e.react<=0&&dp<T.rMax+5){
    if(e.burst===0){e.fireT-=dt;if(e.fireT<=0){e.burst=T.burst;e.tele=T.tele;e.fireT=R(T.cd[0],T.cd[1]);SFX.tele([e.x,e.y+1,e.z])}}
    if(e.burst>0){if(e.tele>0)e.tele-=dt;else{e.shotT-=dt;if(e.shotT<=0){enemyFire(e);e.burst--;e.shotT=T.gap;e.flashT=.08}}}
  }else{if(e.burst>0&&!e.see){e.burst=0}e.tele=Math.max(0,e.tele-dt)}
}
function combatGun(e,dt,dp){
  const T=e.T;
  if(e.state==='combat'){
    if(T.cover&&e.coverCd<=0&&e.see&&(e.hp<e.max*.55||e.recent>40)){const c=findCover(e);if(c){e.cp=c;e.state='cover';e.coverPh=0;e.coverN=0;e.coverT=0}else e.coverCd=3}
    if(e.state==='combat'){
      shootLogic(e,dt,dp,true);
      if(e.see){
        faceP(e,dt,8);
        if(dp>T.rMax)goTo(e,P.x,P.z,T.speed,dt,false);
        else if(dp<T.rMin)goTo(e,e.x-(P.x-e.x),e.z-(P.z-e.z),T.speed*.8,dt,false);
        else{e.strafeT-=dt;if(e.strafeT<=0){e.strafe*=-1;e.strafeT=R(1.2,2.8)}
          const px=-(P.z-e.z)/dp,pz=(P.x-e.x)/dp;moveXZ(e,T.r,T.h,px*e.strafe*T.speed*.6*dt,pz*e.strafe*T.speed*.6*dt,.4,true);e.walk+=T.speed*.6*dt*3}
      }else goTo(e,e.lastX,e.lastZ,T.speed,dt);
    }
  }
  if(e.state==='cover'){
    const c=e.cp;
    if(e.coverPh===0){const d=dist2(e.x,e.z,c.x,c.z);if(d<.4){e.coverPh=1;e.coverT=R(1.6,2.8)}else goTo(e,c.x,c.z,T.speed*1.35,dt)}
    else if(e.coverPh===1){e.coverT-=dt;faceP(e,dt,6);if(e.coverT<=0){e.coverPh=2;e.coverT=R(1.4,2.2);e.react=.2}}
    else{e.coverT-=dt;faceP(e,dt,8);shootLogic(e,dt,dp,true);if(e.coverT<=0){e.coverN++;if(e.coverN<2){e.coverPh=1;e.coverT=R(1.2,2)}else{e.state='combat';e.coverCd=8;e.recent=0}}}
  }
}
function combatDrone(e,dt,dp){
  const T=e.T;shootLogic(e,dt,dp,true);faceP(e,dt,6);
  e.strafeT-=dt;if(e.strafeT<=0){e.orbit*=-1;e.strafeT=R(2,4)}
  if(e.see){
    const want=(T.rMin+T.rMax)/2;
    let dirx=(P.x-e.x)/dp,dirz=(P.z-e.z)/dp;
    const radial=clamp((dp-want)*.5,-1,1);
    const vx=dirx*radial+(-dirz)*e.orbit*.8,vz=dirz*radial+dirx*e.orbit*.8;
    const l=Math.hypot(vx,vz)||1;e.hitx=e.hitz=false;moveXZ(e,T.r,T.h,vx/l*T.speed*dt,vz/l*T.speed*dt,0,false);
    if(e.hitx||e.hitz)e.orbit*=-1;
  }else goTo(e,e.lastX,e.lastZ,T.speed,dt,false);
}
function combatRusher(e,dt,dp){
  const T=e.T;
  if(e.fuse>0){e.fuse-=dt;faceP(e,dt,12);e.beepT=(e.beepT||0)-dt;if(e.beepT<=0){e.beepT=.1;SFX.beep([e.x,e.y+.5,e.z])}
    if(e.fuse<=0){const d=Math.hypot(P.x-e.x,(P.y+.9)-(e.y+.3),P.z-e.z);if(d<3.4)hurtPlayer(34*clamp(1.2-d/3.4,.25,1),e.x,e.z);
      for(const o of EN)if(o!==e&&!o.dead&&!o.T.static&&dist2(o.x,o.z,e.x,e.z)<9)hurtEnemy(o,30,false);
      e.dead=true;e.dt=0;e.hp=0;boomFx(e.x,e.y+.4,e.z,1.1);SFX.boom([e.x,e.y,e.z])}
    return}
  if(e.react>0)return;
  if(e.see||e.lostT<4){goTo(e,e.see?P.x:e.lastX,e.see?P.z:e.lastZ,T.speed*(e.see?1:.8),dt)}
  if(dp<2.1&&Math.abs(P.y-e.y)<1.6){e.fuse=.55;SFX.beep([e.x,e.y+.5,e.z])}
}
/* ---------- 投射物 ---------- */
function updProj(dt){
  for(let i=PR.length-1;i>=0;i--){const p=PR[i];p.life-=dt;if(p.life<=0){PR.splice(i,1);continue}
    const sp=Math.hypot(p.vx,p.vy,p.vz),n=Math.max(1,Math.ceil(sp*dt/.35)),sdt=dt/n;let dead=false;
    for(let s=0;s<n&&!dead;s++){
      p.x+=p.vx*sdt;p.y+=p.vy*sdt;p.z+=p.vz*sdt;
      if(pointSolid(p.x,p.y,p.z)){dead=true;addDecal(p.x,p.y,p.z,-p.vx/sp,0,-p.vz/sp,.1,1);spark(p.x,p.y,p.z,-p.vx/sp,.4,-p.vz/sp,5,p.col[0],p.col[1],p.col[2],4);addDL(p.x,p.y,p.z,p.col[0],p.col[1],p.col[2],3,.1);break}
      const hh=bodyH();
      if(!P.dead&&p.y>P.y-.1&&p.y<P.y+hh+.1&&dist2(p.x,p.z,P.x,P.z)<(P.r+p.size+.12)**2){dead=true;hurtPlayer(p.dmg,p.own?p.own.x:p.x-p.vx,p.own?p.own.z:p.z-p.vz);spark(p.x,p.y,p.z,0,1,0,4,p.col[0],p.col[1],p.col[2],3)}
    }
    if(dead)PR.splice(i,1);
  }
}
/* ---------- 核心（Boss） ---------- */
const SPAWNS_CORE=[[-14,-37.5],[14,-37.5],[-14,-60.5],[14,-60.5]];
function updCore(e,dt){
  e.shield=Math.max(0,(e.shield||0)-dt);
  if(!e.active){if(P.z<-40||e.hp<e.max){e.active=true;e.atk=2;e.spawnT=5;e.ring=9;G.boss=e;$('bossw').classList.remove('hide');say('回响','……入侵者。你不该唤醒我。',4)}return}
  e.t+=dt;const ph=e.hp/e.max;const open=G.pylons===0;addDL(e.x,e.y,e.z,open?2.6:.6,open?.8:1.8,open?.4:2.4,16,.05);
  const rage=ph<.35?1.5:1;
  e.atk-=dt*rage;
  if(e.atk<=0&&!P.dead){e.atk=2.4;
    const sx=e.x,sy=e.y,sz=e.z;SFX.corefire([sx,sy,sz]);
    const base=Math.atan2(P.x-sx,P.z-sz);
    for(const off of [-.18,0,.18]){const a=base+off,dy=(P.y+1.2-sy);const l=Math.hypot(P.x-sx,P.z-sz)||1;
      PR.push({x:sx,y:sy,z:sz,vx:Math.sin(a)*16,vy:dy/l*16,vz:Math.cos(a)*16,life:4,dmg:14,col:[1,.45,.15],size:.28,own:e})}}
  e.ring-=dt*rage;
  if(e.ring<=0){e.ring=13;SFX.charge([e.x,e.y,e.z]);const n=14,off=Math.random()*TAU;
    setTimeout(()=>{if(G.state!=='playing'||e.dead)return;SFX.corefire([e.x,e.y,e.z]);for(let i=0;i<n;i++){const a=off+i/n*TAU;PR.push({x:e.x,y:1.2,z:e.z,vx:Math.sin(a)*11,vy:0,vz:Math.cos(a)*11,life:4.5,dmg:11,col:[1,.3,.2],size:.22,own:e})}},700)}
  e.spawnT-=dt;
  const alive=EN.filter(o=>!o.dead&&o.wave).length;
  if(e.spawnT<=0&&alive<6){e.spawnT=ph<.5?7:10;const k=Math.random()*4|0;
    for(let i=0;i<2;i++){const sp=SPAWNS_CORE[(k+i)%4];const m=addEn('rusher',sp[0]+R(-1,1),sp[1]+R(-1,1),{wave:true});toCombat(m,.6);SFX.spawn([sp[0],1,sp[1]])}
    if(ph<.6&&!e.heavySpawned){e.heavySpawned=1;const sp=SPAWNS_CORE[2];const h=addEn('heavy',sp[0],sp[1],{wave:true});toCombat(h,1);SFX.spawn([sp[0],1,sp[1]])}
    if(ph<.35&&!e.dronesSpawned){e.dronesSpawned=1;for(const sp of SPAWNS_CORE.slice(0,2)){const d=addEn('drone',sp[0],sp[1],{wave:true});toCombat(d,1)}}}
  if(!G.said.half&&ph<.5){G.said.half=1;say('回响','你关不掉我……我无处不在。',3.5)}
}
function coreDeath(e){
  G.win=true;G.winT=0;G.kills++;SFX.boom([e.x,e.y,e.z]);boomFx(e.x,e.y,e.z,2.6);
  for(const o of EN)if(!o.dead&&!o.T.static){o.dead=true;o.dt=0;boomFx(o.x,o.y+.8,o.z,.6)}
  PR.length=0;say('回响','……信号……中断……',3);
}
/* ---------- 目标 / 对白 / 提示 ---------- */
let SUBQ=[],SUBT=0;
function say(who,txt,dur){SUBQ.push({who,txt,dur:dur||4})}
function updSub(dt){
  if(SUBT>0){SUBT-=dt;if(SUBT<=0){$('subWho').textContent='';$('subTxt').textContent=''}}
  if(SUBT<=0&&SUBQ.length){const s=SUBQ.shift();$('subWho').textContent='【'+s.who+'】';$('subWho').style.color=s.who==='回响'?'#ff6a4a':'#6ef';$('subTxt').textContent=s.txt;SUBT=s.dur}
}
let toastT=0;
function toast(t){const el=$('toast');el.textContent=t;el.style.opacity=1;toastT=1.8}
function setObj(t,d){$('objT').textContent=t;$('objD').textContent=d}
function nodeText(){return `关闭冷却节点（${G.nodesDone}/2）：实验区（中庭左侧）与机房（中庭右侧）各有一个`}
function setCP(i){if(i>G.cp){G.cp=i;toast('检查点已保存')}}
function updLevel(dt){
  if(G.phase===0&&P.z<-2){G.phase=1;setCP(1);setObj('恢复供电',nodeText());
    say('白鹭','这里是中庭。左边实验区、右边机房，各有一个冷却节点——都关掉，回响的电力就断了。',6);}
  if(G.phase===2&&P.z<-38.5){G.phase=3;setCP(3);setObj('摧毁防护柱（4/4）','先击毁四根防护柱，再攻击核心');}
  if(G.phase===3){$('objT').textContent=G.pylons>0?`摧毁防护柱（${G.pylons}/4 剩余）`:'击毁回响核心';
    const c=G.boss;if(c&&!c.dead){$('bossB').style.width=(c.hp/c.max*100)+'%';$('bossS').textContent=G.pylons>0?`护盾激活 · 防护柱剩余 ${G.pylons}`:'护盾已失效'}}
  // 门
  for(const d of doors){
    let want=false;if(!d.locked){for(const e of [P]){if(Math.abs(d.cx-e.x)<4.2&&Math.abs(d.cz-e.z)<4.2&&Math.abs(e.y)<2)want=true}}
    const was=d.open;d.open=clamp(d.open+(want?1:-1)*dt*1.8,0,1);
    if(was===0&&d.open>0)SFX.door([d.cx,1.5,d.cz]);
    d.s.y0=d.open*3.4;d.s.y1=d.dh+d.open*3.4;
  }
  // 节点互动
  G.near=null;
  if(!P.dead)for(const n of nodes){if(n.done)continue;
    const dx=n.x-P.x,dz=n.z-P.z;if(Math.hypot(dx,dz)<2.9){G.near=n}}
  const pr=$('prompt'),pg=$('prog');
  if(G.near&&G.phase>=1){
    if(IN.keys.KeyE){G.near.prog+=dt/3.2;pg.classList.remove('hide');$('progB').style.width=(G.near.prog*100)+'%';pr.textContent='正在关闭冷却节点…';
      if(Math.floor(G.near.prog*10)!==G.near.pl){G.near.pl=Math.floor(G.near.prog*10);tn('sine',400+G.near.prog*800,500+G.near.prog*800,.08,.1)}
      if(G.near.prog>=1)nodeDone(G.near)}
    else{G.near.prog=Math.max(0,G.near.prog-dt*.6);pr.textContent=TOUCH?'按住「互动」键关闭冷却节点':'按住 E 关闭冷却节点';pg.classList.add('hide')}
    pr.classList.remove('hide');
  }else{pr.classList.add('hide');pg.classList.add('hide')}
  // 胜利
  if(G.win){G.winT+=dt;if(Math.random()<.2&&G.boss)boomFx(G.boss.x+R(-2,2),G.boss.y+R(-2,2),G.boss.z+R(-2,2),R(.8,1.6));
    if(G.winT>3.2&&G.state==='playing')winGame()}
}
function nodeDone(n){
  n.done=true;G.nodesDone++;SFX.alarm();setCP(2);CPS[2]={x:n.x+(n.face>0?2.2:-2.2),z:n.z,yaw:n.face>0?-Math.PI/2:Math.PI/2};
  flashScreen(.5);toast(`冷却节点 ${n.id} 已关闭`);
  // 通风口刷怪
  const vents=n.id==='A'?[[-36.6,-4.2],[-36.6,-24]]:[[36.6,-24],[36.6,-4.2]];
  setTimeout(()=>{if(G.state!=='playing')return;vents.forEach((v,i)=>{for(let k=0;k<2;k++){const m=addEn('rusher',v[0]+(n.face>0?1:-1)*(.6+k*.8),v[1]+R(-.4,.4),{wave:true});toCombat(m,.5)}SFX.spawn([v[0],1,v[1]])})},900);
  if(G.nodesDone<2){setObj('恢复供电',nodeText());say('白鹭',`节点 ${n.id} 已关闭，警报响了！通风口有东西出来了——快解决它们，再去另一个节点。`,5.5)}
  else{
    setObj('前往核心室','金库通道已解锁，位于中庭正北方');
    for(const d of doors)if(d.id==='v1'||d.id==='v2')d.locked=false;G.phase=2;
    setTimeout(()=>SFX.power(),1200);flashScreen(.7);
    say('白鹭','主电源切断，金库通道解锁了！去核心室——毁掉回响。小心，它不会放你轻松过去。',6.5);
  }
}
let flashT=0,flashA=0;
function flashScreen(a){flashA=a;flashT=a}
/* ---------- 重置 / 检查点 / 生死 ---------- */
function clearWorld(){EN.length=0;PR.length=0;PT.length=0;TR.length=0;DL.length=0;ITEMS.length=0;HM.length=0;DI.length=0}
function spawnAll(){
  const S3=(x,z,o)=>addEn('sentry',x,z,o);
  // 大厅
  S3(-7,9,{yaw:0,patrol:[[-7,9],[-7,15]]});S3(7.5,11,{yaw:Math.PI});
  // 中庭
  S3(-9,-6,{patrol:[[-9,-6],[-9,-22]]});S3(9,-22,{patrol:[[9,-22],[9,-6]]});
  addEn('drone',-3,-15,{y:2.6});addEn('drone',4,-19,{y:3});
  // 实验区
  S3(-21,-10,{yaw:Math.PI/2});S3(-21,-18,{yaw:Math.PI/2});S3(-32,-11,{yaw:-Math.PI/2});S3(-34,-17,{yaw:0,patrol:[[-34,-17],[-34,-12]]});
  addEn('drone',-29,-14,{y:2.8});addEn('rusher',-36.4,-5.4,{});addEn('rusher',-36.4,-23.2,{});
  // 机房
  S3(24,-14,{patrol:[[24,-14],[31,-14]]});S3(23.2,-22,{});S3(28.7,-6,{yaw:Math.PI});
  addEn('heavy',34,-14,{yaw:Math.PI/2});addEn('drone',23.2,-8,{y:2.1});addEn('drone',28.7,-20,{y:2.1});
  // 核心室
  S3(-11,-47,{yaw:0});S3(11,-47,{yaw:0});S3(0,-57,{yaw:0});
  addEn('heavy',0,-41,{yaw:0});
  for(const [x,z] of [[-9,-44],[9,-44],[-9,-56],[9,-56]]){const p=addEn('pylon',x,z,{});p.y=0}
  const c=addEn('core',0,-50,{y:3.3});c.active=false;
  // 拾取
  addItem('ammo',-3,17);addItem('hp',8.2,19);addItem('ammo',-8,19);
  addItem('w_shot',-12,-4.2);addItem('hp',12,-4);addItem('ar',-12,-24);addItem('ammo',12,-24);addItem('ammo',0,-26);
  addItem('hp',-17,-8);addItem('ammo',-24,-4);addItem('ar',-35,-9);addItem('hp',-36,-21);
  addItem('w_dmr',23.2,-18.5);addItem('hp',28.7,-9.5);addItem('ammo',18,-5);addItem('ar',34,-9);addItem('ammo',17,-23);
  addItem('hp',2,-31);addItem('ammo',-2,-31);addItem('hp',-13,-40);addItem('ar',13,-40);addItem('ammo',-13,-61);addItem('hp',13,-61);addItem('ammo',13,-37.5);addItem('hp',-13,-37.5);
}
function resetGame(){
  clearWorld();for(const d of doors){d.locked=(d.id==='v1'||d.id==='v2');d.open=0}
  for(const n of nodes){n.done=false;n.prog=0}
  Object.assign(G,{time:0,kills:0,shots:0,hits:0,deaths:0,phase:0,cp:0,nodesDone:0,pylons:4,boss:null,win:false,winT:0,said:{}});
  CPS[0]={x:0,z:19,yaw:0};CPS[1]={x:0,z:-3,yaw:0};CPS[2]={x:0,z:-3,yaw:0};CPS[3]={x:0,z:-33,yaw:0};
  Object.assign(P,{x:0,y:0,z:19,vx:0,vz:0,vy:0,yaw:0,pitch:0,hp:100,ar:0,og:true,crouch:0,crouched:false,heat:0,ads:0,fireCd:0,rl:0,swT:0,dead:false,kickP:0,shake:0});
  for(const w of INV){w.mag=w.d.mag;w.res=w.d.res0;w.have=w.d.id==='rifle'}cw=0;
  spawnAll();SUBQ.length=0;$('subWho').textContent='';$('subTxt').textContent='';SUBT=0;$('bossw').classList.add('hide');
  setObj('进入寂光研究院','穿过接待大厅，前往中庭（向北）');
}
function playerDie(){
  P.dead=true;G.deaths++;SFX.die();G.state='dead';
  if(document.pointerLockElement)document.exitPointerLock();
  $('dead').classList.remove('hide');$('deadT').textContent=['你倒下了。机械还在逼近。','信号中断。再试一次——善用掩体和爆头。','别硬冲，利用掩体，注意红色闪烁的自爆机。'][G.deaths%3];
}
function respawn(){
  const c=CPS[G.cp];Object.assign(P,{x:c.x,y:0,z:c.z,yaw:c.yaw,pitch:0,vx:0,vz:0,vy:0,hp:100,ar:Math.max(P.ar,30),dead:false,kickP:0,crouched:false,crouch:0,rl:0,swT:0,heat:0,ads:0});
  for(const w of INV)if(w.have){w.mag=w.d.mag;w.res=Math.max(w.res,w.d.res0)}
  PR.length=0;DI.length=0;
  for(const e of EN){if(e.dead||e.T.static)continue;if(e.state!=='idle'){e.state='idle';e.aware=0;e.path=null;e.burst=0;e.fuse=0;e.x=e.hx;e.z=e.hz;e.hp=Math.max(e.hp,e.max*.7)}}
  const core=EN.find(e=>e.T.kind==='core');if(core&&!core.dead){core.active=false;core.hp=Math.max(core.hp,core.max*.9);G.boss=null;$('bossw').classList.add('hide');for(const o of EN)if(o.wave&&!o.dead&&!o.T.static)o.dead=true}
  G.state='playing';$('dead').classList.add('hide');
}
function winGame(){
  G.state='win';SFX.win();if(document.pointerLockElement)document.exitPointerLock();
  const t=G.time,acc=G.shots?G.hits/G.shots:0;
  const m=Math.floor(t/60),s=Math.floor(t%60);
  $('wTime').textContent=`${m}分${String(s).padStart(2,'0')}秒`;$('wKills').textContent=G.kills;$('wAcc').textContent=Math.round(acc*100)+'%';$('wDeaths').textContent=G.deaths;
  let score=0;score+=t<600?3:t<900?2:t<1200?1:0;score+=acc>.4?2:acc>.28?1:0;score+=G.deaths===0?3:G.deaths<3?1:0;
  $('wRank').textContent=score>=7?'S':score>=5?'A':score>=3?'B':'C';
  $('win').classList.remove('hide');$('hudw').classList.add('hide');
}
function updateAll(dt){
  G.time+=dt;
  if(!P.dead)updPlayer(dt);
  updWeapon(dt);updItems(dt);updLevel(dt);
  for(const e of EN)updEnemy(e,dt);
  updProj(dt);updDebris(dt);
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.life-=dt;if(p.life<=0){PT.splice(i,1);continue}p.vy-=p.gr*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<.02&&p.gr>0){p.y=.02;p.vy*=-.3;p.vx*=.6;p.vz*=.6}if(!p.gr){}p.s*=p.grow?1+(p.grow-1)*dt*2:1}
  for(let i=TR.length-1;i>=0;i--){TR[i].life-=dt;if(TR[i].life<=0)TR.splice(i,1)}
  for(let i=DL.length-1;i>=0;i--){DL[i].life-=dt;if(DL[i].life<=0)DL.splice(i,1)}
  for(let i=HM.length-1;i>=0;i--){HM[i].t-=dt;if(HM[i].t<=0)HM.splice(i,1)}
  for(let i=DI.length-1;i>=0;i--){DI[i].t-=dt;if(DI[i].t<=0)DI.splice(i,1)}
  VM.kick=Math.max(0,VM.kick-dt*7);VM.flash=Math.max(0,VM.flash-dt);VM.pump=Math.max(0,VM.pump-dt*1.6);
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0}
  updSub(dt);
  // 战斗强度（音乐）
  let inten=0;for(const e of EN){if(!e.dead&&(e.state==='combat'||e.state==='cover'))inten+=e.T.hp>200?.5:.25}
  G.inten=lerp(G.inten||0,Math.min(1,inten),Math.min(1,dt*1.5));
  if(G.boss&&!G.boss.dead)G.inten=Math.max(G.inten,.8);
  auMusic(dt,G.inten);
}
