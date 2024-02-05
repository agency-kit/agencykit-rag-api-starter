import lunr from 'lunr';
import fs from 'fs/promises';
import path from 'path';

async function readFiles(dir) {
  let files = await fs.readdir(dir, { withFileTypes: true });
  const filePromises = files.map(async (dirent) => {
    const resPath = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      return readFiles(resPath);
    } else if (resPath.endsWith('.md') || resPath.endsWith('.txt')) {
      const content = await fs.readFile(resPath, 'utf-8');
      return { file: resPath, dir: dirent.name, content };
    }
  });

  const fileGroups = await Promise.all(filePromises);
  return fileGroups.flat().filter(Boolean);
}

async function createIndex(files) {
  return lunr(function () {
    this.ref('file');
    this.field('content');
    files.forEach((doc) => {
      this.add(doc);
    }, this);
  });
}

export async function indexKnowledgeBase(root) {
  const files = await readFiles(root);
  const index = await createIndex(files);
  return { index, files };
}
