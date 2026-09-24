const {
    getBlockchainStatus,
    getContractInfo,
    getBlockchainRole,
    getBlockchainLand,
    getBlockchainTransfer,
    getBlockchainDocument
} =
    require("../services/blockchain.service");


// =========================================================
// BLOCKCHAIN STATUS
// =========================================================

async function getStatus(req, res) {

    try {

        const status =
            await getBlockchainStatus();


        res.json({

            status: "success",

            data:
                status

        });

    } catch (error) {

        console.error(
            "Blockchain status error:",
            error.message
        );


        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }
}


// =========================================================
// CONTRACT INFO
// =========================================================

async function getContract(req, res) {

    try {

        const contract =
            await getContractInfo();


        res.json({

            status: "success",

            data:
                contract

        });

    } catch (error) {

        console.error(
            "Contract info error:",
            error.message
        );


        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }
}


// =========================================================
// BLOCKCHAIN ROLE
// =========================================================

async function getRole(req, res) {

    try {

        const role =
            await getBlockchainRole(
                req.params.walletAddress
            );


        res.json({

            status: "success",

            data:
                role

        });

    } catch (error) {

        console.error(
            "Blockchain role error:",
            error.message
        );


        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }
}


// =========================================================
// BLOCKCHAIN LAND
// =========================================================

async function getLand(req, res) {

    try {

        const land =
            await getBlockchainLand(
                req.params.landId
            );


        res.json({

            status: "success",

            data:
                land

        });

    } catch (error) {

        console.error(
            "Blockchain land error:",
            error.message
        );


        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }
}


// =========================================================
// BLOCKCHAIN TRANSFER
// =========================================================

async function getTransfer(req, res) {

    try {

        const transfer =
            await getBlockchainTransfer(
                req.params.transferId
            );


        res.json({

            status: "success",

            data:
                transfer

        });

    } catch (error) {

        console.error(
            "Blockchain transfer error:",
            error.message
        );


        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// BLOCKCHAIN DOCUMENT
// =========================================================

async function getDocument(req, res) {

    try {

        const document =
            await getBlockchainDocument(
                req.params.documentId
            );


        res.json({

            status: "success",

            data:
                document

        });

    } catch (error) {

        console.error(
            "Blockchain document error:",
            error.message
        );


        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    getStatus,

    getContract,

    getRole,

    getLand,

    getTransfer,

    getDocument

};