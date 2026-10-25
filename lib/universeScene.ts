import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COSMIC_OBJECTS, CosmicObject, UniverseScale } from './universeData';
import { PLANETS } from './solarSystemData';

interface SceneEvents {
  onSelect: (id: string) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onAssetError: () => void;
}

export interface UniverseSceneController {
  select: (id: string, focus?: boolean) => void;
  overview: () => void;
  zoom: (factor: number) => void;
  setPlaying: (value: boolean) => void;
  setLabels: (value: boolean) => void;
  setAutoRotate: (value: boolean) => void;
  dispose: () => void;
}

interface Body {
  data: CosmicObject;
  group: THREE.Group;
  ring: THREE.Mesh;
  label: HTMLButtonElement;
  orbit?: THREE.Group;
  spin?: THREE.Object3D;
}

const seededRandom = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const pointTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.15, 'rgba(255,255,255,.85)');
  glow.addColorStop(0.45, 'rgba(255,255,255,.18)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
};

export function createUniverseScene(
  container: HTMLDivElement,
  scale: UniverseScale,
  events: SceneEvents,
): UniverseSceneController {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07090D');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 6500);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.5 : 1.8),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('aria-label', '宇宙三维探索场景');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.className = 'universe-canvas';
  container.append(renderer.domElement);
  const labelLayer = document.createElement('div');
  labelLayer.className = 'universe-label-layer';
  container.append(labelLayer);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.minDistance = 7;
  controls.maxDistance = scale === 'solar' ? 1900 : 1250;
  controls.rotateSpeed = 0.6;
  controls.autoRotateSpeed = 0.32;
  const rng = seededRandom(512);
  const dotTexture = pointTexture();
  const resources = new Set<THREE.Texture>([dotTexture]);
  const bodies = new Map<string, Body>();
  const pickTargets: THREE.Object3D[] = [];
  const animated: { object: THREE.Object3D; speed: number }[] = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const world = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const oldTarget = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const direction = new THREE.Vector3(0.6, 0.38, 1).normalize();
  const trackedPosition = new THREE.Vector3();
  const origin = new THREE.Vector3();
  let disposed = false;
  let frame = 0;
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let labelsVisible = true;
  let selectedId = '';
  let framing: 'overview' | 'focus' | null = 'overview';
  let tracking = false;
  let trackInitialized = false;
  let width = 1;
  let height = 1;
  let overviewDistance = 500;
  let contextLost = false;

  const points = (
    positions: number[],
    colors: number[],
    size: number,
    opacity = 1,
  ) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        map: dotTexture,
        size,
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  };

  const spiral = (
    radius: number,
    count: number,
    seed: number,
    irregular = false,
  ) => {
    const random = seededRandom(seed);
    const positions: number[] = [];
    const colors: number[] = [];
    const warm = new THREE.Color('#FFE4AD');
    const cold = new THREE.Color('#A4C7ED');
    for (let i = 0; i < count; i++) {
      const r = Math.pow(random(), 0.65) * radius;
      const armCount = radius > 100 ? 4 : 2;
      const arm = (Math.floor(random() * armCount) * Math.PI * 2) / armCount;
      const scatter = (random() - 0.5) * (irregular ? 5 : 1.25);
      const angle = arm + (r / radius) * 4.7 + scatter;
      const bulge = i < count * 0.23;
      const x = bulge ? (random() - 0.5) * radius * 0.3 : Math.cos(angle) * r;
      const z = bulge ? (random() - 0.5) * radius * 0.18 : Math.sin(angle) * r;
      positions.push(x, (random() - 0.5) * radius * (bulge ? 0.2 : 0.045), z);
      const color = warm.clone().lerp(cold, Math.min(1, (r / radius) * 1.6));
      color.multiplyScalar(0.6 + random() * 0.6);
      colors.push(color.r, color.g, color.b);
    }
    const group = new THREE.Group();
    group.add(points(positions, colors, radius > 100 ? 2.65 : 1.2, 0.95));
    return group;
  };

  const stars: number[] = [];
  const starColors: number[] = [];
  for (let i = 0; i < 2300; i++) {
    const radius = 900 + rng() * 1500;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    stars.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    );
    const color = new THREE.Color(
      i % 4 === 0 ? '#E5C9AC' : '#B5C6D9',
    ).multiplyScalar(0.35 + rng() * 0.5);
    starColors.push(color.r, color.g, color.b);
  }
  scene.add(points(stars, starColors, 2.5, 0.72));
  scene.add(new THREE.HemisphereLight(0xd8e5ff, 0x39343c, 1.3));
  scene.add(new THREE.PointLight(0xffe8cc, 2100, 1000, 1.45));

  const loading = new THREE.LoadingManager();
  loading.onLoad = () => {
    if (!disposed) events.onReady();
  };
  loading.onError = () => {
    if (!disposed) events.onAssetError();
  };
  const loader = new THREE.TextureLoader(loading);
  const loadTexture = (
    url: string,
    material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
  ) => {
    loader.load(url, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(
        8,
        renderer.capabilities.getMaxAnisotropy(),
      );
      material.color.set('#FFFFFF');
      material.map = texture;
      material.needsUpdate = true;
      resources.add(texture);
    });
  };

  const circle = (radius: number, color: string, opacity: number) => {
    const pts = new THREE.EllipseCurve(
      0,
      0,
      radius,
      radius,
      0,
      Math.PI * 2,
      false,
      0,
    )
      .getPoints(150)
      .map((point) => new THREE.Vector3(point.x, 0, point.y));
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
  };

  if (scale === 'galaxy') {
    const disk = spiral(168, 24000, 42);
    scene.add(disk);
    animated.push({ object: disk, speed: 0.012 });
    [55, 110, 170].forEach((radius) =>
      scene.add(circle(radius, '#A9BECE', 0.09)),
    );
  }

  if (scale === 'cosmos') {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 65; i++)
      nodes.push(
        new THREE.Vector3(
          (rng() - 0.5) * 380,
          (rng() - 0.5) * 140,
          (rng() - 0.5) * 340,
        ),
      );
    const positions: number[] = [];
    const colors: number[] = [];
    const linePositions: number[] = [];
    nodes.forEach((node, i) => {
      nodes
        .slice(i + 1)
        .filter((next) => next.distanceTo(node) < 88)
        .slice(0, 4)
        .forEach((next) => {
          linePositions.push(...node.toArray(), ...next.toArray());
          for (let j = 0; j < 110; j++) {
            const point = node.clone().lerp(next, rng());
            point.add(
              new THREE.Vector3(
                (rng() - 0.5) * 8,
                (rng() - 0.5) * 8,
                (rng() - 0.5) * 8,
              ),
            );
            positions.push(...point.toArray());
            colors.push(
              0.34 + rng() * 0.3,
              0.5 + rng() * 0.3,
              0.7 + rng() * 0.3,
            );
          }
        });
    });
    scene.add(points(positions, colors, 1.8, 0.75));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    scene.add(
      new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: '#96C7ED',
          transparent: true,
          opacity: 0.1,
        }),
      ),
    );
  }

  COSMIC_OBJECTS.filter((object) => object.scale === scale).forEach(
    (data, index) => {
      const group = new THREE.Group();
      group.position.fromArray(data.position);
      let orbit: THREE.Group | undefined;
      let spin: THREE.Object3D | undefined;
      const planet =
        scale === 'solar'
          ? PLANETS.find((item) => item.id === data.id)
          : undefined;
      if (planet && !planet.isMoon && !planet.isSun) {
        orbit = new THREE.Group();
        orbit.rotation.y = planet.initialAngle;
        group.position.x = planet.orbitRadius;
        orbit.add(group);
        scene.add(orbit, circle(planet.orbitRadius, '#98A7BF', 0.17));
      } else scene.add(group);

      if (planet || data.shape === 'star') {
        const material =
          planet && !planet.isSun
            ? new THREE.MeshStandardMaterial({
                color: data.color,
                roughness: 0.9,
              })
            : new THREE.MeshBasicMaterial({ color: data.color });
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(data.size, 48, 32),
          material,
        );
        group.add(sphere);
        spin = sphere;
        if (planet) loadTexture(planet.texture, material);
        if (!planet || planet.isSun) {
          const glow = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: dotTexture,
              color: data.color,
              transparent: true,
              opacity: 0.65,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          );
          glow.scale.setScalar(data.size * 7);
          group.add(glow);
        }
        if (data.id === 'sirius') {
          const companion = new THREE.Mesh(
            new THREE.SphereGeometry(0.9, 20, 16),
            new THREE.MeshBasicMaterial({ color: '#F0FAFF' }),
          );
          companion.position.set(9, 1, 0);
          group.add(companion, circle(9, '#A7CDEA', 0.35));
        }
        if (data.id === 'earth') {
          group.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(data.size * 1.035, 32, 24),
              new THREE.MeshBasicMaterial({
                color: '#5EB7FF',
                side: THREE.BackSide,
                transparent: true,
                opacity: 0.15,
              }),
            ),
          );
        }
        if (planet?.hasRing) {
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: '#DCC6A1',
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(data.size * 1.35, data.size * 2.35, 128),
            ringMaterial,
          );
          ring.rotation.x = Math.PI / 2.35;
          group.add(ring);
          loader.load('/images/solar-system/saturn-ring.png', (texture) => {
            if (disposed) {
              texture.dispose();
              return;
            }
            resources.add(texture);
            ringMaterial.alphaMap = texture;
            ringMaterial.needsUpdate = true;
          });
        }
      } else if (data.shape === 'galaxy') {
        const disk = spiral(data.size, 6500, index * 13 + 7, data.id === 'lmc');
        disk.rotation.set(
          data.id === 'andromeda' ? 0.6 : 0.18,
          index * 0.7,
          index % 2 ? 0.2 : -0.1,
        );
        group.add(disk);
        spin = disk;
        if (data.id === 'whirlpool') {
          const companion = spiral(7, 900, 918);
          companion.position.set(32, 2, -16);
          group.add(companion);
        }
      } else if (data.shape === 'nebula') {
        const positions: number[] = [];
        const colors: number[] = [];
        const color = new THREE.Color(data.color);
        for (let i = 0; i < 2200; i++) {
          const theta = rng() * Math.PI * 2;
          const phi = Math.acos(rng() * 2 - 1);
          const radius = (0.25 + rng() * 0.75) * data.size;
          positions.push(
            Math.cos(theta) * Math.sin(phi) * radius,
            Math.cos(phi) * radius * 0.55,
            Math.sin(theta) * Math.sin(phi) * radius,
          );
          const mixed = color
            .clone()
            .lerp(new THREE.Color('#D6DFFF'), rng() * 0.55);
          colors.push(mixed.r, mixed.g, mixed.b);
        }
        group.add(points(positions, colors, 1.3, 0.8));
      } else if (data.shape === 'blackhole') {
        group.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(data.size * 0.65, 48, 32),
            new THREE.MeshBasicMaterial({ color: '#010203' }),
          ),
        );
        const disk = new THREE.Mesh(
          new THREE.RingGeometry(data.size * 0.85, data.size * 1.95, 100),
          new THREE.MeshBasicMaterial({
            color: '#F7BD77',
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          }),
        );
        disk.rotation.x = Math.PI / 2.5;
        group.add(disk);
        group.add(circle(data.size * 2.3, '#F5C98D', 0.6));
      } else if (data.shape === 'cluster') {
        for (let i = 0; i < (data.id === 'local-group' ? 22 : 65); i++) {
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: dotTexture,
              color: i % 3 ? '#CCD8F6' : '#F2D4A5',
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          );
          sprite.position.set(
            (rng() - 0.5) * data.size * 2,
            (rng() - 0.5) * data.size,
            (rng() - 0.5) * data.size * 2,
          );
          sprite.scale.set(2.5 + rng() * 4, 1.8 + rng() * 2, 1);
          group.add(sprite);
        }
      } else if (data.shape === 'shell') {
        const material = new THREE.MeshBasicMaterial({
          color: data.color,
          wireframe: true,
          transparent: true,
          opacity: 0.13,
        });
        group.add(
          new THREE.Mesh(
            new THREE.IcosahedronGeometry(data.size, data.id === 'cmb' ? 3 : 2),
            material,
          ),
        );
        if (data.id === 'cmb') {
          const positions: number[] = [];
          const colors: number[] = [];
          for (let i = 0; i < 2000; i++) {
            const v = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5)
              .normalize()
              .multiplyScalar(data.size);
            positions.push(...v.toArray());
            const color = new THREE.Color(i % 2 ? '#DDA164' : '#739ED6');
            colors.push(color.r, color.g, color.b);
          }
          group.add(points(positions, colors, 1.8, 0.85));
        }
      }

      const ringRadius =
        data.id === 'saturn' ? data.size * 2.6 : data.size * 1.4;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          Math.max(3.5, ringRadius),
          Math.max(0.07, data.size * 0.008),
          8,
          96,
        ),
        new THREE.MeshBasicMaterial({
          color: '#A0E7CC',
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      group.add(ring);
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(4.5, data.size), 12, 8),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      hit.userData.objectId = data.id;
      group.add(hit);
      pickTargets.push(hit);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'universe-label';
      label.textContent = data.name;
      label.setAttribute('aria-label', `定位${data.name}`);
      label.addEventListener('click', () => events.onSelect(data.id));
      labelLayer.append(label);
      bodies.set(data.id, { data, group, ring, label, orbit, spin });
      if (spin)
        animated.push({ object: spin, speed: planet?.spinSpeed ?? 0.018 });
    },
  );

  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const span = scale === 'solar' ? 390 : scale === 'cosmos' ? 225 : 185;
    const halfFov = Math.min(
      THREE.MathUtils.degToRad(22.5),
      Math.atan(Math.tan(THREE.MathUtils.degToRad(22.5)) * camera.aspect),
    );
    overviewDistance = Math.min(
      controls.maxDistance * 0.94,
      (span / Math.sin(halfFov)) * 1.07,
    );
    if (!tracking) framing = 'overview';
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  camera.position.set(
    0.15 * overviewDistance,
    0.58 * overviewDistance,
    0.8 * overviewDistance,
  );

  const pick = (x: number, y: number): string | null => {
    const bounds = renderer.domElement.getBoundingClientRect();
    if (
      x < bounds.left ||
      x > bounds.right ||
      y < bounds.top ||
      y > bounds.bottom
    )
      return null;
    pointer.set(
      ((x - bounds.left) / bounds.width) * 2 - 1,
      (-(y - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    if (hit) return hit.object.userData.objectId;
    let nearest: string | null = null;
    let minDistance = 23;
    bodies.forEach((body) => {
      body.group.getWorldPosition(world);
      projected.copy(world).project(camera);
      if (projected.z < -1 || projected.z > 1) return;
      const distance = Math.hypot(
        ((projected.x + 1) / 2) * width - (x - bounds.left),
        ((-projected.y + 1) / 2) * height - (y - bounds.top),
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = body.data.id;
      }
    });
    return nearest;
  };
  const pointers = new Set<number>();
  let down: { id: number; x: number; y: number } | null = null;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    pointers.add(event.pointerId);
    down =
      pointers.size === 1
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null;
  };
  const onUp = (event: PointerEvent) => {
    const start = down;
    pointers.delete(event.pointerId);
    down = null;
    if (
      !start ||
      start.id !== event.pointerId ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7
    )
      return;
    const id = pick(event.clientX, event.clientY);
    if (id) events.onSelect(id);
  };
  const onCancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    down = null;
  };
  const onBlur = () => {
    pointers.clear();
    down = null;
  };
  const onMove = (event: PointerEvent) => {
    if (!pointers.size)
      renderer.domElement.style.cursor = pick(event.clientX, event.clientY)
        ? 'pointer'
        : 'grab';
  };
  const onStart = () => {
    framing = null;
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    events.onError('三维场景已中断，重新载入后可继续探索。');
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('blur', onBlur);
  controls.addEventListener('start', onStart);

  let previousTime = performance.now();
  const animate = (time: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    if (document.hidden || contextLost) return;
    if (playing) {
      animated.forEach(({ object, speed }) => {
        object.rotation.y += speed * delta;
      });
      if (scale === 'solar')
        bodies.forEach((body) => {
          const planet = PLANETS.find((item) => item.id === body.data.id);
          if (body.orbit && planet)
            body.orbit.rotation.y += planet.orbitSpeed * delta * 0.35;
        });
    }
    if (scale === 'solar') {
      const earth = bodies.get('earth');
      const moon = bodies.get('moon');
      if (earth && moon) {
        earth.group.getWorldPosition(world);
        if (playing)
          moon.group.userData.angle =
            (moon.group.userData.angle ?? 0.6) + delta * 0.3;
        const angle = moon.group.userData.angle ?? 0.6;
        moon.group.position.set(
          world.x + Math.cos(angle) * 11,
          0.7,
          world.z + Math.sin(angle) * 11,
        );
      }
    }
    scene.updateMatrixWorld(true);
    const selected = bodies.get(selectedId);
    const blend = 1 - Math.exp(-5 * delta);
    if (framing === 'overview') {
      desired.set(0.15, 0.58, 0.8).normalize().multiplyScalar(overviewDistance);
      controls.target.lerp(origin, blend);
      camera.position.lerp(desired, blend);
      if (camera.position.distanceTo(desired) < 0.5) framing = null;
    } else if (selected && framing === 'focus') {
      selected.group.getWorldPosition(world);
      const distance = Math.max(
        selected.data.size * (selectedId === 'saturn' ? 8.2 : 5),
        scale === 'solar' ? 22 : 50,
      );
      const aspectAdjust = Math.max(1, 0.85 / camera.aspect);
      desired.copy(world).addScaledVector(direction, distance * aspectAdjust);
      controls.target.lerp(world, blend);
      camera.position.lerp(desired, blend);
      if (camera.position.distanceTo(desired) < 0.25) framing = null;
      trackedPosition.copy(world);
      trackInitialized = true;
    } else if (selected && tracking) {
      selected.group.getWorldPosition(world);
      if (trackInitialized) {
        oldTarget.copy(world).sub(trackedPosition);
        controls.target.add(oldTarget);
        camera.position.add(oldTarget);
      }
      trackedPosition.copy(world);
      trackInitialized = true;
    }
    controls.update();
    renderer.render(scene, camera);
    const occupied: { x: number; y: number; width: number }[] = [];
    const sorted = [...bodies.values()].sort(
      (a, b) =>
        Number(b.data.id === selectedId) - Number(a.data.id === selectedId),
    );
    sorted.forEach((body) => {
      body.group.getWorldPosition(world);
      world.y += body.data.size * (scale === 'solar' ? 1.3 : 0.5);
      projected.copy(world).project(camera);
      const x = ((projected.x + 1) * width) / 2;
      const y = ((-projected.y + 1) * height) / 2 - 16;
      const labelWidth = body.data.name.length * 12 + 26;
      const visible =
        labelsVisible &&
        projected.z > -1 &&
        projected.z < 1 &&
        x > 20 &&
        x < width - 20 &&
        y > 15 &&
        y < height - 65 &&
        !occupied.some(
          (rect) =>
            Math.abs(rect.y - y) < 32 &&
            Math.abs(rect.x - x) < (rect.width + labelWidth) / 2 + 4,
        );
      body.label.hidden = !visible;
      if (visible) {
        body.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        occupied.push({ x, y, width: labelWidth });
      }
    });
  };
  frame = requestAnimationFrame(animate);
  // Deep-space layers are generated locally; only the solar layer waits for textures.
  if (scale !== 'solar') events.onReady();

  return {
    select(id, focus = true) {
      if (!bodies.has(id)) return;
      selectedId = id;
      bodies.forEach((body) => {
        body.ring.visible = body.data.id === id;
        body.label.classList.toggle('is-selected', body.data.id === id);
        body.label.setAttribute('aria-pressed', String(body.data.id === id));
      });
      if (focus) {
        framing = 'focus';
        tracking = true;
        trackInitialized = false;
      }
    },
    overview() {
      framing = 'overview';
      tracking = false;
      trackInitialized = false;
    },
    zoom(factor) {
      framing = null;
      desired.copy(camera.position).sub(controls.target).multiplyScalar(factor);
      desired.clampLength(controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(desired);
      controls.update();
    },
    setPlaying(value) {
      playing = value;
    },
    setLabels(value) {
      labelsVisible = value;
    },
    setAutoRotate(value) {
      controls.autoRotate = value;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        renderable.geometry?.dispose();
        if (renderable.material) {
          const materials = Array.isArray(renderable.material)
            ? renderable.material
            : [renderable.material];
          materials.forEach((material) => material.dispose());
        }
      });
      resources.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelLayer.remove();
      bodies.clear();
    },
  };
}
