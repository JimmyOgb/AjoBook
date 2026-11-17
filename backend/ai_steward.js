/**
 * AI Circle Steward (Ajo / Tontine AI Advisor)
 * Provides autonomous risk analysis, health metrics, and multilingual reminders
 * in English, French (Dakar / West Africa), and Nigerian Pidgin.
 */

export function analyzeCircleHealth(circle) {
  const members = circle.members || [];
  const totalMembers = members.length;
  if (totalMembers === 0) {
    return {
      score: 100,
      riskLevel: 'LOW',
      analysis: 'Circle is waiting for members. 100% deposit escrow configured.',
      onTimeRate: '100%'
    };
  }

  const currentTurn = circle.currentTurn || 1;
  const turnHistory = circle.turnHistory || [];

  // Calculate payment statistics
  let totalOpportunities = 0;
  let onTimePayments = 0;
  let depositUsageCount = 0;

  turnHistory.forEach((turn) => {
    (turn.contributions || []).forEach((c) => {
      totalOpportunities++;
      if (c.status === 'PAID') onTimePayments++;
      if (c.status === 'COVERED_BY_DEPOSIT') depositUsageCount++;
    });
  });

  // Current turn analysis
  const currentPaidCount = (circle.currentTurnPaid || []).length;
  const currentTurnElapsed = Date.now() - (circle.turnStartTime || Date.now());
  const turnDurationMs = (circle.turnDuration || 300) * 1000;
  const isTurnOverdue = currentTurnElapsed > turnDurationMs;

  let baseScore = 98;
  if (depositUsageCount > 0) baseScore -= depositUsageCount * 12;
  if (isTurnOverdue && currentPaidCount < totalMembers) baseScore -= 18;

  // Escrow bonus
  if (circle.requireDeposit) baseScore += 2;

  const score = Math.max(15, Math.min(100, baseScore));

  let riskLevel = 'LOW';
  if (score < 60) riskLevel = 'HIGH';
  else if (score < 80) riskLevel = 'MEDIUM';

  let analysis = '';
  if (score >= 90) {
    analysis = 'Excellent communal discipline! All members contribute swiftly. Lightning liquidity flowing smoothly.';
  } else if (score >= 70) {
    analysis = 'Good circle health. Minor latency in turn settlements. 1x security deposit escrow protects the pot recipient.';
  } else {
    analysis = 'Caution advised: Turn deadline exceeded. Automated deposit slashing safeguard is active to guarantee collector payout.';
  }

  const onTimeRate = totalOpportunities > 0
    ? `${Math.round((onTimePayments / totalOpportunities) * 100)}%`
    : '100%';

  return {
    score,
    riskLevel,
    analysis,
    onTimeRate,
    depositSecured: !!circle.requireDeposit,
    activeTurnElapsedSeconds: Math.floor(currentTurnElapsed / 1000),
    missingCount: totalMembers - currentPaidCount
  };
}

export function generateReminders(circle, memberName, recipientName) {
  const amountSats = circle.contributionAmountSats || circle.contributionAmount || 5000;
  const circleName = circle.name || 'Dakar–Lagos Market Circle';
  const round = circle.currentTurn || 1;
  const recipient = recipientName || 'the round collector';

  return {
    en: {
      lang: 'English',
      flag: '🇬🇧',
      title: 'Polite Community Notice',
      message: `Hello ${memberName}! Your ROSCA contribution of ${amountSats.toLocaleString()} sats for Round #${round} in '${circleName}' is due. Please settle your Lightning invoice to disburse the pot to ${recipient} on time.`
    },
    fr: {
      lang: 'Français (Dakar Tontine)',
      flag: '🇸🇳',
      title: 'Rappel de Tontine',
      message: `Bonjour ${memberName} ! Votre cotisation de ${amountSats.toLocaleString()} sats pour le Tour n°${round} de la tontine '${circleName}' est arrivée à échéance. Merci de régler votre facture Lightning afin de libérer la cagnotte pour ${recipient} sans délai.`
    },
    pcm: {
      lang: 'Nigerian Pidgin',
      flag: '🇳🇬',
      title: 'Ajo Sharp Reminder',
      message: `Bro/Sister ${memberName}, how far! Your Ajo contribution of ${amountSats.toLocaleString()} sats for Turn #${round} don land. Abeg sharp sharp pay the Lightning invoice make the pot reach ${recipient} hand quick quick.`
    }
  };
}
