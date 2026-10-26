import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  COSMIC_BY_ID,
  COSMIC_OBJECTS,
  CosmicObject,
  UniverseScale,
} from './universeData';
import {
  UniverseContext,
  ZoomIntent,
  zoomDestination,
} from './universeNavigation';
import { PLANETS } from './solarSystemData';
import {
  SATELLITE_ORBITS, SATELLITE_SYSTEMS, PLANET_RADII_KM, SolarState,
  solarState, planetDisplayPosition, planetOrbitPosition, satelliteDisplayPosition, satelliteDisplayRadius, satelliteNorth, satelliteOrbitPath,
} from './solarSystemModel';
import {
  createBlackHoleVisual,
  createGalaxyVisual,
  createNebulaVisual,
  createSpaceNoise,
  SpaceVisual,
} from './universeVisuals';

interface SceneEvents {
  onSelect: (id: string) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onAssetError: () => void;
  onNavigate?: (direction: ZoomIntent) => void;
  onTime?: (date: Date) => void;
}

export interface UniverseSceneController {
  select: (id: string, focus?: boolean) => void;
  overview: () => void;
  zoom: (factor: number) => void;
  setPlaying: (value: boolean) => void;
  setLabels: (value: boolean) => void;
  setAutoRotate: (value: boolean) => void;
  setTimeRate: (daysPerSecond: number) => void;
  resetTime: () => void;
  getTime: () => Date;
  dispose: () => void;
}

interface Body {
  data: CosmicObject;
  group: THREE.Group;
  ring: THREE.Mesh;
  label: HTMLButtonElement;
  orbit?: THREE.Group;
  spin?: THREE.Object3D;
  axis?: THREE.Group;
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

// Carry only the last boundary gesture across scene replacement. A continuing
// wheel/pinch stream must go quiet before it can cross another boundary.
let lastBoundaryGestureAt = -Infinity;

export function createUniverseScene(
  container: HTMLDivElement,
  scale: UniverseScale,
  events: SceneEvents,
  options: {
    isolated?: boolean;
    context?: UniverseContext;
    canEnter?: (id: string) => boolean;
    canLeave?: boolean;
    date?: Date;
    objectIds?: string[];
  } = {},
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
  renderer.debug.onShaderError = () => {
    events.onError(
      '此设备暂时无法显示深空效果，可以重新载入或继续查看天体资料。',
    );
  };
  renderer.domElement.setAttribute('aria-label', '宇宙三维探索场景');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.className = 'universe-canvas';
  container.append(renderer.domElement);
  const labelLayer = document.createElement('div');
  labelLayer.className = 'universe-label-layer';
  container.append(labelLayer);

  // Labels share the same gesture surface so a pinch starting on a label is
  // still a scene zoom, not an accidental browser-page zoom.
  const controls = new OrbitControls(camera, container);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.minDistance = 7;
  controls.maxDistance = scale === 'solar' ? 1900 : 1250;
  controls.rotateSpeed = 0.6;
  controls.autoRotateSpeed = 0.32;
  const rng = seededRandom(512);
  const mobile = window.innerWidth < 700;
  const dotTexture = pointTexture();
  const spaceNoise = createSpaceNoise();
  const resources = new Set<THREE.Texture>([dotTexture, spaceNoise]);
  const visuals = new Map<string, SpaceVisual>();
  let galaxyBackdrop: SpaceVisual | undefined;
  const bodies = new Map<string, Body>();
  const pickTargets: THREE.Object3D[] = [];
  const animated: { id: string; object: THREE.Object3D; speed: number }[] = [];
  const satelliteTracks: { id: string; line: THREE.LineLoop }[] = [];
  const planetTracks: THREE.LineLoop[] = [];
  let daysPerSecond = 1 / 24;
  let epoch = options.date?.getTime() || Date.now();
  let elapsedDays = 0;
  let ephemeris: SolarState;
  let lastEphemerisTime = -Infinity;
  let lastTimeNotice = -Infinity;
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
  let navigated = false;
  let lastZoomAt = lastBoundaryGestureAt;
  let gestureStartedAt = 0;
  let zoomIntent: ZoomIntent | null = null;
  const navigationReadyAt = lastBoundaryGestureAt;
  const context = options.context;
  const solarOrbits = !context || context.mode === 'solar';
  const sceneObjects = (context?.objectIds || options.objectIds || COSMIC_OBJECTS.filter((object) => object.scale === scale).map((object) => object.id))
    .map((id) => ({
        ...COSMIC_BY_ID.get(id)!,
        position: [...COSMIC_BY_ID.get(id)!.position] as [
          number,
          number,
          number,
        ],
      }));
  if (context?.mode === 'detail') sceneObjects[0].position = [0, 0, 0];
  if (context?.mode === 'system')
    sceneObjects.forEach((object, index) => {
      object.position = [0, 0, 0];
      if (index === 0) object.size *= 1.5;
    });
  // Companions are rendered in the parent map, but keep their canonical address
  // in the corresponding planetary system when selected.
  if (scale === 'solar' && solarOrbits && !options.isolated) {
    Object.entries(SATELLITE_ORBITS).forEach(([id, orbit]) => {
      if (sceneObjects.some((object) => object.id === orbit.parent) && !sceneObjects.some((object) => object.id === id))
        sceneObjects.push({ ...COSMIC_BY_ID.get(id)!, position: [0, 0, 0] });
    });
  }
  sceneObjects.forEach((data) => {
    const moon = SATELLITE_ORBITS[data.id];
    const parent = moon && sceneObjects.find((item) => item.id === moon.parent);
    if (parent && context?.mode !== 'detail')
      data.size = Math.max(0.24, parent.size * moon.radiusKm / PLANET_RADII_KM[moon.parent] * (data.id === 'moon' ? 1 : 2.5));
  });
  const focusDistance = (data: CosmicObject) =>
    Math.max(
      solarOrbits && !options.isolated && SATELLITE_SYSTEMS[data.id]
        ? Math.max(...SATELLITE_SYSTEMS[data.id].map((id) => satelliteDisplayRadius(id, data.size, true))) * 2.65
        : 0,
      data.size *
        (data.shape === 'blackhole'
          ? 11
          : data.shape === 'nebula'
            ? 6.3
            : data.shape === 'galaxy'
              ? 3.6
              : data.id === 'saturn'
                ? 8.2
                : 5),
      scale === 'solar' ? 22 : 50,
    ) * Math.max(1, (solarOrbits && SATELLITE_SYSTEMS[data.id] ? 1.25 : 0.85) / camera.aspect);
  const inspectZoom = () => {
    if (
      !zoomIntent ||
      !events.onNavigate ||
      navigated ||
      performance.now() < navigationReadyAt ||
      gestureStartedAt < navigationReadyAt ||
      performance.now() - lastZoomAt > 180 ||
      framing
    )
      return;
    const selected = bodies.get(selectedId);
    selected?.group.getWorldPosition(world);
    const direction = zoomDestination({
      direction: zoomIntent,
      distance: camera.position.distanceTo(controls.target),
      focusDistance: selected ? focusDistance(selected.data) : 50,
      overviewDistance,
      focused:
        tracking &&
        Boolean(selected) &&
        controls.target.distanceTo(world) < Math.max(4, selected!.data.size),
      canEnter: Boolean(options.canEnter?.(selectedId)),
      canLeave: Boolean(options.canLeave),
    });
    if (direction) {
      navigated = true;
      lastBoundaryGestureAt = performance.now();
      events.onNavigate(direction);
    }
  };

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

  const sky = new THREE.Group();
  sky.name = 'distant-starfield';
  [5600, 1400, 180].forEach((count, layer) => {
    const stars: number[] = [], colors: number[] = [];
    for (let i = 0; i < count; i++) {
      const theta = rng() * Math.PI * 2, phi = Math.acos(2 * rng() - 1);
      stars.push(3200 * Math.sin(phi) * Math.cos(theta), 3200 * Math.cos(phi), 3200 * Math.sin(phi) * Math.sin(theta));
      const color = new THREE.Color(i % 7 === 0 ? '#FFD9AE' : i % 5 === 0 ? '#BFD9FF' : '#F4F3EE').multiplyScalar(0.55 + rng() * 0.45);
      colors.push(color.r, color.g, color.b);
    }
    const field = points(stars, colors, [1.2, 2.1, 3.5][layer], [0.65, 0.85, 1][layer]);
    (field.material as THREE.PointsMaterial).sizeAttenuation = false;
    field.frustumCulled = false;
    sky.add(field);
  });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xb3c7e2, 0x111216, scale === 'solar' ? 0.12 : 1.3));
  // Exposure-compensated sunlight: preserve the terminator without making the
  // outer planets unreadably dark at compressed display distances.
  const sunlight = new THREE.PointLight(0xfff4e8, scale === 'solar' ? 3.2 : 2100, scale === 'solar' ? 0 : 1000, scale === 'solar' ? 0 : 1.45);
  scene.add(sunlight);

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
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
    line.visible = !options.isolated;
    return line;
  };

  if (scale === 'galaxy' && (!context || context.mode === 'galactic')) {
    galaxyBackdrop = createGalaxyVisual(
      168,
      seededRandom(42),
      spaceNoise,
      mobile,
      context?.id === 'lmc',
    );
    scene.add(galaxyBackdrop.group);
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

  sceneObjects.forEach((data, index) => {
    const group = new THREE.Group();
    group.position.fromArray(data.position);
    let orbit: THREE.Group | undefined;
    let spin: THREE.Object3D | undefined;
    const planet = PLANETS.find((item) => item.id === data.id);
    const satellite = SATELLITE_ORBITS[data.id];
    if (satellite && context?.mode !== 'detail') {
      scene.add(group);
    } else if (context?.mode === 'system' && data.id !== context.centerId) {
      const centerSize = sceneObjects[0].size;
      const radius =
        (context.centerId === 'saturn' ? centerSize * 3 : centerSize * 2.3) +
        index * 20;
      orbit = new THREE.Group();
      orbit.rotation.y = index * 2.4;
      group.position.x = radius;
      group.userData.systemOrbit = true;
      orbit.add(group);
      scene.add(orbit, circle(radius, '#98A7BF', 0.25));
    } else if (solarOrbits && planet && !planet.isMoon && !planet.isSun && !options.isolated) {
      scene.add(group);
      const path = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 180 }, (_, i) => {
          const period = { mercury: 87.969, venus: 224.701, earth: 365.256, mars: 686.98, jupiter: 4332.59, saturn: 10759.22, uranus: 30685.4, neptune: 60189 }[data.id] || 365.256;
          return new THREE.Vector3(...planetOrbitPosition(data.id, new Date(epoch + i / 180 * period * 86400000), planet.orbitRadius));
        }),
      ), new THREE.LineBasicMaterial({ color: '#8E9DAD', transparent: true, opacity: 0.19 }));
      path.visible = !options.isolated;
      scene.add(path);
      planetTracks.push(path);
    } else scene.add(group);

    if (planet || data.shape === 'star' || data.shape === 'planet') {
      const material =
        data.shape === 'planet'
          ? new THREE.MeshStandardMaterial({
              color: data.color,
              roughness: 0.9,
            })
          : new THREE.MeshBasicMaterial({ color: data.color });
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, 48, 32),
        material,
      );
      const axis = new THREE.Group();
      axis.name = 'rotation-axis';
      group.add(axis);
      axis.add(sphere);
      group.userData.axis = axis;
      spin = sphere;
      if (planet) loadTexture(planet.texture, material);
      else if (data.texture) {
        loadTexture(data.texture, material);
      } else if (data.surface && material instanceof THREE.MeshStandardMaterial) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const paint = canvas.getContext('2d')!;
        paint.fillStyle = data.color;
        paint.fillRect(0, 0, 512, 256);
        const textureRng = seededRandom(
          data.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 91),
        );
        for (let i = 0; i < 1600; i++) {
          const x = textureRng() * 512,
            y = textureRng() * 256;
          const radius =
            data.surface === 'haze'
              ? 18 + textureRng() * 55
              : 1 + textureRng() * 12;
          paint.fillStyle = i % 3 ? '#05070818' : '#FFFFFF24';
          paint.beginPath();
          paint.ellipse(x, y, radius * 1.5, radius, 0, 0, Math.PI * 2);
          paint.fill();
        }
        if (data.surface === 'ice')
          for (let i = 0; i < 35; i++) {
            paint.strokeStyle = '#655C4F60';
            paint.lineWidth = 0.5 + textureRng();
            paint.beginPath();
            const y = textureRng() * 256;
            paint.moveTo(0, y);
            for (let x = 0; x <= 512; x += 32)
              paint.lineTo(x, y + Math.sin(x / 70 + i) * 18);
            paint.stroke();
          }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        material.color.set('#FFFFFF');
        material.map = texture;
        resources.add(texture);
        if (['phobos', 'deimos'].includes(data.id))
          sphere.scale.set(1.35, 0.85, 1);
      }
      if (data.shape === 'star') {
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
      if (
        data.id === 'sirius' &&
        context?.id !== 'sirius' &&
        context?.mode !== 'detail'
      ) {
        const companion = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 20, 16),
          new THREE.MeshBasicMaterial({ color: '#F0FAFF' }),
        );
        companion.position.set(9, 1, 0);
        group.add(companion, circle(9, '#A7CDEA', 0.35));
      }
      if (data.id === 'earth') {
        axis.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(data.size * 1.025, 48, 32),
            new THREE.ShaderMaterial({
              transparent: true, depthWrite: false, side: THREE.BackSide,
              vertexShader: `varying vec3 n; varying vec3 view; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);view=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
              fragmentShader: `varying vec3 n; varying vec3 view; void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(view))),3.);gl_FragColor=vec4(.22,.55,1.,rim*.48);}`,
            }),
          ),
        );
        const clouds = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.7, depthWrite: false, roughness: 1 });
        const cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(data.size * 1.008, 48, 32), clouds);
        sphere.add(cloudSphere);
        loadTexture('/images/solar-system/earth-clouds.webp', clouds);
      }
      if (planet?.hasRing) {
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: '#FFFFFF',
          transparent: true,
          opacity: 1,
          roughness: 1,
          alphaTest: 0.03,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ringGeometry = new THREE.RingGeometry(data.size * 1.24, data.size * 2.32, 160);
        const vertices = ringGeometry.attributes.position;
        const uv = ringGeometry.attributes.uv;
        for (let i = 0; i < vertices.count; i++)
          uv.setXY(i, (Math.hypot(vertices.getX(i), vertices.getY(i)) / data.size - 1.24) / 1.08, 0.5);
        const ring = new THREE.Mesh(
          ringGeometry,
          ringMaterial,
        );
        ring.rotation.x = Math.PI / 2;
        axis.add(ring);
        loader.load('/images/solar-system/saturn-ring.png', (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          resources.add(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          ringMaterial.map = texture;
          ringMaterial.needsUpdate = true;
        });
        ringMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.ringCenter = { value: group.position };
          shader.uniforms.ringSun = { value: sunlight.position };
          shader.uniforms.planetRadius = { value: data.size };
          shader.vertexShader = 'varying vec3 ringWorld;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nringWorld=(modelMatrix*vec4(position,1.)).xyz;');
          shader.fragmentShader = 'varying vec3 ringWorld; uniform vec3 ringCenter; uniform vec3 ringSun; uniform float planetRadius;\n' + shader.fragmentShader.replace('#include <dithering_fragment>', `
            vec3 offset=ringWorld-ringCenter;
            vec3 lightRay=normalize(ringSun-ringWorld);
            float along=-dot(offset,lightRay);
            float separation=dot(offset,offset)-along*along;
            if(along>0.) gl_FragColor.rgb*=mix(.08,1.,smoothstep(planetRadius*planetRadius*.98,planetRadius*planetRadius*1.02,separation));
            #include <dithering_fragment>
          `);
        };
      }
    } else if (data.shape === 'galaxy') {
      const disk = createGalaxyVisual(
        data.size,
        seededRandom(index * 13 + 7),
        spaceNoise,
        mobile,
        data.id === 'lmc',
        data.elliptical,
      );
      disk.group.rotation.set(
        data.id === 'andromeda' ? 0.32 : 0.18,
        index * 0.7,
        index % 2 ? 0.2 : -0.1,
      );
      group.add(disk.group);
      visuals.set(data.id, disk);
      if (data.id === 'whirlpool' && context?.id !== 'whirlpool') {
        const companion = createGalaxyVisual(
          7,
          seededRandom(918),
          spaceNoise,
          mobile,
        );
        companion.group.position.set(32, 2, -16);
        group.add(companion.group);
        visuals.set('whirlpool-companion', companion);
      }
    } else if (data.shape === 'nebula') {
      const nebula = createNebulaVisual(
        data.size,
        data.id === 'crab',
        spaceNoise,
        mobile,
      );
      group.add(nebula.group);
      visuals.set(data.id, nebula);
    } else if (data.shape === 'blackhole') {
      const blackHole = createBlackHoleVisual(data.size, spaceNoise, mobile);
      group.add(blackHole.group);
      visuals.set(data.id, blackHole);
    } else if (data.shape === 'cluster') {
      if (data.id === 'andromeda-core') {
        const nucleus = createGalaxyVisual(
          data.size,
          seededRandom(3101),
          spaceNoise,
          mobile,
          false,
          true,
        );
        group.add(nucleus.group);
        visuals.set(data.id, nucleus);
      } else {
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

    const ringRadius = data.id === 'saturn' ? data.size * 2.6 : data.size * 1.4;
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
      new THREE.SphereGeometry(
        Math.max(
          SATELLITE_ORBITS[data.id] ? 0.65 : 4.5,
          data.size *
            (data.shape === 'blackhole'
              ? 3.2
              : data.shape === 'nebula'
                ? 1.5
                : 1),
        ),
        12,
        8,
      ),
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
    label.dataset.objectId = data.id;
    label.textContent = data.name;
    label.setAttribute('aria-label', `定位${data.name}`);
    // OrbitControls captures pointer input on the shared surface. Pointer taps
    // are resolved on pointerup below; native click remains for keyboard access.
    label.addEventListener('click', (event) => {
      if (event.detail === 0) events.onSelect(data.id);
    });
    labelLayer.append(label);
    bodies.set(data.id, { data, group, ring, label, orbit, spin, axis: group.userData.axis });
    if (spin)
      animated.push({ id: data.id, object: spin, speed: planet?.spinSpeed ?? 0.018 });
  });

  Object.entries(SATELLITE_ORBITS).forEach(([id, orbit]) => {
    const parent = bodies.get(orbit.parent);
    if (!parent || !bodies.has(id) || context?.mode === 'detail') return;
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(satelliteOrbitPath(id, new Date(epoch), parent.data.size, solarOrbits).map((p) => new THREE.Vector3(...p))),
      new THREE.LineBasicMaterial({ color: '#B8C5D5', transparent: true, opacity: solarOrbits ? 0.16 : 0.23 }),
    );
    scene.add(line);
    satelliteTracks.push({ id, line });
  });

  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const span =
      context?.mode === 'detail'
        ? Math.max(20, sceneObjects[0].size * 3)
        : context?.mode === 'system'
          ? Math.max(sceneObjects[0].size * 3 + sceneObjects.length * 20, ...satelliteTracks.map(({ id }) => satelliteDisplayRadius(id, sceneObjects[0].size, false) * 1.1))
          : scale === 'solar'
            ? 390
            : scale === 'cosmos'
              ? 225
              : 185;
    const halfFov = Math.min(
      THREE.MathUtils.degToRad(22.5),
      Math.atan(Math.tan(THREE.MathUtils.degToRad(22.5)) * camera.aspect),
    );
    overviewDistance = Math.min(
      (scale === 'solar' ? 1900 : 1250) * 0.94,
      (span / Math.sin(halfFov)) * 1.07,
    );
    controls.maxDistance = overviewDistance * 1.65;
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

  const isOccluded = (body: Body) => {
    const parent = bodies.get(SATELLITE_ORBITS[body.data.id]?.parent);
    if (!parent?.group.visible) return false;
    const point = body.group.getWorldPosition(new THREE.Vector3());
    const center = parent.group.getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Ray(camera.position, point.clone().sub(camera.position).normalize());
    const intersection = ray.intersectSphere(new THREE.Sphere(center, parent.data.size), new THREE.Vector3());
    return Boolean(intersection && camera.position.distanceTo(intersection) < camera.position.distanceTo(point) - body.data.size);
  };

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
    const hit = raycaster.intersectObjects(
      pickTargets.filter((target) => target.parent?.visible && !isOccluded(bodies.get(target.userData.objectId)!)),
      false,
    )[0];
    if (hit) return hit.object.userData.objectId;
    let nearest: string | null = null;
    let minDistance = 23;
    bodies.forEach((body) => {
      if (!body.group.visible || isOccluded(body)) return;
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
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;
  const armZoom = (direction: ZoomIntent, discrete = false) => {
    if (discrete || performance.now() - lastZoomAt > 220)
      gestureStartedAt = performance.now();
    zoomIntent = direction;
    lastZoomAt = performance.now();
  };
  const onWheel = (event: WheelEvent) => {
    if (!events.onNavigate || !event.deltaY) return;
    armZoom(event.deltaY < 0 ? 'in' : 'out');
    if (event.deltaY < 0 && !tracking)
      events.onSelect(pick(event.clientX, event.clientY) || selectedId);
  };
  let down: { id: number; x: number; y: number; objectId?: string } | null = null;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
    down =
      pointers.size === 1
        ? { id: event.pointerId, x: event.clientX, y: event.clientY,
            objectId: (event.target as HTMLElement)?.closest<HTMLElement>('.universe-label')?.dataset.objectId }
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
    const id = start.objectId || pick(event.clientX, event.clientY);
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
    if (pointers.has(event.pointerId))
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (Math.abs(distance - pinchDistance) > 1) {
        armZoom(distance > pinchDistance ? 'in' : 'out');
        if (distance > pinchDistance && !tracking) events.onSelect(selectedId);
      }
      pinchDistance = distance;
    }
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
  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('wheel', onWheel, { passive: true });
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('blur', onBlur);
  controls.addEventListener('start', onStart);

  let previousTime = performance.now();
  let averageFrameMs = 16.7;
  let sampledFrames = 0;
  let lastResolutionChange = previousTime;
  let simulationTime = 0;
  const galaxyDirection = new THREE.Vector3(0.25, 0.8, 1).normalize();
  const blackHoleDirection = new THREE.Vector3(0.15, 0.24, 1).normalize();
  const animate = (time: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const frameMs = time - previousTime;
    const delta = Math.min(frameMs / 1000, 0.05);
    previousTime = time;
    if (document.hidden || contextLost) return;
    averageFrameMs += (Math.min(frameMs, 100) - averageFrameMs) * 0.035;
    sampledFrames++;
    // Reduce canvas cost on slower GPUs while keeping HTML labels and controls sharp.
    if (
      sampledFrames > 60 &&
      sampledFrames % 45 === 0 &&
      averageFrameMs > 29 &&
      time - lastResolutionChange > 2500 &&
      renderer.getPixelRatio() > 0.85
    ) {
      renderer.setPixelRatio(Math.max(0.85, renderer.getPixelRatio() * 0.8));
      lastResolutionChange = time;
    }
    if (playing) {
      simulationTime += delta;
      elapsedDays += delta * daysPerSecond;
      animated.forEach(({ id, object, speed }) => {
        if (scale !== 'solar' || (!PLANETS.some((planet) => planet.id === id) && !SATELLITE_ORBITS[id])) object.rotation.y += speed * delta;
      });
      if (context?.mode === 'system')
        bodies.forEach((body) => {
          if (body.orbit && body.group.userData.systemOrbit)
            body.orbit.rotation.y +=
              delta * (body.data.id === 'triton' ? -0.06 : 0.08);
        });
    }
    if (scale === 'solar') {
      const date = new Date(epoch + elapsedDays * 86400000);
      if (!ephemeris || (playing && time - lastEphemerisTime > 65)) {
        ephemeris = solarState(date);
        lastEphemerisTime = time;
      }
      if (time - lastTimeNotice > 500) {
        events.onTime?.(date);
        lastTimeNotice = time;
      }
      bodies.forEach((body, id) => {
        const planet = PLANETS.find((item) => item.id === id);
        if (solarOrbits && planet && !planet.isMoon)
          body.group.position.fromArray(planetDisplayPosition(id, ephemeris.positions[id], planet.orbitRadius));
        if (body.axis && ephemeris.north[id]) {
          body.axis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...ephemeris.north[id]).normalize());
          if (body.spin) body.spin.rotation.y = ephemeris.spin[id];
        }
      });
      bodies.forEach((body, id) => {
        const satellite = SATELLITE_ORBITS[id];
        if (!satellite) return;
        const parent = bodies.get(satellite.parent);
        if (parent && context?.mode !== 'detail') {
          const offset = satelliteDisplayPosition(id, ephemeris.positions[id], parent.data.size, solarOrbits);
          body.group.position.copy(parent.group.position).add(new THREE.Vector3(...offset));
          if (body.axis && body.spin && id !== 'moon') {
            body.axis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...satelliteNorth(id, ephemeris)).normalize());
            const facing = new THREE.Vector3(...offset).negate().applyQuaternion(body.axis.quaternion.clone().invert());
            body.spin.rotation.y = Math.atan2(-facing.z, facing.x);
          }
        } else if (body.axis && id !== 'moon') {
          body.axis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...satelliteNorth(id, ephemeris)).normalize());
          body.spin!.rotation.y = Math.PI * 2 * elapsedDays / satellite.periodDays;
        }
      });
      satelliteTracks.forEach(({ id, line }) => {
        const parent = bodies.get(SATELLITE_ORBITS[id].parent)!;
        line.position.copy(parent.group.position);
      });
      if (context?.mode === 'system' || context?.mode === 'detail') {
        const center = context.centerId || sceneObjects[0].id;
        const lightParent = SATELLITE_ORBITS[center]?.parent || center;
        const solarPosition = ephemeris.positions[lightParent];
        if (solarPosition && Math.hypot(...solarPosition) > 0)
          sunlight.position.fromArray(solarPosition).normalize().multiplyScalar(-2000);
        else sunlight.position.set(-100, 60, 120);
      }
    }
    scene.updateMatrixWorld(true);
    const selected = bodies.get(selectedId);
    const neighborhood = solarOrbits && tracking && selected?.data.shape === 'planet'
      ? SATELLITE_ORBITS[selectedId]?.parent || selectedId : null;
    const closeObservation = Boolean(
      tracking &&
        selected &&
        (options.isolated ||
          context?.mode === 'detail' ||
          ['galaxy', 'nebula', 'blackhole', 'cluster'].includes(
            selected.data.shape,
          )),
    );
    if (galaxyBackdrop) {
      galaxyBackdrop.group.visible = !closeObservation;
      if (!closeObservation) galaxyBackdrop.update(simulationTime, false);
    }
    bodies.forEach((body) => {
      body.group.visible = closeObservation ? body.data.id === selectedId : neighborhood
        ? body.data.id === neighborhood || SATELLITE_ORBITS[body.data.id]?.parent === neighborhood
        : true;
    });
    planetTracks.forEach((line) => { line.visible = !options.isolated && !neighborhood; });
    satelliteTracks.forEach(({ id, line }) => { line.visible = !options.isolated && (!neighborhood || SATELLITE_ORBITS[id].parent === neighborhood); });
    visuals.forEach((visual, id) => {
      if (
        !closeObservation ||
        id === selectedId ||
        (selectedId === 'whirlpool' && id === 'whirlpool-companion')
      )
        visual.update(simulationTime, closeObservation && id === selectedId);
    });
    const blend = 1 - Math.exp(-5 * delta);
    if (framing === 'overview') {
      desired.set(0.15, 0.58, 0.8).normalize().multiplyScalar(overviewDistance);
      controls.target.lerp(origin, blend);
      camera.position.lerp(desired, blend);
      if (camera.position.distanceTo(desired) < 0.5) framing = null;
    } else if (selected && framing === 'focus') {
      selected.group.getWorldPosition(world);
      const distance = focusDistance(selected.data);
      const viewDirection =
        selected.data.shape === 'galaxy'
          ? galaxyDirection
          : selected.data.shape === 'blackhole'
            ? blackHoleDirection
            : direction;
      desired.copy(world).addScaledVector(viewDirection, distance);
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
    inspectZoom();
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
    const occupied: { x: number; y: number; width: number }[] = [];
    const sorted = [...bodies.values()].sort(
      (a, b) =>
        Number(b.data.id === selectedId) - Number(a.data.id === selectedId),
    );
    sorted.forEach((body) => {
      body.group.getWorldPosition(world);
      world.y +=
        body.data.size *
        (body.data.shape === 'blackhole'
          ? 2.8
          : body.data.shape === 'nebula'
            ? 1.6
            : scale === 'solar'
              ? 1.3
              : 0.5);
      projected.copy(world).project(camera);
      const x = ((projected.x + 1) * width) / 2;
      const y = ((-projected.y + 1) * height) / 2 - 16;
      const labelWidth = body.data.name.length * 12 + 26;
      const visible =
        labelsVisible &&
        body.group.visible &&
        !isOccluded(body) &&
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
  if (
    !sceneObjects.some((object) =>
      PLANETS.some((planet) => planet.id === object.id) || Boolean(object.texture),
    )
  )
    events.onReady();

  return {
    select(id, focus = true) {
      if (!bodies.has(id)) return;
      selectedId = id;
      bodies.forEach((body) => {
        body.ring.visible = false;
        body.label.classList.toggle('is-selected', body.data.id === id);
        body.label.setAttribute('aria-pressed', String(body.data.id === id));
      });
      if (focus) {
        const selected = bodies.get(id)!;
        controls.minDistance =
          selected.data.shape === 'blackhole'
            ? selected.data.size * 4.2
            : Math.max(1.2, selected.data.size * 1.3);
        framing = 'focus';
        tracking = true;
        trackInitialized = false;
      }
    },
    overview() {
      controls.minDistance = 7;
      framing = 'overview';
      tracking = false;
      trackInitialized = false;
    },
    zoom(factor) {
      if (factor < 1 && !tracking && events.onNavigate) {
        events.onSelect(selectedId);
        return;
      }
      framing = null;
      armZoom(factor < 1 ? 'in' : 'out', true);
      desired.copy(camera.position).sub(controls.target).multiplyScalar(factor);
      desired.clampLength(controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(desired);
      controls.update();
      inspectZoom();
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
    setTimeRate(value) {
      if (Number.isFinite(value)) daysPerSecond = Math.max(0, Math.min(4, value));
    },
    resetTime() {
      epoch = Date.now();
      elapsedDays = 0;
      lastEphemerisTime = -Infinity;
      ephemeris = solarState(new Date(epoch));
      lastTimeNotice = -Infinity;
    },
    getTime() {
      return new Date(epoch + elapsedDays * 86400000);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('wheel', onWheel);
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
