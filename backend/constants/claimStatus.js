// Claim Status Constants
const CLAIM_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Statuses that can be approved/rejected
const ACTIONABLE_STATUSES = [
  CLAIM_STATUS.SUBMITTED,
  CLAIM_STATUS.DRAFT,
  'pending' // Support existing claims in database
];

// Default status when creating a claim
const DEFAULT_STATUS = CLAIM_STATUS.SUBMITTED;

// Default status when saving as draft
const DRAFT_STATUS = CLAIM_STATUS.DRAFT;

// Approval message that will be shown to users
const APPROVAL_MESSAGE = 'Amount will be credited within 5 working days';

module.exports = {
  CLAIM_STATUS,
  ACTIONABLE_STATUSES,
  DEFAULT_STATUS,
  DRAFT_STATUS,
  APPROVAL_MESSAGE
};
