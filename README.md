# @mermaidjs-mcp/mermaidjs-mcp

Node-based MCP server that renders MermaidJS diagrams to PNG/JPG/Base64 using a headless browser (Chromium via Puppeteer).

## Features

- **All Mermaid Diagram Types**: Supports flowcharts, sequence diagrams, class diagrams, state diagrams, and more
- **Multiple Output Formats**: PNG, JPG/JPEG, and Base64 encoding
- **Headless Browser Rendering**: Uses Puppeteer for high-quality, consistent output
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Local Dependencies**: No CDN dependencies, works offline
- **High-DPI Support**: Configurable scale factor for crisp images
- **Browser Instance Reuse**: Efficient browser management with configurable auto-close timeout (default 10 minutes)
- **Customizable Background**: Transparent or any CSS color
- **Command Line Options**: Configurable browser timeout and other settings
- **MCP Tool**: `mermaid-render` with comprehensive input validation

## Install

### From npm (Recommended)

```bash
npm install -g @mermaidjs-mcp/mermaidjs-mcp
```

### From source

```powershell
git clone https://github.com/lihongjie0209/mermaidjs-mcp.git
cd mermaidjs-mcp
npm install
npm run build
```

On first run, Puppeteer will download Chromium if needed.

## Use as MCP server

Configure your MCP client to launch the binary `mermaidjs-mcp` (exposed via package bin) or `node dist/index.js`.

### GitHub Copilot Configuration

Add this server to your GitHub Copilot settings. Create or edit your MCP configuration file:

**Windows**: `%APPDATA%\GitHub Copilot\mcp_config.json`  
**macOS**: `~/Library/Application Support/GitHub Copilot/mcp_config.json`  
**Linux**: `~/.config/GitHub Copilot/mcp_config.json`

**If installed globally via npm:**

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

**With custom browser auto-close timeout (5 minutes):**

```json
{
  "mcpServers": {
    "mermaidjs-mcp": {
      "command": "mermaidjs-mcp",
      "args": ["--auto-close-timeout", "300"],
      "env": {}
    }
  }
}
```

**Disable auto-close (browser stays open):**

```json
{
  "mcpServers": {
    "mermaidjs-mcp": {
      "command": "mermaidjs-mcp",
      "args": ["--auto-close-timeout", "0"],
      "env": {}
    }
  }
}
```

**If using local installation:**

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

**If using npx:**

```json
{
  "mcpServers": {
    "mermaidjs-mcp": {
      "command": "npx",
      "args": ["@mermaidjs-mcp/mermaidjs-mcp"],
      "env": {}
    }
  }
}
```

After configuration, restart GitHub Copilot to load the server.

### Tool Usage

Tool: `mermaid-render`

Input schema:

- **code**: string (required) - Mermaid diagram code. Examples: `"graph TD; A-->B"`, `"sequenceDiagram; Alice->>Bob: Hello"`
- **format**: 'png' | 'jpg' | 'jpeg' | 'base64' (default 'png') - Output format for the rendered diagram
- **background**: CSS color or 'transparent' (default 'transparent') - Background color (CSS color name, hex, or 'transparent')
- **scale**: number 1-4 (default 1) - Device scale factor for high-DPI rendering
- **quality**: number 0-100 (default 90) - JPEG quality (only for jpeg format)
- **savePath**: string (optional) - Absolute path to save the rendered image file

Output: Image content result or a text message when saved to disk.

### Command Line Options

```bash
# Show help
mermaidjs-mcp --help

# Use default 10-minute browser auto-close timeout
mermaidjs-mcp

# Auto-close browser after 5 minutes of inactivity
mermaidjs-mcp --auto-close-timeout 300

# Disable auto-close (browser stays open until server stops)
mermaidjs-mcp -t 0
```

**Performance Note**: The browser instance is reused across multiple render requests to improve performance. It automatically closes after the specified timeout period (default 10 minutes) when inactive.

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
