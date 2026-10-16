import { BASES, LANES, Point, WORLD, createTerrain } from './art';
import { BOT_NAMES, HEROES, HeroId, ITEMS, heroById } from './data';
import { audio } from './audio';
import { GameRenderer } from './renderer';

export type Kind = 'hero'|'minion'|'tower'|'core'|'monster';
export interface Entity extends Point {
  id:number;kind:Kind;team:number;name:string;hp:number;maxHp:number;attack:number;range:number;speed:number;radius:number;
  dead:boolean;respawn:number;cooldown:number;hero:HeroId;skin:number;lane:number;pathIndex:number;tier:number;ranged:boolean;
  level:number;xp:number;gold:number;kills:number;deaths:number;assists:number;items:string[];cd:number[];
  shield:number;shieldTime:number;slow:number;stun:number;haste:number;lifesteal:number;boost:number;buff:number;
  moveTarget:Point|null;focus:number;facing:number;anim:number;moving:number;aiTimer:number;home:Point;lastDamage:number;hitBy:Map<number,number>;recall:number;
}
export interface Particle extends Point {vx:number;vy:number;life:number;max:number;size:number;color:string;}
export interface Effect extends Point {kind:'ring'|'slash'|'beam'|'burst'|'heal'|'rune'|'sword'|'meteor'|'crescent'|'lotus'|'spear';color:string;life:number;max:number;radius:number;angle:number;}
export interface FloatText extends Point {text:string;color:string;life:number;max:number;size:number;}
export interface Projectile extends Point {team:number;source:number;target:number;vx:number;vy:number;speed:number;damage:number;life:number;color:string;size:number;aoe:number;pierce:boolean;hit:Set<number>;trail:number;}
export interface Zone extends Point {team:number;source:number;radius:number;life:number;max:number;tick:number;interval:number;damage:number;heal:number;color:string;stun:number;}
export interface KillLog {killer:string;victim:string;team:number;time:number;hero?:HeroId;}
export type GameEvent = {type:'toast'|'finish'|'pause'|'shop'|'score';message?:string;winner?:number;};
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
let nextId=1;

export class Game {
  entities:Entity[]=[];player:Entity;time=0;score=[0,0];particles:Particle[]=[];effects:Effect[]=[];texts:FloatText[]=[];
  projectiles:Projectile[]=[];zones:Zone[]=[];logs:KillLog[]=[];terrain=createTerrain();
  announcement={title:'TIẾN VÀO CHIẾN TRƯỜNG',subtitle:'Phá hủy nhà chính của đối phương để chiến thắng.',time:5,type:'info'};
  camera={x:360,y:2640};mouse:Point={x:650,y:2350};mouseScreen={x:0,y:0};mouseSet=false;
  keys=new Set<string>();touchVector={x:0,y:0};paused=false;over=false;winner=-1;hoverSkill=-1;shake=0;shakeEnabled=true;
  mode:'standard'|'training';renderer:GameRenderer;onEvent:(e:GameEvent)=>void;onHUD:()=>void=()=>{};
  private frame=0;private last=0;private hudTime=0;private waveTime=2;private wave=0;private goldTick=0;private running=true;
  private listeners:{target:EventTarget;type:string;fn:EventListener}[]=[];
  constructor(public canvas:HTMLCanvasElement,public minimap:HTMLCanvasElement,hero:HeroId,skin:number,mode:'standard'|'training',onEvent:(e:GameEvent)=>void){
    this.mode=mode;this.onEvent=onEvent;
    this.createStructures();
    this.player=this.createHero(hero,0,1,'Bạn',skin);
    const allies=HEROES.filter(h=>h.id!==hero).slice(0,4);
    const lanes=[0,2,0,2];allies.forEach((h,i)=>this.createHero(h.id,0,lanes[i],BOT_NAMES[i],0));
    const enemyHeroes=HEROES.filter(h=>h.id!==allies[0].id).slice(0,5);
    enemyHeroes.forEach((h,i)=>this.createHero(h.id,1,[0,1,2,0,2][i],BOT_NAMES[i+4],i%3));
    this.createCamps();
    if(mode==='training'){for(let i=0;i<3;i++)this.levelUp(this.player,false);this.player.gold=2000;}
    this.renderer=new GameRenderer(this);this.bindInput();
    this.frame=requestAnimationFrame(this.loop);
  }
  private entity(p:Partial<Entity>&Pick<Entity,'kind'|'x'|'y'|'team'>){
    const e:Entity={id:nextId++,name:'',hp:100,maxHp:100,attack:20,range:70,speed:180,radius:18,
      dead:false,respawn:0,cooldown:0,hero:'libai',skin:0,lane:1,pathIndex:0,tier:0,ranged:false,level:1,xp:0,gold:600,kills:0,deaths:0,assists:0,items:[],cd:[0,0,0],
      shield:0,shieldTime:0,slow:0,stun:0,haste:0,lifesteal:0,boost:0,buff:0,moveTarget:null,focus:0,facing:1,anim:0,moving:0,aiTimer:0,home:{x:p.x,y:p.y},lastDamage:-100,hitBy:new Map(),recall:0,...p};
    this.entities.push(e);return e;
  }
  private createHero(id:HeroId,team:number,lane:number,name:string,skin:number){
    const h=heroById(id),b=BASES[team];
    return this.entity({kind:'hero',team,x:b.x+(lane-1)*45,y:b.y+(lane-1)*35,name,hero:id,skin,lane,hp:h.hp,maxHp:h.hp,attack:h.attack,speed:h.speed,range:h.range,radius:23,pathIndex:team?LANES[lane].length-2:1});
  }
  private createStructures(){
    BASES.forEach((p,team)=>this.entity({kind:'core',team,...p,name:'Nhà chính',hp:3800,maxHp:3800,attack:120,range:290,radius:65,speed:0}));
    const towers=[
      {x:310,y:1880,lane:0,tier:1},{x:310,y:1000,lane:0,tier:2},
      {x:780,y:2220,lane:1,tier:1},{x:1190,y:1810,lane:1,tier:2},
      {x:1120,y:2690,lane:2,tier:1},{x:2000,y:2690,lane:2,tier:2}
    ];
    towers.forEach(t=>{
      this.entity({...t,kind:'tower',team:0,name:'Trụ Ngọc',hp:1850,maxHp:1850,attack:170,range:320,radius:35,speed:0});
      this.entity({...t,x:3000-t.x,y:3000-t.y,lane:t.lane===0?2:t.lane===2?0:1,kind:'tower',team:1,name:'Trụ Xích',hp:1850,maxHp:1850,attack:170,range:320,radius:35,speed:0});
    });
  }
  private createCamps(){
    const camps=[{x:970,y:1950},{x:1050,y:1150},{x:1950,y:1050},{x:2050,y:1950},{x:700,y:1450},{x:2300,y:1550}];
    camps.forEach((p,i)=>this.entity({...p,kind:'monster',team:-1,name:i===3?'Cổ Long':'Thạch Linh',tier:i===3?1:0,hp:i===3?3400:950,maxHp:i===3?3400:950,attack:i===3?95:38,range:135,speed:130,radius:i===3?45:30}));
  }
  private listen(target:EventTarget,type:string,fn:EventListener){target.addEventListener(type,fn);this.listeners.push({target,type,fn});}
  private bindInput(){
    this.listen(window,'keydown',((event:KeyboardEvent)=>{
      if((event.target as HTMLElement)?.matches('input,textarea,select'))return;
      const k=event.key.toLowerCase();
      if(k==='escape'){event.preventDefault();this.onEvent({type:'pause'});return;}
      if(this.paused||this.over)return;
      if([' ','tab','arrowup','arrowdown','arrowleft','arrowright'].includes(k))event.preventDefault();
      if(k==='tab'&&!event.repeat){this.onEvent({type:'score'});return;}
      if(k==='p'&&!event.repeat){this.onEvent({type:'shop'});return;}
      this.keys.add(k);
      if(event.repeat)return;
      if(['q','e','r'].includes(k))this.cast(this.player,['q','e','r'].indexOf(k));
      if(k==='f')this.healPlayer();
      if(k==='b')this.recallPlayer();
      if(k==='1')this.buyRecommended();
    }) as EventListener);
    this.listen(window,'keyup',((e:KeyboardEvent)=>{this.keys.delete(e.key.toLowerCase());}) as EventListener);
    this.listen(window,'blur',(()=>{this.keys.clear();this.touchVector={x:0,y:0};if(!this.paused&&!this.over)this.onEvent({type:'pause'});}) as EventListener);
    this.listen(this.canvas,'contextmenu',((e:Event)=>e.preventDefault()) as EventListener);
    this.listen(this.canvas,'pointermove',((e:PointerEvent)=>{
      if(e.pointerType==='touch')return;
      const box=this.canvas.getBoundingClientRect();this.mouseScreen={x:e.clientX-box.left,y:e.clientY-box.top};this.mouse=this.renderer.screenToWorld(this.mouseScreen);this.mouseSet=true;
    }) as EventListener);
    this.listen(this.canvas,'pointerdown',((e:PointerEvent)=>{
      if(this.paused||this.over||this.player.dead)return;
      const box=this.canvas.getBoundingClientRect(),p=this.renderer.screenToWorld({x:e.clientX-box.left,y:e.clientY-box.top});
      this.mouse=p;this.mouseSet=e.pointerType!=='touch';
      const target=this.entities.filter(t=>!t.dead&&t.team!==0&&dist(t,p)<t.radius+30&&this.isVisible(t)).sort((a,b)=>dist(a,p)-dist(b,p))[0];
      this.player.focus=target?.id||0;this.player.moveTarget=p;this.player.recall=0;
      this.effect(p.x,p.y,'ring',target?'#f4ad9c':'#bceac5',25,.45);
    }) as EventListener);
    this.listen(this.minimap,'pointerdown',((e:PointerEvent)=>{
      if(this.paused||this.over)return;const b=this.minimap.getBoundingClientRect();
      this.player.moveTarget={x:clamp((e.clientX-b.left)/b.width*WORLD,60,WORLD-60),y:clamp((e.clientY-b.top)/b.height*WORLD,60,WORLD-60)};
      this.player.focus=0;this.player.recall=0;this.effect(this.player.moveTarget.x,this.player.moveTarget.y,'ring','#bceac5',60,.7);
    }) as EventListener);
  }
  private loop=(stamp:number)=>{
    if(!this.running)return;
    const dt=this.last?Math.min((stamp-this.last)/1000,.05):.016;this.last=stamp;
    if(!this.paused&&!this.over)this.update(dt);
    this.renderer.draw(dt);
    this.hudTime+=dt;if(this.hudTime>.1){this.hudTime=0;this.onHUD();}
    this.frame=requestAnimationFrame(this.loop);
  };
  stop(){this.running=false;cancelAnimationFrame(this.frame);this.listeners.forEach(l=>l.target.removeEventListener(l.type,l.fn));this.listeners=[];this.keys.clear();}
  setPaused(value:boolean){this.paused=value;this.keys.clear();this.touchVector={x:0,y:0};this.onHUD();}
  get heroes(){return this.entities.filter(e=>e.kind==='hero');}
  get alive(){return this.entities.filter(e=>!e.dead);}
  isVisible(e:Entity){return e.team===0||e.kind==='tower'||e.kind==='core'||e.kind==='monster'||this.entities.some(a=>a.team===0&&!a.dead&&dist(a,e)<(a.kind==='hero'?680:440));}
  vulnerable(e:Entity){
    if(e.kind==='tower')return !this.entities.some(t=>t.kind==='tower'&&!t.dead&&t.team===e.team&&t.lane===e.lane&&t.tier>e.tier);
    if(e.kind==='core')return [0,1,2].some(lane=>!this.entities.some(t=>t.kind==='tower'&&!t.dead&&t.team===e.team&&t.lane===lane));
    return true;
  }
  private spawnWave(){
    this.wave++;
    for(let team=0;team<2;team++)for(let lane=0;lane<3;lane++)for(let i=0;i<4;i++){
      const b=BASES[team],increase=Math.floor(this.time/60);
      this.entity({kind:'minion',team,lane,x:b.x+(i%2)*28-14,y:b.y+Math.floor(i/2)*30-15,name:i===3?'Lính phép':'Lính tiên phong',hp:260+increase*35,maxHp:260+increase*35,attack:(i===3?29:22)+increase*4,range:i===3?230:58,speed:145,radius:13,ranged:i===3,pathIndex:team?LANES[lane].length-2:1});
    }
    if(this.wave===1)this.announce('LÍNH ĐÃ XUẤT CHIẾN','Theo chân lính để tấn công trụ an toàn.',3);
  }
  private update(dt:number){
    this.time+=dt;this.waveTime-=dt;if(this.waveTime<=0){this.waveTime=24;this.spawnWave();}
    this.announcement.time=Math.max(0,this.announcement.time-dt);this.goldTick+=dt;
    if(this.goldTick>=1){this.goldTick--;for(const h of this.heroes){h.gold+=4;this.gainXP(h,4);}}
    this.shake=Math.max(0,this.shake-dt*15);
    for(const e of [...this.entities]){
      e.cooldown=Math.max(0,e.cooldown-dt);e.anim=Math.max(0,e.anim-dt);e.moving=Math.max(0,e.moving-dt);e.stun=Math.max(0,e.stun-dt);e.slow=Math.max(0,e.slow-dt);e.boost=Math.max(0,e.boost-dt);e.buff=Math.max(0,e.buff-dt);
      if(e.kind==='hero')e.cd=e.cd.map(cd=>Math.max(0,cd-dt));
      if(e.shieldTime>0){e.shieldTime-=dt;if(e.shieldTime<=0)e.shield=0;}
      if(e.dead){
        if(e.kind==='hero'||e.kind==='monster'){e.respawn-=dt;if(e.respawn<=0)this.respawn(e);}
        continue;
      }
      if(e.kind==='hero'){
        if(dist(e,BASES[e.team])<275)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.13*dt);
        else if(this.time-e.lastDamage>6)e.hp=Math.min(e.maxHp,e.hp+4*dt);
        if(e===this.player)this.updatePlayer(dt);else this.updateAI(e,dt);
      }else if(e.kind==='minion')this.updateAI(e,dt);
      else if(e.kind==='tower'||e.kind==='core')this.updateStructure(e);
      else this.updateMonster(e,dt);
    }
    this.updateProjectiles(dt);this.updateZones(dt);
    this.entities=this.entities.filter(e=>e.kind!=='minion'||!e.dead||this.time-e.lastDamage<.6);
    this.particles=this.particles.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=50*dt;return p.life>0;});
    this.effects=this.effects.filter(e=>(e.life-=dt)>0);
    this.texts=this.texts.filter(t=>{t.life-=dt;t.y-=32*dt;return t.life>0;});
    this.logs=this.logs.filter(l=>this.time-l.time<8);
    this.camera.x+=(this.player.x-this.camera.x)*Math.min(1,dt*7);this.camera.y+=(this.player.y-this.camera.y)*Math.min(1,dt*7);
  }
  private updatePlayer(dt:number){
    const p=this.player;if(p.stun>0)return;
    let dx=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0)+this.touchVector.x;
    let dy=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0)+this.touchVector.y;
    if(dx||dy){const len=Math.hypot(dx,dy);this.move(p,{x:p.x+dx/Math.max(1,len)*100,y:p.y+dy/Math.max(1,len)*100},dt);p.moveTarget=null;p.recall=0;}
    else if(p.recall>0){p.recall-=dt;if(p.recall<=0){p.x=BASES[0].x;p.y=BASES[0].y;p.moveTarget=null;p.focus=0;audio.play('cast');this.effect(p.x,p.y,'rune','#9adbd6',110,.8);}}
    else if(this.keys.has(' ')){p.moveTarget=null;p.focus=0;}
    else{
      const focus=this.entities.find(e=>e.id===p.focus&&!e.dead);
      if(focus){if(dist(p,focus)>p.range+focus.radius)this.move(p,focus,dt);else p.moveTarget=null;}
      else if(p.moveTarget){if(dist(p,p.moveTarget)>8)this.move(p,p.moveTarget,dt);else p.moveTarget=null;}
    }
    if(p.recall<=0){
      const focus=this.entities.find(e=>e.id===p.focus&&!e.dead&&dist(e,p)<=p.range+e.radius);
      const enemies=this.targets(p,p.range+45).filter(e=>e.kind!=='monster');
      const target=focus||enemies.sort((a,b)=>(a.kind==='hero'?0:1)-(b.kind==='hero'?0:1)||dist(a,p)-dist(b,p))[0];
      if(target)this.attack(p,target);
    }
  }
  private move(e:Entity,target:Point,dt:number){
    if(e.stun>0)return;const d=dist(e,target);if(d<1)return;
    e.moving=.12;
    const amount=Math.min(d,e.speed*(e.slow>0?.55:1)*(e.boost>0?1.45:1)*dt);
    const dx=(target.x-e.x)/d,dy=(target.y-e.y)/d;
    e.x=clamp(e.x+dx*amount,65,WORLD-65);e.y=clamp(e.y+dy*amount,65,WORLD-65);if(Math.abs(dx)>.05)e.facing=dx>0?1:-1;
    // A small separation force keeps waves and five heroes visually distinct.
    for(const a of this.entities){if(a.id===e.id||a.dead||a.team!==e.team||!['hero','minion'].includes(a.kind))continue;const dd=dist(e,a),r=e.radius+a.radius-6;if(dd<r&&dd>.1){e.x+=(e.x-a.x)/dd*(r-dd)*dt*4;e.y+=(e.y-a.y)/dd*(r-dd)*dt*4;}}
  }
  private targets(e:Entity,range:number,neutral=false){return this.entities.filter(t=>!t.dead&&t.id!==e.id&&t.team!==e.team&&(t.team>=0||neutral)&&dist(e,t)<range+t.radius&&this.vulnerable(t));}
  private updateAI(e:Entity,dt:number){
    if(e.stun>0)return;
    const isHero=e.kind==='hero';e.aiTimer-=dt;
    if(e.aiTimer<=0){
      e.aiTimer=.22;
      const targets=this.targets(e,isHero?460:290).sort((a,b)=>dist(e,a)-dist(e,b));
      // Heroes avoid diving a protected tower without a minion wave.
      const enemy=targets.find(t=>{
        if(!isHero||t.kind!=='tower')return true;
        return this.entities.some(m=>m.team===e.team&&m.kind==='minion'&&!m.dead&&dist(t,m)<310);
      });
      e.focus=enemy?.id||0;
      if(isHero && e.gold>=500 && e.items.length<6){const item=ITEMS.find(i=>!e.items.includes(i.id)&&i.price<=e.gold);if(item)this.buy(e,item.id,false);}
    }
    if(isHero&&e.hp<e.maxHp*.24){this.move(e,BASES[e.team],dt);if(dist(e,BASES[e.team])>350)return;}
    if(isHero&&dist(e,BASES[e.team])<270&&e.hp<e.maxHp*.8&&this.time>8)return;
    const target=this.entities.find(t=>t.id===e.focus&&!t.dead);
    if(target){
      if(dist(e,target)>e.range+target.radius-8)this.move(e,target,dt);else this.attack(e,target);
      if(isHero&&target.kind!=='core'&&target.kind!=='tower'){
        if(e.cd[0]<=0&&dist(e,target)<heroById(e.hero).skills[0].range)this.cast(e,0,target);
        if(e.cd[1]<=0&&dist(e,target)<(e.hero==='diaochan'?480:230))this.cast(e,1,target);
        if(e.level>=4&&e.cd[2]<=0&&target.kind==='hero'&&dist(e,target)<480)this.cast(e,2,target);
      }
    }else{
      const path=LANES[e.lane],index=clamp(e.pathIndex,0,path.length-1),p=path[index];
      if(dist(e,p)<70){e.pathIndex=clamp(e.pathIndex+(e.team===0?1:-1),0,path.length-1);}
      const next=path[clamp(e.pathIndex,0,path.length-1)];
      // Stop at a tower until a friendly wave catches up.
      const unsafe=isHero&&this.entities.find(t=>t.kind==='tower'&&!t.dead&&t.team!==e.team&&dist(t,e)<370&&!this.entities.some(m=>m.kind==='minion'&&!m.dead&&m.team===e.team&&dist(m,t)<320));
      if(!unsafe)this.move(e,next,dt);
    }
  }
  private updateStructure(e:Entity){
    const targets=this.targets(e,e.range).sort((a,b)=>{
      const priority=(t:Entity)=>t.kind==='minion'?0:t.kind==='hero'?1:2;return priority(a)-priority(b)||dist(a,e)-dist(b,e);
    }).filter(t=>t.kind==='hero'||t.kind==='minion');
    if(targets[0])this.attack(e,targets[0]);
  }
  private updateMonster(e:Entity,dt:number){
    if(e.stun>0)return;
    const target=this.entities.find(t=>t.id===e.focus&&!t.dead&&dist(t,e.home)<420);
    if(target){if(dist(e,target)>e.range)this.move(e,target,dt);else this.attack(e,target);}
    else {e.focus=0;if(dist(e,e.home)>10)this.move(e,e.home,dt);if(this.time-e.lastDamage>8)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);}
  }
  private attack(e:Entity,target:Entity){
    if(e.cooldown>0||e.stun>0||e.dead||!this.vulnerable(target))return;
    e.cooldown=e.kind==='hero'?heroById(e.hero).attackRate:e.kind==='tower'?1.05:e.kind==='core'?1.2:1.1;e.anim=.25;e.facing=target.x>e.x?1:-1;
    const damage=e.attack*(e.buff>0?1.18:1);
    const color=e.kind==='hero'?heroById(e.hero).skins[e.skin].glow:e.team?'#f4ab93':'#a1e5dd';
    if(e.range>160){
      const d=dist(e,target);this.projectiles.push({x:e.x,y:e.y-30,team:e.team,source:e.id,target:target.id,vx:(target.x-e.x)/d,vy:(target.y-e.y)/d,speed:e.kind==='tower'?510:650,damage,life:2,color,size:e.kind==='tower'?7:4,aoe:0,pierce:false,hit:new Set(),trail:0});
    }else{this.damage(target,damage,e);this.effect(target.x,target.y-20,'slash',color,40,.22,Math.atan2(target.y-e.y,target.x-e.x));this.emit(target.x,target.y-20,color,5,90);}
    if(e===this.player)audio.play('attack');
  }
  damage(target:Entity,amount:number,source:Entity){
    if(target.dead||!this.vulnerable(target)||source.team===target.team)return;
    if(target.kind==='hero'&&this.mode==='training'&&source.team===1)amount*=.65;
    if(target.kind==='tower'||target.kind==='core')amount*=source.kind==='hero'?.78:1;
    let actual=amount;
    if(target.shield>0){const absorb=Math.min(amount,target.shield);target.shield-=absorb;actual-=absorb;}
    target.hp=Math.max(0,target.hp-actual);target.lastDamage=this.time;target.hitBy.set(source.id,this.time);target.recall=0;
    if(target.kind==='monster')target.focus=source.id;
    if(source.lifesteal>0&&source.kind==='hero')this.heal(source,actual*source.lifesteal,false);
    if(source===this.player||target===this.player){this.float(target.x+(Math.random()-.5)*22,target.y-65,Math.round(amount).toString(),target===this.player?'#ffad98':'#f5e6b5',source===this.player?19:17);audio.play('hit');}
    if(target===this.player){this.shake=Math.max(this.shake,2);}
    if(target.hp<=0)this.kill(target,source);
  }
  private kill(target:Entity,source:Entity){
    target.dead=true;target.hp=0;target.lastDamage=this.time;target.moveTarget=null;target.focus=0;target.recall=0;
    this.emit(target.x,target.y-30,target.team===0?'#a1dfd2':'#f2b29d',target.kind==='tower'?50:25,160);
    if(target.kind==='hero'){
      target.deaths++;target.respawn=7+target.level*1.5;if(source.team>=0)this.score[source.team]++;
      if(source.kind==='hero'){source.kills++;source.gold+=220;this.gainXP(source,130);}
      for(const h of this.heroes){if(h.id!==source.id&&h.team===source.team&&!h.dead&&(dist(h,target)<650||(target.hitBy.get(h.id)||-100)>this.time-8)){h.assists++;h.gold+=90;this.gainXP(h,70);}}
      this.logs.unshift({killer:source.kind==='hero'?heroById(source.hero).name:source.name,victim:heroById(target.hero).name,team:source.team,time:this.time,hero:source.kind==='hero'?source.hero:undefined});
      if(source===this.player){audio.play('kill');this.announce('HẠ GỤC!',heroById(target.hero).name+' đã bị đánh bại.',3,'kill');}
      if(target===this.player){audio.play('death');this.onEvent({type:'toast',message:'Bạn đã bị hạ gục. Sẽ hồi sinh tại nhà chính.'});}
    }else if(target.kind==='tower'){
      this.heroes.filter(h=>h.team===source.team).forEach(h=>{h.gold+=130;this.gainXP(h,65);});
      this.announce(source.team===0?'PHÁ HỦY TRỤ ĐỊCH':'TRỤ ĐỒNG MINH THẤT THỦ',source.team===0?'Đường tiến công đã mở. Tiếp tục đẩy lính!':'Tập hợp để bảo vệ nhà chính.',3,source.team===0?'kill':'danger');audio.play('tower');
    }else if(target.kind==='core'){
      this.over=true;this.winner=source.team;audio.play(source.team===0?'victory':'defeat');this.effect(target.x,target.y-40,'burst',source.team===0?'#c8f394':'#f4ad9c',400,2);
      this.onEvent({type:'finish',winner:source.team});
    }else if(target.kind==='minion'){
      if(source.kind==='hero'){source.gold+=28;this.gainXP(source,25);if(source===this.player)this.float(target.x,target.y-35,'+28','#f3d590',15);}
      this.heroes.filter(h=>h.team===source.team&&h.id!==source.id&&!h.dead&&dist(h,target)<550).forEach(h=>{this.gainXP(h,18);h.gold+=8;});
    }else{
      target.respawn=target.tier?100:50;
      if(source.kind==='hero'){source.gold+=target.tier?300:110;this.gainXP(source,target.tier?200:90);}
      if(target.tier){this.heroes.filter(h=>h.team===source.team).forEach(h=>{h.buff=75;h.gold+=100;});this.announce('CỔ LONG ĐÃ BỊ CHINH PHỤC',source.team===0?'Toàn đội nhận +18% sát thương trong 75 giây.':'Đối phương nhận sức mạnh Cổ Long.',4,source.team===0?'kill':'danger');}
      else source.buff=40;
    }
  }
  private respawn(e:Entity){
    e.dead=false;e.hp=e.maxHp;e.shield=0;e.stun=0;e.focus=0;e.hitBy.clear();
    const p=e.kind==='hero'?BASES[e.team]:e.home;e.x=p.x;e.y=p.y;e.moveTarget=null;e.pathIndex=e.team?LANES[e.lane].length-2:1;
    this.effect(e.x,e.y,'rune','#b4dfcc',100,.8);
  }
  private gainXP(e:Entity,n:number){if(e.level>=15)return;e.xp+=n;const need=100+e.level*35;if(e.xp>=need){e.xp-=need;this.levelUp(e);}}
  private levelUp(e:Entity,fx=true){
    e.level++;e.maxHp+=105;e.hp=Math.min(e.maxHp,e.hp+180);e.attack+=7;
    if(fx&&e===this.player){audio.play('level');this.float(e.x,e.y-90,'LÊN CẤP '+e.level,'#ccf59b',23);this.effect(e.x,e.y,'rune','#d2f5a4',100,.9);if(e.level===4)this.onEvent({type:'toast',message:'Đã mở khóa chiêu cuối [R]!'});}
  }
  private heal(e:Entity,amount:number,fx=true){if(e.dead)return;const actual=Math.min(amount,e.maxHp-e.hp);e.hp+=actual;if(fx&&actual>1){this.float(e.x,e.y-75,'+'+Math.round(actual),'#acf4b4',18);this.effect(e.x,e.y-15,'heal','#b5f7bc',65,.65);}}
  healCooldown=0;
  healPlayer(){
    if(this.paused||this.over||this.player.dead)return;
    if(this.time<this.healCooldown){this.onEvent({type:'toast',message:'Hồi phục đang hồi: '+Math.ceil(this.healCooldown-this.time)+' giây.'});return;}
    this.healCooldown=this.time+35;this.heal(this.player,this.player.maxHp*.3);audio.play('cast');
  }
  recallPlayer(){
    if(this.paused||this.over||this.player.dead)return;this.player.recall=4;this.player.moveTarget=null;this.player.focus=0;this.keys.clear();this.effect(this.player.x,this.player.y,'rune','#a6d8ed',100,4);this.onEvent({type:'toast',message:'Biến về sau 4 giây. Di chuyển hoặc nhận sát thương sẽ hủy.'});
  }
  buyRecommended(){const item=ITEMS.find(i=>!this.player.items.includes(i.id)&&i.price<=this.player.gold);if(item)this.buy(this.player,item.id);else this.onEvent({type:'toast',message:'Chưa đủ vàng hoặc đã sở hữu đủ trang bị.'});}
  buy(e:Entity,id:string,notify=true){
    const item=ITEMS.find(i=>i.id===id);if(!item||e.items.includes(id)||e.items.length>=6||e.gold<item.price)return false;
    e.gold-=item.price;e.items.push(id);e.attack+=item.attack||0;e.maxHp+=item.hp||0;e.hp+=item.hp||0;e.speed+=item.speed||0;e.haste+=item.haste||0;e.lifesteal+=item.lifesteal||0;
    if(notify){audio.play('buy');this.onEvent({type:'toast',message:'Đã mua '+item.name+'.'});this.onHUD();}return true;
  }
  cast(e:Entity,index:number,aim?:Point){
    if(e.dead||e.stun>0||this.paused||this.over)return false;
    if(index===2&&e.level<4){if(e===this.player)this.onEvent({type:'toast',message:'Chiêu cuối mở khóa ở cấp 4.'});return false;}
    if(e.cd[index]>0)return false;
    const h=heroById(e.hero),skill=h.skills[index],skin=h.skins[e.skin],color=skin.glow;
    let target=aim;
    if(!target){
      const near=this.targets(e,skill.range,true).sort((a,b)=>(a.kind==='hero'?0:1)-(b.kind==='hero'?0:1)||dist(a,e)-dist(b,e))[0];
      target=this.mouseSet?this.mouse:near||{x:e.x+e.facing*200,y:e.y-100};
    }
    const d=Math.max(1,dist(e,target)),dx=(target.x-e.x)/d,dy=(target.y-e.y)/d;
    const point={x:e.x+dx*Math.min(d,skill.range),y:e.y+dy*Math.min(d,skill.range)};
    const angle=Math.atan2(dy,dx),bonus=(e.attack-h.attack)*.8+(e.level-1)*8;
    e.cd[index]=skill.cooldown*(1-Math.min(.4,e.haste));e.anim=.4;e.recall=0;e.facing=dx>=0?1:-1;
    if(e===this.player){audio.play(index===2?'ultimate':'cast');if(index===2)this.shake=8;}
    const area=(p:Point,r:number,damage:number,stun=0,slow=0)=>{
      this.targets({...e,x:p.x,y:p.y},r,true).forEach(t=>{this.damage(t,damage+bonus,e);t.stun=Math.max(t.stun,stun);t.slow=Math.max(t.slow,slow);this.emit(t.x,t.y-20,color,9,140);});
      this.effect(p.x,p.y-15,index===2?'burst':'ring',color,r,index===2?.8:.5);this.emit(p.x,p.y-20,color,index===2?38:20,180);
    };
    const dash=(length:number,damage:number,stun=0)=>{
      const start={x:e.x,y:e.y};e.x=clamp(e.x+dx*length,65,WORLD-65);e.y=clamp(e.y+dy*length,65,WORLD-65);
      const mid={x:(start.x+e.x)/2,y:(start.y+e.y)/2};
      this.targets({...e,...mid},length/2+70,true).forEach(t=>{
        const proj=clamp((t.x-start.x)*dx+(t.y-start.y)*dy,0,length),distance=Math.hypot(t.x-start.x-dx*proj,t.y-start.y-dy*proj);
        if(distance<t.radius+65){this.damage(t,damage+bonus,e);t.stun=Math.max(t.stun,stun);}
      });
      this.effect(mid.x,mid.y-25,'beam',color,length,.4,angle);this.emit(start.x,start.y-20,color,20,180);
    };
    const shoot=(spread:number,damage:number,pierce=false,range=skill.range,size=8,aoe=0)=>{
      const a=angle+spread;this.projectiles.push({x:e.x+Math.cos(a)*25,y:e.y-25+Math.sin(a)*25,team:e.team,source:e.id,target:0,vx:Math.cos(a),vy:Math.sin(a),speed:index===2?1100:740,damage:damage+bonus,life:range/(index===2?1100:740),color,size,aoe,pierce,hit:new Set(),trail:0});
    };
    switch(e.hero){
      case 'libai':if(index===0)dash(Math.min(d,320),180);else if(index===1){area(e,175,220,0,2);this.effect(e.x,e.y-25,'slash',color,180,.5,angle);}else{area(point,180,480,1);for(let i=0;i<5;i++){const a=i*Math.PI*.4;this.effect(point.x+Math.cos(a)*65,point.y+Math.sin(a)*45,'slash',color,140,.45+i*.09,a);}}break;
      case 'diaochan':if(index===0)shoot(0,220,false,650,10,105);else this.addZone(e,point,index===1?155:210,index===1?3:2.5,index===1?75:120,0,color,index===1?.6:.5);break;
      case 'hanxin':if(index===0){dash(Math.min(d,360),200);e.boost=2;}else if(index===1){for(let j=-2;j<=2;j++)shoot(j*.17,100,true,520,5);}else{const victim=this.targets(e,570,true).filter(t=>dist(t,point)<200).sort((a,b)=>dist(a,point)-dist(b,point))[0];if(victim){e.x=victim.x-dx*45;e.y=victim.y-dy*45;area(victim,110,450);for(let i=0;i<4;i++)this.effect(victim.x,victim.y-25+i*10,'spear',color,170,.4+i*.08,angle);}else dash(Math.min(d,500),320);}break;
      case 'houyi':if(index===0){for(let j=-1;j<=1;j++)shoot(j*.16,150,true,700,5);}else if(index===1){e.x=clamp(e.x-dx*225,65,WORLD-65);e.y=clamp(e.y-dy*225,65,WORLD-65);e.boost=3;this.heal(e,90);this.effect(e.x,e.y,'ring',color,90,.5);}else shoot(0,500,true,1100,16);break;
      case 'lvbu':if(index===0)dash(Math.min(d,280),170,.8);else if(index===1){e.shield=450+bonus;e.shieldTime=5;this.heal(e,120);this.effect(e.x,e.y-20,'rune',color,90,.8);}else area(e,280,420,1.5);break;
      case 'daqiao':if(index===0){shoot(0,180,false,600,9);this.entities.filter(a=>a.team===e.team&&!a.dead&&a.kind==='hero'&&dist(a,e)<300).forEach(a=>this.heal(a,80));}else if(index===1){this.entities.filter(a=>a.team===e.team&&!a.dead&&a.kind==='hero'&&dist(a,e)<300).forEach(a=>{this.heal(a,260+bonus);a.shield=150;a.shieldTime=4;});this.effect(e.x,e.y,'heal',color,300,1);}else this.addZone(e,point,260,5,95,110,color,1);break;
    }
    return true;
  }
  private addZone(e:Entity,p:Point,radius:number,life:number,damage:number,heal:number,color:string,interval:number){
    this.zones.push({...p,team:e.team,source:e.id,radius,life,max:life,tick:.05,interval,damage:damage+(e.level-1)*5,heal,color,stun:0});this.effect(p.x,p.y,'rune',color,radius,.6);
  }
  private updateZones(dt:number){
    this.zones=this.zones.filter(z=>{
      z.life-=dt;z.tick-=dt;
      if(z.tick<=0){
        z.tick=z.interval;const source=this.entities.find(e=>e.id===z.source);
        if(source){
          for(const e of this.entities){
            if(e.dead||dist(e,z)>z.radius+e.radius)continue;
            if(e.team!==z.team){this.damage(e,z.damage,source);e.slow=.8;}
            else if(z.heal&&e.kind==='hero')this.heal(e,z.heal);
          }
          if(source.hero==='diaochan')this.effect(z.x,z.y,'lotus',z.color,z.radius,.65);
          this.emit(z.x,z.y-15,z.color,16,200);this.effect(z.x,z.y,'ring',z.color,z.radius,.4);
        }
      }
      return z.life>0;
    });
  }
  private updateProjectiles(dt:number){
    this.projectiles=this.projectiles.filter(p=>{
      p.life-=dt;const source=this.entities.find(e=>e.id===p.source);if(!source)return false;
      const target=p.target?this.entities.find(t=>t.id===p.target&&!t.dead):undefined;
      if(p.target&&!target)return false;
      if(target){const d=Math.max(1,dist(p,{x:target.x,y:target.y-20}));p.vx=(target.x-p.x)/d;p.vy=(target.y-20-p.y)/d;}
      const old={x:p.x,y:p.y};p.x+=p.vx*p.speed*dt;p.y+=p.vy*p.speed*dt;
      p.trail-=dt;if(p.trail<=0){p.trail=.025;this.particles.push({x:p.x,y:p.y,vx:0,vy:0,life:.18,max:.18,size:p.size*.7,color:p.color});}
      const candidates=target?[target]:this.entities.filter(e=>!e.dead&&e.team!==p.team&&e.id!==p.source&&this.vulnerable(e));
      for(const e of candidates){
        if(p.hit.has(e.id))continue;
        const len=p.speed*dt,proj=clamp((e.x-old.x)*p.vx+(e.y-20-old.y)*p.vy,0,len),dd=Math.hypot(e.x-old.x-p.vx*proj,e.y-20-old.y-p.vy*proj);
        if(dd<e.radius+p.size){
          p.hit.add(e.id);this.damage(e,p.damage,source);this.emit(p.x,p.y,p.color,7,110);
          if(p.aoe){this.entities.filter(t=>t.id!==e.id&&!t.dead&&t.team!==p.team&&dist(t,e)<p.aoe).forEach(t=>this.damage(t,p.damage*.7,source));this.effect(p.x,p.y,'burst',p.color,p.aoe,.5);}
          if(!p.pierce)return false;
        }
      }
      return p.life>0&&p.x>0&&p.y>0&&p.x<WORLD&&p.y<WORLD;
    });
  }
  effect(x:number,y:number,kind:Effect['kind'],color:string,radius:number,life:number,angle=0){this.effects.push({x,y,kind,color,radius,life,max:life,angle});}
  private emit(x:number,y:number,color:string,count:number,speed:number){
    for(let i=0;i<count;i++){if(this.particles.length>700)break;const a=Math.random()*Math.PI*2,s=speed*(.2+Math.random()*.8),life=.25+Math.random()*.5;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,life,max:life,size:2+Math.random()*4,color});}
  }
  private float(x:number,y:number,text:string,color:string,size=18){this.texts.push({x,y,text,color,size,life:1,max:1});}
  private announce(title:string,subtitle:string,time=3,type='info'){this.announcement={title,subtitle,time,type};}
  snapshot(){return {time:this.time,score:[...this.score],paused:this.paused,over:this.over,player:{x:this.player.x,y:this.player.y,hp:this.player.hp,maxHp:this.player.maxHp,level:this.player.level,gold:this.player.gold,items:[...this.player.items],cd:[...this.player.cd],dead:this.player.dead,kills:this.player.kills},units:this.entities.filter(e=>!e.dead).map(e=>({id:e.id,kind:e.kind,team:e.team,x:e.x,y:e.y,hp:e.hp}))};}
}
