import './style.css';

// Configuration
const FRAME_COUNT = 206;
const preloadedImages = [];
let loadedImagesCount = 0;

// Elements
const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loader-bar');
const loaderProgress = document.getElementById('loader-progress');

const scrollCanvas = document.getElementById('scroll-canvas');
const scrollCtx = scrollCanvas.getContext('2d');

// Animation State
let targetFrame = 0;
let currentFrame = 0;
const scrollLerpFactor = 0.08; // Liquid-smooth scrolling speed

// ----------------------------------------------------
// 1. Asset Preloading
// ----------------------------------------------------
function preloadFrames() {
  document.body.style.overflow = 'hidden'; // Lock scrolling during load

  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(3, '0');
    img.src = `/assets/frames/ezgif-frame-${frameNum}.jpg`;

    img.onload = () => {
      loadedImagesCount++;
      const percent = Math.floor((loadedImagesCount / FRAME_COUNT) * 100);

      // Update loading progress UI
      if (loaderBar) loaderBar.style.width = `${percent}%`;
      if (loaderProgress) loaderProgress.textContent = `Loading ${percent}%`;

      if (loadedImagesCount === FRAME_COUNT) {
        onAllAssetsLoaded();
      }
    };

    img.onerror = () => {
      console.error(`Failed to load frame: ${img.src}`);
      loadedImagesCount++;
      if (loadedImagesCount === FRAME_COUNT) {
        onAllAssetsLoaded();
      }
    };

    preloadedImages.push(img);
  }
}

function onAllAssetsLoaded() {
  // Hide preloader with smooth transition
  setTimeout(() => {
    if (preloader) preloader.classList.add('fade-out');
    document.body.style.overflow = 'auto'; // Re-enable scrolling

    // Initial Render and setup loop
    resizeCanvases();
    requestAnimationFrame(renderLoop);
  }, 500);
}

// ----------------------------------------------------
// 2. High-Performance Canvas Rendering
// ----------------------------------------------------
function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
  // Proportional drawing with smart responsive fits (full-bleed desktop/tablet/desktop-site, uncropped mobile)
  if (arguments.length < 2) return;

  if (typeof x !== 'number') x = 0;
  if (typeof y !== 'number') y = 0;
  if (typeof w !== 'number') w = ctx.canvas.width;
  if (typeof h !== 'number') h = ctx.canvas.height;
  if (typeof offsetX !== 'number') offsetX = 0.5;
  if (typeof offsetY !== 'number') offsetY = 0.5;

  const iw = img.width;
  const ih = img.height;

  // Detect if running on a desktop, tablet, or mobile Chrome with "Desktop site" requested
  // Same cinematic scale for all devices
  const r = Math.max(w / iw, h / ih);

  const nw = iw * r;
  const nh = ih * r;

  const dx = (w - nw) * offsetX;
  const dy = (h - nh) * offsetY;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, x + dx, y + dy, nw, nh);
}

function renderFrame(ctx, canvas, frameIdx) {
  if (!canvas) return;
  const imgIndex = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(frameIdx)));
  const img = preloadedImages[imgIndex];
  if (img && img.complete) {
    drawImageProp(ctx, img, 0, 0, canvas.width, canvas.height);
  }
}

// Resize listener
function resizeCanvases() {
  const dpr = window.devicePixelRatio || 1;

  if (scrollCanvas) {
    const rect = scrollCanvas.getBoundingClientRect();
    scrollCanvas.width = rect.width * dpr;
    scrollCanvas.height = rect.height * dpr;

    // Scale context back to match CSS dimensions
    const ctx = scrollCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Immediate redraw
    renderFrame(scrollCtx, scrollCanvas, currentFrame);
  }
}

window.addEventListener('resize', () => {
  resizeCanvases();
  updateScrollState();
});

// ----------------------------------------------------
// 3. Scroll & Loop Logic
// ----------------------------------------------------
function updateScrollState() {
  const showcase = document.getElementById('showcase');
  if (!showcase) return;

  const showcaseTop = showcase.offsetTop;
  const showcaseHeight = showcase.offsetHeight;
  const windowHeight = window.innerHeight;

  const scrollTop = window.scrollY;
  const scrollStart = showcaseTop;
  const scrollEnd = showcaseTop + showcaseHeight - windowHeight;

  // Calculate percentage of scroll showcase traversed
  let scrollProgress = (scrollTop - scrollStart) / (scrollEnd - scrollStart);
  scrollProgress = Math.max(0, Math.min(1, scrollProgress));

  // Map to target frame (0 to 205)
  targetFrame = scrollProgress * (FRAME_COUNT - 1);

  // Dynamic fade-out and slide-up of the heading overlay (fully faded by 30% scroll progress)
  const headerOverlay = document.getElementById('scroll-header-overlay');
  if (headerOverlay) {
    const fadeThreshold = 0.3; // 30% scroll threshold
    if (scrollProgress <= fadeThreshold) {
      const ratio = scrollProgress / fadeThreshold;
      const opacity = 1 - ratio;
      const translateY = -ratio * 80; // Translate up by 80px for standard sleek flow

      headerOverlay.style.opacity = opacity;
      headerOverlay.style.transform = `translateY(${translateY}px)`;
      headerOverlay.style.visibility = 'visible';
    } else {
      headerOverlay.style.opacity = 0;
      headerOverlay.style.transform = 'translateY(-80px)';
      headerOverlay.style.visibility = 'hidden';
    }
  }

  // Handle descriptive glass cards fade-in/out and slide-in from sides (from 40% to 100% scroll progress)
  const chassisCard = document.getElementById('card-chassis');
  const opticsCard = document.getElementById('card-optics');
  const hingesCard = document.getElementById('card-hinges');

  // Helper function to animate card based on active range with smooth margins
  function animateScrollCard(card, start, end, slideDirection) {
    if (!card) return;
    if (scrollProgress >= start && scrollProgress < end) {
      const range = end - start;
      const progress = scrollProgress - start;
      const ratio = progress / range;

      // Calculate smooth bell-curve for visibility (rise, rest, and fall)
      let opacity = 1;
      const transitionPadding = 0.15; // 15% edge range for transitions

      if (ratio < transitionPadding) {
        opacity = ratio / transitionPadding; // Fade-in
      } else if (ratio > 1 - transitionPadding) {
        opacity = (1 - ratio) / transitionPadding; // Fade-out
      }

      // Proportional slide offset based on opacity
      const maxSlideOffset = slideDirection === 'left' ? -50 : 50;
      const currentSlideOffset = maxSlideOffset * (1 - opacity);

      card.style.opacity = opacity;
      card.style.transform = `translateX(${currentSlideOffset}px)`;
      card.style.pointerEvents = 'auto';
    } else {
      // Deactivated reset state
      const resetSlideOffset = slideDirection === 'left' ? -50 : 50;
      card.style.opacity = 0;
      card.style.transform = `translateX(${resetSlideOffset}px)`;
      card.style.pointerEvents = 'none';
    }
  }

  // Animate the three cards over their respective ranges (40% - 100% progress)
  animateScrollCard(chassisCard, 0.25, 0.5, 'left');
  animateScrollCard(opticsCard, 0.5, 0.75, 'right');
  animateScrollCard(hingesCard, 0.75, 1.0, 'left');
}

window.addEventListener('scroll', updateScrollState);

// Main Smooth Rendering Loop
function renderLoop() {
  // Linear interpolation (lerp) for liquid smooth frame transition
  const diff = targetFrame - currentFrame;

  if (Math.abs(diff) > 0.05) {
    currentFrame += diff * scrollLerpFactor;
    renderFrame(scrollCtx, scrollCanvas, currentFrame);
  }

  requestAnimationFrame(renderLoop);
}

// ----------------------------------------------------
// Initialize
// ----------------------------------------------------
preloadFrames();
