const STORAGE_KEY = "cripWeatherUnits";

export function getUnitSystem() {
    return localStorage.getItem(STORAGE_KEY) === "imperial" ? "imperial" : "metric";
}

export function setUnitSystem(system) {
    localStorage.setItem(STORAGE_KEY, system === "imperial" ? "imperial" : "metric");
}

export function toggleUnitSystem() {
    const next = getUnitSystem() === "metric" ? "imperial" : "metric";
    setUnitSystem(next);
    return next;
}

export function formatWind(kmh) {
    const speed = Number(kmh);
    if (getUnitSystem() === "imperial") {
        return `${(speed * 0.621371).toFixed(1)} mph`;
    }
    return `${speed} km/h`;
}

export function formatVisibility(meters) {
    const km = Number(meters) / 1000;
    if (getUnitSystem() === "imperial") {
        return `${(km * 0.621371).toFixed(1)} mi`;
    }
    return `${Math.round(km)} km`;
}

export function getUnitToggleLabel() {
    return getUnitSystem() === "metric" ? "Switch to mph & miles" : "Switch to km/h & km";
}

export function getUnitBadge() {
    return getUnitSystem() === "metric" ? "km/h · km" : "mph · mi";
}
