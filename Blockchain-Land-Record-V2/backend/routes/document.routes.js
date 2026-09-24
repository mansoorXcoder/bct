const express =
    require("express");

const router =
    express.Router();

const {

    createDocument,

    createPreliminaryDocument,

    getDocumentById,

    getDocumentsByLand,

    getDocumentsByRequest

} =
    require("../controllers/document.controller");


// =========================================================
// CREATE
// =========================================================

router.post(
    "/",
    createDocument
);


router.post(
    "/preliminary",
    createPreliminaryDocument
);


// =========================================================
// LAND DOCUMENTS
// =========================================================

router.get(
    "/land/:landId",
    getDocumentsByLand
);


// =========================================================
// REQUEST DOCUMENTS
// =========================================================

router.get(
    "/request/:requestId",
    getDocumentsByRequest
);


// =========================================================
// SINGLE DOCUMENT
// =========================================================

router.get(
    "/:documentId",
    getDocumentById
);


module.exports = router;