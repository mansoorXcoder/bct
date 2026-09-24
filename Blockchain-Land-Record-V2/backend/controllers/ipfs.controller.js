const {
    getIPFSStatus
} = require("../services/ipfs.service");

async function getStatus(req, res) {

    try {

        const status =
            await getIPFSStatus();

        res.json({
            status: "success",
            ipfs: {
                id: status.ID,
                agentVersion:
                    status.AgentVersion,
                protocolVersion:
                    status.ProtocolVersion
            }
        });

    } catch (error) {

        console.error(
            "IPFS status error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message:
                "IPFS node is not reachable",
            error:
                error.message
        });
    }
}

module.exports = {
    getStatus
};