/* ---------- 触屏控制（手机 / 平板） ---------- */
const TC={roles:new Map(),sid:null,sx:0,sy:0,kx:0,ky:0,rel:{},vis:false,rotT:0,sprintV:false,wLast:-1,useVis:false};
const TCR=58;// 摇杆半径 (px)
function tcApplyClass(){document.body.classList.toggle('touch',TOUCH)}
tcApplyClass();
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault());
function tcKey(code,on){if(on){IN.keys[code]=true;delete TC.rel[code]}else TC.rel[code]=performance.now()+90}
function tcBtn(a,el,down){
  if(down)el.classList.add('down');else el.classList.remove('down');
  switch(a){
    case'fire':IN.md=down;if(down)IN.edge=.15;break;
    case'jump':tcKey('Space',down);break;
    case'use':IN.keys.KeyE=down;break;
    case'reload':if(down)startReload();break;
    case'swap':if(down)cycleWeapon();break;
    case'ads':if(down)IN.mr=!IN.mr;break;
    case'crouch':if(down)toggleCrouch();break;
    case'flash':if(down){CFG.flash=!CFG.flash;syncSet();saveCfg();SFX.click(0)}break;
    case'pause':if(down)pauseGame();break;
  }
}
function tcStick(x,y){
  let dx=x-TC.sx,dy=y-TC.sy;const d=Math.hypot(dx,dy);if(d>TCR){dx*=TCR/d;dy*=TCR/d}
  TC.kx=dx;TC.ky=dy;const s=$('stk').style;s.setProperty('--kx',dx+'px');s.setProperty('--ky',dy+'px');
  const m=Math.min(1,Math.hypot(dx,dy)/TCR),dz=.12,k=m<dz?0:(m-dz)/(1-dz),a=Math.atan2(dy,dx);
  IN.ax=Math.cos(a)*k;IN.ay=-Math.sin(a)*k;
}
function tcStickEnd(){
  TC.sid=null;IN.ax=IN.ay=0;TC.kx=TC.ky=0;const e=$('stk');e.classList.remove('act');e.style.left='';e.style.bottom='';e.style.removeProperty('--kx');e.style.removeProperty('--ky');
  if(TC.sprintV){IN.keys.ShiftLeft=false;TC.sprintV=false}
}
function tcReleaseAll(){
  for(const [id,r] of TC.roles){if(r.k==='b'){tcBtn(r.a,r.el,false)}}
  TC.roles.clear();if(TC.sid!==null)tcStickEnd();
  document.querySelectorAll('#tc .tb.down').forEach(e=>e.classList.remove('down'));
  IN.md=false;IN.ax=IN.ay=0;
}
function tcOnStart(){
  // 点击「开始」时（用户手势内）尝试全屏并锁定横屏；失败则忽略
  try{const d=document.documentElement;if(!document.fullscreenElement&&d.requestFullscreen){const p=d.requestFullscreen();if(p&&p.catch)p.catch(()=>{})}}catch(_){}
  try{if(screen.orientation&&screen.orientation.lock){const p=screen.orientation.lock('landscape');if(p&&p.catch)p.catch(()=>{})}}catch(_){}
  if(innerHeight>innerWidth)TC.rotT=6;
}
document.addEventListener('touchstart',e=>{
  if(!TOUCH){TOUCH=true;tcApplyClass()}
  if(G.state!=='playing'||!TC.vis)return;
  for(const t of e.changedTouches){
    const el=t.target&&t.target.closest?t.target.closest('[data-a]'):null;
    if(el){const a=el.dataset.a;TC.roles.set(t.identifier,{k:'b',a,el,x:t.clientX,y:t.clientY});tcBtn(a,el,true)}
    else if(TC.sid===null&&t.clientX<innerWidth*.46&&t.clientY>innerHeight*.2){
      TC.sid=t.identifier;TC.sx=t.clientX;TC.sy=t.clientY;TC.roles.set(t.identifier,{k:'s'});
      const s=$('stk');s.classList.add('act');s.style.left=(t.clientX-66)+'px';s.style.bottom=(innerHeight-t.clientY-66)+'px';tcStick(t.clientX,t.clientY);
    }else TC.roles.set(t.identifier,{k:'l',x:t.clientX,y:t.clientY});
  }
  e.preventDefault();
},{passive:false});
document.addEventListener('touchmove',e=>{
  if(G.state!=='playing')return;
  for(const t of e.changedTouches){
    const r=TC.roles.get(t.identifier);if(!r)continue;
    if(r.k==='s')tcStick(t.clientX,t.clientY);
    else if(r.k==='l'||(r.k==='b'&&r.a==='fire')){lookBy(t.clientX-r.x,t.clientY-r.y,1.8);r.x=t.clientX;r.y=t.clientY}
  }
  if(TC.roles.size)e.preventDefault();
},{passive:false});
function tcEnd(e){
  for(const t of e.changedTouches){
    const r=TC.roles.get(t.identifier);if(!r)continue;
    if(r.k==='s')tcStickEnd();else if(r.k==='b')tcBtn(r.a,r.el,false);
    TC.roles.delete(t.identifier);
  }
  if(TC.roles.size||e.cancelable)if(G.state==='playing'&&TC.vis)e.preventDefault();
}
document.addEventListener('touchend',tcEnd,{passive:false});
document.addEventListener('touchcancel',tcEnd,{passive:false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='playing'&&TOUCH)pauseGame()});
/* 每帧：显隐控制、冲刺、释放延迟的按键 */
function tcFrame(dt){
  const now=performance.now();
  for(const c in TC.rel)if(now>=TC.rel[c]){IN.keys[c]=false;delete TC.rel[c]}
  const vis=TOUCH&&G.state==='playing';
  if(vis!==TC.vis){TC.vis=vis;$('tc').classList.toggle('hide',!vis);if(!vis)tcReleaseAll()}
  if(!vis){if(TC.rotT>0){TC.rotT=0;$('rot').classList.add('hide')}return}
  // 摇杆推到底 = 冲刺（开火 / 开镜时不冲刺）
  if(TC.sid!==null){const m=Math.hypot(TC.kx,TC.ky)/TCR,sp=m>.95&&IN.ay>.6&&!IN.md&&P.ads<.3&&!P.crouched;if(sp!==TC.sprintV){TC.sprintV=sp;IN.keys.ShiftLeft=sp}}
  const use=!!(G.near&&G.phase>=1&&!G.near.done);if(use!==TC.useVis){TC.useVis=use;$('tc').querySelector('.use').classList.toggle('hide',!use);if(!use)IN.keys.KeyE=false}
  const adsEl=$('tc').querySelector('.ads');adsEl.classList.toggle('on',!!IN.mr);
  $('tc').querySelector('.flash').classList.toggle('on',!!CFG.flash);
  $('tc').querySelector('.crouch').classList.toggle('on',!!P.crouched);
  if(cw!==TC.wLast){TC.wLast=cw;$('tcW').textContent=cw+1}
  if(TC.rotT>0){TC.rotT-=dt;$('rot').classList.toggle('hide',!(TC.rotT>0&&innerHeight>innerWidth))}
}
