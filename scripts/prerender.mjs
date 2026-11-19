import { readFile, writeFile } from 'node:fs/promises';
import { render } from '../node_modules/.cache/gofurry-lite/entry-server.js';

const output = new URL('../dist/index.html', import.meta.url);
const template = await readFile(output, 'utf8');
const outlet = '<!--app-html-->';

if (!template.includes(outlet)) {
  throw new Error('The maintenance page template is missing its render outlet.');
}

await writeFile(output, template.replace(outlet, render));
