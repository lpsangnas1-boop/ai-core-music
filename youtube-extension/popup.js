document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const btnLocal = document.getElementById('btnLocal');
  const btn127 = document.getElementById('btn127');

  // Load saved setting
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['jukeboxUrl'], (res) => {
      if (res && res.jukeboxUrl) {
        urlInput.value = res.jukeboxUrl;
      }
    });
  }

  btnLocal.addEventListener('click', () => {
    urlInput.value = 'http://localhost:8989';
  });

  btn127.addEventListener('click', () => {
    urlInput.value = 'http://127.0.0.1:8989';
  });

  saveBtn.addEventListener('click', () => {
    let val = urlInput.value.trim().replace(/\/+$/, '');
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      val = 'http://' + val;
    }
    urlInput.value = val;

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ jukeboxUrl: val }, () => {
        statusEl.textContent = '✓ Đã lưu & cập nhật kết nối!';
        statusEl.style.color = '#6aa84f';
        setTimeout(() => {
          statusEl.textContent = `● Đang kết nối tới ${val}`;
        }, 2000);
      });
    }
  });
});
