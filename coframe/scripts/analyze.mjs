// Prints a structural outline of the scraped coframe.com homepage so each
// section can be replicated component-by-component.
//   node scripts/analyze.mjs                -> top-level section outline
//   node scripts/analyze.mjs <selector>     -> pretty-printed subtree HTML
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const HTML = path.resolve(process.cwd(), 'scrape/index.html');
const html = await readFile(HTML, 'utf8');
const $ = cheerio.load(html);

// Analytics/marketing junk we never want to replicate.
$('script, noscript').remove();

const target = process.argv[2];

if (target) {
  const nodes = $(target);
  console.log(`# ${nodes.length} match(es) for ${target}\n`);
  nodes.each((i, el) => {
    console.log(`----- match ${i} -----`);
    console.log($.html(el));
  });
} else {
  const describe = (el) => {
    const $el = $(el);
    const cls = ($el.attr('class') || '').trim();
    const id = $el.attr('id');
    const text = $el.text().replace(/\s+/g, ' ').trim().slice(0, 90);
    return `<${el.tagName}${id ? ` #${id}` : ''}${cls ? ` .${cls.split(/\s+/).join('.')}` : ''}> :: ${text}`;
  };

  const walk = (el, depth) => {
    if (depth > 2) return;
    console.log(`${'  '.repeat(depth)}${describe(el)}`);
    $(el)
      .children()
      .each((_, child) => walk(child, depth + 1));
  };

  console.log('# body children outline (depth 2)\n');
  $('body')
    .children()
    .each((_, el) => walk(el, 0));
}
