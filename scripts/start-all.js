import { spawn } from 'child_process';

console.log("=================================================");
console.log("  ⚡ Starting AjoBook (Bitcoin + Lightning + Nostr)");
console.log("=================================================\n");

const backend = spawn('node', ['server.js'], {
  cwd: './backend',
  stdio: 'inherit'
});

const frontend = spawn('npx', ['vite', '--host'], {
  cwd: './frontend',
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log("\nShutting down AjoBook...");
  backend.kill();
  frontend.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
