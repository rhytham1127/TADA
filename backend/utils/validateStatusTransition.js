const { CLAIM_STATUS } = require('../constants/claimStatus');

// Generic validator for state transitions.
// - currentStatus: string
// - allowedNextStatuses: array of strings
// Returns: { ok: boolean, reason?: string }
const validateStatusTransition = (currentStatus, allowedNextStatuses = []) => {
  const cur = (currentStatus || '').toString().trim().toLowerCase();


  const allowed = (allowedNextStatuses || []).map((s) => (s || '').toString().toLowerCase());

  if (!cur) {
    return { ok: false, reason: 'Current status missing' };
  }

  // allowedNextStatuses represents the CURRENT status that we allow transitions from.
  // Example usage in controllers:
  // validateStatusTransition(currentStatus, ['submitted'])
  const allowedFrom = allowed;

  if (!allowedFrom.includes(cur)) {
    return { ok: false, reason: `Transition not allowed from status='${currentStatus}'` };
  }

  return { ok: true };
};

module.exports = { validateStatusTransition };

