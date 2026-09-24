const express = require("express");

const router =
    express.Router();

const {
    getStatus,
    getContract,
    getRole,
    getLand,
    getTransfer,
    getDocument
} =
    require("../controllers/blockchain.controller");


// STATUS

router.get(
    "/status",
    getStatus
);


// CONTRACT

router.get(
    "/contract",
    getContract
);


// ROLE

router.get(
    "/role/:walletAddress",
    getRole
);


// LAND

router.get(
    "/land/:landId",
    getLand
);


// TRANSFER

router.get(
    "/transfer/:transferId",
    getTransfer
);


// DOCUMENT

router.get(
    "/document/:documentId",
    getDocument
);


module.exports = router;