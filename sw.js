// Keep in sync with js/version.js when you deploy.
const APP_VERSION = "2.0.1";
const CACHE_NAME = `crip-weather-${APP_VERSION}`;
const CONFIG_KEY = "/__weather_config__";

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./css/main.css",
    "./css/location.css",
    "./js/main.js",
    "./js/consts.js",
    "./js/version.js",
    "./js/weather.js",
    "./js/locations.js",
    "./js/weather-visuals.js",
    "./js/weather-animations.js",
    "./js/pwa.js",
    "./assets/icon.png",
    "./manifest.webmanifest"
];

const WARNING_CODES = new Set([45, 48, 55, 65, 75, 81, 82, 95]);

const WEATHER_LABELS = {
    0: "Sunny", 1: "Sunny", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
    55: "Dense drizzle", 61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Light snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Light rain showers", 81: "Moderate rain showers",
    82: "Violent rain showers", 95: "Thunderstorm"
};

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k.startsWith("crip-weather-") && k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        event.respondWith(fetch(request).catch(() => caches.match(request)));
        return;
    }

    const isDocument = request.mode === "navigate" ||
        request.destination === "document" ||
        url.pathname.endsWith(".html") ||
        url.pathname.endsWith("/");

    const isStatic = /\.(js|css|png|svg|webmanifest)$/i.test(url.pathname);

    if (isDocument) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (isStatic) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
    );
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        return cache.match("./index.html");
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkPromise = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    });

    return cached || networkPromise;
}

self.addEventListener("message", (event) => {
    if (event.data?.type === "CHECK_WEATHER") {
        event.waitUntil(runWeatherCheck());
    }

    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("sync", (event) => {
    if (event.tag === "weather-check") {
        event.waitUntil(runWeatherCheck());
    }
});

self.addEventListener("periodicsync", (event) => {
    if (event.tag === "weather-check") {
        event.waitUntil(runWeatherCheck());
    }
});

async function getConfig() {
    const cache = await caches.open("crip-weather-config");
    const res = await cache.match(CONFIG_KEY);
    if (!res) return null;
    return res.json();
}

async function saveConfig(config) {
    const cache = await caches.open("crip-weather-config");
    await cache.put(CONFIG_KEY, new Response(JSON.stringify(config)));
}

async function fetchWeather(lat, lon) {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code,precipitation,wind_speed_10m` +
        `&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    return res.json();
}

async function fetchOfficialAlerts(lat, lon) {
    try {
        const res = await fetch(
            `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
            { headers: { Accept: "application/geo+json", "User-Agent": "CripWeather/2.0" } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features || []).map((f) => {
            const p = f.properties || {};
            return {
                id: p.id || `${p.sent}-${p.event}`,
                headline: p.headline || p.event || "Weather alert",
                description: p.description || "",
                severity: p.severity || "Unknown"
            };
        });
    } catch {
        return [];
    }
}

async function showNotification(title, options = {}) {
    const icon = new URL("assets/icon.png", self.registration.scope).href;
    await self.registration.showNotification(title, {
        icon,
        badge: icon,
        vibrate: [120, 60, 120],
        ...options
    });
}

async function runWeatherCheck() {
    const config = await getConfig();
    if (!config?.alertsEnabled || !config.lat || !config.lon) return;

    const weather = await fetchWeather(config.lat, config.lon);
    const current = weather.current;
    const code = current.weather_code;
    const label = WEATHER_LABELS[code] || "Unknown";
    const temp = Math.round(current.temperature_2m);
    const prev = config.lastSnapshot;
    const notified = new Set(config.notifiedAlertIds || []);

    if (prev) {
        if (prev.weatherCode !== code) {
            await showNotification("Weather changed", {
                body: `${config.locationName}: ${prev.label} → ${label} (${temp}°C)`,
                tag: "weather-change",
                data: { url: "./" }
            });
        } else if (Math.abs(prev.temp - temp) >= 4) {
            await showNotification("Temperature update", {
                body: `${config.locationName}: ${prev.temp}°C → ${temp}°C`,
                tag: "temp-change",
                data: { url: "./" }
            });
        }
    }

    if (WARNING_CODES.has(code) && (!prev || prev.weatherCode !== code)) {
        await showNotification("Weather warning", {
            body: `${config.locationName}: ${label} — ${temp}°C, wind ${current.wind_speed_10m} km/h`,
            tag: `severe-${code}`,
            requireInteraction: true,
            data: { url: "./" }
        });
    }

    const alerts = await fetchOfficialAlerts(config.lat, config.lon);
    for (const alert of alerts) {
        if (!alert.id || notified.has(alert.id)) continue;
        notified.add(alert.id);
        await showNotification(alert.headline, {
            body: alert.description?.slice(0, 180) || alert.severity,
            tag: `alert-${alert.id}`,
            requireInteraction: true,
            data: { url: "./" }
        });
    }

    config.lastSnapshot = {
        weatherCode: code,
        label,
        temp,
        timestamp: Date.now()
    };
    config.notifiedAlertIds = [...notified].slice(-50);
    config.lastChecked = Date.now();
    await saveConfig(config);
}

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            if (clients.length) return clients[0].focus();
            return self.clients.openWindow(event.notification.data?.url || "./");
        })
    );
});
