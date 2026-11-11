/* ---- HUD ---- */
const hudCache={};
function setTxt(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v}}
function projW(x,y,z){const m=VPm;const cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cw_=m[3]*x+m[7]*y+m[11]*z+m[15];return {x:cx/cw_,y:cy/cw_,w:cw_}}
function drawHUD(cam){
  hx.clearRect(0,0,HW,HH);
  if(G.state==='title'||G.state==='win')return;
  const cx=HW/2,cy=HH/2,w=INV[cw],d=w.d;
  const scoped=d.id==='dmr'&&P.ads>.7;
  // HUD DOM
  setTxt('hpT',Math.ceil(P.hp));setTxt('arT',Math.ceil(P.ar));$('hpB').style.width=P.hp+'%';$('arB').style.width=P.ar+'%';
  setTxt('wname',d.name);setTxt('am',w.mag);setTxt('ar2','/ '+w.res);
  let sl='';INV.forEach((x,i)=>{sl+=`<i class="${i===cw?'on':''} ${x.have?'':'no'}">${i+1}</i>`});if(hudCache.sl!==sl){hudCache.sl=sl;$('wslots').innerHTML=sl}
  $('hurt').style.opacity=clamp(P.hurtT*1.2+(P.hp<30?.35+.2*Math.sin(NOWT*6):0),0,.9);
  const fa=flashA>0?flashT/flashA:0;$('flash').style.opacity=flashT>0?Math.min(1,fa)*Math.min(.8,flashA):0;
  if(w.mag<=Math.ceil(d.mag*.25)&&!P.rl)$('am').style.color='#f66';else $('am').style.color='#fff';
  if(P.rl)setTxt('am','…');
  // 准星
  if(scoped){
    const R_=Math.min(HW,HH)*.46;hx.fillStyle='#000';hx.beginPath();hx.rect(0,0,HW,HH);hx.arc(cx,cy,R_,0,TAU,true);hx.fill('evenodd');
    hx.strokeStyle='rgba(0,0,0,.9)';hx.lineWidth=2;hx.beginPath();hx.moveTo(cx-R_,cy);hx.lineTo(cx-8,cy);hx.moveTo(cx+8,cy);hx.lineTo(cx+R_,cy);hx.moveTo(cx,cy-R_);hx.lineTo(cx,cy-8);hx.moveTo(cx,cy+8);hx.lineTo(cx,cy+R_);hx.stroke();
    hx.fillStyle='rgba(255,60,60,.9)';hx.fillRect(cx-1.5,cy-1.5,3,3);
    hx.strokeStyle='rgba(120,230,255,.5)';hx.lineWidth=1;hx.beginPath();hx.arc(cx,cy,R_,0,TAU);hx.stroke();
  }else if(!P.dead){
    const sp=curSpread()*D2R;const gap=Math.tan(sp)/Math.tan(cam.fovr/2)*HH/2+5;
    hx.strokeStyle='rgba(255,255,255,.9)';hx.lineWidth=2;hx.shadowColor='#0cf';hx.shadowBlur=4;
    if(P.ads>.5&&d.id==='rifle'){hx.fillStyle='rgba(255,255,255,.9)';hx.fillRect(cx-1.5,cy-1.5,3,3)}
    else{hx.beginPath();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){hx.moveTo(cx+dx*gap,cy+dy*gap);hx.lineTo(cx+dx*(gap+9),cy+dy*(gap+9))}hx.stroke();hx.fillStyle='rgba(255,255,255,.9)';hx.fillRect(cx-1,cy-1,2,2)}
    hx.shadowBlur=0;
  }
  // 命中标记
  for(const h of HM){const k=h.t/.22,g=7+(1-k)*5;hx.strokeStyle=h.kill?`rgba(255,60,60,${k})`:h.head?`rgba(255,220,60,${k})`:`rgba(255,255,255,${k})`;hx.lineWidth=2.5;hx.beginPath();for(const [dx,dy] of [[1,1],[-1,1],[1,-1],[-1,-1]]){hx.moveTo(cx+dx*g,cy+dy*g);hx.lineTo(cx+dx*(g+9),cy+dy*(g+9))}hx.stroke()}
  // 受击方向
  for(const di of DI){const rel=di.a+P.yaw;const k=Math.min(1,di.t);hx.save();hx.translate(cx,cy);hx.rotate(rel);hx.strokeStyle=`rgba(255,40,60,${k*.9})`;hx.lineWidth=7;hx.beginPath();hx.arc(0,0,Math.min(HW,HH)*.28,-Math.PI/2-.25,-Math.PI/2+.25);hx.stroke();hx.restore()}
  // 路标
  if(!scoped)drawMarkers(cam);
}
function wpList(){
  const o=[];
  if(G.phase===0)o.push({x:0,z:2,y:1.5,t:'中庭'});
  else if(G.phase===1){for(const n of nodes)if(!n.done)o.push({x:n.x,z:n.z,y:2.4,t:'节点 '+n.id})}
  else if(G.phase===2)o.push({x:0,z:-34,y:2,t:'核心室'});
  else if(G.phase===3){for(const e of EN)if(e.T.kind==='pylon'&&!e.dead)o.push({x:e.x,z:e.z,y:4.2,t:'防护柱'});if(G.pylons===0&&G.boss&&!G.boss.dead)o.push({x:G.boss.x,z:G.boss.z,y:G.boss.y+1.6,t:'核心'})}
  return o;
}
function drawMarkers(cam){
  for(const m of wpList()){
    const p=projW(m.x,m.y,m.z);let sx,sy,off=false;
    if(p.w<=0){sx=-p.x;sy=-p.y;off=true;}else{sx=p.x;sy=p.y;if(Math.abs(sx)>.92||Math.abs(sy)>.72)off=true}
    const l=Math.max(Math.abs(sx),Math.abs(sy),1e-6);let px=sx,py=sy;
    if(off||p.w<=0){px=sx/l*.9;py=sy/l*.72;if(p.w<=0&&Math.abs(px)<.9&&Math.abs(py)<.72){px=px>=0?.9:-.9}}
    const X=(px*.5+.5)*HW,Y=(-py*.5+.5)*HH,d=Math.hypot(m.x-P.x,m.z-P.z);
    hx.fillStyle='rgba(60,240,255,.95)';hx.strokeStyle='rgba(0,20,30,.8)';hx.lineWidth=3;hx.shadowColor='#0cf';hx.shadowBlur=8;
    hx.beginPath();hx.moveTo(X,Y-9);hx.lineTo(X+8,Y);hx.lineTo(X,Y+9);hx.lineTo(X-8,Y);hx.closePath();hx.stroke();hx.fill();hx.shadowBlur=0;
    hx.font='600 13px "Noto Sans CJK SC","Microsoft YaHei",sans-serif';hx.textAlign='center';hx.fillStyle='#bff';hx.strokeStyle='rgba(0,0,0,.8)';hx.lineWidth=3;
    const txt=`${m.t} ${Math.round(d)}m`;hx.strokeText(txt,X,Y+24);hx.fillText(txt,X,Y+24);
  }
}
