export const WARNING_CODES = new Set([45, 48, 55, 65, 75, 81, 82, 95]);

export function getWeatherInfo(code) {
    const codes = {
        0: { label: "Sunny", icon: "fa-sun" },
        1: { label: "Sunny", icon: "fa-sun" },
        2: { label: "Partly cloudy", icon: "fa-cloud-sun" },
        3: { label: "Overcast", icon: "fa-cloud" },
        45: { label: "Fog", icon: "fa-smog" },
        48: { label: "Rime fog", icon: "fa-smog" },
        51: { label: "Light drizzle", icon: "fa-cloud-rain" },
        53: { label: "Moderate drizzle", icon: "fa-cloud-rain" },
        55: { label: "Dense drizzle", icon: "fa-cloud-showers-heavy" },
        61: { label: "Light rain", icon: "fa-cloud-rain" },
        63: { label: "Moderate rain", icon: "fa-cloud-rain" },
        65: { label: "Heavy rain", icon: "fa-cloud-showers-heavy" },
        71: { label: "Light snow", icon: "fa-snowflake" },
        73: { label: "Moderate snow", icon: "fa-snowflake" },
        75: { label: "Heavy snow", icon: "fa-snowflake" },
        80: { label: "Light rain showers", icon: "fa-cloud-rain" },
        81: { label: "Moderate rain showers", icon: "fa-cloud-rain" },
        82: { label: "Violent rain showers", icon: "fa-cloud-showers-heavy" },
        95: { label: "Thunderstorm", icon: "fa-bolt" }
    };
    return codes[code] || { label: "Unknown", icon: "fa-question-circle" };
}

export function isSevereWeather(code) {
    return WARNING_CODES.has(code);
}

export async function getCoords(city) {
    const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (!data.results) throw new Error("City not found");
    return data.results[0];
}

export async function getWeather(lat, lon) {
    const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,cloud_cover,visibility` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
        `&timezone=auto&forecast_days=5`
    );
    if (!res.ok) throw new Error("Weather fetch failed");
    return res.json();
}

export async function getOfficialAlerts(lat, lon) {
    try {
        const res = await fetch(
            `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
            { headers: { Accept: "application/geo+json", "User-Agent": "CripWeather/2.0 (https://crip-developments.com)" } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features || []).map((feature) => {
            const props = feature.properties || {};
            return {
                id: props.id || props.sent || props.headline,
                headline: props.headline || props.event || "Weather alert",
                description: props.description || props.event || "",
                severity: props.severity || "Unknown",
                event: props.event || "Alert"
            };
        });
    } catch {
        return [];
    }
}

export function buildSnapshot(location, weather) {
    const current = weather.current;
    const info = getWeatherInfo(current.weather_code);
    return {
        locationName: `${location.name}, ${location.country}`,
        lat: location.latitude,
        lon: location.longitude,
        weatherCode: current.weather_code,
        label: info.label,
        temp: Math.round(current.temperature_2m),
        wind: current.wind_speed_10m,
        precipitation: current.precipitation,
        timestamp: Date.now()
    };
}
