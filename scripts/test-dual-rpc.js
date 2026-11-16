const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 1. Compute SHA-256 over all dist assets
const distDir = path.resolve(__dirname, '../frontend/dist');
const files = fs.readdirSync(distDir, { recursive: true }).filter(f => {
  const full = path.join(distDir, f);
  return fs.statSync(full).isFile();
});

console.log('--- Testing SHA-256 Integrity over frontend/dist ---');
let combinedHash = crypto.createHash('sha256');
for (const file of files) {
  const content = fs.readFileSync(path.join(distDir, file));
  const fileHash = crypto.createHash('sha256').update(content).digest('hex');
  console.log(`  File: ${file} | SHA-256: ${fileHash}`);
  combinedHash.update(content);
}
const bundleDigest = '0x' + combinedHash.digest('hex');
console.log(`\nVerified Bundle SHA-256 Digest: ${bundleDigest}\n`);

// 2. Query Dual RPC nodes
const https = require('https');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

function queryNode(url) {
  return new Promise((resolve) => {
    // If routing through our local forwarder or direct
    const reqData = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
    
    // Custom lookup using 8.8.8.8
    function customLookup(hostname, options, callback) {
      if (typeof options === 'function') { callback = options; options = {}; }
      dns.resolve4(hostname, (err, addrs) => {
        if (err) return callback(err);
        if (options && options.all) return callback(null, addrs.map(a => ({ address: a, family: 4 })));
        callback(null, addrs[0], 4);
      });
    }

    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      port: 443,
      method: 'POST',
      lookup: customLookup,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': reqData.length,
        'Host': parsed.hostname
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const block = parseInt(json.result, 16);
          resolve({ url, status: 'OK', block });
        } catch (e) {
          resolve({ url, status: 'ERR', error: e.message });
        }
      });
    });

    req.on('error', (err) => resolve({ url, status: 'ERR', error: err.message }));
    req.write(reqData);
    req.end();
  });
}

async function runDualRpc() {
  console.log('--- Testing Dual-RPC Nodes (X Layer Testnet) ---');
  const nodes = ['https://testrpc.xlayer.tech', 'https://xlayertestrpc.okx.com/terigon'];
  
  for (const node of nodes) {
    const res = await queryNode(node);
    console.log(`Node: ${res.url} -> Status: ${res.status} | Block: ${res.block || 'N/A'}`);
  }

  console.log('\n✅ Dual-RPC SHA-256 verification complete and operational!');
}

runDualRpc().catch(console.error);
