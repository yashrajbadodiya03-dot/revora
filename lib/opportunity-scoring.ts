export type OpportunityType =
  | "missed_call"
  | "old_estimate"
  | "inquiry"
  | "no_follow_up";

export type OpportunityStatus =
  | "new"
  | "contacted"
  | "in_progress"
  | "recovered"
  | "lost";

export interface OpportunityInput {
  type: OpportunityType;
  revenue: number;
  hoursSinceCreated: number;
  status?: OpportunityStatus;
  customerResponded?: boolean;
  followUpCount?: number;
}

export interface OpportunityScore {
  score: number;
  revenueAtRisk: number;
  recoveryProbability: number;
  recommendedAction: string;
  urgency: "critical" | "high" | "medium" | "low";
  reason: string;
}

const TYPE_WEIGHTS: Record<OpportunityType, number> = {
  missed_call: 24,
  old_estimate: 20,
  inquiry: 18,
  no_follow_up: 14,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTimeScore(hours: number) {
  if (hours <= 1) return 25;
  if (hours <= 4) return 20;
  if (hours <= 12) return 16;
  if (hours <= 24) return 12;
  if (hours <= 72) return 7;
  return 3;
}

function getRevenueScore(revenue: number) {
  if (revenue >= 10000) return 25;
  if (revenue >= 7500) return 22;
  if (revenue >= 5000) return 19;
  if (revenue >= 2500) return 14;
  if (revenue >= 1000) return 9;
  return 5;
}

function getResponseScore(customerResponded?: boolean) {
  if (customerResponded === true) return 8;
  if (customerResponded === false) return 0;
  return 4;
}

function getFollowUpAdjustment(count: number) {
  if (count === 0) return 6;
  if (count === 1) return 2;
  if (count >= 3) return -5;
  return 0;
}

function getProbability(
  score: number,
  type: OpportunityType,
) {
  const typeAdjustment: Record<OpportunityType, number> = {
    missed_call: 4,
    old_estimate: 2,
    inquiry: 3,
    no_follow_up: 0,
  };

  return clamp(
    Math.round(
      35 + score * 0.55 + typeAdjustment[type],
    ),
    15,
    92,
  );
}

function getUrgency(
  score: number,
): OpportunityScore["urgency"] {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function getRecommendedAction(
  type: OpportunityType,
  hours: number,
  score: number,
) {
  if (score >= 85) {
    return "Immediate personal outreach";
  }

  if (type === "missed_call") {
    if (hours <= 1) {
      return "Call back immediately";
    }

    return "Priority callback";
  }

  if (type === "old_estimate") {
    return "Send estimate follow-up";
  }

  if (type === "inquiry") {
    return "Respond to inquiry";
  }

  return "Start follow-up sequence";
}

function getReason(
  type: OpportunityType,
  revenue: number,
  hours: number,
) {
  const revenueText = `$${revenue.toLocaleString("en-US")}`;

  const roundedHours = Math.max(
    0,
    Math.round(hours * 10) / 10,
  );

  if (type === "missed_call") {
    return `${revenueText} opportunity from a missed call ${roundedHours}h ago`;
  }

  if (type === "old_estimate") {
    return `${revenueText} estimate has been waiting for follow-up`;
  }

  if (type === "inquiry") {
    return `${revenueText} inquiry has not received a timely response`;
  }

  return `${revenueText} opportunity has no recent follow-up activity`;
}

export function calculateOpportunityScore(
  opportunity: OpportunityInput,
): OpportunityScore {
  const {
    type,
    revenue,
    hoursSinceCreated,
    customerResponded,
    followUpCount = 0,
  } = opportunity;

  const safeRevenue = Math.max(0, revenue);
  const safeHours = Math.max(0, hoursSinceCreated);
  const safeFollowUpCount = Math.max(
    0,
    followUpCount,
  );

  const typeScore = TYPE_WEIGHTS[type];
  const timeScore = getTimeScore(safeHours);
  const revenueScore = getRevenueScore(safeRevenue);
  const responseScore =
    getResponseScore(customerResponded);
  const followUpScore =
    getFollowUpAdjustment(safeFollowUpCount);

  const rawScore =
    typeScore +
    timeScore +
    revenueScore +
    responseScore +
    followUpScore;

  const score = clamp(
    Math.round(rawScore),
    0,
    100,
  );

  const recoveryProbability = getProbability(
    score,
    type,
  );

  const urgency = getUrgency(score);

  const recommendedAction =
    getRecommendedAction(
      type,
      safeHours,
      score,
    );

  return {
    score,
    revenueAtRisk: safeRevenue,
    recoveryProbability,
    recommendedAction,
    urgency,
    reason: getReason(
      type,
      safeRevenue,
      safeHours,
    ),
  };
}