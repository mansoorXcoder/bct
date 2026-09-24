const db = require("../../database/database");

function getCitizens(req, res) {

    try {

        const citizens = db.prepare(`
            SELECT
                user_id AS userId,
                name,
                wallet_address AS walletAddress,
                role,
                region_id AS regionId,
                status
            FROM users
            WHERE role = 'CITIZEN'
              AND status = 'ACTIVE'
            ORDER BY user_id
        `).all();

        res.json({
            status: "success",
            count: citizens.length,
            data: citizens
        });

    } catch (error) {

        console.error(
            "Get citizens error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}


module.exports = {
    getCitizens
};