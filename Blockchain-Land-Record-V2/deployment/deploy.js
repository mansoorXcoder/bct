require("dotenv").config();

const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");

const RPC_URL =
    process.env.BLOCKCHAIN_RPC_URL ||
    "http://127.0.0.1:7546";

const CONTRACT_FILE = path.join(
    __dirname,
    "..",
    "contracts",
    "LandRegistryV2.sol"
);

const OUTPUT_DIR = path.join(
    __dirname,
    "output"
);

async function main() {

    console.log("====================================");
    console.log("V2 LAND REGISTRY DEPLOYMENT");
    console.log("====================================");

    console.log("RPC:", RPC_URL);

    // =========================================================
    // LOAD SOLIDITY SOURCE
    // =========================================================

    if (!fs.existsSync(CONTRACT_FILE)) {
        throw new Error(
            `Contract file not found: ${CONTRACT_FILE}`
        );
    }

    const source = fs.readFileSync(
        CONTRACT_FILE,
        "utf8"
    );

    console.log("Contract source loaded.");

    // =========================================================
    // SOLIDITY COMPILER INPUT
    // =========================================================

    const input = {

        language: "Solidity",

        sources: {
            "LandRegistryV2.sol": {
                content: source
            }
        },

        settings: {

            // IMPORTANT:
            // Required because the contract produces
            // "Stack too deep" without IR compilation.
            viaIR: true,

            optimizer: {
                enabled: true,
                runs: 200
            },

            // Compatible with our local Ganache setup.
            evmVersion: "paris",

            outputSelection: {
                "*": {
                    "*": [
                        "abi",
                        "evm.bytecode",
                        "evm.deployedBytecode"
                    ]
                }
            }
        }
    };

    // =========================================================
    // COMPILE
    // =========================================================

    console.log("\nCompiling Solidity...");

    const compiled = JSON.parse(
        solc.compile(
            JSON.stringify(input)
        )
    );

    // =========================================================
    // HANDLE COMPILER MESSAGES
    // =========================================================

    if (compiled.errors) {

        const warnings =
            compiled.errors.filter(
                error =>
                    error.severity === "warning"
            );

        const errors =
            compiled.errors.filter(
                error =>
                    error.severity === "error"
            );

        if (warnings.length > 0) {

            console.log(
                `Compiler warnings: ${warnings.length}`
            );

            warnings.forEach(
                warning => {
                    console.log(
                        warning.formattedMessage
                    );
                }
            );
        }

        if (errors.length > 0) {

            console.error(
                "\nCOMPILATION FAILED:\n"
            );

            errors.forEach(
                error => {
                    console.error(
                        error.formattedMessage
                    );
                }
            );

            process.exit(1);
        }
    }

    // =========================================================
    // GET CONTRACT ARTIFACT
    // =========================================================

    const contractData =
        compiled.contracts[
            "LandRegistryV2.sol"
        ]["LandRegistryV2"];

    if (!contractData) {
        throw new Error(
            "LandRegistryV2 contract was not found in compilation output."
        );
    }

    const abi =
        contractData.abi;

    const creationBytecode =
        contractData.evm.bytecode.object;

    const runtimeBytecode =
        contractData.evm.deployedBytecode.object;

    if (!creationBytecode) {
        throw new Error(
            "Contract creation bytecode is empty."
        );
    }

    if (!runtimeBytecode) {
        throw new Error(
            "Contract runtime bytecode is empty."
        );
    }

    console.log(
        "\nCompilation successful."
    );

    console.log(
        "ABI functions:",
        abi.filter(
            item => item.type === "function"
        ).length
    );

    console.log(
        "Creation bytecode length:",
        creationBytecode.length
    );

    console.log(
        "Runtime bytecode length:",
        runtimeBytecode.length
    );

    console.log(
        "viaIR: true"
    );

    console.log(
        "Optimizer: enabled"
    );

    console.log(
        "EVM version: paris"
    );

    // =========================================================
    // CONNECT TO GANACHE
    // =========================================================

    const provider =
        new ethers.JsonRpcProvider(
            RPC_URL
        );

    const network =
        await provider.getNetwork();

    console.log(
        "\nChain ID:",
        network.chainId.toString()
    );

    const accounts =
        await provider.send(
            "eth_accounts",
            []
        );

    if (!accounts.length) {
        throw new Error(
            "No Ganache accounts found."
        );
    }

    const deployerAddress =
        accounts[0];

    console.log(
        "Deployer:",
        deployerAddress
    );

    // =========================================================
    // DEPLOYER SIGNER
    // =========================================================

    const signer =
        await provider.getSigner(
            deployerAddress
        );

    // =========================================================
    // DEPLOY CONTRACT
    // =========================================================

    console.log(
        "\nDeploying contract..."
    );

    const factory =
        new ethers.ContractFactory(
            abi,
            "0x" + creationBytecode,
            signer
        );

    const contract =
        await factory.deploy();

    const deploymentTransaction =
        contract.deploymentTransaction();

    if (deploymentTransaction) {
        console.log(
            "Deployment transaction:",
            deploymentTransaction.hash
        );
    }

    await contract.waitForDeployment();

    const contractAddress =
        await contract.getAddress();

    console.log(
        "\nContract deployed successfully."
    );

    console.log(
        "Contract address:",
        contractAddress
    );

    // =========================================================
    // VERIFY DEPLOYED BYTECODE
    // =========================================================

    const deployedCode =
        await provider.getCode(
            contractAddress
        );

    console.log(
        "Runtime bytecode exists:",
        deployedCode !== "0x"
    );

    console.log(
        "Deployed runtime bytecode length:",
        deployedCode.length
    );

    // =========================================================
    // SAVE DEPLOYMENT ARTIFACT
    // =========================================================

    fs.mkdirSync(
        OUTPUT_DIR,
        {
            recursive: true
        }
    );

    const deployment = {

        contractName:
            "LandRegistryV2",

        contractAddress:
            contractAddress,

        deployerAddress:
            deployerAddress,

        rpcUrl:
            RPC_URL,

        chainId:
            network.chainId.toString(),

        networkId:
            process.env.NETWORK_ID ||
            "5778",

        compilerVersion:
            solc.version(),

        viaIR:
            true,

        optimizer:
            true,

        optimizerRuns:
            200,

        evmVersion:
            "paris",

        deployedAt:
            new Date().toISOString(),

        abi:
            abi
    };

    const outputFile =
        path.join(
            OUTPUT_DIR,
            "LandRegistryV2.json"
        );

    fs.writeFileSync(
        outputFile,
        JSON.stringify(
            deployment,
            null,
            2
        )
    );

    console.log(
        "\nDeployment artifact saved:"
    );

    console.log(
        outputFile
    );

    console.log(
        "\n===================================="
    );

    console.log(
        "DEPLOYMENT COMPLETE"
    );

    console.log(
        "===================================="
    );
}

main().catch(
    error => {

        console.error(
            "\nDEPLOYMENT FAILED:"
        );

        console.error(
            error.message || error
        );

        process.exit(1);
    }
);