const c=document.getElementById('game'),x=c.getContext('2d');
let W=960,H=540,keys={},toastTimer;
const world={w:1600,h:1000};
const player={x:800,y:520,vx:0,vy:0,speed:170,facing:'down',stamina:100,health:100,coins:42,day:1,season:'Spring',energy:100,tool:'hoe',xp:0,level:1};
const crops=[]; const enemies=[]; const particles=[];
const npcs=[{x:310,y:430,name:'Moss',color:'#d97873',quest:false,friend:0},{x:1220,y:300,name:'Fern',color:'#79a7b8',quest:false,friend:0},{x:1320,y:760,name:'Bramble',color:'#b58b62',quest:false,friend:0}];
const inventory={turnip:3,seed:8,wood:4,berry:0,ore:0};
const landmarks=[{x:690,y:115,w:240,h:150,name:'Honeyvale Cabin',kind:'house'},{x:1250,y:160,w:210,h:150,name:'The Greenhouse',kind:'green'}];
for(let i=0;i<10;i++) enemies.push({x:140+i*18,y:650+i*25,hp:30,side:i%2?1:-1,kind:i%3?'slime':'bat'});
function rand(n){return Math.floor(Math.random()*n)}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.className='show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.className='',2200)}
function rect(x,y,w,h,r=0){x|=0;y|=0;ctx=x;}
addEventListener('keydown',e=>{keys[e.key]=true;if([' ','e','E'].includes(e.key)&&!e.repeat) act()});addEventListener('keyup',e=>keys[e.key]=false);
document.querySelectorAll('#touch button').forEach(b=>b.addEventListener('pointerdown',e=>{e.prevent();if(b.dataset.key)keys[b.dataset.key]=true;if(b.id==='act')act()}));document.querySelectorAll('#touch button').forEach(b=>b.addEventListener('pointerup',()=>{if(b.dataset.key)keys[b.dataset.key]=false}));
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function draw(){
 const sx=c.clientWidth/world.w, sy=c.clientHeight/world.h, s=Math.min(sx,sy); x.setTransform(s,0,0,s,(c.clientWidth-world.w*s)/2,(c.clientHeight-world.h*s)/2)
 // Camera not really needed: scale full map
 x.fillStyle='#70a85a';x.fillRect(0,0,world.w,world.h);
 // paths
 x.fillStyle='#a9a278';x.beginPath();x.moveTo(0,500);x.lineTo(1600,500);x.lineTo(1600,560);x.lineTo(0,560);x.closePath();x.fill();x.fillRect(780,0,100,1000);
 // water
 x.fillStyle='#65b6ae';x.fillRect(0,830,390,170);x.fillStyle='#84d1c1';for(let i=0;i<8;i++){x.fillRect(20+i*45,850+(i%3)*35,70,5)}
 // forest/decor
 for(let i=0;i<100;i++){let px=(i*137)%1600,py=(i*83)%800;if(py>430&&py<580)continue;if(px>600&&px<1050&&py<300)continue;x.fillStyle=i%2?'#28613b':'#347843';x.fillRect(px-12,py-20,24,34);x.fillStyle='#4d9651';x.beginPath();x.arc(px,py-24,28,0,7);x.fill()}
 // farm plots
 x.strokeStyle='#755738';x.lineWidth=3;for(let r=0;r<4;r++)for(let k=0;k<8;k++){let xx=480+k*46,yy=590+r*42;x.fillStyle=crops.some(q=>q.x===xx&&q.y===yy)?'#8a643b':'#68492f';x.fillRect(xx,yy,38,34);x.strokeRect(xx,yy,38,34)}
 crops.forEach(cr=>{x.fillStyle=cr.stage>=2?'#ffcf55':cr.stage?'#79bf55':'#4d8b42';x.beginPath();x.arc(cr.x+19,cr.y+17,cr.stage>=2?12:8,0,7);x.fill();if(cr.stage>=2){x.fillStyle='#7d4133';x.beginPath();x.arc(cr.x+19,cr.y+17,4,0,7);x.fill()}});
 landmarks.forEach(l=>{x.fillStyle=l.kind==='house'?'#d69a64':'#8ebd83';x.fillRect(l.x,l.y,l.w,l.h);x.fillStyle=l.kind==='house'?'#7a4e38':'#577b55';x.fillRect(l.x-15,l.y-20,l.w+30,35);x.fillStyle='#5e3d31';x.fillRect(l.x+l.w/2-24,l.y+l.h-55,48,55);x.fillStyle='#ffd98a';x.fillRect(l.x+30,l.y+35,38,38);x.fillRect(l.x+l.w-68,l.y+35,38,38)});
 // NPCs
 npcs.forEach(n=>{x.fillStyle=n.color;x.beginPath();x.arc(n.x,n.y-12,17,0,7);x.fill();x.fillStyle='#51372b';x.fillRect(n.x-15,n.y+5,30,28);x.fillStyle='#ffe0b5';x.beginPath();x.arc(n.x,n.y-14,11,0,7);x.fill();x.fillStyle=n.color;x.fillRect(n.x-12,n.y-30,24,8);});
 // enemies
 enemies.forEach(e=>{if(e.hp<=0)return;x.fillStyle=e.kind==='bat'?'#6d5989':'#81a84a';x.beginPath();x.arc(e.x,e.y,18,0,7);x.fill();x.fillStyle='#d9f0a2';x.beginPath();x.arc(e.x-7,e.y-3,3,0,7);x.arc(e.x+7,e.y-3,3,0,7);x.fill()});
 // player
 x.fillStyle='#3d3027';x.fillRect(player.x-14,player.y+10,28,22);x.fillStyle='#e8a96b';x.beginPath();x.arc(player.x,player.y-7,12,0,7);x.fill();x.fillStyle='#70472d';x.fillRect(player.x-13,player.y-23,26,10);x.fillStyle='#76a2b2';x.fillRect(player.x-15,player.y+2,30,24);x.fillStyle='#f4df72';x.fillRect(player.x-3,player.y+8,6,12);
 // tool spark
 particles.forEach(p=>{p.life-=.033;x.globalAlpha=Math.max(p.life,0);x.fillStyle=p.color;x.beginPath();x.arc(p.x,p.y,5,0,7);x.fill();x.globalAlpha=1});for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
}
function update(dt){let dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),dy=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);let l=Math.hypot(dx,dy)||1;player.x+=dx/l*player.speed*dt;player.y+=dy/l*player.speed*dt;player.x=Math.max(25,Math.min(world.w-25,player.x));player.y=Math.max(25,Math.min(world.h-25,player.y));if(dx||dy)player.facing=dx>0?'right':dx<0?'left':dy>0?'down':'up';
 enemies.forEach(e=>{if(e.hp<=0)return;if(dist(player,e)<210){let d=Math.hypot(player.x-e.x,player.y-e.y)||1;e.x+=(player.x-e.x)/d*38*dt;e.y+=(player.y-e.y)/d*38*dt;if(dist(player,e)<24&&Math.random()<.025)damage(4)} else {e.x+=e.side*12*dt;if(rand(180)==0)e.side*=-1}});
 player.energy=Math.min(100,player.energy+.3*dt);
}
function damage(n){player.health-=n;if(player.health<=0){player.health=100;player.x=800;player.y=520;player.coins=Math.max(0,player.coins-10);toast('The valley nurse patched you up. −10 coins')}}
function act(){let target=null; npcs.forEach(n=>{if(dist(player,n)<55)target=n});if(target){target.friend++;let rewards={Moss:'berry',Fern:'ore',Bramble:'wood'};let item=rewards[target.name];inventory[item]=(inventory[item]||0)+1;toast(target.name+' is delighted! +1 '+item+' · friendship '+target.friend);return}
 let enemy=enemies.find(e=>e.hp>0&&dist(player,e)<55);if(enemy){enemy.hp-=20;enemy.x+=(enemy.x-player.x)*.5;enemy.y+=(enemy.y-player.y)*.5;for(let i=0;i<6;i++)particles.push({x:enemy.x,y:enemy.y,life:1,color:'#ffe38a'});if(enemy.hp<=0){inventory.wood++;player.xp+=12;player.coins+=5;toast('Slime cleared! +5 coins · +12 XP')}else toast('Bonk!');return}
 let plot=crops.find(q=>Math.abs(q.x+19-player.x)<30&&Math.abs(q.y+17-player.y)<30);if(plot){if(plot.stage>=2){inventory.turnip++;plot.stage=0;plot.growth=0;player.coins+=2;toast('Harvested turnip! +1 turnip')}else toast('Still growing…');return}
 if(player.y>530&&player.y<730&&player.x>470&&player.x<870&&inventory.seed>0){let xx=Math.round((player.x-480)/46)*46+480,yy=Math.round((player.y-590)/42)*42+590;if(xx>=480&&xx<848&&yy>=590&&yy<758&&!crops.some(q=>q.x===xx&&q.y===yy)){inventory.seed--;crops.push({x:xx,y:yy,stage:0,growth:0});toast('Turnip planted')}}else toast('Nothing here — try a nearby friend or plot')}
function ui(){document.getElementById('topbar').innerHTML=`<span class="pill">☀ Spring · Day ${player.day}</span><span class="pill heart">♥ ${Math.ceil(player.health)}</span><span class="pill">⚡ ${Math.ceil(player.energy)}</span><span class="pill coin">● ${player.coins}</span>`;
 document.getElementById('panel').innerHTML=player.x<100&&player.y>790?`<div class="card"><h3>Cozy Dock</h3><div>A moonlit fishing spot.</div><button onclick="fish()">Cast Line</button></div>`:'';
 const bag=document.querySelector('.bag')||(()=>{let d=document.createElement('div');d.className='bag';document.getElementById('ui').appendChild(d);return d})();bag.innerHTML='<div class="inventory-title">Backpack</div>'+Object.entries(inventory).map((a,i)=>`<div class="slot ${i===0?'active':''}" title="${a[0]}">${({turnip:'🌱',seed:'▫️',wood:'🪵',berry:'🫐',ore:'💎'})[a[0]]}<small>${a[1]}</small></div>`).join('');}
window.fish=()=>{if(Math.random()<.75){inventory.berry=(inventory.berry||0)+2;toast('Caught moonberries! +2')}else toast('The fish got away.')};
function grow(){crops.forEach(q=>{q.growth+=.001;if(q.growth>.3)q.stage=2;else if(q.growth>.12)q.stage=1})}
setInterval(()=>grow(),1000);setInterval(()=>{player.day++;if(player.day>28){player.day=1;player.season=player.season==='Spring'?'Summer':'Spring';toast('A new season begins!')}},45000);setInterval(ui,250);
let last=0;function loop(t){let dt=Math.min((t-last)/1000,.05);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
