import NotionCMS from '@agency-kit/notion-cms';
import fs from 'fs/promises';
import path from 'path';

let notionCMS;

export async function initNotionCMS(knowledgeBasePath) {

  const writeToKnowledgeBasePlugin = {
    name: 'writeToKnowledgeBase',
    hook: 'post-tree',
    exec: async CMS => {
      try {
        await fs.access(knowledgeBasePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.mkdir(knowledgeBasePath, { recursive: true });
        } else {
          throw error;
        }
      }

      const cmsWalker = NotionCMS._createCMSWalker(async (node) => {
        const relativeFilePath = node.slug.replace(/^\//, '').replace(/\//g, '_') + '.txt';
        const fullFilePath = path.join(knowledgeBasePath, relativeFilePath);
        await fs.writeFile(fullFilePath, node.content.plaintext || '', 'utf8');
      })

      await cmsWalker.walk(CMS);

      return CMS;
    }
  };

  notionCMS = new NotionCMS({
    notionAPIKey: process.env.NOTION_API,
    databaseId: '842f0a3e-1b6a-4ec3-8802-464179d76ca7',
    localCacheDirectory: `${process.cwd()}/lc/`,
    rootAlias: '/home',
    draftMode: true,
    plugins: [writeToKnowledgeBasePlugin]
  });
}

export async function buildKnowledgeBase() {
  await notionCMS.pull();
}
