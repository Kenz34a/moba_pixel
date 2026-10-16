import { DatabaseSync } from 'node:sqlite';
import { randomBytes,randomUUID,scrypt as rawScrypt,timingSafeEqual,createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync,chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultConfig } from '../src/shared/config.ts';
import { HttpError,fail,integer,password as validPassword,username as validUsername,text,validateConfig,validateMatch } from './validation.mjs';

const scrypt=promisify(rawScrypt);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const safeEqual=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export async function hashPassword(value){const salt=randomBytes(24).toString('hex');const hash=await scrypt(value,salt,64,{N:16384,r:8,p:1});return `scrypt$${salt}$${hash.toString('hex')}`;}
export async function verifyPassword(value,stored){
  if(typeof value!=='string'||value.length>256)return false;
  const [algorithm,salt,expected]=stored.split('$');if(algorithm!=='scrypt'||!salt||!expected)return false;
  const actual=await scrypt(value,salt,64,{N:16384,r:8,p:1});return safeEqual(actual.toString('hex'),expected);
}
const iso=()=>new Date().toISOString();
function playerView(p){return {id:p.id,name:p.name,gold:p.gold,xp:p.xp,matches:p.matches,wins:p.wins,kills:p.kills,banned:!!p.banned,version:p.version,createdAt:p.created_at,updatedAt:p.updated_at};}

export function createStore(options={}){
  const dataDir=resolve(options.dataDir||process.env.VG_DATA_DIR||'.data');mkdirSync(dataDir,{recursive:true,mode:0o700});chmodSync(dataDir,0o700);
  const filename=resolve(dataDir,'arena.sqlite'),db=new DatabaseSync(filename);chmodSync(filename,0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_sessions(token_hash TEXT PRIMARY KEY,admin_id TEXT NOT NULL REFERENCES admins(id),csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS config(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,document TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,name TEXT NOT NULL,gold INTEGER NOT NULL,xp INTEGER NOT NULL,matches INTEGER NOT NULL,wins INTEGER NOT NULL,kills INTEGER NOT NULL,banned INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES players(id),hero TEXT NOT NULL,skin INTEGER NOT NULL,mode TEXT NOT NULL,won INTEGER NOT NULL,kills INTEGER NOT NULL,deaths INTEGER NOT NULL,assists INTEGER NOT NULL,duration INTEGER NOT NULL,gold_reward INTEGER NOT NULL,xp_reward INTEGER NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS matches_created ON matches(created_at DESC);
    CREATE INDEX IF NOT EXISTS players_updated ON players(updated_at DESC);
  `);
  const defaults=defaultConfig();db.prepare('INSERT OR IGNORE INTO config(id,revision,document,updated_at) VALUES(1,1,?,?)').run(JSON.stringify(validateConfig(defaults)),iso());
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  function audit(actor,action,target,detail={}){db.prepare('INSERT INTO audit(actor,action,target,detail,created_at) VALUES(?,?,?,?,?)').run(actor,action,target,JSON.stringify(detail),iso());}
  function getConfig(){const row=db.prepare('SELECT * FROM config WHERE id=1').get();return {...JSON.parse(row.document),revision:row.revision,updatedAt:row.updated_at};}
  function getPlayer(id){const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);return p?playerView(p):null;}
  function createSession(admin){const token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url'),expiresAt=Date.now()+8*60*60*1000;db.prepare('DELETE FROM admin_sessions WHERE expires_at<?').run(Date.now());db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,csrf,expires_at) VALUES(?,?,?,?)').run(digest(token),admin.id,csrf,expiresAt);return {token,csrf,username:admin.username,expiresAt};}
  const store={
    dataDir,close:()=>db.close(),getConfig,
    isConfigured:()=>!!db.prepare('SELECT 1 FROM admins LIMIT 1').get(),
    async createAdmin(name,value,reset=false){
      const normalized=validUsername(name);validPassword(value);const hashed=await hashPassword(value);
      transaction(()=>{const existing=db.prepare('SELECT id FROM admins WHERE username=?').get(normalized);if(existing&&!reset)fail('Tài khoản đã tồn tại. Dùng --reset nếu chủ máy chủ cần đặt lại mật khẩu.',409);if(existing){db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hashed,existing.id);db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').run(existing.id);}else db.prepare('INSERT INTO admins(id,username,password_hash,created_at) VALUES(?,?,?,?)').run(randomUUID(),normalized,hashed,iso());audit(normalized,reset?'admin.password_reset':'admin.created',normalized);});
      return {username:normalized};
    },
    async login(name,value){
      const normalized=typeof name==='string'?name.toLowerCase():'';const admin=db.prepare('SELECT * FROM admins WHERE username=?').get(normalized);
      // The dummy hash keeps unknown-account attempts on the same password-hashing path.
      const ok=await verifyPassword(value,admin?.password_hash||'scrypt$000000000000000000000000000000000000000000000000$'+('00'.repeat(64)));
      if(!admin||!ok)throw new HttpError(401,'Tên đăng nhập hoặc mật khẩu không đúng.');
      const session=createSession(admin);audit(admin.username,'admin.login',admin.username);return session;
    },
    session(token){if(!token)return null;const row=db.prepare('SELECT s.*,a.username FROM admin_sessions s JOIN admins a ON s.admin_id=a.id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),Date.now());return row?{adminId:row.admin_id,username:row.username,csrf:row.csrf,expiresAt:row.expires_at}:null;},
    logout(token,actor){db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(digest(token));audit(actor,'admin.logout',actor);},
    async changePassword(session,current,next){validPassword(next);const admin=db.prepare('SELECT * FROM admins WHERE id=?').get(session.adminId);if(!await verifyPassword(current,admin.password_hash))fail('Mật khẩu hiện tại không đúng.',401);const hashed=await hashPassword(next);transaction(()=>{db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hashed,admin.id);db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').run(admin.id);audit(admin.username,'admin.password_changed',admin.username);});},
    updateConfig(input,expected,actor){
      integer(expected,1,Number.MAX_SAFE_INTEGER,'Phiên bản');const validated=validateConfig(input);
      return transaction(()=>{const current=getConfig();if(current.revision!==expected)fail('Cấu hình đã được thay đổi ở phiên khác. Tải lại trước khi lưu.',409);const changed=Object.keys(validated).filter(key=>JSON.stringify(validated[key])!==JSON.stringify(current[key]));db.prepare('UPDATE config SET revision=revision+1,document=?,updated_at=? WHERE id=1').run(JSON.stringify(validated),iso());audit(actor,'config.updated','arena',{sections:changed,revision:current.revision+1});return getConfig();});
    },
    guest(token){if(!token)return null;const p=db.prepare('SELECT * FROM players WHERE token_hash=?').get(digest(token));return p?playerView(p):null;},
    createGuest(seed={}){
      const num=(v,max,fallback=0)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:fallback;
      const token=randomBytes(32).toString('base64url'),id=randomUUID(),date=iso();const matches=num(seed.matches,1000000),wins=Math.min(matches,num(seed.wins,1000000));
      db.prepare('INSERT INTO players(id,token_hash,name,gold,xp,matches,wins,kills,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,digest(token),'Lữ Khách',num(seed.gold,1000000000,2400),num(seed.xp,10000000),matches,wins,num(seed.kills,1000000000),date,date);
      return {token,player:getPlayer(id)};
    },
    listPlayers(query='',page=1){
      const q=query.trim().slice(0,80).replace(/[!%_]/g,'!$&'),like=`%${q}%`,offset=(page-1)*20;
      const total=db.prepare("SELECT COUNT(*) AS n FROM players WHERE name LIKE ? ESCAPE '!' OR id LIKE ? ESCAPE '!'").get(like,like).n;
      const players=db.prepare("SELECT * FROM players WHERE name LIKE ? ESCAPE '!' OR id LIKE ? ESCAPE '!' ORDER BY updated_at DESC LIMIT 20 OFFSET ?").all(like,like,offset).map(playerView);return {players,total,page,pageSize:20};
    },
    updatePlayer(id,body,actor){
      const name=text(body.name,1,30,'Tên người chơi'),gold=integer(body.gold,0,1000000000,'Vàng'),xp=integer(body.xp,0,10000000,'Kinh nghiệm'),version=integer(body.version,1,Number.MAX_SAFE_INTEGER,'Phiên bản'),reason=text(body.reason,5,300,'Lý do');if(typeof body.banned!=='boolean')fail('Trạng thái khóa không hợp lệ.');
      return transaction(()=>{const before=getPlayer(id);if(!before)fail('Không tìm thấy người chơi.',404);if(before.version!==version)fail('Hồ sơ đã được cập nhật. Tải lại trước khi lưu.',409);db.prepare('UPDATE players SET name=?,gold=?,xp=?,banned=?,version=version+1,updated_at=? WHERE id=?').run(name,gold,xp,body.banned?1:0,iso(),id);audit(actor,'player.updated',id,{reason,before:{name:before.name,gold:before.gold,xp:before.xp,banned:before.banned},after:{name,gold,xp,banned:body.banned}});return getPlayer(id);});
    },
    recordMatch(playerId,input){
      const report=validateMatch(input);
      return transaction(()=>{
        const p=getPlayer(playerId);if(!p)fail('Không tìm thấy hồ sơ.',404);if(p.banned)fail('Hồ sơ này đã bị khóa.',403);
        const duplicate=db.prepare('SELECT * FROM matches WHERE id=?').get(report.id);
        if(duplicate){if(duplicate.player_id!==playerId)fail('Mã trận đã tồn tại.',409);return {player:p,reward:{gold:duplicate.gold_reward,xp:duplicate.xp_reward},duplicate:true};}
        const rules=getConfig().match;if(rules.maintenance)fail('Máy chủ đang bảo trì. Chưa thể ghi nhận trận đấu.',503);
        const gold=report.won?rules.winReward:rules.lossReward,xp=report.won?40:20,date=iso();
        db.prepare('INSERT INTO matches(id,player_id,hero,skin,mode,won,kills,deaths,assists,duration,gold_reward,xp_reward,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(report.id,playerId,report.hero,report.skin,report.mode,report.won?1:0,report.kills,report.deaths,report.assists,report.duration,gold,xp,date);
        db.prepare('UPDATE players SET gold=MIN(1000000000,gold+?),xp=MIN(10000000,xp+?),matches=matches+1,wins=wins+?,kills=kills+?,version=version+1,updated_at=? WHERE id=?').run(gold,xp,report.won?1:0,report.kills,date,playerId);
        return {player:getPlayer(playerId),reward:{gold,xp},duplicate:false};
      });
    },
    dashboard(){
      const players=db.prepare('SELECT COUNT(*) AS total,COALESCE(SUM(banned),0) AS banned,COALESCE(SUM(gold),0) AS gold FROM players').get();
      const matches=db.prepare('SELECT COUNT(*) AS total,COALESCE(SUM(won),0) AS wins,COALESCE(SUM(duration),0) AS seconds FROM matches').get();
      const recent=db.prepare('SELECT m.*,p.name AS player_name FROM matches m JOIN players p ON m.player_id=p.id ORDER BY m.created_at DESC LIMIT 10').all();
      const usage=db.prepare('SELECT hero,COUNT(*) AS matches,SUM(won) AS wins FROM matches GROUP BY hero ORDER BY matches DESC').all();
      return {players,matches,recent,usage,configRevision:getConfig().revision};
    },
    audit(page=1){return {entries:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 30 OFFSET ?').all((page-1)*30).map(e=>({...e,detail:JSON.parse(e.detail)})),total:db.prepare('SELECT COUNT(*) AS n FROM audit').get().n,page,pageSize:30};},
  };
  return store;
}
