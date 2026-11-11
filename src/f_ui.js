/* ---------- 输入 / 界面 / 主循环 ---------- */
let locked=false,prevScr='title';
function lock(){if(DBG)return;try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>$('click').classList.remove('hide'))}catch(e){}}
function show(id){$(id).classList.remove('hide')}function hide(id){$(id).classList.add('hide')}
function pauseGame(){if(G.state!=='playing')return;G.state='paused';IN.md=false;IN.mr=false;for(const k in IN.keys)IN.keys[k]=false;show('pause');hide('click')}
function resumeGame(){if(G.state!=='paused')return;hide('pause');hide('set');hide('click');G.state='playing';lock()}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;if(locked){hide('click');hide('pause')}else if(G.state==='playing'&&!DBG)pauseGame()});
document.addEventListener('pointerlockerror',()=>{if(G.state==='playing')show('click')});
$('click').addEventListener('click',()=>{hide('click');lock()});
function startGame(){
  auInit();resetGame();G.state='playing';['title','help','set','pause','dead','win'].forEach(hide);show('hudw');lock();
  say('白鹭','沈昼，终于连上了。寂光研究院全面断电，安保机械被「回响」接管了，别指望有人接应。',6);
  say('白鹭','先穿过大厅，进中庭。路线我会在你的视野里标出来。',5);
  toast('第一章 · 断电');
}
function toTitle(){G.state='title';['pause','dead','win','set','help','hudw','bossw'].forEach(hide);show('title');if(document.pointerLockElement)document.exitPointerLock();resetGame()}
$('bStart').onclick=startGame;$('bAgain').onclick=startGame;
$('bSet').onclick=()=>{prevScr='title';hide('title');show('set')};
$('bHelp').onclick=()=>{hide('title');show('help')};
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>{hide('help');hide('set');show(prevScr==='pause'?'pause':'title');prevScr='title'});
$('bResume').onclick=resumeGame;
$('bPSet').onclick=()=>{prevScr='pause';hide('pause');show('set')};
$('bRestartCp').onclick=()=>{hide('pause');G.state='playing';respawn();lock()};
$('bQuit').onclick=toTitle;$('bQuit2').onclick=toTitle;$('bQuit3').onclick=toTitle;
$('bRetry').onclick=()=>{respawn();lock()};
// 设置
function syncSet(){$('sSens').value=CFG.sens;$('oSens').textContent=(+CFG.sens).toFixed(2);$('sFov').value=CFG.fov;$('oFov').textContent=CFG.fov;$('sVol').value=CFG.vol;$('oVol').textContent=CFG.vol;$('sQ').value=String(CFG.qBase||CFG.q);$('sQL').value=String(CFG.ql);$('sDyn').checked=!!CFG.dyn;$('sFlash').checked=!!CFG.flash;$('sDiff').value=String(CFG.diff);$('sInv').checked=!!CFG.inv}
$('sSens').oninput=e=>{CFG.sens=+e.target.value;syncSet();saveCfg()};
$('sFov').oninput=e=>{CFG.fov=+e.target.value;syncSet();saveCfg()};
$('sVol').oninput=e=>{CFG.vol=+e.target.value;syncSet();auVol();saveCfg()};
$('sQ').onchange=e=>{CFG.q=CFG.qBase=+e.target.value;resize();saveCfg()};
$('sQL').onchange=e=>{CFG.ql=+e.target.value;resize();saveCfg()};
$('sDyn').onchange=e=>{CFG.dyn=e.target.checked;if(!CFG.dyn){CFG.q=CFG.qBase;resize()}saveCfg()};
$('sFlash').onchange=e=>{CFG.flash=e.target.checked;saveCfg()};
$('sDiff').onchange=e=>{CFG.diff=+e.target.value;saveCfg()};
$('sInv').onchange=e=>{CFG.inv=e.target.checked;saveCfg()};
// 键鼠
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','Tab'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  IN.keys[e.code]=true;
  if(G.state==='playing'){
    if(e.code==='Digit1')switchTo(0);else if(e.code==='Digit2')switchTo(1);else if(e.code==='Digit3')switchTo(2);
    else if(e.code==='KeyR')startReload();
    else if(e.code==='KeyT'){CFG.flash=!CFG.flash;syncSet();saveCfg();SFX.click(0)}
    else if(e.code==='KeyQ')switchTo(P.lastCw);
    else if(e.code==='KeyC'){if(P.crouched){if(!blockedAt(P.x,P.y,P.z,P.r,1.8))P.crouched=false}else P.crouched=true}
    else if(e.code==='KeyP'||(e.code==='Escape'&&!locked))pauseGame();
    else if(e.code==='KeyF'){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen()}catch(_){}}
  }else if(G.state==='paused'&&(e.code==='Escape'||e.code==='KeyP')&&$('set').classList.contains('hide'))resumeGame();
});
window.addEventListener('keyup',e=>{IN.keys[e.code]=false});
window.addEventListener('blur',()=>{for(const k in IN.keys)IN.keys[k]=false;IN.md=IN.mr=false;if(G.state==='playing'&&!DBG)pauseGame()});
document.addEventListener('mousedown',e=>{
  if(G.state!=='playing')return;
  if(!locked&&!DBG){lock();return}
  if(e.button===0){IN.md=true;IN.edge=.15}else if(e.button===2)IN.mr=true;
});
document.addEventListener('mouseup',e=>{if(e.button===0)IN.md=false;else if(e.button===2)IN.mr=false});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousemove',e=>{
  if(G.state!=='playing'||(!locked&&!DBG))return;
  const f=.0021*CFG.sens*Math.tan(CFG.fov*D2R*lerp(1,INV[cw].d.fov,P.ads)/2)/Math.tan(CFG.fov*D2R/2);
  P.yaw-=e.movementX*f;P.pitch=clamp(P.pitch-e.movementY*f*(CFG.inv?-1:1),-1.5,1.5);IN.dx=e.movementX;IN.dy=e.movementY;
});
document.addEventListener('wheel',e=>{
  if(G.state!=='playing')return;const dir=e.deltaY>0?1:-1;let i=cw;for(let n=0;n<3;n++){i=(i+dir+3)%3;if(INV[i].have){switchTo(i);break}}
},{passive:true});

/* ---------- 自动测试用 Bot（仅供 ?test=1 / 调试钩子使用） ---------- */
const BOT={path:null,pt:0,goalKey:'',stuck:0,lx:0,lz:0,st:1,stT:0,evade:0,unstick:0,ut:0};
function botGoal(){
  const it=(types,maxd)=>{let b=null,bd=maxd;for(const i of ITEMS){if(i.taken||!types.includes(i.type))continue;const d=Math.hypot(i.x-P.x,i.z-P.z);if(d<bd){bd=d;b=i}}return b};
  if(P.hp<55){const i=it(['hp'],32);if(i)return {x:i.x,z:i.z}}
  if(P.ar<10){const i=it(['ar'],14);if(i)return {x:i.x,z:i.z}}
  if(INV[0].res<40){const i=it(['ammo'],26);if(i)return {x:i.x,z:i.z}}
  if(G.phase===0)return {x:0,z:-4};
  if(G.phase===1){
    const sh=ITEMS.find(i=>i.type==='w_shot'&&!i.taken);if(sh&&!nodes[0].done)return {x:sh.x,z:sh.z};
    if(!nodes[0].done)return {x:-34.6,z:-14.2,node:nodes[0]};
    const dm=ITEMS.find(i=>i.type==='w_dmr'&&!i.taken);if(dm)return {x:dm.x,z:dm.z};
    return {x:34.6,z:-14.2,node:nodes[1]};
  }
  if(G.phase===2)return {x:0,z:-43};
  return {x:0,z:-42.5};
}
function botTick(dt){
  const k=IN.keys;for(const c of ['KeyW','KeyA','KeyS','KeyD','ShiftLeft','KeyE','Space'])k[c]=false;IN.md=false;IN.mr=false;
  if(P.dead)return;
  const ex=P.x,ey=P.y+eyeH(),ez=P.z;let best=null,bs=1e9;
  const core=EN.find(o=>o.T.kind==='core');for(const e of EN){if(e.dead||(e.T.kind==='core'&&G.pylons>0)||(e.T.static&&!core.active))continue;const T=e.T;
    const cy=T.kind==='pylon'?e.y+2.8:T.kind==='core'?e.y:e.y+(T.head&&Math.hypot(e.x-ex,e.z-ez)<34?T.head.y:T.bb.y1*.65);
    const d=Math.hypot(e.x-ex,cy-ey,e.z-ez);if(d>50||!hasLOS(ex,ey,ez,e.x,cy,e.z))continue;
    const sc=d*(T.melee?.4:1)*(T.kind==='pylon'?2:1)*(e.state==='combat'?.8:1);if(sc<bs){bs=sc;best={e,cy,d}}}
  const w=INV[cw];
  // 武器选择
  if(best&&P.swT<=0&&!P.rl){let want=0;if(best.d<9&&INV[1].have&&INV[1].mag+INV[1].res>0)want=1;else if(best.d>26&&INV[2].have&&INV[2].mag+INV[2].res>0&&!best.e.T.melee)want=2;
    if(INV[want].mag+INV[want].res<=0)want=INV.findIndex(x=>x.have&&x.mag+x.res>0);if(want>=0&&want!==cw)switchTo(want)}
  else if(!best&&w.mag<w.d.mag*.6&&!P.rl)startReload();
  let wx=0,wz=0;
  if(best){
    const e=best.e,dx=e.x-ex,dz=e.z-ez,dh=Math.hypot(dx,dz);
    P.yaw=Math.atan2(-dx,-dz)+R(-.004,.004);P.pitch=Math.atan2(best.cy-ey,dh)-P.kickP+R(-.004,.004);
    if(P.swT<=0&&!P.rl){IN.md=true;if(w.d.auto===false)IN.edge=.15;if(best.d>16&&w.d.id!=='shot')IN.mr=true}
    BOT.stT-=dt;if(BOT.stT<=0){BOT.st*=-1;BOT.stT=R(.6,1.4)}
    if(best.e.T.melee&&best.d<7){k.KeyS=true}else if(best.d<6){k.KeyS=true;if(BOT.st>0)k.KeyD=true;else k.KeyA=true}
    else if(best.d>20)k.KeyW=true;else{if(BOT.st>0)k.KeyD=true;else k.KeyA=true}
    if(P.hp<35&&P.og&&Math.random()<.02)k.Space=true;
  }
  if(!best||best.d>20){
    const g=botGoal();const key=g.x.toFixed(1)+','+g.z.toFixed(1);BOT.pt-=dt;
    if(g.node&&Math.hypot(g.x-ex,g.z-ez)<1.2){k.KeyE=true;if(!best){P.yaw=Math.atan2(-(g.node.x-ex),-(g.node.z-ez));P.pitch=0}}
    else{
      if(key!==BOT.goalKey||BOT.pt<=0||!BOT.path){BOT.goalKey=key;BOT.path=navPath(ex,ez,g.x,g.z);BOT.pt=1.2}
      if(BOT.path&&BOT.path.length){while(BOT.path.length>1&&dist2(ex,ez,BOT.path[0][0],BOT.path[0][1])<.5)BOT.path.shift();
        const [px,pz]=BOT.path[0];if(!best){P.yaw=Math.atan2(-(px-ex),-(pz-ez));P.pitch*=.8}k.KeyW=true;if(!best)k.ShiftLeft=true;
        if(best){const a=Math.atan2(-(px-ex),-(pz-ez)),rel=wrapA(a-P.yaw);if(Math.abs(rel)>1.2)k.KeyW=false}}
      else if(g){const a=Math.atan2(-(g.x-ex),-(g.z-ez));if(!best)P.yaw=a;k.KeyW=true}
    }
  }
  // 卡住检测
  BOT.stuck+=dt;if(BOT.stuck>1.2){if(dist2(ex,ez,BOT.lx,BOT.lz)<.25&&!k.KeyE&&!IN.md){BOT.unstick=.7;BOT.path=null}BOT.lx=ex;BOT.lz=ez;BOT.stuck=0}
  if(BOT.unstick>0){BOT.unstick-=dt;k.Space=true;k.KeyA=BOT.ut>0;k.KeyD=BOT.ut<=0;if(BOT.unstick<=0)BOT.ut=Math.random()<.5?1:-1}
}
/* ---------- 调试钩子 ---------- */
function stepSim(n,dt){for(let i=0;i<n;i++){if(G.state==='dead')respawn();if(G.state!=='playing')break;if(G.bot)botTick(dt);updateAll(dt)}}
window.__GB={G,P,EN,INV,PR,ITEMS,nodes,doors,CFG,
  start(){startGame()},step:stepSim,render(t){frame(t||performance.now()/1000)},
  tp(x,z,yaw){P.x=x;P.z=z;P.y=0;if(yaw!==undefined)P.yaw=yaw;P.pitch=0},
  god(v){G.god=v},bot(v){G.bot=v},
  runBot(maxSec,log){const t0=G.time;let last=0;while(G.state!=='win'&&G.time-t0<maxSec){stepSim(60,1/60);if(log&&G.time-last>=log){last=G.time;console.log(`t=${G.time.toFixed(0)} ph=${G.phase} hp=${P.hp|0} deaths=${G.deaths} kills=${G.kills} pos=${P.x.toFixed(1)},${P.z.toFixed(1)}`)}}
    return {state:G.state,t:+G.time.toFixed(1),phase:G.phase,deaths:G.deaths,kills:G.kills,hp:P.hp|0,pos:[+P.x.toFixed(1),+P.z.toFixed(1)],shots:G.shots,hits:G.hits}},
  setWin:()=>winGame()
};
/* ---------- 启动 ---------- */
let errShown=false;
function loop(ts){
  requestAnimationFrame(loop);
  try{
    const t=ts/1000;let dt=Math.min(.05,t-(loop.last||t));loop.last=t;
    if(G.state==='playing'){if(G.bot)botTick(dt);updateAll(dt)}
    IN.dx*=.6;IN.dy*=.6;
    if(flashT>0)flashT=Math.max(0,flashT-dt*.9);
    frame(t,dt);
  }catch(e){if(!errShown){errShown=true;console.error(e)}}
}
(function(){const m=/[?&]ql=(\d)/.exec(location.search);if(m)CFG.ql=+m[1];
  if(CFG.ql<0||CFG.ql>3){const soft=/swiftshader|llvmpipe|software|basic render/i.test(GPUNAME),intel=/intel|mali|adreno|powervr|videocore/i.test(GPUNAME);CFG.ql=soft?0:intel?1:2}
  if(DBG&&!m)CFG.ql=2;CFG.qBase=CFG.q})();
makeTextures();buildLevel();resize();syncSet();resetGame();
requestAnimationFrame(loop);
