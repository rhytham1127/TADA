const db = require('../db');

const logAudit = async ({
  userId = null,
  userName = null,
  role = null,
  action,
  module = null,
  entityType = null,
  entityId = null,
  remarks = null,
  ipAddress = null,
  req = null
}) => {
  try {
    const ip = ipAddress || (req && (req.headers['x-forwarded-for'] || req.connection?.remoteAddress)) || null;
    const entityIdStr = entityId != null ? String(entityId) : null;

    await db.query(
      `INSERT INTO audit_logs (user_id, user_name, role, action, module, entity_type, entity_id, remarks, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, userName, role, action, module, entityType, entityIdStr, remarks, ip]
    );
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit entry:', err.message);
  }
};

module.exports = { logAudit };
