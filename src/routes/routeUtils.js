export const TAB_KEYS = [
    "home",
    "news",
    "research",
    "deadlines",
    "publication",
    "people",
    "photo",
    "contact",
    "join",
    // Private operator workspace; client-only and absent from the nav.
    "admin",
];

const TAB_KEY_SET = new Set(TAB_KEYS);

export const resolveTabFromPath = (pathname = "/") => {
    if (!pathname || pathname === "/") {
        return "home";
    }

    const segment = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    return TAB_KEY_SET.has(segment) ? segment : "home";
};
