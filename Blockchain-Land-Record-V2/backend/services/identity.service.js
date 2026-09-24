const db = require("../../database/database");

function normalizeAddress(address) {
    return address.toLowerCase();
}

function getIdentityByWallet(walletAddress) {
    const normalizedWallet =
        normalizeAddress(walletAddress);

    const user = db.prepare(`
        SELECT
            user_id AS userId,
            name,
            wallet_address AS walletAddress,
            role,
            region_id AS regionId,
            status
        FROM users
        WHERE LOWER(wallet_address) = ?
    `).get(normalizedWallet);

    return user || null;
}

function getIdentityByUserId(userId) {
    const user = db.prepare(`
        SELECT
            user_id AS userId,
            name,
            wallet_address AS walletAddress,
            role,
            region_id AS regionId,
            status
        FROM users
        WHERE user_id = ?
    `).get(userId);

    return user || null;
}

module.exports = {
    getIdentityByWallet,
    getIdentityByUserId
};