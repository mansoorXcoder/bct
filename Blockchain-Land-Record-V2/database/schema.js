const db = require("./database");

// ============================================================
// REGIONS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
        region_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
`);
// ============================================================
// USERS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        wallet_address TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        region_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',

        FOREIGN KEY (region_id)
            REFERENCES regions(region_id)
    );
`);



// ============================================================
// LANDS / LAND REGISTRY
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS lands (
        land_id TEXT PRIMARY KEY,

        survey_number TEXT NOT NULL UNIQUE,
        parcel_identifier TEXT UNIQUE,

        parcel_area REAL NOT NULL,
        area_unit TEXT NOT NULL,

        location TEXT NOT NULL,

        latitude REAL,
        longitude REAL,
        geometry_reference TEXT,

        land_type TEXT NOT NULL,
        land_use_type TEXT NOT NULL,
        zone TEXT,

        region_id TEXT NOT NULL,

        origin TEXT NOT NULL DEFAULT 'REGISTRY',

        status TEXT NOT NULL DEFAULT 'AVAILABLE',

        current_owner_id TEXT,
        owner_type TEXT NOT NULL DEFAULT 'GOVERNMENT',
        ownership_status TEXT NOT NULL DEFAULT 'GOVERNMENT_OWNED',

        created_by TEXT,
        administrative_order_id TEXT,

        allocated_at TEXT,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY (region_id)
            REFERENCES regions(region_id),

        FOREIGN KEY (current_owner_id)
            REFERENCES users(user_id),

        FOREIGN KEY (created_by)
            REFERENCES users(user_id)
    );
`);

// ============================================================
// ADMINISTRATIVE ORDERS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS administrative_orders (
        order_id TEXT PRIMARY KEY,

        issued_by TEXT NOT NULL,
        assigned_officer TEXT,

        action_type TEXT NOT NULL,

        region_id TEXT NOT NULL,
        land_id TEXT,

        reason TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'ISSUED',

        issued_at TEXT NOT NULL,
        executed_at TEXT,

        FOREIGN KEY (issued_by)
            REFERENCES users(user_id),

        FOREIGN KEY (assigned_officer)
            REFERENCES users(user_id),

        FOREIGN KEY (region_id)
            REFERENCES regions(region_id),

        FOREIGN KEY (land_id)
            REFERENCES lands(land_id)
    );
`);

// ============================================================
// LAND ALLOCATIONS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS allocations (
        allocation_id TEXT PRIMARY KEY,

        land_id TEXT NOT NULL,
        citizen_id TEXT NOT NULL,
        officer_id TEXT NOT NULL,

        region_id TEXT NOT NULL,

        reason TEXT NOT NULL,

        status TEXT NOT NULL DEFAULT 'COMPLETED',

        created_at TEXT NOT NULL,

        FOREIGN KEY (land_id)
            REFERENCES lands(land_id),

        FOREIGN KEY (citizen_id)
            REFERENCES users(user_id),

        FOREIGN KEY (officer_id)
            REFERENCES users(user_id),

        FOREIGN KEY (region_id)
            REFERENCES regions(region_id)
    );
`);

// ============================================================
// LAND TRANSACTION / MODIFICATION REQUESTS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS land_requests (
        request_id TEXT PRIMARY KEY,

        land_id TEXT NOT NULL,

        request_type TEXT NOT NULL,

        requester_id TEXT NOT NULL,

        seller_id TEXT,
        buyer_id TEXT,

        reason TEXT,

        agreed_amount REAL,

        current_area REAL,
        requested_area REAL,

        current_area_unit TEXT,
        requested_area_unit TEXT,

        current_land_use TEXT,
        requested_land_use TEXT,

        current_land_type TEXT,
        requested_land_type TEXT,

        requested_details TEXT,

        preliminary_document_id TEXT,

        status TEXT NOT NULL DEFAULT 'DRAFT',

        validation_result TEXT,
        validation_message TEXT,

        reviewed_by TEXT,
        review_notes TEXT,

        proposed_at TEXT NOT NULL,
        validated_at TEXT,
        reviewed_at TEXT,
        approved_at TEXT,
        completed_at TEXT,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY (land_id)
            REFERENCES lands(land_id),

        FOREIGN KEY (requester_id)
            REFERENCES users(user_id),

        FOREIGN KEY (seller_id)
            REFERENCES users(user_id),

        FOREIGN KEY (buyer_id)
            REFERENCES users(user_id),

        FOREIGN KEY (reviewed_by)
            REFERENCES users(user_id)
    );
`);

// ============================================================
// DOCUMENTS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,

        land_id TEXT NOT NULL,

        request_id TEXT,

        transaction_id TEXT,

        document_type TEXT NOT NULL,

        file_path TEXT,

        sha256_hash TEXT,

        ipfs_cid TEXT,

        blockchain_reference TEXT,

        created_by TEXT,

        created_at TEXT NOT NULL,

        FOREIGN KEY (land_id)
            REFERENCES lands(land_id),

        FOREIGN KEY (request_id)
            REFERENCES land_requests(request_id),

        FOREIGN KEY (created_by)
            REFERENCES users(user_id)
    );
`);

// ============================================================
// LAND HISTORY / EVENTS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS land_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,

        land_id TEXT NOT NULL,

        request_id TEXT,

        event_type TEXT NOT NULL,

        previous_owner_id TEXT,
        new_owner_id TEXT,

        previous_area REAL,
        new_area REAL,

        previous_land_use TEXT,
        new_land_use TEXT,

        previous_land_type TEXT,
        new_land_type TEXT,

        reason TEXT,

        performed_by TEXT,

        document_id TEXT,

        blockchain_reference TEXT,

        description TEXT,

        created_at TEXT NOT NULL,

        FOREIGN KEY (land_id)
            REFERENCES lands(land_id),

        FOREIGN KEY (request_id)
            REFERENCES land_requests(request_id),

        FOREIGN KEY (previous_owner_id)
            REFERENCES users(user_id),

        FOREIGN KEY (new_owner_id)
            REFERENCES users(user_id),

        FOREIGN KEY (performed_by)
            REFERENCES users(user_id),

        FOREIGN KEY (document_id)
            REFERENCES documents(document_id)
    );
`);

// ============================================================
// AUDIT EVENTS
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,

        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,

        action TEXT NOT NULL,

        performed_by TEXT,

        details TEXT,

        created_at TEXT NOT NULL,

        FOREIGN KEY (performed_by)
            REFERENCES users(user_id)
    );
`);

console.log("SQLite V2 database schema initialized successfully.");