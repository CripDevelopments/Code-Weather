import { e } from "./consts.js";
import { getCoords, getWeather, getWeatherInfo } from "./weather.js";
import { getActiveLocation, initPwa, setActiveLocation, updateWatchLocation } from "./pwa.js";

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

function renderWeather(location, weather) {
    const current = weather.current;
    const daily = weather.daily;
    const weatherNow = getWeatherInfo(current.weather_code);

    document.getElementById("location").innerHTML =
        `<i class="fas fa-map-marker-alt"></i> ${location.name}, ${location.country} <i class="fas fa-map-marker-alt"></i>`;

    document.getElementById("currentTemp").textContent = `${Math.round(current.temperature_2m)}°C`;
    document.getElementById("currentWeatherIcon").innerHTML = `<i class="fas ${weatherNow.icon}"></i>`;
    document.getElementById("currentCondition").textContent = weatherNow.label;
    document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
    document.getElementById("windSpeed").textContent = `${current.wind_speed_10m} km/h`;
    document.getElementById("visibility").textContent = `${(current.visibility / 1000).toFixed(0)} km`;
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

    setActiveLocation(location, weather);
    updateWatchLocation(location, weather);
}

document.getElementById("searchBtn").addEventListener("click", searchCity);
document.getElementById("cityInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchCity();
});

async function searchCity() {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;

    try {
        document.getElementById("forecastBody").innerHTML =
            `<tr><td colspan="5" style="text-align:center; padding:2rem;">Loading...</td></tr>`;
        const location = await getCoords(city);
        const weather = await getWeather(location.latitude, location.longitude);
        renderWeather(location, weather);
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

initPwa(getActiveLocation);

window.addEventListener("load", () => {
    const prompt = document.getElementById("locationPrompt");
    const allowBtn = document.getElementById("allowLocation");
    const denyBtn = document.getElementById("denyLocation");

    prompt.classList.remove("hidden");

    allowBtn.addEventListener("click", () => {
        prompt.classList.add("hidden");
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const city = await getCityFromCoords(position.coords.latitude, position.coords.longitude);
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
