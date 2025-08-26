import { spawn } from 'child_process';

// 测试最新版本的图片质量
const testDiagram = `graph LR
    A[用户登录] --> B{验证身份}
    B -->|成功| C[进入系统]
    B -->|失败| D[显示错误]
    C --> E[访问功能]
    D --> F[重新尝试]
    F --> B
    
    style A fill:#e1f5fe
    style C fill:#e8f5e8
    style D fill:#ffebee
    style E fill:#f3e5f5`;

function createMCPRequest(code) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "mermaid-render",
      arguments: {
        code: code,
        format: 'png',
        savePath: 'd:\\code\\mermaidjs-mcp\\final-quality-test.png'
      }
    }
  }) + '\n';
}

console.log('🎨 Testing v0.1.5 enhanced image quality...');

const mcpServer = spawn('node', ['dist/index.js', '--auto-close-timeout', '30'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

mcpServer.stdout.on('data', (data) => {
  const response = data.toString();
  try {
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
      console.log('✅ High-quality image generated successfully!');
      console.log('📊 Result:', parsed.result.content[0].text);
      console.log('\n🔍 Quality improvements in v0.1.5:');
      console.log('   • Default 2x scale factor for sharper rendering');
      console.log('   • Enhanced font antialiasing and LCD text rendering');
      console.log('   • Optimized Mermaid configuration for better clarity');
      console.log('   • Improved SVG rendering with geometricPrecision');
      console.log('   • Better CSS font smoothing and text rendering');
      console.log('\n📁 Check final-quality-test.png for the improved quality!');
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
  console.log(`\n🎉 Quality test completed! The image should be much sharper now.`);
});

// 等待服务器启动
setTimeout(() => {
  console.log('📤 Generating enhanced quality image...');
  mcpServer.stdin.write(createMCPRequest(testDiagram));
}, 2000);
