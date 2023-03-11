import http from 'http';
const server = http.createServer()

import controller from './controller';

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*')
  // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.url == "/" && req.method?.toLowerCase() === "get") {
    // 显示一个用于文件上传的form
    res.writeHead(200, { "content-type": "text/html" });
    res.end(
      '<form action="/upload" enctype="multipart/form-data" method="post">' +
      '<input type="file" name="upload" multiple="multiple" />' +
      '<input type="submit" value="Upload" />' +
      "</form>"
    );
  }

  if (req.url === '/upload') {
    return await controller.uploadFile(req, res);
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
