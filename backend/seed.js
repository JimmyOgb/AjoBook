import { circles } from './server.js';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';

export function seedDakarLagosCircle() {
  const circleId = 'dakar-lagos-market';
  const contributionAmountSats = 5000;
  const turnDuration = 300; // 5 minutes demo cadence

  const aminataSec = generateSecretKey();
  const aminataNpub = getPublicKey(aminataSec);

  const tundeSec = generateSecretKey();
  const tundeNpub = getPublicKey(tundeSec);

  const chidiSec = generateSecretKey();
  const chidiNpub = getPublicKey(chidiSec);

  const demoCircle = {
    id: circleId,
    name: 'Dakar–Lagos Market Circle',
    host: aminataNpub,
    hostName: 'Aminata (Dakar)',
    contributionAmountSats,
    turnDuration,
    maxMembers: 3,
    requireDeposit: true,
    status: 'ACTIVE',
    currentTurn: 1,
    turnStartTime: Date.now() - 60000, // started 1 min ago
    turnDeadline: Date.now() + 240000,  // 4 mins remaining
    members: [
      {
        slot: 1,
        name: 'Aminata (Dakar)',
        npub: aminataNpub,
        depositSats: 5000,
        paidCurrent: true, // Has already paid Round 1
        missed: false,
        joinedAt: Date.now() - 3600000
      },
      {
        slot: 2,
        name: 'Tunde (Lagos)',
        npub: tundeNpub,
        depositSats: 5000,
        paidCurrent: true, // Has already paid Round 1
        missed: false,
        joinedAt: Date.now() - 3500000
      },
      {
        slot: 3,
        name: 'Chidi (You / Judge)',
        npub: chidiNpub,
        depositSats: 5000,
        paidCurrent: false, // WAITING FOR JUDGE / USER TO PAY!
        missed: false,
        joinedAt: Date.now() - 3400000
      }
    ],
    // 2 out of 3 members have already paid their 5,000 sats
    currentTurnPaid: [1, 2],
    escrowBalance: 10000, // 10,000 sats currently accumulated in pot
    turnHistory: [],
    nostrReceipts: []
  };

  circles.set(circleId, demoCircle);
  console.log(`[Seed] Pre-seeded 'Dakar–Lagos Market Circle' (ID: ${circleId})`);
  console.log(`  Members: Aminata (Paid), Tunde (Paid), Chidi (Pending - 5,000 sats)`);
  console.log(`  Current Pot: 10,000 sats escrowed. Round 1 recipient: Aminata (Dakar).`);
  return demoCircle;
}

// If run directly via `node seed.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Seeding Dakar–Lagos Market Circle standalone test...");
  seedDakarLagosCircle();
}
