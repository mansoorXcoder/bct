require("dotenv").config();

const BLOCKCHAIN_RPC_URL =
    process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:7546";

const EXPECTED_NETWORK_ID =
    process.env.NETWORK_ID || "5778";

module.exports = {
    BLOCKCHAIN_RPC_URL,
    EXPECTED_NETWORK_ID
};