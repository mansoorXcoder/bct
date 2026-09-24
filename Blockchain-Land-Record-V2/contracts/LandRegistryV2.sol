// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LandRegistryV2 {

    // =========================================================
    // ROLES
    // =========================================================

    enum Role {
        NONE,
        SUPERVISORY_AUTHORITY,
        LAND_ADMIN_OFFICER,
        CITIZEN
    }

    mapping(address => Role) private roles;
    mapping(address => string) private officerRegions;

    // =========================================================
    // LAND
    // =========================================================

    enum LandStatus {
        NONE,
        AVAILABLE,
        ALLOCATED,
        TRANSFER_PENDING,
        UPDATE_PENDING,
        SUSPENDED
    }

    struct Land {
        string landId;
        string surveyNumber;
        uint256 parcelArea;
        string areaUnit;
        string location;
        string landUseType;
        string zone;
        string regionId;
        address currentOwner;
        LandStatus status;
        bool exists;
    }

    mapping(string => Land) private lands;

    // =========================================================
    // TRANSFER
    // =========================================================

    enum TransferStatus {
        NONE,
        PENDING_BUYER_ACCEPTANCE,
        PENDING_AUTHORITY_REVIEW,
        COMPLETED,
        REJECTED
    }

    struct TransferProposal {
        string transferId;
        string landId;
        address seller;
        address buyer;
        TransferStatus status;
        string reason;
        bool exists;
    }

    mapping(string => TransferProposal) private transferProposals;

    // =========================================================
    // LAND UPDATE REQUESTS
    // =========================================================

    enum UpdateType {
        NONE,
        AREA_MODIFICATION,
        LAND_USE_MODIFICATION,
        LAND_TYPE_MODIFICATION,
        OTHER_MODIFICATION
    }

    enum UpdateStatus {
        NONE,
        PENDING_AUTHORITY_REVIEW,
        APPROVED,
        REJECTED
    }

    struct LandUpdateRequest {
        string requestId;
        string landId;
        address requester;
        UpdateType updateType;

        uint256 currentArea;
        uint256 requestedArea;

        string currentAreaUnit;
        string requestedAreaUnit;

        string currentLandUse;
        string requestedLandUse;

        string currentLandType;
        string requestedLandType;

        string reason;

        UpdateStatus status;

        bool exists;
    }

    mapping(string => LandUpdateRequest) private landUpdateRequests;

    // =========================================================
    // DOCUMENTS
    // =========================================================

    struct DocumentReference {
        string documentId;
        string landId;
        string transactionId;
        string documentType;
        string sha256Hash;
        string ipfsCid;
        bool exists;
    }

    mapping(string => DocumentReference) private documents;

    // =========================================================
    // EVENTS
    // =========================================================

    event UserRoleAssigned(
        address indexed user,
        Role role,
        string regionId
    );

    event LandRegistered(
        string indexed landId,
        string surveyNumber,
        string regionId
    );

    event LandAllocated(
        string indexed landId,
        address indexed owner
    );

    event TransferProposed(
        string indexed transferId,
        string indexed landId,
        address indexed seller,
        address buyer
    );

    event TransferAccepted(
        string indexed transferId,
        string indexed landId,
        address indexed buyer
    );

    event TransferApproved(
        string indexed transferId,
        string indexed landId,
        address indexed previousOwner,
        address newOwner
    );

    event TransferRejected(
        string indexed transferId,
        string indexed landId,
        address indexed seller,
        string reason
    );

    event LandUpdateProposed(
        string indexed requestId,
        string indexed landId,
        address indexed requester,
        UpdateType updateType
    );

    event LandUpdateApproved(
        string indexed requestId,
        string indexed landId,
        address indexed officer,
        UpdateType updateType
    );

    event LandUpdateRejected(
        string indexed requestId,
        string indexed landId,
        address indexed officer,
        string reason
    );

    event DocumentAnchored(
        string indexed documentId,
        string indexed landId,
        string transactionId,
        string documentType,
        string sha256Hash,
        string ipfsCid
    );

    // =========================================================
    // MODIFIERS
    // =========================================================

    modifier onlySupervisor() {
        require(
            roles[msg.sender] == Role.SUPERVISORY_AUTHORITY,
            "Only supervisory authority allowed"
        );
        _;
    }

    modifier onlyOfficer() {
        require(
            roles[msg.sender] == Role.LAND_ADMIN_OFFICER,
            "Only land administration officer allowed"
        );
        _;
    }

    modifier onlyCitizen() {
        require(
            roles[msg.sender] == Role.CITIZEN,
            "Only citizen allowed"
        );
        _;
    }

    // =========================================================
    // ROLE MANAGEMENT
    // =========================================================

    function assignSupervisor(address user)
        external
    {
        require(
            roles[msg.sender] == Role.NONE ||
            roles[msg.sender] == Role.SUPERVISORY_AUTHORITY,
            "Unauthorized"
        );

        require(
            user != address(0),
            "Invalid supervisor address"
        );

        roles[user] = Role.SUPERVISORY_AUTHORITY;

        emit UserRoleAssigned(
            user,
            Role.SUPERVISORY_AUTHORITY,
            ""
        );
    }

    function assignOfficer(
        address user,
        string calldata regionId
    )
        external
        onlySupervisor
    {
        require(
            user != address(0),
            "Invalid officer address"
        );

        require(
            bytes(regionId).length > 0,
            "Region required"
        );

        roles[user] = Role.LAND_ADMIN_OFFICER;
        officerRegions[user] = regionId;

        emit UserRoleAssigned(
            user,
            Role.LAND_ADMIN_OFFICER,
            regionId
        );
    }

    function assignCitizen(address user)
        external
        onlySupervisor
    {
        require(
            user != address(0),
            "Invalid citizen address"
        );

        roles[user] = Role.CITIZEN;

        emit UserRoleAssigned(
            user,
            Role.CITIZEN,
            ""
        );
    }

    // =========================================================
    // LAND REGISTRATION
    // =========================================================

    function registerLand(
        string calldata landId,
        string calldata surveyNumber,
        uint256 parcelArea,
        string calldata areaUnit,
        string calldata location,
        string calldata landUseType,
        string calldata zone,
        string calldata regionId
    )
        external
        onlyOfficer
    {
        require(
            !lands[landId].exists,
            "Land already exists"
        );

        require(
            parcelArea > 0,
            "Parcel area must be positive"
        );

        require(
            bytes(surveyNumber).length > 0,
            "Survey number required"
        );

        require(
            keccak256(bytes(officerRegions[msg.sender])) ==
            keccak256(bytes(regionId)),
            "Officer region mismatch"
        );

        lands[landId] = Land({
            landId: landId,
            surveyNumber: surveyNumber,
            parcelArea: parcelArea,
            areaUnit: areaUnit,
            location: location,
            landUseType: landUseType,
            zone: zone,
            regionId: regionId,
            currentOwner: address(0),
            status: LandStatus.AVAILABLE,
            exists: true
        });

        emit LandRegistered(
            landId,
            surveyNumber,
            regionId
        );
    }

    // =========================================================
    // LAND ALLOCATION
    // =========================================================

    function allocateLand(
        string calldata landId,
        address citizen
    )
        external
        onlyOfficer
    {
        Land storage land = lands[landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            roles[citizen] == Role.CITIZEN,
            "Recipient is not a citizen"
        );

        require(
            land.status == LandStatus.AVAILABLE,
            "Land is not available"
        );

        require(
            keccak256(bytes(land.regionId)) ==
            keccak256(bytes(officerRegions[msg.sender])),
            "Officer region mismatch"
        );

        land.currentOwner = citizen;
        land.status = LandStatus.ALLOCATED;

        emit LandAllocated(
            landId,
            citizen
        );
    }

    // =========================================================
    // OWNERSHIP TRANSFER
    // =========================================================

    function proposeTransfer(
        string calldata transferId,
        string calldata landId,
        address buyer,
        string calldata reason
    )
        external
        onlyCitizen
    {
        Land storage land = lands[landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            land.currentOwner == msg.sender,
            "Only current owner can transfer"
        );

        require(
            buyer != address(0),
            "Invalid buyer"
        );

        require(
            buyer != msg.sender,
            "Buyer cannot be seller"
        );

        require(
            roles[buyer] == Role.CITIZEN,
            "Buyer is not a citizen"
        );

        require(
            land.status == LandStatus.ALLOCATED,
            "Land is not transferable"
        );

        require(
            !transferProposals[transferId].exists,
            "Transfer already exists"
        );

        transferProposals[transferId] =
            TransferProposal({
                transferId: transferId,
                landId: landId,
                seller: msg.sender,
                buyer: buyer,
                status: TransferStatus.PENDING_BUYER_ACCEPTANCE,
                reason: reason,
                exists: true
            });

        land.status = LandStatus.TRANSFER_PENDING;

        emit TransferProposed(
            transferId,
            landId,
            msg.sender,
            buyer
        );
    }

    // =========================================================
    // BUYER ACCEPTANCE
    // =========================================================

    function acceptTransfer(
        string calldata transferId
    )
        external
        onlyCitizen
    {
        TransferProposal storage transfer =
            transferProposals[transferId];

        require(
            transfer.exists,
            "Transfer does not exist"
        );

        require(
            transfer.buyer == msg.sender,
            "Only designated buyer can accept"
        );

        require(
            transfer.status ==
            TransferStatus.PENDING_BUYER_ACCEPTANCE,
            "Transfer is not awaiting buyer acceptance"
        );

        transfer.status =
            TransferStatus.PENDING_AUTHORITY_REVIEW;

        emit TransferAccepted(
            transferId,
            transfer.landId,
            msg.sender
        );
    }

    // =========================================================
    // TRANSFER APPROVAL
    // =========================================================

    function approveTransfer(
        string calldata transferId
    )
        external
        onlyOfficer
    {
        TransferProposal storage transfer =
            transferProposals[transferId];

        require(
            transfer.exists,
            "Transfer does not exist"
        );

        require(
            transfer.status ==
            TransferStatus.PENDING_AUTHORITY_REVIEW,
            "Transfer is not ready for approval"
        );

        Land storage land =
            lands[transfer.landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            keccak256(bytes(land.regionId)) ==
            keccak256(bytes(officerRegions[msg.sender])),
            "Officer region mismatch"
        );

        require(
            land.currentOwner == transfer.seller,
            "Current owner mismatch"
        );

        address previousOwner =
            land.currentOwner;

        land.currentOwner =
            transfer.buyer;

        land.status =
            LandStatus.ALLOCATED;

        transfer.status =
            TransferStatus.COMPLETED;

        emit TransferApproved(
            transferId,
            transfer.landId,
            previousOwner,
            transfer.buyer
        );
    }

    // =========================================================
    // TRANSFER REJECTION
    // =========================================================

    function rejectTransfer(
        string calldata transferId,
        string calldata reason
    )
        external
        onlyOfficer
    {
        TransferProposal storage transfer =
            transferProposals[transferId];

        require(
            transfer.exists,
            "Transfer does not exist"
        );

        require(
            transfer.status ==
            TransferStatus.PENDING_AUTHORITY_REVIEW ||
            transfer.status ==
            TransferStatus.PENDING_BUYER_ACCEPTANCE,
            "Transfer cannot be rejected"
        );

        Land storage land =
            lands[transfer.landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            keccak256(bytes(land.regionId)) ==
            keccak256(bytes(officerRegions[msg.sender])),
            "Officer region mismatch"
        );

        transfer.status =
            TransferStatus.REJECTED;

        land.status =
            LandStatus.ALLOCATED;

        emit TransferRejected(
            transferId,
            transfer.landId,
            transfer.seller,
            reason
        );
    }

    // =========================================================
    // LAND UPDATE REQUEST
    // =========================================================

    function proposeLandUpdate(
        string calldata requestId,
        string calldata landId,
        UpdateType updateType,
        uint256 requestedArea,
        string calldata requestedAreaUnit,
        string calldata requestedLandUse,
        string calldata requestedLandType,
        string calldata reason
    )
        external
        onlyCitizen
    {
        Land storage land =
            lands[landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            land.currentOwner == msg.sender,
            "Only current owner can request update"
        );

        require(
            land.status == LandStatus.ALLOCATED,
            "Land is not available for update"
        );

        require(
            updateType != UpdateType.NONE,
            "Invalid update type"
        );

        require(
            !landUpdateRequests[requestId].exists,
            "Update request already exists"
        );

        if (updateType == UpdateType.AREA_MODIFICATION) {
            require(
                requestedArea > 0,
                "Requested area must be positive"
            );
        }

        landUpdateRequests[requestId] =
            LandUpdateRequest({
                requestId: requestId,
                landId: landId,
                requester: msg.sender,
                updateType: updateType,

                currentArea: land.parcelArea,
                requestedArea: requestedArea,

                currentAreaUnit: land.areaUnit,
                requestedAreaUnit: requestedAreaUnit,

                currentLandUse: land.landUseType,
                requestedLandUse: requestedLandUse,

                currentLandType: "",
                requestedLandType: requestedLandType,

                reason: reason,

                status: UpdateStatus.PENDING_AUTHORITY_REVIEW,

                exists: true
            });

        land.status =
            LandStatus.UPDATE_PENDING;

        emit LandUpdateProposed(
            requestId,
            landId,
            msg.sender,
            updateType
        );
    }

    // =========================================================
    // LAND UPDATE APPROVAL
    // =========================================================

    function approveLandUpdate(
        string calldata requestId
    )
        external
        onlyOfficer
    {
        LandUpdateRequest storage request =
            landUpdateRequests[requestId];

        require(
            request.exists,
            "Update request does not exist"
        );

        require(
            request.status ==
            UpdateStatus.PENDING_AUTHORITY_REVIEW,
            "Update request is not pending"
        );

        Land storage land =
            lands[request.landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            keccak256(bytes(land.regionId)) ==
            keccak256(bytes(officerRegions[msg.sender])),
            "Officer region mismatch"
        );

        require(
            land.currentOwner == request.requester,
            "Requester is no longer owner"
        );

        if (
            request.updateType ==
            UpdateType.AREA_MODIFICATION
        ) {
            require(
                request.requestedArea > 0,
                "Requested area must be positive"
            );

            land.parcelArea =
                request.requestedArea;

            if (
                bytes(request.requestedAreaUnit).length > 0
            ) {
                land.areaUnit =
                    request.requestedAreaUnit;
            }
        }

        if (
            request.updateType ==
            UpdateType.LAND_USE_MODIFICATION
        ) {
            require(
                bytes(request.requestedLandUse).length > 0,
                "Requested land use required"
            );

            land.landUseType =
                request.requestedLandUse;
        }

        request.status =
            UpdateStatus.APPROVED;

        land.status =
            LandStatus.ALLOCATED;

        emit LandUpdateApproved(
            requestId,
            request.landId,
            msg.sender,
            request.updateType
        );
    }

    // =========================================================
    // LAND UPDATE REJECTION
    // =========================================================

    function rejectLandUpdate(
        string calldata requestId,
        string calldata reason
    )
        external
        onlyOfficer
    {
        LandUpdateRequest storage request =
            landUpdateRequests[requestId];

        require(
            request.exists,
            "Update request does not exist"
        );

        require(
            request.status ==
            UpdateStatus.PENDING_AUTHORITY_REVIEW,
            "Update request is not pending"
        );

        Land storage land =
            lands[request.landId];

        require(
            land.exists,
            "Land does not exist"
        );

        require(
            keccak256(bytes(land.regionId)) ==
            keccak256(bytes(officerRegions[msg.sender])),
            "Officer region mismatch"
        );

        request.status =
            UpdateStatus.REJECTED;

        land.status =
            LandStatus.ALLOCATED;

        emit LandUpdateRejected(
            requestId,
            request.landId,
            msg.sender,
            reason
        );
    }

    // =========================================================
    // DOCUMENT ANCHOR
    // =========================================================

    function anchorDocument(
        string calldata documentId,
        string calldata landId,
        string calldata transactionId,
        string calldata documentType,
        string calldata sha256Hash,
        string calldata ipfsCid
    )
        external
        onlyOfficer
    {
        require(
            lands[landId].exists,
            "Land does not exist"
        );

        require(
            bytes(sha256Hash).length > 0,
            "SHA-256 hash required"
        );

        require(
            bytes(ipfsCid).length > 0,
            "IPFS CID required"
        );

        require(
            !documents[documentId].exists,
            "Document already exists"
        );

        documents[documentId] =
            DocumentReference({
                documentId: documentId,
                landId: landId,
                transactionId: transactionId,
                documentType: documentType,
                sha256Hash: sha256Hash,
                ipfsCid: ipfsCid,
                exists: true
            });

        emit DocumentAnchored(
            documentId,
            landId,
            transactionId,
            documentType,
            sha256Hash,
            ipfsCid
        );
    }

    // =========================================================
    // READ FUNCTIONS
    // =========================================================

    function getRole(address user)
        external
        view
        returns (
            uint8 role,
            string memory regionId
        )
    {
        return (
            uint8(roles[user]),
            officerRegions[user]
        );
    }

    function getOfficerRegion(address user)
        external
        view
        returns (string memory)
    {
        return officerRegions[user];
    }

    function getLand(
        string calldata landId
    )
        external
        view
        returns (Land memory)
    {
        require(
            lands[landId].exists,
            "Land does not exist"
        );

        return lands[landId];
    }

    function getTransfer(
        string calldata transferId
    )
        external
        view
        returns (TransferProposal memory)
    {
        require(
            transferProposals[transferId].exists,
            "Transfer does not exist"
        );

        return transferProposals[transferId];
    }

    function getLandUpdate(
        string calldata requestId
    )
        external
        view
        returns (LandUpdateRequest memory)
    {
        require(
            landUpdateRequests[requestId].exists,
            "Update request does not exist"
        );

        return landUpdateRequests[requestId];
    }

    function getDocument(
        string calldata documentId
    )
        external
        view
        returns (DocumentReference memory)
    {
        require(
            documents[documentId].exists,
            "Document does not exist"
        );

        return documents[documentId];
    }
}