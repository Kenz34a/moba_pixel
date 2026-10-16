import { defineConfig } from 'vite';

export default defineConfig({
  plugins:[{
    name:'vuong-gioi-api',
    async configureServer(server){
      const {createApi}=await import('./server/api.mjs');const api=await createApi();
      server.middlewares.use((req,res,next)=>{void api.handle(req,res,next);});
      server.httpServer?.once('close',()=>api.close());
    },
    async configurePreviewServer(server){
      const {createApi}=await import('./server/api.mjs');const api=await createApi();
      server.middlewares.use((req,res,next)=>{void api.handle(req,res,next);});
      server.httpServer.once('close',()=>api.close());
    },
  }],
});
