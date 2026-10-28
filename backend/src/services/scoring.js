// backend/src/services/scoring.js
// Pure function scoring engine with admin-configurable rules

/**
 * Default ruleset applied when a scheme does not have custom rules configured
 */
export const defaultSchemeRules = [
  {
    id: "rule_income",
    key: "income",
    label: "Annual Income Band",
    type: "band",
    description: "Lower income applicants receive higher priority points",
    bands: [
      { max: 300000, points: 35, label: "EWS (≤ ₹3.0 Lakhs)" },
      { max: 600000, points: 25, label: "LIG (≤ ₹6.0 Lakhs)" },
      { max: 1200000, points: 15, label: "MIG (≤ ₹12.0 Lakhs)" },
      { max: 999999999, points: 5, label: "HIG (> ₹12.0 Lakhs)" }
    ]
  },
  {
    id: "rule_category",
    key: "category",
    label: "Social Quota Category",
    type: "match",
    description: "Points assigned based on affirmative social quotas",
    options: {
      "SC/ST": 30,
      "BC": 20,
      "General": 10
    }
  },
  {
    id: "rule_ph",
    key: "ph",
    label: "Differently Abled (PH)",
    type: "boolean",
    description: "Additional priority points for persons with benchmark disability",
    points: 20
  },
  {
    id: "rule_ex",
    key: "ex",
    label: "Ex-Servicemen / Defense",
    type: "boolean",
    description: "Points for armed forces veterans and families",
    points: 15
  },
  {
    id: "rule_single_woman",
    key: "singleWoman",
    label: "Single-Woman / Widow Household",
    type: "boolean",
    description: "Social security priority points for female heads of household",
    points: 15
  },
  {
    id: "rule_residence",
    key: "residenceYears",
    label: "Years of State Residence",
    type: "linear",
    description: "2 points per completed year of residence (max 20 points)",
    pointsPerUnit: 2,
    maxPoints: 20
  }
];

/**
 * Pure function to compute transparent, explainable priority score for an application
 * @param {Object} application - The application record
 * @param {Array} rules - Array of rule objects configured on the scheme
 * @returns {Object} { totalScore, breakdown, ruleVersion }
 */
export function computeScore(application, rules = defaultSchemeRules) {
  if (!application) return { totalScore: 0, breakdown: [] };

  const breakdown = [];
  let totalScore = 0;

  for (const rule of rules) {
    let earned = 0;
    let inputVal = null;
    let reason = "";

    switch (rule.type) {
      case "band": {
        const numVal = Number(application[rule.key] ?? application.income ?? 0);
        inputVal = numVal;
        const matchedBand = (rule.bands || []).find(b => numVal <= b.max);
        if (matchedBand) {
          earned = matchedBand.points || 0;
          reason = `Income of ₹${numVal.toLocaleString('en-IN')} falls in ${matchedBand.label}`;
        } else {
          reason = `Income did not qualify for any band`;
        }
        break;
      }

      case "match": {
        const catVal = String(application[rule.key] || application.category || "General");
        inputVal = catVal;
        earned = rule.options?.[catVal] ?? 0;
        reason = `Selected category: ${catVal} (${earned} points)`;
        break;
      }

      case "boolean": {
        let flag = false;
        if (rule.key === "ph" || rule.key === "ex") {
          flag = Boolean(application.reservationClaims?.[rule.key]);
        } else if (rule.key === "singleWoman") {
          flag = Boolean(application.personalDetails?.singleWoman || application.singleWoman);
        } else {
          flag = Boolean(application[rule.key]);
        }
        inputVal = flag;
        earned = flag ? (rule.points || 0) : 0;
        reason = flag ? `Special category claim verified (+${earned} pts)` : `Not claimed (0 pts)`;
        break;
      }

      case "linear": {
        const rawUnits = Number(application[rule.key] ?? application.personalDetails?.residenceYears ?? 5);
        inputVal = rawUnits;
        const calc = Math.min((rawUnits * (rule.pointsPerUnit || 1)), (rule.maxPoints || 20));
        earned = Math.max(0, calc);
        reason = `${rawUnits} years residence × ${rule.pointsPerUnit || 1} pts/yr (capped at ${rule.maxPoints})`;
        break;
      }

      default:
        earned = 0;
        reason = `Unrecognized rule type`;
    }

    breakdown.push({
      ruleId: rule.id || rule.key,
      ruleName: rule.label || rule.key,
      ruleType: rule.type,
      input: inputVal,
      points: earned,
      reason
    });

    totalScore += earned;
  }

  return {
    totalScore,
    breakdown,
    computedAt: new Date().toISOString()
  };
}
