import { buildSnapshot, getOfficialAlerts, isSevereWeather } from "./weather.js";
import { APP_VERSION } from "./version.js";

const CONFIG_KEY = "/__weather_config__";
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

let deferredInstallPrompt = null;
let checkTimer = null;
let swRegistration = null;
let isRefreshing = false;

const ICON_URL = new URL("./assets/icon.png", window.location.href).href;

export async function initPwa(onLocationUpdate) {
    await registerServiceWorker();
    setupInstallPrompt();
    setupNotifyButton(onLocationUpdate);
    setupAppUpdates();
    await syncNotifyButtonState();

    const config = await getWatchConfig();
    if (config.alertsEnabled && Notification.permission === "granted") {
        await registerBackgroundSync();
        scheduleClientChecks();
    }
}

async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;

    try {
        swRegistration = await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`, {
            updateViaCache: "none"
        });
        await navigator.serviceWorker.ready;

        setupUpdateListeners(swRegistration);
        checkForAppUpdate();

        if ("periodicSync" in swRegistration) {
            try {
                await swRegistration.periodicSync.register("weather-check", {
                    minInterval: CHECK_INTERVAL_MS
                });
            } catch {
                // Periodic sync needs installed PWA + permission on some browsers
            }
        }

        return swRegistration;
    } catch (err) {
        console.warn("Service worker registration failed", err);
        return null;
    }
}

async function getSwRegistration() {
    if (swRegistration) return swRegistration;
    if (!("serviceWorker" in navigator)) return null;
    return navigator.serviceWorker.ready;
}

function setupAppUpdates() {
    document.getElementById("applyUpdateBtn")?.addEventListener("click", applyPendingUpdate);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (isRefreshing) return;
        isRefreshing = true;
        window.location.reload();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForAppUpdate();
    });

    window.addEventListener("focus", checkForAppUpdate);
}

function setupUpdateListeners(reg) {
    reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateBanner();
            }
        });
    });

    if (reg.waiting) showUpdateBanner();
}

async function checkForAppUpdate() {
    const reg = await getSwRegistration();
    reg?.update();
}

function showUpdateBanner() {
    document.getElementById("updateBanner")?.classList.remove("hidden");
}

function hideUpdateBanner() {
    document.getElementById("updateBanner")?.classList.add("hidden");
}

function applyPendingUpdate() {
    const waiting = swRegistration?.waiting;
    if (!waiting) {
        hideUpdateBanner();
        window.location.reload();
        return;
    }

    waiting.postMessage({ type: "SKIP_WAITING" });
    hideUpdateBanner();
}

function isStandaloneApp() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
    );
}

function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function notificationsSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
}

async function showAppNotification(title, options = {}) {
    const reg = await getSwRegistration();
    const payload = {
        icon: ICON_URL,
        badge: ICON_URL,
        vibrate: [100, 50, 100],
        ...options
    };

    if (reg?.showNotification) {
        await reg.showNotification(title, payload);
        return;
    }

    if (Notification.permission === "granted") {
        new Notification(title, { icon: ICON_URL, ...options });
    }
}

function showNotifyHint(message) {
    const hint = document.getElementById("notifyHint");
    if (!hint) return;
    hint.textContent = message;
    hint.classList.remove("hidden");
}

function hideNotifyHint() {
    document.getElementById("notifyHint")?.classList.add("hidden");
}

async function registerBackgroundSync() {
    const reg = await getSwRegistration();
    if (!reg) return;

    if ("sync" in reg) {
        try {
            await reg.sync.register("weather-check");
        } catch {
            // Background sync may require installed PWA
        }
    }

    if ("periodicSync" in reg) {
        try {
            await reg.periodicSync.register("weather-check", { minInterval: CHECK_INTERVAL_MS });
        } catch {
            // Periodic sync permission may be required
        }
    }
}

function setupInstallPrompt() {
    const installBtn = document.getElementById("installBtn");
    const installPanel = document.getElementById("installPanel");
    const installGuide = document.getElementById("installGuide");
    const installHelpBtn = document.getElementById("installHelpBtn");

    if (isStandaloneApp() && installPanel) {
        const brand = installPanel.querySelector(".app-banner-brand");
        const desc = installPanel.querySelector(".app-banner-desc");
        const actions = installPanel.querySelector(".app-actions");
        if (brand) {
            brand.innerHTML = `
                <img src="assets/icon.png" alt="" class="banner-icon" width="44" height="44">
                <div>
                    <p class="app-banner-tag">APP INSTALLED</p>
                    <p class="app-banner-title">Crip Weather is on your device</p>
                </div>
            `;
        }
        if (desc) {
            desc.textContent = "Tap the bell icon in the header to enable weather alerts for your saved locations.";
        }
        if (actions) actions.classList.add("hidden");
        installPanel.querySelector(".banner-dismiss")?.classList.add("hidden");
        return;
    }

    installHelpBtn?.addEventListener("click", () => {
        installGuide?.classList.toggle("hidden");
    });

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        installBtn?.classList.remove("hidden");
    });

    installBtn?.addEventListener("click", async () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            installBtn.classList.add("hidden");
            return;
        }
        installGuide?.classList.remove("hidden");
    });

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
        installBtn?.classList.add("hidden");
    });
}

function setupNotifyButton(onLocationUpdate) {
    const notifyBtn = document.getElementById("notifyBtn");
    if (!notifyBtn) return;

    notifyBtn.addEventListener("click", async () => {
        const config = await getWatchConfig();

        if (config.alertsEnabled) {
            await disableAlerts();
            await syncNotifyButtonState();
            hideNotifyHint();
            return;
        }

        if (!notificationsSupported()) {
            showNotifyHint("Notifications are not supported in this browser.");
            return;
        }

        if (isIos() && !isStandaloneApp()) {
            showNotifyHint("On iPhone, add Crip Weather to your Home Screen first, then open the app and tap the bell to enable alerts.");
            return;
        }

        await registerServiceWorker();

        let permission = Notification.permission;
        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
            showNotifyHint("Notifications blocked. Allow them in your browser or phone settings, then tap the bell again.");
            await syncNotifyButtonState();
            return;
        }

        const location = onLocationUpdate?.();
        if (!location) {
            showNotifyHint("Search or select a city first so alerts know which location to monitor.");
            return;
        }

        await enableAlerts(location);
        await registerBackgroundSync();
        await syncNotifyButtonState();
        scheduleClientChecks();
        hideNotifyHint();

        const reg = await getSwRegistration();
        reg?.active?.postMessage({ type: "CHECK_WEATHER" });

        await showAppNotification("Weather alerts enabled", {
            body: `Monitoring ${location.locationName} for changes and warnings.`,
            tag: "alerts-enabled"
        });
    });
}

export async function getWatchConfig() {
    const cache = await caches.open("crip-weather-config");
    const res = await cache.match(CONFIG_KEY);
    return res ? res.json() : { alertsEnabled: false };
}

async function saveWatchConfig(config) {
    const cache = await caches.open("crip-weather-config");
    await cache.put(CONFIG_KEY, new Response(JSON.stringify(config)));
}

export async function enableAlerts(location) {
    const existing = await getWatchConfig();
    await saveWatchConfig({
        ...existing,
        alertsEnabled: true,
        locationName: location.locationName,
        lat: location.lat,
        lon: location.lon,
        lastSnapshot: location.snapshot || existing.lastSnapshot || null,
        notifiedAlertIds: existing.notifiedAlertIds || []
    });
}

export async function disableAlerts() {
    const config = await getWatchConfig();
    config.alertsEnabled = false;
    await saveWatchConfig(config);
    clearClientChecks();
}

export async function updateWatchLocation(location, weather) {
    const config = await getWatchConfig();
    if (!config.alertsEnabled) return;

    const previousSnapshot = config.lastSnapshot;
    const snapshot = buildSnapshot(location, weather);
    const notifiedAlertIds = await checkAlertsNow(snapshot, previousSnapshot, config);

    await saveWatchConfig({
        ...config,
        locationName: snapshot.locationName,
        lat: snapshot.lat,
        lon: snapshot.lon,
        lastSnapshot: snapshot,
        notifiedAlertIds,
        lastChecked: Date.now()
    });

    scheduleClientChecks();
}

async function checkAlertsNow(snapshot, prev, config) {
    const notified = new Set(config.notifiedAlertIds || []);

    if (Notification.permission !== "granted") {
        return [...notified];
    }

    if (prev && prev.weatherCode !== snapshot.weatherCode) {
        await showAppNotification("Weather changed", {
            body: `${snapshot.locationName}: ${prev.label} → ${snapshot.label}`,
            tag: "weather-change"
        });
    }

    if (isSevereWeather(snapshot.weatherCode) && (!prev || prev.weatherCode !== snapshot.weatherCode)) {
        await showAppNotification("Weather warning", {
            body: `${snapshot.locationName}: ${snapshot.label} (${snapshot.temp}°C)`,
            tag: `severe-${snapshot.weatherCode}`,
            requireInteraction: true
        });
    }

    const alerts = await getOfficialAlerts(snapshot.lat, snapshot.lon);
    for (const alert of alerts) {
        if (!alert.id || notified.has(alert.id)) continue;
        notified.add(alert.id);
        await showAppNotification(alert.headline, {
            body: alert.description?.slice(0, 180) || alert.severity,
            tag: `alert-${alert.id}`,
            requireInteraction: true
        });
    }

    return [...notified].slice(-50);
}

function scheduleClientChecks() {
    clearClientChecks();
    checkTimer = setInterval(async () => {
        const reg = await getSwRegistration();
        reg?.active?.postMessage({ type: "CHECK_WEATHER" });
    }, CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibilityCheck);
}

function clearClientChecks() {
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = null;
    document.removeEventListener("visibilitychange", onVisibilityCheck);
}

async function onVisibilityCheck() {
    if (document.visibilityState !== "visible") return;
    const config = await getWatchConfig();
    if (!config.alertsEnabled) return;
    const reg = await getSwRegistration();
    reg?.active?.postMessage({ type: "CHECK_WEATHER" });
}

async function syncNotifyButtonState() {
    const notifyBtn = document.getElementById("notifyBtn");
    if (!notifyBtn) return;

    const config = await getWatchConfig();
    const permission = "Notification" in window ? Notification.permission : "denied";
    const active = config.alertsEnabled && permission === "granted";

    notifyBtn.classList.toggle("active", active);
    notifyBtn.title = active ? "Weather alerts on — tap to disable" : "Enable weather alerts";
    notifyBtn.innerHTML = active
        ? '<i class="fas fa-bell"></i>'
        : '<i class="fas fa-bell-slash"></i>';

    if (active) scheduleClientChecks();
}

let lastLocation = null;

export function setActiveLocation(location, weather) {
    lastLocation = {
        locationName: `${location.name}, ${location.country}`,
        lat: location.latitude,
        lon: location.longitude,
        snapshot: weather ? buildSnapshot(location, weather) : null
    };
    return lastLocation;
}

export function getActiveLocation() {
    return lastLocation;
}
