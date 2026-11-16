const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

async function verify() {
  const host = 'http://localhost:4173/';
  console.log(`Testing ${host} ...`);
  const index = await get(host);
  console.log('Index HTML status:', index.statusCode);
  if (index.statusCode !== 200) throw new Error('Index status not 200');
  
  // Find all script and link tags
  const assetMatches = index.body.match(/(?:\.\/)?assets\/[a-zA-Z0-9_-]+\.(?:js|css)/g) || [];
  console.log('Found relative assets:', assetMatches);

  for (const asset of assetMatches) {
    const cleanPath = asset.replace(/^\.\//, '');
    const assetRes = await get(host + cleanPath);
    console.log(`Asset ${cleanPath} status: ${assetRes.statusCode} (${assetRes.body.length} bytes)`);
    if (assetRes.statusCode !== 200) throw new Error(`Asset ${cleanPath} failed with ${assetRes.statusCode}`);
  }

  console.log('\n✅ All frontend bundle assets load with HTTP 200 and valid relative paths!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
