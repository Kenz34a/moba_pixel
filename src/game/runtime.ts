import { HEROES, type HeroDef,type HeroId } from './data';
import { defaultConfig,type ArenaConfig,type PlayerRecord,type MatchReport } from '../shared/config';

export let arenaConfig=defaultConfig();
export let serverConnected=false;
export let serverPlayer:PlayerRecord|null=null;
export const rules=arenaConfig.match;
const PROFILE='vuong-gioi-profile',OUTBOX='vuong-gioi-match-outbox';
export const roster=()=>HEROES.filter(h=>arenaConfig.heroes[h.id].enabled);
export const heroEnabled=(id:string)=>HEROES.some(h=>h.id===id)&&arenaConfig.heroes[id as HeroId].enabled;
export const skinEnabled=(hero:HeroId,index:number)=>arenaConfig.skins[hero]?.[index]?.enabled===true;
export const equippedSkin=(hero:HeroDef,index:number)=>skinEnabled(hero.id,index)?index:arenaConfig.skins[hero.id].findIndex(s=>s.enabled);
export function newMatchId(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

function applyConfig(next:ArenaConfig){
  if(!next?.heroes||!next.skins||!next.match||!next.notice||!Number.isSafeInteger(next.revision))throw new Error('Invalid server configuration');
  for(const h of HEROES){if(!next.heroes[h.id]||next.skins[h.id]?.length!==3)throw new Error('Invalid roster');}
  arenaConfig=next;Object.assign(rules,next.match);
  for(const h of HEROES){
    const cfg=next.heroes[h.id];Object.assign(h,{name:cfg.name,lore:cfg.lore,hp:cfg.hp,attack:cfg.attack,speed:cfg.speed,range:cfg.range,attackRate:cfg.attackRate});
    h.skills.forEach((s,i)=>s.cooldown=cfg.cooldowns[i]);h.skins.forEach((s,i)=>Object.assign(s,next.skins[h.id][i]));
  }
}
async function request(path:string,method='GET',body?:unknown){
  const response=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(3500)});
  const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Không thể kết nối máy chủ.'),{status:response.status});return data;
}
function localProfile(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}');}catch{return {};}}
function setPlayer(player:PlayerRecord){
  const statusChanged=serverPlayer?.banned!==player.banned;serverPlayer=player;const previous=localProfile(),patch={id:player.id,name:player.name,gold:player.gold,xp:player.xp,matches:player.matches,wins:player.wins,kills:player.kills};
  const changed=statusChanged||Object.entries(patch).some(([key,value])=>previous[key]!==value);
  try{localStorage.setItem(PROFILE,JSON.stringify({...previous,...patch}));}catch{/* Local persistence is optional. */}
  if(changed)window.dispatchEvent(new CustomEvent('vg:profile',{detail:patch}));
}
function outbox():MatchReport[]{try{const value=JSON.parse(localStorage.getItem(OUTBOX)||'[]');return Array.isArray(value)?value.slice(-50):[];}catch{return [];}}
function saveOutbox(queue:MatchReport[]){try{localStorage.setItem(OUTBOX,JSON.stringify(queue));}catch{/* Still attempt the current report. */}}
let flushing:Promise<void>|null=null;
async function flush(){
  if(flushing)return flushing;
  flushing=(async()=>{let queue=outbox();while(queue.length){const report=queue[0];const result=await request('/api/player/matches','POST',report);setPlayer(result.player);queue=outbox().filter(m=>m.id!==report.id);saveOutbox(queue);}})().finally(()=>{flushing=null;});
  return flushing;
}
export async function refreshPlayer(){
  if(!serverConnected)return;
  try{
    let result;
    try{result=await request('/api/player/me');}catch(e){if((e as {status?:number}).status!==404)throw e;result=await request('/api/player/session','POST',localProfile());}
    setPlayer(result.player);
    if(!result.player.banned)await flush();
  }catch{/* The browser game remains available offline; queued reports can retry. */}
}
export async function initializeGame(){
  try{const result=await request('/api/config');applyConfig(result.config);serverConnected=true;await refreshPlayer();}
  catch{serverConnected=false;}
}
export async function submitMatch(report:MatchReport){
  if(!serverConnected||!serverPlayer)return;
  saveOutbox([...outbox().filter(m=>m.id!==report.id),report]);
  try{await flush();}catch{window.dispatchEvent(new CustomEvent('vg:sync-pending'));}
}
