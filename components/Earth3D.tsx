import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Eye,
  Focus,
  Gauge,
  Info,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  SunMedium,
  Telescope,
  Thermometer,
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CORE_PLANET_IDS, PLANETS, PlanetId, PlanetRecord } from '../lib/solarSystemData';

interface Earth3DProps {
  onClose: () => void;
}

type DetailTab = 'overview' | 'data' | 'observe';

const ASSET_PATH = '/images/solar-system';
const VISITED_STORAGE = 'exbeam.solar.visited.v1';
const OBSERVED_STORAGE = 'exbeam.solar.observed.v1';

const readStoredIds = (key: string): PlanetId[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(id => PLANETS.some(planet => planet.id === id)) : [];
  } catch {
    return [];
  }
};

const writeStoredIds = (key: string, ids: Set<PlanetId>) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    // Progress remains optional when browser storage is unavailable.
  }
};

interface ScenePlanet {
  data: PlanetRecord;
  body: THREE.Group;
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  orbitGroup?: THREE.Group;
}

interface SceneEngine {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  planets: Map<PlanetId, ScenePlanet>;
  pickTargets: THREE.Object3D[];
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  pointerDown: { x: number; y: number } | null;
  frame: number;
  running: boolean;
  trackedId: PlanetId | null;
  focusId: PlanetId | null;
  overviewAnimating: boolean;
  lastTrackedTarget: THREE.Vector3 | null;
}

const createInitialEngine = (): SceneEngine => ({
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  planets: new Map(),
  pickTargets: [],
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  pointerDown: null,
  frame: 0,
  running: true,
  trackedId: 'earth',
  focusId: 'earth',
  overviewAnimating: false,
  lastTrackedTarget: null,
});

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Texture();
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,238,1)');
  gradient.addColorStop(0.18, 'rgba(255,205,95,.9)');
  gradient.addColorStop(0.5, 'rgba(255,141,48,.28)');
  gradient.addColorStop(1, 'rgba(255,120,20,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
};

const createLabelTexture = (label: string, accent: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Texture();
  context.fillStyle = 'rgba(8, 11, 17, .78)';
  context.beginPath();
  context.roundRect(50, 12, 220, 52, 18);
  context.fill();
  context.strokeStyle = `${accent}88`;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#F7FAFC';
  context.font = '600 25px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 160, 39);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const Earth3D: React.FC<Earth3DProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine>(createInitialEngine());
  const selectPlanetRef = useRef<(id: PlanetId) => void>(() => undefined);
  const [selectedId, setSelectedId] = useState<PlanetId>('earth');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [isSimulating, setIsSimulating] = useState(true);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isOverview, setIsOverview] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const [visited, setVisited] = useState<Set<PlanetId>>(() => new Set([
    ...readStoredIds(VISITED_STORAGE),
    'earth',
  ]));
  const [observed, setObserved] = useState<Set<PlanetId>>(() => new Set(readStoredIds(OBSERVED_STORAGE)));

  const selected = useMemo(
    () => PLANETS.find(planet => planet.id === selectedId) || PLANETS[3],
    [selectedId],
  );
  const selectedIndex = PLANETS.findIndex(planet => planet.id === selectedId);
  const exploredCount = CORE_PLANET_IDS.filter(id => visited.has(id)).length;

  const focusPlanet = useCallback((id: PlanetId) => {
    const engine = engineRef.current;
    engine.trackedId = id;
    engine.focusId = id;
    engine.overviewAnimating = false;
    engine.lastTrackedTarget = null;
    setSelectedId(id);
    setDetailTab('overview');
    setIsOverview(false);
    setVisited(current => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      writeStoredIds(VISITED_STORAGE, next);
      return next;
    });
  }, []);

  selectPlanetRef.current = focusPlanet;

  const showOverview = useCallback(() => {
    const engine = engineRef.current;
    engine.trackedId = null;
    engine.focusId = null;
    engine.lastTrackedTarget = null;
    engine.overviewAnimating = true;
    setIsOverview(true);
  }, []);

  const selectRelativePlanet = (direction: -1 | 1) => {
    const nextIndex = (selectedIndex + direction + PLANETS.length) % PLANETS.length;
    focusPlanet(PLANETS[nextIndex].id);
  };

  const toggleObserved = () => {
    setObserved(current => {
      const next = new Set(current);
      if (next.has(selectedId)) next.delete(selectedId);
      else next.add(selectedId);
      writeStoredIds(OBSERVED_STORAGE, next);
      return next;
    });
  };

  useEffect(() => {
    engineRef.current.running = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    if (engineRef.current.controls) engineRef.current.controls.autoRotate = isAutoRotating;
  }, [isAutoRotating]);

  useEffect(() => {
    engineRef.current.planets.forEach((planet, id) => {
      planet.halo.visible = id === selectedId;
    });
  }, [selectedId, sceneReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    try {
      const engine = engineRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05070b);
      scene.fog = new THREE.FogExp2(0x05070b, 0.00145);

      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 4000);
      camera.position.set(80, 48, 130);
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.domElement.className = 'absolute inset-0 h-full w-full touch-none';
      renderer.domElement.setAttribute('aria-label', '可交互的太阳系三维场景');
      container.prepend(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.055;
      controls.enablePan = false;
      controls.minDistance = 8;
      controls.maxDistance = 680;
      controls.rotateSpeed = 0.55;
      controls.zoomSpeed = 0.8;
      controls.autoRotate = isAutoRotating;
      controls.autoRotateSpeed = 0.55;

      engine.scene = scene;
      engine.camera = camera;
      engine.renderer = renderer;
      engine.controls = controls;

      scene.add(new THREE.AmbientLight(0x8ea8c8, 0.3));
      const sunlight = new THREE.PointLight(0xffe4b5, 850, 900, 1.4);
      scene.add(sunlight);

      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(6500 * 3);
      for (let index = 0; index < 6500; index += 1) {
        const radius = 380 + Math.random() * 1050;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[index * 3 + 1] = radius * Math.cos(phi);
        starPositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      scene.add(new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ color: 0xc7dcff, size: 1.15, transparent: true, opacity: 0.72 }),
      ));

      const asteroidGeometry = new THREE.BufferGeometry();
      const asteroidPositions = new Float32Array(900 * 3);
      for (let index = 0; index < 900; index += 1) {
        const radius = 166 + (Math.random() - 0.5) * 16;
        const angle = Math.random() * Math.PI * 2;
        asteroidPositions[index * 3] = Math.cos(angle) * radius;
        asteroidPositions[index * 3 + 1] = (Math.random() - 0.5) * 5;
        asteroidPositions[index * 3 + 2] = Math.sin(angle) * radius;
      }
      asteroidGeometry.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3));
      scene.add(new THREE.Points(
        asteroidGeometry,
        new THREE.PointsMaterial({ color: 0x8f887d, size: 0.55, transparent: true, opacity: 0.48 }),
      ));

      const loadingManager = new THREE.LoadingManager();
      loadingManager.onProgress = (_url, loaded, total) => {
        if (!disposed) setLoadProgress(Math.round((loaded / total) * 100));
      };
      loadingManager.onLoad = () => {
        if (!disposed) {
          setLoadProgress(100);
          setSceneReady(true);
        }
      };
      const textureLoader = new THREE.TextureLoader(loadingManager);
      const anisotropy = renderer.capabilities.getMaxAnisotropy();

      const createBody = (data: PlanetRecord) => {
        const body = new THREE.Group();
        let orbitGroup: THREE.Group | undefined;
        if (!data.isMoon && !data.isSun) {
          orbitGroup = new THREE.Group();
          orbitGroup.rotation.y = data.initialAngle;
          body.position.x = data.orbitRadius;
          orbitGroup.add(body);
          scene.add(orbitGroup);

          const orbitPoints = new THREE.EllipseCurve(
            0, 0, data.orbitRadius, data.orbitRadius, 0, Math.PI * 2, false, 0,
          ).getPoints(180).map(point => new THREE.Vector3(point.x, 0, point.y));
          const orbit = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(orbitPoints),
            new THREE.LineBasicMaterial({ color: 0x60718b, transparent: true, opacity: 0.16 }),
          );
          scene.add(orbit);
        } else {
          scene.add(body);
        }

        const geometry = new THREE.SphereGeometry(data.size, data.isSun ? 72 : 56, data.isSun ? 72 : 56);
        const material = data.isSun
          ? new THREE.MeshBasicMaterial({ color: 0xffffff })
          : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.planetId = data.id;
        body.add(mesh);
        engine.pickTargets.push(mesh);

        textureLoader.load(data.texture, texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = anisotropy;
          material.map = texture;
          material.needsUpdate = true;
        });

        const hitRadius = Math.max(data.size * 1.7, data.isMoon ? 5.5 : 6.5);
        const hitMesh = new THREE.Mesh(
          new THREE.SphereGeometry(hitRadius, 18, 18),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        hitMesh.userData.planetId = data.id;
        body.add(hitMesh);
        engine.pickTargets.push(hitMesh);

        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(data.size * (data.hasRing ? 3.35 : 1.5), Math.max(0.1, data.size * 0.035), 10, 84),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(data.color), transparent: true, opacity: 0.9 }),
        );
        halo.rotation.x = Math.PI / 2;
        halo.visible = data.id === 'earth';
        body.add(halo);

        const label = new THREE.Sprite(new THREE.SpriteMaterial({
          map: createLabelTexture(data.name, data.color), transparent: true, depthTest: false, depthWrite: false,
        }));
        label.position.y = data.size + (data.isSun ? 6 : 3.5);
        label.scale.set(data.isSun ? 12 : 9, data.isSun ? 3 : 2.25, 1);
        label.renderOrder = 10;
        body.add(label);

        if (data.isSun) {
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: createGlowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          glow.scale.set(92, 92, 1);
          body.add(glow);
        }

        if (data.id === 'earth') {
          body.add(new THREE.Mesh(
            new THREE.SphereGeometry(data.size * 1.055, 48, 48),
            new THREE.MeshBasicMaterial({
              color: 0x5eb7ff, transparent: true, opacity: 0.12, side: THREE.BackSide,
              blending: THREE.AdditiveBlending,
            }),
          ));
        }

        if (data.hasRing) {
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xe8d6af, side: THREE.DoubleSide, transparent: true, opacity: 0.88, depthWrite: false,
          });
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(data.size * 1.35, data.size * 2.35, 128),
            ringMaterial,
          );
          ring.rotation.x = Math.PI / 2.35;
          ring.userData.planetId = data.id;
          body.add(ring);
          engine.pickTargets.push(ring);
          textureLoader.load(`${ASSET_PATH}/saturn-ring.png`, texture => {
            ringMaterial.alphaMap = texture;
            ringMaterial.needsUpdate = true;
          });
        }

        engine.planets.set(data.id, { data, body, mesh, halo, orbitGroup });
      };

      PLANETS.filter(planet => !planet.isMoon).forEach(createBody);
      createBody(PLANETS.find(planet => planet.id === 'moon')!);

      const pickPlanet = (clientX: number, clientY: number) => {
        const bounds = renderer.domElement.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        engine.pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
        engine.pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
        engine.raycaster.setFromCamera(engine.pointer, camera);
        const hit = engine.raycaster.intersectObjects(engine.pickTargets, false)
          .find(intersection => intersection.object.userData.planetId);
        const id = hit?.object.userData.planetId as PlanetId | undefined;
        if (id) selectPlanetRef.current(id);
      };

      const handlePointerDown = (event: PointerEvent) => {
        engine.pointerDown = { x: event.clientX, y: event.clientY };
      };
      const handlePointerUp = (event: PointerEvent) => {
        if (!engine.pointerDown) return;
        const distance = Math.hypot(event.clientX - engine.pointerDown.x, event.clientY - engine.pointerDown.y);
        engine.pointerDown = null;
        if (distance <= 7) pickPlanet(event.clientX, event.clientY);
      };
      const handlePointerCancel = () => {
        engine.pointerDown = null;
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (engine.pointerDown) return;
        const bounds = renderer.domElement.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        engine.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        engine.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        engine.raycaster.setFromCamera(engine.pointer, camera);
        const hit = engine.raycaster.intersectObjects(engine.pickTargets, false)
          .some(intersection => intersection.object.userData.planetId);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      };

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);
      controls.addEventListener('start', () => {
        engine.focusId = null;
        engine.overviewAnimating = false;
      });

      const resize = () => {
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const clock = new THREE.Clock();
      const worldTarget = new THREE.Vector3();
      const previousTarget = new THREE.Vector3();
      const cameraDirection = new THREE.Vector3(0.75, 0.4, 1).normalize();
      const desiredCamera = new THREE.Vector3();
      const earthPosition = new THREE.Vector3();
      const overviewPosition = new THREE.Vector3(15, 255, 430);
      const origin = new THREE.Vector3();

      const animate = () => {
        const delta = Math.min(clock.getDelta(), 0.05);
        if (engine.running) {
          engine.planets.forEach(planet => {
            if (planet.orbitGroup) planet.orbitGroup.rotation.y += planet.data.orbitSpeed * delta;
            planet.mesh.rotation.y += planet.data.spinSpeed * delta;
          });
        }

        const earth = engine.planets.get('earth');
        const moon = engine.planets.get('moon');
        if (earth && moon) {
          earth.body.getWorldPosition(earthPosition);
          if (engine.running) {
            moon.body.userData.orbitAngle = (moon.body.userData.orbitAngle || PLANETS[4].initialAngle)
              + moon.data.orbitSpeed * delta;
          }
          const moonAngle = moon.body.userData.orbitAngle || PLANETS[4].initialAngle;
          moon.body.position.set(
            earthPosition.x + Math.cos(moonAngle) * 11,
            earthPosition.y + Math.sin(moonAngle * 0.6) * 1.2,
            earthPosition.z + Math.sin(moonAngle) * 11,
          );
        }

        if (engine.overviewAnimating) {
          controls.target.lerp(origin, 0.07);
          camera.position.lerp(overviewPosition, 0.055);
          if (camera.position.distanceTo(overviewPosition) < 1.2) engine.overviewAnimating = false;
        } else if (engine.focusId) {
          const targetPlanet = engine.planets.get(engine.focusId);
          if (targetPlanet) {
            targetPlanet.body.getWorldPosition(worldTarget);
            const focusDistance = Math.max(
              targetPlanet.data.size * (targetPlanet.data.hasRing ? 6.2 : 5.2),
              targetPlanet.data.isMoon ? 18 : 24,
            );
            desiredCamera.copy(worldTarget).addScaledVector(cameraDirection, focusDistance);
            controls.target.lerp(worldTarget, 0.1);
            camera.position.lerp(desiredCamera, 0.085);
            if (camera.position.distanceTo(desiredCamera) < 0.28 && controls.target.distanceTo(worldTarget) < 0.18) {
              engine.focusId = null;
              engine.lastTrackedTarget = worldTarget.clone();
            }
          }
        } else if (engine.trackedId) {
          const trackedPlanet = engine.planets.get(engine.trackedId);
          if (trackedPlanet) {
            trackedPlanet.body.getWorldPosition(worldTarget);
            if (engine.lastTrackedTarget) {
              previousTarget.copy(engine.lastTrackedTarget);
              const deltaTarget = worldTarget.clone().sub(previousTarget);
              camera.position.add(deltaTarget);
              controls.target.add(deltaTarget);
            }
            engine.lastTrackedTarget = worldTarget.clone();
          }
        }

        controls.update();
        renderer.render(scene, camera);
        engine.frame = window.requestAnimationFrame(animate);
      };
      animate();

      return () => {
        disposed = true;
        window.cancelAnimationFrame(engine.frame);
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
        controls.dispose();
        scene.traverse(object => {
          if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.Points ||
            object instanceof THREE.Line ||
            object instanceof THREE.Sprite
          ) {
            object.geometry?.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => {
              if (!material) return;
              Object.values(material).forEach(value => {
                if (value instanceof THREE.Texture) value.dispose();
              });
              material.dispose();
            });
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
        engine.planets.clear();
        engine.pickTargets = [];
      };
    } catch {
      setSceneError('当前设备无法启动 3D 场景，请确认浏览器已开启硬件加速。');
      setSceneReady(true);
    }
  }, []);

  const renderPlanetButton = (planet: PlanetRecord, compact = false) => {
    const active = selectedId === planet.id && !isOverview;
    return (
      <button
        key={planet.id}
        type="button"
        onClick={() => focusPlanet(planet.id)}
        className={`group flex shrink-0 items-center gap-3 rounded-md border text-left transition-colors ${
          compact ? 'h-10 px-3' : 'min-h-12 w-full px-3 py-2'
        } ${
          active
            ? 'border-white/20 bg-white/[0.12] text-white'
            : 'border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
        }`}
        aria-pressed={active}
      >
        <span
          className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
          style={{ color: planet.color, backgroundColor: planet.color }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{planet.name}</span>
          {!compact && <span className="mt-0.5 block text-[10px] text-white/35">{planet.type}</span>}
        </span>
        {!compact && visited.has(planet.id) && <Check size={14} className="shrink-0 text-emerald-400" aria-label="已探索" />}
      </button>
    );
  };

  const dataRows = [
    [Gauge, '平均半径', selected.radius],
    [SunMedium, '距太阳', selected.distance],
    [RotateCcw, '自转周期', selected.day],
    [CircleDot, '公转周期', selected.year],
    [Thermometer, '表面温度', selected.temperature],
    [CircleDot, '已知卫星', selected.moons],
  ] as const;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#05070B] text-white">
      {!sceneReady && !sceneError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#05070B]">
          <div className="w-56 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#77B8FF]">
              <CircleDot className="animate-spin" size={22} />
            </div>
            <div className="mt-4 text-sm font-semibold">正在载入太阳系</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#4FA8FF] transition-[width]" style={{ width: `${loadProgress}%` }} />
            </div>
            <div className="mt-2 text-xs tabular-nums text-white/40">{loadProgress}%</div>
          </div>
        </div>
      )}

      {sceneError && sceneReady && (
        <div className="absolute left-1/2 top-1/2 z-40 w-[min(420px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#E78374]/30 bg-[#181116]/95 p-6 text-center shadow-2xl">
          <Info className="mx-auto text-[#F38B7D]" size={28} />
          <h2 className="mt-3 text-base font-semibold">3D 场景暂时不可用</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">{sceneError}</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-3 md:right-[382px] lg:left-[250px] lg:right-[390px]">
        <div className="hidden rounded-md border border-white/10 bg-[#0B0F16]/75 px-3 py-2 backdrop-blur-lg sm:block">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <Sparkles size={14} className="text-[#F9B44C]" />
            教学比例模型
          </div>
          <div className="mt-1 text-[10px] text-white/35">轨道距离与星体大小经过可视化压缩</div>
        </div>

        <div className="pointer-events-auto ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0F16]/82 p-1.5 shadow-xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setIsSimulating(current => !current)}
            className={`flex h-9 w-9 items-center justify-center rounded-md ${isSimulating ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/[0.06]'}`}
            aria-label={isSimulating ? '暂停公转' : '继续公转'}
            title={isSimulating ? '暂停公转' : '继续公转'}
          >
            {isSimulating ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => setIsAutoRotating(current => !current)}
            className={`flex h-9 w-9 items-center justify-center rounded-md ${isAutoRotating ? 'bg-[#183A56] text-[#78C2FF]' : 'text-white/45 hover:bg-white/[0.06]'}`}
            aria-label={isAutoRotating ? '关闭自动旋转' : '开启自动旋转'}
            title={isAutoRotating ? '关闭自动旋转' : '开启自动旋转'}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={showOverview}
            className={`flex h-9 w-9 items-center justify-center rounded-md ${isOverview ? 'bg-[#183A56] text-[#78C2FF]' : 'text-white/45 hover:bg-white/[0.06]'}`}
            aria-label="查看太阳系全景"
            title="查看太阳系全景"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <aside className="pointer-events-auto absolute inset-y-4 left-4 z-20 hidden w-[218px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0B0F16]/90 shadow-2xl backdrop-blur-xl lg:flex">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Telescope size={17} className="text-[#77B8FF]" />
            星体目录
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
            <span>探索进度</span>
            <span className="tabular-nums text-white/75">{exploredCount}/{CORE_PLANET_IDS.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#4FA8FF] transition-[width]" style={{ width: `${(exploredCount / CORE_PLANET_IDS.length) * 100}%` }} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 no-scrollbar">
          {PLANETS.map(planet => renderPlanetButton(planet))}
        </div>
        <div className="border-t border-white/10 p-3 text-[10px] leading-5 text-white/30">
          行星纹理来自 Solar System Scope
        </div>
      </aside>

      <div className="pointer-events-auto absolute left-3 right-[116px] top-[62px] z-20 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar md:right-[374px] lg:hidden">
        {PLANETS.map(planet => renderPlanetButton(planet, true))}
      </div>

      <aside className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 max-h-[46%] overflow-hidden rounded-lg border border-white/10 bg-[#0B0F16]/94 shadow-2xl backdrop-blur-xl md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[350px]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_14px_currentColor]" style={{ color: selected.color, backgroundColor: selected.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-[0.16em] text-white/35">{selected.english}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <h2 className="text-xl font-semibold sm:text-2xl">{selected.name}</h2>
                  <span className="text-xs text-white/40">{selected.type}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => selectRelativePlanet(-1)} className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.07] hover:text-white" aria-label="上一颗星体" title="上一颗星体">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={() => selectRelativePlanet(1)} className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.07] hover:text-white" aria-label="下一颗星体" title="下一颗星体">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 rounded-md bg-white/[0.05] p-1" role="tablist" aria-label="星体详情">
              {([
                ['overview', '概览', Eye], ['data', '数据', BarChart3], ['observe', '观察', Focus],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === id}
                  onClick={() => setDetailTab(id)}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded text-xs font-semibold ${
                    detailTab === id ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar sm:px-5">
            {detailTab === 'overview' && (
              <div>
                <p className="text-sm leading-6 text-white/68">{selected.description}</p>
                <div className="mt-5 border-l-2 pl-3" style={{ borderColor: selected.color }}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                    <Sparkles size={14} style={{ color: selected.color }} />
                    值得知道
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/48">{selected.fact}</p>
                </div>
              </div>
            )}

            {detailTab === 'data' && (
              <div className="divide-y divide-white/10">
                {dataRows.map(([DataIcon, label, value]) => (
                  <div key={label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <DataIcon size={16} className="shrink-0 text-white/35" />
                    <span className="min-w-0 flex-1 text-xs text-white/42">{label}</span>
                    <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-white/82">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'observe' && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-white/78">
                  <Focus size={15} style={{ color: selected.color }} />
                  本次观察任务
                </div>
                <p className="mt-3 text-sm leading-6 text-white/58">{selected.observation}</p>
                <button
                  type="button"
                  onClick={toggleObserved}
                  className={`mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors ${
                    observed.has(selectedId) ? 'bg-[#183D31] text-[#80E0B3]' : 'bg-white text-[#0B0F16] hover:bg-white/90'
                  }`}
                >
                  {observed.has(selectedId) ? <CheckCircle2 size={17} /> : <Check size={17} />}
                  {observed.has(selectedId) ? '已完成观察' : '标记为已观察'}
                </button>
              </div>
            )}
          </div>

          <div className="hidden shrink-0 items-center justify-between border-t border-white/10 px-5 py-3 text-[10px] text-white/32 sm:flex">
            <span>{observed.size} 项观察已完成</span>
            <span className="flex items-center gap-1.5"><Telescope size={12} />ExBeam 天文实验室</span>
          </div>
        </div>
      </aside>

      <div className="pointer-events-none absolute bottom-[calc(46%+24px)] left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] text-white/45 backdrop-blur sm:flex md:bottom-5 md:left-[calc(50%-175px)] lg:left-[calc(50%+55px)]">
        <CircleDot size={12} className="text-[#77B8FF]" />
        {isOverview ? '太阳系全景' : `正在观察 ${selected.name}`}
      </div>
      <div className="sr-only" aria-live="polite">当前选择：{selected.name}</div>
    </div>
  );
};

export default Earth3D;
