const API_URL = "https://adrax.onrender.com";

function updateDeviceActions(deviceId) {
    if (!deviceId) {
        console.error("Unable to configure device actions: missing device_id");
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
        htmx.process(button);
    });
}

function formatUptime(seconds) {
    const total = Number(seconds) || 0;
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatMemory(megabytes) {
    const mb = Number(megabytes) || 0;
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1).replace(".0", "")} GB RAM`;
    }
    return `${mb} MB RAM`;
}

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function updateDashboardDevice(device) {
    const deviceId = device.device_id ?? device.id ?? device.serial;

    if (!deviceId) {
        throw new Error("Device returned by the API has no device_id");
    }

    const name = device.name ?? deviceId;
    const android = device.android_version ?? "Desconhecido";
    const battery = Number(device.battery_level ?? 0);
    const cpu = device.cpu_model ?? "Desconhecido";
    const memory = formatMemory(device.memory_total_mb);
    const width = Number(device.resolution_width ?? 0);
    const height = Number(device.resolution_height ?? 0);
    const resolution = width && height ? `${width} × ${height}` : "Desconhecida";

    const overview = document.querySelector(".device-overview");
    if (!overview) {
        return;
    }

    const heading = overview.querySelector(".panel-header h2");
    const connection = overview.querySelector(".panel-header p");
    const status = overview.querySelector(".online-badge");
    const specs = overview.querySelectorAll(".spec-list > div strong");

    setText(heading, name);
    setText(connection, `${deviceId} · Conectado`);
    setText(status, "Conectado");
    setText(specs[0], android);
    setText(specs[1], `${battery}%`);
    setText(specs[2], cpu);
    setText(specs[3], memory);
    setText(specs[4], resolution);
    setText(specs[5], formatUptime(device.uptime_seconds));

    const topbarName = document.querySelector(".device-selector .device-name strong");
    const topbarId = document.querySelector(".device-selector .device-name small");
    setText(topbarName, name);
    setText(topbarId, deviceId);

    updateDeviceActions(deviceId);
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

        updateDashboardDevice(devices[0]);
    } catch (error) {
        console.error("Failed to load dashboard device:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadConnectedDevice);
