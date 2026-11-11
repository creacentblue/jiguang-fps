/* ---------- 世界：碰撞体、关卡构建 ---------- */
const solids=[],lights=[],coverBoxes=[],coverPts=[],signsS=[];
const EPS=1e-4;
let STAT=null;// 静态批次 per mat
function sBatch(m){return STAT[m]||(STAT[m]=new Batch(8192))}
function S(x0,y0,z0,x1,y1,z1,mat,tint,o){
  o=o||{};tint=tint||[1,1,1];const em=o.em||0;
  const hx=(x1-x0)/2,hy=(y1-y0)/2,hz=(z1-z0)/2;
  if(!o.hidden)box(sBatch(mat),M4.T(x0+hx,y0+hy,z0+hz),hx,hy,hz,tint[0],tint[1],tint[2],em,MATS[mat].tile,true);
  let s=null;
  if(!o.nocol){s={x0,y0,z0,x1,y1,z1};solids.push(s);if(o.cover)coverBoxes.push(s)}
  return s;
}
function N(x0,y0,z0,x1,y1,z1,col,k){S(x0,y0,z0,x1,y1,z1,MI.white,[col[0]*(k||1),col[1]*(k||1),col[2]*(k||1)],{em:1,nocol:true})}
function LT(x,y,z,r,g,b,rad,o){lights.push(Object.assign({x,y,z,r,g,b,rad,fl:0,key:y>=4.2},o||{}))}
function wallX(x,z0,z1,h,mat,gaps,tint){gaps=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);let cur=z0;
  for(const g of gaps){if(g[0]>cur)S(x-.25,0,cur,x+.25,h,g[0],mat,tint);S(x-.25,g[2]||3.2,g[0],x+.25,h,g[1],mat,tint);cur=g[1]}
  if(cur<z1)S(x-.25,0,cur,x+.25,h,z1,mat,tint)}
function wallZ(z,x0,x1,h,mat,gaps,tint){gaps=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);let cur=x0;
  for(const g of gaps){if(g[0]>cur)S(cur,0,z-.25,g[0],h,z+.25,mat,tint);S(g[0],g[2]||3.2,z-.25,g[1],h,z+.25,mat,tint);cur=g[1]}
  if(cur<x1)S(cur,0,z-.25,x1,h,z+.25,mat,tint)}
function room(x0,z0,x1,z1,h,floorTint,ceilTint){S(x0,-1,z0,x1,0,z1,MI.floor,floorTint||[1,1,1]);S(x0,h,z0,x1,h+.5,z1,MI.ceil,ceilTint||[1,1,1])}
function signQ(mat,cx,cy,cz,w,h,face){ // face: '+x','-x','+z','-z'
  const hw=w/2,hh=h/2,B=sBatch(mat);let p,n;
  if(face==='+x'){p=[cx,cy-hh,cz+hw,cx,cy-hh,cz-hw,cx,cy+hh,cz-hw,cx,cy+hh,cz+hw];n=[1,0,0]}
  else if(face==='-x'){p=[cx,cy-hh,cz-hw,cx,cy-hh,cz+hw,cx,cy+hh,cz+hw,cx,cy+hh,cz-hw];n=[-1,0,0]}
  else if(face==='+z'){p=[cx-hw,cy-hh,cz,cx+hw,cy-hh,cz,cx+hw,cy+hh,cz,cx-hw,cy+hh,cz];n=[0,0,1]}
  else{p=[cx+hw,cy-hh,cz,cx-hw,cy-hh,cz,cx-hw,cy+hh,cz,cx+hw,cy+hh,cz];n=[0,0,-1]}
  quad(B,p,[0,1,1,1,1,0,0,0],1,1,1,.9,n[0],n[1],n[2]);
}
const doors=[],pickupsDef=[],enemyDef=[],nodes=[];
function addDoor(id,axis,pos,a,b,dh,col,locked){
  // axis 'x': 墙面 x=pos，沿 z 从 a..b；'z': z=pos 沿 x
  const d={id,axis,pos,a,b,dh,col,locked:!!locked,open:0,s:null};
  d.cx=axis==='x'?pos:(a+b)/2;d.cz=axis==='x'?(a+b)/2:pos;
  if(axis==='x')d.s={x0:pos-.15,x1:pos+.15,z0:a,z1:b,y0:0,y1:dh};else d.s={x0:a,x1:b,z0:pos-.15,z1:pos+.15,y0:0,y1:dh};
  solids.push(d.s);doors.push(d);
  return d;
}
function frameDoor(axis,pos,a,b,dh,col){
  const t=.34;col=[col[0]*.35,col[1]*.35,col[2]*.35];
  if(axis==='x'){N(pos-t,0,a-.1,pos+t,dh,a+.1,col);N(pos-t,0,b-.1,pos+t,dh,b+.1,col);N(pos-t,dh-.1,a,pos+t,dh+.1,b,col)}
  else{N(a-.1,0,pos-t,a+.1,dh,pos+t,col);N(b-.1,0,pos-t,b+.1,dh,pos+t,col);N(a,dh-.1,pos-t,b,dh+.1,pos+t,col)}
}
function crateAt(x,z,w,d,h,rot){return S(x-w/2,0,z-d/2,x+w/2,h,z+d/2,MI.crate,rot||[1,1,1],{cover:true})}
function pillar(x,z,w,h,mat,ring){S(x-w/2,0,z-w/2,x+w/2,h,z+w/2,mat||MI.conc,[.8,.85,1],{cover:true});
  if(ring){for(const y of [1.2,h/2,h-1])N(x-w/2-.06,y,z-w/2-.06,x+w/2+.06,y+.1,z+w/2+.06,ring)}}
function rackRow(x,za,zb){for(let z=za;z<zb-0.01;z+=1.2){S(x-.55,0,z,x+.55,2.6,Math.min(z+1.2,zb),MI.rack,[1,1,1],{cover:z===za})}
  S(x-.6,2.6,za,x+.6,2.7,zb,MI.metal,[.5,.5,.6],{nocol:true});N(x-.62,2.62,za,x-.56,2.68,zb,[.2,.7,1])}

let SIGN={};
function buildLevel(){
  STAT={};
  const CY=[.2,.95,1],MG=[1,.25,.9],RD=[1,.2,.25],GR=[.3,1,.6],OR=[1,.55,.15];
  // ---- 接待大厅 ----
  room(-10,0,10,22,5);wallX(-10,0,22,5,MI.metal);wallX(10,0,22,5,MI.metal);wallZ(22,-10,10,5,MI.metal);
  S(-4.5,0,9,4.5,1.1,10.2,MI.conc,[.5,.6,.75],{cover:true});N(-4.5,1.1,9,4.5,1.16,10.2,CY);N(-4.5,.1,10.2,4.5,.16,10.26,CY);
  crateAt(-8,3.2,2,2,1.2);crateAt(-8,5.2,1.2,1.2,1.2,[.8,.8,.9]);crateAt(8,14,2,2,1.2);crateAt(8.2,16.2,1.2,1.2,1.2);
  for(const [x,z] of [[-6,6],[6,6],[-6,15.5],[6,15.5]])pillar(x,z,1.2,5,MI.metal,CY);
  N(-2.6,.01,2,-2.5,.04,20,CY);N(2.5,.01,2,2.6,.04,20,CY);
  for(const z of [4,11,18]){for(const x of [-5,5]){N(x-1,4.94,z-.3,x+1,5,z+.3,[.8,.95,1]);LT(x,4.4,z,.5,.9,1.15,13)}}
  LT(0,2.5,9.6,1.2,.7,.3,7);
  SIGN.logo=makeSign('寂光研究院','JIGUANG INSTITUTE · 欢迎访问','#33eeff');signQ(SIGN.logo,-9.72,3.1,11,7,1.75,'+x');signQ(SIGN.logo,9.72,3.1,11,7,1.75,'-x');
  SIGN.hubS=makeSign('▲ 中庭','实验区 · 机房 · 核心室','#33eeff');signQ(SIGN.hubS,0,4.3,.3,4.5,1.1,'+z');
  // ---- 中庭 ----
  room(-14,-28,14,0,8);
  wallZ(0,-14,14,8,MI.metal,[[-2.5,2.5,3.2]]);wallX(-14,-28,0,8,MI.metal,[[-16,-12,3.2]]);wallX(14,-28,0,8,MI.metal,[[-16,-12,3.2]]);wallZ(-28,-14,14,8,MI.metal,[[-2.5,2.5,3.4]]);
  for(const [x,z] of [[-7,-5],[7,-5],[-7,-23],[7,-23]])pillar(x,z,1.4,8,MI.conc,MG);
  S(-4,0,-17,4,.4,-11,MI.lab,[.7,.8,.9]);N(-4,.4,-17.02,4,.46,-16.9,CY);N(-4,.4,-11.1,4,.46,-10.98,CY);S(-1,.4,-15,1,1.0,-13,MI.glass,[1,1,1],{em:.9});
  for(const [x,z] of [[-9,-9.7],[9,-9.7],[-9,-19.7],[9,-19.7]]){S(x-1.6,0,z-.3,x+1.6,1.0,z+.3,MI.hazard,[.8,.8,.8],{cover:true})}
  crateAt(-3,-24.5,2,1.6,1.2);crateAt(3.2,-24.8,1.6,1.6,1.2);crateAt(-12,-5,1.8,1.8,1.2,[.9,.9,1]);
  SIGN.lab=makeSign('实验区 ▶','LABORATORY','#44ffaa');signQ(SIGN.lab,-13.72,4.2,-14,5,1.25,'+x');
  SIGN.srv=makeSign('◀ 机房','SERVER HALL','#6a9bff');signQ(SIGN.srv,13.72,4.2,-14,5,1.25,'-x');
  SIGN.core=makeSign('核心室','CORE · 电力锁定','#ff4455');signQ(SIGN.core,0,4.6,-27.72,6,1.5,'+z');
  for(const [x,z,c] of [[-8,-6,[.7,.3,1.2]],[8,-6,[.3,.8,1.2]],[-8,-22,[.3,.8,1.2]],[8,-22,[.7,.3,1.2]]])LT(x,6.8,z,c[0],c[1],c[2],16);
  LT(0,5,-14,.5,.9,1.3,14);
  for(const [x,z] of [[-6,-14],[6,-14],[0,-6],[0,-22]])N(x-1.5,7.94,z-.4,x+1.5,8,z+.4,[.7,.8,1]);
  // ---- 实验区 ----
  room(-38,-26,-14,-2,5,[.8,1,.95]);wallX(-38,-26,-2,5,MI.lab);wallZ(-26,-38,-14,5,MI.lab);wallZ(-2,-38,-14,5,MI.lab);
  S(-26.25,0,-26,-25.75,5,-17,MI.lab);S(-26.25,0,-8,-25.75,5,-2,MI.lab);N(-26.3,.1,-26,-26.2,.16,-17,GR);N(-26.3,.1,-8,-26.2,.16,-2,GR);
  S(-33,0,-14.7,-28,1.0,-13.3,MI.lab,[1,1,1],{cover:true});N(-33,1,-14.7,-28,1.05,-13.3,GR);
  S(-21,0,-14.8,-17,1.0,-13.2,MI.lab,[1,1,1],{cover:true});N(-21,1,-14.8,-17,1.05,-13.2,GR);
  crateAt(-19,-21,2,2,1.2);crateAt(-19,-5,2,2,1.2);crateAt(-23,-6.4,1.2,1.2,1.2,[.9,1,.9]);
  S(-34,0,-9,-30,1,-7.4,MI.lab,[1,1,1],{cover:true});S(-34,0,-20.6,-30,1,-19,MI.lab,[1,1,1],{cover:true});
  for(const [x,z] of [[-37,-24],[-37,-4],[-30,-24.5],[-30,-3.5]])S(x-1,0,z-1,x+1,3.4,z+1,MI.tank,[.5,1,.9],{em:.55,cover:true});
  SIGN.nodeA=makeSign('冷却节点 A','COOLING NODE A','#44ffaa');signQ(SIGN.nodeA,-37.72,3.6,-14.2,3.6,.9,'+x');
  S(-37.8,.2,-4.6,-37.5,1.4,-3.6,MI.vent,[1,1,1],{nocol:true});N(-37.5,.15,-4.7,-37.45,.25,-3.5,RD);S(-37.8,.2,-24.6,-37.5,1.4,-23.4,MI.vent,[1,1,1],{nocol:true});
  for(const [x,z,c] of [[-20,-14,[.7,1.1,.95]],[-32,-14,[.6,1.1,.9]],[-32,-6,[.6,1,.9]],[-32,-22,[.6,1,.9]],[-20,-6,[.7,1,.95]],[-20,-22,[.7,1,.95]]])LT(x,4.5,z,c[0],c[1],c[2],11,{fl:z===-22&&x===-32?1:0});
  for(const [x,z] of [[-20,-14],[-32,-14],[-32,-6],[-32,-22],[-20,-6],[-20,-22]])N(x-1,4.94,z-.35,x+1,5,z+.35,[.8,1,.95]);
  // ---- 机房 ----
  room(14,-26,38,-2,5,[.8,.85,1]);wallX(38,-26,-2,5,MI.metal,[],[.8,.85,1]);wallZ(-26,14,38,5,MI.metal);wallZ(-2,14,38,5,MI.metal);
  for(const x of [20.5,26,31.5]){rackRow(x,-25.2,-16.6);rackRow(x,-11.4,-3.2)}
  crateAt(17.5,-19,1.6,1.6,1.2);crateAt(17.5,-9,1.6,1.6,1.2);crateAt(34.4,-22,1.8,1.8,1.2);crateAt(34.4,-6,1.8,1.8,1.2);
  SIGN.nodeB=makeSign('冷却节点 B','COOLING NODE B','#6a9bff');signQ(SIGN.nodeB,37.72,3.6,-14.2,3.6,.9,'-x');
  S(37.5,.2,-24.6,37.8,1.4,-23.4,MI.vent,[1,1,1],{nocol:true});N(37.45,.15,-24.7,37.5,.25,-23.3,RD);S(37.5,.2,-4.6,37.8,1.4,-3.6,MI.vent,[1,1,1],{nocol:true});
  for(const [x,z,c] of [[17,-14,[.4,.6,1.3]],[23.2,-21,[.6,.4,1.3]],[23.2,-7,[.6,.4,1.3]],[28.7,-21,[.4,.6,1.3]],[28.7,-7,[.4,.6,1.3]],[24,-14,[.4,.7,1.3]],[31,-14,[.5,.5,1.3]],[35.5,-14,[1.2,.4,.3]]])LT(x,4.5,z,c[0],c[1],c[2],11);
  for(const x of [23.2,28.7])for(const z of [-21,-7])N(x-.4,4.94,z-1.5,x+.4,5,z+1.5,[.6,.7,1]);
  // ---- 金库通道 ----
  S(-4,-1,-36,4,0,-28,MI.floor,[1,.7,.7]);S(-4,4,-36,4,4.5,-28,MI.ceil);wallX(-4,-36,-28,4,MI.metal,[],[1,.8,.8]);wallX(4,-36,-28,4,MI.metal,[],[1,.8,.8]);
  for(const z of [-30,-34]){N(-3.75,3.9,z-.2,3.75,4,z+.2,RD);LT(0,3.5,z,1.3,.3,.3,8)}
  for(const z of [-29.6,-31.6,-33.6]){N(-3.78,.1,z,-3.74,.5,z+.6,RD);N(3.74,.1,z,3.78,.5,z+.6,RD)}
  // ---- 核心室 ----
  room(-16,-62,16,-36,10,[1,.85,.85]);wallX(-16,-62,-36,10,MI.metal,[],[1,.85,.85]);wallX(16,-62,-36,10,MI.metal,[],[1,.85,.85]);wallZ(-62,-16,16,10,MI.metal);wallZ(-36,-16,16,10,MI.metal,[[-2.5,2.5,3.4]]);
  N(-6,.02,-56.2,6,.06,-55.8,OR);N(-6,.02,-44.2,6,.06,-43.8,OR);N(-6.2,.02,-56.2,-5.8,.06,-43.8,OR);N(5.8,.02,-56.2,6.2,.06,-43.8,OR);
  S(-1.2,0,-51.2,1.2,.5,-48.8,MI.hazard,[.8,.8,.8],{nocol:false});
  for(const [x,z] of [[-12,-42],[12,-42],[-12,-58],[12,-58]])crateAt(x,z,2.2,2.2,1.3);
  for(const [x,z] of [[-5,-39.5],[5,-39.5],[-4.5,-60],[4.5,-60]])S(x-1.5,0,z-.3,x+1.5,1.0,z+.3,MI.hazard,[.8,.8,.8],{cover:true});
  for(const [x,z] of [[-14,-39],[14,-39],[-14,-59],[14,-59]])pillar(x,z,1.6,10,MI.metal,RD);
  for(const [x,z,c] of [[-9,-42,[2.2,.8,.4]],[9,-42,[2.2,.8,.4]],[-9,-58,[2.2,.8,.4]],[9,-58,[2.2,.8,.4]]]){LT(x,5.2,z,c[0],c[1],c[2],21);LT(x,1.8,z,c[0]*.5,c[1]*.5,c[2]*.5,9)}
  LT(0,9,-37,1.2,.4,.3,12);LT(0,6,-47,.5,.5,.7,22);
  SIGN.warn=makeSign('警告 · 核心过载','WARNING · CORE OVERLOAD','#ff5544');signQ(SIGN.warn,0,6,-61.72,8,2,'+z');
  // ---- 门 ----
  frameDoor('z',0,-2.5,2.5,3.2,CY);frameDoor('x',-14,-16,-12,3.2,GR);frameDoor('x',14,-16,-12,3.2,[.4,.6,1]);frameDoor('z',-28,-2.5,2.5,3.4,RD);frameDoor('z',-36,-2.5,2.5,3.4,RD);
  addDoor('d0','z',0,-2.5,2.5,3.2,CY,false);addDoor('dL','x',-14,-16,-12,3.2,GR,false);addDoor('dR','x',14,-16,-12,3.2,CY,false);
  addDoor('v1','z',-28,-2.5,2.5,3.4,RD,true);addDoor('v2','z',-36,-2.5,2.5,3.4,RD,true);
  // 冷却节点
  S(-36.8,0,-14.8,-35.4,2.6,-13.6,MI.metal,[1,1,1],{hidden:true});S(35.4,0,-14.8,36.8,2.6,-13.6,MI.metal,[1,1,1],{hidden:true});
  nodes.push({id:'A',x:-36.1,z:-14.2,face:1,done:false,prog:0},{id:'B',x:36.1,z:-14.2,face:-1,done:false,prog:0});
  // 掩体点
  for(const b of coverBoxes){const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,hw=(b.x1-b.x0)/2,hd=(b.z1-b.z0)/2;
    for(const [px,pz] of [[cx+hw+.9,cz],[cx-hw-.9,cz],[cx,cz+hd+.9],[cx,cz-hd-.9]]){
      let ok=true;for(const s of solids){if(s.y1<=.3||s.y0>1.8)continue;if(px>s.x0-.45&&px<s.x1+.45&&pz>s.z0-.45&&pz<s.z1+.45){ok=false;break}}
      if(ok)coverPts.push({x:px,z:pz,h:Math.min(2.6,b.y1)})}}
  // 上传静态缓冲
  for(const k in STAT){const B=STAT[k],buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,B.a.subarray(0,B.n),gl.STATIC_DRAW);MATS[k].st=buf;MATS[k].cnt=B.n/12}
  STAT=null;
  buildNav();
}

/* ---------- 碰撞 ---------- */
function overlapY(s,y,h){return y<s.y1-EPS&&y+h>s.y0+EPS}
function moveXZ(p,r,h,dx,dz,step,ground){
  // x
  if(dx){p.x+=dx;for(let i=0;i<solids.length;i++){const s=solids[i];
    if(p.x+r>s.x0&&p.x-r<s.x1&&p.z+r>s.z0&&p.z-r<s.z1&&overlapY(s,p.y,h)){
      if(ground&&s.y1-p.y<=step&&s.y1-p.y>0&&!blockedAt(p.x,s.y1,p.z,r,h,s)){p.y=s.y1;continue}
      if(dx>0)p.x=s.x0-r-EPS;else p.x=s.x1+r+EPS;p.hitx=true}}}
  if(dz){p.z+=dz;for(let i=0;i<solids.length;i++){const s=solids[i];
    if(p.x+r>s.x0&&p.x-r<s.x1&&p.z+r>s.z0&&p.z-r<s.z1&&overlapY(s,p.y,h)){
      if(ground&&s.y1-p.y<=step&&s.y1-p.y>0&&!blockedAt(p.x,s.y1,p.z,r,h,s)){p.y=s.y1;continue}
      if(dz>0)p.z=s.z0-r-EPS;else p.z=s.z1+r+EPS;p.hitz=true}}}
}
function blockedAt(x,y,z,r,h,ex){for(const s of solids){if(s===ex)continue;if(x+r>s.x0&&x-r<s.x1&&z+r>s.z0&&z-r<s.z1&&overlapY(s,y,h))return true}return false}
function moveY(p,r,h,dy){ // 返回 -1 落地 / 1 撞头 / 0
  p.y+=dy;let res=0;
  for(const s of solids){if(p.x+r>s.x0&&p.x-r<s.x1&&p.z+r>s.z0&&p.z-r<s.z1&&overlapY(s,p.y,h)){
    if(dy<=0){p.y=s.y1;res=-1}else{p.y=s.y0-h-EPS;res=1}}}
  return res;
}
function rayWorld(ox,oy,oz,dx,dy,dz,maxT){
  let best=maxT,bn=null;
  for(let i=0;i<solids.length;i++){const s=solids[i];
    let t0=0,t1=best,ok=true,nx=0,ny=0,nz=0,tn=0;
    // x
    if(Math.abs(dx)<1e-9){if(ox<s.x0||ox>s.x1)continue}else{let a=(s.x0-ox)/dx,b=(s.x1-ox)/dx,sg=-1;if(a>b){const t=a;a=b;b=t;sg=1}if(a>t0){t0=a;nx=sg;ny=0;nz=0}if(b<t1)t1=b;if(t0>t1)continue}
    if(Math.abs(dy)<1e-9){if(oy<s.y0||oy>s.y1)continue}else{let a=(s.y0-oy)/dy,b=(s.y1-oy)/dy,sg=-1;if(a>b){const t=a;a=b;b=t;sg=1}if(a>t0){t0=a;nx=0;ny=sg;nz=0}if(b<t1)t1=b;if(t0>t1)continue}
    if(Math.abs(dz)<1e-9){if(oz<s.z0||oz>s.z1)continue}else{let a=(s.z0-oz)/dz,b=(s.z1-oz)/dz,sg=-1;if(a>b){const t=a;a=b;b=t;sg=1}if(a>t0){t0=a;nx=0;ny=0;nz=sg;}if(b<t1)t1=b;if(t0>t1)continue}
    if(t0<best&&t0>=0){best=t0;bn=[nx,ny,nz]}
  }
  return {t:best,n:bn};
}
function hasLOS(ax,ay,az,bx,by,bz){const dx=bx-ax,dy=by-ay,dz=bz-az,l=Math.hypot(dx,dy,dz);if(l<.01)return true;return rayWorld(ax,ay,az,dx/l,dy/l,dz/l,l-.05).n===null}
function pointSolid(x,y,z){for(const s of solids)if(x>s.x0&&x<s.x1&&y>s.y0&&y<s.y1&&z>s.z0&&z<s.z1)return s;return null}

/* ---------- 导航网格 (0.5m) + A* ---------- */
const NV={x0:-40,z0:-64,cs:.5,w:160,h:176,g:null};
function buildNav(){
  const {x0,z0,cs,w,h}=NV;const g=new Uint8Array(w*h);// 1=可走
  const floors=solids.filter(s=>s.y1===0&&s.y0<0),dset=new Set(doors.map(d=>d.s));
  for(const f of floors){const i0=Math.max(0,Math.floor((f.x0-x0)/cs)),i1=Math.min(w-1,Math.ceil((f.x1-x0)/cs)),j0=Math.max(0,Math.floor((f.z0-z0)/cs)),j1=Math.min(h-1,Math.ceil((f.z1-z0)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const cx=x0+(i+.5)*cs,cz=z0+(j+.5)*cs;if(cx>f.x0&&cx<f.x1&&cz>f.z0&&cz<f.z1)g[j*w+i]=1}}
  const pad=.45;
  for(const s of solids){if(s.y1<=.5||s.y0>1.75||dset.has(s)||s.y1===0)continue;
    const i0=Math.max(0,Math.floor((s.x0-pad-x0)/cs)),i1=Math.min(w-1,Math.ceil((s.x1+pad-x0)/cs)),j0=Math.max(0,Math.floor((s.z0-pad-z0)/cs)),j1=Math.min(h-1,Math.ceil((s.z1+pad-z0)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const cx=x0+(i+.5)*cs,cz=z0+(j+.5)*cs;if(cx>s.x0-pad&&cx<s.x1+pad&&cz>s.z0-pad&&cz<s.z1+pad)g[j*w+i]=0}}
  NV.g=g;
}
const nvI=x=>Math.floor((x-NV.x0)/NV.cs),nvJ=z=>Math.floor((z-NV.z0)/NV.cs);
function nvOK(i,j){return i>=0&&j>=0&&i<NV.w&&j<NV.h&&NV.g[j*NV.w+i]===1}
function nvNearest(x,z){let i=nvI(x),j=nvJ(z);if(nvOK(i,j))return [i,j];for(let r=1;r<8;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){if(Math.max(Math.abs(a),Math.abs(b))!==r)continue;if(nvOK(i+a,j+b))return [i+a,j+b]}return null}
function gridLine(x0,z0,x1,z1){const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/.25);for(let k=0;k<=n;k++){const t=k/n;if(!nvOK(nvI(x0+(x1-x0)*t),nvJ(z0+(z1-z0)*t)))return false}return true}
function navPath(sx,sz,tx,tz){
  const a=nvNearest(sx,sz),b=nvNearest(tx,tz);if(!a||!b)return null;
  const w=NV.w,N=w*NV.h,si=a[1]*w+a[0],ti=b[1]*w+b[0];
  const gS=new Float32Array(N).fill(1e9),par=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
  const heap=[];const push=(k,f)=>{heap.push([f,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}};
  const pop=()=>{const t=heap[0],l=heap.pop();if(heap.length){heap[0]=l;let i=0;for(;;){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[i][0]<=heap[c][0])break;[heap[i],heap[c]]=[heap[c],heap[i]];i=c}}return t};
  const bi=b[0],bj=b[1];gS[si]=0;push(si,0);let found=false,it=0;
  while(heap.length&&it++<30000){const [,k]=pop();if(closed[k])continue;closed[k]=1;if(k===ti){found=true;break}
    const ci=k%w,cj=(k/w)|0;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=ci+di,nj=cj+dj;if(!nvOK(ni,nj))continue;if(di&&dj&&(!nvOK(ci+di,cj)||!nvOK(ci,cj+dj)))continue;
      const nk=nj*w+ni,ng=gS[k]+(di&&dj?1.414:1);if(ng<gS[nk]){gS[nk]=ng;par[nk]=k;push(nk,ng+Math.hypot(ni-bi,nj-bj))}}}
  if(!found)return null;
  const pts=[];for(let k=ti;k!==-1;k=par[k])pts.push([NV.x0+((k%w)+.5)*NV.cs,NV.z0+(((k/w)|0)+.5)*NV.cs]);pts.reverse();
  // 拉直
  const out=[];let i=0;while(i<pts.length-1){let j=pts.length-1;while(j>i+1&&!gridLine(pts[i][0],pts[i][1],pts[j][0],pts[j][1]))j--;out.push(pts[j]);i=j}
  return out;
}
