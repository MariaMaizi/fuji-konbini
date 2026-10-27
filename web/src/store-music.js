(function () {
  'use strict';
  const storageKey = 'fuji-konbini-music-v1';
  let enabled = true;
  try { enabled = localStorage.getItem(storageKey) !== 'off'; } catch (_) {}
  const audio = new Audio('assets/audio/bossa-antigua.mp3');
  audio.id = 'store-music-audio';
  audio.loop = true;
  audio.preload = 'metadata';
  audio.volume = 0.22;
  const dock = document.createElement('div');
  dock.id = 'store-music';
  dock.innerHTML = `<button type="button" id="store-music-toggle" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4Z"/><path class="music-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="music-slash" d="m15 9 6 6m0-6-6 6"/></svg><span class="music-text">Play music</span></button><details id="store-music-info"><summary aria-label="Music information / 音乐信息">i</summary><div class="music-info"><strong>Bossa Antigua</strong><span>Kevin MacLeod · incompetech.com</span><label>Volume / 音量 <input id="store-music-volume" type="range" min="0.05" max="0.5" step="0.01" value="0.22"></label><p>Music shared under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.<br><a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&amp;isrc=USUAN1700069" target="_blank" rel="noopener">Original track / 曲目来源</a><br>Original recording; looped at a lower playback volume.</p></div></details>`;
  const toggle = dock.querySelector('#store-music-toggle');
  const text = dock.querySelector('.music-text');
  document.body.append(audio, dock);
  let busy = false;
  function savePreference() {
    try { localStorage.setItem(storageKey, enabled ? 'on' : 'off'); } catch (_) {}
  }
  function render() {
    const playing = !audio.paused && !audio.ended;
    dock.classList.toggle('is-playing', playing);
    text.textContent = playing ? 'Music on' : enabled ? 'Play music' : 'Music off';
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Pause music / 关闭音乐' : 'Play music / 播放音乐');
    toggle.title = playing ? 'Bossa Antigua · 点击关闭音乐 / Pause music' : enabled ? '点击播放音乐 / Play music (browser may require a click)' : '音乐已关闭，点击开启 / Music off';
  }
  async function play() {
    if (!enabled || busy || document.hidden || !audio.paused) return;
    busy = true;
    try { await audio.play(); }
    catch (error) {
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
        toggle.title = '音乐暂时无法加载，请点击重试 / Music unavailable; click to retry';
      }
    } finally { busy = false; render(); }
  }
  toggle.addEventListener('click', () => {
    if (!audio.paused) { enabled = false; audio.pause(); }
    else { enabled = true; play(); }
    savePreference(); render();
  });
  dock.querySelector('#store-music-volume').addEventListener('input', event => {
    audio.volume = Number(event.target.value);
  });
  // Audible autoplay is best effort. A trusted first interaction unlocks it
  // without adding an extra modal or changing the store's Enter action.
  function unlock(event) {
    if (event.isTrusted && !dock.contains(event.target) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) play();
  }
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.pause();
    else if (enabled) play();
  });
  window.addEventListener('pagehide', () => audio.pause());
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('error', render);
  function placeControl() {
    const tools = document.body.classList.contains('clerk-open') && document.querySelector('.clerk-tools');
    const parent = tools || document.body;
    dock.classList.toggle('in-clerk-tools', Boolean(tools));
    if (dock.parentElement !== parent) parent.prepend(dock);
    if (tools) dock.querySelector('details').open = false;
  }
  new MutationObserver(placeControl).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  placeControl(); render(); play();
})();
