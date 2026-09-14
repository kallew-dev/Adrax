const API_URL = "https://adrax.onrender.com";

const deviceSelect = document.getElementById("device-select");
const refreshButton = document.getElementById("refresh-apps");
const appsList = document.getElementById("apps-list");
const appsCount = document.getElementById("apps-count");
const appsDeviceName = document.getElementById("apps-device-name");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAppName(packageName) {
  const parts = packageName.split(".").filter(Boolean);
  return parts.at(-1) || packageName;
}

function setEmptyState(title, description) {
  appsList.innerHTML = `
    <div class="empty-state">
      <span>⊞</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </div>
  `;
  appsCount.textContent = "0";
}

function renderDevices(payload) {
  const devices = Array.isArray(payload) ? payload : payload?.devices;

  if (!Array.isArray(devices) || devices.length === 0) {
    deviceSelect.innerHTML = '<option value="">Nenhum dispositivo encontrado</option>';
    setEmptyState("Nenhum dispositivo encontrado", "Nenhum dispositivo conectado foi retornado pela API.");
    appsDeviceName.textContent = "Nenhum dispositivo selecionado";
    return;
  }

  deviceSelect.innerHTML = devices.map((device) => {
    const id = device.id ?? device.device_id ?? device.serial;
    const name = device.name ?? id;

    if (!id) {
      return "";
    }

    return `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
  }).join("");

  loadApps(deviceSelect.value);
}

function renderApps(payload) {
  const apps = Array.isArray(payload) ? payload : payload?.apps;

  if (!Array.isArray(apps) || apps.length === 0) {
    setEmptyState("Nenhum aplicativo encontrado", "O dispositivo não possui aplicativos com uma atividade inicializável.");
    return;
  }

  const packages = apps
    .map((app) => typeof app === "string" ? app : app?.package)
    .filter(Boolean)
    .map(String)
    .sort((a, b) => a.localeCompare(b));

  appsCount.textContent = String(packages.length);

  appsList.innerHTML = packages.map((packageName) => {
    const appName = getAppName(packageName);

    return `
      <article class="app-card">
        <span class="app-icon">⊞</span>
        <div class="app-info">
          <strong>${escapeHtml(appName)}</strong>
          <small>Aplicativo Android</small>
        </div>
      </article>
    `;
  }).join("");
}

async function loadDevices() {
  deviceSelect.disabled = true;
  refreshButton.disabled = true;
  appsDeviceName.textContent = "Carregando dispositivos...";

  try {
    const response = await fetch(`${API_URL}/api/v1/devices`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    renderDevices(await response.json());
  } catch (error) {
    console.error("Failed to load devices:", error);
    deviceSelect.innerHTML = '<option value="">Erro ao carregar dispositivos</option>';
    setEmptyState("Não foi possível carregar os dispositivos", "Verifique a conexão com a API e tente novamente.");
    appsDeviceName.textContent = "Erro ao consultar a API";
  } finally {
    deviceSelect.disabled = false;
    refreshButton.disabled = false;
  }
}

async function loadApps(deviceId) {
  if (!deviceId) {
    setEmptyState("Nenhum dispositivo selecionado", "Selecione um dispositivo para consultar os aplicativos.");
    appsDeviceName.textContent = "Nenhum dispositivo selecionado";
    return;
  }

  const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
  const deviceName = selectedOption?.textContent || deviceId;

  appsDeviceName.textContent = deviceName;
  appsList.innerHTML = `
    <div class="empty-state">
      <span>⊞</span>
      <strong>Carregando aplicativos...</strong>
      <small>Consultando o dispositivo selecionado.</small>
    </div>
  `;

  try {
    const response = await fetch(`${API_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/apps`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    renderApps(await response.json());
  } catch (error) {
    console.error("Failed to load applications:", error);
    setEmptyState("Não foi possível carregar os aplicativos", "Verifique se o dispositivo continua conectado e tente novamente.");
  }
}

deviceSelect.addEventListener("change", () => {
  loadApps(deviceSelect.value);
});

refreshButton.addEventListener("click", async () => {
  await loadDevices();
});

loadDevices();
