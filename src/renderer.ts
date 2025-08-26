import puppeteer, { Browser } from 'puppeteer';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const require = createRequire(import.meta.url);

const HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; }
      #container { display: inline-block; }
    </style>
  </head>
  <body>
    <div id="container"></div>
  </body>
</html>`;

// Find available browser executable
function findBrowserExecutable(): string | undefined {
  const platform = process.platform;
  let candidates: string[] = [];

  if (platform === 'win32') {
    // Windows paths
    candidates = [
      // Chrome paths
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      // Edge paths (Chromium-based)
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ];
  } else if (platform === 'darwin') {
    // macOS paths
    candidates = [
      // Chrome paths
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // Edge paths
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      // Safari (WebKit-based, might work with Puppeteer)
      '/Applications/Safari.app/Contents/MacOS/Safari',
      // Homebrew Chrome
      '/opt/homebrew/bin/google-chrome-stable',
      '/usr/local/bin/google-chrome-stable',
    ];
  } else {
    // Linux paths
    candidates = [
      // Chrome paths
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      // Edge paths
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/microsoft-edge',
      // Snap packages
      '/snap/bin/chromium',
      '/snap/bin/code', // VS Code's Electron (Chromium-based)
      // Flatpak
      '/var/lib/flatpak/app/com.google.Chrome/current/active/export/bin/com.google.Chrome',
      '/var/lib/flatpak/app/com.microsoft.Edge/current/active/export/bin/com.microsoft.Edge',
    ];
  }

  // Add environment variables (cross-platform)
  const envCandidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.BROWSER_PATH,
  ].filter(Boolean) as string[];

  // Combine all candidates with env variables having priority
  const allCandidates = [...envCandidates, ...candidates];

  for (const path of allCandidates) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  return undefined;
}

export type RenderFormat = 'png' | 'jpg' | 'jpeg' | 'base64';

export interface RenderOptions {
  code: string;
  format?: RenderFormat;
  background?: 'transparent' | string;
  scale?: number; // deviceScaleFactor
  quality?: number; // 0-100 for jpeg
}

export interface RenderResult {
  data: Buffer | string;
  width: number;
  height: number;
  contentType: string;
}

declare global {
  interface Window { mermaid: any; }
}

export class MermaidRenderer {
  private browser: Browser | null = null;

  async init() {
    if (this.browser) return;
    
    try {
      const executablePath = findBrowserExecutable();
      
      if (!executablePath) {
        throw new Error('No browser executable found. Please install Chrome, Edge, or set PUPPETEER_EXECUTABLE_PATH environment variable.');
      }
      
      this.browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async render(opts: RenderOptions): Promise<RenderResult> {
    const { code, format = 'png', background = 'transparent', scale = 1, quality = 90 } = opts;
    await this.init();
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: Math.max(1, scale) });
    await page.setContent(HTML, { waitUntil: 'domcontentloaded' });

    // Load local UMD build of mermaid into the page (no CDN)
    const mermaidPath = require.resolve('mermaid/dist/mermaid.min.js');
    await page.addScriptTag({ path: mermaidPath });

    const { width, height } = await page.evaluate(async (c: string, bg: string) => {
      const mermaid = (window as any).mermaid;
      if (!mermaid) throw new Error('Mermaid failed to load');
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
      const id = 'm' + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, c);
      const container = document.getElementById('container')!;
      if (bg && bg !== 'transparent') {
        (document.body as any).style.background = bg;
      }
      container.innerHTML = svg;
      const svgEl = container.querySelector('svg')! as SVGSVGElement;
      const bbox = svgEl.getBBox();
      const width = Math.ceil(bbox.x + bbox.width + 2);
      const height = Math.ceil(bbox.y + bbox.height + 2);
      svgEl.setAttribute('width', String(width));
      svgEl.setAttribute('height', String(height));
      (document.body as any).style.width = width + 'px';
      (document.body as any).style.height = height + 'px';
      return { width, height };
    }, code, background);
    await page.setViewport({ width, height, deviceScaleFactor: Math.max(1, scale) });
    const clip = { x: 0, y: 0, width, height } as const;
    const type = format === 'jpg' || format === 'jpeg' ? 'jpeg' : 'png';
    const shot = await page.screenshot({
      type,
      omitBackground: background === 'transparent',
      quality: type === 'jpeg' ? quality : undefined,
      clip
    });
    await page.close();

    const buffer: Buffer = Buffer.isBuffer(shot)
      ? (shot as Buffer)
      : Buffer.from(shot as Uint8Array);

    if (format === 'base64') {
      return { data: buffer.toString('base64'), width, height, contentType: 'image/png' };
    }
    return { data: buffer, width, height, contentType: type === 'jpeg' ? 'image/jpeg' : 'image/png' };
  }
}
