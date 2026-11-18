import { circles } from './server.js';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';

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

  const now = Date.now();
  const currentBlock = 976385;

  const demoCircle = {
    id: circleId,
    name: 'Dakar–Lagos Market Circle',
    host: aminataNpub,
    hostName: 'Aminata (Dakar)',
    contributionAmountSats,
    turnDuration,
    maxMembers: 3,
    requireDeposit: true,
    isOpenForLateJoiners: true,
    status: 'ACTIVE',
    currentTurn: 1,
    turnStartTime: now - 60000, // started 1 min ago
    turnDeadline: now + 240000,  // 4 mins remaining
    mempoolAnchorBlock: currentBlock,
    members: [
      {
        slot: 1,
        name: 'Aminata (Dakar)',
        npub: aminataNpub,
        lightningAddress: 'aminata@getalby.com',
        depositSats: 5000,
        paidCurrent: true,
        missed: false,
        joinedAt: now - 3600000
      },
      {
        slot: 2,
        name: 'Tunde (Lagos)',
        npub: tundeNpub,
        lightningAddress: 'tunde@blink.sv',
        depositSats: 5000,
        paidCurrent: true,
        missed: false,
        joinedAt: now - 3500000
      },
      {
        slot: 3,
        name: 'Chidi (You / Judge)',
        npub: chidiNpub,
        lightningAddress: 'chidi@coinos.io',
        depositSats: 5000,
        paidCurrent: false, // WAITING FOR JUDGE / USER TO PAY!
        missed: false,
        joinedAt: now - 3400000
      }
    ],
    currentTurnPaid: [1, 2],
    escrowBalance: 10000, // 10,000 sats currently accumulated in pot
    claimablePayouts: [],
    turnHistory: [],
    nostrReceipts: [],
    bookAuditLog: [
      {
        id: `log_${now - 3600000}`,
        action: 'CIRCLE_CREATED',
        description: "Aminata (Dakar) created 'Dakar–Lagos Market Circle' with 5,000 sats/turn cadence.",
        actor: 'Aminata (Dakar)',
        sats: 5000,
        blockHeight: currentBlock - 4,
        timestamp: now - 3600000
      },
      {
        id: `log_${now - 3590000}`,
        action: 'MEMBER_JOINED',
        description: 'Aminata (Dakar) signed into Slot #1 and escrowed 5,000 sats deposit.',
        actor: 'Aminata (Dakar)',
        sats: 5000,
        blockHeight: currentBlock - 4,
        timestamp: now - 3590000
      },
      {
        id: `log_${now - 3500000}`,
        action: 'MEMBER_JOINED',
        description: 'Tunde (Lagos) joined Slot #2 and locked 5,000 sats 1x security deposit.',
        actor: 'Tunde (Lagos)',
        sats: 5000,
        blockHeight: currentBlock - 3,
        timestamp: now - 3500000
      },
      {
        id: `log_${now - 3400000}`,
        action: 'MEMBER_JOINED',
        description: 'Chidi (You / Judge) joined Slot #3 and locked 5,000 sats deposit.',
        actor: 'Chidi (You / Judge)',
        sats: 5000,
        blockHeight: currentBlock - 2,
        timestamp: now - 3400000
      },
      {
        id: `log_${now - 60000}`,
        action: 'CIRCLE_STARTED',
        description: 'Lineup locked. Round #1 countdown timer started (Turn recipient: Aminata).',
        actor: 'Aminata (Dakar)',
        blockHeight: currentBlock,
        timestamp: now - 60000
      },
      {
        id: `log_${now - 45000}`,
        action: 'TURN_PAID',
        description: 'Aminata (Dakar) settled Turn #1 contribution of 5,000 sats.',
        actor: 'Aminata (Dakar)',
        sats: 5000,
        preimage: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        blockHeight: currentBlock,
        timestamp: now - 45000
      },
      {
        id: `log_${now - 30000}`,
        action: 'TURN_PAID',
        description: 'Tunde (Lagos) settled Turn #1 contribution of 5,000 sats.',
        actor: 'Tunde (Lagos)',
        sats: 5000,
        preimage: 'f0e1d2c3b4a5968778695a4b3c2d1e0ff0e1d2c3b4a5968778695a4b3c2d1e0f',
        blockHeight: currentBlock,
        timestamp: now - 30000
      }
    ]
  };

  circles.set(circleId, demoCircle);
  console.log(`[Seed] Pre-seeded 'Dakar–Lagos Market Circle' (ID: ${circleId})`);
  console.log(`  Members: Aminata (Paid), Tunde (Paid), Chidi (Pending - 5,000 sats)`);
  console.log(`  Current Pot: 10,000 sats escrowed. Round 1 recipient: Aminata (Dakar).`);
  return demoCircle;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Seeding Dakar–Lagos Market Circle standalone test...");
  seedDakarLagosCircle();
}
