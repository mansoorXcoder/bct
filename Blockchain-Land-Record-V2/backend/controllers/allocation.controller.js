const allocationService =
    require("../services/allocation.service");


// =========================================================
// ALLOCATE LAND
// =========================================================

async function allocateLand(
    req,
    res
) {

    try {

        const result =
            await allocationService.allocateLand(
                req.body
            );


        res.status(201).json({

            status:
                "success",

            message:
                "Land allocated successfully",

            allocation:
                result.allocation,

            land:
                result.land,

            document:
                result.document || null

        });

    } catch (error) {

        console.error(
            "Land allocation error:",
            error.message
        );


        res.status(
            error.statusCode || 500
        ).json({

            status:
                "error",

            message:
                error.message

        });

    }

}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    allocateLand

};