# Hand-Driven Particle Text Demo

A minimal interactive demo using Three.js and MediaPipe Hands.

Usage

- Open `index.html` in a modern browser (Chrome/Edge). For webcam access, serve the folder over a local web server (e.g. `npx http-server` or `python -m http.server`).
- Allow webcam access when prompted.
- Show 1–5 fingers to morph particles into the corresponding text (`ONE`..`FIVE`). Make a fist to repel particles.

Files

- `index.html` — App shell, includes Tailwind and MediaPipe scripts.
- `src/main.js` — Three.js scene, particle system, MediaPipe integration.

Notes

- This demo uses CDN builds for Three.js and MediaPipe; no install required.
- For best performance use a desktop browser and allow camera resolution 720p+.
