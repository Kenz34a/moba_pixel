import { HEROES } from '../src/game/data.ts';

export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const fail=(message,status=400)=>{throw new HttpError(status,message);};
export function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)fail(`${label}: cần số nguyên từ ${min} đến ${max}.`);return value;}
function number(value,min,max,label){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(`${label}: cần số từ ${min} đến ${max}.`);return value;}
export function text(value,min,max,label){
  if(typeof value!=='string')fail(`${label} không hợp lệ.`);
  const trimmed=value.trim();
  if(trimmed.length<min||trimmed.length>max||/[<>"&\x00-\x1f]/u.test(trimmed))fail(`${label}: ${min}–${max} ký tự, không chứa mã HTML hoặc ký tự điều khiển.`);
  return trimmed;
}
function bool(value,label){if(typeof value!=='boolean')fail(`${label} không hợp lệ.`);return value;}
function color(value){if(typeof value!=='string'||!/^#[a-f0-9]{6}$/i.test(value))fail('Màu cần có dạng #RRGGBB.');return value.toLowerCase();}
export function username(value){if(typeof value!=='string'||!(/^[a-zA-Z0-9._-]{3,40}$/).test(value))fail('Tên đăng nhập gồm 3–40 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');return value.toLowerCase();}
export function password(value){if(typeof value!=='string'||value.length<12||value.length>256)fail('Mật khẩu cần từ 12 đến 256 ký tự.');return value;}
export function validateConfig(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Cấu hình không hợp lệ.');
  const heroes={},skins={};
  for(const base of HEROES){
    const h=input.heroes?.[base.id],list=input.skins?.[base.id];
    if(!h||!Array.isArray(h.cooldowns)||h.cooldowns.length!==3)fail('Thiếu dữ liệu tướng '+base.name+'.');
    heroes[base.id]={name:text(h.name,1,36,'Tên tướng'),lore:text(h.lore,1,280,'Mô tả tướng'),enabled:bool(h.enabled,'Trạng thái tướng'),hp:integer(h.hp,100,10000,'Máu'),attack:integer(h.attack,10,1000,'Công'),speed:integer(h.speed,100,450,'Tốc chạy'),range:integer(h.range,50,650,'Tầm đánh'),attackRate:number(h.attackRate,.2,3,'Chu kỳ đánh'),cooldowns:h.cooldowns.map(v=>number(v,1,120,'Hồi chiêu'))};
    if(!Array.isArray(list)||list.length!==base.skins.length)fail('Thiếu dữ liệu trang phục.');
    skins[base.id]=list.map(s=>({name:text(s.name,1,50,'Tên trang phục'),description:text(s.description,1,220,'Mô tả trang phục'),enabled:bool(s.enabled,'Trạng thái trang phục'),primary:color(s.primary),secondary:color(s.secondary),glow:color(s.glow),hair:color(s.hair),trim:color(s.trim)}));
    if(!skins[base.id].some(s=>s.enabled))fail('Mỗi tướng cần ít nhất một trang phục hoạt động.');
  }
  if(!Object.values(heroes).some(h=>h.enabled))fail('Cần ít nhất một tướng hoạt động.');
  const m=input.match||{},n=input.notice||{};
  const match={startingGold:integer(m.startingGold,0,5000,'Vàng khởi đầu'),trainingGold:integer(m.trainingGold,0,10000,'Vàng luyện tập'),waveInterval:integer(m.waveInterval,8,90,'Chu kỳ lính'),towerHp:integer(m.towerHp,300,20000,'Máu trụ'),coreHp:integer(m.coreHp,1000,50000,'Máu nhà chính'),killGold:integer(m.killGold,0,2000,'Vàng hạ gục'),winReward:integer(m.winReward,0,5000,'Thưởng thắng'),lossReward:integer(m.lossReward,0,5000,'Thưởng hoàn tất'),maintenance:bool(m.maintenance,'Bảo trì')};
  const notice={enabled:bool(n.enabled,'Thông báo'),title:text(n.title,n.enabled?1:0,60,'Tiêu đề'),message:text(n.message,n.enabled?1:0,300,'Nội dung')};
  return {heroes,skins,match,notice};
}
export function validateMatch(body){
  if(typeof body.id!=='string'||!/^[a-z0-9-]{20,60}$/i.test(body.id))fail('Mã trận không hợp lệ.');
  const h=HEROES.find(h=>h.id===body.hero);if(!h)fail('Tướng không hợp lệ.');
  if(!['standard','training'].includes(body.mode))fail('Chế độ không hợp lệ.');
  return {id:body.id,hero:h.id,skin:integer(body.skin,0,h.skins.length-1,'Trang phục'),mode:body.mode,won:bool(body.won,'Kết quả'),kills:integer(body.kills,0,250,'Hạ gục'),deaths:integer(body.deaths,0,250,'Bị hạ'),assists:integer(body.assists,0,500,'Hỗ trợ'),duration:integer(body.duration,0,36000,'Thời lượng')};
}
