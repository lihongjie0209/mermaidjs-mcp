import { MermaidRenderer } from '../src/renderer.js';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const code = `flowchart TD\n  A[Start] --> B{Is it?}\n  B -- Yes --> C[OK]\n  B -- No --> D[Not OK]`;
  const outDir = resolve(__dirname, '../.demo-out');
  const renderer = new MermaidRenderer();
  await renderer.init();
  const png = await renderer.render({ code, format: 'png', scale: 2 });
  await writeFile(resolve(outDir, 'demo.png'), png.data as Buffer);
  const jpg = await renderer.render({ code, format: 'jpg', scale: 2, background: '#ffffff', quality: 90 });
  await writeFile(resolve(outDir, 'demo.jpg'), jpg.data as Buffer);
  const b64 = await renderer.render({ code, format: 'base64', scale: 2 });
  await writeFile(resolve(outDir, 'demo.base64.txt'), (b64.data as string));
  await renderer.close();
  console.log('Demo outputs written to', outDir);
}

run().catch((e) => { console.error(e); process.exit(1); });
