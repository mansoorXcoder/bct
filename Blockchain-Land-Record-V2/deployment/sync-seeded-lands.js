require("dotenv").config();

const db = require("../database/database");

const {
    getBlockchainLand,
    registerLand,
    allocateLand
} = require("../backend/services/blockchain.service");


// =========================================================
// CONFIGURATION
// =========================================================

const OFFICER_BY_REGION = {
    "REGION-01": "OFF-001",
    "REGION-02": "OFF-002"
};


// =========================================================
// GET USER
// =========================================================

function getUser(userId) {

    return db.prepare(`
        SELECT
            user_id,
            name,
            role,
            region_id,
            wallet_address,
            status
        FROM users
        WHERE user_id = ?
    `).get(userId);

}


// =========================================================
// GET ALL SEEDED LANDS
// =========================================================

function getSeededLands() {

    return db.prepare(`
        SELECT
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
            ownership_status
        FROM lands
        ORDER BY land_id
    `).all();

}


// =========================================================
// CHECK BLOCKCHAIN LAND
// =========================================================

async function blockchainLandExists(landId) {

    try {

        await getBlockchainLand(
            landId
        );

        return true;

    } catch (error) {

        if (
            error.reason === "Land does not exist" ||
            error.shortMessage ===
                'execution reverted: "Land does not exist"'
        ) {

            return false;

        }

        throw error;
    }

}


// =========================================================
// REGISTER LAND
// =========================================================

async function registerSeededLand(
    land,
    officer
) {

    console.log(
        `\nRegistering ${land.land_id}...`
    );

    console.log(
        `  Survey : ${land.survey_number}`
    );

    console.log(
        `  Region : ${land.region_id}`
    );

    console.log(
        `  Officer: ${officer.user_id}`
    );


    const result =
        await registerLand(

            officer.wallet_address,

            land.land_id,

            land.survey_number,

            land.parcel_area,

            land.area_unit,

            land.location,

            land.land_use_type,

            land.zone,

            land.region_id

        );


    console.log(
        "  Blockchain registration successful."
    );

    console.log(
        `  TX: ${result.transactionHash}`
    );


    return result;

}


// =========================================================
// ALLOCATE LAND
// =========================================================

async function allocateSeededLand(
    land,
    officer,
    citizen
) {

    console.log(
        `\nAllocating ${land.land_id}...`
    );

    console.log(
        `  Citizen: ${citizen.user_id}`
    );

    console.log(
        `  Wallet  : ${citizen.wallet_address}`
    );

    console.log(
        `  Officer : ${officer.user_id}`
    );


    const result =
        await allocateLand(

            officer.wallet_address,

            land.land_id,

            citizen.wallet_address

        );


    console.log(
        "  Blockchain allocation successful."
    );

    console.log(
        `  TX: ${result.transactionHash}`
    );


    return result;

}


// =========================================================
// MAIN
// =========================================================

async function main() {

    console.log("");
    console.log(
        "=================================================="
    );
    console.log(
        " V2 SEEDED LAND → BLOCKCHAIN SYNCHRONIZATION"
    );
    console.log(
        "=================================================="
    );


    console.log(
        `RPC: ${
            process.env.BLOCKCHAIN_RPC_URL
        }`
    );


    // ---------------------------------------------
    // LOAD LANDS
    // ---------------------------------------------

    const lands =
        getSeededLands();


    console.log(
        `\nSQLite lands found: ${lands.length}`
    );


    if (lands.length === 0) {

        throw new Error(
            "No lands found in SQLite."
        );

    }


    // ---------------------------------------------
    // PROCESS EACH LAND
    // ---------------------------------------------

    for (
        const land of lands
    ) {

        console.log(
            "\n----------------------------------------------"
        );

        console.log(
            `LAND: ${land.land_id}`
        );


        // -----------------------------------------
        // FIND OFFICER
        // -----------------------------------------

        const officerId =
            OFFICER_BY_REGION[
                land.region_id
            ];


        if (!officerId) {

            throw new Error(
                `No officer configured for region ${land.region_id}`
            );

        }


        const officer =
            getUser(
                officerId
            );


        if (!officer) {

            throw new Error(
                `Officer ${officerId} not found.`
            );

        }


        if (
            officer.role !==
            "LAND_ADMIN_OFFICER"
        ) {

            throw new Error(
                `${officerId} is not a LAND_ADMIN_OFFICER.`
            );

        }


        if (
            officer.status !==
            "ACTIVE"
        ) {

            throw new Error(
                `${officerId} is not ACTIVE.`
            );

        }


        if (
            !officer.wallet_address
        ) {

            throw new Error(
                `${officerId} has no wallet address.`
            );

        }


        // -----------------------------------------
        // CHECK BLOCKCHAIN
        // -----------------------------------------

        const existsOnBlockchain =
            await blockchainLandExists(
                land.land_id
            );


        if (
            existsOnBlockchain
        ) {

            console.log(
                "Already exists on blockchain."
            );

        } else {

            // -------------------------------------
            // REGISTER
            // -------------------------------------

            await registerSeededLand(
                land,
                officer
            );

        }


        // -----------------------------------------
        // HANDLE ALLOCATION
        // -----------------------------------------

        if (
            land.owner_type ===
            "CITIZEN" &&
            land.current_owner_id
        ) {

            const citizen =
                getUser(
                    land.current_owner_id
                );


            if (!citizen) {

                throw new Error(
                    `Citizen ${land.current_owner_id} not found.`
                );

            }


            if (
                citizen.role !==
                "CITIZEN"
            ) {

                throw new Error(
                    `${citizen.user_id} is not a CITIZEN.`
                );

            }


            if (
                citizen.status !==
                "ACTIVE"
            ) {

                throw new Error(
                    `${citizen.user_id} is not ACTIVE.`
                );

            }


            if (
                !citizen.wallet_address
            ) {

                throw new Error(
                    `${citizen.user_id} has no wallet address.`
                );

            }


            // -------------------------------------
            // READ CURRENT BLOCKCHAIN LAND
            // -------------------------------------

            const blockchainLand =
                await getBlockchainLand(
                    land.land_id
                );


            const blockchainOwner =
                String(
                    blockchainLand.currentOwner
                ).toLowerCase();


            const expectedOwner =
                citizen.wallet_address
                    .toLowerCase();


            // -------------------------------------
            // ALREADY ALLOCATED
            // -------------------------------------

            if (
                blockchainOwner ===
                expectedOwner
            ) {

                console.log(
                    "Blockchain ownership already matches SQLite."
                );

            } else {

                // ---------------------------------
                // MUST BE AVAILABLE
                // ---------------------------------

                const blockchainStatus =
                    Number(
                        blockchainLand.status
                    );


                if (
                    blockchainStatus !==
                    1
                ) {

                    throw new Error(
                        `Land ${land.land_id} is on blockchain but is not AVAILABLE for initial allocation. Blockchain status=${blockchainStatus}`
                    );

                }


                await allocateSeededLand(

                    land,

                    officer,

                    citizen

                );

            }

        }

    }


    // =================================================
    // FINAL VERIFICATION
    // =================================================

    console.log("");
    console.log(
        "=================================================="
    );
    console.log(
        " FINAL BLOCKCHAIN VERIFICATION"
    );
    console.log(
        "=================================================="
    );


    for (
        const land of lands
    ) {

        const blockchainLand =
            await getBlockchainLand(
                land.land_id
            );


        console.log("");

        console.log(
            `${land.land_id}`
        );

        console.log(
            `  exists      : ${blockchainLand.exists}`
        );

        console.log(
            `  survey      : ${blockchainLand.surveyNumber}`
        );

        console.log(
            `  area        : ${blockchainLand.parcelArea} ${blockchainLand.areaUnit}`
        );

        console.log(
            `  land use    : ${blockchainLand.landUseType}`
        );

        console.log(
            `  zone        : ${blockchainLand.zone}`
        );

        console.log(
            `  region      : ${blockchainLand.regionId}`
        );

        console.log(
            `  owner       : ${blockchainLand.currentOwner}`
        );

        console.log(
            `  status      : ${blockchainLand.status}`
        );

    }


    console.log("");
    console.log(
        "=================================================="
    );
    console.log(
        " SYNCHRONIZATION COMPLETE"
    );
    console.log(
        "=================================================="
    );

}


// =========================================================
// RUN
// =========================================================

main()
    .catch(
        error => {

            console.error("");
            console.error(
                "=================================================="
            );

            console.error(
                " SYNCHRONIZATION FAILED"
            );

            console.error(
                "=================================================="
            );

            console.error(
                error
            );

            process.exit(1);

        }
    );