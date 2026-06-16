const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.gif': 'image/gif',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Normalise URL path
    let filePath = req.url.split('?')[0];
    if (filePath === '/') {
        filePath = '/index.html';
    }
    
    const absolutePath = path.join(__dirname, filePath);
    
    // Safety check (prevent directory traversal)
    if (!absolutePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Access Denied');
        return;
    }
    
    fs.stat(absolutePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.statusCode = 404;
            res.end('File Not Found');
            return;
        }
        
        const ext = path.extname(absolutePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });
        
        const stream = fs.createReadStream(absolutePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  Bilingual Hymnal PWA Web App is running locally!`);
    console.log(`  Open your browser and visit: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});
