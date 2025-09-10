// background.js - Manages proxy settings and icon state.

// Helper function to generate the PAC script based on stored settings.
async function generatePacScript() {
  const {
    proxyEnabled,
    proxyHost,
    proxyPort,
    bypassDomains,
    forceProxyDomains,
    autoproxyData,
  } = await chrome.storage.local.get([
    "proxyEnabled",
    "proxyHost",
    "proxyPort",
    "bypassDomains",
    "forceProxyDomains",
    "autoproxyData",
  ]);

  if (!proxyEnabled || !proxyHost || !proxyPort) {
    return `
      function FindProxyForURL(url, host) {
        return "DIRECT";
      }
    `;
  }

  // Combine custom force domains and autoproxy domains.
  const proxyDomains = new Set([...(forceProxyDomains || []), ...(autoproxyData || [])]);
  const bypassSet = new Set(bypassDomains || []);

  const pacScript = `
    function FindProxyForURL(url, host) {
      // Check for bypass domains first
      if (${JSON.stringify(Array.from(bypassSet))}.some(domain => host.includes(domain))) {
        return "DIRECT";
      }
      
      // Check for proxy domains
      if (${JSON.stringify(Array.from(proxyDomains))}.some(domain => host.includes(domain))) {
        return "SOCKS5 ${proxyHost}:${proxyPort}";
      }

      // Default to DIRECT for all other domains
      return "DIRECT";
    }
  `;

  return pacScript;
}

// Function to apply the proxy settings.
async function applyProxySettings() {
  const { proxyEnabled } = await chrome.storage.local.get("proxyEnabled");
  let config;
  if (proxyEnabled) {
    const pacScript = await generatePacScript();
    config = {
      mode: "pac_script",
      pacScript: { data: pacScript },
    };
    await chrome.action.setIcon({ path: "icons/icon-on.png" });
  } else {
    config = { mode: "direct" };
    await chrome.action.setIcon({ path: "icons/icon-off.png" });
  }
  
  chrome.proxy.settings.set(
    { value: config, scope: "regular" },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Proxy setting failed:", chrome.runtime.lastError.message);
      } else {
        console.log("Proxy settings applied successfully.");
      }
    }
  );
}

// Listen for changes in storage and apply settings.
chrome.storage.onChanged.addListener(applyProxySettings);

// Apply settings on startup.
chrome.runtime.onStartup.addListener(applyProxySettings);
chrome.runtime.onInstalled.addListener(applyProxySettings);
