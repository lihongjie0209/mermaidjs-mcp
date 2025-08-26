#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { MermaidRenderer, type RenderFormat } from './renderer.js';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  let autoCloseTimeout = 10 * 60 * 1000; // 默认10分钟

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--auto-close-timeout' || arg === '-t') {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(Number(nextArg))) {
        autoCloseTimeout = Number(nextArg) * 1000; // 转换为毫秒
        i++; // 跳过下一个参数，因为它是超时值
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Mermaid MCP Server - Render Mermaid diagrams to images

Usage: mermaidjs-mcp [options]

Options:
  -t, --auto-close-timeout <seconds>  Auto-close browser after inactivity (default: 600 seconds / 10 minutes)
                                      Set to 0 to disable auto-close
  -h, --help                          Show this help message

Examples:
  mermaidjs-mcp                       # Use default 10-minute timeout
  mermaidjs-mcp -t 300               # Auto-close after 5 minutes
  mermaidjs-mcp --auto-close-timeout 0  # Never auto-close browser
`);
      process.exit(0);
    }
  }

  return { autoCloseTimeout };
}

const { autoCloseTimeout } = parseArgs();

// 延迟初始化 renderer，避免启动时出错
let renderer: MermaidRenderer | null = null;

function getRenderer(): MermaidRenderer {
  if (!renderer) {
    renderer = new MermaidRenderer(autoCloseTimeout);
  }
  return renderer;
}

const tools = {
  "mermaid-render": {
    description: "Render Mermaid diagram to PNG/JPG/Base64 using a headless browser. Supports all Mermaid diagram types including flowcharts, sequence diagrams, class diagrams, etc.",
    inputSchema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { 
          type: 'string', 
          description: 'Mermaid diagram code. Examples: "graph TD; A-->B", "sequenceDiagram; Alice->>Bob: Hello"' 
        },
        format: { 
          type: 'string', 
          enum: ['png', 'jpg', 'jpeg', 'base64'], 
          default: 'png',
          description: 'Output format for the rendered diagram'
        },
        background: { 
          type: 'string', 
          default: 'white',
          description: "Background color (CSS color name, hex, or 'transparent')"
        },
        scale: { 
          type: 'number', 
          minimum: 1, 
          maximum: 4,
          default: 2,
          description: 'Device scale factor for high-DPI rendering (1-4)'
        },
        quality: { 
          type: 'number', 
          minimum: 0,
          maximum: 100,
          default: 90,
          description: 'JPEG quality 0-100 (only for jpeg format)'
        },
        savePath: { 
          type: 'string', 
          description: 'Optional absolute path to save the rendered image file'
        }
      }
    }
  }
} as const;

// 常见的图表类型错误和修正建议
const DIAGRAM_FIXES = {
  'gitgraph': 'gitGraph',
  'git graph': 'gitGraph',
  'flowchar': 'flowchart',
  'sequence': 'sequenceDiagram',
  'classdiagram': 'classDiagram',
  'class': 'classDiagram',
  'statediagram': 'stateDiagram',
  'state': 'stateDiagram',
  'userjourney': 'journey',
  'user journey': 'journey',
  'pie chart': 'pie',
  'gantt chart': 'gantt',
  'mindmap': 'mindmap',
  'timeline': 'timeline'
};

function enhanceErrorMessage(error: Error, code: string): string {
  const errorMessage = error.message;
  
  // 检查是否是图表类型检测错误
  if (errorMessage.includes('No diagram type detected') || errorMessage.includes('UnknownDiagramError')) {
    const firstLine = code.trim().split('\n')[0].toLowerCase();
    
    // 检查常见的拼写错误
    for (const [wrong, correct] of Object.entries(DIAGRAM_FIXES)) {
      if (firstLine.includes(wrong)) {
        return `${errorMessage}\n\n💡 Suggestion: Did you mean '${correct}' instead of '${wrong}'?\n\nExample:\n${correct}\n    [rest of your diagram]`;
      }
    }
    
    return `${errorMessage}\n\n💡 Common diagram types:\n` +
           `• flowchart TD/LR - Flow diagrams\n` +
           `• sequenceDiagram - Sequence diagrams\n` +
           `• classDiagram - Class diagrams\n` +
           `• stateDiagram - State diagrams\n` +
           `• gitGraph - Git graphs\n` +
           `• gantt - Gantt charts\n` +
           `• pie - Pie charts\n` +
           `• journey - User journey maps\n\n` +
           `Make sure your diagram starts with one of these keywords.`;
  }
  
  // 检查是否是语法解析错误
  if (errorMessage.includes('Parse error') || errorMessage.includes('parseError')) {
    if (code.toLowerCase().startsWith('gitgraph')) {
      return `${errorMessage}\n\n💡 GitGraph syntax tip:\nUse 'gitGraph' (not 'gitgraph') and avoid complex options.\n\nWorking example:\ngitGraph\n    commit id: "Initial commit"\n    branch develop\n    checkout develop\n    commit id: "Add feature"\n    checkout main\n    merge develop`;
    }
  }
  
  return errorMessage;
}

async function invokeRender(args: any) {
  const { code, format = 'png', background = 'white', scale = 2, quality = 90, savePath } = args as {
    code: string; format?: RenderFormat; background?: string; scale?: number; quality?: number; savePath?: string;
  };

  try {
    if (!code) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: code');
    }

    const rendererInstance = getRenderer();
    const result = await rendererInstance.render({ code, format, background: background as any, scale, quality });

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
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    // 增强错误消息，提供有用的建议
    const enhancedMessage = enhanceErrorMessage(error as Error, code || '');
    throw new McpError(ErrorCode.InternalError, enhancedMessage);
  }
}

const server = new Server(
  {
    name: "@mermaidjs-mcp/mermaidjs-mcp",
    version: "0.1.6",
    description: "MCP server that renders Mermaid diagrams to PNG/JPG/Base64 using a headless browser. Supports all Mermaid diagram types."
  },
  {
    capabilities: { 
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(tools).map(([name, tool]) => ({ 
    name, 
    description: tool.description, 
    inputSchema: tool.inputSchema as any 
  }))
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    switch (name) {
      case "mermaid-render": {
        return await invokeRender(args);
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err: any) {
    if (err instanceof McpError) {
      throw err;
    }
    throw new McpError(ErrorCode.InternalError, err?.message ?? String(err));
  }
});

// Start stdio transport for MCP
const transport = new StdioServerTransport();
(async () => {
  try {
    await server.connect(transport);
    
    // Graceful shutdown
    const shutdown = async () => {
      if (renderer) {
        await renderer.close();
      }
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
})();
