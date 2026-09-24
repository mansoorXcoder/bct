const db = require("../../database/database");

const {
    getIdentityByUserId
} = require("./identity.service");

const {
    getLandById
} = require("./land.service");

const {
    proposeTransfer: proposeTransferOnBlockchain,
    acceptTransfer: acceptTransferOnBlockchain,
    approveTransfer: approveTransferOnBlockchain
} = require("./blockchain.service");


// =========================================================
// GENERATE TRANSFER ID
// =========================================================

function generateTransferId() {

    const year =
        new Date().getFullYear();

    const count =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM transfer_proposals
        `).get().count;

    const number =
        String(count + 1)
            .padStart(4, "0");

    return `TR-${year}-${number}`;
}


// =========================================================
// GET TRANSFER
// =========================================================

function getTransferById(
    transferId
) {

    return db.prepare(`
        SELECT
            transfer_id AS transferId,
            land_id AS landId,
            seller_id AS sellerId,
            buyer_id AS buyerId,
            status,
            reason,
            proposed_at AS proposedAt,
            accepted_at AS acceptedAt,
            reviewed_at AS reviewedAt,
            approved_at AS approvedAt,
            completed_at AS completedAt,
            reviewed_by AS reviewedBy
        FROM transfer_proposals
        WHERE transfer_id = ?
    `).get(
        transferId
    );
}


// =========================================================
// GET ALL TRANSFERS
// =========================================================

function getTransfers() {

    return db.prepare(`
        SELECT
            transfer_id AS transferId,
            land_id AS landId,
            seller_id AS sellerId,
            buyer_id AS buyerId,
            status,
            reason,
            proposed_at AS proposedAt,
            accepted_at AS acceptedAt,
            reviewed_at AS reviewedAt,
            approved_at AS approvedAt,
            completed_at AS completedAt,
            reviewed_by AS reviewedBy
        FROM transfer_proposals
        ORDER BY proposed_at DESC
    `).all();
}


// =========================================================
// PROPOSE TRANSFER
// =========================================================

async function proposeTransfer(payload) {

    const {
        landId,
        sellerId,
        buyerId,
        reason
    } = payload;


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (!landId) {

        const error =
            new Error(
                "Land ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    if (!sellerId) {

        const error =
            new Error(
                "Seller ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    if (!buyerId) {

        const error =
            new Error(
                "Buyer ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    if (!reason) {

        const error =
            new Error(
                "Transfer reason is required."
            );

        error.statusCode = 400;

        throw error;
    }


    if (
        sellerId ===
        buyerId
    ) {

        const error =
            new Error(
                "Seller and buyer cannot be the same user."
            );

        error.statusCode = 400;

        throw error;
    }


    // -----------------------------------------
    // SELLER
    // -----------------------------------------

    const seller =
        getIdentityByUserId(
            sellerId
        );


    if (!seller) {

        const error =
            new Error(
                "Seller not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        seller.role !==
        "CITIZEN"
    ) {

        const error =
            new Error(
                "Only citizens can initiate land transfers."
            );

        error.statusCode = 403;

        throw error;
    }


    if (
        seller.status !==
        "ACTIVE"
    ) {

        const error =
            new Error(
                "Seller account is not active."
            );

        error.statusCode = 403;

        throw error;
    }


    // -----------------------------------------
    // BUYER
    // -----------------------------------------

    const buyer =
        getIdentityByUserId(
            buyerId
        );


    if (!buyer) {

        const error =
            new Error(
                "Buyer not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        buyer.role !==
        "CITIZEN"
    ) {

        const error =
            new Error(
                "Only citizens can receive land ownership."
            );

        error.statusCode = 400;

        throw error;
    }


    if (
        buyer.status !==
        "ACTIVE"
    ) {

        const error =
            new Error(
                "Buyer account is not active."
            );

        error.statusCode = 403;

        throw error;
    }


    // -----------------------------------------
    // LAND
    // -----------------------------------------

    const land =
        getLandById(
            landId
        );


    if (!land) {

        const error =
            new Error(
                "Land record not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        land.currentOwnerId !==
        sellerId
    ) {

        const error =
            new Error(
                "Seller is not the current owner of this land."
            );

        error.statusCode = 403;

        throw error;
    }


    if (
        land.status !==
        "ALLOCATED"
    ) {

        const error =
            new Error(
                `Land cannot be transferred from status ${land.status}.`
            );

        error.statusCode = 409;

        throw error;
    }


    // -----------------------------------------
    // CHECK EXISTING PENDING TRANSFER
    // -----------------------------------------

    const existingTransfer =
        db.prepare(`
            SELECT transfer_id
            FROM transfer_proposals
            WHERE land_id = ?
            AND status IN (
                'PENDING_BUYER_ACCEPTANCE',
                'PENDING_AUTHORITY_REVIEW'
            )
        `).get(
            landId
        );


    if (existingTransfer) {

        const error =
            new Error(
                "A transfer proposal is already pending for this land."
            );

        error.statusCode = 409;

        throw error;
    }


    // -----------------------------------------
    // GENERATE TRANSFER ID
    // -----------------------------------------

    const transferId =
        generateTransferId();


    // -----------------------------------------
    // BLOCKCHAIN
    // -----------------------------------------

    const blockchainResult =
        await proposeTransferOnBlockchain(

            seller.walletAddress,

            transferId,

            landId,

            buyer.walletAddress

        );


    // -----------------------------------------
    // SQLITE
    // -----------------------------------------

    const proposedAt =
        new Date().toISOString();


    db.prepare(`
        INSERT INTO transfer_proposals (
            transfer_id,
            land_id,
            seller_id,
            buyer_id,
            status,
            reason,
            proposed_at,
            accepted_at,
            reviewed_at,
            approved_at,
            completed_at,
            reviewed_by
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `).run(

        transferId,

        landId,

        sellerId,

        buyerId,

        "PENDING_BUYER_ACCEPTANCE",

        reason,

        proposedAt,

        null,

        null,

        null,

        null,

        null

    );


    // -----------------------------------------
    // UPDATE LAND STATUS
    // -----------------------------------------

    db.prepare(`
        UPDATE lands
        SET status = ?
        WHERE land_id = ?
    `).run(

        "TRANSFER_PENDING",

        landId

    );


    // -----------------------------------------
    // AUDIT
    // -----------------------------------------

    try {

        const auditService =
            require("./audit.service");

        auditService.createAuditEvent({

            entityType:
                "TRANSFER",

            entityId:
                transferId,

            action:
                "TRANSFER_CREATED",

            performedBy:
                sellerId,

            details: {

                landId,

                buyerId,

                reason,

                blockchainTransaction:
                    blockchainResult.transactionHash

            }

        });

    } catch (error) {

        console.warn(
            "Audit event could not be created:",
            error.message
        );

    }


    return {

        transferId,

        landId,

        sellerId,

        buyerId,

        status:
            "PENDING_BUYER_ACCEPTANCE",

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash

        }

    };
}


// =========================================================
// ACCEPT TRANSFER
// =========================================================

async function acceptTransfer(payload) {

    const {
        transferId,
        buyerId
    } = payload;


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (!transferId) {

        const error =
            new Error(
                "Transfer ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    if (!buyerId) {

        const error =
            new Error(
                "Buyer ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    // -----------------------------------------
    // GET TRANSFER
    // -----------------------------------------

    const transfer =
        getTransferById(
            transferId
        );


    if (!transfer) {

        const error =
            new Error(
                "Transfer proposal not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        transfer.status !==
        "PENDING_BUYER_ACCEPTANCE"
    ) {

        const error =
            new Error(
                `Transfer cannot be accepted from status ${transfer.status}.`
            );

        error.statusCode = 409;

        throw error;
    }


    // -----------------------------------------
    // BUYER
    // -----------------------------------------

    const buyer =
        getIdentityByUserId(
            buyerId
        );


    if (!buyer) {

        const error =
            new Error(
                "Buyer not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        buyer.role !==
        "CITIZEN"
    ) {

        const error =
            new Error(
                "Only citizens can accept transfers."
            );

        error.statusCode = 403;

        throw error;
    }


    if (
        buyer.status !==
        "ACTIVE"
    ) {

        const error =
            new Error(
                "Buyer account is not active."
            );

        error.statusCode = 403;

        throw error;
    }


    if (
        transfer.buyerId !==
        buyerId
    ) {

        const error =
            new Error(
                "Only the designated buyer can accept this transfer."
            );

        error.statusCode = 403;

        throw error;
    }


    // -----------------------------------------
    // BLOCKCHAIN
    // -----------------------------------------

    const blockchainResult =
        await acceptTransferOnBlockchain(

            buyer.walletAddress,

            transferId

        );


    // -----------------------------------------
    // SQLITE
    // -----------------------------------------

    const acceptedAt =
        new Date().toISOString();


    db.prepare(`
        UPDATE transfer_proposals
        SET
            status = ?,
            accepted_at = ?
        WHERE transfer_id = ?
    `).run(

        "PENDING_AUTHORITY_REVIEW",

        acceptedAt,

        transferId

    );


    // -----------------------------------------
    // AUDIT
    // -----------------------------------------

    try {

        const auditService =
            require("./audit.service");

        auditService.createAuditEvent({

            entityType:
                "TRANSFER",

            entityId:
                transferId,

            action:
                "TRANSFER_ACCEPTED",

            performedBy:
                buyerId,

            details: {

                blockchainTransaction:
                    blockchainResult.transactionHash

            }

        });

    } catch (error) {

        console.warn(
            "Audit event could not be created:",
            error.message
        );

    }


    return {

        transferId,

        status:
            "PENDING_AUTHORITY_REVIEW",

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash

        }

    };
}


// =========================================================
// APPROVE TRANSFER
// =========================================================

async function approveTransfer(payload) {

    const {
        transferId,
        officerId
    } = payload;


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (!transferId) {

        const error =
            new Error(
                "Transfer ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    if (!officerId) {

        const error =
            new Error(
                "Officer ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    // -----------------------------------------
    // GET TRANSFER
    // -----------------------------------------

    const transfer =
        getTransferById(
            transferId
        );


    if (!transfer) {

        const error =
            new Error(
                "Transfer proposal not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        transfer.status !==
        "PENDING_AUTHORITY_REVIEW"
    ) {

        const error =
            new Error(
                `Transfer cannot be approved from status ${transfer.status}.`
            );

        error.statusCode = 409;

        throw error;
    }


    // -----------------------------------------
    // OFFICER
    // -----------------------------------------

    const officer =
        getIdentityByUserId(
            officerId
        );


    if (!officer) {

        const error =
            new Error(
                "Officer not found."
            );

        error.statusCode = 404;

        throw error;
    }


    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        const error =
            new Error(
                "Only a Land Administration Officer can approve transfers."
            );

        error.statusCode = 403;

        throw error;
    }


    if (
        officer.status !==
        "ACTIVE"
    ) {

        const error =
            new Error(
                "Officer account is not active."
            );

        error.statusCode = 403;

        throw error;
    }


    // -----------------------------------------
    // LAND
    // -----------------------------------------

    const land =
        getLandById(
            transfer.landId
        );


    if (!land) {

        const error =
            new Error(
                "Land record not found."
            );

        error.statusCode = 404;

        throw error;
    }


    // -----------------------------------------
    // REGION CHECK
    // -----------------------------------------

    if (
        officer.regionId !==
        land.regionId
    ) {

        const error =
            new Error(
                "Officer is not authorized for this land region."
            );

        error.statusCode = 403;

        throw error;
    }


    // -----------------------------------------
    // BLOCKCHAIN
    // -----------------------------------------

    const blockchainResult =
        await approveTransferOnBlockchain(

            officer.walletAddress,

            transferId

        );


    // -----------------------------------------
    // SQLITE TRANSACTION
    // -----------------------------------------

    const approvedAt =
        new Date().toISOString();


    const transaction =
        db.transaction(() => {

            db.prepare(`
                UPDATE transfer_proposals
                SET
                    status = ?,
                    reviewed_at = ?,
                    approved_at = ?,
                    completed_at = ?,
                    reviewed_by = ?
                WHERE transfer_id = ?
            `).run(

                "COMPLETED",

                approvedAt,

                approvedAt,

                approvedAt,

                officerId,

                transferId

            );


            db.prepare(`
                UPDATE lands
                SET
                    current_owner_id = ?,
                    status = ?
                WHERE land_id = ?
            `).run(

                transfer.buyerId,

                "ALLOCATED",

                transfer.landId

            );

        });


    transaction();

        // -----------------------------------------
    // AUTOMATIC FINAL DOCUMENT
    // -----------------------------------------
    // The document is created ONLY after:
    // 1. Buyer accepted
    // 2. Officer approved
    // 3. Blockchain approval succeeded
    // 4. SQLite ownership update succeeded
    // -----------------------------------------

    let generatedDocument = null;

    try {

        const documentService =
            require("./document.service");

        generatedDocument =
            await documentService.createDocument({

                documentType:
                    "LAND_TRANSFER_RECORD",

                landId:
                    transfer.landId,

                citizenId:
                    transfer.buyerId,

                sellerId:
                    transfer.sellerId,

                transactionId:
                    transferId,

                officerWallet:
                    officer.walletAddress

            });

    } catch (documentError) {

        console.error(
            "Automatic document generation failed:",
            documentError.message
        );

        throw documentError;
    }


    // -----------------------------------------
    // AUDIT
    // -----------------------------------------

    try {

        const auditService =
            require("./audit.service");

        auditService.createAuditEvent({

            entityType:
                "TRANSFER",

            entityId:
                transferId,

            action:
                "TRANSFER_APPROVED",

            performedBy:
                officerId,

            details: {

                landId:
                    transfer.landId,

                previousOwner:
                    transfer.sellerId,

                newOwner:
                    transfer.buyerId,

                blockchainTransaction:
                    blockchainResult.transactionHash

            }

        });

    } catch (error) {

        console.warn(
            "Audit event could not be created:",
            error.message
        );

    }


    // -----------------------------------------
    // RETURN
    // -----------------------------------------

        return {

        transferId,

        landId:
            transfer.landId,

        previousOwner:
            transfer.sellerId,

        newOwner:
            transfer.buyerId,

        status:
            "COMPLETED",

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash

        },

        document:
            generatedDocument

    };
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    proposeTransfer,

    acceptTransfer,

    approveTransfer,

    getTransferById,

    getTransfers

};