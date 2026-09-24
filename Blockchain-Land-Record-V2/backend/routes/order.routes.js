const express = require("express");

const router = express.Router();

const {
    createAdministrativeOrder,
    getAllOrders,
    getOrderById
} = require("../controllers/order.controller");

router.post("/", createAdministrativeOrder);

router.get("/", getAllOrders);

router.get("/:orderId", getOrderById);

module.exports = router;