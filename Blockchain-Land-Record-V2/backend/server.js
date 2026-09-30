require("dotenv").config();
const fs = require("fs");
const path = require("path");

const {
    getLandHistory
} = require("./services/landTransaction.service");

const {
    getDocumentById
} = require("./services/document.service");
const landRoutes = require("./routes/land.routes");
const express = require("express");
const cors = require("cors");
const allocationRoutes =
    require("./routes/allocation.routes");
const {
    getBlockchainStatus
} = require("./services/blockchain.service");
const {
    getIdentityByWallet
} = require("./services/identity.service");
const app = express();
const orderRoutes =
    require("./routes/order.routes");
const transferRoutes = require("./routes/transfer.routes");
const auditRoutes =
    require("./routes/audit.routes");
const documentRoutes =
    require("./routes/document.routes");    
const ipfsRoutes =
    require("./routes/ipfs.routes");
const identityRoutes =
    require("./routes/identity.routes");

const blockchainRoutes =
    require("./routes/blockchain.routes");
const userRoutes = require("./routes/user.routes");
const requestRoutes =
    require("./routes/request.routes");
// --------------------------------------------------
// Configuration
// --------------------------------------------------

const PORT = process.env.PORT || 3000;

const APP_NAME =
    process.env.APP_NAME || "Blockchain Land Record Management System";

const APP_VERSION =
    process.env.APP_VERSION || "2.0.0";

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors());

app.use(express.json());

app.use("/api/lands", landRoutes);
app.use(
    "/api/allocations",
    allocationRoutes    
);
app.use(
    "/api/orders",
    orderRoutes
);
app.use("/api/transfers", transferRoutes);

app.use(
    "/api/audit",
    auditRoutes
);
app.use(
    "/api/documents",
    documentRoutes
);
app.use(
    "/api/ipfs",
    ipfsRoutes
);
app.use(
    "/api/identity",
    identityRoutes
);

app.use(
    "/api/blockchain",
    blockchainRoutes
);
app.use("/api/users", userRoutes);
app.use(
    "/api/requests",
    requestRoutes
);
// --------------------------------------------------
// Land History
// --------------------------------------------------

app.get(
    "/api/lands/:landId/history",
    (req, res) => {

        try {

            const {
                landId
            } = req.params;

            const history =
                getLandHistory(
                    landId
                );

            res.json({

                status:
                    "success",

                landId,

                count:
                    history.length,

                data:
                    history

            });

        } catch (error) {

            console.error(
                "Land history error:",
                error
            );

            res.status(
                error.statusCode || 500
            ).json({

                status:
                    "error",

                message:
                    error.message ||
                    "Unable to load land history."

            });
        }
    }
);


// --------------------------------------------------
// Document PDF
// --------------------------------------------------

app.get(
    "/api/documents/:documentId/download",
    (req, res) => {

        try {

            const {
                documentId
            } = req.params;

            const document =
                getDocumentById(
                    documentId
                );

            if (!document) {

                return res.status(404).json({

                    status:
                        "error",

                    message:
                        "Document not found."

                });
            }

            const filePath =
                path.resolve(
                    document.filePath
                );

            if (
                !fs.existsSync(
                    filePath
                )
            ) {

                return res.status(404).json({

                    status:
                        "error",

                    message:
                        "PDF file is not available on the server."

                });
            }

            res.sendFile(
                filePath
            );

        } catch (error) {

            console.error(
                "Document download error:",
                error
            );

            res.status(500).json({

                status:
                    "error",

                message:
                    error.message ||
                    "Unable to open document."

            });
        }
    }
);
// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "V2 backend is running",
        application: APP_NAME,
        version: APP_VERSION,
        timestamp: new Date().toISOString()
    });
});

// --------------------------------------------------
// Blockchain Status
// --------------------------------------------------

app.get("/api/blockchain/status", async (req, res) => {
    try {
        const status = await getBlockchainStatus();

        res.json({
            status: "connected",
            blockchain: status
        });

    } catch (error) {
        console.error(
            "Blockchain connection error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Unable to connect to blockchain",
            error: error.message
        });
    }
});

// --------------------------------------------------
// Identity Lookup
// --------------------------------------------------

app.get("/api/identity/:walletAddress", (req, res) => {
    try {
        const { walletAddress } = req.params;

        const identity =
            getIdentityByWallet(walletAddress);

        if (!identity) {
            return res.status(404).json({
                status: "not_found",
                message: "Wallet is not registered"
            });
        }

        res.json({
            status: "found",
            identity
        });

    } catch (error) {
        console.error(
            "Identity lookup error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Identity lookup failed"
        });
    }
});

// --------------------------------------------------
// Server Start
// --------------------------------------------------

app.listen(PORT, () => {
    console.log("==============================================");
    console.log(" Blockchain Land Record Management System");
    console.log(" V2 Backend");
    console.log("==============================================");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Version: ${APP_VERSION}`);
    console.log("==============================================");
});