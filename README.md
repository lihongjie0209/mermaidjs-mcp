# @mermaidjs-mcp/mermaidjs-mcp

Node-based MCP server that renders MermaidJS diagrams to PNG/JPG/Base64 using a headless browser (Chromium via Puppeteer).

## Features

- Render Mermaid to PNG, JPG/JPEG, or Base64
- High-DPI scaling via deviceScaleFactor
- Optional file saving via `savePath`
- Simple MCP tool: `render`

## Install

```powershell
pnpm install
pnpm build
```

On first run, Puppeteer will download Chromium if needed.

## Use as MCP server

Configure your MCP client to launch the binary `mermaidjs-mcp` (exposed via package bin) or `node dist/index.js`.

### GitHub Copilot Configuration

Add this server to your GitHub Copilot settings. Create or edit your MCP configuration file:

**Windows**: `%APPDATA%\GitHub Copilot\mcp_config.json`  
**macOS**: `~/Library/Application Support/GitHub Copilot/mcp_config.json`  
**Linux**: `~/.config/GitHub Copilot/mcp_config.json`

```json
{
  "mcpServers": {
    "mermaidjs-mcp": {
      "command": "node",
      "args": ["path/to/your/mermaidjs-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

Or if you installed it globally:

```json
{
  "mcpServers": {
    "mermaidjs-mcp": {
      "command": "mermaidjs-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

After configuration, restart GitHub Copilot to load the server.

### Tool Usage

Tool: `render`

Input schema:

- code: string (required)
- format: 'png' | 'jpg' | 'jpeg' | 'base64' (default 'png')
- background: CSS color or 'transparent' (default 'transparent')
- scale: number device scale factor (default 1)
- quality: JPEG quality 0-100 (default 90)
- savePath: optional absolute path to write file (not used for base64)

Output: image content result or a text message when saved to disk.

## Demo

```powershell
npm run demo
```

This writes sample outputs to `.demo-out/`.

## Example Usage in GitHub Copilot

Once configured, you can ask GitHub Copilot to render Mermaid diagrams:

```
@mermaidjs-mcp render a flowchart showing the process of user authentication
```

Or with specific options:

```
@mermaidjs-mcp render this diagram as JPG with white background:
flowchart TD
    A[Start] --> B{Login?}
    B -->|Yes| C[Dashboard]
    B -->|No| D[Register]
```

The server will return the rendered image that Copilot can display or save.

## Notes

- For transparent backgrounds in PNG, keep `background` as `transparent`.
- For JPG, set a solid `background` color.
- Supports Chrome, Edge, and Chromium browsers across Windows, macOS, and Linux platforms.
- If no browser is found, Puppeteer will automatically download Chromium.

## Browser Support

The server automatically detects and uses available browsers in this order:

**Windows:**
- Google Chrome
- Microsoft Edge

**macOS:**
- Google Chrome
- Microsoft Edge
- Safari (experimental)

**Linux:**
- Google Chrome / Chromium
- Microsoft Edge
- Snap/Flatpak packages

**Environment Variables:**
Set any of these to override browser detection:
- `CHROME_PATH` - Path to Chrome executable
- `EDGE_PATH` - Path to Edge executable  
- `BROWSER_PATH` - Path to any Chromium-based browser
- `PUPPETEER_EXECUTABLE_PATH` - Puppeteer standard env var
