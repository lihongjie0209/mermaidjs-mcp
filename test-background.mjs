import { spawn } from 'child_process';

// 测试不同背景色的渲染
const testCases = [
  { name: 'Default White Background', params: {} },
  { name: 'Transparent Background', params: { background: 'transparent' } },
  { name: 'Light Blue Background', params: { background: '#e3f2fd' } },
  { name: 'Red Background', params: { background: 'red' } }
];

const testDiagram = `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task A :a1, 2023-01-01, 30d
    Task B :after a1, 20d
    section Phase 2
    Task C :2023-02-15, 25d
    Task D :2023-03-01, 15d`;

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
        ...params
      }
    }
  }) + '\n';
}

async function runTest() {
  console.log('🧪 Testing background color settings...\n');
  
  const mcpServer = spawn('node', ['dist/index.js', '--auto-close-timeout', '0'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let testIndex = 0;
  
  mcpServer.stdout.on('data', (data) => {
    const response = data.toString();
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.content) {
        const testCase = testCases[testIndex];
        console.log(`✅ ${testCase.name}: Success`);
        
        testIndex++;
        if (testIndex < testCases.length) {
          // 发送下一个测试请求
          setTimeout(() => {
            const nextTest = testCases[testIndex];
            console.log(`🔄 Testing: ${nextTest.name}`);
            mcpServer.stdin.write(createMCPRequest(testDiagram, nextTest.params));
          }, 500);
        } else {
          console.log('\n🎉 All background color tests completed successfully!');
          mcpServer.kill();
        }
      } else if (parsed.error) {
        console.log(`❌ ${testCases[testIndex].name}: Error - ${parsed.error.message}`);
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
    console.log(`\nServer closed with code: ${code}`);
  });

  // 等待服务器启动，然后开始第一个测试
  setTimeout(() => {
    const firstTest = testCases[0];
    console.log(`🔄 Testing: ${firstTest.name}`);
    mcpServer.stdin.write(createMCPRequest(testDiagram, firstTest.params));
  }, 2000);
}

runTest().catch(console.error);
