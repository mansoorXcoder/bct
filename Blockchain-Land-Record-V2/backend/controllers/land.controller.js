const landService =
    require("../services/land.service");


// =========================================================
// CREATE LAND
// =========================================================

async function createLand(req, res) {

    try {

        const result =
            await landService.createLand(
                req.body
            );

        res.status(201).json({

            status: "success",

            message:
                "Land registered successfully on blockchain and SQLite.",

            data: result

        });

    } catch (error) {

        console.error(
            "Create land error:",
            error.message
        );

        res.status(
            error.statusCode || 500
        ).json({

            status: "error",

            message:
                error.message

        });

    }
}


// =========================================================
// GET LAND
// =========================================================

function getLandById(req, res) {

    try {

        const land =
            landService.getLandById(
                req.params.landId
            );


        if (!land) {

            return res.status(404).json({

                status: "error",

                message:
                    "Land record not found."

            });

        }


        res.json({

            status: "success",

            data: land

        });

    } catch (error) {

        console.error(
            "Get land error:",
            error.message
        );

        res.status(500).json({

            status: "error",

            message:
                error.message

        });

    }
}


// =========================================================
// GET ALL LANDS
// =========================================================

function getAllLands(req, res) {

    try {

        const lands =
            landService.getAllLands();


        res.json({

            status: "success",

            count:
                lands.length,

            data:
                lands

        });

    } catch (error) {

        console.error(
            "Get all lands error:",
            error.message
        );

        res.status(500).json({

            status: "error",

            message:
                error.message

        });

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