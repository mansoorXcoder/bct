const express = require("express");

const router = express.Router();

const {
    createLand,
    getAllLands,
    getLandById
} = require("../controllers/land.controller");

router.get("/", getAllLands);
router.get("/:landId", getLandById);
router.post("/", createLand);

module.exports = router;