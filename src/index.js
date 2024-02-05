import { createServer } from 'http';
import { createApp, toNodeListener } from 'h3';
import dotenv from 'dotenv';
import { initNotionCMS, buildKnowledgeBase } from './notionCMSService.js'
import { indexKnowledgeBase } from './knowledgeBaseService.js';
import setupRoutes from './routes.js'

dotenv.config();

const knowledgeBaseRootPath = './knowledge_base';

async function main() {
  const app = createApp();

  initNotionCMS(knowledgeBaseRootPath);
  await buildKnowledgeBase();

  const { index, files } = await indexKnowledgeBase(knowledgeBaseRootPath);
  setupRoutes(app, index, files);
  createServer(toNodeListener(app)).listen(3000, () => console.log('listening at port 3000'));
}

main().catch(console.error);
