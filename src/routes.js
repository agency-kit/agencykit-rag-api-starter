import { createRouter, eventHandler, readBody } from 'h3';
import { getResponseFromOpenAI } from './openAIService.js';

export default function setupRoutes(app, index, files) {
  const router = createRouter();

  router.post('/search', eventHandler(async (event) => {
    const body = await readBody(event);
    const query = body.query;
    console.log('[handling query]:', query);
    const response = await getResponseFromOpenAI(query, index, files);
    console.log('[query complete]')
    return { answer: response || 'no response generated.' };
  }));

  app.use(router);
}
