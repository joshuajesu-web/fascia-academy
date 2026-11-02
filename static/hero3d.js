// A see-through chrome figure with the main myofascial lines traced over the skin
// and the nervous system glowing inside. Lines are defined by skeleton joints plus
// a direction; fascial points are snapped onto the body surface with a raycast.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { LoopSubdivision } from "three-subdivide";

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
camera.position.set(0, 0.95, 4.2);
camera.lookAt(0, 0.92, 0);

// The figure turns on its vertical axis (not the camera), so the lighting stays even.
const figure = new THREE.Group();
scene.add(figure);
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2, 3, 4);
scene.add(key, new THREE.HemisphereLight(0xffffff, 0xd5d9dd, 0.8));

// Drag to spin; it eases back to a steady revolution.
const AUTO_SPEED = reduceMotion ? 0 : 0.4;
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

// The model's own bone names, under the names the line definitions use.
const BONES = {
  Hips: "spine", Spine: "spine001", Spine1: "spine002", Spine2: "spine003", Neck: "spine004", Head: "spine005",
  LeftShoulder: "shoulderL", LeftArm: "upper_armL", LeftForeArm: "forearmL", LeftHand: "handL",
  RightShoulder: "shoulderR", RightArm: "upper_armR", RightForeArm: "forearmR", RightHand: "handR",
  LeftUpLeg: "thighL", LeftLeg: "shinL", LeftFoot: "footL", LeftToeBase: "toeL",
  RightUpLeg: "thighR", RightLeg: "shinR", RightFoot: "footR", RightToeBase: "toeR",
};

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
    P("Hips", [0, 0, -1], [s * 0.035, 0.02, 0]),
    P("Spine", [0, 0, -1], [s * 0.035, 0, 0]),
    P("Spine1", [0, 0, -1], [s * 0.035, 0, 0]),
    P("Spine2", [0, 0, -1], [s * 0.035, 0, 0]),
    P("Neck", [0, 0, -1], [s * 0.025, 0, 0]),
    P("Head", [0, 0, -1], [s * 0.025, 0.06, 0]),
    P("Head", [0, 0.7, -0.7], [s * 0.025, 0.13, 0]),
    P("Head", [0, 1, 0], [s * 0.025, 0.15, 0.02]),
    P("Head", [0, 0.5, 1], [s * 0.025, 0.12, 0.03]),
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
    P("Hips", [0, 0, 1], [s * 0.03, 0, 0]),
    P("Spine", [0, 0, 1], [s * 0.035, 0, 0]),
    P("Spine1", [0, 0, 1], [s * 0.04, 0, 0]),
    P("Spine2", [0, 0, 1], [s * 0.04, 0.05, 0]),
    P("Neck", [s * 0.6, 0, 1], [s * 0.03, -0.03, 0]),
    P("Neck", [s, 0, 0.4], [s * 0.03, 0.03, 0]),
    P("Head", [s, 0, -0.3], [s * 0.03, 0.03, -0.02]),
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
    P("Hips", [s, 0, 0], [0, 0.1, 0]),
    P("Spine1", [s, 0, 0]),
    P("Spine2", [s, 0, 0], [0, 0.04, 0]),
    P("Neck", [s, 0, 0]),
    P("Head", [s, 0, 0], [0, 0.08, 0]),
  ];
}

function spiralLine() {
  const R = -1; // starts at the right side of the skull, wraps to the left shoulder, back to the right foot
  return [
    P("Head", [R * 0.6, 0, -1], [R * 0.03, 0.08, 0]),
    P("Neck", [0, 0, -1]),
    P("Spine2", [0, 0, -1], [-R * 0.06, 0.03, 0]),
    P("Spine2", [-R * 0.7, 0, -0.7], [-R * 0.09, -0.03, 0]),
    P("Spine1", [-R, 0, 0]),
    P("Spine1", [-R * 0.5, 0, 1], [-R * 0.06, -0.04, 0]),
    P("Spine", [0, 0, 1], [0, -0.02, 0]),
    P("Hips", [R * 0.3, 0, 1], [R * 0.08, 0.04, 0]),
    P(["RightUpLeg", "RightLeg", 0.4], [R * 0.7, 0, 0.7]),
    P("RightLeg", [R * 0.5, 0, 1]),
    P(["RightLeg", "RightFoot", 0.4], [-R * 0.2, 0, 1]),
    P("RightFoot", [-R, -0.5, 0], [-R * 0.02, -0.04, 0.04]),
    P("RightFoot", [R, -0.3, -0.3], [R * 0.01, -0.02, -0.02]),
    P(["RightLeg", "RightFoot", 0.5], [R * 0.7, 0, -0.7]),
    P("RightLeg", [R * 0.5, 0, -1]),
    P(["RightUpLeg", "RightLeg", 0.45], [R * 0.3, 0, -1]),
    P("Hips", [0, 0, -1], [R * 0.03, 0.02, 0]),
    P("Spine", [0, 0, -1], [R * 0.04, 0, 0]),
    P("Spine1", [0, 0, -1], [R * 0.04, 0, 0]),
    P("Spine2", [0, 0, -1], [R * 0.04, 0, 0]),
    P("Neck", [0, 0, -1], [R * 0.02, 0, 0]),
    P("Head", [R * 0.6, 0, -1], [R * 0.03, 0.08, 0]),
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

const FASCIA = [
  ["back", backLine("Left", 1)], ["back", backLine("Right", -1)],
  ["front", frontLine("Left", 1)], ["front", frontLine("Right", -1)],
  ["lateral", lateralLine("Left", 1)], ["lateral", lateralLine("Right", -1)],
  ["spiral", spiralLine()],
  ["arm", armLine("Left", 1)], ["arm", armLine("Right", -1)],
];

// Nerves run inside the body, so they are plain paths through the skeleton: [bone or lerp, offset].
const N = (b, o = [0, 0, 0]) => ({ b, o });
function nerves() {
  const paths = [];
  paths.push({ r: 0.009, pts: [N("Head", [0, 0.06, -0.01]), N("Head", [0, 0, -0.02]), N("Neck", [0, 0, -0.03]), N("Spine2", [0, 0, -0.05]),
    N("Spine1", [0, 0, -0.06]), N("Spine", [0, 0, -0.06]), N("Hips", [0, 0.04, -0.06])] });
  for (const [S, s] of [["Left", 1], ["Right", -1]]) {
    // Brachial plexus out to the hand, in two strands (median and ulnar).
    for (const lane of [0.012, -0.012]) {
      paths.push({ r: 0.0035, pts: [N("Neck", [0, -0.02, -0.03]), N(S + "Shoulder", [0, -0.02, lane]), N(S + "Arm", [0, -0.03, lane]),
        N([S + "Arm", S + "ForeArm", 0.5], [0, 0, lane]), N(S + "ForeArm", [0, 0, lane]),
        N([S + "ForeArm", S + "Hand", 0.5], [0, 0, lane]), N(S + "Hand", [0, -0.04, lane])] });
    }
    // Intercostal nerves wrapping round the ribs.
    for (const [bone, y] of [["Spine2", 0.04], ["Spine2", -0.04], ["Spine1", 0.02], ["Spine1", -0.05]]) {
      paths.push({ r: 0.0025, pts: [N(bone, [0, y, -0.06]), N(bone, [s * 0.07, y, -0.06]), N(bone, [s * 0.12, y - 0.01, 0]),
        N(bone, [s * 0.09, y - 0.02, 0.07]), N(bone, [s * 0.03, y - 0.03, 0.09])] });
    }
    // Sciatic nerve down the back of the leg, splitting into tibial (sole) and peroneal (top of the foot).
    paths.push({ r: 0.0045, pts: [N("Hips", [s * 0.02, 0.02, -0.06]), N("Hips", [s * 0.06, -0.05, -0.05]), N([S + "UpLeg", S + "Leg", 0.2], [0, 0, -0.04]),
      N([S + "UpLeg", S + "Leg", 0.6], [0, 0, -0.04]), N(S + "Leg", [0, 0.04, -0.035])] });
    paths.push({ r: 0.0035, pts: [N(S + "Leg", [0, 0.04, -0.035]), N([S + "Leg", S + "Foot", 0.4], [0, 0, -0.03]),
      N([S + "Leg", S + "Foot", 0.9], [0, 0, -0.03]), N(S + "Foot", [0, -0.04, 0.02]), N(S + "ToeBase", [0, 0.01, 0.02])] });
    paths.push({ r: 0.0035, pts: [N(S + "Leg", [0, 0.04, -0.035]), N(S + "Leg", [s * 0.04, 0, 0]),
      N([S + "Leg", S + "Foot", 0.5], [s * 0.015, 0, 0.025]), N(S + "Foot", [0, 0.01, 0.05]), N(S + "ToeBase", [0, 0.02, 0.03])] });
    // Femoral nerve down the front of the thigh.
    paths.push({ r: 0.0035, pts: [N("Hips", [s * 0.02, 0.08, -0.04]), N("Hips", [s * 0.07, 0, 0.04]),
      N([S + "UpLeg", S + "Leg", 0.4], [0, 0, 0.035]), N(S + "Leg", [0, 0.03, 0.03])] });
  }
  return paths;
}

const lineMaterial = (phase, { base, glow, speed, width }) => new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uFocus: { value: 1 } },
  // vNear fades whatever is on the far side of the body, so the near side reads first.
  vertexShader: `varying vec2 vUv; varying float vNear;
    void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0);
      vNear = smoothstep(-4.35, -4.05, mv.z); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `
    uniform float uTime, uPhase, uFocus; varying vec2 vUv; varying float vNear;
    void main(){
      float head = fract(uTime * ${speed.toFixed(3)} + uPhase);
      float d = vUv.x - head; d = d - floor(d + 0.5);
      float pulse = exp(-pow(d * ${width.toFixed(1)}, 2.0));
      vec3 col = mix(vec3(${base}), vec3(${glow}), pulse);
      gl_FragColor = vec4(col, mix(0.1, 1.0, uFocus) * mix(0.18, 1.0, vNear));
    }`,
});
const FASCIA_STYLE = { base: "0.2, 0.23, 0.27", glow: "0.93, 0.95, 0.97", speed: 0.12, width: 9 };
const NERVE_STYLE = { base: "0.5, 0.55, 0.6", glow: "1.0, 1.0, 1.0", speed: 0.45, width: 16 };

// See-through chrome skin, plus a silver rim so the silhouette reads on a white page.
const skinMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf0f2f4, metalness: 1, roughness: 0.1, envMapIntensity: 1.8,
  transparent: true, opacity: 0.36, depthWrite: false,
});
const rimMaterial = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(vec3(0.42, 0.46, 0.5), f * 0.85); }`,
});

const animated = [];
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
  let skinned;
  model.traverse((o) => { if (o.isSkinnedMesh) skinned = o; });
  const raw = (name) => model.getObjectByName(name);

  // Bring the arms in from the A-pose towards the body.
  model.updateMatrixWorld(true);
  const rotateWorld = (name, axis, angle) => {
    const b = raw(name);
    const parentQ = b.parent.getWorldQuaternion(new THREE.Quaternion());
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), angle);
    b.quaternion.premultiply(parentQ.clone().invert().multiply(turn).multiply(parentQ));
    model.updateMatrixWorld(true);
  };
  rotateWorld("upper_armL", [1, 0, 0], -0.42);
  rotateWorld("upper_armR", [1, 0, 0], 0.42);

  // The model faces +x with its feet at y = -1. Turn it to face the camera, stand it on the floor, ~1.8 m tall.
  const place = new THREE.Matrix4().makeTranslation(0, 0.92, 0)
    .multiply(new THREE.Matrix4().makeScale(0.92, 0.92, 0.92))
    .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));

  // Freeze the posed, skinned mesh into plain geometry and smooth it.
  const posed = new THREE.BufferGeometry();
  const count = skinned.geometry.attributes.position.count;
  const arr = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    skinned.getVertexPosition(i, v);
    v.applyMatrix4(skinned.matrixWorld).applyMatrix4(place);
    arr.set([v.x, v.y, v.z], i * 3);
  }
  posed.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  posed.setIndex(skinned.geometry.index.clone());
  const smooth = LoopSubdivision.modify(mergeVertices(posed, 1e-4), 2, { split: false, preserveEdges: false });
  smooth.computeVertexNormals();

  const body = new THREE.Mesh(smooth, skinMaterial);
  const rim = new THREE.Mesh(smooth, rimMaterial);
  body.renderOrder = 3;
  rim.renderOrder = 4;
  figure.add(body, rim);

  const bonePos = (name) => raw(BONES[name]).getWorldPosition(new THREE.Vector3()).applyMatrix4(place);
  const anchorOrigin = (p) => {
    const o = Array.isArray(p.b) ? bonePos(p.b[0]).lerp(bonePos(p.b[1]), p.b[2]) : bonePos(p.b);
    return o.add(new THREE.Vector3(...p.o));
  };

  // Rays start inside the limb, so the surface must register from its back face too.
  const ray = new THREE.Raycaster();
  const hitMesh = new THREE.Mesh(smooth, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const misses = [];

  // Walk along the line in small steps and snap every step onto the skin, so the
  // line follows the body's contours instead of cutting straight between anchors.
  function traceOnSurface(pts) {
    const inner = new THREE.CatmullRomCurve3(pts.map(anchorOrigin), false, "centripetal");
    const dirs = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p.d).normalize()), false, "centripetal");
    const samples = Math.max(60, pts.length * 14);
    let out = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const origin = inner.getPoint(t);
      const dir = dirs.getPoint(t).normalize();
      ray.set(origin, dir);
      ray.far = 0.4;
      const hit = ray.intersectObject(hitMesh, false)[0];
      if (hit) out.push(hit.point.addScaledVector(dir, 0.005));
      else misses.push(t.toFixed(2));
    }
    for (let pass = 0; pass < 3; pass++) {
      out = out.map((p, i) => (i === 0 || i === out.length - 1 ? p : p.clone().add(out[i - 1]).add(out[i + 1]).divideScalar(3)));
    }
    return new THREE.CatmullRomCurve3(out, false, "centripetal");
  }

  const groups = {};
  const addTube = (group, curve, radius, mat) => {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, radius, 8, false), mat);
    tube.renderOrder = group === "nerves" ? 1 : 5;
    figure.add(tube);
    animated.push(mat);
    (groups[group] = groups[group] || []).push(mat);
  };
  FASCIA.forEach(([g, pts], i) => addTube(g, traceOnSurface(pts), 0.0052, lineMaterial(i * 0.137, FASCIA_STYLE)));
  nerves().forEach((n, i) => addTube("nerves", new THREE.CatmullRomCurve3(n.pts.map(anchorOrigin), false, "centripetal"), n.r * 0.7, lineMaterial(i * 0.173, NERVE_STYLE)));

  // The brain: a cloud of points filling the skull, twinkling like activity.
  const head = bonePos("Head");
  const brainPts = [], seeds = [];
  for (let i = 0; i < 900; i++) {
    const u = new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random()));
    brainPts.push(head.x + u.x * 0.065, head.y + 0.1 + u.y * 0.055, head.z - 0.005 + u.z * 0.075);
    seeds.push(Math.random());
  }
  const brainGeo = new THREE.BufferGeometry();
  brainGeo.setAttribute("position", new THREE.Float32BufferAttribute(brainPts, 3));
  brainGeo.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  const brainMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uFocus: { value: 1 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uTime, uPx; varying float vGlow;
      void main(){ vGlow = pow(0.5 + 0.5 * sin(uTime * 3.0 + seed * 40.0), 6.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (1.4 + vGlow * 2.2) * uPx; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uFocus; varying float vGlow;
      void main(){ if (length(gl_PointCoord - 0.5) > 0.5) discard;
        gl_FragColor = vec4(mix(vec3(0.45, 0.5, 0.55), vec3(1.0), vGlow), mix(0.1, 0.75, uFocus)); }`,
  });
  const brain = new THREE.Points(brainGeo, brainMat);
  brain.renderOrder = 1;
  figure.add(brain);
  animated.push(brainMat);
  groups.nerves.push(brainMat);

  // Legend: hovering or tapping a line name highlights it.
  document.querySelectorAll("[data-line]").forEach((el) => {
    const g = el.dataset.line;
    const focus = (on) => {
      Object.entries(groups).forEach(([k, mats]) => mats.forEach((m) => (m.uniforms.uFocus.value = !on || k === g ? 1 : 0.12)));
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
  animated.forEach((m) => (m.uniforms.uTime.value = time));
  if (!dragging) {
    spin += (AUTO_SPEED - spin) * Math.min(1, dt * 1.5);
    figure.rotation.y += spin * dt;
  }
  renderer.render(scene, camera);
});
