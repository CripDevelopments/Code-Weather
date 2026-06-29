const ANIMATIONS = {
    sunny: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs><radialGradient id="sunGlow"><stop offset="0%" stop-color="#ffe082"/><stop offset="100%" stop-color="#ff9800"/></radialGradient></defs>
        <circle cx="100" cy="100" r="42" fill="url(#sunGlow)"/>
        <g class="sun-rays"><line x1="100" y1="18" x2="100" y2="42" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="100" y1="158" x2="100" y2="182" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="18" y1="100" x2="42" y2="100" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="158" y1="100" x2="182" y2="100" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="42" y1="42" x2="58" y2="58" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="142" y1="142" x2="158" y2="158" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="158" y1="42" x2="142" y2="58" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/>
        <line x1="58" y1="142" x2="42" y2="158" stroke="#ffd54f" stroke-width="8" stroke-linecap="round"/></g>
    </svg>`,

    "partly-cloudy": `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="130" cy="72" r="28" fill="#ffd54f" opacity="0.95"/>
        <g class="cloud-drift"><ellipse cx="88" cy="118" rx="52" ry="30" fill="#e3f2fd"/>
        <ellipse cx="118" cy="108" rx="44" ry="28" fill="#ffffff"/>
        <ellipse cx="68" cy="108" rx="34" ry="24" fill="#ffffff"/></g>
    </svg>`,

    cloudy: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g class="cloud-drift slow"><ellipse cx="92" cy="108" rx="58" ry="34" fill="#b0bec5"/>
        <ellipse cx="128" cy="98" rx="48" ry="30" fill="#cfd8dc"/>
        <ellipse cx="68" cy="98" rx="38" ry="26" fill="#eceff1"/></g>
    </svg>`,

    fog: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g class="fog-lines"><rect x="30" y="78" width="140" height="10" rx="5" fill="#90a4ae" opacity="0.7"/>
        <rect x="40" y="98" width="120" height="10" rx="5" fill="#b0bec5" opacity="0.8"/>
        <rect x="35" y="118" width="130" height="10" rx="5" fill="#78909c" opacity="0.6"/></g>
    </svg>`,

    drizzle: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="78" rx="50" ry="28" fill="#eceff1"/>
        <ellipse cx="128" cy="72" rx="36" ry="22" fill="#ffffff"/>
        <g class="rain-drops light"><line x1="72" y1="108" x2="66" y2="128" stroke="#64b5f6" stroke-width="4" stroke-linecap="round"/>
        <line x1="100" y1="112" x2="94" y2="132" stroke="#64b5f6" stroke-width="4" stroke-linecap="round"/>
        <line x1="128" y1="108" x2="122" y2="128" stroke="#64b5f6" stroke-width="4" stroke-linecap="round"/></g>
    </svg>`,

    rain: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="72" rx="54" ry="30" fill="#cfd8dc"/>
        <ellipse cx="132" cy="66" rx="38" ry="24" fill="#eceff1"/>
        <g class="rain-drops"><line x1="60" y1="102" x2="52" y2="132" stroke="#42a5f5" stroke-width="5" stroke-linecap="round"/>
        <line x1="88" y1="98" x2="80" y2="138" stroke="#42a5f5" stroke-width="5" stroke-linecap="round"/>
        <line x1="116" y1="102" x2="108" y2="142" stroke="#42a5f5" stroke-width="5" stroke-linecap="round"/>
        <line x1="144" y1="98" x2="136" y2="138" stroke="#42a5f5" stroke-width="5" stroke-linecap="round"/></g>
    </svg>`,

    "heavy-rain": `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="68" rx="58" ry="32" fill="#90a4ae"/>
        <ellipse cx="136" cy="62" rx="40" ry="26" fill="#b0bec5"/>
        <g class="rain-drops fast"><line x1="50" y1="96" x2="40" y2="146" stroke="#1e88e5" stroke-width="6" stroke-linecap="round"/>
        <line x1="78" y1="92" x2="68" y2="152" stroke="#1e88e5" stroke-width="6" stroke-linecap="round"/>
        <line x1="106" y1="96" x2="96" y2="156" stroke="#1e88e5" stroke-width="6" stroke-linecap="round"/>
        <line x1="134" y1="92" x2="124" y2="152" stroke="#1e88e5" stroke-width="6" stroke-linecap="round"/>
        <line x1="162" y1="96" x2="152" y2="146" stroke="#1e88e5" stroke-width="6" stroke-linecap="round"/></g>
    </svg>`,

    snow: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="100" cy="72" rx="52" ry="28" fill="#eceff1"/>
        <g class="snow-flakes"><circle cx="70" cy="110" r="4" fill="#ffffff"/><circle cx="100" cy="120" r="5" fill="#ffffff"/>
        <circle cx="130" cy="108" r="4" fill="#ffffff"/><circle cx="85" cy="145" r="4" fill="#ffffff"/>
        <circle cx="118" cy="150" r="5" fill="#ffffff"/></g>
    </svg>`,

    thunder: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="200" height="200" fill="transparent"/>
        <ellipse cx="100" cy="68" rx="56" ry="30" fill="#546e7a"/>
        <polygon class="lightning-bolt" points="108,92 88,128 104,128 92,168 128,112 110,112" fill="#ffeb3b"/>
    </svg>`
};

export function renderWeatherVisual(container, type) {
    if (!container) return;
    container.className = `weather-visual weather-visual--${type}`;
    container.innerHTML = ANIMATIONS[type] || ANIMATIONS["partly-cloudy"];
}
