/* =========================================================
   BLOCKCHAIN LAND RECORD MANAGEMENT SYSTEM
   FRONTEND V2
   ========================================================= */

const API_BASE = "http://localhost:3000/api";

let walletAddress = null;
let identity = null;
let blockchainStatus = null;
let citizens = [];
let currentRequests = [];
let currentLands = [];


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);


function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "-";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}


function hide(id) {

    $(id)?.classList.add("hidden");
}


function show(id) {

    $(id)?.classList.remove("hidden");
}


function roleLabel(role) {

    const labels = {

        PUBLIC:
            "Public",

        CITIZEN:
            "Citizen",

        LAND_ADMIN_OFFICER:
            "Land Administration Officer",

        SUPERVISORY_AUTHORITY:
            "Supervisory Authority"
    };

    return labels[role] || role || "Public";
}

/* =========================================================
   ROLE-BASED NAVIGATION
   ========================================================= */

function configureNavigation() {

    const navigation =
        $("mainNavigation");

    if (!navigation) {
        return;
    }


    const buttons =
        navigation.querySelectorAll(
            ".nav-btn"
        );


    /* -----------------------------------------
       PUBLIC
       ----------------------------------------- */

    if (!identity) {

        navigation.classList.add(
            "hidden"
        );

        return;
    }


    navigation.classList.remove(
        "hidden"
    );


    let labels = {};


    /* -----------------------------------------
       CITIZEN
       ----------------------------------------- */

    if (
        identity.role ===
        "CITIZEN"
    ) {

        labels = {

            dashboard:
                "Dashboard",

            lands:
                "My Land",

            requests:
                "My Requests",

            documents:
                "My Documents",

            history:
                "Land History",

            audit:
                null
        };
    }


    /* -----------------------------------------
       LAND ADMINISTRATION OFFICER
       ----------------------------------------- */

    else if (
        identity.role ===
        "LAND_ADMIN_OFFICER"
    ) {

        labels = {

            dashboard:
                "Dashboard",

            lands:
                "Regional Registry",

            requests:
                "Review Requests",

            documents:
                "Registry Documents",

            history:
                "Regional History",

            audit:
                "Regional Audit"
        };
    }


    /* -----------------------------------------
       SUPERVISORY AUTHORITY
       ----------------------------------------- */

    else if (
        identity.role ===
        "SUPERVISORY_AUTHORITY"
    ) {

        labels = {

            dashboard:
                "Dashboard",

            lands:
                "Land Registry",

            requests:
                "Transactions",

            documents:
                "Documents",

            history:
                "Land History",

            audit:
                "System Audit"
        };
    }


    buttons.forEach(
        button => {

            const page =
                button.dataset.page;

            const label =
                labels[page];


            if (
                label === null ||
                label === undefined
            ) {

                button.classList.add(
                    "hidden"
                );

                return;
            }


            button.classList.remove(
                "hidden"
            );


            button.textContent =
                label;
        }
    );
}
/* =========================================================
   REGION LABEL
   ========================================================= */

function regionLabel(regionId) {

    const regions = {

        "REGION-01":
            "Riverland Zone",

        "REGION-02":
            "Greenfield Zone"
    };

    return (
        regions[regionId] ||
        regionId ||
        "-"
    );
}


/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function extractData(result) {

    if (!result) {
        return null;
    }

    if (result.data !== undefined) {
        return result.data;
    }

    if (result.identity !== undefined) {
        return result.identity;
    }

    return result;
}


function extractArray(result) {

    if (Array.isArray(result)) {
        return result;
    }

    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (Array.isArray(result?.lands)) {
        return result.lands;
    }

    if (Array.isArray(result?.requests)) {
        return result.requests;
    }

    if (Array.isArray(result?.documents)) {
        return result.documents;
    }

    if (Array.isArray(result?.events)) {
        return result.events;
    }

    if (Array.isArray(result?.audit)) {
        return result.audit;
    }

    return [];
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function notify(message, type = "info") {

    const notification =
        $("notification");

    if (!notification) {
        return;
    }

    notification.textContent =
        message;

    notification.className =
        `notification ${type}`;

    notification.classList.remove(
        "hidden"
    );

    clearTimeout(
        window.notificationTimer
    );

    window.notificationTimer =
        setTimeout(
            () => {
                notification.classList.add(
                    "hidden"
                );
            },
            5000
        );
}


/* =========================================================
   API
   ========================================================= */

async function api(
    path,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE}${path}`,
            {
                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );

    const text =
        await response.text();

    let result = {};

    try {

        result =
            text
                ? JSON.parse(text)
                : {};

    } catch {

        result = {
            message: text
        };
    }


    if (!response.ok) {

        const error =
            new Error(
                result.message ||
                result.error ||
                `Request failed (${response.status})`
            );

        error.status =
            response.status;

        throw error;
    }

    return result;
}


/* =========================================================
   WALLET / LOGIN
   ========================================================= */

async function connectWallet() {

    if (!window.ethereum) {

        notify(
            "MetaMask is not installed.",
            "error"
        );

        return;
    }


    try {

        const accounts =
            await window.ethereum.request({
                method:
                    "eth_requestAccounts"
            });


        if (
            !accounts ||
            !accounts.length
        ) {

            throw new Error(
                "No MetaMask account was selected."
            );
        }


        walletAddress =
            accounts[0].toLowerCase();


        sessionStorage.setItem(
            "lr_wallet",
            walletAddress
        );


        const registered =
            await loadIdentity();


        await loadBlockchain();


        if (!registered) {

            notify(
                "This MetaMask account is not registered in the land-record system.",
                "error"
            );

            updateSessionUI();

            return;
        }


        updateSessionUI();


        await initializeApplication();


        notify(
            `Connected as ${identity.name}.`,
            "success"
        );


    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   IDENTITY
   ========================================================= */

async function loadIdentity() {

    if (!walletAddress) {

        identity = null;

        return false;
    }


    try {

        let result;


        try {

            result =
                await api(
                    `/identity/wallet/${encodeURIComponent(walletAddress)}`
                );

        } catch {

            result =
                await api(
                    `/identity/${encodeURIComponent(walletAddress)}`
                );
        }


        identity =
            extractData(result);


        return !!identity;


    } catch (error) {

        console.warn(
            "Identity lookup failed:",
            error.message
        );

        identity = null;

        return false;
    }
}


/* =========================================================
   BLOCKCHAIN STATUS
   ========================================================= */

async function loadBlockchain() {

    try {

        const result =
            await api(
                "/blockchain/status"
            );


        blockchainStatus =
            extractData(result);


        if ($("networkBadge")) {

            $("networkBadge").textContent =
                "Blockchain Online";

            $("networkBadge").className =
                "badge online";
        }

        return true;


    } catch (error) {

        blockchainStatus = null;


        if ($("networkBadge")) {

            $("networkBadge").textContent =
                "Blockchain Offline";

            $("networkBadge").className =
                "badge offline";
        }

        return false;
    }
}


/* =========================================================
   SESSION UI
   ========================================================= */

function updateSessionUI() {

    const loggedIn =
        !!identity;


    $("connectWalletBtn")
        ?.classList.toggle(
            "hidden",
            loggedIn
        );


    $("logoutWalletBtn")
        ?.classList.toggle(
            "hidden",
            !loggedIn
        );


    if ($("sessionLabel")) {

        $("sessionLabel").textContent =
            loggedIn
                ? `${identity.name} · ${roleLabel(identity.role)}`
                : "Public";
    }


    $("mainNavigation")
        ?.classList.toggle(
            "hidden",
            !loggedIn
        );

    configureNavigation();

    $("publicHero")
        ?.classList.toggle(
            "hidden",
            loggedIn
        );
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutApplication() {

    walletAddress = null;

    identity = null;

    blockchainStatus = null;

    currentRequests = [];

    currentLands = [];


    sessionStorage.removeItem(
        "lr_wallet"
    );


    updateSessionUI();


    renderPublicDashboard();


    showPage("dashboard");


    notify(
        "Application session logged out.",
        "info"
    );
}


/* =========================================================
   APPLICATION INITIALIZATION
   ========================================================= */

async function initializeApplication() {

    if (!identity) {

        renderPublicDashboard();

        return;
    }


    configureRoleActions();


    configureRequestForm();


    await Promise.allSettled([

        loadDashboard(),

        loadRequests(),

        loadDocuments(),

        loadAudit()

    ]);


    showPage("dashboard");
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(page) {

    /*
     * Public users are allowed to use only
     * the public dashboard and land search.
     */

    if (
        !identity &&
        page !== "dashboard" &&
        page !== "lands"
    ) {

        page = "dashboard";
    }


    document
        .querySelectorAll(".page")
        .forEach(
            section => {
                section.classList.add(
                    "hidden"
                );
            }
        );


    const target =
        $(`page-${page}`);


    if (target) {

        target.classList.remove(
            "hidden"
        );
    }


    document
        .querySelectorAll(".nav-btn")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page === page
                );
            }
        );


    switch (page) {

        case "dashboard":

            loadDashboard();

            break;


        case "lands":

            loadAllLands();

            break;


        case "requests":

            if (!identity) {
                break;
            }

            configureRequestForm();

            loadRequests();

            break;


        case "documents":

            if (!identity) {
                break;
            }

            loadDocuments();

            break;


        case "history":

            if (!identity) {
                break;
            }

            break;


        case "audit":

            if (
        !identity ||
        (
            identity.role !==
                "LAND_ADMIN_OFFICER" &&
            identity.role !==
                "SUPERVISORY_AUTHORITY"
        )
    ) {

        showPage(
            "dashboard"
        );

        return;
    }


    loadAudit();

    break;
    }
}


/* =========================================================
   PUBLIC DASHBOARD
   ========================================================= */

function renderPublicDashboard() {

    $("dashboardTitle").textContent =
        "Public Land Search";


    $("dashboardSubtitle").textContent =
        "Search publicly permitted land information.";


    $("statsGrid").innerHTML = `

        <div class="stat">

            <span>
                Access
            </span>

            <strong>
                Public
            </strong>

            <small>
                Limited registry view
            </small>

        </div>


        <div class="stat">

            <span>
                Blockchain
            </span>

            <strong>
                ${
                    blockchainStatus
                        ? "Online"
                        : "Offline"
                }
            </strong>

            <small>
                Live network status
            </small>

        </div>

    `;


    $("roleDashboard").innerHTML = `

        <div class="card">

            <div class="card-title">

                <div>

                    <span class="eyebrow">
                        PUBLIC REGISTRY
                    </span>

                    <h3>
                        Search the land registry
                    </h3>

                    <p>
                        Search by Land ID or Survey Number.
                        Only permitted public information
                        is displayed.
                    </p>

                </div>

            </div>


            <button
                class="btn primary"
                onclick="showPage('lands')"
            >
                Search Land
            </button>

        </div>

    `;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    if (!identity) {

        renderPublicDashboard();

        return;
    }


    try {

        const landResult =
            await api("/lands");


        let lands =
            extractArray(
                landResult
            );


        const requestResult =
            await api("/requests");


        let requests =
            extractArray(
                requestResult
            );


        /* -----------------------------------------
           CITIZEN
           ----------------------------------------- */

        if (
            identity.role ===
            "CITIZEN"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.currentOwnerId ===
                        identity.userId
                );


            requests =
                requests.filter(
                    request =>
                        request.requesterId ===
                            identity.userId ||

                        request.sellerId ===
                            identity.userId ||

                        request.buyerId ===
                            identity.userId
                );
        }


        /* -----------------------------------------
           LAND OFFICER
           ----------------------------------------- */

        else if (
            identity.role ===
            "LAND_ADMIN_OFFICER"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.regionId ===
                        identity.regionId
                );
        }


        currentLands =
            lands;


        currentRequests =
            requests;


        renderDashboardStats(
            lands,
            requests
        );


        renderRoleDashboard(
            lands,
            requests
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        notify(
            "Unable to refresh dashboard.",
            "error"
        );
    }
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function renderDashboardStats(
    lands,
    requests
) {

    const pending =
        requests.filter(
            request =>
                request.status !==
                    "COMPLETED" &&

                request.status !==
                    "REJECTED"
        ).length;


    const completed =
        requests.filter(
            request =>
                request.status ===
                "COMPLETED"
        ).length;


    $("statsGrid").innerHTML = `

        <div class="stat">

            <span>
                Land Records
            </span>

            <strong>
                ${lands.length}
            </strong>

            <small>
                ${
                    identity.role === "CITIZEN"
                        ? "Currently owned"
                        : "Accessible records"
                }
            </small>

        </div>


        <div class="stat">

            <span>
                Pending Requests
            </span>

            <strong>
                ${pending}
            </strong>

            <small>
                Active workflow
            </small>

        </div>


        <div class="stat">

            <span>
                Completed
            </span>

            <strong>
                ${completed}
            </strong>

            <small>
                Registered transactions
            </small>

        </div>


        <div class="stat">

            <span>
                Blockchain
            </span>

            <strong>
                ${
                    blockchainStatus
                        ? "Online"
                        : "Offline"
                }
            </strong>

            <small>
                Local Ganache network
            </small>

        </div>

    `;
}


/* =========================================================
   ROLE DASHBOARD
   ========================================================= */

function renderRoleDashboard(
    lands,
    requests
) {

    let cards = [];


    /* -----------------------------------------
       CITIZEN
       ----------------------------------------- */

    if (
        identity.role ===
        "CITIZEN"
    ) {

        cards = [

            {
                title:
                    "My Land",

                value:
                    `${lands.length} record(s)`,

                description:
                    "View land currently registered to your account.",

                action:
                    "showPage('lands')"
            },


            {
                title:
                    "Requests",

                value:
                    `${requests.length} request(s)`,

                description:
                    "Create transfers and monitor land modifications.",

                action:
                    "showPage('requests')"
            },


            {
                title:
                    "Documents",

                value:
                    "Registered records",

                description:
                    "View preliminary and final system documents.",

                action:
                    "showPage('documents')"
            }

        ];
    }


    /* -----------------------------------------
       LAND ADMINISTRATION OFFICER
       ----------------------------------------- */

    else if (
        identity.role ===
        "LAND_ADMIN_OFFICER"
    ) {

        const reviewCount =
            requests.filter(
                request =>
                    request.status ===
                    "PENDING_AUTHORITY_REVIEW"
            ).length;


        cards = [

            {
                title:
                    "Regional Registry",

                value:
                    `${lands.length} parcel(s)`,

                description:
                    `Land records within ${regionLabel(identity.regionId)}.`,

                action:
                    "showPage('lands')"
            },


            {
                title:
                    "Pending Review",

                value:
                    `${reviewCount} request(s)`,

                description:
                    "Validate and process citizen requests.",

                action:
                    "showPage('requests')"
            },


            {
                title:
                    "Officer Operations",

                value:
                    "Register / Allocate",

                description:
                    "Manage authorized land administration operations.",

                action:
                    "showPage('lands')"
            }

        ];
    }


    /* -----------------------------------------
       SUPERVISOR
       ----------------------------------------- */

    else if (
        identity.role ===
        "SUPERVISORY_AUTHORITY"
    ) {

        cards = [

            {
                title:
                    "Registry",

                value:
                    `${lands.length} record(s)`,

                description:
                    "System-wide land overview.",

                action:
                    "showPage('lands')"
            },


            {
                title:
                    "Transactions",

                value:
                    `${requests.length} request(s)`,

                description:
                    "Review system transaction lifecycle.",

                action:
                    "showPage('requests')"
            },


            {
                title:
                    "Audit",

                value:
                    "System activity",

                description:
                    "Inspect administrative and transaction activity.",

                action:
                    "showPage('audit')"
            }

        ];
    }


    $("roleDashboard").innerHTML = `

        <div class="card-grid">

            ${
                cards
                    .map(
                        card => `

                        <article class="card">

                            <span class="eyebrow">
                                ${escapeHtml(card.title)}
                            </span>

                            <h3>
                                ${escapeHtml(card.value)}
                            </h3>

                            <p>
                                ${escapeHtml(card.description)}
                            </p>

                            <button
                                class="btn secondary"
                                onclick="${card.action}"
                            >
                                Open
                            </button>

                        </article>

                    `
                    )
                    .join("")
            }

        </div>

    `;
}


/* =========================================================
   ROLE ACTIONS
   ========================================================= */

function configureRoleActions() {

    const actions =
        $("landActions");

    if (!actions) {
        return;
    }

    if (
        identity?.role ===
        "LAND_ADMIN_OFFICER"
    ) {

        actions.innerHTML = `

            <div class="panel-heading">

                <div>

                    <span class="eyebrow">
                        OFFICER OPERATIONS
                    </span>

                    <h3>
                        Regional Land Administration
                    </h3>

                    <p>
                        Register new parcels or allocate
                        available government land.
                    </p>

                </div>

            </div>

            <div class="actions">

                <button
                    id="registerLandButton"
                    type="button"
                    class="btn primary"
                    onclick="openRegister()"
                >
                    Register New Land
                </button>

                <button
                    id="allocationButton"
                    type="button"
                    class="btn secondary"
                    onclick="openAllocation()"
                >
                    Allocate Government Land
                </button>

            </div>
        `;

        return;
    }

    actions.innerHTML = "";
}

/* =========================================================
   LAND REGISTRY
   ========================================================= */

async function loadAllLands() {

    /*
     * Public users must never receive the complete
     * registry through the "Show Records" action.
     */

    if (!identity) {

        notify(
            "Public access requires a specific Land ID or Survey Number search.",
            "info"
        );

        return;
    }


    try {

        const result =
            await api("/lands");


        let lands =
            extractArray(result);


        /* CITIZEN */

        if (
            identity.role ===
            "CITIZEN"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.currentOwnerId ===
                        identity.userId
                );
        }


        /* OFFICER */

        else if (
            identity.role ===
            "LAND_ADMIN_OFFICER"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.regionId ===
                        identity.regionId
                );
        }


        currentLands =
            lands;


        renderLands(
            lands
        );


    } catch (error) {

        showError(
            "landResults",
            error.message
        );
    }
}


/* =========================================================
   LAND SEARCH
   ========================================================= */

async function searchLand() {

    const input =
        $("landSearchInput");


    const query =
        input?.value.trim();


    if (!query) {

        notify(
            "Enter a Land ID or Survey Number.",
            "error"
        );

        return;
    }


    try {

        let land = null;


        /* -----------------------------------------
           LAND ID
           ----------------------------------------- */

        if (
            query
                .toUpperCase()
                .startsWith("LR-")
        ) {

            const result =
                await api(
                    `/lands/${encodeURIComponent(query)}`
                );


            land =
                extractData(
                    result
                );
        }


        /* -----------------------------------------
           SURVEY NUMBER
           ----------------------------------------- */

        else {

            const result =
                await api(
                    "/lands"
                );


            const lands =
                extractArray(
                    result
                );


            land =
                lands.find(
                    item =>
                        String(
                            item.surveyNumber
                        ).toLowerCase() ===
                        query.toLowerCase()
                );
        }


        renderLands(
            land
                ? [land]
                : []
        );


    } catch (error) {

        showError(
            "landResults",
            error.message
        );
    }
}


/* =========================================================
   LAND CARD
   ========================================================= */

function renderLands(lands) {

    if (!lands.length) {

        $("landResults").innerHTML = `

            <div class="empty">

                <h3>
                    No land records found
                </h3>

                <p>
                    No accessible record matched
                    the current search.
                </p>

            </div>

        `;

        return;
    }


    const isPublic =
        !identity;


    $("landResults").innerHTML =

        lands
            .map(
                land => `

                <article class="record">

                    <div class="record-head">

                        <div>

                            <span class="eyebrow">

                                ${escapeHtml(
                                    land.landId
                                )}

                            </span>


                            <h3>

                                Survey
                                ${escapeHtml(
                                    land.surveyNumber
                                )}

                            </h3>


                            <p class="record-sub">

                                ${escapeHtml(
                                    land.location
                                )}

                            </p>

                        </div>


                        <span class="chip">

                            ${escapeHtml(
                                land.status
                            )}

                        </span>

                    </div>


                    <div class="grid">

                        ${gridValue(
                            "Parcel Area",
                            `${land.parcelArea ?? "-"} ${
                                land.areaUnit ?? ""
                            }`
                        )}


                        ${gridValue(
                            "Land Type",
                            land.landType
                        )}


                        ${gridValue(
                            "Land Use",
                            land.landUseType
                        )}


                        ${gridValue(
                            "Zone",
                            land.zone
                        )}


                        ${gridValue(
                            "Region",
                            regionLabel(
                                land.regionId
                            )
                        )}


                        ${gridValue(
                            "Owner",
                            isPublic
                                ? "Restricted"
                                : land.currentOwnerId ||
                                  "GOVERNMENT"
                        )}


                        ${gridValue(
                            "Ownership",
                            isPublic
                                ? "Restricted"
                                : land.ownershipStatus
                        )}


                        ${gridValue(
                            "Origin",
                            land.origin
                        )}


                        ${
                            !isPublic
                                ? gridValue(
                                    "Coordinates",
                                    land.latitude &&
                                    land.longitude
                                        ? `${land.latitude}, ${land.longitude}`
                                        : "-"
                                )
                                : ""
                        }

                    </div>


                    <div class="actions">

                        ${
                            !isPublic
                                ? `

                                    <button
                                        class="btn secondary"
                                        onclick="loadHistoryFor('${escapeHtml(
                                            land.landId
                                        )}')"
                                    >
                                        View History
                                    </button>

                                `
                                : ""
                        }


                        ${
                            identity?.role ===
                                "CITIZEN" &&

                            land.currentOwnerId ===
                                identity.userId

                                ? `

                                    <button
                                        class="btn primary"
                                        onclick="startRequest('${escapeHtml(
                                            land.landId
                                        )}')"
                                    >
                                        Transfer / Modify
                                    </button>

                                `
                                : ""
                        }

                    </div>

                </article>

            `
            )
            .join("");
}


/* =========================================================
   GRID VALUE
   ========================================================= */

function gridValue(
    label,
    value
) {

    return `

        <div>

            <span>
                ${escapeHtml(label)}
            </span>

            <strong>
                ${escapeHtml(value)}
            </strong>

        </div>

    `;
}


/* =========================================================
   REGISTER LAND
   ========================================================= */

function openRegister() {

    if (
        identity?.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        notify(
            "Officer access required.",
            "error"
        );

        return;
    }


    $("registerRegion").value =
        regionLabel(
            identity.regionId
        );


    show(
        "registerLandPanel"
    );
}


async function registerLand(event) {

    event.preventDefault();


    try {

        const payload = {

            surveyNumber:
                $("registerSurveyNumber")
                    .value
                    .trim(),

            parcelArea:
                Number(
                    $("registerParcelArea")
                        .value
                ),

            areaUnit:
                $("registerAreaUnit")
                    .value,

            location:
                $("registerLocation")
                    .value
                    .trim(),

            latitude:
                $("registerLatitude")
                    .value
                    ? Number(
                        $("registerLatitude")
                            .value
                    )
                    : null,

            longitude:
                $("registerLongitude")
                    .value
                    ? Number(
                        $("registerLongitude")
                            .value
                    )
                    : null,

            landType:
                $("registerLandType")
                    .value,

            landUseType:
                $("registerLandUse")
                    .value
                    .trim(),

            zone:
                $("registerZone")
                    .value
                    .trim(),

            /*
             * IMPORTANT:
             * Send the actual region ID to the backend.
             * The UI only displays the human-readable label.
             */

            regionId:
                identity.regionId,

            createdBy:
                identity.userId,

            origin:
                "AUTHORITY"
        };


        const result =
            await api(
                "/lands",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        hide(
            "registerLandPanel"
        );


        event.target.reset();


        notify(
            `Land ${
                extractData(result)?.landId ||
                "record"
            } registered successfully.`,
            "success"
        );


        await loadAllLands();

        await loadDashboard();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   CITIZENS
   ========================================================= */

async function loadCitizens() {

    const result =
        await api(
            "/users/citizens"
        );


    citizens =
        extractArray(
            result
        );


    return citizens;
}


/* =========================================================
   GOVERNMENT LAND ALLOCATION
   ========================================================= */

async function openAllocation() {

    if (
        identity?.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        notify(
            "Officer access required.",
            "error"
        );

        return;
    }


    try {

        const list =
            await loadCitizens();


        const select =
            $("allocationCitizenId");


        select.innerHTML = `

            <option value="">
                Select Citizen
            </option>

        `;


        list.forEach(
            citizen => {

                select.insertAdjacentHTML(
                    "beforeend",

                    `

                    <option
                        value="${escapeHtml(
                            citizen.userId
                        )}"
                    >

                        ${escapeHtml(
                            citizen.userId
                        )}

                        ·

                        ${escapeHtml(
                            citizen.name
                        )}

                    </option>

                    `
                );
            }
        );


        show(
            "allocationPanel"
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


async function allocateLand(event) {

    event.preventDefault();


    try {

        const payload = {

            landId:
                $("allocationLandId")
                    .value
                    .trim(),

            citizenId:
                $("allocationCitizenId")
                    .value,

            officerId:
                identity.userId,

            regionId:
                identity.regionId,

            reason:
                $("allocationReason")
                    .value
                    .trim()
        };


        await api(
            "/allocations",
            {
                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


        hide(
            "allocationPanel"
        );


        event.target.reset();


        notify(
            "Government land allocation completed.",
            "success"
        );


        await loadAllLands();

        await loadDashboard();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}
/* =========================================================
   REQUEST FORM
   ========================================================= */

function configureRequestForm() {

    const typeSelect =
        $("requestType");

    if (!typeSelect) {
        return;
    }


    typeSelect.onchange =
        handleRequestTypeChange;


    handleRequestTypeChange();
}


function handleRequestTypeChange() {

    const type =
        $("requestType")?.value;


    const buyerField =
        $("requestBuyerField");


    const areaField =
        $("requestAreaField");


    const landUseField =
        $("requestLandUseField");


    const landTypeField =
        $("requestLandTypeField");


    const detailsField =
        $("requestDetailsField");


    /*
     * Hide every conditional field first.
     */

    [
        buyerField,
        areaField,
        landUseField,
        landTypeField
    ]
        .forEach(
            element => {

                element
                    ?.classList
                    .add("hidden");

            }
        );


    /*
     * Ownership transfer
     */

    if (
        type ===
        "OWNERSHIP_TRANSFER"
    ) {

        buyerField
            ?.classList
            .remove("hidden");

        loadCitizens()
            .then(
                populateBuyerSelect
            )
            .catch(
                error =>
                    console.warn(
                        "Unable to load buyers:",
                        error.message
                    )
            );
    }


    /*
     * Area modification
     */

    if (
        type ===
        "AREA_MODIFICATION"
    ) {

        areaField
            ?.classList
            .remove("hidden");
    }


    /*
     * Land-use modification
     */

    if (
        type ===
        "LAND_USE_MODIFICATION"
    ) {

        landUseField
            ?.classList
            .remove("hidden");
    }


    /*
     * Land-type modification
     */

    if (
        type ===
        "LAND_TYPE_MODIFICATION"
    ) {

        landTypeField
            ?.classList
            .remove("hidden");
    }


    if (detailsField) {

        detailsField
            .querySelector("textarea")
            ?.setAttribute(
                "placeholder",
                requestDetailsPlaceholder(type)
            );
    }
}


function requestDetailsPlaceholder(type) {

    switch (type) {

        case "OWNERSHIP_TRANSFER":

            return "Enter transfer reason or transaction details.";

        case "AREA_MODIFICATION":

            return "Explain the reason for the area/dimension modification.";

        case "LAND_USE_MODIFICATION":

            return "Explain the proposed change in land use.";

        case "LAND_TYPE_MODIFICATION":

            return "Explain the proposed change in land type.";

        case "OTHER_MODIFICATION":

            return "Describe the requested land-record modification.";

        default:

            return "Provide the reason and supporting details.";
    }
}


function populateBuyerSelect(list) {

    const select =
        $("requestBuyerId");


    if (!select) {
        return;
    }


    select.innerHTML = `

        <option value="">
            Select Buyer
        </option>

    `;


    list
        .filter(
            citizen =>
                citizen.userId !==
                identity?.userId
        )
        .forEach(
            citizen => {

                select.insertAdjacentHTML(
                    "beforeend",

                    `

                    <option
                        value="${escapeHtml(
                            citizen.userId
                        )}"
                    >

                        ${escapeHtml(
                            citizen.userId
                        )}

                        ·

                        ${escapeHtml(
                            citizen.name
                        )}

                    </option>

                    `
                );
            }
        );
}


/* =========================================================
   START REQUEST
   ========================================================= */

async function startRequest(
    landId
) {

    if (
        identity?.role !==
        "CITIZEN"
    ) {

        notify(
            "Only citizens can create land requests.",
            "error"
        );

        return;
    }


    const land =
        currentLands.find(
            item =>
                item.landId ===
                landId
        );


    if (!land) {

        try {

            const result =
                await api(
                    `/lands/${encodeURIComponent(
                        landId
                    )}`
                );


            const fetchedLand =
                extractData(
                    result
                );


            if (fetchedLand) {

                currentLands.push(
                    fetchedLand
                );
            }

        } catch (error) {

            notify(
                error.message,
                "error"
            );

            return;
        }
    }


    const selectedLand =
        currentLands.find(
            item =>
                item.landId ===
                landId
        );


    if (
        !selectedLand
    ) {

        notify(
            "Land record could not be loaded.",
            "error"
        );

        return;
    }


    if (
        selectedLand.currentOwnerId !==
        identity.userId
    ) {

        notify(
            "You can only modify land registered to your account.",
            "error"
        );

        return;
    }


    if (
        selectedLand.ownerType ===
        "GOVERNMENT"
    ) {

        notify(
            "Government-owned land cannot be transferred or modified by a citizen.",
            "error"
        );

        return;
    }


    const landInput =
        $("requestLandId");


    if (landInput) {

        landInput.value =
            selectedLand.landId;
    }


    const typeSelect =
        $("requestType");


    if (typeSelect) {

        typeSelect.value =
            "OWNERSHIP_TRANSFER";

        handleRequestTypeChange();
    }


    const areaInput =
        $("requestNewArea");


    if (areaInput) {

        areaInput.value =
            selectedLand.parcelArea || "";
    }


    const landUseInput =
        $("requestNewLandUse");


    if (landUseInput) {

        landUseInput.value =
            selectedLand.landUseType || "";
    }


    const landTypeInput =
        $("requestNewLandType");


    if (landTypeInput) {

        landTypeInput.value =
            selectedLand.landType || "";
    }


    showPage("requests");

/*
 * Open the citizen request form automatically
 * when the citizen starts a request from a land record.
 */
show("requestPanel");

document
    .getElementById(
        "requestPanel"
    )
    ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   CREATE REQUEST
   ========================================================= */

async function createLandRequest(
    event
) {

    event.preventDefault();


    if (
        identity?.role !==
        "CITIZEN"
    ) {

        notify(
            "Only citizens can create requests.",
            "error"
        );

        return;
    }


    const type =
        $("requestType")
            ?.value;


    const landId =
        $("requestLandId")
            ?.value
            .trim();


    if (!landId) {

        notify(
            "Select a land record first.",
            "error"
        );

        return;
    }


    const payload = {

        landId,

        requestType:
            type,

        requesterId:
            identity.userId,

        buyerId:
            type === "OWNERSHIP_TRANSFER"
                ? $("requestBuyerId")?.value ||
                  null
                : null,

        requestedArea:
            type === "AREA_MODIFICATION"
                ? Number(
                    $("requestNewArea")
                        ?.value
                )
                : null,

        requestedLandUse:
            type === "LAND_USE_MODIFICATION"
                ? $("requestNewLandUse")
                    ?.value
                    .trim()
                : null,

        requestedLandType:
            type === "LAND_TYPE_MODIFICATION"
                ? $("requestNewLandType")
                    ?.value
                    .trim()
                : null,

        details:
            $("requestDetails")
                ?.value
                .trim() || "",

        reason:
            $("requestDetails")
                ?.value
                .trim() || ""
    };


    try {

        const result =
            await api(
                "/requests",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const request =
            extractData(
                result
            );


        event.target.reset();


        handleRequestTypeChange();


        if (
            request?.document
        ) {

            notify(
                `Request ${request.requestId || ""} created and preliminary document generated.`,
                "success"
            );

        } else {

            notify(
                `Request ${request?.requestId || ""} created successfully.`,
                "success"
            );
        }


        await loadRequests();

        await loadAllLands();

        await loadDashboard();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   REQUEST LIST
   ========================================================= */

async function loadRequests() {
    if (!identity) {
        return;
    }

    try {
        /*
         * Always load the complete request list first.
         * Role-based visibility is handled below.
         */
        const result = await api("/requests");

        let requests = extractArray(result);

        /*
         * ---------------------------------------------------------
         * CITIZEN
         * ---------------------------------------------------------
         * A citizen can see requests connected to their account:
         * requester / seller / buyer.
         */
        if (identity.role === "CITIZEN") {
            requests = requests.filter(request =>
                request.requesterId === identity.userId ||
                request.sellerId === identity.userId ||
                request.buyerId === identity.userId
            );
        }

        /*
         * ---------------------------------------------------------
         * OFFICER
         * ---------------------------------------------------------
         * Officers must see requests belonging to their region.
         *
         * Do NOT depend only on request.regionId because older
         * request records/responses may not contain that field.
         *
         * We therefore verify the request against the officer's
         * regional land records as well.
         */
        else if (identity.role === "LAND_ADMIN_OFFICER") {

            let regionalLands = currentLands;

            /*
             * currentLands may not yet be populated because
             * dashboard/request loading can happen concurrently.
             */
            if (!regionalLands.length) {
                try {
                    const landResult = await api("/lands");

                    regionalLands = extractArray(landResult).filter(
                        land =>
                            land.regionId === identity.regionId
                    );
                } catch (landError) {
                    console.warn(
                        "Unable to load regional lands for request filtering:",
                        landError.message
                    );

                    regionalLands = [];
                }
            }

            const regionalLandIds = new Set(
                regionalLands.map(
                    land => land.landId
                )
            );

            requests = requests.filter(request =>
                request.regionId === identity.regionId ||
                regionalLandIds.has(request.landId)
            );
        }

        /*
         * ---------------------------------------------------------
         * SUPERVISOR
         * ---------------------------------------------------------
         * Supervisor sees the complete request lifecycle.
         */
        else if (
            identity.role === "SUPERVISORY_AUTHORITY"
        ) {
            // No filtering.
        }

        /*
         * ---------------------------------------------------------
         * STATUS FILTER
         * ---------------------------------------------------------
         * The HTML contains requestStatusFilter.
         *
         * ALL = show everything.
         * Otherwise show only the selected status.
         */
        const statusFilter =
            $("requestStatusFilter")?.value || "ALL";

        if (
            statusFilter &&
            statusFilter !== "ALL"
        ) {
            requests = requests.filter(
                request =>
                    request.status === statusFilter
            );
        }

        /*
         * Keep the filtered list available for request actions.
         */
        currentRequests = requests;

        renderRequests(requests);

    } catch (error) {
        showError(
            "requestResults",
            error.message
        );
    }
}

/* =========================================================
   REQUEST CARD
   ========================================================= */

function renderRequests(
    requests
) {

    if (!requests.length) {

        $("requestResults").innerHTML = `

            <div class="empty">

                <h3>
                    No requests found
                </h3>

                <p>
                    There are no requests available
                    for your current role.
                </p>

            </div>

        `;

        return;
    }


    $("requestResults").innerHTML =

        requests
            .map(
                request =>
                    renderRequestCard(
                        request
                    )
            )
            .join("");
}


/* =========================================================
   REQUEST CARD RENDERING
   ========================================================= */

function renderRequestCard(
    request
) {

    const isCitizen =
        identity?.role ===
        "CITIZEN";


    const isOfficer =
        identity?.role ===
        "LAND_ADMIN_OFFICER";


    const isSupervisor =
        identity?.role ===
        "SUPERVISORY_AUTHORITY";


    const status =
        request.status ||
        "UNKNOWN";


    const statusClass =
        statusClassName(
            status
        );


    const validationText =
        request.validationMessage ||
        request.reviewNotes ||
        "";


    let validationHtml =
        "";


    /*
     * Validation / rejection messages
     * are displayed according to the actual
     * request status.
     */

    if (
        validationText
    ) {

        const messageClass =
            status === "REJECTED"
                ? "callout error"
                : status === "APPROVED" ||
                  status === "COMPLETED"
                    ? "callout success"
                    : "callout";


        validationHtml = `

            <div class="${messageClass}">

                ${escapeHtml(
                    validationText
                )}

            </div>

        `;
    }


    let actions = "";


    /*
     * -----------------------------------------
     * BUYER ACCEPTANCE
     * -----------------------------------------
     */

    if (

        isCitizen &&

        request.requestType ===
            "OWNERSHIP_TRANSFER" &&

        request.status ===
            "PENDING_BUYER_ACCEPTANCE" &&

        request.buyerId ===
            identity.userId

    ) {

        actions += `

            <button
                class="btn primary"
                onclick="acceptRequest('${escapeHtml(
                    request.requestId
                )}')"
            >
                Accept Transfer
            </button>

        `;
    }


    /*
     * -----------------------------------------
     * OFFICER REVIEW
     * -----------------------------------------
     */

    if (

        isOfficer &&

        request.status ===
            "PENDING_AUTHORITY_REVIEW"

    ) {

        actions += `

            <button
                class="btn secondary"
                onclick="reviewRequest('${escapeHtml(
                    request.requestId
                )}')"
            >
                Validate
            </button>
        

            <button
                class="btn primary"
                onclick="approveRequest('${escapeHtml(
                    request.requestId
                )}')"
            >
                Approve
            </button>


            <button
                class="btn danger"
                onclick="rejectRequest('${escapeHtml(
                    request.requestId
                )}')"
            >
                Reject
            </button>

        `;
    }


    /*
     * -----------------------------------------
     * SUPERVISORY VIEW
     * -----------------------------------------
     */

    if (
    isSupervisor
) {

    actions += `

        <button
            class="btn secondary"
            onclick="viewRequestDetails('${escapeHtml(
                request.requestId
            )}')"
        >
            View Request
        </button>

    `;
}


    /*
     * -----------------------------------------
     * COMPLETED DOCUMENT
     * -----------------------------------------
     */

    if (
        request.status ===
            "COMPLETED"
    ) {

        actions += `

            <button
                class="btn secondary"
                onclick="loadDocumentsForRequest('${escapeHtml(
                    request.requestId
                )}')"
            >
                View Documents
            </button>

        `;
    }


    return `

        <article class="record request-card">

            <div class="record-head">

                <div>

                    <span class="eyebrow">

                        ${escapeHtml(
                            request.requestId
                        )}

                    </span>


                    <h3>

                        ${escapeHtml(
                            formatRequestType(
                                request.requestType
                            )
                        )}

                    </h3>


                    <p class="record-sub">

                        Land:
                        ${escapeHtml(
                            request.landId
                        )}

                    </p>

                </div>


                <span class="chip ${statusClass}">

                    ${escapeHtml(
                        formatRequestStatus(
                            status
                        )
                    )}

                </span>

            </div>


            <div class="grid">

                ${gridValue(
                    "Requester",
                    request.requesterId
                )}


                ${
                    request.sellerId
                        ? gridValue(
                            "Seller",
                            request.sellerId
                        )
                        : ""
                }


                ${
                    request.buyerId
                        ? gridValue(
                            "Buyer",
                            request.buyerId
                        )
                        : ""
                }


                ${
                    request.regionId
                        ? gridValue(
                            "Region",
                            regionLabel(
                                request.regionId
                            )
                        )
                        : ""
                }


                ${
                    request.requestedArea !==
                    null &&
                    request.requestedArea !==
                    undefined
                        ? gridValue(
                            "Requested Area",
                            `${request.requestedArea} ${
                                request.areaUnit || ""
                            }`
                        )
                        : ""
                }


                ${
                    request.requestedLandUse
                        ? gridValue(
                            "Requested Land Use",
                            request.requestedLandUse
                        )
                        : ""
                }


                ${
                    request.requestedLandType
                        ? gridValue(
                            "Requested Land Type",
                            request.requestedLandType
                        )
                        : ""
                }


                ${gridValue(
                    "Created",
                    formatDate(
                        request.createdAt
                    )
                )}

            </div>


            ${
                request.details ||
                request.reason

                    ? `

                        <div class="request-details">

                            <strong>
                                Request Details
                            </strong>

                            <p>
                                ${escapeHtml(
                                    request.details ||
                                    request.reason
                                )}
                            </p>

                        </div>

                    `

                    : ""
            }


            ${validationHtml}


            ${
                actions
                    ? `

                        <div class="actions">

                            ${actions}

                        </div>

                    `
                    : ""
            }

        </article>

    `;
}


/* =========================================================
   REQUEST TYPE LABEL
   ========================================================= */

function formatRequestType(
    type
) {

    const labels = {

        OWNERSHIP_TRANSFER:
            "Ownership Transfer",

        AREA_MODIFICATION:
            "Land Area Modification",

        LAND_USE_MODIFICATION:
            "Land Use Modification",

        LAND_TYPE_MODIFICATION:
            "Land Type Modification",

        OTHER_MODIFICATION:
            "Other Land Modification"
    };


    return (
        labels[type] ||
        type ||
        "-"
    );
}


/* =========================================================
   REQUEST STATUS LABEL
   ========================================================= */

function formatRequestStatus(
    status
) {

    const labels = {

        DRAFT:
            "Draft",

        PENDING_BUYER_ACCEPTANCE:
            "Pending Buyer Acceptance",

        PENDING_AUTHORITY_REVIEW:
            "Pending Authority Review",

        APPROVED:
            "Approved",

        REJECTED:
            "Rejected",

        COMPLETED:
            "Completed"
    };


    return labels[status] ||
        String(status || "Unknown")
            .replaceAll("_", " ");
}


/* =========================================================
   REQUEST STATUS CLASS
   ========================================================= */

function statusClassName(
    status
) {

    switch (status) {

        case "COMPLETED":
        case "APPROVED":
        case "VALIDATED":    

            return "success";


        case "REJECTED":

            return "danger";


        case "PENDING_BUYER_ACCEPTANCE":
        case "PENDING_AUTHORITY_REVIEW":

            return "warning";


        default:

            return "";
    }
}


/* =========================================================
   BUYER ACCEPTANCE
   ========================================================= */

async function acceptRequest(
    requestId
) {

    if (
        identity?.role !==
        "CITIZEN"
    ) {

        notify(
            "Only the designated buyer can accept a transfer.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            "Accept this ownership transfer?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            "/requests/accept",
            {
                method:
                    "POST",

                body:
                    JSON.stringify({

                        requestId,
                        buyerId:
                            identity.userId
                    })
            }
        );


        notify(
            "Transfer accepted. It is now waiting for authority review.",
            "success"
        );


        await loadRequests();

        await loadDashboard();

        await loadAllLands();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   OFFICER REVIEW / VALIDATION
   ========================================================= */

async function reviewRequest(
    requestId
) {

    if (
        identity?.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        notify(
            "Officer access required.",
            "error"
        );

        return;
    }


    const notes =
        window.prompt(
            "Enter validation notes:",
            "Database and blockchain state verified."
        );


    if (notes === null) {
        return;
    }


    try {

        await api(
            "/requests/review",
            {
                method:
                    "POST",

                body:
                    JSON.stringify({

                        requestId,

                        officerId:
                            identity.userId,

                        reviewNotes:
                            notes.trim() ||
                            "Database and blockchain state verified."
                    })
            }
        );


        notify(
            "Request validated successfully.",
            "success"
        );


        await loadRequests();

        await loadDashboard();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   APPROVE REQUEST
   ========================================================= */

async function approveRequest(
    requestId
) {

    if (
        identity?.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        notify(
            "Officer access required.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            "Approve this request and register the resulting land change?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await api(
                "/requests/approve",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            requestId,

                            officerId:
                                identity.userId
                        })
                }
            );


        const data =
            extractData(
                result
            );


        if (
            data?.document
        ) {

            notify(
                "Request approved and final registered document generated.",
                "success"
            );

        } else {

            notify(
                "Request approved successfully.",
                "success"
            );
        }


        await loadRequests();

        await loadAllLands();

        await loadDashboard();

        await loadDocuments();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   REJECT REQUEST
   ========================================================= */

async function rejectRequest(
    requestId
) {

    if (
        identity?.role !==
        "LAND_ADMIN_OFFICER"
    ) {

        notify(
            "Officer access required.",
            "error"
        );

        return;
    }


    const reason =
        window.prompt(
            "Enter rejection reason:"
        );


    if (
        reason === null ||
        !reason.trim()
    ) {

        notify(
            "A rejection reason is required.",
            "error"
        );

        return;
    }


    try {

        await api(
            "/requests/reject",
            {
                method:
                    "POST",

                body:
                    JSON.stringify({
                        requestId,

                        officerId:
                            identity.userId,

                        reason:
                            reason.trim()
                    })
            }
        );


        notify(
            "Request rejected and recorded.",
            "success"
        );


        await loadRequests();

        await loadAllLands();

        await loadDashboard();


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   REQUEST DETAILS
   ========================================================= */

async function viewRequestDetails(
    requestId
) {

    const request =
        currentRequests.find(
            item =>
                item.requestId ===
                requestId
        );


    if (!request) {

        notify(
            "Request not found.",
            "error"
        );

        return;
    }


    const message = [

        `Request: ${request.requestId}`,

        `Land: ${request.landId}`,

        `Type: ${formatRequestType(
            request.requestType
        )}`,

        `Status: ${formatRequestStatus(
            request.status
        )}`,

        `Requester: ${request.requesterId}`,

        request.sellerId
            ? `Seller: ${request.sellerId}`
            : null,

        request.buyerId
            ? `Buyer: ${request.buyerId}`
            : null,

        request.regionId
            ? `Region: ${regionLabel(
                request.regionId
            )}`
            : null,

        request.details
            ? `Details: ${request.details}`
            : null,

        request.reviewNotes
            ? `Review: ${request.reviewNotes}`
            : null,

        request.validationMessage
            ? `Validation: ${request.validationMessage}`
            : null

    ]
        .filter(Boolean)
        .join("\n");


    window.alert(
        message
    );
}
/* =========================================================
   DOCUMENTS
   ========================================================= */

async function loadDocuments() {

    const container =
        $("documentContent");

    if (!identity) {

        container.innerHTML = `
            <div class="empty">

                <h3>
                    Connect MetaMask
                </h3>

                <p>
                    Registered documents require
                    authenticated access.
                </p>

            </div>
        `;

        return;
    }


    try {

        /* -------------------------------------------------
           LOAD LAND RECORDS
           ------------------------------------------------- */

        const landResult =
            await api("/lands");

        let lands =
            extractArray(landResult);


        /* -------------------------------------------------
           ROLE-BASED LAND VISIBILITY
           ------------------------------------------------- */

        if (
            identity.role ===
            "CITIZEN"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.currentOwnerId ===
                        identity.userId
                );
        }


        else if (
            identity.role ===
            "LAND_ADMIN_OFFICER"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.regionId ===
                        identity.regionId
                );
        }


        /*
         * SUPERVISOR:
         * No filtering.
         * Supervisor can see documents
         * from all land records.
         */


        /* -------------------------------------------------
           LOAD DOCUMENTS FOR EACH VISIBLE LAND
           ------------------------------------------------- */

        const documentMap =
            new Map();


        for (
            const land of lands
        ) {

            try {

                const result =
                    await api(
                        `/documents/land/${encodeURIComponent(
                            land.landId
                        )}`
                    );


                const documents =
                    extractArray(result);


                documents.forEach(
                    document => {

                        if (
                            document?.documentId
                        ) {

                            documentMap.set(
                                document.documentId,
                                {
                                    ...document,
                                    landId:
                                        document.landId ||
                                        land.landId
                                }
                            );

                        }

                    }
                );


            } catch (error) {

                /*
                 * A land record may legitimately
                 * have no documents.
                 */

                console.warn(
                    `Could not load documents for ${land.landId}:`,
                    error.message
                );

            }

        }


        /* -------------------------------------------------
           RENDER
           ------------------------------------------------- */

        renderDocuments(
            Array.from(
                documentMap.values()
            )
        );


    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );

        showError(
            "documentContent",
            error.message
        );

    }

}

/* =========================================================
   DOCUMENTS FOR REQUEST
   ========================================================= */

async function loadDocumentsForRequest(
    requestId
) {

    if (!identity) {
        return;
    }


    try {

        const result =
            await api(
                `/documents/request/${encodeURIComponent(
                    requestId
                )}`
            );


        const documents =
            extractArray(result);


        renderDocuments(
            documents
        );


        showPage(
            "documents"
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   DOCUMENTS FOR LAND
   ========================================================= */

async function loadDocumentsForLand(
    landId
) {

    if (!identity) {
        return;
    }


    try {

        const result =
            await api(
                `/documents/land/${encodeURIComponent(
                    landId
                )}`
            );


        const documents =
            extractArray(result);


        renderDocuments(
            documents
        );


        showPage(
            "documents"
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   DOCUMENT TYPE LABEL
   ========================================================= */

function documentTypeLabel(
    type
) {

    const labels = {

        PRELIMINARY_TRANSACTION_RECORD:
            "Preliminary Transaction Record",

        LAND_ALLOCATION_RECORD:
            "Final Land Allocation Record",

        LAND_TRANSFER_RECORD:
            "Final Land Transfer Record",

        LAND_AREA_MODIFICATION_RECORD:
            "Final Land Area Modification Record",

        LAND_USE_MODIFICATION_RECORD:
            "Final Land Use Modification Record",

        LAND_TYPE_MODIFICATION_RECORD:
            "Final Land Type Modification Record",

        LAND_MODIFICATION_RECORD:
            "Final Land Modification Record"
    };


    return (
        labels[type] ||
        type ||
        "System Record"
    );
}


/* =========================================================
   PRELIMINARY DOCUMENT CHECK
   ========================================================= */

function isPreliminaryDocument(
    document
) {

    return (

        document.documentType ===
            "PRELIMINARY_TRANSACTION_RECORD" ||

        document.documentType ===
            "PRELIMINARY_TRANSFER_RECORD" ||

        document.documentType ===
            "PRELIMINARY_MODIFICATION_RECORD" ||

        String(
            document.documentType || ""
        )
            .toUpperCase()
            .includes("PRELIMINARY")

    );
}


/* =========================================================
   DOCUMENT STATUS
   ========================================================= */

function documentStatus(
    document
) {

    /*
     * Preliminary documents are intentionally
     * NOT presented as blockchain-anchored
     * final records.
     */

    if (
        isPreliminaryDocument(
            document
        )
    ) {

        return {

            label:
                "PRELIMINARY",

            className:
                "warning"
        };
    }


    /*
     * Final document with both IPFS and
     * blockchain anchor.
     */

    if (
        document.ipfsCid &&
        document.blockchainReference
    ) {

        return {

            label:
                "BLOCKCHAIN ANCHORED",

            className:
                "success"
        };
    }


    /*
     * Document uploaded to IPFS but not
     * yet anchored.
     */

    if (
        document.ipfsCid
    ) {

        return {

            label:
                "IPFS STORED",

            className:
                "success"
        };
    }


    return {

        label:
            "SYSTEM RECORD",

        className:
            ""
    };
}


/* =========================================================
   DOCUMENT RENDERING
   ========================================================= */

function renderDocuments(
    documents
) {

    if (!documents.length) {

        $("documentResults").innerHTML = `

            <div class="empty">

                <h3>
                    No documents found
                </h3>

                <p>
                    No documents are available
                    for your current access level.
                </p>

            </div>

        `;

        return;
    }


    $("documentResults").innerHTML =

        documents
            .map(
                document =>
                    renderDocumentCard(
                        document
                    )
            )
            .join("");
}


/* =========================================================
   DOCUMENT CARD
   ========================================================= */

function renderDocumentCard(
    document
) {

    const status =
        documentStatus(
            document
        );


    const preliminary =
        isPreliminaryDocument(
            document
        );


    return `

        <article class="record document-card">

            <div class="record-head">

                <div>

                    <span class="eyebrow">

                        ${escapeHtml(
                            document.documentId
                        )}

                    </span>


                    <h3>

                        ${escapeHtml(
                            documentTypeLabel(
                                document.documentType
                            )
                        )}

                    </h3>


                    <p class="record-sub">

                        ${
                            document.landId
                                ? `Land: ${escapeHtml(
                                    document.landId
                                )}`
                                : "System document"
                        }

                    </p>

                </div>


                <span class="chip ${status.className}">

                    ${status.label}

                </span>

            </div>


            <div class="grid">

                ${
                    document.requestId
                        ? gridValue(
                            "Request",
                            document.requestId
                        )
                        : ""
                }


                ${
                    document.transactionId
                        ? gridValue(
                            "Transaction",
                            document.transactionId
                        )
                        : ""
                }


                ${gridValue(
                    "Created",
                    formatDate(
                        document.createdAt
                    )
                )}


                ${
                    document.sha256Hash
                        ? gridValue(
                            "SHA-256",
                            document.sha256Hash
                        )
                        : ""
                }


                ${
                    document.ipfsCid
                        ? gridValue(
                            "IPFS CID",
                            document.ipfsCid
                        )
                        : ""
                }


                ${
                    document.blockchainReference
                        ? gridValue(
                            "Blockchain Reference",
                            document.blockchainReference
                        )
                        : ""
                }

            </div>


            ${
                preliminary

                    ? `

                        <div class="callout">

                            This is a preliminary system-generated
                            transaction record. It is not the final
                            registered land record.

                        </div>

                    `

                    : `

                        <div class="callout success">

                            This document represents the final
                            registered system record for the
                            completed operation.

                        </div>

                    `
            }


            <div class="actions">

                ${
                    document.filePath

                        ? `

                            <button
                                class="btn secondary"
                                onclick="openDocument('${escapeHtml(
                                    document.documentId
                                )}')"
                            >
                                Open Document
                            </button>

                          `

                        : ""
                }


                ${
                    document.ipfsCid

                        ? `

                            <button
                                class="btn secondary"
                                onclick="openIpfsDocument('${escapeHtml(
                                    document.ipfsCid
                                )}')"
                            >
                                Open IPFS
                            </button>

                          `

                        : ""
                }

            </div>

        </article>

    `;
}


/* =========================================================
   OPEN GENERATED PDF
   ========================================================= */

function openDocument(
    documentId
) {

    if (!documentId) {

        notify(
            "Document ID is unavailable.",
            "error"
        );

        return;
    }


    const url =
        `${API_BASE}/documents/${encodeURIComponent(
            documentId
        )}/download`;


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   IPFS DOCUMENT
   ========================================================= */

function openIpfsDocument(
    cid
) {

    if (!cid) {

        notify(
            "IPFS CID is unavailable.",
            "error"
        );

        return;
    }


    const gateway =
        `http://127.0.0.1:8080/ipfs/${encodeURIComponent(
            cid
        )}`;


    window.open(
        gateway,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   HISTORY
   ========================================================= */
function loadHistoryFromInput() {

    const input =
        $("historyLandId");

    const landId =
        input?.value.trim();

    if (!landId) {
        notify(
            "Enter a Land ID.",
            "error"
        );

        return;
    }

    loadHistoryFor(
        landId
    );
}
async function loadHistoryFor(
    landId
) {

    if (!identity) {

        notify(
            "Land history is available only to authenticated users.",
            "error"
        );

        return;
    }


    try {

        const result =
            await api(
                `/lands/${encodeURIComponent(
                    landId
                )}/history`
            );


        const history =
            extractArray(result);


        renderHistory(
            history,
            landId
        );


        showPage(
            "history"
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   HISTORY RENDERING
   ========================================================= */

function renderHistory(
    events,
    landId
) {

    const container =
        $("historyResults");


    if (!container) {
        return;
    }


    if (!events.length) {

        container.innerHTML = `

            <div class="empty">

                <h3>
                    No history found
                </h3>

                <p>
                    No recorded land events are available
                    for ${escapeHtml(landId)}.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = `

        <div class="section-heading">

            <div>

                <span class="eyebrow">
                    LAND HISTORY
                </span>

                <h3>
                    ${escapeHtml(landId)}
                </h3>

            </div>

        </div>


        <div class="timeline">

            ${
                events
                    .map(
                        event =>
                            renderHistoryEvent(
                                event
                            )
                    )
                    .join("")
            }

        </div>

    `;
}


/* =========================================================
   HISTORY EVENT
   ========================================================= */

function renderHistoryEvent(
    event
) {

    const eventType =
        event.eventType ||
        "LAND_EVENT";


    return `

        <article class="timeline-item">

            <div class="timeline-dot"></div>


            <div class="timeline-content">

                <div class="record-head">

                    <div>

                        <span class="eyebrow">

                            ${escapeHtml(
                                event.eventId ||
                                eventType
                            )}

                        </span>


                        <h3>

                            ${escapeHtml(
                                formatEventType(
                                    eventType
                                )
                            )}

                        </h3>

                    </div>


                    <span class="chip">

                        ${escapeHtml(
                            formatDate(
                                event.createdAt
                            )
                        )}

                    </span>

                </div>


                <div class="grid">

                    ${
                        event.previousOwnerId ||
                        event.newOwnerId

                            ? gridValue(
                                "Ownership",
                                `${
                                    event.previousOwnerId ||
                                    "GOVERNMENT"
                                } → ${
                                    event.newOwnerId ||
                                    "GOVERNMENT"
                                }`
                            )

                            : ""
                    }


                    ${
                        event.previousArea !==
                            null &&
                        event.previousArea !==
                            undefined

                            ? gridValue(
                                "Area",
                                `${
                                    event.previousArea
                                } → ${
                                    event.newArea
                                }`
                            )

                            : ""
                    }


                    ${
                        event.previousLandUse ||
                        event.newLandUse

                            ? gridValue(
                                "Land Use",
                                `${
                                    event.previousLandUse ||
                                    "-"
                                } → ${
                                    event.newLandUse ||
                                    "-"
                                }`
                            )

                            : ""
                    }


                    ${
                        event.previousLandType ||
                        event.newLandType

                            ? gridValue(
                                "Land Type",
                                `${
                                    event.previousLandType ||
                                    "-"
                                } → ${
                                    event.newLandType ||
                                    "-"
                                }`
                            )

                            : ""
                    }


                    ${
                        event.performedBy
                            ? gridValue(
                                "Performed By",
                                event.performedBy
                            )
                            : ""
                    }


                    ${
                        event.documentId
                            ? gridValue(
                                "Document",
                                event.documentId
                            )
                            : ""
                    }

                </div>


                ${
                    event.reason ||
                    event.description

                        ? `

                            <p class="record-description">

                                ${escapeHtml(
                                    event.description ||
                                    event.reason
                                )}

                            </p>

                          `

                        : ""
                }


                ${
                    event.blockchainReference

                        ? `

                            <div class="callout success">

                                Blockchain transaction:

                                <br>

                                <code>
                                    ${escapeHtml(
                                        event.blockchainReference
                                    )}
                                </code>

                            </div>

                          `

                        : ""
                }

            </div>

        </article>

    `;
}


/* =========================================================
   EVENT TYPE LABEL
   ========================================================= */

function formatEventType(
    type
) {

    const labels = {

        LAND_REGISTRATION:
            "Land Registration",

        LAND_ALLOCATION:
            "Government Land Allocation",

        LAND_ALLOCATION_RECONCILIATION:
            "Allocation Reconciliation",

        TRANSFER_PROPOSED:
            "Ownership Transfer Proposed",

        TRANSFER_ACCEPTED:
            "Ownership Transfer Accepted",

        TRANSFER_APPROVED:
            "Ownership Transfer Approved",

        TRANSFER_REJECTED:
            "Ownership Transfer Rejected",

        LAND_UPDATE_PROPOSED:
            "Land Update Proposed",

        LAND_UPDATE_APPROVED:
            "Land Update Approved",

        LAND_UPDATE_REJECTED:
            "Land Update Rejected",

        REQUEST_CREATED:
            "Request Created",

        REQUEST_REVIEWED:
            "Request Reviewed",

        REQUEST_APPROVED:
            "Request Approved",

        REQUEST_REJECTED:
            "Request Rejected"
    };


    return (
        labels[type] ||
        type
            .replaceAll("_", " ")
            .replace(
                /\b\w/g,
                character =>
                    character.toUpperCase()
            )
    );
}
/* =========================================================
   AUDIT
   ========================================================= */

async function loadAudit() {

    if (!identity) {
        return;
    }


    /*
     * Only officers and supervisors can access
     * the administrative audit trail.
     */

    if (
        identity.role !==
            "LAND_ADMIN_OFFICER" &&

        identity.role !==
            "SUPERVISORY_AUTHORITY"
    ) {

        const container =
            $("auditResults");


        if (container) {

            container.innerHTML = `

                <div class="empty">

                    <h3>
                        Audit access restricted
                    </h3>

                    <p>
                        Your role does not have access
                        to the administrative audit trail.
                    </p>

                </div>

            `;
        }

        return;
    }


    try {

        const result =
            await api(
                "/audit"
            );


        let events =
            extractArray(
                result
            );


        /*
         * Officer:
         * Restrict audit visibility to the officer's
         * region or actions performed by that officer.
         */

        if (
            identity.role ===
            "LAND_ADMIN_OFFICER"
        ) {

            events =
                events.filter(
                    event => {

                        if (
                            event.regionId ===
                            identity.regionId
                        ) {

                            return true;
                        }


                        if (
                            event.userId ===
                            identity.userId ||

                            event.performedBy ===
                            identity.userId
                        ) {

                            return true;
                        }


                        return false;
                    }
                );
        }


        /*
         * Supervisor:
         * System-wide audit visibility.
         */

        renderAudit(
            events
        );


    } catch (error) {

        showError(
            "auditResults",
            error.message
        );
    }
}


/* =========================================================
   AUDIT RENDERING
   ========================================================= */

function renderAudit(
    events
) {

    const container =
        $("auditResults");


    if (!container) {
        return;
    }


    if (!events.length) {

        container.innerHTML = `

            <div class="empty">

                <h3>
                    No audit events found
                </h3>

                <p>
                    No administrative events are
                    available for your current access level.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =

        events
            .map(
                event =>
                    renderAuditEvent(
                        event
                    )
            )
            .join("");
}


/* =========================================================
   AUDIT EVENT
   ========================================================= */

function renderAuditEvent(
    event
) {

    return `

        <article class="record audit-card">

            <div class="record-head">

                <div>

                    <span class="eyebrow">

                        ${escapeHtml(
                            event.eventId ||
                            event.id ||
                            "AUDIT"
                        )}

                    </span>


                    <h3>

                        ${escapeHtml(
                            event.action ||
                            event.eventType ||
                            "System Activity"
                        )}

                    </h3>


                    <p class="record-sub">

                        ${escapeHtml(
                            event.description ||
                            event.message ||
                            "Administrative system activity."
                        )}

                    </p>

                </div>


                <span class="chip">

                    ${escapeHtml(
                        formatDate(
                            event.createdAt
                        )
                    )}

                </span>

            </div>


            <div class="grid">

                ${
                    event.userId
                        ? gridValue(
                            "User",
                            event.userId
                        )
                        : ""
                }


                ${
                    event.role
                        ? gridValue(
                            "Role",
                            roleLabel(
                                event.role
                            )
                        )
                        : ""
                }


                ${
                    event.regionId
                        ? gridValue(
                            "Region",
                            regionLabel(
                                event.regionId
                            )
                        )
                        : ""
                }


                ${
                    event.landId
                        ? gridValue(
                            "Land",
                            event.landId
                        )
                        : ""
                }


                ${
                    event.requestId
                        ? gridValue(
                            "Request",
                            event.requestId
                        )
                        : ""
                }


                ${
                    event.ipAddress
                        ? gridValue(
                            "IP",
                            event.ipAddress
                        )
                        : ""
                }

            </div>

        </article>

    `;
}


/* =========================================================
   GENERIC ERROR DISPLAY
   ========================================================= */

function showError(
    containerId,
    message
) {

    const container =
        $(containerId);


    if (!container) {

        notify(
            message,
            "error"
        );

        return;
    }


    container.innerHTML = `

        <div class="empty error-state">

            <h3>
                Unable to load data
            </h3>

            <p>
                ${escapeHtml(
                    message ||
                    "An unexpected error occurred."
                )}
            </p>

        </div>

    `;
}


/* =========================================================
   REQUEST FORM RESET
   ========================================================= */

function resetRequestForm() {

    const form =
        $("requestForm");


    if (form) {

        form.reset();
    }


    handleRequestTypeChange();
}


/* =========================================================
   ALLOCATION FORM RESET
   ========================================================= */

function resetAllocationForm() {

    const form =
        $("allocationForm");


    if (form) {

        form.reset();
    }
}


/* =========================================================
   REGISTER FORM RESET
   ========================================================= */

function resetRegisterForm() {

    const form =
        $("registerForm");


    if (form) {

        form.reset();
    }


    if (
        identity?.role ===
        "LAND_ADMIN_OFFICER"
    ) {

        const regionInput =
            $("registerRegion");


        if (regionInput) {

            regionInput.value =
                regionLabel(
                    identity.regionId
                );
        }
    }
}


/* =========================================================
   PANEL HELPER
   ========================================================= */

function closePanel(
    id
) {

    hide(id);
}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function setupSearchEvents() {

    const input =
        $("landSearchInput");


    if (!input) {
        return;
    }


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchLand();
            }
        }
    );
}


/* =========================================================
   WALLET EVENTS
   ========================================================= */

function setupWalletEvents() {

    if (!window.ethereum) {
        return;
    }


    window.ethereum.on(
        "accountsChanged",
        async accounts => {

            /*
             * MetaMask disconnected.
             */

            if (
                !accounts ||
                !accounts.length
            ) {

                logoutApplication();

                return;
            }


            walletAddress =
                accounts[0]
                    .toLowerCase();


            sessionStorage.setItem(
                "lr_wallet",
                walletAddress
            );


            try {

                const registered =
                    await loadIdentity();


                await loadBlockchain();


                updateSessionUI();


                if (
                    registered
                ) {

                    await initializeApplication();

                } else {

                    notify(
                        "The selected MetaMask account is not registered in this system.",
                        "error"
                    );
                }


            } catch (error) {

                console.error(
                    "Account change error:",
                    error
                );

                notify(
                    "Unable to load the selected MetaMask account.",
                    "error"
                );
            }
        }
    );


    window.ethereum.on(
        "chainChanged",
        async () => {

            await loadBlockchain();


            notify(
                "Blockchain network changed.",
                "info"
            );
        }
    );
}


/* =========================================================
   RESTORE SESSION
   ========================================================= */

async function restoreSession() {

    const savedWallet =
        sessionStorage.getItem(
            "lr_wallet"
        );


    /*
     * No previous login.
     * Start in public mode.
     */

    if (!savedWallet) {

        updateSessionUI();

        renderPublicDashboard();

        return;
    }


    walletAddress =
        savedWallet.toLowerCase();


    try {

        const registered =
            await loadIdentity();


        await loadBlockchain();


        updateSessionUI();


        if (
            registered
        ) {

            await initializeApplication();

        } else {

            sessionStorage.removeItem(
                "lr_wallet"
            );


            walletAddress =
                null;


            identity =
                null;


            updateSessionUI();


            renderPublicDashboard();
        }


    } catch (error) {

        console.warn(
            "Session restoration failed:",
            error.message
        );


        walletAddress =
            null;


        identity =
            null;


        sessionStorage.removeItem(
            "lr_wallet"
        );


        updateSessionUI();


        renderPublicDashboard();
    }
}


/* =========================================================
   EVENT / FORM BINDINGS
   ========================================================= */

function setupBindings() {

    /*
     * Header
     */

    $("connectWalletBtn")
        ?.addEventListener(
            "click",
            connectWallet
        );


    $("logoutWalletBtn")
        ?.addEventListener(
            "click",
            logoutApplication
        );


    /*
     * Forms
     */

    $("registerForm")
        ?.addEventListener(
            "submit",
            registerLand
        );


    $("allocationForm")
        ?.addEventListener(
            "submit",
            allocateLand
        );


    $("requestForm")
        ?.addEventListener(
            "submit",
            createLandRequest
        );


    /*
     * Request type.
     */

    $("requestType")
        ?.addEventListener(
            "change",
            handleRequestTypeChange
        );

        /*
     * Request status filter.
     */
    $("requestStatusFilter")
        ?.addEventListener(
            "change",
            loadRequests
        );    


    /*
     * Land search.
     */

    setupSearchEvents();


    /*
     * MetaMask events.
     */

    setupWalletEvents();
}


/* =========================================================
   INITIAL APPLICATION LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            setupBindings();


            /*
             * Start with the public UI.
             */

            updateSessionUI();

            renderPublicDashboard();


            /*
             * Check blockchain availability.
             */

            await loadBlockchain();


            /*
             * Restore a previous authenticated
             * session if one exists.
             */

            await restoreSession();


        } catch (error) {

            console.error(
                "Application initialization error:",
                error
            );


            notify(
                "Application initialization failed.",
                "error"
            );
        }
    }
);
/* =========================================================
   GLOBAL COMPATIBILITY HELPERS
   ========================================================= */

/*
 * Some buttons in the existing HTML may call these
 * functions directly through onclick handlers.
 *
 * Keep these wrappers so the existing HTML does not
 * need to be replaced.
 */


/* =========================================================
   DASHBOARD NAVIGATION
   ========================================================= */

function openDashboard() {

    showPage("dashboard");
}


function openLands() {

    showPage("lands");
}


function openRequests() {

    showPage("requests");
}


function openDocuments() {

    showPage("documents");
}


function openHistory() {

    showPage("history");
}


function openAudit() {

    showPage("audit");
}


/* =========================================================
   PUBLIC SEARCH RESET
   ========================================================= */

function clearLandSearch() {

    const input =
        $("landSearchInput");


    if (input) {

        input.value = "";
    }


    if ($("landResults")) {

        $("landResults").innerHTML = `

            <div class="empty">

                <h3>
                    Search the land registry
                </h3>

                <p>
                    Enter a Land ID or Survey Number
                    to search for a specific record.
                </p>

            </div>

        `;
    }
}


/* =========================================================
   REQUEST LAND SELECTION
   ========================================================= */

function setRequestLand(
    landId
) {

    const input =
        $("requestLandId");


    if (input) {

        input.value =
            landId;
    }


    showPage(
        "requests"
    );
}


/* =========================================================
   REQUEST PANEL
   ========================================================= */

function openRequestPanel() {

    if (
        identity?.role !==
        "CITIZEN"
    ) {

        notify(
            "Only citizens can create land requests.",
            "error"
        );

        return;
    }


    show(
        "requestPanel"
    );


    configureRequestForm();
}


function closeRequestPanel() {

    hide(
        "requestPanel"
    );


    resetRequestForm();
}


/* =========================================================
   REGISTER LAND PANEL
   ========================================================= */

function closeRegisterPanel() {

    hide(
        "registerLandPanel"
    );


    resetRegisterForm();
}


/* =========================================================
   ALLOCATION PANEL
   ========================================================= */

function closeAllocationPanel() {

    hide(
        "allocationPanel"
    );


    resetAllocationForm();
}


/* =========================================================
   DOCUMENT ACCESS HELPERS
   ========================================================= */

function viewLandDocuments(
    landId
) {

    loadDocumentsForLand(
        landId
    );
}


/* =========================================================
   HISTORY ACCESS
   ========================================================= */

function viewLandHistory(
    landId
) {

    loadHistoryFor(
        landId
    );
}


/* =========================================================
   ROLE CHECK HELPERS
   ========================================================= */

function isCitizen() {

    return (
        identity?.role ===
        "CITIZEN"
    );
}


function isOfficer() {

    return (
        identity?.role ===
        "LAND_ADMIN_OFFICER"
    );
}


function isSupervisor() {

    return (
        identity?.role ===
        "SUPERVISORY_AUTHORITY"
    );
}


function isAuthenticated() {

    return !!identity;
}


/* =========================================================
   CURRENT USER
   ========================================================= */

function getCurrentUserId() {

    return identity?.userId ||
        null;
}


function getCurrentRegionId() {

    return identity?.regionId ||
        null;
}


/* =========================================================
   LAND ACCESS CHECK
   ========================================================= */

function canAccessLand(
    land
) {

    if (!land) {
        return false;
    }


    /*
     * Supervisor:
     * system-wide access.
     */

    if (
        isSupervisor()
    ) {

        return true;
    }


    /*
     * Officer:
     * regional access.
     */

    if (
        isOfficer()
    ) {

        return (
            land.regionId ===
            identity.regionId
        );
    }


    /*
     * Citizen:
     * own land only.
     */

    if (
        isCitizen()
    ) {

        return (
            land.currentOwnerId ===
            identity.userId
        );
    }


    /*
     * Public:
     * only search results are displayed.
     */

    return true;
}


/* =========================================================
   REQUEST ACCESS CHECK
   ========================================================= */

function canAccessRequest(
    request
) {

    if (!identity || !request) {
        return false;
    }


    if (
        isSupervisor()
    ) {

        return true;
    }


    if (
        isOfficer()
    ) {

        return (
            request.regionId ===
            identity.regionId
        );
    }


    if (
        isCitizen()
    ) {

        return (

            request.requesterId ===
                identity.userId ||

            request.sellerId ===
                identity.userId ||

            request.buyerId ===
                identity.userId
        );
    }


    return false;
}


/* =========================================================
   SAFE OPEN LAND
   ========================================================= */

async function openLand(
    landId
) {

    try {

        const result =
            await api(
                `/lands/${encodeURIComponent(
                    landId
                )}`
            );


        const land =
            extractData(
                result
            );


        if (!canAccessLand(land)) {

            notify(
                "You do not have permission to view this land record.",
                "error"
            );

            return;
        }


        renderLands(
            [land]
        );


        showPage(
            "lands"
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   SAFE OPEN REQUEST
   ========================================================= */

async function openRequest(
    requestId
) {

    if (!identity) {

        notify(
            "Authentication is required.",
            "error"
        );

        return;
    }


    const request =
        currentRequests.find(
            item =>
                item.requestId ===
                requestId
        );


    if (!request) {

        notify(
            "Request not found.",
            "error"
        );

        return;
    }


    if (
        !canAccessRequest(
            request
        )
    ) {

        notify(
            "You do not have permission to view this request.",
            "error"
        );

        return;
    }


    viewRequestDetails(
        requestId
    );
}


/* =========================================================
   REFRESH EVERYTHING
   ========================================================= */

async function refreshApplication() {

    if (!identity) {

        await loadBlockchain();

        renderPublicDashboard();

        return;
    }


    try {

        await loadBlockchain();

        await loadDashboard();

        await loadRequests();

        await loadDocuments();


        if (
            isOfficer() ||
            isSupervisor()
        ) {

            await loadAudit();
        }


        notify(
            "Application data refreshed.",
            "success"
        );


    } catch (error) {

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   PUBLIC MODE
   ========================================================= */

function enterPublicMode() {

    identity = null;

    walletAddress = null;


    updateSessionUI();

    renderPublicDashboard();

    showPage(
        "dashboard"
    );
}


/* =========================================================
   NETWORK LABEL
   ========================================================= */

function blockchainNetworkLabel() {

    if (!blockchainStatus) {

        return "Offline";
    }


    if (
        blockchainStatus.networkMatches ===
        false
    ) {

        return "Network mismatch";
    }


    return "Ganache";
}


/* =========================================================
   DEBUG INFORMATION
   ========================================================= */

function getApplicationState() {

    return {

        walletAddress,

        identity,

        blockchainStatus,

        currentLands,

        currentRequests
    };
}


/* =========================================================
   DEVELOPMENT CONSOLE
   ========================================================= */

window.landRegistryApp = {

    connectWallet,

    logoutApplication,

    searchLand,

    loadAllLands,

    loadDashboard,

    loadRequests,

    loadDocuments,

    loadAudit,

    loadHistoryFor,

    startRequest,

    createLandRequest,

    acceptRequest,

    reviewRequest,

    approveRequest,

    rejectRequest,

    openRegister,

    registerLand,

    openAllocation,

    allocateLand,

    refreshApplication,

    getApplicationState,

    blockchainNetworkLabel

};


/* =========================================================
   FINAL SAFETY INITIALIZATION
   ========================================================= */

/*
 * Prevent accidental browser errors when a UI element
 * references an optional function.
 */

window.searchLand =
    searchLand;

window.loadAllLands =
    loadAllLands;

window.loadHistoryFor =
    loadHistoryFor;

window.loadHistoryFromInput =
    loadHistoryFromInput;

window.startRequest =
    startRequest;

window.acceptRequest =
    acceptRequest;

window.reviewRequest =
    reviewRequest;

window.approveRequest =
    approveRequest;

window.rejectRequest =
    rejectRequest;

window.viewRequestDetails =
    viewRequestDetails;

window.loadDocumentsForRequest =
    loadDocumentsForRequest;

window.loadDocumentsForLand =
    loadDocumentsForLand;

window.openDocument =
    openDocument;

window.openIpfsDocument =
    openIpfsDocument;

window.openRegister =
    openRegister;

window.openAllocation =
    openAllocation;

window.showPage =
    showPage;

window.closePanel =
    closePanel;

window.closeRequestPanel =
    closeRequestPanel;

window.closeRegisterPanel =
    closeRegisterPanel;

window.closeAllocationPanel =
    closeAllocationPanel;

window.logoutApplication =
    logoutApplication;

window.connectWallet =
    connectWallet;