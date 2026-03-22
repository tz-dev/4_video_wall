const configs = [
  {
    id: "video1",
    defaultTitle: "Video 1",
    title: "Video 1",
    loopStart: 23.0,
    loopEnd: 60.0,
    volume: 0.3,
    sourceMode: "url",
    sourceValue: "1.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100
  },
  {
    id: "video2",
    defaultTitle: "Video 2",
    title: "Video 2",
    loopStart: 58.0,
    loopEnd: 70.0,
    volume: 0.2,
    sourceMode: "url",
    sourceValue: "2.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100
  },
  {
    id: "video3",
    defaultTitle: "Video 3",
    title: "Video 3",
    loopStart: 2.0,
    loopEnd: 30.0,
    volume: 0.2,
    sourceMode: "url",
    sourceValue: "3.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100
  },
  {
    id: "video4",
    defaultTitle: "Video 4",
    title: "Video 4",
    loopStart: 7.0,
    loopEnd: 31.0,
    volume: 1.0,
    sourceMode: "url",
    sourceValue: "4.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100
  }
];

const introMessage = "Load default config to start.";

const controls = document.getElementById("controls");
const hud = document.getElementById("hud");
const videoWall = document.getElementById("videoWall");
const helpOverlay = document.getElementById("helpOverlay");
const closeHudBtn = document.getElementById("closeHud");
const closeHelpBtn = document.getElementById("closeHelp");
const saveConfigBtn = document.getElementById("saveConfig");
const loadConfigInput = document.getElementById("loadConfigInput");
const globalStatus = document.getElementById("globalStatus");

const toggleMuteAllBtn = document.getElementById("toggleMuteAllBtn");
const togglePauseAllBtn = document.getElementById("togglePauseAllBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const actionOverlay = document.getElementById("actionOverlay");
const actionIcon = document.getElementById("actionIcon");
const toast = document.getElementById("toast");

const quickBar = document.getElementById("quickBar");
const quickShowHudBtn = document.getElementById("quickShowHudBtn");
const quickPauseBtn = document.getElementById("quickPauseBtn");
const quickMuteBtn = document.getElementById("quickMuteBtn");
const quickLayoutBtn = document.getElementById("quickLayoutBtn");
const quickHelpBtn = document.getElementById("quickHelpBtn");
const quickFullscreenBtn = document.getElementById("quickFullscreenBtn");
const quickLoadConfigInput = document.getElementById("quickLoadConfigInput");

let playbackUnlocked = false;
let currentConfigName = "4 Video Wall";
let currentLayoutMode = "4x1";
let actionOverlayTimer = null;
let toastTimer = null;
let quickBarTimer = null;
let layoutSelect = null;
let soloIndex = null;

// ─── drag state ───────────────────────────────────────────────────────────────
let dragState = null; // { cfg, video, startMouseX, startMouseY, startPanX, startPanY }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(sec) {
  sec = Number(sec || 0);
  const minutes = Math.floor(sec / 60);
  const seconds = (sec % 60).toFixed(2).padStart(5, "0");
  return `${minutes}:${seconds}`;
}

function formatDurationInfo(current, duration) {
  const currentText = formatTime(current);
  if (!Number.isFinite(duration) || duration <= 0) return currentText;
  return `${currentText} (${formatTime(duration)})`;
}

function setDocumentTitle(name) {
  currentConfigName = (name || "4 Video Wall").trim();
  document.title = currentConfigName;
}

function setStatus(message) {
  globalStatus.textContent = message;
  showToast(message);
}

function showActionIcon(icon) {
  clearTimeout(actionOverlayTimer);
  actionIcon.textContent = icon;
  actionOverlay.classList.add("visible");
  actionOverlay.setAttribute("aria-hidden", "false");
  actionOverlayTimer = setTimeout(() => {
    actionOverlay.classList.remove("visible");
    actionOverlay.setAttribute("aria-hidden", "true");
  }, 2000);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2000);
}

function setHudVisible(isVisible) {
  hud.classList.toggle("hidden", !isVisible);
  document.body.classList.toggle("show-labels", isVisible);
  if (isVisible) hideQuickBar();
}

function toggleHud(force) {
  if (typeof force === "boolean") { setHudVisible(force); return; }
  setHudVisible(hud.classList.contains("hidden"));
}

function toggleHelp(force) {
  if (typeof force === "boolean") {
    helpOverlay.classList.toggle("hidden", !force);
    helpOverlay.setAttribute("aria-hidden", String(!force));
    return;
  }
  const shouldShow = helpOverlay.classList.contains("hidden");
  helpOverlay.classList.toggle("hidden", !shouldShow);
  helpOverlay.setAttribute("aria-hidden", String(!shouldShow));
}

function getVideoByConfig(cfg) {
  return document.getElementById(cfg.id);
}

function updateLabel(cfg, video) {
  const index = Number(cfg.id.replace("video", ""));
  const label = document.getElementById(`label${index}`);
  const mutedFlag = video.muted ? "Muted" : "Live";
  const pauseFlag = video.paused ? "Paused" : "Playing";
  label.textContent = `${index} · ${cfg.title} · ${pauseFlag} · ${mutedFlag}`;
}

function safelyRevokeObjectUrl(cfg) {
  if (cfg.objectUrl) { URL.revokeObjectURL(cfg.objectUrl); cfg.objectUrl = null; }
}

// ─── video positioning ────────────────────────────────────────────────────────

/**
 * Apply panX/panY (0–100%) and zoom (100–300%) to a video element.
 * We use object-position to shift the visible frame within the cell when
 * zoom === 100 (object-fit: cover), and switch to a CSS transform approach
 * for zoom > 100 to allow true pan-and-zoom without changing layout.
 */
function applyVideoPosition(cfg, video) {
  if (cfg.zoom <= 100) {
    // Pure object-position pan — works great at native crop level
    video.style.objectPosition = `${cfg.panX}% ${cfg.panY}%`;
    video.style.transform = "";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.left = "";
    video.style.top = "";
    video.style.position = "";
  } else {
    // Zoom + pan using transform: scale + translate on an absolutely-positioned element
    const scale = cfg.zoom / 100;
    // translate range: at scale S, the video is S× larger.
    // Maximum pan offset in each axis = ((S - 1) / 2) * cellSize / scale
    // We express pan as percentage of the extra space.
    const tx = (cfg.panX - 50) / 50; // -1 … +1
    const ty = (cfg.panY - 50) / 50;
    const maxShift = ((scale - 1) / 2) * 100; // in % of original size
    const shiftX = tx * maxShift;
    const shiftY = ty * maxShift;

    video.style.objectPosition = "50% 50%";
    video.style.position = "absolute";
    video.style.left = "0";
    video.style.top = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.transform = `scale(${scale}) translate(${shiftX}%, ${shiftY}%)`;
    video.style.transformOrigin = "center center";
  }
}

function resetVideoPosition(cfg, video) {
  cfg.panX = 50;
  cfg.panY = 50;
  cfg.zoom = 100;
  applyVideoPosition(cfg, video);
  if (cfg.ui) {
    cfg.ui.zoomInput.value = cfg.zoom;
    cfg.ui.outZoom.textContent = `${cfg.zoom}%`;
  }
}

// ─── drag handlers ────────────────────────────────────────────────────────────

function onCellPointerDown(e, cfg) {
  // Only start drag with primary button, and only when HUD is hidden
  if (e.button !== 0) return;
  if (!hud.classList.contains("hidden")) return;
  // Ignore clicks on the label or quick-bar children
  if (e.target.closest(".label, .quick-bar")) return;

  unlockPlayback();

  const video = getVideoByConfig(cfg);
  dragState = {
    cfg,
    video,
    startMouseX: e.clientX,
    startMouseY: e.clientY,
    startPanX: cfg.panX,
    startPanY: cfg.panY,
    moved: false
  };

  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.classList.add("dragging");
}

function onCellPointerMove(e) {
  if (!dragState) return;
  const { cfg, video, startMouseX, startMouseY, startPanX, startPanY } = dragState;

  const dx = e.clientX - startMouseX;
  const dy = e.clientY - startMouseY;

  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.moved = true;

  const cell = e.currentTarget;
  const cellW = cell.clientWidth || 1;
  const cellH = cell.clientHeight || 1;

  // Sensitivity: moving the full width/height of the cell pans 100%.
  // At zoom=100 (object-position), full pan = edge-to-edge of the "hidden" content.
  // Invert direction so dragging right moves the frame right (feels natural).
  const sensitivity = cfg.zoom <= 100 ? 1 : cfg.zoom / 100;
  const panDeltaX = -(dx / cellW) * 100 * sensitivity;
  const panDeltaY = -(dy / cellH) * 100 * sensitivity;

  cfg.panX = clamp(startPanX + panDeltaX, 0, 100);
  cfg.panY = clamp(startPanY + panDeltaY, 0, 100);

  applyVideoPosition(cfg, video);
}

function onCellPointerUp(e) {
  if (!dragState) return;
  const cell = e.currentTarget;
  cell.releasePointerCapture(e.pointerId);
  cell.classList.remove("dragging");
  dragState = null;
}

// ─── scroll-to-zoom on cell ───────────────────────────────────────────────────

function onCellWheel(e, cfg) {
  if (!hud.classList.contains("hidden")) return;
  e.preventDefault();

  const video = getVideoByConfig(cfg);
  const delta = e.deltaY > 0 ? -10 : 10;
  cfg.zoom = clamp((cfg.zoom || 100) + delta, 100, 300);
  applyVideoPosition(cfg, video);

  if (cfg.ui) {
    cfg.ui.zoomInput.value = cfg.zoom;
    cfg.ui.outZoom.textContent = `${cfg.zoom}%`;
  }
}

// ─── source & label ──────────────────────────────────────────────────────────

function setVideoSource(video, cfg, src, statusEl, options = {}) {
  const { mode = "url", sourceValue = src, sourceFileName = "" } = options;

  safelyRevokeObjectUrl(cfg);
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.src = src;
  video.load();

  cfg.sourceMode = mode;
  cfg.sourceValue = sourceValue;
  cfg.sourceFileName = sourceFileName;

  if (statusEl) {
    statusEl.textContent = mode === "file"
      ? `Source: local file (${sourceFileName || "selected"})`
      : `Source: ${sourceValue}`;
  }

  updateLabel(cfg, video);
}

function areAllMuted() {
  return configs.every((cfg) => getVideoByConfig(cfg).muted);
}

function areAllPaused() {
  return configs.every((cfg) => getVideoByConfig(cfg).paused);
}

// ─── layout ───────────────────────────────────────────────────────────────────

function applyLayoutMode(mode) {
  const nextMode = mode === "2x2" ? "2x2" : "4x1";
  currentLayoutMode = nextMode;
  videoWall.classList.toggle("layout-4x1", nextMode === "4x1");
  videoWall.classList.toggle("layout-2x2", nextMode === "2x2");
  if (layoutSelect) layoutSelect.value = nextMode;
  quickLayoutBtn.textContent = nextMode;
}

function toggleLayoutMode() {
  const nextMode = currentLayoutMode === "4x1" ? "2x2" : "4x1";
  applyLayoutMode(nextMode);
  showActionIcon(nextMode === "2x2" ? "2×2" : "4×1");
  setStatus(`Layout switched to ${nextMode}.`);
}

function updateGlobalButtons() {
  const muted = areAllMuted();
  const paused = areAllPaused();
  const fullscreenActive = !!document.fullscreenElement;

  toggleMuteAllBtn.textContent = muted ? "Unmute All" : "Mute All";
  togglePauseAllBtn.textContent = paused ? "Play All" : "Pause All";
  fullscreenBtn.textContent = fullscreenActive ? "Exit Fullscreen" : "Fullscreen";

  quickPauseBtn.textContent = paused ? "▶" : "⏸";
  quickMuteBtn.textContent = muted ? "🔇" : "🔊";
  quickFullscreenBtn.textContent = fullscreenActive ? "🡼" : "⛶";
  quickLayoutBtn.textContent = currentLayoutMode;
}

// ─── quick bar ────────────────────────────────────────────────────────────────

function showQuickBar() {
  if (!hud.classList.contains("hidden")) return;
  clearTimeout(quickBarTimer);
  quickBar.classList.remove("hidden");
  quickBar.classList.add("visible");
  quickBar.setAttribute("aria-hidden", "false");
  quickBarTimer = setTimeout(hideQuickBar, 2000);
}

function hideQuickBar() {
  clearTimeout(quickBarTimer);
  quickBar.classList.remove("visible");
  setTimeout(() => {
    if (!quickBar.classList.contains("visible")) {
      quickBar.classList.add("hidden");
      quickBar.setAttribute("aria-hidden", "true");
    }
  }, 250);
}

// ─── UI creation ─────────────────────────────────────────────────────────────

function createLayoutUI() {
  const wrap = document.createElement("div");
  wrap.className = "video-controls";
  wrap.innerHTML = `
    <h3>Viewport</h3>
    <div class="source-row">
      <label>Layout</label>
      <select data-role="layoutMode">
        <option value="4x1">4x1</option>
        <option value="2x2">2x2</option>
      </select>
      <button type="button" data-action="toggleLayout">Toggle</button>
    </div>
    <div class="source-status">4x1 = one row · 2x2 = two rows. Drag videos to reposition when menu is closed. Scroll to zoom.</div>
  `;

  layoutSelect = wrap.querySelector('[data-role="layoutMode"]');
  layoutSelect.value = currentLayoutMode;
  layoutSelect.addEventListener("change", () => {
    applyLayoutMode(layoutSelect.value);
    setStatus(`Layout switched to ${currentLayoutMode}.`);
  });
  wrap.querySelector('[data-action="toggleLayout"]').addEventListener("click", toggleLayoutMode);
  controls.appendChild(wrap);
}

function createControlUI(cfg) {
  const video = getVideoByConfig(cfg);
  const wrap = document.createElement("div");
  wrap.className = "video-controls";

  wrap.innerHTML = `
    <h3 data-role="titleHeading">${cfg.title}</h3>

    <div class="row row-title">
      <label>Title</label>
      <input type="text" value="${cfg.title}" data-role="titleInput">
      <div class="icon-button-wrap">
        <button type="button" class="icon-button" data-action="toggleMute" title="Mute / Unmute" aria-label="Mute / Unmute">🔊</button>
      </div>
    </div>

    <div class="source-row">
      <label>File</label>
      <input type="file" accept="video/*" data-role="file">
      <button type="button" data-action="loadFile">Load</button>
    </div>

    <div class="source-row">
      <label>URL</label>
      <input type="url" placeholder="https://... or /video.mp4" value="${cfg.sourceMode === "url" ? cfg.sourceValue : ""}" data-role="url">
      <button type="button" data-action="loadUrl">Load URL</button>
    </div>

    <div class="source-status" data-role="sourceStatus">Source: ${video.currentSrc || video.getAttribute("src") || "-"}</div>

    <div class="row">
      <label>Volume</label>
      <input type="range" min="0" max="1" step="0.01" value="${cfg.volume}" data-role="volume">
      <output data-out="volume">${cfg.volume.toFixed(2)}</output>
    </div>

    <div class="loop-row">
      <div class="loop-field">
        <label>Loop Start</label>
        <input type="number" min="0" step="0.01" value="${cfg.loopStart}" data-role="loopStart">
        <output data-out="loopStart">${formatTime(cfg.loopStart)}</output>
      </div>
      <div class="loop-field">
        <label>Loop End</label>
        <input type="number" min="0" step="0.01" value="${cfg.loopEnd}" data-role="loopEnd">
        <output data-out="loopEnd">${formatTime(cfg.loopEnd)}</output>
      </div>
    </div>

    <div class="row">
      <label>Current Time</label>
      <input type="range" min="0" max="1" step="0.01" value="0" data-role="seek">
      <output data-out="currentTime">0:00.00</output>
    </div>

    <div class="row">
      <label>Zoom</label>
      <input type="range" min="100" max="300" step="1" value="${cfg.zoom}" data-role="zoom">
      <output data-out="zoom">${cfg.zoom}%</output>
    </div>

    <div class="pan-row">
      <div class="pan-field">
        <label>Pan X</label>
        <input type="range" min="0" max="100" step="0.5" value="${cfg.panX}" data-role="panX">
        <output data-out="panX">${cfg.panX.toFixed(0)}%</output>
      </div>
      <div class="pan-field">
        <label>Pan Y</label>
        <input type="range" min="0" max="100" step="0.5" value="${cfg.panY}" data-role="panY">
        <output data-out="panY">${cfg.panY.toFixed(0)}%</output>
      </div>
    </div>

    <div class="actions">
      <button type="button" data-action="togglePlayPause">Pause</button>
      <button type="button" data-action="jumpStart">Jump to Loop Start</button>
      <button type="button" data-action="setStartHere">Set Start = Now</button>
      <button type="button" data-action="setEndHere">Set End = Now</button>
      <button type="button" data-action="resetPosition">Reset Position</button>
    </div>
  `;

  const titleInput = wrap.querySelector('[data-role="titleInput"]');
  const titleHeading = wrap.querySelector('[data-role="titleHeading"]');
  const fileInput = wrap.querySelector('[data-role="file"]');
  const urlInput = wrap.querySelector('[data-role="url"]');
  const sourceStatus = wrap.querySelector('[data-role="sourceStatus"]');
  const volumeInput = wrap.querySelector('[data-role="volume"]');
  const loopStartInput = wrap.querySelector('[data-role="loopStart"]');
  const loopEndInput = wrap.querySelector('[data-role="loopEnd"]');
  const seekInput = wrap.querySelector('[data-role="seek"]');
  const zoomInput = wrap.querySelector('[data-role="zoom"]');
  const panXInput = wrap.querySelector('[data-role="panX"]');
  const panYInput = wrap.querySelector('[data-role="panY"]');

  const outVolume = wrap.querySelector('[data-out="volume"]');
  const outLoopStart = wrap.querySelector('[data-out="loopStart"]');
  const outLoopEnd = wrap.querySelector('[data-out="loopEnd"]');
  const outCurrentTime = wrap.querySelector('[data-out="currentTime"]');
  const outZoom = wrap.querySelector('[data-out="zoom"]');
  const outPanX = wrap.querySelector('[data-out="panX"]');
  const outPanY = wrap.querySelector('[data-out="panY"]');

  const togglePlayPauseBtn = wrap.querySelector('[data-action="togglePlayPause"]');
  const toggleMuteBtn = wrap.querySelector('[data-action="toggleMute"]');

  function refreshMuteState() {
    toggleMuteBtn.textContent = video.muted ? "🔇" : "🔊";
    toggleMuteBtn.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
    toggleMuteBtn.setAttribute("title", video.muted ? "Unmute" : "Mute");
    updateLabel(cfg, video);
    updateGlobalButtons();
  }

  function refreshPlayPauseButton() {
    togglePlayPauseBtn.textContent = video.paused ? "Play" : "Pause";
    updateLabel(cfg, video);
    updateGlobalButtons();
  }

  function refreshCurrentTimeOutput() {
    outCurrentTime.textContent = formatDurationInfo(video.currentTime, video.duration);
  }

  function refreshPositionOutputs() {
    panXInput.value = cfg.panX;
    panYInput.value = cfg.panY;
    zoomInput.value = cfg.zoom;
    outPanX.textContent = `${cfg.panX.toFixed(0)}%`;
    outPanY.textContent = `${cfg.panY.toFixed(0)}%`;
    outZoom.textContent = `${cfg.zoom}%`;
  }

  function applyLoopBounds() {
    if (cfg.loopStart >= cfg.loopEnd) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
      loopEndInput.value = cfg.loopEnd;
      outLoopEnd.textContent = formatTime(cfg.loopEnd);
    }
    outLoopStart.textContent = formatTime(cfg.loopStart);
    outLoopEnd.textContent = formatTime(cfg.loopEnd);
  }

  // title
  titleInput.addEventListener("input", () => {
    cfg.title = titleInput.value.trim() || cfg.defaultTitle;
    titleHeading.textContent = cfg.title;
    updateLabel(cfg, video);
  });

  // file
  wrap.querySelector('[data-action="loadFile"]').addEventListener("click", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) { setStatus(`No local file selected for ${cfg.title}.`); return; }
    const objectUrl = URL.createObjectURL(file);
    cfg.objectUrl = objectUrl;
    setVideoSource(video, cfg, objectUrl, sourceStatus, { mode: "file", sourceValue: "", sourceFileName: file.name });
    setStatus(`Loaded local file for ${cfg.title}: ${file.name}`);
  });

  // url
  wrap.querySelector('[data-action="loadUrl"]').addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (!url) { setStatus(`No URL entered for ${cfg.title}.`); return; }
    setVideoSource(video, cfg, url, sourceStatus, { mode: "url", sourceValue: url, sourceFileName: "" });
    setStatus(`Loaded URL for ${cfg.title}.`);
  });

  // volume
  volumeInput.addEventListener("input", () => {
    cfg.volume = Number(volumeInput.value);
    video.volume = cfg.volume;
    outVolume.textContent = cfg.volume.toFixed(2);
  });

  // loop
  loopStartInput.addEventListener("input", () => {
    cfg.loopStart = Number(loopStartInput.value);
    if (cfg.loopStart >= cfg.loopEnd) {
      cfg.loopStart = Math.max(0, Number((cfg.loopEnd - 0.05).toFixed(2)));
      loopStartInput.value = cfg.loopStart;
    }
    applyLoopBounds();
  });

  loopEndInput.addEventListener("input", () => {
    cfg.loopEnd = Number(loopEndInput.value);
    if (cfg.loopEnd <= cfg.loopStart) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
      loopEndInput.value = cfg.loopEnd;
    }
    applyLoopBounds();
  });

  // seek
  seekInput.addEventListener("input", () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = Number(seekInput.value);
    refreshCurrentTimeOutput();
  });

  // zoom slider
  zoomInput.addEventListener("input", () => {
    cfg.zoom = Number(zoomInput.value);
    outZoom.textContent = `${cfg.zoom}%`;
    applyVideoPosition(cfg, video);
  });

  // pan X slider
  panXInput.addEventListener("input", () => {
    cfg.panX = Number(panXInput.value);
    outPanX.textContent = `${cfg.panX.toFixed(0)}%`;
    applyVideoPosition(cfg, video);
  });

  // pan Y slider
  panYInput.addEventListener("input", () => {
    cfg.panY = Number(panYInput.value);
    outPanY.textContent = `${cfg.panY.toFixed(0)}%`;
    applyVideoPosition(cfg, video);
  });

  // play/pause
  togglePlayPauseBtn.addEventListener("click", () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });

  wrap.querySelector('[data-action="jumpStart"]').addEventListener("click", () => {
    video.currentTime = cfg.loopStart;
    refreshCurrentTimeOutput();
  });

  wrap.querySelector('[data-action="setStartHere"]').addEventListener("click", () => {
    cfg.loopStart = Number(video.currentTime.toFixed(2));
    if (cfg.loopStart >= cfg.loopEnd) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
      loopEndInput.value = cfg.loopEnd;
    }
    loopStartInput.value = cfg.loopStart;
    applyLoopBounds();
  });

  wrap.querySelector('[data-action="setEndHere"]').addEventListener("click", () => {
    cfg.loopEnd = Number(video.currentTime.toFixed(2));
    if (cfg.loopEnd <= cfg.loopStart) {
      cfg.loopStart = Math.max(0, Number((cfg.loopEnd - 0.05).toFixed(2)));
      loopStartInput.value = cfg.loopStart;
    }
    loopEndInput.value = cfg.loopEnd;
    applyLoopBounds();
  });

  wrap.querySelector('[data-action="resetPosition"]').addEventListener("click", () => {
    resetVideoPosition(cfg, video);
    refreshPositionOutputs();
    setStatus(`${cfg.title}: position reset.`);
  });

  toggleMuteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    refreshMuteState();
    showActionIcon(video.muted ? "🔇" : "🔊");
    setStatus(`${cfg.title} ${video.muted ? "muted" : "unmuted"}.`);
  });

  video.addEventListener("loadedmetadata", () => {
    seekInput.max = video.duration;
    if (cfg.loopEnd > video.duration) {
      cfg.loopEnd = Number(video.duration.toFixed(2));
      loopEndInput.value = cfg.loopEnd;
    }
    video.volume = cfg.volume;
    video.currentTime = clamp(cfg.loopStart, 0, video.duration || cfg.loopStart);
    applyLoopBounds();
    refreshPlayPauseButton();
    refreshCurrentTimeOutput();
  });

  video.addEventListener("timeupdate", () => {
    if (Number.isFinite(video.duration)) {
      seekInput.max = video.duration;
      seekInput.value = video.currentTime;
    }
    refreshCurrentTimeOutput();
    if (video.currentTime >= cfg.loopEnd) {
      video.currentTime = cfg.loopStart;
      refreshCurrentTimeOutput();
      if (!video.paused) video.play().catch(() => {});
    }
  });

  video.addEventListener("volumechange", refreshMuteState);
  video.addEventListener("play", refreshPlayPauseButton);
  video.addEventListener("pause", refreshPlayPauseButton);

  cfg.ui = {
    titleInput,
    titleHeading,
    urlInput,
    sourceStatus,
    loopStartInput,
    loopEndInput,
    volumeInput,
    zoomInput,
    panXInput,
    panYInput,
    outLoopStart,
    outLoopEnd,
    outVolume,
    outCurrentTime,
    outZoom,
    outPanX,
    outPanY,
    refreshMuteState,
    refreshPlayPauseButton,
    refreshCurrentTimeOutput,
    refreshPositionOutputs
  };

  controls.appendChild(wrap);
  video.volume = cfg.volume;
  video.muted = false;
  applyVideoPosition(cfg, video);
  refreshMuteState();
  refreshPlayPauseButton();
  refreshCurrentTimeOutput();
  updateLabel(cfg, video);
}

// ─── config serialization ─────────────────────────────────────────────────────

function getSerializableConfig() {
  return {
    version: 3,
    name: currentConfigName,
    layoutMode: currentLayoutMode,
    exportedAt: new Date().toISOString(),
    videos: configs.map((cfg) => ({
      id: cfg.id,
      title: cfg.title,
      sourceMode: cfg.sourceMode,
      sourceValue: cfg.sourceValue,
      sourceFileName: cfg.sourceFileName,
      loopStart: cfg.loopStart,
      loopEnd: cfg.loopEnd,
      volume: cfg.volume,
      muted: getVideoByConfig(cfg).muted,
      panX: cfg.panX,
      panY: cfg.panY,
      zoom: cfg.zoom
    }))
  };
}

function saveConfigToFile() {
  const payload = JSON.stringify(getSerializableConfig(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${currentConfigName.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase() || "video-wall-config"}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`Configuration saved: ${currentConfigName}`);
}

function applyLoadedConfig(parsed, options = {}) {
  if (!parsed || !Array.isArray(parsed.videos)) throw new Error("Invalid config file format.");

  setDocumentTitle(parsed.name || options.fallbackName || "4 Video Wall");
  applyLayoutMode(parsed.layoutMode || "4x1");

  parsed.videos.forEach((savedCfg) => {
    const cfg = configs.find((item) => item.id === savedCfg.id);
    if (!cfg) return;

    const video = getVideoByConfig(cfg);

    cfg.title = savedCfg.title || cfg.defaultTitle;
    cfg.loopStart = Number(savedCfg.loopStart ?? cfg.loopStart);
    cfg.loopEnd = Number(savedCfg.loopEnd ?? cfg.loopEnd);
    cfg.volume = Number(savedCfg.volume ?? cfg.volume);
    cfg.sourceMode = savedCfg.sourceMode || "url";
    cfg.sourceValue = savedCfg.sourceValue || "";
    cfg.sourceFileName = savedCfg.sourceFileName || "";
    cfg.panX = Number(savedCfg.panX ?? 50);
    cfg.panY = Number(savedCfg.panY ?? 50);
    cfg.zoom = Number(savedCfg.zoom ?? 100);

    cfg.ui.titleInput.value = cfg.title;
    cfg.ui.titleHeading.textContent = cfg.title;
    cfg.ui.loopStartInput.value = cfg.loopStart;
    cfg.ui.loopEndInput.value = cfg.loopEnd;
    cfg.ui.volumeInput.value = cfg.volume;
    cfg.ui.outLoopStart.textContent = formatTime(cfg.loopStart);
    cfg.ui.outLoopEnd.textContent = formatTime(cfg.loopEnd);
    cfg.ui.outVolume.textContent = cfg.volume.toFixed(2);

    video.volume = cfg.volume;
    video.muted = Boolean(savedCfg.muted);

    applyVideoPosition(cfg, video);
    cfg.ui.refreshPositionOutputs();

    if (cfg.sourceMode === "url" && cfg.sourceValue) {
      cfg.ui.urlInput.value = cfg.sourceValue;
      setVideoSource(video, cfg, cfg.sourceValue, cfg.ui.sourceStatus, {
        mode: "url",
        sourceValue: cfg.sourceValue,
        sourceFileName: ""
      });
    } else if (cfg.sourceMode === "file") {
      safelyRevokeObjectUrl(cfg);
      cfg.ui.urlInput.value = "";
      cfg.ui.sourceStatus.textContent = `Source: local file (${cfg.sourceFileName || "unknown"}) cannot be restored automatically. Re-select it manually.`;
    }

    cfg.ui.refreshMuteState();
    cfg.ui.refreshPlayPauseButton();
    cfg.ui.refreshCurrentTimeOutput();
    updateLabel(cfg, video);
  });

  updateGlobalButtons();
}

async function loadConfigFromFileInput(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyLoadedConfig(parsed);
    setStatus(`Configuration loaded: ${parsed.name || "custom config"}. Re-select any saved local files manually.`);
  } catch (error) {
    setStatus(`Failed to load config: ${error.message}`);
  }
}

// ─── playback ─────────────────────────────────────────────────────────────────

async function unlockPlayback() {
  if (playbackUnlocked) return;
  playbackUnlocked = true;
  for (const cfg of configs) {
    const video = getVideoByConfig(cfg);
    video.volume = cfg.volume;
    video.muted = false;
    try { await video.play(); } catch {}
  }
  updateGlobalButtons();
}

function toggleMuteAll() {
  const shouldMute = configs.some((cfg) => !getVideoByConfig(cfg).muted);
  configs.forEach((cfg) => {
    const video = getVideoByConfig(cfg);
    video.muted = shouldMute;
    cfg.ui.refreshMuteState();
  });
  updateGlobalButtons();
  showActionIcon(shouldMute ? "🔇" : "🔊");
  setStatus(shouldMute ? "All videos muted." : "All videos unmuted.");
}

function toggleMuteSingle(index) {
  const cfg = configs[index];
  if (!cfg) return;
  const video = getVideoByConfig(cfg);
  video.muted = !video.muted;
  cfg.ui.refreshMuteState();
  updateGlobalButtons();
  showActionIcon(video.muted ? "🔇" : "🔊");
  setStatus(`${cfg.title} ${video.muted ? "muted" : "unmuted"}.`);
}

function togglePauseAll() {
  const shouldPause = configs.some((cfg) => !getVideoByConfig(cfg).paused);
  configs.forEach((cfg) => {
    const video = getVideoByConfig(cfg);
    if (shouldPause) video.pause();
    else video.play().catch(() => {});
    cfg.ui.refreshPlayPauseButton();
  });
  updateGlobalButtons();
  showActionIcon(shouldPause ? "⏸" : "▶");
  setStatus(shouldPause ? "All videos paused." : "All videos resumed.");
}

function togglePauseSingle(index) {
  const cfg = configs[index];
  if (!cfg) return;
  const video = getVideoByConfig(cfg);
  if (video.paused) video.play().catch(() => {});
  else video.pause();
  cfg.ui.refreshPlayPauseButton();
  updateGlobalButtons();
  showActionIcon(video.paused ? "⏸" : "▶");
  setStatus(`${cfg.title} ${video.paused ? "paused" : "resumed"}.`);
}

function clearSoloMode() {
  soloIndex = null;
  videoWall.classList.remove("solo-mode");
  document.querySelectorAll(".video-cell").forEach((cell) => cell.classList.remove("solo-visible"));
  configs.forEach((cfg) => {
    const video = getVideoByConfig(cfg);
    video.play().catch(() => {});
    cfg.ui.refreshPlayPauseButton();
  });
  updateGlobalButtons();
}

function soloVideo(index) {
  const cfg = configs[index];
  if (!cfg) return;
  if (soloIndex === index) {
    clearSoloMode();
    showActionIcon("◫");
    setStatus("Solo view cleared.");
    return;
  }
  const cells = document.querySelectorAll(".video-cell");
  soloIndex = index;
  videoWall.classList.add("solo-mode");
  cells.forEach((cell, i) => cell.classList.toggle("solo-visible", i === index));
  configs.forEach((item, i) => {
    const video = getVideoByConfig(item);
    if (i === index) video.play().catch(() => {});
    else video.pause();
    item.ui.refreshPlayPauseButton();
  });
  updateGlobalButtons();
  showActionIcon(String(index + 1));
  setStatus(`${cfg.title} solo view enabled.`);
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      showActionIcon("⛶");
      setStatus("Entered fullscreen.");
    } else {
      await document.exitFullscreen();
      showActionIcon("🡼");
      setStatus("Exited fullscreen.");
    }
  } catch (error) {
    setStatus(`Fullscreen failed: ${error.message}`);
  } finally {
    updateGlobalButtons();
  }
}

// ─── init ─────────────────────────────────────────────────────────────────────

createLayoutUI();
configs.forEach((cfg) => createControlUI(cfg));

// Attach drag and wheel handlers to each video-cell
document.querySelectorAll(".video-cell").forEach((cell, index) => {
  const cfg = configs[index];

  cell.addEventListener("pointerdown", (e) => {
    if (hud.classList.contains("hidden")) {
      onCellPointerDown(e, cfg);
    } else {
      toggleHud(false);
    }
  });

  cell.addEventListener("pointermove", onCellPointerMove);
  cell.addEventListener("pointerup", onCellPointerUp);
  cell.addEventListener("pointercancel", onCellPointerUp);

  cell.addEventListener("wheel", (e) => onCellWheel(e, cfg), { passive: false });

  // Double-click to reset position
  cell.addEventListener("dblclick", () => {
    if (!hud.classList.contains("hidden")) return;
    resetVideoPosition(cfg, getVideoByConfig(cfg));
    if (cfg.ui) cfg.ui.refreshPositionOutputs();
    showActionIcon("↺");
    setStatus(`${cfg.title}: position reset.`);
  });
});

closeHudBtn.addEventListener("click", () => toggleHud(false));
closeHelpBtn.addEventListener("click", () => toggleHelp(false));
saveConfigBtn.addEventListener("click", saveConfigToFile);

toggleMuteAllBtn.addEventListener("click", toggleMuteAll);
togglePauseAllBtn.addEventListener("click", togglePauseAll);
fullscreenBtn.addEventListener("click", toggleFullscreen);

quickShowHudBtn.addEventListener("click", () => toggleHud(true));
quickPauseBtn.addEventListener("click", togglePauseAll);
quickMuteBtn.addEventListener("click", toggleMuteAll);
quickLayoutBtn.addEventListener("click", toggleLayoutMode);
quickHelpBtn.addEventListener("click", () => toggleHelp());
quickFullscreenBtn.addEventListener("click", toggleFullscreen);

loadConfigInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  await loadConfigFromFileInput(file);
  loadConfigInput.value = "";
});

quickLoadConfigInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  await loadConfigFromFileInput(file);
  quickLoadConfigInput.value = "";
});

document.addEventListener("pointerdown", () => unlockPlayback());

document.addEventListener("mousemove", () => {
  if (hud.classList.contains("hidden")) showQuickBar();
});

document.addEventListener("fullscreenchange", updateGlobalButtons);

document.addEventListener("keydown", async (event) => {
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

  if (!isTyping) await unlockPlayback();

  if (event.code === "Enter") {
    if (!isTyping) { event.preventDefault(); toggleHud(); }
    return;
  }

  if (isTyping) return;

  if (event.code === "Space" || event.code === "KeyP") { event.preventDefault(); togglePauseAll(); return; }
  if (event.code === "KeyL") { event.preventDefault(); toggleLayoutMode(); return; }

  if (event.ctrlKey && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(event.code)) {
    event.preventDefault();
    soloVideo(Number(event.code.replace("Digit", "")) - 1);
    return;
  }

  if (event.shiftKey && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(event.code)) {
    event.preventDefault();
    togglePauseSingle(Number(event.code.replace("Digit", "")) - 1);
    return;
  }

  switch (event.code) {
    case "KeyH": event.preventDefault(); toggleHelp(); break;
    case "Escape": event.preventDefault(); clearSoloMode(); setStatus("Solo view cleared."); break;
    case "KeyM": event.preventDefault(); toggleMuteAll(); break;
    case "Digit1": event.preventDefault(); toggleMuteSingle(0); break;
    case "Digit2": event.preventDefault(); toggleMuteSingle(1); break;
    case "Digit3": event.preventDefault(); toggleMuteSingle(2); break;
    case "Digit4": event.preventDefault(); toggleMuteSingle(3); break;
  }
});

applyLayoutMode("4x1");
setHudVisible(true);
updateGlobalButtons();
setStatus(introMessage);

// ─── hide cursor after inactivity ────────────────────────────────────────────
let cursorTimer;
const CURSOR_HIDE_DELAY = 3000;

function hideCursor() {
  const style = document.getElementById('__cursorHideStyle') 
    || Object.assign(document.createElement('style'), { id: '__cursorHideStyle' });
  style.textContent = '* { cursor: none !important; }';
  document.head.appendChild(style);
}

function showCursor() {
  document.getElementById('__cursorHideStyle')?.remove();
}

document.addEventListener('mousemove', () => {
  showCursor();
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(hideCursor, CURSOR_HIDE_DELAY);
});