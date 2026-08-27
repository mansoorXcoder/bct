# Tech to Know, Learn & Use
## Blockchain-Based Secure and Smart Land Registration & Management System

> **Purpose:** This file is a focused learning/reference sheet for the technologies, concepts, and terminology used or considered in the project.
>
> **Rule:** Learn the concept first, then implement only the parts required by the project.

---

# 1. Technology Stack

| Layer | Technology | Project Role |
|---|---|---|
| Frontend | **React.js** | Web interface for citizens/admin |
| Backend | **Node.js** | Server-side application |
| Backend API | **Express.js** | REST API layer |
| Database | **MongoDB** | Application / administrative data |
| Blockchain | **Ethereum** | Blockchain network |
| Smart Contract | **Solidity** | Registration and transfer logic |
| Web3 | **Ethers.js / Web3.js** | Connect web app with blockchain |
| Wallet | **MetaMask** | Wallet-based blockchain interaction |
| Storage | **IPFS** | Off-chain land-document storage |
| IPFS Service | **Pinata** | IPFS upload/pinning API |
| Mapping | **GIS** | Land parcel/spatial information |
| Testing Network | **Sepolia Testnet** | Blockchain testing |
| Contract IDE | **Remix IDE** | Smart-contract development/testing |
| Local Blockchain | **Ganache** | Local blockchain testing |
| Development Framework | **Hardhat** | Contract development/testing/deployment |
| Authentication | **RBAC / Web3 Authentication** | Access control |
| Cryptography | **Hashing / Digital Signatures** | Integrity and verification |

---

# 2. Core Blockchain Terminology

## Blockchain

A distributed ledger that records transactions in a tamper-evident sequence.

**Project use:** Store approved land-registration and ownership-transfer transactions.

```text
Transaction
    →
Block
    →
Blockchain
    →
Immutable History
```

---

## Block

A group of blockchain transactions recorded together.

**Know:**
- Transactions
- Timestamp
- Previous block reference
- Cryptographic hash

---

## Hash

A cryptographic fingerprint generated from data.

**Project use:** Verify that a document or record has not changed.

```text
Land Document
     ↓
   Hash
     ↓
Blockchain Reference
```

If the document changes:

```text
Original Hash ≠ New Hash
        ↓
Possible Modification
```

---

## Transaction

An operation recorded on a blockchain.

**Project examples:**
- Register land
- Transfer ownership
- Update approved record

---

## Wallet

A blockchain account/interface used to sign transactions.

**Project tool:** MetaMask.

---

## Address

A blockchain account identifier.

**Project use:** Associate authorized blockchain actions with users/admins.

---

## Gas Fee

The computational fee required to execute transactions on Ethereum.

**Important:** Storing large files directly on-chain can be expensive.

This motivates:

`Large File → IPFS`

`CID/Reference → Blockchain`

---

# 3. Smart Contract Terminology

## Smart Contract

A program deployed on a blockchain that automatically executes predefined rules.

**Project use:**

```text
Approved Registration
        ↓
Smart Contract
        ↓
Ownership Transaction
        ↓
Blockchain
```

---

## Solidity

Programming language used to write Ethereum smart contracts.

### Learn

- Variables
- Functions
- Structs
- Arrays
- Mappings
- Modifiers
- Events
- `require()`
- Visibility
- Addresses
- `msg.sender`
- Contract deployment

---

## Function

A smart-contract operation.

Examples:

```text
registerLand()
transferOwnership()
verifyLand()
approveRegistration()
```

---

## Mapping

Solidity data structure for key-value relationships.

Example concept:

```text
Land ID → Land Record
```

---

## Struct

A custom Solidity data structure.

Example concept:

```text
Land {
    landId
    owner
    location
    documentCID
    status
}
```

---

## Modifier

A reusable condition controlling access to a contract function.

Example:

```text
onlyAdmin
onlyRegistrar
onlyOwner
```

---

## Event

A blockchain log emitted when an important contract action occurs.

Examples:

```text
LandRegistered
OwnershipTransferred
RegistrationApproved
```

---

## `msg.sender`

The blockchain address that called a smart-contract function.

**Project use:** Identify who initiated a transaction.

---

# 4. IPFS Terminology

## IPFS

**InterPlanetary File System**

A peer-to-peer distributed storage system used for storing files outside the blockchain.

**Project use:** Store large land documents instead of storing the complete file directly on-chain.

---

## CID

**Content Identifier**

A unique identifier generated for content stored through IPFS.

```text
Land Deed
   ↓
IPFS
   ↓
CID
   ↓
Blockchain
```

The blockchain stores the CID/reference rather than the entire document.

---

## Pinning

Keeping IPFS content available through an IPFS pinning service.

**Project tool:** Pinata.

---

## Pinata

An IPFS service/API used to upload and pin files.

**Project use:**

```text
React / Backend
      ↓
Pinata API
      ↓
IPFS
      ↓
CID
      ↓
Smart Contract
```

---

# 5. Web3 Terminology

## Web3

A decentralized web model where blockchain networks and user-controlled wallets can replace some centralized identity and transaction mechanisms.

**Project relevance:** Wallet-based authentication and blockchain transactions.

---

## Ethers.js

JavaScript library for interacting with Ethereum and smart contracts.

**Project use:**

```text
React
  ↓
Ethers.js
  ↓
MetaMask
  ↓
Ethereum
```

---

## Web3.js

Another JavaScript library for interacting with Ethereum.

**Note:** The project should generally select **one primary Web3 library** rather than unnecessarily using both.

---

## ABI

**Application Binary Interface**

Defines how the frontend/backend communicates with a deployed smart contract.

```text
Frontend
   ↓
ABI + Contract Address
   ↓
Smart Contract
```

---

## Contract Address

The blockchain address where the deployed smart contract exists.

---

# 6. MetaMask Terminology

## MetaMask

A cryptocurrency wallet/browser extension commonly used to interact with Ethereum applications.

**Project use:**
- Connect user wallet
- Sign blockchain transactions
- Approve transactions
- Identify blockchain account

---

## Wallet Signature

A cryptographic signature proving that a wallet account authorized a message/action.

---

## Network

A blockchain environment.

Examples:

- Ethereum Mainnet
- Sepolia Testnet
- Local development network

---

## Testnet

A blockchain network used for development/testing without using real mainnet assets.

**Project network:** Sepolia Testnet.

---

# 7. Ethereum Development Tools

## Remix IDE

Browser-based IDE for writing, compiling, deploying and testing Solidity contracts.

**Best for:** Initial smart-contract learning and simple deployment.

---

## Hardhat

Ethereum development framework.

**Useful for:**
- Compile contracts
- Test contracts
- Deploy contracts
- Manage development workflows

---

## Ganache

Local blockchain environment for development/testing.

**Useful when:** You want a local Ethereum-like network without using a public testnet.

---

# 8. Backend Terminology

## Node.js

JavaScript runtime for executing JavaScript outside the browser.

**Project use:** Backend/server application.

---

## Express.js

Node.js web framework for creating APIs and HTTP routes.

Typical flow:

```text
React
  ↓
REST API
  ↓
Express
  ↓
Business Logic
  ├── MongoDB
  ├── IPFS
  └── Blockchain
```

---

## REST API

An HTTP-based interface used for communication between application components.

Example endpoints:

```text
POST   /api/lands
GET    /api/lands/:id
POST   /api/lands/:id/approve
POST   /api/lands/:id/transfer
GET    /api/lands/:id/history
```

---

# 9. Database Terminology

## MongoDB

NoSQL document database.

**Possible project use:**
- User/application data
- Administrative metadata
- Search/indexing
- Government-system simulation
- Off-chain application information

**Important:** MongoDB does not replace the blockchain.

---

## On-Chain vs Off-Chain

### On-Chain

Stored on blockchain.

Examples:

- Ownership transaction
- Land ID
- Transaction history
- IPFS CID/reference

### Off-Chain

Stored outside blockchain.

Examples:

- PDF documents
- Application metadata
- Large files
- GIS data
- User interface data

---

# 10. Identity & Access Terminology

## Authentication

Verifying **who the user is**.

Examples:

- Login
- Wallet signature
- Digital identity
- OTP

---

## Authorization

Determining **what the user is allowed to do**.

---

## RBAC

**Role-Based Access Control**

Permissions are assigned according to roles.

### Example

```text
Citizen
 ├── Search land
 ├── Submit request
 └── Upload documents

Registrar
 ├── Verify documents
 ├── Approve registration
 └── Approve transfer

Admin
 ├── Manage users
 └── Manage system
```

---

## DID

**Decentralized Identifier**

A user-controlled digital identifier designed to reduce dependence on centralized identity systems.

**Project relevance:** Advanced identity option; not mandatory for MVP.

---

## Verifiable Credential

Digitally signed credential that can be verified without relying entirely on the original issuer's database.

**Project relevance:** Advanced identity extension.

---

# 11. GIS Terminology

## GIS

**Geographic Information System**

Technology for storing, analyzing and displaying geographic/spatial information.

**Project use:** Connect land ownership records with physical parcels.

---

## Coordinates

Latitude/longitude or another spatial reference describing a location.

---

## Parcel

A defined piece of land represented spatially.

---

## Parcel Boundary

The geographic boundary of a land parcel.

---

## Cadastral Data

Official information describing land parcels, boundaries, ownership and related property information.

---

# 12. Land-Registration Terminology

## Land Registry

Official system containing records related to land ownership and property rights.

---

## Land Record

Information describing a property/parcel and its ownership or legal status.

---

## Ownership Transfer

Changing the recorded owner of a property.

```text
Current Owner
      ↓
Verification
      ↓
Approval
      ↓
Smart Contract
      ↓
New Owner
```

---

## Registrar

Authorized authority responsible for verifying and approving land-registration transactions.

**Important:** Blockchain does **not** automatically replace the registrar.

---

## Deed

Legal document describing a property transaction or ownership transfer.

---

## Encumbrance

A legal claim, restriction or liability attached to a property.

**Examples:** mortgage, lien, easement.

**Project relevance:** Important future feature for realistic land verification.

---

# 13. Government Integration Terminology

## Legacy System

An existing government/administrative system that remains in use.

---

## Interoperability

Ability of different systems to exchange and correctly use information.

```text
Government DB
      ↕
    API Layer
      ↕
Blockchain System
```

---

## Synchronization

Keeping information consistent between the new application and existing government records.

---

## API Gateway / Integration Layer

A controlled layer that manages communication between systems.

---

# 14. Security Terminology

## Cryptography

Techniques used to protect information and communications.

---

## Digital Signature

Cryptographic proof that a message/transaction was authorized by a particular key holder.

---

## Tamper Evidence

Ability to detect that stored information has been modified.

**Important distinction:**

> Blockchain makes recorded data tamper-evident; it does not guarantee that incorrect data was not entered initially.

---

## Data Integrity

Assurance that information has not been altered unexpectedly.

---

## Privacy

Protection of sensitive information from unauthorized access.

**Land systems must balance:**

`Transparency ↔ Privacy`

---

# 15. Architecture Terms

## Public Blockchain

Open network where transactions can generally be publicly verified.

**Advantage:** High transparency.

**Concern:** Privacy/control.

---

## Private Blockchain

Blockchain controlled by one organization.

**Advantage:** Greater institutional control.

---

## Consortium Blockchain

Blockchain governed by multiple authorized organizations.

**Potential fit:** Government + authorized institutions.

---

## Hybrid Blockchain

Combination of controlled/private components and public verification mechanisms.

---

# 16. Project Architecture Vocabulary

### Frontend Layer

`React.js`

Handles:

- UI
- Forms
- Search
- Maps
- Wallet connection
- Verification

### Backend Layer

`Node.js + Express.js`

Handles:

- APIs
- Business logic
- Validation
- Database communication
- IPFS communication

### Blockchain Layer

`Ethereum + Solidity`

Handles:

- Ownership transactions
- Approval records
- Immutable history
- Smart-contract rules

### Storage Layer

`IPFS`

Handles:

- Deeds
- Certificates
- Supporting documents

### Database Layer

`MongoDB`

Handles:

- Application data
- Search data
- Administrative metadata
- Mock legacy records

### Spatial Layer

`GIS`

Handles:

- Parcel boundaries
- Coordinates
- Maps
- Spatial information

---

# 17. What to Learn First

## Phase 1 — Foundation

Learn:

1. JavaScript basics
2. Node.js
3. Express.js
4. REST APIs
5. MongoDB
6. React basics

---

## Phase 2 — Blockchain

Learn:

1. Blockchain fundamentals
2. Ethereum
3. Wallets
4. Transactions
5. Gas
6. Testnets
7. MetaMask

---

## Phase 3 — Smart Contracts

Learn:

1. Solidity
2. Contract structure
3. Functions
4. Structs
5. Mappings
6. Modifiers
7. Events
8. Access control
9. Deployment
10. Contract testing

---

## Phase 4 — Web3 Integration

Learn:

1. ABI
2. Contract address
3. Ethers.js
4. MetaMask connection
5. Read contract
6. Write transaction
7. Transaction confirmation
8. Event handling

---

## Phase 5 — IPFS

Learn:

1. IPFS basics
2. CID
3. Uploading files
4. Pinning
5. Pinata API
6. CID storage in smart contract
7. Document verification

---

## Phase 6 — GIS

Learn:

1. GIS basics
2. Coordinates
3. GeoJSON
4. Parcel boundaries
5. Map visualization
6. Linking land ID with parcel data

---

# 18. What We Actually Need for the MVP

### Must Learn + Must Use

```text
React
   +
Node.js
   +
Express.js
   +
MongoDB
   +
Solidity
   +
Ethereum
   +
Ethers.js
   +
MetaMask
   +
IPFS
```

### Add After Core System Works

```text
GIS
   +
QR Verification
   +
Government API Simulation
   +
Advanced RBAC
```

### Advanced / Optional

```text
DID
   +
Verifiable Credentials
   +
Biometrics
   +
Zero-Knowledge Proofs
   +
AI Fraud Detection
```

---

# 19. Terms That Must Be Clearly Understood Before Presentation

| Term | One-Line Meaning |
|---|---|
| Blockchain | Distributed tamper-evident ledger |
| Ethereum | Blockchain platform supporting smart contracts |
| Smart Contract | Program running on blockchain |
| Solidity | Ethereum smart-contract language |
| Wallet | Interface for blockchain accounts/transactions |
| MetaMask | Common Ethereum wallet/browser extension |
| Transaction | Blockchain operation |
| Gas | Cost of blockchain computation |
| Hash | Cryptographic fingerprint |
| IPFS | Distributed off-chain file storage |
| CID | IPFS content identifier |
| Web3 | Blockchain-enabled decentralized web model |
| Ethers.js | JavaScript Ethereum interaction library |
| ABI | Interface for calling a smart contract |
| Testnet | Blockchain network for testing |
| RBAC | Access control based on user roles |
| DID | Decentralized digital identifier |
| GIS | Geographic information system |
| Cadastral | Land-parcel/land-administration information |
| Interoperability | Ability of systems to exchange/use data |
| Legacy System | Existing older system still in use |
| On-chain | Stored/recorded on blockchain |
| Off-chain | Stored outside blockchain |
| Registrar | Authorized land-registration authority |
| Tamper-evident | Modification can be detected |
| Digital Signature | Cryptographic authorization proof |

---

# 20. Important Conceptual Distinctions

### Blockchain ≠ Database

Blockchain is primarily used for trusted transaction history and integrity.

### IPFS ≠ Blockchain

IPFS stores files; blockchain stores trusted references/transactions.

### Authentication ≠ Authorization

Authentication = **Who are you?**

Authorization = **What can you do?**

### Hash ≠ Encryption

Hashing creates a fingerprint.

Encryption protects data so it can later be decrypted with the appropriate key.

### Blockchain ≠ Government Authority

The registrar/government remains responsible for legal verification and approval in the proposed workflow.

### Immutable ≠ Correct

Blockchain can preserve an incorrect record permanently if incorrect information is approved and recorded.

---

# 21. Final Technology Relationship

```text
                    ┌───────────────┐
                    │   React.js    │
                    │   Frontend    │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Node + Express│
                    │    REST API   │
                    └───┬─────┬─────┘
                        │     │
              ┌─────────┘     └──────────┐
              ▼                           ▼
        ┌───────────┐              ┌───────────┐
        │  MongoDB  │              │    IPFS   │
        │ App Data  │              │ Documents │
        └───────────┘              └─────┬─────┘
                                         │
                                         ▼
                                       CID
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ Smart Contract│
                                  │   Solidity    │
                                  └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │   Ethereum   │
                                  │  Blockchain  │
                                  └──────┬───────┘
                                         │
                           ┌─────────────┴─────────────┐
                           ▼                           ▼
                       MetaMask                      GIS
                       Identity                    Land Map
```

---

# 22. Recommended Learning Order

```text
JavaScript
    →
Node.js + Express
    →
MongoDB
    →
React
    →
Blockchain Fundamentals
    →
Ethereum + MetaMask
    →
Solidity
    →
Smart Contracts
    →
Ethers.js
    →
IPFS + Pinata
    →
GIS
    →
Integration
    →
Testing
```

---

# 23. Final Rule for the Project

> **Do not learn every blockchain technology before starting implementation.**

Use an incremental approach:

```text
Learn → Build → Test → Integrate → Improve
```

Start with the **core land-registration workflow**, then add IPFS, GIS, identity and interoperability one layer at a time.

---

## Source Basis

This terminology and technology plan is derived from the supplied project/literature material, including the identified technologies, workflow actors, architecture, and research gaps.

Where a technology is marked **Advanced / Optional**, it should not be treated as a committed project requirement.
