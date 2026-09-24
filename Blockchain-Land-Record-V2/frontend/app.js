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
    if (value === null || value === undefined) return "-";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

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
        PUBLIC: "Public",
        CITIZEN: "Citizen",
        LAND_ADMIN_OFFICER: "Land Administration Officer",
        SUPERVISORY_AUTHORITY: "Supervisory Authority"
    };

    return labels[role] || role || "Public";
}

function extractData(result) {

    if (!result) return null;

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

    const notification = $("notification");

    if (!notification) return;

    notification.textContent = message;

    notification.className =
        `notification ${type}`;

    notification.classList.remove("hidden");

    clearTimeout(window.notificationTimer);

    window.notificationTimer =
        setTimeout(() => {
            notification.classList.add("hidden");
        }, 5000);
}


/* =========================================================
   API
   ========================================================= */

async function api(path, options = {}) {

    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        }
    );

    const text = await response.text();

    let result = {};

    try {
        result = text
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

        error.status = response.status;

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
                method: "eth_requestAccounts"
            });

        if (!accounts || !accounts.length) {
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
            await api("/blockchain/status");

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

    document
        .querySelectorAll(".page")
        .forEach(section => {
            section.classList.add("hidden");
        });

    const target =
        $(`page-${page}`);

    if (target) {
        target.classList.remove("hidden");
    }

    document
        .querySelectorAll(".nav-btn")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    switch (page) {

        case "dashboard":
            loadDashboard();
            break;

        case "lands":
            loadAllLands();
            break;

        case "requests":
            configureRequestForm();
            loadRequests();
            break;

        case "documents":
            loadDocuments();
            break;

        case "history":
            break;

        case "audit":
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
            <span>Access</span>
            <strong>Public</strong>
            <small>Limited registry view</small>
        </div>

        <div class="stat">
            <span>Blockchain</span>
            <strong>
                ${blockchainStatus ? "Online" : "Offline"}
            </strong>
            <small>Live network status</small>
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
                        Only permitted public information is displayed.
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
            extractArray(landResult);

        const requestResult =
            await api("/requests");

        let requests =
            extractArray(requestResult);

        /* -----------------------------------------
           ROLE-BASED VISIBILITY
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
                        request.requesterId === identity.userId ||
                        request.sellerId === identity.userId ||
                        request.buyerId === identity.userId
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

        currentLands = lands;
        currentRequests = requests;

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
                request.status !== "COMPLETED" &&
                request.status !== "REJECTED"
        ).length;

    const completed =
        requests.filter(
            request =>
                request.status ===
                "COMPLETED"
        ).length;

    $("statsGrid").innerHTML = `

        <div class="stat">

            <span>Land Records</span>

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

            <span>Pending Requests</span>

            <strong>
                ${pending}
            </strong>

            <small>
                Active workflow
            </small>

        </div>


        <div class="stat">

            <span>Completed</span>

            <strong>
                ${completed}
            </strong>

            <small>
                Registered transactions
            </small>

        </div>


        <div class="stat">

            <span>Blockchain</span>

            <strong>
                ${blockchainStatus ? "Online" : "Offline"}
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

    /* CITIZEN */

    if (
        identity.role ===
        "CITIZEN"
    ) {

        cards = [

            {
                title: "My Land",
                value: `${lands.length} record(s)`,
                description:
                    "View land currently registered to your account.",
                action:
                    "showPage('lands')"
            },

            {
                title: "Requests",
                value: `${requests.length} request(s)`,
                description:
                    "Create transfers and monitor land modifications.",
                action:
                    "showPage('requests')"
            },

            {
                title: "Documents",
                value: "Registered records",
                description:
                    "View preliminary and final system documents.",
                action:
                    "showPage('documents')"
            }

        ];
    }

    /* OFFICER */

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
                title: "Regional Registry",
                value: `${lands.length} parcel(s)`,
                description:
                    `Land records within ${identity.regionId}.`,
                action:
                    "showPage('lands')"
            },

            {
                title: "Pending Review",
                value: `${reviewCount} request(s)`,
                description:
                    "Validate and process citizen requests.",
                action:
                    "showPage('requests')"
            },

            {
                title: "Officer Operations",
                value: "Register / Allocate",
                description:
                    "Manage authorized land administration operations.",
                action:
                    "showPage('lands')"
            }

        ];
    }

    /* SUPERVISOR */

    else {

        cards = [

            {
                title: "Registry",
                value: `${lands.length} record(s)`,
                description:
                    "System-wide land overview.",
                action:
                    "showPage('lands')"
            },

            {
                title: "Transactions",
                value: `${requests.length} request(s)`,
                description:
                    "Review system transaction lifecycle.",
                action:
                    "showPage('requests')"
            },

            {
                title: "Audit",
                value: "System activity",
                description:
                    "Inspect administrative activity.",
                action:
                    "showPage('audit')"
            }

        ];
    }


    $("roleDashboard").innerHTML = `

        <div class="quick-grid">

            ${cards.map(card => `

                <div class="quick">

                    <span class="eyebrow">
                        V2 SYSTEM
                    </span>

                    <h3>
                        ${escapeHtml(card.title)}
                    </h3>

                    <p>
                        <strong>
                            ${escapeHtml(card.value)}
                        </strong>
                        <br>
                        ${escapeHtml(card.description)}
                    </p>

                    <button
                        class="btn secondary"
                        onclick="${card.action}"
                    >
                        Open
                    </button>

                </div>

            `).join("")}

        </div>
    `;
}


/* =========================================================
   LAND OPERATIONS
   ========================================================= */

function configureRoleActions() {

    const box =
        $("landActions");

    if (!box) return;

    if (!identity) {

        hide("landActions");

        return;
    }

    show("landActions");

    let html = "";

    if (
        identity.role ===
        "LAND_ADMIN_OFFICER"
    ) {

        html += `

            <button
                class="btn primary"
                onclick="openRegister()"
            >
                Register Land
            </button>

            <button
                class="btn secondary"
                onclick="openAllocation()"
            >
                Allocate Government Land
            </button>
        `;
    }

    if (
        identity.role ===
        "CITIZEN"
    ) {

        html += `

            <button
                class="btn primary"
                onclick="showPage('requests')"
            >
                Create Land Request
            </button>
        `;
    }

    if (
        identity.role ===
        "SUPERVISORY_AUTHORITY"
    ) {

        html += `

            <button
                class="btn secondary"
                onclick="showPage('audit')"
            >
                Open System Audit
            </button>
        `;
    }

    box.innerHTML =
        html ||
        `<span class="status-line">
            Registry access only
        </span>`;
}


/* =========================================================
   LAND REGISTRY
   ========================================================= */

async function loadAllLands() {

    try {

        const result =
            await api("/lands");

        let lands =
            extractArray(result);

        if (
            identity?.role ===
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
            identity?.role ===
            "LAND_ADMIN_OFFICER"
        ) {

            lands =
                lands.filter(
                    land =>
                        land.regionId ===
                        identity.regionId
                );
        }

        currentLands = lands;

        renderLands(lands);

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
                extractData(result);

        } else {

            const result =
                await api("/lands");

            const lands =
                extractArray(result);

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
                    No accessible record matched the current search.
                </p>

            </div>
        `;

        return;
    }


    $("landResults").innerHTML =

        lands.map(
            land => `

            <article class="record">

                <div class="record-head">

                    <div>

                        <span class="eyebrow">
                            ${escapeHtml(land.landId)}
                        </span>

                        <h3>
                            Survey ${escapeHtml(land.surveyNumber)}
                        </h3>

                        <p class="record-sub">
                            ${escapeHtml(land.location)}
                        </p>

                    </div>

                    <span class="chip">
                        ${escapeHtml(land.status)}
                    </span>

                </div>


                <div class="grid">

                    ${gridValue(
                        "Parcel Area",
                        `${land.parcelArea ?? "-"} ${land.areaUnit ?? ""}`
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
                        land.regionId
                    )}

                    ${gridValue(
                        "Owner",
                        identity
                            ? land.currentOwnerId || "GOVERNMENT"
                            : "Restricted"
                    )}

                    ${gridValue(
                        "Ownership",
                        identity
                            ? land.ownershipStatus
                            : "Restricted"
                    )}

                    ${gridValue(
                        "Origin",
                        land.origin
                    )}

                    ${gridValue(
                        "Coordinates",
                        land.latitude &&
                        land.longitude
                            ? `${land.latitude}, ${land.longitude}`
                            : "-"
                    )}

                </div>


                <div class="actions">

                    <button
                        class="btn secondary"
                        onclick="loadHistoryFor('${escapeHtml(land.landId)}')"
                    >
                        View History
                    </button>


                    ${
                        identity?.role === "CITIZEN" &&
                        land.currentOwnerId === identity.userId
                        ?

                        `<button
                            class="btn primary"
                            onclick="startRequest('${escapeHtml(land.landId)}')"
                        >
                            Transfer / Modify
                        </button>`

                        :

                        ""
                    }

                </div>

            </article>
        `
        ).join("");
}


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
        identity.regionId || "";

    show("registerLandPanel");
}


async function registerLand(event) {

    event.preventDefault();

    try {

        const payload = {

            surveyNumber:
                $("registerSurveyNumber").value.trim(),

            parcelArea:
                Number(
                    $("registerParcelArea").value
                ),

            areaUnit:
                $("registerAreaUnit").value,

            location:
                $("registerLocation").value.trim(),

            latitude:
                $("registerLatitude").value
                    ? Number($("registerLatitude").value)
                    : null,

            longitude:
                $("registerLongitude").value
                    ? Number($("registerLongitude").value)
                    : null,

            landType:
                $("registerLandType").value,

            landUseType:
                $("registerLandUse").value.trim(),

            zone:
                $("registerZone").value.trim(),

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
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );


        hide("registerLandPanel");

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
        await api("/users/citizens");

    citizens =
        extractArray(result);

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

        select.innerHTML =
            `<option value="">
                Select Citizen
            </option>`;

        list.forEach(
            citizen => {

                select.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHtml(citizen.userId)}">

                        ${escapeHtml(citizen.userId)}
                        ·
                        ${escapeHtml(citizen.name)}

                    </option>
                    `
                );
            }
        );

        show("allocationPanel");

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
                method: "POST",
                body: JSON.stringify(payload)
            }
        );


        hide("allocationPanel");

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

async function configureRequestForm() {

    if (
        identity?.role !==
        "CITIZEN"
    ) {

        hide("citizenRequestPanel");

        return;
    }

    show("citizenRequestPanel");

    try {

        const list =
            await loadCitizens();

        const select =
            $("requestBuyerId");

        select.innerHTML =
            `<option value="">
                Select Buyer
            </option>`;

        list
            .filter(
                citizen =>
                    citizen.userId !==
                    identity.userId
            )
            .forEach(
                citizen => {

                    select.insertAdjacentHTML(
                        "beforeend",
                        `
                        <option value="${escapeHtml(citizen.userId)}">

                            ${escapeHtml(citizen.userId)}
                            ·
                            ${escapeHtml(citizen.name)}

                        </option>
                        `
                    );
                }
            );

    } catch (error) {

        console.warn(
            "Could not load citizens:",
            error.message
        );
    }

    updateRequestFields();
}


function updateRequestFields() {

    const type =
        $("requestType")?.value;

    if (!type) return;

    const transfer =
        type ===
        "OWNERSHIP_TRANSFER";

    const area =
        type ===
        "AREA_MODIFICATION";

    const use =
        type ===
        "LAND_USE_MODIFICATION";

    const landType =
        type ===
        "LAND_TYPE_MODIFICATION";


    $("buyerWrap")
        ?.classList.toggle(
            "hidden",
            !transfer
        );

    $("amountWrap")
        ?.classList.toggle(
            "hidden",
            !transfer
        );

    $("areaWrap")
        ?.classList.toggle(
            "hidden",
            !area
        );

    $("areaUnitWrap")
        ?.classList.toggle(
            "hidden",
            !area
        );

    $("useWrap")
        ?.classList.toggle(
            "hidden",
            !use
        );

    $("typeWrap")
        ?.classList.toggle(
            "hidden",
            !landType
        );
}


/* =========================================================
   CREATE REQUEST
   ========================================================= */

async function createRequest(event) {

    event.preventDefault();

    if (
        identity?.role !==
        "CITIZEN"
    ) {

        notify(
            "Only registered citizens can create land requests.",
            "error"
        );

        return;
    }


    const type =
        $("requestType").value;


    try {

        const payload = {

            requestType:
                type,

            landId:
                $("requestLandId")
                    .value
                    .trim(),

            requesterId:
                identity.userId,

            sellerId:
                identity.userId,

            buyerId:
                type === "OWNERSHIP_TRANSFER"
                    ? $("requestBuyerId").value
                    : null,

            reason:
                $("requestReason")
                    .value
                    .trim(),

            agreedAmount:
                type === "OWNERSHIP_TRANSFER" &&
                $("requestAmount").value
                    ? Number(
                        $("requestAmount").value
                    )
                    : null,

            requestedArea:
                type === "AREA_MODIFICATION" &&
                $("requestArea").value
                    ? Number(
                        $("requestArea").value
                    )
                    : null,

            requestedAreaUnit:
                type === "AREA_MODIFICATION"
                    ? $("requestAreaUnit").value
                    : null,

            requestedLandUse:
                type === "LAND_USE_MODIFICATION"
                    ? $("requestLandUse")
                        .value
                        .trim()
                    : null,

            requestedLandType:
                type === "LAND_TYPE_MODIFICATION"
                    ? $("requestLandType").value
                    : null,

            requestedDetails:
                $("requestReason")
                    .value
                    .trim()
        };


        const result =
            await api(
                "/requests",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );


        event.target.reset();

        updateRequestFields();

        const request =
            extractData(result);

        notify(
            `Request ${
                request?.requestId ||
                "created"
            } submitted successfully.`,
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
   REQUEST LIST
   ========================================================= */

async function loadRequests() {

    if (!identity) {

        $("requestContent").innerHTML = `

            <div class="empty">

                <h3>
                    Connect MetaMask
                </h3>

                <p>
                    Registered account access is required
                    for transaction workflows.
                </p>

            </div>
        `;

        return;
    }


    try {

        const status =
            $("requestStatusFilter")?.value;

        const query =
            status
                ? `?status=${encodeURIComponent(status)}`
                : "";


        const result =
            await api(
                `/requests${query}`
            );


        let requests =
            extractArray(result);


        /* CITIZEN */

        if (
            identity.role ===
            "CITIZEN"
        ) {

            requests =
                requests.filter(
                    request =>
                        request.requesterId === identity.userId ||
                        request.sellerId === identity.userId ||
                        request.buyerId === identity.userId
                );
        }


        /* OFFICER */

        if (
            identity.role ===
            "LAND_ADMIN_OFFICER"
        ) {

            /*
             * Backend performs the authoritative
             * region authorization.
             *
             * We intentionally don't hide requests
             * client-side based on incomplete fields.
             */
        }


        currentRequests =
            requests;

        renderRequests(
            requests
        );

    } catch (error) {

        showError(
            "requestContent",
            error.message
        );
    }
}


/* =========================================================
   REQUEST ACTIONS
   ========================================================= */

function requestActions(request) {

    let html = "";


    /* BUYER ACCEPTANCE */

    if (

        identity.role ===
        "CITIZEN" &&

        request.buyerId ===
        identity.userId &&

        request.status ===
        "PENDING_BUYER_ACCEPTANCE"

    ) {

        html += `

            <button
                class="btn primary"
                onclick="acceptRequest('${escapeHtml(request.requestId)}')"
            >
                Accept Transfer
            </button>
        `;
    }


    /* OFFICER REVIEW */

    if (

        identity.role ===
        "LAND_ADMIN_OFFICER" &&

        request.status ===
        "PENDING_AUTHORITY_REVIEW"

    ) {

        html += `

            <button
                class="btn secondary"
                onclick="reviewRequest('${escapeHtml(request.requestId)}')"
            >
                Validate
            </button>

            <button
                class="btn primary"
                onclick="approveRequest('${escapeHtml(request.requestId)}')"
            >
                Approve
            </button>

            <button
                class="btn danger"
                onclick="rejectRequest('${escapeHtml(request.requestId)}')"
            >
                Reject
            </button>
        `;
    }


    return html;
}


/* =========================================================
   REQUEST RENDERING
   ========================================================= */

function renderRequests(requests) {

    if (!requests.length) {

        $("requestContent").innerHTML = `

            <div class="empty">

                <h3>
                    No requests
                </h3>

                <p>
                    There are currently no requests
                    visible for this account.
                </p>

            </div>
        `;

        return;
    }


    $("requestContent").innerHTML =

        requests.map(
            request => `

            <article class="record request">

                <div class="record-head">

                    <div>

                        <span class="eyebrow">
                            ${escapeHtml(
                                request.requestType
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                request.requestId
                            )}
                        </h3>

                        <p class="record-sub">
                            Land ${escapeHtml(
                                request.landId
                            )}
                        </p>

                    </div>


                    <span
                        class="chip
                        ${request.status === "COMPLETED"
                            ? "success"
                            : request.status === "REJECTED"
                                ? "danger"
                                : "warn"}"
                    >
                        ${escapeHtml(
                            request.status
                        )}
                    </span>

                </div>


                <div class="grid">

                    ${gridValue(
                        "Requester",
                        request.requesterId
                    )}

                    ${gridValue(
                        "Seller",
                        request.sellerId
                    )}

                    ${gridValue(
                        "Buyer",
                        request.buyerId
                    )}

                    ${gridValue(
                        "Validation",
                        request.validationResult
                    )}

                    ${gridValue(
                        "Proposed",
                        formatDate(
                            request.proposedAt
                        )
                    )}

                    ${gridValue(
                        "Completed",
                        formatDate(
                            request.completedAt
                        )
                    )}

                </div>


                ${
                    request.validationMessage
                        ?

                        `<div class="callout success">

                            ${escapeHtml(
                                request.validationMessage
                            )}

                        </div>`

                        :

                        ""
                }


                ${
                    request.reviewNotes
                        ?

                        `<div class="callout">

                            <strong>
                                Officer notes:
                            </strong>

                            ${escapeHtml(
                                request.reviewNotes
                            )}

                        </div>`

                        :

                        ""
                }


                <div class="actions">

                    ${requestActions(request)}

                    <button
                        class="btn secondary"
                        onclick="viewRequest('${escapeHtml(request.requestId)}')"
                    >
                        Details
                    </button>

                </div>

            </article>
        `
        ).join("");
}


/* =========================================================
   REQUEST DETAILS
   ========================================================= */

async function viewRequest(
    requestId
) {

    try {

        const result =
            await api(
                `/requests/${encodeURIComponent(requestId)}`
            );

        const request =
            extractData(result);

        const details = [

            ["Request", request.requestId],

            ["Land", request.landId],

            ["Type", request.requestType],

            ["Status", request.status],

            ["Requester", request.requesterId],

            ["Seller", request.sellerId],

            ["Buyer", request.buyerId],

            [
                "Current Area",
                request.currentArea
                    ? `${request.currentArea} ${request.currentAreaUnit || ""}`
                    : "-"
            ],

            [
                "Requested Area",
                request.requestedArea
                    ? `${request.requestedArea} ${request.requestedAreaUnit || ""}`
                    : "-"
            ],

            [
                "Current Land Use",
                request.currentLandUse
            ],

            [
                "Requested Land Use",
                request.requestedLandUse
            ],

            [
                "Current Land Type",
                request.currentLandType
            ],

            [
                "Requested Land Type",
                request.requestedLandType
            ],

            [
                "Validation",
                request.validationResult
            ],

            [
                "Reviewed By",
                request.reviewedBy
            ],

            [
                "Approved",
                formatDate(
                    request.approvedAt
                )
            ],

            [
                "Completed",
                formatDate(
                    request.completedAt
                )
            ]

        ];


        alert(

            details
                .map(
                    item =>
                        `${item[0]}: ${item[1] ?? "-"}`
                )
                .join("\n")
        );

    } catch (error) {

        notify(
            error.message,
            "error"
        );
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
            "Citizen access required.",
            "error"
        );

        return;
    }


    try {

        await api(
            "/requests/accept",
            {
                method: "POST",

                body: JSON.stringify({

                    requestId,

                    buyerId:
                        identity.userId

                })
            }
        );


        notify(
            "Transfer accepted. Waiting for authority review.",
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
   OFFICER VALIDATION
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
        prompt(
            "Officer review notes:",
            "Blockchain and database records verified."
        );


    if (notes === null) {
        return;
    }


    try {

        await api(
            "/requests/review",
            {
                method: "POST",

                body: JSON.stringify({

                    requestId,

                    officerId:
                        identity.userId,

                    reviewNotes:
                        notes.trim()

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
   OFFICER APPROVAL
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
        confirm(
            "Approve this request?\n\n" +
            "This operation updates the registered " +
            "blockchain and database state."
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await api(
                "/requests/approve",
                {
                    method: "POST",

                    body: JSON.stringify({

                        requestId,

                        officerId:
                            identity.userId,

                        reviewNotes:
                            "Approved after verification of blockchain state, database record, seller identity and buyer identity."

                    })
                }
            );


        notify(
            "Request completed and registered successfully.",
            "success"
        );


        await Promise.allSettled([

            loadRequests(),

            loadDocuments(),

            loadDashboard(),

            loadAudit()

        ]);


        const response =
            extractData(result);


        const document =
            response?.document;


        if (
            document?.documentId
        ) {

            notify(
                `Registered document ${document.documentId} generated.`,
                "success"
            );
        }

    } catch (error) {

        /*
         * Important:
         * If a blockchain transaction has already
         * completed but the DB synchronization failed,
         * the backend recovery procedure should be
         * used rather than repeating approval.
         */

        console.error(
            "Approval error:",
            error
        );

        notify(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   OFFICER REJECTION
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
        prompt(
            "Enter the rejection reason:"
        );


    if (!reason?.trim()) {
        return;
    }


    try {

        await api(
            "/requests/reject",
            {
                method: "POST",

                body: JSON.stringify({

                    requestId,

                    officerId:
                        identity.userId,

                    reason:
                        reason.trim()

                })
            }
        );


        notify(
            "Request rejected.",
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
   START REQUEST FROM LAND CARD
   ========================================================= */

function startRequest(
    landId
) {

    showPage("requests");

    if ($("requestLandId")) {

        $("requestLandId").value =
            landId;
    }

    configureRequestForm();
}


/* =========================================================
   DOCUMENTS
   ========================================================= */

async function loadDocuments() {

    if (!identity) {

        $("documentContent").innerHTML = `

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

        const result =
            await api("/lands");

        let lands =
            extractArray(result);


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


        if (
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


        const documents = [];


        for (
            const land of lands
        ) {

            try {

                const result =
                    await api(
                        `/documents/land/${encodeURIComponent(land.landId)}`
                    );

                documents.push(
                    ...extractArray(result)
                );

            } catch {
                /*
                 * A land record may legitimately
                 * have no documents.
                 */
            }
        }


        renderDocuments(
            documents
        );

    } catch (error) {

        showError(
            "documentContent",
            error.message
        );
    }
}


/* =========================================================
   DOCUMENT RENDERING
   ========================================================= */

function renderDocuments(
    documents
) {

    if (!documents.length) {

        $("documentContent").innerHTML = `

            <div class="empty">

                <h3>
                    No documents
                </h3>

                <p>
                    Generated preliminary and registered
                    records will appear here.
                </p>

            </div>
        `;

        return;
    }


    $("documentContent").innerHTML =

        documents.map(
            document => `

            <article class="record document">

                <div class="record-head">

                    <div>

                        <span class="eyebrow">
                            ${escapeHtml(
                                document.documentType
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                document.documentId
                            )}
                        </h3>

                        <p class="record-sub">
                            Land ${escapeHtml(
                                document.landId
                            )}
                        </p>

                    </div>

                    <span class="chip success">
                        BLOCKCHAIN ANCHORED
                    </span>

                </div>


                <div class="grid">

                    ${gridValue(
                        "Request",
                        document.requestId
                    )}

                    ${gridValue(
                        "Created",
                        formatDate(
                            document.createdAt
                        )
                    )}

                    ${gridValue(
                        "SHA-256",
                        document.sha256Hash
                    )}

                    ${gridValue(
                        "IPFS CID",
                        document.ipfsCid
                    )}

                    ${gridValue(
                        "Blockchain",
                        document.blockchainReference
                    )}

                    ${gridValue(
                        "Created By",
                        document.createdBy
                    )}

                </div>


                <div class="actions">

                    <button
                        class="btn primary"
                        onclick="openDocument('${escapeHtml(document.documentId)}')"
                    >
                        Open PDF
                    </button>

                </div>

            </article>
        `
        ).join("");
}


/* =========================================================
   OPEN PDF
   ========================================================= */

function openDocument(
    documentId
) {

    const url =
        `${API_BASE}/documents/` +
        `${encodeURIComponent(documentId)}/download`;

    window.open(
        url,
        "_blank"
    );
}


/* =========================================================
   LAND HISTORY
   ========================================================= */

async function loadHistoryFor(
    landId
) {

    showPage("history");

    $("historyLandId").value =
        landId;

    await loadHistory();
}


async function loadHistory() {

    const landId =
        $("historyLandId")
            ?.value
            .trim();

    if (!landId) {

        notify(
            "Enter a Land ID.",
            "error"
        );

        return;
    }


    try {

        const result =
            await api(
                `/requests/land/${encodeURIComponent(landId)}/history`
            );


        const events =
            extractArray(result);


        renderHistory(
            events
        );

    } catch (error) {

        showError(
            "historyContent",
            error.message
        );
    }
}


/* =========================================================
   HISTORY TIMELINE
   ========================================================= */

function renderHistory(
    events
) {

    if (!events.length) {

        $("historyContent").innerHTML = `

            <div class="empty">

                <h3>
                    No history found
                </h3>

                <p>
                    No lifecycle events are recorded
                    for this land yet.
                </p>

            </div>
        `;

        return;
    }


    $("historyContent").innerHTML = `

        <div class="timeline">

            ${events.map(
                event => `

                <div class="timeline-item">

                    <div class="timeline-dot"></div>

                    <div class="timeline-card">

                        <span class="eyebrow">
                            ${escapeHtml(
                                event.eventType
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                event.description ||
                                event.eventType
                            )}
                        </h3>

                        <p>
                            ${formatDate(
                                event.createdAt
                            )}
                            ·
                            Performed by
                            ${escapeHtml(
                                event.performedBy
                            )}
                        </p>


                        <div class="grid">

                            ${gridValue(
                                "Previous Owner",
                                event.previousOwnerId
                            )}

                            ${gridValue(
                                "New Owner",
                                event.newOwnerId
                            )}

                            ${gridValue(
                                "Previous Area",
                                event.previousArea
                            )}

                            ${gridValue(
                                "New Area",
                                event.newArea
                            )}

                            ${gridValue(
                                "Previous Land Use",
                                event.previousLandUse
                            )}

                            ${gridValue(
                                "New Land Use",
                                event.newLandUse
                            )}

                            ${gridValue(
                                "Document",
                                event.documentId
                            )}

                            ${gridValue(
                                "Blockchain",
                                event.blockchainReference
                            )}

                        </div>

                    </div>

                </div>
            `
            ).join("")}

        </div>
    `;
}


/* =========================================================
   AUDIT
   ========================================================= */

async function loadAudit() {

    if (!identity) {

        $("auditContent").innerHTML = `

            <div class="empty">

                <h3>
                    Connect MetaMask
                </h3>

                <p>
                    Audit information requires
                    authenticated access.
                </p>

            </div>
        `;

        return;
    }


    try {

        const result =
            await api("/audit");

        const events =
            extractArray(result);


        renderAudit(
            events
        );

    } catch (error) {

        showError(
            "auditContent",
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

    if (!events.length) {

        $("auditContent").innerHTML = `

            <div class="empty">

                <h3>
                    No audit events
                </h3>

                <p>
                    System activity will appear here.
                </p>

            </div>
        `;

        return;
    }


    $("auditContent").innerHTML =

        events.map(
            event => `

            <article class="record">

                <div class="record-head">

                    <div>

                        <span class="eyebrow">
                            ${escapeHtml(
                                event.entityType
                            )}
                        </span>

                        <h3>
                            ${escapeHtml(
                                event.action
                            )}
                        </h3>

                    </div>

                    <span class="chip">
                        ${formatDate(
                            event.createdAt
                        )}
                    </span>

                </div>


                <div class="grid">

                    ${gridValue(
                        "Entity",
                        event.entityId
                    )}

                    ${gridValue(
                        "Performed By",
                        event.performedBy
                    )}

                    ${gridValue(
                        "Details",
                        typeof event.details === "string"
                            ? event.details
                            : JSON.stringify(
                                event.details || {}
                            )
                    )}

                </div>

            </article>
        `
        ).join("");
}


/* =========================================================
   ERROR DISPLAY
   ========================================================= */

function showError(
    elementId,
    message
) {

    const element =
        $(elementId);

    if (!element) return;

    element.innerHTML = `

        <div class="empty">

            <h3>
                Unable to load data
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
    `;
}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindEvents() {

    /* Navigation */

    document
        .querySelectorAll(".nav-btn")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {
                        showPage(
                            button.dataset.page
                        );
                    }
                );
            }
        );


    /* Register */

    $("registerLandForm")
        ?.addEventListener(
            "submit",
            registerLand
        );


    /* Allocation */

    $("allocationForm")
        ?.addEventListener(
            "submit",
            allocateLand
        );


    /* Requests */

    $("requestForm")
        ?.addEventListener(
            "submit",
            createRequest
        );


    $("requestType")
        ?.addEventListener(
            "change",
            updateRequestFields
        );


    /* Search with Enter */

    $("landSearchInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchLand();
                }
            }
        );


    /* Wallet changes */

    if (
        window.ethereum
    ) {

        window.ethereum.on(
            "accountsChanged",
            async accounts => {

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


                await loadIdentity();

                await loadBlockchain();

                updateSessionUI();

                if (identity) {

                    await initializeApplication();

                } else {

                    renderPublicDashboard();
                }
            }
        );


        window.ethereum.on(
            "chainChanged",
            async () => {

                await loadBlockchain();

                if (identity) {

                    await loadDashboard();
                }
            }
        );
    }
}


/* =========================================================
   RESTORE SESSION
   ========================================================= */

async function restoreSession() {

    if (!window.ethereum) {

        renderPublicDashboard();

        return;
    }


    const savedWallet =
        sessionStorage.getItem(
            "lr_wallet"
        );


    if (!savedWallet) {

        await loadBlockchain();

        renderPublicDashboard();

        return;
    }


    try {

        const accounts =
            await window.ethereum.request({
                method: "eth_accounts"
            });


        if (
            !accounts ||
            !accounts.length
        ) {

            await loadBlockchain();

            renderPublicDashboard();

            return;
        }


        walletAddress =
            accounts[0]
                .toLowerCase();


        await loadIdentity();

        await loadBlockchain();

        updateSessionUI();


        if (identity) {

            await initializeApplication();

        } else {

            renderPublicDashboard();
        }

    } catch (error) {

        console.error(
            "Session restore failed:",
            error
        );

        renderPublicDashboard();
    }
}


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        bindEvents();

        updateRequestFields();

        await restoreSession();
    }
);