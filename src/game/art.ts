import { HeroDef } from './data';
import { heroBounds, heroSprite } from './hero-art';
export { heroSprite } from './hero-art';

export const WORLD = 3000;
export type Point = { x:number; y:number };
export const BASES: Point[] = [{x:360,y:2640},{x:2640,y:360}];
export const LANES: Point[][] = [
  [{x:360,y:2640},{x:310,y:2320},{x:310,y:490},{x:490,y:310},{x:2320,y:310},{x:2640,y:360}],
  [{x:360,y:2640},{x:2640,y:360}],
  [{x:360,y:2640},{x:680,y:2690},{x:2510,y:2690},{x:2690,y:2510},{x:2690,y:680},{x:2640,y:360}]
];
export interface Decoration extends Point { kind:'tree'|'rock'|'bush'|'pillar'; size:number; variant:number; }
export const rng = (seed:number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const poly = (c:CanvasRenderingContext2D, pts:number[][], color:string) => {c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const portraits = new Map<string,string>();
export function portrait(hero:HeroDef,skinIndex=0){
  skinIndex=Math.max(0,Math.min(hero.skins.length-1,skinIndex));
  const palette=hero.skins[skinIndex];const key=hero.id+skinIndex+palette.primary+palette.secondary+palette.glow+palette.hair+palette.trim;if(portraits.has(key))return portraits.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=144;canvas.height=152;
  const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;const s=hero.skins[skinIndex];
  c.fillStyle=s.secondary;c.fillRect(0,0,144,152);
  poly(c,[[0,100],[144,10],[144,152],[0,152]],s.primary+'35');
  for(let i=0;i<5;i++){c.fillStyle=s.glow+'0b';c.fillRect(i*30,0,1,152);}
  heroSprite(c,74,211,2.65,hero,s,0);
  const result=canvas.toDataURL();portraits.set(key,result);return result;
}

export function tree(c:CanvasRenderingContext2D,x:number,y:number,s=1,v=0){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);
  c.fillStyle='#0c2427';c.fillRect(-13,-2,30,9);c.fillStyle='#3b3830';c.fillRect(-5,-39,10,40);c.fillStyle='#60513c';c.fillRect(-3,-30,3,30);
  const a=v%3===0?'#32574b':v%3===1?'#345343':'#284c48', b=v%3===0?'#416d56':'#3f6550';
  poly(c,[[-4,-91],[10,-85],[10,-73],[24,-73],[24,-63],[33,-63],[33,-45],[26,-45],[26,-33],[11,-33],[11,-26],[-20,-26],[-20,-36],[-31,-36],[-31,-56],[-23,-56],[-23,-70],[-12,-70],[-12,-85]],'#152f30');
  poly(c,[[-5,-87],[7,-81],[7,-69],[21,-69],[21,-59],[29,-59],[29,-47],[22,-47],[22,-37],[8,-37],[8,-31],[-16,-31],[-16,-40],[-27,-40],[-27,-53],[-19,-53],[-19,-67],[-8,-67]],a);
  c.fillStyle=b;c.fillRect(-8,-77,13,14);c.fillRect(-19,-60,28,9);c.fillRect(4,-58,17,13);c.fillStyle='#65815b';c.fillRect(-7,-77,8,3);c.fillRect(-16,-58,11,3);c.fillRect(9,-55,8,3);
  c.restore();
}

export function createTerrain(){
  const rand=rng(816),canvas=document.createElement('canvas');canvas.width=750;canvas.height=750;const c=canvas.getContext('2d')!;
  c.fillStyle='#304b3e';c.fillRect(0,0,750,750);
  const grass=['#354f40','#395141','#2d473c','#3d5541','#29473d','#426044'];
  for(let i=0;i<24000;i++){c.fillStyle=grass[Math.floor(rand()*grass.length)];c.fillRect(Math.floor(rand()*750),Math.floor(rand()*750),1+rand()*4,1+rand()*3);}
  // Diagonal river with pixel stepped banks and luminous shallow water.
  c.lineCap='square';c.strokeStyle='#233e39';c.lineWidth=68;c.beginPath();c.moveTo(0,0);c.lineTo(750,750);c.stroke();
  c.strokeStyle='#526c51';c.lineWidth=52;c.stroke();c.strokeStyle='#244f51';c.lineWidth=44;c.stroke();c.strokeStyle='#306365';c.lineWidth=32;c.stroke();
  for(let i=0;i<1100;i++){const a=rand()*750,b=a+(rand()-.5)*43;c.fillStyle=rand()>.5?'#437b73':'#356c69';c.fillRect(a,b,rand()*5+1,1);}
  // Three lanes, a light stone centre and grass-mottled edges.
  for(const lane of LANES){
    c.beginPath();lane.forEach((p,i)=>i?c.lineTo(p.x/4,p.y/4):c.moveTo(p.x/4,p.y/4));
    c.lineJoin='round';c.strokeStyle='#5b684b';c.lineWidth=44;c.stroke();c.strokeStyle='#7a7a56';c.lineWidth=32;c.stroke();c.strokeStyle='#8b8662';c.lineWidth=24;c.stroke();
  }
  for(let i=0;i<2500;i++){
    const lane=LANES[Math.floor(rand()*3)],k=Math.floor(rand()*(lane.length-1)),a=lane[k],b=lane[k+1],t=rand();
    const x=(a.x+(b.x-a.x)*t)/4+(rand()-.5)*22,y=(a.y+(b.y-a.y)*t)/4+(rand()-.5)*22;
    c.fillStyle=rand()>.5?'#98916d':'#777957';c.fillRect(Math.floor(x/3)*3,Math.floor(y/3)*3,3+rand()*3,1+rand()*2);
  }
  for(const [i,base] of BASES.entries()){
    const x=base.x/4,y=base.y/4;
    poly(c,[[x-62,y-30],[x-32,y-64],[x+32,y-64],[x+63,y-32],[x+63,y+32],[x+32,y+63],[x-32,y+63],[x-62,y+32]],'#5c6453');
    poly(c,[[x-53,y-27],[x-27,y-55],[x+27,y-55],[x+55,y-27],[x+55,y+27],[x+27,y+55],[x-27,y+55],[x-53,y+27]],'#707563');
    c.strokeStyle='#576052';c.lineWidth=1;for(let k=-48;k<55;k+=12){c.beginPath();c.moveTo(x+k,y-40);c.lineTo(x+k,y+40);c.stroke();c.beginPath();c.moveTo(x-40,y+k);c.lineTo(x+40,y+k);c.stroke();}
    c.strokeStyle=i?'#a4786a':'#7baca2';c.lineWidth=2;c.strokeRect(x-29,y-29,58,58);
  }
  // Jungle paths and ancient objective clearings.
  const camps=[{x:970,y:1950},{x:1050,y:1150},{x:1950,y:1050},{x:2050,y:1950},{x:700,y:1450},{x:2300,y:1550}];
  for(const p of camps){c.fillStyle='#52614a';c.beginPath();c.ellipse(p.x/4,p.y/4,32,24,0,0,7);c.fill();c.strokeStyle='#74846a';c.lineWidth=2;c.beginPath();c.ellipse(p.x/4,p.y/4,28,20,0,0,7);c.stroke();}
  const deco:Decoration[]=[];
  // Dense interior forests, without covering the lanes or neutral camps.
  for(let i=0;i<390;i++){
    const x=180+rand()*2640,y=180+rand()*2640;
    if(Math.abs(x-y)<150||Math.abs(x+y-3000)<155||x<440||y<440||x>2560||y>2560)continue;
    if(camps.some(p=>Math.hypot(p.x-x,p.y-y)<180))continue;
    deco.push({x,y,kind:'tree',size:.7+rand()*.65,variant:Math.floor(rand()*3)});
  }
  for(let i=0;i<45;i++){
    const x=140+rand()*2720,y=140+rand()*2720;
    if(Math.abs(x+y-3000)<120)continue;
    deco.push({x,y,kind:'rock',size:.6+rand()*.7,variant:Math.floor(rand()*3)});
  }
  for(let i=0;i<40;i++){
    const a=250+rand()*2500;deco.push({x:a-115,y:a+115,kind:'bush',size:1+rand(),variant:0});deco.push({x:a+115,y:a-115,kind:'bush',size:1+rand(),variant:1});
  }
  // Water-edge ruins.
  [{x:1300,y:1450},{x:1700,y:1550},{x:850,y:1000},{x:2150,y:2000}].forEach(p=>deco.push({...p,kind:'pillar',size:1,variant:0}));
  return {canvas,deco};
}

export function decoration(c:CanvasRenderingContext2D,d:Decoration){
  if(d.kind==='tree'){tree(c,d.x,d.y,d.size,d.variant);return;}
  c.save();c.translate(Math.round(d.x),Math.round(d.y));c.scale(d.size,d.size);
  if(d.kind==='rock'){
    poly(c,[[-25,0],[-31,-16],[-16,-36],[5,-41],[29,-22],[26,-3]],'#263c38');
    poly(c,[[-24,-4],[-25,-16],[-14,-31],[5,-35],[23,-20],[21,-6]],'#687468');
    poly(c,[[-24,-16],[-14,-31],[5,-35],[8,-19],[-4,-13]],'#8d9380');
    c.fillStyle='#4c6251';c.fillRect(-19,-8,12,5);c.fillRect(9,-17,10,3);
  }else if(d.kind==='bush'){
    c.fillStyle='#243f35';c.fillRect(-22,-8,48,12);
    for(let i=0;i<8;i++){c.fillStyle=i%2?'#709160':'#527b51';const a=-21+i*6;c.fillRect(a,-18-(i%3)*7,4,24);c.fillRect(a+2,-22-(i%3)*7,3,12);}
  }else{
    c.fillStyle='#293e3b';c.fillRect(-19,-6,39,10);c.fillStyle='#657365';c.fillRect(-12,-68,24,63);c.fillStyle='#87907c';c.fillRect(-12,-68,7,63);c.fillStyle='#465d50';c.fillRect(7,-68,5,63);c.fillStyle='#a1a58a';c.fillRect(-16,-73,31,9);c.fillStyle='#89c3ad';c.fillRect(-4,-54,5,17);
  }c.restore();
}

export function tower(c:CanvasRenderingContext2D,x:number,y:number,team:number,dead:boolean,time:number){
  c.save();c.translate(Math.round(x),Math.round(y));const color=team?'#e7a088':'#a1e8d1',dark=team?'#75464a':'#416b67';
  c.fillStyle='#172c2a80';c.beginPath();c.ellipse(0,3,42,16,0,0,7);c.fill();
  poly(c,[[-32,4],[-37,-8],[-25,-21],[24,-21],[36,-8],[30,4]],'#34473e');
  poly(c,[[-29,0],[-32,-9],[-21,-18],[21,-18],[30,-9],[26,0]],'#8c8f75');
  if(dead){c.fillStyle='#4e5b4b';c.fillRect(-18,-18,14,9);c.fillRect(5,-24,17,14);c.fillStyle='#838573';c.fillRect(-17,-20,11,5);c.restore();return;}
  c.fillStyle='#263e39';c.fillRect(-19,-68,39,54);c.fillStyle='#8b907a';c.fillRect(-16,-68,30,48);c.fillStyle='#a5a58a';c.fillRect(-16,-68,8,48);c.fillStyle='#5d7264';c.fillRect(8,-68,7,48);
  c.fillStyle=dark;c.fillRect(-9,-56,17,30);c.fillStyle=color;c.fillRect(-2,-51,4,17);
  poly(c,[[-25,-67],[-26,-78],[-17,-91],[17,-91],[26,-78],[24,-67]],'#354b43');
  poly(c,[[-21,-71],[-22,-78],[-14,-86],[14,-86],[22,-78],[20,-71]],'#a6a488');
  c.globalAlpha=.12+Math.sin(time*3)*.04;c.fillStyle=color;c.beginPath();c.arc(0,-105,28,0,7);c.fill();c.globalAlpha=1;
  poly(c,[[0,-126],[13,-106],[0,-86],[-13,-106]],dark);poly(c,[[0,-123],[9,-106],[0,-90],[-9,-106]],color);poly(c,[[0,-121],[0,-92],[-7,-106]],'#edf7db');
  c.restore();
}

export function core(c:CanvasRenderingContext2D,x:number,y:number,team:number,time:number){
  c.save();c.translate(x,y);const col=team?'#e4a49a':'#9fe8cf';
  c.fillStyle='#243c3899';c.beginPath();c.ellipse(0,6,75,30,0,0,7);c.fill();
  for(let i=0;i<3;i++)poly(c,[[-65+i*10,-i*12],[-36+i*5,20-i*12],[37-i*5,20-i*12],[65-i*10,-i*12],[35-i*5,-22-i*12],[-35+i*5,-22-i*12]],['#4c6257','#83917a','#b1b49a'][i]);
  c.globalAlpha=.12;c.fillStyle=col;c.beginPath();c.arc(0,-58,67,0,7);c.fill();c.globalAlpha=1;
  const a=Math.sin(time*2)*4;
  poly(c,[[0,-130+a],[31,-82+a],[24,-41+a],[0,-18+a],[-24,-41+a],[-31,-82+a]],'#2e5955');
  poly(c,[[0,-125+a],[25,-80+a],[19,-44+a],[0,-25+a],[-19,-44+a],[-25,-80+a]],col);
  poly(c,[[0,-125+a],[0,-25+a],[-19,-44+a],[-25,-80+a]],'#d6f3dc');
  for(const side of [-1,1]){c.fillStyle='#495f52';c.fillRect(side*49-7,-72,14,53);c.fillStyle='#afae8c';c.fillRect(side*49-9,-76,18,8);c.fillStyle=col;c.fillRect(side*49-3,-68,6,19);}
  c.restore();
}

export function minion(c:CanvasRenderingContext2D,x:number,y:number,team:number,ranged:boolean,t:number){
  c.save();c.translate(Math.round(x),Math.round(y));const a=Math.sin(t*8)*1.4,col=team?'#c87576':'#74b7bd';
  c.fillStyle='#182e2a88';c.fillRect(-10,-1,22,5);c.fillStyle='#243336';c.fillRect(-7,-9,5,9+a);c.fillRect(3,-9,5,9-a);
  c.fillStyle='#172a30';c.fillRect(-10,-26,21,18);c.fillStyle=col;c.fillRect(-8,-25,17,15);c.fillStyle=team?'#70404e':'#3e687b';c.fillRect(-4,-24,8,13);
  c.fillStyle='#203039';c.fillRect(-9,-39,18,14);c.fillStyle=col;c.fillRect(-7,-37,14,10);c.fillStyle='#b5c7b6';c.fillRect(-5,-34,10,4);c.fillStyle='#263e41';c.fillRect(-4,-32,3,2);c.fillRect(2,-32,3,2);
  if(ranged){c.fillStyle='#9f9473';c.fillRect(13,-29,3,26);c.fillStyle=team?'#ffb8a5':'#b0ece3';c.fillRect(11,-32,7,7);}else{c.fillStyle='#344447';c.fillRect(-15,-26,8,19);c.fillStyle='#b0ad8b';c.fillRect(-14,-24,6,14);c.fillStyle='#d8d4b0';c.fillRect(13,-31,3,22);c.fillStyle='#8e7954';c.fillRect(9,-13,11,3);}
  c.restore();
}

export function monster(c:CanvasRenderingContext2D,x:number,y:number,isDragon:boolean,t:number){
  c.save();c.translate(x,y);c.scale(isDragon?1.25:1, isDragon?1.25:1);const a=Math.sin(t*2)*3;
  c.fillStyle='#172b2b80';c.beginPath();c.ellipse(0,0,40,13,0,0,7);c.fill();
  if(isDragon){
    poly(c,[[-12,-39],[-43,-74],[-72,-84],[-55,-47],[-30,-27]],'#303e48');poly(c,[[-16,-42],[-44,-69],[-63,-76],[-50,-50],[-30,-32]],'#9e797a');
    poly(c,[[13,-39],[43,-74],[72,-84],[55,-47],[30,-27]],'#303e48');poly(c,[[16,-42],[44,-69],[63,-76],[50,-50],[30,-32]],'#9e797a');
    poly(c,[[-17,-9],[-24,-38],[-14,-64],[0,-79],[15,-66],[25,-38],[18,-9]],'#2e3c46');
    poly(c,[[-13,-11],[-19,-36],[-11,-61],[0,-73],[12,-62],[19,-36],[14,-11]],'#907e88');
    poly(c,[[0,-61],[-10,-35],[0,-15],[9,-36]],'#d4aa9a');
    c.fillStyle='#d6c6ac';c.fillRect(-16,-68,5,14);c.fillRect(12,-68,5,14);c.fillStyle='#f8ddab';c.fillRect(-11,-52,6,3);c.fillRect(6,-52,6,3);
    poly(c,[[15,-13],[38,-7],[53,-22],[45,-4],[23,1]],'#907e88');
  }else{
    poly(c,[[-25,-10],[-32,-35],[-20,-60],[6,-68],[28,-45],[29,-14],[11,-5]],'#263c3a');
    poly(c,[[-21,-13],[-27,-35],[-17,-55],[5,-62],[23,-43],[23,-17],[10,-10]],'#7a8270');
    c.fillStyle='#a0a38a';c.fillRect(-15,-50,18,11);c.fillStyle='#436051';c.fillRect(-10,-40,27,13);c.fillStyle='#a6ddbc';c.fillRect(-9,-38+a,5,5);c.fillRect(8,-38+a,5,5);
    c.fillStyle='#43634b';c.fillRect(-6,-68,22,6);c.fillRect(3,-75,9,8);c.fillStyle='#b0a47b';c.fillRect(-26,-12,15,8);c.fillRect(9,-12,17,8);
  }c.restore();
}

export function drawMap(c:CanvasRenderingContext2D,w:number,h:number){
  c.clearRect(0,0,w,h);c.fillStyle='#253d34';c.fillRect(0,0,w,h);const s=Math.min(w,h)/3000;c.save();c.scale(s,s);
  c.strokeStyle='#365e58';c.lineWidth=210;c.beginPath();c.moveTo(0,0);c.lineTo(3000,3000);c.stroke();
  c.strokeStyle='#7a8060';c.lineWidth=90;c.lineJoin='round';
  for(const lane of LANES){c.beginPath();lane.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
  const rand=rng(56);for(let i=0;i<150;i++){const x=200+rand()*2600,y=200+rand()*2600;if(Math.abs(x-y)<180||Math.abs(x+y-3000)<150||x<400||x>2600||y<400||y>2600)continue;c.fillStyle=rand()>.5?'#4a6546':'#3b593d';c.fillRect(x,y,45+rand()*80,45+rand()*80);}
  BASES.forEach((b,i)=>{c.fillStyle=i?'#d48d81':'#b3ddbb';c.fillRect(b.x-115,b.y-115,230,230);c.fillStyle='#233c34';c.fillRect(b.x-60,b.y-60,120,120);});
  c.restore();
}

let stageBG:HTMLCanvasElement|null=null;
function makeStageBG(){
  const cvs=document.createElement('canvas');cvs.width=480;cvs.height=300;const c=cvs.getContext('2d')!,rand=rng(541);
  const sky=c.createLinearGradient(0,0,0,300);sky.addColorStop(0,'#0c242a');sky.addColorStop(.55,'#294b47');sky.addColorStop(1,'#26392f');c.fillStyle=sky;c.fillRect(0,0,480,300);
  c.fillStyle='#b4c7a324';c.fillRect(250,0,80,200);c.fillStyle='#bad3ba0b';c.fillRect(230,0,120,220);
  c.fillStyle='#c5d7ae';c.beginPath();c.arc(338,58,27,0,7);c.fill();c.fillStyle='#adbfa0';c.fillRect(319,44,12,5);c.fillRect(341,66,18,7);c.fillStyle='#15322c33';c.fillRect(310,75,65,7);
  const mountain=(y:number,color:string,seed:number)=>{const r=rng(seed);c.fillStyle=color;c.beginPath();c.moveTo(0,300);for(let x=0;x<=500;x+=16)c.lineTo(x,y+r()*40);c.lineTo(500,300);c.closePath();c.fill();};
  mountain(113,'#21433d',1);mountain(145,'#1b3935',2);mountain(174,'#18322f',3);
  for(let i=0;i<36;i++){const x=rand()*480,y=165+rand()*40;tree(c,x,y,.4+rand()*.35,Math.floor(rand()*3));}
  // Temple gate and hanging banners on the far horizon.
  c.fillStyle='#52614d';c.fillRect(366,108,10,92);c.fillRect(440,108,10,92);c.fillRect(360,105,96,9);c.fillStyle='#7b8161';c.fillRect(356,100,104,5);
  poly(c,[[350,100],[368,89],[443,89],[461,100]],'#2c3b32');poly(c,[[356,96],[371,86],[440,86],[455,96]],'#a7a07a');
  c.fillStyle='#66785b';c.fillRect(381,115,10,42);c.fillRect(425,115,10,42);c.fillStyle='#a6c6a3';c.fillRect(385,119,2,18);
  // Stone arena, broken platforms, tiles and grasses.
  poly(c,[[155,263],[249,211],[398,211],[480,255],[480,300],[139,300]],'#6c7459');
  poly(c,[[158,260],[251,214],[398,214],[477,255],[477,275],[154,275]],'#8a8d6c');
  c.strokeStyle='#5d6b53';c.lineWidth=1;for(let i=0;i<10;i++){c.beginPath();c.moveTo(175+i*31,232);c.lineTo(140+i*44,300);c.stroke();}for(let i=0;i<5;i++){c.beginPath();c.moveTo(145,244+i*12);c.lineTo(480,244+i*12);c.stroke();}
  c.strokeStyle='#bcc49a66';c.strokeRect(248,232,128,30);c.strokeRect(256,237,112,21);
  for(let i=0;i<300;i++){const x=rand()*480,y=242+rand()*58;if(x>160&&x<450&&y<279)continue;c.fillStyle=['#617554','#3c5940','#849166'][Math.floor(rand()*3)];c.fillRect(x,y,1,2+rand()*7);}
  tree(c,470,297,1.7,0);tree(c,31,299,1.6,2);
  // Foreground lantern.
  c.fillStyle='#354039';c.fillRect(215,251,8,28);c.fillRect(211,246,16,5);c.fillStyle='#c5c69a';c.fillRect(215,239,8,8);c.fillStyle='#e4e5b4';c.fillRect(217,241,4,5);c.fillStyle='#4d5949';c.fillRect(213,236,12,3);
  return cvs;
}
export function drawStage(c:CanvasRenderingContext2D,w:number,h:number,hero:HeroDef,skinIndex:number,time:number){
  if(!stageBG)stageBG=makeStageBG();c.imageSmoothingEnabled=false;c.clearRect(0,0,w,h);c.drawImage(stageBG,0,0,w,h);
  const sx=w/960,sy=h/600;c.save();c.scale(sx,sy);
  const s=hero.skins[skinIndex],rand=rng(193);
  c.fillStyle=s.glow+'16';c.beginPath();c.ellipse(651,510,130,32,0,0,7);c.fill();
  // Floating rune, a stepped halo, and wind caught in the cloak.
  c.save();c.translate(653,332);c.rotate(-.2);c.strokeStyle=s.glow+'18';c.lineWidth=2;c.strokeRect(-124,-124,248,248);c.rotate(.4);c.strokeRect(-96,-96,192,192);c.restore();
  c.fillStyle='#0c232b60';c.beginPath();c.ellipse(657,510,86,17,0,0,7);c.fill();
  const box=c.canvas.getBoundingClientRect(),cover=box.width&&box.height?Math.max(box.width/960,box.height/600):1;
  const cropTop=box.height?Math.max(0,(600-box.height/cover)/2):0;
  const limits=heroBounds(hero,s),maxScale=hero.id==='lvbu'||hero.id==='hanxin'?3.7:hero.id==='houyi'?4.35:4.8;
  const scale=Math.min(maxScale,(511-cropTop-28)/-limits.top);
  heroSprite(c,653,511,scale,hero,s,time);
  for(let i=0;i<38;i++){const x=420+rand()*500,y=(rand()*600-time*(4+rand()*14)+60000)%600;const a=.1+Math.sin(time+i)*.12;c.fillStyle=s.glow;c.globalAlpha=Math.max(.04,a);c.fillRect(x,y,i%5===0?4:2,i%5===0?4:2);}c.globalAlpha=1;
  const fade=c.createLinearGradient(0,0,650,0);fade.addColorStop(0,'#0e1916f5');fade.addColorStop(.55,'#0e1916b0');fade.addColorStop(1,'#0e191600');c.fillStyle=fade;c.fillRect(0,0,650,600);
  const bottom=c.createLinearGradient(0,430,0,600);bottom.addColorStop(0,'#0e191600');bottom.addColorStop(1,'#0e1916ed');c.fillStyle=bottom;c.fillRect(0,430,960,170);c.restore();
}
