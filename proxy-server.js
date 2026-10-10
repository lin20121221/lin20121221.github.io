const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // 设置 CORS 头，允许所有来源
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');
  res.setHeader('Access-Control-Max-Age', '86400');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '仅支持 POST 请求' }));
    return;
  }

  // 读取请求体
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const { url: targetUrl, headers, body: requestBody } = data;

      if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '缺少目标 URL' }));
        return;
      }

      console.log(`[${new Date().toISOString()}] 代理请求: ${targetUrl}`);

      // 解析目标 URL
      const parsedUrl = url.parse(targetUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      // 准备请求选项
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: 'POST',
        headers: headers || {}
      };

      // 发起代理请求
      const proxyReq = protocol.request(options, (proxyRes) => {
        // 转发响应头
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // 转发响应体
        proxyRes.on('data', chunk => {
          res.write(chunk);
        });

        proxyRes.on('end', () => {
          res.end();
          console.log(`[${new Date().toISOString()}] 响应状态: ${proxyRes.statusCode}`);
        });
      });

      proxyReq.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] 代理错误:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '代理请求失败: ' + error.message }));
      });

      // 发送请求体
      if (requestBody) {
        proxyReq.write(JSON.stringify(requestBody));
      }
      proxyReq.end();

    } catch (error) {
      console.error(`[${new Date().toISOString()}] 解析错误:`, error.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '请求格式错误: ' + error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`CORS 代理服务器已启动`);
  console.log(`监听端口: http://localhost:${PORT}`);
  console.log(`===========================================`);
  console.log(`使用方法：在网页中勾选"使用代理服务器"`);
  console.log(`代理服务器地址填写: http://localhost:${PORT}/proxy`);
  console.log(`按 Ctrl+C 停止服务器`);
  console.log(`===========================================\n`);
});
