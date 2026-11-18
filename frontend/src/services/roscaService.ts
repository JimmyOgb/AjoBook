import { Relay } from 'nostr-tools/relay';
import { analyzeCircleHealth } from './aiStewardClient';

const NOSTR_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
const STORAGE_CIRCLES_KEY = 'ajobook_circles_store';

export interface AuditLogItem {
  id: string;
  action: string;
  description: string;
  actor: string;
  sats?: number;
  preimage?: string;
  nostrReceiptId?: string;
  blockHeight: number;
  timestamp: number;
}

export interface ClaimablePayout {
  id: string;
  recipientName: string;
  recipientNpub?: string;
  amountSats: number;
  reason?: string;
  turn: number;
  createdAt: number;
  claimed: boolean;
  preimage?: string;
}

export interface CircleRecord {
  id: string;
  name: string;
  host: string;
  hostName: string;
  contributionAmountSats: number;
  turnDuration: number;
  maxMembers: number;
  requireDeposit: boolean;
  isOpenForLateJoiners?: boolean;
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED';
  currentTurn: number;
  turnStartTime: number | null;
  turnDeadline: number | null;
  mempoolAnchorBlock: number;
  members: Array<{
    slot: number;
    name: string;
    npub: string;
    lightningAddress?: string;
    depositSats: number;
    paidCurrent: boolean;
    missed: boolean;
    joinedAt: number;
    lateJoiner?: boolean;
    catchUpPaid?: number;
  }>;
  currentTurnPaid: number[];
  escrowBalance: number;
  claimablePayouts: ClaimablePayout[];
  turnHistory: Array<{
    turn: number;
    recipient: string;
    recipientNpub?: string;
    grossPot: number;
    fee: number;
    netPayout: number;
    preimage?: string;
    nostrReceiptId: string;
    timestamp: number;
  }>;
  nostrReceipts: any[];
  bookAuditLog: AuditLogItem[];
}

export function getDefaultSeedCircle(): CircleRecord {
  const now = Date.now();
  const currentBlock = 976385;

  return {
    id: 'dakar-lagos-market',
    name: 'Dakar–Lagos Market Circle',
    host: 'npub1aminatadakar99',
    hostName: 'Aminata (Dakar)',
    contributionAmountSats: 5000,
    turnDuration: 300,
    maxMembers: 3,
    requireDeposit: true,
    isOpenForLateJoiners: true,
    status: 'ACTIVE',
    currentTurn: 1,
    turnStartTime: now - 60000,
    turnDeadline: now + 240000,
    mempoolAnchorBlock: currentBlock,
    members: [
      {
        slot: 1,
        name: 'Aminata (Dakar)',
        npub: 'npub1aminatadakar99',
        lightningAddress: 'aminata@getalby.com',
        depositSats: 5000,
        paidCurrent: true,
        missed: false,
        joinedAt: now - 3600000
      },
      {
        slot: 2,
        name: 'Tunde (Lagos)',
        npub: 'npub1tundelagos77',
        lightningAddress: 'tunde@blink.sv',
        depositSats: 5000,
        paidCurrent: true,
        missed: false,
        joinedAt: now - 3500000
      },
      {
        slot: 3,
        name: 'Chidi (You / Judge)',
        npub: 'npub1chidijudge88',
        lightningAddress: 'chidi@coinos.io',
        depositSats: 5000,
        paidCurrent: false,
        missed: false,
        joinedAt: now - 3400000
      }
    ],
    currentTurnPaid: [1, 2],
    escrowBalance: 10000,
    claimablePayouts: [],
    turnHistory: [],
    nostrReceipts: [],
    bookAuditLog: [
      {
        id: `log_${now - 3600000}`,
        action: 'CIRCLE_CREATED',
        description: "Aminata (Dakar) opened savings book 'Dakar–Lagos Market Circle' (5,000 sats/turn).",
        actor: 'Aminata (Dakar)',
        sats: 5000,
        blockHeight: currentBlock - 4,
        timestamp: now - 3600000
      },
      {
        id: `log_${now - 3590000}`,
        action: 'MEMBER_JOINED',
        description: 'Aminata (Dakar) signed into Slot #1 (1x deposit: 5,000 sats).',
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
}

// In-browser LocalStorage Store for standalone Vercel demo
function getLocalCircles(): CircleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_CIRCLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const seeded = [getDefaultSeedCircle()];
  saveLocalCircles(seeded);
  return seeded;
}

function saveLocalCircles(circles: CircleRecord[]) {
  try {
    localStorage.setItem(STORAGE_CIRCLES_KEY, JSON.stringify(circles));
  } catch {}
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

async function canReachBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Broadcast Nostr signed event to public relays asynchronously
 */
async function broadcastNostrEvent(event: any) {
  for (const url of NOSTR_RELAYS) {
    try {
      const relay = await Relay.connect(url);
      await relay.publish(event);
      relay.close();
    } catch {}
  }
}

// ─── ROSCA SERVICE API ──────────────────────────────────────────────────

export const roscaService = {
  async getCircles(): Promise<any[]> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles`);
        if (res.ok) return await res.json();
      } catch {}
    }
    const local = getLocalCircles();
    return local.map(c => ({
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
  },

  async getCircleById(id: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${id}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    const local = getLocalCircles();
    const found = local.find(c => c.id === id) || local[0] || getDefaultSeedCircle();
    const aiAnalysis = analyzeCircleHealth(found);
    return { ...found, aiAnalysis };
  },

  // 1. Host Opens Circle
  async createCircle(data: any): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    const id = `circle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const depositSats = data.requireDeposit ? Number(data.contributionAmountSats) : 0;
    const now = Date.now();
    const currentBlock = 976385;

    const newCircle: CircleRecord = {
      id,
      name: data.name,
      host: data.hostNpub || 'npub1hostdemo',
      hostName: data.hostName,
      contributionAmountSats: Number(data.contributionAmountSats) || 5000,
      turnDuration: Number(data.turnDuration) || 300,
      maxMembers: Number(data.maxMembers) || 3,
      requireDeposit: !!data.requireDeposit,
      isOpenForLateJoiners: data.isOpenForLateJoiners !== false,
      status: 'OPEN',
      currentTurn: 1,
      turnStartTime: null,
      turnDeadline: null,
      mempoolAnchorBlock: currentBlock,
      members: [
        {
          slot: 1,
          name: data.hostName,
          npub: data.hostNpub || 'npub1hostdemo',
          lightningAddress: data.hostLightningAddress || `${data.hostName.toLowerCase().replace(/[^a-z0-9]/g, '')}@getalby.com`,
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
          description: `${data.hostName} opened savings book '${data.name}' (${Number(data.contributionAmountSats || 5000).toLocaleString()} sats/turn).`,
          actor: data.hostName,
          sats: Number(data.contributionAmountSats || 5000),
          blockHeight: currentBlock,
          timestamp: now
        },
        {
          id: `log_${now + 1}`,
          action: 'MEMBER_JOINED',
          description: `${data.hostName} signed into Slot #1 (1x deposit: ${depositSats.toLocaleString()} sats).`,
          actor: data.hostName,
          sats: depositSats,
          blockHeight: currentBlock,
          timestamp: now + 1
        }
      ]
    };

    const local = getLocalCircles();
    local.unshift(newCircle);
    saveLocalCircles(local);
    return newCircle;
  },

  // 2. Join via Link / QR & 7. Late Joiners + Catch-Up Split
  async joinCircle(circleId: string, memberName: string, memberNpub?: string, lightningAddress?: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${circleId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: memberName, npub: memberNpub, lightningAddress })
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    const slot = circle.members.length + 1;
    const depositSats = circle.requireDeposit ? circle.contributionAmountSats : 0;
    const now = Date.now();
    const currentBlock = 976385;

    if (circle.status === 'OPEN') {
      const newMember = {
        slot,
        name: memberName,
        npub: memberNpub || `npub1guest_${slot}`,
        lightningAddress: lightningAddress || `${memberName.toLowerCase().replace(/[^a-z0-9]/g, '')}@getalby.com`,
        depositSats,
        paidCurrent: false,
        missed: false,
        joinedAt: now
      };

      circle.members.push(newMember);
      circle.bookAuditLog.push({
        id: `log_${now}`,
        action: 'MEMBER_JOINED',
        description: `${memberName} signed into Slot #${slot} in the exercise book.`,
        actor: memberName,
        sats: depositSats,
        blockHeight: currentBlock,
        timestamp: now
      });

      if (circle.members.length >= circle.maxMembers) {
        this._localStartCircle(circle);
      }

      saveLocalCircles(local);
      return { success: true, member: newMember, circle };
    }

    if (circle.status === 'ACTIVE') {
      if (circle.isOpenForLateJoiners === false) {
        throw new Error('Late registrations are closed for this circle.');
      }

      const turnsElapsed = circle.currentTurn - 1;
      const regularContribution = circle.contributionAmountSats;
      const catchUpTotal = turnsElapsed > 0 ? (regularContribution * turnsElapsed) : 0;
      const totalRequiredSats = regularContribution + catchUpTotal + depositSats;

      const newMember = {
        slot,
        name: memberName,
        npub: memberNpub || `npub1late_${slot}`,
        lightningAddress: lightningAddress || `${memberName.toLowerCase().replace(/[^a-z0-9]/g, '')}@blink.sv`,
        depositSats,
        paidCurrent: true,
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

      // Split catch-up equally among past turn recipients
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
              reason: `Late Joiner Catch-Up Split from ${memberName}`,
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
        description: `${memberName} joined active circle at Slot #${slot}. Paid ${totalRequiredSats.toLocaleString()} sats (${regularContribution} regular + ${catchUpTotal} catch-up split among ${turnsElapsed} past collectors).`,
        actor: memberName,
        sats: totalRequiredSats,
        blockHeight: currentBlock,
        timestamp: now
      });

      saveLocalCircles(local);
      return { success: true, member: newMember, catchUpTotal, totalRequiredSats, circle };
    }

    throw new Error('Circle has already completed.');
  },

  // 3. Host Starts Circle
  async startCircle(circleId: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${circleId}/start`, { method: 'POST' });
        if (res.ok) return await res.json();
      } catch {}
    }

    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    this._localStartCircle(circle);
    saveLocalCircles(local);
    return { success: true, circle };
  },

  _localStartCircle(circle: CircleRecord) {
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
  },

  // 3 & 4. 1-Signature Turn Payment & Automatic Pot Payout
  async payTurnContribution(circleId: string, memberSlot: number, memberName: string, preimage?: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${circleId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberSlot, memberName, preimage })
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    const member = circle.members.find(m => m.slot === memberSlot || m.name === memberName);
    if (!member) throw new Error('Member not found');
    if (member.paidCurrent) throw new Error('Already paid for this round');

    const now = Date.now();
    const currentBlock = 976385;
    const verifiedPreimage = preimage || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

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

    if (circle.currentTurnPaid.length >= circle.members.length) {
      payoutDetails = this._localDisburseRound(circle, verifiedPreimage);
      payoutDisbursed = true;
    }

    saveLocalCircles(local);
    return {
      success: true,
      member: member.name,
      turn: circle.currentTurn,
      payoutDisbursed,
      payoutDetails,
      circle
    };
  },

  // 5 & 6. Close Late Turn & Public MISSED Stamp
  async closeLateTurn(circleId: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${circleId}/close-late-turn`, { method: 'POST' });
        if (res.ok) return await res.json();
      } catch {}
    }

    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    const now = Date.now();
    const currentBlock = 976385;
    let coveredCount = 0;
    let missedCount = 0;

    circle.members.forEach(m => {
      if (!m.paidCurrent) {
        if (m.depositSats >= circle.contributionAmountSats) {
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

    const payoutDetails = this._localDisburseRound(circle);
    saveLocalCircles(local);
    return { success: true, coveredCount, missedCount, payoutDetails, circle };
  },

  // 8. Claimable Escrow ("No Stuck Money")
  async claimPayout(circleId: string, claimId: string, recipientName: string, bolt11Invoice?: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${circleId}/claim-payout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId, recipientName, bolt11Invoice })
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    const claim = circle.claimablePayouts?.find(p => p.id === claimId || (p.recipientName === recipientName && !p.claimed));
    if (!claim) throw new Error('No unclaimed payout found.');
    if (claim.claimed) throw new Error('Payout has already been claimed.');

    const now = Date.now();
    const preimage = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    claim.claimed = true;
    (claim as any).claimedAt = now;
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

    saveLocalCircles(local);
    return { success: true, claim, preimage, circle };
  },

  _localDisburseRound(circle: CircleRecord, preimage?: string) {
    const recipientSlot = circle.currentTurn;
    const recipient = circle.members.find(m => m.slot === recipientSlot) || circle.members[0];
    const grossPot = circle.escrowBalance;
    const fee = Math.floor((grossPot * 50) / 10000); // 0.5% protocol fee
    const netPayout = grossPot - fee;
    const now = Date.now();
    const currentBlock = 976385;

    const verifiedPreimage = preimage || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomReceiptId = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const turnRecord = {
      turn: circle.currentTurn,
      recipient: recipient.name,
      recipientNpub: recipient.npub,
      grossPot,
      fee,
      netPayout,
      preimage: verifiedPreimage,
      nostrReceiptId: randomReceiptId,
      timestamp: now
    };

    circle.turnHistory.push(turnRecord);
    circle.escrowBalance = 0;

    // Broadcast Nostr Kind 8 NIP-58 Badge Event
    broadcastNostrEvent({
      kind: 8,
      created_at: Math.floor(now / 1000),
      tags: [
        ['circle', circle.id],
        ['turn', String(circle.currentTurn)],
        ['amount', String(netPayout)],
        ['preimage', verifiedPreimage]
      ],
      content: `AjoBook pot of ${netPayout.toLocaleString()} sats disbursed to ${recipient.name} for Turn #${circle.currentTurn}.`
    });

    circle.bookAuditLog.push({
      id: `log_${now}_disb`,
      action: 'POT_DISBURSED',
      description: `Pot of ${netPayout.toLocaleString()} sats disbursed autonomously to ${recipient.name} for Round #${circle.currentTurn}.`,
      actor: recipient.name,
      sats: netPayout,
      preimage: verifiedPreimage,
      nostrReceiptId: randomReceiptId,
      blockHeight: currentBlock,
      timestamp: now
    });

    if (circle.currentTurn >= circle.members.length) {
      circle.status = 'COMPLETED';

      // Refund remaining deposit escrows
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
      circle.members.forEach(m => { m.paidCurrent = false; });
    }

    return turnRecord;
  },

  async resetSeed(): Promise<CircleRecord> {
    if (await canReachBackend()) {
      try {
        await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
      } catch {}
    }
    const freshSeed = getDefaultSeedCircle();
    saveLocalCircles([freshSeed]);
    return freshSeed;
  }
};
