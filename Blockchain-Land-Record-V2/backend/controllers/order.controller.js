const orderService = require("../services/order.service");

function createAdministrativeOrder(req, res) {
    try {
        const order =
            orderService.createAdministrativeOrder(
                req.body
            );

        res.status(201).json({
            status: "success",
            message:
                "Administrative order created successfully",
            order
        });

    } catch (error) {
        console.error(
            "Create administrative order error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({
            status: "error",
            message: error.message
        });
    }
}

function getAllOrders(req, res) {
    try {
        const orders =
            orderService.getAllOrders();

        res.json({
            status: "success",
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error(
            "Get orders error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Failed to retrieve orders"
        });
    }
}

function getOrderById(req, res) {
    try {
        const { orderId } = req.params;

        const order =
            orderService.getOrderById(
                orderId
            );

        if (!order) {
            return res.status(404).json({
                status: "not_found",
                message:
                    "Administrative order not found"
            });
        }

        res.json({
            status: "success",
            order
        });

    } catch (error) {
        console.error(
            "Get order by ID error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message:
                "Failed to retrieve administrative order"
        });
    }
}

module.exports = {
    createAdministrativeOrder,
    getAllOrders,
    getOrderById
};