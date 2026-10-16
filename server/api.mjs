import { createStore,safeEqual } from './store.mjs';
import { HttpError,fail,integer } from './validation.mjs';

function cookies(req){const result={};for(const part of (req.headers.cookie||'').split(';')){const at=part.indexOf('=');if(at>0)result[part.slice(0,at).trim()]=part.slice(at+1).trim();}return result;}
function cookie(req,name,value,path,maxAge){const secure=req.socket.encrypted||process.env.VG_COOKIE_SECURE==='true';return `${name}=${value}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;}
function respond(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
async function json(req){
  if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))fail('Yêu cầu cần dùng application/json.',415);
  let bytes=0;const chunks=[];
  for await(const chunk of req){bytes+=chunk.length;if(bytes>64*1024){req.resume();fail('Nội dung yêu cầu quá lớn.',413);}chunks.push(chunk);}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('JSON không hợp lệ.');}
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Nội dung yêu cầu không hợp lệ.');return value;
}
function sameOrigin(req){
  if(req.headers['sec-fetch-site']==='cross-site')fail('Yêu cầu khác nguồn bị từ chối.',403);
  const origin=req.headers.origin;if(!origin)return;
  try{const parsed=new URL(origin),host=new URL('http://'+req.headers.host);if(!['http:','https:'].includes(parsed.protocol)||parsed.host!==host.host)fail('Yêu cầu khác nguồn bị từ chối.',403);}catch(e){if(e instanceof HttpError)throw e;fail('Nguồn yêu cầu không hợp lệ.',403);}
}
class Limits {
  rows=new Map();
  blocked(key,max){const row=this.rows.get(key);if(!row)return false;if(row.until<Date.now()){this.rows.delete(key);return false;}return row.count>=max;}
  add(key,windowMs){if(this.rows.size>5000){for(const [k,v] of this.rows)if(v.until<Date.now())this.rows.delete(k);if(this.rows.size>5000)this.rows.delete(this.rows.keys().next().value);}
    const row=this.rows.get(key);if(!row||row.until<Date.now())this.rows.set(key,{count:1,until:Date.now()+windowMs});else row.count++;}
  clear(key){this.rows.delete(key);}
}
export async function createApi(options={}){
  const store=createStore(options),limits=new Limits();
  if(!store.isConfigured()&&process.env.VG_ADMIN_USERNAME&&process.env.VG_ADMIN_PASSWORD)await store.createAdmin(process.env.VG_ADMIN_USERNAME,process.env.VG_ADMIN_PASSWORD);
  const handle=async(req,res,next=()=>respond(res,404,{error:'Không tìm thấy.'}))=>{
    let path;
    try{path=new URL(req.url,'http://localhost').pathname;}catch{return respond(res,400,{error:'Đường dẫn không hợp lệ.'});}
    if(!path.startsWith('/api/'))return next();
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    try{
      const method=req.method||'GET',jar=cookies(req),ip=req.socket.remoteAddress||'unknown',mutating=!['GET','HEAD'].includes(method);
      if(mutating)sameOrigin(req);
      if(path==='/api/health'&&method==='GET')return respond(res,200,{ok:true,service:'vuong-gioi',version:2});
      if(path==='/api/config'&&method==='GET')return respond(res,200,{config:store.getConfig()});
      if(path==='/api/player/me'&&method==='GET'){
        const player=store.guest(jar.vg_guest);if(!player)fail('Chưa có hồ sơ khách.',404);return respond(res,200,{player});
      }
      if(path==='/api/player/session'&&method==='POST'){
        const seed=await json(req),existing=store.guest(jar.vg_guest);if(existing)return respond(res,200,{player:existing});
        const key='guest:'+ip;if(limits.blocked(key,120))fail('Bạn đang tạo quá nhiều hồ sơ. Thử lại sau.',429);limits.add(key,10*60*1000);
        const result=store.createGuest(seed);res.setHeader('Set-Cookie',cookie(req,'vg_guest',result.token,'/api/player',365*24*60*60));return respond(res,201,{player:result.player});
      }
      if(path==='/api/player/matches'&&method==='POST'){
        const player=store.guest(jar.vg_guest);if(!player)fail('Cần hồ sơ khách để lưu trận đấu.',401);
        const key='match:'+player.id;if(limits.blocked(key,60))fail('Bạn gửi kết quả quá nhanh. Thử lại sau.',429);limits.add(key,60*1000);
        return respond(res,200,store.recordMatch(player.id,await json(req)));
      }
      if(path==='/api/admin/session'&&method==='GET'){
        const session=store.session(jar.vg_admin);return respond(res,200,session?{authenticated:true,configured:true,username:session.username,csrf:session.csrf,expiresAt:session.expiresAt}:{authenticated:false,configured:store.isConfigured()});
      }
      if(path==='/api/admin/login'&&method==='POST'){
        if(!store.isConfigured())fail('Chưa có tài khoản quản trị. Chủ máy chủ cần chạy npm run admin:create.',503);
        const body=await json(req),name=typeof body.username==='string'?body.username.toLowerCase().slice(0,40):'',key=`login:${ip}:${name}`,globalKey='login-ip:'+ip;
        if(limits.blocked(key,5)||limits.blocked(globalKey,30)){res.setHeader('Retry-After','900');fail('Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.',429);}
        let session;
        try{session=await store.login(name,body.password);}catch(e){if(e.status===401){limits.add(key,15*60*1000);limits.add(globalKey,15*60*1000);}throw e;}
        limits.clear(key);res.setHeader('Set-Cookie',cookie(req,'vg_admin',session.token,'/api/admin',8*60*60));
        return respond(res,200,{authenticated:true,configured:true,username:session.username,csrf:session.csrf,expiresAt:session.expiresAt});
      }
      if(path.startsWith('/api/admin/')){
        const session=store.session(jar.vg_admin);if(!session)fail('Phiên quản trị đã hết hạn. Vui lòng đăng nhập.',401);
        if(mutating&&!safeEqual(req.headers['x-vg-csrf'],session.csrf))fail('Mã xác thực yêu cầu không hợp lệ. Tải lại trang rồi thử lại.',403);
        if(path==='/api/admin/logout'&&method==='POST'){store.logout(jar.vg_admin,session.username);res.setHeader('Set-Cookie',cookie(req,'vg_admin','','/api/admin',0));return respond(res,200,{ok:true});}
        if(path==='/api/admin/password'&&method==='POST'){const b=await json(req);await store.changePassword(session,b.currentPassword,b.newPassword);res.setHeader('Set-Cookie',cookie(req,'vg_admin','','/api/admin',0));return respond(res,200,{ok:true});}
        if(path==='/api/admin/dashboard'&&method==='GET')return respond(res,200,store.dashboard());
        if(path==='/api/admin/config'&&method==='GET')return respond(res,200,{config:store.getConfig()});
        if(path==='/api/admin/config'&&method==='PATCH'){const b=await json(req);return respond(res,200,{config:store.updateConfig(b.config,b.expectedRevision,session.username)});}
        const url=new URL(req.url,'http://localhost');
        if(path==='/api/admin/players'&&method==='GET'){const page=integer(Number(url.searchParams.get('page')||1),1,100000,'Trang');return respond(res,200,store.listPlayers(url.searchParams.get('q')||'',page));}
        const playerPath=/^\/api\/admin\/players\/([a-f0-9-]{36})$/.exec(path);
        if(playerPath&&method==='PATCH')return respond(res,200,{player:store.updatePlayer(playerPath[1],await json(req),session.username)});
        if(path==='/api/admin/audit'&&method==='GET')return respond(res,200,store.audit(integer(Number(url.searchParams.get('page')||1),1,100000,'Trang')));
      }
      fail('Không tìm thấy chức năng này.',404);
    }catch(e){
      if(res.headersSent)return;
      if(!(e instanceof HttpError))console.error('API internal error:',e.name);
      respond(res,e instanceof HttpError?e.status:500,{error:e instanceof HttpError?e.message:'Máy chủ gặp lỗi. Vui lòng thử lại.'});
    }
  };
  return {handle,close:()=>store.close()};
}
