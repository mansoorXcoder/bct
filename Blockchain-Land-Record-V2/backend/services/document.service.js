const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");

const db = require("../../database/database");

const {
    getLandById
} = require("./land.service");

const {
    getIdentityByUserId
} = require("./identity.service");

const {
    uploadFileToIPFS
} = require("./ipfs.service");

const {
    anchorDocument
} = require("./blockchain.service");


// =========================================================
// GENERATED DOCUMENT DIRECTORY
// =========================================================

const generatedDirectory = path.join(
    __dirname,
    "../../documents/generated"
);

if (!fs.existsSync(generatedDirectory)) {
    fs.mkdirSync(generatedDirectory, {
        recursive: true
    });
}


// =========================================================
// ERROR HELPER
// =========================================================

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
}


// =========================================================
// DOCUMENT ID
// =========================================================

function generateDocumentId() {

    const year = new Date().getFullYear();

    const result = db.prepare(`
        SELECT COUNT(*) AS count
        FROM documents
    `).get();

    const number = String(
        result.count + 1
    ).padStart(4, "0");

    return `DOC-${year}-${number}`;
}


// =========================================================
// LAND HISTORY
// =========================================================

function getLandHistory(landId) {

    return db.prepare(`
        SELECT

            event_id AS eventId,
            land_id AS landId,
            request_id AS requestId,
            event_type AS eventType,

            previous_owner_id AS previousOwnerId,
            new_owner_id AS newOwnerId,

            previous_area AS previousArea,
            new_area AS newArea,

            previous_land_use AS previousLandUse,
            new_land_use AS newLandUse,

            previous_land_type AS previousLandType,
            new_land_type AS newLandType,

            reason,

            performed_by AS performedBy,
            document_id AS documentId,
            blockchain_reference AS blockchainReference,

            description,
            created_at AS createdAt

        FROM land_events

        WHERE land_id = ?

        ORDER BY created_at DESC
    `).all(landId);
}


// =========================================================
// PREVIOUS OWNERS
// =========================================================

function getPreviousOwners(landId) {

    return db.prepare(`
        SELECT DISTINCT

            u.user_id AS userId,
            u.name AS name

        FROM land_events e

        LEFT JOIN users u
            ON u.user_id = e.previous_owner_id

        WHERE
            e.land_id = ?
            AND e.previous_owner_id IS NOT NULL

        ORDER BY e.created_at DESC

        LIMIT 2
    `).all(landId);
}


// =========================================================
// TRANSFER COUNT
// =========================================================

function getTransferCount(landId) {

    const result = db.prepare(`
        SELECT COUNT(*) AS count

        FROM land_events

        WHERE land_id = ?
          AND event_type = 'OWNERSHIP_TRANSFER'
    `).get(landId);

    return result.count;
}


// =========================================================
// RECENT MODIFICATIONS
// =========================================================

function getRecentModifications(landId) {

    return db.prepare(`
        SELECT

            event_type AS eventType,

            previous_area AS previousArea,
            new_area AS newArea,

            previous_land_use AS previousLandUse,
            new_land_use AS newLandUse,

            previous_land_type AS previousLandType,
            new_land_type AS newLandType,

            reason,
            created_at AS createdAt

        FROM land_events

        WHERE land_id = ?

        ORDER BY created_at DESC

        LIMIT 4
    `).all(landId);
}


// =========================================================
// FORMAT HELPERS
// =========================================================

function value(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "N/A";
    }

    return String(value);
}


function shortWallet(wallet) {

    if (!wallet) {
        return "N/A";
    }

    const text = String(wallet);

    if (text.length <= 22) {
        return text;
    }

    return `${text.slice(0, 10)}...${text.slice(-8)}`;
}


function shortText(text, maxLength = 75) {

    const result = value(text);

    if (result.length <= maxLength) {
        return result;
    }

    return `${result.slice(0, maxLength - 3)}...`;
}


function formatDate(date) {

    if (!date) {
        return "N/A";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return value(date);
    }

    return parsed.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// =========================================================
// PDF DRAWING HELPERS
// =========================================================

function drawSectionTitle(
    pdf,
    title,
    x,
    y,
    width
) {

    pdf
        .save()
        .rect(
            x,
            y,
            width,
            18
        )
        .fill("#eeeeee")
        .restore();

    pdf
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor("#111111")
        .text(
            title,
            x + 6,
            y + 5,
            {
                width: width - 12,
                lineBreak: false
            }
        );

    return y + 23;
}


function drawField(
    pdf,
    label,
    fieldValue,
    x,
    y,
    width,
    labelWidth = 92
) {

    pdf
        .font("Helvetica-Bold")
        .fontSize(7.4)
        .fillColor("#222222")
        .text(
            `${label}:`,
            x,
            y,
            {
                width: labelWidth,
                lineBreak: false
            }
        );

    pdf
        .font("Helvetica")
        .fontSize(7.4)
        .fillColor("#222222")
        .text(
            shortText(fieldValue, 70),
            x + labelWidth,
            y,
            {
                width: width - labelWidth,
                lineBreak: false
            }
        );
}


function drawTwoColumnField(
    pdf,
    label1,
    value1,
    label2,
    value2,
    x,
    y,
    width
) {

    const gap = 12;

    const columnWidth =
        (width - gap) / 2;

    drawField(
        pdf,
        label1,
        value1,
        x,
        y,
        columnWidth
    );

    drawField(
        pdf,
        label2,
        value2,
        x + columnWidth + gap,
        y,
        columnWidth
    );
}


function drawDivider(
    pdf,
    x,
    y,
    width
) {

    pdf
        .save()
        .strokeColor("#bbbbbb")
        .lineWidth(0.5)
        .moveTo(x, y)
        .lineTo(x + width, y)
        .stroke()
        .restore();
}


// =========================================================
// GENERATE ONE-PAGE PDF
// =========================================================

function generatePdfFile(payload) {

    return new Promise(
        (resolve, reject) => {

            const {

                documentId,
                documentType,

                land,

                currentOwner,
                proposedBuyer,

                previousOwners,

                transferCount,
                recentModifications,

                request,
                officer,

                transactionId,
                preliminary

            } = payload;


            const fileName =
                `${documentId}.pdf`;

            const filePath =
                path.join(
                    generatedDirectory,
                    fileName
                );


            // =================================================
            // A4 — STRICT SINGLE PAGE
            // =================================================

            const pdf =
                new PDFDocument({
                    size: "A4",
                    margin: 0,
                    autoFirstPage: true
                });


            const stream =
                fs.createWriteStream(
                    filePath
                );


            pdf.pipe(stream);


            const pageWidth =
                pdf.page.width;

            const pageHeight =
                pdf.page.height;


            const margin =
                36;

            const contentWidth =
                pageWidth -
                margin * 2;


            let y = 30;


            // =================================================
            // HEADER
            // =================================================

            pdf
                .font("Helvetica-Bold")
                .fontSize(16)
                .fillColor("#111111")
                .text(
                    "BLOCKCHAIN LAND RECORD",
                    margin,
                    y,
                    {
                        width: contentWidth,
                        align: "center",
                        lineBreak: false
                    }
                );


            y += 20;


            pdf
                .font("Helvetica")
                .fontSize(8)
                .fillColor("#555555")
                .text(
                    "LAND RECORD MANAGEMENT SYSTEM",
                    margin,
                    y,
                    {
                        width: contentWidth,
                        align: "center",
                        lineBreak: false
                    }
                );


            y += 18;


            pdf
                .font("Helvetica-Bold")
                .fontSize(9.5)
                .fillColor("#111111")
                .text(
                    preliminary
                        ? "PRELIMINARY TRANSACTION RECORD"
                        : "REGISTERED SYSTEM RECORD",
                    margin,
                    y,
                    {
                        width: contentWidth,
                        align: "center",
                        lineBreak: false
                    }
                );


            y += 20;


            drawDivider(
                pdf,
                margin,
                y,
                contentWidth
            );


            y += 9;


            // =================================================
            // DOCUMENT INFORMATION
            // =================================================

            y = drawSectionTitle(
                pdf,
                "DOCUMENT INFORMATION",
                margin,
                y,
                contentWidth
            );


            drawTwoColumnField(
                pdf,
                "Document ID",
                documentId,
                "Document Type",
                documentType,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawTwoColumnField(
                pdf,
                "Request / Transaction",
                transactionId,
                "Generated",
                formatDate(new Date()),
                margin,
                y,
                contentWidth
            );


            y += 22;


            // =================================================
            // LAND INFORMATION
            // =================================================

            y = drawSectionTitle(
                pdf,
                "LAND INFORMATION",
                margin,
                y,
                contentWidth
            );


            drawTwoColumnField(
                pdf,
                "Land Record ID",
                land.landId,
                "Survey Number",
                land.surveyNumber,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawTwoColumnField(
                pdf,
                "Parcel ID",
                land.parcelIdentifier,
                "Area",
                `${value(land.parcelArea)} ${value(land.areaUnit)}`,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawTwoColumnField(
                pdf,
                "Land Type",
                land.landType,
                "Land Use",
                land.landUseType,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawTwoColumnField(
                pdf,
                "Zone",
                land.zone,
                "Region",
                land.regionId,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawTwoColumnField(
                pdf,
                "Latitude",
                land.latitude,
                "Longitude",
                land.longitude,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawField(
                pdf,
                "Location",
                land.location,
                margin,
                y,
                contentWidth
            );


            y += 22;


            // =================================================
            // CURRENT OWNERSHIP
            // =================================================

            y = drawSectionTitle(
                pdf,
                "CURRENT OWNERSHIP",
                margin,
                y,
                contentWidth
            );


            drawTwoColumnField(
                pdf,
                "Owner ID",
                land.currentOwnerId,
                "Owner Type",
                land.ownerType,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawTwoColumnField(
                pdf,
                "Ownership Status",
                land.ownershipStatus,
                "Owner Name",
                currentOwner
                    ? currentOwner.name
                    : null,
                margin,
                y,
                contentWidth
            );


            y += 14;


            drawField(
                pdf,
                "Owner Wallet",
                currentOwner
                    ? shortWallet(
                        currentOwner.walletAddress
                    )
                    : null,
                margin,
                y,
                contentWidth
            );


            y += 22;


            // =================================================
            // PROPOSED TRANSACTION
            // =================================================

            if (request) {

                y = drawSectionTitle(
                    pdf,
                    preliminary
                        ? "PROPOSED TRANSACTION"
                        : "TRANSACTION INFORMATION",
                    margin,
                    y,
                    contentWidth
                );


                drawTwoColumnField(
                    pdf,
                    "Request Type",
                    request.requestType,
                    "Status",
                    request.status,
                    margin,
                    y,
                    contentWidth
                );


                y += 14;


                drawTwoColumnField(
                    pdf,
                    "Seller",
                    request.sellerId,
                    "Buyer",
                    request.buyerId,
                    margin,
                    y,
                    contentWidth
                );


                y += 14;


                if (
                    proposedBuyer
                ) {

                    drawTwoColumnField(
                        pdf,
                        "Buyer Name",
                        proposedBuyer.name,
                        "Buyer Wallet",
                        shortWallet(
                            proposedBuyer.walletAddress
                        ),
                        margin,
                        y,
                        contentWidth
                    );

                } else {

                    drawTwoColumnField(
                        pdf,
                        "Buyer Name",
                        "N/A",
                        "Buyer Wallet",
                        "N/A",
                        margin,
                        y,
                        contentWidth
                    );

                }


                y += 14;


                drawTwoColumnField(
                    pdf,
                    "Agreed Amount",
                    request.agreed_amount
                        ? `INR ${request.agreed_amount}`
                        : "Not specified",
                    "Requester",
                    request.requesterId,
                    margin,
                    y,
                    contentWidth
                );


                y += 14;


                drawField(
                    pdf,
                    "Reason",
                    request.reason,
                    margin,
                    y,
                    contentWidth
                );


                y += 22;

            }


            // =================================================
            // PREVIOUS OWNERS / HISTORY
            // =================================================

            y = drawSectionTitle(
                pdf,
                "LAND HISTORY",
                margin,
                y,
                contentWidth
            );


            drawTwoColumnField(
                pdf,
                "Previous Owners",
                previousOwners.length
                    ? previousOwners
                        .map(
                            owner =>
                                `${owner.name} (${owner.userId})`
                        )
                        .join(", ")
                    : "None recorded",
                "Total Transfers",
                transferCount,
                margin,
                y,
                contentWidth
            );


            y += 16;


            // Recent event — keep it compact for one page.
            if (
                recentModifications.length > 0
            ) {

                const event =
                    recentModifications[0];


                drawField(
                    pdf,
                    "Latest Event",
                    `${formatDate(event.createdAt)} | ${event.eventType}`,
                    margin,
                    y,
                    contentWidth
                );


                y += 14;


                if (
                    event.reason
                ) {

                    drawField(
                        pdf,
                        "Event Reason",
                        event.reason,
                        margin,
                        y,
                        contentWidth
                    );


                    y += 14;

                }

            } else {

                drawField(
                    pdf,
                    "Latest Event",
                    "No previous modifications recorded.",
                    margin,
                    y,
                    contentWidth
                );


                y += 14;

            }


            y += 8;


            // =================================================
            // AUTHORITY VERIFICATION
            // =================================================

            if (officer) {

                y = drawSectionTitle(
                    pdf,
                    "AUTHORITY REVIEW / VERIFICATION",
                    margin,
                    y,
                    contentWidth
                );


                drawTwoColumnField(
                    pdf,
                    "Officer ID",
                    officer.userId,
                    "Officer Name",
                    officer.name,
                    margin,
                    y,
                    contentWidth
                );


                y += 14;


                drawTwoColumnField(
                    pdf,
                    "Region",
                    officer.regionId,
                    "Review Status",
                    request
                        ? (
                            request.status ===
                            "PENDING_BUYER_ACCEPTANCE"
                                ? "Awaiting buyer"
                                : value(
                                    request.validationResult
                                )
                        )
                        : "N/A",
                    margin,
                    y,
                    contentWidth
                );


                y += 14;


                drawField(
                    pdf,
                    "Officer Wallet",
                    shortWallet(
                        officer.walletAddress
                    ),
                    margin,
                    y,
                    contentWidth
                );


                y += 22;

            }


            // =================================================
            // PRELIMINARY NOTICE
            // =================================================

            if (preliminary) {

                pdf
                    .save()
                    .rect(
                        margin,
                        y,
                        contentWidth,
                        48
                    )
                    .fill("#f2f2f2")
                    .restore();


                pdf
                    .font("Helvetica-Bold")
                    .fontSize(8.5)
                    .fillColor("#111111")
                    .text(
                        "PRELIMINARY / NOTARY-STYLE TRANSACTION RECORD",
                        margin + 8,
                        y + 7,
                        {
                            width:
                                contentWidth - 16,
                            lineBreak: false
                        }
                    );


                pdf
                    .font("Helvetica")
                    .fontSize(7.4)
                    .fillColor("#222222")
                    .text(
                        "This document records the proposed transaction for review and verification. It does not by itself transfer ownership or constitute a final sale deed.",
                        margin + 8,
                        y + 21,
                        {
                            width:
                                contentWidth - 16,
                            height: 12,
                            lineBreak: false
                        }
                    );


                pdf
                    .fontSize(7.4)
                    .text(
                        "Final registration is subject to the prescribed authority review, approval, system update and registered-record generation.",
                        margin + 8,
                        y + 33,
                        {
                            width:
                                contentWidth - 16,
                            height: 12,
                            lineBreak: false
                        }
                    );


                y += 57;

            }


            // =================================================
            // SYSTEM NOTICE
            // =================================================

            drawSectionTitle(
                pdf,
                "SYSTEM NOTICE",
                margin,
                y,
                contentWidth
            );


            y += 23;


            pdf
                .font("Helvetica")
                .fontSize(7)
                .fillColor("#333333")
                .text(
                    "System-generated record of the Blockchain Land Record Management System. Not represented as a legally valid government deed, title document, or notarial instrument. Blockchain, database, document hash and IPFS references are maintained as system verification records.",
                    margin,
                    y,
                    {
                        width: contentWidth,
                        height: 28,
                        lineBreak: false
                    }
                );


            // =================================================
            // FOOTER
            // =================================================

            pdf
                .font("Helvetica")
                .fontSize(6.5)
                .fillColor("#777777")
                .text(
                    `Document ID: ${documentId}  |  Page 1 of 1`,
                    margin,
                    pageHeight - 24,
                    {
                        width: contentWidth,
                        align: "center",
                        lineBreak: false
                    }
                );


            // =================================================
            // FINALIZE
            // =================================================

            pdf.end();


            stream.on(
                "finish",
                () => {

                    resolve(
                        filePath
                    );

                }
            );


            stream.on(
                "error",
                reject
            );

        }
    );

}


// =========================================================
// SHA-256
// =========================================================

function calculateSha256(
    filePath
) {

    const fileBuffer =
        fs.readFileSync(
            filePath
        );

    return crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");
}


// =========================================================
// RESOLVE IDENTITY
// =========================================================

function resolveIdentity(
    userId
) {

    if (!userId) {
        return null;
    }

    const identity =
        getIdentityByUserId(
            userId
        );

    if (!identity) {

        fail(
            `User ${userId} not found.`,
            404
        );

    }

    return identity;
}


// =========================================================
// CREATE PRELIMINARY DOCUMENT
// =========================================================

async function createPreliminaryDocument(
    payload
) {

    const {

        requestId,

        documentType =
            "PRELIMINARY_AGREEMENT",

        landId,

        requesterId,

        buyerId = null,

        sellerId = null,

        officerId = null

    } = payload;


    if (!requestId) {
        fail("Request ID is required.");
    }


    if (!landId) {
        fail("Land ID is required.");
    }


    const land =
        getLandById(
            landId
        );


    if (!land) {
        fail(
            "Land record not found.",
            404
        );
    }


    const request =
        db.prepare(`
            SELECT

                request_id AS requestId,
                land_id AS landId,
                request_type AS requestType,

                requester_id AS requesterId,
                seller_id AS sellerId,
                buyer_id AS buyerId,

                reason,
                agreed_amount,

                current_area AS currentArea,
                requested_area AS requestedArea,

                current_area_unit AS currentAreaUnit,
                requested_area_unit AS requestedAreaUnit,

                current_land_use AS currentLandUse,
                requested_land_use AS requestedLandUse,

                current_land_type AS currentLandType,
                requested_land_type AS requestedLandType,

                requested_details AS requestedDetails,

                status,

                validation_result AS validationResult,
                validation_message AS validationMessage,

                reviewed_by AS reviewedBy,
                review_notes AS reviewNotes,

                proposed_at AS proposedAt,
                validated_at AS validatedAt,
                reviewed_at AS reviewedAt,
                approved_at AS approvedAt,

                created_at AS createdAt,
                updated_at AS updatedAt

            FROM land_requests

            WHERE request_id = ?
        `)
        .get(requestId);


    if (!request) {

        fail(
            "Land request not found.",
            404
        );

    }


    // =====================================================
    // IMPORTANT:
    // CURRENT OWNER MUST REMAIN CURRENT OWNER.
    // BUYER IS ONLY THE PROPOSED NEW OWNER.
    // =====================================================

    const currentOwner =
        resolveIdentity(
            land.currentOwnerId
        );


    const seller =
        resolveIdentity(
            sellerId ||
            request.sellerId
        );


    const buyer =
        resolveIdentity(
            buyerId ||
            request.buyerId
        );


    const officer =
        resolveIdentity(
            officerId
        );


    const documentId =
        generateDocumentId();


    const filePath =
        await generatePdfFile({

            documentId,

            documentType,

            land,

            currentOwner,

            proposedBuyer:
                buyer,

            previousOwners:
                getPreviousOwners(
                    landId
                ),

            transferCount:
                getTransferCount(
                    landId
                ),

            recentModifications:
                getRecentModifications(
                    landId
                ),

            request,

            officer,

            transactionId:
                requestId,

            preliminary: true

        });


    const createdAt =
        new Date().toISOString();


    db.prepare(`
        INSERT INTO documents (

            document_id,
            land_id,
            request_id,
            transaction_id,
            document_type,
            file_path,

            sha256_hash,
            ipfs_cid,
            blockchain_reference,

            created_by,
            created_at

        )

        VALUES (

            ?, ?, ?, ?, ?, ?,
            NULL, NULL, NULL,
            ?, ?

        )
    `).run(

        documentId,

        landId,

        requestId,

        requestId,

        documentType,

        filePath,

        requesterId ||
            request.requesterId ||
            "SYSTEM",

        createdAt

    );


    db.prepare(`
        UPDATE land_requests

        SET

            preliminary_document_id = ?,
            updated_at = ?

        WHERE request_id = ?
    `).run(

        documentId,

        createdAt,

        requestId

    );


    createAuditSafely({

        entityType: "DOCUMENT",

        entityId: documentId,

        action:
            "PRELIMINARY_DOCUMENT_CREATED",

        performedBy:
            requesterId ||
            request.requesterId ||
            "SYSTEM",

        details: {

            landId,
            requestId,
            documentType

        }

    });


    return {

        documentId,
        landId,
        requestId,
        documentType,
        filePath,

        status:
            "PRELIMINARY"

    };

}


// =========================================================
// CREATE FINAL DOCUMENT
// =========================================================

async function createDocument(
    payload
) {

    const {

        documentType,

        landId,

        requestId = null,

        transactionId = null,

        citizenId = null,

        sellerId = null,

        officerId = null,

        officerWallet = null,

        createdBy = null

    } = payload;


    if (!documentType) {
        fail("Document type is required.");
    }


    if (!landId) {
        fail("Land ID is required.");
    }


    if (!officerWallet) {
        fail("Officer wallet is required.");
    }


    const land =
        getLandById(
            landId
        );


    if (!land) {

        fail(
            "Land record not found.",
            404
        );

    }


    const currentOwner =
        resolveIdentity(
            citizenId ||
            land.currentOwnerId
        );


    const seller =
        resolveIdentity(
            sellerId
        );


    const officer =
        resolveIdentity(
            officerId
        );


    let request = null;


    if (requestId) {

        request =
            db.prepare(`
                SELECT

                    request_id AS requestId,
                    land_id AS landId,
                    request_type AS requestType,

                    requester_id AS requesterId,
                    seller_id AS sellerId,
                    buyer_id AS buyerId,

                    reason,
                    agreed_amount,

                    current_area AS currentArea,
                    requested_area AS requestedArea,

                    current_area_unit AS currentAreaUnit,
                    requested_area_unit AS requestedAreaUnit,

                    current_land_use AS currentLandUse,
                    requested_land_use AS requestedLandUse,

                    current_land_type AS currentLandType,
                    requested_land_type AS requestedLandType,

                    requested_details AS requestedDetails,

                    status,

                    validation_result AS validationResult,
                    validation_message AS validationMessage,

                    reviewed_by AS reviewedBy,
                    review_notes AS reviewNotes,

                    proposed_at AS proposedAt,
                    validated_at AS validatedAt,
                    reviewed_at AS reviewedAt,
                    approved_at AS approvedAt,
                    completed_at AS completedAt,

                    created_at AS createdAt,
                    updated_at AS updatedAt

                FROM land_requests

                WHERE request_id = ?
            `)
            .get(requestId);


        if (!request) {

            fail(
                "Land request not found.",
                404
            );

        }

    }


    // =====================================================
    // PROPOSED BUYER
    // =====================================================

    const proposedBuyer =
        request
            ? resolveIdentity(
                request.buyerId
            )
            : null;


    const documentId =
        generateDocumentId();


    const filePath =
        await generatePdfFile({

            documentId,

            documentType,

            land,

            currentOwner,

            proposedBuyer,

            previousOwners:
                getPreviousOwners(
                    landId
                ),

            transferCount:
                getTransferCount(
                    landId
                ),

            recentModifications:
                getRecentModifications(
                    landId
                ),

            request,

            officer,

            transactionId:
                transactionId ||
                requestId,

            preliminary: false

        });


    const sha256Hash =
        calculateSha256(
            filePath
        );


    const ipfsResult =
        await uploadFileToIPFS(
            filePath
        );


    if (
        !ipfsResult ||
        !ipfsResult.cid
    ) {

        fail(
            "IPFS upload failed: CID was not returned.",
            502
        );

    }


    const blockchainResult =
        await anchorDocument(

            officerWallet,

            documentId,

            landId,

            transactionId ||
                requestId ||
                documentId,

            documentType,

            sha256Hash,

            ipfsResult.cid

        );


    const createdAt =
        new Date().toISOString();


    db.prepare(`
        INSERT INTO documents (

            document_id,
            land_id,
            request_id,
            transaction_id,
            document_type,
            file_path,

            sha256_hash,
            ipfs_cid,
            blockchain_reference,

            created_by,
            created_at

        )

        VALUES (

            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?

        )
    `).run(

        documentId,

        landId,

        requestId,

        transactionId ||
            requestId,

        documentType,

        filePath,

        sha256Hash,

        ipfsResult.cid,

        blockchainResult.transactionHash,

        createdBy ||
            officerId ||
            "SYSTEM",

        createdAt

    );


    if (requestId) {

        db.prepare(`
            UPDATE land_events

            SET document_id = ?

            WHERE request_id = ?
              AND document_id IS NULL
        `).run(

            documentId,
            requestId

        );

    }


    createAuditSafely({

        entityType: "DOCUMENT",

        entityId: documentId,

        action:
            "DOCUMENT_ANCHORED",

        performedBy:
            createdBy ||
            officerId ||
            "SYSTEM",

        details: {

            landId,
            requestId,
            documentType,

            sha256Hash,

            ipfsCid:
                ipfsResult.cid,

            blockchainTransaction:
                blockchainResult.transactionHash

        }

    });


    return {

        documentId,

        landId,

        requestId,

        transactionId:
            transactionId ||
            requestId,

        documentType,

        filePath,

        sha256Hash,

        ipfsCid:
            ipfsResult.cid,

        blockchainReference:
            blockchainResult.transactionHash

    };

}


// =========================================================
// GET DOCUMENT
// =========================================================

function getDocumentById(
    documentId
) {

    if (!documentId) {
        fail("Document ID is required.");
    }


    return db.prepare(`
        SELECT

            document_id AS documentId,
            land_id AS landId,
            request_id AS requestId,
            transaction_id AS transactionId,

            document_type AS documentType,
            file_path AS filePath,

            sha256_hash AS sha256Hash,
            ipfs_cid AS ipfsCid,
            blockchain_reference AS blockchainReference,

            created_by AS createdBy,
            created_at AS createdAt

        FROM documents

        WHERE document_id = ?
    `).get(documentId);
}


// =========================================================
// GET DOCUMENTS BY LAND
// =========================================================

function getDocumentsByLand(
    landId
) {

    if (!landId) {
        fail("Land ID is required.");
    }


    return db.prepare(`
        SELECT

            document_id AS documentId,
            land_id AS landId,
            request_id AS requestId,
            transaction_id AS transactionId,

            document_type AS documentType,
            file_path AS filePath,

            sha256_hash AS sha256Hash,
            ipfs_cid AS ipfsCid,
            blockchain_reference AS blockchainReference,

            created_by AS createdBy,
            created_at AS createdAt

        FROM documents

        WHERE land_id = ?

        ORDER BY created_at DESC
    `).all(landId);
}


// =========================================================
// GET DOCUMENTS BY REQUEST
// =========================================================

function getDocumentsByRequest(
    requestId
) {

    if (!requestId) {
        fail("Request ID is required.");
    }


    return db.prepare(`
        SELECT

            document_id AS documentId,
            land_id AS landId,
            request_id AS requestId,
            transaction_id AS transactionId,

            document_type AS documentType,
            file_path AS filePath,

            sha256_hash AS sha256Hash,
            ipfs_cid AS ipfsCid,
            blockchain_reference AS blockchainReference,

            created_by AS createdBy,
            created_at AS createdAt

        FROM documents

        WHERE request_id = ?

        ORDER BY created_at DESC
    `).all(requestId);
}


// =========================================================
// AUDIT HELPER
// =========================================================

function createAuditSafely(
    payload
) {

    try {

        const auditService =
            require("./audit.service");

        auditService.createAuditEvent(
            payload
        );

    } catch (error) {

        console.warn(
            "Document audit failed:",
            error.message
        );

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

    calculateSha256

};