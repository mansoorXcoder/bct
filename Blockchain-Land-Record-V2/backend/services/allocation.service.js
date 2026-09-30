const db =
    require("../../database/database");

const {
    getIdentityByUserId
} =
    require("./identity.service");

const {
    getLandById
} =
    require("./land.service");

const {
    allocateLand:
        allocateLandOnBlockchain,

    getBlockchainLand
} =
    require("./blockchain.service");

const {
    createDocument
} =
    require("./document.service");


// =========================================================
// ERROR HELPER
// =========================================================

function fail(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    throw error;
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
            "Audit event could not be created:",
            error.message
        );

    }

}


// =========================================================
// ALLOCATE LAND
// =========================================================

async function allocateLand(
    payload
) {

    const {

        landId,

        citizenId,

        officerId,

        reason = ""

    } = payload;


    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!landId) {

        fail(
            "Land ID is required."
        );

    }


    if (!citizenId) {

        fail(
            "Citizen ID is required."
        );

    }


    if (!officerId) {

        fail(
            "Officer ID is required."
        );

    }


    // =====================================================
    // OFFICER
    // =====================================================

    const officer =
        getIdentityByUserId(
            officerId
        );


    if (!officer) {

        fail(
            "Officer account not found.",
            404
        );

    }


    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        fail(
            "Only a Land Administration Officer can allocate land.",
            403
        );

    }


    if (
        officer.status !==
        "ACTIVE"
    ) {

        fail(
            "Officer account is not active.",
            403
        );

    }


    if (!officer.walletAddress) {

        fail(
            "Officer does not have a registered blockchain wallet.",
            409
        );

    }


    // =====================================================
    // CITIZEN
    // =====================================================

    const citizen =
        getIdentityByUserId(
            citizenId
        );


    if (!citizen) {

        fail(
            "Citizen account not found.",
            404
        );

    }


    if (
        citizen.role !==
        "CITIZEN"
    ) {

        fail(
            "Land can only be allocated to a citizen.",
            403
        );

    }


    if (
        citizen.status !==
        "ACTIVE"
    ) {

        fail(
            "Citizen account is not active.",
            403
        );

    }


    if (!citizen.walletAddress) {

        fail(
            "Citizen does not have a registered blockchain wallet.",
            409
        );

    }


    // =====================================================
    // LAND
    // =====================================================

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


    // =====================================================
    // REGION AUTHORIZATION
    // =====================================================

    if (
        officer.regionId !==
        land.regionId
    ) {

        fail(
            "Officer is not authorized for this land region.",
            403
        );

    }


    // =====================================================
    // LAND AVAILABILITY
    // =====================================================

    if (
        land.status !==
        "AVAILABLE"
    ) {

        fail(
            `Land is not available for allocation. Current status: ${land.status}`,
            409
        );

    }


    if (
        land.currentOwnerId
    ) {

        fail(
            "Land already has a current owner.",
            409
        );

    }


    // =====================================================
    // BLOCKCHAIN LAND VERIFICATION
    // =====================================================

    const blockchainLand =
        await getBlockchainLand(
            landId
        );


    if (!blockchainLand) {

        fail(
            "Blockchain land record could not be retrieved.",
            409
        );

    }


    /*
     * Solidity tuple:
     *
     * [0]  landId
     * [1]  surveyNumber
     * [2]  parcelArea
     * [3]  areaUnit
     * [4]  location
     * [5]  landUseType
     * [6]  zone
     * [7]  regionId
     * [8]  currentOwner
     * [9]  status
     * [10] exists
     */


    const blockchainExists =
        blockchainLand[10];


    if (!blockchainExists) {

        fail(
            "Land exists in database but not on blockchain.",
            409
        );

    }


    // =====================================================
    // REGION MATCH
    // =====================================================

    const blockchainRegion =
        blockchainLand[7];


    if (
        blockchainRegion !==
        land.regionId
    ) {

        fail(
            "Database and blockchain region do not match.",
            409
        );

    }


    // =====================================================
    // BLOCKCHAIN STATUS
    // =====================================================

    /*
     * Solidity enum:
     *
     * NONE             = 0
     * AVAILABLE        = 1
     * ALLOCATED        = 2
     * TRANSFER_PENDING = 3
     * UPDATE_PENDING   = 4
     * SUSPENDED        = 5
     */


    const blockchainStatus =
        Number(
            blockchainLand[9]
        );


    if (
        blockchainStatus !==
        1
    ) {

        fail(
            `Blockchain land is not AVAILABLE. Current blockchain status: ${blockchainStatus}`,
            409
        );

    }


    // =====================================================
    // BLOCKCHAIN ALLOCATION
    // =====================================================

    const blockchainResult =
        await allocateLandOnBlockchain(

            officer.walletAddress,

            landId,

            citizen.walletAddress

        );


    if (
        !blockchainResult ||
        !blockchainResult.transactionHash
    ) {

        fail(
            "Blockchain allocation completed without a transaction hash.",
            502
        );

    }


    // =====================================================
    // DATABASE UPDATE
    // =====================================================

    const allocatedAt =
        new Date().toISOString();


    const transactionResult =
        db.transaction(
            () => {

                // -------------------------------------------------
                // ALLOCATION ID
                // -------------------------------------------------

                const allocationId =
                    `ALLOC-${Date.now()}`;


                // -------------------------------------------------
                // ALLOCATIONS TABLE
                // -------------------------------------------------

                db.prepare(`
                    INSERT INTO allocations (

                        allocation_id,

                        land_id,

                        citizen_id,

                        officer_id,

                        region_id,

                        reason,

                        status,

                        created_at

                    )

                    VALUES (

                        ?, ?, ?, ?, ?,
                        ?, ?, ?

                    )
                `)
                .run(

                    allocationId,

                    landId,

                    citizenId,

                    officerId,

                    land.regionId,

                    reason,

                    "COMPLETED",

                    allocatedAt

                );


                // -------------------------------------------------
                // LAND TABLE
                // -------------------------------------------------

                db.prepare(`
                    UPDATE lands

                    SET

                        current_owner_id = ?,

                        owner_type = ?,

                        ownership_status = ?,

                        status = ?,

                        allocated_at = ?,

                        updated_at = ?

                    WHERE land_id = ?
                `)
                .run(

                    citizenId,

                    "CITIZEN",

                    "CITIZEN_OWNED",

                    "ALLOCATED",

                    allocatedAt,

                    allocatedAt,

                    landId

                );


                // -------------------------------------------------
                // LAND HISTORY
                // -------------------------------------------------

                const eventResult =
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

                            document_id,

                            blockchain_reference,

                            description,

                            created_at

                        )

                        VALUES (

                            ?, NULL, ?,

                            ?, ?,

                            ?, ?,

                            ?, ?,

                            ?, ?,

                            ?, ?,

                            NULL,

                            ?,

                            ?,

                            ?

                        )
                    `)
                    .run(

                        landId,

                        "LAND_ALLOCATION",

                        null,

                        citizenId,

                        land.parcelArea,

                        land.parcelArea,

                        land.landUseType,

                        land.landUseType,

                        land.landType,

                        land.landType,

                        reason,

                        officerId,

                        blockchainResult.transactionHash,

                        `Government land ${landId} allocated to citizen ${citizenId}.`,

                        allocatedAt

                    );


                return {

                    allocationId,

                    eventId:
                        eventResult.lastInsertRowid

                };

            }
        )();


    // =====================================================
    // AUDIT — LAND ALLOCATION
    // =====================================================

    createAuditSafely({

        entityType:
            "LAND",

        entityId:
            landId,

        action:
            "LAND_ALLOCATED",

        performedBy:
            officerId,

        details: {

            allocationId:
                transactionResult.allocationId,

            citizenId,

            officerId,

            regionId:
                land.regionId,

            reason,

            previousOwner:
                null,

            newOwner:
                citizenId,

            blockchainTransaction:
                blockchainResult.transactionHash

        }

    });


    // =====================================================
    // FINAL ALLOCATION DOCUMENT
    // =====================================================

    let document = null;


    try {

        document =
            await createDocument({

                documentType:
                    "LAND_ALLOCATION_RECORD",

                landId,

                /*
                 * For allocation, the blockchain
                 * transaction hash is the primary
                 * transaction reference.
                 */

                transactionId:
                    blockchainResult.transactionHash,

                citizenId,

                officerId,

                officerWallet:
                    officer.walletAddress,

                createdBy:
                    officerId,

                allocationId:
                    transactionResult.allocationId,

                allocationReason:
                    reason,

                allocationType:
                    "GOVERNMENT_LAND_ALLOCATION",

                /*
                 * These are intentionally left
                 * unspecified because our current
                 * allocations table does not contain
                 * legal tenure or consideration fields.
                 */

                allocationTenure:
                    null,

                considerationAmount:
                    null,

                effectiveDate:
                    allocatedAt

            });


    } catch (documentError) {

        /*
         * IMPORTANT:
         *
         * The blockchain allocation and database
         * update have already completed.
         *
         * We must NOT pretend the land allocation
         * failed just because document generation
         * failed afterward.
         */

        console.error(
            "Allocation document generation failed:",
            documentError.message
        );

        return {

            allocation: {

                allocationId:
                    transactionResult.allocationId,

                landId,

                citizenId,

                officerId,

                regionId:
                    land.regionId,

                reason,

                status:
                    "COMPLETED",

                blockchainReference:
                    blockchainResult.transactionHash,

                allocatedAt

            },

            land:
                getLandById(
                    landId
                ),

            document:
                null,

            documentError:
                documentError.message

        };

    }


    // =====================================================
    // LINK DOCUMENT TO ALLOCATION HISTORY
    // =====================================================

    if (document) {

        db.prepare(`
            UPDATE land_events

            SET document_id = ?

            WHERE event_id = ?
        `).run(

            document.documentId,

            transactionResult.eventId

        );

    }


    // =====================================================
    // FINAL AUDIT — DOCUMENT
    // =====================================================

    if (document) {

        createAuditSafely({

            entityType:
                "LAND",

            entityId:
                landId,

            action:
                "LAND_ALLOCATION_DOCUMENT_CREATED",

            performedBy:
                officerId,

            details: {

                allocationId:
                    transactionResult.allocationId,

                documentId:
                    document.documentId,

                sha256Hash:
                    document.sha256Hash,

                ipfsCid:
                    document.ipfsCid,

                blockchainReference:
                    document.blockchainReference

            }

        });

    }


    // =====================================================
    // RETURN
    // =====================================================

    return {

        allocation: {

            allocationId:
                transactionResult.allocationId,

            landId,

            citizenId,

            officerId,

            regionId:
                land.regionId,

            reason,

            status:
                "COMPLETED",

            blockchainReference:
                blockchainResult.transactionHash,

            allocatedAt

        },

        land:
            getLandById(
                landId
            ),

        document

    };

}


// =========================================================
// GET ALLOCATIONS
// =========================================================

function getAllocations() {

    return db.prepare(`
        SELECT

            allocation_id AS allocationId,

            land_id AS landId,

            citizen_id AS citizenId,

            officer_id AS officerId,

            region_id AS regionId,

            reason,

            status,

            created_at AS createdAt

        FROM allocations

        ORDER BY created_at DESC

    `).all();

}


// =========================================================
// GET ALLOCATION BY ID
// =========================================================

function getAllocationById(
    allocationId
) {

    if (!allocationId) {

        fail(
            "Allocation ID is required."
        );

    }


    return db.prepare(`
        SELECT

            allocation_id AS allocationId,

            land_id AS landId,

            citizen_id AS citizenId,

            officer_id AS officerId,

            region_id AS regionId,

            reason,

            status,

            created_at AS createdAt

        FROM allocations

        WHERE allocation_id = ?

    `).get(
        allocationId
    );

}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    allocateLand,

    getAllocations,

    getAllocationById

};