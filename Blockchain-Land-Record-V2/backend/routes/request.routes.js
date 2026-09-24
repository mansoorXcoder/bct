const express =
    require("express");

const router =
    express.Router();

const {

    createRequest,

    getRequestById,
    getRequests,

    acceptRequest,
    reviewRequest,
    approveRequest,
    rejectRequest,

    getLandHistory

} =
    require("../controllers/request.controller");


// =========================================================
// REQUESTS
// =========================================================

router.post(
    "/",
    createRequest
);

router.get(
    "/",
    getRequests
);


// =========================================================
// ACTIONS
// =========================================================

router.post(
    "/accept",
    acceptRequest
);

router.post(
    "/review",
    reviewRequest
);

router.post(
    "/approve",
    approveRequest
);

router.post(
    "/reject",
    rejectRequest
);


// =========================================================
// LAND HISTORY
// =========================================================

router.get(
    "/land/:landId/history",
    getLandHistory
);


// =========================================================
// SINGLE REQUEST
// =========================================================

router.get(
    "/:requestId",
    getRequestById
);


module.exports = router;