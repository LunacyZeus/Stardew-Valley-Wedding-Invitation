// 打开页面时始终停留在第一屏，避免浏览器恢复滚动位置或 hash 跳转
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function forceScrollTop() {
  if (!document.body.classList.contains('blessing-locked')) return;

  // 临时关闭平滑滚动，确保复位是瞬时的，不会被 smooth 动画带偏
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  html.style.scrollBehavior = prev;
}

window.addEventListener('pageshow', () => {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  // 浏览器可能在 pageshow 之后才恢复滚动位置，用双重 rAF 覆盖
  requestAnimationFrame(() => requestAnimationFrame(forceScrollTop));
});

window.addEventListener('load', () => {
  setTimeout(forceScrollTop, 60);
});

const dots = Array.from(document.querySelectorAll('.dot'));
const sections = Array.from(document.querySelectorAll('.screen'));
const toast = document.querySelector('.toast');
const bgm = document.querySelector('#bgm');
const musicToggle = document.querySelector('[data-music-toggle]');
const musicHeart = document.querySelector('[data-music-heart]');
const spriteParade = document.querySelector('[data-sprite-parade]');
const weddingCountdown = document.querySelector('[data-wedding-countdown]');
const countdownDays = document.querySelector('[data-countdown-days]');

const WEDDING_DATE = Date.UTC(2026, 7, 23);
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const SPRITE_SHEET_URL = './sprite.png';
const CAR_IMAGE_URL = './car.png';
const SPRITE_GRID_COLUMNS = 3;
const SPRITE_GRID_ROWS = 3;
const SPRITE_ACTORS = {
  orangeCat: { grid: [0, 0], side: 'left', left: '5%', top: '66%', size: 90, delay: 40 },
  blackCat: { grid: [1, 0], side: 'right', left: '74%', top: '66%', size: 90, delay: 80 },

  roseDove: { grid: [2, 0], side: 'right', left: '81%', top: '30%', size: 82, delay: 140, flip: true },
  violetDove: { grid: [0, 1], side: 'left', left: '3%', top: '31%', size: 82, delay: 180 },

  peach: { grid: [1, 1], side: 'left', left: '4%', top: '78%', size: 60, delay: 220 },
  blueApple: { grid: [2, 1], side: 'right', left: '87%', top: '78%', size: 60, delay: 260, flip: true },
  
  grapeCluster: { grid: [0, 2], side: 'left', left: '4%', top: '86%', size: 68, delay: 300, flip: true },
  grape: { grid: [1, 2], side: 'right', left: '85%', top: '86%', size: 62, delay: 340 },
};

function preventLockedScroll(event) {
  if (document.body.classList.contains('blessing-locked')) {
    event.preventDefault();
  }
}

window.addEventListener('touchmove', preventLockedScroll, { passive: false });
window.addEventListener('wheel', preventLockedScroll, { passive: false });

const observer = new IntersectionObserver((entries) => {
  const visibleEntry = entries
    .filter((entry) => entry.isIntersecting)
    .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

  entries.forEach((entry) => {
    entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });

  if (!visibleEntry) return;

  const index = sections.indexOf(visibleEntry.target);
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === index);
  });
}, { threshold: 0.58 });

sections.forEach((section) => observer.observe(section));

prepareSpriteActors();
prepareCarIcon();
updateWeddingCountdown();
window.setInterval(updateWeddingCountdown, 60 * 60 * 1000);

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.dataset.copy;

    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制地址');
    } catch {
      showToast(text);
    }
  });
});

musicToggle.addEventListener('click', async () => {
  if (!bgm.paused) {
    bgm.pause();
    return;
  }

  try {
    await bgm.play();
    hideMusicHeart();
  } catch {
    showToast('请再次点击开启音乐');
  }
});

musicHeart.addEventListener('click', async (event) => {
  event.preventDefault();
  event.stopPropagation();
  musicHeart.classList.add('is-activating');

  try {
    await bgm.play();
    unlockBlessing();
    activateSpriteParade();
    window.setTimeout(hideMusicHeart, 720);
  } catch {
    musicHeart.classList.remove('is-activating');
    showToast('请再次点击开启音乐');
  }
});

bgm.addEventListener('pause', () => updateMusicState(false));
bgm.addEventListener('play', () => updateMusicState(true));

function updateMusicState(isPlaying) {
  musicToggle.classList.toggle('is-playing', isPlaying);
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
  musicToggle.setAttribute('aria-label', isPlaying ? '暂停背景音乐' : '播放背景音乐');
}

function updateWeddingCountdown() {
  if (!weddingCountdown || !countdownDays) return;

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(today.map(({ type, value }) => [type, value]));
  const todayUtc = Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day));
  const daysRemaining = Math.ceil((WEDDING_DATE - todayUtc) / (24 * 60 * 60 * 1000));

  if (daysRemaining === 0) {
    countdownDays.textContent = '今天';
    weddingCountdown.querySelector('.wedding-countdown__label').textContent = '今天就是婚礼日';
    weddingCountdown.querySelector('.wedding-countdown__unit').textContent = '';
    weddingCountdown.classList.add('is-today');
    return;
  }

  if (daysRemaining < 0) {
    countdownDays.textContent = '已到';
    weddingCountdown.querySelector('.wedding-countdown__label').textContent = '婚礼日已到';
    weddingCountdown.querySelector('.wedding-countdown__unit').textContent = '';
    weddingCountdown.classList.add('is-today');
    return;
  }

  countdownDays.textContent = String(daysRemaining);
}

async function prepareCarIcon() {
  const carIcon = document.querySelector('.travel-icon--car');
  if (!carIcon) return;

  const carImage = await loadImage(CAR_IMAGE_URL);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = carImage.naturalWidth;
  canvas.height = carImage.naturalHeight;
  context.drawImage(carImage, 0, 0);
  clearConnectedBackground(context, canvas.width, canvas.height);
  carIcon.style.backgroundImage = `url("${trimCanvas(canvas).toDataURL('image/png')}")`;
}

async function prepareSpriteActors() {
  const spriteSheet = await loadImage(SPRITE_SHEET_URL);

  Object.entries(SPRITE_ACTORS).forEach(([name, actor]) => {
    const image = document.createElement('img');
    image.className = `sprite-actor sprite-actor--${name}`;
    image.alt = '';
    image.src = cropSprite(spriteSheet, actor.grid[0], actor.grid[1]);
    image.style.left = actor.left;
    image.style.top = actor.top;
    image.style.setProperty('--sprite-size', `${actor.size}px`);
    image.style.setProperty('--sprite-delay', `${actor.delay}ms`);
    image.style.setProperty('--sprite-flip', actor.flip ? '-1' : '1');
    image.style.setProperty('--sprite-start-x', actor.side === 'left' ? '-135vw' : '135vw');
    spriteParade.append(image);
    requestAnimationFrame(() => image.classList.add('is-ready'));
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', reject, { once: true });
    image.src = source;
  });
}

function cropSprite(spriteSheet, column, row) {
  const cellWidth = spriteSheet.naturalWidth / SPRITE_GRID_COLUMNS;
  const cellHeight = spriteSheet.naturalHeight / SPRITE_GRID_ROWS;
  const sourceX = Math.round(column * cellWidth);
  const sourceY = Math.round(row * cellHeight);
  const sourceWidth = Math.round(cellWidth);
  const sourceHeight = Math.round(cellHeight);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  context.drawImage(spriteSheet, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  clearCanvasBorder(context, sourceWidth, sourceHeight);
  clearConnectedBackground(context, sourceWidth, sourceHeight);

  return trimCanvas(canvas).toDataURL('image/png');
}

function clearCanvasBorder(context, width, height) {
  context.clearRect(0, 0, width, 8);
  context.clearRect(0, height - 8, width, 8);
  context.clearRect(0, 0, 8, height);
  context.clearRect(width - 8, 0, 8, height);
}

function trimCanvas(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return canvas;

  const padding = 3;
  const cropLeft = Math.max(0, left - padding);
  const cropTop = Math.max(0, top - padding);
  const cropWidth = Math.min(width - cropLeft, right - left + 1 + padding * 2);
  const cropHeight = Math.min(height - cropTop, bottom - top + 1 + padding * 2);
  const trimmed = document.createElement('canvas');
  const trimmedContext = trimmed.getContext('2d');

  trimmed.width = cropWidth;
  trimmed.height = cropHeight;
  trimmedContext.drawImage(canvas, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return trimmed;
}

function clearConnectedBackground(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const isBackground = (pixelIndex) => {
    const red = data[pixelIndex];
    const green = data[pixelIndex + 1];
    const blue = data[pixelIndex + 2];
    return red > 175 && green > 175 && blue > 175 && Math.max(red, green, blue) - Math.min(red, green, blue) < 28;
  };

  const enqueue = (x, y) => {
    const offset = y * width + x;
    const pixelIndex = offset * 4;
    if (visited[offset] || !isBackground(pixelIndex)) return;
    visited[offset] = 1;
    queue.push(offset);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const offset = queue[index];
    const x = offset % width;
    const y = Math.floor(offset / width);
    data[offset * 4 + 3] = 0;
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }

  context.putImageData(imageData, 0, 0);
}

function activateSpriteParade() {
  spriteParade.classList.add('is-active');
}

function hideMusicHeart() {
  musicHeart.classList.add('is-hidden');
}

function unlockBlessing() {
  document.body.classList.remove('blessing-locked');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}
