const GOOGLE_IDENTITY_SRC = "https://accounts.google.com/gsi/client";

let identityPromise = null;

// The Google Identity Services script is loaded on demand so that the public
// site never requests it: only the private admin route needs a sign-in button.
export const loadGoogleIdentity = () => {
    if (typeof window === "undefined") {
        return Promise.reject(
            new Error("Google 로그인은 브라우저에서만 사용할 수 있습니다."),
        );
    }

    if (window.google?.accounts?.id) {
        return Promise.resolve(window.google.accounts.id);
    }

    if (identityPromise) {
        return identityPromise;
    }

    identityPromise = new Promise((resolve, reject) => {
        const settle = () => {
            if (window.google?.accounts?.id) {
                resolve(window.google.accounts.id);
            } else {
                identityPromise = null;
                reject(new Error("Google 로그인을 불러오지 못했습니다."));
            }
        };
        const fail = () => {
            identityPromise = null;
            reject(new Error("Google 로그인을 불러오지 못했습니다."));
        };

        const existing = document.querySelector(
            `script[src="${GOOGLE_IDENTITY_SRC}"]`,
        );
        if (existing) {
            existing.addEventListener("load", settle, { once: true });
            existing.addEventListener("error", fail, { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = GOOGLE_IDENTITY_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", settle, { once: true });
        script.addEventListener("error", fail, { once: true });
        document.head.appendChild(script);
    });

    return identityPromise;
};

const decodeTokenPayload = (credential) => {
    const payload = String(credential).split(".")[1] ?? "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "=",
    );
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes));
};

// Read only. The Worker is what actually verifies the token's signature and
// allow-list membership; these claims exist so the screen can show who is
// signed in and lock itself the moment the token expires.
export const readIdentityClaims = (credential) => {
    try {
        const claims = decodeTokenPayload(credential);
        const expiresAt = Number(claims.exp) * 1000;
        return {
            email: String(claims.email || ""),
            expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
        };
    } catch {
        return { email: "", expiresAt: 0 };
    }
};
