// Downloads the raw coframe.com homepage HTML into scrape/index.html
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'scrape');

const res = await fetch('https://www.coframe.com/', {
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml',
  },
});
const html = await res.text();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'index.html'), html, 'utf8');
console.log('status', res.status, 'bytes', html.length);
