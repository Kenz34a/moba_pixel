import { test,expect,type APIRequestContext,type Page } from '@playwright/test';
import { randomBytes,randomUUID } from 'node:crypto';
import type { ArenaConfig } from '../src/shared/config';

const username='admin-e2e';
const password=()=>process.env.VG_E2E_PASSWORD!;
let csrf='',baseline:ArenaConfig;
async function authenticate(request:APIRequestContext,value=password()){
  const response=await request.post('/api/admin/login',{data:{username,password:value}});
  expect(response.status()).toBe(200);return (await response.json()).csrf as string;
}
async function login(page:Page){
  await page.goto('/admin');await page.locator('[name=username]').fill(username);await page.locator('[name=password]').fill(password());
  await page.locator('.admin-login-submit').click();await expect(page.locator('.admin-main h1')).toHaveText('Tổng quan');
}
async function save(request:APIRequestContext,config:ArenaConfig){
  const current=(await(await request.get('/api/admin/config')).json()).config;
  const response=await request.patch('/api/admin/config',{headers:{'X-VG-CSRF':csrf},data:{config,expectedRevision:current.revision}});
  expect(response.status()).toBe(200);return (await response.json()).config as ArenaConfig;
}
test.beforeEach(async({request})=>{csrf=await authenticate(request);baseline=(await(await request.get('/api/admin/config')).json()).config;});
test.afterEach(async({request})=>{
  csrf=await authenticate(request);
  const current=(await(await request.get('/api/admin/config')).json()).config;
  const relevant=(c:ArenaConfig)=>JSON.stringify([c.heroes,c.skins,c.match,c.notice]);
  if(relevant(current)!==relevant(baseline))await save(request,baseline);
});

test('admin login errors, real dashboard, persistent session and logout',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/admin');await expect(page.locator('h2')).toHaveText('Chào mừng trở lại.');
  await page.locator('[name=username]').fill(username);await page.locator('[name=password]').fill('incorrect');
  await page.locator('.admin-login-submit').click();await expect(page.locator('#login-error')).toContainText('không đúng');
  await page.locator('[name=password]').fill(password());await page.locator('.admin-login-submit').click();
  await expect(page.locator('.admin-metric')).toHaveCount(4);
  await page.reload();await expect(page.locator('.admin-admin-profile')).toContainText(username);
  const cookies=await page.context().cookies();expect(cookies.find(c=>c.name==='vg_admin')?.httpOnly).toBe(true);
  expect(await page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('csrf')||v.includes('scrypt$')))).toBe(false);
  await page.goto('/admin#/toString');await expect(page.locator('.admin-main h1')).toHaveText('Tổng quan');
  await page.locator('#admin-logout').click();await expect(page.locator('#admin-login-form')).toBeVisible();
  await page.reload();await expect(page.locator('#admin-login-form')).toBeVisible();expect(errors).toEqual([]);
});

test('hero editor changes actual match stats and excludes disabled heroes from player and bot rosters',async({page,request})=>{
  await login(page);await page.locator('[data-page=heroes]').click();
  await page.locator('[data-edit-hero=libai]').click();const form=page.locator('#hero-editor');
  await form.locator('[name=hp]').fill('2345');await form.locator('[name=attack]').fill('120');await form.locator('[name=cd0]').fill('9');
  await form.locator('[type=submit]').click();await expect(form).toHaveCount(0);
  let c=(await(await request.get('/api/config')).json()).config;expect(c.heroes.libai.hp).toBe(2345);
  const game=await page.context().newPage();await game.goto('/');await game.locator('#start-match').click();
  if(await game.locator('#welcome-go').isVisible())await game.locator('#welcome-go').click();
  expect(await game.evaluate(()=>(window as any).__arena.player.maxHp)).toBe(2345);
  expect(await game.evaluate(async()=>{const path='/src/game/data.ts';return(await import(path)).HEROES[0].skills[0].cooldown;})).toBe(9);
  // Exercise the smallest valid roster: all ten units must still spawn, using an enabled hero.
  for(const [id,h] of Object.entries(c.heroes) as [string,any][])h.enabled=id==='diaochan';
  await save(request,c);await game.goto('/');await expect(game.locator('.hero-tile')).toHaveCount(1);
  await game.locator('#start-match').click();
  expect(await game.evaluate(()=>(window as any).__arena.heroes.length)).toBe(10);
  expect(await game.evaluate(()=>(window as any).__arena.heroes.every((h:any)=>h.hero==='diaochan'))).toBe(true);
  await game.close();
});

test('skin editor previews new colours, persists them and falls back from a disabled outfit',async({page,request})=>{
  await login(page);await page.locator('[data-page=skins]').click();await page.locator('[data-edit-skin="0"]').click();
  const preview=page.locator('#skin-live-preview'),before=await preview.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  await page.locator('#skin-editor [name=primary]').fill('#ff0044');
  expect(await preview.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
  await page.locator('#skin-editor [name=name]').fill('Thanh Liên Hồng Ngọc');
  await page.locator('#skin-editor [type=submit]').click();await expect(page.locator('#skin-editor')).toHaveCount(0);
  const c=(await(await request.get('/api/config')).json()).config;expect(c.skins.libai[0].primary).toBe('#ff0044');
  const game=await page.context().newPage();await game.goto('/');await expect(game.locator('#skin-switch')).toContainText('Thanh Liên Hồng Ngọc');
  c.skins.libai[0].enabled=false;await save(request,c);await game.reload();
  await expect(game.locator('#skin-switch')).toContainText(c.skins.libai[1].name);
  await game.locator('#skin-switch').click();await expect(game.locator('[data-skin="0"]')).toBeDisabled();
  await game.close();
});

test('admin settings control lobby notices, maintenance and starting match resources',async({page})=>{
  await login(page);await page.locator('[data-page=settings]').click();const form=page.locator('#game-settings');
  await form.locator('[name=maintenance]').check();await form.locator('[name=notice-enabled]').check();
  await form.locator('[name=notice-title]').fill('Mùa giải mới');await form.locator('[name=notice-message]').fill('Chào mừng đến Thiên Vực.');
  await form.locator('[name=startingGold]').fill('1234');await form.locator('[name=towerHp]').fill('2400');await form.locator('[type=submit]').click();
  await expect(page.locator('#admin-toast')).toContainText('Đã lưu cấu hình');
  const game=await page.context().newPage();await game.goto('/');await expect(game.locator('#start-match')).toBeDisabled();
  await expect(game.locator('.server-notice')).toContainText('bảo trì');
  await page.locator('[name=maintenance]').uncheck();await page.locator('#game-settings [type=submit]').click();
  await expect(page.locator('#game-settings [type=submit]')).toBeEnabled();
  await game.reload();await expect(game.locator('.server-notice')).toContainText('Chào mừng đến Thiên Vực.');
  await game.locator('#start-match').click();
  const stats=await game.evaluate(()=>{const g=(window as any).__arena;return {gold:g.player.gold,hp:g.entities.find((e:any)=>e.kind==='tower').maxHp};});
  expect(stats.gold).toBeGreaterThanOrEqual(1234);expect(stats.gold).toBeLessThan(1240);expect(stats.hp).toBe(2400);await game.close();
});

test('player management syncs server records, blocks banned guests and records admin changes',async({page,request})=>{
  const guest=await page.context().newPage();await guest.goto('/');await expect(guest.locator('#start-match')).toBeEnabled();
  const player=(await(await guest.request.get('/api/player/me')).json()).player;
  const config=structuredClone(baseline);config.match.winReward=777;await save(request,config);
  const match={id:randomUUID(),hero:'libai',skin:0,won:true,kills:5,deaths:1,assists:3,duration:240,mode:'standard'};
  const result=await(await guest.request.post('/api/player/matches',{data:match})).json();expect(result.player.gold).toBe(player.gold+777);
  const duplicate=await(await guest.request.post('/api/player/matches',{data:match})).json();expect(duplicate.player.matches).toBe(1);expect(duplicate.duplicate).toBe(true);
  await login(page);await page.locator('[data-page=players]').click();await page.locator('[name=q]').fill(player.id);await page.locator('#player-search [type=submit]').click();
  await page.locator(`[data-edit-player="${player.id}"]`).click();const form=page.locator('#player-editor');
  await form.locator('[name=name]').fill('Kiếm Khách');await form.locator('[name=gold]').fill('9999');await form.locator('[name=xp]').fill('450');
  await form.locator('[name=banned]').check();await form.locator('[name=reason]').fill('Kiểm tra quản lý hồ sơ');await form.locator('[type=submit]').click();
  await expect(form).toHaveCount(0);await guest.reload();await expect(guest.locator('#start-match')).toBeDisabled();await expect(guest.locator('.server-notice')).toContainText('bị khóa');
  const synced=(await(await guest.request.get('/api/player/me')).json()).player;expect(synced.name).toBe('Kiếm Khách');expect(synced.gold).toBe(9999);expect(synced.xp).toBe(450);
  await guest.locator('#career').click();await expect(guest.locator('.career-title')).toContainText('Kiếm Khách');
  expect((await guest.request.post('/api/player/matches',{data:{...match,id:randomUUID()}})).status()).toBe(403);
  await page.locator('[data-page=audit]').click();await expect(page.locator('.admin-table')).toContainText('Chỉnh hồ sơ người chơi');
  await page.locator('details').first().locator('summary').click();await expect(page.locator('details').first()).toContainText('Kiểm tra quản lý hồ sơ');
  await guest.close();
});

test('password form validates confirmation and revokes other sessions after a successful change',async({page,request})=>{
  const next=randomBytes(24).toString('base64url');let changed=false;
  try{
    await login(page);await page.locator('[data-page=account]').click();const form=page.locator('#account-form');
    await form.locator('[name=currentPassword]').fill(password());await form.locator('[name=newPassword]').fill(next);await form.locator('[name=confirmPassword]').fill('different-password');
    await form.locator('[type=submit]').click();await expect(form.locator('[role=alert]')).toContainText('không trùng');
    await form.locator('[name=confirmPassword]').fill(next);await form.locator('[type=submit]').click();await expect(page.locator('#admin-login-form')).toBeVisible();changed=true;
    expect((await request.get('/api/admin/config')).status()).toBe(401);
    csrf=await authenticate(request,next);
  }finally{
    if(changed){const result=await request.post('/api/admin/password',{headers:{'X-VG-CSRF':csrf},data:{currentPassword:next,newPassword:password()}});expect(result.status()).toBe(200);}
  }
});

test('admin works on mobile with a collapsible menu and no horizontal page overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await login(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.locator('#admin-menu-toggle').click();await page.locator('[data-page=heroes]').click();
  await expect(page.locator('.admin-hero-card')).toHaveCount(6);await page.locator('[data-edit-hero=libai]').click();
  await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.locator('#admin-menu-toggle').click();await page.locator('[data-page=skins]').click();
  await expect(page.locator('.admin-skin-card')).toHaveCount(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
