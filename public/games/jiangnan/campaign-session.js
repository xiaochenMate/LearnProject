import {BOUNDS, MISSIONS, ENEMY_TYPES} from './campaign-core.js';

export const CHECKPOINT_KEY = 'jiangnan.checkpoint.v1';
const finite = (v, low, high) => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high;
const integer = (v, low, high) => Number.isInteger(v) && finite(v, low, high);
const position = p => p && finite(p.x, BOUNDS.minX, BOUNDS.maxX) && finite(p.z, BOUNDS.minZ, BOUNDS.maxZ);
const heading = p => finite(p.yaw, -1e6, 1e6) && finite(p.aim, -1e6, 1e6);
export const loadoutKey = save => `${save.difficulty}:${save.upgrades.armor}:${save.upgrades.reload}:${save.upgrades.engine}`;

// Checkpoints are untrusted local data. Never restore completion, rewards or arbitrary entities.
export function readCheckpoint(text, save) {
  try {
    const c = JSON.parse(text);
    if (!c || c.version !== 1 || !integer(c.chapter, 0, save.unlocked) || c.loadout !== loadoutKey(save)
      || !finite(c.savedAt, 0, 1e15) || !position(c.player) || !heading(c.player)
      || !finite(c.player.hp, .01, 100 + save.upgrades.armor * 18)
      || !finite(c.player.reload, 0, 6)) return null;
    const m = MISSIONS[c.chapter];
    if (!finite(c.time, 0, 1e7) || !finite(c.progress, 0, m.duration || 1)
      || !integer(c.waves, 0, m.waves?.length || 0) || !integer(c.repairs, 0, 3)
      || !integer(c.smokes, 0, 2) || !finite(c.smokeTime, 0, 7)
      || !finite(c.smokeCooldown, 0, 12) || !finite(c.repairCooldown, 0, 6)
      || !finite(c.damageTaken, 0, 1e7) || !finite(c.damageDealt, 0, 1e7)
      || !integer(c.shots, 0, 1e7) || !integer(c.hits, 0, c.shots) || !integer(c.kills, 0, 100)) return null;
    const expected = m.waves ? m.waves.slice(0, c.waves).flatMap(w => w.enemies) : m.enemies;
    if (!Array.isArray(c.enemies) || c.enemies.length !== expected.length || c.enemies.some((e, i) =>
      !position(e) || !heading(e) || e.type !== expected[i][2]
      || !finite(e.hp, 0, ENEMY_TYPES[e.type].hp) || !finite(e.reload, 0, 8))) return null;
    if (m.type === 'escort') {
      if (!position(c.convoy) || !finite(c.convoy.hp, .01, 140)
        || !integer(c.convoy.routeIndex, 1, m.route.length - 1) || !finite(c.convoy.yaw, -1e6, 1e6)) return null;
    } else if (c.convoy !== null) return null;
    return c;
  } catch { return null; }
}

export function repairRecipient(player, convoy, distance) {
  if (convoy && distance <= 12 && convoy.hp < convoy.maxHP
    && convoy.hp / convoy.maxHP < player.hp / player.maxHP) return convoy;
  return player.hp < player.maxHP ? player : null;
}

export function objectiveSteps(mission, {alive, progress, convoy, waves, inside}) {
  const complete = (label, done) => ({label, done});
  if (mission.type === 'escort') return [complete('南岸接应', true), complete('沿堤护送', convoy?.routeIndex >= 3), complete('穿过东桥送达', convoy?.routeIndex >= mission.route.length)];
  if (mission.type === 'defend') return [complete('启动北塔', progress > 0), complete('守住 40 秒', progress >= mission.duration), complete('清除两轮反扑', waves === mission.waves.length && alive === 0)];
  if (mission.type === 'capture') return [complete('清除电台守卫', alive === 0), complete('驻留恢复供电', progress >= mission.duration)];
  if (mission.type === 'reach') return [complete('沿西桥南渡', progress > 0), complete('抵达接应点', progress >= 1)];
  return [complete('清除区域敌车', alive === 0), complete('抵达信号圈', inside && alive === 0)];
}

export function missionRating({hp, maxHP, convoy, repairs}) {
  return 1 + (hp / maxHP >= .4 ? 1 : 0) + ((convoy ? convoy.hp >= 84 : repairs >= 1) ? 1 : 0);
}

export function stickHeading(cameraAngle, x, y) {
  return cameraAngle - Math.atan2(x, -y);
}
