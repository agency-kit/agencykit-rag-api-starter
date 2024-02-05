import { createServer } from 'http';
import { readBody, createApp, createRouter, send, eventHandler, toNodeListener } from 'h3';
import lunr from 'lunr';
import fs from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';
import NotionCMS from '@agency-kit/notion-cms';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

// Adjusted Plugin to use asynchronous file operations
const writeToKnowledgeBasePlugin = {
  name: 'writeToKnowledgeBase',
  hook: 'post-tree',
  exec: async CMS => {
    const basePath = './knowledge_base';

    // Ensure the knowledge_base directory exists asynchronously
    try {
      await fs.access(basePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(basePath, { recursive: true });
      } else {
        throw error;
      }
    }

    const cmsWalker = NotionCMS._createCMSWalker(async (node) => {
      const relativeFilePath = node.slug.replace(/^\//, '').replace(/\//g, '_') + '.txt';
      const fullFilePath = path.join(basePath, relativeFilePath);
      console.log(relativeFilePath, fullFilePath, 'path')
      await fs.writeFile(fullFilePath, node.content.plaintext || '', 'utf8');
    })

    await cmsWalker.walk(CMS);

    return CMS;
  }
};

// NotionCMS initialization with the plugin
const notionCMS = new NotionCMS({
  notionAPIKey: process.env.NOTION_API,
  databaseId: '842f0a3e-1b6a-4ec3-8802-464179d76ca7',
  localCacheDirectory: `${process.cwd()}/lc/`,
  rootAlias: '/home',
  draftMode: true,
  plugins: [writeToKnowledgeBasePlugin]
});

// Function to recursively read markdown/plaintext files from a directory
async function readFiles(dir) {
  let files = await fs.readdir(dir, { withFileTypes: true });
  const filePromises = files.map(async (dirent) => {
    const resPath = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      return readFiles(resPath);
    } else if (resPath.endsWith('.md') || resPath.endsWith('.txt')) {
      const content = await fs.readFile(resPath, 'utf-8');
      return { file: resPath, content };
    }
  });

  const fileGroups = await Promise.all(filePromises);
  return fileGroups.flat().filter(Boolean);
}

// Create a Lunr index from the files
async function createIndex(files) {
  return lunr(function () {
    this.ref('file');
    this.field('content');
    files.forEach((doc) => {
      this.add(doc);
    }, this);
  });
}

async function getSearchTermsFromQuery(query) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        {
          "role": "system",
          "content": `You are a helpful assistant designed to output JSON arrays (and only arrays).
Please extract a list of the important keywords from the query. Only words from within the query should end up in the list.` },
        { "role": "user", "content": query },
      ],
    });

    // Assume the assistant's response is a simple list of keywords or a sentence containing the keywords
    const assistantResponse = Object.values(JSON.parse(completion.choices[0].message.content))[0];

    console.log(completion.choices[0].message.content, assistantResponse, 'ASS RSPONSE')

    if (!Array.isArray(assistantResponse)) throw new Error('query is not array. Please try again.');

    const keywords = assistantResponse.split(',').map(keyword => keyword.trim());

    return keywords;
  } catch (error) {
    console.error("Error in getting search terms from OpenAI:", error);
    return [];
  }
}

async function searchDocumentsWithOpenAI(query, index, files) {
  const keywords = await getSearchTermsFromQuery(query);
  const lunrQuery = keywords.join(' ');

  const results = index.search(lunrQuery); // Use Lunr to search with these keywords
  return results.map(({ ref }) => files.find(doc => doc.file === ref)?.content).join('\n\n');
}


async function getResponseFromOpenAI(query, index, files) {
  console.log(query)
  // Perform the Lunr search
  const searchResults = await searchDocumentsWithOpenAI(query, index, files);
  // Format the Lunr results into messages
  const messages = [{
    role: 'system',
    content: 'You are an assistant that will use only the content from the user\'s provided content to inform your response. No other information is valid.'
  }, {
    role: 'user',
    content: `Here is my content: ${searchResults}`
  }];

  // Add the user query to the messages
  messages.push({
    role: 'user',
    content: query
  });

  // Call OpenAI's chat.completions.create method
  try {
    console.log(messages)
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages
    });
    console.log(completion, 'completion')
    return completion.choices[0].message.content; // Assuming you want the first completion's content
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error; // Rethrow or handle as needed
  }
}


// Main server function
async function main() {
  await notionCMS.pull();
  const files = await readFiles('./knowledge_base');
  const index = await createIndex(files);

  const app = createApp();

  const router = createRouter();

  router.post('/search', eventHandler(async (event) => {
    const body = await readBody(event);
    const query = body.query;
    console.log('got :', query);

    const response = await getResponseFromOpenAI(query, index, files);

    return { answer: response || 'no response generated.' };
  }));

  app.use(router);

  createServer(toNodeListener(app)).listen(3000);

}

main().catch(console.error);
