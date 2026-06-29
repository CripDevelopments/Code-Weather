const STORAGE_KEY = "cripWeatherData";

const defaultState = () => ({
    locations: [],
    activeId: null,
    prefs: {
        geoPromptSeen: false,
        geoAllowed: false
    }
});

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
    } catch {
        return defaultState();
    }
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
    return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getPrefs() {
    return loadState().prefs;
}

export function setPrefs(updates) {
    const state = loadState();
    state.prefs = { ...state.prefs, ...updates };
    saveState(state);
    return state.prefs;
}

export function getSavedLocations() {
    return loadState().locations;
}

export function getActiveLocation() {
    const state = loadState();
    return state.locations.find((l) => l.id === state.activeId) || null;
}

export function normalizeLocation(geoResult) {
    return {
        id: uid(),
        name: geoResult.name,
        country: geoResult.country,
        lat: geoResult.latitude,
        lon: geoResult.longitude,
        label: `${geoResult.name}, ${geoResult.country}`
    };
}

export function locationFromGeo(geoResult, existingId = null) {
    return {
        id: existingId || uid(),
        name: geoResult.name,
        country: geoResult.country,
        lat: geoResult.latitude,
        lon: geoResult.longitude,
        label: `${geoResult.name}, ${geoResult.country}`
    };
}

export function saveLocation(geoResult) {
    const state = loadState();
    const existing = state.locations.find(
        (l) => l.name === geoResult.name && l.country === geoResult.country
    );

    if (existing) {
        state.activeId = existing.id;
        saveState(state);
        return existing;
    }

    const entry = normalizeLocation(geoResult);
    state.locations.unshift(entry);
    state.activeId = entry.id;
    saveState(state);
    return entry;
}

export function setActiveLocationId(id) {
    const state = loadState();
    if (!state.locations.some((l) => l.id === id)) return null;
    state.activeId = id;
    saveState(state);
    return state.locations.find((l) => l.id === id);
}

export function removeLocation(id) {
    const state = loadState();
    state.locations = state.locations.filter((l) => l.id !== id);
    if (state.activeId === id) {
        state.activeId = state.locations[0]?.id || null;
    }
    saveState(state);
    return state;
}

export function geoToApiLocation(saved) {
    return {
        name: saved.name,
        country: saved.country,
        latitude: saved.lat,
        longitude: saved.lon
    };
}
