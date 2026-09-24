const express = require("express");

const router = express.Router();

const {
    allocateLand
} = require("../controllers/allocation.controller");

router.post("/", allocateLand);

module.exports = router;