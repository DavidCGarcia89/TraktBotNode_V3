const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');

const port = 3978;

httpProxy.createServer({
    ssl: {
        key: fs.readFileSync(path.join(__dirname, 'key.pem'), 'utf8'),
        cert: fs.readFileSync(path.join(__dirname, 'certificate.pem'), 'utf8')
    },
    target: {
        host: 'localhost',
        port: 3977
    },
    secure: false
}).listen(3978, (ey) => {
    console.log('HTTPS proxy listening on port', port);
});

