const db = require("../../database/database");

const { getIdentityByUserId } = require("./identity.service");
const { getLandById } = require("./land.service");

const {
    proposeTransfer: proposeTransferOnBlockchain,
    acceptTransfer: acceptTransferOnBlockchain,
    approveTransfer: approveTransferOnBlockchain,
    rejectTransfer: rejectTransferOnBlockchain,

    proposeLandUpdate: proposeLandUpdateOnBlockchain,
    approveLandUpdate: approveLandUpdateOnBlockchain,
    rejectLandUpdate: rejectLandUpdateOnBlockchain,

    getBlockchainLand,
    getBlockchainTransfer,
    getBlockchainLandUpdate
} = require("./blockchain.service");

const {
    createPreliminaryDocument,
    createDocument
} = require("./document.service");


// =========================================================
// CONSTANTS
// =========================================================

const REQUEST_TYPES = {
    OWNERSHIP_TRANSFER: "OWNERSHIP_TRANSFER",
    AREA_MODIFICATION: "AREA_MODIFICATION",
    LAND_USE_MODIFICATION: "LAND_USE_MODIFICATION",
    LAND_TYPE_MODIFICATION: "LAND_TYPE_MODIFICATION",
    OTHER_MODIFICATION: "OTHER_MODIFICATION"
};

const REQUEST_STATUS = {
    DRAFT: "DRAFT",
    PENDING_BUYER_ACCEPTANCE: "PENDING_BUYER_ACCEPTANCE",
    PENDING_AUTHORITY_REVIEW: "PENDING_AUTHORITY_REVIEW",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    COMPLETED: "COMPLETED"
};

const UPDATE_TYPES = {
    AREA_MODIFICATION: 1,
    LAND_USE_MODIFICATION: 2,
    LAND_TYPE_MODIFICATION: 3,
    OTHER_MODIFICATION: 4
};


// =========================================================
// HELPERS
// =========================================================

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
}

function now() {
    return new Date().toISOString();
}

function createAuditSafely(payload) {
    try {
        const audit = require("./audit.service");

        if (typeof audit.createAuditEvent === "function") {
            audit.createAuditEvent(payload);
        }
    } catch (error) {
        console.warn(
            "Audit event could not be created:",
            error.message
        );
    }
}

function generateRequestId() {
    const year = new Date().getFullYear();

    const row = db.prepare(`
        SELECT COUNT(*) AS count
        FROM land_requests
    `).get();

    return `REQ-${year}-${String(row.count + 1).padStart(4, "0")}`;
}

function getUpdateType(requestType) {
    switch (requestType) {
        case REQUEST_TYPES.AREA_MODIFICATION:
            return UPDATE_TYPES.AREA_MODIFICATION;

        case REQUEST_TYPES.LAND_USE_MODIFICATION:
            return UPDATE_TYPES.LAND_USE_MODIFICATION;

        case REQUEST_TYPES.LAND_TYPE_MODIFICATION:
            return UPDATE_TYPES.LAND_TYPE_MODIFICATION;

        case REQUEST_TYPES.OTHER_MODIFICATION:
            return UPDATE_TYPES.OTHER_MODIFICATION;

        default:
            return null;
    }
}


// =========================================================
// GET REQUEST
// =========================================================

function getRequestById(requestId) {

    if (!requestId) {
        fail("Request ID is required.");
    }

    return db.prepare(`
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

            preliminary_document_id AS preliminaryDocumentId,

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
    `).get(requestId) || null;
}


// =========================================================
// GET REQUESTS
// =========================================================

function getRequests(filters = {}) {

    let sql = `
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
            preliminary_document_id AS preliminaryDocumentId,
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
    `;

    const conditions = [];
    const params = [];

    if (filters.status) {
        conditions.push("status = ?");
        params.push(filters.status);
    }

    if (filters.landId) {
        conditions.push("land_id = ?");
        params.push(filters.landId);
    }

    if (filters.requesterId) {
        conditions.push("requester_id = ?");
        params.push(filters.requesterId);
    }

    if (filters.requestType) {
        conditions.push("request_type = ?");
        params.push(filters.requestType);
    }

    if (conditions.length) {
        sql += `
            WHERE ${conditions.join(" AND ")}
        `;
    }

    sql += `
        ORDER BY created_at DESC
    `;

    return db.prepare(sql).all(...params);
}


// =========================================================
// CREATE REQUEST
// =========================================================

async function createRequest(payload) {

    const {
        requestType,
        landId,
        requesterId,

        sellerId = null,
        buyerId = null,

        reason = "",
        agreedAmount = null,

        requestedArea = null,
        requestedAreaUnit = null,

        requestedLandUse = null,
        requestedLandType = null,

        requestedDetails = null
    } = payload;

    if (!Object.values(REQUEST_TYPES).includes(requestType)) {
        fail(
            `Unsupported request type: ${requestType}`
        );
    }

    if (!landId) {
        fail("Land ID is required.");
    }

    if (!requesterId) {
        fail("Requester ID is required.");
    }

    const requester =
        getIdentityByUserId(requesterId);

    if (!requester) {
        fail(
            "Requester account not found.",
            404
        );
    }

    if (requester.role !== "CITIZEN") {
        fail(
            "Only citizens can create land transaction requests.",
            403
        );
    }

    if (requester.status !== "ACTIVE") {
        fail(
            "Requester account is not active.",
            403
        );
    }

    if (!requester.walletAddress) {
        fail(
            "Requester wallet is not registered.",
            409
        );
    }

    const land =
        getLandById(landId);

    if (!land) {
        fail(
            "Land record not found.",
            404
        );
    }

    if (land.currentOwnerId !== requesterId) {
        fail(
            "Requester is not the current owner of this land.",
            403
        );
    }

    if (land.status !== "ALLOCATED") {
        fail(
            `Land cannot be modified from status ${land.status}.`,
            409
        );
    }

    const existing = db.prepare(`
        SELECT request_id
        FROM land_requests
        WHERE land_id = ?

        AND status IN (
            'DRAFT',
            'PENDING_BUYER_ACCEPTANCE',
            'PENDING_AUTHORITY_REVIEW',
            'APPROVED'
        )

        LIMIT 1
    `).get(landId);

    if (existing) {
        fail(
            `A request (${existing.request_id}) is already pending for this land.`,
            409
        );
    }

    let buyer = null;

    if (
        requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {

        if (!buyerId) {
            fail(
                "Buyer ID is required for ownership transfer."
            );
        }

        buyer =
            getIdentityByUserId(buyerId);

        if (!buyer) {
            fail(
                "Buyer account not found.",
                404
            );
        }

        if (buyer.role !== "CITIZEN") {
            fail(
                "Buyer must be a citizen.",
                403
            );
        }

        if (buyer.status !== "ACTIVE") {
            fail(
                "Buyer account is not active.",
                403
            );
        }

        if (!buyer.walletAddress) {
            fail(
                "Buyer wallet is not registered.",
                409
            );
        }

        if (buyerId === requesterId) {
            fail(
                "Buyer must be different from the current owner."
            );
        }
    }

    const requestId =
        generateRequestId();

    const createdAt =
        now();

    let blockchainResult;

    if (
        requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {

        blockchainResult =
            await proposeTransferOnBlockchain(
                requester.walletAddress,
                requestId,
                landId,
                buyer.walletAddress,
                reason || ""
            );

    } else {

        const updateType =
            getUpdateType(requestType);

        blockchainResult =
            await proposeLandUpdateOnBlockchain(
                requester.walletAddress,
                requestId,
                landId,
                updateType,
                requestedArea || 0,
                requestedAreaUnit || "",
                requestedLandUse || "",
                requestedLandType || "",
                reason || requestedDetails || ""
            );
    }

    const initialStatus =
        requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER

            ? REQUEST_STATUS.PENDING_BUYER_ACCEPTANCE

            : REQUEST_STATUS.PENDING_AUTHORITY_REVIEW;


    const transaction =
        db.transaction(() => {

            db.prepare(`
                INSERT INTO land_requests (

                    request_id,
                    land_id,
                    request_type,

                    requester_id,
                    seller_id,
                    buyer_id,

                    reason,
                    agreed_amount,

                    current_area,
                    requested_area,

                    current_area_unit,
                    requested_area_unit,

                    current_land_use,
                    requested_land_use,

                    current_land_type,
                    requested_land_type,

                    requested_details,

                    status,

                    proposed_at,
                    created_at,
                    updated_at

                )

                VALUES (

                    ?, ?, ?,
                    ?, ?, ?,

                    ?, ?,

                    ?, ?,

                    ?, ?,

                    ?, ?,

                    ?, ?,

                    ?,

                    ?,

                    ?, ?, ?

                )
            `).run(

                requestId,
                landId,
                requestType,

                requesterId,
                sellerId || requesterId,
                buyerId,

                reason,
                agreedAmount,

                land.parcelArea,
                requestedArea,

                land.areaUnit,
                requestedAreaUnit,

                land.landUseType,
                requestedLandUse,

                land.landType,
                requestedLandType,

                requestedDetails,

                initialStatus,

                createdAt,
                createdAt,
                createdAt
            );


            db.prepare(`
                UPDATE lands

                SET
                    status = ?,
                    updated_at = ?

                WHERE land_id = ?
            `).run(

                requestType ===
                REQUEST_TYPES.OWNERSHIP_TRANSFER

                    ? "TRANSFER_PENDING"

                    : "UPDATE_PENDING",

                createdAt,
                landId
            );
        });


    transaction();


    let preliminaryDocument = null;

    try {

        preliminaryDocument =
            await createPreliminaryDocument({

                requestId,

                documentType:
                    requestType ===
                    REQUEST_TYPES.OWNERSHIP_TRANSFER

                        ? "PRELIMINARY_TRANSFER_AGREEMENT"

                        : "PRELIMINARY_LAND_MODIFICATION",

                landId,

                requesterId,

                sellerId:
                    sellerId || requesterId,

                buyerId

            });

    } catch (error) {

        console.error(
            "Preliminary document generation failed:",
            error.message
        );

        preliminaryDocument = {
            status: "FAILED",
            error: error.message
        };
    }


    createAuditSafely({

        entityType:
            "LAND_REQUEST",

        entityId:
            requestId,

        action:
            "REQUEST_CREATED",

        performedBy:
            requesterId,

        details: {

            landId,

            requestType,

            buyerId,

            reason,

            blockchainTransaction:
                blockchainResult.transactionHash
        }
    });


    return {

        requestId,

        landId,

        requestType,

        status:
            initialStatus,

        preliminaryDocument,

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash
        }
    };
}


// =========================================================
// ACCEPT REQUEST
// =========================================================

async function acceptRequest(payload) {

    const {
        requestId,
        buyerId
    } = payload;

    if (!requestId) {
        fail("Request ID is required.");
    }

    if (!buyerId) {
        fail("Buyer ID is required.");
    }

    const request =
        getRequestById(requestId);

    if (!request) {
        fail(
            "Land request not found.",
            404
        );
    }

    if (
        request.requestType !==
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {
        fail(
            "Only ownership transfers require buyer acceptance.",
            409
        );
    }

    if (
        request.status !==
        REQUEST_STATUS.PENDING_BUYER_ACCEPTANCE
    ) {
        fail(
            `Request cannot be accepted from status ${request.status}.`,
            409
        );
    }

    if (
        request.buyerId !== buyerId
    ) {
        fail(
            "Only the registered buyer can accept this request.",
            403
        );
    }

    const buyer =
        getIdentityByUserId(buyerId);

    if (!buyer) {
        fail(
            "Buyer account not found.",
            404
        );
    }

    const blockchainResult =
        await acceptTransferOnBlockchain(
            buyer.walletAddress,
            requestId
        );

    const acceptedAt =
        now();

    db.prepare(`
        UPDATE land_requests

        SET
            status = ?,
            updated_at = ?

        WHERE request_id = ?
    `).run(

        REQUEST_STATUS.PENDING_AUTHORITY_REVIEW,

        acceptedAt,

        requestId
    );


    createAuditSafely({

        entityType:
            "LAND_REQUEST",

        entityId:
            requestId,

        action:
            "REQUEST_ACCEPTED",

        performedBy:
            buyerId,

        details: {

            landId:
                request.landId,

            blockchainTransaction:
                blockchainResult.transactionHash
        }
    });


    return {

        requestId,

        status:
            REQUEST_STATUS.PENDING_AUTHORITY_REVIEW,

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash
        }
    };
}


// =========================================================
// REVIEW REQUEST
// =========================================================

async function reviewRequest(payload) {

    const {
        requestId,
        officerId,
        reviewNotes = ""
    } = payload;

    if (!requestId) {
        fail("Request ID is required.");
    }

    if (!officerId) {
        fail("Officer ID is required.");
    }

    const request =
        getRequestById(requestId);

    if (!request) {
        fail(
            "Land request not found.",
            404
        );
    }

    if (
        request.status !==
        REQUEST_STATUS.PENDING_AUTHORITY_REVIEW
    ) {
        fail(
            `Request cannot be reviewed from status ${request.status}.`,
            409
        );
    }

    const officer =
        getIdentityByUserId(officerId);

    if (!officer) {
        fail(
            "Officer not found.",
            404
        );
    }

    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {
        fail(
            "Only a Land Administration Officer can review requests.",
            403
        );
    }

    const land =
        getLandById(request.landId);

    if (!land) {
        fail(
            "Land record not found.",
            404
        );
    }

    if (
        officer.regionId !==
        land.regionId
    ) {
        fail(
            "Officer is not authorized for this land region.",
            403
        );
    }


    const blockchainLand =
        await getBlockchainLand(
            request.landId
        );

    let blockchainRequest;

    if (
        request.requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {

        blockchainRequest =
            await getBlockchainTransfer(
                requestId
            );

    } else {

        blockchainRequest =
            await getBlockchainLandUpdate(
                requestId
            );
    }

    if (
        !blockchainLand ||
        !blockchainRequest
    ) {
        fail(
            "Database and blockchain state could not be verified.",
            409
        );
    }

    const reviewedAt =
        now();

    db.prepare(`
        UPDATE land_requests

        SET

            validation_result = ?,

            validation_message = ?,

            reviewed_by = ?,

            review_notes = ?,

            validated_at = ?,

            reviewed_at = ?,

            updated_at = ?

        WHERE request_id = ?
    `).run(

        "VALIDATED",

        "Database and blockchain state verified by regional officer.",

        officerId,

        reviewNotes,

        reviewedAt,

        reviewedAt,

        reviewedAt,

        requestId
    );


    createAuditSafely({

        entityType:
            "LAND_REQUEST",

        entityId:
            requestId,

        action:
            "REQUEST_REVIEWED",

        performedBy:
            officerId,

        details: {

            landId:
                request.landId,

            regionId:
                land.regionId,

            validation:
                "VALIDATED"
        }
    });


    return {

        requestId,

        status:
            request.status,

        validationResult:
            "VALIDATED",

        validationMessage:
            "Database and blockchain state verified."
    };
}


// =========================================================
// APPROVE REQUEST
// =========================================================

async function approveRequest(payload) {

    const {
        requestId,
        officerId,
        reviewNotes = ""
    } = payload;


    if (!requestId) {
        fail("Request ID is required.");
    }

    if (!officerId) {
        fail("Officer ID is required.");
    }


    const request =
        getRequestById(requestId);

    if (!request) {
        fail(
            "Land request not found.",
            404
        );
    }


    if (
        request.status !==
        REQUEST_STATUS.PENDING_AUTHORITY_REVIEW
    ) {
        fail(
            `Request cannot be approved from status ${request.status}.`,
            409
        );
    }


    const officer =
        getIdentityByUserId(officerId);

    if (!officer) {
        fail(
            "Officer not found.",
            404
        );
    }


    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {
        fail(
            "Only a Land Administration Officer can approve requests.",
            403
        );
    }


    const land =
        getLandById(request.landId);

    if (!land) {
        fail(
            "Land record not found.",
            404
        );
    }


    if (
        officer.regionId !==
        land.regionId
    ) {
        fail(
            "Officer is not authorized for this land region.",
            403
        );
    }


    if (
        request.validationResult !==
        "VALIDATED"
    ) {
        fail(
            "Request must be validated before approval.",
            409
        );
    }


    // -----------------------------------------------------
    // BLOCKCHAIN APPROVAL
    // -----------------------------------------------------

    let blockchainResult;


    if (
        request.requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {

        const existing =
            await getBlockchainTransfer(
                requestId
            );

        const blockchainStatus =
            existing
                ? Number(existing[4])
                : -1;


        /*
         * STATUS 3 = COMPLETED
         *
         * The original approval already completed
         * the blockchain transaction before SQLite failed.
         *
         * Therefore DO NOT send approveTransfer again.
         */

        if (
            blockchainStatus === 3
        ) {

            blockchainResult = {

                transactionHash:
                    "ALREADY_COMPLETED_ON_BLOCKCHAIN",

                recovered:
                    true
            };

        } else {

            blockchainResult =
                await approveTransferOnBlockchain(
                    officer.walletAddress,
                    requestId
                );
        }


    } else {

        blockchainResult =
            await approveLandUpdateOnBlockchain(
                officer.walletAddress,
                requestId
            );
    }


    const approvedAt =
        now();

    const previousOwnerId =
        land.currentOwnerId;


    // =====================================================
    // DATABASE TRANSACTION
    // =====================================================

    const transaction =
        db.transaction(() => {


            // ---------------------------------------------
            // UPDATE LAND
            // ---------------------------------------------

            if (
                request.requestType ===
                REQUEST_TYPES.OWNERSHIP_TRANSFER
            ) {

                db.prepare(`
                    UPDATE lands

                    SET

                        current_owner_id = ?,

                        owner_type = ?,

                        ownership_status = ?,

                        status = ?,

                        updated_at = ?

                    WHERE land_id = ?
                `).run(

                    request.buyerId,

                    "CITIZEN",

                    "CITIZEN_OWNED",

                    "ALLOCATED",

                    approvedAt,

                    request.landId
                );


            } else if (
                request.requestType ===
                REQUEST_TYPES.AREA_MODIFICATION
            ) {

                db.prepare(`
                    UPDATE lands

                    SET

                        parcel_area = ?,

                        area_unit = ?,

                        status = ?,

                        updated_at = ?

                    WHERE land_id = ?
                `).run(

                    request.requestedArea,

                    request.requestedAreaUnit ||
                    land.areaUnit,

                    "ALLOCATED",

                    approvedAt,

                    request.landId
                );


            } else if (
                request.requestType ===
                REQUEST_TYPES.LAND_USE_MODIFICATION
            ) {

                db.prepare(`
                    UPDATE lands

                    SET

                        land_use_type = ?,

                        status = ?,

                        updated_at = ?

                    WHERE land_id = ?
                `).run(

                    request.requestedLandUse,

                    "ALLOCATED",

                    approvedAt,

                    request.landId
                );


            } else if (
                request.requestType ===
                REQUEST_TYPES.LAND_TYPE_MODIFICATION
            ) {

                db.prepare(`
                    UPDATE lands

                    SET

                        land_type = ?,

                        status = ?,

                        updated_at = ?

                    WHERE land_id = ?
                `).run(

                    request.requestedLandType,

                    "ALLOCATED",

                    approvedAt,

                    request.landId
                );


            } else {

                db.prepare(`
                    UPDATE lands

                    SET

                        status = ?,

                        updated_at = ?

                    WHERE land_id = ?
                `).run(

                    "ALLOCATED",

                    approvedAt,

                    request.landId
                );
            }


            // ---------------------------------------------
            // UPDATE REQUEST
            // ---------------------------------------------

            db.prepare(`
                UPDATE land_requests

                SET

                    status = ?,

                    reviewed_by = ?,

                    review_notes = ?,

                    approved_at = ?,

                    completed_at = ?,

                    updated_at = ?

                WHERE request_id = ?
            `).run(

                REQUEST_STATUS.COMPLETED,

                officerId,

                reviewNotes,

                approvedAt,

                approvedAt,

                approvedAt,

                requestId
            );


            // =================================================
            // LAND EVENT
            //
            // IMPORTANT:
            // 16 COLUMNS
            // 16 PLACEHOLDERS
            // 16 VALUES
            // =================================================

            db.prepare(`
                INSERT INTO land_events (

                    land_id,

                    request_id,

                    event_type,

                    previous_owner_id,

                    new_owner_id,

                    previous_area,

                    new_area,

                    previous_land_use,

                    new_land_use,

                    previous_land_type,

                    new_land_type,

                    reason,

                    performed_by,

                    blockchain_reference,

                    description,

                    created_at

                )

                VALUES (

                    ?, ?, ?, ?,

                    ?, ?, ?, ?,

                    ?, ?, ?, ?,

                    ?, ?, ?, ?

                )
            `).run(

                request.landId,

                requestId,

                request.requestType,

                previousOwnerId,

                request.buyerId ||
                    previousOwnerId,

                land.parcelArea,

                request.requestedArea ||
                    land.parcelArea,

                land.landUseType,

                request.requestedLandUse ||
                    land.landUseType,

                land.landType,

                request.requestedLandType ||
                    land.landType,

                request.reason,

                officerId,

                blockchainResult.transactionHash,

                `Land ${request.requestType} completed successfully.`,

                approvedAt
            );
        });


    transaction();


    // =====================================================
    // FINAL DOCUMENT
    // =====================================================

    let documentType =
        "LAND_MODIFICATION_RECORD";


    if (
        request.requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {

        documentType =
            "LAND_TRANSFER_RECORD";

    } else if (
        request.requestType ===
        REQUEST_TYPES.AREA_MODIFICATION
    ) {

        documentType =
            "LAND_AREA_MODIFICATION_RECORD";

    } else if (
        request.requestType ===
        REQUEST_TYPES.LAND_USE_MODIFICATION
    ) {

        documentType =
            "LAND_USE_MODIFICATION_RECORD";

    } else if (
        request.requestType ===
        REQUEST_TYPES.LAND_TYPE_MODIFICATION
    ) {

        documentType =
            "LAND_TYPE_MODIFICATION_RECORD";
    }


    let finalDocument = null;


    try {

        finalDocument =
            await createDocument({

                documentType,

                landId:
                    request.landId,

                requestId,

                transactionId:
                    requestId,

                citizenId:
                    request.buyerId ||
                    request.requesterId ||
                    previousOwnerId,

                sellerId:
                    request.sellerId,

                officerId,

                officerWallet:
                    officer.walletAddress,

                createdBy:
                    officerId
            });

    } catch (error) {

        console.error(
            "Final document generation failed:",
            error.stack ||
            error.message
        );

        finalDocument = {

            status:
                "FAILED",

            error:
                error.message
        };
    }


    createAuditSafely({

        entityType:
            "LAND_REQUEST",

        entityId:
            requestId,

        action:
            "REQUEST_APPROVED",

        performedBy:
            officerId,

        details: {

            landId:
                request.landId,

            requestType:
                request.requestType,

            previousOwner:
                previousOwnerId,

            newOwner:
                request.buyerId ||
                previousOwnerId,

            blockchainTransaction:
                blockchainResult.transactionHash
        }
    });


    return {

        requestId,

        landId:
            request.landId,

        requestType:
            request.requestType,

        status:
            REQUEST_STATUS.COMPLETED,

        previousOwner:
            previousOwnerId,

        newOwner:
            request.buyerId ||
            previousOwnerId,

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash,

            recovered:
                blockchainResult.recovered ||
                false
        },

        document:
            finalDocument
    };
}


// =========================================================
// REJECT REQUEST
// =========================================================

async function rejectRequest(payload) {

    const {
        requestId,
        officerId,
        reason
    } = payload;


    if (!requestId) {
        fail("Request ID is required.");
    }

    if (!officerId) {
        fail("Officer ID is required.");
    }

    if (!reason) {
        fail(
            "Rejection reason is required."
        );
    }


    const request =
        getRequestById(requestId);

    if (!request) {
        fail(
            "Land request not found.",
            404
        );
    }


    const officer =
        getIdentityByUserId(officerId);

    if (!officer) {
        fail(
            "Officer not found.",
            404
        );
    }


    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {
        fail(
            "Only a Land Administration Officer can reject requests.",
            403
        );
    }


    const land =
        getLandById(request.landId);

    if (!land) {
        fail(
            "Land record not found.",
            404
        );
    }


    if (
        officer.regionId !==
        land.regionId
    ) {
        fail(
            "Officer is not authorized for this land region.",
            403
        );
    }


    let blockchainResult;


    if (
        request.requestType ===
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {

        blockchainResult =
            await rejectTransferOnBlockchain(
                officer.walletAddress,
                requestId,
                reason
            );

    } else {

        blockchainResult =
            await rejectLandUpdateOnBlockchain(
                officer.walletAddress,
                requestId,
                reason
            );
    }


    const rejectedAt =
        now();


    const transaction =
        db.transaction(() => {


            db.prepare(`
                UPDATE land_requests

                SET

                    status = ?,

                    validation_result = ?,

                    validation_message = ?,

                    reviewed_by = ?,

                    review_notes = ?,

                    reviewed_at = ?,

                    updated_at = ?

                WHERE request_id = ?
            `).run(

                REQUEST_STATUS.REJECTED,

                "REJECTED",

                reason,

                officerId,

                reason,

                rejectedAt,

                rejectedAt,

                requestId
            );


            db.prepare(`
                UPDATE lands

                SET

                    status = ?,

                    updated_at = ?

                WHERE land_id = ?
            `).run(

                "ALLOCATED",

                rejectedAt,

                request.landId
            );
        });


    transaction();


    createAuditSafely({

        entityType:
            "LAND_REQUEST",

        entityId:
            requestId,

        action:
            "REQUEST_REJECTED",

        performedBy:
            officerId,

        details: {

            landId:
                request.landId,

            reason,

            blockchainTransaction:
                blockchainResult.transactionHash
        }
    });


    return {

        requestId,

        status:
            REQUEST_STATUS.REJECTED,

        reason,

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash
        }
    };
}


// =========================================================
// LAND HISTORY
// =========================================================

function getLandHistory(landId) {

    if (!landId) {
        fail("Land ID is required.");
    }


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
// RECOVERY
//
// The blockchain transfer is ALREADY COMPLETED.
// We synchronize SQLite with blockchain state.
// =========================================================

async function recoverCompletedTransfer(payload) {

    const {
        requestId,
        officerId
    } = payload;


    if (!requestId) {
        fail("Request ID is required.");
    }

    if (!officerId) {
        fail("Officer ID is required.");
    }


    const request =
        getRequestById(requestId);

    if (!request) {
        fail(
            "Land request not found.",
            404
        );
    }


    if (
        request.requestType !==
        REQUEST_TYPES.OWNERSHIP_TRANSFER
    ) {
        fail(
            "Recovery currently supports ownership transfers only.",
            409
        );
    }


    const officer =
        getIdentityByUserId(officerId);

    if (!officer) {
        fail(
            "Officer not found.",
            404
        );
    }


    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {
        fail(
            "Only a Land Administration Officer can recover a completed transfer.",
            403
        );
    }


    const land =
        getLandById(request.landId);

    if (!land) {
        fail(
            "Land record not found.",
            404
        );
    }


    if (
        officer.regionId !==
        land.regionId
    ) {
        fail(
            "Officer is not authorized for this land region.",
            403
        );
    }


    // -----------------------------------------------------
    // READ BLOCKCHAIN
    // -----------------------------------------------------

    const blockchainTransfer =
        await getBlockchainTransfer(
            requestId
        );

    const blockchainLand =
        await getBlockchainLand(
            request.landId
        );


    if (
        !blockchainTransfer ||
        !blockchainLand
    ) {
        fail(
            "Blockchain state could not be read.",
            409
        );
    }


    const transferStatus =
        Number(
            blockchainTransfer[4]
        );


    const blockchainOwner =
        String(
            blockchainLand[8]
        ).toLowerCase();


    const buyer =
        getIdentityByUserId(
            request.buyerId
        );


    if (
        !buyer ||
        !buyer.walletAddress
    ) {
        fail(
            "Registered buyer wallet could not be found.",
            409
        );
    }


    const buyerWallet =
        buyer.walletAddress.toLowerCase();


    // STATUS 3 = COMPLETED

    if (
        transferStatus !== 3
    ) {
        fail(
            `Blockchain transfer is not completed. Current status: ${transferStatus}`,
            409
        );
    }


    if (
        blockchainOwner !==
        buyerWallet
    ) {
        fail(
            "Blockchain owner does not match the registered buyer wallet.",
            409
        );
    }


    const completedAt =
        now();


    const previousOwnerId =
        land.currentOwnerId;


    // =====================================================
    // SYNCHRONIZE DATABASE
    // =====================================================

    const transaction =
        db.transaction(() => {


            db.prepare(`
                UPDATE lands

                SET

                    current_owner_id = ?,

                    owner_type = ?,

                    ownership_status = ?,

                    status = ?,

                    updated_at = ?

                WHERE land_id = ?
            `).run(

                request.buyerId,

                "CITIZEN",

                "CITIZEN_OWNED",

                "ALLOCATED",

                completedAt,

                request.landId
            );


            db.prepare(`
                UPDATE land_requests

                SET

                    status = ?,

                    reviewed_by = ?,

                    approved_at = ?,

                    completed_at = ?,

                    updated_at = ?

                WHERE request_id = ?
            `).run(

                REQUEST_STATUS.COMPLETED,

                officerId,

                completedAt,

                completedAt,

                completedAt,

                requestId
            );


            // =================================================
            // EXACTLY 16 COLUMNS
            // EXACTLY 16 PLACEHOLDERS
            // EXACTLY 16 VALUES
            // =================================================

            db.prepare(`
                INSERT INTO land_events (

                    land_id,

                    request_id,

                    event_type,

                    previous_owner_id,

                    new_owner_id,

                    previous_area,

                    new_area,

                    previous_land_use,

                    new_land_use,

                    previous_land_type,

                    new_land_type,

                    reason,

                    performed_by,

                    blockchain_reference,

                    description,

                    created_at

                )

                VALUES (

                    ?, ?, ?, ?,

                    ?, ?, ?, ?,

                    ?, ?, ?, ?,

                    ?, ?, ?, ?

                )
            `).run(

                request.landId,

                requestId,

                REQUEST_TYPES.OWNERSHIP_TRANSFER,

                previousOwnerId,

                request.buyerId,

                land.parcelArea,

                land.parcelArea,

                land.landUseType,

                land.landUseType,

                land.landType,

                land.landType,

                request.reason,

                officerId,

                requestId,

                "Ownership transfer recovered from completed blockchain transaction.",

                completedAt
            );
        });


    transaction();


    // =====================================================
    // FINAL REGISTERED DOCUMENT
    // =====================================================

    let finalDocument = null;


    try {

        finalDocument =
            await createDocument({

                documentType:
                    "LAND_TRANSFER_RECORD",

                landId:
                    request.landId,

                requestId,

                transactionId:
                    requestId,

                citizenId:
                    request.buyerId,

                sellerId:
                    request.sellerId,

                officerId,

                officerWallet:
                    officer.walletAddress,

                createdBy:
                    officerId
            });

    } catch (error) {

        console.error(
            "Recovery final document generation failed:",

            error.stack ||
            error.message
        );


        finalDocument = {

            status:
                "FAILED",

            error:
                error.message
        };
    }


    createAuditSafely({

        entityType:
            "LAND_REQUEST",

        entityId:
            requestId,

        action:
            "REQUEST_APPROVAL_RECOVERED",

        performedBy:
            officerId,

        details: {

            landId:
                request.landId,

            requestType:
                request.requestType,

            previousOwner:
                previousOwnerId,

            newOwner:
                request.buyerId,

            blockchainTransferStatus:
                "COMPLETED",

            blockchainOwner:
                blockchainOwner
        }
    });


    return {

        requestId,

        landId:
            request.landId,

        status:
            REQUEST_STATUS.COMPLETED,

        recovery:
            true,

        blockchain: {

            transferStatus:
                "COMPLETED",

            ownerWallet:
                blockchainOwner
        },

        document:
            finalDocument
    };
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    REQUEST_TYPES,

    REQUEST_STATUS,

    createRequest,

    getRequestById,

    getRequests,

    acceptRequest,

    reviewRequest,

    approveRequest,

    rejectRequest,

    getLandHistory,

    recoverCompletedTransfer
};