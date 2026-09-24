const express = require("express");

const router = express.Router();

const {
    createTransferProposal,
    getTransferById,
    getAllTransfers,
    acceptTransfer,
    approveTransfer
} = require("../controllers/transfer.controller");

router.post(
    "/",
    createTransferProposal
);

router.get(
    "/",
    getAllTransfers
);

router.post(
    "/accept",
    acceptTransfer
);

router.post(
    "/approve",
    approveTransfer
);

router.get(
    "/:transferId",
    getTransferById
);

module.exports = router;