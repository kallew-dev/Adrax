const API_URL = "https://adrax.onrender.com";

function updateDeviceActions(deviceId) {
    document
        .getElementById("action-lock")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/clients/devices/${deviceId}/lock`
        );

    document
        .getElementById("action-unlock")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/clients/devices/${deviceId}/unlock`
        );

    document
        .getElementById("action-volume-down")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/clients/devices/${deviceId}/volume/down`
        );

    document
        .getElementById("action-volume-up")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/clients/devices/${deviceId}/volume/up`
        );

    htmx.process(document.getElementById("action-lock"));
    htmx.process(document.getElementById("action-unlock"));
    htmx.process(document.getElementById("action-volume-down"));
    htmx.process(document.getElementById("action-volume-up"));
}
