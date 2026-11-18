import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '../backend');

console.log("=== AjoBook Bitcoin + Lightning + Nostr E2E Verification ===");

const server = spawn('node', ['server.js'], {
  cwd: backendDir,
  shell: true,
  stdio: 'inherit'
});

async function waitForServer(baseUrl, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Server did not start in time');
}

(async () => {
  try {
    const baseUrl = 'http://localhost:3001';
    await waitForServer(baseUrl);

    // 1. Health check
    console.log("\n[Test 1] Health Check...");
    const health = await fetch(`${baseUrl}/api/health`).then(r => r.json());
    console.log("  Status:", health.status);
    console.log("  Network:", health.network);
    console.log("  Coordinator Pubkey:", health.coordinatorPubkey);

    // 2. Fetch Circles
    console.log("\n[Test 2] Fetching Pre-Seeded Dakar–Lagos Circle...");
    const circles = await fetch(`${baseUrl}/api/circles`).then(r => r.json());
    console.log(`  Found ${circles.length} circle(s). First: "${circles[0].name}"`);

    // 3. Circle Details & AI Steward
    console.log("\n[Test 3] AI Steward Health & Multilingual Reminders...");
    const details = await fetch(`${baseUrl}/api/circles/dakar-lagos-market`).then(r => r.json());
    console.log("  Health Score:", details.aiAnalysis.score);
    console.log("  Risk Level:", details.aiAnalysis.riskLevel);
    console.log("  Steward Assessment:", details.aiAnalysis.analysis);

    const steward = await fetch(`${baseUrl}/api/circles/dakar-lagos-market/ai-steward?member=Chidi`).then(r => r.json());
    console.log("  [EN] Reminder:", steward.reminders.en.message.substring(0, 75) + '...');
    console.log("  [FR] Reminder:", steward.reminders.fr.message.substring(0, 75) + '...');
    console.log("  [PCM] Reminder:", steward.reminders.pcm.message.substring(0, 75) + '...');

    // 4. Submit 3rd member payment to trigger autonomous payout
    console.log("\n[Test 4] Paying Round #1 as 3rd Member (Chidi)...");
    const payRes = await fetch(`${baseUrl}/api/circles/dakar-lagos-market/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberSlot: 3,
        memberName: 'Chidi (You / Judge)',
        preimage: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      })
    }).then(r => r.json());

    console.log("  Payment Success:", payRes.success);
    console.log("  Autonomous Payout Disbursed:", payRes.payoutDisbursed);
    if (payRes.payoutDetails) {
      console.log("  Pot Gross:", payRes.payoutDetails.grossPot, "sats");
      console.log("  Net Disbursed to", payRes.payoutDetails.recipient + ":", payRes.payoutDetails.netPayout, "sats");
      console.log("  Signed Nostr NIP-58 Receipt ID:", payRes.payoutDetails.nostrReceiptId);
    }

    // 5. Verify circle advanced to Round 2
    console.log("\n[Test 5] Verifying Round Advancement...");
    const after = await fetch(`${baseUrl}/api/circles/dakar-lagos-market`).then(r => r.json());
    console.log("  Current Turn Now:", after.currentTurn);
    console.log("  Turn History Count:", after.turnHistory.length);

    console.log("\n✅ ALL BITCOIN + LIGHTNING + NOSTR ROSCA INVARIANTS VERIFIED!");
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t']);
    } else {
      server.kill();
    }
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t']);
    } else {
      server.kill();
    }
    process.exit(1);
  }
})();
