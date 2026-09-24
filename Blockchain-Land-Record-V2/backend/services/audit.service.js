const db = require("../../database/database");


function createAuditEvent({
    entityType,
    entityId,
    action,
    performedBy = null,
    details = null
}) {

    const createdAt =
        new Date().toISOString();


    const result =
        db.prepare(`
            INSERT INTO audit_events (
                entity_type,
                entity_id,
                action,
                performed_by,
                details,
                created_at
            )
            VALUES (
                ?, ?, ?, ?, ?, ?
            )
        `).run(
            entityType,
            entityId,
            action,
            performedBy,
            details
                ? JSON.stringify(details)
                : null,
            createdAt
        );


    return db.prepare(`
        SELECT
            event_id AS eventId,
            entity_type AS entityType,
            entity_id AS entityId,
            action,
            performed_by AS performedBy,
            details,
            created_at AS createdAt
        FROM audit_events
        WHERE event_id = ?
    `).get(result.lastInsertRowid);
}


function getAuditEventsByEntity(
    entityType,
    entityId
) {

    const rows =
        db.prepare(`
            SELECT
                event_id AS eventId,
                entity_type AS entityType,
                entity_id AS entityId,
                action,
                performed_by AS performedBy,
                details,
                created_at AS createdAt
            FROM audit_events
            WHERE
                entity_type = ?
                AND entity_id = ?
            ORDER BY created_at ASC
        `).all(
            entityType,
            entityId
        );


    return rows.map(
        formatAuditEvent
    );
}


function getAllAuditEvents() {

    const rows =
        db.prepare(`
            SELECT
                event_id AS eventId,
                entity_type AS entityType,
                entity_id AS entityId,
                action,
                performed_by AS performedBy,
                details,
                created_at AS createdAt
            FROM audit_events
            ORDER BY created_at ASC
        `).all();


    return rows.map(
        formatAuditEvent
    );
}


function formatAuditEvent(row) {

    let details =
        row.details;


    if (details) {

        try {
            details =
                JSON.parse(details);
        } catch (error) {
            // Keep original string
        }
    }


    return {
        eventId:
            row.eventId,

        entityType:
            row.entityType,

        entityId:
            row.entityId,

        action:
            row.action,

        performedBy:
            row.performedBy,

        details,

        createdAt:
            row.createdAt
    };
}


module.exports = {
    createAuditEvent,
    getAuditEventsByEntity,
    getAllAuditEvents
};