const API_URL = "https://adrax.onrender.com";

function updateDeviceActions(deviceId) {
    if (!deviceId) {
        console.error("Unable to configure device actions: missing device_id");
        return;
    }

    document
        .getElementById("action-lock")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/devices/${deviceId}/lock`
        );

    document
        .getElementById("action-unlock")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/devices/${deviceId}/unlock`
        );

    document
        .getElementById("action-volume-down")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/devices/${deviceId}/volume/down`
        );

    document
        .getElementById("action-volume-up")
        .setAttribute(
            "hx-post",
            `${API_URL}/api/v1/devices/${deviceId}/volume/up`
        );

    document.querySelectorAll(".action-card").forEach((button) => {
        htmx.process(button);
    });
}

async function loadConnectedDevice() {
    try {
        const response = await fetch(`${API_URL}/api/v1/devices`);

        if (!response.ok) {
            throw new Error(`Failed to load devices: HTTP ${response.status}`);
        }

        const payload = await response.json();
        const devices = Array.isArray(payload) ? payload : payload.devices;

        if (!Array.isArray(devices) || devices.length === 0) {
            throw new Error("No devices returned by the API");
        }

        const device = devices.find((item) =>
            item.connected === true ||
            item.status === "connected" ||
            item.status === "online"
        ) ?? devices[0];

        const deviceId = device.device_id ?? device.id ?? device.serial;

        if (!deviceId) {
            throw new Error("Device returned by the API has no device_id");
        }

        updateDeviceActions(deviceId);
        console.info("Dashboard actions configured for device:", deviceId);
    } catch (error) {
        console.error("Failed to configure dashboard device actions:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadConnectedDevice);
