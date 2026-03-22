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
    objectUrl: null
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
    objectUrl: null
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
    objectUrl: null
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
    objectUrl: null
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
  if (!Number.isFinite(duration) || duration <= 0) {
    return currentText;
  }
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

  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2000);
}

function setHudVisible(isVisible) {
  hud.classList.toggle("hidden", !isVisible);
  document.body.classList.toggle("show-labels", isVisible);

  if (isVisible) {
    hideQuickBar();
  }
}

function toggleHud(force) {
  if (typeof force === "boolean") {
    setHudVisible(force);
    return;
  }

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
  if (cfg.objectUrl) {
    URL.revokeObjectURL(cfg.objectUrl);
    cfg.objectUrl = null;
  }
}

function setVideoSource(video, cfg, src, statusEl, options = {}) {
  const {
    mode = "url",
    sourceValue = src,
    sourceFileName = ""
  } = options;

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
    if (mode === "file") {
      statusEl.textContent = `Source: local file (${sourceFileName || "selected"})`;
    } else {
      statusEl.textContent = `Source: ${sourceValue}`;
    }
  }

  updateLabel(cfg, video);
}

function areAllMuted() {
  return configs.every((cfg) => getVideoByConfig(cfg).muted);
}

function areAllPaused() {
  return configs.every((cfg) => getVideoByConfig(cfg).paused);
}

function applyLayoutMode(mode) {
  const nextMode = mode === "2x2" ? "2x2" : "4x1";
  currentLayoutMode = nextMode;

  videoWall.classList.toggle("layout-4x1", nextMode === "4x1");
  videoWall.classList.toggle("layout-2x2", nextMode === "2x2");

  if (layoutSelect) {
    layoutSelect.value = nextMode;
  }

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

function showQuickBar() {
  if (!hud.classList.contains("hidden")) {
    return;
  }

  clearTimeout(quickBarTimer);
  quickBar.classList.remove("hidden");
  quickBar.classList.add("visible");
  quickBar.setAttribute("aria-hidden", "false");

  quickBarTimer = setTimeout(() => {
    hideQuickBar();
  }, 2000);
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
    <div class="source-status">4x1 = one row with four videos. 2x2 = two rows with two videos.</div>
  `;

  layoutSelect = wrap.querySelector('[data-role="layoutMode"]');
  const toggleLayoutBtn = wrap.querySelector('[data-action="toggleLayout"]');

  layoutSelect.value = currentLayoutMode;

  layoutSelect.addEventListener("change", () => {
    applyLayoutMode(layoutSelect.value);
    setStatus(`Layout switched to ${currentLayoutMode}.`);
  });

  toggleLayoutBtn.addEventListener("click", () => {
    toggleLayoutMode();
  });

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

    <div class="actions">
      <button type="button" data-action="togglePlayPause">Pause</button>
      <button type="button" data-action="jumpStart">Jump to Loop Start</button>
      <button type="button" data-action="setStartHere">Set Start = Now</button>
      <button type="button" data-action="setEndHere">Set End = Now</button>
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

  const outVolume = wrap.querySelector('[data-out="volume"]');
  const outLoopStart = wrap.querySelector('[data-out="loopStart"]');
  const outLoopEnd = wrap.querySelector('[data-out="loopEnd"]');
  const outCurrentTime = wrap.querySelector('[data-out="currentTime"]');

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

  function applyLoopBounds() {
    if (cfg.loopStart >= cfg.loopEnd) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
      loopEndInput.value = cfg.loopEnd;
      outLoopEnd.textContent = formatTime(cfg.loopEnd);
    }

    outLoopStart.textContent = formatTime(cfg.loopStart);
    outLoopEnd.textContent = formatTime(cfg.loopEnd);
  }

  titleInput.addEventListener("input", () => {
    cfg.title = titleInput.value.trim() || cfg.defaultTitle;
    titleHeading.textContent = cfg.title;
    updateLabel(cfg, video);
  });

  wrap.querySelector('[data-action="loadFile"]').addEventListener("click", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      setStatus(`No local file selected for ${cfg.title}.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    cfg.objectUrl = objectUrl;
    setVideoSource(video, cfg, objectUrl, sourceStatus, {
      mode: "file",
      sourceValue: "",
      sourceFileName: file.name
    });
    setStatus(`Loaded local file for ${cfg.title}: ${file.name}`);
  });

  wrap.querySelector('[data-action="loadUrl"]').addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus(`No URL entered for ${cfg.title}.`);
      return;
    }

    setVideoSource(video, cfg, url, sourceStatus, {
      mode: "url",
      sourceValue: url,
      sourceFileName: ""
    });
    setStatus(`Loaded URL for ${cfg.title}.`);
  });

  volumeInput.addEventListener("input", () => {
    cfg.volume = Number(volumeInput.value);
    video.volume = cfg.volume;
    outVolume.textContent = cfg.volume.toFixed(2);
  });

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

  seekInput.addEventListener("input", () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    video.currentTime = Number(seekInput.value);
    refreshCurrentTimeOutput();
  });

  togglePlayPauseBtn.addEventListener("click", () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
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
      if (!video.paused) {
        video.play().catch(() => {});
      }
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
    outLoopStart,
    outLoopEnd,
    outVolume,
    outCurrentTime,
    refreshMuteState,
    refreshPlayPauseButton,
    refreshCurrentTimeOutput
  };

  controls.appendChild(wrap);
  video.volume = cfg.volume;
  video.muted = false;
  refreshMuteState();
  refreshPlayPauseButton();
  refreshCurrentTimeOutput();
  updateLabel(cfg, video);
}

function getSerializableConfig() {
  return {
    version: 2,
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
      muted: getVideoByConfig(cfg).muted
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
  if (!parsed || !Array.isArray(parsed.videos)) {
    throw new Error("Invalid config file format.");
  }

  setDocumentTitle(parsed.name || options.fallbackName || "4 Video Wall");
  applyLayoutMode(parsed.layoutMode || "4x1");

  parsed.videos.forEach((savedCfg) => {
    const cfg = configs.find((item) => item.id === savedCfg.id);
    if (!cfg) {
      return;
    }

    const video = getVideoByConfig(cfg);

    cfg.title = savedCfg.title || cfg.defaultTitle;
    cfg.loopStart = Number(savedCfg.loopStart ?? cfg.loopStart);
    cfg.loopEnd = Number(savedCfg.loopEnd ?? cfg.loopEnd);
    cfg.volume = Number(savedCfg.volume ?? cfg.volume);
    cfg.sourceMode = savedCfg.sourceMode || "url";
    cfg.sourceValue = savedCfg.sourceValue || "";
    cfg.sourceFileName = savedCfg.sourceFileName || "";

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
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyLoadedConfig(parsed);
    setStatus(`Configuration loaded: ${parsed.name || "custom config"}. Re-select any saved local files manually.`);
  } catch (error) {
    setStatus(`Failed to load config: ${error.message}`);
  }
}

async function unlockPlayback() {
  if (playbackUnlocked) {
    return;
  }

  playbackUnlocked = true;

  for (const cfg of configs) {
    const video = getVideoByConfig(cfg);
    video.volume = cfg.volume;
    video.muted = false;

    try {
      await video.play();
    } catch (error) {
    }
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
  if (!cfg) {
    return;
  }

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
    if (shouldPause) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    cfg.ui.refreshPlayPauseButton();
  });

  updateGlobalButtons();
  showActionIcon(shouldPause ? "⏸" : "▶");
  setStatus(shouldPause ? "All videos paused." : "All videos resumed.");
}

function togglePauseSingle(index) {
  const cfg = configs[index];
  if (!cfg) {
    return;
  }

  const video = getVideoByConfig(cfg);
  if (video.paused) {
    video.play().catch(() => {});
  } else {
    video.pause();
  }

  cfg.ui.refreshPlayPauseButton();
  updateGlobalButtons();
  showActionIcon(video.paused ? "⏸" : "▶");
  setStatus(`${cfg.title} ${video.paused ? "paused" : "resumed"}.`);
}

function clearSoloMode() {
  soloIndex = null;
  videoWall.classList.remove("solo-mode");
  document.querySelectorAll(".video-cell").forEach((cell) => {
    cell.classList.remove("solo-visible");
  });

  configs.forEach((cfg) => {
    const video = getVideoByConfig(cfg);
    video.play().catch(() => {});
    cfg.ui.refreshPlayPauseButton();
  });

  updateGlobalButtons();
}

function soloVideo(index) {
  const cfg = configs[index];
  if (!cfg) {
    return;
  }

  if (soloIndex === index) {
    clearSoloMode();
    showActionIcon("◫");
    setStatus("Solo view cleared.");
    return;
  }

  const cells = document.querySelectorAll(".video-cell");
  soloIndex = index;

  videoWall.classList.add("solo-mode");
  cells.forEach((cell, cellIndex) => {
    cell.classList.toggle("solo-visible", cellIndex === index);
  });

  configs.forEach((item, itemIndex) => {
    const video = getVideoByConfig(item);
    if (itemIndex === index) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
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

createLayoutUI();
configs.forEach((cfg) => createControlUI(cfg));

document.querySelectorAll(".video-cell").forEach((cell) => {
  cell.addEventListener("click", () => {
    if (!hud.classList.contains("hidden")) {
      toggleHud(false);
    }
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

loadConfigInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  await loadConfigFromFileInput(file);
  loadConfigInput.value = "";
});

quickLoadConfigInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  await loadConfigFromFileInput(file);
  quickLoadConfigInput.value = "";
});

document.addEventListener("pointerdown", () => {
  unlockPlayback();
});

document.addEventListener("mousemove", () => {
  if (hud.classList.contains("hidden")) {
    showQuickBar();
  }
});

document.addEventListener("fullscreenchange", updateGlobalButtons);

document.addEventListener("keydown", async (event) => {
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

  if (!isTyping) {
    await unlockPlayback();
  }

  if (event.code === "Enter") {
    if (!isTyping) {
      event.preventDefault();
      toggleHud();
    }
    return;
  }

  if (isTyping) {
    return;
  }

  if (event.code === "Space" || event.code === "KeyP") {
    event.preventDefault();
    togglePauseAll();
    return;
  }

  if (event.code === "KeyL") {
    event.preventDefault();
    toggleLayoutMode();
    return;
  }

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
    case "KeyH":
      event.preventDefault();
      toggleHelp();
      break;
    case "Escape":
      event.preventDefault();
      clearSoloMode();
      setStatus("Solo view cleared.");
      break;
    case "KeyM":
      event.preventDefault();
      toggleMuteAll();
      break;
    case "Digit1":
      event.preventDefault();
      toggleMuteSingle(0);
      break;
    case "Digit2":
      event.preventDefault();
      toggleMuteSingle(1);
      break;
    case "Digit3":
      event.preventDefault();
      toggleMuteSingle(2);
      break;
    case "Digit4":
      event.preventDefault();
      toggleMuteSingle(3);
      break;
    default:
      break;
  }
});

applyLayoutMode("4x1");
setHudVisible(true);
updateGlobalButtons();
setStatus(introMessage);