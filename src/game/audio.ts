export class AudioSystem {
  ctx: AudioContext | null = null;
  enabled = true;
  volume = .22;
  private lastHit = 0;
  init() { if (!this.ctx) this.ctx = new AudioContext(); if(this.ctx.state === 'suspended') void this.ctx.resume(); }
  tone(freq:number, duration:number, type:OscillatorType='sine', gain=.2, end?:number) {
    if (!this.enabled || !this.ctx) return;
    const now=this.ctx.currentTime, osc=this.ctx.createOscillator(), amp=this.ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);
    if(end)osc.frequency.exponentialRampToValueAtTime(end,now+duration);
    amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(gain*this.volume,now+.008);
    amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(amp);amp.connect(this.ctx.destination);osc.start(now);osc.stop(now+duration);
  }
  play(kind:'click'|'attack'|'hit'|'cast'|'ultimate'|'kill'|'death'|'buy'|'level'|'victory'|'defeat'|'tower') {
    if(kind==='hit' && performance.now()-this.lastHit<60)return;
    if(kind==='hit')this.lastHit=performance.now();
    switch(kind){
      case 'click':this.tone(620,.07,'sine',.15,850);break;
      case 'attack':this.tone(200,.1,'triangle',.12,80);break;
      case 'hit':this.tone(110,.08,'square',.045,48);break;
      case 'cast':this.tone(320,.24,'triangle',.24,950);this.tone(650,.3,'sine',.15,260);break;
      case 'ultimate':this.tone(80,.7,'sawtooth',.14,240);this.tone(520,.6,'sine',.25,1400);break;
      case 'kill':[440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.2,'triangle',.2),i*70));break;
      case 'level':this.tone(660,.25,'sine',.3,1320);break;
      case 'buy':this.tone(850,.16,'sine',.2,1200);break;
      case 'death':this.tone(260,.8,'triangle',.3,60);break;
      case 'tower':this.tone(90,.5,'sawtooth',.2,35);break;
      case 'victory':[392,494,587,784,988].forEach((f,i)=>setTimeout(()=>this.tone(f,.6,'triangle',.25),i*130));break;
      case 'defeat':[330,294,262,196].forEach((f,i)=>setTimeout(()=>this.tone(f,.5,'triangle',.2),i*180));break;
    }
  }
}
export const audio = new AudioSystem();
