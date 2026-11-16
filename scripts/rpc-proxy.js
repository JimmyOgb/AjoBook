const http = require('http');
const https = require('https');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err) return callback(err);
    if (options && options.all) {
      return callback(null, addresses.map(a => ({ address: a, family: 4 })));
    }
    return callback(null, addresses[0], 4);
  });
}

const server = http.createServer((clientReq, clientRes) => {
  let body = [];
  clientReq.on('data', chunk => body.push(chunk));
  clientReq.on('end', () => {
    const data = Buffer.concat(body);
    const proxyReq = https.request('https://testrpc.xlayer.tech', {
      method: clientReq.method,
      lookup: customLookup,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Host': 'testrpc.xlayer.tech',
        'User-Agent': 'AjoChain-Proxy/1.0'
      }
    }, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy Error:', err.message);
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: err.message }));
    });

    proxyReq.write(data);
    proxyReq.end();
  });
});

const PORT = 8546;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`X Layer RPC Proxy active on http://127.0.0.1:${PORT} -> https://testrpc.xlayer.tech`);
});
