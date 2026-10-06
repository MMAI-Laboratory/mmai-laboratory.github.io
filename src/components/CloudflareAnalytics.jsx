import { useEffect } from "react";

const BEACON_ID = "cloudflare-web-analytics";

// Loads the Cloudflare Web Analytics beacon once per page load. The SPA keeps
// the same script across route changes; the beacon itself reports client-side
// navigations. Without a token (local builds, forks) nothing is requested.
// Visits to /admin are still beaconed but the admin Worker drops those paths
// from every aggregate it returns.
function CloudflareAnalytics() {
    const token = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

    useEffect(() => {
        if (!token || document.getElementById(BEACON_ID)) {
            return undefined;
        }

        const script = document.createElement("script");
        script.id = BEACON_ID;
        script.defer = true;
        script.src = "https://static.cloudflareinsights.com/beacon.min.js";
        script.dataset.cfBeacon = JSON.stringify({ token });
        document.body.appendChild(script);
        return undefined;
    }, [token]);

    return null;
}

export default CloudflareAnalytics;
