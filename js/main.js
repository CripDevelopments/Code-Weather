import { e } from "./consts.js";
import { APP_VERSION } from "./version.js";
import { getCoords, getWeather, getWeatherInfo } from "./weather.js";
import { getWeatherGif } from "./weather-visuals.js";
import { renderWeatherVisual } from "./weather-animations.js";
import {
    geoToApiLocation,
    getActiveLocation as getSavedActive,
    getPrefs,
    getSavedLocations,
    removeLocation,
    saveLocation,
    setActiveLocationId,
    setPrefs
} from "./locations.js";
import {
    formatVisibility,
    formatWind,
    getUnitBadge,
    getUnitToggleLabel,
    toggleUnitSystem
} from "./units.js";
import {
    getActiveLocation as getWatchTarget,
    initPwa,
    setActiveLocation as setWatchTarget,
    updateWatchLocation
} from "./pwa.js";

let lastWeatherSnapshot = null;

function updateUnitToggleUi() {
    const label = document.getElementById("unitToggleLabel");
    const btn = document.getElementById("unitToggle");
    if (label) label.textContent = getUnitBadge();
    if (btn) btn.title = getUnitToggleLabel();
}

function applyWindVisibilityUnits(current) {
    document.getElementById("windSpeed").textContent = formatWind(current.wind_speed_10m);
    document.getElementById("visibility").textContent = formatVisibility(current.visibility);
}

function getSuffix(day) {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

function updateTime() {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = now.getDate();

    e("dayDisplay").textContent = days[now.getDay()];
    document.getElementById("dateDisplay").textContent =
        `${day} ${months[now.getMonth()]} ${now.getFullYear()}`;
    document.getElementById("timeDisplay").textContent = now.toTimeString().slice(0, 8);
    document.getElementById("year").textContent = now.getFullYear();
}

updateTime();
setInterval(updateTime, 1000);

async function renderWeather(location, weather) {
    const current = weather.current;
    const daily = weather.daily;
    const weatherNow = getWeatherInfo(current.weather_code);
    const visual = getWeatherGif(current.weather_code);

    document.getElementById("location").innerHTML =
        `<i class="fas fa-map-marker-alt"></i> ${location.name}, ${location.country} <i class="fas fa-map-marker-alt"></i>`;

    document.getElementById("currentTemp").textContent = `${Math.round(current.temperature_2m)}°C`;
    await renderWeatherVisual(document.getElementById("currentWeatherIcon"), visual.type);
    document.getElementById("currentCondition").textContent = weatherNow.label;
    document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
    applyWindVisibilityUnits(current);
    lastWeatherSnapshot = current;
    document.getElementById("pressure").textContent = `${current.pressure_msl} hPa`;
    document.getElementById("feelsLike").textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById("cloudCover").textContent = `${current.cloud_cover}%`;

    const formatTime = (iso) =>
        new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    document.getElementById("sunrise").textContent = formatTime(daily.sunrise[0]);
    document.getElementById("sunset").textContent = formatTime(daily.sunset[0]);

    const forecastBody = document.getElementById("forecastBody");
    forecastBody.innerHTML = "";

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 5; i++) {
        const date = new Date(daily.time[i]);
        const day = dayNames[date.getDay()];
        const dayNum = date.getDate();
        const month = date.toLocaleString("en-US", { month: "short" });
        const info = getWeatherInfo(daily.weather_code[i]);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="forecast-day" data-label="Day">
                <span class="day-name">${day}</span><br>
                <span class="day-date">${dayNum} ${month}</span>
            </td>
            <td data-label="Condition">
                <span class="forecast-condition">
                    <i class="fas ${info.icon} forecast-icon"></i>
                    <span>${info.label}</span>
                </span>
            </td>
            <td class="forecast-temp" data-label="Temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</td>
            <td class="forecast-sun" data-label="Sunrise"><i class="fas fa-sun"></i> ${formatTime(daily.sunrise[i])}</td>
            <td class="forecast-sun" data-label="Sunset"><i class="fas fa-sun sunset-icon"></i> ${formatTime(daily.sunset[i])}</td>
        `;
        forecastBody.appendChild(row);
    }

    setWatchTarget(location, weather);
    updateWatchLocation(location, weather);
    renderLocationBar();
}

async function loadLocation(geoLocation, { persist = true } = {}) {
    document.getElementById("forecastBody").innerHTML =
        `<tr><td colspan="5" style="text-align:center; padding:2rem;">Loading...</td></tr>`;

    const weather = await getWeather(geoLocation.latitude, geoLocation.longitude);
    await renderWeather(geoLocation, weather);

    if (persist) {
        saveLocation(geoLocation);
        document.getElementById("cityInput").value = geoLocation.name;
    }
}

async function loadSavedLocation(saved) {
    await loadLocation(geoToApiLocation(saved), { persist: false });
    document.getElementById("cityInput").value = saved.name;
}

function renderLocationBar() {
    const bar = document.getElementById("savedLocations");
    const locations = getSavedLocations();
    const active = getSavedActive();

    if (!locations.length) {
        bar.innerHTML = `<p class="saved-empty">Search a city and tap <strong>Save</strong> to build your location list.</p>`;
        return;
    }

    bar.innerHTML = locations.map((loc) => `
        <button type="button" class="location-pill${loc.id === active?.id ? " active" : ""}" data-id="${loc.id}">
            <i class="fas fa-map-marker-alt"></i>
            <span>${loc.name}</span>
            <span class="pill-remove" data-remove="${loc.id}" title="Remove" aria-label="Remove ${loc.name}">×</span>
        </button>
    `).join("");

    bar.querySelectorAll(".location-pill").forEach((pill) => {
        pill.addEventListener("click", async (event) => {
            if (event.target.closest("[data-remove]")) return;
            const id = pill.dataset.id;
            const saved = setActiveLocationId(id);
            if (saved) await loadSavedLocation(saved);
        });
    });

    bar.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            event.stopPropagation();
            const state = removeLocation(btn.dataset.remove);
            renderLocationBar();
            const next = state.locations.find((l) => l.id === state.activeId);
            if (next) await loadSavedLocation(next);
        });
    });
}

document.getElementById("searchBtn").addEventListener("click", searchCity);
document.getElementById("saveLocationBtn").addEventListener("click", async () => {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;
    try {
        const location = await getCoords(city);
        saveLocation(location);
        await loadLocation(location, { persist: false });
        renderLocationBar();
    } catch {
        alert("Could not save that city. Check the name and try again.");
    }
});

document.getElementById("gpsBtn").addEventListener("click", requestGpsLocation);
document.getElementById("cityInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchCity();
});

async function searchCity() {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;

    try {
        const location = await getCoords(city);
        await loadLocation(location);
    } catch {
        document.getElementById("forecastBody").innerHTML =
            `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#ff6b6b;">City not found. Try again.</td></tr>`;
    }
}

async function getCityFromCoords(lat, lon) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await res.json();
    return (
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.county ||
        "Unknown"
    );
}

async function requestGpsLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const city = await getCityFromCoords(lat, lon);
            const location = await getCoords(city);
            setPrefs({ geoAllowed: true });
            await loadLocation(location);
        } catch (err) {
            console.error("GPS location failed", err);
        }
    }, (err) => {
        console.warn("Location denied", err);
        setPrefs({ geoAllowed: false });
    });
}

function showGeoPrompt() {
    document.getElementById("locationPrompt").classList.remove("hidden");
}

function hideGeoPrompt() {
    document.getElementById("locationPrompt").classList.add("hidden");
}

initPwa(getWatchTarget);

document.getElementById("unitToggle")?.addEventListener("click", () => {
    toggleUnitSystem();
    updateUnitToggleUi();
    if (lastWeatherSnapshot) applyWindVisibilityUnits(lastWeatherSnapshot);
});

function setupBannerDismiss() {
    const panel = document.getElementById("installPanel");
    const btn = document.getElementById("bannerDismiss");
    if (!panel || !btn) return;

    if (localStorage.getItem("cripBannerDismissed") === "1") {
        panel.classList.add("collapsed");
    }

    btn.addEventListener("click", () => {
        panel.classList.add("collapsed");
        localStorage.setItem("cripBannerDismissed", "1");
    });
}

window.addEventListener("load", async () => {
    const versionEl = document.getElementById("appVersion");
    if (versionEl) versionEl.textContent = APP_VERSION;

    updateUnitToggleUi();
    setupBannerDismiss();
    renderLocationBar();

    const prefs = getPrefs();
    const saved = getSavedActive();
    const savedList = getSavedLocations();

    if (saved) {
        hideGeoPrompt();
        try {
            await loadSavedLocation(saved);
            return;
        } catch (err) {
            console.warn("Saved location load failed", err);
        }
    }

    if (savedList.length) {
        hideGeoPrompt();
        await loadSavedLocation(savedList[0]);
        return;
    }

    if (prefs.geoPromptSeen) {
        hideGeoPrompt();
        document.getElementById("cityInput").value = "London";
        await searchCity();
        return;
    }

    showGeoPrompt();

    document.getElementById("allowLocation").addEventListener("click", async () => {
        setPrefs({ geoPromptSeen: true, geoAllowed: true });
        hideGeoPrompt();
        await requestGpsLocation();
    });

    document.getElementById("denyLocation").addEventListener("click", async () => {
        setPrefs({ geoPromptSeen: true, geoAllowed: false });
        hideGeoPrompt();
        document.getElementById("cityInput").value = "London";
        await searchCity();
    });
});
