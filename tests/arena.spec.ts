import { test, expect, Page } from '@playwright/test';

// Scenario fixtures use the development inspector; production builds never expose it.
const state=(page:Page)=>page.evaluate(()=>(window as any).__arena.snapshot());
async function start(page:Page,training=true,hero='libai',skin=0){
  await page.goto('/');
  if(hero!=='libai')await page.locator(`[data-hero="${hero}"]`).click();
  if(skin){await page.locator('#skin-switch').click();await page.locator(`[data-skin="${skin}"]`).click();}
  if(training)await page.locator('[data-mode="training"]').click();
  await page.locator('#start-match').click();
  const welcome=page.locator('#welcome-go');if(await welcome.isVisible())await welcome.click();
  await expect(page.locator('#game-canvas')).toBeVisible();
}

test('lobby: all heroes, skin equipment, guide and persisted selection',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page).toHaveTitle(/Vương Giới/);
  await expect(page.locator('.hero-tile')).toHaveCount(6);
  await page.locator('[data-hero="diaochan"]').click();
  await expect(page.locator('.hero-copy h2')).toHaveText('ĐiêuThuyền');
  await page.locator('#skin-switch').click();
  await expect(page.locator('.skin-card')).toHaveCount(3);
  await page.locator('[data-skin="1"]').click();
  await expect(page.locator('#skin-switch')).toContainText('Trọng Hạ Dạ Chi Mộng');
  await page.reload();
  await expect(page.locator('[data-hero="diaochan"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#skin-switch')).toContainText('Trọng Hạ Dạ Chi Mộng');
  await page.locator('#quick-guide').click();await expect(page.getByRole('dialog')).toContainText('Chiêu cuối mở ở cấp 4');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('standard match: 5v5, lane waves, keyboard movement and a real pause',async({page})=>{
  await start(page,false);
  const s=await state(page);
  expect(s.units.filter((e:any)=>e.kind==='hero')).toHaveLength(10);
  expect(s.units.filter((e:any)=>e.kind==='tower')).toHaveLength(12);
  expect(s.units.filter((e:any)=>e.kind==='core')).toHaveLength(2);
  expect(s.units.filter((e:any)=>e.kind==='monster')).toHaveLength(6);
  await expect(page.locator('[data-cast="2"]')).toBeDisabled();
  const x=s.player.x;await page.keyboard.down('d');await page.waitForTimeout(350);await page.keyboard.up('d');
  expect((await state(page)).player.x).toBeGreaterThan(x+45);
  await expect.poll(async()=>(await state(page)).units.filter((e:any)=>e.kind==='minion').length).toBeGreaterThanOrEqual(24);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toContainText('Một nhịp nghỉ');
  await page.keyboard.press('Tab');await expect(page.getByRole('dialog')).toBeVisible();
  const paused=(await state(page)).time;await page.waitForTimeout(300);expect((await state(page)).time).toBe(paused);
  await page.locator('#resume-match').click();await expect.poll(async()=>(await state(page)).time).toBeGreaterThan(paused);
});

test('18 outfits have unique silhouettes and their complete sprites fit inside the atlas',async({page})=>{
  await page.goto('/');
  const results=await page.evaluate(async()=>{
    const dataPath='/src/game/data.ts',artPath='/src/game/hero-art.ts';
    const {HEROES}=await import(dataPath),{heroSprite}=await import(artPath);
    return HEROES.map((hero:any)=>({hero:hero.name,models:hero.skins.map((skin:any)=>{
      const canvas=document.createElement('canvas');canvas.width=176;canvas.height=156;const c=canvas.getContext('2d')!;
      heroSprite(c,83,130,1,hero,skin,0);
      const rgba=c.getImageData(0,0,176,156).data;let hash=2166136261,count=0,clipped=false;
      for(let y=0;y<156;y++)for(let x=0;x<176;x++){
        const alpha=rgba[(y*176+x)*4+3]>0?1:0;hash=Math.imul(hash^alpha,16777619);
        if(alpha){count++;if(x===0||x===175||y===0||y===155)clipped=true;}
      }
      return {model:skin.model,hash,count,clipped};
    })}));
  });
  expect(results).toHaveLength(6);
  expect(new Set(results.flatMap((h:any)=>h.models.map((m:any)=>m.model))).size).toBe(18);
  for(const h of results){
    expect(new Set(h.models.map((m:any)=>m.hash)).size,h.hero+' must change geometry, not just colours').toBe(3);
    for(const m of h.models){expect(m.count,m.model).toBeGreaterThan(800);expect(m.clipped,m.model).toBe(false);}
  }
});

test('legacy profiles migrate hero and outfit keys while keeping career progress',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vuong-gioi-profile',JSON.stringify({hero:'nguyet',skins:{nguyet:1,phong:2},matches:10,wins:7,kills:40,gold:9000,xp:230,sound:false,shake:true,volume:22})));
  await page.goto('/');
  await expect(page.locator('[data-hero="hanxin"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#skin-switch')).toContainText('Bạch Long Ngâm');
  await page.locator('#career').click();
  await expect(page.locator('.career-stats>div').nth(0)).toContainText('10');
  await expect(page.locator('.career-stats>div').nth(1)).toContainText('7');
  await expect(page.locator('.career-gold')).toContainText('9.000');
  await page.keyboard.press('Escape');await page.locator('#start-match').click();
  expect(await page.evaluate(()=>(window as any).__arena.player.hero)).toBe('hanxin');
  expect(await page.evaluate(()=>(window as any).__arena.player.skin)).toBe(1);
});

test('shop applies stats, charges once, and disables duplicate purchases',async({page})=>{
  await start(page);await page.keyboard.press('p');
  const before=(await state(page)).player;
  await page.locator('[data-buy="blade"]').click();
  const after=(await state(page)).player;
  expect(after.gold).toBe(before.gold-500);expect(after.items).toContain('blade');
  expect(await page.evaluate(()=>(window as any).__arena.player.attack)).toBeGreaterThan(114);
  await expect(page.locator('[data-buy="blade"]')).toBeDisabled();
  await expect(page.locator('[data-buy="blade"]')).toContainText('ĐÃ SỞ HỮU');
  await page.keyboard.press('Escape');await page.keyboard.press('1');
  await expect.poll(async()=>(await state(page)).player.items.length).toBe(2);
});

for(const hero of ['libai','diaochan','hanxin','houyi','lvbu','daqiao']){
  test(`${hero}: all three skills execute their damage / support effects and cooldowns`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await start(page,true,hero,2);
    expect(await page.evaluate(()=>(window as any).__arena.player.hero)).toBe(hero);
    expect(await page.evaluate(()=>(window as any).__arena.player.skin)).toBe(2);
    for(let index=0;index<3;index++){
      await page.evaluate(({index})=>{
        const g=(window as any).__arena,p=g.player;
        g.entities.filter((e:any)=>e.kind==='hero'&&e!==p).forEach((e:any)=>{e.stun=999;});
        const target=g.entities.find((e:any)=>e.kind==='hero'&&e.team===1);
        target.x=1610;target.y=1500;target.maxHp=10000;target.hp=10000;target.dead=false;
        p.x=1500;p.y=1500;p.hp=p.maxHp-500;p.cooldown=999;p.moveTarget=null;p.focus=0;p.shield=0;p.cd[index]=0;
        g.camera.x=1500;g.camera.y=1500;g.mouseSet=false;
        (window as any).__testTarget=target.id;
      },{index});
      await page.locator(`[data-cast="${index}"]`).click();
      expect((await state(page)).player.cd[index]).toBeGreaterThan(0);
      if(index===1&&['houyi','lvbu','daqiao'].includes(hero)){
        const p=(await state(page)).player;expect(p.hp).toBeGreaterThan(p.maxHp-500);
        if(hero==='lvbu'||hero==='daqiao')expect(await page.evaluate(()=>(window as any).__arena.player.shield)).toBeGreaterThan(0);
        if(hero==='houyi')expect(p.x).toBeLessThan(1400);
      }else{
        await expect.poll(()=>page.evaluate(()=>{const g=(window as any).__arena;return g.entities.find((e:any)=>e.id===(window as any).__testTarget).hp;})).toBeLessThan(10000);
      }
    }
    expect(errors).toEqual([]);
  });
}

test('AI simulation progresses through fights and objective damage over two minutes',async({page})=>{
  await start(page);
  const progress=await page.evaluate(()=>{
    const g=(window as any).__arena;
    for(let i=0;i<2400&&!g.over;i++)g.update(.05);
    return {time:g.time,score:g.score,towers:g.entities.filter((e:any)=>e.kind==='tower').map((e:any)=>e.hp),levels:g.heroes.map((e:any)=>e.level),projectiles:g.projectiles.length};
  });
  expect(progress.time).toBeGreaterThan(110);
  expect(progress.score[0]+progress.score[1]).toBeGreaterThan(0);
  expect(progress.towers.some((hp:number)=>hp<1850)).toBe(true);
  expect(Math.max(...progress.levels)).toBeGreaterThan(4);
});

test('death and respawn retain equipment while skill cooldowns keep ticking',async({page})=>{
  await start(page);await page.keyboard.press('p');await page.locator('[data-buy="boots"]').click();await page.keyboard.press('Escape');
  await page.evaluate(()=>{const g=(window as any).__arena,p=g.player;p.cd[0]=3;p.hp=1;g.damage(p,500,g.heroes.find((h:any)=>h.team===1));});
  expect((await state(page)).player.dead).toBe(true);
  await expect(page.locator('#death-overlay')).toHaveClass(/visible/);
  await page.evaluate(()=>{const g=(window as any).__arena;for(let i=0;i<300&&!g.over;i++)g.update(.05);});
  const s=await state(page);expect(s.player.dead).toBe(false);expect(s.player.cd[0]).toBe(0);expect(s.player.items).toContain('boots');expect(s.player.hp).toBe(s.player.maxHp);
});

test('recall cancels on damage and returns the hero to the fountain after four seconds',async({page})=>{
  await start(page);
  await page.evaluate(()=>{const p=(window as any).__arena.player;p.x=900;p.y=2100;p.hp=p.maxHp-500;p.focus=0;p.moveTarget=null;});
  await page.keyboard.press('b');expect(await page.evaluate(()=>(window as any).__arena.player.recall)).toBeGreaterThan(3);
  await page.evaluate(()=>{const g=(window as any).__arena;g.damage(g.player,20,g.heroes.find((h:any)=>h.team===1));});
  expect(await page.evaluate(()=>(window as any).__arena.player.recall)).toBe(0);
  await page.keyboard.press('b');
  await page.evaluate(()=>{const g=(window as any).__arena;for(let i=0;i<90;i++)g.update(.05);});
  const p=(await state(page)).player;expect(Math.hypot(p.x-360,p.y-2640)).toBeLessThan(2);expect(p.hp).toBeGreaterThan(p.maxHp-500);
});

test('core protection, victory, rewards and returning to the lobby',async({page})=>{
  await start(page);
  const protection=await page.evaluate(()=>{
    const g=(window as any).__arena,core=g.entities.find((e:any)=>e.kind==='core'&&e.team===1),p=g.player;
    g.damage(core,500,p);const protectedHp=core.hp;
    for(const tier of [2,1]){const t=g.entities.find((e:any)=>e.kind==='tower'&&e.team===1&&e.lane===1&&e.tier===tier);g.damage(t,10000,p);}
    const vulnerable=g.vulnerable(core);p.x=core.x-60;p.y=core.y+30;p.cooldown=0;p.focus=core.id;core.hp=10;
    g.entities.filter((e:any)=>e.kind==='hero'&&e!==p).forEach((e:any)=>e.stun=999);
    return {protectedHp,vulnerable};
  });
  expect(protection.protectedHp).toBe(3800);expect(protection.vulnerable).toBe(true);
  await expect(page.getByRole('dialog')).toContainText('Chiến thắng');
  await expect(page.locator('.result-reward')).toContainText('+250 vàng');
  await page.locator('#result-lobby').click();
  await expect(page.locator('#start-match')).toBeVisible();
  await page.locator('#career').click();
  await expect(page.locator('.career-stats>div').nth(0)).toContainText('1');
  await expect(page.locator('.career-stats>div').nth(1)).toContainText('1');
});

test('mobile layout, joystick and touch skills',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.locator('[data-hero="lvbu"]').tap();await page.locator('#skin-switch').tap();await page.locator('[data-skin="2"]').tap();
  await expect(page.locator('#skin-switch')).toContainText('Mạt Nhật Cơ Giáp');
  await page.locator('[data-mode="training"]').tap();await page.locator('#start-match').tap();await page.locator('#welcome-go').tap();
  expect(await page.evaluate(()=>(window as any).__arena.player.skin)).toBe(2);
  await expect(page.locator('#joystick')).toBeVisible();
  const before=(await state(page)).player.x,box=(await page.locator('#joystick').boundingBox())!;
  await page.mouse.move(box.x+box.width/2+34,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();
  expect((await state(page)).player.x).toBeGreaterThan(before+30);
  await page.locator('[data-cast="1"]').tap();expect((await state(page)).player.cd[1]).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await context.close();
});
