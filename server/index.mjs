import { createServer } from 'node:http';
import { createReadStream,existsSync,statSync } from 'node:fs';
import { resolve,extname } from 'node:path';
import { createApi } from './api.mjs';

const root=resolve('dist');if(!existsSync(resolve(root,'index.html'))){console.error('Chưa có bản build. Chạy npm run build trước.');process.exit(1);}
const api=await createApi(),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const server=createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  void api.handle(req,res,()=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
    let file=resolve(root,'.'+path);
    if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
    if(!existsSync(file)||!statSync(file).isFile()){
      if(extname(path)){res.writeHead(404);res.end();return;}file=resolve(root,'index.html');
    }
    const type=types[extname(file)]||'application/octet-stream';res.setHeader('Content-Type',type);res.setHeader('Cache-Control',file.includes('/assets/')?'public, max-age=31536000, immutable':'no-cache');
    if(req.method==='HEAD'){res.end();return;}createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
});
const port=Number(process.env.PORT||5173);server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Vương Giới: HTTP server ready on port ${port}; admin: /admin`));
function stop(){server.close(()=>{api.close();process.exit(0);});server.closeIdleConnections();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
