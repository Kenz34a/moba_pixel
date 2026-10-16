import './style.css';
import { HEROES, ITEMS, HeroId, LEGACY_HERO_IDS, heroById } from './game/data';
import { drawMap, drawStage, portrait } from './game/art';
import { drawHeroPreview } from './game/hero-art';
import { icon } from './game/icons';
import { audio } from './game/audio';
import { Game, GameEvent } from './game/engine';

interface Profile {hero:HeroId;skins:Record<string,number>;matches:number;wins:number;kills:number;gold:number;xp:number;sound:boolean;shake:boolean;volume:number;}
const defaults:Profile={hero:'libai',skins:{},matches:0,wins:0,kills:0,gold:2400,xp:0,sound:true,shake:true,volume:22};
function load():Profile{
  try{
    const p=JSON.parse(localStorage.getItem('vuong-gioi-profile')||'{}');
    const selected=LEGACY_HERO_IDS[p.hero]||p.hero;
    const skins:Record<string,number>={};
    if(p.skins&&typeof p.skins==='object'){
      for(const [id,index] of Object.entries(p.skins)){
        const mapped=LEGACY_HERO_IDS[id]||id;
        if(HEROES.some(h=>h.id===mapped)&&typeof index==='number'&&Number.isInteger(index)&&index>=0&&index<3)skins[mapped]=index;
      }
    }
    return {...defaults,...p,hero:HEROES.some(h=>h.id===selected)?selected:defaults.hero,skins};
  }catch{return {...defaults,skins:{}};}
}
const profile=load();let hero=heroById(profile.hero),skinIndex=Math.max(0,Math.min(2,profile.skins[hero.id]||0));
let mode:'standard'|'training'='standard',game:Game|null=null,stageFrame=0,modalOpen=false,toastTimer=0,tipIndex=0;
audio.enabled=profile.sound;audio.volume=profile.volume/100;
const app=document.querySelector<HTMLDivElement>('#app')!;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const $$=(selector:string)=>Array.from(document.querySelectorAll<HTMLElement>(selector));
const number=(n:number)=>n.toLocaleString('vi-VN');
const time=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
function save(){try{localStorage.setItem('vuong-gioi-profile',JSON.stringify(profile));}catch{/* Browsers may disallow persistence in private sessions. */}}
function click(){audio.init();audio.play('click');}
const tips=[
  ['ĐỪNG ĐI MỘT MÌNH','Để lính tiến vào tầm trụ trước, rồi mới tấn công. Trụ luôn ưu tiên lính.'],
  ['SỨC MẠNH TỪ RỪNG','Hạ Cổ Long để toàn đội nhận thêm 18% sát thương trong 75 giây.'],
  ['MỘT BƯỚC LÙI, MỘT BƯỚC TIẾN','Nhấn B để biến về. Nhà chính sẽ hồi máu cho bạn rất nhanh.'],
  ['VÀNG KHÔNG TỰ BIẾN THÀNH SỨC MẠNH','Nhấn P mở cửa hàng. Nhấn 1 để mua nhanh trang bị phù hợp.'],
];
function toast(message:string){
  let el=document.querySelector<HTMLDivElement>('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el);}
  el.innerHTML=icon('info')+`<span>${message}</span>`;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el?.classList.remove('visible'),3600);
}
function selectHero(id:HeroId){hero=heroById(id);profile.hero=id;skinIndex=Math.max(0,Math.min(2,profile.skins[id]||0));save();click();renderLobby();}
function renderLobby(){
  game?.stop();game=null;if(import.meta.env?.DEV)(window as unknown as {__arena:Game|null}).__arena=null;
  cancelAnimationFrame(stageFrame);document.querySelector('#modal-root')?.remove();modalOpen=false;document.body.classList.remove('in-game');
  app.innerHTML=`
    <header class="topbar">
      <a class="brand" href="#" aria-label="Vương Giới — Sảnh đấu"><span class="brand-mark"><i></i></span><span>VƯƠNG GIỚI<small>PIXEL ARENA</small></span></a>
      <nav class="main-nav" aria-label="Điều hướng chính">
        <button class="nav-item active" data-nav="lobby">Sảnh đấu</button><button class="nav-item" data-nav="heroes">Tướng <span>06</span></button><button class="nav-item" data-nav="skins">Trang phục</button><button class="nav-item" data-nav="guide">Cẩm nang</button>
      </nav>
      <div class="header-account"><button class="currency" id="career-gold" title="Vàng tích lũy">${icon('coin')}<span>${number(profile.gold)}</span><small>+</small></button><span class="header-divider"></span><button class="profile-button" id="career" aria-label="Hồ sơ Lữ Khách"><span class="profile-avatar">${icon('crown')}</span><span class="profile-name">Lữ Khách<small>CẤP ${1+Math.floor(profile.xp/100)}</small></span></button><button class="icon-button" id="settings" aria-label="Cài đặt">${icon('settings')}</button></div>
    </header>
    <main class="lobby">
      <div class="lobby-heading"><div><div class="eyebrow"><span class="live-dot"></span> MÙA 01 <span class="eyebrow-separator">/</span> KỶ NGUYÊN CỔ LONG</div><h1>Chiến trường đang chờ.</h1></div><button class="guide-link" id="quick-guide">${icon('book')} Lần đầu đến Vương Giới? <span>Cách chơi ${icon('chevron')}</span></button></div>
      <div class="showcase-grid">
        <section class="hero-showcase" aria-label="Tướng đang chọn: ${hero.name}">
          <canvas id="hero-stage" width="960" height="600" aria-label="Pixel art ${hero.name}"></canvas>
          <div class="stage-grain"></div><div class="stage-corner top-left"></div><div class="stage-corner bottom-right"></div>
          <div class="hero-copy"><span class="selected-label"><i></i> TƯỚNG ĐƯỢC CHỌN</span><div class="hero-role">${icon(hero.skills[0].icon)} ${hero.role}<span>•</span><span>${hero.difficulty===3?'Thử thách':hero.difficulty===2?'Linh hoạt':'Dễ làm quen'}</span></div><h2>${hero.name.split(' ').join('<br>')}</h2><p class="hero-epithet">${hero.epithet}</p><p class="hero-description">${hero.lore}</p>
            <div class="hero-abilities">${hero.skills.map((s,i)=>`<button class="ability-preview" data-ability="${i}" aria-label="${s.name}: ${s.description}">${icon(s.icon)}<kbd>${['Q','E','R'][i]}</kbd><span class="tooltip"><strong>${s.name}</strong>${s.description}<em>Hồi chiêu ${s.cooldown}s</em></span></button>`).join('')}<span class="ability-hint">Bộ kỹ năng<br><b>${hero.role==='Pháp sư'?'Phép thuật':hero.role==='Trợ thủ'?'Hỗ trợ & hồi phục':'Vật lý & khống chế'}</b></span></div>
          </div>
          <div class="stage-tag"><span>THIÊN VỰC</span><small>THÁNH ĐỊA CỔ LONG</small></div>
          <div class="hero-quote"><span>“</span>${hero.quote}</div>
          <button class="skin-switch" id="skin-switch"><span class="skin-diamond">${icon('diamond')}</span><span><small>TRANG PHỤC</small>${hero.skins[skinIndex].name}</span><span class="skin-count">0${skinIndex+1}<i>/03</i></span>${icon('chevron')}</button>
        </section>
        <aside class="match-panel">
          <div class="match-panel-heading"><span>CHỌN CHẾ ĐỘ</span><span class="ready"><i></i> SẴN SÀNG</span></div>
          <div class="map-preview"><canvas id="lobby-map" width="270" height="270"></canvas><div class="map-shade"></div><span class="map-corner-label">BẢN ĐỒ 01</span><div class="map-title"><small>CHIẾN TRƯỜNG CỔ ĐẠI</small><h3>Hẻm núi Thiên Vực</h3><span>${icon('map')} 3 đường <i>·</i> Rừng <i>·</i> Cổ Long</span></div></div>
          <div class="mode-options"><button class="mode-option ${mode==='standard'?'selected':''}" data-mode="standard"><span class="mode-radio"></span><span><strong>Đấu thường <b>5V5</b></strong><small>Chiến thuật tổ đội · Đấu với máy</small></span>${icon('sword')}</button><button class="mode-option ${mode==='training'?'selected':''}" data-mode="training"><span class="mode-radio"></span><span><strong>Luyện tập</strong><small>Cấp 4 · 2.000 vàng · Máy dễ</small></span>${icon('target')}</button></div>
          <div class="team-preview"><div class="team-avatars"><img src="${portrait(hero,skinIndex)}" alt="${hero.name}">${HEROES.filter(h=>h.id!==hero.id).slice(0,4).map(h=>`<img src="${portrait(h)}" alt="${h.name}">`).join('')}</div><span>Đồng đội AI<small>Đã sẵn sàng cùng bạn</small></span></div>
        </aside>
      </div>
      <section class="roster-section"><div class="section-caption"><h3>DÀN TƯỚNG <span>06</span></h3><button id="all-heroes">Khám phá tướng ${icon('chevron')}</button></div><div class="hero-roster">${HEROES.map(h=>`<button class="hero-tile ${h.id===hero.id?'selected':''}" data-hero="${h.id}" aria-pressed="${h.id===hero.id}"><img src="${portrait(h,profile.skins[h.id]||0)}" alt=""><span class="hero-tile-info"><strong>${h.name}</strong><small>${h.role}</small></span><span class="hero-tile-check">${icon('check')}</span></button>`).join('')}</div></section>
      <footer class="lobby-footer"><div class="lobby-tip">${icon('info')}<div><span id="tip-title">${tips[tipIndex][0]}</span><p id="tip-body">${tips[tipIndex][1]}</p></div><button class="icon-button" id="next-tip" aria-label="Mẹo tiếp theo">${icon('chevron')}</button></div><div class="start-group"><div class="start-info"><span class="live-dot"></span> ĐẤU VỚI MÁY<small>Chơi ngay · Không cần đăng nhập</small></div><button class="start-button" id="start-match"><span class="start-decor">❖</span><span>VÀO TRẬN<small>${mode==='standard'?'ĐẤU THƯỜNG · 5V5':'LUYỆN TẬP · 5V5'}</small></span>${icon('chevron')}</button></div></footer>
      <div class="lobby-bottomline"><span>VƯƠNG GIỚI © 2026 <i>—</i> Mỗi pixel, một huyền thoại.</span><span><i class="live-dot"></i> Hệ thống ổn định <b>v1.0.0</b></span></div>
    </main>`;
  drawMap($<HTMLCanvasElement>('#lobby-map').getContext('2d')!,270,270);
  const c=$<HTMLCanvasElement>('#hero-stage').getContext('2d')!;let last=0;
  const animate=(stamp:number)=>{if(stamp-last>32){drawStage(c,960,600,hero,skinIndex,stamp/1000);last=stamp;}stageFrame=requestAnimationFrame(animate);};stageFrame=requestAnimationFrame(animate);
  $$('.hero-tile').forEach(b=>b.onclick=()=>selectHero(b.dataset.hero as HeroId));
  $$('.mode-option').forEach(b=>b.onclick=()=>{mode=b.dataset.mode as typeof mode;click();renderLobby();});
  $$('.nav-item').forEach(b=>b.onclick=()=>{click();if(b.dataset.nav==='heroes')showHeroes();if(b.dataset.nav==='skins')showSkins();if(b.dataset.nav==='guide')showGuide();});
  $('#all-heroes').onclick=()=>{click();showHeroes();};$('#skin-switch').onclick=()=>{click();showSkins();};
  $('#settings').onclick=()=>{click();showSettings();};$('#quick-guide').onclick=()=>{click();showGuide();};
  $('#career').onclick=$('#career-gold').onclick=()=>{click();showCareer();};
  $('#next-tip').onclick=()=>{tipIndex=(tipIndex+1)%tips.length;$('#tip-title').textContent=tips[tipIndex][0];$('#tip-body').textContent=tips[tipIndex][1];click();};
  $$('.ability-preview').forEach(b=>b.onclick=()=>{click();const s=hero.skills[Number(b.dataset.ability)];toast(`${s.name} · ${s.description}`);});
  $('#start-match').onclick=()=>{click();startMatch();};
  $('.brand').onclick=e=>{e.preventDefault();click();};
}

function modal(title:string,eyebrow:string,body:string,cls=''){
  document.querySelector('#modal-root')?.remove();modalOpen=true;
  if(game&&!game.over)game.setPaused(true);
  const root=document.createElement('div');root.id='modal-root';root.className='modal-backdrop';root.innerHTML=`<section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${title}" tabindex="-1"><header class="modal-header"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div><button class="icon-button close-modal" aria-label="Đóng">${icon('close')}</button></header><div class="modal-content">${body}</div></section>`;
  document.body.append(root);$('.close-modal').onclick=closeModal;root.addEventListener('pointerdown',e=>{if(e.target===root&&!game?.over)closeModal();});
  $('.modal').focus();
}
function closeModal(){if(game?.over)return;document.querySelector('#modal-root')?.remove();modalOpen=false;if(game)game.setPaused(false);}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!game&&modalOpen)closeModal();
  if(e.key==='Tab'&&modalOpen){const buttons=Array.from(document.querySelectorAll<HTMLElement>('#modal-root button:not(:disabled),#modal-root input'));if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1)!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
function showHeroes(){
  modal('Chọn huyền thoại của bạn','06 TƯỚNG · 06 LỐI CHƠI',`<p class="modal-intro">Mỗi vị tướng là một cách chinh phục chiến trường. Tìm người đồng hành phù hợp với bạn.</p><div class="hero-gallery">${HEROES.map(h=>`<button class="gallery-hero ${hero.id===h.id?'selected':''}" data-pick="${h.id}" style="--hero-color:${h.skins[0].glow}"><img src="${portrait(h)}" alt="${h.name}"><span class="gallery-role">${h.role}</span><strong>${h.name}</strong><small>${h.epithet}</small><span class="gallery-stats">${['Sát thương','Chống chịu','Cơ động','Khống chế'].map((s,i)=>`<span>${s}<i><b style="width:${h.stats[i]*10}%"></b></i></span>`).join('')}</span><span class="gallery-action">${hero.id===h.id?'ĐANG CHỌN':'CHỌN TƯỚNG'} ${icon('chevron')}</span></button>`).join('')}</div>`,'wide-modal');
  $$('[data-pick]').forEach(b=>b.onclick=()=>{closeModal();selectHero(b.dataset.pick as HeroId);});
}
function showSkins(){
  modal('Diện mạo của '+hero.name,'TRANG PHỤC VƯƠNG GIẢ · PHIÊN BẢN PIXEL',`<p class="modal-intro">Chọn tạo hình đặc trưng của ${hero.name}: trang phục, kiểu tóc, vũ khí, phụ kiện và sắc màu kỹ năng. Cả ba diện mạo đều đã mở khóa.</p><div class="skin-gallery">${hero.skins.map((s,i)=>`<button class="skin-card ${skinIndex===i?'selected':''}" data-skin="${i}" data-model="${s.model}" style="--skin-color:${s.glow};--skin-bg:${s.secondary}"><span class="skin-rarity">${s.title}</span><canvas id="skin-art-${i}" width="250" height="300" aria-label="${s.name}"></canvas><h3>${s.name}</h3><small>${hero.name}</small><p class="skin-description">${s.description}</p><span class="skin-equip">${skinIndex===i?icon('check')+' ĐANG TRANG BỊ':'TRANG BỊ '+icon('chevron')}</span></button>`).join('')}</div>`,'skins-modal');
  hero.skins.forEach((s,i)=>{const c=$<HTMLCanvasElement>('#skin-art-'+i).getContext('2d')!;c.imageSmoothingEnabled=false;c.fillStyle=s.glow+'12';c.beginPath();c.arc(125,145,95,0,7);c.fill();c.strokeStyle=s.glow+'35';c.strokeRect(51,72,148,148);drawHeroPreview(c,250,300,hero,s,18);});
  $$('[data-skin]').forEach(b=>b.onclick=()=>{skinIndex=Number(b.dataset.skin);profile.skins[hero.id]=skinIndex;save();click();closeModal();renderLobby();toast('Đã trang bị '+hero.skins[skinIndex].name+'.');});
}
function showGuide(){
  modal('Sẵn sàng cho chiến trường','CẨM NANG TÂN THỦ',`<div class="guide-objective"><span>${icon('flag')}</span><div><h3>Một mục tiêu. Chiến thắng cùng nhau.</h3><p>Phá trụ ngoài → trụ trong ở một đường → nhà chính đối phương. Lính xuất hiện mỗi 24 giây. Đi cùng lính để vượt qua tầm trụ an toàn.</p></div></div><div class="guide-grid"><section><h3>DI CHUYỂN & CHIẾN ĐẤU</h3><dl class="control-list"><div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>Di chuyển tướng (hoặc phím mũi tên)</dd></div><div><dt>${icon('target')}</dt><dd>Nhấp chuột vào đất để đi, vào địch để truy đuổi. Tướng tự đánh trong tầm.</dd></div><div><dt><kbd>SPACE</kbd></dt><dd>Đứng giao chiến và tự đánh địch gần nhất</dd></div><div><dt><kbd>Q</kbd><kbd>E</kbd><kbd>R</kbd></dt><dd>Dùng kỹ năng theo con trỏ. Chiêu cuối mở ở cấp 4.</dd></div><div><dt><kbd>F</kbd><kbd>B</kbd></dt><dd>Hồi 30% máu / Biến về sau 4 giây</dd></div><div><dt><kbd>P</kbd><kbd>1</kbd></dt><dd>Cửa hàng / Mua nhanh trang bị kế tiếp</dd></div><div><dt><kbd>TAB</kbd><kbd>ESC</kbd></dt><dd>Bảng điểm / Tạm dừng</dd></div></dl><p class="touch-note">${icon('info')} Điện thoại: dùng cần điều khiển bên trái và nút kỹ năng bên phải. Chạm bản đồ nhỏ để di chuyển xa.</p></section><section class="guide-skills"><h3>${hero.name.toUpperCase()} · ${hero.role.toUpperCase()}</h3>${hero.skills.map((s,i)=>`<div class="guide-skill"><span>${icon(s.icon)}<kbd>${['Q','E','R'][i]}</kbd></span><div><h4>${s.name}<small>${s.cooldown}s</small></h4><p>${s.description}</p></div></div>`).join('')}<div class="guide-dragon">${icon('crown')}<div><strong>Chinh phục Cổ Long</strong><p>Ở rừng phía đông nam. Hạ gục để cả đội nhận vàng và +18% sát thương trong 75 giây.</p></div></div></section></div><button class="primary-button guide-done">ĐÃ HIỂU, SẴN SÀNG! ${icon('check')}</button>`,'guide-modal');
  $('.guide-done').onclick=closeModal;
}
function showSettings(){
  modal('Thiết lập trải nghiệm','CÀI ĐẶT',`<div class="settings-list"><label class="setting-row"><span>${icon('sound')}<span>Âm thanh chiến đấu<small>Hiệu ứng kỹ năng và thông báo</small></span></span><input id="sound-toggle" type="checkbox" ${profile.sound?'checked':''}><i class="toggle"></i></label><label class="setting-row volume-row"><span>Âm lượng<strong id="volume-value">${profile.volume}%</strong></span><input id="volume" type="range" min="0" max="100" value="${profile.volume}"></label><label class="setting-row"><span>${icon('bolt')}<span>Rung màn hình<small>Khi chịu sát thương và tung chiêu cuối</small></span></span><input id="shake-toggle" type="checkbox" ${profile.shake?'checked':''}><i class="toggle"></i></label><div class="settings-note">${icon('check')} Cài đặt và thành tích được lưu trên trình duyệt này.</div></div>`,'small-modal');
  $<HTMLInputElement>('#sound-toggle').onchange=e=>{profile.sound=(e.target as HTMLInputElement).checked;audio.enabled=profile.sound;if(profile.sound)audio.init();save();};
  $<HTMLInputElement>('#shake-toggle').onchange=e=>{profile.shake=(e.target as HTMLInputElement).checked;if(game)game.shakeEnabled=profile.shake;save();};
  $<HTMLInputElement>('#volume').oninput=e=>{profile.volume=Number((e.target as HTMLInputElement).value);audio.volume=profile.volume/100;$('#volume-value').textContent=profile.volume+'%';save();};
}
function showCareer(){
  modal('Hành trình của Lữ Khách','HỒ SƠ CHIẾN BINH',`<div class="career-avatar">${icon('crown')}</div><h3 class="career-title">Lữ Khách <span>Cấp ${1+Math.floor(profile.xp/100)}</span></h3><div class="career-progress"><i style="width:${profile.xp%100}%"></i></div><p class="career-xp">${profile.xp%100} / 100 kinh nghiệm đến cấp kế tiếp</p><div class="career-stats"><div><strong>${profile.matches}</strong><span>TRẬN ĐẤU</span></div><div><strong>${profile.wins}</strong><span>CHIẾN THẮNG</span></div><div><strong>${profile.kills}</strong><span>HẠ GỤC</span></div></div><div class="career-gold">${icon('coin')} ${number(profile.gold)} <span>vàng tích lũy</span></div><p class="modal-intro centered">Mỗi trận thắng nhận 250 vàng và 40 kinh nghiệm.<br>Mỗi trận hoàn tất nhận ít nhất 100 vàng và 20 kinh nghiệm.</p>`,'small-modal');
}

function startMatch(){
  lastTeamHTML='';lastLogHTML='';
  cancelAnimationFrame(stageFrame);game?.stop();document.querySelector('#modal-root')?.remove();modalOpen=false;document.body.classList.add('in-game');
  app.innerHTML=`<main class="battle" aria-label="Trận đấu Vương Giới"><canvas id="game-canvas" aria-label="Chiến trường pixel 5v5"></canvas><div class="battle-top-left"><button class="battle-brand" id="battle-menu" aria-label="Tạm dừng">${icon('pause')}<span>VƯƠNG GIỚI</span></button><span class="battle-mode">${mode==='training'?'LUYỆN TẬP':'ĐẤU THƯỜNG'} · 5V5</span></div><div class="match-score"><span class="team-blue" id="blue-score">0</span><div><span class="score-label">HẠ GỤC</span><strong id="match-timer">00:00</strong></div><span class="team-red" id="red-score">0</span></div><div class="battle-top-right"><span class="kda" title="Hạ gục / Bị hạ / Hỗ trợ">${icon('sword')}<strong id="kda">0 / 0 / 0</strong></span><button class="battle-gold" id="shop-open">${icon('coin')}<strong id="battle-gold">600</strong><span>CỬA HÀNG <kbd>P</kbd></span></button><button class="icon-button" id="score-open" aria-label="Bảng điểm">${icon('users')}</button></div><div class="battle-objective"><span class="live-dot"></span> Phá hủy nhà chính đối phương</div><div class="team-rail" id="team-rail"></div><div class="kill-feed" id="kill-feed"></div><div class="announcement" id="announcement" aria-live="polite"><span id="announce-title"></span><small id="announce-subtitle"></small></div><div class="death-overlay" id="death-overlay"><small>BẠN ĐÃ BỊ HẠ GỤC</small><strong id="respawn-timer">10</strong><span>Hồi sinh sau</span></div><div class="minimap-wrap"><div class="minimap-caption">${icon('map')} THIÊN VỰC <span>5V5</span></div><canvas id="minimap" width="240" height="240" aria-label="Bản đồ nhỏ — nhấp để di chuyển"></canvas></div><div class="battle-control-hint" id="battle-control-hint"><span><kbd>WASD</kbd> Di chuyển</span><span><kbd>Q E R</kbd> Kỹ năng</span><span><kbd>B</kbd> Biến về</span><button id="battle-help" aria-label="Hướng dẫn">${icon('help')}</button></div><div class="hero-hud"><div class="hud-portrait"><img src="${portrait(hero,skinIndex)}" alt="${hero.name}"><strong id="player-level">1</strong></div><div class="hud-main"><div class="hud-hero-name">${hero.name}<span id="hero-atk">${icon('sword')} ${hero.attack}</span></div><div class="health-track"><i id="health-fill"></i><span id="health-value"></span><b id="shield-fill"></b></div><div class="xp-track"><i id="xp-fill"></i></div><div class="hud-items" id="hud-items"></div></div><div class="hud-recall" id="recall-progress"></div></div><div class="skill-bar">${hero.skills.map((s,i)=>`<button class="skill-button ${i===2?'ultimate':''}" data-cast="${i}" aria-label="${s.name}" style="--skill-color:${hero.skins[skinIndex].glow}"><span class="skill-icon">${icon(s.icon)}</span><span class="cooldown-mask"></span><strong class="cooldown-value"></strong><kbd>${['Q','E','R'][i]}</kbd><span class="skill-name">${s.name}</span></button>`).join('')}<div class="utility-skills"><button class="utility-skill" id="heal-skill" aria-label="Hồi phục">${icon('heart')}<kbd>F</kbd><strong id="heal-cd"></strong></button><button class="utility-skill" id="recall-skill" aria-label="Biến về">${icon('home')}<kbd>B</kbd></button></div><button class="attack-button" id="attack-button" aria-label="Đánh thường">${icon('target')}<span>ĐÁNH</span></button></div><div class="joystick" id="joystick" aria-label="Cần di chuyển"><div class="joystick-ring"></div><div class="joystick-knob"></div><span>DI CHUYỂN</span></div></main>`;
  game=new Game($('#game-canvas'),$('#minimap'),hero.id,skinIndex,mode,handleGameEvent);game.shakeEnabled=profile.shake;game.onHUD=updateHUD;
  if(import.meta.env?.DEV)(window as unknown as {__arena:Game|null}).__arena=game;
  updateHUD();
  $('#battle-menu').onclick=()=>showPause();$('#shop-open').onclick=()=>showShop();$('#score-open').onclick=()=>showScore();$('#battle-help').onclick=()=>showGuide();
  $$('[data-cast]').forEach(b=>{const i=Number(b.dataset.cast);b.onclick=()=>{audio.init();game?.cast(game.player,i);updateHUD();};b.onpointerenter=()=>{if(game)game.hoverSkill=i;};b.onpointerleave=()=>{if(game)game.hoverSkill=-1;};});
  $('#heal-skill').onclick=()=>{game?.healPlayer();updateHUD();};$('#recall-skill').onclick=()=>game?.recallPlayer();
  $('#attack-button').onpointerdown=e=>{e.preventDefault();audio.init();game?.keys.add(' ');$('#attack-button').setPointerCapture(e.pointerId);};
  $('#attack-button').onpointerup=$('#attack-button').onpointercancel=()=>game?.keys.delete(' ');
  const stick=$('#joystick'),knob=$('.joystick-knob');let pointer=-1;
  const moveStick=(e:PointerEvent)=>{if(e.pointerId!==pointer||!game)return;const b=stick.getBoundingClientRect(),dx=e.clientX-(b.left+b.width/2),dy=e.clientY-(b.top+b.height/2),len=Math.hypot(dx,dy),r=Math.min(40,len);const x=dx/(len||1)*r,y=dy/(len||1)*r;knob.style.transform=`translate(${x}px,${y}px)`;game.touchVector={x:x/40,y:y/40};};
  stick.onpointerdown=e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);moveStick(e);};stick.onpointermove=moveStick;stick.onpointerup=stick.onpointercancel=()=>{pointer=-1;knob.style.transform='';if(game)game.touchVector={x:0,y:0};};
  if(profile.matches===0)showWelcome();
}
function showWelcome(){
  modal('Chào mừng đến Thiên Vực','TRẬN ĐẤU ĐẦU TIÊN',`<div class="welcome-symbol">${icon('sword')}</div><p class="welcome-copy">Bạn và 4 đồng đội AI đối đầu đội địch trên chiến trường ba đường. <strong>Phá nhà chính địch để chiến thắng.</strong></p><div class="welcome-keys"><span><kbd>W A S D</kbd>Di chuyển</span><span><kbd>Q · E · R</kbd>Kỹ năng</span><span><kbd>P</kbd>Mua trang bị</span></div><p class="modal-intro centered">Tướng tự đánh kẻ địch trong tầm. Hãy theo lính và dùng chuột để ngắm kỹ năng. Điện thoại có cần di chuyển và nút cảm ứng.</p><button class="primary-button" id="welcome-go">XUẤT CHIẾN ${icon('chevron')}</button>`,'small-modal welcome-modal');$('#welcome-go').onclick=()=>{click();closeModal();};
}
function handleGameEvent(e:GameEvent){
  if(e.type==='toast')toast(e.message!);
  else if(e.type==='pause'){if(modalOpen)closeModal();else showPause();}
  else if(e.type==='shop'){if(modalOpen)closeModal();else showShop();}
  else if(e.type==='score'){if(modalOpen)closeModal();else showScore();}
  else if(e.type==='finish')finishMatch(e.winner===0);
}
let lastTeamHTML='',lastLogHTML='';
function updateHUD(){
  if(!game)return;const g=game,p=g.player;
  $('#blue-score').textContent=g.score[0].toString();$('#red-score').textContent=g.score[1].toString();$('#match-timer').textContent=time(g.time);
  $('#kda').textContent=`${p.kills} / ${p.deaths} / ${p.assists}`;$('#battle-gold').textContent=number(p.gold);
  $('#player-level').textContent=p.level.toString();$('#hero-atk').innerHTML=icon('sword')+' '+Math.round(p.attack);
  $('#health-fill').style.width=`${p.hp/p.maxHp*100}%`;$('#health-value').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('#shield-fill').style.width=`${Math.min(100,p.shield/p.maxHp*100)}%`;
  $('#xp-fill').style.width=p.level>=15?'100%':`${p.xp/(100+p.level*35)*100}%`;
  $('#hud-items').innerHTML=Array.from({length:6},(_,i)=>{const item=ITEMS.find(t=>t.id===p.items[i]);return `<button class="hud-item ${item?'filled':''}" title="${item?item.name+' · '+item.description:'Ô trang bị '+(i+1)+' — Mở cửa hàng [P]'}" aria-label="${item?item.name:'Mở cửa hàng'}" style="color:${item?.color||''}">${item?icon(item.icon):'<span>+</span>'}</button>`;}).join('');
  $$('.hud-item').forEach(b=>b.onclick=()=>showShop());
  $('#recall-progress').classList.toggle('active',p.recall>0);$('#recall-progress').style.setProperty('--recall',`${(4-p.recall)/4*100}%`);
  $$('[data-cast]').forEach((b,i)=>{const locked=i===2&&p.level<4,cd=p.cd[i];b.classList.toggle('cooling',cd>0||locked);b.classList.toggle('locked',locked);(b as HTMLButtonElement).disabled=p.dead||locked;b.style.setProperty('--cooldown',`${cd/(hero.skills[i].cooldown*(1-Math.min(.4,p.haste)))*360}deg`);b.querySelector('.cooldown-value')!.textContent=locked?'CẤP 4':cd>0?Math.ceil(cd).toString():'';});
  const healCd=Math.max(0,g.healCooldown-g.time);$('#heal-cd').textContent=healCd>0?Math.ceil(healCd).toString():'';$('#heal-skill').classList.toggle('cooling',healCd>0);
  $('#death-overlay').classList.toggle('visible',p.dead&&!g.over);$('#respawn-timer').textContent=Math.ceil(p.respawn).toString();
  const a=g.announcement;$('#announcement').className='announcement '+(a.time>0?'visible ':'')+a.type;$('#announce-title').textContent=a.title;$('#announce-subtitle').textContent=a.subtitle;
  const teamHTML=g.heroes.filter(h=>h.team===0&&h!==p).map(h=>`<div class="teammate ${h.dead?'dead':''}" title="${heroById(h.hero).name} · ${h.name}"><img src="${portrait(heroById(h.hero),h.skin)}" alt="${heroById(h.hero).name}"><small>${h.dead?Math.ceil(h.respawn):h.level}</small><i><b style="width:${h.hp/h.maxHp*100}%"></b></i></div>`).join('');
  if(teamHTML!==lastTeamHTML){$('#team-rail').innerHTML=teamHTML;lastTeamHTML=teamHTML;}
  const logHTML=g.logs.slice(0,4).map(l=>`<div class="kill-entry ${l.team===0?'ally':'enemy'}"><strong>${l.killer}</strong>${icon('sword')}<span>${l.victim}</span></div>`).join('');if(logHTML!==lastLogHTML){$('#kill-feed').innerHTML=logHTML;lastLogHTML=logHTML;}
  $('#battle-control-hint').classList.toggle('faded',g.time>35);
}
function showShop(){
  if(!game||game.over)return;const p=game.player;
  modal('Trang bị chiến trường','CỬA HÀNG',`<div class="shop-balance"><span>${icon('coin')} Vàng hiện có <strong>${number(p.gold)}</strong></span><span>${p.items.length} / 6 trang bị</span></div><p class="modal-intro">Mua trang bị ở bất kỳ đâu. Chỉ số được cộng ngay khi mua, mỗi món sở hữu một lần.</p><div class="shop-grid">${ITEMS.map(item=>{const owned=p.items.includes(item.id);return `<button class="shop-item ${owned?'owned':''}" data-buy="${item.id}" ${owned||p.gold<item.price?'disabled':''}><span class="shop-item-icon" style="color:${item.color}">${icon(item.icon)}</span><span><strong>${item.name}</strong><small>${item.description}</small><b>${owned?icon('check')+' ĐÃ SỞ HỮU':icon('coin')+' '+item.price}</b></span>${owned?'':icon('chevron')}</button>`;}).join('')}</div><div class="shop-footer">${icon('info')} Gợi ý: bắt đầu với Giày phong hành và Kiếm bình minh. <kbd>1</kbd> Mua nhanh</div>`,'shop-modal');
  $$('[data-buy]').forEach(b=>b.onclick=()=>{if(game?.buy(game.player,b.dataset.buy!))showShop();});
}
function showPause(){
  if(!game||game.over)return;
  modal('Một nhịp nghỉ','TRẬN ĐẤU TẠM DỪNG',`<div class="pause-symbol">${icon('pause')}</div><p class="modal-intro centered">Trận đấu sẽ tiếp tục khi bạn sẵn sàng.</p><div class="pause-actions"><button class="primary-button" id="resume-match">TIẾP TỤC ${icon('play')}</button><button class="secondary-button" id="pause-settings">${icon('settings')} Cài đặt</button><button class="secondary-button" id="pause-guide">${icon('book')} Cách chơi</button><button class="text-button danger" id="leave-match">Rời trận đấu</button></div>`,'small-modal');
  $('#resume-match').onclick=closeModal;$('#pause-settings').onclick=showSettings;$('#pause-guide').onclick=showGuide;$('#leave-match').onclick=()=>confirmLeave();
}
function confirmLeave(){modal('Trở về sảnh đấu?','RỜI TRẬN',`<p class="modal-intro">Tiến trình trận này sẽ kết thúc và không nhận phần thưởng. Bạn có thể bắt đầu trận mới bất cứ lúc nào.</p><div class="confirm-actions"><button class="secondary-button" id="stay-match">Ở lại chiến trường</button><button class="primary-button" id="confirm-leave">Về sảnh</button></div>`,'small-modal');$('#stay-match').onclick=showPause;$('#confirm-leave').onclick=()=>renderLobby();}
function showScore(){
  if(!game)return;const g=game;
  modal('Diễn biến chiến trường','BẢNG ĐIỂM · '+time(g.time),`<div class="scoreboard">${[0,1].map(team=>`<section class="score-team ${team===0?'ally':'enemy'}"><h3><span>${team===0?'ĐỘI NGỌC':'ĐỘI XÍCH'}</span><strong>${g.score[team]} <small>HẠ GỤC</small></strong></h3><div class="score-table-head"><span>TƯỚNG</span><span>K / D / A</span><span>VÀNG</span><span>TRANG BỊ</span></div>${g.heroes.filter(h=>h.team===team).map(h=>`<div class="score-player ${h===g.player?'you':''}"><div class="score-player-name"><img src="${portrait(heroById(h.hero),h.skin)}" alt=""><span><strong>${heroById(h.hero).name}${h===g.player?' <em>BẠN</em>':''}</strong><small>${h.name} · Cấp ${h.level}</small></span></div><span>${h.kills} / ${h.deaths} / ${h.assists}</span><span class="score-gold">${number(h.gold)}</span><span class="score-items">${h.items.map(id=>{const i=ITEMS.find(i=>i.id===id)!;return `<i title="${i.name}" style="color:${i.color}">${icon(i.icon)}</i>`;}).join('')}</span></div>`).join('')}</section>`).join('')}</div>`,'score-modal');
}
function finishMatch(win:boolean){
  if(!game)return;const p=game.player;profile.matches++;profile.wins+=win?1:0;profile.kills+=p.kills;profile.gold+=win?250:100;profile.xp+=win?40:20;save();
  modal(win?'Chiến thắng':'Hẹn ngày trở lại',win?'NHÀ CHÍNH ĐỐI PHƯƠNG ĐÃ SỤP ĐỔ':'NHÀ CHÍNH ĐỒNG MINH ĐÃ THẤT THỦ',`<div class="result-emblem ${win?'win':'loss'}">${icon(win?'trophy':'shield')}</div><p class="result-caption">${win?'Thiên Vực đã ghi tên bạn vào huyền thoại.':'Mỗi trận chiến là một bài học. Huyền thoại của bạn vẫn tiếp tục.'}</p><div class="result-stats"><div><strong>${p.kills}</strong><span>HẠ GỤC</span></div><div><strong>${p.deaths}</strong><span>BỊ HẠ</span></div><div><strong>${p.assists}</strong><span>HỖ TRỢ</span></div><div><strong>${time(game.time)}</strong><span>THỜI GIAN</span></div></div><div class="result-reward">${icon('coin')} +${win?250:100} vàng <span>+${win?40:20} kinh nghiệm</span></div><div class="confirm-actions"><button class="secondary-button" id="result-lobby">${icon('home')} Về sảnh</button><button class="primary-button" id="play-again">TRẬN KẾ TIẾP ${icon('chevron')}</button></div>`,'result-modal');
  $('.close-modal').style.display='none';$('#result-lobby').onclick=()=>renderLobby();$('#play-again').onclick=()=>{click();startMatch();};
}
renderLobby();
