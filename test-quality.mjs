import { spawn } from 'child_process';

// 测试图片清晰度优化
const testDiagram = `graph TD
    A[开始] --> B{决策点}
    B -->|是| C[处理A]
    B -->|否| D[处理B]
    C --> E[结束]
    D --> E
    
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000`;

function createMCPRequest(code, filename, scale = 2) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "mermaid-render",
      arguments: {
        code: code,
        format: 'png',
        scale: scale,
        savePath: `d:\\code\\mermaidjs-mcp\\${filename}`
      }
    }
  }) + '\n';
}

async function runTest() {
  console.log('🔍 Testing image quality improvements...\n');
  
  const mcpServer = spawn('node', ['dist/index.js', '--auto-close-timeout', '0'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const tests = [
    { scale: 1, filename: 'test-scale-1x.png', name: 'Scale 1x (old default)' },
    { scale: 2, filename: 'test-scale-2x.png', name: 'Scale 2x (new default)' },
    { scale: 3, filename: 'test-scale-3x.png', name: 'Scale 3x (high quality)' }
  ];
  
  let testIndex = 0;
  
  mcpServer.stdout.on('data', (data) => {
    const response = data.toString();
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.content) {
        const test = tests[testIndex];
        console.log(`✅ ${test.name}: Generated ${test.filename}`);
        
        testIndex++;
        if (testIndex < tests.length) {
          // 发送下一个测试请求
          setTimeout(() => {
            const nextTest = tests[testIndex];
            console.log(`🔄 Generating: ${nextTest.name}`);
            mcpServer.stdin.write(createMCPRequest(testDiagram, nextTest.filename, nextTest.scale));
          }, 500);
        } else {
          console.log('\n🎯 Quality comparison tests completed!');
          console.log('📁 Generated files:');
          tests.forEach(test => {
            console.log(`   - ${test.filename} (${test.name})`);
          });
          console.log('\n💡 Compare the files to see quality improvements!');
          mcpServer.kill();
        }
      } else if (parsed.error) {
        console.log(`❌ Error: ${parsed.error.message}`);
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
    console.log(`\n🏁 Test completed! Exit code: ${code}`);
  });

  // 等待服务器启动，然后开始第一个测试
  setTimeout(() => {
    const firstTest = tests[0];
    console.log(`🔄 Generating: ${firstTest.name}`);
    mcpServer.stdin.write(createMCPRequest(testDiagram, firstTest.filename, firstTest.scale));
  }, 2000);
}

runTest().catch(console.error);
