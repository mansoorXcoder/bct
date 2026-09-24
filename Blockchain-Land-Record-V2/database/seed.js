const db = require("./database");

// Initialize the schema first
require("./schema");

const now = new Date().toISOString();

const insertRegion = db.prepare(`
    INSERT OR REPLACE INTO regions
    (
        region_id,
        name,
        status
    )
    VALUES (?, ?, ?)
`);

const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users
    (
        user_id,
        name,
        wallet_address,
        role,
        region_id,
        status
    )
    VALUES (?, ?, ?, ?, ?, ?)
`);

const insertLand = db.prepare(`
    INSERT OR REPLACE INTO lands
    (
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAllocation = db.prepare(`
    INSERT OR REPLACE INTO allocations
    (
        allocation_id,
        land_id,
        citizen_id,
        officer_id,
        region_id,
        reason,
        status,
        created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertLandEvent = db.prepare(`
    INSERT INTO land_events
    (
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAudit = db.prepare(`
    INSERT INTO audit_events
    (
        entity_type,
        entity_id,
        action,
        performed_by,
        details,
        created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
`);

const seed = db.transaction(() => {

    // ========================================================
    // REGIONS
    // ========================================================

    insertRegion.run(
        "REGION-01",
        "Riverland Zone",
        "ACTIVE"
    );

    insertRegion.run(
        "REGION-02",
        "Greenfield Zone",
        "ACTIVE"
    );


    // ========================================================
    // USERS
    // ========================================================

    // Supervisor
    insertUser.run(
        "SUP-001",
        "Supervisory Authority",
        "0xa6dAb71173F12985bd8B039F7E7e18CA736bA672",
        "SUPERVISORY_AUTHORITY",
        null,
        "ACTIVE"
    );

    // Officer A
    insertUser.run(
        "OFF-001",
        "Land Administration Officer A",
        "0x650a81a7da3bf4f207cfdb2297ffb5bfea8926b9",
        "LAND_ADMIN_OFFICER",
        "REGION-01",
        "ACTIVE"
    );

    // Officer B
    insertUser.run(
        "OFF-002",
        "Land Administration Officer B",
        "0xeb03391021f1ac12f98d272fbd6728bec302bffa",
        "LAND_ADMIN_OFFICER",
        "REGION-02",
        "ACTIVE"
    );

    // Citizen A
    insertUser.run(
        "CIT-001",
        "Citizen A",
        "0x0fae7125a0b748f5885a9b27b7f803178a80f381",
        "CITIZEN",
        null,
        "ACTIVE"
    );

    // Citizen B
    insertUser.run(
        "CIT-002",
        "Citizen B",
        "0x7749e7e99cf6098489a33871cb36a7824965944a",
        "CITIZEN",
        null,
        "ACTIVE"
    );

    // Citizen C
    insertUser.run(
        "CIT-003",
        "Citizen C",
        "0x159a2fe4c0fbbc4cac2b7f6be83df529b51106e2",
        "CITIZEN",
        null,
        "ACTIVE"
    );


    // ========================================================
    // LAND REGISTRY
    // ========================================================

    // --------------------------------------------------------
    // REGION 01 - GOVERNMENT LAND
    // --------------------------------------------------------

    insertLand.run(
        "LR-2026-0001",
        "SURV-001",
        "PARCEL-R01-001",
        5000,
        "SQ_FT",
        "Riverland Zone - Government Parcel A",
        16.5219,
        80.6188,
        "GIS-R01-P001",
        "GOVERNMENT",
        "PUBLIC_RESERVE",
        "GOVERNMENT",
        "REGION-01",
        "REGISTRY",
        "AVAILABLE",
        null,
        "GOVERNMENT",
        "GOVERNMENT_OWNED",
        "OFF-001",
        null,
        null,
        now,
        now
    );

    // --------------------------------------------------------

    insertLand.run(
        "LR-2026-0002",
        "SURV-002",
        "PARCEL-R01-002",
        2400,
        "SQ_FT",
        "Riverland Zone - Parcel B",
        16.5231,
        80.6201,
        "GIS-R01-P002",
        "AGRICULTURAL",
        "CULTIVATION",
        "AGRICULTURAL",
        "REGION-01",
        "REGISTRY",
        "AVAILABLE",
        null,
        "GOVERNMENT",
        "GOVERNMENT_OWNED",
        "OFF-001",
        null,
        null,
        now,
        now
    );

    // --------------------------------------------------------
    // REGION 01 - CITIZEN OWNED
    // --------------------------------------------------------

    insertLand.run(
        "LR-2026-0003",
        "SURV-003",
        "PARCEL-R01-003",
        3200,
        "SQ_FT",
        "Riverland Zone - Citizen Parcel C",
        16.5250,
        80.6220,
        "GIS-R01-P003",
        "RESIDENTIAL",
        "RESIDENTIAL_USE",
        "RESIDENTIAL",
        "REGION-01",
        "REGISTRY",
        "ALLOCATED",
        "CIT-001",
        "CITIZEN",
        "CITIZEN_OWNED",
        "OFF-001",
        null,
        now,
        now,
        now
    );

    // --------------------------------------------------------
    // REGION 02 - GOVERNMENT LAND
    // --------------------------------------------------------

    insertLand.run(
        "LR-2026-0004",
        "SURV-004",
        "PARCEL-R02-001",
        7500,
        "SQ_FT",
        "Greenfield Zone - Government Parcel A",
        16.6100,
        80.7000,
        "GIS-R02-P001",
        "GOVERNMENT",
        "PUBLIC_RESERVE",
        "GOVERNMENT",
        "REGION-02",
        "REGISTRY",
        "AVAILABLE",
        null,
        "GOVERNMENT",
        "GOVERNMENT_OWNED",
        "OFF-002",
        null,
        null,
        now,
        now
    );

    // --------------------------------------------------------

    insertLand.run(
        "LR-2026-0005",
        "SURV-005",
        "PARCEL-R02-002",
        4200,
        "SQ_FT",
        "Greenfield Zone - Agricultural Parcel",
        16.6120,
        80.7020,
        "GIS-R02-P002",
        "AGRICULTURAL",
        "CULTIVATION",
        "AGRICULTURAL",
        "REGION-02",
        "REGISTRY",
        "AVAILABLE",
        null,
        "GOVERNMENT",
        "GOVERNMENT_OWNED",
        "OFF-002",
        null,
        null,
        now,
        now
    );

    // --------------------------------------------------------
    // REGION 02 - CITIZEN OWNED
    // --------------------------------------------------------

    insertLand.run(
        "LR-2026-0006",
        "SURV-006",
        "PARCEL-R02-003",
        2800,
        "SQ_FT",
        "Greenfield Zone - Citizen Parcel",
        16.6140,
        80.7040,
        "GIS-R02-P003",
        "RESIDENTIAL",
        "RESIDENTIAL_USE",
        "RESIDENTIAL",
        "REGION-02",
        "REGISTRY",
        "ALLOCATED",
        "CIT-002",
        "CITIZEN",
        "CITIZEN_OWNED",
        "OFF-002",
        null,
        now,
        now,
        now
    );


    // ========================================================
    // INITIAL ALLOCATION RECORDS
    // ========================================================

    insertAllocation.run(
        "ALLOC-2026-0001",
        "LR-2026-0003",
        "CIT-001",
        "OFF-001",
        "REGION-01",
        "Initial registry allocation to Citizen A",
        "COMPLETED",
        now
    );

    insertAllocation.run(
        "ALLOC-2026-0002",
        "LR-2026-0006",
        "CIT-002",
        "OFF-002",
        "REGION-02",
        "Initial registry allocation to Citizen B",
        "COMPLETED",
        now
    );


    // ========================================================
    // INITIAL LAND HISTORY
    // ========================================================

    insertLandEvent.run(
        "LR-2026-0003",
        null,
        "LAND_ALLOCATED",
        null,
        "CIT-001",
        null,
        3200,
        null,
        "RESIDENTIAL_USE",
        null,
        "RESIDENTIAL",
        "Initial registry allocation",
        "OFF-001",
        null,
        null,
        "Government land allocated to Citizen A",
        now
    );

    insertLandEvent.run(
        "LR-2026-0006",
        null,
        "LAND_ALLOCATED",
        null,
        "CIT-002",
        null,
        2800,
        null,
        "RESIDENTIAL_USE",
        null,
        "RESIDENTIAL",
        "Initial registry allocation",
        "OFF-002",
        null,
        null,
        "Government land allocated to Citizen B",
        now
    );


    // ========================================================
    // INITIAL AUDIT EVENTS
    // ========================================================

    insertAudit.run(
        "REGISTRY",
        "LR-2026-0001",
        "LAND_REGISTERED",
        "OFF-001",
        "Government parcel entered into Riverland registry",
        now
    );

    insertAudit.run(
        "REGISTRY",
        "LR-2026-0002",
        "LAND_REGISTERED",
        "OFF-001",
        "Agricultural parcel entered into Riverland registry",
        now
    );

    insertAudit.run(
        "REGISTRY",
        "LR-2026-0003",
        "LAND_REGISTERED",
        "OFF-001",
        "Residential parcel entered into Riverland registry",
        now
    );

    insertAudit.run(
        "REGISTRY",
        "LR-2026-0004",
        "LAND_REGISTERED",
        "OFF-002",
        "Government parcel entered into Greenfield registry",
        now
    );

    insertAudit.run(
        "REGISTRY",
        "LR-2026-0005",
        "LAND_REGISTERED",
        "OFF-002",
        "Agricultural parcel entered into Greenfield registry",
        now
    );

    insertAudit.run(
        "REGISTRY",
        "LR-2026-0006",
        "LAND_REGISTERED",
        "OFF-002",
        "Residential parcel entered into Greenfield registry",
        now
    );

});

seed();

console.log("");
console.log("==============================================");
console.log(" V2 DATABASE SEED COMPLETED");
console.log("==============================================");
console.log("Regions : 2");
console.log("Users   : 6");
console.log("Lands   : 6");
console.log("Allocations : 2");
console.log("History events : 2");
console.log("Audit events : 6");
console.log("==============================================");