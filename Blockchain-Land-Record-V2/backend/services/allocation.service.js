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


    // ethers tuple returned from Solidity:
    //
    // [0] landId
    // [1] surveyNumber
    // [2] parcelArea
    // [3] areaUnit
    // [4] location
    // [5] landUseType
    // [6] zone
    // [7] regionId
    // [8] currentOwner
    // [9] status
    // [10] exists


    const blockchainExists =
        blockchainLand[10];


    if (!blockchainExists) {

        fail(
            "Land exists in database but not on blockchain.",
            409
        );

    }


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


    // Solidity enum:
    //
    // NONE      = 0
    // AVAILABLE = 1
    // ALLOCATED = 2
    // TRANSFER_PENDING = 3
    // UPDATE_PENDING = 4
    // SUSPENDED = 5


    const blockchainStatus =
        Number(
            blockchainLand[9]
        );


    if (
        blockchainStatus !== 1
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


    // =====================================================
    // DATABASE UPDATE
    // =====================================================

    const allocatedAt =
        new Date().toISOString();


    const transaction =
        db.transaction(() => {


            // -------------------------------------------------
            // ALLOCATIONS TABLE
            // -------------------------------------------------

            const allocationId =
                `ALLOC-${Date.now()}`;


            db.prepare(`
                INSERT INTO allocations (

                    allocation_id,

                    land_id,

                    citizen_id,

                    officer_id,

                    reason,

                    blockchain_reference,

                    allocated_at,

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

                reason,

                blockchainResult.transactionHash,

                allocatedAt,

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


            return allocationId;

        });


    // =====================================================
    // AUDIT
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

            citizenId,

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
    // RETURN UPDATED LAND
    // =====================================================

    return {

        allocation: {

            allocationId:
                transaction,

            landId,

            citizenId,

            officerId,

            reason,

            status:
                "ALLOCATED",

            blockchainReference:
                blockchainResult.transactionHash,

            allocatedAt

        },

        land:
            getLandById(
                landId
            )

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

            reason,

            blockchain_reference AS blockchainReference,

            allocated_at AS allocatedAt,

            created_at AS createdAt

        FROM allocations

        ORDER BY allocated_at DESC

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

            reason,

            blockchain_reference AS blockchainReference,

            allocated_at AS allocatedAt,

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