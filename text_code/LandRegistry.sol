// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LandRegistry {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    struct Land {
        string landId;
        string surveyNumber;
        uint256 landArea;
        string areaUnit;
        string location;
        string propertyType;
        string documentHash;
        address owner;
        uint256 registrationTimestamp;
        bool verified;
        bool exists;
    }

    mapping(string => Land) private lands;

    event LandRegistered(
        string landId,
        address owner,
        uint256 timestamp
    );

    event LandVerified(
        string landId,
        address verifier
    );

    event OwnershipTransferred(
        string landId,
        address previousOwner,
        address newOwner
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Register a new land record
    function registerLand(
        string memory _landId,
        string memory _surveyNumber,
        uint256 _landArea,
        string memory _areaUnit,
        string memory _location,
        string memory _propertyType,
        string memory _documentHash
    ) public {

        require(!lands[_landId].exists, "Land already exists");

        lands[_landId] = Land({
            landId: _landId,
            surveyNumber: _surveyNumber,
            landArea: _landArea,
            areaUnit: _areaUnit,
            location: _location,
            propertyType: _propertyType,
            documentHash: _documentHash,
            owner: msg.sender,
            registrationTimestamp: block.timestamp,
            verified: false,
            exists: true
        });

        emit LandRegistered(
            _landId,
            msg.sender,
            block.timestamp
        );
    }

    // Admin verifies land
    function verifyLand(
        string memory _landId
    ) public onlyAdmin {

        require(lands[_landId].exists, "Land does not exist");

        lands[_landId].verified = true;

        emit LandVerified(
            _landId,
            msg.sender
        );
    }

    // Current owner transfers ownership
    function transferOwnership(
        string memory _landId,
        address _newOwner
    ) public {

        require(lands[_landId].exists, "Land does not exist");
        require(
            lands[_landId].owner == msg.sender,
            "Only current owner can transfer"
        );
        require(
            _newOwner != address(0),
            "Invalid new owner"
        );

        address previousOwner = lands[_landId].owner;

        lands[_landId].owner = _newOwner;

        emit OwnershipTransferred(
            _landId,
            previousOwner,
            _newOwner
        );
    }

    // Get land details
    function getLand(
        string memory _landId
    )
        public
        view
        returns (
            string memory,
            string memory,
            uint256,
            string memory,
            string memory,
            string memory,
            string memory,
            address,
            uint256,
            bool
        )
    {
        require(lands[_landId].exists, "Land does not exist");

        Land memory land = lands[_landId];

        return (
            land.landId,
            land.surveyNumber,
            land.landArea,
            land.areaUnit,
            land.location,
            land.propertyType,
            land.documentHash,
            land.owner,
            land.registrationTimestamp,
            land.verified
        );
    }
}