const requestService =
    require("../services/landTransaction.service");


// =========================================================
// CREATE REQUEST
// =========================================================

async function createRequest(req, res) {

    try {

        const result =
            await requestService.createRequest(
                req.body
            );

        res.status(201).json({

            status: "success",

            message:
                "Land request created successfully.",

            data: result

        });

    } catch (error) {

        console.error(
            "Create request error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// GET REQUEST
// =========================================================

function getRequestById(req, res) {

    try {

        const request =
            requestService.getRequestById(
                req.params.requestId
            );

        if (!request) {

            return res.status(404).json({

                status: "error",

                message:
                    "Land request not found."

            });

        }

        res.json({

            status: "success",

            data: request

        });

    } catch (error) {

        console.error(
            "Get request error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// GET ALL REQUESTS
// =========================================================

function getRequests(req, res) {

    try {

        const requests =
            requestService.getRequests(
                req.query
            );

        res.json({

            status: "success",

            count:
                requests.length,

            data:
                requests

        });

    } catch (error) {

        console.error(
            "Get requests error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// ACCEPT REQUEST
// =========================================================

async function acceptRequest(req, res) {

    try {

        const result =
            await requestService.acceptRequest(
                req.body
            );

        res.json({

            status: "success",

            message:
                "Request accepted by buyer.",

            data: result

        });

    } catch (error) {

        console.error(
            "Accept request error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// REVIEW REQUEST
// =========================================================

async function reviewRequest(req, res) {

    try {

        const result =
            await requestService.reviewRequest(
                req.body
            );

        res.json({

            status: "success",

            message:
                "Request reviewed successfully.",

            data: result

        });

    } catch (error) {

        console.error(
            "Review request error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// APPROVE REQUEST
// =========================================================

async function approveRequest(req, res) {

    try {

        const result =
            await requestService.approveRequest(
                req.body
            );

        res.json({

            status: "success",

            message:
                "Request approved and land record updated.",

            data: result

        });

    } catch (error) {

        console.error(
    "Approve request error:",
    error.stack
);

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// REJECT REQUEST
// =========================================================

async function rejectRequest(req, res) {

    try {

        const result =
            await requestService.rejectRequest(
                req.body
            );

        res.json({

            status: "success",

            message:
                "Request rejected.",

            data: result

        });

    } catch (error) {

        console.error(
            "Reject request error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }

}


// =========================================================
// LAND HISTORY
// =========================================================

function getLandHistory(req, res) {

    try {

        const history =
            requestService.getLandHistory(
                req.params.landId
            );

        res.json({

            status: "success",

            count:
                history.length,

            data:
                history

        });

    } catch (error) {

        console.error(
            "Get land history error:",
            error.message
        );

        res.status(
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

    createRequest,

    getRequestById,
    getRequests,

    acceptRequest,
    reviewRequest,
    approveRequest,
    rejectRequest,

    getLandHistory

};