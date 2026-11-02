// Rotating 3D figure with the main myofascial lines traced over the body.
// Lines are defined by skeleton joints plus a direction; each point is snapped
// onto the body surface with a raycast, so they hug the figure in any pose.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const mount = document.getElementById("body3d");
const modelUrl = mount.dataset.model;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 1.0, 4.4);
camera.lookAt(0, 0.9, 0);

// The figure turns (not the camera), so the lighting stays even all the way round.
const figure = new THREE.Group();
scene.add(figure);
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2, 3, 4);
scene.add(key, new THREE.HemisphereLight(0xffffff, 0xd5d9dd, 0.9));

// Drag to spin; it eases back to a slow auto-rotation.
const AUTO_SPEED = reduceMotion ? 0 : 0.28;
let spin = AUTO_SPEED, dragging = false, lastX = 0;
renderer.domElement.style.touchAction = "pan-y";
renderer.domElement.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; });
window.addEventListener("pointerup", () => (dragging = false));
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  figure.rotation.y += dx * 0.01;
  spin = dx * 0.6;
});

// A control point: bone, or [boneA, boneB, t] to interpolate; o = offset; d = surface direction.
const P = (b, d, o = [0, 0, 0]) => ({ b, d, o });

function backLine(S, s) {
  return [
    P(S + "ToeBase", [0, -1, 0], [0, 0.02, 0]),
    P(S + "Foot", [0, -0.6, -1], [0, -0.05, 0]),
    P([S + "Leg", S + "Foot", 0.65], [0, 0, -1]),
    P([S + "Leg", S + "Foot", 0.3], [0, 0, -1]),
    P(S + "Leg", [0, 0, -1]),
    P([S + "UpLeg", S + "Leg", 0.5], [0, 0, -1]),
    P([S + "UpLeg", S + "Leg", 0.15], [0, 0, -1], [-s * 0.02, 0, 0]),
    P("Hips", [0, 0, -1], [s * 0.035, -0.02, 0]),
    P("Spine", [0, 0, -1], [s * 0.035, 0, 0]),
    P("Spine1", [0, 0, -1], [s * 0.035, 0, 0]),
    P("Spine2", [0, 0, -1], [s * 0.035, 0, 0]),
    P("Neck", [0, 0, -1], [s * 0.025, 0, 0]),
    P("Head", [0, 0, -1], [s * 0.025, 0.04, 0]),
    P("Head", [0, 0.7, -0.7], [s * 0.025, 0.11, 0]),
    P("Head", [0, 1, 0], [s * 0.025, 0.12, 0.02]),
    P("Head", [0, 0.5, 1], [s * 0.025, 0.1, 0.03]),
  ];
}

function frontLine(S, s) {
  return [
    P(S + "ToeBase", [0, 1, 0.3], [0, 0.02, 0.02]),
    P(S + "Foot", [0, 0.3, 1], [0, 0, 0.03]),
    P([S + "Leg", S + "Foot", 0.5], [0, 0, 1]),
    P(S + "Leg", [0, 0, 1]),
    P([S + "UpLeg", S + "Leg", 0.5], [0, 0, 1]),
    P([S + "UpLeg", S + "Leg", 0.1], [0, 0, 1], [-s * 0.03, 0, 0]),
    P("Hips", [0, 0, 1], [s * 0.03, -0.04, 0]),
    P("Spine", [0, 0, 1], [s * 0.035, 0, 0]),
    P("Spine1", [0, 0, 1], [s * 0.04, 0, 0]),
    P("Spine2", [0, 0, 1], [s * 0.04, 0.05, 0]),
    P("Neck", [s * 0.6, 0, 1], [s * 0.03, -0.03, 0]),
    P("Neck", [s, 0, 0.4], [s * 0.03, 0.03, 0]),
    P("Head", [s, 0, -0.3], [s * 0.03, 0, -0.02]),
  ];
}

function lateralLine(S, s) {
  return [
    P(S + "ToeBase", [s, 0, 0], [0, 0.02, -0.04]),
    P(S + "Foot", [s, 0, -0.2], [0, -0.03, 0]),
    P([S + "Leg", S + "Foot", 0.5], [s, 0, 0]),
    P(S + "Leg", [s, 0, 0]),
    P([S + "UpLeg", S + "Leg", 0.5], [s, 0, 0]),
    P(S + "UpLeg", [s, 0, 0]),
    P("Hips", [s, 0, 0], [0, 0.08, 0]),
    P("Spine1", [s, 0, 0]),
    P("Spine2", [s, 0, 0], [0, 0.04, 0]),
    P("Neck", [s, 0, 0]),
    P("Head", [s, 0, 0], [0, 0.04, 0]),
  ];
}

function spiralLine() {
  const R = -1; // starts at the right side of the skull, wraps to the left shoulder, back to the right foot
  return [
    P("Head", [R * 0.6, 0, -1], [R * 0.03, 0.05, 0]),
    P("Neck", [0, 0, -1]),
    P("Spine2", [0, 0, -1], [-R * 0.06, 0.03, 0]),
    P("Spine2", [-R * 0.7, 0, -0.7], [-R * 0.09, -0.03, 0]),
    P("Spine1", [-R, 0, 0]),
    P("Spine1", [-R * 0.5, 0, 1], [-R * 0.06, -0.04, 0]),
    P("Spine", [0, 0, 1], [0, -0.02, 0]),
    P("Hips", [R * 0.3, 0, 1], [R * 0.08, 0, 0]),
    P(["RightUpLeg", "RightLeg", 0.4], [R * 0.7, 0, 0.7]),
    P("RightLeg", [R * 0.5, 0, 1]),
    P(["RightLeg", "RightFoot", 0.4], [-R * 0.2, 0, 1]),
    P("RightFoot", [-R, -0.5, 0], [-R * 0.02, -0.04, 0.04]),
    P("RightFoot", [R, -0.3, -0.3], [R * 0.01, -0.02, -0.02]),
    P(["RightLeg", "RightFoot", 0.5], [R * 0.7, 0, -0.7]),
    P("RightLeg", [R * 0.5, 0, -1]),
    P(["RightUpLeg", "RightLeg", 0.45], [R * 0.3, 0, -1]),
    P("Hips", [0, 0, -1], [R * 0.03, -0.03, 0]),
    P("Spine", [0, 0, -1], [R * 0.04, 0, 0]),
    P("Spine1", [0, 0, -1], [R * 0.04, 0, 0]),
    P("Spine2", [0, 0, -1], [R * 0.04, 0, 0]),
    P("Neck", [0, 0, -1], [R * 0.02, 0, 0]),
    P("Head", [R * 0.6, 0, -1], [R * 0.03, 0.05, 0]),
  ];
}

function armLine(S, s) {
  return [
    P("Spine2", [0, 0, -1], [0, 0.05, 0]),
    P(S + "Shoulder", [0, 0.6, -1]),
    P(S + "Arm", [s * 0.5, 0.6, -0.4]),
    P([S + "Arm", S + "ForeArm", 0.5], [s, 0, -0.3]),
    P(S + "ForeArm", [0, 0, -1]),
    P([S + "ForeArm", S + "Hand", 0.5], [s * 0.3, 0, -1]),
    P(S + "Hand", [s * 0.3, 0, -1]),
  ];
}

const PATHS = [
  ["back", backLine("Left", 1)], ["back", backLine("Right", -1)],
  ["front", frontLine("Left", 1)], ["front", frontLine("Right", -1)],
  ["lateral", lateralLine("Left", 1)], ["lateral", lateralLine("Right", -1)],
  ["spiral", spiralLine()],
  ["arm", armLine("Left", 1)], ["arm", armLine("Right", -1)],
];

const lineMaterial = (phase) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uFocus: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uTime, uPhase, uFocus; varying vec2 vUv;
    void main(){
      float head = fract(uTime * 0.12 + uPhase);
      float d = vUv.x - head; d = d - floor(d + 0.5);
      float pulse = exp(-pow(d * 9.0, 2.0));
      vec3 base = vec3(0.16, 0.19, 0.22);
      vec3 glow = vec3(0.93, 0.95, 0.97);
      vec3 col = mix(base, glow, pulse);
      gl_FragColor = vec4(col, mix(0.12, 0.95, uFocus));
    }`,
});

const bodyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf3f4f6, metalness: 0.18, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: 0xc9ced3,
});

// White body, silver joints: an artist's mannequin.
const jointMaterial = new THREE.MeshPhysicalMaterial({ color: 0xd3d8dd, metalness: 0.45, roughness: 0.42, clearcoat: 0.4 });

const tubes = [];
let lastFrame = performance.now();

function resize() {
  const w = mount.clientWidth, h = mount.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(mount);
resize();

new GLTFLoader().load(modelUrl, (gltf) => {
  const model = gltf.scene;
  const meshes = [];
  model.traverse((o) => {
    if (o.isMesh) {
      o.material = o.name === "Beta_Joints" ? jointMaterial : bodyMaterial;
      o.frustumCulled = false;
      meshes.push(o);
    }
  });
  figure.add(model);

  // Lower the arms from the T-pose into a relaxed standing position.
  model.updateMatrixWorld(true);
  const rotateWorld = (name, axis, angle) => {
    const b = model.getObjectByName("mixamorig" + name);
    const parentQ = b.parent.getWorldQuaternion(new THREE.Quaternion());
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), angle);
    b.quaternion.premultiply(parentQ.clone().invert().multiply(turn).multiply(parentQ));
    model.updateMatrixWorld(true);
  };
  rotateWorld("LeftArm", [0, 0, 1], -1.32);
  rotateWorld("RightArm", [0, 0, 1], 1.32);
  rotateWorld("LeftForeArm", [1, 0, 0], -0.12);
  rotateWorld("RightForeArm", [1, 0, 0], -0.12);
  model.updateMatrixWorld(true);
  meshes.forEach((m) => m.isSkinnedMesh && m.computeBoundingSphere());

  const bone = (name) => model.getObjectByName("mixamorig" + name);
  const ray = new THREE.Raycaster();
  // Rays start inside the limb, so the surface must register from its back face too.
  bodyMaterial.side = jointMaterial.side = THREE.DoubleSide;

  function anchor(p) {
    let origin;
    if (Array.isArray(p.b)) {
      const a = bone(p.b[0]).getWorldPosition(new THREE.Vector3());
      const b = bone(p.b[1]).getWorldPosition(new THREE.Vector3());
      origin = a.lerp(b, p.b[2]);
    } else {
      origin = bone(p.b).getWorldPosition(new THREE.Vector3());
    }
    return { origin: origin.add(new THREE.Vector3(...p.o)), dir: new THREE.Vector3(...p.d).normalize() };
  }

  // Walk along the line in small steps and snap every step onto the skin, so the
  // line follows the body's contours instead of cutting straight between anchors.
  function traceOnSurface(pts) {
    const anchors = pts.map(anchor);
    const inner = new THREE.CatmullRomCurve3(anchors.map((a) => a.origin), false, "centripetal");
    const dirs = new THREE.CatmullRomCurve3(anchors.map((a) => a.dir.clone()), false, "centripetal");
    const samples = Math.max(60, pts.length * 14);
    let out = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const origin = inner.getPoint(t);
      const dir = dirs.getPoint(t).normalize();
      ray.set(origin, dir);
      ray.far = 0.4;
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit) out.push(hit.point.addScaledVector(dir, 0.007));
      else misses.push(t.toFixed(2));
    }
    for (let pass = 0; pass < 3; pass++) {
      out = out.map((p, i) => (i === 0 || i === out.length - 1 ? p : p.clone().add(out[i - 1]).add(out[i + 1]).divideScalar(3)));
    }
    return new THREE.CatmullRomCurve3(out, false, "centripetal");
  }

  const misses = [];
  const groups = {};
  PATHS.forEach(([key, pts], i) => {
    const curve = traceOnSurface(pts);
    const mat = lineMaterial(i * 0.137);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 320, 0.0082, 8, false), mat);
    tube.renderOrder = 2;
    figure.add(tube);
    tubes.push(tube);
    (groups[key] = groups[key] || []).push(mat);
  });
  bodyMaterial.side = jointMaterial.side = THREE.FrontSide;

  // Legend: hovering or tapping a line name highlights it.
  document.querySelectorAll("[data-line]").forEach((el) => {
    const key = el.dataset.line;
    const focus = (on) => {
      Object.entries(groups).forEach(([k, mats]) => mats.forEach((m) => (m.uniforms.uFocus.value = !on || k === key ? 1 : 0.15)));
      document.querySelectorAll("[data-line]").forEach((x) => x.classList.toggle("is-on", on && x === el));
    };
    el.addEventListener("mouseenter", () => focus(true));
    el.addEventListener("mouseleave", () => focus(false));
    el.addEventListener("focus", () => focus(true));
    el.addEventListener("blur", () => focus(false));
  });

  mount.classList.add("is-ready");
  if (location.search.includes("debug")) {
    window.__debug = { misses, setAngle(a) { spin = 0; figure.rotation.y = a; } };
  }
}, undefined, () => mount.classList.add("is-failed"));

let time = 0;
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  if (!reduceMotion) time += dt;
  tubes.forEach((t) => (t.material.uniforms.uTime.value = time));
  if (!dragging) {
    spin += (AUTO_SPEED - spin) * Math.min(1, dt * 1.5);
    figure.rotation.y += spin * dt;
  }
  renderer.render(scene, camera);
});

