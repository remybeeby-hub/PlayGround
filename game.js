
function polygon(x,y,r,n,rot=-Math.PI/2){ctx.beginPath();for(let i=0;i<n;i++){const a=rot+i*Math.PI*2/n;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
function drawShape(x,y,r,shape,color,glow=false){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.shadowColor=glow?color:'transparent';ctx.shadowBlur=glow?13:0;
 if(shape==='tri')polygon(0,0,r,3);else if(shape==='square')polygon(0,0,r,4,Math.PI/4);else if(shape==='diamond')polygon(0,0,r,4);else if(shape==='hex')polygon(0,0,r,6);else if(shape==='star'){ctx.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.48:r;let px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}else{ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);}
 ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#132023';ctx.beginPath();ctx.arc(-r*.22,-r*.1,Math.max(1.7,r*.12),0,Math.PI*2);ctx.arc(r*.22,-r*.1,Math.max(1.7,r*.12),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#132023';ctx.lineWidth=Math.max(1.2,r*.08);ctx.beginPath();ctx.moveTo(-r*.2,r*.27);ctx.quadraticCurveTo(0,r*.42,r*.2,r*.27);ctx.stroke();ctx.restore();}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#151f22';ctx.fillRect(0,0,W,H);
 // subtle workshop lights and floor grid
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#1a2729');bg.addColorStop(.55,'#172124');bg.addColorStop(1,'#11191c');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 for(let r=0;r<ROWS;r++){for(let c=0;c<COLS;c++){const x=c*C,y=r*C;ctx.fillStyle=(r+c)%2?'#ffffff03':'#00000006';ctx.fillRect(x,y,C,C);ctx.strokeStyle='#82999813';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,C,C);}}
 // build zone
 ctx.fillStyle='#9ce7be08';ctx.fillRect(4*C,0,11*C,H);ctx.strokeStyle='#9ce7be19';ctx.setLineDash([5,6]);ctx.strokeRect(4*C+1,1,11*C-2,H-2);ctx.setLineDash([]);
 ctx.fillStyle='#a2e8bf55';ctx.font='9px DM Mono,monospace';ctx.fillText('FACTORY BUILD ZONE',4*C+10,15);
 // lane markings
 for(let r=0;r<ROWS;r++){ctx.fillStyle=r%2?'#81979609':'#94ad9f0b';ctx.fillRect(0,r*C+24,W,2);}
 // core complex
 ctx.fillStyle='#202e30';ctx.fillRect(9,113,126,274);ctx.strokeStyle='#55706a';ctx.lineWidth=1;ctx.strokeRect(9.5,113.5,125,273);ctx.fillStyle='#152022';ctx.fillRect(20,125,104,248);ctx.strokeStyle='#364b48';ctx.strokeRect(20.5,125.5,103,247);
 ctx.fillStyle='#85ddac';ctx.font='9px DM Mono,monospace';ctx.fillText('CORE // 01',31,144);
 // core vertical health gauge
 ctx.fillStyle='#334342';ctx.fillRect(30,153,6,197);ctx.fillStyle=state.core>40?'#9ce7be':'#ff816e';ctx.fillRect(30,153+197*(1-state.core/100),6,197*state.core/100);
 ctx.save();ctx.shadowColor='#9ce7be';ctx.shadowBlur=16;ctx.strokeStyle='#9ce7be';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,199);ctx.lineTo(99,216);ctx.lineTo(99,250);ctx.lineTo(70,267);ctx.lineTo(41,250);ctx.lineTo(41,216);ctx.closePath();ctx.stroke();ctx.restore();ctx.fillStyle='#9ce7be';ctx.beginPath();ctx.arc(70,233,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a7b6b0';ctx.font='8px DM Mono,monospace';ctx.fillText('FOUNDATION CORE',40,292);ctx.fillStyle='#778b88';ctx.fillText('HERO PRINT BAY',43,337);ctx.fillStyle='#2d4241';ctx.fillRect(44,345,52,5);ctx.fillStyle='#9ce7be';ctx.fillRect(44,345,52*Math.min(1,1-state.heroTimer/10),5);
 // approach alert edge
 ctx.fillStyle='#ff816e14';ctx.fillRect(940,0,60,H);ctx.fillStyle='#ff816e';ctx.font='9px DM Mono,monospace';ctx.fillText('VOID',954,16);
 // selection ghost
 if(selected){const c=Math.floor(mouse.x/C),r=Math.floor(mouse.y/C);if(c>=0&&c<COLS&&r>=0&&r<ROWS){ctx.fillStyle='#9ce7be18';ctx.fillRect(c*C+2,r*C+2,C-4,C-4);ctx.strokeStyle='#9ce7beaa';ctx.setLineDash([4,4]);ctx.strokeRect(c*C+2.5,r*C+2.5,C-5,C-5);ctx.setLineDash([]);const d=defs.find(x=>x.id===selected);drawStructure({id:d.id,c,r,hp:100,maxHp:100},true);}}else if(mouse.x>0&&mouse.x<W){const b=state.buildings.find(o=>o.c===Math.floor(mouse.x/C)&&o.r===Math.floor(mouse.y/C));if(b){ctx.fillStyle='#ffffff0b';ctx.fillRect(b.c*C+1,b.r*C+1,C-2,C-2);}}
 for(const b of state.buildings)drawStructure(b,false);
 // projectiles
 for(const p of state.bullets){ctx.save();ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();ctx.restore();}
 for(const h of state.heroes){drawShape(h.x,h.y,10,h.type.shape,h.type.color,true);if(h.level>1){ctx.fillStyle='#fff';ctx.font='8px DM Mono,monospace';ctx.fillText('+'+h.level,h.x+10,h.y-8);}if(h.hp<h.maxHp){ctx.fillStyle='#101719';ctx.fillRect(h.x-10,h.y+13,20,3);ctx.fillStyle=h.type.color;ctx.fillRect(h.x-10,h.y+13,20*Math.max(0,h.hp/h.maxHp),3);}}
 for(const e of state.enemies){drawShape(e.x,e.y,e.type.r,e.type.shape,e.type.color,true);ctx.fillStyle='#101719';ctx.fillRect(e.x-13,e.y-e.type.r-8,26,3);ctx.fillStyle='#ff8a75';ctx.fillRect(e.x-13,e.y-e.type.r-8,26*Math.max(0,e.hp/e.maxHp),3);}
 for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/.55);if(p.text){ctx.fillStyle=p.color;ctx.font='bold 11px DM Mono,monospace';ctx.fillText(p.text,p.x,p.y);}else{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 // tiny map location and heroes count on base
 ctx.fillStyle='#a4b9ae';ctx.font='9px DM Mono,monospace';ctx.fillText(`${state.heroes.length} UNITS`,38,368);
}
function drawStructure(b,ghost){const x=b.c*C,y=b.r*C;const color=defs.find(d=>d.id===b.id)?.color||'#9ce7be';ctx.save();if(ghost)ctx.globalAlpha=.55;ctx.fillStyle='#202d30';ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.fillRect(x+5,y+5,40,40);ctx.strokeRect(x+5.5,y+5.5,39,39);
 ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 19px sans-serif';ctx.fillText(defs.find(d=>d.id===b.id)?.tag||'⬡',x+25,y+24);
 if(!ghost){ctx.fillStyle='#101719';ctx.fillRect(x+9,y+44,32,2);ctx.fillStyle=b.hp/b.maxHp>.5?'#9ce7be':'#ff816e';ctx.fillRect(x+9,y+44,32*Math.max(0,b.hp/b.maxHp),2);}
 ctx.restore();}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused)tick(dt);draw();requestAnimationFrame(frame);}
function reset(){state=fresh();paused=false;selected=null;document.getElementById('endModal').style.display='none';document.getElementById('intro').style.display='none';document.getElementById('status').textContent='SYSTEM ONLINE';document.getElementById('tip').textContent='SELECT A STRUCTURE · CLICK AN EMPTY TILE TO BUILD';document.getElementById('speedBtn').textContent='▶ 1×';speed=1;renderCards();log('Foundry initialized · awaiting first wave');updateUI();}
document.getElementById('startBtn').onclick=()=>{document.getElementById('intro').style.display='none';paused=false;log('Foundry initialized · awaiting first wave');};
document.getElementById('restartBtn').onclick=reset;
document.getElementById('helpBtn').onclick=()=>{paused=true;document.getElementById('intro').style.display='grid';};
document.getElementById('speedBtn').onclick=()=>{if(speed===1){speed=2;paused=false;document.getElementById('speedBtn').textContent='▶ 2×';}else if(speed===2){speed=1;paused=true;document.getElementById('speedBtn').textContent='Ⅱ PAUSED';}else{speed=1;paused=false;document.getElementById('speedBtn').textContent='▶ 1×';}};
window.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=null;renderCards();}if(e.key===' '&&!document.querySelector('.modal-shade[style*="display: grid"]')){e.preventDefault();paused=!paused;document.getElementById('speedBtn').textContent=paused?'Ⅱ PAUSED':'▶ 1×';}});
updateUI();requestAnimationFrame(frame);
