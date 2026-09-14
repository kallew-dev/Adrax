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

function renderDevices(payload) {
    const deviceList = document.getElementById("device-list");

    if (!deviceList) {
        return;
    }

    const devices = Array.isArray(payload) ? payload : payload?.devices;

    if (!Array.isArray(devices) || devices.length === 0) {
        deviceList.innerHTML = `
            <div class="empty-state">
                <span>▯</span>
                <strong>Nenhum dispositivo encontrado</strong>
                <small>Nenhum dispositivo conectado foi retornado pela API.</small>
            </div>
        `;
        return;
    }

    deviceList.innerHTML = devices.map((device) => {
        const deviceId = device.id ?? device.device_id ?? device.serial;
        const deviceName = device.name ?? deviceId;

        if (!deviceId) {
            return "";
        }

        const safeId = String(deviceId).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        const safeName = String(deviceName)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

        return `
            <button
                class="device-item"
                type="button"
                data-device-id="${safeId}"
                data-device-name="${safeName}"
            >
                <span class="device-item-icon">▯</span>
                <span class="device-item-name">${safeName}</span>
            </button>
        `;
    }).join("");

    deviceList.querySelectorAll(".device-item").forEach((button) => {
        button.addEventListener("click", () => {
            selectDevice(button.dataset.deviceId, button.dataset.deviceName);

            deviceList.querySelectorAll(".device-item").forEach((item) => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
        });
    });
}

document.body.addEventListener("htmx:afterRequest", (event) => {
    if (!event.detail?.successful) {
        return;
    }

    const request = event.detail.requestConfig;

    if (request?.verb !== "get" || request?.path !== `${API_URL}/api/v1/devices`) {
        return;
    }

    try {
        renderDevices(JSON.parse(event.detail.xhr.responseText));
    } catch (error) {
        console.error("Failed to parse devices response:", error);
    }
});

window.AdraxActions = {
    selectDevice,
};
