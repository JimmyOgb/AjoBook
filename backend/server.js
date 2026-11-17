import express from 'express';
import cors from 'cors';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';
import { analyzeCircleHealth, generateReminders } from './ai_steward.js';
import { seedDakarLagosCircle } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// Simple in-memory rate limiter (sliding 60-second window)
const rateLimitMap = new Map();
function rateLimiter(maxRequests = 100) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'local';
    const now = Date.now();
    const windowStart = now - 60000;
    
    let timestamps = rateLimitMap.get(ip) || [];
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    if (timestamps.length >= maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
    }
    
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);
    next();
  };
}

app.use('/api/', rateLimiter(120));

// Coordinator Nostr Identity for signing on-chain communal state
const coordinatorSecretKey = generateSecretKey();
const coordinatorPubkey = getPublicKey(coordinatorSecretKey);

console.log(`[AjoBook Coordinator] Nostr Identity Initialized:`);
console.log(`  Pubkey: ${coordinatorPubkey.slice(0, 12)}...${coordinatorPubkey.slice(-8)}`);

// In-Memory Database of Circles
export const circles = new Map();

/**
 * Sign a communal state event (Kind: 30078 - App Specific State)
 */
function signStateEvent(circleId, data, kind = 30078) {
  try {
    const event = finalizeEvent({
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `ajobook:${circleId}`],
        ['app', 'ajobook'],
        ['network', 'bitcoin-lightning'],
        ['turn', String(data.currentTurn || 1)]
      ],
      content: JSON.stringify(data)
    }, coordinatorSecretKey);
    return event;
  } catch (err) {
    console.error('Nostr signing error:', err);
    return null;
  }
}

/**
 * Helper to generate a realistic mock BOLT11 Lightning Invoice
 */
function generateMockBolt11(amountSats, memo, memberName) {
  const timestamp = Math.floor(Date.now() / 1000);
  const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const shortMemo = encodeURIComponent(memo.substring(0, 32));
  return `lnbc${amountSats}0n1p${randomHex.substring(0, 20)}pp5${randomHex.substring(20, 50)}sp1${shortMemo}`;
}

// ─── ROUTES ─────────────────────────────────────────────────────────────

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    network: 'Bitcoin + Lightning Network',
    coordinatorPubkey,
    circlesCount: circles.size,
    timestamp: new Date().toISOString()
  });
});

// List all circles
app.get('/api/circles', (req, res) => {
  const list = Array.from(circles.values()).map(c => ({
    id: c.id,
    name: c.name,
    hostName: c.hostName,
    contributionAmount: c.contributionAmountSats,
    turnDuration: c.turnDuration,
    maxMembers: c.maxMembers,
    currentMembers: c.members.length,
    currentTurn: c.currentTurn,
    status: c.status,
    requireDeposit: c.requireDeposit,
    potBalance: c.escrowBalance
  }));
  res.json(list);
});

// Get circle details + AI analysis
app.get('/api/circles/:id', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });

  const aiAnalysis = analyzeCircleHealth(circle);
  res.json({
    ...circle,
    aiAnalysis
  });
});

// Create new circle
app.post('/api/circles', (req, res) => {
  const {
    name,
    hostName,
    hostNpub,
    contributionAmountSats = 5000,
    turnDuration = 300,
    maxMembers = 3,
    requireDeposit = true
  } = req.body;

  // Strict Input Validation
  if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Circle name must be between 3 and 60 characters.' });
  }
  if (!hostName || typeof hostName !== 'string' || hostName.trim().length < 2 || hostName.trim().length > 40) {
    return res.status(400).json({ error: 'Host name must be between 2 and 40 characters.' });
  }
  const cleanName = name.trim();
  const cleanHostName = hostName.trim();
  const numContribution = Number(contributionAmountSats);
  if (!Number.isInteger(numContribution) || numContribution < 100 || numContribution > 10000000) {
    return res.status(400).json({ error: 'Contribution amount must be an integer between 100 and 10,000,000 sats.' });
  }
  const numDuration = Number(turnDuration);
  if (!Number.isInteger(numDuration) || numDuration < 30 || numDuration > 2592000) {
    return res.status(400).json({ error: 'Turn duration must be between 30 seconds and 30 days.' });
  }
  const numMembers = Number(maxMembers);
  if (!Number.isInteger(numMembers) || numMembers < 2 || numMembers > 50) {
    return res.status(400).json({ error: 'Max members must be between 2 and 50.' });
  }

  const id = `circle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const depositSats = requireDeposit ? numContribution : 0;

  const newCircle = {
    id,
    name: cleanName,
    host: hostNpub || coordinatorPubkey,
    hostName: cleanHostName,
    contributionAmountSats: numContribution,
    turnDuration: numDuration,
    maxMembers: numMembers,
    requireDeposit: !!requireDeposit,
    status: 'OPEN',
    currentTurn: 1,
    turnStartTime: null,
    turnDeadline: null,
    members: [
      {
        slot: 1,
        name: cleanHostName,
        npub: hostNpub || 'npub1hostdemo',
        depositSats,
        paidCurrent: false,
        missed: false,
        joinedAt: Date.now()
      }
    ],
    currentTurnPaid: [],
    escrowBalance: 0,
    turnHistory: [],
    nostrReceipts: []
  };

  const signedEvent = signStateEvent(id, newCircle);
  newCircle.lastNostrEvent = signedEvent;

  circles.set(id, newCircle);
  res.status(201).json(newCircle);
});

// Join circle
app.post('/api/circles/:id/join', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'OPEN') return res.status(400).json({ error: 'Circle is not accepting new members.' });
  if (circle.members.length >= circle.maxMembers) return res.status(400).json({ error: 'Circle is full.' });

  const { name, npub } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 40) {
    return res.status(400).json({ error: 'Member name must be between 2 and 40 characters.' });
  }
  const cleanName = name.trim();

  const slot = circle.members.length + 1;
  const depositSats = circle.requireDeposit ? circle.contributionAmountSats : 0;

  const newMember = {
    slot,
    name: cleanName,
    npub: (typeof npub === 'string' && npub.startsWith('npub1')) ? npub.trim() : `npub1guest_${slot}`,
    depositSats,
    paidCurrent: false,
    missed: false,
    joinedAt: Date.now()
  };

  circle.members.push(newMember);

  // Auto-start if max members reached
  if (circle.members.length === circle.maxMembers) {
    _startCircle(circle);
  }

  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json(circle);
});

// Start circle manually by host
app.post('/api/circles/:id/start', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'OPEN') return res.status(400).json({ error: 'Circle is already active or finished.' });
  if (circle.members.length < 2) return res.status(400).json({ error: 'Need at least 2 members to begin.' });

  _startCircle(circle);
  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json(circle);
});

function _startCircle(circle) {
  circle.status = 'ACTIVE';
  circle.currentTurn = 1;
  circle.turnStartTime = Date.now();
  circle.turnDeadline = Date.now() + (circle.turnDuration * 1000);
  circle.currentTurnPaid = [];
}

// Generate BOLT11 invoice for active turn contribution
app.post('/api/circles/:id/invoices', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'ACTIVE') return res.status(400).json({ error: 'Circle is not active.' });

  const { memberSlot, memberName } = req.body;
  const memo = `Ajo contribution for Turn #${circle.currentTurn} - ${circle.name}`;
  const bolt11 = generateMockBolt11(circle.contributionAmountSats, memo, memberName);

  res.json({
    circleId: circle.id,
    turn: circle.currentTurn,
    amountSats: circle.contributionAmountSats,
    memo,
    bolt11,
    expiresAt: circle.turnDeadline
  });
});

// Submit payment (preimage or confirmation)
app.post('/api/circles/:id/pay', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'ACTIVE') return res.status(400).json({ error: 'Circle is not active.' });

  const { memberSlot, memberName, preimage } = req.body;
  const slotNum = Number(memberSlot);
  const member = circle.members.find(m => m.slot === slotNum || (memberName && m.name === memberName.trim()));

  if (!member) return res.status(404).json({ error: 'Member not found in circle.' });
  if (member.paidCurrent) {
    return res.status(400).json({ error: 'Duplicate settlement: Member has already settled for the active round.' });
  }

  // Mark member paid
  member.paidCurrent = true;
  if (!circle.currentTurnPaid.includes(member.slot)) {
    circle.currentTurnPaid.push(member.slot);
  }
  circle.escrowBalance += circle.contributionAmountSats;

  let payoutDisbursed = false;
  let payoutDetails = null;

  // Check if ALL members have paid for this turn
  const totalMembers = circle.members.length;
  if (circle.currentTurnPaid.length >= totalMembers) {
    payoutDetails = _disburseRound(circle);
    payoutDisbursed = true;
  }

  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json({
    success: true,
    member: member.name,
    turn: circle.currentTurn,
    payoutDisbursed,
    payoutDetails,
    circle
  });
});

// Settle overdue turn with deposit slashing
app.post('/api/circles/:id/settle-overdue', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'ACTIVE') return res.status(400).json({ error: 'Circle is not active.' });

  // Slash deposit for unpaid members
  circle.members.forEach(m => {
    if (!m.paidCurrent) {
      if (m.depositSats >= circle.contributionAmountSats) {
        m.depositSats -= circle.contributionAmountSats;
        m.paidCurrent = true;
        circle.currentTurnPaid.push(m.slot);
        circle.escrowBalance += circle.contributionAmountSats;
      } else {
        m.missed = true;
      }
    }
  });

  const payoutDetails = _disburseRound(circle);
  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json({
    success: true,
    payoutDetails,
    circle
  });
});

function _disburseRound(circle) {
  const recipientSlot = circle.currentTurn;
  const recipient = circle.members.find(m => m.slot === recipientSlot) || circle.members[0];

  const grossPot = circle.escrowBalance;
  // 0.5% protocol fee
  const fee = Math.floor((grossPot * 50) / 10000);
  const netPayout = grossPot - fee;

  // Generate Nostr NIP-58 Completion Badge Event
  const badgeEvent = finalizeEvent({
    kind: 8,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['a', `30009:${coordinatorPubkey}:ajobook-turn-completion`],
      ['p', recipient.npub || coordinatorPubkey],
      ['circle', circle.id],
      ['turn', String(circle.currentTurn)],
      ['amount', String(netPayout)]
    ],
    content: `Ajo pot of ${netPayout.toLocaleString()} sats disbursed to ${recipient.name} for Turn #${circle.currentTurn}.`
  }, coordinatorSecretKey);

  const turnRecord = {
    turn: circle.currentTurn,
    recipient: recipient.name,
    recipientNpub: recipient.npub,
    grossPot,
    fee,
    netPayout,
    nostrReceiptId: badgeEvent.id,
    nostrEvent: badgeEvent,
    timestamp: Date.now()
  };

  circle.turnHistory.push(turnRecord);
  circle.nostrReceipts.push(badgeEvent);

  // Reset pot balance
  circle.escrowBalance = 0;

  // Advance turn or complete circle
  if (circle.currentTurn >= circle.members.length) {
    circle.status = 'COMPLETED';
  } else {
    circle.currentTurn += 1;
    circle.turnStartTime = Date.now();
    circle.turnDeadline = Date.now() + (circle.turnDuration * 1000);
    circle.currentTurnPaid = [];
    circle.members.forEach(m => {
      m.paidCurrent = false;
    });
  }

  return turnRecord;
}

// AI Steward analysis and multilingual reminders
app.get('/api/circles/:id/ai-steward', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });

  const currentRecipient = circle.members.find(m => m.slot === circle.currentTurn);
  const recipientName = currentRecipient ? currentRecipient.name : 'Collector';

  const memberName = req.query.member || 'Member';
  const health = analyzeCircleHealth(circle);
  const reminders = generateReminders(circle, memberName, recipientName);

  res.json({
    health,
    reminders,
    recipientName
  });
});

// Reset and re-seed demo data
app.post('/api/seed', (req, res) => {
  const seeded = seedDakarLagosCircle();
  res.json({ success: true, circle: seeded });
});

// Seed initial circle on startup
seedDakarLagosCircle();

app.listen(PORT, () => {
  console.log(`[AjoBook ROSCA Engine] Running on http://localhost:${PORT}`);
});
