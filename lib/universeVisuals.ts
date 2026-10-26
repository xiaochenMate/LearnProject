import * as THREE from 'three';

export interface SpaceVisual {
  group: THREE.Group;
  update: (time: number, focused: boolean) => void;
}

const volumeVertex = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const volumeCommon = /* glsl */ `
  precision highp sampler3D;
  uniform sampler3D uNoise;
  uniform vec3 uCamera;
  uniform float uTime;
  uniform float uSteps;
  varying vec3 vLocal;

  float noise3(vec3 p) { return texture(uNoise, p / 32.0).r; }
  float fbm(vec3 p) {
    float value = noise3(p) * 0.533;
    value += noise3(p * 2.03 + 7.1) * 0.267;
    value += noise3(p * 4.11 + 13.7) * 0.133;
    value += noise3(p * 8.23 + 21.3) * 0.067;
    return value;
  }
  vec2 intersectBox(vec3 origin, vec3 direction) {
    vec3 inverseDirection = 1.0 / (direction + vec3(0.00001));
    vec3 a = (-vec3(1.0) - origin) * inverseDirection;
    vec3 b = (vec3(1.0) - origin) * inverseDirection;
    vec3 nearPlane = min(a, b);
    vec3 farPlane = max(a, b);
    return vec2(max(max(nearPlane.x, nearPlane.y), nearPlane.z),
                min(min(farPlane.x, farPlane.y), farPlane.z));
  }
  float gaussian(float x, float width) { return exp(-x * x / width); }
`;

const galaxyFragment = /* glsl */ `
  ${volumeCommon}
  uniform float uArms;
  uniform float uIrregular;
  uniform float uElliptical;
  void main() {
    vec3 direction = normalize(vLocal - uCamera);
    vec2 bounds = intersectBox(uCamera, direction);
    float start = max(0.0, bounds.x);
    if (bounds.y <= start) discard;
    float stepSize = (bounds.y - start) / uSteps;
    vec3 light = vec3(0.0);
    float transmission = 1.0;
    for (int i = 0; i < 64; i++) {
      if (float(i) >= uSteps || transmission < 0.015) break;
      vec3 p = uCamera + direction * (start + (float(i) + 0.5) * stepSize);
      if (uElliptical > 0.5) {
        float ellipsoid = length(p * vec3(1.0, 1.15, 1.2));
        float density = exp(-ellipsoid * 5.0) * (1.0 - smoothstep(0.7, 1.0, ellipsoid));
        light += transmission * density * vec3(1.0, 0.77, 0.5) * stepSize * 3.0;
        transmission *= exp(-density * stepSize * 3.0);
        continue;
      }
      float r = length(p.xz);
      float edge = 1.0 - smoothstep(0.76, 1.0, r);
      float turbulent = fbm(vec3(p.xz * 14.0, p.y * 3.0));
      float angle = atan(p.z, p.x) - log(r + 0.04) * 2.6;
      float arms = pow(0.5 + 0.5 * cos(angle * uArms + (turbulent - 0.5) * 0.8), 2.6);
      arms = mix(arms, turbulent * 0.7, uIrregular);
      float thickness = 0.065 + 0.09 * exp(-r * 5.0);
      float disk = exp(-abs(p.y) / thickness) * exp(-r * 2.8) * edge;
      float core = exp(-(r * r * 75.0 + p.y * p.y * 8.0));
      float spiral = disk * (0.7 + 1.25 * arms) * (0.12 + turbulent * turbulent * 2.4);
      float dustArms = pow(0.5 + 0.5 * cos(angle * uArms + 0.48), 10.0);
      float dustDetail = noise3(vec3(p.xz * 38.0, p.y * 9.0));
      float dust = disk * dustArms * smoothstep(0.15, 0.5, r) * (0.1 + dustDetail * 2.5);
      float extinction = (spiral * 0.8 + core * 0.6 + dust * 11.0) * stepSize * 6.0;
      vec3 stars = mix(vec3(0.32, 0.48, 0.75), vec3(1.0, 0.62, 0.28), exp(-r * 3.8));
      vec3 emission = spiral * stars * 1.15 + core * vec3(1.0, 0.68, 0.32) * 1.9;
      float knots = pow(max(0.0, turbulent - 0.48) * 2.0, 3.0) * arms * disk;
      emission += knots * vec3(0.55, 0.24, 0.31) * 1.2;
      light += transmission * emission * stepSize * 3.2;
      transmission *= exp(-extinction);
    }
    float alpha = clamp(1.0 - transmission, 0.0, 0.98);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(light / max(alpha, 0.01), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const nebulaFragment = /* glsl */ `
  ${volumeCommon}
  uniform float uRemnant;
  void main() {
    vec3 direction = normalize(vLocal - uCamera);
    vec2 bounds = intersectBox(uCamera, direction);
    float start = max(0.0, bounds.x);
    if (bounds.y <= start) discard;
    float stepSize = (bounds.y - start) / uSteps;
    vec3 light = vec3(0.0);
    float transmission = 1.0;
    for (int i = 0; i < 64; i++) {
      if (float(i) >= uSteps || transmission < 0.018) break;
      vec3 p = uCamera + direction * (start + (float(i) + 0.5) * stepSize);
      vec3 warp = vec3(fbm(p * 3.5 + 4.2), fbm(p * 3.5 + 18.3), fbm(p * 3.5 + 35.1)) - 0.5;
      float envelope = 1.0 - smoothstep(0.35, 0.95, length(p * vec3(0.78, 1.08, 0.9) + warp * 0.65));
      float cloud = fbm(p * 6.0 + warp * 5.0 + vec3(uTime * 0.012, 0.0, 0.0));
      float detail = fbm(p * 22.0 + warp * 5.0);
      float cavity = smoothstep(0.1, 0.55, length(p - vec3(0.08, -0.12, 0.12)));
      float density = pow(smoothstep(0.42, 0.68, cloud), 1.7) * envelope * (0.3 + cavity * 0.7);
      float shell = gaussian(length(p * vec3(0.9, 1.2, 1.0)) - 0.59, 0.006);
      float filament = pow(max(0.0, 1.0 - abs(detail - 0.51) * 12.0), 7.0);
      density = mix(density, shell * (0.18 + filament * 1.9) * envelope, uRemnant);
      float ionization = exp(-length(p - vec3(0.08, -0.12, 0.12)) * 2.0);
      vec3 warm = mix(vec3(0.8, 0.065, 0.025), vec3(0.95, 0.28, 0.055), detail);
      vec3 cool = mix(vec3(0.015, 0.22, 0.48), vec3(0.09, 0.53, 0.68), detail);
      vec3 gasColor = mix(warm, cool, smoothstep(0.22, 0.7, ionization + uRemnant * 0.1));
      float dustNoise = fbm(p * vec3(8.0, 4.0, 8.0) + vec3(21.0, 7.0, 4.0));
      float dust = smoothstep(0.48, 0.73, dustNoise) * envelope * (0.55 + cavity) * (1.0 - uRemnant * 0.55);
      float extinction = (density * 3.5 + dust * 13.0) * stepSize;
      float lighting = 0.55 + ionization * 1.3 + detail * 0.25;
      vec3 emission = gasColor * density * lighting * 2.7;
      emission += vec3(0.28, 0.57, 0.9) * gaussian(length(p), 0.026) * uRemnant * 2.0;
      light += transmission * emission * stepSize;
      transmission *= exp(-extinction);
    }
    float alpha = clamp(1.0 - transmission, 0.0, 0.98);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(light / max(alpha, 0.01), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const blackHoleFragment = /* glsl */ `
  ${volumeCommon}
  vec3 diskLight(vec3 p, vec3 ray) {
    float radius = length(p.xz);
    float angle = atan(p.z, p.x);
    float speed = uTime * 0.28 / pow(radius + 0.1, 1.5);
    float turbulence = fbm(vec3(radius * 25.0, angle * 3.0 - speed, 2.0));
    float bands = 0.72 + 0.28 * sin(radius * 210.0 + turbulence * 8.0);
    float wisps = 0.65 + 0.35 * sin(angle * 12.0 + log(radius) * 22.0 - speed * 3.0 + turbulence * 4.0);
    float hot = pow(0.3 / radius, 1.5);
    vec3 color = mix(vec3(0.68, 0.12, 0.025), vec3(1.0, 0.58, 0.18), clamp(hot, 0.0, 1.0));
    color = mix(color, vec3(1.0, 0.94, 0.72), smoothstep(0.55, 1.2, hot));
    vec3 tangent = normalize(vec3(-p.z, 0.0, p.x));
    float doppler = clamp(1.0 - dot(tangent, ray) * 0.65, 0.3, 1.9);
    float innerEdge = smoothstep(0.245, 0.28, radius);
    float outerEdge = 1.0 - smoothstep(0.6, 0.94, radius);
    return color * bands * wisps * pow(doppler, 2.2) * innerEdge * outerEdge * (0.65 + hot * 1.8);
  }
  void main() {
    vec3 ray = normalize(vLocal - uCamera);
    vec2 bounds = intersectBox(uCamera, ray);
    if (bounds.y <= max(bounds.x, 0.0)) discard;
    vec3 p = uCamera + ray * (max(0.0, bounds.x) + 0.001);
    float angularMomentum2 = dot(cross(p, ray), cross(p, ray));
    vec3 light = vec3(0.0);
    float opacity = 0.0;
    float minimumRadius = 2.0;
    for (int i = 0; i < 144; i++) {
      if (float(i) >= uSteps) break;
      float radius = length(p);
      minimumRadius = min(minimumRadius, radius);
      if (radius < 0.125) { opacity = 1.0; break; }
      if (radius > 1.8) break;
      float stepSize = clamp(radius * 0.15, 0.008, 0.075);
      // Schwarzschild-inspired ray bending; a visual approximation, not a GR solver.
      vec3 acceleration = -0.1875 * angularMomentum2 * p / pow(radius, 5.0);
      vec3 nextRay = ray + acceleration * stepSize;
      vec3 nextPosition = p + nextRay * stepSize;
      if (p.y * nextPosition.y <= 0.0) {
        vec3 crossing = mix(p, nextPosition, p.y / (p.y - nextPosition.y + 0.000001));
        float diskRadius = length(crossing.xz);
        if (diskRadius > 0.245 && diskRadius < 0.94) {
          vec3 emission = diskLight(crossing, normalize(nextRay));
          light += (1.0 - opacity) * emission;
          opacity += (1.0 - opacity) * 0.94;
        }
      }
      p = nextPosition;
      ray = nextRay;
    }
    float ring = exp(-abs(minimumRadius - 0.192) * 240.0);
    light += vec3(1.0, 0.7, 0.33) * ring * 0.24;
    opacity = max(opacity, ring * 0.75);
    if (opacity < 0.008) discard;
    gl_FragColor = vec4(light / max(opacity, 0.01), opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  uniform float uHeight;
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * uHeight / max(1.0, -viewPosition.z), 0.6, 4.5);
    vColor = color;
    vBrightness = aBrightness;
  }
`;

const starFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    float core = exp(-radius * radius * 7.0);
    float halo = exp(-radius * radius * 2.5) * 0.13;
    float alpha = (core + halo) * (1.0 - smoothstep(0.65, 1.0, radius));
    gl_FragColor = vec4(vColor * vBrightness, alpha * 0.85);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSpaceNoise(): THREE.Data3DTexture {
  const size = 32;
  const values = new Uint8Array(size ** 3);
  let seed = 1979;
  for (let i = 0; i < values.length; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    values[i] = (seed >>> 24) & 255;
  }
  const texture = new THREE.Data3DTexture(values, size, size, size);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

function volume(
  fragmentShader: string,
  noise: THREE.Data3DTexture,
  mobile: boolean,
  extraUniforms: Record<string, THREE.IUniform> = {},
) {
  const material = new THREE.ShaderMaterial({
    vertexShader: volumeVertex,
    fragmentShader,
    uniforms: {
      uNoise: { value: noise },
      uCamera: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uSteps: { value: mobile ? 28 : 44 },
      ...extraUniforms,
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
  const inverseWorld = new THREE.Matrix4();
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    inverseWorld.copy(mesh.matrixWorld).invert();
    material.uniforms.uCamera.value
      .setFromMatrixPosition(camera.matrixWorld)
      .applyMatrix4(inverseWorld);
  };
  return { mesh, material };
}

export function createGalaxyVisual(
  radius: number,
  random: () => number,
  noise: THREE.Data3DTexture,
  mobile: boolean,
  irregular = false,
  elliptical = false,
): SpaceVisual {
  const group = new THREE.Group();
  const arms = radius > 100 ? 4 : 2;
  const haze = volume(galaxyFragment, noise, mobile, {
    uArms: { value: arms },
    uIrregular: { value: irregular ? 1 : 0 },
    uElliptical: { value: elliptical ? 1 : 0 },
  });
  haze.mesh.scale.set(radius, radius * (elliptical ? 0.75 : 0.22), radius);
  haze.mesh.renderOrder = 2;
  group.add(haze.mesh);

  const count = mobile
    ? radius > 100
      ? 13000
      : 5000
    : radius > 100
      ? 26000
      : 10000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);
  const warm = new THREE.Color('#FFE3B5');
  const blue = new THREE.Color('#A9CFF2');
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const bulge = i < count * 0.26;
    const r = Math.pow(random(), bulge ? 2.6 : 0.7) * (bulge ? 0.23 : 1);
    const angle =
      Math.log(r + 0.04) * 2.6 +
      (Math.floor(random() * arms) * Math.PI * 2) / arms +
      (random() - 0.5) * (irregular ? 6.2 : 0.55);
    positions.set(
      [
        Math.cos(angle) * r * radius,
        (random() - 0.5) * radius * (bulge ? 0.1 : 0.018),
        Math.sin(angle) * r * radius,
      ],
      i * 3,
    );
    if (elliptical) {
      const elevation = Math.acos(2 * random() - 1);
      const azimuth = random() * Math.PI * 2;
      const sphereRadius = Math.pow(random(), 1.8) * radius;
      positions.set(
        [
          Math.sin(elevation) * Math.cos(azimuth) * sphereRadius,
          Math.cos(elevation) * sphereRadius * 0.7,
          Math.sin(elevation) * Math.sin(azimuth) * sphereRadius * 0.85,
        ],
        i * 3,
      );
    }
    color.copy(warm).lerp(blue, Math.min(1, r * 2.0));
    if (elliptical) color.copy(warm).lerp(blue, random() * 0.25);
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = radius * (0.0012 + Math.pow(random(), 8) * 0.009);
    brightness[i] = 0.3 + Math.pow(random(), 3) * 1.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute(
    'aBrightness',
    new THREE.BufferAttribute(brightness, 1),
  );
  const material = new THREE.ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    uniforms: { uHeight: { value: 900 } },
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(geometry, material);
  const resolution = new THREE.Vector2();
  stars.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(resolution);
    material.uniforms.uHeight.value = resolution.y;
  };
  stars.renderOrder = 1;
  group.add(stars);
  let lastTime = 0;
  return {
    group,
    update(time, focused) {
      group.rotation.y += (time - lastTime) * 0.004;
      lastTime = time;
      haze.material.uniforms.uTime.value = time;
      haze.material.uniforms.uSteps.value = mobile
        ? focused
          ? 36
          : 24
        : focused
          ? 56
          : 36;
    },
  };
}

export function createNebulaVisual(
  radius: number,
  remnant: boolean,
  noise: THREE.Data3DTexture,
  mobile: boolean,
): SpaceVisual {
  const group = new THREE.Group();
  const gas = volume(nebulaFragment, noise, mobile, {
    uRemnant: { value: remnant ? 1 : 0 },
  });
  gas.mesh.scale.set(radius * 1.65, radius * 1.4, radius * 1.55);
  gas.mesh.rotation.z = remnant ? -0.35 : 0.3;
  gas.mesh.renderOrder = 3;
  group.add(gas.mesh);
  const positions = remnant
    ? [[0, 0, 0]]
    : [
        [0.06, -0.13, 0.1],
        [0.15, -0.08, 0.12],
        [0.1, -0.18, 0.14],
        [-0.04, -0.11, 0.08],
      ];
  positions.forEach((position, index) => {
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(radius * (index ? 0.007 : 0.012), 12, 8),
      new THREE.MeshBasicMaterial({ color: '#D8E9FF' }),
    );
    star.position.fromArray(position).multiplyScalar(radius * 1.65);
    group.add(star);
  });
  return {
    group,
    update(time, focused) {
      group.scale.setScalar(focused ? 1 : 0.65);
      gas.material.uniforms.uTime.value = time;
      gas.material.uniforms.uSteps.value = mobile
        ? focused
          ? 40
          : 24
        : focused
          ? 60
          : 36;
    },
  };
}

export function createBlackHoleVisual(
  radius: number,
  noise: THREE.Data3DTexture,
  mobile: boolean,
): SpaceVisual {
  const group = new THREE.Group();
  const blackHole = volume(blackHoleFragment, noise, mobile);
  blackHole.mesh.scale.setScalar(radius * 3.6);
  blackHole.mesh.rotation.set(0.12, 0, -0.12);
  blackHole.mesh.renderOrder = 4;
  group.add(blackHole.mesh);
  return {
    group,
    update(time, focused) {
      group.scale.setScalar(focused ? 1 : 0.22);
      blackHole.material.uniforms.uTime.value = time;
      blackHole.material.uniforms.uSteps.value = mobile
        ? focused
          ? 112
          : 80
        : focused
          ? 144
          : 104;
    },
  };
}
