import { BASES, WORLD, core, decoration, drawMap, heroSprite, minion, monster, tower } from './art';
import { heroById } from './data';
import type { Entity, Game } from './engine';

export class GameRenderer {
  c:CanvasRenderingContext2D;map:CanvasRenderingContext2D;width=0;height=0;zoom=1;view={x:0,y:0};
  private miniBG:HTMLCanvasElement;private ratio=2;
  constructor(private game:Game){
    this.c=game.canvas.getContext('2d',{alpha:false})!;this.map=game.minimap.getContext('2d')!;
    this.miniBG=document.createElement('canvas');this.miniBG.width=240;this.miniBG.height=240;drawMap(this.miniBG.getContext('2d')!,240,240);
  }
  screenToWorld(p:{x:number;y:number}){return {x:(p.x-this.width/2)/this.zoom+this.view.x,y:(p.y-this.height/2)/this.zoom+this.view.y};}
  private resize(){
    const b=this.game.canvas.getBoundingClientRect();this.width=b.width;this.height=b.height;
    this.zoom=this.width<700?.8:1;
    const w=Math.max(1,Math.round(this.width/this.ratio)),h=Math.max(1,Math.round(this.height/this.ratio));
    if(this.game.canvas.width!==w||this.game.canvas.height!==h){this.game.canvas.width=w;this.game.canvas.height=h;this.c.imageSmoothingEnabled=false;}
    const halfW=this.width/2/this.zoom,halfH=this.height/2/this.zoom;
    this.view={x:Math.max(halfW,Math.min(WORLD-halfW,this.game.camera.x)),y:Math.max(halfH,Math.min(WORLD-halfH,this.game.camera.y))};
  }
  draw(_dt:number){
    this.resize();const c=this.c,g=this.game,t=g.time;if(g.mouseSet)g.mouse=this.screenToWorld(g.mouseScreen);const shake=g.shakeEnabled&&!g.paused?g.shake:0;
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#172e2d';c.fillRect(0,0,g.canvas.width,g.canvas.height);
    c.save();c.scale(1/this.ratio,1/this.ratio);c.translate(this.width/2+(Math.random()-.5)*shake,this.height/2+(Math.random()-.5)*shake);c.scale(this.zoom,this.zoom);c.translate(-Math.round(this.view.x),-Math.round(this.view.y));
    c.drawImage(g.terrain.canvas,0,0,WORLD,WORLD);
    const view={left:this.view.x-this.width/2/this.zoom-150,right:this.view.x+this.width/2/this.zoom+150,top:this.view.y-this.height/2/this.zoom-50,bottom:this.view.y+this.height/2/this.zoom+150};
    const inView=(p:{x:number;y:number})=>p.x>view.left&&p.x<view.right&&p.y>view.top&&p.y<view.bottom;
    // Team fountains and objective rings.
    for(const [i,b] of BASES.entries()){
      if(!inView(b))continue;c.strokeStyle=i?'#d18c7950':'#b8ead760';c.lineWidth=3;c.setLineDash([14,10]);c.beginPath();c.ellipse(b.x,b.y+18,210,145,0,0,7);c.stroke();c.setLineDash([]);
    }
    for(const z of g.zones){
      if(!inView(z))continue;
      c.fillStyle=z.color+'20';c.beginPath();c.arc(z.x,z.y,z.radius,0,7);c.fill();c.strokeStyle=z.team===0?z.color:'#eaa193';c.globalAlpha=.55+Math.sin(t*6)*.2;c.lineWidth=3;c.beginPath();c.arc(z.x,z.y,z.radius,0,7);c.stroke();
      c.save();c.translate(z.x,z.y);c.rotate(t*.4);c.strokeRect(-z.radius*.65,-z.radius*.65,z.radius*1.3,z.radius*1.3);c.restore();c.globalAlpha=1;
    }
    const p=g.player;
    if(!p.dead){
      c.strokeStyle='#c9f0bd';c.globalAlpha=.5;c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+3,30,14,0,0,7);c.stroke();c.globalAlpha=1;
      if(p.moveTarget&&!g.keys.size){const target=p.moveTarget;c.strokeStyle='#c8edb080';c.lineWidth=2;c.beginPath();c.moveTo(target.x-12,target.y);c.lineTo(target.x,target.y+7);c.lineTo(target.x+12,target.y);c.moveTo(target.x,target.y-7);c.lineTo(target.x,target.y+7);c.stroke();}
    }
    for(const e of g.entities){
      if(e.dead||e.kind!=='tower'||e.team===0||Math.hypot(e.x-p.x,e.y-p.y)>420||!inView(e))continue;
      c.strokeStyle='#e9987450';c.lineWidth=2;c.setLineDash([8,10]);c.beginPath();c.arc(e.x,e.y,e.range,0,7);c.stroke();c.setLineDash([]);
    }
    // Depth sorted scenery and combatants allow characters to pass behind trees.
    const objects:{y:number;draw:()=>void}[]=[];
    for(const d of g.terrain.deco){if(inView(d))objects.push({y:d.y,draw:()=>decoration(c,d)});}
    for(const e of g.entities){
      if(!inView(e)||!g.isVisible(e))continue;
      if(e.dead){
        if(e.kind==='tower')objects.push({y:e.y,draw:()=>tower(c,e.x,e.y,e.team,true,t)});
        else if(e.kind==='hero')objects.push({y:e.y,draw:()=>{c.fillStyle='#263c3b';c.fillRect(e.x-12,e.y-5,24,7);c.fillStyle='#acbba3';c.fillRect(e.x-2,e.y-32,4,30);c.fillRect(e.x-10,e.y-21,20,4);}});
        continue;
      }
      objects.push({y:e.y,draw:()=>this.drawEntity(e)});
    }
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    for(const shot of g.projectiles){
      if(!inView(shot))continue;c.save();c.translate(shot.x,shot.y);c.rotate(Math.atan2(shot.vy,shot.vx));c.fillStyle=shot.color+'40';c.fillRect(-shot.size*3,-shot.size,shot.size*4,shot.size*2);c.fillStyle=shot.color;c.fillRect(-shot.size*2,-shot.size/2,shot.size*3,shot.size);c.fillStyle='#fff4d1';c.fillRect(0,-shot.size/3,shot.size,shot.size*.66);c.restore();
    }
    for(const fx of g.effects){
      if(!inView(fx))continue;const a=fx.life/fx.max,progress=1-a,r=fx.radius*(.3+progress*.7);
      c.save();c.translate(fx.x,fx.y);c.strokeStyle=fx.color;c.fillStyle=fx.color;c.globalAlpha=a;c.lineWidth=3+5*a;
      if(fx.kind==='ring'||fx.kind==='burst'){
        c.beginPath();for(let i=0;i<=8;i++){const angle=i*Math.PI/4;c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r*.65);}c.stroke();
        if(fx.kind==='burst'){c.globalAlpha=a*.18;c.fill();c.globalAlpha=a;c.lineWidth=2;for(let i=0;i<8;i++){const angle=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(angle)*r*.6,Math.sin(angle)*r*.4);c.lineTo(Math.cos(angle)*r*1.1,Math.sin(angle)*r*.8);c.stroke();}}
      }else if(fx.kind==='slash'){
        c.rotate(fx.angle);c.lineWidth=8*a+3;c.beginPath();c.arc(0,0,r,-1.4+progress*.7,1.3+progress*.7);c.stroke();c.strokeStyle='#fff4cc';c.lineWidth=2;c.stroke();
      }else if(fx.kind==='beam'){
        c.rotate(fx.angle);c.globalAlpha=a*.3;c.fillRect(-fx.radius/2,-35*a,fx.radius,70*a);c.globalAlpha=a;c.fillRect(-fx.radius/2,-3,fx.radius,6);
      }else if(fx.kind==='heal'){
        c.globalAlpha=a*.5;c.beginPath();c.ellipse(0,0,r,r*.4,0,0,7);c.stroke();for(let i=0;i<5;i++){const xx=Math.sin(i*7)*r*.6,yy=-progress*80-i*7;c.fillRect(xx-2,yy-7,4,14);c.fillRect(xx-7,yy-2,14,4);}
      }else if(fx.kind==='sword'){
        const drop=Math.max(0,1-progress*4)*220;c.translate(0,-drop);c.fillStyle=fx.color+'55';c.fillRect(-26,-220,52,220);c.fillStyle=fx.color;c.beginPath();c.moveTo(0,10);c.lineTo(-14,-28);c.lineTo(-14,-170);c.lineTo(14,-170);c.lineTo(14,-28);c.closePath();c.fill();c.fillStyle='#fffbd7';c.fillRect(-3,-160,6,145);c.fillStyle='#d5cf9b';c.fillRect(-40,-174,80,9);c.fillRect(-7,-211,14,38);c.fillStyle=fx.color;c.fillRect(-11,-220,22,13);
      }else if(fx.kind==='crescent'){
        c.rotate(progress*2-1);c.lineWidth=22*a+2;c.beginPath();c.arc(0,0,r,-2.5,1.7);c.stroke();c.strokeStyle='#f8dfef';c.lineWidth=3;c.stroke();
      }else if(fx.kind==='meteor'){
        const drop=(1-progress)*170;c.translate(drop,-drop);c.rotate(-.8);c.globalAlpha=a*.3;c.fillRect(-15,-75,30,90);c.globalAlpha=a;c.fillStyle=fx.color;c.fillRect(-10,-28,20,38);c.fillStyle='#fff4bf';c.fillRect(-5,-10,10,18);
      }else if(fx.kind==='lotus'){
        c.rotate(t*.15);c.globalAlpha=a*.5;c.lineWidth=2;
        for(let i=0;i<8;i++){const aa=i*Math.PI/4;c.save();c.rotate(aa);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-r*.65,-r*.65,0,-r);c.quadraticCurveTo(r*.65,-r*.65,0,0);c.fillStyle=fx.color+'16';c.fill();c.stroke();c.restore();}
        c.globalAlpha=a;c.beginPath();c.arc(0,0,r*.32,0,7);c.stroke();
      }else if(fx.kind==='spear'){
        c.rotate(fx.angle);c.globalAlpha=a*.7;c.beginPath();c.moveTo(-fx.radius,0);c.lineTo(fx.radius*.55,-6);c.lineTo(fx.radius*.8,-17);c.lineTo(fx.radius,0);c.lineTo(fx.radius*.8,17);c.lineTo(fx.radius*.55,6);c.closePath();c.fill();c.strokeStyle='#fff2d9';c.lineWidth=2;c.beginPath();c.moveTo(-fx.radius*.6,0);c.lineTo(fx.radius*.9,0);c.stroke();
      }else{
        c.rotate(t*.6);c.globalAlpha=a*.6;c.strokeRect(-r*.65,-r*.65,r*1.3,r*1.3);c.beginPath();c.arc(0,0,r,0,7);c.stroke();c.rotate(.8);c.lineWidth=2;c.strokeRect(-r*.6,-r*.6,r*1.2,r*1.2);
      }c.restore();
    }
    for(const part of g.particles){if(!inView(part))continue;c.globalAlpha=part.life/part.max;c.fillStyle=part.color;const s=Math.max(2,part.size*part.life/part.max);c.fillRect(Math.round(part.x),Math.round(part.y),s,s);}c.globalAlpha=1;
    // Bars are drawn after trees so combat information stays legible.
    for(const e of g.entities){if(e.dead||!inView(e)||!g.isVisible(e))continue;this.healthBar(e);}
    if(g.hoverSkill>=0&&!p.dead){
      const skill=heroById(p.hero).skills[g.hoverSkill],s=heroById(p.hero).skins[p.skin];c.strokeStyle=s.glow+'70';c.fillStyle=s.glow+'08';c.lineWidth=2;c.setLineDash([8,8]);c.beginPath();c.arc(p.x,p.y,skill.range,0,7);c.fill();c.stroke();c.setLineDash([]);
      if(g.mouseSet){const d=Math.hypot(g.mouse.x-p.x,g.mouse.y-p.y),r=Math.min(d,skill.range),a=Math.atan2(g.mouse.y-p.y,g.mouse.x-p.x),x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(x,y);c.stroke();c.beginPath();c.arc(x,y,g.hoverSkill===2?150:65,0,7);c.stroke();}
    }
    for(const text of g.texts){if(!inView(text))continue;c.globalAlpha=Math.min(1,text.life*3);c.font=`bold ${text.size}px monospace`;c.textAlign='center';c.lineWidth=4;c.strokeStyle='#112522';c.strokeText(text.text,text.x,text.y);c.fillStyle=text.color;c.fillText(text.text,text.x,text.y);}c.globalAlpha=1;
    c.restore();
    // Gentle vignette grounds the HUD without obscuring the world.
    c.setTransform(1,0,0,1,0,0);const v=c.createRadialGradient(g.canvas.width/2,g.canvas.height/2,g.canvas.height*.3,g.canvas.width/2,g.canvas.height/2,g.canvas.width*.7);v.addColorStop(0,'#081c1e00');v.addColorStop(1,'#071a2480');c.fillStyle=v;c.fillRect(0,0,g.canvas.width,g.canvas.height);
    this.drawMinimap();
  }
  private drawEntity(e:Entity){
    const c=this.c,g=this.game,t=g.time;
    if(e.kind==='hero'){
      const h=heroById(e.hero),s=h.skins[e.skin];
      c.fillStyle='#152d2c80';c.beginPath();c.ellipse(e.x,e.y+3,24,9,0,0,7);c.fill();
      if(e.buff>0){c.strokeStyle='#f4cd9180';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y,33,16,t*.5,0,7);c.stroke();}
      heroSprite(c,e.x,e.y,1,h,s,t+(e.id*.5),e.facing,e.anim,e.moving>0);
      if(e.shield>0){c.strokeStyle=s.glow+'80';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y-31,35,47,0,0,7);c.stroke();}
      if(e.stun>0){c.fillStyle='#f1d98b';for(let i=0;i<3;i++){const a=t*4+i*2.1;c.fillRect(e.x+Math.cos(a)*18-2,e.y-82+Math.sin(a)*5,5,5);}}
      if(e.recall>0){c.strokeStyle='#a5dbe4';c.lineWidth=3;c.beginPath();c.ellipse(e.x,e.y,45,21,0,t*3,t*3+Math.PI*1.7);c.stroke();c.globalAlpha=.25;c.fillStyle='#aadbe4';c.fillRect(e.x-22,e.y-110,44,110);c.globalAlpha=1;}
    }else if(e.kind==='tower')tower(c,e.x,e.y,e.team,false,t);
    else if(e.kind==='core')core(c,e.x,e.y,e.team,t);
    else if(e.kind==='minion')minion(c,e.x,e.y,e.team,e.ranged,t+e.id);
    else monster(c,e.x,e.y,e.tier===1,t);
  }
  private healthBar(e:Entity){
    const c=this.c,g=this.game;
    if(e.kind==='monster'&&e.hp===e.maxHp&&e.tier===0)return;
    const hero=e.kind==='hero',large=e.kind==='tower'||e.kind==='core',width=hero?72:large?82:e.tier?100:38;
    const yy=e.y-(hero?85:large?145:e.kind==='monster'?(e.tier?124:82):49);
    const col=e.team===0?'#b8e6bb':e.team===1?'#e49b89':'#d8c69c',height=hero?7:large?7:4;
    c.fillStyle='#142a2b';c.fillRect(e.x-width/2-2,yy-2,width+4,height+4);c.fillStyle='#31443d';c.fillRect(e.x-width/2,yy,width,height);c.fillStyle=col;c.fillRect(e.x-width/2,yy,width*e.hp/e.maxHp,height);
    if(e.shield>0){c.fillStyle='#d5e9e5';c.fillRect(e.x-width/2,yy-3,Math.min(width,width*e.shield/e.maxHp),2);}
    if(hero){
      c.fillStyle='#162a28';c.fillRect(e.x-width/2-17,yy-4,15,15);c.strokeStyle='#b5c49c';c.lineWidth=1;c.strokeRect(e.x-width/2-17,yy-4,15,15);c.font='bold 10px monospace';c.fillStyle='#f1ebce';c.textAlign='center';c.fillText(e.level.toString(),e.x-width/2-9,yy+7);
      c.strokeStyle='#213832';c.lineWidth=1;for(let i=1;i<Math.ceil(e.maxHp/250);i++){const xx=e.x-width/2+width*(i*250/e.maxHp);c.beginPath();c.moveTo(xx,yy);c.lineTo(xx,yy+height);c.stroke();}
      c.font=e===g.player?'bold 11px sans-serif':'10px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#182c2a';const name=e===g.player?'BẠN':e.name;c.strokeText(name,e.x,yy-9);c.fillStyle=e===g.player?'#e6f4c8':'#dbe5ce';c.fillText(name,e.x,yy-9);
    }else if(large&&!g.vulnerable(e)){
      c.fillStyle='#c5cfbb';c.font='10px monospace';c.textAlign='center';c.fillText('◆ BẢO HỘ',e.x,yy-6);
    }else if(e.tier&&e.kind==='monster'){c.font='bold 12px sans-serif';c.fillStyle='#eee0ba';c.textAlign='center';c.fillText('CỔ LONG',e.x,yy-8);}
  }
  private drawMinimap(){
    const c=this.map,g=this.game,w=g.minimap.width,h=g.minimap.height,s=w/WORLD;
    c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;c.drawImage(this.miniBG,0,0,w,h);
    for(const e of g.entities){
      if(e.dead||!g.isVisible(e))continue;const x=e.x*s,y=e.y*s;
      c.fillStyle=e.team===0?'#aee3ca':e.team===1?'#f2a092':'#c1ad8b';
      if(e.kind==='tower'){c.fillRect(x-3,y-3,6,6);c.fillStyle='#1d3531';c.fillRect(x-1,y-1,2,2);}
      else if(e.kind==='core'){c.fillRect(x-5,y-5,10,10);}
      else if(e.kind==='hero'){
        c.beginPath();c.arc(x,y,e===g.player?4.5:3.2,0,7);c.fill();c.strokeStyle=e===g.player?'#f1f2ca':'#183a33';c.lineWidth=e===g.player?1.5:1;c.stroke();
      }else if(e.kind==='minion'){c.globalAlpha=.7;c.fillRect(x-1,y-1,2,2);c.globalAlpha=1;}
      else if(e.tier){c.fillStyle='#d9c49b';c.save();c.translate(x,y);c.rotate(.8);c.fillRect(-4,-4,8,8);c.restore();}
    }
    const vw=this.width/this.zoom*s,vh=this.height/this.zoom*s;
    c.strokeStyle='#e8f4cf90';c.lineWidth=1;c.strokeRect(this.view.x*s-vw/2,this.view.y*s-vh/2,vw,vh);
    if(g.player.moveTarget){c.strokeStyle='#d9f1a1';c.beginPath();c.arc(g.player.moveTarget.x*s,g.player.moveTarget.y*s,3,0,7);c.stroke();}
  }
}
