import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,statSync } from 'node:fs';
import { randomBytes,randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createStore } from '../server/store.mjs';
import { createApi } from '../server/api.mjs';

const secret=()=>randomBytes(24).toString('base64url');
const report=()=>({id:randomUUID(),hero:'libai',skin:0,mode:'standard',won:true,kills:4,deaths:2,assists:3,duration:300});
function fixture(t){const dataDir=mkdtempSync('/tmp/vg-store-'),store=createStore({dataDir});t.after(()=>{store.close();rmSync(dataDir,{recursive:true,force:true});});return {store,dataDir};}
const status=code=>e=>e.status===code;

test('admin password hashes, persistent sessions, password change and CLI reset revoke sessions',async t=>{
  const {store,dataDir}=fixture(t),password=secret();await store.createAdmin('Operator',password);
  assert.equal(statSync(dataDir).mode&0o777,0o700);assert.equal(statSync(dataDir+'/arena.sqlite').mode&0o777,0o600);
  await assert.rejects(store.login('operator','incorrect'),status(401));
  const a=await store.login('operator',password),b=await store.login('operator',password);
  assert.equal(store.session(a.token).username,'operator');
  const reopened=createStore({dataDir});assert.equal(reopened.session(a.token).username,'operator');reopened.close();
  await assert.rejects(store.changePassword(store.session(a.token),'incorrect',secret()),status(401));
  await assert.rejects(store.createAdmin('operator',secret()),status(409));
  const next=secret();await store.changePassword(store.session(a.token),password,next);
  assert.equal(store.session(a.token),null);assert.equal(store.session(b.token),null);
  await assert.rejects(store.login('operator',password),status(401));
  const c=await store.login('operator',next);await store.createAdmin('operator',secret(),true);assert.equal(store.session(c.token),null);
  const audit=JSON.stringify(store.audit());assert.ok(!audit.includes(password)&&!audit.includes(next)&&!audit.includes('scrypt$'));
});

test('config validation protects roster, palettes and bounds; revisions reject stale saves',t=>{
  const {store,dataDir}=fixture(t),initial=store.getConfig();
  const invalid=mutate=>{const c=structuredClone(initial);mutate(c);assert.throws(()=>store.updateConfig(c,c.revision,'operator'),status(400));};
  invalid(c=>Object.values(c.heroes).forEach(h=>h.enabled=false));
  invalid(c=>c.skins.libai.forEach(s=>s.enabled=false));
  invalid(c=>c.heroes.libai.hp=10001);invalid(c=>c.heroes.libai.name='<script>');
  invalid(c=>c.skins.libai[0].glow='url(evil)');invalid(c=>c.match.waveInterval=0);
  const updated=store.updateConfig({...initial,match:{...initial.match,winReward:777}},initial.revision,'operator');
  assert.equal(updated.revision,initial.revision+1);assert.equal(updated.match.winReward,777);
  assert.throws(()=>store.updateConfig(initial,initial.revision,'operator'),status(409));
  const reopened=createStore({dataDir});assert.equal(reopened.getConfig().match.winReward,777);reopened.close();
});

test('player search escapes LIKE wildcards; admin updates require a reason and current version',t=>{
  const {store}=fixture(t),{player,token}=store.createGuest({gold:9000,xp:230,matches:10,wins:7,kills:40});
  assert.equal(store.guest(token).gold,9000);assert.equal(store.listPlayers().total,1);
  assert.equal(store.listPlayers('%').total,0);assert.equal(store.listPlayers('_').total,0);
  assert.equal(store.listPlayers(player.id.slice(0,8)).total,1);
  const body={...player,name:'Kiếm Khách',gold:12000,xp:450,banned:false,reason:'Điều chỉnh thử nghiệm'};
  assert.throws(()=>store.updatePlayer(player.id,{...body,reason:''},'operator'),status(400));
  const updated=store.updatePlayer(player.id,body,'operator');assert.equal(updated.version,player.version+1);assert.equal(updated.matches,10);
  assert.throws(()=>store.updatePlayer(player.id,body,'operator'),status(409));
  assert.equal(store.listPlayers('Kiếm Khách').total,1);
  assert.equal(store.audit().entries[0].detail.reason,body.reason);
});

test('server calculates rewards once, denies other guests, banned players and maintenance',t=>{
  const {store}=fixture(t),a=store.createGuest(),b=store.createGuest(),m=report();
  let config=store.getConfig();config.match.winReward=888;store.updateConfig(config,config.revision,'operator');
  const result=store.recordMatch(a.player.id,m);assert.equal(result.player.gold,a.player.gold+888);assert.equal(result.player.matches,1);assert.equal(result.player.kills,4);
  assert.equal(store.recordMatch(a.player.id,m).duplicate,true);assert.equal(store.guest(a.token).gold,result.player.gold);
  assert.throws(()=>store.recordMatch(b.player.id,m),status(409));
  assert.throws(()=>store.recordMatch(a.player.id,{...report(),kills:-1}),status(400));
  const banned=store.updatePlayer(a.player.id,{...result.player,banned:true,reason:'Khóa thử nghiệm'},'operator');
  assert.throws(()=>store.recordMatch(a.player.id,report()),status(403));
  store.updatePlayer(a.player.id,{...banned,banned:false,reason:'Mở khóa thử nghiệm'},'operator');
  config=store.getConfig();config.match.maintenance=true;store.updateConfig(config,config.revision,'operator');
  assert.throws(()=>store.recordMatch(a.player.id,report()),status(503));
  assert.equal(store.dashboard().matches.total,1);
});

test('HTTP admin authentication, cookie flags, CSRF, origin checks, logout and login throttling',async t=>{
  const dataDir=mkdtempSync('/tmp/vg-api-'),password=secret(),bootstrap=createStore({dataDir});await bootstrap.createAdmin('operator',password);bootstrap.close();
  const api=await createApi({dataDir}),server=createServer((req,res)=>void api.handle(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));api.close();rmSync(dataDir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  const call=(path,method='GET',body,headers={})=>fetch(base+'/api/'+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  assert.equal((await call('admin/players')).status,401);
  assert.equal((await call('admin/login','POST',{username:'operator',password},{origin:'https://evil.example'})).status,403);
  const login=await call('admin/login','POST',{username:'operator',password}),session=await login.json(),setCookie=login.headers.get('set-cookie'),cookie=setCookie.split(';')[0];
  assert.equal(login.status,200);assert.match(setCookie,/HttpOnly; SameSite=Strict/);assert.match(setCookie,/Path=\/api\/admin/);
  const config=(await(await call('config')).json()).config;
  assert.equal((await call('admin/config','PATCH',{config,expectedRevision:config.revision},{cookie})).status,403);
  assert.equal((await call('admin/config','PATCH',{config,expectedRevision:config.revision},{cookie,'x-vg-csrf':session.csrf,origin:'https://evil.example'})).status,403);
  assert.equal((await call('admin/config','PATCH',{config,expectedRevision:config.revision},{cookie,'x-vg-csrf':session.csrf})).status,200);
  assert.equal((await call('player/matches','POST',report())).status,401);
  const guest=await call('player/session','POST',{}),guestCookie=guest.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('admin/players','GET',undefined,{cookie:guestCookie})).status,401);
  assert.equal((await call('player/matches','POST',report(),{cookie:guestCookie})).status,200);
  assert.equal((await call('admin/logout','POST',{},{cookie,'x-vg-csrf':session.csrf})).status,200);
  assert.equal((await call('admin/dashboard','GET',undefined,{cookie})).status,401);
  for(let i=0;i<5;i++)assert.equal((await call('admin/login','POST',{username:'unknown-test',password:'incorrect'})).status,401);
  assert.equal((await call('admin/login','POST',{username:'unknown-test',password:'incorrect'})).status,429);
});

test('unconfigured API never exposes a public admin creation endpoint',async t=>{
  const dataDir=mkdtempSync('/tmp/vg-unconfigured-'),api=await createApi({dataDir});
  const server=createServer((req,res)=>void api.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));api.close();rmSync(dataDir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port+'/api/admin';
  assert.deepEqual(await(await fetch(base+'/session')).json(),{authenticated:false,configured:false});
  assert.equal((await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'operator',password:secret()})})).status,503);
  assert.equal((await fetch(base+'/create',{method:'POST'})).status,401);
});

test('admin CLI creates an operator using a supplied environment secret without printing it',async t=>{
  const dataDir=mkdtempSync('/tmp/vg-cli-'),password=secret();t.after(()=>rmSync(dataDir,{recursive:true,force:true}));
  const {stdout}=await promisify(execFile)(process.execPath,['server/admin-cli.mjs'],{env:{...process.env,VG_DATA_DIR:dataDir,VG_ADMIN_USERNAME:'operator',VG_ADMIN_PASSWORD:password}});
  assert.match(stdout,/Đã tạo tài khoản/);assert.ok(!stdout.includes(password));
  const store=createStore({dataDir});try{assert.equal((await store.login('operator',password)).username,'operator');}finally{store.close();}
});
