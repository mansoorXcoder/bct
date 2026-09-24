const transferService =
    require("../services/transfer.service");


function createTransferProposal(req, res) {

    try {

        const transfer =
            transferService.createTransferProposal(
                req.body
            );

        res.status(201).json({
            status: "success",
            message:
                "Transfer proposal created successfully",
            transfer
        });

    } catch (error) {

        console.error(
            "Create transfer error:",
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


function getTransferById(req, res) {

    try {

        const {
            transferId
        } = req.params;

        const transfer =
            transferService.getTransferById(
                transferId
            );


        if (!transfer) {

            return res.status(404).json({
                status: "not_found",
                message:
                    "Transfer proposal not found"
            });
        }


        res.json({
            status: "success",
            transfer
        });

    } catch (error) {

        console.error(
            "Get transfer error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message:
                "Failed to retrieve transfer proposal"
        });
    }
}


function getAllTransfers(req, res) {

    try {

        const transfers =
            transferService.getAllTransfers();


        res.json({
            status: "success",
            count:
                transfers.length,
            transfers
        });

    } catch (error) {

        console.error(
            "Get transfers error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message:
                "Failed to retrieve transfers"
        });
    }
}


function acceptTransfer(req, res) {

    try {

        const transfer =
            transferService.acceptTransfer(
                req.body
            );


        res.json({
            status: "success",
            message:
                "Transfer accepted by buyer",
            transfer
        });

    } catch (error) {

        console.error(
            "Accept transfer error:",
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


function approveTransfer(req, res) {

    try {

        const transfer =
            transferService.approveTransfer(
                req.body
            );


        res.json({
            status: "success",
            message:
                "Transfer approved and ownership updated",
            transfer
        });

    } catch (error) {

        console.error(
            "Approve transfer error:",
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


module.exports = {

    createTransferProposal,

    getTransferById,

    getAllTransfers,

    acceptTransfer,

    approveTransfer
};