import { HEROES, type HeroId } from '../game/data.ts';

export interface HeroSettings {name:string;lore:string;enabled:boolean;hp:number;attack:number;speed:number;range:number;attackRate:number;cooldowns:number[];}
export interface SkinSettings {name:string;description:string;enabled:boolean;primary:string;secondary:string;glow:string;hair:string;trim:string;}
export interface MatchSettings {startingGold:number;trainingGold:number;waveInterval:number;towerHp:number;coreHp:number;killGold:number;winReward:number;lossReward:number;maintenance:boolean;}
export interface NoticeSettings {enabled:boolean;title:string;message:string;}
export interface ArenaConfig {revision:number;updatedAt:string;heroes:Record<HeroId,HeroSettings>;skins:Record<HeroId,SkinSettings[]>;match:MatchSettings;notice:NoticeSettings;}
export interface PlayerRecord {id:string;name:string;gold:number;xp:number;matches:number;wins:number;kills:number;banned:boolean;version:number;createdAt:string;updatedAt:string;}
export interface MatchReport {id:string;hero:HeroId;skin:number;won:boolean;kills:number;deaths:number;assists:number;duration:number;mode:'standard'|'training';}

export function defaultConfig():ArenaConfig {
  return {
    revision:1,updatedAt:new Date(0).toISOString(),
    heroes:Object.fromEntries(HEROES.map(h=>[h.id,{name:h.name,lore:h.lore,enabled:true,hp:h.hp,attack:h.attack,speed:h.speed,range:h.range,attackRate:h.attackRate,cooldowns:h.skills.map(s=>s.cooldown)}])) as ArenaConfig['heroes'],
    skins:Object.fromEntries(HEROES.map(h=>[h.id,h.skins.map(s=>({name:s.name,description:s.description,enabled:true,primary:s.primary,secondary:s.secondary,glow:s.glow,hair:s.hair,trim:s.trim}))])) as ArenaConfig['skins'],
    match:{startingGold:600,trainingGold:2000,waveInterval:24,towerHp:1850,coreHp:3800,killGold:220,winReward:250,lossReward:100,maintenance:false},
    notice:{enabled:false,title:'',message:''},
  };
}
