import './style.css';

async function boot(){
  if(location.pathname==='/admin'||location.pathname.startsWith('/admin/')){
    await import('./admin/app');
  }else{
    const {initializeGame}=await import('./game/runtime');await initializeGame();await import('./main');
  }
}
void boot().catch(()=>{
  const app=document.querySelector('#app');if(app)app.textContent='Không thể khởi động. Vui lòng tải lại trang.';
});
