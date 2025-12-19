//app.ts
import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { apiRouter } from './routes';
import { Logestic } from 'logestic';
import { createNextHandler } from './lib/next-adapter';

const dev = process.env.NODE_ENV !== 'production';

const app = new Elysia()
  .use(Logestic.preset('fancy')) 
  	.use(await staticPlugin({
      assets: 'web/pages',
      prefix: '/',
    })) 

    .use(apiRouter) 
    
    .listen(7990);
console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)