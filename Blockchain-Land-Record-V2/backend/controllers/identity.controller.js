const {
    getIdentityByWallet: findIdentityByWallet,
    getIdentityByUserId: findIdentityByUserId
} = require("../services/identity.service");

function getIdentityByWallet(req, res) {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                status: "error",
                message: "Wallet address is required."
            });
        }

        const identity = findIdentityByWallet(walletAddress);

        if (!identity) {
            return res.status(404).json({
                status: "error",
                message: "No identity found for this wallet address."
            });
        }

        res.json({
            status: "success",
            data: identity
        });

    } catch (error) {
        console.error(
            "Get identity by wallet error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}

function getIdentityByUserId(req, res) {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                status: "error",
                message: "User ID is required."
            });
        }

        const identity = findIdentityByUserId(userId);

        if (!identity) {
            return res.status(404).json({
                status: "error",
                message: "User identity not found."
            });
        }

        res.json({
            status: "success",
            data: identity
        });

    } catch (error) {
        console.error(
            "Get identity by user ID error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
}

module.exports = {
    getIdentityByWallet,
    getIdentityByUserId
};