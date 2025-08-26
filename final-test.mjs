import { spawn } from 'child_process';

// 测试新的白色背景默认设置
const testDiagram = `gantt
    title 项目时间线
    dateFormat YYYY-MM-DD
    section 阶段一
    任务A :a1, 2024-01-01, 30d
    任务B :after a1, 20d
    section 阶段二  
    任务C :2024-02-15, 25d
    任务D :2024-03-01, 15d`;

function createMCPRequest(code, params = {}) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "mermaid-render",
      arguments: {
        code: code,
        format: 'png',
        savePath: 'd:\\code\\mermaidjs-mcp\\test-output.png',
        ...params
      }
    }
  }) + '\n';
}

console.log('🎯 Testing v0.1.4 with new white background default...');

const mcpServer = spawn('node', ['dist/index.js', '--auto-close-timeout', '30'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

mcpServer.stdout.on('data', (data) => {
  const response = data.toString();
  try {
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
      console.log('✅ Render successful! Output:', parsed.result.content[0].text);
      console.log('📄 Image saved as test-output.png');
      console.log('🎨 Background should now be white by default');
      mcpServer.kill();
    } else if (parsed.error) {
      console.log('❌ Error:', parsed.error.message);
      mcpServer.kill();
    }
  } catch (e) {
    // 忽略非JSON响应
  }
});

mcpServer.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

mcpServer.on('close', (code) => {
  console.log(`\n🏁 Test completed! Check test-output.png for white background.`);
});

// 等待服务器启动
setTimeout(() => {
  console.log('📤 Sending render request...');
  mcpServer.stdin.write(createMCPRequest(testDiagram));
}, 2000);
