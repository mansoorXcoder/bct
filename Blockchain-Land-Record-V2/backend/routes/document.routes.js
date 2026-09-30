const express =
    require("express");

const router =
    express.Router();

const {

    createDocument,

    createPreliminaryDocument,

    getDocumentById,

    getDocumentsByLand,

    getDocumentsByRequest,

    downloadDocument

} =
    require("../controllers/document.controller");

// =========================================================
// CREATE DOCUMENT
// =========================================================

router.post(
    "/",
    createDocument
);


// =========================================================
// CREATE PRELIMINARY DOCUMENT
// =========================================================

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
// DOWNLOAD / OPEN PDF
// IMPORTANT:
// Keep this BEFORE /:documentId
// =========================================================

router.get(
    "/:documentId/download",
    downloadDocument
);

// =========================================================
// DOWNLOAD GENERATED PDF
// =========================================================

router.get(
    "/:documentId/download",
    downloadDocument
);
// =========================================================
// SINGLE DOCUMENT DETAILS
// =========================================================

router.get(
    "/:documentId",
    getDocumentById
);


module.exports = router;