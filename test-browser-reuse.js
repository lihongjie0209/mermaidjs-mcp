import { spawn } from 'child_process';
import fs from 'fs';

// 测试配置
const testConfig = {
  autoCloseTimeout: "30", // 30秒用于测试
  testDiagram: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> D`
};

// 创建 MCP 请求
function createMCPRequest(code, format = 'png') {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "mermaid-render",
      arguments: {
        code: code,
        format: format
      }
    }
  }) + '\n';
}

// 启动 MCP 服务器
console.log('启动 MCP 服务器（30秒自动关闭）...');
const mcpServer = spawn('node', ['dist/index.js', '--auto-close-timeout', testConfig.autoCloseTimeout], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;
let startTime = Date.now();

mcpServer.stdout.on('data', (data) => {
  const response = data.toString();
  console.log(`响应 ${++responseCount}:`, response.substring(0, 100) + '...');
  
  if (responseCount === 1) {
    // 第一次渲染 - 浏览器将被创建
    console.log('\n发送第二个渲染请求（浏览器应被复用）...');
    setTimeout(() => {
      mcpServer.stdin.write(createMCPRequest(testConfig.testDiagram, 'jpeg'));
    }, 1000);
  } else if (responseCount === 2) {
    // 第二次渲染 - 浏览器应被复用
    console.log('\n测试完成！浏览器实例应已被复用。');
    console.log(`总耗时: ${Date.now() - startTime}ms`);
    
    // 等待浏览器自动关闭（30秒后）
    console.log('等待浏览器自动关闭（30秒）...');
    setTimeout(() => {
      console.log('测试结束，关闭服务器');
      mcpServer.kill();
    }, 32000);
  }
});

mcpServer.stderr.on('data', (data) => {
  console.error('错误:', data.toString());
});

mcpServer.on('close', (code) => {
  console.log(`服务器已关闭，退出码: ${code}`);
});

// 等待服务器启动，然后发送第一个请求
setTimeout(() => {
  console.log('发送第一个渲染请求（将创建浏览器实例）...');
  mcpServer.stdin.write(createMCPRequest(testConfig.testDiagram, 'png'));
}, 2000);
