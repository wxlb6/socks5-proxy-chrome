// 初始化时恢复代理状态
chrome.runtime.onStartup.addListener(restoreProxyState);
chrome.runtime.onInstalled.addListener(restoreProxyState);

async function restoreProxyState() {
  const settings = await chrome.storage.sync.get({
    host: '127.0.0.1',
    port: 1080,
    enabled: false
  });
  
  if (settings.enabled) {
    setProxy(settings.host, settings.port);
    updateIcon(true);
  } else {
    clearProxy();
    updateIcon(false);
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleProxy') {
    if (message.enabled) {
      setProxy(message.host, message.port);
      updateIcon(true);
    } else {
      clearProxy();
      updateIcon(false);
    }
  }
});

function setProxy(host, port) {
  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "socks5",
        host: host,
        port: port
      }
    }
  };
  
  chrome.proxy.settings.set({
    value: config,
    scope: 'regular'
  });
}

function clearProxy() {
  chrome.proxy.settings.clear({
    scope: 'regular'
  });
}

function updateIcon(enabled) {
  const iconPath = enabled ? 'icons/icon-on.png' : 'icons/icon-off.png';
  chrome.action.setIcon({
    path: {
      16: iconPath,
      48: iconPath,
      128: iconPath
    }
  });
}
