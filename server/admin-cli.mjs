import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { createStore } from './store.mjs';

async function hidden(prompt){
  if(!stdin.isTTY)throw new Error('Cần terminal tương tác hoặc biến VG_ADMIN_PASSWORD để đặt mật khẩu.');
  stdout.write(prompt);stdin.setRawMode(true);stdin.resume();
  return new Promise((resolve,reject)=>{
    let value='';
    const done=()=>{stdin.off('data',read);stdin.setRawMode(false);stdin.pause();stdout.write('\n');};
    const read=chunk=>{for(const c of chunk.toString()){
      if(c==='\u0003'){done();reject(new Error('Đã hủy.'));return;}
      if(c==='\r'||c==='\n'){done();resolve(value);return;}
      if(c==='\u007f'||c==='\b'){if(value){value=value.slice(0,-1);stdout.write('\b \b');}}
      else if(c>=' '){value+=c;stdout.write('•');}
    }};stdin.on('data',read);
  });
}
let store;
try{
  const args=process.argv.slice(2),nameAt=args.indexOf('--username');let name=nameAt>=0?args[nameAt+1]:process.env.VG_ADMIN_USERNAME;
  if(!name){const rl=createInterface({input:stdin,output:stdout});name=await rl.question('Tên đăng nhập admin: ');rl.close();}
  let password=process.env.VG_ADMIN_PASSWORD;
  if(!password){password=await hidden('Mật khẩu mới (ít nhất 12 ký tự): ');const confirm=await hidden('Nhập lại mật khẩu: ');if(password!==confirm)throw new Error('Hai mật khẩu không trùng nhau.');}
  store=createStore();const admin=await store.createAdmin(name,password,args.includes('--reset'));
  console.log(`Đã ${args.includes('--reset')?'đặt lại':'tạo'} tài khoản quản trị ${admin.username}. Đăng nhập tại /admin.`);
}catch(e){console.error(e.message);process.exitCode=1;}finally{store?.close();}
