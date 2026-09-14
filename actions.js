const API_URL = "https://adrax.onrender.com";

function configureActionButtons(deviceId) {
    if (!deviceId) {
        return;
    }

    const actions = {
        "action-lock": `${API_URL}/api/v1/devices/${deviceId}/lock`,
        "action-unlock": `${API_URL}/api/v1/devices/${deviceId}/unlock`,
        "action-volume-down": `${API_URL}/api/v1/devices/${deviceId}/volume/down`,
        "action-volume-up": `${API_URL}/api/v1/devices/${deviceId}/volume/up`,
    };

    Object.entries(actions).forEach(([id, url]) => {
        const button = document.getElementById(id);

        if (!button) {
            return;
        }

        button.setAttribute("hx-post", url);
        button.removeAttribute("disabled");
        htmx.process(button);
    });
}

function selectDevice(deviceId, deviceName = deviceId) {
    document.getElementById("selected-device-name").textContent = deviceName;
    document.getElementById("selected-device-id").textContent = deviceId;
    configureActionButtons(deviceId);
}

// Temporary skeleton: the API currently returns JSON, so device rendering
// will be implemented here once the device-selection UI is defined.
// All actual device actions remain HTMX requests.
window.AdraxActions = {
    selectDevice,
};
