import type { HeroDef, Skin } from './data';

type XY = [number, number];
const OUTLINE = '#17212c';
const SKIN = '#f0c5a7';
const SKIN_SHADE = '#bd8b79';
const shade = (hex:string,amount:number) => '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+amount)).toString(16).padStart(2,'0')).join('');

/** One logical pixel is rasterised before scaling, including on the large lobby stage. */
class PixelPainter {
  constructor(readonly c:CanvasRenderingContext2D,readonly skin:Skin){}
  rect(x:number,y:number,w:number,h:number,color:string){this.c.fillStyle=color;this.c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  poly(points:XY[],fill:string,outline=true){const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();if(outline){c.strokeStyle=OUTLINE;c.lineWidth=2;c.lineJoin='miter';c.stroke();}c.fillStyle=fill;c.fill();}
  line(points:XY[],color:string,width=1){const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  gem(x:number,y:number,color=this.skin.glow,size=3){this.poly([[x,y-size],[x+size,y],[x,y+size],[x-size,y]],color,false);this.rect(x-1,y-1,1,2,'#fff4de');}
  ribbon(points:XY[],color:string,width=4){this.line(points,OUTLINE,width+2);this.line(points,color,width);this.line(points.map(([x,y])=>[x,y-1]),shade(color,30),1);}
}

function legs(p:PixelPainter,step:number,kind:'cloth'|'armor'|'dress'|'mech'='cloth'){
  const s=p.skin,armored=kind==='armor'||kind==='mech';
  for(const [i,x] of [-8,4].entries()){
    const y=(i?1:-1)*step;
    p.rect(x-1,-26,9,22,OUTLINE);p.rect(x,-25,7,20,kind==='dress'?SKIN:s.secondary);
    if(armored){p.poly([[x,-22],[x+7,-22],[x+8,-8+y],[x+5,-4+y],[x,-6+y]],s.primary);p.rect(x+1,-20,2,10,s.trim);}
    const boot=kind==='dress'?s.primary:s.secondary;
    p.poly([[x-2,-9+y],[x+8,-9+y],[x+9,-2+y],[x+1,1+y],[x-3,-1+y]],boot);
    p.rect(x-1,-8+y,6,2,s.trim);p.rect(x-1,-2+y,8,1,shade(s.trim,-25));
    if(kind==='mech'){p.rect(x-1,-17+y,9,4,s.trim);p.rect(x+1,-16+y,5,1,s.glow);}
  }
}

function face(p:PixelPainter,female=false,robot=false){
  const s=p.skin;
  p.poly([[-9,-66],[7,-67],[10,-58],[7,-48],[-3,-46],[-10,-53]],robot?s.secondary:SKIN);
  if(robot){p.poly([[-10,-64],[-5,-72],[8,-70],[13,-62],[10,-52],[-8,-51]],s.primary);p.rect(-7,-60,17,5,s.secondary);p.rect(-6,-59,15,2,s.glow);p.poly([[-5,-53],[6,-53],[3,-47],[-3,-48]],s.primary);return;}
  p.rect(-9,-61,3,10,SKIN_SHADE);p.rect(-4,-49,8,2,SKIN_SHADE);
  p.rect(-6,-57,4,2,OUTLINE);p.rect(3,-58,4,2,OUTLINE);p.rect(-4,-57,1,1,s.glow);p.rect(4,-58,1,1,s.glow);
  if(female){p.rect(-7,-58,5,1,OUTLINE);p.rect(3,-59,5,1,OUTLINE);p.rect(-7,-53,3,1,'#e99a9e');p.rect(5,-53,3,1,'#e99a9e');p.rect(0,-50,3,1,'#c06c7a');}
  else{p.rect(-6,-60,5,1,shade(s.hair,-20));p.rect(3,-61,5,1,shade(s.hair,-20));p.rect(0,-51,3,1,SKIN_SHADE);}
}

function hair(p:PixelPainter,long=false,sidePart=false){
  const s=p.skin;
  if(long){p.poly([[-9,-68],[-16,-57],[-17,-29],[-11,-16],[-8,-39],[-5,-59]],shade(s.hair,-16));p.poly([[6,-69],[15,-61],[18,-31],[11,-12],[9,-37],[4,-59]],shade(s.hair,-8));}
  p.poly([[-12,-57],[-13,-67],[-8,-75],[2,-77],[10,-72],[13,-62],[8,-57],[5,-66],[-3,-64],[-8,-58]],shade(s.hair,-20));
  p.poly([[-10,-61],[-10,-68],[-6,-73],[2,-74],[8,-70],[10,-64],[5,-66],[-2,sidePart?-59:-65],[-7,-63]],s.hair,false);
  p.line([[-8,-68],[-2,-72],[4,-71]],shade(s.hair,30),2);
  if(sidePart)p.poly([[-3,-72],[6,-70],[8,-66],[-5,-60],[-8,-59],[-3,-65]],s.hair,false);
}

function featherWing(p:PixelPainter,side:number,color:string,metal=false){
  const s=p.skin;
  p.poly([[side*10,-51],[side*30,-79],[side*53,-95],[side*50,-63],[side*37,-34],[side*15,-29]],shade(color,-28));
  for(let i=0;i<6;i++){
    const x=side*(22+i*5),y=-74+i*4;
    p.poly([[side*14,-48],[x,y],[side*(56-i*3),-90+i*9],[side*(43-i*2),-51+i*4],[side*18,-30]],i%2?shade(color,-6):color);
    if(metal)p.line([[side*19,-46],[side*(43-i*2),-66+i*6]],s.trim,1);
  }
}

function batWings(p:PixelPainter){
  const s=p.skin;
  for(const side of [-1,1]){
    p.poly([[side*11,-47],[side*32,-82],[side*60,-91],[side*52,-65],[side*59,-42],[side*39,-50],[side*29,-29]],shade(s.secondary,9));
    p.poly([[side*16,-47],[side*34,-76],[side*54,-84],[side*46,-63],[side*51,-48],[side*36,-54],[side*29,-36]],s.primary,false);
    p.line([[side*15,-47],[side*34,-76],[side*46,-63],[side*36,-54],[side*29,-36]],s.trim,1);
    p.gem(side*34,-62,s.glow,3);
  }
}

function butterflyWings(p:PixelPainter){
  const s=p.skin;
  for(const side of [-1,1]){
    p.poly([[side*6,-45],[side*22,-77],[side*48,-84],[side*53,-68],[side*35,-48],[side*49,-29],[side*37,-17],[side*13,-34]],shade(s.secondary,10));
    p.poly([[side*11,-46],[side*26,-73],[side*44,-78],[side*48,-68],[side*31,-50]],'#8d91d0',false);
    p.poly([[side*13,-43],[side*32,-43],[side*43,-28],[side*36,-22]],'#b28acc',false);
    p.line([[side*13,-46],[side*37,-67],[side*43,-72]],s.glow,2);p.line([[side*17,-42],[side*34,-30]],s.trim,1);
    p.gem(side*39,-65,'#ead3ff',4);p.gem(side*33,-31,'#bdd8ff',3);
  }
}

function sword(p:PixelPainter,pose:number){
  const s=p.skin,c=p.c;c.save();c.translate(17,-30);c.rotate(pose?-.55:0);
  p.poly([[0,6],[5,5],[24,-60],[22,-70],[16,-64]],s.secondary);
  p.poly([[3,0],[5,-1],[21,-60],[21,-64],[18,-60]],'#f2eedb',false);
  p.line([[5,-7],[20,-59]],s.model==='phoenix'?'#f8bb90':s.glow,2);
  p.poly([[-4,-1],[0,-5],[13,-2],[12,2],[3,0],[0,3]],s.trim);p.rect(0,3,4,13,s.secondary);p.rect(-1,14,6,3,s.trim);p.gem(5,-2,s.glow,2);
  if(s.model==='phoenix'){p.poly([[16,-45],[24,-45],[28,-57],[23,-53],[23,-64],[19,-56]],s.trim,false);}
  c.restore();
}

function liBai(p:PixelPainter,step:number,pose:number){
  const s=p.skin,fox=s.model==='thousand-fox',phoenix=s.model==='phoenix';
  if(phoenix){featherWing(p,-1,s.primary);featherWing(p,1,s.primary);}
  if(fox){
    p.poly([[-13,-35],[-32,-47],[-46,-37],[-53,-17],[-43,-6],[-24,-14],[-15,-26]],shade(s.primary,-20));
    p.poly([[-21,-30],[-34,-39],[-43,-34],[-48,-19],[-40,-12],[-30,-17]],s.primary,false);
    p.poly([[-45,-27],[-49,-18],[-41,-11],[-29,-17],[-38,-19]],'#e4d7f0',false);
  }
  p.poly([[-11,-49],[-21,-39],[-18,-19],[-27,-2],[-9,-7],[5,-21],[8,-44]],s.secondary);
  if(phoenix)p.poly([[3,-45],[17,-38],[17,-16],[28,-6],[10,-3],[4,-23]],s.primary);
  legs(p,step);
  p.poly([[-9,-49],[9,-49],[15,-30],[8,-24],[-10,-25],[-15,-36]],s.primary);
  p.poly([[-8,-48],[-1,-39],[6,-48],[6,-34],[-1,-29],[-9,-36]],fox?'#dcd4e5':shade(s.primary,13),false);
  p.poly([[-5,-40],[2,-33],[7,-36],[8,-26],[-7,-26]],s.secondary,false);
  p.poly([[-9,-26],[-20,-5],[-10,-7],[-2,-23]],s.primary);p.poly([[4,-26],[9,-24],[18,-8],[6,-4],[1,-22]],s.primary);
  p.line([[-9,-26],[-16,-6]],s.trim,2);p.line([[9,-25],[13,-7]],s.trim,1);
  p.poly([[-9,-48],[-19,-44],[-20,-34],[-13,-31],[-10,-38]],s.primary);p.rect(-18,-34,6,12,s.secondary);p.rect(-18,-24,7,5,SKIN);
  p.poly([[9,-47],[17,-43],[20,-32],[12,-30],[8,-38]],s.primary);p.rect(13,-32,6,9,s.secondary);p.rect(13,-25,7,5,SKIN);
  p.rect(-11,-28,23,4,s.secondary);p.rect(-9,-28,18,2,s.trim);p.gem(0,-27);
  face(p);hair(p,false,true);
  if(fox){
    p.poly([[-10,-70],[-16,-86],[-4,-79]],s.hair);p.poly([[4,-76],[15,-88],[14,-67]],s.hair);p.poly([[-10,-73],[-13,-81],[-7,-78]],s.secondary,false);p.poly([[8,-76],[13,-83],[12,-71]],s.secondary,false);
    p.poly([[-14,-47],[-10,-50],[-5,-46],[0,-49],[6,-46],[10,-49],[16,-45],[10,-41],[-9,-41]],'#ddd3e5');
    p.gem(-10,-37,s.glow,2);p.gem(9,-35,s.glow,2);
  }else if(phoenix){
    p.poly([[7,-69],[15,-63],[16,-45],[24,-29],[17,-30],[9,-44],[7,-57]],s.hair);
    p.poly([[1,-72],[7,-83],[14,-86],[8,-74],[15,-78],[11,-67]],s.trim);p.line([[8,-44],[17,-22],[32,-16]],'#f0d9b7',3);
  }else{
    p.ribbon([[-10,-48],[-6,-44],[9,-46],[19,-43],[33,-45],[42,-40]],'#b3453e',5);
    p.line([[-15,-28],[-22,-22]],'#b49769',1);p.rect(-24,-24,5,5,'#735239');p.poly([[-25,-19],[-20,-21],[-15,-16],[-16,-10],[-23,-7],[-28,-12]],'#aa7b48');p.rect(-24,-18,7,2,'#d1ad72');p.rect(-24,-12,6,2,'#c3985e');
  }
  sword(p,pose);
}

function fan(p:PixelPainter,x:number,y:number,angle:number){
  const c=p.c,s=p.skin;c.save();c.translate(x,y);c.rotate(angle);
  p.poly([[0,7],[-18,-2],[-16,-12],[-8,-20],[3,-21],[14,-15],[19,-5]],s.primary);
  for(let i=0;i<5;i++)p.line([[0,7],[-15+i*7,-7-Math.sin(i/4*Math.PI)*12]],s.trim,1);
  p.poly([[-17,-3],[-15,-9],[-8,-16],[3,-17],[13,-12],[17,-5],[9,-7],[1,-10],[-8,-8]],shade(s.primary,28),false);
  p.gem(0,3,s.glow,2);c.restore();
}

function diaoChan(p:PixelPainter,step:number,pose:number){
  const s=p.skin,butterfly=s.model==='midsummer',cat=s.model==='cat-dance';
  if(butterfly)butterflyWings(p);
  else{
    p.ribbon([[-12,-43],[-30,-42],[-43,-25],[-36,-11],[-22,-15]],cat?'#ae4978':'#f3b3c6',5);
    p.ribbon([[10,-45],[30,-43],[42,-29],[35,-17],[44,-10]],cat?'#d75d7e':'#e88faf',4);
  }
  // Long hair is laid behind the shoulders and split skirt.
  p.poly([[-9,-70],[-19,-58],[-21,-33],[-13,-18],[-11,-40],[0,-62]],shade(s.hair,-15));
  p.poly([[4,-72],[16,-58],[17,-31],[24,-22],[10,-24],[5,-44]],s.hair);
  legs(p,step,'dress');
  p.poly([[-8,-48],[7,-48],[12,-37],[7,-25],[-8,-25],[-12,-38]],s.primary);
  p.poly([[-7,-48],[-1,-41],[5,-48],[6,-42],[1,-35],[-5,-36]],SKIN,false);
  p.poly([[-9,-29],[-19,-16],[-12,-6],[-2,-16],[6,-6],[19,-18],[8,-29]],s.secondary);
  p.poly([[-9,-27],[-17,-17],[-11,-10],[-2,-20],[3,-26]],s.primary,false);p.poly([[3,-26],[7,-27],[16,-18],[7,-11],[0,-20]],shade(s.primary,20),false);
  p.line([[-10,-25],[0,-22],[10,-25]],s.trim,2);p.gem(0,-23,s.glow,3);
  p.poly([[-8,-46],[-17,-48],[-28,-39],[-25,-33],[-14,-38],[-7,-40]],s.primary);p.poly([[8,-46],[17,-45],[27,-35],[24,-29],[14,-36],[7,-40]],s.primary);
  p.rect(-29,-40,6,5,SKIN);p.rect(22,-35,6,5,SKIN);
  if(butterfly){p.poly([[-7,-27],[-17,-10],[-8,-6],[-2,-18],[3,-7],[14,-11],[7,-27]],'#a294d2',false);p.gem(0,-35);}
  face(p,true);hair(p,false,false);
  p.poly([[-9,-69],[-13,-73],[-13,-80],[-6,-82],[-1,-75]],s.hair);
  p.poly([[7,-70],[10,-78],[15,-79],[18,-73],[13,-67]],s.hair);
  if(cat){
    // The cat mask sits to the side of her hair, leaving the face visible.
    p.poly([[8,-68],[7,-82],[14,-77],[20,-82],[22,-69],[17,-63]],'#e9dcea');p.line([[11,-72],[14,-70],[18,-73]],'#82517d',1);p.gem(16,-66,'#df7794',2);
    p.rect(-8,-13,6,6,s.secondary);p.rect(4,-13,6,6,s.secondary);p.line([[-8,-66],[-17,-65],[-21,-52]],'#ce8baa',2);
  }else if(butterfly){
    p.poly([[-8,-74],[-7,-83],[-2,-77],[2,-86],[6,-78],[13,-83],[11,-72]],s.trim);p.gem(2,-76,'#e9c7ff',3);
    p.line([[-10,-67],[-17,-63],[-16,-51]],s.trim,1);p.gem(-16,-50,s.glow,2);
  }else{
    for(const [x,y] of [[-10,-73],[-6,-77],[-2,-73]] as XY[])p.gem(x,y,'#f5b5ca',3);
    p.gem(-6,-72,s.trim,2);p.line([[-12,-69],[-20,-63],[-21,-54]],s.trim,1);p.rect(-22,-54,3,5,s.trim);
  }
  fan(p,-28,-43,-.8-(pose?.3:0));fan(p,27,-37,.55+(pose?.4:0));
}

function spear(p:PixelPainter,pose:number,halberd=false){
  const s=p.skin,c=p.c,tech=s.motif==='tech',dragon=s.model==='white-dragon';c.save();c.translate(15,-31);c.rotate(pose?-.7:0);
  p.line([[-13,36],[27,-63]],OUTLINE,6);p.line([[-13,36],[27,-63]],tech?s.trim:'#8f7771',3);p.line([[-11,33],[25,-62]],tech?s.glow:s.trim,1);
  if(halberd){
    p.poly([[24,-57],[24,-77],[29,-88],[33,-75],[31,-61],[44,-61],[47,-73],[48,-51],[36,-42],[32,-52]],s.primary);
    p.poly([[27,-63],[28,-78],[30,-83],[31,-74],[29,-62]],'#eff0db',false);p.poly([[33,-58],[43,-58],[45,-65],[45,-52],[37,-47]],s.trim,false);
    p.line([[34,-54],[41,-55],[43,-60]],s.glow,2);
  }else{
    p.poly([[22,-55],[23,-75],[34,-88],[32,-67],[28,-55]],dragon?'#c3eaf7':tech?s.trim:'#d8e1de');
    p.poly([[25,-61],[26,-74],[32,-83],[29,-68]],s.glow,false);
    if(dragon){p.poly([[19,-59],[12,-66],[15,-73],[22,-69],[26,-61]],s.trim);p.rect(15,-69,4,2,s.glow);}
    if(s.model==='street-fighter'){p.rect(17,-51,12,4,'#d64c43');p.line([[14,-12],[17,-18]],'#f0d8b9',4);}
  }
  if(!tech){p.ribbon([[22,-54],[30,-44],[31,-30],[25,-23]],dragon?'#8ac6e6':s.secondary,4);}
  else{p.rect(17,-47,8,4,s.glow);p.rect(21,-57,7,2,s.glow);}
  p.rect(-14,31,5,5,s.trim);c.restore();
}

function hanXin(p:PixelPainter,step:number,pose:number){
  const s=p.skin,street=s.model==='street-fighter',dragon=s.model==='white-dragon';
  p.poly([[-4,-71],[-14,-85],[-31,-91],[-29,-75],[-20,-59],[-16,-38],[-9,-43],[-9,-65]],s.hair);
  p.line([[-13,-77],[-24,-80],[-22,-67]],shade(s.hair,28),2);
  legs(p,step,street?'cloth':'armor');
  if(street){
    p.poly([[-12,-57],[-18,-54],[-17,-43],[16,-42],[18,-55],[8,-59]],shade(s.primary,-40));
    p.poly([[-10,-49],[11,-49],[15,-30],[8,-24],[-11,-25],[-15,-36]],s.primary);
    p.poly([[-11,-48],[-21,-42],[-20,-28],[-13,-26],[-11,-36]],s.primary);p.poly([[10,-48],[19,-41],[20,-29],[13,-26],[10,-37]],s.primary);
    p.rect(-19,-29,6,7,SKIN);p.rect(14,-28,6,6,SKIN);p.line([[0,-45],[0,-29]],s.secondary,1);p.rect(-6,-33,13,5,shade(s.primary,-18));p.rect(-7,-45,1,8,'#eee9d5');p.rect(5,-45,1,9,'#eee9d5');
    p.rect(-10,-8+step,9,7,'#d5ded7');p.rect(4,-8-step,11,7,'#d5ded7');p.rect(-10,-3+step,10,2,'#d5b655');p.rect(5,-3-step,10,2,'#d5b655');
  }else{
    p.poly([[-11,-47],[-16,-27],[-20,-9],[-7,-13],[1,-28],[10,-12],[20,-12],[12,-38],[7,-49]],s.secondary);
    p.poly([[-11,-51],[10,-51],[15,-37],[10,-27],[-11,-28],[-16,-40]],s.primary);
    p.poly([[-7,-48],[0,-40],[7,-48],[5,-34],[-5,-34]],shade(s.primary,-32),false);p.line([[-8,-46],[0,-37],[9,-46]],s.trim,2);
    for(const side of [-1,1]){
      p.poly([[side*10,-51],[side*21,-52],[side*26,-42],[side*17,-35],[side*11,-39]],s.primary);
      p.line([[side*15,-48],[side*21,-45],[side*18,-39]],s.trim,2);p.rect(side<0?-22:15,-35,7,11,s.primary);p.rect(side<0?-21:15,-25,7,5,SKIN);
    }
    p.rect(-12,-28,25,4,s.trim);p.gem(1,-27);
    p.poly([[-5,-25],[5,-25],[10,-9],[1,-4],[-10,-9]],s.secondary);p.line([[-6,-23],[-6,-11],[0,-7],[7,-12]],s.trim,1);
  }
  face(p);hair(p,false,true);
  if(street){p.poly([[-12,-66],[-11,-74],[7,-76],[12,-70],[10,-65]],s.secondary);p.poly([[-12,-71],[-23,-71],[-24,-67],[-11,-65]],s.primary);p.rect(-7,-74,14,2,s.primary);p.rect(1,-73,4,4,'#e6dab2');}
  else if(dragon){
    p.poly([[-12,-64],[-14,-74],[-20,-82],[-10,-78],[-4,-68]],s.trim);p.poly([[6,-69],[11,-80],[20,-86],[17,-75],[12,-65]],s.trim);
    p.line([[-8,-66],[-1,-68],[9,-67]],s.trim,2);p.gem(1,-69,s.glow,3);
    p.poly([[-23,-45],[-30,-51],[-24,-55],[-18,-50],[-15,-44]],'#c6e3e9');p.gem(-23,-49,s.glow,2);
  }else{p.rect(-8,-67,17,2,s.trim);p.gem(2,-68,s.glow,2);p.rect(-14,-77,8,4,s.trim);}
  spear(p,pose);
}

function bow(p:PixelPainter,pose:number){
  const s=p.skin,c=p.c,tech=s.model==='endless-stars';c.save();c.translate(20,-34);c.rotate(pose?-.2:0);
  p.poly([[1,-49],[17,-39],[26,-16],[27,0],[19,19],[6,31],[12,14],[17,-1],[14,-20],[7,-36]],s.secondary);
  p.poly([[2,-46],[15,-36],[22,-15],[23,0],[16,17],[8,26],[13,11],[17,-2],[13,-20],[7,-34]],s.primary,false);
  p.line([[4,-42],[12,-32],[18,-13],[19,0],[13,16]],s.trim,2);p.line([[3,-45],[-1,-9],[8,27]],s.glow,1);
  if(tech){p.poly([[15,-32],[28,-38],[23,-21],[18,-17]],s.primary);p.rect(16,-27,4,11,s.glow);p.poly([[23,3],[32,5],[20,18],[15,17]],s.primary);p.rect(21,5,3,7,s.glow);}
  else{p.poly([[13,-31],[28,-34],[22,-23],[15,-20]],s.trim);p.poly([[18,5],[31,9],[22,17],[13,18]],s.trim);}
  p.line([[-12,-10],[37,-10]],s.glow,2);p.poly([[35,-14],[44,-10],[35,-6]],'#ffefd1',false);p.rect(-14,-14,6,3,s.trim);p.rect(-14,-9,6,3,s.trim);
  c.restore();
}

function houYi(p:PixelPainter,step:number,pose:number){
  const s=p.skin,gold=s.model==='sagittarius',tech=s.model==='endless-stars';
  if(gold){featherWing(p,-1,s.primary,true);featherWing(p,1,s.primary,true);}
  else if(tech){for(const side of [-1,1]){p.poly([[side*13,-49],[side*42,-81],[side*52,-78],[side*35,-52],[side*55,-56],[side*50,-43],[side*23,-31]],s.secondary);p.line([[side*20,-47],[side*45,-74]],s.glow,2);p.line([[side*25,-42],[side*46,-49]],s.trim,2);}}
  else p.poly([[-11,-48],[-21,-33],[-20,-4],[-5,-11],[10,-3],[14,-33]],s.secondary);
  legs(p,step,'armor');
  p.poly([[-12,-51],[11,-52],[17,-36],[12,-26],[-12,-26],[-17,-38]],s.primary);
  p.poly([[-10,-46],[0,-39],[11,-46],[10,-33],[1,-29],[-10,-33]],shade(s.primary,-22),false);
  p.line([[-11,-44],[0,-38],[12,-45]],s.trim,2);p.line([[-10,-36],[0,-32],[10,-37]],s.trim,1);p.gem(0,-40,tech?s.glow:s.trim,4);
  for(const side of [-1,1]){
    p.poly([[side*10,-51],[side*21,-54],[side*29,-45],[side*24,-35],[side*14,-38]],s.primary);p.line([[side*17,-50],[side*24,-45],[side*20,-40]],s.trim,2);
    p.rect(side<0?-25:17,-36,7,11,tech?s.secondary:SKIN);p.rect(side<0?-24:17,-29,7,8,s.primary);p.rect(side<0?-23:17,-23,7,5,SKIN);
  }
  p.rect(-13,-28,26,4,s.secondary);p.poly([[-7,-29],[7,-29],[10,-20],[0,-16],[-10,-21]],s.primary);p.gem(0,-24,s.trim,3);
  face(p);hair(p,false,true);
  if(gold){p.poly([[-11,-63],[-13,-76],[-4,-80],[4,-79],[13,-73],[12,-61],[7,-65],[3,-74],[-5,-70],[-7,-61]],s.primary);p.poly([[-10,-70],[-23,-78],[-18,-62],[-11,-59]],s.trim);p.poly([[10,-71],[23,-79],[18,-62],[11,-59]],s.trim);p.gem(1,-74,s.glow,3);}
  else if(tech){p.poly([[-12,-65],[-12,-74],[0,-80],[12,-73],[13,-64],[7,-66],[0,-73],[-6,-66]],s.primary);p.rect(-9,-60,19,4,s.secondary);p.rect(-8,-59,17,2,s.glow);p.rect(10,-66,5,8,s.primary);}
  else{p.poly([[-12,-66],[-6,-72],[3,-70],[10,-64],[9,-60],[-5,-64]],s.trim);p.gem(-1,-67,s.glow,3);p.poly([[-1,-71],[0,-84],[7,-78],[7,-69]],s.primary);}
  bow(p,pose);
}

function lvBu(p:PixelPainter,step:number,pose:number){
  const s=p.skin,demon=s.model==='heavenly-demon',mech=s.model==='doomsday';
  if(demon)batWings(p);
  else if(mech){for(const side of [-1,1]){p.poly([[side*15,-53],[side*29,-70],[side*37,-65],[side*31,-41],[side*19,-34]],s.secondary);p.rect(side<0?-32:25,-63,7,13,s.primary);p.rect(side<0?-31:26,-59,5,7,s.glow);}}
  else p.poly([[-9,-66],[-21,-54],[-23,-26],[-32,-8],[-16,-9],[-6,-30],[11,-11],[24,-10],[16,-49],[5,-68]],s.hair);
  legs(p,step,mech?'mech':'armor');
  p.poly([[-15,-54],[15,-54],[23,-36],[14,-23],[-15,-23],[-23,-38]],s.primary);
  p.poly([[-13,-49],[0,-41],[13,-49],[12,-35],[0,-27],[-13,-35]],s.secondary,false);
  p.line([[-13,-46],[0,-38],[13,-47]],s.trim,3);p.line([[-12,-38],[0,-31],[12,-39]],s.trim,2);p.gem(0,-39,s.glow,4);
  for(const side of [-1,1]){
    p.poly([[side*11,-54],[side*26,-59],[side*35,-46],[side*27,-33],[side*17,-36]],s.primary);
    p.poly([[side*20,-52],[side*28,-52],[side*31,-44],[side*24,-40],[side*19,-44]],s.secondary,false);p.gem(side*25,-46,s.glow,3);
    p.rect(side<0?-29:21,-35,9,13,s.primary);p.rect(side<0?-28:21,-25,8,6,mech?s.secondary:SKIN);p.rect(side<0?-28:22,-30,6,3,s.trim);
  }
  p.rect(-17,-26,34,5,s.secondary);p.poly([[-9,-29],[8,-29],[11,-20],[1,-15],[-11,-20]],s.trim);p.gem(0,-23,s.glow,3);
  if(!mech){p.poly([[-10,-21],[0,-17],[8,-22],[19,-6],[7,-1],[-1,-8],[-9,-1],[-19,-7]],s.primary);p.line([[-11,-19],[-14,-7],[-8,-4]],s.trim,1);}
  face(p,false,mech);
  if(mech){p.poly([[-12,-63],[-16,-76],[-9,-81],[-4,-73],[9,-78],[16,-69],[13,-60],[8,-68]],s.primary);p.rect(-7,-60,17,3,s.glow);p.rect(-2,-51,6,3,s.trim);}
  else{
    hair(p,false,true);p.poly([[-12,-65],[-15,-73],[-6,-77],[0,-73],[7,-77],[15,-72],[11,-63],[5,-68],[-5,-67]],s.primary);p.line([[-9,-68],[0,-71],[9,-68]],s.trim,2);p.gem(0,-72,s.glow,3);
    if(demon){p.poly([[-9,-72],[-24,-88],[-25,-101],[-15,-90],[-2,-77]],s.secondary);p.poly([[8,-72],[23,-89],[24,-102],[14,-90],[1,-77]],s.secondary);p.line([[-19,-91],[-10,-80]],s.trim,2);p.line([[19,-92],[10,-81]],s.trim,2);p.rect(-7,-57,5,2,s.glow);p.rect(3,-58,5,2,s.glow);}
    else{
      p.ribbon([[-6,-74],[-14,-98],[-25,-110],[-40,-108],[-47,-99]],'#a84949',4);p.ribbon([[6,-74],[15,-99],[26,-111],[40,-107],[47,-97]],'#bd5653',4);p.line([[-12,-95],[-24,-106],[-37,-105]],s.trim,1);p.line([[13,-95],[26,-107],[37,-104]],s.trim,1);p.rect(-3,-48,7,2,'#38303a');
    }
  }
  spear(p,pose,true);
}

function fish(p:PixelPainter,x:number,y:number,color:string,side=1){
  const c=p.c;c.save();c.translate(x,y);c.scale(side,1);p.poly([[-8,-3],[-3,-7],[7,-4],[10,0],[5,5],[-4,4]],color);p.poly([[7,-3],[16,-9],[14,0],[17,7],[7,3]],shade(color,30));p.rect(-5,-3,2,2,OUTLINE);p.line([[-3,0],[4,1]],shade(color,35),1);c.restore();
}

function tideStaff(p:PixelPainter,pose:number){
  const s=p.skin,c=p.c;c.save();c.translate(21,-30);c.rotate(pose?-.2:0);p.line([[0,32],[7,-45]],OUTLINE,5);p.line([[0,32],[7,-45]],s.trim,2);
  if(s.model==='pet-diary'){
    p.poly([[1,-43],[-4,-54],[1,-62],[7,-58],[13,-64],[17,-55],[14,-43],[7,-40]],s.primary);p.rect(1,-53,3,2,s.secondary);p.rect(10,-53,3,2,s.secondary);p.gem(7,-46,'#d49779',2);p.rect(4,-38,6,5,s.trim);
  }else if(s.model==='white-crane'){
    p.poly([[5,-43],[-7,-48],[-12,-61],[-3,-54],[6,-55],[7,-69],[13,-75],[18,-70],[13,-64],[12,-50]],s.primary);p.poly([[7,-54],[-8,-61],[-2,-48],[9,-47]],'#d2e0da',false);p.rect(13,-72,6,2,s.trim);p.rect(11,-72,2,2,OUTLINE);p.line([[9,-45],[14,-31],[8,-23]],s.secondary,3);
  }else{
    p.poly([[5,-44],[-9,-52],[-11,-64],[-3,-59],[4,-64],[12,-55],[15,-45]],s.primary);fish(p,3,-54,s.secondary);p.gem(7,-42,s.glow,4);p.ribbon([[9,-39],[18,-27],[13,-15]],s.secondary,3);
  }
  c.restore();
}

function daQiao(p:PixelPainter,step:number,pose:number){
  const s=p.skin,pet=s.model==='pet-diary',crane=s.model==='white-crane';
  if(crane){p.poly([[-9,-68],[-20,-49],[-20,-17],[-29,-5],[-13,-10],[-8,-39],[8,-21],[18,-15],[15,-56],[6,-71]],s.hair);p.ribbon([[-14,-43],[-34,-32],[-40,-15],[-31,-7]],s.secondary,4);}
  else{
    for(const side of [-1,1]){p.poly([[side*9,-69],[side*21,-66],[side*29,-49],[side*26,-24],[side*18,-10],[side*17,-26],[side*21,-45],[side*12,-54]],s.hair);p.line([[side*19,-59],[side*24,-47],[side*22,-28]],shade(s.hair,28),2);}
  }
  legs(p,step,'dress');
  p.poly([[-8,-48],[7,-48],[12,-35],[8,-26],[-8,-25],[-13,-37]],s.primary);
  p.poly([[-7,-46],[-1,-39],[6,-46],[5,-36],[-5,-35]],pet?s.secondary:SKIN,false);
  p.poly([[-9,-28],[8,-28],[20,-7],[6,0],[-1,-8],[-7,-1],[-21,-9]],crane?s.primary:s.secondary);
  p.poly([[-7,-27],[0,-22],[6,-27],[12,-8],[4,-4],[-1,-11],[-8,-5],[-13,-10]],s.primary,false);
  p.line([[-12,-11],[-7,-6],[-1,-12],[6,-5],[13,-10]],s.trim,1);p.rect(-9,-29,18,3,s.trim);p.gem(0,-27,s.glow,3);
  p.poly([[-9,-47],[-17,-43],[-22,-30],[-15,-27],[-10,-36]],s.primary);p.poly([[9,-47],[17,-43],[20,-29],[13,-25],[9,-36]],s.primary);p.rect(-20,-29,6,6,SKIN);p.rect(14,-27,6,6,SKIN);
  if(crane){p.poly([[-14,-39],[-25,-32],[-24,-18],[-14,-24]],s.primary);p.line([[-22,-27],[-17,-30]],s.secondary,2);p.poly([[14,-40],[24,-32],[23,-18],[13,-23]],s.primary);p.line([[21,-27],[17,-30]],s.secondary,2);p.poly([[-5,-26],[-10,-4],[-1,1],[9,-5],[4,-25]],'#c5ded6',false);}
  face(p,true);hair(p,false,true);
  if(pet){
    p.poly([[-13,-67],[-14,-77],[-6,-83],[7,-82],[15,-74],[12,-65]],s.primary);p.poly([[-11,-77],[-20,-75],[-21,-61],[-15,-55],[-11,-65]],s.hair);p.poly([[10,-78],[19,-74],[21,-62],[17,-55],[12,-65]],s.hair);p.rect(-5,-76,3,2,s.secondary);p.rect(5,-76,3,2,s.secondary);p.rect(-1,-72,4,2,s.trim);
    p.rect(-7,-42,2,12,s.secondary);p.rect(6,-42,2,12,s.secondary);p.rect(-5,-24,11,7,s.secondary);p.gem(-6,-38,s.trim,2);p.gem(7,-38,s.trim,2);p.rect(-10,-9+step,9,6,'#d8ae56');p.rect(4,-9-step,10,6,'#d8ae56');
    // A corgi companion is cosmetic and has no collision or combat effects.
    p.poly([[-43,-12],[-38,-16],[-27,-16],[-21,-10],[-23,-2],[-39,-2]],'#bb8349');p.rect(-40,-6,5,7,'#eed6ad');p.rect(-27,-6,5,7,'#eed6ad');p.poly([[-41,-12],[-44,-24],[-35,-20],[-28,-25],[-26,-13],[-30,-7],[-38,-7]],'#d6a76b');p.rect(-39,-16,3,2,OUTLINE);p.rect(-31,-16,2,2,OUTLINE);p.rect(-37,-12,8,4,'#f1e6cc');p.rect(-35,-12,3,2,OUTLINE);
  }else if(crane){p.poly([[-10,-70],[-16,-77],[-4,-74],[1,-83],[6,-75],[16,-78],[9,-68]],s.trim);p.gem(2,-74,s.glow,3);p.line([[-10,-66],[-14,-56],[-13,-50]],s.trim,1);p.gem(-13,-49,s.glow,2);}
  else{
    for(const side of [-1,1]){p.poly([[side*10,-68],[side*22,-77],[side*24,-63],[side*14,-62]],s.secondary);p.poly([[side*12,-67],[side*15,-57],[side*22,-52],[side*18,-65]],s.primary);}
    p.gem(1,-72,s.trim,3);fish(p,-33,-26,'#80c6ce');
  }
  tideStaff(p,pose);
}

const cache=new Map<string,HTMLCanvasElement>();
export function heroSprite(c:CanvasRenderingContext2D,x:number,y:number,scale:number,hero:HeroDef,skin:Skin,time=0,faceDirection=1,action=0,walking=false){
  const frame=walking?Math.floor(time*12)%8:0,pose=action>0?1:0,key=`${skin.model}:${frame}:${pose}`;
  let sprite=cache.get(key);
  if(!sprite){
    sprite=document.createElement('canvas');sprite.width=176;sprite.height=156;const ctx=sprite.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.translate(83,130);
    const p=new PixelPainter(ctx,skin),step=walking?Math.round(Math.sin(frame/8*Math.PI*2)*2):0;
    switch(hero.id){case 'libai':liBai(p,step,pose);break;case 'diaochan':diaoChan(p,step,pose);break;case 'hanxin':hanXin(p,step,pose);break;case 'houyi':houYi(p,step,pose);break;case 'lvbu':lvBu(p,step,pose);break;case 'daqiao':daQiao(p,step,pose);break;}
    cache.set(key,sprite);
  }
  const bob=walking?Math.abs(Math.sin(time*12))*scale*.6:Math.sin(time*2.4)*scale*.35;
  c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y-bob));c.scale(faceDirection*scale,scale);c.drawImage(sprite,-83,-130);c.restore();
}

const boundsCache=new Map<string,{left:number;top:number;width:number;height:number}>();
export function heroBounds(hero:HeroDef,skin:Skin){
  const saved=boundsCache.get(skin.model);if(saved)return saved;
  const canvas=document.createElement('canvas');canvas.width=176;canvas.height=156;const c=canvas.getContext('2d')!;
  heroSprite(c,83,130,1,hero,skin);const pixels=c.getImageData(0,0,176,156).data;
  let left=176,right=0,top=156,bottom=0;
  for(let y=0;y<156;y++)for(let x=0;x<176;x++)if(pixels[(y*176+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const bounds={left:left-83,top:top-130,width:right-left+1,height:bottom-top+1};boundsCache.set(skin.model,bounds);return bounds;
}
export function drawHeroPreview(c:CanvasRenderingContext2D,width:number,height:number,hero:HeroDef,skin:Skin,padding=12){
  const b=heroBounds(hero,skin),scale=Math.min((width-padding*2)/b.width,(height-padding*2)/b.height);
  heroSprite(c,(width-b.width*scale)/2-b.left*scale,(height-b.height*scale)/2-b.top*scale,scale,hero,skin);
}
