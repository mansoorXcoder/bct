const express = require("express");

const router =
    express.Router();

const {
    getAuditEventsByEntity,
    getAllAuditEvents
} =
    require("../controllers/audit.controller");

router.get(
    "/",
    getAllAuditEvents
);

router.get(
    "/:entityType/:entityId",
    getAuditEventsByEntity
);

module.exports = router;