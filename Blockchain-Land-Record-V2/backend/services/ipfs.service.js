const fs = require("fs");

const IPFS_API_URL =
    "http://127.0.0.1:5001/api/v0";

async function uploadFileToIPFS(filePath) {

    if (!fs.existsSync(filePath)) {
        throw new Error(
            `File not found: ${filePath}`
        );
    }

    const fileBuffer =
        fs.readFileSync(filePath);

    const boundary =
        "----LandRecordIPFSBoundary";

    const header =
        Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="document.pdf"\r\n` +
            `Content-Type: application/pdf\r\n\r\n`
        );

    const footer =
        Buffer.from(
            `\r\n--${boundary}--\r\n`
        );

    const body =
        Buffer.concat([
            header,
            fileBuffer,
            footer
        ]);

    const response =
        await fetch(
            `${IPFS_API_URL}/add`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        `multipart/form-data; boundary=${boundary}`,
                    "Origin":
                        "http://127.0.0.1:5001"
                },
                body
            }
        );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `IPFS upload failed: ${response.status} ${errorText}`
        );
    }

    const responseText =
        await response.text();

    const result =
        JSON.parse(
            responseText.trim().split("\n").pop()
        );

    return {
        cid: result.Hash,
        name: result.Name,
        size: result.Size
    };
}

async function getIPFSStatus() {

    const response =
        await fetch(
            `${IPFS_API_URL}/id`,
            {
                method: "POST",
                headers: {
                    "Origin":
                        "http://127.0.0.1:5001"
                }
            }
        );

    if (!response.ok) {
        throw new Error(
            `IPFS status failed: ${response.status}`
        );
    }

    return response.json();
}

module.exports = {
    uploadFileToIPFS,
    getIPFSStatus
};