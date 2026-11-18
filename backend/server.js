import express from 'express';
import cors from 'cors';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { analyzeCircleHealth, generateReminders } from './ai_steward.js';
import { seedDakarLagosCircle } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// Simple in-memory rate limiter (sliding 60-second window)
const rateLimitMap = new Map();
function rateLimiter(maxRequests = 120) {
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

app.use('/api/', rateLimiter(150));

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
      content: JSON.stringify({
        id: data.id,
        name: data.name,
        currentTurn: data.currentTurn,
        status: data.status,
        membersCount: data.members.length,
        escrowBalance: data.escrowBalance
      })
    }, coordinatorSecretKey);
    return event;
  } catch (err) {
    console.error('Nostr signing error:', err);
    return null;
  }
}

/**
 * Helper to generate a realistic BOLT11 Lightning Invoice string
 */
function generateBolt11(amountSats, memo, memberName) {
  const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const shortMemo = encodeURIComponent((memo || 'ajobook').substring(0, 24));
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
    isOpenForLateJoiners: c.isOpenForLateJoiners ?? true,
    potBalance: c.escrowBalance,
    claimableCount: c.claimablePayouts?.filter(p => !p.claimed)?.length || 0
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

// 1. Host Opens Circle
app.post('/api/circles', (req, res) => {
  const {
    name,
    hostName,
    hostNpub,
    hostLightningAddress,
    contributionAmountSats = 5000,
    turnDuration = 300,
    maxMembers = 3,
    requireDeposit = true,
    isOpenForLateJoiners = true
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Circle name must be between 3 and 60 characters.' });
  }
  if (!hostName || typeof hostName !== 'string' || hostName.trim().length < 2 || hostName.trim().length > 40) {
    return res.status(400).json({ error: 'Host name must be between 2 and 40 characters.' });
  }

  const cleanName = name.trim();
  const cleanHostName = hostName.trim();
  const numContribution = Number(contributionAmountSats) || 5000;
  const numDuration = Number(turnDuration) || 300;
  const numMembers = Number(maxMembers) || 3;

  const id = `circle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const depositSats = requireDeposit ? numContribution : 0;
  const currentBlock = 976385;
  const now = Date.now();

  const newCircle = {
    id,
    name: cleanName,
    host: hostNpub || coordinatorPubkey,
    hostName: cleanHostName,
    contributionAmountSats: numContribution,
    turnDuration: numDuration,
    maxMembers: numMembers,
    requireDeposit: !!requireDeposit,
    isOpenForLateJoiners: !!isOpenForLateJoiners,
    status: 'OPEN',
    currentTurn: 1,
    turnStartTime: null,
    turnDeadline: null,
    mempoolAnchorBlock: currentBlock,
    members: [
      {
        slot: 1,
        name: cleanHostName,
        npub: hostNpub || 'npub1hostdemo',
        lightningAddress: hostLightningAddress || `${cleanHostName.toLowerCase().replace(/[^a-z0-9]/g, '')}@getalby.com`,
        depositSats,
        paidCurrent: false,
        missed: false,
        joinedAt: now
      }
    ],
    currentTurnPaid: [],
    escrowBalance: 0,
    claimablePayouts: [],
    turnHistory: [],
    nostrReceipts: [],
    bookAuditLog: [
      {
        id: `log_${now}`,
        action: 'CIRCLE_CREATED',
        description: `${cleanHostName} opened savings book '${cleanName}' (${numContribution.toLocaleString()} sats/turn).`,
        actor: cleanHostName,
        sats: numContribution,
        blockHeight: currentBlock,
        timestamp: now
      },
      {
        id: `log_${now + 1}`,
        action: 'MEMBER_JOINED',
        description: `${cleanHostName} signed into Slot #1 (1x deposit: ${depositSats.toLocaleString()} sats).`,
        actor: cleanHostName,
        sats: depositSats,
        blockHeight: currentBlock,
        timestamp: now + 1
      }
    ]
  };

  const signedEvent = signStateEvent(id, newCircle);
  newCircle.lastNostrEvent = signedEvent;

  circles.set(id, newCircle);
  res.status(201).json(newCircle);
});

// 2. Join Circle & 7. Late Joiners + Catch-Up Split
app.post('/api/circles/:id/join', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });

  const { name, npub, lightningAddress } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 40) {
    return res.status(400).json({ error: 'Member name must be between 2 and 40 characters.' });
  }
  const cleanName = name.trim();
  const now = Date.now();
  const currentBlock = 976385;

  const depositSats = circle.requireDeposit ? circle.contributionAmountSats : 0;
  const slot = circle.members.length + 1;

  // Case A: Circle is OPEN (Standard Formation)
  if (circle.status === 'OPEN') {
    const newMember = {
      slot,
      name: cleanName,
      npub: (typeof npub === 'string' && npub.startsWith('npub1')) ? npub.trim() : `npub1guest_${slot}`,
      lightningAddress: lightningAddress || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@getalby.com`,
      depositSats,
      paidCurrent: false,
      missed: false,
      joinedAt: now
    };

    circle.members.push(newMember);
    circle.bookAuditLog.push({
      id: `log_${now}`,
      action: 'MEMBER_JOINED',
      description: `${cleanName} signed into Slot #${slot} in the exercise book.`,
      actor: cleanName,
      sats: depositSats,
      blockHeight: currentBlock,
      timestamp: now
    });

    if (circle.members.length >= circle.maxMembers) {
      _startCircle(circle);
    }

    const signedEvent = signStateEvent(circle.id, circle);
    circle.lastNostrEvent = signedEvent;
    return res.json({ success: true, member: newMember, circle });
  }

  // Case B: Circle is ACTIVE (Mechanic #7: Late Joiners + Catch-Up Split)
  if (circle.status === 'ACTIVE') {
    if (!circle.isOpenForLateJoiners) {
      return res.status(400).json({ error: 'Late registrations are closed for this circle.' });
    }

    const turnsElapsed = circle.currentTurn - 1;
    const regularContribution = circle.contributionAmountSats;
    const catchUpTotal = turnsElapsed > 0 ? (regularContribution * turnsElapsed) : 0;
    const totalRequiredSats = regularContribution + catchUpTotal + depositSats;

    const newMember = {
      slot,
      name: cleanName,
      npub: (typeof npub === 'string' && npub.startsWith('npub1')) ? npub.trim() : `npub1late_${slot}`,
      lightningAddress: lightningAddress || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@blink.sv`,
      depositSats,
      paidCurrent: true, // paid current turn as part of late-join bundle
      missed: false,
      joinedAt: now,
      lateJoiner: true,
      catchUpPaid: catchUpTotal
    };

    circle.members.push(newMember);
    circle.maxMembers = Math.max(circle.maxMembers, circle.members.length);

    // Current turn pot gets regular contribution
    circle.escrowBalance += regularContribution;
    if (!circle.currentTurnPaid.includes(slot)) {
      circle.currentTurnPaid.push(slot);
    }

    // Split catch-up equally among past turn recipients!
    if (turnsElapsed > 0 && catchUpTotal > 0) {
      const perPastRecipient = Math.floor(catchUpTotal / turnsElapsed);
      for (let t = 1; t <= turnsElapsed; t++) {
        const pastRecipient = circle.members.find(m => m.slot === t);
        if (pastRecipient) {
          circle.claimablePayouts.push({
            id: `claim_${Date.now()}_${t}`,
            recipientName: pastRecipient.name,
            recipientNpub: pastRecipient.npub,
            amountSats: perPastRecipient,
            reason: `Late Joiner Catch-Up Split from ${cleanName}`,
            turn: t,
            createdAt: now,
            claimed: false
          });
        }
      }
    }

    circle.bookAuditLog.push({
      id: `log_${now}`,
      action: 'LATE_JOINER_CATCHUP',
      description: `${cleanName} joined active circle at Slot #${slot}. Paid ${totalRequiredSats.toLocaleString()} sats (${regularContribution} regular + ${catchUpTotal} catch-up split among ${turnsElapsed} past collectors).`,
      actor: cleanName,
      sats: totalRequiredSats,
      blockHeight: currentBlock,
      timestamp: now
    });

    const signedEvent = signStateEvent(circle.id, circle);
    circle.lastNostrEvent = signedEvent;
    return res.json({ success: true, member: newMember, catchUpTotal, totalRequiredSats, circle });
  }

  return res.status(400).json({ error: 'Circle has already completed.' });
});

// 3. Host Starts Circle
app.post('/api/circles/:id/start', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'OPEN') return res.status(400).json({ error: 'Circle is already active or finished.' });
  if (circle.members.length < 2) return res.status(400).json({ error: 'Need at least 2 members to begin.' });

  _startCircle(circle);
  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json({ success: true, circle });
});

function _startCircle(circle) {
  const now = Date.now();
  circle.status = 'ACTIVE';
  circle.currentTurn = 1;
  circle.turnStartTime = now;
  circle.turnDeadline = now + (circle.turnDuration * 1000);
  circle.currentTurnPaid = [];

  circle.bookAuditLog.push({
    id: `log_${now}`,
    action: 'CIRCLE_STARTED',
    description: `Exercise book started! Turn #1 is live. (Recipient: ${circle.members[0]?.name}).`,
    actor: circle.hostName,
    blockHeight: 976385,
    timestamp: now
  });
}

// Generate BOLT11 Invoice
app.post('/api/circles/:id/invoices', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'ACTIVE') return res.status(400).json({ error: 'Circle is not active.' });

  const { memberSlot, memberName } = req.body;
  const memo = `Ajo contribution for Turn #${circle.currentTurn} - ${circle.name}`;
  const bolt11 = generateBolt11(circle.contributionAmountSats, memo, memberName);

  res.json({
    circleId: circle.id,
    turn: circle.currentTurn,
    amountSats: circle.contributionAmountSats,
    memo,
    bolt11,
    expiresAt: circle.turnDeadline
  });
});

// 3 & 4. 1-Signature Turn Payment & Automatic Pot Payout
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

  const now = Date.now();
  const currentBlock = 976385;
  const verifiedPreimage = (typeof preimage === 'string' && preimage.length >= 32)
    ? preimage
    : Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  // Mark member paid
  member.paidCurrent = true;
  if (!circle.currentTurnPaid.includes(member.slot)) {
    circle.currentTurnPaid.push(member.slot);
  }
  circle.escrowBalance += circle.contributionAmountSats;

  circle.bookAuditLog.push({
    id: `log_${now}`,
    action: 'TURN_PAID',
    description: `${member.name} paid ${circle.contributionAmountSats.toLocaleString()} sats for Turn #${circle.currentTurn}.`,
    actor: member.name,
    sats: circle.contributionAmountSats,
    preimage: verifiedPreimage,
    blockHeight: currentBlock,
    timestamp: now
  });

  let payoutDisbursed = false;
  let payoutDetails = null;

  // Check if ALL active members have paid for this turn
  const totalMembers = circle.members.length;
  if (circle.currentTurnPaid.length >= totalMembers) {
    payoutDetails = _disburseRound(circle, verifiedPreimage);
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

// 5 & 6. Close Late Turn & Public MISSED Stamp
app.post('/api/circles/:id/close-late-turn', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });
  if (circle.status !== 'ACTIVE') return res.status(400).json({ error: 'Circle is not active.' });

  const now = Date.now();
  const currentBlock = 976385;
  let coveredCount = 0;
  let missedCount = 0;

  circle.members.forEach(m => {
    if (!m.paidCurrent) {
      if (m.depositSats >= circle.contributionAmountSats) {
        // Mechanic #5: 1x Deposit Default Coverage
        m.depositSats -= circle.contributionAmountSats;
        m.paidCurrent = true;
        circle.currentTurnPaid.push(m.slot);
        circle.escrowBalance += circle.contributionAmountSats;
        coveredCount++;

        circle.bookAuditLog.push({
          id: `log_${Date.now()}_cov_${m.slot}`,
          action: 'DEPOSIT_SLASHED_FOR_COVERAGE',
          description: `1x Security Deposit slashed for ${m.name} to cover missing contribution for Turn #${circle.currentTurn}.`,
          actor: m.name,
          sats: circle.contributionAmountSats,
          blockHeight: currentBlock,
          timestamp: Date.now()
        });
      } else {
        // Mechanic #6: Public MISSED Stamp
        m.missed = true;
        missedCount++;
      }
    }
  });

  circle.bookAuditLog.push({
    id: `log_${now}_late`,
    action: 'LATE_TURN_CLOSED',
    description: `Late Turn #${circle.currentTurn} closed (${coveredCount} covered by deposit, ${missedCount} stamped MISSED).`,
    actor: 'Communal Guard',
    blockHeight: currentBlock,
    timestamp: now
  });

  const payoutDetails = _disburseRound(circle);
  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json({
    success: true,
    coveredCount,
    missedCount,
    payoutDetails,
    circle
  });
});

// 8. Claimable Escrow ("No Stuck Money")
app.post('/api/circles/:id/claim-payout', (req, res) => {
  const circle = circles.get(req.params.id);
  if (!circle) return res.status(404).json({ error: 'Circle not found' });

  const { claimId, recipientName, bolt11Invoice } = req.body;
  const claim = circle.claimablePayouts?.find(p => p.id === claimId || (p.recipientName === recipientName && !p.claimed));

  if (!claim) return res.status(404).json({ error: 'No unclaimed payout found for this recipient.' });
  if (claim.claimed) return res.status(400).json({ error: 'Payout has already been claimed.' });

  const now = Date.now();
  const preimage = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  claim.claimed = true;
  claim.claimedAt = now;
  claim.preimage = preimage;

  circle.bookAuditLog.push({
    id: `log_${now}`,
    action: 'PAYOUT_CLAIMED',
    description: `${claim.recipientName} claimed ${claim.amountSats.toLocaleString()} sats via Lightning (${claim.reason || `Turn #${claim.turn} Payout`}).`,
    actor: claim.recipientName,
    sats: claim.amountSats,
    preimage,
    blockHeight: 976385,
    timestamp: now
  });

  const signedEvent = signStateEvent(circle.id, circle);
  circle.lastNostrEvent = signedEvent;

  res.json({
    success: true,
    claim,
    preimage,
    circle
  });
});

function _disburseRound(circle, preimage) {
  const recipientSlot = circle.currentTurn;
  const recipient = circle.members.find(m => m.slot === recipientSlot) || circle.members[0];

  const grossPot = circle.escrowBalance;
  // 0.5% protocol fee
  const fee = Math.floor((grossPot * 50) / 10000);
  const netPayout = grossPot - fee;
  const now = Date.now();
  const currentBlock = 976385;

  const verifiedPreimage = preimage || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  // Generate Nostr NIP-58 Completion Badge Event (Kind 8)
  const badgeEvent = finalizeEvent({
    kind: 8,
    created_at: Math.floor(now / 1000),
    tags: [
      ['a', `30009:${coordinatorPubkey}:ajobook-turn-completion`],
      ['p', recipient.npub || coordinatorPubkey],
      ['circle', circle.id],
      ['turn', String(circle.currentTurn)],
      ['amount', String(netPayout)],
      ['preimage', verifiedPreimage]
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
    preimage: verifiedPreimage,
    nostrReceiptId: badgeEvent.id,
    nostrEvent: badgeEvent,
    timestamp: now
  };

  circle.turnHistory.push(turnRecord);
  circle.nostrReceipts.push(badgeEvent);
  circle.escrowBalance = 0;

  // Log pot disbursement
  circle.bookAuditLog.push({
    id: `log_${now}_disb`,
    action: 'POT_DISBURSED',
    description: `Pot of ${netPayout.toLocaleString()} sats disbursed autonomously to ${recipient.name} for Round #${circle.currentTurn}.`,
    actor: recipient.name,
    sats: netPayout,
    preimage: verifiedPreimage,
    nostrReceiptId: badgeEvent.id,
    blockHeight: currentBlock,
    timestamp: now
  });

  // Advance turn or complete circle
  if (circle.currentTurn >= circle.members.length) {
    circle.status = 'COMPLETED';

    // Mechanic #5: Refund remaining deposits to members
    circle.members.forEach(m => {
      if (m.depositSats > 0) {
        circle.bookAuditLog.push({
          id: `log_${now}_ref_${m.slot}`,
          action: 'DEPOSIT_REFUNDED',
          description: `Full circle complete! ${m.depositSats.toLocaleString()} sats security deposit refunded to ${m.name}.`,
          actor: m.name,
          sats: m.depositSats,
          blockHeight: currentBlock,
          timestamp: now
        });
      }
    });
  } else {
    circle.currentTurn += 1;
    circle.turnStartTime = now;
    circle.turnDeadline = now + (circle.turnDuration * 1000);
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
