import { e } from "./consts.js";
// --------------------------
// CLOCK & TIME
// --------------------------
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
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const day = now.getDate();

    e("dayDisplay").textContent = days[now.getDay()];

    document.getElementById("dateDisplay").textContent =
        `${day}${getSuffix(day)} ${months[now.getMonth()]} ${now.getFullYear()}`;

    document.getElementById("timeDisplay").textContent = now.toTimeString().slice(0, 8);

    document.getElementById("year").textContent = now.getFullYear();
}
updateTime();
setInterval(updateTime, 1000);

// --------------------------
// API HELPERS
// --------------------------
// Convert Open-Meteo weather code to readable name + icon
function getWeatherInfo(code) {
    const codes = {
        0: { label: "Clear sky", icon: "fa-sun" },
        1: { label: "Mainly clear", icon: "fa-sun" },
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

// Get coordinates from city name
async function getCoords(city) {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const data = await res.json();
    if (!data.results) throw new Error("City not found");
    return data.results[0];
}

// Get weather from coordinates
async function getWeather(lat, lon) {
    const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,cloud_cover,visibility` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
        `&timezone=auto&forecast_days=5`
    );
    return await res.json();
}

// --------------------------
// RENDER DATA
// --------------------------
function renderWeather(location, weather) {
    const current = weather.current;
    const daily = weather.daily;
    const weatherNow = getWeatherInfo(current.weather_code);

    // Update location
    document.getElementById("location").innerHTML = `<i class="fas fa-map-marker-alt"></i> ${location.name}, ${location.country}`;

    // Current weather
    document.getElementById("currentTemp").textContent = `${Math.round(current.temperature_2m)}°C`;
    document.getElementById("currentCondition").textContent = weatherNow.label;
    document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
    document.getElementById("windSpeed").textContent = `${current.wind_speed_10m} km/h`;
    document.getElementById("visibility").textContent = `${(current.visibility / 1000).toFixed(0)} km`;
    document.getElementById("pressure").textContent = `${current.pressure_msl} hPa`;
    document.getElementById("feelsLike").textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById("cloudCover").textContent = `${current.cloud_cover}%`;

    // Sunrise/Sunset
    const formatTime = (iso) => new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    document.getElementById("sunrise").textContent = formatTime(daily.sunrise[0]);
    document.getElementById("sunset").textContent = formatTime(daily.sunset[0]);

    // Forecast rows
    const forecastBody = document.getElementById("forecastBody");
    forecastBody.innerHTML = "";

    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let i = 0; i < 5; i++) {
        const date = new Date(daily.time[i]);
        const day = dayNames[date.getDay()];
        const dayNum = date.getDate();
        const month = date.toLocaleString('en-US', {month:'short'});
        const info = getWeatherInfo(daily.weather_code[i]);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="forecast-day">${day}<br>${dayNum}${getSuffix(dayNum)} ${month}</td>
            <td><i class="fas ${info.icon} forecast-icon"></i> ${info.label}</td>
            <td class="forecast-temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</td>
            <td class="forecast-sun"><i class="fas fa-sun"></i> ${formatTime(daily.sunrise[i])}</td>
            <td class="forecast-sun"><i class="fas fa-moon"></i> ${formatTime(daily.sunset[i])}</td>
        `;
        forecastBody.appendChild(row);
    }
}

// --------------------------
// SEARCH HANDLER
// --------------------------
document.getElementById("searchBtn").addEventListener("click", async () => {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;

    try {
        document.getElementById("forecastBody").innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;">Loading...</td></tr>`;
        const location = await getCoords(city);
        const weather = await getWeather(location.latitude, location.longitude);
        renderWeather(location, weather);
    } catch (err) {
        document.getElementById("forecastBody").innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff6666;">City not found. Try again.</td></tr>`;
    }
});

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

// Load London by default on page open
window.addEventListener("load", () => {

    const prompt = document.getElementById("locationPrompt");
    const allowBtn = document.getElementById("allowLocation");
    const denyBtn = document.getElementById("denyLocation");

    // show HUD instead of browser confirm
    prompt.classList.remove("hidden");

    allowBtn.addEventListener("click", () => {
        prompt.classList.add("hidden");

        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (position) => {

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const city = await getCityFromCoords(lat, lon);

                document.getElementById("cityInput").value = city;
                document.getElementById("searchBtn").click();

            } catch (err) {
                console.error("Location lookup failed", err);
            }

        }, (err) => {
            console.warn("Location denied", err);
        });

    });

    denyBtn.addEventListener("click", () => {
        prompt.classList.add("hidden");
        document.getElementById("cityInput").value = "London";
        document.getElementById("searchBtn").click();
    });

});