const auditService =
    require("../services/audit.service");


function getAuditEventsByEntity(
    req,
    res
) {

    try {

        const {
            entityType,
            entityId
        } = req.params;


        const events =
            auditService.getAuditEventsByEntity(
                entityType,
                entityId
            );


        res.json({
            status: "success",
            count:
                events.length,
            events
        });

    } catch (error) {

        console.error(
            "Get audit events error:",
            error.message
        );


        res.status(500).json({
            status: "error",
            message:
                "Failed to retrieve audit events"
        });
    }
}


function getAllAuditEvents(
    req,
    res
) {

    try {

        const events =
            auditService.getAllAuditEvents();


        res.json({
            status: "success",
            count:
                events.length,
            events
        });

    } catch (error) {

        console.error(
            "Get all audit events error:",
            error.message
        );


        res.status(500).json({
            status: "error",
            message:
                "Failed to retrieve audit events"
        });
    }
}


module.exports = {
    getAuditEventsByEntity,
    getAllAuditEvents
};
