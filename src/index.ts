#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MermaidRenderer, type RenderFormat } from './renderer.js';

const renderer = new MermaidRenderer();

const renderTool = {
  name: 'render',
  description: 'Render Mermaid diagram to PNG/JPG/Base64 using a headless browser',
  inputSchema: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string', description: 'Mermaid code' },
      format: { type: 'string', enum: ['png', 'jpg', 'jpeg', 'base64'], default: 'png' },
      background: { type: 'string', description: "Background color or 'transparent'", default: 'transparent' },
      scale: { type: 'number', description: 'Device scale factor for high-DPI rendering (1..4)', default: 1 },
      quality: { type: 'number', description: 'JPEG quality 0-100 (jpeg only)', default: 90 },
      savePath: { type: 'string', description: 'Optional absolute path to save the image' }
    }
  }
} as const;

async function invokeRender(input: any) {
    const { code, format = 'png', background = 'transparent', scale = 1, quality = 90, savePath } = input as {
      code: string; format?: RenderFormat; background?: string; scale?: number; quality?: number; savePath?: string;
    };

    const result = await renderer.render({ code, format, background: background as any, scale, quality });

    if (savePath && format !== 'base64') {
      const fs = await import('node:fs/promises');
      const data = result.data as Buffer;
      await fs.writeFile(savePath, data);
      return {
        content: [
          { type: 'text', text: `Saved ${result.contentType} (${result.width}x${result.height}) to ${savePath}` }
        ]
      };
    }

    const body = format === 'base64' ? (result.data as string) : (result.data as Buffer).toString('base64');
    const mime = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return {
      content: [
        { type: 'image', data: body, mimeType: mime }
      ]
    };
}

async function main() {
  const server = new Server({
    name: '@mermaidjs-mcp/mermaidjs-mcp',
    version: '0.1.0',
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Define MCP request schemas and register handlers using the SDK
  const ListToolsRequestSchema = RequestSchema.extend({
    method: z.literal('tools/list'),
    // Accept any params shape; tools/list typically has no params
    params: z.any().optional(),
  });

  const CallToolRequestSchema = RequestSchema.extend({
    method: z.literal('tools/call'),
    params: z.object({
      name: z.string(),
      arguments: z.record(z.any()).optional(),
    }),
  });

  server.setRequestHandler(ListToolsRequestSchema, async (_req) => ({
    tools: [renderTool]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params as { name: string; arguments?: any };
    if (name !== 'render') {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await invokeRender(args ?? {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  const shutdown = async () => {
    await renderer.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Only run when executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
