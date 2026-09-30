// backend/services/blockchain.service.js

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const {
    BLOCKCHAIN_RPC_URL,
    EXPECTED_NETWORK_ID
} = require("../config/blockchain");


// =========================================================
// CONFIGURATION
// =========================================================

const deploymentPath = path.join(
    __dirname,
    "../../deployment/output/LandRegistryV2.json"
);

if (!fs.existsSync(deploymentPath)) {
    throw new Error(
        "LandRegistryV2 deployment artifact not found. Deploy the V2 contract first."
    );
}

const deployment = JSON.parse(
    fs.readFileSync(
        deploymentPath,
        "utf8"
    )
);

if (
    !deployment.contractAddress ||
    !deployment.abi
) {
    throw new Error(
        "Invalid LandRegistryV2 deployment artifact."
    );
}

const contractAddress =
    deployment.contractAddress;

const contractAbi =
    deployment.abi;


// =========================================================
// PROVIDER
// =========================================================

const provider =
    new ethers.JsonRpcProvider(
        BLOCKCHAIN_RPC_URL
    );


// =========================================================
// READ-ONLY CONTRACT
// =========================================================

const contract =
    new ethers.Contract(
        contractAddress,
        contractAbi,
        provider
    );


// =========================================================
// VALIDATION HELPERS
// =========================================================

function requireWallet(
    walletAddress
) {

    if (!walletAddress) {
        throw new Error(
            "Wallet address is required."
        );
    }

    if (
        !ethers.isAddress(
            walletAddress
        )
    ) {
        throw new Error(
            `Invalid wallet address: ${walletAddress}`
        );
    }
}


function requireValue(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        throw new Error(
            `${fieldName} is required.`
        );
    }
}


function transactionResult(
    receipt
) {

    return receipt.hash;
}


// =========================================================
// SIGNER
// =========================================================

async function getSigner(
    walletAddress
) {

    requireWallet(
        walletAddress
    );

    const accounts =
        await provider.send(
            "eth_accounts",
            []
        );

    const normalizedAddress =
        walletAddress.toLowerCase();

    const matchedAccount =
        accounts.find(
            account =>
                account.toLowerCase() ===
                normalizedAddress
        );

    if (!matchedAccount) {

        throw new Error(
            `Wallet ${walletAddress} is not available on the connected Ganache network.`
        );

    }

    return provider.getSigner(
        matchedAccount
    );
}


// =========================================================
// WRITABLE CONTRACT
// =========================================================

async function getWritableContract(
    walletAddress
) {

    const signer =
        await getSigner(
            walletAddress
        );

    return contract.connect(
        signer
    );
}


// =========================================================
// BLOCKCHAIN STATUS
// =========================================================

async function getBlockchainStatus() {

    const network =
        await provider.getNetwork();

    const blockNumber =
        await provider.getBlockNumber();

    const accounts =
        await provider.send(
            "eth_accounts",
            []
        );

    const actualChainId =
        network.chainId.toString();

    return {

        rpcUrl:
            BLOCKCHAIN_RPC_URL,

        chainId:
            actualChainId,

        configuredNetworkId:
            String(
                EXPECTED_NETWORK_ID
            ),

        networkMatches:
            actualChainId ===
            String(
                EXPECTED_NETWORK_ID
            ),

        blockNumber,

        accountCount:
            accounts.length,

        accounts,

        contractAddress

    };
}


// =========================================================
// CONTRACT INFO
// =========================================================

async function getContractInfo() {

    const network =
        await provider.getNetwork();

    const blockNumber =
        await provider.getBlockNumber();

    return {

        contractName:
            deployment.contractName ||
            "LandRegistryV2",

        contractAddress,

        chainId:
            network.chainId.toString(),

        configuredNetworkId:
            String(
                EXPECTED_NETWORK_ID
            ),

        blockNumber,

        deployerAddress:
            deployment.deployerAddress ||
            null,

        deployedAt:
            deployment.deployedAt ||
            null

    };
}


// =========================================================
// READ — ROLE
// =========================================================

async function getBlockchainRole(
    walletAddress
) {

    requireWallet(
        walletAddress
    );

    const result =
        await contract.getRole(
            walletAddress
        );

    return {

        role:
            Number(
                result[0]
            ),

        regionId:
            result[1]

    };
}


// =========================================================
// READ — OFFICER REGION
// =========================================================

async function getOfficerRegion(
    walletAddress
) {

    requireWallet(
        walletAddress
    );

    return contract.getOfficerRegion(
        walletAddress
    );
}


// =========================================================
// READ — LAND
// =========================================================

async function getBlockchainLand(
    landId
) {

    requireValue(
        landId,
        "Land ID"
    );

    return contract.getLand(
        landId
    );
}


// =========================================================
// READ — TRANSFER
// =========================================================

async function getBlockchainTransfer(
    transferId
) {

    requireValue(
        transferId,
        "Transfer ID"
    );

    return contract.getTransfer(
        transferId
    );
}


// =========================================================
// READ — LAND UPDATE
// =========================================================

async function getBlockchainLandUpdate(
    requestId
) {

    requireValue(
        requestId,
        "Request ID"
    );

    return contract.getLandUpdate(
        requestId
    );
}


// =========================================================
// READ — DOCUMENT
// =========================================================

async function getBlockchainDocument(
    documentId
) {

    requireValue(
        documentId,
        "Document ID"
    );

    return contract.getDocument(
        documentId
    );
}


// =========================================================
// WRITE — ASSIGN SUPERVISOR
// =========================================================

async function assignSupervisor(
    walletAddress
) {

    const writableContract =
        await getWritableContract(
            walletAddress
        );

    const tx =
        await writableContract.assignSupervisor(
            walletAddress
        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        walletAddress

    };
}


// =========================================================
// WRITE — ASSIGN OFFICER
// =========================================================

async function assignOfficer(
    supervisorWallet,
    officerWallet,
    regionId
) {

    requireWallet(
        supervisorWallet
    );

    requireWallet(
        officerWallet
    );

    requireValue(
        regionId,
        "Region ID"
    );

    const writableContract =
        await getWritableContract(
            supervisorWallet
        );

    const tx =
        await writableContract.assignOfficer(
            officerWallet,
            regionId
        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        walletAddress:
            officerWallet,

        regionId

    };
}


// =========================================================
// WRITE — ASSIGN CITIZEN
// =========================================================

async function assignCitizen(
    supervisorWallet,
    citizenWallet
) {

    requireWallet(
        supervisorWallet
    );

    requireWallet(
        citizenWallet
    );

    const writableContract =
        await getWritableContract(
            supervisorWallet
        );

    const tx =
        await writableContract.assignCitizen(
            citizenWallet
        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        walletAddress:
            citizenWallet

    };
}


// =========================================================
// WRITE — REGISTER LAND
// =========================================================

async function registerLand(
    officerWallet,
    landId,
    surveyNumber,
    parcelArea,
    areaUnit,
    location,
    landUseType,
    zone,
    regionId
) {

    requireWallet(
        officerWallet
    );

    requireValue(
        landId,
        "Land ID"
    );

    requireValue(
        surveyNumber,
        "Survey number"
    );

    requireValue(
        parcelArea,
        "Parcel area"
    );

    requireValue(
        areaUnit,
        "Area unit"
    );

    requireValue(
        location,
        "Location"
    );

    requireValue(
        regionId,
        "Region ID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.registerLand(

            landId,

            surveyNumber,

            String(
                parcelArea
            ),

            areaUnit,

            location,

            landUseType || "",

            zone || "",

            regionId

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        landId,

        surveyNumber,

        regionId

    };
}


// =========================================================
// WRITE — ALLOCATE LAND
// =========================================================

async function allocateLand(
    officerWallet,
    landId,
    citizenAddress
) {

    requireWallet(
        officerWallet
    );

    requireWallet(
        citizenAddress
    );

    requireValue(
        landId,
        "Land ID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.allocateLand(

            landId,

            citizenAddress

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        landId,

        citizenAddress

    };
}


// =========================================================
// WRITE — PROPOSE TRANSFER
// =========================================================

async function proposeTransfer(
    sellerWallet,
    transferId,
    landId,
    buyerAddress,
    reason = ""
) {

    requireWallet(
        sellerWallet
    );

    requireWallet(
        buyerAddress
    );

    requireValue(
        transferId,
        "Transfer ID"
    );

    requireValue(
        landId,
        "Land ID"
    );

    const writableContract =
        await getWritableContract(
            sellerWallet
        );

    const tx =
        await writableContract.proposeTransfer(

            transferId,

            landId,

            buyerAddress,

            reason || ""

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        transferId,

        landId,

        buyerAddress,

        reason:
            reason || ""

    };
}


// =========================================================
// WRITE — ACCEPT TRANSFER
// =========================================================

async function acceptTransfer(
    buyerWallet,
    transferId
) {

    requireWallet(
        buyerWallet
    );

    requireValue(
        transferId,
        "Transfer ID"
    );

    const writableContract =
        await getWritableContract(
            buyerWallet
        );

    const tx =
        await writableContract.acceptTransfer(
            transferId
        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        transferId

    };
}


// =========================================================
// WRITE — APPROVE TRANSFER
// =========================================================

async function approveTransfer(
    officerWallet,
    transferId
) {

    requireWallet(
        officerWallet
    );

    requireValue(
        transferId,
        "Transfer ID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.approveTransfer(
            transferId
        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        transferId

    };
}


// =========================================================
// WRITE — REJECT TRANSFER
// =========================================================

async function rejectTransfer(
    officerWallet,
    transferId,
    reason = ""
) {

    requireWallet(
        officerWallet
    );

    requireValue(
        transferId,
        "Transfer ID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.rejectTransfer(

            transferId,

            reason || ""

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        transferId,

        reason:
            reason || ""

    };
}


// =========================================================
// WRITE — PROPOSE LAND UPDATE
// =========================================================

async function proposeLandUpdate(
    citizenWallet,
    requestId,
    landId,
    updateType,
    requestedArea,
    requestedAreaUnit,
    requestedLandUse,
    requestedLandType,
    reason
) {

    requireWallet(
        citizenWallet
    );

    requireValue(
        requestId,
        "Request ID"
    );

    requireValue(
        landId,
        "Land ID"
    );

    requireValue(
        updateType,
        "Update type"
    );

    const writableContract =
        await getWritableContract(
            citizenWallet
        );

    const tx =
        await writableContract.proposeLandUpdate(

            requestId,

            landId,

            updateType,

            requestedArea || 0,

            requestedAreaUnit || "",

            requestedLandUse || "",

            requestedLandType || "",

            reason || ""

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        requestId,

        landId,

        updateType

    };
}


// =========================================================
// WRITE — APPROVE LAND UPDATE
// =========================================================

async function approveLandUpdate(
    officerWallet,
    requestId
) {

    requireWallet(
        officerWallet
    );

    requireValue(
        requestId,
        "Request ID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.approveLandUpdate(
            requestId
        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        requestId

    };
}


// =========================================================
// WRITE — REJECT LAND UPDATE
// =========================================================

async function rejectLandUpdate(
    officerWallet,
    requestId,
    reason = ""
) {

    requireWallet(
        officerWallet
    );

    requireValue(
        requestId,
        "Request ID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.rejectLandUpdate(

            requestId,

            reason || ""

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        requestId,

        reason:
            reason || ""

    };
}


// =========================================================
// WRITE — ANCHOR DOCUMENT
// =========================================================

async function anchorDocument(
    officerWallet,
    documentId,
    landId,
    transactionId,
    documentType,
    sha256Hash,
    ipfsCid
) {

    requireWallet(
        officerWallet
    );

    requireValue(
        documentId,
        "Document ID"
    );

    requireValue(
        landId,
        "Land ID"
    );

    requireValue(
        transactionId,
        "Transaction ID"
    );

    requireValue(
        documentType,
        "Document type"
    );

    requireValue(
        sha256Hash,
        "SHA-256 hash"
    );

    requireValue(
        ipfsCid,
        "IPFS CID"
    );

    const writableContract =
        await getWritableContract(
            officerWallet
        );

    const tx =
        await writableContract.anchorDocument(

            documentId,

            landId,

            transactionId,

            documentType,

            sha256Hash,

            ipfsCid

        );

    const receipt =
        await tx.wait();

    return {

        transactionHash:
            transactionResult(
                receipt
            ),

        documentId,

        landId,

        transactionId,

        documentType,

        sha256Hash,

        ipfsCid

    };
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    provider,

    contract,

    contractAddress,

    contractAbi,

    getSigner,

    getWritableContract,

    getBlockchainStatus,

    getContractInfo,

    getBlockchainRole,

    getOfficerRegion,

    getBlockchainLand,

    getBlockchainTransfer,

    getBlockchainLandUpdate,

    getBlockchainDocument,

    assignSupervisor,

    assignOfficer,

    assignCitizen,

    registerLand,

    allocateLand,

    proposeTransfer,

    acceptTransfer,

    approveTransfer,

    rejectTransfer,

    proposeLandUpdate,

    approveLandUpdate,

    rejectLandUpdate,

    anchorDocument

};