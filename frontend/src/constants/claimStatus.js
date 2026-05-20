// Claim Status Constants
export const CLAIM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Statuses that can be approved/rejected
export const ACTIONABLE_STATUSES = [
  CLAIM_STATUS.SUBMITTED,
  CLAIM_STATUS.DRAFT,
  'pending' // Support existing claims in database
];

// Status display labels
export const CLAIM_STATUS_LABELS = {
  [CLAIM_STATUS.DRAFT]: 'Draft',
  [CLAIM_STATUS.SUBMITTED]: 'Submitted',
  [CLAIM_STATUS.APPROVED]: 'Approved',
  [CLAIM_STATUS.REJECTED]: 'Rejected'
};

// Status colors for badges
export const CLAIM_STATUS_COLORS = {
  [CLAIM_STATUS.DRAFT]: '#6b7280',
  [CLAIM_STATUS.SUBMITTED]: '#b8860b',
  [CLAIM_STATUS.APPROVED]: '#16a34a',
  [CLAIM_STATUS.REJECTED]: '#dc2626'
};

export default CLAIM_STATUS;
