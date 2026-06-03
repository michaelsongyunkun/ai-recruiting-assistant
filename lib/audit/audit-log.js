export function createAuditEvent({ actorId, organizationId, action, entityType, entityId, metadata = {} }) {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    actorId,
    organizationId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString()
  };
}
