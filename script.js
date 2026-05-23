const editTabBtn = document.getElementById("editTabBtn");
const exportTabBtn = document.getElementById("exportTabBtn");
const editView = document.getElementById("editView");
const exportView = document.getElementById("exportView");
const editControls = document.getElementById("editControls");
const exportControls = document.getElementById("exportControls");

const uploadInput = document.getElementById("upload");
const uploadBox = document.getElementById("uploadBox");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const videoPreviewCanvas = document.getElementById("videoPreviewCanvas");
const videoPreviewCtx = videoPreviewCanvas.getContext("2d");
const livePhotoPreviewContainer = document.getElementById("livePhotoPreviewContainer");
let videoPreviewRafId = null;
let isLivePhotoMode = false;
let livePhotoPlayer = null;
let livePhotoPhotoUrl = null;
let livePhotoVideoUrl = null;

const fileNameEl = document.getElementById("fileName");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
const zipProgressBar = document.getElementById("zipProgressBar");
const zipProgressFill = document.getElementById("zipProgressFill");

const circleSizeInput = document.getElementById("circleSize");
const circleSizeValue = document.getElementById("circleSizeValue");
const cornerRadiusInput = document.getElementById("cornerRadius");
const cornerRadiusValue = document.getElementById("cornerRadiusValue");

const rotateLeftBtn = document.getElementById("rotateLeft");
const rotateRightBtn = document.getElementById("rotateRight");
const flipHorizontalBtn = document.getElementById("flipHorizontal");
const flipVerticalBtn = document.getElementById("flipVertical");

const downloadBtn = document.getElementById("download");
const downloadZipBtn = document.getElementById("downloadZip");
const formatSelect = document.getElementById("format");
const videoFormatSelect = document.getElementById("videoFormat");
const backgroundControls = document.getElementById("backgroundControls");
const backgroundChips = document.getElementById("backgroundChips");
const customBackgroundInput = document.getElementById("customBackground");
const customColorDot = document.getElementById("customColorDot");
const customColorValue = document.getElementById("customColorValue");
const sizeChips = document.getElementById("sizeChips");

const galleryCard = document.getElementById("galleryCard");
const galleryGrid = document.getElementById("galleryGrid");
const galleryBadge = document.getElementById("galleryBadge");

let image = new Image();
let imageLoaded = false;
let originalFileName = "photo";
let selectedSize = "original";
let selectedBackground = "#ffffff";
let currentImageUrl = null;

let renderScheduled = false;

function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      if (imageLoaded) {
        draw();
        updatePreviewIfVisible();
      }
      renderScheduled = false;
    });
  }
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* VIDEO PLAYER STATE */
let videoPlayer = document.getElementById("videoPlayer");
let isVideoMode = false;
let videoCurrentTime = 0;
let videoDuration = 0;
let isVideoPlaying = false;
let videoMuted = false;
let videoSpeed = 1;
let trimStartTime = 0;
let trimEndTime = 0;
let isDraggingTrimStart = false;
let isDraggingTrimEnd = false;
let isPlayheadDragging = false;
let suppressNextTrimLoop = false;
let videoBlob = null;
let videoFrameCanvas = null;
let videoFrameCtx = null;
let videoCropRadius = 0;
let videoInitialFrameAttempts = 0;

const imageCanvasWrap = document.getElementById("imageCanvasWrap");
const videoPlayerContainer = document.getElementById("videoPlayerContainer");
const playPauseBtn = document.getElementById("playPauseBtn");
const muteBtn = document.getElementById("muteBtn");
const speedSelect = document.getElementById("speedSelect");
const volumeSlider = document.getElementById("volumeSlider");
const videoTimeline = document.getElementById("videoTimeline");
const playhead = document.getElementById("playhead");
const progressBar = document.getElementById("progressBar");
const timeDisplay = document.getElementById("timeDisplay");
const trimStartHandle = document.getElementById("trimStartHandle");
const trimEndHandle = document.getElementById("trimEndHandle");
const activeRange = document.getElementById("activeRange");
const videoCropControls = document.getElementById("videoCropControls");
const videoCropSizeInput = document.getElementById("videoCropSize");
const videoCropSizeValue = document.getElementById("videoCropSizeValue");

let rotation = 0;
let flipX = false;
let flipY = false;
let circle = { x: 0, y: 0, radius: 0 };
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let zipImages = [];
let activeZipIndex = -1;

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  document
    .getElementById("themeLight")
    .classList.toggle("active", t === "light");
  document.getElementById("themeDark").classList.toggle("active", t === "dark");
  document
    .getElementById("themeGreen")
    .classList.toggle("active", t === "green");
  if (isVideoMode) return;
  if (imageLoaded) {
    draw();
    updatePreviewIfVisible();
  } else {
    drawMessage("Upload photo or ZIP");
    drawPreviewPlaceholder();
  }
}

function setActiveTab(tab) {
  const isEdit = tab === "edit";
  editTabBtn.classList.toggle("active", isEdit);
  exportTabBtn.classList.toggle("active", !isEdit);
  editView.classList.toggle("active", isEdit);
  exportView.classList.toggle("active", !isEdit);
  editControls.classList.toggle("active", isEdit);
  exportControls.classList.toggle("active", !isEdit);
  if (isEdit) {
    stopVideoPreviewLoop();
  } else {
    drawPreview();
  }
}

function isExportTabActive() {
  return exportView.classList.contains("active");
}
function updatePreviewIfVisible() {
  if (isExportTabActive()) drawPreview();
}

editTabBtn.addEventListener("click", () => setActiveTab("edit"));
exportTabBtn.addEventListener("click", () => setActiveTab("export"));

function showLoading(msg, showProgress = false) {
  loadingText.textContent = msg || "Loading…";
  zipProgressBar.style.display = showProgress ? "block" : "none";
  zipProgressFill.style.width = "0%";
  loadingOverlay.classList.add("visible");
}

function setLoadingProgress(pct) {
  zipProgressFill.style.width = Math.round(pct) + "%";
}
function hideLoading() {
  loadingOverlay.classList.remove("visible");
  zipProgressBar.style.display = "none";
}

const IMAGE_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|heics|heifs)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|mkv|avi)$/i;

function isVideoFile(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return VIDEO_EXTENSIONS.test(name) || type.startsWith("video/");
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const imageCropSizeControl = circleSizeInput.closest(".control");
const imageCornerControl = cornerRadiusInput.closest(".control");
const imageTransformControl = rotateLeftBtn.closest(".control");
const exportFormatControl = formatSelect.closest(".control");
const videoFormatControl = videoFormatSelect.closest(".control");
const exportSizeControl = sizeChips.closest(".control");
const exportInfoBtn = document.querySelector(".info-btn");
const exportTooltip = exportInfoBtn?.querySelector(".tooltip");
const imageExportTooltipHtml = exportTooltip?.innerHTML || "";
const videoExportTooltipHtml = `
  <strong>Video export</strong>
  <div class="tip-row">
    <span class="tip-badge">MP4</span>
    <span>Universal standard for sharing across phones and computers.</span>
  </div>
  <div class="tip-row">
    <span class="tip-badge jpg">WEBM</span>
    <span>Web/browser standard with strong modern browser support.</span>
  </div>
  <div class="tip-row">
    <span class="tip-badge">Trim</span>
    <span>Uses the selected trim range, crop, background, and volume.</span>
  </div>`;

function setExportInfoMode(mode) {
  if (!exportTooltip) return;
  exportTooltip.innerHTML =
    mode === "video" ? videoExportTooltipHtml : imageExportTooltipHtml;
}

function switchToVideoMode() {
  isVideoMode = true;
  imageCanvasWrap.style.display = "none";
  videoPlayerContainer.style.display = "flex";
  videoPlayer.style.display = "block";
  livePhotoPreviewContainer.style.display = "none";

  imageCropSizeControl.style.display = "none";
  imageCornerControl.style.display = "none";
  imageTransformControl.style.display = "none";
  videoCropControls.style.display = "block";

  exportFormatControl.style.display = "none";
  videoFormatControl.style.display = "";
  backgroundControls.style.display = "block"; // Ensure background choices are available for video
  exportSizeControl.style.display = "none";
  if (exportInfoBtn) exportInfoBtn.style.display = "";
  setExportInfoMode("video");
  downloadBtn.textContent = "Download video";
  downloadBtn.disabled = false;
}

function switchToImageMode() {
  isVideoMode = false;
  stopVideoRaf();
  stopVideoPreviewLoop();
  imageCanvasWrap.style.display = "block";
  videoPlayerContainer.style.display = "none";
  videoPlayer.style.display = "none";
  livePhotoPreviewContainer.style.display = "none";

  imageCropSizeControl.style.display = "";
  imageCornerControl.style.display = "";
  imageTransformControl.style.display = "";
  videoCropControls.style.display = "none";

  exportFormatControl.style.display = "";
  videoFormatControl.style.display = "none";
  exportSizeControl.style.display = "";
  if (exportInfoBtn) exportInfoBtn.style.display = "";
  setExportInfoMode("image");

  backgroundControls.style.display =
    formatSelect.value === "image/jpeg" ? "block" : "none";
  downloadBtn.textContent = "Download image";
  downloadBtn.disabled = !imageLoaded;
}

function setupVideoPlayer(blob) {
  videoBlob = blob;
  const url = URL.createObjectURL(blob);
  videoPlayer.src = url;
  videoPlayer.load();

  switchToVideoMode();

  videoCurrentTime = 0;
  videoDuration = 0;
  trimStartTime = 0;
  trimEndTime = 0;
  isVideoPlaying = false;
  videoMuted = false;
  videoSpeed = 1;

  videoPlayer.currentTime = 0;
  videoPlayer.playbackRate = videoSpeed;
  videoPlayer.muted = videoMuted;
  videoPlayer.volume = parseFloat(volumeSlider.value);
  videoInitialFrameAttempts = 0;

  playPauseBtn.textContent = "▶";
  muteBtn.textContent = videoMuted ? "🔇" : "🔊";
  muteBtn.classList.toggle("muted", videoMuted);
  speedSelect.value = videoSpeed;

  const { oc } = getVideoOverlay();
  if (!oc._pointerEventsAdded) {
    addCanvasPointerEvents(oc, true);
    oc._pointerEventsAdded = true;
  }
  startMonitorLoop();
}

function prepareVideoEditorCanvas() {
  if (!isVideoMode || !videoPlayer.videoWidth || !videoPlayer.videoHeight) {
    return;
  }
  const { oc } = getVideoOverlay();
  oc.width = videoPlayer.videoWidth;
  oc.height = videoPlayer.videoHeight;
  oc.style.aspectRatio =
    videoPlayer.videoWidth + " / " + videoPlayer.videoHeight;

  if (!circle.radius) {
    circle.x = oc.width / 2;
    circle.y = oc.height / 2;
    const cropPct = Number(videoCropSizeInput.value) / 100;
    circle.radius = Math.min(oc.width, oc.height) * 0.5 * cropPct;
  }

  drawVideoFrame();
}

function scheduleInitialVideoFrameDraw() {
  if (!isVideoMode || !videoPlayer.src) return;
  videoInitialFrameAttempts += 1;
  prepareVideoEditorCanvas();

  if (
    videoPlayer.readyState < HTMLMediaElement.HAVE_CURRENT_DATA &&
    videoInitialFrameAttempts < 30
  ) {
    requestAnimationFrame(scheduleInitialVideoFrameDraw);
    return;
  }

  requestAnimationFrame(() => {
    prepareVideoEditorCanvas();
    setTimeout(prepareVideoEditorCanvas, 60);
  });
}

function nudgeVideoToFirstFrame() {
  if (!isVideoMode || !videoDuration) return;
  const firstFrameTime = Math.min(0.05, Math.max(0, videoDuration - 0.05));
  if (Math.abs(videoPlayer.currentTime - firstFrameTime) < 0.01) {
    scheduleInitialVideoFrameDraw();
    return;
  }
  try {
    videoPlayer.currentTime = firstFrameTime;
  } catch (_) {
    scheduleInitialVideoFrameDraw();
  }
}

function resetAllState() {
  stopVideoRaf();
  releaseVideoPreviewSource();
  resetLivePhotoPreview();

  imageLoaded = false;
  rotation = 0;
  flipX = false;
  flipY = false;
  circle = { x: 0, y: 0, radius: 0 };
  isDragging = false;
  dragOffsetX = 0;
  dragOffsetY = 0;

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
    currentImageUrl = null;
  }
  image = new Image();

  isVideoPlaying = false;
  videoCurrentTime = 0;
  videoDuration = 0;
  trimStartTime = 0;
  trimEndTime = 0;
  isDraggingTrimStart = false;
  isDraggingTrimEnd = false;
  isPlayheadDragging = false;
  suppressNextTrimLoop = false;
  videoInitialFrameAttempts = 0;

  if (videoPlayer.src) {
    videoPlayer.pause();
    const _oldSrc = videoPlayer.src;
    videoPlayer.removeAttribute("src");
    videoPlayer.load();
    try {
      URL.revokeObjectURL(_oldSrc);
    } catch (_) {}
    videoBlob = null;
  }

  playPauseBtn.textContent = "▶";
  videoMuted = false;
  videoSpeed = 1;
  videoPlayer.muted = false;
  volumeSlider.value = "0.3";
  muteBtn.textContent = "🔊";
  muteBtn.classList.remove("muted");
  speedSelect.value = "1";

  playhead.style.left = "0%";
  progressBar.style.left = "0%";
  progressBar.style.width = "0%";
  trimStartHandle.style.left = "0%";
  trimEndHandle.style.left = "100%";
  activeRange.style.display = "none";
  timeDisplay.textContent = "0:00 / 0:00";

  selectedSize = "original";
  sizeChips.querySelectorAll(".chip").forEach((c, i) => {
    c.classList.toggle("active", i === 0);
  });

  setPlaceholderCanvas();
  drawPreviewPlaceholder();
  stopMonitorLoop();
}

videoPlayer.addEventListener("loadedmetadata", () => {
  videoDuration = videoPlayer.duration || 0;
  trimEndTime = videoDuration;
  videoCurrentTime = trimStartTime;
  updateTimeDisplay();
  updateTimeline();
  prepareVideoEditorCanvas();
  nudgeVideoToFirstFrame();
  startVideoRaf();
});

videoPlayer.addEventListener("loadeddata", scheduleInitialVideoFrameDraw);
videoPlayer.addEventListener("canplay", scheduleInitialVideoFrameDraw);
videoPlayer.addEventListener("seeked", () => {
  videoCurrentTime = videoPlayer.currentTime;
  updateTimeline();
  scheduleInitialVideoFrameDraw();
});

let monitorLoopRaf = null;

function startMonitorLoop() {
  stopMonitorLoop();

  function loop() {
    if (!isVideoMode) {
      monitorLoopRaf = null;
      return;
    }

    if (
      videoPlayer.duration &&
      !isDraggingTrimStart &&
      !isDraggingTrimEnd &&
      videoPlayer.currentTime >= trimEndTime - 0.05
    ) {
      if (suppressNextTrimLoop) {
        suppressNextTrimLoop = false;
        videoPlayer.pause();
        videoCurrentTime = videoPlayer.currentTime;
        updateTimeline();
        monitorLoopRaf = requestAnimationFrame(loop);
        return;
      }
      const shouldResume = !videoPlayer.paused;
      videoPlayer.pause();

      videoPlayer.currentTime = trimStartTime;

      if (shouldResume) {
        videoPlayer.play().catch(() => {});
      }
    }

    videoCurrentTime = videoPlayer.currentTime;
    updateTimeline();

    monitorLoopRaf = requestAnimationFrame(loop);
  }

  monitorLoopRaf = requestAnimationFrame(loop);
}

function stopMonitorLoop() {
  if (monitorLoopRaf) {
    cancelAnimationFrame(monitorLoopRaf);
    monitorLoopRaf = null;
  }
}

videoPlayer.addEventListener("play", () => {
  isVideoPlaying = true;
  playPauseBtn.textContent = "⏸";
});
videoPlayer.addEventListener("pause", () => {
  isVideoPlaying = false;
  playPauseBtn.textContent = "▶";
});
videoPlayer.addEventListener("ended", () => {
  videoPlayer.currentTime = trimStartTime;
  videoPlayer.play().catch(() => {});
});

playPauseBtn.addEventListener("click", () => {
  if (!videoPlayer.src) return;
  if (isVideoPlaying) videoPlayer.pause();
  else
    videoPlayer.play().catch((err) => console.error("Playback failed:", err));
});

// VOLUME UI & LOGIC
volumeSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  videoPlayer.volume = val;
  videoMuted = val === 0;
  videoPlayer.muted = videoMuted;
  muteBtn.textContent = videoMuted ? "🔇" : "🔊";
  muteBtn.classList.toggle("muted", videoMuted);
});

muteBtn.addEventListener("click", () => {
  videoMuted = !videoMuted;
  videoPlayer.muted = videoMuted;
  muteBtn.textContent = videoMuted ? "🔇" : "🔊";
  muteBtn.classList.toggle("muted", videoMuted);
  if (videoMuted) {
    volumeSlider.value = 0;
  } else {
    if (videoPlayer.volume === 0) videoPlayer.volume = 1;
    volumeSlider.value = videoPlayer.volume;
  }
});

speedSelect.addEventListener("change", () => {
  videoSpeed = parseFloat(speedSelect.value);
  videoPlayer.playbackRate = videoSpeed;
});

videoCropSizeInput.addEventListener(
  "input",
  () => {
    videoCropSizeValue.textContent = videoCropSizeInput.value + "%";
    const pct = Number(videoCropSizeInput.value) / 100;
    if (videoPlayer.videoWidth && videoPlayer.videoHeight) {
      const { oc } = getVideoOverlay();
      circle.radius =
        Math.min(
          oc.width || videoPlayer.videoWidth,
          oc.height || videoPlayer.videoHeight,
        ) *
        0.5 *
        pct;
      clampCircle();
    }
  },
  { passive: true },
);

function updateTimeDisplay() {
  const displayEnd = Math.min(trimEndTime, videoDuration);
  timeDisplay.textContent =
    formatTime(videoCurrentTime) + " / " + formatTime(displayEnd);
}

function updateTimeline() {
  if (videoDuration <= 0) return;
  const activeDuration = trimEndTime - trimStartTime;
  const normalizedCurrent = Math.max(
    trimStartTime,
    Math.min(trimEndTime, videoCurrentTime),
  );
  const visibleProgress = (normalizedCurrent - trimStartTime) / activeDuration;
  const trimStartPct = (trimStartTime / videoDuration) * 100;
  const trimEndPct = (trimEndTime / videoDuration) * 100;

  playhead.style.left =
    trimStartPct + visibleProgress * (trimEndPct - trimStartPct) + "%";
  progressBar.style.left = trimStartPct + "%";
  progressBar.style.width = visibleProgress * (trimEndPct - trimStartPct) + "%";
  activeRange.style.display = "block";
  activeRange.style.left = trimStartPct + "%";
  activeRange.style.width = trimEndPct - trimStartPct + "%";
  trimStartHandle.style.left = trimStartPct + "%";
  trimEndHandle.style.left = trimEndPct + "%";
  updateTimeDisplay();
}

videoTimeline.addEventListener("click", (e) => {
  if (isDraggingTrimStart || isDraggingTrimEnd || isPlayheadDragging) return;
  const rect = videoTimeline.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickPct = Math.max(0, Math.min(1, clickX / rect.width));
  const newTime = clickPct * videoDuration;
  videoPlayer.currentTime = Math.max(
    trimStartTime,
    Math.min(trimEndTime, newTime),
  );
});

trimStartHandle.addEventListener("pointerdown", (e) => {
  isDraggingTrimStart = true;
  videoTimeline.setPointerCapture(e.pointerId);
  e.preventDefault();
});

trimEndHandle.addEventListener("pointerdown", (e) => {
  isDraggingTrimEnd = true;
  videoTimeline.setPointerCapture(e.pointerId);
  e.preventDefault();
});

document.addEventListener("pointermove", (e) => {
  if (!isVideoMode) return;
  if (isDraggingTrimStart || isDraggingTrimEnd) {
    const rect = videoTimeline.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const movePct = Math.max(0, Math.min(1, moveX / rect.width));
    const newTime = movePct * videoDuration;

    if (isDraggingTrimStart) {
      trimStartTime = Math.min(newTime, trimEndTime - 0.1);
      trimStartTime = Math.max(0, trimStartTime);
    } else if (isDraggingTrimEnd) {
      trimEndTime = Math.max(newTime, trimStartTime + 0.1);
      trimEndTime = Math.min(videoDuration, trimEndTime);
    }
    const currentTime = videoPlayer.currentTime;
    videoCurrentTime = currentTime;
    if (videoPlayer.paused) {
      videoPlayer.currentTime = Math.max(
        trimStartTime,
        Math.min(trimEndTime, currentTime),
      );
      videoCurrentTime = videoPlayer.currentTime;
    }
    requestAnimationFrame(updateTimeline);
    e.preventDefault();
  }
});

document.addEventListener("pointerup", () => {
  const wasDraggingTrim =
    isVideoMode && (isDraggingTrimStart || isDraggingTrimEnd);
  if (
    wasDraggingTrim &&
    !videoPlayer.paused &&
    videoPlayer.currentTime >= trimEndTime - 0.05
  ) {
    suppressNextTrimLoop = true;
  }
  if (
    isVideoMode &&
    (isDraggingTrimStart || isDraggingTrimEnd) &&
    videoPlayer.paused
  ) {
    videoPlayer.currentTime = Math.max(
      trimStartTime,
      Math.min(trimEndTime, videoPlayer.currentTime),
    );
    videoCurrentTime = videoPlayer.currentTime;
    updateTimeline();
  }
  isDraggingTrimStart = false;
  isDraggingTrimEnd = false;
  isPlayheadDragging = false;
});

function isZipFile(file) {
  return (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    (file.type === "application/octet-stream" &&
      file.name.toLowerCase().endsWith(".zip")) ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

function getFileBaseName(file) {
  return file.name.replace(/\.[^/.]+$/, "");
}

function findLivePhotoPair(files) {
  const photos = files.filter((file) => /\.(jpe?g)$/i.test(file.name));
  const videos = files.filter((file) => /\.mov$/i.test(file.name));
  if (photos.length === 0 || videos.length === 0) return null;

  for (const photo of photos) {
    const match = videos.find(
      (video) =>
        getFileBaseName(video).toLowerCase() ===
        getFileBaseName(photo).toLowerCase(),
    );
    if (match) return { photo, video: match };
  }

  if (photos.length === 1 && videos.length === 1) {
    return { photo: photos[0], video: videos[0] };
  }
  return null;
}

async function handleUploadFiles(fileList) {
  const files = Array.from(fileList).filter(Boolean);
  if (files.length === 0) return;

  const livePhotoPair = findLivePhotoPair(files);
  if (livePhotoPair) {
    clearZipGallery();
    resetAllState();
    originalFileName = getFileBaseName(livePhotoPair.photo) || "live-photo";
    fileNameEl.textContent = originalFileName;
    fileNameEl.style.display = "block";
    downloadBtn.disabled = true;
    setupLivePhotoPreview(livePhotoPair.photo, livePhotoPair.video);
    try {
      await loadBlobIntoImage(livePhotoPair.photo);
      imageLoaded = true;
      prepareCanvasForImage();
      resetCircle();
      draw();
      downloadBtn.disabled = false;
      setActiveTab("edit");
      updatePreviewIfVisible();
    } catch (err) {
      console.error("Live Photo image failed:", err);
      drawMessage("Could not load Live Photo image");
    }
    return;
  }

  if (files.length === 1) {
    const file = files[0];
    if (isZipFile(file)) processZipFile(file);
    else if (isVideoFile(file)) {
      clearZipGallery();
      processVideoFile(file);
    } else {
      clearZipGallery();
      processFile(file);
    }
    return;
  }

  const zipFile = files.find(isZipFile);
  if (zipFile) {
    processZipFile(zipFile);
    return;
  }

  const videoFile = files.find(isVideoFile);
  if (videoFile) {
    clearZipGallery();
    processVideoFile(videoFile);
    return;
  }

  const imageFile = files.find((file) => IMAGE_EXTENSIONS.test(file.name));
  if (imageFile) {
    clearZipGallery();
    processFile(imageFile);
    return;
  }
}

uploadInput.addEventListener("change", (e) => {
  handleUploadFiles(e.target.files);
  e.target.value = "";
});

document.addEventListener("paste", (e) => {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        clearZipGallery();
        processFile(file);
      }
      break;
    }
  }
});

uploadBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadBox.classList.add("drag-over");
});
uploadBox.addEventListener("dragleave", () => {
  uploadBox.classList.remove("drag-over");
});
uploadBox.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadBox.classList.remove("drag-over");
  handleUploadFiles(e.dataTransfer.files);
});

async function processZipFile(file) {
  resetAllState();
  switchToImageMode();
  originalFileName = file.name || "archive";
  fileNameEl.textContent = originalFileName;
  fileNameEl.style.display = "block";
  clearZipGallery();
  downloadBtn.disabled = true;
  downloadZipBtn.style.display = "none";
  downloadZipBtn.disabled = true;
  drawMessage("Extracting ZIP…");
  showLoading("Extracting ZIP…", true);

  try {
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(file);
    const entries = [];
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      if (relativePath.startsWith("__MACOSX/") || relativePath.includes("/."))
        return;
      const base = relativePath.split("/").pop();
      if (!base || base.startsWith(".")) return;
      if (IMAGE_EXTENSIONS.test(relativePath))
        entries.push({ name: base, entry: zipEntry });
    });

    if (entries.length === 0) {
      hideLoading();
      drawMessage("No images found in ZIP");
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const { name, entry } = entries[i];
      loadingText.textContent = `Extracting ${i + 1} / ${entries.length}…`;
      const rawBlob = await entry.async("blob");
      const typedBlob = makeTypedImageBlob(rawBlob, name);
      zipImages.push({
        name,
        blob: typedBlob,
        thumbUrl: null,
        convertedBlob: null,
      });
      setLoadingProgress(((i + 1) / entries.length) * 100);
    }
    hideLoading();
    buildGallery();
    loadZipItem(0);
  } catch (err) {
    console.error(err);
    hideLoading();
    drawMessage("Could not read ZIP file");
  }
}

function makeTypedImageBlob(blob, name) {
  const ext = name.toLowerCase().split(".").pop();
  const typeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    heic: "image/heic",
    heif: "image/heif",
    heics: "image/heic-sequence",
    heifs: "image/heif-sequence",
  };
  return new Blob([blob], {
    type: typeMap[ext] || blob.type || "application/octet-stream",
  });
}

function clearZipGallery() {
  zipImages.forEach((item) => {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
  });
  zipImages = [];
  activeZipIndex = -1;
  galleryCard.style.display = "none";
  galleryGrid.innerHTML = "";
  downloadZipBtn.style.display = "none";
  downloadZipBtn.disabled = true;
}

function buildGallery() {
  galleryGrid.innerHTML = "";
  galleryBadge.textContent = zipImages.length;
  zipImages.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = "gallery-item";
    button.type = "button";
    button.dataset.index = index;
    button.title = item.name;

    const thumb = document.createElement("div");
    thumb.className = "gallery-thumb";
    const img = document.createElement("img");
    img.alt = item.name;
    img.loading = "lazy";
    const placeholder = document.createElement("div");
    placeholder.className = "gallery-placeholder";
    placeholder.textContent = "📷";
    const badge = document.createElement("div");
    badge.className = "gallery-item-selected-badge";
    badge.textContent = "✓";
    const spinner = document.createElement("div");
    spinner.className = "gallery-item-spinner";
    spinner.innerHTML = '<div class="mini-spinner"></div>';
    const caption = document.createElement("div");
    caption.className = "gallery-item-name";
    caption.textContent = item.name;

    thumb.appendChild(img);
    thumb.appendChild(placeholder);
    thumb.appendChild(badge);
    thumb.appendChild(spinner);
    button.appendChild(thumb);
    button.appendChild(caption);
    button.addEventListener("click", () => loadZipItem(index));
    galleryGrid.appendChild(button);

    hydrateGalleryThumbnail(item, img, placeholder, spinner);
  });
  galleryCard.style.display = "block";
  downloadZipBtn.style.display = "block";
  downloadZipBtn.disabled = false;
}

async function hydrateGalleryThumbnail(item, img, placeholder, spinner) {
  spinner.classList.add("visible");
  try {
    let displayBlob = item.blob;
    if (await isProbablyHeic(item.blob)) {
      displayBlob = await convertHeicFile(item.blob);
      item.convertedBlob = displayBlob;
    }
    const thumbBlob = await createSquareThumbnailBlob(displayBlob, 420);
    const url = URL.createObjectURL(thumbBlob);
    item.thumbUrl = url;
    img.onload = () => {
      img.classList.add("loaded");
      placeholder.style.display = "none";
      spinner.classList.remove("visible");
    };
    img.onerror = () => {
      placeholder.textContent = "!";
      spinner.classList.remove("visible");
    };
    img.src = url;
  } catch (err) {
    console.error("Thumbnail failed:", item.name, err);
    try {
      const fallbackUrl = URL.createObjectURL(item.blob);
      item.thumbUrl = fallbackUrl;
      img.onload = () => {
        img.classList.add("loaded");
        placeholder.style.display = "none";
        spinner.classList.remove("visible");
      };
      img.onerror = () => {
        placeholder.textContent = "!";
        spinner.classList.remove("visible");
      };
      img.src = fallbackUrl;
    } catch {
      placeholder.textContent = "!";
      spinner.classList.remove("visible");
    }
  }
}

async function createSquareThumbnailBlob(blob, size = 420) {
  const img = await loadImageOnly(blob);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  const cctx = c.getContext("2d");
  c.width = size;
  c.height = size;
  cctx.fillStyle = "#111827";
  cctx.fillRect(0, 0, size, size);
  const scale = Math.max(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  cctx.drawImage(img, dx, dy, dw, dh);
  return await canvasToBlob(c, "image/jpeg", 0.88);
}

function setGallerySelected(index) {
  galleryGrid.querySelectorAll(".gallery-item").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });
  activeZipIndex = index;
}

function setGalleryItemLoading(index, loading) {
  const items = galleryGrid.querySelectorAll(".gallery-item");
  if (items[index]) {
    const spinner = items[index].querySelector(".gallery-item-spinner");
    if (spinner) spinner.classList.toggle("visible", loading);
  }
}

async function loadZipItem(index) {
  if (index < 0 || index >= zipImages.length) return;
  if (index === activeZipIndex && imageLoaded) return;
  const item = zipImages[index];
  setGallerySelected(index);
  setGalleryItemLoading(index, true);
  imageLoaded = false;
  downloadBtn.disabled = true;
  rotation = 0;
  flipX = false;
  flipY = false;
  setPlaceholderCanvas();
  drawMessage("Loading…");
  drawPreviewPlaceholder();

  try {
    let displayBlob = item.convertedBlob || item.blob;
    if (!item.convertedBlob && (await isProbablyHeic(item.blob))) {
      displayBlob = await convertHeicFile(item.blob);
      item.convertedBlob = displayBlob;
    }
    await loadBlobIntoImage(displayBlob);
    originalFileName = item.name;
    imageLoaded = true;
    prepareCanvasForImage();
    resetCircle();
    draw();
    downloadBtn.disabled = false;
    setGalleryItemLoading(index, false);
    setActiveTab("edit");
  } catch (err) {
    console.error(err);
    setGalleryItemLoading(index, false);
    drawMessage("Could not load this image");
  }
}

async function processFile(file) {
  if (!file) return;
  resetAllState();
  switchToImageMode();
  originalFileName = file.name || "photo";
  fileNameEl.textContent = originalFileName;
  fileNameEl.style.display = "block";
  downloadBtn.disabled = true;
  showLoading("Loading photo…");
  drawMessage("Loading photo…");

  try {
    let displayBlob = file;
    if (await isProbablyHeic(file)) {
      showLoading("Converting HEIC photo…");
      displayBlob = await convertHeicFile(file);
    }
    await loadBlobIntoImage(displayBlob);
    imageLoaded = true;
    prepareCanvasForImage();
    resetCircle();
    draw();
    hideLoading();
    downloadBtn.disabled = false;
  } catch (err) {
    console.error(err);
    hideLoading();
    drawMultilineMessage([
      "Could not load this HEIC file.",
      "This variant is not supported in browser.",
      "Convert it to JPG/PNG first.",
    ]);
    drawPreviewPlaceholder();
  }
}

async function processVideoFile(file) {
  if (!file) return;
  resetAllState();
  originalFileName = file.name || "video";
  fileNameEl.textContent = originalFileName;
  fileNameEl.style.display = "block";
  setupVideoPlayer(file);
}

async function isProbablyHeic(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    name.endsWith(".heics") ||
    name.endsWith(".heifs")
  )
    return true;
  try {
    const buffer = await file.slice(0, 80).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let header = "";
    for (let i = 0; i < bytes.length; i++)
      header += String.fromCharCode(bytes[i]);
    const brands = [
      "ftypheic",
      "ftypheix",
      "ftyphevc",
      "ftyphevx",
      "ftypheim",
      "ftypheis",
      "ftypmif1",
      "ftypmsf1",
    ];
    return brands.some((b) => header.includes(b));
  } catch {
    return false;
  }
}

function getHeicToConverter() {
  if (typeof window.heicTo === "function") return window.heicTo;
  if (window.heicTo && typeof window.heicTo.heicTo === "function")
    return window.heicTo.heicTo;
  if (typeof window.HeicTo === "function") return window.HeicTo;
  if (window.HeicTo && typeof window.HeicTo.heicTo === "function")
    return window.HeicTo.heicTo;
  return null;
}

async function convertHeicFile(file) {
  const errors = [];
  const heicToFn = getHeicToConverter();
  if (heicToFn) {
    try {
      const converted = await heicToFn({
        blob: file,
        type: "image/jpeg",
        quality: 1,
      });
      return normalizeConvertedBlob(converted, "image/jpeg");
    } catch (err) {
      errors.push("heic-to jpeg: " + getErrorMessage(err));
    }
    try {
      const converted = await heicToFn({
        blob: file,
        type: "image/png",
        quality: 1,
      });
      return normalizeConvertedBlob(converted, "image/png");
    } catch (err) {
      errors.push("heic-to png: " + getErrorMessage(err));
    }
  }
  try {
    const nativeBlob = await nativeDecodeToPng(file);
    if (nativeBlob) return nativeBlob;
  } catch (err) {
    errors.push("native: " + getErrorMessage(err));
  }
  if (window.heic2any) {
    try {
      const converted = await window.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 1,
      });
      return normalizeConvertedBlob(converted, "image/jpeg");
    } catch (err) {
      errors.push("heic2any jpeg: " + getErrorMessage(err));
    }
    try {
      const converted = await window.heic2any({
        blob: file,
        toType: "image/png",
      });
      return normalizeConvertedBlob(converted, "image/png");
    } catch (err) {
      errors.push("heic2any png: " + getErrorMessage(err));
    }
  }
  throw new Error("HEIC conversion failed. " + errors.join(" | "));
}

function normalizeConvertedBlob(result, fallbackType) {
  if (Array.isArray(result)) result = result[0];
  if (result instanceof Blob) return result;
  return new Blob([result], { type: fallbackType });
}

async function nativeDecodeToPng(file) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = bitmap.width;
    tempCanvas.height = bitmap.height;
    tempCtx.drawImage(bitmap, 0, 0);
    if (bitmap.close) bitmap.close();
    return await canvasToBlob(tempCanvas, "image/png", 1);
  }
  const nativeImage = await loadImageOnly(file);
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = nativeImage.naturalWidth || nativeImage.width;
  tempCanvas.height = nativeImage.naturalHeight || nativeImage.height;
  tempCtx.drawImage(nativeImage, 0, 0);
  return await canvasToBlob(tempCanvas, "image/png", 1);
}

function canvasToBlob(c, type, quality) {
  return new Promise((resolve, reject) => {
    c.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      type,
      quality,
    );
  });
}

function loadImageOnly(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

function loadBlobIntoImage(blob) {
  return new Promise((resolve, reject) => {
    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl);
      currentImageUrl = null;
    }
    currentImageUrl = URL.createObjectURL(blob);
    image = new Image();
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Could not load image after conversion"));
    image.src = currentImageUrl;
  });
}

function getErrorMessage(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return String(err);
}

circleSizeInput.addEventListener(
  "input",
  () => {
    circleSizeValue.textContent = circleSizeInput.value + "%";
    if (!imageLoaded) return;
    updateCircleRadius();
    clampCircle();
    scheduleRender();
  },
  { passive: true },
);

cornerRadiusInput.addEventListener(
  "input",
  () => {
    cornerRadiusValue.textContent = cornerRadiusInput.value + "%";
    if (!imageLoaded) return;
    scheduleRender();
  },
  { passive: true },
);

cornerRadiusInput.addEventListener(
  "change",
  () => {
    if (!imageLoaded) return;
    draw();
    updatePreviewIfVisible();
  },
  { passive: true },
);

cornerRadiusInput.addEventListener(
  "pointerdown",
  (e) => (e.target.style.cursor = "grabbing"),
  { passive: true },
);
cornerRadiusInput.addEventListener(
  "pointerup",
  (e) => (e.target.style.cursor = "grab"),
  { passive: true },
);
circleSizeInput.addEventListener(
  "pointerdown",
  (e) => (e.target.style.cursor = "grabbing"),
  { passive: true },
);
circleSizeInput.addEventListener(
  "pointerup",
  (e) => (e.target.style.cursor = "grab"),
  { passive: true },
);

rotateLeftBtn.addEventListener("click", () => {
  if (!imageLoaded) return;
  rotation = (rotation + 270) % 360;
  prepareCanvasForImage();
  resetCircle();
  draw();
  updatePreviewIfVisible();
});

rotateRightBtn.addEventListener("click", () => {
  if (!imageLoaded) return;
  rotation = (rotation + 90) % 360;
  prepareCanvasForImage();
  resetCircle();
  draw();
  updatePreviewIfVisible();
});

flipHorizontalBtn.addEventListener("click", () => {
  if (!imageLoaded) return;
  flipX = !flipX;
  draw();
  updatePreviewIfVisible();
});

flipVerticalBtn.addEventListener("click", () => {
  if (!imageLoaded) return;
  flipY = !flipY;
  draw();
  updatePreviewIfVisible();
});

formatSelect.addEventListener("change", () => {
  if (!isVideoMode) {
    backgroundControls.style.display =
      formatSelect.value === "image/jpeg" ? "block" : "none";
  }
  updatePreviewIfVisible();
});

videoFormatSelect.addEventListener("change", updatePreviewIfVisible);

backgroundChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  backgroundChips
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  selectedBackground = chip.dataset.bg;
  updatePreviewIfVisible();
});

customBackgroundInput.addEventListener("input", () => {
  selectedBackground = customBackgroundInput.value;
  customColorDot.style.background = selectedBackground;
  customColorValue.textContent = selectedBackground.toUpperCase();
  backgroundChips
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  updatePreviewIfVisible();
});

sizeChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  sizeChips
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  selectedSize = chip.dataset.size;
  updatePreviewIfVisible();
});

downloadBtn.addEventListener("click", async () => {
  if (isVideoMode) {
    await exportVideo();
    return;
  }
  if (!imageLoaded) return;
  const opt = formatSelect.options[formatSelect.selectedIndex];
  const mimeType = opt.value;
  const extension = opt.dataset.extension;
  const crop = getCropData();
  let outputSize = crop.outputSize;
  if (selectedSize !== "original") outputSize = parseInt(selectedSize, 10);
  const out = createExportCanvas(outputSize, mimeType);
  const link = document.createElement("a");
  link.download = makeOutputName(originalFileName, extension);
  link.href = out.toDataURL(mimeType, 1);
  link.click();
});

downloadZipBtn.addEventListener("click", async () => {
  if (zipImages.length === 0) return;
  const opt = formatSelect.options[formatSelect.selectedIndex];
  const mimeType = opt.value;
  const extension = opt.dataset.extension;

  const fracX = imageLoaded && canvas.width > 0 ? circle.x / canvas.width : 0.5;
  const fracY =
    imageLoaded && canvas.height > 0 ? circle.y / canvas.height : 0.5;
  const fracR =
    imageLoaded && Math.min(canvas.width, canvas.height) > 0
      ? circle.radius / Math.min(canvas.width, canvas.height)
      : (Number(circleSizeInput.value) / 100) * 0.5;

  const savedImage = image;
  const savedImageLoaded = imageLoaded;
  const savedRotation = rotation;
  const savedFlipX = flipX;
  const savedFlipY = flipY;
  const savedCircle = { ...circle };
  const savedCanvasW = canvas.width;
  const savedCanvasH = canvas.height;
  const savedOriginalName = originalFileName;

  downloadZipBtn.disabled = true;
  downloadBtn.disabled = true;
  showLoading("Processing images…", true);
  const jszip = new JSZip();

  for (let i = 0; i < zipImages.length; i++) {
    const item = zipImages[i];
    loadingText.textContent = `Processing ${i + 1} / ${zipImages.length}…`;
    setLoadingProgress(((i + 1) / zipImages.length) * 100);

    try {
      let displayBlob = item.convertedBlob || item.blob;
      if (!item.convertedBlob && (await isProbablyHeic(item.blob))) {
        displayBlob = await convertHeicFile(item.blob);
        item.convertedBlob = displayBlob;
      }
      const tempImg = await loadImageOnly(displayBlob);
      image = tempImg;
      imageLoaded = true;
      rotation = savedRotation;
      flipX = savedFlipX;
      flipY = savedFlipY;
      prepareCanvasForImage();
      circle.x = canvas.width * fracX;
      circle.y = canvas.height * fracY;
      circle.radius = Math.min(canvas.width, canvas.height) * fracR;
      clampCircle();
      const crop = getCropData();
      let outputSize = Math.round(crop.sourceSize);
      if (selectedSize !== "original") outputSize = parseInt(selectedSize, 10);
      const exportCanvas = createExportCanvas(outputSize, mimeType);
      const blob = await canvasToBlob(exportCanvas, mimeType, 1);
      jszip.file(makeOutputName(item.name, extension), blob);
    } catch (err) {
      console.error("Failed to process", item.name, err);
    }
  }

  loadingText.textContent = "Creating ZIP…";
  const zipBlob = await jszip.generateAsync({ type: "blob" });
  image = savedImage;
  imageLoaded = savedImageLoaded;
  rotation = savedRotation;
  flipX = savedFlipX;
  flipY = savedFlipY;
  circle = savedCircle;
  originalFileName = savedOriginalName;

  if (imageLoaded) {
    canvas.width = savedCanvasW;
    canvas.height = savedCanvasH;
    canvas.style.aspectRatio = savedCanvasW + " / " + savedCanvasH;
    draw();
  }

  hideLoading();
  downloadZipBtn.disabled = false;
  downloadBtn.disabled = !imageLoaded;
  const link = document.createElement("a");
  link.download = "circle-crop-all.zip";
  link.href = URL.createObjectURL(zipBlob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
});

function addCanvasPointerEvents(targetCanvas, isVideo) {
  targetCanvas.addEventListener("pointerdown", (e) => {
    if (!isVideo && !imageLoaded) return;
    if (isVideo && !isVideoMode) return;
    const p = toCanvas(e);
    if (Math.hypot(p.x - circle.x, p.y - circle.y) <= circle.radius) {
      isDragging = true;
      dragOffsetX = p.x - circle.x;
      dragOffsetY = p.y - circle.y;
      targetCanvas.setPointerCapture(e.pointerId);
    }
  });
  targetCanvas.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const p = toCanvas(e);
    circle.x = p.x - dragOffsetX;
    circle.y = p.y - dragOffsetY;
    clampCircle();
    if (!isVideo) scheduleRender();
  });
  targetCanvas.addEventListener("pointerup", () => {
    isDragging = false;
  });
  targetCanvas.addEventListener("pointercancel", () => {
    isDragging = false;
  });
}

addCanvasPointerEvents(canvas, false);

function imageW() {
  return image.naturalWidth || image.width;
}
function imageH() {
  return image.naturalHeight || image.height;
}

function getEffectiveImageSize() {
  const rotated = rotation === 90 || rotation === 270;
  return {
    width: rotated ? imageH() : imageW(),
    height: rotated ? imageW() : imageH(),
  };
}

function prepareCanvasForImage() {
  const effective = getEffectiveImageSize();
  canvas.width = 1400;
  canvas.height = Math.round((1400 * effective.height) / effective.width);
  canvas.style.aspectRatio = effective.width + " / " + effective.height;
}

function setPlaceholderCanvas() {
  canvas.width = 1200;
  canvas.height = 800;
  canvas.style.aspectRatio = "3 / 2";
}

function resetCircle() {
  circle.x = canvas.width / 2;
  circle.y = canvas.height / 2;
  updateCircleRadius();
  clampCircle();
}

function updateCircleRadius() {
  const pct = Number(circleSizeInput.value) / 100;
  circle.radius = (Math.min(canvas.width, canvas.height) / 2) * pct;
}

function clampCircle() {
  let _w, _h;
  if (isVideoMode) {
    const _ov = getVideoOverlay();
    _w =
      (_ov && _ov.oc && _ov.oc.width) ||
      (videoPlayer && videoPlayer.videoWidth) ||
      canvas.width;
    _h =
      (_ov && _ov.oc && _ov.oc.height) ||
      (videoPlayer && videoPlayer.videoHeight) ||
      canvas.height;
  } else {
    _w = canvas.width;
    _h = canvas.height;
  }
  circle.x = Math.max(circle.radius, Math.min(_w - circle.radius, circle.x));
  circle.y = Math.max(circle.radius, Math.min(_h - circle.radius, circle.y));
}

function drawTransformedImage(targetCtx, width, height) {
  const rotated = rotation === 90 || rotation === 270;
  const drawWidth = rotated ? height : width;
  const drawHeight = rotated ? width : height;
  targetCtx.save();
  targetCtx.translate(width / 2, height / 2);
  targetCtx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  targetCtx.rotate((rotation * Math.PI) / 180);
  targetCtx.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  targetCtx.restore();
}

function createTransformedSourceCanvas() {
  const effective = getEffectiveImageSize();
  const sourceCanvas = document.createElement("canvas");
  const sourceCtx = sourceCanvas.getContext("2d");
  sourceCanvas.width = effective.width;
  sourceCanvas.height = effective.height;
  drawTransformedImage(sourceCtx, sourceCanvas.width, sourceCanvas.height);
  return sourceCanvas;
}

function createExportCanvas(outputSize, mimeType) {
  const crop = getCropData();
  const sourceCanvas = createTransformedSourceCanvas();
  const out = document.createElement("canvas");
  const octx = out.getContext("2d");
  out.width = outputSize;
  out.height = outputSize;

  if (mimeType === "image/jpeg") {
    octx.fillStyle =
      selectedBackground === "transparent" ? "#ffffff" : selectedBackground;
    octx.fillRect(0, 0, outputSize, outputSize);
  }

  const isFullCircle = Number(cornerRadiusInput.value) >= 100;
  const cr = isFullCircle
    ? outputSize / 2
    : (Number(cornerRadiusInput.value) / 100) * (outputSize / 2);
  octx.save();
  cropPathOn(octx, 0, 0, outputSize, isFullCircle, cr);
  octx.clip();
  octx.drawImage(
    sourceCanvas,
    crop.sourceX,
    crop.sourceY,
    crop.sourceSize,
    crop.sourceSize,
    0,
    0,
    outputSize,
    outputSize,
  );
  octx.restore();
  return out;
}

function cropPathOn(c, x, y, size, isCircle, cr) {
  if (isCircle) {
    c.beginPath();
    c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    const r = Math.min(cr, size / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + size, y, x + size, y + size, r);
    c.arcTo(x + size, y + size, x, y + size, r);
    c.arcTo(x, y + size, x, y, r);
    c.arcTo(x, y, x + size, y, r);
    c.closePath();
  }
}

let videoOverlayCanvas = null;
let videoOverlayCtx = null;
let videoRafId = null;

function getVideoOverlay() {
  if (!videoOverlayCanvas) {
    videoOverlayCanvas = document.getElementById("videoOverlayCanvas");
    videoOverlayCtx = videoOverlayCanvas.getContext("2d");
  }
  return { oc: videoOverlayCanvas, octx: videoOverlayCtx };
}

function startVideoRaf() {
  if (videoRafId) return;
  videoRafId = requestAnimationFrame(videoRafLoop);
}

function stopVideoRaf() {
  if (videoRafId) {
    cancelAnimationFrame(videoRafId);
    videoRafId = null;
  }
}

function videoRafLoop() {
  if (!isVideoMode) {
    videoRafId = null;
    return;
  }

  if (!videoPlayer.paused || isDragging) {
    drawVideoFrame();
  }

  videoRafId = requestAnimationFrame(videoRafLoop);
}

function drawVideoFrame() {
  if (!isVideoMode) return;
  const { oc, octx } = getVideoOverlay();
  if (!videoPlayer.videoWidth || !videoPlayer.videoHeight) return;

  if (
    oc.width !== videoPlayer.videoWidth ||
    oc.height !== videoPlayer.videoHeight
  ) {
    oc.width = videoPlayer.videoWidth;
    oc.height = videoPlayer.videoHeight;
    circle.x = oc.width / 2;
    circle.y = oc.height / 2;
    const cropPct = Number(videoCropSizeInput.value) / 100;
    circle.radius = Math.min(oc.width, oc.height) * 0.5 * cropPct;
  }

  const w = oc.width;
  const h = oc.height;
  octx.clearRect(0, 0, w, h);
  octx.drawImage(videoPlayer, 0, 0, w, h);

  octx.save();
  octx.fillStyle = "rgba(0,0,0,0.55)";
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = "destination-out";
  octx.beginPath();
  octx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  octx.fill();
  octx.restore();

  octx.save();
  octx.beginPath();
  octx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  octx.clip();
  octx.drawImage(videoPlayer, 0, 0, w, h);
  octx.restore();

  octx.save();
  octx.beginPath();
  octx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  octx.strokeStyle = "rgba(255,255,255,0.85)";
  octx.lineWidth = 3;
  octx.setLineDash([10, 8]);
  octx.stroke();
  octx.restore();
}

function draw() {
  if (!imageLoaded) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTransformedImage(ctx, canvas.width, canvas.height);

  const x = circle.x - circle.radius;
  const y = circle.y - circle.radius;
  const s = circle.radius * 2;
  const isFullCircle = Number(cornerRadiusInput.value) >= 100;
  const cr = isFullCircle
    ? circle.radius
    : (Number(cornerRadiusInput.value) / 100) * circle.radius;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  cropPathOn(ctx, x, y, s, isFullCircle, cr);
  ctx.fill();
  ctx.restore();

  ctx.save();
  cropPathOn(ctx, x, y, s, isFullCircle, cr);
  ctx.clip();
  drawTransformedImage(ctx, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  cropPathOn(ctx, x, y, s, isFullCircle, cr);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.restore();
}

function drawPreview() {
  if (isLivePhotoMode) {
    drawLivePhotoPreview();
    return;
  }
  if (isVideoMode) {
    drawVideoPreview();
    return;
  }
  if (!imageLoaded) {
    drawPreviewPlaceholder();
    return;
  }
  const mimeType = formatSelect.value;
  const out = createExportCanvas(previewCanvas.width, mimeType);
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(out, 0, 0, previewCanvas.width, previewCanvas.height);
}

function drawLivePhotoPreview() {
  stopVideoPreviewLoop();
  if (!livePhotoPreviewContainer || !livePhotoPhotoUrl || !livePhotoVideoUrl) {
    livePhotoPreviewContainer.style.display = "none";
    previewCanvas.style.display = "block";
    drawPreviewPlaceholder();
    return;
  }

  previewCanvas.style.display = "none";
  videoPreviewCanvas.style.display = "none";
  livePhotoPreviewContainer.style.display = "block";

  if (window.LivePhotosKit && typeof LivePhotosKit.Player === "function") {
    if (!livePhotoPlayer) {
      const element = document.createElement("div");
      element.dataset.livePhoto = "";
      element.dataset.photoSrc = livePhotoPhotoUrl;
      element.dataset.videoSrc = livePhotoVideoUrl;
      element.dataset.proactivelyLoadsVideo = "true";
      element.dataset.showsNativeControls = "true";
      element.style.width = "100%";
      element.style.height = "100%";
      livePhotoPreviewContainer.innerHTML = "";
      livePhotoPreviewContainer.appendChild(element);
      livePhotoPlayer = LivePhotosKit.Player(element);
      if (LivePhotosKit.PlaybackStyle?.FULL) {
        livePhotoPlayer.playbackStyle = LivePhotosKit.PlaybackStyle.FULL;
      }
    }
  } else {
    livePhotoPreviewContainer.style.display = "none";
    previewCanvas.style.display = "block";
    drawPreviewPlaceholder();
  }
}

function startVideoPreviewLoop() {
  stopVideoPreviewLoop();
  videoPreviewCanvas.style.display = "block";
  previewCanvas.style.display = "none";
  const vw = videoPlayer.videoWidth;
  const vh = videoPlayer.videoHeight;
  if (!vw || !vh) return;

  videoPreviewCanvas.width = 512;
  videoPreviewCanvas.height = 512;
  if (
    !videoPreviewCanvas._previewSrc ||
    videoPreviewCanvas._previewBlob !== videoBlob
  ) {
    if (videoPreviewCanvas._previewSrc) {
      URL.revokeObjectURL(videoPreviewCanvas._previewSrc);
    }
    videoPreviewCanvas._previewBlob = videoBlob;
    videoPreviewCanvas._previewSrc = URL.createObjectURL(videoBlob);
    if (!videoPreviewCanvas._previewVideo) {
      videoPreviewCanvas._previewVideo = document.createElement("video");
      videoPreviewCanvas._previewVideo.muted = true;
      videoPreviewCanvas._previewVideo.loop = true;
      videoPreviewCanvas._previewVideo.playsInline = true;
      videoPreviewCanvas._previewVideo.preload = "auto";
    }
    videoPreviewCanvas._previewVideo.src = videoPreviewCanvas._previewSrc;
  }

  function loopFrame() {
    if (!isVideoMode || !isExportTabActive()) {
      stopVideoPreviewLoop();
      return;
    }
    const pv = videoPreviewCanvas._previewVideo;
    if (!pv || pv.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      videoPreviewRafId = requestAnimationFrame(loopFrame);
      return;
    }
    const size = videoPreviewCanvas.width;
    const cropPct = Number(videoCropSizeInput.value) / 100;
    const cropRadius = Math.min(vw, vh) * 0.5 * cropPct;
    const cx = circle.x || vw / 2;
    const cy = circle.y || vh / 2;
    const srcX = cx - cropRadius;
    const srcY = cy - cropRadius;
    const srcSize = cropRadius * 2;

    if (pv.currentTime >= trimEndTime) pv.currentTime = trimStartTime;

    videoPreviewCtx.clearRect(0, 0, size, size);

    // Draw background color if not transparent
    if (selectedBackground !== "transparent") {
      videoPreviewCtx.fillStyle = selectedBackground;
      videoPreviewCtx.fillRect(0, 0, size, size);
    }

    videoPreviewCtx.save();
    videoPreviewCtx.beginPath();
    videoPreviewCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    videoPreviewCtx.clip();
    videoPreviewCtx.drawImage(
      pv,
      srcX,
      srcY,
      srcSize,
      srcSize,
      0,
      0,
      size,
      size,
    );
    videoPreviewCtx.restore();

    videoPreviewRafId = requestAnimationFrame(loopFrame);
  }
  const pv = videoPreviewCanvas._previewVideo;
  const startPreviewPlayback = () => {
    if (!isVideoMode || !isExportTabActive()) return;
    try {
      pv.currentTime = trimStartTime;
    } catch (_) {}
    pv.play().catch(() => {});
  };
  if (pv.readyState >= HTMLMediaElement.HAVE_METADATA) {
    startPreviewPlayback();
  } else {
    pv.addEventListener("loadedmetadata", startPreviewPlayback, { once: true });
  }
  videoPreviewRafId = requestAnimationFrame(loopFrame);
}

function stopVideoPreviewLoop() {
  if (videoPreviewRafId) {
    cancelAnimationFrame(videoPreviewRafId);
    videoPreviewRafId = null;
  }
  if (videoPreviewCanvas._previewVideo)
    videoPreviewCanvas._previewVideo.pause();
  videoPreviewCanvas.style.display = "none";
  previewCanvas.style.display = "block";
}

function releaseVideoPreviewSource() {
  stopVideoPreviewLoop();
  if (videoPreviewCanvas._previewVideo) {
    videoPreviewCanvas._previewVideo.removeAttribute("src");
    videoPreviewCanvas._previewVideo.load();
  }
  if (videoPreviewCanvas._previewSrc) {
    URL.revokeObjectURL(videoPreviewCanvas._previewSrc);
    videoPreviewCanvas._previewSrc = null;
  }
  videoPreviewCanvas._previewBlob = null;
}

function resetLivePhotoPreview() {
  isLivePhotoMode = false;
  if (livePhotoPlayer && typeof livePhotoPlayer.remove === "function") {
    livePhotoPlayer.remove();
  }
  livePhotoPlayer = null;
  livePhotoPreviewContainer.innerHTML = "";
  livePhotoPreviewContainer.style.display = "none";
  if (livePhotoPhotoUrl) {
    URL.revokeObjectURL(livePhotoPhotoUrl);
    livePhotoPhotoUrl = null;
  }
  if (livePhotoVideoUrl) {
    URL.revokeObjectURL(livePhotoVideoUrl);
    livePhotoVideoUrl = null;
  }
}

function setupLivePhotoPreview(photoFile, videoFile) {
  resetLivePhotoPreview();
  isLivePhotoMode = true;
  livePhotoPhotoUrl = URL.createObjectURL(photoFile);
  livePhotoVideoUrl = URL.createObjectURL(videoFile);
  livePhotoPreviewContainer.style.display = "block";
  previewCanvas.style.display = "none";
  videoPreviewCanvas.style.display = "none";

  if (window.LivePhotosKit && typeof LivePhotosKit.Player === "function") {
    const element = document.createElement("div");
    element.dataset.livePhoto = "";
    element.dataset.photoSrc = livePhotoPhotoUrl;
    element.dataset.videoSrc = livePhotoVideoUrl;
    element.dataset.proactivelyLoadsVideo = "true";
    element.dataset.showsNativeControls = "true";
    element.style.width = "100%";
    element.style.height = "100%";
    livePhotoPreviewContainer.innerHTML = "";
    livePhotoPreviewContainer.appendChild(element);
    livePhotoPlayer = LivePhotosKit.Player(element);
    if (LivePhotosKit.PlaybackStyle?.FULL) {
      livePhotoPlayer.playbackStyle = LivePhotosKit.PlaybackStyle.FULL;
    }
  } else {
    livePhotoPreviewContainer.style.display = "none";
    previewCanvas.style.display = "block";
  }
}

function drawVideoPreview() {
  startVideoPreviewLoop();
}

function drawPreviewPlaceholder() {
  const dark = document.documentElement.dataset.theme === "dark";
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = dark ? "#0f172a" : "#e2e8f0";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = dark ? "#64748b" : "#94a3b8";
  previewCtx.font =
    "26px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  previewCtx.textAlign = "center";
  previewCtx.textBaseline = "middle";
  previewCtx.fillText(
    "Preview",
    previewCanvas.width / 2,
    previewCanvas.height / 2,
  );
}

function seekVideoTo(video, time) {
  return new Promise((resolve, reject) => {
    const targetTime = Math.max(0, time);
    if (Math.abs(video.currentTime - targetTime) < 0.02) {
      resolve();
      return;
    }

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not seek video"));
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error("Video seek timeout"));
    };
    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    const timeoutId = setTimeout(onTimeout, 2000);

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });

    try {
      video.currentTime = targetTime;
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

function getVideoExportMimeType() {
  const choice = videoFormatSelect.value;
  const mp4Types = [
    'video/mp4;codecs="avc1.4d002a, mp4a.40.2"',
    'video/mp4;codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4;codecs="avc1.640028, mp4a.40.2"',
    "video/mp4",
  ];
  const webmTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  const requestedTypes = choice === "webm" ? webmTypes : mp4Types;
  const mimeType =
    requestedTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "";

  return {
    mimeType,
    extension: mimeType.includes("mp4") ? "mp4" : "webm",
  };
}

function getCropData() {
  const effective = getEffectiveImageSize();
  const scaleX = effective.width / canvas.width;
  const scaleY = effective.height / canvas.height;
  const sourceX = (circle.x - circle.radius) * scaleX;
  const sourceY = (circle.y - circle.radius) * scaleY;
  const sourceSize = Math.min(
    circle.radius * 2 * scaleX,
    circle.radius * 2 * scaleY,
  );
  return { sourceX, sourceY, sourceSize, outputSize: Math.round(sourceSize) };
}

function toCanvas(e) {
  const targetCanvas = isVideoMode ? getVideoOverlay().oc : canvas;
  const rect = targetCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (targetCanvas.width / rect.width),
    y: (e.clientY - rect.top) * (targetCanvas.height / rect.height),
  };
}

function drawMessage(text) {
  const dark = document.documentElement.dataset.theme === "dark";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? "#0f172a" : "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? "#64748b" : "#94a3b8";
  ctx.font = "28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function drawMultilineMessage(lines) {
  const dark = document.documentElement.dataset.theme === "dark";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? "#0f172a" : "#e2e8f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? "#94a3b8" : "#64748b";
  ctx.font = "26px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = 38;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
  });
}

// VIDEO EXPORT WITH H.264 MP4 PRIORITY, BACKGROUND FILL & AUDIO GAIN
async function exportVideo() {
  if (!videoBlob) return;
  const duration = trimEndTime - trimStartTime;
  if (duration <= 0) {
    alert("Trim range is empty.");
    return;
  }
  showLoading("Preparing export…");

  let activeAudioCtx = null;
  const originalPlaybackRate = videoPlayer.playbackRate;
  const originalVolume = videoPlayer.volume;
  const originalMuted = videoPlayer.muted;
  const originalCurrentTime = videoPlayer.currentTime;

  try {
    const vw = videoPlayer.videoWidth;
    const vh = videoPlayer.videoHeight;
    if (!vw || !vh) throw new Error("Video not ready");

    const cropPct = Number(videoCropSizeInput.value) / 100;
    const cropRadius = Math.min(vw, vh) * 0.5 * cropPct;
    const cx = circle.x || vw / 2;
    const cy = circle.y || vh / 2;
    const srcX = Math.max(0, cx - cropRadius);
    const srcY = Math.max(0, cy - cropRadius);
    const srcSize = cropRadius * 2;
    const outSize = Math.round(srcSize);
    if (outSize <= 0) throw new Error("Invalid crop size");

    const offscreen = document.createElement("canvas");
    offscreen.width = outSize;
    offscreen.height = outSize;
    const offCtx = offscreen.getContext("2d");

    const { mimeType, extension } = getVideoExportMimeType();
    if (!mimeType) {
      throw new Error("This browser does not support video recording export.");
    }

    const videoStream = offscreen.captureStream(30);
    const finalStream = new MediaStream(videoStream.getVideoTracks());

    try {
      if (!videoPlayer.muted && videoPlayer.volume > 0) {
        const capStream = videoPlayer.captureStream
          ? videoPlayer.captureStream()
          : videoPlayer.mozCaptureStream
            ? videoPlayer.mozCaptureStream()
            : null;
        if (capStream && capStream.getAudioTracks().length > 0) {
          activeAudioCtx = new (
            window.AudioContext || window.webkitAudioContext
          )();
          const source = activeAudioCtx.createMediaStreamSource(capStream);
          const gainNode = activeAudioCtx.createGain();
          gainNode.gain.value = videoPlayer.volume;
          const dest = activeAudioCtx.createMediaStreamDestination();
          source.connect(gainNode);
          gainNode.connect(dest);
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) finalStream.addTrack(audioTrack);
        }
      }
    } catch (err) {
      console.warn("Audio capture failed or unsupported:", err);
    }

    const recorder = new MediaRecorder(finalStream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const recorderStopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    stopMonitorLoop();
    videoPlayer.pause();
    await seekVideoTo(videoPlayer, trimStartTime);

    videoPlayer.playbackRate = 1;
    videoPlayer.volume = originalVolume;
    videoPlayer.muted = originalMuted;

    recorder.start(100);
    await videoPlayer.play().catch(() => {});

    loadingText.textContent = "Recording… 0%";

    await new Promise((resolve, reject) => {
      let finished = false;
      const clampProgress = (value) => Math.min(Math.max(value, 0), 1);

      const drawFrame = () => {
        if (finished) return;

        const elapsed = videoPlayer.currentTime - trimStartTime;
        const progress = clampProgress(elapsed / duration);
        loadingText.textContent =
          "Recording… " + Math.round(progress * 100) + "%";

        offCtx.clearRect(0, 0, outSize, outSize);
        if (selectedBackground !== "transparent") {
          offCtx.fillStyle = selectedBackground;
          offCtx.fillRect(0, 0, outSize, outSize);
        }

        offCtx.save();
        offCtx.beginPath();
        offCtx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
        offCtx.clip();
        offCtx.drawImage(
          videoPlayer,
          srcX,
          srcY,
          srcSize,
          srcSize,
          0,
          0,
          outSize,
          outSize,
        );
        offCtx.restore();

        if (videoPlayer.currentTime >= trimEndTime - 0.04 || progress >= 1) {
          finished = true;
          videoPlayer.pause();
          setTimeout(() => {
            recorder.stop();
            resolve();
          }, 200);
          return;
        }

        if (typeof videoPlayer.requestVideoFrameCallback === "function") {
          videoPlayer.requestVideoFrameCallback(() => drawFrame());
        } else {
          requestAnimationFrame(drawFrame);
        }
      };

      drawFrame();
    });

    await recorderStopped;

    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makeOutputName(originalFileName, extension);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    videoPlayer.currentTime = trimStartTime;
  } catch (err) {
    console.error(err);
    alert("Video export failed: " + err.message);
  } finally {
    hideLoading();
    if (isVideoMode) startMonitorLoop();
    if (activeAudioCtx && activeAudioCtx.state !== "closed") {
      activeAudioCtx.close().catch(console.error);
    }
    videoPlayer.volume = originalVolume;
    videoPlayer.muted = originalMuted;
    videoPlayer.playbackRate = originalPlaybackRate;
    videoPlayer.currentTime = originalCurrentTime;
  }
}

function makeOutputName(name, ext) {
  return (name || "photo").replace(/\.[^/.]+$/, "") + "-crop." + ext;
}

setPlaceholderCanvas();
drawMessage("Upload photo or ZIP");
drawPreviewPlaceholder();

window.addEventListener("beforeunload", () => {
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  releaseVideoPreviewSource();
  if (videoPlayer && videoPlayer.src) URL.revokeObjectURL(videoPlayer.src);
});
