const express =
    require("express");

const router =
    express.Router();

const {

    proposeTransfer,

    getTransferById,

    getTransfers,

    acceptTransfer,

    reviewTransfer,

    approveTransfer,

    rejectTransfer

} =
    require("../controllers/transfer.controller");


// =========================================================
// CREATE TRANSFER
// =========================================================

router.post(
    "/",
    proposeTransfer
);


// =========================================================
// GET ALL TRANSFERS
// =========================================================

router.get(
    "/",
    getTransfers
);


// =========================================================
// BUYER ACCEPTANCE
// =========================================================

router.post(
    "/accept",
    acceptTransfer
);


// =========================================================
// OFFICER VALIDATION
// =========================================================

router.post(
    "/review",
    reviewTransfer
);


// =========================================================
// OFFICER APPROVAL
// =========================================================

router.post(
    "/approve",
    approveTransfer
);


// =========================================================
// OFFICER REJECTION
// =========================================================

router.post(
    "/reject",
    rejectTransfer
);


// =========================================================
// SINGLE TRANSFER
// =========================================================

router.get(
    "/:transferId",
    getTransferById
);


module.exports = router;