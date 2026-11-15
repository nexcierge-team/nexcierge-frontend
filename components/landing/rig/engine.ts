// The hero's 3D rig: three example machines drawn as engineering
// linework (hidden-line style: ink edges over paper-coloured surfaces,
// with a few machine-paint panels). Loaded lazily by HeroRig, so three.js
// never sits in the page's first-load bundle.
//
// The engine owns its own <canvas> and leader-line <svg> (appended to the
// host, removed on dispose) and nothing else in the DOM. Callout text is
// React's; the engine only reads the callouts' boxes to aim leader lines.

import * as T from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";

export interface RigOptions {
  // The rig box. Must be position: relative with a definite size.
  host: HTMLElement;
  // The four callout elements, in spec order.
  callouts: HTMLElement[];
  // prefers-reduced-motion: draw once, no animation loop.
  reduce: boolean;
  // A switch to machine `i` has started (update the tab state).
  onSelect: (i: number) => void;
  // Machine `i` is now the one on screen (update the callout specs).
  onActive: (i: number) => void;
}

export interface RigHandle {
  // Switch machines. Returns false if ignored (same machine, or busy).
  show: (i: number, picked?: boolean) => boolean;
  isBusy: () => boolean;
  isVisible: () => boolean;
  dispose: () => void;
}

const C = {
  ink: 0x0e2440,
  paper: 0xe7ebe6,
  paint: 0xffc62b,
  tone: 0xc7d0cf,
  grid: 0xa9b6bd,
};

type Fill = T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>;
type Pose = (t: number, e: number, idle: number) => void;

interface Part {
  draw: LineSegments2[];
  fills: Fill[];
  // Fills start paper-coloured and are painted in during the intro.
  late: boolean;
}
interface Model extends Part {
  group: T.Group;
  anchors: T.Object3D[];
  pose: Pose;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
const easeIn = (x: number) => x * x;

interface Tween {
  at: number | null; // start timestamp (ms), fixed on the first frame seen
  delay: number;
  dur: number;
  ease: (x: number) => number;
  update: (v: number) => void;
  done?: () => void;
}

const NS = "http://www.w3.org/2000/svg";

/** Builds the rig. Returns null when WebGL is unavailable. */
export function createRig(opts: RigOptions): RigHandle | null {
  const { host, callouts: calloutEls, reduce } = opts;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;z-index:0";

  let renderer: T.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1;transition:opacity .3s";

  host.prepend(canvas, svg);

  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, -100, 200);
  const lineMat = new LineMaterial({ color: C.ink, linewidth: 1.6 });
  const gridMat = new LineMaterial({ color: C.grid, linewidth: 1 });
  const root = new T.Group();
  scene.add(root);

  const base: Part = { draw: [], fills: [], late: false };
  const models: Model[] = [];
  let cur: Part = base;

  // ── Geometry helpers ────────────────────────────────────────
  const lines = (arr: number[], parent: T.Object3D, mat?: LineMaterial) => {
    const g = new LineSegmentsGeometry();
    g.setPositions(arr);
    const l = new LineSegments2(g, mat ?? lineMat);
    l.userData.total = arr.length / 6;
    parent.add(l);
    cur.draw.push(l);
    return l;
  };
  const solid = (geo: T.BufferGeometry, parent: T.Object3D, paint?: number) => {
    const m: Fill = new T.Mesh(
      geo,
      new T.MeshBasicMaterial({
        color: cur.late ? C.paper : (paint ?? C.paper),
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    );
    m.userData.paint = paint ?? null;
    parent.add(m);
    cur.fills.push(m);
    lines(Array.from(new T.EdgesGeometry(geo, 24).attributes.position.array), m);
    return m;
  };
  const model = (late = false): Model => {
    const group = new T.Group();
    root.add(group);
    const m: Model = {
      group,
      draw: [],
      fills: [],
      anchors: [],
      pose: () => {},
      late,
    };
    models.push(m);
    cur = m;
    return m;
  };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new T.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return g;
  };
  const drum = (r: number, h: number, x: number, y: number, z: number, n = 24) => {
    const g = new T.CylinderGeometry(r, r, h, n);
    g.translate(x, y, z);
    return g;
  };
  const prism = (pts: number[][], depth: number, z = 0) => {
    const s = new T.Shape(pts.map((p) => new T.Vector2(p[0], p[1])));
    const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, z - depth / 2);
    return g;
  };
  // Circle outline: upright (x-y plane) or flat (x-z plane).
  const ring = (cx: number, cy: number, r: number, z: number, n = 20, flat = false) => {
    const a: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = (i / n) * Math.PI * 2;
      const q = ((i + 1) / n) * Math.PI * 2;
      if (flat)
        a.push(cx + Math.cos(p) * r, z, cy + Math.sin(p) * r, cx + Math.cos(q) * r, z, cy + Math.sin(q) * r);
      else
        a.push(cx + Math.cos(p) * r, cy + Math.sin(p) * r, z, cx + Math.cos(q) * r, cy + Math.sin(q) * r, z);
    }
    return a;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, z: number) => [
    x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z,
  ];
  const anchor = (parent: T.Object3D, x: number, y: number, z: number) => {
    const o = new T.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const va = new T.Vector3();
  const vb = new T.Vector3();
  const vm = new T.Vector3();
  const vd = new T.Vector3();
  const UP = new T.Vector3(0, 1, 0);

  // ── Floor grid ──────────────────────────────────────────────
  {
    const a: number[] = [];
    for (let x = -4; x <= 11; x++) a.push(x, 0, -3, x, 0, 3);
    for (let z = -3; z <= 3; z++) a.push(-4, 0, z, 11, 0, z);
    lines(a, root, gridMat);
  }

  // ── 1. Crawler excavator, 21 t class ────────────────────────
  {
    const M = model(true);
    const under = new T.Group();
    M.group.add(under);
    const trackShape = (L: number, H: number) => {
      const r = H / 2;
      const s = new T.Shape();
      s.moveTo(-L / 2 + r, 0);
      s.lineTo(L / 2 - r, 0);
      s.absarc(L / 2 - r, r, r, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(-L / 2 + r, H);
      s.absarc(-L / 2 + r, r, r, Math.PI / 2, Math.PI * 1.5, false);
      return s;
    };
    for (const z of [1.1, -1.1]) {
      const g = new T.ExtrudeGeometry(trackShape(4.4, 0.95), {
        depth: 0.6,
        bevelEnabled: false,
        curveSegments: 14,
      });
      g.translate(0, 0, z - 0.3);
      solid(g, under, C.tone);
      const face = z > 0 ? z + 0.305 : z - 0.305;
      let w: number[] = [];
      w = w.concat(
        ring(-1.72, 0.475, 0.34, face),
        ring(1.72, 0.475, 0.34, face),
        ring(-1.72, 0.475, 0.12, face, 10),
        ring(1.72, 0.475, 0.12, face, 10),
      );
      for (let x = -1.1; x <= 1.11; x += 0.55) w = w.concat(ring(x, 0.2, 0.13, face, 10));
      lines(w, under);
    }
    solid(box(2.3, 0.42, 1.7, 0, 0.6, 0), under);
    solid(drum(0.95, 0.22, 0, 1.02, 0, 28), under);

    const upper = new T.Group();
    upper.position.y = 1.13;
    M.group.add(upper);
    solid(box(4.1, 0.28, 2.6, -0.55, 0.14, 0), upper, C.paint);
    solid(box(2.25, 1.0, 2.6, -1.45, 0.78, 0), upper, C.paint);
    solid(box(0.5, 1.18, 2.6, -2.82, 0.59, 0), upper, C.tone);
    solid(box(0.14, 0.5, 0.14, -1.7, 1.53, -0.8), upper);
    solid(box(0.55, 0.62, 0.8, 1.05, 0.59, -0.35), upper, C.tone);
    solid(prism([[-0.25, 0.28], [1.3, 0.28], [1.3, 1.25], [1.02, 2.08], [-0.25, 2.08]], 1.0, 0.78), upper);
    lines(
      [
        -0.12, 1.05, 1.285, 1.17, 1.05, 1.285, 1.17, 1.05, 1.285, 1.17, 1.28, 1.285,
        1.17, 1.28, 1.285, 0.95, 1.94, 1.285, 0.95, 1.94, 1.285, -0.12, 1.94, 1.285,
        -0.12, 1.94, 1.285, -0.12, 1.05, 1.285, 0.5, 0.38, 1.285, 0.5, 1.94, 1.285,
      ],
      upper,
    );
    {
      const a: number[] = [];
      for (let y = 0.62; y < 1.2; y += 0.14) a.push(-2.2, y, 1.305, -1.0, y, 1.305);
      lines(a, upper);
    }

    const boom = new T.Group();
    boom.position.set(0.95, 0.8, -0.35);
    upper.add(boom);
    solid(
      prism([[-0.15, -0.3], [2.8, 0.72], [5.6, 0.02], [5.76, 0.22], [5.6, 0.42], [2.8, 1.5], [-0.15, 0.38]], 0.5),
      boom,
      C.paint,
    );
    const arm = new T.Group();
    arm.position.set(5.6, 0.22, 0);
    boom.add(arm);
    solid(
      prism([[-0.75, 0.42], [0.1, 0.42], [2.9, 0.14], [3.0, 0], [2.9, -0.14], [0, -0.3], [-0.45, -0.1]], 0.4),
      arm,
      C.paint,
    );
    const bucket = new T.Group();
    bucket.position.set(2.9, 0, 0);
    arm.add(bucket);
    solid(
      prism([[0, 0.22], [0.55, 0.5], [1.05, 0.3], [1.3, -0.2], [1.1, -0.8], [0.78, -0.45], [0.35, -0.28], [0, -0.2]], 1.0),
      bucket,
      C.tone,
    );

    // Hydraulic cylinders are stretched between two anchors every frame.
    const struts: { a: T.Object3D; b: T.Object3D; barrel: Fill; rod: Fill }[] = [];
    const strut = (a: T.Object3D, b: T.Object3D, thick: number) => {
      const mk = (t: number) => solid(new T.BoxGeometry(t, 1, t), upper);
      struts.push({ a, b, barrel: mk(thick), rod: mk(thick * 0.55) });
    };
    for (const z of [-0.33, 0.33])
      strut(anchor(upper, 1.2, 0.5, -0.35 + z), anchor(boom, 2.35, 0.66, z), 0.17);
    strut(anchor(boom, 3.0, 1.52, 0), anchor(arm, -0.7, 0.4, 0), 0.17);
    strut(anchor(arm, 0.35, 0.42, 0), anchor(bucket, 0.22, 0.38, 0), 0.14);
    const seg = (mesh: T.Object3D, p: T.Vector3, q: T.Vector3) => {
      vd.subVectors(q, p);
      const len = vd.length();
      mesh.position.copy(p).addScaledVector(vd, 0.5);
      mesh.scale.set(1, len, 1);
      mesh.quaternion.setFromUnitVectors(UP, vd.normalize());
    };
    M.anchors = [
      anchor(upper, -1.5, 1.3, 0.4),
      anchor(boom, 2.8, 1.2, 0.25),
      anchor(under, -1.2, 0.5, 1.42),
      anchor(bucket, 0.8, -0.1, 0.5),
    ];
    M.pose = (_t, e, idle) => {
      boom.rotation.z = lerp(0.56, 0.2, e) + idle * 0.012;
      arm.rotation.z = lerp(-1.95, -1.08, e) + idle * 0.02;
      bucket.rotation.z = lerp(0.3, -0.4, e) + idle * 0.03;
      upper.rotation.y = lerp(0, -0.4, e);
      root.updateMatrixWorld(true);
      for (const s of struts) {
        s.a.getWorldPosition(va);
        s.b.getWorldPosition(vb);
        upper.worldToLocal(va);
        upper.worldToLocal(vb);
        vm.lerpVectors(va, vb, 0.56);
        seg(s.barrel, va, vm);
        seg(s.rod, vm, vb);
      }
    };
  }

  // ── 2. Four-head liquid filling machine (metres, scaled up) ──
  {
    const M = model();
    const g = M.group;
    g.position.set(2.7, 0, 0);
    g.scale.setScalar(2.5);
    for (const p of [[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]])
      solid(box(0.08, 0.12, 0.08, p[0], 0.06, p[1]), g, C.tone);
    solid(box(1.8, 0.68, 0.72, 0, 0.46, 0), g);
    lines(
      rect(-0.82, 0.2, -0.04, 0.72, 0.362).concat(rect(0.04, 0.2, 0.82, 0.72, 0.362), [
        -0.12, 0.4, 0.362, -0.12, 0.52, 0.362, 0.12, 0.4, 0.362, 0.12, 0.52, 0.362,
      ]),
      g,
    );
    solid(box(2.5, 0.06, 0.24, 0, 0.83, 0.2), g, C.tone);
    lines([-1.25, 0.96, 0.31, 1.25, 0.96, 0.31, -1.25, 0.96, 0.09, 1.25, 0.96, 0.09], g);
    for (const x of [-0.5, 0.5]) solid(box(0.08, 1.02, 0.08, x, 1.31, -0.2), g);
    solid(box(1.2, 0.1, 0.1, 0, 1.82, -0.2), g);
    solid(drum(0.27, 0.42, 0, 2.08, -0.2, 24), g, C.paint);
    solid(drum(0.06, 0.06, 0, 2.32, -0.2, 12), g, C.tone);
    solid(box(0.05, 0.5, 0.05, 0.8, 1.05, -0.25), g);
    solid(box(0.34, 0.3, 0.07, 0.8, 1.44, -0.22), g, C.tone);
    lines(
      rect(0.67, 1.36, 0.93, 1.54, -0.184).concat(
        ring(0.72, 1.33, 0.012, -0.184, 6),
        ring(0.8, 1.33, 0.012, -0.184, 6),
      ),
      g,
    );
    const head = new T.Group();
    g.add(head);
    solid(box(0.8, 0.12, 0.16, 0, 0, 0.2), head, C.paint);
    for (const x of [-0.36, 0.36]) solid(box(0.05, 0.05, 0.3, x, 0, -0.03), head);
    for (const x of [-0.24, -0.08, 0.08, 0.24]) solid(box(0.03, 0.2, 0.03, x, -0.16, 0.2), head);
    const bottles: T.Group[] = [];
    for (let k = 0; k < 14; k++) {
      const b = new T.Group();
      b.position.set(0, 0.86, 0.2);
      g.add(b);
      solid(box(0.09, 0.2, 0.09, 0, 0.1, 0), b);
      solid(box(0.04, 0.04, 0.04, 0, 0.22, 0), b, C.paint);
      bottles.push(b);
    }
    M.anchors = [
      anchor(head, -0.24, -0.24, 0.22),
      anchor(head, 0.36, 0.04, 0.28),
      anchor(g, -1.0, 0.92, 0.32),
      anchor(g, 0.8, 1.44, -0.18),
    ];
    M.pose = (t) => {
      // Index one pitch, dwell while the nozzles dip, repeat.
      const c = t * 0.45;
      const u = c - Math.floor(c);
      const mv = Math.min(u / 0.4, 1);
      const ease = mv * mv * (3 - 2 * mv);
      const off = (Math.floor(c) + ease) * 0.16;
      bottles.forEach((b, k) => {
        b.position.x = ((((k * 0.16 + off) % 2.24) + 2.24) % 2.24) - 1.04;
      });
      const d = u < 0.45 ? 0 : Math.sin(((u - 0.45) / 0.55) * Math.PI);
      head.position.y = 1.42 - 0.09 * d;
    };
  }

  // ── 3. Benchtop laboratory centrifuge (decimetres) ──────────
  {
    const M = model();
    const g = M.group;
    g.position.set(2.7, 0, 0);
    g.scale.setScalar(0.96);
    for (const p of [[-1.4, -1.6], [1.4, -1.6], [-1.4, 1.6], [1.4, 1.6]])
      solid(box(0.4, 0.16, 0.4, p[0], 0.08, p[1]), g, C.tone);
    solid(box(3.4, 1.9, 4.0, 0, 1.11, 0), g);
    lines(
      rect(-1.3, 1.05, 0.1, 1.7, 2.002).concat(
        ring(0.75, 1.38, 0.3, 2.002, 16),
        ring(0.75, 1.38, 0.06, 2.002, 6),
        ring(1.3, 1.6, 0.1, 2.002, 8),
        ring(1.3, 1.18, 0.1, 2.002, 8),
        [-1.1, 1.48, 2.002, -0.5, 1.48, 2.002, -1.1, 1.28, 2.002, -0.1, 1.28, 2.002],
      ),
      g,
    );
    {
      const a: number[] = [];
      for (let z = -1.2; z <= 0.01; z += 0.2) a.push(1.702, 0.5, z, 1.702, 1.0, z);
      lines(a, g);
    }
    lines(ring(0, -0.2, 1.42, 2.062, 28, true), g);
    const rotor = new T.Group();
    rotor.position.set(0, 2.06, -0.2);
    g.add(rotor);
    solid(drum(1.18, 0.3, 0, 0.15, 0, 28), rotor, C.tone);
    solid(drum(0.3, 0.24, 0, 0.42, 0, 16), rotor, C.paint);
    {
      let a: number[] = [];
      for (let i = 0; i < 12; i++) {
        const p = (i / 12) * Math.PI * 2;
        a = a.concat(ring(Math.cos(p) * 0.82, Math.sin(p) * 0.82, 0.12, 0.302, 8, true));
      }
      lines(a, rotor);
    }
    const lid = new T.Group();
    lid.position.set(0, 2.06, -1.95);
    g.add(lid);
    solid(box(3.4, 0.3, 3.9, 0, 0.15, 1.95), lid, C.paint);
    lines(ring(0, 1.75, 1.0, 0.302, 24, true).concat([-0.5, 0.15, 3.902, 0.5, 0.15, 3.902]), lid);
    M.anchors = [
      anchor(g, -0.7, 2.38, 0.4),
      anchor(g, 1.05, 2.38, -0.5),
      anchor(g, -0.6, 1.4, 2.0),
      anchor(g, 1.7, 0.75, 0.9),
    ];
    let spin = 0;
    let last = 0;
    M.pose = (t, e) => {
      lid.rotation.x = -lerp(1.0, 0.56, e);
      spin += clamp(t - last, 0, 0.1) * lerp(0.5, 7, e);
      last = t;
      rotor.rotation.y = spin;
    };
  }

  models.forEach((m, i) => {
    m.group.visible = i === 0;
  });

  // ── Camera ──────────────────────────────────────────────────
  const target = new T.Vector3(3.0, 2.35, 0);
  const dir = new T.Vector3(0.52, 0.4, 1).normalize();
  cam.position.copy(target).addScaledVector(dir, 60);
  cam.lookAt(target);

  // ── Callout leaders ─────────────────────────────────────────
  const callouts = calloutEls.map((node) => {
    const line = document.createElementNS(NS, "line");
    line.setAttribute("stroke", "#0E2440");
    line.setAttribute("stroke-width", "1");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "3.5");
    dot.setAttribute("fill", "#FFC62B");
    dot.setAttribute("stroke", "#0E2440");
    dot.setAttribute("stroke-width", "1.25");
    svg.append(line, dot);
    return { node, line, dot, rect: null as null | { l: number; t: number; r: number; b: number } };
  });

  let active = 0;
  let W = 0;
  let H = 0;
  let disposed = false;

  function measure() {
    const r = host.getBoundingClientRect();
    for (const c of callouts) {
      const b = c.node.getBoundingClientRect();
      c.rect = { l: b.left - r.left, t: b.top - r.top, r: b.right - r.left, b: b.bottom - r.top };
    }
  }
  function size() {
    W = host.clientWidth;
    H = host.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    lineMat.resolution.set(W, H);
    gridMat.resolution.set(W, H);
    lineMat.linewidth = W < 520 ? 1.3 : 1.6;
    const a = W / H;
    const hh = Math.max(3.75, 5.5 / a);
    cam.left = -hh * a;
    cam.right = hh * a;
    cam.top = hh;
    cam.bottom = -hh;
    cam.updateProjectionMatrix();
    measure();
  }

  // p: eased scroll progress through the hero; mx: eased pointer x.
  const state = { p: 0, pt: 0, mx: 0, mxt: 0 };

  function leaders() {
    const anchors = models[active].anchors;
    callouts.forEach((c, i) => {
      const a = anchors[i];
      if (!c.rect || !a) return;
      va.setFromMatrixPosition(a.matrixWorld).project(cam);
      const x = (va.x * 0.5 + 0.5) * W;
      const y = (-va.y * 0.5 + 0.5) * H;
      const lx = clamp(x, c.rect.l, c.rect.r);
      const ly = clamp(y, c.rect.t, c.rect.b);
      c.line.setAttribute("x1", String(lx));
      c.line.setAttribute("y1", String(ly));
      c.line.setAttribute("x2", String(x));
      c.line.setAttribute("y2", String(y));
      c.dot.setAttribute("cx", String(x));
      c.dot.setAttribute("cy", String(y));
    });
  }

  // ── Tweens, advanced inside the render loop ─────────────────
  // (So they pause for free when the rig is offscreen or the tab hidden.)
  const tweens: Tween[] = [];
  function tween(
    dur: number,
    ease: (x: number) => number,
    update: (v: number) => void,
    done?: () => void,
    delay = 0,
  ) {
    tweens.push({ at: null, delay: delay * 1000, dur: dur * 1000, ease, update, done });
    kick();
  }
  function stepTweens(now: number) {
    for (let i = 0; i < tweens.length; i++) {
      const tw = tweens[i];
      if (tw.at == null) tw.at = now + tw.delay;
      if (now < tw.at) continue;
      const x = clamp((now - tw.at) / tw.dur, 0, 1);
      tw.update(tw.ease(x));
      if (x >= 1) {
        tweens.splice(i--, 1);
        tw.done?.();
      }
    }
  }

  function render(now: number) {
    const t = reduce ? 0 : now / 1000;
    const e = state.p * state.p * (3 - 2 * state.p);
    root.rotation.y = -0.36 - 0.2 * e + state.mx * 0.16;
    models[active].pose(t, e, reduce ? 0 : Math.sin(t * 0.7));
    renderer.render(scene, cam);
    leaders();
  }

  let raf = 0;
  let visible = true;
  function frame(now: number) {
    raf = 0;
    if (disposed) return;
    state.p += (state.pt - state.p) * 0.09;
    state.mx += (state.mxt - state.mx) * 0.06;
    stepTweens(now);
    render(now);
    if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  // ── Observers and listeners ─────────────────────────────────
  const ro = new ResizeObserver(() => {
    size();
    kick();
  });
  ro.observe(host);
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible) kick();
  });
  io.observe(host);

  const hero = host.closest("header") ?? host;
  const onScroll = () => {
    state.pt = clamp(window.scrollY / (hero as HTMLElement).offsetHeight, 0, 1);
  };
  const onPointer = (ev: PointerEvent) => {
    state.mxt = (ev.clientX / window.innerWidth - 0.5) * 2;
  };
  const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  document.addEventListener("visibilitychange", kick);
  if (!reduce) {
    window.addEventListener("scroll", onScroll, { passive: true });
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });
  }
  size();

  // ── Plotting a model in and out ─────────────────────────────
  // The plotter lays the linework first, then the surfaces fill in and
  // hide the back edges.
  const ghost = (M: Part, o: number) => {
    for (const m of M.fills) {
      if (!m.material.transparent) {
        m.material.transparent = true;
        m.material.needsUpdate = true;
      }
      m.material.opacity = o;
    }
  };
  const full = (M: Part) => {
    for (const l of M.draw) l.geometry.instanceCount = Infinity;
    for (const m of M.fills) {
      m.material.opacity = 1;
      m.material.transparent = false;
      m.material.needsUpdate = true;
      if (m.userData.paint) m.material.color.setHex(m.userData.paint);
    }
  };
  const plot = (list: LineSegments2[], v: number) => {
    const n = list.length;
    list.forEach((l, i) => {
      const t = clamp(v * 1.7 - (0.7 * i) / n, 0, 1);
      l.geometry.instanceCount = Math.ceil(l.userData.total * t);
    });
  };

  let busy = false;
  if (!reduce) {
    const first = models[0];
    const all = base.draw.concat(first.draw);
    busy = true;
    plot(all, 0);
    ghost(first, 0);
    svg.style.opacity = "0";
    const d = 0.15;
    tween(1.7, easeInOut, (v) => plot(all, v), undefined, d);
    tween(0.5, easeOut, (v) => ghost(first, v), undefined, d + 1.45);
    first.fills
      .filter((m) => m.userData.paint)
      .forEach((m, i) => {
        const from = m.material.color.clone();
        const to = new T.Color(m.userData.paint as number);
        tween(0.45, easeOut, (v) => m.material.color.copy(from).lerp(to, v), undefined, d + 2.0 + i * 0.06);
      });
    tween(
      0.3,
      easeOut,
      () => {},
      () => {
        full(base);
        full(first);
        measure();
        svg.style.opacity = "1";
        busy = false;
      },
      d + 2.6,
    );
  } else {
    full(base);
    full(models[0]);
  }
  kick();

  // ── Switching machines ──────────────────────────────────────
  let picked = false;
  function show(i: number, byUser = false): boolean {
    if (byUser) picked = true;
    if (i === active || busy || disposed || !models[i]) return false;
    const A = models[active];
    const B = models[i];
    opts.onSelect(i);
    if (reduce) {
      A.group.visible = false;
      B.group.visible = true;
      full(B);
      active = i;
      opts.onActive(i);
      requestAnimationFrame(() => {
        measure();
        kick();
      });
      return true;
    }
    busy = true;
    host.dataset.rig = "busy";
    svg.style.opacity = "0";
    tween(
      0.42,
      easeIn,
      (x) => {
        const o = 1 - x;
        for (const l of A.draw) l.geometry.instanceCount = Math.ceil(l.userData.total * o);
        ghost(A, o);
      },
      () => {
        A.group.visible = false;
        B.group.visible = true;
        active = i;
        opts.onActive(i);
        plot(B.draw, 0);
        ghost(B, 0);
        tween(
          1,
          easeInOut,
          (p) => {
            plot(B.draw, p);
            ghost(B, clamp(p * 2.2 - 1.2, 0, 1));
          },
          () => {
            full(B);
            measure();
            busy = false;
            host.dataset.rig = "ready";
            svg.style.opacity = "1";
          },
        );
      },
    );
    return true;
  }

  // Cycle through the machines until the visitor picks one or scrolls on.
  const cycle = reduce
    ? 0
    : window.setInterval(() => {
        if (visible && !document.hidden && !picked && window.scrollY < 200)
          show((active + 1) % models.length);
      }, 8000);

  host.dataset.rig = "ready";

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    if (cycle) window.clearInterval(cycle);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", kick);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointer);
    scene.traverse((o) => {
      const mesh = o as T.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    svg.remove();
    delete host.dataset.rig;
  }

  return {
    show,
    isBusy: () => busy,
    isVisible: () => visible,
    dispose,
  };
}
