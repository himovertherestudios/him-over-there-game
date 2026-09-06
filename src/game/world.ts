import * as THREE from 'three';
import { LOTS, PARKING, FITS } from './data';

// ============================================================
// Shared materials / helpers
// ============================================================
export const M = (color: number, opts: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
};
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, seg = 8) =>
  new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

// ============================================================
// CHARACTER (Him Over There + client NPCs)
// ============================================================
export interface CharParts {
  group: THREE.Group;
  hips: THREE.Group; torso: THREE.Group; head: THREE.Group; locs: THREE.Group;
  armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group;
  eyeL: THREE.Mesh; eyeR: THREE.Mesh; lidL: THREE.Mesh; lidR: THREE.Mesh;
  catchL: THREE.Mesh; catchR: THREE.Mesh;
  mouth: THREE.Mesh;
  camera?: THREE.Group;
}

export interface CharOpts {
  fit?: string; locsTied?: boolean; skin?: number; hair?: number; tips?: number;
  beard?: boolean; gear?: boolean; outfit?: number; scale?: number; tattoos?: boolean;
}

export function buildCharacter(o: CharOpts = {}): CharParts {
  const fit = FITS.find((f) => f.id === (o.fit || 'photog')) || FITS[0];
  const skin = M(o.skin ?? 0x7a4b30);
  const shirt = M(o.outfit ?? fit.shirt);
  const pants = M(o.outfit ? 0x1e1e22 : fit.pants);
  const shoes = M(fit.shoes);
  const hairC = M(o.hair ?? 0x1a1410);
  const tipC = M(o.tips ?? 0xc79a4e);
  const dark = M(0x101012);
  const strap = M(fit.accent);

  const group = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  group.add(hips);

  // torso
  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(box(0.5, 0.62, 0.28, shirt, 0, 0.31));
  torso.add(box(0.44, 0.16, 0.26, shirt, 0, 0.66)); // shoulders/neck base
  torso.add(box(0.13, 0.12, 0.13, skin, 0, 0.74)); // neck

  if (o.gear !== false) {
    // camera harness strap across the chest
    const s = box(0.06, 0.62, 0.04, strap, 0, 0.34, 0.15);
    s.rotation.z = 0.42;
    torso.add(s);
    // camera on chest
    const camG = new THREE.Group();
    camG.position.set(0.02, 0.2, 0.2);
    camG.add(box(0.2, 0.13, 0.09, dark));
    const lens = cyl(0.055, 0.06, 0.13, M(0x1b1b1f), 10);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.1;
    camG.add(lens);
    torso.add(camG);
    // backpack
    torso.add(box(0.36, 0.46, 0.16, M(0x121214), 0, 0.34, -0.21));
  }

  // head
  const head = new THREE.Group();
  head.position.y = 0.86;
  torso.add(head);
  head.add(box(0.26, 0.3, 0.26, skin, 0, 0.13));
  // beard
  if (o.beard !== false) {
    head.add(box(0.24, 0.14, 0.2, M(0x18120e), 0, 0.04, 0.045));
  }
  // eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf2ece2 });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x140f0c });
  const mkEye = (x: number) => {
    const g = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), pupil);
    p.position.z = 0.022;
    g.add(white, p);
    g.position.set(x, 0.17, 0.125);
    head.add(g);
    return white;
  };
  const eyeL = mkEye(-0.062);
  const eyeR = mkEye(0.062);
  const mkLid = (x: number) => {
    const l = box(0.075, 0.038, 0.02, skin, x, 0.17, 0.152);
    l.visible = false;
    head.add(l);
    return l;
  };
  const lidL = mkLid(-0.062);
  const lidR = mkLid(0.062);
  const mkCatch = (x: number) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    c.position.set(x - 0.008, 0.181, 0.148);
    c.visible = false;
    head.add(c);
    return c;
  };
  const catchL = mkCatch(-0.062);
  const catchR = mkCatch(0.062);
  const mouth = box(0.09, 0.02, 0.02, M(0x2b1a14), 0, 0.075, 0.135);
  head.add(mouth);

  // hair / locs
  const locs = new THREE.Group();
  head.add(locs);
  head.add(box(0.28, 0.09, 0.28, hairC, 0, 0.29));
  if (fit.id === 'winter') {
    head.add(box(0.3, 0.14, 0.3, M(0x1c1e22), 0, 0.31));
  }
  const locCount = 14;
  for (let i = 0; i < locCount; i++) {
    const a = (i / locCount) * Math.PI * 2;
    const r = 0.13;
    const g = new THREE.Group();
    const len = o.locsTied ? 0.18 : 0.34 + Math.random() * 0.1;
    const c = cyl(0.021, 0.023, len, hairC, 5);
    c.position.y = -len / 2;
    const tip = cyl(0.022, 0.018, len * 0.42, tipC, 5);
    tip.position.y = -len * 0.79;
    g.add(c, tip);
    g.position.set(Math.cos(a) * r, 0.28, Math.sin(a) * r * 0.85);
    if (o.locsTied) {
      g.position.set(Math.cos(a) * 0.07, 0.33, -0.1 + Math.sin(a) * 0.05);
      g.rotation.x = -0.9;
    } else {
      g.rotation.z = Math.cos(a) * 0.25;
      g.rotation.x = -Math.sin(a) * 0.25;
    }
    locs.add(g);
  }

  // arms
  const mkArm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.31, 0.6, 0);
    const upper = box(0.13, 0.3, 0.14, fit.id === 'gym' ? skin : shirt, 0, -0.15);
    const fore = box(0.115, 0.3, 0.125, skin, 0, -0.45);
    g.add(upper, fore);
    if (o.tattoos !== false) {
      const t1 = box(0.121, 0.09, 0.131, M(0x35241c), 0, -0.4);
      const t2 = box(0.121, 0.05, 0.131, M(0x2a1c16), 0, -0.53);
      g.add(t1, t2);
    }
    if (side > 0) g.add(box(0.13, 0.035, 0.13, M(0x3a3a3e), 0, -0.585)); // watch
    g.add(box(0.11, 0.1, 0.12, skin, 0, -0.65)); // hand
    torso.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  // legs
  const mkLeg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.13, 0, 0);
    g.add(box(0.19, 0.46, 0.2, pants, 0, -0.23));
    g.add(box(0.17, 0.44, 0.19, pants, 0, -0.66));
    const sh = box(0.19, 0.12, 0.3, shoes, 0, -0.93, 0.05);
    g.add(sh);
    hips.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  group.scale.setScalar(o.scale ?? 1);
  group.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; } });
  return { group, hips, torso, head, locs, armL, armR, legL, legR, eyeL, eyeR, lidL, lidR, catchL, catchR, mouth };
}

/** procedural walk / idle */
export function animateCharacter(p: CharParts, t: number, speed: number) {
  const s = Math.min(1, speed / 5);
  const f = t * (4 + s * 6);
  const sw = Math.sin(f) * (0.15 + s * 0.75);
  p.legL.rotation.x = sw;
  p.legR.rotation.x = -sw;
  p.armL.rotation.x = -sw * 0.75;
  p.armR.rotation.x = sw * 0.75;
  p.hips.position.y = 0.92 + Math.abs(Math.sin(f)) * (0.015 + s * 0.05);
  p.torso.rotation.y = Math.sin(f) * 0.06 * (0.4 + s);
  p.torso.rotation.x = s * 0.12;
  p.head.rotation.x = -s * 0.06 + Math.sin(t * 1.6) * 0.02;
}

// ------------------------------------------------------------
// Subject posing (client NPC at a shoot)
// ------------------------------------------------------------
export interface Pose {
  chin: number; eyes: number; head: number; shoulders: number;
  hands: 'hips' | 'hair' | 'pockets' | 'crossed' | 'free';
  weight: number; stance: 'stand' | 'sit' | 'lean' | 'walk';
  expression: 'soft' | 'laugh' | 'serious' | 'smize' | 'blank';
}
export const DEFAULT_POSE: Pose = {
  chin: 0, eyes: 0, head: 0, shoulders: 0, hands: 'free', weight: 0, stance: 'stand', expression: 'blank',
};

export function applyPose(p: CharParts, pose: Pose, confidence: number, t: number, eyesClosed: boolean) {
  const relax = confidence / 100;
  const micro = Math.sin(t * (1.2 + relax)) * (0.01 + relax * 0.035);
  p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, pose.chin * 0.35 + micro, 0.12);
  p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, pose.head * 0.5 + (pose.eyes === 1 ? 0.3 : 0), 0.12);
  p.head.rotation.z = THREE.MathUtils.lerp(p.head.rotation.z, pose.head * 0.18, 0.1);
  p.torso.rotation.y = THREE.MathUtils.lerp(p.torso.rotation.y, pose.shoulders * 0.45, 0.1);
  p.hips.position.x = THREE.MathUtils.lerp(p.hips.position.x, pose.weight * 0.09, 0.1);
  p.hips.rotation.z = THREE.MathUtils.lerp(p.hips.rotation.z, -pose.weight * 0.05, 0.1);

  const stiff = 1 - relax;
  const target: Record<string, [number, number]> = {
    hips: [-1.15 - stiff * 0.2, 1.15 + stiff * 0.2],
    hair: [-2.3, 0.15],
    pockets: [-0.25, -0.25],
    crossed: [-1.5, -1.5],
    free: [-0.12 - stiff * 0.25, -0.12 - stiff * 0.25],
  };
  const [aL, aR] = target[pose.hands] || target.free;
  p.armL.rotation.x = THREE.MathUtils.lerp(p.armL.rotation.x, pose.hands === 'hair' ? -2.3 : -0.1, 0.1);
  p.armR.rotation.x = THREE.MathUtils.lerp(p.armR.rotation.x, -0.1, 0.1);
  p.armL.rotation.z = THREE.MathUtils.lerp(p.armL.rotation.z, aL, 0.1);
  p.armR.rotation.z = THREE.MathUtils.lerp(p.armR.rotation.z, aR, 0.1);

  const lean = pose.stance === 'lean' ? 0.16 : 0;
  p.torso.rotation.z = THREE.MathUtils.lerp(p.torso.rotation.z, lean, 0.08);
  p.hips.position.y = THREE.MathUtils.lerp(p.hips.position.y, pose.stance === 'sit' ? 0.55 : 0.92, 0.1);
  if (pose.stance === 'sit') {
    p.legL.rotation.x = THREE.MathUtils.lerp(p.legL.rotation.x, -1.2, 0.1);
    p.legR.rotation.x = THREE.MathUtils.lerp(p.legR.rotation.x, -1.2, 0.1);
  } else {
    p.legL.rotation.x = THREE.MathUtils.lerp(p.legL.rotation.x, 0, 0.1);
    p.legR.rotation.x = THREE.MathUtils.lerp(p.legR.rotation.x, 0, 0.1);
  }

  p.lidL.visible = eyesClosed;
  p.lidR.visible = eyesClosed;
  const smile = pose.expression === 'laugh' ? 0.055 : pose.expression === 'soft' ? 0.028 : 0;
  p.mouth.scale.set(pose.expression === 'laugh' ? 1.5 : 1, pose.expression === 'laugh' ? 2.4 : 1, 1);
  p.mouth.position.y = 0.075 - smile * 0.2;
}

// ============================================================
// DISTRICT
// ============================================================
export interface WorldRefs {
  root: THREE.Group;
  colliders: { x: number; z: number; hw: number; hd: number }[];
  doors: { id: string; x: number; z: number; mesh: THREE.Mesh }[];
  streetLights: THREE.PointLight[];
  windowMats: THREE.MeshBasicMaterial[];
  train: THREE.Group;
  traffic: { mesh: THREE.Group; angle: number; radius: number; speed: number; cx: number; cz: number; axis: 'x' | 'z'; lane: number }[];
  peds: { parts: CharParts; angle: number; radius: number; speed: number; cx: number; cz: number }[];
  rain: THREE.Points;
  snow: THREE.Points;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ground: THREE.Mesh;
  roadMat: THREE.MeshLambertMaterial;
  studioSign: THREE.Mesh;
}

export function buildDistrict(): WorldRefs {
  const root = new THREE.Group();
  const colliders: WorldRefs['colliders'] = [];
  const doors: WorldRefs['doors'] = [];
  const streetLights: THREE.PointLight[] = [];
  const windowMats: THREE.MeshBasicMaterial[] = [];

  // ground / sidewalk
  const groundMat = M(0x5d5b56);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const roadMat = M(0x35343a);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 24), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, 0);
  road.receiveShadow = true;
  root.add(road);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(24, 160), roadMat);
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(-10, 0.021, 40);
  root.add(cross);

  // lane dashes
  const dashMat = M(0xc9c2a8);
  for (let x = -140; x < 140; x += 8) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.35), dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x, 0.03, 0);
    root.add(d);
  }
  // sidewalks
  const swMat = M(0x8a8880);
  [1, -1].forEach((s) => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(300, 0.25, 10), swMat);
    sw.position.set(0, 0.12, s * 17);
    sw.receiveShadow = true;
    root.add(sw);
  });

  // parking bays
  const stripe = M(0xd8d2bc);
  PARKING.forEach(([x, z, rot]) => {
    const g = new THREE.Group();
    g.position.set(x, 0.14, z);
    g.rotation.y = rot;
    [-1.3, 1.3].forEach((ox) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5), stripe);
      s.rotation.x = -Math.PI / 2;
      s.position.set(ox, 0, 0);
      g.add(s);
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.16), stripe);
    back.rotation.x = -Math.PI / 2;
    back.position.set(0, 0, -2.4);
    g.add(back);
    root.add(g);
  });

  // ---- buildings from LOTS ----
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x2a2118 });
  LOTS.forEach((lot) => {
    if (lot.height <= 0) return;
    const g = new THREE.Group();
    g.position.set(lot.pos[0], 0, lot.pos[1]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(lot.size[0], lot.height, lot.size[1]), M(lot.color));
    body.position.y = lot.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    // cornice
    const cor = new THREE.Mesh(new THREE.BoxGeometry(lot.size[0] + 0.8, 0.7, lot.size[1] + 0.8), M(0x3a3833));
    cor.position.y = lot.height + 0.3;
    g.add(cor);
    // windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0x1b2028 });
    windowMats.push(winMat);
    const rows = Math.max(1, Math.floor(lot.height / 4));
    const cols = Math.max(2, Math.floor(lot.size[0] / 4));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), winMat);
        w.position.set(-lot.size[0] / 2 + 2 + c * (lot.size[0] - 4) / Math.max(1, cols - 1), 3.4 + r * 4, (lot.pos[1] > 0 ? -1 : 1) * (lot.size[1] / 2 + 0.06));
        if (lot.pos[1] > 0) w.rotation.y = Math.PI;
        g.add(w);
      }
    }
    // storefront band + door
    const dz = lot.door[1] - lot.pos[1];
    const sign = new THREE.Mesh(new THREE.BoxGeometry(lot.size[0] * 0.9, 1.5, 0.3), M(0x22201d));
    sign.position.set(0, 4.6, dz * 0.98);
    g.add(sign);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), doorMat.clone());
    door.position.set(0, 1.6, dz * 0.99);
    g.add(door);
    doors.push({ id: lot.id, x: lot.door[0], z: lot.door[1] + (dz > 0 ? 1.5 : -1.5), mesh: door });
    root.add(g);
    colliders.push({ x: lot.pos[0], z: lot.pos[1], hw: lot.size[0] / 2, hd: lot.size[1] / 2 });
  });

  // studio "FOR RENT" sign
  const studioLot = LOTS.find((l) => l.id === 'studio')!;
  const studioSign = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xd8c9a0 }));
  studioSign.position.set(studioLot.pos[0] + 6, 7.5, studioLot.door[1] + 0.4);
  root.add(studioSign);

  // ---- filler buildings ----
  const fillerColors = [0x7a4033, 0x5f5b55, 0x6b4a3a, 0x4c5157, 0x8a5a44];
  for (let i = 0; i < 22; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = -132 + i * 12 + (Math.random() * 4 - 2);
    if (Math.abs(x) < 20 && side > 0) continue;
    const z = side * (34 + Math.random() * 8);
    if (LOTS.some((l) => Math.abs(l.pos[0] - x) < 16 && Math.sign(l.pos[1]) === side)) continue;
    const h = 12 + Math.random() * 22;
    const w = 10 + Math.random() * 8;
    const d = 12 + Math.random() * 8;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(fillerColors[i % fillerColors.length]));
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    root.add(b);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x1b2028 });
    windowMats.push(winMat);
    for (let r = 0; r < Math.floor(h / 4); r++) {
      const w2 = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 1.6), winMat);
      w2.position.set(x, 3 + r * 4, z - side * (d / 2 + 0.06));
      if (side < 0) w2.rotation.y = Math.PI;
      root.add(w2);
    }
    colliders.push({ x, z, hw: w / 2, hd: d / 2 });
  }

  // ---- skyline silhouettes ----
  const skyMat = M(0x1d2128);
  for (let i = 0; i < 40; i++) {
    const x = -220 + i * 11 + Math.random() * 6;
    const h = 30 + Math.random() * 90;
    const b = new THREE.Mesh(new THREE.BoxGeometry(9 + Math.random() * 9, h, 9), skyMat);
    b.position.set(x, h / 2, -150 - Math.random() * 60);
    root.add(b);
    const lit = new THREE.MeshBasicMaterial({ color: 0x243040 });
    windowMats.push(lit);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7, h * 0.8), lit);
    face.position.set(x, h / 2, -149 - Math.random() * 60 + 6);
    root.add(face);
  }
  for (let i = 0; i < 16; i++) {
    const h = 40 + Math.random() * 70;
    const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), skyMat);
    b.position.set(-230 + Math.random() * 40, h / 2, 40 + i * 14);
    root.add(b);
  }

  // ---- viaduct + train ----
  const viaductZ = 62;
  const steel = M(0x3b3a38);
  for (let x = -140; x <= 140; x += 12) {
    const col = box(1.4, 8, 1.4, steel, x, 4, viaductZ - 3);
    const col2 = box(1.4, 8, 1.4, steel, x, 4, viaductZ + 3);
    col.castShadow = true;
    root.add(col, col2);
    colliders.push({ x, z: viaductZ - 3, hw: 0.8, hd: 0.8 });
  }
  const deck = box(300, 1.1, 9, M(0x33322f), 0, 8.5, viaductZ);
  deck.castShadow = true;
  root.add(deck);
  const train = new THREE.Group();
  for (let c = 0; c < 4; c++) {
    const car = box(13, 3.4, 3.2, M(0x9aa3ab), c * 14, 10.9, viaductZ);
    train.add(car);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xf2e2b8 });
    windowMats.push(winMat);
    for (let w = 0; w < 5; w++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), winMat);
      win.position.set(c * 14 - 5 + w * 2.5, 11.3, viaductZ - 1.65);
      train.add(win);
    }
  }
  train.position.x = -400;
  root.add(train);

  // ---- street furniture ----
  const poleMat = M(0x2e2e30);
  for (let x = -120; x <= 120; x += 20) {
    [1, -1].forEach((s) => {
      const pole = cyl(0.12, 0.15, 7, poleMat, 6);
      pole.position.set(x, 3.5, s * 13.4);
      root.add(pole);
      const arm = box(2.4, 0.16, 0.16, poleMat, x - s * 1.2, 7, s * 13.4);
      root.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd28a }));
      lamp.position.set(x - s * 2.2, 6.85, s * 13.4);
      root.add(lamp);
      const pl = new THREE.PointLight(0xffb85c, 0, 22, 2);
      pl.position.set(x - s * 2.2, 6.6, s * 13.4);
      root.add(pl);
      streetLights.push(pl);
    });
  }
  // hydrants + traffic lights
  for (let x = -100; x <= 100; x += 40) {
    const hy = cyl(0.22, 0.26, 0.9, M(0xb03a2e), 8);
    hy.position.set(x + 6, 0.6, 13.8);
    root.add(hy);
  }
  [[-12, 12], [58, 12], [-12, -12]].forEach(([x, z]) => {
    const p = cyl(0.12, 0.14, 6, poleMat, 6);
    p.position.set(x, 3, z);
    root.add(p);
    const head = box(0.5, 1.3, 0.4, M(0x1c1c1e), x, 6.2, z);
    root.add(head);
    [0xd94f3a, 0xe0b64a, 0x4fbf6a].forEach((c, i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: c }));
      l.position.set(x, 6.6 - i * 0.42, z + 0.22);
      root.add(l);
    });
  });

  // parked cars
  const parkedColors = [0x8e9296, 0x3f4a5a, 0x6b3a34, 0x2f3336];
  PARKING.slice(3).forEach((p, i) => {
    if (i % 2) return;
    const c = buildCar(parkedColors[i % parkedColors.length]);
    c.position.set(p[0], 0, p[1]);
    c.rotation.y = p[2];
    root.add(c);
    colliders.push({ x: p[0], z: p[1], hw: 1.2, hd: 2.3 });
  });

  // ---- graffiti alley ----
  const alley = LOTS.find((l) => l.id === 'alley')!;
  const gcolors = [0xd44a6a, 0x3fb0c4, 0xe2b53c, 0x7a4fd4, 0x4fd489];
  [-1, 1].forEach((s) => {
    const wall = box(1, 12, alley.size[1], M(0x6e5f55), alley.pos[0] + s * 5.5, 6, alley.pos[1]);
    wall.receiveShadow = true;
    root.add(wall);
    colliders.push({ x: alley.pos[0] + s * 5.5, z: alley.pos[1], hw: 0.5, hd: alley.size[1] / 2 });
    for (let i = 0; i < 8; i++) {
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 2.5, 1.4 + Math.random() * 2), new THREE.MeshBasicMaterial({ color: gcolors[i % gcolors.length] }));
      tag.position.set(alley.pos[0] + s * 4.98, 2 + Math.random() * 5, alley.pos[1] - 10 + i * 2.6);
      tag.rotation.y = -s * Math.PI / 2;
      root.add(tag);
    }
  });

  // ---- park ----
  const park = LOTS.find((l) => l.id === 'park')!;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(park.size[0], park.size[1]), M(0x3f6b45));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(park.pos[0], 0.05, park.pos[1]);
  root.add(grass);
  const fountain = cyl(4, 4.4, 1, M(0x8d8a83), 16);
  fountain.position.set(park.pos[0], 0.5, park.pos[1]);
  root.add(fountain);
  const water = cyl(3.6, 3.6, 0.2, M(0x3f6c86), 16);
  water.position.set(park.pos[0], 1.05, park.pos[1]);
  root.add(water);
  colliders.push({ x: park.pos[0], z: park.pos[1], hw: 4.4, hd: 4.4 });
  for (let i = 0; i < 12; i++) {
    const tx = park.pos[0] - 20 + Math.random() * 40;
    const tz = park.pos[1] - 11 + Math.random() * 22;
    if (Math.abs(tx - park.pos[0]) < 7 && Math.abs(tz - park.pos[1]) < 7) continue;
    const trunk = cyl(0.25, 0.35, 3.2, M(0x4a3a2c), 6);
    trunk.position.set(tx, 1.6, tz);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), M(0x3a6b3c));
    crown.position.set(tx, 4.2, tz);
    crown.castShadow = true;
    root.add(trunk, crown);
  }
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    b.add(box(2.4, 0.15, 0.7, M(0x6b4a33), 0, 0.55, 0));
    b.add(box(2.4, 0.6, 0.12, M(0x6b4a33), 0, 0.85, -0.3));
    b.position.set(park.pos[0] - 16 + i * 8, 0, park.pos[1] - 9);
    root.add(b);
  }

  // ---- under the tracks spot ----
  const tracks = LOTS.find((l) => l.id === 'tracks')!;
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M(0x4a4744));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(tracks.pos[0], 0.06, tracks.pos[1]);
  root.add(pad);

  // ---- rain / snow ----
  const mkParticles = (count: number, color: number, size: number) => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.6 }));
    p.visible = false;
    root.add(p);
    return p;
  };
  const rain = mkParticles(1400, 0x9fb4c4, 0.14);
  const snow = mkParticles(900, 0xffffff, 0.24);

  // ---- traffic + pedestrians ----
  // Cars drive back and forth along the actual road strips (main road along
  // X centered on the origin, cross road along Z centered on (-10, 40)),
  // each pinned to a fixed lane offset instead of the old decorative
  // ellipse, which mostly floated off the pavement.
  const traffic: WorldRefs['traffic'] = [];
  const trafficPaths: { axis: 'x' | 'z'; cx: number; cz: number; radius: number; lane: number }[] = [
    { axis: 'x', cx: 0, cz: 0, radius: 130, lane: 4 },
    { axis: 'x', cx: 0, cz: 0, radius: 120, lane: -4 },
    { axis: 'x', cx: 0, cz: 0, radius: 110, lane: 4 },
    { axis: 'z', cx: -10, cz: 40, radius: 70, lane: -4 },
    { axis: 'z', cx: -10, cz: 40, radius: 60, lane: 4 },
  ];
  for (let i = 0; i < 5; i++) {
    const c = buildCar([0x7c8288, 0x4a5a6a, 0x8a5c4a, 0x2f3336, 0xa8a49a][i]);
    root.add(c);
    const p = trafficPaths[i];
    traffic.push({ mesh: c, angle: (i / 5) * Math.PI * 2, radius: p.radius, speed: 0.11 + i * 0.02, cx: p.cx, cz: p.cz, axis: p.axis, lane: p.lane });
  }
  const peds: WorldRefs['peds'] = [];
  for (let i = 0; i < 4; i++) {
    const p = buildCharacter({
      skin: [0x8d5a3c, 0x5a3320, 0xa2714c, 0x6f4227][i], gear: false, beard: i % 2 === 0,
      outfit: [0x3a4a6a, 0x6b3a4a, 0x4a5a3a, 0x5a4a6a][i], locsTied: i % 2 === 1, tattoos: false,
    });
    root.add(p.group);
    peds.push({ parts: p, angle: (i / 4) * Math.PI * 2, radius: 26 + i * 5, speed: 0.06 + i * 0.01, cx: -20 + i * 30, cz: 15 });
  }

  // lights
  const hemi = new THREE.HemisphereLight(0x9fb8d0, 0x4a4038, 0.7);
  root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.far = 220;
  root.add(sun);
  root.add(sun.target);

  return { root, colliders, doors, streetLights, windowMats, train, traffic, peds, rain, snow, sun, hemi, ground, roadMat, studioSign };
}

// ============================================================
// CAR
// ============================================================
export function buildCar(color = 0x8e9296): THREE.Group {
  const g = new THREE.Group();
  const body = box(2.2, 0.9, 4.6, M(color), 0, 0.85);
  body.castShadow = true;
  g.add(body);
  const cabin = box(1.9, 0.8, 2.3, M(0x2a2e33), 0, 1.6, -0.15);
  g.add(cabin);
  const glass = new THREE.MeshLambertMaterial({ color: 0x8fb0c4, transparent: true, opacity: 0.55 });
  g.add(box(1.92, 0.55, 0.08, glass, 0, 1.62, 1.0));
  g.add(box(1.92, 0.55, 0.08, glass, 0, 1.62, -1.3));
  [[-1.02, 1.5], [1.02, 1.5], [-1.02, -1.5], [1.02, -1.5]].forEach(([x, z]) => {
    const w = cyl(0.45, 0.45, 0.3, M(0x1a1a1c), 10);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  });
  [[-0.7, 2.32], [0.7, 2.32]].forEach(([x, z]) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffeec2 }));
    h.position.set(x, 0.9, z);
    g.add(h);
  });
  [[-0.7, -2.32], [0.7, -2.32]].forEach(([x, z]) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xc4402e }));
    h.position.set(x, 0.9, z);
    g.add(h);
  });
  return g;
}

// ============================================================
// INTERIORS
// ============================================================
export interface InteriorRefs {
  root: THREE.Group;
  colliders: { x: number; z: number; hw: number; hd: number }[];
  exit: [number, number];
  props: { id: string; x: number; z: number; label: string }[];
  subjectSpot?: [number, number];
}

export function buildInterior(kind: string): InteriorRefs {
  const root = new THREE.Group();
  const colliders: InteriorRefs['colliders'] = [];
  const props: InteriorRefs['props'] = [];
  const W = kind === 'studio' ? 20 : 15;
  const D = kind === 'studio' ? 16 : 13;

  const floorColor = kind === 'bar' ? 0x2b2429 : kind === 'studio' ? 0x6b6660 : kind === 'salon' ? 0xd8c8cd : 0x7a6a58;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M(floorColor));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M(0x2a2a2c));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 4.2;
  root.add(ceil);

  const wallColor = kind === 'bar' ? 0x241d24 : kind === 'apartment' ? 0x8d8375 : kind === 'salon' ? 0xe8d8dd : 0x8f8b84;
  const wallMat = M(wallColor);
  const mkWall = (w: number, h: number, d: number, x: number, z: number) => {
    const m = box(w, h, d, wallMat, x, h / 2, z);
    m.receiveShadow = true;
    root.add(m);
    colliders.push({ x, z, hw: w / 2, hd: d / 2 });
  };
  mkWall(W, 4.2, 0.4, 0, -D / 2);
  mkWall(W, 4.2, 0.4, 0, D / 2);
  mkWall(0.4, 4.2, D, -W / 2, 0);
  mkWall(0.4, 4.2, D, W / 2, 0);

  // exit door
  const exitDoor = box(2.2, 3, 0.2, new THREE.MeshBasicMaterial({ color: 0x3a2c1e }), 0, 1.5, D / 2 - 0.25);
  root.add(exitDoor);
  const exit: [number, number] = [0, D / 2 - 2];
  props.push({ id: 'exit', x: 0, z: D / 2 - 2, label: 'Leave' });

  const amb = new THREE.HemisphereLight(0xffffff, 0x40382e, kind === 'bar' ? 0.35 : 0.8);
  root.add(amb);
  const lamp = new THREE.PointLight(kind === 'bar' ? 0xff6ec7 : 0xffe6c0, kind === 'bar' ? 1.1 : 0.9, 26, 2);
  lamp.position.set(0, 3.6, 0);
  root.add(lamp);

  const addBlock = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, collide = true) => {
    const m = box(w, h, d, M(color), x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    if (collide) colliders.push({ x, z, hw: w / 2, hd: d / 2 });
    return m;
  };

  if (kind === 'apartment') {
    addBlock(2.2, 0.6, 4.4, 0x5a4a3f, -5, 0.3, -3); // bed frame
    addBlock(2.1, 0.35, 4.2, 0xb8b0a4, -5, 0.75, -3, false);
    props.push({ id: 'bed', x: -5, z: 0.2, label: 'Sleep' });
    addBlock(2.6, 0.8, 1.2, 0x4a3f35, 4.5, 0.4, -4.5); // desk
    const laptop = addBlock(0.9, 0.06, 0.6, 0x2a2c30, 4.5, 0.85, -4.5, false);
    laptop.castShadow = false;
    const screen = box(0.9, 0.6, 0.05, new THREE.MeshBasicMaterial({ color: 0x6fa8d8 }), 4.5, 1.15, -4.8);
    screen.rotation.x = -0.25;
    root.add(screen);
    props.push({ id: 'laptop', x: 4.5, z: -3.4, label: 'Laptop' });
    addBlock(4.5, 2.4, 0.8, 0x6b6259, -1, 1.2, -6); // kitchenette
    addBlock(4.5, 0.15, 0.9, 0x3a3a3c, -1, 2.5, -6, false);
    props.push({ id: 'kitchen', x: -1, z: -4.8, label: 'Kitchenette' });
    addBlock(2.6, 3.6, 0.9, 0x4f453a, 6, 1.8, 2.5); // closet
    props.push({ id: 'closet', x: 6, z: 1.4, label: 'Closet' });
    // backdrop corner
    const stand = cyl(0.06, 0.08, 2.6, M(0x3a3a3c), 6);
    stand.position.set(-6.4, 1.3, 4);
    root.add(stand);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), M(0xb0a89a));
    bd.position.set(-4.8, 1.6, 3.6);
    root.add(bd);
    props.push({ id: 'gearbag', x: -4.8, z: 2.2, label: 'Gear bag' });
    addBlock(2.4, 0.7, 1, 0x3a3f45, 3, 0.4, 4); // couch/tv unit
    const tv = box(2.2, 1.3, 0.12, new THREE.MeshBasicMaterial({ color: 0x1d2530 }), 3, 1.6, 4);
    root.add(tv);
    props.push({ id: 'tv', x: 3, z: 2.9, label: 'TV' });
  } else if (kind === 'studio') {
    const sweep = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), M(0xd8d4cc));
    sweep.position.set(0, 3, -D / 2 + 0.3);
    root.add(sweep);
    const sweepFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), M(0xd0ccc4));
    sweepFloor.rotation.x = -Math.PI / 2;
    sweepFloor.position.set(0, 0.06, -D / 2 + 2.3);
    root.add(sweepFloor);
    [[-4, -2], [4, -2]].forEach(([x, z]) => {
      const st = cyl(0.06, 0.1, 2.4, M(0x2e2e30), 6);
      st.position.set(x, 1.2, z);
      root.add(st);
      const sb = box(1.2, 1.2, 0.3, M(0xe8e4dc), x, 2.6, z);
      root.add(sb);
    });
    addBlock(3.4, 0.8, 1.4, 0x4a4550, 5, 0.4, 4);
    props.push({ id: 'couch', x: 5, z: 3, label: 'Couch' });
    props.push({ id: 'shoot', x: 0, z: 0, label: 'Start session' });
  } else if (kind === 'camerastore') {
    addBlock(9, 1.1, 1.2, 0x4a4038, 0, 0.55, -3);
    for (let i = 0; i < 6; i++) {
      addBlock(0.5, 0.35, 0.5, 0x1d1d20, -3.5 + i * 1.4, 1.3, -3, false);
    }
    props.push({ id: 'shopgear', x: 0, z: -1.6, label: 'Buy gear' });
  } else if (kind === 'coffee') {
    addBlock(7, 1.1, 1.2, 0x5a3f2c, -2, 0.55, -3);
    for (let i = 0; i < 3; i++) {
      addBlock(1.4, 0.75, 1.4, 0x6b5240, 3 + (i % 2) * 2.5, 0.38, -1 + i * 2.6);
    }
    props.push({ id: 'order', x: -2, z: -1.6, label: 'Order' });
  } else if (kind === 'bar') {
    addBlock(10, 1.15, 1.4, 0x2f2530, -1, 0.58, -3.4);
    for (let i = 0; i < 5; i++) {
      const s = cyl(0.35, 0.3, 1, M(0x4a3a44), 8);
      s.position.set(-4.5 + i * 2, 0.5, -1.8);
      root.add(s);
    }
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), new THREE.MeshBasicMaterial({ color: 0xff5fa8 }));
    neon.position.set(-1, 3, -D / 2 + 0.3);
    root.add(neon);
    const neon2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({ color: 0x4fd4ff }));
    neon2.position.set(5, 2.4, -D / 2 + 0.3);
    root.add(neon2);
    props.push({ id: 'network', x: -1, z: -2, label: 'Network' });
  } else if (kind === 'freshfit') {
    for (let i = 0; i < 3; i++) {
      const rack = box(4, 0.12, 0.12, M(0x8a8a8c), -4 + i * 4, 2, -3);
      root.add(rack);
      for (let j = 0; j < 6; j++) {
        addBlock(0.5, 1.2, 0.3, [0xc86a7a, 0x3a4a6a, 0x6b6b3a, 0x8a4a6a, 0x3a6b5a, 0xd8b06a][j], -5.6 + i * 4 + j * 0.55, 1.3, -3, false);
      }
    }
    props.push({ id: 'wardrobe', x: 0, z: -1.4, label: 'Buy fits' });
  } else if (kind === 'salon') {
    addBlock(8, 1, 1.2, 0xd8b0bc, -2, 0.5, -3);
    for (let i = 0; i < 3; i++) {
      const ch = cyl(0.5, 0.5, 1.1, M(0xb0646f), 10);
      ch.position.set(-3 + i * 3, 0.55, 1.5);
      root.add(ch);
    }
    props.push({ id: 'client', x: -2, z: -1.5, label: 'Talk to Ms. Alvarez' });
  }

  return { root, colliders, exit, props, subjectSpot: kind === 'studio' ? [0, -3] : undefined };
}

// ============================================================
// STROBE RIG (one-light system)
// ============================================================
export interface LightRig {
  group: THREE.Group;
  spot: THREE.SpotLight;
  softbox: THREE.Mesh;
  bare: THREE.Mesh;
  reflector: THREE.Mesh;
}
export function buildLightRig(): LightRig {
  const group = new THREE.Group();
  const stand = cyl(0.05, 0.09, 2, M(0x2e2e30), 6);
  stand.position.y = 1;
  group.add(stand);
  [0, 2.1, 4.2].forEach((a) => {
    const leg = box(0.06, 0.06, 0.8, M(0x2e2e30), Math.sin(a) * 0.25, 0.1, Math.cos(a) * 0.25);
    leg.rotation.y = a;
    group.add(leg);
  });
  const headG = new THREE.Group();
  headG.position.y = 2;
  group.add(headG);
  const softbox = box(1.3, 1.3, 0.28, new THREE.MeshBasicMaterial({ color: 0xfff6e6 }), 0, 0, 0.2);
  headG.add(softbox);
  const bare = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  bare.position.z = 0.15;
  bare.visible = false;
  headG.add(bare);
  const spot = new THREE.SpotLight(0xfff2e0, 0, 30, Math.PI / 5, 0.6, 2);
  spot.position.set(0, 2, 0.2);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  group.add(spot);
  group.add(spot.target);
  const reflector = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), new THREE.MeshBasicMaterial({ color: 0xf2e8d0, side: THREE.DoubleSide }));
  reflector.visible = false;
  group.add(reflector);
  return { group, spot, softbox, bare, reflector };
}
