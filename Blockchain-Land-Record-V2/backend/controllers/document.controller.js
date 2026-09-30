const fs =
    require("fs");
const path = require("path");

const documentService =
    require("../services/document.service");


// =========================================================
// CREATE FINAL DOCUMENT
// =========================================================

async function createDocument(req, res) {

    try {

        const result =
            await documentService.createDocument(
                req.body
            );

        return res.status(201).json({

            status: "success",

            message:
                "Document generated, hashed, uploaded to IPFS, and anchored on blockchain.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Create document error:",
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
// CREATE PRELIMINARY DOCUMENT
// =========================================================

async function createPreliminaryDocument(
    req,
    res
) {

    try {

        const result =
            await documentService.createPreliminaryDocument(
                req.body
            );

        return res.status(201).json({

            status: "success",

            message:
                "Preliminary document generated successfully.",

            data:
                result

        });

    } catch (error) {

        console.error(
            "Create preliminary document error:",
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
// GET DOCUMENT DETAILS
// =========================================================

function getDocumentById(
    req,
    res
) {

    try {

        const document =
            documentService.getDocumentById(
                req.params.documentId
            );

        if (!document) {

            return res.status(404).json({

                status: "error",

                message:
                    "Document not found."

            });

        }

        return res.json({

            status: "success",

            data:
                document

        });

    } catch (error) {

        console.error(
            "Get document error:",
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
// DOWNLOAD / OPEN GENERATED PDF
// =========================================================

function downloadDocument(
    req,
    res
) {

    try {

        const document =
            documentService.getDocumentById(
                req.params.documentId
            );


        if (!document) {

            return res.status(404).json({

                status:
                    "error",

                message:
                    "Document not found."

            });

        }


        if (!document.filePath) {

            return res.status(404).json({

                status:
                    "error",

                message:
                    "Document file path is unavailable."

            });

        }


        if (
            !fs.existsSync(
                document.filePath
            )
        ) {

            return res.status(404).json({

                status:
                    "error",

                message:
                    "Generated PDF file was not found on the server."

            });

        }


        res.type(
            "application/pdf"
        );


        res.sendFile(
            document.filePath
        );


    } catch (error) {

        console.error(
            "Download document error:",
            error.message
        );


        res.status(
            error.statusCode || 500
        ).json({

            status:
                "error",

            message:
                error.message

        });

    }

}

// =========================================================
// DOWNLOAD / OPEN PDF
// =========================================================

function downloadDocument(
    req,
    res
) {

    try {

        const document =
            documentService.getDocumentById(
                req.params.documentId
            );

        if (!document) {

            return res.status(404).json({

                status: "error",

                message:
                    "Document not found."

            });

        }

        if (!document.filePath) {

            return res.status(404).json({

                status: "error",

                message:
                    "PDF file path is not available."

            });

        }

        const filePath =
            path.resolve(
                document.filePath
            );

        if (!fs.existsSync(filePath)) {

            return res.status(404).json({

                status: "error",

                message:
                    "PDF file does not exist on the server."

            });

        }

        const safeFileName =
            `${document.documentId}.pdf`;

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `inline; filename="${safeFileName}"`
        );

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        return res.sendFile(
            filePath
        );

    } catch (error) {

        console.error(
            "Download document error:",
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
// GET LAND DOCUMENTS
// =========================================================

function getDocumentsByLand(
    req,
    res
) {

    try {

        const documents =
            documentService.getDocumentsByLand(
                req.params.landId
            );

        return res.json({

            status: "success",

            count:
                documents.length,

            data:
                documents

        });

    } catch (error) {

        console.error(
            "Get land documents error:",
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
// GET REQUEST DOCUMENTS
// =========================================================

function getDocumentsByRequest(
    req,
    res
) {

    try {

        const documents =
            documentService.getDocumentsByRequest(
                req.params.requestId
            );

        return res.json({

            status: "success",

            count:
                documents.length,

            data:
                documents

        });

    } catch (error) {

        console.error(
            "Get request documents error:",
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

    createDocument,

    createPreliminaryDocument,

    getDocumentById,

    getDocumentsByLand,

    getDocumentsByRequest,

    downloadDocument

};