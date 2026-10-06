// Calls the admin Worker with the operator's Google credential. A failed
// response becomes an Error whose message is ready to show on screen.
export const requestJson = async (url, credential, init = {}) => {
    const response = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${credential}`,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        // The hint names the fix; the detail is the upstream message, shown
        // so an operator can report exactly what Google or GitHub said.
        const failure = new Error(
            [
                payload.error || "요청을 처리하지 못했습니다.",
                payload.hint,
                payload.detail ? `(${payload.detail})` : "",
            ]
                .filter(Boolean)
                .join(" "),
        );
        failure.status = response.status;
        failure.payload = payload;
        throw failure;
    }
    return payload;
};

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export const formatDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateTimeFormatter.format(date);
};
