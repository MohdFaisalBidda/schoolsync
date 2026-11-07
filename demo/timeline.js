const SCENES = [
  { id: 's1', at: 0, title: true },
  { id: 's2', at: 7 },
  { id: 's3', at: 14 },
  { id: 's4', at: 28 },
  { id: 's5', at: 37 },
  { id: 's6', at: 43 },
  { id: 's7', at: 58 },
  { id: 's8', at: 72 },
  { id: 's9', at: 84.5, title: true },
];

const TOTAL_SECONDS = 96;
let startedAt = null;
let running = false;
let current = null;

function activate(scene) {
  if (current === scene.id) return;
  current = scene.id;
  document.querySelectorAll('.scene').forEach((element) => {
    element.classList.toggle('active', element.id === scene.id);
    element.classList.toggle('play', element.id === scene.id);
  });
  document.body.classList.toggle('title-mode', Boolean(scene.title));
  document.body.dataset.scene = scene.id;
}

function tick(now) {
  if (!running) return;
  const elapsed = (now - startedAt) / 1000;
  let target = SCENES[0];
  for (const scene of SCENES) {
    if (elapsed >= scene.at) target = scene;
  }
  activate(target);
  if (elapsed < TOTAL_SECONDS) requestAnimationFrame(tick);
}

function startDemo() {
  if (running) return;
  running = true;
  startedAt = performance.now();
  document.body.classList.add('running');
  activate(SCENES[0]);
  requestAnimationFrame(tick);
}

function showScene(id) {
  const scene = SCENES.find((entry) => entry.id === id);
  if (!scene) throw new Error(`Unknown scene: ${id}`);
  running = false;
  current = null;
  document.body.classList.remove('running');
  activate(scene);
}

function finishAnimations() {
  document.getAnimations().forEach((animation) => {
    try {
      animation.finish();
    } catch {
      animation.cancel();
    }
  });
}

window.startDemo = startDemo;
window.showScene = showScene;
window.finishAnimations = finishAnimations;
window.sceneTimes = SCENES;
window.demoSeconds = TOTAL_SECONDS;
