const API_URL = "https://adrax.onrender.com";

function updateDeviceActions(deviceId) {
    if (!deviceId) {
        console.error("Unable to configure device actions: missing device_id");
        return;
    }

    const actions = {
        "action-lock": `${API_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/lock`,
        "action-unlock": `${API_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/unlock`,
        "action-volume-down": `${API_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/volume/down`,
        "action-volume-up": `${API_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/volume/up`,
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

function getDeviceId(device) {
    return device.device_id ?? device.id ?? device.serial;
}

function updateDashboardDevice(device) {
    const deviceId = getDeviceId(device);

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

function setActiveNavItem(target) {
    document.querySelectorAll(".main-nav .nav-item").forEach((item) => {
        item.classList.toggle("active", item === target);
    });
}

function setupDeviceNavigation() {
    const deviceNav = [...document.querySelectorAll(".main-nav .nav-item")]
        .find((item) => item.textContent.trim() === "Dispositivos");
    const dashboardNav = [...document.querySelectorAll(".main-nav .nav-item")]
        .find((item) => item.textContent.trim() === "Dashboard");
    const devicesPanel = document.querySelector(".devices-table");
    const viewAll = document.querySelector(".devices-table .panel-link");

    if (!devicesPanel) {
        return;
    }

    devicesPanel.id = "devices";

    const showDevices = (event) => {
        event?.preventDefault();
        devicesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveNavItem(deviceNav);
    };

    deviceNav?.addEventListener("click", showDevices);
    viewAll?.addEventListener("click", showDevices);

    dashboardNav?.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveNavItem(dashboardNav);
    });
}

function renderDeviceTable(devices) {
    const table = document.querySelector(".devices-table tbody");
    if (!table) {
        return;
    }

    table.replaceChildren();

    if (devices.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="6" class="devices-empty">Nenhum dispositivo conectado.</td>`;
        table.appendChild(row);
        return;
    }

    devices.forEach((device) => {
        const deviceId = getDeviceId(device);
        if (!deviceId) {
            return;
        }

        const name = device.name ?? deviceId;
        const android = device.android_version ?? "Desconhecido";
        const battery = Number(device.battery_level ?? 0);
        const uptime = formatUptime(device.uptime_seconds);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><span class="table-phone">▯</span><strong>${escapeHtml(name)}</strong></td>
            <td>${escapeHtml(deviceId)}</td>
            <td><span class="status online">● Online</span></td>
            <td>♆ Conectado</td>
            <td>${escapeHtml(uptime)} atrás</td>
            <td><button class="device-row-menu" type="button" aria-label="Ações de ${escapeHtml(name)}">⋮</button></td>
        `;

        row.dataset.deviceId = deviceId;
        row.title = `${name} · Android ${android} · Bateria ${battery}%`;
        table.appendChild(row);
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadConnectedDevices() {
    try {
        const response = await fetch(`${API_URL}/api/v1/devices`);

        if (!response.ok) {
            throw new Error(`Failed to load devices: HTTP ${response.status}`);
        }

        const payload = await response.json();
        const devices = Array.isArray(payload) ? payload : payload.devices;

        if (!Array.isArray(devices)) {
            throw new Error("Invalid devices response from API");
        }

        renderDeviceTable(devices);

        if (devices.length > 0) {
            updateDashboardDevice(devices[0]);
        }
    } catch (error) {
        console.error("Failed to load devices:", error);

        const table = document.querySelector(".devices-table tbody");
        if (table) {
            table.innerHTML = `<tr><td colspan="6" class="devices-empty">Não foi possível carregar os dispositivos.</td></tr>`;
        }
    }
}

async function loadConnectedDevice() {
    await loadConnectedDevices();
}

document.addEventListener("DOMContentLoaded", () => {
    setupDeviceNavigation();
    loadConnectedDevice();
});
