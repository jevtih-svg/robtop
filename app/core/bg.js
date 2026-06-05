/* RobTop — анимированный неоновый фон (плата + орбы) и конфетти.
   Общие визуальные сервисы оболочки. window.Confetti.launch() доступен модулям через sdk.ui.confetti(). */

/* ================= ANIMATED NEON BACKGROUND ================= */
(function(){
  var cv=document.getElementById("bg");
  var ctx=cv && cv.getContext && cv.getContext("2d");
  if(!ctx) return;
  var W=0,H=0,DPR=1,circuit=null,orbs=[],sprites={},raf=null;
  var reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PAL=[[25,227,255],[255,43,214],[166,75,255],[59,107,255],[43,240,192],[255,210,59],[255,77,109]];
  function rgba(c,a){ return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")"; }
  function sprite(c){
    var key=c.join(","); if(sprites[key]) return sprites[key];
    var s=128,cn=document.createElement("canvas"); cn.width=cn.height=s;
    var g=cn.getContext("2d"),r=s/2,grd=g.createRadialGradient(r,r,0,r,r,r);
    grd.addColorStop(0,rgba(c,.95)); grd.addColorStop(.18,rgba(c,.6)); grd.addColorStop(.5,rgba(c,.16)); grd.addColorStop(1,rgba(c,0));
    g.fillStyle=grd; g.beginPath(); g.arc(r,r,r,0,7); g.fill(); sprites[key]=cn; return cn;
  }
  function buildCircuit(){
    circuit=document.createElement("canvas"); circuit.width=Math.max(1,W*DPR); circuit.height=Math.max(1,H*DPR);
    var g=circuit.getContext("2d"); g.setTransform(DPR,0,0,DPR,0,0);
    var step=28,n=Math.round((W*H)/14000);
    for(var i=0;i<n;i++){
      var c=PAL[(Math.random()*PAL.length)|0];
      var x=Math.round(Math.random()*W/step)*step, y=Math.round(Math.random()*H/step)*step, segs=2+(Math.random()*4|0);
      g.strokeStyle=rgba(c,.16); g.lineWidth=1.7; g.lineCap="round"; g.lineJoin="round";
      g.shadowColor=rgba(c,.55); g.shadowBlur=6; g.beginPath(); g.moveTo(x,y);
      for(var s2=0;s2<segs;s2++){ if(Math.random()<.5) x+=(Math.random()<.5?-1:1)*step*(1+(Math.random()*3|0)); else y+=(Math.random()<.5?-1:1)*step*(1+(Math.random()*3|0)); g.lineTo(x,y); }
      g.stroke(); g.shadowBlur=0; g.fillStyle=rgba(c,.5); g.beginPath(); g.arc(x,y,2.3,0,7); g.fill();
    }
  }
  function buildOrbs(){
    orbs=[]; var area=W*H,count=Math.min(78,Math.max(36,Math.round(area/12000)));
    for(var i=0;i<count;i++){
      var t=Math.random(),r=t<.6?2+Math.random()*4:(t<.86?6+Math.random()*6:12+Math.random()*12);
      var sp=reduce?0:(.05+Math.random()*.32),a=Math.random()*6.28;
      orbs.push({x:Math.random()*W,y:Math.random()*H,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:r,glow:2.7+Math.random()*1.2,col:PAL[(Math.random()*PAL.length)|0],al:.5+Math.random()*.45,ph:Math.random()*6.28});
    }
  }
  function resize(){ DPR=Math.min(window.devicePixelRatio||1,2); W=window.innerWidth; H=window.innerHeight; cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+"px"; cv.style.height=H+"px"; ctx.setTransform(DPR,0,0,DPR,0,0); buildCircuit(); buildOrbs(); }
  function draw(t){
    ctx.clearRect(0,0,W,H); if(circuit) ctx.drawImage(circuit,0,0,W,H);
    ctx.globalCompositeOperation="lighter";
    for(var i=0;i<orbs.length;i++){
      var o=orbs[i]; o.x+=o.vx; o.y+=o.vy; var m=o.r*o.glow;
      if(o.x<-m)o.x=W+m; else if(o.x>W+m)o.x=-m; if(o.y<-m)o.y=H+m; else if(o.y>H+m)o.y=-m;
      var pulse=reduce?1:(.72+.28*Math.sin(t*.0018+o.ph)),spr=sprite(o.col);
      ctx.globalAlpha=o.al*pulse; ctx.drawImage(spr,o.x-m,o.y-m,m*2,m*2);
      ctx.globalAlpha=Math.min(1,o.al*pulse+.15); ctx.fillStyle=rgba(o.col,1); ctx.beginPath(); ctx.arc(o.x,o.y,o.r*.5,0,7); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    if(!reduce) raf=requestAnimationFrame(draw);
  }
  var rt=null;
  window.addEventListener("resize",function(){ clearTimeout(rt); rt=setTimeout(function(){ resize(); if(reduce) draw(0); },180); });
  resize(); if(reduce) draw(0); else raf=requestAnimationFrame(draw);
})();

/* ================= CONFETTI ================= */
window.Confetti=(function(){
  var cv=null,ctx=null,DPR=1,W=0,H=0,parts=[],raf=null;
  var reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COL=["#19e3ff","#ff2bd6","#ff3db0","#a64bff","#3b6bff","#2bf0c0","#ffd23b","#ffffff"];
  function ensure(){
    if(cv) return;
    cv=document.createElement("canvas"); cv.id="confetti";
    cv.style.cssText="position:fixed;inset:0;z-index:60;pointer-events:none";
    document.body.appendChild(cv);
    ctx=cv.getContext("2d"); resize();
    window.addEventListener("resize",resize);
  }
  function resize(){ if(!cv||!ctx) return; DPR=Math.min(window.devicePixelRatio||1,2); W=window.innerWidth; H=window.innerHeight; cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+"px"; cv.style.height=H+"px"; ctx.setTransform(DPR,0,0,DPR,0,0); }
  function spawn(){
    var n=reduce?46:170;
    for(var i=0;i<n;i++){
      var fromTop=Math.random()<.55;
      var x=fromTop?Math.random()*W:(W/2 + (Math.random()-.5)*120);
      var y=fromTop?-20-Math.random()*H*.3:(H*.42);
      var ang=fromTop?(Math.PI/2 + (Math.random()-.5)*0.8):(Math.random()*Math.PI*2);
      var spd=fromTop?(2+Math.random()*3):(6+Math.random()*9);
      parts.push({x:x,y:y,vx:Math.cos(ang)*spd*(fromTop?0.4:1),vy:(fromTop?spd:Math.sin(ang)*spd)-(fromTop?0:4),
        g:0.12+Math.random()*0.08, w:6+Math.random()*7, h:9+Math.random()*9,
        rot:Math.random()*6.28, vr:(Math.random()-.5)*0.4, col:COL[(Math.random()*COL.length)|0],
        fl:Math.random()*6.28, life:0, max:150+Math.random()*90, streamer:Math.random()<.25});
    }
  }
  function tick(){
    ctx.clearRect(0,0,W,H);
    for(var i=parts.length-1;i>=0;i--){
      var p=parts[i]; p.vy+=p.g; p.fl+=0.15; p.x+=p.vx+Math.sin(p.fl)*0.8; p.y+=p.vy; p.rot+=p.vr; p.life++;
      var a=p.life>p.max-40?Math.max(0,(p.max-p.life)/40):1;
      ctx.save(); ctx.globalAlpha=a; ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col;
      var w=p.streamer?p.w*0.5:p.w, h=p.streamer?p.h*2:p.h;
      ctx.fillRect(-w/2,-h/2,w,h); ctx.restore();
      if(p.y>H+40 || p.life>p.max) parts.splice(i,1);
    }
    if(parts.length) raf=requestAnimationFrame(tick); else { raf=null; if(ctx) ctx.clearRect(0,0,W,H); }
  }
  function launch(){ ensure(); if(!ctx) return; spawn(); if(!raf) raf=requestAnimationFrame(tick); }
  return { launch:launch };
})();
