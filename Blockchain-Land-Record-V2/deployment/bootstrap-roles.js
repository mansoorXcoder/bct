require("dotenv").config();

const db = require("../database/database");

const {
    provider,
    assignSupervisor,
    assignOfficer,
    assignCitizen
} = require("../backend/services/blockchain.service");


async function bootstrapRoles() {

    console.log("\n====================================");
    console.log("V2 BLOCKCHAIN ROLE BOOTSTRAP");
    console.log("====================================\n");


    // =========================================================
    // GET GANACHE ACCOUNTS
    // =========================================================

    const accounts =
        await provider.send(
            "eth_accounts",
            []
        );


    if (accounts.length < 6) {

        throw new Error(
            "Ganache must have at least 6 accounts."
        );
    }


    console.log(
        `Found ${accounts.length} Ganache accounts.\n`
    );


    // =========================================================
    // ACCOUNT MAPPING
    // =========================================================

    const supervisorAddress =
        accounts[0];

    const officerAAddress =
        accounts[1];

    const officerBAddress =
        accounts[2];

    const citizenAAddress =
        accounts[3];

    const citizenBAddress =
        accounts[4];

    const citizenCAddress =
        accounts[5];


    // =========================================================
    // UPDATE SQLITE WALLET ADDRESSES
    // =========================================================

    const updateUser =
        db.prepare(`
            UPDATE users
            SET wallet_address = ?
            WHERE user_id = ?
        `);


    updateUser.run(
        supervisorAddress,
        "SUP-001"
    );

    updateUser.run(
        officerAAddress,
        "OFF-001"
    );

    updateUser.run(
        officerBAddress,
        "OFF-002"
    );

    updateUser.run(
        citizenAAddress,
        "CIT-001"
    );

    updateUser.run(
        citizenBAddress,
        "CIT-002"
    );

    updateUser.run(
        citizenCAddress,
        "CIT-003"
    );


    console.log(
        "SQLite wallet mapping updated.\n"
    );


    // =========================================================
    // ASSIGN SUPERVISOR
    // =========================================================

    console.log(
        "Assigning SUPERVISOR role..."
    );

    try {

        const result =
            await assignSupervisor(
                supervisorAddress
            );

        console.log(
            `Supervisor: ${supervisorAddress}`
        );

        console.log(
            `Transaction: ${result.transactionHash}`
        );

    } catch (error) {

        // If supervisor is already assigned,
        // continue with the remaining roles.

        console.log(
            "Supervisor assignment returned an error:"
        );

        console.log(
            error.message
        );

        console.log(
            "Continuing with officer assignments..."
        );
    }


    // =========================================================
    // ASSIGN OFFICER A
    // =========================================================

    console.log(
        "\nAssigning OFFICER A..."
    );

    const officerAResult =
        await assignOfficer(
            supervisorAddress,
            officerAAddress,
            "REGION-01"
        );

    console.log(
        `Officer A: ${officerAAddress}`
    );

    console.log(
        "Region: REGION-01"
    );

    console.log(
        `Transaction: ${officerAResult.transactionHash}`
    );


    // =========================================================
    // ASSIGN OFFICER B
    // =========================================================

    console.log(
        "\nAssigning OFFICER B..."
    );

    const officerBResult =
        await assignOfficer(
            supervisorAddress,
            officerBAddress,
            "REGION-02"
        );

    console.log(
        `Officer B: ${officerBAddress}`
    );

    console.log(
        "Region: REGION-02"
    );

    console.log(
        `Transaction: ${officerBResult.transactionHash}`
    );


    // =========================================================
    // ASSIGN CITIZEN A
    // =========================================================

    console.log(
        "\nAssigning CITIZEN A..."
    );

    const citizenAResult =
        await assignCitizen(
            supervisorAddress,
            citizenAAddress
        );

    console.log(
        `Citizen A: ${citizenAAddress}`
    );

    console.log(
        `Transaction: ${citizenAResult.transactionHash}`
    );


    // =========================================================
    // ASSIGN CITIZEN B
    // =========================================================

    console.log(
        "\nAssigning CITIZEN B..."
    );

    const citizenBResult =
        await assignCitizen(
            supervisorAddress,
            citizenBAddress
        );

    console.log(
        `Citizen B: ${citizenBAddress}`
    );

    console.log(
        `Transaction: ${citizenBResult.transactionHash}`
    );


    // =========================================================
    // ASSIGN CITIZEN C
    // =========================================================

    console.log(
        "\nAssigning CITIZEN C..."
    );

    const citizenCResult =
        await assignCitizen(
            supervisorAddress,
            citizenCAddress
        );

    console.log(
        `Citizen C: ${citizenCAddress}`
    );

    console.log(
        `Transaction: ${citizenCResult.transactionHash}`
    );


    // =========================================================
    // COMPLETE
    // =========================================================

    console.log(
        "\n===================================="
    );

    console.log(
        "ROLE BOOTSTRAP COMPLETE"
    );

    console.log(
        "====================================\n"
    );


    // =========================================================
    // DISPLAY FINAL SQLITE MAPPING
    // =========================================================

    const users =
        db.prepare(`
            SELECT
                user_id,
                name,
                wallet_address,
                role,
                region_id
            FROM users
            ORDER BY user_id
        `).all();


    console.table(users);
}


// =============================================================
// RUN
// =============================================================

bootstrapRoles()
    .catch(error => {

        console.error(
            "\nROLE BOOTSTRAP FAILED:"
        );

        console.error(
            error.message
        );

        process.exit(1);
    });