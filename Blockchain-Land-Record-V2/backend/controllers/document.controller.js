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

        res.status(201).json({

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

        res.status(201).json({

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
// GET DOCUMENT
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


        res.json({

            status: "success",

            data:
                document

        });

    } catch (error) {

        console.error(
            "Get document error:",
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


        res.json({

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


        res.json({

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

    createDocument,

    createPreliminaryDocument,

    getDocumentById,

    getDocumentsByLand,

    getDocumentsByRequest

};