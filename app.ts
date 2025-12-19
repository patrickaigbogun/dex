import { Elysia } from 'elysia';
import { apiRouter } from './routes';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const ui = next({dev});
const handle = ui.getRequestHandler();

await ui.prepare();

const server = new Elysia()
    .use(apiRouter) 
    
    .all("*", ({request}) => {
	return handle(request, response);
    })


    .listen(7990);
console.log('Server running...');
