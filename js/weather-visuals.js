export function getWeatherGif(code) {
    const type = getWeatherVisualType(code);
    return {
        type,
        src: `assets/weather/${type}.svg`,
        alt: getWeatherVisualLabel(type)
    };
}

function getWeatherVisualType(code) {
    if (code === 0 || code === 1) return "sunny";
    if (code === 2) return "partly-cloudy";
    if (code === 3) return "cloudy";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 55) return "drizzle";
    if (code >= 61 && code <= 67) return "rain";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 80 && code <= 82) return "heavy-rain";
    if (code >= 95) return "thunder";
    return "partly-cloudy";
}

function getWeatherVisualLabel(type) {
    const labels = {
        sunny: "Sunny conditions",
        "partly-cloudy": "Partly cloudy conditions",
        cloudy: "Cloudy conditions",
        fog: "Foggy conditions",
        drizzle: "Drizzle conditions",
        rain: "Rain conditions",
        "heavy-rain": "Heavy rain conditions",
        snow: "Snow conditions",
        thunder: "Thunderstorm conditions"
    };
    return labels[type] || "Current weather";
}
