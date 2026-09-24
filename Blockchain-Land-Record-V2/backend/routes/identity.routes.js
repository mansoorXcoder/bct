const express = require("express");

const router = express.Router();

const {
    getIdentityByWallet,
    getIdentityByUserId
} = require("../controllers/identity.controller");

router.get(
    "/wallet/:walletAddress",
    getIdentityByWallet
);

router.get(
    "/user/:userId",
    getIdentityByUserId
);

module.exports = router;