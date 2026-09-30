const requestService =
    require("../services/landTransaction.service");


// =========================================================
// CREATE OWNERSHIP TRANSFER
// =========================================================

async function proposeTransfer(req, res) {

    try {

        const body = {
            ...req.body,

            requestType:
                "OWNERSHIP_TRANSFER",

            requesterId:
                req.body.sellerId,

            sellerId:
                req.body.sellerId
        };

        const result =
            await requestService.createRequest(
                body
            );

        return res.status(201).json({

            status: "success",

            message:
                "Transfer request created successfully.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Create transfer error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// GET TRANSFER / REQUEST
// =========================================================

function getTransferById(req, res) {

    try {

        const result =
            requestService.getRequestById(
                req.params.transferId
            );

        if (!result) {

            return res.status(404).json({

                status: "error",

                message:
                    "Transfer request not found."

            });

        }

        return res.json({

            status: "success",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Get transfer error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// GET ALL TRANSFERS
// =========================================================

function getTransfers(req, res) {

    try {

        const requests =
            requestService.getRequests({

                requestType:
                    "OWNERSHIP_TRANSFER"

            });

        return res.json({

            status: "success",

            count:
                requests.length,

            data:
                requests

        });

    } catch (error) {

        console.error(
            "Get transfers error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// BUYER ACCEPTANCE
// =========================================================

async function acceptTransfer(req, res) {

    try {

        const result =
            await requestService.acceptRequest(
                req.body
            );

        return res.json({

            status: "success",

            message:
                "Transfer accepted by buyer.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Accept transfer error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// OFFICER VALIDATION
// =========================================================

async function reviewTransfer(req, res) {

    try {

        const result =
            await requestService.reviewRequest(
                req.body
            );

        return res.json({

            status: "success",

            message:
                "Transfer request validated successfully.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Review transfer error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// OFFICER APPROVAL
// =========================================================

async function approveTransfer(req, res) {

    try {

        const result =
            await requestService.approveRequest(
                req.body
            );

        return res.json({

            status: "success",

            message:
                "Transfer approved and registered successfully.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Approve transfer error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// OFFICER REJECTION
// =========================================================

async function rejectTransfer(req, res) {

    try {

        const result =
            await requestService.rejectRequest(
                req.body
            );

        return res.json({

            status: "success",

            message:
                "Transfer request rejected.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Reject transfer error:",
            error.message
        );

        return res.status(
            error.statusCode || 500
        ).json({

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

    proposeTransfer,

    getTransferById,

    getTransfers,

    acceptTransfer,

    reviewTransfer,

    approveTransfer,

    rejectTransfer

};