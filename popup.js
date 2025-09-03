document.addEventListener('DOMContentLoaded', async () => {
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  const proxyToggle = document.getElementById('proxyToggle');
  const statusText = document.getElementById('statusText');
  const saveBtn = document.getElementById('saveBtn');

  // 加载保存的设置
  const settings = await chrome.storage.sync.get({
    host: '127.0.0.1',
    port: 1080,
    enabled: false
  });

  hostInput.value = settings.host;
  portInput.value = settings.port;
  proxyToggle.checked = settings.enabled;
  updateStatusText(settings.enabled);

  // 切换状态
  proxyToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    updateStatusText(enabled);
    
    const host = hostInput.value;
    const port = parseInt(portInput.value);
    
    await chrome.storage.sync.set({ enabled, host, port });
    
    // 通知background脚本
    chrome.runtime.sendMessage({
      action: 'toggleProxy',
      enabled,
      host,
      port
    });
  });

  // 保存设置
  saveBtn.addEventListener('click', async () => {
    const host = hostInput.value;
    const port = parseInt(portInput.value);
    const enabled = proxyToggle.checked;
    
    if (!host || !port) {
      alert('Please enter valid host and port');
      return;
    }
    
    await chrome.storage.sync.set({ host, port, enabled });
    
    chrome.runtime.sendMessage({
      action: 'toggleProxy',
      enabled,
      host,
      port
    });
    
    // 显示保存成功
    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save Settings';
    }, 1000);
  });

  function updateStatusText(enabled) {
    statusText.textContent = enabled ? 'Enabled' : 'Disabled';
    statusText.className = enabled ? 'enabled' : 'disabled';
  }
});