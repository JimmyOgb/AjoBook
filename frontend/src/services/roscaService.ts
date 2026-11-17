import { Relay } from 'nostr-tools/relay';
import { analyzeCircleHealth } from './aiStewardClient';

const NOSTR_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol'];
const STORAGE_CIRCLES_KEY = 'ajobook_circles_store';

export interface CircleRecord {
  id: string;
  name: string;
  host: string;
  hostName: string;
  contributionAmountSats: number;
  turnDuration: number;
  maxMembers: number;
  requireDeposit: boolean;
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED';
  currentTurn: number;
  turnStartTime: number;
  turnDeadline: number;
  members: Array<{
    slot: number;
    name: string;
    npub: string;
    depositSats: number;
    paidCurrent: boolean;
    missed: boolean;
    joinedAt: number;
  }>;
  currentTurnPaid: number[];
  escrowBalance: number;
  turnHistory: Array<{
    turn: number;
    recipient: string;
    grossPot: number;
    fee: number;
    netPayout: number;
    nostrReceiptId: string;
    timestamp: number;
  }>;
  nostrReceipts: any[];
}

export function getDefaultSeedCircle(): CircleRecord {
  return {
    id: 'dakar-lagos-market',
    name: 'Dakar–Lagos Market Circle',
    host: 'npub1aminatadakar99',
    hostName: 'Aminata (Dakar)',
    contributionAmountSats: 5000,
    turnDuration: 300,
    maxMembers: 3,
    requireDeposit: true,
    status: 'ACTIVE',
    currentTurn: 1,
    turnStartTime: Date.now() - 60000,
    turnDeadline: Date.now() + 240000,
    members: [
      {
        slot: 1,
        name: 'Aminata (Dakar)',
        npub: 'npub1aminatadakar99',
        depositSats: 5000,
        paidCurrent: true,
        missed: false,
        joinedAt: Date.now() - 3600000
      },
      {
        slot: 2,
        name: 'Tunde (Lagos)',
        npub: 'npub1tundelagos77',
        depositSats: 5000,
        paidCurrent: true,
        missed: false,
        joinedAt: Date.now() - 3500000
      },
      {
        slot: 3,
        name: 'Chidi (You / Judge)',
        npub: 'npub1chidijudge88',
        depositSats: 5000,
        paidCurrent: false,
        missed: false,
        joinedAt: Date.now() - 3400000
      }
    ],
    currentTurnPaid: [1, 2],
    escrowBalance: 10000,
    turnHistory: [],
    nostrReceipts: []
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
      potBalance: c.escrowBalance
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

    const newCircle: CircleRecord = {
      id,
      name: data.name,
      host: data.hostNpub || 'npub1hostdemo',
      hostName: data.hostName,
      contributionAmountSats: Number(data.contributionAmountSats) || 5000,
      turnDuration: Number(data.turnDuration) || 300,
      maxMembers: Number(data.maxMembers) || 3,
      requireDeposit: !!data.requireDeposit,
      status: 'OPEN',
      currentTurn: 1,
      turnStartTime: Date.now(),
      turnDeadline: Date.now() + (Number(data.turnDuration) || 300) * 1000,
      members: [
        {
          slot: 1,
          name: data.hostName,
          npub: data.hostNpub || 'npub1hostdemo',
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

    const local = getLocalCircles();
    local.unshift(newCircle);
    saveLocalCircles(local);
    return newCircle;
  },

  async joinCircle(circleId: string, memberName: string, memberNpub?: string): Promise<any> {
    if (await canReachBackend()) {
      try {
        const res = await fetch(`${API_BASE}/api/circles/${circleId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: memberName, npub: memberNpub })
        });
        if (res.ok) return await res.json();
      } catch {}
    }

    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    const slot = circle.members.length + 1;
    const depositSats = circle.requireDeposit ? circle.contributionAmountSats : 0;
    circle.members.push({
      slot,
      name: memberName,
      npub: memberNpub || `npub1guest_${slot}`,
      depositSats,
      paidCurrent: false,
      missed: false,
      joinedAt: Date.now()
    });

    if (circle.members.length >= circle.maxMembers) {
      circle.status = 'ACTIVE';
      circle.currentTurn = 1;
      circle.turnStartTime = Date.now();
      circle.turnDeadline = Date.now() + (circle.turnDuration * 1000);
    }

    saveLocalCircles(local);
    return circle;
  },

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

    // Local standalone execution
    const local = getLocalCircles();
    const circle = local.find(c => c.id === circleId);
    if (!circle) throw new Error('Circle not found');

    const member = circle.members.find(m => m.slot === memberSlot || m.name === memberName);
    if (!member) throw new Error('Member not found');
    if (member.paidCurrent) throw new Error('Already paid for this round');

    member.paidCurrent = true;
    if (!circle.currentTurnPaid.includes(member.slot)) {
      circle.currentTurnPaid.push(member.slot);
    }
    circle.escrowBalance += circle.contributionAmountSats;

    let payoutDisbursed = false;
    let payoutDetails = null;

    if (circle.currentTurnPaid.length >= circle.members.length) {
      // All members paid -> DISBURSE POT AUTONOMOUSLY
      const recipientSlot = circle.currentTurn;
      const recipient = circle.members.find(m => m.slot === recipientSlot) || circle.members[0];
      const grossPot = circle.escrowBalance;
      const fee = Math.floor((grossPot * 50) / 10000); // 0.5% protocol fee
      const netPayout = grossPot - fee;

      const randomReceiptId = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      payoutDetails = {
        turn: circle.currentTurn,
        recipient: recipient.name,
        grossPot,
        fee,
        netPayout,
        nostrReceiptId: randomReceiptId,
        timestamp: Date.now()
      };

      circle.turnHistory.push(payoutDetails);
      circle.escrowBalance = 0;

      // Broadcast simulated signed badge receipt to public Nostr relays
      broadcastNostrEvent({
        kind: 8,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['circle', circle.id],
          ['turn', String(circle.currentTurn)],
          ['amount', String(netPayout)]
        ],
        content: `AjoBook pot of ${netPayout.toLocaleString()} sats disbursed to ${recipient.name} for Turn #${circle.currentTurn}.`
      });

      if (circle.currentTurn >= circle.members.length) {
        circle.status = 'COMPLETED';
      } else {
        circle.currentTurn += 1;
        circle.turnStartTime = Date.now();
        circle.turnDeadline = Date.now() + (circle.turnDuration * 1000);
        circle.currentTurnPaid = [];
        circle.members.forEach(m => { m.paidCurrent = false; });
      }

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
