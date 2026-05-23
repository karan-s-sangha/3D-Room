# 3D Portfolio Room

An interactive 3D portfolio experience built with Three.js. A fully modelled and baked Blender room that runs in the browser — explore the space, hover over objects, and click on project cards to open detailed modals.

---

## Preview

> Orbit around the room using your mouse. Hover objects to see them scale up. Click project boards to view details. Double-click to go fullscreen.

---

## Features

- **3D Room** — Custom Blender scene exported as a GLB with four baked texture atlases (UV channel 1)
- **Loading Screen** — Animated intro with progress bar that tracks all assets (textures, cubemap, GLB)
- **Click to Enter** — User-triggered entry with a spring entrance animation for the entire room
- **Orbit Camera** — Mouse-controlled camera with configurable polar/azimuth limits and zoom bounds
- **Hover Effects** — Raycaster scales any hovered object up by 20% with smooth GSAP transitions
- **Project Modals** — Click project boards (Plane146–148) to open animated detail cards with title, description, image, and a GitHub link
- **Glass Material** — `MeshPhysicalMaterial` with transmission and cubemap reflections for window/glass surfaces
- **Screen Video** — Live video texture playing on the monitor mesh (Plane002)
- **GSAP Animations** — Fan blades spin, clock hands rotate, chair oscillates left and right
- **Background Music** — Looping audio that starts on user interaction with a pulsing toggle button
- **Fullscreen** — Double-click anywhere to toggle fullscreen

---

## Tech Stack

| Tool | Purpose |
|---|---|
| [Three.js r184](https://threejs.org/) | 3D rendering |
| [Vite](https://vitejs.dev/) | Dev server and bundler |
| [GSAP](https://greensock.com/gsap/) | All animations |
| [Blender](https://www.blender.org/) | 3D modelling and texture baking |

---

## Project Structure

```
3D Room/
├── public/
│   ├── room3.glb                 # Blender scene (GLB)
│   ├── texture1.png              # Baked atlas — walls, floors, desk
│   ├── texture2.png              # Baked atlas — chair, keyboard, cables
│   ├── texture3.png              # Baked atlas — plants, rug, monitors
│   ├── texture4.png              # Baked atlas — lights, decorations
│   ├── screen.mp4                # Video played on the monitor mesh
│   ├── Rubber_and_Brass.mp3      # Background music
│   ├── glass_reflection/         # Cubemap faces for glass reflections
│   │   ├── px.png  nx.png
│   │   ├── py.png  ny.png
│   │   └── pz.png  nz.png
│   ├── Netflix.png               # Project preview image
│   ├── Decked_Out_2.png          # Project preview image
│   ├── Library_Management.png    # Project preview image
│   └── three.png                 # Favicon
├── src/
│   └── main.js                   # All Three.js and UI logic
├── index.html                    # Entry point + all CSS
├── package.json
└── .gitignore
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

### Install

```bash
npm install
```

### Run (dev)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

Output goes to `dist/`.

---

## Adding or Editing Projects

Project data lives at the top of [`src/main.js`](src/main.js) in the `projects` object:

```js
const projects = {
  Plane146: {
    title: 'Netflix Clone',
    description: 'Your description here.',
    link: 'https://github.com/your-repo',
    image: '/Netflix.png',   // place image in public/
  },
  Plane147: { ... },
  Plane148: { ... },
};
```

- `Plane146`, `Plane147`, `Plane148` are the Blender object names of the three project boards in the room
- Drop preview images into `public/` and update the `image` field
- The modal appears on click; close with the × button, clicking outside, or `Escape`

---

## Camera Configuration

All camera and orbit settings are at the top of `src/main.js`:

```js
camera.position.set(21, 18, 22);   // starting position

controls.target.set(0, 4, 0);      // orbit focus point

controls.minDistance = 2;           // zoom limits
controls.maxDistance = 65;

controls.minPolarAngle = 0;         // vertical limits (radians)
controls.maxPolarAngle = Math.PI * 0.5;

controls.minAzimuthAngle = 0;       // horizontal limits (radians)
controls.maxAzimuthAngle = Math.PI * 0.5;
```

Comment out both azimuth lines to allow full 360° horizontal rotation.

---

## Hover Scale Exceptions

Objects that should not scale on hover are listed in `hoverExceptions` in `src/main.js`:

```js
const hoverExceptions = new Set([
  'Plane', 'Plane001', 'Plane002', ...
]);
```

Add any Blender object name to this set to opt it out of the hover effect.

---

## Entrance Animation

When the user clicks **Enter**, the room springs in from scale 0. Tweak the feel in `src/main.js`:

```js
gsap.fromTo(gltfRoot.scale,
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 1, z: 1, duration: 20, ease: 'elastic.out(1, 0.55)', delay: 0.3 }
);
// duration  — total animation length in seconds
// amplitude — first elastic.out param, controls overshoot size
// period    — second elastic.out param, lower = snappier
// delay     — wait time after intro collapses
```

---

## Blender Workflow Notes

- All materials are **baked** — the scene uses `MeshBasicMaterial` (unlit) so baked lighting is preserved exactly
- Textures bake to **UV channel 1** (second UV map in Blender); `texture.channel = 1` in Three.js matches this
- `flipY = false` is required for GLTF-exported UV coordinates
- Any mesh whose name contains `glass` (case-insensitive) automatically receives the `MeshPhysicalMaterial` glass shader

---

## License

MIT
