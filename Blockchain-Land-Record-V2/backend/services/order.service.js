const db = require("../../database/database");

const {
    getIdentityByWallet
} = require("./identity.service");

function generateOrderId() {
    const currentYear =
        new Date().getFullYear();

    const row = db.prepare(`
        SELECT order_id
        FROM administrative_orders
        WHERE order_id LIKE ?
        ORDER BY order_id DESC
        LIMIT 1
    `).get(`AO-${currentYear}-%`);

    let nextNumber = 1;

    if (row && row.order_id) {
        const match =
            row.order_id.match(
                /^AO-\d{4}-(\d+)$/
            );

        if (match) {
            nextNumber =
                parseInt(match[1], 10) + 1;
        }
    }

    return `AO-${currentYear}-${String(nextNumber).padStart(4, "0")}`;
}

function createAdministrativeOrder(payload) {
    const {
        supervisorWalletAddress,
        assignedOfficerWalletAddress,
        actionType,
        regionId,
        landId,
        reason
    } = payload;

    if (!supervisorWalletAddress) {
        const error = new Error(
            "Supervisor wallet address is required"
        );

        error.statusCode = 400;
        throw error;
    }

    const supervisor =
        getIdentityByWallet(
            supervisorWalletAddress
        );

    if (!supervisor) {
        const error = new Error(
            "Supervisor wallet is not registered"
        );

        error.statusCode = 404;
        throw error;
    }

    if (
        supervisor.role !==
        "SUPERVISORY_AUTHORITY"
    ) {
        const error = new Error(
            "Only the Supervisory Authority can create administrative orders"
        );

        error.statusCode = 403;
        throw error;
    }

    if (!assignedOfficerWalletAddress) {
        const error = new Error(
            "Assigned officer wallet address is required"
        );

        error.statusCode = 400;
        throw error;
    }

    if (!actionType) {
        const error = new Error(
            "Action type is required"
        );

        error.statusCode = 400;
        throw error;
    }

    if (!regionId) {
        const error = new Error(
            "Region ID is required"
        );

        error.statusCode = 400;
        throw error;
    }

    if (!reason) {
        const error = new Error(
            "Order reason is required"
        );

        error.statusCode = 400;
        throw error;
    }

    const officer =
        getIdentityByWallet(
            assignedOfficerWalletAddress
        );

    if (!officer) {
        const error = new Error(
            "Assigned officer wallet is not registered"
        );

        error.statusCode = 404;
        throw error;
    }

    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {
        const error = new Error(
            "Administrative orders can only be assigned to Land Administration Officers"
        );

        error.statusCode = 403;
        throw error;
    }

    if (
        officer.regionId !==
        regionId
    ) {
        const error = new Error(
            "Officer is not assigned to the specified region"
        );

        error.statusCode = 403;
        throw error;
    }

    const allowedActions = [
        "CREATE_LAND",
        "ALLOCATE_LAND",
        "SUBDIVIDE_LAND",
        "SUSPEND_LAND"
    ];

    if (
        !allowedActions.includes(
            actionType
        )
    ) {
        const error = new Error(
            "Invalid administrative action type"
        );

        error.statusCode = 400;
        throw error;
    }

    if (landId) {
        const land =
            db.prepare(`
                SELECT land_id
                FROM lands
                WHERE land_id = ?
            `).get(landId);

        if (!land) {
            const error = new Error(
                "Specified land record does not exist"
            );

            error.statusCode = 404;
            throw error;
        }
    }

    const orderId =
        generateOrderId();

    const issuedAt =
        new Date().toISOString();

    db.prepare(`
        INSERT INTO administrative_orders (
            order_id,
            issued_by,
            assigned_officer,
            action_type,
            region_id,
            land_id,
            reason,
            status,
            issued_at,
            executed_at
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `).run(
        orderId,
        supervisor.userId,
        officer.userId,
        actionType,
        regionId,
        landId || null,
        reason,
        "ISSUED",
        issuedAt,
        null
    );

    return getOrderById(orderId);
}

function getAllOrders() {
    const rows = db.prepare(`
        SELECT
            ao.order_id AS orderId,
            ao.issued_by AS issuedById,
            ao.assigned_officer AS assignedOfficerId,
            ao.action_type AS actionType,
            ao.region_id AS regionId,
            ao.land_id AS landId,
            ao.reason,
            ao.status,
            ao.issued_at AS issuedAt,
            ao.executed_at AS executedAt,

            supervisor.user_id AS supervisorUserId,
            supervisor.name AS supervisorName,
            supervisor.wallet_address AS supervisorWalletAddress,

            officer.user_id AS officerUserId,
            officer.name AS officerName,
            officer.wallet_address AS officerWalletAddress

        FROM administrative_orders ao

        LEFT JOIN users supervisor
            ON ao.issued_by = supervisor.user_id

        LEFT JOIN users officer
            ON ao.assigned_officer = officer.user_id

        ORDER BY ao.issued_at ASC
    `).all();

    return rows.map(formatOrder);
}

function getOrderById(orderId) {
    const row = db.prepare(`
        SELECT
            ao.order_id AS orderId,
            ao.issued_by AS issuedById,
            ao.assigned_officer AS assignedOfficerId,
            ao.action_type AS actionType,
            ao.region_id AS regionId,
            ao.land_id AS landId,
            ao.reason,
            ao.status,
            ao.issued_at AS issuedAt,
            ao.executed_at AS executedAt,

            supervisor.user_id AS supervisorUserId,
            supervisor.name AS supervisorName,
            supervisor.wallet_address AS supervisorWalletAddress,

            officer.user_id AS officerUserId,
            officer.name AS officerName,
            officer.wallet_address AS officerWalletAddress

        FROM administrative_orders ao

        LEFT JOIN users AS supervisor
            ON ao.issued_by = supervisor.user_id

        LEFT JOIN users AS officer
            ON ao.assigned_officer = officer.user_id

        WHERE ao.order_id = ?
    `).get(orderId);

    if (!row) {
        return null;
    }

    return formatOrder(row);
}

function formatOrder(row) {
    return {
        orderId: row.orderId,

        issuedBy: {
            userId: row.supervisorUserId,
            name: row.supervisorName,
            walletAddress:
                row.supervisorWalletAddress
        },

        assignedOfficer: {
            userId: row.officerUserId,
            name: row.officerName,
            walletAddress:
                row.officerWalletAddress
        },

        actionType: row.actionType,
        regionId: row.regionId,
        landId: row.landId,
        reason: row.reason,
        status: row.status,
        issuedAt: row.issuedAt,
        executedAt: row.executedAt
    };
}

module.exports = {
    createAdministrativeOrder,
    getAllOrders,
    getOrderById
};