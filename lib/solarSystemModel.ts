import {
  Body, GeoMoon, HelioVector, JupiterMoons, RotateVector,
  RotationAxis, Rotation_EQJ_ECL, Vector,
} from 'astronomy-engine';

export type SpaceVector = [number, number, number];
export interface SatelliteOrbit {
  parent: string;
  radiusKm: number;
  axisKm: number;
  periodDays: number;
  inclination: number;
  phase: number;
}

// Mean elements: JPL SSD. The non-Galilean satellites use circular mean orbits,
// not precision ephemerides. Inclinations here are relative to the parent equator.
export const SATELLITE_ORBITS: Record<string, SatelliteOrbit> = {
  moon: { parent: 'earth', radiusKm: 1737.4, axisKm: 384400, periodDays: 27.32166, inclination: 5.145, phase: 0 },
  phobos: { parent: 'mars', radiusKm: 11.08, axisKm: 9376, periodDays: 0.31891, inclination: 1.08, phase: 0.7 },
  deimos: { parent: 'mars', radiusKm: 6.2, axisKm: 23463, periodDays: 1.26244, inclination: 1.79, phase: 2.8 },
  io: { parent: 'jupiter', radiusKm: 1821.49, axisKm: 421800, periodDays: 1.76914, inclination: 0.04, phase: 0 },
  europa: { parent: 'jupiter', radiusKm: 1560.8, axisKm: 671100, periodDays: 3.55118, inclination: 0.47, phase: 0 },
  ganymede: { parent: 'jupiter', radiusKm: 2631.2, axisKm: 1070400, periodDays: 7.15455, inclination: 0.2, phase: 0 },
  callisto: { parent: 'jupiter', radiusKm: 2410.3, axisKm: 1882700, periodDays: 16.68902, inclination: 0.19, phase: 0 },
  enceladus: { parent: 'saturn', radiusKm: 252.1, axisKm: 238400, periodDays: 1.37022, inclination: 0.01, phase: 1.2 },
  titan: { parent: 'saturn', radiusKm: 2574.76, axisKm: 1221900, periodDays: 15.94542, inclination: 0.33, phase: 3.1 },
  titania: { parent: 'uranus', radiusKm: 788.9, axisKm: 436300, periodDays: 8.70587, inclination: 0.08, phase: 0.5 },
  triton: { parent: 'neptune', radiusKm: 1353.4, axisKm: 354800, periodDays: 5.87685, inclination: 156.865, phase: 1.6 },
};
export const SATELLITE_SYSTEMS: Record<string, string[]> = {};
Object.entries(SATELLITE_ORBITS).forEach(([id, orbit]) => {
  (SATELLITE_SYSTEMS[orbit.parent] ||= []).push(id);
});

const astroBodies: Record<string, Body> = {
  sun: Body.Sun, mercury: Body.Mercury, venus: Body.Venus, earth: Body.Earth,
  moon: Body.Moon, mars: Body.Mars, jupiter: Body.Jupiter,
  saturn: Body.Saturn, uranus: Body.Uranus, neptune: Body.Neptune,
};
export const PLANET_RADII_KM: Record<string, number> = {
  sun: 696340, mercury: 2439.7, venus: 6051.8, earth: 6371,
  mars: 3389.5, jupiter: 69911, saturn: 58232, uranus: 25362, neptune: 24622,
};
const meanDistanceAU: Record<string, number> = {
  mercury: 0.3871, venus: 0.7233, earth: 1, mars: 1.5237,
  jupiter: 5.2026, saturn: 9.5549, uranus: 19.2184, neptune: 30.1104,
};
const rotation = Rotation_EQJ_ECL();
// Ecliptic -> Three.js: X right, Y north, Z towards the viewer (right handed).
const toScene = (v: Pick<Vector, 'x' | 'y' | 'z' | 't'>): SpaceVector => {
  const e = RotateVector(rotation, new Vector(v.x, v.y, v.z, v.t));
  return [e.x, e.z, -e.y];
};
export interface SolarState {
  positions: Record<string, SpaceVector>;
  north: Record<string, SpaceVector>;
  spin: Record<string, number>;
}
export function solarState(date: Date): SolarState {
  const positions: SolarState['positions'] = { sun: [0, 0, 0] };
  const north: SolarState['north'] = {};
  const spin: SolarState['spin'] = {};
  Object.entries(astroBodies).forEach(([id, body]) => {
    const axis = RotationAxis(body, date);
    north[id] = toScene(axis.north);
    spin[id] = axis.spin * Math.PI / 180;
    if (id !== 'sun') positions[id] = toScene(id === 'moon' ? GeoMoon(date) : HelioVector(body, date));
  });
  const jovian = JupiterMoons(date);
  for (const id of ['io', 'europa', 'ganymede', 'callisto'] as const) {
    positions[id] = toScene(jovian[id]);
  }
  const days = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  Object.entries(SATELLITE_ORBITS).forEach(([id, orbit]) => {
    if (positions[id]) return;
    const angle = orbit.phase + days / orbit.periodDays * Math.PI * 2;
    const inclination = orbit.inclination * Math.PI / 180;
    // Build a stable orthonormal basis around the parent's north pole.
    const pole = north[orbit.parent];
    const length = Math.hypot(pole[1], pole[2]);
    const u = length > 1e-8 ? [0, pole[2] / length, -pole[1] / length] : [1, 0, 0];
    const v = [pole[1] * u[2] - pole[2] * u[1], pole[2] * u[0] - pole[0] * u[2], pole[0] * u[1] - pole[1] * u[0]];
    positions[id] = u.map((x, i) => x * Math.cos(angle) + (v[i] * Math.cos(inclination) + pole[i] * Math.sin(inclination)) * Math.sin(angle)) as SpaceVector;
  });
  return { positions, north, spin };
}
export function planetDisplayPosition(id: string, vector: SpaceVector, radius: number): SpaceVector {
  const scale = radius / (meanDistanceAU[id] || 1);
  return vector.map((value) => value * scale) as SpaceVector;
}
export function planetOrbitPosition(id: string, date: Date, radius: number): SpaceVector {
  return planetDisplayPosition(id, toScene(HelioVector(astroBodies[id], date)), radius);
}
export function satelliteNorth(id: string, state: SolarState): SpaceVector {
  if (id === 'moon') return state.north.moon;
  const orbit = SATELLITE_ORBITS[id];
  const pole = state.north[orbit.parent];
  const length = Math.hypot(pole[1], pole[2]);
  const u = length > 1e-8 ? [0, pole[2] / length, -pole[1] / length] : [1, 0, 0];
  const v = [pole[1] * u[2] - pole[2] * u[1], pole[2] * u[0] - pole[0] * u[2], pole[0] * u[1] - pole[1] * u[0]];
  const angle = orbit.inclination * Math.PI / 180;
  return pole.map((p, i) => p * Math.cos(angle) - v[i] * Math.sin(angle)) as SpaceVector;
}
export function satelliteDisplayRadius(id: string, parentSize: number, compact: boolean): number {
  const orbit = SATELLITE_ORBITS[id];
  const ratio = orbit.axisKm / PLANET_RADII_KM[orbit.parent];
  return parentSize * (compact ? 1.9 + Math.log10(ratio) * 1.5 : 2.7 + Math.log10(ratio) * 3);
}
export function satelliteDisplayPosition(id: string, vector: SpaceVector, parentSize: number, compact: boolean): SpaceVector {
  const radius = satelliteDisplayRadius(id, parentSize, compact);
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length * radius) as SpaceVector;
}
export function satelliteOrbitPath(id: string, date: Date, parentSize: number, compact: boolean): SpaceVector[] {
  const orbit = SATELLITE_ORBITS[id];
  return Array.from({ length: 96 }, (_, index) => {
    const sampleDate = new Date(date.getTime() + index / 96 * orbit.periodDays * 86400000);
    let vector: SpaceVector;
    if (id === 'moon') vector = toScene(GeoMoon(sampleDate));
    else if (['io', 'europa', 'ganymede', 'callisto'].includes(id)) vector = toScene(JupiterMoons(sampleDate)[id as keyof ReturnType<typeof JupiterMoons>]);
    else vector = solarState(sampleDate).positions[id];
    return satelliteDisplayPosition(id, vector, parentSize, compact);
  });
}
