const svgCache = new Map();

const FALLBACK_TYPE = "partly-cloudy";

async function loadWeatherSvg(type) {
    const key = type || FALLBACK_TYPE;
    if (svgCache.has(key)) return svgCache.get(key);

    try {
        const res = await fetch(`assets/weather/${key}.svg`);
        if (!res.ok) throw new Error("Missing weather asset");
        const markup = await res.text();
        svgCache.set(key, markup);
        return markup;
    } catch {
        if (key === FALLBACK_TYPE) return "";
        return loadWeatherSvg(FALLBACK_TYPE);
    }
}

export async function renderWeatherVisual(container, type) {
    if (!container) return;

    const visualType = type || FALLBACK_TYPE;
    container.className = `weather-visual weather-visual--${visualType}`;
    container.setAttribute("aria-label", `${visualType.replace(/-/g, " ")} conditions`);

    const markup = await loadWeatherSvg(visualType);
    container.innerHTML = markup;
}
