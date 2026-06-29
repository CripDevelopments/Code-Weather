import { buildSnapshot, getOfficialAlerts, isSevereWeather } from "./weather.js";

const CONFIG_KEY = "/__weather_config__";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

let deferredInstallPrompt = null;
let checkTimer = null;

export async function initPwa(onLocationUpdate) {
    registerServiceWorker();
    setupInstallPrompt();
    setupNotifyButton(onLocationUpdate);
    await syncNotifyButtonState();
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", async () => {
        try {
            const reg = await navigator.serviceWorker.register("./sw.js");
            if ("periodicSync" in reg) {
                try {
                    await reg.periodicSync.register("weather-check", { minInterval: CHECK_INTERVAL_MS });
                } catch {
                    // Permission or browser support may block periodic sync
                }
            }
        } catch (err) {
            console.warn("Service worker registration failed", err);
        }
    });
}

function setupInstallPrompt() {
    const installBtn = document.getElementById("installBtn");
    const installPanel = document.getElementById("installPanel");
    const installGuide = document.getElementById("installGuide");
    const installHelpBtn = document.getElementById("installHelpBtn");
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone && installPanel) {
        installPanel.innerHTML = `
            <div class="app-banner-brand">
                <img src="assets/icon.png" alt="" class="banner-icon" width="44" height="44">
                <div>
                    <p class="app-banner-tag">APP INSTALLED</p>
                    <p class="app-banner-title">You're using Crip Weather</p>
                </div>
            </div>
            <p class="app-banner-desc">The website stays live online anytime. Switch locations below or enable weather alerts.</p>
        `;
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
            return;
        }

        if (!("Notification" in window)) {
            alert("Notifications are not supported in this browser.");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            await syncNotifyButtonState();
            return;
        }

        const location = onLocationUpdate?.();
        if (!location) {
            alert("Search for a city first so alerts know which location to monitor.");
            return;
        }

        await enableAlerts(location);
        await syncNotifyButtonState();
        scheduleClientChecks();

        if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "CHECK_WEATHER" });
        }

        new Notification("Crip Weather alerts enabled", {
            body: `Monitoring ${location.locationName} for changes and warnings.`,
            icon: "./assets/icon.png"
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

    if (!("Notification" in window) || Notification.permission !== "granted") {
        return [...notified];
    }

    if (prev && prev.weatherCode !== snapshot.weatherCode) {
        new Notification("Weather changed", {
            body: `${snapshot.locationName}: ${prev.label} → ${snapshot.label}`,
            icon: "./assets/icon.png",
            tag: "weather-change"
        });
    }

    if (isSevereWeather(snapshot.weatherCode) && (!prev || prev.weatherCode !== snapshot.weatherCode)) {
        new Notification("Weather warning", {
            body: `${snapshot.locationName}: ${snapshot.label} (${snapshot.temp}°C)`,
            icon: "./assets/icon.png",
            tag: `severe-${snapshot.weatherCode}`
        });
    }

    const alerts = await getOfficialAlerts(snapshot.lat, snapshot.lon);
    for (const alert of alerts) {
        if (!alert.id || notified.has(alert.id)) continue;
        notified.add(alert.id);
        new Notification(alert.headline, {
            body: alert.description?.slice(0, 180) || alert.severity,
            icon: "./assets/icon.png",
            tag: `alert-${alert.id}`
        });
    }

    return [...notified].slice(-50);
}

function scheduleClientChecks() {
    clearClientChecks();
    checkTimer = setInterval(() => {
        if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "CHECK_WEATHER" });
        }
    }, CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibilityCheck);
}

function clearClientChecks() {
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = null;
    document.removeEventListener("visibilitychange", onVisibilityCheck);
}

function onVisibilityCheck() {
    if (document.visibilityState === "visible" && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CHECK_WEATHER" });
    }
}

async function syncNotifyButtonState() {
    const notifyBtn = document.getElementById("notifyBtn");
    if (!notifyBtn) return;

    const config = await getWatchConfig();
    const permission = "Notification" in window ? Notification.permission : "denied";
    const active = config.alertsEnabled && permission === "granted";

    notifyBtn.classList.toggle("active", active);
    notifyBtn.innerHTML = active
        ? '<i class="fas fa-bell"></i> Alerts On'
        : '<i class="fas fa-bell-slash"></i> Weather Alerts';

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
