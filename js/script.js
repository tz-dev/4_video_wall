const configs = [
  {
    id: "video1",
    defaultTitle: "Video 1",
    title: "Video 1",
    loopStart: 0.0,
    loopEnd: Infinity,
    volume: 1.0,
    audioOffset: 0.0,
    sourceMode: "url",
    sourceValue: "1.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100,
    playbackRate: 1.0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    fadeMode: "none",   // "none" | "black" | "white"
    fadeIn: 0.0,
    fadeOut: 0.0
  },
  {
    id: "video2",
    defaultTitle: "Video 2",
    title: "Video 2",
    loopStart: 0.0,
    loopEnd: Infinity,
    volume: 1.0,
    audioOffset: 0.0,
    sourceMode: "url",
    sourceValue: "2.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100,
    playbackRate: 1.0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    fadeMode: "none",
    fadeIn: 0.0,
    fadeOut: 0.0
  },
  {
    id: "video3",
    defaultTitle: "Video 3",
    title: "Video 3",
    loopStart: 0.0,
    loopEnd: Infinity,
    volume: 1.0,
    audioOffset: 0.0,
    sourceMode: "url",
    sourceValue: "3.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100,
    playbackRate: 1.0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    fadeMode: "none",
    fadeIn: 0.0,
    fadeOut: 0.0
  },
  {
    id: "video4",
    defaultTitle: "Video 4",
    title: "Video 4",
    loopStart: 0.0,
    loopEnd: Infinity,
    volume: 1.0,
    audioOffset: 0.0,
    sourceMode: "url",
    sourceValue: "4.mp4",
    sourceFileName: "",
    objectUrl: null,
    panX: 50,
    panY: 50,
    zoom: 100,
    playbackRate: 1.0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    fadeMode: "none",
    fadeIn: 0.0,
    fadeOut: 0.0
  }
];

const introMessage = "Load default config to start.";

const LAYOUT_MODES = ["4x1", "2x2", "2x1-left", "2x1-right"];

const LAYOUT_LABELS = {
  "4x1":       "4×1",
  "2x2":       "2×2",
  "2x1-left":  "2L+2R",
  "2x1-right": "2R+2L"
};

const LAYOUT_DESCRIPTIONS = {
  "4x1":       "4 videos in a row",
  "2x2":       "2×2 grid",
  "2x1-left":  "Left: 2 above each other · right: 2 next to each other",
  "2x1-right": "Left: 2 next to each other · right: 2 above each other"
};

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];

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
const exitAppBtn = document.getElementById("exitAppBtn");

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
const quickExitBtn = document.getElementById("quickExitBtn");
const quickLoadConfigInput = document.getElementById("quickLoadConfigInput");

let playbackUnlocked = false;
let autoplayEnabled = true;
let currentConfigName = "4 Video Wall";
let currentLayoutMode = "4x1";
let actionOverlayTimer = null;
let toastTimer = null;
let quickBarTimer = null;
let layoutSelect = null;
let layoutDescStatus = null;
let layoutNextBtn = null;
let layoutUiWrap = null;
let panelOrderBar = null;
let soloIndex = null;
let activePanelCount = null;
let dragState = null;
let reorderDragId = null;
let cursorTimer = null;
let lastFullscreenState = isAnyFullscreenActive();
let appInfo = { desktopMode: false, defaultFullscreen: false };
const CURSOR_HIDE_DELAY = 3000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "∞";
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

function setDesktopMode(enabled) {
  document.body.classList.toggle("desktop-app", !!enabled);
}

async function fetchAppInfo() {
  try {
    const response = await fetch("/api/app-info", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    appInfo = { ...appInfo, ...payload };
    setDesktopMode(!!appInfo.desktopMode);
  } catch (_error) {
    appInfo = { desktopMode: false, defaultFullscreen: false };
    setDesktopMode(false);
  }
}

async function exitApplication() {
  if (!appInfo.desktopMode) {
    setStatus("Exit button is available in the desktop app only.");
    return;
  }

  try {
    if (window.pywebview?.api?.close_app) {
      await window.pywebview.api.close_app();
      return;
    }
  } catch (error) {
    setStatus(`Exit failed: ${error.message}`);
    return;
  }

  setStatus("Desktop bridge not available.");
}

function setDocumentTitle(name) {
  const normalized = String(name ?? "").trim();
  currentConfigName = normalized || "4 Video Wall";
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

function getCellByConfig(cfg) {
  return getVideoByConfig(cfg)?.closest(".video-cell");
}

function getVisualIndex(cfg) {
  return configs.indexOf(cfg) + 1;
}

function ensureAudioElement(cfg) {
  if (cfg.audioEl) return cfg.audioEl;

  const audio = document.createElement("video");
  audio.preload = "auto";
  audio.playsInline = true;
  audio.muted = false;
  audio.style.display = "none";
  document.body.appendChild(audio);

  cfg.audioEl = audio;
  return audio;
}

function getAudioByConfig(cfg) {
  return ensureAudioElement(cfg);
}

function refreshAllLabels() {
  configs.forEach((cfg) => {
    const video = getVideoByConfig(cfg);
    if (video) updateLabel(cfg, video);
  });
}

function updateLabel(cfg, video) {
  const label = document.getElementById(`label${cfg.id.replace("video", "")}`);
  if (!label) return;

  const index = getVisualIndex(cfg);
  const audio = getAudioByConfig(cfg);
  const mutedFlag = audio.muted ? "Muted" : "Live";
  const pauseFlag = video.paused ? "Paused" : "Playing";
  const speedFlag = video.playbackRate !== 1.0 ? ` · ${video.playbackRate}×` : "";
  const offsetFlag = cfg.audioOffset ? ` · A:${cfg.audioOffset >= 0 ? "+" : ""}${cfg.audioOffset.toFixed(2)}s` : "";
  label.textContent = `${index} · ${cfg.title} · ${pauseFlag} · ${mutedFlag}${speedFlag}${offsetFlag}`;
}

function safelyRevokeObjectUrl(cfg) {
  if (cfg.objectUrl) {
    URL.revokeObjectURL(cfg.objectUrl);
    cfg.objectUrl = null;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* fade handling */
/* ────────────────────────────────────────────────────────────────────────── */

function ensureFadeOverlay(cfg) {
  const cell = getCellByConfig(cfg);
  if (!cell) return null;

  cell.style.position = cell.style.position || "relative";

  let overlay = cell.querySelector(".fade-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "fade-overlay";
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.opacity = "0";
    overlay.style.transition = "none";
    overlay.style.zIndex = "2";
    cell.appendChild(overlay);
  }

  const label = cell.querySelector(".label");
  if (label) {
    label.style.zIndex = "3";
    if (!label.style.position) label.style.position = "absolute";
  }

  return overlay;
}

function applyFadeAppearance(cfg) {
  const overlay = ensureFadeOverlay(cfg);
  if (!overlay) return;
  overlay.style.background = cfg.fadeMode === "white" ? "#fff" : "#000";
}

function getPlaybackSegment(cfg, video) {
  const duration = Number(video.duration);
  const hasDuration = Number.isFinite(duration) && duration > 0;

  const start = Math.max(0, Number(cfg.loopStart || 0));
  const hasCustomLoopEnd = Number.isFinite(cfg.loopEnd) && cfg.loopEnd > start;

  if (hasCustomLoopEnd) {
    const end = hasDuration ? clamp(cfg.loopEnd, 0, duration) : Number(cfg.loopEnd);

    return {
      start: hasDuration ? clamp(start, 0, duration) : start,
      end,
      length: Math.max(0, end - start),
      isLoop: true
    };
  }

  if (hasDuration) {
    return {
      start: 0,
      end: duration,
      length: duration,
      isLoop: false
    };
  }

  return {
    start: 0,
    end: Infinity,
    length: Infinity,
    isLoop: false
  };
}

function syncNativeLoop(video, cfg) {
  const audio = getAudioByConfig(cfg);

  video.loop = false;
  audio.loop = false;
}

function normalizeFadeTimes(cfg, video, changedKey = null) {
  let fadeIn = Math.max(0, Number(cfg.fadeIn || 0));
  let fadeOut = Math.max(0, Number(cfg.fadeOut || 0));

  const segment = getPlaybackSegment(cfg, video);
  const maxLen = segment.length;

  if (Number.isFinite(maxLen)) {
    if (changedKey === "fadeIn") {
      fadeIn = Math.min(fadeIn, maxLen);
      fadeOut = Math.min(fadeOut, Math.max(0, maxLen - fadeIn));
    } else if (changedKey === "fadeOut") {
      fadeOut = Math.min(fadeOut, maxLen);
      fadeIn = Math.min(fadeIn, Math.max(0, maxLen - fadeOut));
    } else {
      fadeIn = Math.min(fadeIn, maxLen);
      fadeOut = Math.min(fadeOut, maxLen);
      if (fadeIn + fadeOut > maxLen) {
        const overflow = fadeIn + fadeOut - maxLen;
        if (fadeOut >= overflow) fadeOut -= overflow;
        else {
          const rest = overflow - fadeOut;
          fadeOut = 0;
          fadeIn = Math.max(0, fadeIn - rest);
        }
      }
    }
  }

  cfg.fadeIn = Number(fadeIn.toFixed(2));
  cfg.fadeOut = Number(fadeOut.toFixed(2));

  if (cfg.ui) {
    cfg.ui.fadeModeInput.value = cfg.fadeMode;
    cfg.ui.fadeInInput.value = cfg.fadeIn;
    cfg.ui.fadeOutInput.value = cfg.fadeOut;
    cfg.ui.outFadeIn.textContent = `${cfg.fadeIn.toFixed(2)}s`;
    cfg.ui.outFadeOut.textContent = `${cfg.fadeOut.toFixed(2)}s`;

    if (Number.isFinite(segment.length)) {
      const scopeText = segment.isLoop
        ? `Loop segment: ${formatTime(segment.start)} → ${formatTime(segment.end)}`
        : `Video segment: ${formatTime(segment.start)} → ${formatTime(segment.end)}`;
      cfg.ui.fadeStatus.textContent = `${scopeText} · Max fade total: ${segment.length.toFixed(2)}s`;
    } else {
      cfg.ui.fadeStatus.textContent = "Fade bounds become exact once metadata is loaded.";
    }
  }

  applyFadeAppearance(cfg);
  updateFadeOverlay(cfg, video);
}

function resetFadeRuntime(cfg) {
  cfg._fadeTransition = null;
  cfg._loopTransitionRunning = false;
  cfg._loopWaitForSeek = false;
  cfg._loopResumeFadeInAfterPlay = false;
  cfg._loopTriggeredForCycle = false;
  cfg._pausedAtTs = 0;
}

function beginFadeTransition(cfg, fromOpacity, toOpacity, durationSec, onComplete = null) {
  cfg._fadeTransition = {
    from: clamp(fromOpacity, 0, 1),
    to: clamp(toOpacity, 0, 1),
    durationMs: Math.max(0, Number(durationSec || 0) * 1000),
    startedAt: performance.now(),
    onComplete
  };
}

function getCurrentTransitionOpacity(cfg) {
  const tr = cfg._fadeTransition;
  if (!tr) return null;

  if (tr.durationMs <= 0) {
    return tr.to;
  }

  const now = performance.now();
  const progress = clamp((now - tr.startedAt) / tr.durationMs, 0, 1);
  return tr.from + (tr.to - tr.from) * progress;
}

function advanceFadeTransition(cfg) {
  const tr = cfg._fadeTransition;
  if (!tr) return false;

  if (tr.durationMs <= 0) {
    const done = tr.onComplete;
    cfg._fadeTransition = null;
    if (typeof done === "function") done();
    return true;
  }

  const now = performance.now();
  const progress = clamp((now - tr.startedAt) / tr.durationMs, 0, 1);

  if (progress >= 1) {
    const done = tr.onComplete;
    cfg._fadeTransition = null;
    if (typeof done === "function") done();
    return true;
  }

  return false;
}

function getPassiveFadeOpacity(cfg, video) {
  if (cfg.fadeMode === "none") return 0;

  const segment = getPlaybackSegment(cfg, video);
  const t = Number(video.currentTime || 0);
  const fadeIn = Math.max(0, Number(cfg.fadeIn || 0));
  const fadeOut = Math.max(0, Number(cfg.fadeOut || 0));

  let opacity = 0;

  if (fadeIn > 0 && t >= segment.start && t < segment.start + fadeIn) {
    const p = (t - segment.start) / fadeIn;
    opacity = Math.max(opacity, clamp(1 - p, 0, 1));
  }

  if (
    fadeOut > 0 &&
    Number.isFinite(segment.end) &&
    t >= segment.end - fadeOut &&
    t <= segment.end
  ) {
    const p = (segment.end - t) / fadeOut;
    opacity = Math.max(opacity, clamp(1 - p, 0, 1));
  }

  return clamp(opacity, 0, 1);
}

function setFadeOverlayOpacity(cfg, opacity) {
  const overlay = ensureFadeOverlay(cfg);
  if (!overlay) return;
  overlay.style.opacity = String(clamp(opacity, 0, 1));
}

function updateFadeOverlay(cfg, video) {
  const overlay = ensureFadeOverlay(cfg);
  if (!overlay) return;

  if (cfg.fadeMode === "none") {
    overlay.style.transition = "none";
    overlay.style.opacity = "0";
    return;
  }

  overlay.style.background = cfg.fadeMode === "white" ? "#fff" : "#000";
  overlay.style.transition = "none";

  if (cfg._fadeTransition) {
    setFadeOverlayOpacity(cfg, getCurrentTransitionOpacity(cfg));
    return;
  }

  setFadeOverlayOpacity(cfg, getPassiveFadeOpacity(cfg, video));
}

function startManualLoopTransition(cfg, video) {
  if (cfg._loopTransitionRunning) return;
  if (cfg.fadeMode === "none") return;

  const segment = getPlaybackSegment(cfg, video);
  if (!segment.isLoop || !Number.isFinite(segment.end)) return;

  cfg._loopTransitionRunning = true;
  cfg._loopWaitForSeek = false;
  cfg._loopResumeFadeInAfterPlay = false;

  const startOpacity = getPassiveFadeOpacity(cfg, video);
  const fadeOut = Math.max(0, Number(cfg.fadeOut || 0));

  beginFadeTransition(cfg, startOpacity, 1, fadeOut, () => {
    cfg._loopWaitForSeek = true;
    video.currentTime = segment.start;
  });

  updateFadeOverlay(cfg, video);
}

function continueFadeInAfterSeek(cfg, video) {
  const fadeIn = Math.max(0, Number(cfg.fadeIn || 0));

  beginFadeTransition(cfg, 1, 0, fadeIn, () => {
    cfg._loopTransitionRunning = false;
    cfg._loopWaitForSeek = false;
    cfg._loopResumeFadeInAfterPlay = false;
    cfg._loopTriggeredForCycle = false;
    updateFadeOverlay(cfg, video);
  });

  updateFadeOverlay(cfg, video);
}

function cancelManualLoopTransition(cfg, video) {
  const overlay = ensureFadeOverlay(cfg);
  if (overlay) overlay.style.transition = "none";

  cfg._loopWaitForSeek = false;
  cfg._loopResumeFadeInAfterPlay = false;
  cfg._loopTransitionRunning = false;

  if (cfg._fadeTransition) {
    const frozen = getCurrentTransitionOpacity(cfg);
    cfg._fadeTransition = null;
    setFadeOverlayOpacity(cfg, frozen ?? getPassiveFadeOpacity(cfg, video));
  } else {
    updateFadeOverlay(cfg, video);
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* audio sync */
/* ────────────────────────────────────────────────────────────────────────── */

function wrapTimeInRange(time, start, end) {
  const len = end - start;
  if (!Number.isFinite(len) || len <= 0) return Math.max(start, time);

  let wrapped = (time - start) % len;
  if (wrapped < 0) wrapped += len;
  return start + wrapped;
}

function getAudioTargetTime(cfg, video) {
  const segment = getPlaybackSegment(cfg, video);
  const videoTime = Number(video.currentTime || 0);
  const offset = Number(cfg.audioOffset || 0);

  if (Number.isFinite(segment.start) && Number.isFinite(segment.end) && Number.isFinite(segment.length) && segment.length > 0) {
    return wrapTimeInRange(videoTime + offset, segment.start, segment.end);
  }

  return Math.max(0, videoTime + offset);
}

function hardSyncAudioToVideo(cfg, video) {
  const audio = getAudioByConfig(cfg);
  const targetTime = getAudioTargetTime(cfg, video);

  try {
    audio.currentTime = targetTime;
  } catch {}

  audio.playbackRate = video.playbackRate;
  audio.volume = cfg.volume;
  audio.muted = !!cfg._audioMuted;
}

function restartLoopCycle(cfg, video) {
  const audio = getAudioByConfig(cfg);
  const segment = getPlaybackSegment(cfg, video);
  const shouldResume = !video.paused;

  if (!Number.isFinite(segment.start)) return;

  video.pause();
  audio.pause();

  try {
    video.currentTime = segment.start;
  } catch {}

  hardSyncAudioToVideo(cfg, video);

  cfg._loopTriggeredForCycle = false;
  cfg._loopWaitForSeek = false;
  cfg._loopResumeFadeInAfterPlay = false;

  updateFadeOverlay(cfg, video);

  if (shouldResume || autoplayEnabled) {
    video.play().catch(() => {});
    audio.play().catch(() => {});
  }
}

function syncAudioToVideo(cfg, video, force = false) {
  const audio = getAudioByConfig(cfg);
  if (!audio || !video.currentSrc) return;

  const targetTime = getAudioTargetTime(cfg, video);
  const currentAudioTime = Number(audio.currentTime || 0);
  const drift = Math.abs(currentAudioTime - targetTime);

  const shouldHardSync =
    force ||
    audio.ended ||
    Number.isNaN(currentAudioTime) ||
    drift > 0.08;

  if (shouldHardSync) {
    try {
      audio.currentTime = targetTime;
    } catch {}
  }

  if (Math.abs(audio.playbackRate - video.playbackRate) > 0.001) {
    audio.playbackRate = video.playbackRate;
  }

  if (audio.volume !== cfg.volume) {
    audio.volume = cfg.volume;
  }

  if (audio.muted !== !!cfg._audioMuted) {
    audio.muted = !!cfg._audioMuted;
  }

  if (!video.paused && audio.paused && !audio.ended) {
    audio.play().catch(() => {});
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* positioning + filters */
/* ────────────────────────────────────────────────────────────────────────── */

function applyVideoPosition(cfg, video) {
  if (cfg.zoom <= 100) {
    video.style.objectPosition = `${cfg.panX}% ${cfg.panY}%`;
    video.style.transform = "";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.left = "";
    video.style.top = "";
    video.style.position = "";
  } else {
    const scale = cfg.zoom / 100;
    const tx = (cfg.panX - 50) / 50;
    const ty = (cfg.panY - 50) / 50;
    const maxShift = ((scale - 1) / 2) * 100;
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

function applyVideoFilter(cfg, video) {
  video.style.filter = [
    `brightness(${cfg.brightness}%)`,
    `contrast(${cfg.contrast}%)`,
    `saturate(${cfg.saturation}%)`,
    `grayscale(${cfg.grayscale}%)`
  ].join(" ");
}

function resetVideoFilter(cfg, video) {
  cfg.brightness = 100;
  cfg.contrast   = 100;
  cfg.saturation = 100;
  cfg.grayscale  = 0;
  applyVideoFilter(cfg, video);
  if (cfg.ui) cfg.ui.refreshFilterOutputs();
}

let currentGridGap = 0;

function applyGridGap(px) {
  currentGridGap = px;
  videoWall.style.gap = `${px}px`;
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

/* ────────────────────────────────────────────────────────────────────────── */
/* drag pan/zoom */
/* ────────────────────────────────────────────────────────────────────────── */

function onCellPointerDown(e, cfg) {
  if (e.button !== 0) return;
  if (!hud.classList.contains("hidden")) return;
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

/* ────────────────────────────────────────────────────────────────────────── */
/* sources */
/* ────────────────────────────────────────────────────────────────────────── */

function setVideoSource(video, cfg, src, statusEl, options = {}) {
  stopFadeAnimationLoop(cfg);

  const audio = getAudioByConfig(cfg);

  video.pause();
  audio.pause();

  resetFadeRuntime(cfg);
  cfg._loopTriggeredForCycle = false;
  cfg._audioWaitingForCanPlay = true;
  cfg._videoWaitingForCanPlay = true;

  const tryStartBoth = () => {
    if (cfg._videoWaitingForCanPlay || cfg._audioWaitingForCanPlay) return;

    syncNativeLoop(video, cfg);
    hardSyncAudioToVideo(cfg, video);

    if (autoplayEnabled) {
      video.play().catch(() => {});
      audio.play().catch(() => {});
    } else {
      updateLabel(cfg, video);
      if (cfg.ui) cfg.ui.refreshPlayPauseButton();
    }
  };

  video.addEventListener("canplay", function onVideoCanPlay() {
    video.removeEventListener("canplay", onVideoCanPlay);
    cfg._videoWaitingForCanPlay = false;
    tryStartBoth();
  }, { once: true });

  audio.addEventListener("canplay", function onAudioCanPlay() {
    audio.removeEventListener("canplay", onAudioCanPlay);
    cfg._audioWaitingForCanPlay = false;
    tryStartBoth();
  }, { once: true });

  video.src = src;
  video.load();

  audio.src = src;
  audio.load();

  cfg.sourceMode = options.mode ?? "url";
  cfg.sourceValue = options.sourceValue ?? src;
  cfg.sourceFileName = options.sourceFileName ?? "";

  if (statusEl) {
    statusEl.textContent = options.mode === "file"
      ? `Source: local file (${options.sourceFileName || "selected"})`
      : `Source: ${options.sourceValue}`;
  }

  updateLabel(cfg, video);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* state */
/* ────────────────────────────────────────────────────────────────────────── */

function areAllMuted() {
  return configs.every((cfg) => !!cfg._audioMuted);
}

function areAllPaused() {
  return configs.every((cfg) => getVideoByConfig(cfg).paused);
}

function syncLayoutAvailability() {
  const disabled = activePanelCount !== null && activePanelCount < 4;

  if (layoutSelect) layoutSelect.disabled = disabled;
  if (layoutNextBtn) layoutNextBtn.disabled = disabled;
  quickLayoutBtn.disabled = disabled;

  const msg = disabled
    ? "Layout change disabled while fewer than 4 panels are shown."
    : "Switch Layout";

  if (layoutSelect) layoutSelect.title = msg;
  if (layoutNextBtn) layoutNextBtn.title = msg;
  quickLayoutBtn.title = msg;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* layout */
/* ────────────────────────────────────────────────────────────────────────── */

function applyLayoutMode(mode) {
  const nextMode = LAYOUT_MODES.includes(mode) ? mode : "4x1";
  currentLayoutMode = nextMode;

  videoWall.classList.remove(...LAYOUT_MODES.map((m) => `layout-${m}`));
  videoWall.classList.add(`layout-${nextMode}`);

  if (layoutSelect) layoutSelect.value = nextMode;
  if (layoutDescStatus) layoutDescStatus.textContent = LAYOUT_DESCRIPTIONS[nextMode] || "";

  quickLayoutBtn.textContent = LAYOUT_LABELS[nextMode] || nextMode;
  syncLayoutAvailability();
}

function toggleLayoutMode() {
  if (activePanelCount !== null && activePanelCount < 4) {
    setStatus("Layout change is disabled while fewer than 4 panels are visible.");
    return;
  }

  const currentIndex = LAYOUT_MODES.indexOf(currentLayoutMode);
  const nextIndex = (currentIndex + 1) % LAYOUT_MODES.length;
  const nextMode = LAYOUT_MODES[nextIndex];
  applyLayoutMode(nextMode);
  showActionIcon(LAYOUT_LABELS[nextMode] || nextMode);
  setStatus(`Layout: ${LAYOUT_DESCRIPTIONS[nextMode] || nextMode}`);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* order / panel selector */
/* ────────────────────────────────────────────────────────────────────────── */

function updatePanelOrderUI() {
  if (!panelOrderBar) return;

  panelOrderBar.innerHTML = "";

  configs.forEach((cfg, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "panel-order-item";
    btn.draggable = true;
    btn.dataset.cfgId = cfg.id;
    btn.dataset.index = String(index);

    btn.textContent = String(index + 1);
    btn.title = `${cfg.title} · click = show first ${index + 1}`;

    btn.style.minWidth = "2.2rem";
    btn.style.cursor = "grab";

    if (activePanelCount === null) {
      if (index === 3) btn.classList.add("active");
    } else if (activePanelCount === index + 1) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      setActivePanelCount(index + 1);
    });

    btn.addEventListener("dragstart", (e) => {
      reorderDragId = cfg.id;
      btn.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", cfg.id);
      }
    });

    btn.addEventListener("dragend", () => {
      reorderDragId = null;
      panelOrderBar.querySelectorAll(".panel-order-item").forEach((el) => el.classList.remove("dragging"));
    });

    panelOrderBar.appendChild(btn);
  });

  panelOrderBar.style.display = "flex";
  panelOrderBar.style.gap = "0.5rem";
  panelOrderBar.style.flexWrap = "wrap";
}

function getReorderDropIndex(clientX) {
  const items = [...panelOrderBar.querySelectorAll(".panel-order-item")];
  if (!items.length) return configs.length - 1;

  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    if (clientX < midpoint) return i;
  }

  return items.length;
}

function applyConfigOrder() {
  configs.forEach((cfg) => {
    const cell = getCellByConfig(cfg);
    if (cell) videoWall.appendChild(cell);
  });

  if (layoutUiWrap) controls.appendChild(layoutUiWrap);

  configs.forEach((cfg) => {
    if (cfg.ui?.wrap) controls.appendChild(cfg.ui.wrap);
  });

  updatePanelOrderUI();
  refreshAllLabels();
  applyVisiblePanelState();
}

function reorderConfigs(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= configs.length || toIndex > configs.length) {
    return;
  }

  const [moved] = configs.splice(fromIndex, 1);
  configs.splice(toIndex, 0, moved);

  applyConfigOrder();
  setStatus(`Reordered panels: ${moved.title} is now position ${toIndex + 1}.`);
}

function applyVisiblePanelState() {
  const count = activePanelCount === null ? 4 : activePanelCount;

  configs.forEach((cfg, i) => {
    const cell = getCellByConfig(cfg);
    if (!cell) return;
    cell.classList.toggle("panel-hidden", i >= count);
  });

  if (activePanelCount === null) {
    videoWall.removeAttribute("data-panel-count");
  } else {
    videoWall.setAttribute("data-panel-count", String(activePanelCount));
  }

  syncLayoutAvailability();
  updatePanelOrderUI();
}

function setActivePanelCount(n) {
  if (n < 1 || n > 4) return;

  if (n === 4) {
    activePanelCount = null;
    applyVisiblePanelState();
    showActionIcon("◫");
    setStatus("All panels visible.");
    return;
  }

  if (activePanelCount === n) {
    activePanelCount = null;
    applyVisiblePanelState();
    showActionIcon("◫");
    setStatus("All panels visible.");
    return;
  }

  activePanelCount = n;
  applyVisiblePanelState();
  showActionIcon(String(n));
  setStatus(`Showing first ${n} panel${n > 1 ? "s" : ""} in the current order.`);
}

function isBrowserLikeFullscreen() {
  const threshold = 4;

  const widthFits =
    Math.abs(window.innerWidth - screen.availWidth) <= threshold ||
    Math.abs(window.innerWidth - screen.width) <= threshold;

  const heightFits =
    Math.abs(window.innerHeight - screen.availHeight) <= threshold ||
    Math.abs(window.innerHeight - screen.height) <= threshold;

  return widthFits && heightFits;
}

function isAnyFullscreenActive() {
  return !!document.fullscreenElement || isBrowserLikeFullscreen();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* buttons */
/* ────────────────────────────────────────────────────────────────────────── */

function updateGlobalButtons() {
  const muted = areAllMuted();
  const paused = areAllPaused();
  const apiFullscreen = !!document.fullscreenElement;
  const browserFullscreen = isBrowserLikeFullscreen();
  const fullscreenActive = apiFullscreen || browserFullscreen;

  toggleMuteAllBtn.textContent = muted ? "Unmute All" : "Mute All";
  togglePauseAllBtn.textContent = paused ? "Play All" : "Pause All";
  fullscreenBtn.textContent = apiFullscreen
    ? "Exit Fullscreen"
    : browserFullscreen
      ? "F11 Fullscreen Active"
      : "Fullscreen";

  quickPauseBtn.textContent = paused ? "▶" : "⏸";
  quickMuteBtn.textContent = muted ? "🔇" : "🔊";
  quickFullscreenBtn.textContent = fullscreenActive ? "🡼" : "⛶";

  if (exitAppBtn) exitAppBtn.hidden = !appInfo.desktopMode;
  if (quickExitBtn) quickExitBtn.hidden = !appInfo.desktopMode;
  quickLayoutBtn.textContent = LAYOUT_LABELS[currentLayoutMode] || currentLayoutMode;

  syncLayoutAvailability();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* quick bar */
/* ────────────────────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────────────────── */
/* playback speed */
/* ────────────────────────────────────────────────────────────────────────── */

function setGlobalSpeed(rate) {
  configs.forEach((cfg) => {
    cfg.playbackRate = rate;
    const video = getVideoByConfig(cfg);
    const audio = getAudioByConfig(cfg);
    video.playbackRate = rate;
    audio.playbackRate = rate;
    if (cfg.ui) {
      cfg.ui.speedInput.value = rate;
      cfg.ui.outSpeed.textContent = `${rate}×`;
    }
    updateLabel(cfg, video);
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* UI creation */
/* ────────────────────────────────────────────────────────────────────────── */

function createLayoutUI() {
  const wrap = document.createElement("div");
  wrap.className = "video-controls";
  layoutUiWrap = wrap;

  wrap.innerHTML = `
    <h3>Viewport</h3>

    <div class="row">
      <label>Wall Title</label>
      <input type="text" value="${currentConfigName}" data-role="configTitle">
    </div>

    <div class="source-row">
      <label>Layout</label>
      <select data-role="layoutMode">
        <option value="4x1">4×1 — 4 videos in a row</option>
        <option value="2x2">2×2 grid</option>
        <option value="2x1-left">Left: 2 above each other · right: 2 next to each other</option>
        <option value="2x1-right">Left: 2 next to each other · right: 2 above each other</option>
      </select>
      <button type="button" data-action="toggleLayout">Next</button>
    </div>

    <div class="source-status" data-role="layoutDesc"></div>

    <div class="row">
      <label>Panels</label>
      <div data-role="panelOrderBar"></div>
    </div>

    <div class="source-status" data-role="panelHint">
      Click icon 1–4 to show first N panels. Drag icons horizontally to reorder presentation and menu.
    </div>

    <div class="row">
      <label>Gap</label>
      <input type="range" min="0" max="32" step="1" value="0" data-role="gridGap">
      <output data-out="gridGap">0px</output>
    </div>

    <div class="row">
      <label>Autoplay</label>
      <input type="checkbox" data-role="autoplay" style="width: 20px">
    </div>

    <div class="row">
      <label>Global Speed</label>
      <input type="range" min="0.25" max="4" step="0.05" value="1" data-role="globalSpeed">
      <output data-out="globalSpeed">1×</output>
    </div>

    <div class="speed-presets">
      ${SPEED_PRESETS.map(s => `<button type="button" class="speed-preset-btn" data-speed="${s}">${s}×</button>`).join("")}
    </div>
  `;

  layoutSelect = wrap.querySelector('[data-role="layoutMode"]');
  layoutDescStatus = wrap.querySelector('[data-role="layoutDesc"]');
  layoutNextBtn = wrap.querySelector('[data-action="toggleLayout"]');
  panelOrderBar = wrap.querySelector('[data-role="panelOrderBar"]');
  const autoplayInput = wrap.querySelector('[data-role="autoplay"]');
  const configTitleInput = wrap.querySelector('[data-role="configTitle"]');

  configTitleInput.addEventListener("input", () => {
    setDocumentTitle(configTitleInput.value);
  });

  configTitleInput.addEventListener("change", () => {
    setStatus(`Config title set to: ${currentConfigName}`);
  });

  layoutSelect.value = currentLayoutMode;
  autoplayInput.checked = autoplayEnabled;

  layoutSelect.addEventListener("change", () => {
    if (activePanelCount !== null && activePanelCount < 4) {
      layoutSelect.value = currentLayoutMode;
      setStatus("Layout change is disabled while fewer than 4 panels are visible.");
      return;
    }
    applyLayoutMode(layoutSelect.value);
    setStatus(`Layout: ${LAYOUT_DESCRIPTIONS[currentLayoutMode] || currentLayoutMode}`);
  });

  autoplayInput.addEventListener("change", () => {
    autoplayEnabled = autoplayInput.checked;

    if (!autoplayEnabled) {
      configs.forEach((cfg) => {
        const video = getVideoByConfig(cfg);
        const audio = getAudioByConfig(cfg);
        video.pause();
        audio.pause();
        cfg.ui?.refreshPlayPauseButton();
      });
    }

    setStatus(`Autoplay ${autoplayEnabled ? "enabled" : "disabled"}.`);
    updateGlobalButtons();
  });

  layoutNextBtn.addEventListener("click", toggleLayoutMode);

  const gridGapInput = wrap.querySelector('[data-role="gridGap"]');
  const outGridGap = wrap.querySelector('[data-out="gridGap"]');
  gridGapInput.addEventListener("input", () => {
    const px = Number(gridGapInput.value);
    outGridGap.textContent = `${px}px`;
    applyGridGap(px);
  });

  const globalSpeedInput = wrap.querySelector('[data-role="globalSpeed"]');
  const outGlobalSpeed = wrap.querySelector('[data-out="globalSpeed"]');

  globalSpeedInput.addEventListener("input", () => {
    const rate = Number(globalSpeedInput.value);
    outGlobalSpeed.textContent = `${rate}×`;
    setGlobalSpeed(rate);
  });

  wrap.querySelectorAll(".speed-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rate = Number(btn.dataset.speed);
      globalSpeedInput.value = rate;
      outGlobalSpeed.textContent = `${rate}×`;
      setGlobalSpeed(rate);
    });
  });

  panelOrderBar.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  });

  panelOrderBar.addEventListener("drop", (e) => {
    e.preventDefault();

    const draggedId = reorderDragId || (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");
    if (!draggedId) return;

    const fromIndex = configs.findIndex((cfg) => cfg.id === draggedId);
    if (fromIndex === -1) return;

    let toIndex = getReorderDropIndex(e.clientX);
    if (toIndex > fromIndex) toIndex -= 1;

    reorderConfigs(fromIndex, toIndex);
  });

  controls.appendChild(wrap);
  updatePanelOrderUI();
  syncLayoutAvailability();
}

function startFadeAnimationLoop(cfg, video) {
  stopFadeAnimationLoop(cfg);

  const tick = () => {
    if (!cfg._fadeLoopActive) return;

    const segment = getPlaybackSegment(cfg, video);
    const fadeOut = Math.max(0, Number(cfg.fadeOut || 0));
    const hasManualLoopFade =
      cfg.fadeMode !== "none" &&
      segment.isLoop &&
      Number.isFinite(segment.end) &&
      fadeOut > 0;

    if (
      hasManualLoopFade &&
      !cfg._loopTransitionRunning &&
      !cfg._loopTriggeredForCycle &&
      video.currentTime >= segment.end - fadeOut &&
      video.currentTime < segment.end
    ) {
      cfg._loopTriggeredForCycle = true;
      startManualLoopTransition(cfg, video);
    }

    if (cfg._fadeTransition) {
      advanceFadeTransition(cfg);
    }

    updateFadeOverlay(cfg, video);

    if (!video.paused && !video.ended) {
      cfg._fadeRaf = requestAnimationFrame(tick);
    } else {
      cfg._fadeRaf = null;
    }
  };

  cfg._fadeLoopActive = true;
  cfg._fadeRaf = requestAnimationFrame(tick);
}

function stopFadeAnimationLoop(cfg) {
  cfg._fadeLoopActive = false;
  if (cfg._fadeRaf) {
    cancelAnimationFrame(cfg._fadeRaf);
    cfg._fadeRaf = null;
  }
}

function createControlUI(cfg) {
  const video = getVideoByConfig(cfg);
  const audio = getAudioByConfig(cfg);

  cfg._audioMuted = false;
  cfg._fadeLoopActive = false;
  cfg._fadeRaf = null;
  cfg._fadeTransition = null;
  cfg._loopTransitionRunning = false;
  cfg._loopWaitForSeek = false;
  cfg._loopResumeFadeInAfterPlay = false;
  cfg._loopTriggeredForCycle = false;
  cfg._pausedAtTs = 0;

  const wrap = document.createElement("div");
  wrap.className = "video-controls";

  wrap.innerHTML = `
    <h3 data-role="titleHeading">${cfg.title}</h3>

    <div class="row row-title">
      <label>Title</label>
      <input type="text" value="${cfg.title}" data-role="titleInput">
      <div class="icon-button-wrap">
        <button type="button" class="icon-button" data-action="toggleMute" title="Mute / Unmute" aria-label="Mute / Unmute">🔊</button>
        <button type="button" class="icon-button" data-action="toggleFilters" title="Filters" aria-label="Filters" aria-expanded="false">🎨</button>
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

    <div class="row">
      <label>Speed</label>
      <input type="range" min="0.25" max="4" step="0.05" value="${cfg.playbackRate}" data-role="speed">
      <output data-out="speed">${cfg.playbackRate}×</output>
    </div>

    <div class="speed-presets">
      ${SPEED_PRESETS.map(s => `<button type="button" class="speed-preset-btn" data-speed="${s}">${s}×</button>`).join("")}
    </div>

    <div class="row">
      <label>Audio Offset</label>
      <input type="number" min="-30" max="30" step="0.01" value="${(cfg.audioOffset ?? 0).toFixed(2)}" data-role="audioOffset">
      <output data-out="audioOffset">${(cfg.audioOffset ?? 0).toFixed(2)}s</output>
    </div>

    <div class="loop-row">
      <div class="loop-field">
        <label>Loop Start</label>
        <input type="text" inputmode="decimal" value="${cfg.loopStart}" data-role="loopStart">
        <output data-out="loopStart">${formatTime(cfg.loopStart)}</output>
      </div>
      <div class="loop-field">
        <label>Loop End</label>
        <input type="text" inputmode="decimal" value="${Number.isFinite(cfg.loopEnd) ? cfg.loopEnd : ""}" data-role="loopEnd" placeholder="∞">
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

    <div class="row" style="margin-top: 15px !important">
      <label>Fade</label>
      <select data-role="fadeMode">
        <option value="none">Off</option>
        <option value="black">To Black</option>
        <option value="white">To White</option>
      </select>
    </div>

    <div class="fade-row">
      <div class="fade-field">
        <label>Fade In</label>
        <input type="number" min="0" step="0.01" value="${cfg.fadeIn.toFixed(2)}" data-role="fadeIn">
        <output data-out="fadeIn">${cfg.fadeIn.toFixed(2)}s</output>
      </div>

      <div class="fade-field">
        <label>Fade Out</label>
        <input type="number" min="0" step="0.01" value="${cfg.fadeOut.toFixed(2)}" data-role="fadeOut">
        <output data-out="fadeOut">${cfg.fadeOut.toFixed(2)}s</output>
      </div>
    </div>

    <div class="source-status" data-role="fadeStatus">Fade bounds become exact once metadata is loaded.</div>

    <div class="filter-panel hidden" data-role="filterPanel">
      <div class="filter-panel-header">
        <span>Filters</span>
        <button type="button" class="filter-reset-btn" data-action="resetFilters">Reset</button>
      </div>
      <div class="row">
        <label>Brightness</label>
        <input type="range" min="0" max="200" step="1" value="${cfg.brightness}" data-role="brightness">
        <output data-out="brightness">${cfg.brightness}%</output>
      </div>
      <div class="row">
        <label>Contrast</label>
        <input type="range" min="0" max="200" step="1" value="${cfg.contrast}" data-role="contrast">
        <output data-out="contrast">${cfg.contrast}%</output>
      </div>
      <div class="row">
        <label>Saturation</label>
        <input type="range" min="0" max="200" step="1" value="${cfg.saturation}" data-role="saturation">
        <output data-out="saturation">${cfg.saturation}%</output>
      </div>
      <div class="row">
        <label>Grayscale</label>
        <input type="range" min="0" max="100" step="1" value="${cfg.grayscale}" data-role="grayscale">
        <output data-out="grayscale">${cfg.grayscale}%</output>
      </div>
    </div>
  `;

  const titleInput = wrap.querySelector('[data-role="titleInput"]');
  const titleHeading = wrap.querySelector('[data-role="titleHeading"]');
  const fileInput = wrap.querySelector('[data-role="file"]');
  const urlInput = wrap.querySelector('[data-role="url"]');
  const sourceStatus = wrap.querySelector('[data-role="sourceStatus"]');
  const volumeInput = wrap.querySelector('[data-role="volume"]');
  const speedInput = wrap.querySelector('[data-role="speed"]');
  const audioOffsetInput = wrap.querySelector('[data-role="audioOffset"]');
  const loopStartInput = wrap.querySelector('[data-role="loopStart"]');
  const loopEndInput = wrap.querySelector('[data-role="loopEnd"]');
  const seekInput = wrap.querySelector('[data-role="seek"]');
  const zoomInput = wrap.querySelector('[data-role="zoom"]');
  const panXInput = wrap.querySelector('[data-role="panX"]');
  const panYInput = wrap.querySelector('[data-role="panY"]');
  const fadeModeInput = wrap.querySelector('[data-role="fadeMode"]');
  const fadeInInput = wrap.querySelector('[data-role="fadeIn"]');
  const fadeOutInput = wrap.querySelector('[data-role="fadeOut"]');
  const fadeStatus = wrap.querySelector('[data-role="fadeStatus"]');

  const outVolume = wrap.querySelector('[data-out="volume"]');
  const outSpeed = wrap.querySelector('[data-out="speed"]');
  const outAudioOffset = wrap.querySelector('[data-out="audioOffset"]');
  const outLoopStart = wrap.querySelector('[data-out="loopStart"]');
  const outLoopEnd = wrap.querySelector('[data-out="loopEnd"]');
  const outCurrentTime = wrap.querySelector('[data-out="currentTime"]');
  const outZoom = wrap.querySelector('[data-out="zoom"]');
  const outPanX = wrap.querySelector('[data-out="panX"]');
  const outPanY = wrap.querySelector('[data-out="panY"]');
  const outFadeIn = wrap.querySelector('[data-out="fadeIn"]');
  const outFadeOut = wrap.querySelector('[data-out="fadeOut"]');

  const togglePlayPauseBtn = wrap.querySelector('[data-action="togglePlayPause"]');
  const toggleMuteBtn = wrap.querySelector('[data-action="toggleMute"]');

  function refreshMuteState() {
    toggleMuteBtn.textContent = cfg._audioMuted ? "🔇" : "🔊";
    toggleMuteBtn.setAttribute("aria-label", cfg._audioMuted ? "Unmute" : "Mute");
    toggleMuteBtn.setAttribute("title", cfg._audioMuted ? "Unmute" : "Mute");
    syncAudioToVideo(cfg, video, false);
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

  function refreshFadeOutputs(changedKey = null) {
    normalizeFadeTimes(cfg, video, changedKey);
  }

  function applyLoopBounds() {
    if (Number.isFinite(cfg.loopEnd) && cfg.loopStart >= cfg.loopEnd) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
      loopEndInput.value = cfg.loopEnd;
      outLoopEnd.textContent = formatTime(cfg.loopEnd);
    }

    outLoopStart.textContent = formatTime(cfg.loopStart);
    outLoopEnd.textContent = formatTime(cfg.loopEnd);
    refreshFadeOutputs();
  }

  titleInput.addEventListener("input", () => {
    cfg.title = titleInput.value.trim() || cfg.defaultTitle;
    titleHeading.textContent = cfg.title;
    updateLabel(cfg, video);
    updatePanelOrderUI();
  });

  wrap.querySelector('[data-action="loadFile"]').addEventListener("click", () => {
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus(`No local file selected for ${cfg.title}.`);
      return;
    }

    playbackUnlocked = true;
    safelyRevokeObjectUrl(cfg);
    const objectUrl = URL.createObjectURL(file);

    setVideoSource(video, cfg, objectUrl, sourceStatus, {
      mode: "file",
      sourceValue: "",
      sourceFileName: file.name
    });

    cfg.objectUrl = objectUrl;
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
    audio.volume = cfg.volume;
    outVolume.textContent = cfg.volume.toFixed(2);
  });

  speedInput.addEventListener("input", () => {
    cfg.playbackRate = Number(speedInput.value);
    video.playbackRate = cfg.playbackRate;
    audio.playbackRate = cfg.playbackRate;
    outSpeed.textContent = `${cfg.playbackRate}×`;
    updateLabel(cfg, video);
  });

  wrap.querySelectorAll(".speed-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rate = Number(btn.dataset.speed);
      cfg.playbackRate = rate;
      video.playbackRate = rate;
      audio.playbackRate = rate;
      speedInput.value = rate;
      outSpeed.textContent = `${rate}×`;
      updateLabel(cfg, video);
    });
  });

  audioOffsetInput.addEventListener("input", () => {
    cfg.audioOffset = Number(parseFloat(audioOffsetInput.value || "0").toFixed(2));
    outAudioOffset.textContent = `${cfg.audioOffset.toFixed(2)}s`;
    syncAudioToVideo(cfg, video, true);
    updateLabel(cfg, video);
  });

  function sanitizeLoopInput(input) {
    input.value = input.value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
  }

  loopStartInput.addEventListener("input", () => sanitizeLoopInput(loopStartInput));
  loopStartInput.addEventListener("change", () => {
    let val = parseFloat(loopStartInput.value);
    if (!isFinite(val) || val < 0) val = 0;
    cfg.loopStart = Number(val.toFixed(2));

    if (Number.isFinite(cfg.loopEnd) && cfg.loopStart >= cfg.loopEnd) {
      cfg.loopStart = Math.max(0, Number((cfg.loopEnd - 0.05).toFixed(2)));
    }

    loopStartInput.value = cfg.loopStart;
    applyLoopBounds();
    syncNativeLoop(video, cfg);
    syncAudioToVideo(cfg, video, true);
    updateFadeOverlay(cfg, video);
  });

  loopEndInput.addEventListener("input", () => sanitizeLoopInput(loopEndInput));
  loopEndInput.addEventListener("change", () => {
    const raw = loopEndInput.value.trim();

    if (raw === "") {
      loopEndInput.value = "";
      cfg.loopEnd = Infinity;
      outLoopEnd.textContent = formatTime(cfg.loopEnd);
      refreshFadeOutputs();
      syncNativeLoop(video, cfg);
      syncAudioToVideo(cfg, video, true);
      updateFadeOverlay(cfg, video);
      return;
    }

    let val = parseFloat(raw);
    if (!isFinite(val) || val < 0) val = 0;
    cfg.loopEnd = Number(val.toFixed(2));

    if (cfg.loopEnd <= cfg.loopStart) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
    }

    loopEndInput.value = cfg.loopEnd;
    applyLoopBounds();
    syncNativeLoop(video, cfg);
    syncAudioToVideo(cfg, video, true);
    updateFadeOverlay(cfg, video);
  });

  seekInput.addEventListener("input", () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = Number(seekInput.value);
    syncAudioToVideo(cfg, video, true);
    refreshCurrentTimeOutput();
    updateFadeOverlay(cfg, video);
  });

  zoomInput.addEventListener("input", () => {
    cfg.zoom = Number(zoomInput.value);
    outZoom.textContent = `${cfg.zoom}%`;
    applyVideoPosition(cfg, video);
  });

  panXInput.addEventListener("input", () => {
    cfg.panX = Number(panXInput.value);
    outPanX.textContent = `${cfg.panX.toFixed(0)}%`;
    applyVideoPosition(cfg, video);
  });

  panYInput.addEventListener("input", () => {
    cfg.panY = Number(panYInput.value);
    outPanY.textContent = `${cfg.panY.toFixed(0)}%`;
    applyVideoPosition(cfg, video);
  });

  fadeModeInput.addEventListener("change", () => {
    cfg.fadeMode = fadeModeInput.value;
    applyFadeAppearance(cfg);
    updateFadeOverlay(cfg, video);
  });

  fadeInInput.addEventListener("input", () => {
    cfg.fadeIn = Number(Math.max(0, parseFloat(fadeInInput.value || "0")).toFixed(2));
    refreshFadeOutputs("fadeIn");
  });

  fadeOutInput.addEventListener("input", () => {
    cfg.fadeOut = Number(Math.max(0, parseFloat(fadeOutInput.value || "0")).toFixed(2));
    refreshFadeOutputs("fadeOut");
  });

  const filterPanel = wrap.querySelector('[data-role="filterPanel"]');
  const brightnessInput = wrap.querySelector('[data-role="brightness"]');
  const contrastInput = wrap.querySelector('[data-role="contrast"]');
  const saturationInput = wrap.querySelector('[data-role="saturation"]');
  const grayscaleInput = wrap.querySelector('[data-role="grayscale"]');
  const outBrightness = wrap.querySelector('[data-out="brightness"]');
  const outContrast = wrap.querySelector('[data-out="contrast"]');
  const outSaturation = wrap.querySelector('[data-out="saturation"]');
  const outGrayscale = wrap.querySelector('[data-out="grayscale"]');
  const toggleFiltersBtn = wrap.querySelector('[data-action="toggleFilters"]');

  function refreshFilterOutputs() {
    brightnessInput.value = cfg.brightness;
    contrastInput.value   = cfg.contrast;
    saturationInput.value = cfg.saturation;
    grayscaleInput.value  = cfg.grayscale;
    outBrightness.textContent = `${cfg.brightness}%`;
    outContrast.textContent   = `${cfg.contrast}%`;
    outSaturation.textContent = `${cfg.saturation}%`;
    outGrayscale.textContent  = `${cfg.grayscale}%`;
  }

  toggleFiltersBtn.addEventListener("click", () => {
    const isHidden = filterPanel.classList.toggle("hidden");
    toggleFiltersBtn.setAttribute("aria-expanded", String(!isHidden));
    toggleFiltersBtn.classList.toggle("active", !isHidden);
  });

  brightnessInput.addEventListener("input", () => {
    cfg.brightness = Number(brightnessInput.value);
    outBrightness.textContent = `${cfg.brightness}%`;
    applyVideoFilter(cfg, video);
  });

  contrastInput.addEventListener("input", () => {
    cfg.contrast = Number(contrastInput.value);
    outContrast.textContent = `${cfg.contrast}%`;
    applyVideoFilter(cfg, video);
  });

  saturationInput.addEventListener("input", () => {
    cfg.saturation = Number(saturationInput.value);
    outSaturation.textContent = `${cfg.saturation}%`;
    applyVideoFilter(cfg, video);
  });

  grayscaleInput.addEventListener("input", () => {
    cfg.grayscale = Number(grayscaleInput.value);
    outGrayscale.textContent = `${cfg.grayscale}%`;
    applyVideoFilter(cfg, video);
  });

  wrap.querySelector('[data-action="resetFilters"]').addEventListener("click", () => {
    resetVideoFilter(cfg, video);
    setStatus(`${cfg.title}: filters reset.`);
  });

  togglePlayPauseBtn.addEventListener("click", () => {
    if (video.paused) {
      syncAudioToVideo(cfg, video, true);
      video.play().catch(() => {});
      audio.play().catch(() => {});
    } else {
      video.pause();
      audio.pause();
    }
  });

  wrap.querySelector('[data-action="jumpStart"]').addEventListener("click", () => {
    const segment = getPlaybackSegment(cfg, video);
    video.currentTime = segment.isLoop ? cfg.loopStart : 0;
    syncAudioToVideo(cfg, video, true);
    refreshCurrentTimeOutput();
    updateFadeOverlay(cfg, video);
  });

  wrap.querySelector('[data-action="setStartHere"]').addEventListener("click", () => {
    cfg.loopStart = Number(video.currentTime.toFixed(2));
    if (Number.isFinite(cfg.loopEnd) && cfg.loopStart >= cfg.loopEnd) {
      cfg.loopEnd = Number((cfg.loopStart + 0.05).toFixed(2));
      loopEndInput.value = cfg.loopEnd;
    }
    loopStartInput.value = cfg.loopStart;
    applyLoopBounds();
    syncNativeLoop(video, cfg);
    syncAudioToVideo(cfg, video, true);
    updateFadeOverlay(cfg, video);
  });

  wrap.querySelector('[data-action="setEndHere"]').addEventListener("click", () => {
    cfg.loopEnd = Number(video.currentTime.toFixed(2));
    if (cfg.loopEnd <= cfg.loopStart) {
      cfg.loopStart = Math.max(0, Number((cfg.loopEnd - 0.05).toFixed(2)));
      loopStartInput.value = cfg.loopStart;
    }
    loopEndInput.value = cfg.loopEnd;
    applyLoopBounds();
    syncNativeLoop(video, cfg);
    syncAudioToVideo(cfg, video, true);
    updateFadeOverlay(cfg, video);
  });

  wrap.querySelector('[data-action="resetPosition"]').addEventListener("click", () => {
    resetVideoPosition(cfg, video);
    refreshPositionOutputs();
    setStatus(`${cfg.title}: position reset.`);
  });

  toggleMuteBtn.addEventListener("click", () => {
    cfg._audioMuted = !cfg._audioMuted;
    audio.muted = cfg._audioMuted;
    refreshMuteState();
    showActionIcon(cfg._audioMuted ? "🔇" : "🔊");
    setStatus(`${cfg.title} ${cfg._audioMuted ? "muted" : "unmuted"}.`);
  });

  video.addEventListener("loadedmetadata", () => {
    seekInput.max = video.duration;

    if (Number.isFinite(cfg.loopEnd) && cfg.loopEnd > video.duration) {
      cfg.loopEnd = Number(video.duration.toFixed(2));
      loopEndInput.value = cfg.loopEnd;
    }

    syncNativeLoop(video, cfg);

    video.volume = 0;
    video.muted = true;
    video.playbackRate = cfg.playbackRate;
    video.currentTime = clamp(
      Number.isFinite(cfg.loopStart) ? cfg.loopStart : 0,
      0,
      video.duration || (Number.isFinite(cfg.loopStart) ? cfg.loopStart : 0)
    );

    audio.volume = cfg.volume;
    audio.muted = cfg._audioMuted;
    audio.playbackRate = cfg.playbackRate;
    syncAudioToVideo(cfg, video, true);

    resetFadeRuntime(cfg);
    applyLoopBounds();
    refreshPlayPauseButton();
    refreshCurrentTimeOutput();
    refreshFadeOutputs();
    updateFadeOverlay(cfg, video);
  });

  video.addEventListener("timeupdate", () => {
    syncAudioToVideo(cfg, video, false);

    if (Number.isFinite(video.duration)) {
      seekInput.max = video.duration;
      seekInput.value = video.currentTime;
    }

    refreshCurrentTimeOutput();

    const segment = getPlaybackSegment(cfg, video);
    const fadeOut = Math.max(0, Number(cfg.fadeOut || 0));
    const hasManualLoopFade =
      cfg.fadeMode !== "none" &&
      segment.isLoop &&
      Number.isFinite(segment.end) &&
      fadeOut > 0;

    if (
      hasManualLoopFade &&
      !cfg._loopTransitionRunning &&
      !cfg._loopTriggeredForCycle &&
      video.currentTime >= segment.end - fadeOut &&
      video.currentTime < segment.end
    ) {
      cfg._loopTriggeredForCycle = true;
      startManualLoopTransition(cfg, video);
    }

    if (
      Number.isFinite(segment.end) &&
      !cfg._loopTransitionRunning &&
      video.currentTime >= segment.end
    ) {
      restartLoopCycle(cfg, video);
      return;
    }

    if (!cfg._fadeTransition) {
      updateFadeOverlay(cfg, video);
    }
  });

  video.addEventListener("ended", () => {
    const segment = getPlaybackSegment(cfg, video);

    stopFadeAnimationLoop(cfg);
    cfg._loopTriggeredForCycle = false;

    if (Number.isFinite(segment.end) && segment.length > 0) {
      restartLoopCycle(cfg, video);
      return;
    }

    audio.pause();
    updateFadeOverlay(cfg, video);
  });

  video.addEventListener("seeked", () => {
    hardSyncAudioToVideo(cfg, video);

    if (cfg._loopWaitForSeek) {
      cfg._loopWaitForSeek = false;

      if (video.paused) {
        cfg._loopResumeFadeInAfterPlay = true;
        setFadeOverlayOpacity(cfg, 1);
        return;
      }

      continueFadeInAfterSeek(cfg, video);
      audio.play().catch(() => {});
      return;
    }

    if (!video.paused) {
      audio.play().catch(() => {});
    }

    updateFadeOverlay(cfg, video);
  });

  video.addEventListener("play", () => {
    refreshPlayPauseButton();

    if (cfg._fadeTransition && cfg._pausedAtTs) {
      const pausedDelta = performance.now() - cfg._pausedAtTs;
      cfg._fadeTransition.startedAt += pausedDelta;
      cfg._pausedAtTs = 0;
    }

    hardSyncAudioToVideo(cfg, video);
    audio.play().catch(() => {});

    if (cfg._loopResumeFadeInAfterPlay) {
      cfg._loopResumeFadeInAfterPlay = false;
      continueFadeInAfterSeek(cfg, video);
    } else {
      updateFadeOverlay(cfg, video);
    }

    startFadeAnimationLoop(cfg, video);
  });

  video.addEventListener("pause", () => {
    refreshPlayPauseButton();
    audio.pause();

    if (cfg._fadeTransition) {
      cfg._pausedAtTs = performance.now();
      setFadeOverlayOpacity(cfg, getCurrentTransitionOpacity(cfg));
    } else {
      updateFadeOverlay(cfg, video);
    }

    stopFadeAnimationLoop(cfg);
  });

  audio.addEventListener("volumechange", refreshMuteState);

  audio.addEventListener("ended", () => {
    if (video.paused) return;

    hardSyncAudioToVideo(cfg, video);
    audio.play().catch(() => {});
  });

  video.addEventListener("ratechange", () => {
    if (Math.abs(video.playbackRate - cfg.playbackRate) > 0.01) {
      video.playbackRate = cfg.playbackRate;
    }
    if (Math.abs(audio.playbackRate - cfg.playbackRate) > 0.01) {
      audio.playbackRate = cfg.playbackRate;
    }
  });

  cfg.ui = {
    wrap,
    titleInput,
    titleHeading,
    urlInput,
    sourceStatus,
    loopStartInput,
    loopEndInput,
    volumeInput,
    speedInput,
    audioOffsetInput,
    zoomInput,
    panXInput,
    panYInput,
    fadeModeInput,
    fadeInInput,
    fadeOutInput,
    fadeStatus,
    outSpeed,
    outAudioOffset,
    outLoopStart,
    outLoopEnd,
    outVolume,
    outCurrentTime,
    outZoom,
    outPanX,
    outPanY,
    outFadeIn,
    outFadeOut,
    refreshMuteState,
    refreshPlayPauseButton,
    refreshCurrentTimeOutput,
    refreshPositionOutputs,
    refreshFilterOutputs,
    refreshFadeOutputs
  };

  controls.appendChild(wrap);

  video.volume = 0;
  video.muted = true;
  video.playbackRate = cfg.playbackRate;

  audio.volume = cfg.volume;
  audio.playbackRate = cfg.playbackRate;
  audio.muted = cfg._audioMuted;

  applyVideoPosition(cfg, video);
  applyVideoFilter(cfg, video);
  applyFadeAppearance(cfg);

  refreshMuteState();
  refreshPlayPauseButton();
  refreshCurrentTimeOutput();
  refreshFadeOutputs();
  updateLabel(cfg, video);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* config serialization */
/* ────────────────────────────────────────────────────────────────────────── */

function getSerializableConfig() {
  return {
    version: 7,
    name: currentConfigName,
    layoutMode: currentLayoutMode,
    gridGap: currentGridGap,
    panelOrder: configs.map((cfg) => cfg.id),
    activePanelCount,
    exportedAt: new Date().toISOString(),
    autoplay: autoplayEnabled,
    videos: configs.map((cfg) => ({
      id: cfg.id,
      title: cfg.title,
      sourceMode: cfg.sourceMode,
      sourceValue: cfg.sourceValue,
      sourceFileName: cfg.sourceFileName,
      loopStart: cfg.loopStart,
      loopEnd: cfg.loopEnd,
      volume: cfg.volume,
      audioOffset: cfg.audioOffset,
      playbackRate: cfg.playbackRate,
      muted: !!cfg._audioMuted,
      panX: cfg.panX,
      panY: cfg.panY,
      zoom: cfg.zoom,
      brightness: cfg.brightness,
      contrast: cfg.contrast,
      saturation: cfg.saturation,
      grayscale: cfg.grayscale,
      fadeMode: cfg.fadeMode,
      fadeIn: cfg.fadeIn,
      fadeOut: cfg.fadeOut
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
  const configTitleInput = document.querySelector('[data-role="configTitle"]');
  if (configTitleInput) configTitleInput.value = currentConfigName;
  applyLayoutMode(parsed.layoutMode || "4x1");
  autoplayEnabled = parsed.autoplay !== undefined ? Boolean(parsed.autoplay) : true;
  const autoplayInput = document.querySelector('[data-role="autoplay"]');
  if (autoplayInput) autoplayInput.checked = autoplayEnabled;

  const restoredGap = Number(parsed.gridGap ?? 0);
  applyGridGap(restoredGap);

  const gapSlider = document.querySelector('[data-role="gridGap"]');
  const gapOut = document.querySelector('[data-out="gridGap"]');
  if (gapSlider) gapSlider.value = restoredGap;
  if (gapOut) gapOut.textContent = `${restoredGap}px`;

  parsed.videos.forEach((savedCfg) => {
    const cfg = configs.find((item) => item.id === savedCfg.id);
    if (!cfg) return;

    const video = getVideoByConfig(cfg);
    const audio = getAudioByConfig(cfg);
    resetFadeRuntime(cfg);

    cfg.title = savedCfg.title || cfg.defaultTitle;
    cfg.loopStart = Number(savedCfg.loopStart ?? cfg.loopStart);
    cfg.loopEnd = savedCfg.loopEnd === null || savedCfg.loopEnd === undefined || !Number.isFinite(Number(savedCfg.loopEnd))
      ? Infinity
      : Number(savedCfg.loopEnd);
    cfg.volume = Number(savedCfg.volume ?? cfg.volume);
    cfg.audioOffset = Number(savedCfg.audioOffset ?? 0);
    cfg.playbackRate = Number(savedCfg.playbackRate ?? 1.0);
    cfg.sourceMode = savedCfg.sourceMode || "url";
    cfg.sourceValue = savedCfg.sourceValue || "";
    cfg.sourceFileName = savedCfg.sourceFileName || "";
    cfg.panX = Number(savedCfg.panX ?? 50);
    cfg.panY = Number(savedCfg.panY ?? 50);
    cfg.zoom = Number(savedCfg.zoom ?? 100);
    cfg.brightness = Number(savedCfg.brightness ?? 100);
    cfg.contrast   = Number(savedCfg.contrast   ?? 100);
    cfg.saturation = Number(savedCfg.saturation ?? 100);
    cfg.grayscale  = Number(savedCfg.grayscale  ?? 0);
    cfg.fadeMode   = savedCfg.fadeMode || "none";
    cfg.fadeIn     = Number(savedCfg.fadeIn ?? 0);
    cfg.fadeOut    = Number(savedCfg.fadeOut ?? 0);
    cfg._audioMuted = Boolean(savedCfg.muted);

    cfg.ui.titleInput.value = cfg.title;
    cfg.ui.titleHeading.textContent = cfg.title;
    cfg.ui.loopStartInput.value = cfg.loopStart;
    cfg.ui.loopEndInput.value = Number.isFinite(cfg.loopEnd) ? cfg.loopEnd : "";
    cfg.ui.volumeInput.value = cfg.volume;
    cfg.ui.speedInput.value = cfg.playbackRate;
    cfg.ui.audioOffsetInput.value = cfg.audioOffset.toFixed(2);
    cfg.ui.outAudioOffset.textContent = `${cfg.audioOffset.toFixed(2)}s`;
    cfg.ui.outSpeed.textContent = `${cfg.playbackRate}×`;
    cfg.ui.outLoopStart.textContent = formatTime(cfg.loopStart);
    cfg.ui.outLoopEnd.textContent = formatTime(cfg.loopEnd);
    cfg.ui.outVolume.textContent = cfg.volume.toFixed(2);

    video.volume = 0;
    video.muted = true;
    video.playbackRate = cfg.playbackRate;

    audio.volume = cfg.volume;
    audio.playbackRate = cfg.playbackRate;
    audio.muted = cfg._audioMuted;

    syncNativeLoop(video, cfg);

    applyVideoPosition(cfg, video);
    applyVideoFilter(cfg, video);
    applyFadeAppearance(cfg);

    cfg.ui.refreshPositionOutputs();
    cfg.ui.refreshFilterOutputs();
    cfg.ui.refreshFadeOutputs();

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
      audio.pause();
      video.pause();
      video.removeAttribute("src");
      audio.removeAttribute("src");
      video.load();
      audio.load();
    }

    cfg.ui.refreshMuteState();
    cfg.ui.refreshPlayPauseButton();
    cfg.ui.refreshCurrentTimeOutput();
    updateFadeOverlay(cfg, video);
    updateLabel(cfg, video);
  });

  if (Array.isArray(parsed.panelOrder) && parsed.panelOrder.length === configs.length) {
    const ordered = [];
    parsed.panelOrder.forEach((id) => {
      const found = configs.find((cfg) => cfg.id === id);
      if (found) ordered.push(found);
    });
    if (ordered.length === configs.length) {
      configs.splice(0, configs.length, ...ordered);
      applyConfigOrder();
    }
  } else {
    updatePanelOrderUI();
  }

  const loadedPanelCount =
    parsed.activePanelCount === null || parsed.activePanelCount === undefined
      ? null
      : clamp(Number(parsed.activePanelCount), 1, 4);

  activePanelCount = loadedPanelCount === 4 ? null : loadedPanelCount;

  applyVisiblePanelState();
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


async function loadStartupConfigFromApp() {
  try {
    const response = await fetch("/api/startup-config", { cache: "no-store" });
    const payload = await response.json();

    if (!payload?.ok || !payload.config) {
      if (payload?.error) {
        const detail = payload.details ? ` (${payload.details})` : "";
        setStatus(`Startup config unavailable: ${payload.error}${detail}`);
      }
      return;
    }

    applyLoadedConfig(payload.config);

    const sourceLabel = payload.source || payload.config?.name || "startup config";
    const warning = payload.warning ? ` Fallback used: ${payload.warning}` : "";
    setStatus(`Startup config loaded: ${sourceLabel}.${warning}`);
  } catch (error) {
    setStatus(`Startup config unavailable: ${error.message}`);
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* playback */
/* ────────────────────────────────────────────────────────────────────────── */

async function unlockPlayback() {
  if (playbackUnlocked) return;
  playbackUnlocked = true;

  for (const cfg of configs) {
    const video = getVideoByConfig(cfg);
    const audio = getAudioByConfig(cfg);

    video.volume = 0;
    video.muted = true;
    video.playbackRate = cfg.playbackRate;

    audio.volume = cfg.volume;
    audio.playbackRate = cfg.playbackRate;
    audio.muted = !!cfg._audioMuted;

    syncNativeLoop(video, cfg);

    if (autoplayEnabled && video.currentSrc) {
      try {
        hardSyncAudioToVideo(cfg, video);
        await video.play();
        await audio.play();
      } catch {}
    }
  }

  updateGlobalButtons();
}

function toggleMuteAll() {
  const shouldMute = configs.some((cfg) => !cfg._audioMuted);
  configs.forEach((cfg) => {
    const audio = getAudioByConfig(cfg);
    cfg._audioMuted = shouldMute;
    audio.muted = shouldMute;
    cfg.ui.refreshMuteState();
  });
  updateGlobalButtons();
  showActionIcon(shouldMute ? "🔇" : "🔊");
  setStatus(shouldMute ? "All videos muted." : "All videos unmuted.");
}

function toggleMuteSingle(index) {
  const cfg = configs[index];
  if (!cfg) return;
  const audio = getAudioByConfig(cfg);
  cfg._audioMuted = !cfg._audioMuted;
  audio.muted = cfg._audioMuted;
  cfg.ui.refreshMuteState();
  updateGlobalButtons();
  showActionIcon(cfg._audioMuted ? "🔇" : "🔊");
  setStatus(`${cfg.title} ${cfg._audioMuted ? "muted" : "unmuted"}.`);
}

function togglePauseAll() {
  const shouldPause = configs.some((cfg) => !getVideoByConfig(cfg).paused);

  configs.forEach((cfg) => {
    const video = getVideoByConfig(cfg);
    const audio = getAudioByConfig(cfg);

    if (shouldPause) {
      video.pause();
      audio.pause();
    } else {
      hardSyncAudioToVideo(cfg, video);
      video.play().catch(() => {});
      audio.play().catch(() => {});
    }

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
  const audio = getAudioByConfig(cfg);

  if (video.paused) {
    hardSyncAudioToVideo(cfg, video);
    video.play().catch(() => {});
    audio.play().catch(() => {});
  } else {
    video.pause();
    audio.pause();
  }

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
    const audio = getAudioByConfig(cfg);

    if (autoplayEnabled) {
      hardSyncAudioToVideo(cfg, video);
      video.play().catch(() => {});
      audio.play().catch(() => {});
    } else {
      video.pause();
      audio.pause();
    }

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

  cells.forEach((cell) => cell.classList.remove("solo-visible"));
  const targetCell = getCellByConfig(cfg);
  if (targetCell) targetCell.classList.add("solo-visible");

  configs.forEach((item, i) => {
    const video = getVideoByConfig(item);
    const audio = getAudioByConfig(item);

    if (i === index) {
      hardSyncAudioToVideo(item, video);
      video.play().catch(() => {});
      audio.play().catch(() => {});
    } else {
      video.pause();
      audio.pause();
    }

    item.ui.refreshPlayPauseButton();
  });

  updateGlobalButtons();
  showActionIcon(String(index + 1));
  setStatus(`${cfg.title} solo view enabled.`);
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (isBrowserLikeFullscreen()) {
      setStatus("Browser fullscreen (F11) is active. Exit it with F11.");
      return;
    }

    await document.documentElement.requestFullscreen();
  } catch (error) {
    setStatus(`Fullscreen failed: ${error.message}`);
  }
}

function handleFullscreenChange() {
  const isFullscreen = isAnyFullscreenActive();

  if (isFullscreen !== lastFullscreenState) {
    showActionIcon(isFullscreen ? "⛶" : "🡼");
    setStatus(isFullscreen ? "Entered fullscreen." : "Exited fullscreen.");
    lastFullscreenState = isFullscreen;
  }

  updateGlobalButtons();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* init */
/* ────────────────────────────────────────────────────────────────────────── */

(async function initApp() {
await fetchAppInfo();

createLayoutUI();
configs.forEach((cfg) => createControlUI(cfg));

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
exitAppBtn?.addEventListener("click", exitApplication);

quickShowHudBtn.addEventListener("click", () => toggleHud(true));
quickPauseBtn.addEventListener("click", togglePauseAll);
quickMuteBtn.addEventListener("click", toggleMuteAll);
quickLayoutBtn.addEventListener("click", toggleLayoutMode);
quickHelpBtn.addEventListener("click", () => toggleHelp());
quickFullscreenBtn.addEventListener("click", toggleFullscreen);
quickExitBtn?.addEventListener("click", exitApplication);

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

document.addEventListener("pointerdown", (e) => {
  if (e.target.closest("#hud")) return;
  unlockPlayback();
});

document.addEventListener("mousemove", () => {
  if (hud.classList.contains("hidden")) showQuickBar();
});

document.addEventListener("fullscreenchange", handleFullscreenChange);
window.addEventListener("resize", handleFullscreenChange);

document.addEventListener("keydown", async (event) => {
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

  if (!isTyping) await unlockPlayback();

  if (event.code === "Enter") {
    if (!isTyping) {
      event.preventDefault();
      toggleHud();
    }
    return;
  }

  if (isTyping) return;

  if (event.altKey && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(event.code)) {
    event.preventDefault();
    setActivePanelCount(Number(event.code.replace("Digit", "")));
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
    case "KeyQ":
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        await exitApplication();
      }
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
  }
});

applyLayoutMode("4x1");
setHudVisible(true);
updateGlobalButtons();
setDocumentTitle(currentConfigName);
setStatus(introMessage);
applyConfigOrder();
loadStartupConfigFromApp();

function hideCursor() {
  const style = document.getElementById("__cursorHideStyle")
    || Object.assign(document.createElement("style"), { id: "__cursorHideStyle" });

  style.textContent = "* { cursor: none !important; }";
  document.head.appendChild(style);
}

function showCursor() {
  document.getElementById("__cursorHideStyle")?.remove();
}

document.addEventListener("mousemove", () => {
  showCursor();
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(hideCursor, CURSOR_HIDE_DELAY);
});

updateGlobalButtons();

})();
