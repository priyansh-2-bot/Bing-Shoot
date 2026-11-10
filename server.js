const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const WEB_DIR = path.join(__dirname);

const server = http.createServer((req, res) => {
    let filePath = path.join(WEB_DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = ext === '.js' ? 'application/javascript' :
                        ext === '.html' ? 'text/html' :
                        ext === '.css' ? 'text/css' :
                        ext === '.glb' ? 'model/gltf-binary' : 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found: ' + filePath);
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('Server running at http://localhost:' + PORT + '/');
    console.log('Serving from:', WEB_DIR);
});
