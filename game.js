(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const canvas = $('#factoryCanvas');
  const ctx = canvas.getContext('2d');
  const storeKey = 'shapehero-infinite-foundry-v1';
  const builds = [
    {id:'core',name:'Hero Core',icon:'✳',cost:0,unlock:0,rate:0.6,units:0.7,color:'#b9f36e',desc:'The heart of your foundry. Always on.'},
    {id:'cutter',name:'Cutter',icon:'◩',cost:45,unlock:0,rate:1.6,units:1.2,color:'#5be6d1',desc:'Slices raw shapes into sellable units.'},
    {id:'press',name:'Shape Press',icon:'▣',cost:180,unlock:500,rate:5,units:2.8,color:'#a88aff',desc:'Presses shapes into premium forms.'},
    {id:'kiln',name:'Glow Kiln',icon:'♨',cost:620,unlock:1800,rate:15,units:5,color:'#ffb56b',desc:'Fires up a stream of glowing units.'},
    {id:'prism',name:'Prism Lab',icon:'◇',cost:1900,unlock:5000,rate:42,units:9,color:'#f28bd8',desc:'Splits light into rare new shapes.'},
    {id:'assembler',name:'Assembler',icon:'⠿',cost:5200,unlock:12000,rate:110,units:16,color:'#80a9ff',desc:'Builds complex shapes at scale.'},
    {id:'reactor',name:'Star Reactor',icon:'✹',cost:14000,unlock:30000,rate:290,units:28,color:'#ffd46f',desc:'Harness stellar power for huge output.'},
    {id:'lab',name:'Quantum Lab',icon:'⚛',cost:38000,unlock:75000,rate:760,units:45,color:'#6fe9ff',desc:'Researches the shape frontier.'},
    {id:'bank',name:'Credit Vault',icon:'▤',cost:105000,unlock:200000,rate:2100,units:70,color:'#92efaa',desc:'Turns every shape into a fortune.'},
    {id:'beacon',name:'Hero Beacon',icon:'✦',cost:300000,unlock:500000,rate:6200,units:110,color:'#f68d8d',desc:'Broadcasts your empire across infinity.'}
  ];
  const unitTypes = [
    {name:'DOT',shape:'circle',color:'#5be6d1',at:0}, {name:'TRI',shape:'triangle',color:'#b8f36d',at:150},
    {name:'SQUARE',shape:'square',color:'#a88aff',at:500}, {name:'DIAMOND',shape:'diamond',color:'#ffb56b',at:1200},
    {name:'HEX',shape:'hex',color:'#f28bd8',at:2500}, {name:'STAR',shape:'star',color:'#ffd46f',at:5000},
    {name:'CUBE',shape:'square',color:'#80a9ff',at:10000}, {name:'NOVA',shape:'star',color:'#6fe9ff',at:25000},
    {name:'ORBIT',shape:'circle',color:'#92efaa',at:60000}, {name:'QUARK',shape:'diamond',color:'#f68d8d',at:150000},
    {name:'HERO',shape:'hex',color:'#d7a2ff',at:400000}, {name:'∞-FORM',shape:'star',color:'#fff29a',at:1000000}
  ];
  const milestones = [
    {name:'First Assembly',at:500, reward:'SHAPE PRESS'}, {name:'Heat Seeker',at:1800,reward:'GLOW KILN'}, {name:'Color Theory',at:5000,reward:'PRISM LAB'},
    {name:'Mass Production',at:12000,reward:'ASSEMBLER'}, {name:'Power Surge',at:30000,reward:'STAR REACTOR'}, {name:'Beyond Matter',at:75000,reward:'QUANTUM LAB'},
    {name:'Fortune Found',at:200000,reward:'CREDIT VAULT'}, {name:'A True Hero',at:500000,reward:'HERO BEACON'}, {name:'Infinite',at:1000000,reward:'∞-FORM UNIT'}
  ];
  const palette = ['#5be6d1','#b8f36d','#a88aff','#ffb56b','#f28bd8','#ffd46f','#80a9ff','#6fe9ff','#92efaa','#f68d8d','#d7a2ff','#fff29a'];
  const defaults = () => ({credits:120,lifetime:0,units:0,gridW:9,gridH:7,buildings:[{id:'core',x:4,y:3,level:1}],elapsed:0,created:Date.now(),best:0,selected:null,expansions:0,activity:[{text:'Hero Core came online',sub:'Your infinite journey begins',icon:'✳',time:Date.now()}],lastBuild:'',upgradeAll:false});
  let state;
  try { const saved=JSON.parse(localStorage.getItem(storeKey)); state=saved&&saved.buildings?Object.assign(defaults(),saved):defaults(); } catch { state=defaults(); }
  state.credits=Number(state.credits)||0; state.lifetime=Number(state.lifetime)||0;state.units=Number(state.units)||0;
  let running=true, sound=false, zoom=1, hover=null, selectedBuild=null, lastFrame=performance.now(), uiTimer=0, activityTimer=0;
  let particles=[];
  function save(){try{localStorage.setItem(storeKey,JSON.stringify(state));}catch{}}
  function money(n){if(n>=1e9)return (n/1e9).toFixed(2)+'B';if(n>=1e6)return (n/1e6).toFixed(2)+'M';if(n>=1e4)return (n/1e3).toFixed(1)+'k';return Math.floor(n).toLocaleString('en-US')}
  function fmtRate(n){return n>=1000?money(n):n.toFixed(n<10?1:0)}
  function byId(id){return builds.find(b=>b.id===id)}
  function unlocked(b){return state.lifetime>=b.unlock}
  function nextThreshold(x){return x<500?500:x<1800?1800:x<5000?5000:x<12000?12000:x<30000?30000:x<75000?75000:x<200000?200000:x<500000?500000:x<1000000?1000000:Math.ceil((x+1)/1000000)*1000000}
  function getIncome(){return state.buildings.reduce((sum,m)=>{const b=byId(m.id);if(!b)return sum;let boost=adjacentBoost(m);return sum+b.rate*m.level*(1+(m.level-1)*.08)*boost},0)}
  function getUnitRate(){return state.buildings.reduce((sum,m)=>{const b=byId(m.id);if(!b)return sum;return sum+b.units*m.level*(1+(m.level-1)*.065)*(1+adjacentBoost(m)*.22)},0)}
  function adjacentBoost(m){let near=state.buildings.filter(o=>o!==m&&Math.abs(o.x-m.x)+Math.abs(o.y-m.y)===1);return Math.min(.5,near.length*.12)}
  function addActivity(text,sub,icon='✦'){state.activity.unshift({text,sub,icon,time:Date.now()});state.activity=state.activity.slice(0,5);renderActivity()}
  function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1900)}
  function buyCost(build){return Math.ceil(build.cost*Math.pow(1.19,state.buildings.filter(m=>m.id===build.id).length))}
  function upgradeCost(m){const b=byId(m.id);return Math.ceil((b.cost||50)*.72*Math.pow(1.62,m.level-1))}
  function upgradeAllCost(){return state.buildings.reduce((sum,m)=>sum+(m.id==='core'?0:upgradeCost(m)),0)}
  function update(){
    const income=getIncome(), unitRate=getUnitRate();
    state.credits+=income/4;state.lifetime+=income/4;state.units+=unitRate/4;state.elapsed+=.25;
    state.best=Math.max(state.best,state.lifetime);const prevRank=rankInfo(state.lifetime-.3).rank;const nowRank=rankInfo(state.lifetime).rank;
    if(nowRank>prevRank){addActivity(`Foundry rank ${String(nowRank).padStart(2,'0')} reached`,`Rank ${rankInfo(state.lifetime).name} unlocked`,'⬆');toast(`RANK UP — ${rankInfo(state.lifetime).name}`)}
    for(const b of builds){if(b.unlock>0 && state.lifetime>=b.unlock && state.lifetime-income/4<b.unlock){addActivity(`${b.name} unlocked`,'New structure available to build',b.icon);toast(`${b.name.toUpperCase()} UNLOCKED`)}}
    const unit=unitTypes.find((u,i)=>i>0&&state.lifetime>=u.at&&state.lifetime-income/4<u.at);if(unit){addActivity(`${unit.name} unit discovered`,'New shape in the unit catalog', '⬡');toast(`${unit.name} UNIT DISCOVERED`)}
    if(Math.random()<Math.min(.9,unitRate*.04))spawnParticle();
    renderUI();
  }
  function rankInfo(x){let cuts=[0,500,1800,5000,12000,30000,75000,200000,500000,1000000],names=['ROOKIE','MAKER','BUILDER','SHAPER','ENGINEER','INVENTOR','INDUSTRIALIST','TYCOON','LEGEND','SHAPEHERO'];let rank=1;for(let i=1;i<cuts.length;i++)if(x>=cuts[i])rank=i+1; if(x>=1000000)rank=10+Math.floor((x-1000000)/1000000);return {rank,name:rank<=10?names[rank-1]:['ASCENDED','TRANSCENDENT','INFINITE'][Math.min(2,Math.floor((rank-11)/10))]||'INFINITE',current:rank>10?1000000+(rank-10)*1000000:cuts[rank-1],next:rank<10?cuts[rank]:1000000+(rank-9)*1000000}}
  function renderUI(){
    $('#credits').textContent=money(state.credits);$('#lifetime').textContent=money(state.lifetime);$('#unitCount').textContent=money(state.units);$('#income').textContent=`+${fmtRate(getIncome())} / sec`;$('#unitRate').textContent=`+${fmtRate(getUnitRate())} / sec`;
    const r=rankInfo(state.lifetime);$('#rank').textContent=String(r.rank).padStart(2,'0');$('#rankName').textContent=r.name;$('#rankProgress').style.width=`${Math.max(0,Math.min(100,(state.lifetime-r.current)/(r.next-r.current)*100))}%`;
    $('#level').textContent=r.rank;$('#structureCount').textContent=state.buildings.length;$('#uptime').textContent=clock(state.elapsed);$('#bestRun').textContent=money(state.best);$('#clock').textContent=`CYCLE ${String(Math.floor(state.elapsed/60)+1).padStart(2,'0')}`;
    $('#boardSize').textContent=`${String(state.gridW).padStart(2,'0')} × ${String(state.gridH).padStart(2,'0')} GRID`;const expansionCost=240*Math.pow(2.2,state.expansions);$('#expandCost').textContent=money(expansionCost);$('#expandBtn').disabled=state.credits<expansionCost;$('#expandBtn').style.opacity=state.credits<expansionCost?'.6':'1';
    const ms=milestones.find(m=>state.lifetime<m.at);if(ms){const before=milestones[milestones.indexOf(ms)-1]?.at||0;$('#milestoneName').textContent=ms.name;$('#milestoneDesc').textContent=`Reach ${money(ms.at)} lifetime credits to unlock ${ms.reward.toLowerCase().replace(' lab',' Lab').replace(' press',' Press')}.`;$('#milestoneCurrent').textContent=`${money(state.lifetime)} / ${money(ms.at)}`;$('#milestoneReward').textContent=`REWARD: ${ms.reward}`;$('#milestoneProgress').style.width=`${Math.min(100,Math.max(0,(state.lifetime-before)/(ms.at-before)*100))}%`}else{$('#milestoneName').textContent='The infinite frontier';$('#milestoneDesc').textContent='Keep earning. There is always another shape to discover.';$('#milestoneCurrent').textContent=`${money(state.lifetime)} lifetime`;$('#milestoneReward').textContent='REWARD: MORE INFINITY';$('#milestoneProgress').style.width='100%'}
    const firstUnbuilt=builds.find(b=>b.id!=='core'&&unlocked(b)&&!state.buildings.some(m=>m.id===b.id));$('#directive').textContent=firstUnbuilt?`Build your ${firstUnbuilt.name}`:state.credits<buyCost(builds.find(b=>b.id==='cutter'))?'Earn credits to expand':'Grow your foundry empire';
    $('#buildCount').textContent=`${builds.filter(unlocked).length.toString().padStart(2,'0')} / ${builds.length} UNLOCKED`;$('#rosterCount').textContent=`${unitTypes.filter(u=>state.lifetime>=u.at).length.toString().padStart(2,'0')} / ${unitTypes.length}`;
    renderBuilds();renderRoster();renderSelected();$('#upgradeAllCost').textContent=state.buildings.length>1?money(upgradeAllCost()):'—';$('#upgradeAll').disabled=state.buildings.length<2||state.credits<upgradeAllCost();$('#upgradeAll').style.opacity=$('#upgradeAll').disabled?'.55':'1';
  }
  function renderBuilds(){const root=$('#buildGrid');root.innerHTML='';for(const b of builds){const open=unlocked(b),cost=buyCost(b),owned=state.buildings.filter(m=>m.id===b.id).length;const btn=document.createElement('button');btn.className=`build-card ${selectedBuild===b.id?'active':''} ${open?'':'locked'}`;btn.disabled=!open;btn.innerHTML=`${open?'':`<span class="build-lock">⌑ ${money(b.unlock)}</span>`}<span class="building-icon">${b.icon}</span><span class="build-name">${b.name}</span><span class="build-meta"><span class="build-cost">${b.id==='core'?'CORE':`◈ ${money(cost)}`}</span><span>+${fmtRate(b.rate)}/s${owned?` · ×${owned}`:''}</span></span>`;btn.title=open?`${b.desc} · ${fmtRate(b.rate)} credits/sec`:`Unlock at ${money(b.unlock)} lifetime credits`;btn.onclick=()=>{selectedBuild=selectedBuild===b.id?null:b.id;state.selected=null;renderUI();toast(selectedBuild?`SELECTED: ${b.name.toUpperCase()} — CHOOSE A TILE`:'BUILD CANCELLED')};root.appendChild(btn)}}
  function renderRoster(){const root=$('#rosterGrid');root.innerHTML='';for(const u of unitTypes){const open=state.lifetime>=u.at;const node=document.createElement('div');node.className=`unit-card ${open?'':'locked'}`;node.title=open?`${u.name} — discovered`:`Unlock at ${money(u.at)} lifetime credits`;node.innerHTML=`<i class="unit-shape shape-${u.shape}" style="--shape-color:${u.color}"></i><b>${open?u.name:'???'}</b>`;root.appendChild(node)}}
  function renderActivity(){const root=$('#activityList');root.innerHTML='';for(const item of state.activity){const el=document.createElement('div');el.className='activity-item';el.innerHTML=`<span class="activity-icon">${item.icon}</span><span class="activity-copy">${escapeHtml(item.text)}<small>${escapeHtml(item.sub)}</small></span><time>${ago(item.time)}</time>`;root.appendChild(el)}}
  function renderSelected(){const root=$('#selectedCard'),m=state.buildings.find(o=>o.uid===state.selected);if(!m){root.innerHTML='<div class="empty-inspector"><span>▣</span><b>Select a structure</b><p>Choose a building on your foundry to inspect and upgrade it.</p></div>';return}const b=byId(m.id),cost=upgradeCost(m);root.innerHTML=`<div class="selected-detail"><span class="building-icon" style="background:${b.color}22;color:${b.color}">${b.icon}</span><div><strong>${b.name}</strong><small>GRID ${String(m.x+1).padStart(2,'0')} : ${String(m.y+1).padStart(2,'0')}</small></div></div><div class="selected-output"><span>OUTPUT / SEC</span><b>◈ ${fmtRate(b.rate*m.level*(1+(m.level-1)*.08))} &nbsp;·&nbsp; ⬡ ${fmtRate(b.units*m.level)}</b></div><div class="upgrade-row"><span class="level-control">LVL ${m.level}</span>${m.id==='core'?'':`<button class="upgrade-one" id="upgradeOne">⬆ ${money(cost)}</button><button class="sell-one" id="sellOne">SELL</button>`}</div>`;const up=$('#upgradeOne');if(up){up.disabled=state.credits<cost;up.style.opacity=up.disabled?'.5':'1';up.onclick=()=>upgrade(m)}const sell=$('#sellOne');if(sell)sell.onclick=()=>sellBuilding(m)}
  function upgrade(m){const c=upgradeCost(m);if(state.credits<c){toast('NOT ENOUGH CREDITS');return}state.credits-=c;m.level++;addActivity(`${byId(m.id).name} upgraded`,`Now level ${m.level}`,'⬆');toast(`${byId(m.id).name.toUpperCase()} UPGRADED`);save();renderUI()}
  function sellBuilding(m){if(m.id==='core')return;const b=byId(m.id);state.credits+=Math.floor(buyCost(b)*.48);state.buildings=state.buildings.filter(o=>o!==m);state.selected=null;addActivity(`${b.name} recycled`,'Materials returned to your foundry','↻');toast(`${b.name.toUpperCase()} RECYCLED`);save();renderUI()}
  function clock(sec){const s=Math.floor(sec);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
  function ago(t){const s=Math.max(0,Math.floor((Date.now()-t)/1000));return s<5?'NOW':s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function spawnParticle(){const candidates=state.buildings.filter(m=>m.id!=='core');const source=candidates[Math.floor(Math.random()*candidates.length)]||state.buildings[0];particles.push({x:source.x+(Math.random()-.5)*.4,y:source.y+(Math.random()-.5)*.4,t:0,duration:1.8+Math.random()*1.7,color:byId(source.id).color,shape:unitTypes[Math.min(unitTypes.length-1,Math.floor(Math.random()*unitTypes.filter(u=>state.lifetime>=u.at).length))].shape,phase:Math.random()*6.28});if(particles.length>80)particles.shift()}
  function drawShape(c,x,y,size,shape,color,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=color;c.shadowColor=color;c.shadowBlur=size*.7;c.beginPath();if(shape==='circle')c.arc(0,0,size*.48,0,Math.PI*2);else if(shape==='triangle'){c.moveTo(0,-size*.54);c.lineTo(size*.5,size*.43);c.lineTo(-size*.5,size*.43);c.closePath()}else if(shape==='diamond'){c.moveTo(0,-size*.6);c.lineTo(size*.44,0);c.lineTo(0,size*.6);c.lineTo(-size*.44,0);c.closePath()}else if(shape==='hex'){for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2;c.lineTo(Math.cos(a)*size*.48,Math.sin(a)*size*.48)}c.closePath()}else if(shape==='star'){for(let i=0;i<10;i++){let r=i%2?size*.22:size*.52,a=i*Math.PI/5-Math.PI/2;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath()}else{const r=size*.43;c.roundRect(-r,-r,r*2,r*2,2)}c.fill();c.restore()}
  function geometry(){const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);const tile=Math.min((w-55)/state.gridW,(h-40)/state.gridH)*zoom;const tw=Math.max(31,tile),th=tw*.78;return {w,h,tw,th,x0:(w-state.gridW*tw)/2,y0:(h-state.gridH*th)/2+1}}
  function render(now=performance.now()){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;const g=geometry();ctx.clearRect(0,0,g.w,g.h);
    // soft ambient halos
    const halo=ctx.createRadialGradient(g.w*.51,g.h*.45,10,g.w*.51,g.h*.45,g.w*.55);halo.addColorStop(0,'#272e402b');halo.addColorStop(1,'#14182100');ctx.fillStyle=halo;ctx.fillRect(0,0,g.w,g.h);
    for(let y=0;y<state.gridH;y++)for(let x=0;x<state.gridW;x++){const px=g.x0+x*g.tw,py=g.y0+y*g.th;const occupied=state.buildings.find(m=>m.x===x&&m.y===y);const isHover=hover&&hover.x===x&&hover.y===y;ctx.beginPath();ctx.roundRect(px+2,py+2,g.tw-4,g.th-4,5);ctx.fillStyle=occupied?'#222936':isHover?'#293b3e':'#1b212c';ctx.fill();ctx.strokeStyle=occupied?'#343d4c':isHover?'#62dcca77':'#272e3b';ctx.lineWidth=occupied?1.1:0.8;ctx.stroke();if(!occupied){ctx.fillStyle='#414858';ctx.beginPath();ctx.arc(px+g.tw/2,py+g.th/2,1.3,0,Math.PI*2);ctx.fill()}}
    // subtle pathways radiate from the hero core
    const core=state.buildings.find(m=>m.id==='core');if(core){for(const m of state.buildings){if(m===core)continue;const a=tileCenter(core,g),b=tileCenter(m,g);ctx.save();ctx.setLineDash([3,5]);ctx.strokeStyle=adjacentBoost(m)?'#f2c56e55':'#8493a31b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}}
    for(const m of state.buildings)drawBuilding(m,g,now);
    particles=particles.filter(p=>p.t<1);for(const p of particles){p.t+=dt/p.duration;const t=p.t,source=state.buildings.find(m=>m.x===Math.round(p.x)&&m.y===Math.round(p.y))||state.buildings[0];const from=tileCenter(source,g),dest=tileCenter(core||state.buildings[0],g);const x=from.x+(dest.x-from.x)*t+Math.sin(t*10+p.phase)*4,y=from.y+(dest.y-from.y)*t+Math.sin(t*14+p.phase)*4;drawShape(ctx,x,y,Math.max(5,g.tw*.17),p.shape,p.color,now/600+p.phase)}
    if(hover&&selectedBuild&&!state.buildings.some(m=>m.x===hover.x&&m.y===hover.y)){const px=g.x0+hover.x*g.tw,py=g.y0+hover.y*g.th;const b=byId(selectedBuild);ctx.save();ctx.globalAlpha=.55;drawBuilding({id:b.id,x:hover.x,y:hover.y,level:1},g,now,true);ctx.restore()}
    requestAnimationFrame(render)
  }
  function tileCenter(m,g){return{x:g.x0+m.x*g.tw+g.tw/2,y:g.y0+m.y*g.th+g.th/2}}
  function drawBuilding(m,g,now,ghost=false){const b=byId(m.id),px=g.x0+m.x*g.tw,py=g.y0+m.y*g.th,cx=px+g.tw/2,cy=py+g.th/2,sz=Math.min(g.tw,g.th);const selected=state.selected===m.uid,boost=adjacentBoost(m)>0;ctx.save();if(ghost)ctx.globalAlpha=.5;
    // machine base shadow and chassis
    ctx.fillStyle='#090c13aa';ctx.beginPath();ctx.ellipse(cx,py+g.th*.76,g.tw*.32,g.th*.12,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(px+g.tw*.18,py+g.th*.17,g.tw*.64,g.th*.61,7);ctx.fillStyle='#151a24';ctx.fill();ctx.strokeStyle=selected?'#f4f4f7':boost?'#ffcd70':b.color;ctx.lineWidth=selected?2:1.2;ctx.stroke();
    // inset face
    ctx.beginPath();ctx.roundRect(px+g.tw*.23,py+g.th*.23,g.tw*.54,g.th*.47,5);ctx.fillStyle=`${b.color}18`;ctx.fill();ctx.strokeStyle=`${b.color}40`;ctx.lineWidth=.8;ctx.stroke();
    // orbit animation / machine lights
    const pulse=.72+Math.sin(now/300+m.x+m.y)*.18;ctx.globalAlpha*=pulse;drawShape(ctx,cx,py+g.th*.46,sz*.34,m.id==='core'?'star':m.id==='prism'?'diamond':m.id==='press'?'square':m.id==='cutter'?'triangle':'hex',b.color,now/4000+m.x*.2);ctx.globalAlpha=ghost?.5:1;
    ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(px+g.tw*.28,py+g.th*.29,2.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+g.tw*.72,py+g.th*.29,2.1,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    if(m.level>1){ctx.fillStyle='#f2cb72';ctx.font=`${Math.max(7,sz*.12)}px DM Mono`;ctx.textAlign='center';ctx.fillText(`LV ${m.level}`,cx,py+g.th*.91)}else if(m.id!=='core'){ctx.fillStyle='#abb4c3';ctx.font=`${Math.max(7,sz*.11)}px DM Mono`;ctx.textAlign='center';ctx.fillText(b.name.toUpperCase().split(' ')[0],cx,py+g.th*.91)}
    if(boost){ctx.strokeStyle='#ffcc70aa';ctx.setLineDash([2,2]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,sz*.48,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}ctx.restore()}
  function canvasPoint(e){const rect=canvas.getBoundingClientRect(),g=geometry();return{x:Math.floor((e.clientX-rect.left-g.x0)/g.tw),y:Math.floor((e.clientY-rect.top-g.y0)/g.th)}}
  canvas.addEventListener('pointermove',e=>{const p=canvasPoint(e);hover=p.x>=0&&p.x<state.gridW&&p.y>=0&&p.y<state.gridH?p:null;canvas.style.cursor=hover?'pointer':'default'});
  canvas.addEventListener('pointerleave',()=>hover=null);
  canvas.addEventListener('click',e=>{const p=canvasPoint(e);if(p.x<0||p.y<0||p.x>=state.gridW||p.y>=state.gridH)return;const m=state.buildings.find(o=>o.x===p.x&&o.y===p.y);if(m){state.selected=m.uid||ensureUid(m);selectedBuild=null;renderUI();return}if(selectedBuild){const b=byId(selectedBuild);if(!b)return;const cost=buyCost(b);if(state.credits<cost){toast(`NEED ${money(cost-state.credits)} MORE CREDITS`);return}state.credits-=cost;const building={id:b.id,x:p.x,y:p.y,level:1,uid:makeUid()};state.buildings.push(building);state.selected=building.uid;selectedBuild=null;addActivity(`${b.name} placed`,`Output increased by ${fmtRate(b.rate)} credits/sec`,b.icon);toast(`${b.name.toUpperCase()} ONLINE`);save();renderUI();return}state.selected=null;renderUI()});
  function makeUid(){return 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}function ensureUid(m){if(!m.uid)m.uid=makeUid();return m.uid}
  $('#expandBtn').onclick=()=>{const cost=240*Math.pow(2.2,state.expansions);if(state.credits<cost)return;state.credits-=cost;state.gridW+=2;state.gridH+=2;state.expansions++;addActivity('Foundry expanded',`New ${state.gridW} × ${state.gridH} space unlocked`,'＋');toast('FOUNDRY EXPANDED');save();renderUI()};
  $('#upgradeAll').onclick=()=>{const total=upgradeAllCost();if(state.credits<total)return;for(const m of state.buildings)if(m.id!=='core'){state.credits-=upgradeCost(m);m.level++}addActivity('Factory-wide upgrade','Every structure leveled up','⬆');toast('ALL STRUCTURES UPGRADED');save();renderUI()};
  $('#pauseBtn').onclick=()=>{running=!running;$('#pauseBtn').textContent=running?'Ⅱ':'▶';$('#pauseBtn').title=running?'Pause simulation':'Resume simulation';$('#pauseBtn').setAttribute('aria-label',running?'Pause simulation':'Resume simulation');toast(running?'SIMULATION RESUMED':'SIMULATION PAUSED')};
  $('#soundBtn').onclick=()=>{sound=!sound;$('#soundBtn').textContent=sound?'♪':'♫';toast(sound?'SOUND ENABLED':'SOUND MUTED')};
  $('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#gotIt').onclick=()=>$('#helpDialog').close();$('#helpDialog').addEventListener('click',e=>{if(e.target===$('#helpDialog'))$('#helpDialog').close()});
  $('#zoomIn').onclick=()=>{zoom=Math.min(1.45,zoom+.1);$('#zoomLabel').textContent=`${Math.round(zoom*100)}%`};$('#zoomOut').onclick=()=>{zoom=Math.max(.7,zoom-.1);$('#zoomLabel').textContent=`${Math.round(zoom*100)}%`};
  $('#resetBtn').onclick=()=>{if(confirm('Reset your factory? All progress will be lost.')){localStorage.removeItem(storeKey);state=defaults();selectedBuild=null;particles=[];renderUI();toast('A NEW FACTORY BEGINS');save()}};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){selectedBuild=null;state.selected=null;renderUI()}if(e.key.toLowerCase()==='h')$('#helpDialog').showModal()});
  function frameLoop(){if(running){const now=performance.now();if(now-uiTimer>250){update();uiTimer=now}if(now-activityTimer>5000){renderActivity();activityTimer=now}if(Math.floor(state.elapsed)%10===0&&Math.floor(state.elapsed)!==frameLoop.lastSave){save();frameLoop.lastSave=Math.floor(state.elapsed)}}requestAnimationFrame(frameLoop)}
  for(const m of state.buildings)ensureUid(m);renderActivity();renderUI();requestAnimationFrame(render);requestAnimationFrame(frameLoop);setInterval(save,10000);
})();
