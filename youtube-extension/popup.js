document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const pinInput = document.getElementById('pinInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const btnLocal = document.getElementById('btnLocal');
  const btn127 = document.getElementById('btn127');

  // Load saved setting
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['jukeboxUrl', 'jukeboxPin'], (res) => {
      if (res && res.jukeboxUrl) {
        urlInput.value = res.jukeboxUrl;
      }
      if (res && res.jukeboxPin) {
        pinInput.value = res.jukeboxPin;
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

    // youtube.com is HTTPS: browsers block plain http:// / ws:// to other machines (mixed content).
    // Only localhost is exempt, so a LAN IP must be reached through an https:// domain instead.
    let host = '';
    try {
      host = new URL(val).hostname;
    } catch (e) {}
    const isInsecureRemote =
      val.startsWith('http://') && host !== 'localhost' && host !== '127.0.0.1';

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ jukeboxUrl: val, jukeboxPin: pinInput.value.trim() }, () => {
        if (isInsecureRemote) {
          statusEl.textContent =
            '⚠ Đã lưu, nhưng trình duyệt sẽ chặn http:// tới máy khác từ youtube.com. Hãy dùng link https:// (vd. https://music.lpsang.id.vn) hoặc localhost.';
          statusEl.style.color = '#cd8407';
          return;
        }
        statusEl.textContent = '✓ Đã lưu & cập nhật kết nối!';
        statusEl.style.color = '#6aa84f';
        setTimeout(() => {
          statusEl.textContent = `● Đang kết nối tới ${val}`;
        }, 2000);
      });
    }
  });
});
