/* ---------- 程序化音频 (WebAudio) ---------- */
const AU={ctx:null,master:null,rev:null,revG:null,nb:null,amb:null,beatT:0,step:0,ok:false};
function auInit(){
  if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume();return}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  try{
    const c=AU.ctx=new C();AU.master=c.createGain();AU.master.gain.value=CFG.vol/100;
    const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=6;AU.master.connect(comp);comp.connect(c.destination);
    AU.nb=c.createBuffer(1,c.sampleRate*1.5,c.sampleRate);const d=AU.nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const ir=c.createBuffer(2,c.sampleRate*1.8,c.sampleRate);for(let ch=0;ch<2;ch++){const dd=ir.getChannelData(ch);for(let i=0;i<dd.length;i++)dd[i]=(Math.random()*2-1)*Math.pow(1-i/dd.length,2.8)}
    AU.rev=c.createConvolver();AU.rev.buffer=ir;AU.revG=c.createGain();AU.revG.gain.value=.5;AU.rev.connect(AU.revG);AU.revG.connect(AU.master);
    // 环境低频
    const g=c.createGain();g.gain.value=.05;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=260;
    const lfo=c.createOscillator();lfo.frequency.value=.12;const lg=c.createGain();lg.gain.value=90;lfo.connect(lg);lg.connect(f.frequency);lfo.start();
    f.connect(g);g.connect(AU.master);AU.amb=g;
    const oscs=[];for(const fr of [55,55.4,82.5]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=fr;o.connect(f);o.start();oscs.push(o)}
    AU.ok=true;
  }catch(e){AU.ctx=null}
}
function auVol(){if(AU.master)AU.master.gain.value=CFG.vol/100}
function outNode(pos,rev){
  const c=AU.ctx;const g=c.createGain();
  if(pos){const p=c.createPanner();p.panningModel='equalpower';p.distanceModel='inverse';p.refDistance=3;p.rolloffFactor=1.1;
    if(p.positionX){p.positionX.value=pos[0];p.positionY.value=pos[1];p.positionZ.value=pos[2]}else p.setPosition(pos[0],pos[1],pos[2]);g.connect(p);p.connect(AU.master);if(rev)p.connect(AU.rev)}
  else{g.connect(AU.master);if(rev)g.connect(AU.rev)}
  return g;
}
function nz(dur,type,f0,f1,q,vol,delay,pos,rev){
  if(!AU.ok)return;const c=AU.ctx,t=c.currentTime+(delay||0);
  const s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);f.Q.value=q;
  const g=outNode(pos,rev);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  s.connect(f);f.connect(g);s.start(t,Math.random()*.5,dur+.05);
}
function tn(type,f0,f1,dur,vol,delay,pos,rev){
  if(!AU.ok)return;const c=AU.ctx,t=c.currentTime+(delay||0);
  const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const g=outNode(pos,rev);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  o.connect(g);o.start(t);o.stop(t+dur+.05);
}
const SFX={
 rifle(){nz(.1,'bandpass',3200,900,.9,.5);tn('sawtooth',320,70,.1,.45);tn('square',1400,500,.04,.12);nz(.5,'lowpass',900,200,.3,.12,.02,null,true)},
 shot(){nz(.4,'lowpass',4000,260,.4,.95);tn('sine',130,32,.28,.95);nz(.9,'lowpass',1500,150,.3,.35,.03,null,true);nz(.12,'highpass',2500,6000,.5,.4)},
 dmr(){nz(.22,'highpass',1800,5000,.5,.6);tn('sine',100,28,.34,.9);tn('sawtooth',2600,400,.06,.22);nz(1.2,'lowpass',2500,200,.3,.5,.02,null,true)},
 empty(){tn('square',900,700,.03,.18);nz(.03,'highpass',3000,3000,1,.2)},
 click(d){nz(.03,'highpass',2500,2500,2,.25,d);tn('square',700,300,.04,.12,d)},
 reload(w){if(w===1){for(let i=0;i<1;i++){SFX.click(0);tn('sine',220,120,.08,.15,.02)}}else{SFX.click(0);SFX.click(.85);nz(.07,'bandpass',1200,800,2,.3,1.55);tn('square',500,200,.06,.15,1.55)}},
 pump(){nz(.08,'bandpass',900,500,2,.35);tn('square',180,100,.1,.2);nz(.08,'bandpass',1200,600,2,.35,.18);tn('square',260,120,.08,.18,.18)},
 swap(){nz(.06,'bandpass',1500,900,2,.25);tn('square',420,260,.05,.1)},
 hit(h){tn('sine',h?2600:1700,h?1900:1300,.05,.2)},
 kill(){tn('sine',1200,1200,.06,.22);tn('sine',1800,1800,.1,.22,.06)},
 ping(pos){nz(.07,'bandpass',3500,2500,3,.18,0,pos);tn('triangle',1800,900,.06,.1,0,pos)},
 hurt(){tn('sine',110,45,.25,.8);nz(.18,'lowpass',1400,200,.5,.5)},
 efire(pos,k){if(k==='heavy'){tn('sawtooth',260,60,.2,.4,0,pos);nz(.15,'lowpass',1800,300,.5,.3,0,pos)}else if(k==='drone'){tn('sine',1500,300,.14,.3,0,pos)}else{tn('square',640,170,.12,.22,0,pos);nz(.08,'bandpass',2500,1200,.8,.2,0,pos)}},
 tele(pos){tn('sine',900,1500,.1,.1,0,pos)},
 boom(pos){nz(.9,'lowpass',2400,70,.5,.9,0,pos,true);tn('sine',110,28,.6,.9,0,pos);nz(.3,'highpass',2000,2000,.5,.3,0,pos)},
 pickup(){tn('sine',620,620,.08,.2);tn('sine',930,930,.12,.2,.07);tn('sine',1240,1240,.16,.18,.14)},
 step(v){nz(.06,'lowpass',500+Math.random()*200,220,.7,.1*v)},
 land(){nz(.1,'lowpass',420,120,.7,.2)},
 door(pos){nz(.5,'bandpass',500,1600,1.5,.22,0,pos);tn('sawtooth',90,60,.4,.15,0,pos)},
 beep(pos){tn('square',1500,1500,.05,.15,0,pos)},
 alarm(){if(!AU.ok)return;for(let i=0;i<10;i++){tn('square',760,760,.22,.12,i*.5);tn('square',980,980,.22,.12,i*.5+.25)}},
 power(){tn('sawtooth',50,400,1.4,.3);nz(1.4,'lowpass',200,3000,.8,.3);tn('sine',900,1800,.5,.15,1.3)},
 spawn(pos){nz(.35,'bandpass',300,3000,2,.25,0,pos);tn('sawtooth',100,500,.3,.15,0,pos)},
 charge(pos){tn('sawtooth',80,600,.7,.25,0,pos);nz(.7,'bandpass',200,2500,2,.2,0,pos)},
 corefire(pos){tn('sawtooth',500,90,.28,.4,0,pos);nz(.2,'lowpass',2500,200,.7,.35,0,pos)},
 win(){[0,4,7,12].forEach((n,i)=>tn('triangle',330*Math.pow(2,n/12),330*Math.pow(2,n/12),.9,.22,i*.14,null,true))},
 die(){tn('sawtooth',300,40,1.2,.5);nz(1.2,'lowpass',1500,60,.5,.4)}
};
function auListener(x,y,z,fx,fy,fz){
  if(!AU.ok)return;const l=AU.ctx.listener;
  if(l.positionX){l.positionX.value=x;l.positionY.value=y;l.positionZ.value=z;l.forwardX.value=fx;l.forwardY.value=fy;l.forwardZ.value=fz;l.upX.value=0;l.upY.value=1;l.upZ.value=0}
  else{l.setPosition(x,y,z);l.setOrientation(fx,fy,fz,0,1,0)}
}
const BASS=[0,0,3,0,5,3,0,-2];
function auMusic(dt,intensity){
  if(!AU.ok)return;AU.beatT-=dt;
  if(AU.beatT<=0){AU.beatT=.25;AU.step=(AU.step+1)%32;
    if(intensity>.05){const n=BASS[(AU.step>>2)%8];const f=55*Math.pow(2,n/12);
      if(AU.step%2===0)tn('sawtooth',f*2,f*1.6,.2,.07*intensity);
      if(intensity>.5&&AU.step%4===2)nz(.06,'highpass',6000,6000,1,.06*intensity);
      if(intensity>.7&&AU.step%8===0)tn('sine',90,40,.2,.25*intensity);}
    else if(AU.step%16===0)tn('sine',329.6,329.6,2.5,.03,0,null,true)}
}
