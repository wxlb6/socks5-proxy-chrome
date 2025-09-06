// popup.js - Handles user interaction and data storage.

const hostInput = document.getElementById("host-input");
const portInput = document.getElementById("port-input");
const proxyToggle = document.getElementById("proxy-toggle");
const gfwlistUrlInput = document.getElementById("gfwlist-url-input");
const downloadGfwlistBtn = document.getElementById("download-gfwlist-btn");
const clearGfwlistBtn = document.getElementById("clear-gfwlist-btn");
const forceProxyDomainInput = document.getElementById("force-proxy-domain-input");
const addForceProxyDomainBtn = document.getElementById("add-force-proxy-domain-btn");
const forceProxyDomainList = document.getElementById("force-proxy-domain-list");
const bypassDomainInput = document.getElementById("bypass-domain-input");
const addBypassDomainBtn = document.getElementById("add-bypass-domain-btn");
const bypassDomainList = document.getElementById("bypass-domain-list");
const statusMessage = document.getElementById("status-message");

// Load saved settings on startup.
document.addEventListener("DOMContentLoaded", async () => {
  const {
    proxyEnabled,
    proxyHost,
    proxyPort,
    gfwlistUrl,
    bypassDomains,
    forceProxyDomains,
  } = await chrome.storage.local.get([
    "proxyEnabled",
    "proxyHost",
    "proxyPort",
  ]);
  const { syncGfwlistUrl, syncBypassDomains, syncForceProxyDomains } = await chrome.storage.sync.get([
    "syncGfwlistUrl",
    "syncBypassDomains",
    "syncForceProxyDomains",
  ]);

  if (proxyEnabled !== undefined) proxyToggle.checked = proxyEnabled;
  if (proxyHost) hostInput.value = proxyHost;
  if (proxyPort) portInput.value = proxyPort;
  if (syncGfwlistUrl) gfwlistUrlInput.value = syncGfwlistUrl;

  updateDomainList(bypassDomainList, bypassDomains || syncBypassDomains || []);
  updateDomainList(forceProxyDomainList, forceProxyDomains || syncForceProxyDomains || []);
});

// Update display list with domains.
function updateDomainList(element, domains) {
  element.innerHTML = '';
  domains.forEach(domain => {
    const item = document.createElement("div");
    item.className = "domain-list-item";
    item.innerHTML = `<span>${domain}</span><button class="remove-btn" data-domain="${domain}">&times;</button>`;
    element.appendChild(item);
  });
}

// Save settings to storage.
async function saveSettings(key, value, isLocal = true) {
  const storage = isLocal ? chrome.storage.local : chrome.storage.sync;
  await storage.set({ [key]: value });
}


function parseGfwlist(text) {
  const domains = new Set();
  const white = new Set();
  const decoded = atob(text);
  for (let line of decoded.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('!')) continue;
    let raw = line;
    if (raw.startsWith('@@')) {
      raw = raw.slice(2);
    }
    let host = raw
      .replace(/^\|?https?:\/\//, '')
      .replace(/^[\|\^]*/, '')
      .replace(/[\/\*\|].*$/, '');
    if (/^([\w\-]+\.)+\w+$/.test(host)) {
      (line.startsWith('@@') ? white : domains).add(host);
    }
  }
  for (const h of white) domains.delete(h);
  return Array.from(domains);
}


// Handle proxy toggle.
proxyToggle.addEventListener("change", (event) => {
  saveSettings("proxyEnabled", event.target.checked);
});

// Handle Host and Port input changes.
hostInput.addEventListener("blur", (event) => {
  saveSettings("proxyHost", event.target.value);
});

portInput.addEventListener("blur", (event) => {
  saveSettings("proxyPort", parseInt(event.target.value, 10));
});

// Handle GFWList URL and download.
gfwlistUrlInput.addEventListener("blur", (event) => {
  saveSettings("syncGfwlistUrl", event.target.value, false);
});

downloadGfwlistBtn.addEventListener("click", async () => {
  const url = gfwlistUrlInput.value;
  if (!url) {
    statusMessage.textContent = "Please enter a GFWList URL.";
    return;
  }
  
  statusMessage.textContent = "Downloading GFWList...";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok.");
    
    const text = await response.text();
    const domains = parseGfwlist(text)
    
    await saveSettings("gfwlistData", domains);
    statusMessage.textContent = `GFWList downloaded with ${domains.length} entries!`;

  } catch (error) {
    statusMessage.textContent = "Failed to download GFWList: " + error.message;
    console.error("Error downloading GFWList:", error);
  }
});

// Add new handler to clear gfwlist data
clearGfwlistBtn.addEventListener("click", async () => {
    try {
        await chrome.storage.local.remove("gfwlistData");
        statusMessage.textContent = "GFWList data has been cleared!";
    } catch (error) {
        statusMessage.textContent = "Failed to clear GFWList data.";
        console.error("Error clearing GFWList data:", error);
    }
});

// Add and remove domains for force proxy list.
addForceProxyDomainBtn.addEventListener("click", async () => {
  const domain = forceProxyDomainInput.value.trim();
  if (domain) {
    const { forceProxyDomains } = await chrome.storage.local.get("forceProxyDomains");
    const newDomains = [...(forceProxyDomains || []), domain];
    await saveSettings("forceProxyDomains", newDomains);
    await saveSettings("syncForceProxyDomains", newDomains, false);
    updateDomainList(forceProxyDomainList, newDomains);
    forceProxyDomainInput.value = '';
  }
});

forceProxyDomainList.addEventListener("click", async (event) => {
  if (event.target.classList.contains("remove-btn")) {
    const domainToRemove = event.target.dataset.domain;
    const { forceProxyDomains } = await chrome.storage.local.get("forceProxyDomains");
    const newDomains = (forceProxyDomains || []).filter(d => d !== domainToRemove);
    await saveSettings("forceProxyDomains", newDomains);
    await saveSettings("syncForceProxyDomains", newDomains, false);
    updateDomainList(forceProxyDomainList, newDomains);
  }
});

// Add and remove domains for bypass list.
addBypassDomainBtn.addEventListener("click", async () => {
  const domain = bypassDomainInput.value.trim();
  if (domain) {
    const { bypassDomains } = await chrome.storage.local.get("bypassDomains");
    const newDomains = [...(bypassDomains || []), domain];
    await saveSettings("bypassDomains", newDomains);
    await saveSettings("syncBypassDomains", newDomains, false);
    updateDomainList(bypassDomainList, newDomains);
    bypassDomainInput.value = '';
  }
});

bypassDomainList.addEventListener("click", async (event) => {
  if (event.target.classList.contains("remove-btn")) {
    const domainToRemove = event.target.dataset.domain;
    const { bypassDomains } = await chrome.storage.local.get("bypassDomains");
    const newDomains = (bypassDomains || []).filter(d => d !== domainToRemove);
    await saveSettings("bypassDomains", newDomains);
    await saveSettings("syncBypassDomains", newDomains, false);
    updateDomainList(bypassDomainList, newDomains);
  }
});
