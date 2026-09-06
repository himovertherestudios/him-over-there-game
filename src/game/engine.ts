import * as THREE from 'three';
import {
  buildDistrict, buildInterior, buildCharacter, animateCharacter, buildCar, buildLightRig,
  applyPose, DEFAULT_POSE, Pose, CharParts, WorldRefs, InteriorRefs, LightRig,
} from './world';
import { LOTS, PARKING, archetypeById } from './data';
import { getState, ShotSettings } from './store';
import { sfx } from './audio';
import { input } from './input/InputManager';
import { getDeviceProfile } from './platform/device';

export interface Hud {
  prompt: string | null;
  interactId: string | null;
  speed: number;
  inCar: boolean;
  scene: string;
  camMode: boolean;
  ev: number;
  meter: number;
  parked: boolean;
  hasSubject: boolean;
}


export interface CamState {
  aperture: number; shutter: number; iso: number; focal: number;
  focus: number; wb: string; kelvin: number; portrait: boolean;
  height: number; grid: boolean;
}

export interface LightState {
  on: boolean; x: number; z: number; height: number; angle: number;
  power: number; modifier: 'bare' | 'softbox'; reflector: boolean;
}

const WB_PRESETS: Record<string, number> = { Auto: 0, Daylight: 5500, Shade: 7500, Tungsten: 3200, Flash: 5800 };

type SceneEntry = { group: THREE.Group; refs: WorldRefs | InteriorRefs; kind: 'district' | 'interior' };

class Engine {
  renderer: THREE.WebGLRenderer | null = null;
  canvas: HTMLCanvasElement | null = null;
  fx: HTMLCanvasElement | null = null;
  minimap: HTMLCanvasElement | null = null;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.05, 600);
  clock = new THREE.Clock();

  scenes = new Map<string, SceneEntry>();
  current: SceneEntry | null = null;
  currentId = 'apartment';

  player!: CharParts;
  playerPos = new THREE.Vector3(0, 0, 4);
  playerVel = new THREE.Vector3();
  playerRot = 0;
  yaw = 0; pitch = 0.18; dist = 6.5;

  car: THREE.Group | null = null;
  carPos = new THREE.Vector3(-30, 0, 13);
  carRot = 0; carSpeed = 0; inCar = false;

  subject: CharParts | null = null;
  subjectPose: Pose = { ...DEFAULT_POSE };
  subjectConfidence = 30;
  subjectMotion = 0.35;
  eyesClosed = false;
  blinkT = 0;
  subjectPos = new THREE.Vector3(0, 0, 0);

  rig: LightRig | null = null;
  light: LightState = { on: false, x: 1.6, z: 1.6, height: 2, angle: 0, power: 0.5, modifier: 'softbox', reflector: false };

  cam: CamState = { aperture: 4, shutter: 1 / 250, iso: 400, focal: 35, focus: 3, wb: 'Auto', kelvin: 5500, portrait: false, height: 1.55, grid: true };
  camMode = false;

  paused = false;
  running = false;
  raf = 0;
  stepT = 0;
  trainT = 24;
  lastHud = '';
  noise: HTMLCanvasElement | null = null;
  /** 0 = uncapped (desktop). Mobile targets ~30fps to save battery/GPU. */
  frameInterval = 0;
  frameAccum = 0;
  /** Rendered (post-throttle) frames per second, sampled via wall-clock time. */
  fps = 0;
  private fpsWindowStart = 0;
  private fpsFrames = 0;

  onHud: ((h: Hud) => void) | null = null;
  onInteract: ((id: string) => void) | null = null;
  onCamChange: (() => void) | null = null;

  // ---------------------------------------------------------
  mount(canvas: HTMLCanvasElement, fx: HTMLCanvasElement) {
    this.canvas = canvas;
    this.fx = fx;
    // Antialiasing can only be set at WebGL context creation, so the quality
    // tier at mount time sticks for the session (switching quality later
    // still updates shadows/fog/DPR live via resize()).
    // preserveDrawingBuffer is a real perf cost (forces an extra buffer copy
    // most frames) and isn't needed here: the only readback is capture()'s
    // camera-mode composite, which drawImage()s this canvas synchronously
    // right after render() in the same call — before the browser would ever
    // clear the buffer — so the pixels are always still there to read.
    const q = getState().quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', alpha: true });
    this.scene.background = new THREE.Color(0x1a1c22);
    this.scene.fog = new THREE.Fog(0x1a1c22, 90, 260);
    this.frameInterval = getDeviceProfile().isMobile ? 1 / 30 : 0;
    this.fpsWindowStart = performance.now();

    this.player = buildCharacter({ fit: getState().fit, locsTied: getState().locsTied });
    this.scene.add(this.player.group);

    this.car = buildCar(0x8e9296);
    this.scene.add(this.car);

    this.noise = document.createElement('canvas');
    this.noise.width = 128; this.noise.height = 128;
    const nctx = this.noise.getContext('2d')!;
    const img = nctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 76;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);

    input.attachKeyboard();
    canvas.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('pointerup', this.pointerUp);
    window.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('resize', this.resize);
    this.resize();
    this.running = true;
    this.clock.start();
    this.loop();
  }

  unmount() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    input.detachKeyboard();
    window.removeEventListener('pointerup', this.pointerUp);
    window.removeEventListener('pointermove', this.pointerMove);
    window.removeEventListener('resize', this.resize);
    this.canvas?.removeEventListener('pointerdown', this.pointerDown);
    this.canvas?.removeEventListener('wheel', this.wheel);
    sfx.engine(false);
    sfx.ambient(false);
    this.renderer?.dispose();
    this.renderer = null;
  }

  setMinimap(c: HTMLCanvasElement | null) { this.minimap = c; }

  resize = () => {
    if (!this.renderer || !this.canvas) return;
    const q = getState().quality;
    const dpr = q === 'low' ? 0.75 : q === 'med' ? Math.min(1.25, window.devicePixelRatio) : Math.min(2, window.devicePixelRatio);
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    // Shadows/fog/draw-distance scale with quality; unlike antialiasing these
    // can change live, so a quality switch mid-session applies immediately.
    // Fog near/far are mutated in place (not replaced) so its color —
    // continuously updated per frame for day/night/weather — never resets.
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (this.scene.fog && 'near' in this.scene.fog) {
      this.scene.fog.near = q === 'low' ? 45 : 90;
      this.scene.fog.far = q === 'low' ? 140 : 260;
    }
    this.camera.far = q === 'low' ? 300 : 600;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.fx) { this.fx.width = Math.min(1280, w); this.fx.height = Math.min(1280, w) * (h / w); }
  };

  // ---------------------------------------------------------
  dragging = false; lastX = 0; lastY = 0;
  pointerDown = (e: PointerEvent) => {
    this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY;
    if (this.camMode && this.subject) {
      // autofocus on click
      this.cam.focus = this.camera.position.distanceTo(this.subjectHeadPos());
      this.onCamChange?.();
    }
  };
  pointerUp = () => { this.dragging = false; };
  pointerMove = (e: PointerEvent) => {
    if (!this.dragging || this.paused) return;
    const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.yaw -= dx * 0.005;
    this.pitch = Math.max(-0.5, Math.min(0.9, this.pitch + dy * 0.004));
  };
  wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.camMode) {
      if (e.shiftKey) {
        this.cam.focal = Math.max(24, Math.min(85, this.cam.focal - Math.sign(e.deltaY) * 3));
      } else {
        this.cam.focus = Math.max(0.4, Math.min(20, this.cam.focus + Math.sign(e.deltaY) * 0.12));
      }
      this.onCamChange?.();
    } else {
      this.dist = Math.max(3, Math.min(12, this.dist + Math.sign(e.deltaY) * 0.6));
    }
  };

  // ---------------------------------------------------------
  setScene(id: string, spawn?: [number, number]) {
    if (this.current) this.scene.remove(this.current.group);
    let entry = this.scenes.get(id);
    if (!entry) {
      if (id === 'district') {
        const refs = buildDistrict();
        entry = { group: refs.root, refs, kind: 'district' };
      } else {
        const refs = buildInterior(id);
        entry = { group: refs.root, refs, kind: 'interior' };
      }
      this.scenes.set(id, entry);
    }
    this.current = entry;
    this.currentId = id;
    this.scene.add(entry.group);
    if (this.car) this.car.visible = id === 'district';
    if (spawn) this.playerPos.set(spawn[0], 0, spawn[1]);
    this.playerVel.set(0, 0, 0);
    if (this.rig) { this.rig.group.visible = false; }
    this.enableLightLayers();
    sfx.ambient(id === 'district');
    sfx.lounge(id === 'bar');
    this.pushHud(true);
  }


  refreshPlayerLook() {
    const s = getState();
    const old = this.player.group;
    this.scene.remove(old);
    this.player = buildCharacter({ fit: s.fit, locsTied: s.locsTied });
    this.scene.add(this.player.group);
  }

  // ---------------------------------------------------------
  /** every light must also live on layer 1 or the subject-only pass renders black */
  enableLightLayers() {
    this.scene.traverse((o) => {
      if ((o as THREE.Light).isLight) o.layers.enable(1);
    });
  }

  setSubject(archId: string, pos: [number, number], confidence: number) {
    this.clearSubject();
    const a = archetypeById(archId);
    const p = buildCharacter({ skin: a.skin, hair: a.hair, outfit: a.outfit, gear: false, beard: archId === 'dre' || archId === 'kevin', locsTied: false, tattoos: false, scale: 0.96 });
    // keep layer 0 (so scene lights still reach her) and add layer 1 for the
    // subject-only pass used by the depth-of-field composite.
    p.group.traverse((o) => { o.layers.enable(1); });
    this.subject = p;
    this.subjectPos.set(pos[0], 0, pos[1]);
    p.group.position.copy(this.subjectPos);
    this.subjectConfidence = confidence;
    this.scene.add(p.group);
    if (!this.rig) { this.rig = buildLightRig(); this.scene.add(this.rig.group); }
    this.rig.group.visible = true;
    this.light = { ...this.light, on: false, x: pos[0] + 1.8, z: pos[1] + 1.8 };
    this.applyLight();
    this.enableLightLayers();
  }

  clearSubject() {
    if (this.subject) { this.scene.remove(this.subject.group); this.subject = null; }
    if (this.rig) this.rig.group.visible = false;
  }
  setPose(patch: Partial<Pose>) { this.subjectPose = { ...this.subjectPose, ...patch }; }
  setConfidence(c: number) { this.subjectConfidence = Math.max(0, Math.min(100, c)); }

  setLight(patch: Partial<LightState>) {
    this.light = { ...this.light, ...patch };
    this.applyLight();
  }
  applyLight() {
    if (!this.rig) return;
    const L = this.light;
    this.rig.group.position.set(L.x, 0, L.z);
    this.rig.group.children.forEach((c) => { if (c.type === 'Group') c.position.y = 0; });
    this.rig.spot.position.set(0, L.height, 0);
    this.rig.softbox.position.set(0, L.height, 0.2);
    this.rig.softbox.visible = L.modifier === 'softbox';
    this.rig.bare.position.set(0, L.height, 0.15);
    this.rig.bare.visible = L.modifier === 'bare';
    const dir = new THREE.Vector3(this.subjectPos.x - L.x, 1.45 - L.height, this.subjectPos.z - L.z);
    this.rig.spot.target.position.copy(new THREE.Vector3(0, L.height, 0).add(dir));
    this.rig.spot.angle = L.modifier === 'softbox' ? Math.PI / 3.2 : Math.PI / 6;
    this.rig.spot.penumbra = L.modifier === 'softbox' ? 0.85 : 0.15;
    this.rig.spot.intensity = L.on ? L.power * 26 : 0;
    this.rig.spot.decay = 2;
    this.rig.softbox.lookAt(this.subjectPos.x, 1.45, this.subjectPos.z);
    this.rig.reflector.visible = L.reflector;
    if (L.reflector) {
      const rx = this.subjectPos.x - (L.x - this.subjectPos.x);
      const rz = this.subjectPos.z - (L.z - this.subjectPos.z);
      this.rig.reflector.position.set(rx - L.x, 1.3, rz - L.z);
      this.rig.reflector.lookAt(this.subjectPos.x, 1.3, this.subjectPos.z);
    }
  }
  lightDistance() {
    return Math.hypot(this.light.x - this.subjectPos.x, this.light.z - this.subjectPos.z);
  }

  // ---------------------------------------------------------
  enterCameraMode() {
    this.camMode = true;
    this.player.group.visible = false;
    this.cam.focus = this.subject ? this.camera.position.distanceTo(this.subjectHeadPos()) : 3;
    this.onCamChange?.();
    this.pushHud(true);
  }
  exitCameraMode() {
    this.camMode = false;
    this.player.group.visible = true;
    if (this.fx) { const c = this.fx.getContext('2d'); c?.clearRect(0, 0, this.fx.width, this.fx.height); }
    this.pushHud(true);
  }
  setCam(patch: Partial<CamState>) {
    this.cam = { ...this.cam, ...patch };
    if (patch.wb && WB_PRESETS[patch.wb]) this.cam.kelvin = WB_PRESETS[patch.wb];
    this.onCamChange?.();
  }
  subjectHeadPos() {
    const v = new THREE.Vector3();
    if (this.subject) this.subject.head.getWorldPosition(v);
    else v.set(this.subjectPos.x, 1.6, this.subjectPos.z);
    return v;
  }

  /** scene light value in EV-ish terms */
  sceneEV(): number {
    const s = getState();
    const night = s.clock < 6 * 60 || s.clock > 19 * 60;
    let ev = this.currentId === 'district' ? (night ? 5.5 : s.weather === 'clear' ? 13 : s.weather === 'rain' ? 10 : 11.2) : 8.2;
    if (this.light.on) {
      const d = Math.max(0.6, this.lightDistance());
      const flash = this.light.power * (this.light.modifier === 'softbox' ? 1 : 1.35) * (9 / (d * d));
      ev += Math.log2(1 + flash * 4);
    }
    return ev;
  }
  meterError(): number {
    const c = this.cam;
    const ev = Math.log2((c.aperture * c.aperture) / c.shutter) - Math.log2(c.iso / 100);
    return ev - this.sceneEV();
  }

  compositionScore(): number {
    if (!this.subject) return 55;
    const head = this.subjectHeadPos().clone().project(this.camera);
    const x = (head.x + 1) / 2, y = (1 - head.y) / 2;
    if (head.z > 1 || x < 0 || x > 1 || y < 0 || y > 1) return 20;
    const thirdY = Math.min(Math.abs(y - 0.333), Math.abs(y - 0.28));
    const thirdX = Math.min(Math.abs(x - 0.333), Math.abs(x - 0.667), Math.abs(x - 0.5) * 0.7);
    let s = 100 - thirdY * 190 - thirdX * 110;
    if (y < 0.06) s -= 30; // no headroom
    const d = this.camera.position.distanceTo(this.subjectHeadPos());
    if (d > 8) s -= 20;
    return Math.max(5, Math.min(100, s));
  }

  // ---------------------------------------------------------
  colliders(): { x: number; z: number; hw: number; hd: number }[] {
    return this.current ? (this.current.refs as WorldRefs).colliders || [] : [];
  }
  collide(pos: THREE.Vector3, r = 0.45) {
    for (const c of this.colliders()) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) pos.x += Math.sign(dx) * px; else pos.z += Math.sign(dz) * pz;
      }
    }
  }

  nearestParking(): { d: number; p: [number, number, number] } | null {
    let best: { d: number; p: [number, number, number] } | null = null;
    PARKING.forEach((p) => {
      const d = Math.hypot(p[0] - this.carPos.x, p[1] - this.carPos.z);
      if (!best || d < best.d) best = { d, p };
    });
    return best;
  }
  isParked() {
    const n = this.nearestParking();
    return !!n && n.d < 3.2;
  }
  teleport(x: number, z: number) { this.playerPos.set(x, 0, z); }
  teleportCar(x: number, z: number) { this.carPos.set(x, 0, z); }

  // ---------------------------------------------------------
  interactTarget(): { id: string; label: string } | null {
    if (this.camMode) return null;
    if (this.inCar) {
      return { id: 'exitcar', label: 'Exit the Keystone Sedan' };
    }
    if (!this.current) return null;
    const p = this.playerPos;
    if (this.currentId === 'district') {
      const refs = this.current!.refs as WorldRefs;
      let best: { id: string; label: string; d: number } | null = null;
      refs.doors.forEach((d) => {
        const dist = Math.hypot(d.x - p.x, d.z - p.z);
        const lot = LOTS.find((l) => l.id === d.id);
        if (dist < 3.4 && (!best || dist < best.d)) best = { id: 'door:' + d.id, label: `Enter ${lot?.name || d.id}`, d: dist };
      });
      LOTS.filter((l) => !l.enterable).forEach((l) => {
        const dist = Math.hypot(l.door[0] - p.x, l.door[1] - p.z);
        if (dist < 4 && (!best || dist < best.d)) best = { id: 'spot:' + l.id, label: l.name, d: dist };
      });
      if (this.car) {
        const dc = Math.hypot(this.carPos.x - p.x, this.carPos.z - p.z);
        if (dc < 3.6 && (!best || dc < best.d)) best = { id: 'entercar', label: 'Get in the Keystone Sedan', d: dc };
      }
      if (this.subject) {
        const ds = Math.hypot(this.subjectPos.x - p.x, this.subjectPos.z - p.z);
        if (ds < 5 && (!best || ds < best.d)) best = { id: 'subject', label: 'Talk to your client', d: ds };
      }
      return best ? { id: best.id, label: best.label } : null;
    }
    const refs = this.current!.refs as InteriorRefs;
    let best: { id: string; label: string; d: number } | null = null;
    refs.props.forEach((pr) => {
      const d = Math.hypot(pr.x - p.x, pr.z - p.z);
      if (d < 2.6 && (!best || d < best.d)) best = { id: 'prop:' + pr.id, label: pr.label, d };
    });
    if (this.subject) {
      const ds = Math.hypot(this.subjectPos.x - p.x, this.subjectPos.z - p.z);
      if (ds < 4 && (!best || ds < best.d)) best = { id: 'subject', label: 'Talk to your client', d: ds };
    }
    return best ? { id: best.id, label: best.label } : null;
  }

  pushHud(force = false) {
    const t = this.interactTarget();
    const h: Hud = {
      prompt: t ? t.label : null,
      interactId: t ? t.id : null,
      speed: this.inCar ? Math.abs(this.carSpeed) : this.playerVel.length(),
      inCar: this.inCar,
      scene: this.currentId,
      camMode: this.camMode,
      ev: this.sceneEV(),
      meter: this.meterError(),
      parked: this.isParked(),
      hasSubject: !!this.subject,
    };
    const key = `${h.prompt}|${h.inCar}|${h.scene}|${h.camMode}|${Math.round(h.speed)}|${h.parked}|${h.hasSubject}`;
    if (force || key !== this.lastHud) { this.lastHud = key; this.onHud?.(h); }

  }

  // ---------------------------------------------------------
  loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const rawDt = Math.min(0.05, this.clock.getDelta());

    // Mobile targets ~30fps: skip frames until enough real time has passed,
    // then step by the fixed target interval rather than the accumulated
    // (possibly larger) gap, so movement speed stays consistent.
    let dt = rawDt;
    if (this.frameInterval > 0) {
      this.frameAccum += rawDt;
      if (this.frameAccum < this.frameInterval) return;
      this.frameAccum = 0;
      dt = this.frameInterval;
    }

    // FPS is measured over real wall-clock time between rendered frames, so
    // it reflects the effective output rate whether or not throttling above
    // is active (rawDt/dt alone can't tell us how many ticks were skipped).
    const now = performance.now();
    this.fpsFrames += 1;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / elapsed);
      this.fpsWindowStart = now;
      this.fpsFrames = 0;
    }

    const t = this.clock.elapsedTime;
    if (!this.paused) this.update(dt, t);
    this.render(t);
    this.pushHud();
    this.drawMinimap();
  };

  update(dt: number, t: number) {
    const run = input.isHeld('sprint');

    // ---- day/night + weather ----
    const s = getState();
    if (this.current?.kind === 'district') {
      const refs = this.current.refs as WorldRefs;
      const h = s.clock / 60;
      const dayAmt = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
      const night = dayAmt < 0.08;
      const weatherDim = s.weather === 'clear' ? 1 : s.weather === 'overcast' ? 0.6 : 0.42;
      refs.sun.intensity = dayAmt * 1.25 * weatherDim;
      refs.sun.position.set(Math.cos(((h - 6) / 12) * Math.PI) * 80, 20 + dayAmt * 70, 30);
      refs.hemi.intensity = 0.15 + dayAmt * 0.65 * weatherDim;
      refs.hemi.color.setHex(night ? 0x2a3348 : 0x9fb8d0);
      const skyC = night ? 0x0d1018 : s.weather === 'rain' ? 0x5a6068 : s.weather === 'snow' ? 0x9aa2ac : 0x7fa6cc;
      (this.scene.background as THREE.Color).setHex(skyC);
      this.scene.fog!.color.setHex(skyC);
      refs.streetLights.forEach((l) => { l.intensity = night ? 1.15 : 0; });
      refs.windowMats.forEach((m, i) => { m.color.setHex(night ? (i % 3 === 0 ? 0x2a3040 : 0xffdc9e) : 0x27303c); });
      refs.roadMat.color.setHex(s.weather === 'rain' ? 0x22232a : s.weather === 'snow' ? 0x6a6c70 : 0x35343a);
      (refs.ground.material as THREE.MeshLambertMaterial).color.setHex(s.weather === 'snow' ? 0xcfd4d8 : s.weather === 'rain' ? 0x46443f : 0x5d5b56);

      // rain / snow
      refs.rain.visible = s.weather === 'rain';
      refs.snow.visible = s.weather === 'snow';
      const pr = refs.rain.geometry.attributes.position as THREE.BufferAttribute;
      if (refs.rain.visible || refs.snow.visible) {
        const target = refs.rain.visible ? refs.rain : refs.snow;
        const arr = (target.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const fall = refs.rain.visible ? 42 : 5;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] -= fall * dt;
          if (arr[i] < 0) arr[i] = 30;
        }
        (target.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        target.position.set(this.playerPos.x, 0, this.playerPos.z);
      }
      void pr;

      // train
      this.trainT -= dt;
      if (this.trainT < 0) {
        this.trainT = 34 + Math.random() * 25;
        refs.train.position.x = -260;
        sfx.train();
      }
      if (refs.train.position.x < 300) refs.train.position.x += 46 * dt;

      // traffic
      refs.traffic.forEach((c) => {
        c.angle += c.speed * dt;
        const x = Math.cos(c.angle) * c.radius + c.cx;
        const z = Math.sin(c.angle) * (c.radius * 0.28) + c.cz;
        c.mesh.position.set(x, 0, z);
        c.mesh.rotation.y = -c.angle + Math.PI / 2;
      });
      refs.peds.forEach((p) => {
        p.angle += p.speed * dt;
        const x = p.cx + Math.cos(p.angle) * p.radius * 0.4;
        const z = p.cz + Math.sin(p.angle) * 3;
        p.parts.group.position.set(x, 0, z);
        p.parts.group.rotation.y = -p.angle;
        animateCharacter(p.parts, t + p.angle, 1.6);
      });
    }

    // ---- car ----
    if (this.inCar && this.car) {
      const acc = (input.isHeld('move-forward') ? 16 : 0) - (input.isHeld('move-back') ? 14 : 0);
      const brake = input.isHeld('handbrake') ? 0.9 : 0;
      this.carSpeed += acc * dt;
      this.carSpeed *= 1 - (0.6 + brake * 4) * dt;
      this.carSpeed = Math.max(-9, Math.min(26, this.carSpeed));
      const steer = (input.isHeld('move-left') ? 1 : 0) - (input.isHeld('move-right') ? 1 : 0);
      this.carRot += steer * dt * 1.5 * Math.min(1, Math.abs(this.carSpeed) / 6) * Math.sign(this.carSpeed || 1);
      const next = this.carPos.clone();
      next.x += Math.sin(this.carRot) * this.carSpeed * dt;
      next.z += Math.cos(this.carRot) * this.carSpeed * dt;
      const before = next.clone();
      this.collide(next, 1.5);
      if (before.distanceTo(next) > 0.01) this.carSpeed *= 0.4;
      this.carPos.copy(next);
      this.car.position.copy(this.carPos);
      this.car.rotation.y = this.carRot;
      this.playerPos.copy(this.carPos);
      sfx.engine(true, Math.abs(this.carSpeed));
      this.yaw += (this.carRot + Math.PI - this.yaw) * Math.min(1, dt * 3);
    } else {
      sfx.engine(false);
      // ---- player ----
      const speed = (this.camMode ? 2.2 : run ? 6.2 : 3.1);
      const fwd = (input.isHeld('move-forward') ? 1 : 0) - (input.isHeld('move-back') ? 1 : 0);
      const strafe = (input.isHeld('move-right') ? 1 : 0) - (input.isHeld('move-left') ? 1 : 0);
      const dir = new THREE.Vector3();
      if (fwd || strafe) {
        const camDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const right = new THREE.Vector3(camDir.z, 0, -camDir.x);
        dir.addScaledVector(camDir, -fwd).addScaledVector(right, -strafe).normalize();
      }
      this.playerVel.lerp(dir.multiplyScalar(speed), Math.min(1, dt * 12));
      const next = this.playerPos.clone().addScaledVector(this.playerVel, dt);
      this.collide(next);
      if (this.currentId === 'district') {
        next.x = Math.max(-150, Math.min(150, next.x));
        next.z = Math.max(-70, Math.min(100, next.z));
      }
      this.playerPos.copy(next);
      const moving = this.playerVel.length() > 0.4;
      if (moving && !this.camMode) {
        this.playerRot = Math.atan2(this.playerVel.x, this.playerVel.z);
        this.stepT -= dt;
        if (this.stepT < 0) { this.stepT = run ? 0.28 : 0.44; sfx.step(run); }
      }
      this.player.group.position.copy(this.playerPos);
      this.player.group.rotation.y = this.playerRot;
      animateCharacter(this.player, t, moving ? this.playerVel.length() : 0);
    }

    // ---- subject ----
    if (this.subject) {
      this.blinkT -= dt;
      if (this.blinkT < 0) {
        const relaxed = this.subjectConfidence / 100;
        this.eyesClosed = !this.eyesClosed;
        this.blinkT = this.eyesClosed ? 0.12 + Math.random() * 0.12 : 1.2 + relaxed * 3.4 + Math.random() * 2;
      }
      this.subjectMotion = 0.12 + (1 - this.subjectConfidence / 100) * 0.5 + (this.subjectPose.stance === 'walk' ? 0.7 : 0);
      applyPose(this.subject, this.subjectPose, this.subjectConfidence, t, this.eyesClosed);
      const face = new THREE.Vector3(this.playerPos.x - this.subjectPos.x, 0, this.playerPos.z - this.subjectPos.z);
      this.subject.group.rotation.y = Math.atan2(face.x, face.z) + this.subjectPose.shoulders * 0.3;
      const lightInFront = this.light.on;
      this.subject.catchL.visible = lightInFront;
      this.subject.catchR.visible = lightInFront;
    }

    // ---- camera ----
    if (this.camMode) {
      this.camera.fov = 2 * Math.atan(24 / (2 * this.cam.focal)) * (180 / Math.PI) * (this.cam.portrait ? 0.8 : 1);
      this.camera.position.set(this.playerPos.x, this.cam.height, this.playerPos.z);
      const look = new THREE.Vector3(
        this.playerPos.x - Math.sin(this.yaw) * 5,
        this.cam.height - Math.sin(this.pitch) * 5,
        this.playerPos.z - Math.cos(this.yaw) * 5,
      );
      this.camera.lookAt(look);
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.fov = 55;
      const target = new THREE.Vector3(this.playerPos.x, this.inCar ? 1.6 : 1.35, this.playerPos.z);
      const d = this.inCar ? 9.5 : this.dist;
      const desired = new THREE.Vector3(
        target.x + Math.sin(this.yaw) * d * Math.cos(this.pitch),
        target.y + Math.sin(this.pitch) * d + 1.2,
        target.z + Math.cos(this.yaw) * d * Math.cos(this.pitch),
      );
      this.camera.position.lerp(desired, Math.min(1, dt * 8));
      this.camera.lookAt(target);
      this.camera.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------
  render(t: number) {
    if (!this.renderer) return;
    if (!this.camMode) {
      this.camera.layers.enableAll();
      this.renderer.setClearAlpha(1);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // camera mode: two passes + 2D composite
    const fx = this.fx!;
    const ctx = fx.getContext('2d')!;
    const c = this.cam;
    const err = this.meterError();
    const brightness = Math.max(0.15, Math.min(3.2, Math.pow(2, -err * 0.55)));

    // pass A: full scene
    this.camera.layers.enableAll();
    this.renderer.setClearAlpha(1);
    this.renderer.render(this.scene, this.camera);

    const subjDist = this.subject ? this.camera.position.distanceTo(this.subjectHeadPos()) : c.focus;
    const bgBlur = Math.min(14, (c.focal / 40) * (3.2 / Math.max(1.2, c.aperture)) * 3.4);
    const focusErr = Math.abs(c.focus - subjDist);
    const subjBlur = Math.min(12, focusErr * (c.focal / 45) * (5 / Math.max(1.2, c.aperture)) * 2.6);

    ctx.save();
    ctx.filter = `blur(${bgBlur.toFixed(2)}px) brightness(${brightness.toFixed(2)})`;
    ctx.drawImage(this.canvas!, 0, 0, fx.width, fx.height);
    ctx.restore();

    // pass B: subject only (layer 1)
    if (this.subject) {
      const bg = this.scene.background;
      this.scene.background = null;
      const fog = this.scene.fog;
      this.scene.fog = null;
      this.camera.layers.set(1);
      this.renderer.setClearAlpha(0);
      this.renderer.render(this.scene, this.camera);
      this.scene.background = bg;
      this.scene.fog = fog;
      this.camera.layers.enableAll();

      const shakeLimit = 1 / c.focal;
      const shake = c.shutter > shakeLimit ? Math.min(6, ((c.shutter / shakeLimit) - 1) * 2.4) : 0;
      const motion = c.shutter > 1 / 125 ? Math.min(9, (c.shutter * 125 - 1) * this.subjectMotion * 7) : 0;
      const ghosts = motion > 0.4 ? 4 : 1;
      const distort = c.focal < 35 && subjDist < 1.4 ? 1.09 : 1;
      ctx.save();
      ctx.filter = `blur(${subjBlur.toFixed(2)}px) brightness(${brightness.toFixed(2)})`;
      for (let i = 0; i < ghosts; i++) {
        ctx.globalAlpha = i === 0 ? 1 : 0.34;
        const ox = (i * motion) * 1.6 + (i ? shake : 0);
        const w = fx.width * distort, h = fx.height * distort;
        ctx.drawImage(this.canvas!, -(w - fx.width) / 2 + ox, -(h - fx.height) / 2, w, h);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // white balance tint
    const k = c.wb === 'Auto' ? this.ambientKelvin() : c.kelvin;
    const delta = (this.ambientKelvin() - k) / 4000;
    if (Math.abs(delta) > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = Math.min(0.55, Math.abs(delta) * 0.75);
      ctx.fillStyle = delta > 0 ? '#ff9a3c' : '#4c8fff';
      ctx.fillRect(0, 0, fx.width, fx.height);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // grain
    const grain = Math.max(0, Math.log2(c.iso / 100) / 7);
    if (grain > 0.02 && this.noise) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, grain * 0.55);
      ctx.globalCompositeOperation = 'overlay';
      const step = 128;
      for (let x = 0; x < fx.width; x += step) {
        for (let y = 0; y < fx.height; y += step) {
          ctx.drawImage(this.noise, x + ((t * 90) % 8), y + ((t * 70) % 8), step, step);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // vignette
    const g = ctx.createRadialGradient(fx.width / 2, fx.height / 2, fx.height * 0.3, fx.width / 2, fx.height / 2, fx.height * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, fx.width, fx.height);

    // portrait crop bars
    if (c.portrait) {
      const barW = fx.width * 0.19;
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, 0, barW, fx.height);
      ctx.fillRect(fx.width - barW, 0, barW, fx.height);
    }

    // rule of thirds
    if (c.grid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      const l = c.portrait ? fx.width * 0.19 : 0;
      const w = fx.width - l * 2;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(l + (w / 3) * i, 0); ctx.lineTo(l + (w / 3) * i, fx.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(l, (fx.height / 3) * i); ctx.lineTo(fx.width - l, (fx.height / 3) * i); ctx.stroke();
      }
    }
  }

  ambientKelvin() {
    const s = getState();
    if (this.currentId !== 'district') return this.currentId === 'bar' ? 3000 : 3600;
    const night = s.clock < 6 * 60 || s.clock > 19 * 60;
    if (night) return 2900;
    return s.weather === 'overcast' || s.weather === 'rain' ? 7000 : 5500;
  }

  /** capture the current viewfinder frame */
  capture(): { full: string; thumb: string; settings: ShotSettings; motion: number; comp: number; eyesClosed: boolean } {
    const fx = this.fx!;
    const full = fx.toDataURL('image/jpeg', 0.7);
    const tc = document.createElement('canvas');
    tc.width = 240; tc.height = Math.round(240 * (fx.height / fx.width));
    tc.getContext('2d')!.drawImage(fx, 0, 0, tc.width, tc.height);
    const thumb = tc.toDataURL('image/jpeg', 0.55);
    const c = this.cam;
    const subjDist = this.subject ? this.camera.position.distanceTo(this.subjectHeadPos()) : c.focus;
    const settings: ShotSettings = {
      aperture: c.aperture, shutter: c.shutter, iso: c.iso, focal: c.focal,
      focusDist: c.focus, subjectDist: subjDist, wb: c.wb, kelvin: c.kelvin,
      portrait: c.portrait, height: c.height,
      lightPower: this.light.on ? this.light.power : 0, lightDist: this.lightDistance(),
      modifier: this.light.modifier, reflector: this.light.reflector,
    };
    sfx.shutter();
    if (this.light.on) sfx.flash();
    return { full, thumb, settings, motion: this.subjectMotion, comp: this.compositionScore(), eyesClosed: this.eyesClosed };
  }

  // ---------------------------------------------------------
  drawMinimap() {
    const c = this.minimap;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#14151a';
    ctx.fillRect(0, 0, W, H);
    if (this.currentId !== 'district') {
      ctx.fillStyle = '#8b8177';
      ctx.font = '11px monospace';
      ctx.fillText('INTERIOR', 12, H / 2);
      return;
    }
    const scale = W / 240;
    const px = this.playerPos.x, pz = this.playerPos.z;
    const toX = (x: number) => W / 2 + (x - px) * scale;
    const toY = (z: number) => H / 2 + (z - pz) * scale;
    ctx.fillStyle = '#26262c';
    ctx.fillRect(0, toY(-12), W, 24 * scale);
    LOTS.forEach((l) => {
      ctx.fillStyle = l.kind === 'home' ? '#a8593f' : l.kind === 'studio' ? '#c8b273' : l.kind === 'outdoor' ? '#4a6b4a' : '#4a4d55';
      ctx.fillRect(toX(l.pos[0] - l.size[0] / 2), toY(l.pos[1] - l.size[1] / 2), l.size[0] * scale, l.size[1] * scale);
    });
    PARKING.forEach((p) => {
      ctx.fillStyle = '#3d5a6b';
      ctx.fillRect(toX(p[0]) - 2, toY(p[1]) - 3, 4, 6);
    });
    if (this.car) {
      ctx.fillStyle = '#7fc4e8';
      ctx.fillRect(toX(this.carPos.x) - 2.5, toY(this.carPos.z) - 3.5, 5, 7);
    }
    // player arrow
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-this.playerRot + Math.PI);
    ctx.fillStyle = '#e8c46a';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-4.5, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2c2c33';
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  /** world→screen for the GO HERE arrow */
  waypointScreen(x: number, z: number): { x: number; y: number; behind: boolean; dist: number } {
    const v = new THREE.Vector3(x, 1.6, z);
    const d = v.distanceTo(this.camera.position);
    v.project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, behind: v.z > 1, dist: d };
  }
}

export const engine = new Engine();
export type { CharParts };
