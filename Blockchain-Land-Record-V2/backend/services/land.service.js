const db =
    require("../../database/database");

const {
    registerLand:
        registerLandOnBlockchain,

    getBlockchainLand
} =
    require("./blockchain.service");

const {
    getIdentityByUserId
} =
    require("./identity.service");


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
// GENERATE LAND ID
// =========================================================

function generateLandId() {

    const year =
        new Date().getFullYear();

    const result =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM lands
        `).get();

    const number =
        String(result.count + 1)
            .padStart(4, "0");

    return `LR-${year}-${number}`;

}


// =========================================================
// GET LAND BY ID
// =========================================================

function getLandById(
    landId
) {

    if (!landId) {

        fail(
            "Land ID is required."
        );

    }


    return db.prepare(`
        SELECT

            land_id AS landId,

            survey_number AS surveyNumber,

            parcel_identifier AS parcelIdentifier,

            parcel_area AS parcelArea,

            area_unit AS areaUnit,

            location,

            latitude,

            longitude,

            geometry_reference AS geometryReference,

            land_type AS landType,

            land_use_type AS landUseType,

            zone,

            region_id AS regionId,

            origin,

            status,

            current_owner_id AS currentOwnerId,

            owner_type AS ownerType,

            ownership_status AS ownershipStatus,

            created_by AS createdBy,

            administrative_order_id AS administrativeOrderId,

            allocated_at AS allocatedAt,

            created_at AS createdAt,

            updated_at AS updatedAt

        FROM lands

        WHERE land_id = ?

    `).get(
        landId
    );

}


// =========================================================
// GET ALL LANDS
// =========================================================

function getAllLands() {

    return db.prepare(`
        SELECT

            land_id AS landId,

            survey_number AS surveyNumber,

            parcel_identifier AS parcelIdentifier,

            parcel_area AS parcelArea,

            area_unit AS areaUnit,

            location,

            latitude,

            longitude,

            geometry_reference AS geometryReference,

            land_type AS landType,

            land_use_type AS landUseType,

            zone,

            region_id AS regionId,

            origin,

            status,

            current_owner_id AS currentOwnerId,

            owner_type AS ownerType,

            ownership_status AS ownershipStatus,

            created_by AS createdBy,

            administrative_order_id AS administrativeOrderId,

            allocated_at AS allocatedAt,

            created_at AS createdAt,

            updated_at AS updatedAt

        FROM lands

        ORDER BY created_at DESC

    `).all();

}


// =========================================================
// CREATE LAND
// =========================================================

async function createLand(
    payload
) {

    const {

        surveyNumber,

        parcelIdentifier = null,

        parcelArea,

        areaUnit,

        location,

        latitude = null,

        longitude = null,

        geometryReference = null,

        landType = null,

        landUseType,

        zone = null,

        regionId,

        origin = "REGISTRY",

        createdBy,

        administrativeOrderId = null

    } = payload;


    // -----------------------------------------------------
    // REQUIRED FIELDS
    // -----------------------------------------------------

    if (!surveyNumber) {

        fail(
            "Survey number is required."
        );

    }


    if (
        parcelArea === undefined ||
        parcelArea === null ||
        Number(parcelArea) <= 0
    ) {

        fail(
            "Parcel area must be greater than zero."
        );

    }


    if (!areaUnit) {

        fail(
            "Area unit is required."
        );

    }


    if (!location) {

        fail(
            "Location is required."
        );

    }


    if (!regionId) {

        fail(
            "Region ID is required."
        );

    }


    if (!createdBy) {

        fail(
            "Created-by user ID is required."
        );

    }


    // -----------------------------------------------------
    // OFFICER
    // -----------------------------------------------------

    const officer =
        getIdentityByUserId(
            createdBy
        );

    if (!officer) {

        fail(
            "Creating officer not found.",
            404
        );

    }


    if (
        officer.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        fail(
            "Only a Land Administration Officer can register land.",
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


    if (
        officer.regionId !==
        regionId
    ) {

        fail(
            "Officer is not authorized for this region.",
            403
        );

    }


    // -----------------------------------------------------
    // DUPLICATES
    // -----------------------------------------------------

    const duplicateSurvey =
        db.prepare(`
            SELECT land_id
            FROM lands
            WHERE survey_number = ?
            LIMIT 1
        `)
        .get(
            surveyNumber
        );

    if (duplicateSurvey) {

        fail(
            "Survey number already exists.",
            409
        );

    }


    if (parcelIdentifier) {

        const duplicateParcel =
            db.prepare(`
                SELECT land_id
                FROM lands
                WHERE parcel_identifier = ?
                LIMIT 1
            `)
            .get(
                parcelIdentifier
            );

        if (duplicateParcel) {

            fail(
                "Parcel identifier already exists.",
                409
            );

        }

    }


    // -----------------------------------------------------
    // LAND ID
    // -----------------------------------------------------

    const landId =
        generateLandId();


    const createdAt =
        new Date().toISOString();


    // -----------------------------------------------------
    // BLOCKCHAIN REGISTRATION
    // -----------------------------------------------------

    const blockchainResult =
        await registerLandOnBlockchain(

            officer.walletAddress,

            landId,

            surveyNumber,

            String(parcelArea),

            areaUnit,

            location,

            landUseType || "",

            zone || "",

            regionId

        );


    // -----------------------------------------------------
    // SQLITE
    // -----------------------------------------------------

    const transaction =
        db.transaction(() => {

            db.prepare(`
                INSERT INTO lands (

                    land_id,

                    survey_number,

                    parcel_identifier,

                    parcel_area,

                    area_unit,

                    location,

                    latitude,

                    longitude,

                    geometry_reference,

                    land_type,

                    land_use_type,

                    zone,

                    region_id,

                    origin,

                    status,

                    current_owner_id,

                    owner_type,

                    ownership_status,

                    created_by,

                    administrative_order_id,

                    allocated_at,

                    created_at,

                    updated_at

                )

                VALUES (

                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?

                )
            `)
            .run(

                landId,

                surveyNumber,

                parcelIdentifier,

                parcelArea,

                areaUnit,

                location,

                latitude,

                longitude,

                geometryReference,

                landType,

                landUseType,

                zone,

                regionId,

                origin,

                "AVAILABLE",

                null,

                "GOVERNMENT",

                "GOVERNMENT_OWNED",

                createdBy,

                administrativeOrderId,

                null,

                createdAt,

                createdAt

            );


            // -------------------------------------------------
            // LAND EVENT
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
                    NULL, NULL,
                    NULL, ?,
                    NULL, ?,
                    NULL, ?,
                    ?,
                    ?,
                    NULL,
                    ?,
                    ?,
                    ?

                )
            `)
            .run(

                landId,

                "LAND_REGISTERED",

                parcelArea,

                landUseType || null,

                landType || null,

                "Land registered in the land registry.",

                createdBy,

                blockchainResult.transactionHash,

                `Land ${landId} registered by authorized officer.`,

                createdAt

            );


        });


    transaction();


    // -----------------------------------------------------
    // AUDIT
    // -----------------------------------------------------

    createAuditSafely({

        entityType:
            "LAND",

        entityId:
            landId,

        action:
            "LAND_REGISTERED",

        performedBy:
            createdBy,

        details: {

            surveyNumber,

            regionId,

            blockchainTransaction:
                blockchainResult.transactionHash

        }

    });


    return {

        land:
            getLandById(
                landId
            ),

        blockchain: {

            transactionHash:
                blockchainResult.transactionHash

        }

    };

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
// EXPORTS
// =========================================================

module.exports = {

    createLand,

    getLandById,

    getAllLands

};