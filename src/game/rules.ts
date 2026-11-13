export type TeamId = 'CT' | 'T';
export type WeaponId = 'm4a1' | 'ak47' | 'awp' | 'mp5' | 'deagle' | 'karambit';
export type BotArchetype = 'rusher' | 'sniper' | 'flanker' | 'anchor';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  slot: 'primary' | 'secondary' | 'melee';
  roleClue: string;
  cost: number;
  damage: number;
  headshotMultiplier: number;
  armorPenetration: number; // 0..1
  fireRateRpm: number;
  automatic: boolean;
  magSize: number;
  reserveAmmo: number;
  reloadTimeSec: number;
  recoilKick: number;
  spreadRad: number;
  adsSpreadMultiplier: number;
  adsFov: number;
  moveSpeedMultiplier: number;
  rangeMeters: number;
  keyBinding: '1' | '2' | '3';
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  m4a1: {
    id: 'm4a1',
    name: 'M4A1-S Phantom',
    slot: 'primary',
    roleClue: 'Rifle Silenciado · Baixo Recuo',
    cost: 2900,
    damage: 33,
    headshotMultiplier: 3.1,
    armorPenetration: 0.78,
    fireRateRpm: 660,
    automatic: true,
    magSize: 25,
    reserveAmmo: 75,
    reloadTimeSec: 2.1,
    recoilKick: 0.018,
    spreadRad: 0.009,
    adsSpreadMultiplier: 0.35,
    adsFov: 52,
    moveSpeedMultiplier: 0.94,
    rangeMeters: 95,
    keyBinding: '1',
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47 Vanguard',
    slot: 'primary',
    roleClue: 'Rifle Pesado · 1-Tap Headshot',
    cost: 2700,
    damage: 38,
    headshotMultiplier: 3.4,
    armorPenetration: 0.85,
    fireRateRpm: 600,
    automatic: true,
    magSize: 30,
    reserveAmmo: 90,
    reloadTimeSec: 2.3,
    recoilKick: 0.026,
    spreadRad: 0.013,
    adsSpreadMultiplier: 0.4,
    adsFov: 52,
    moveSpeedMultiplier: 0.91,
    rangeMeters: 95,
    keyBinding: '1',
  },
  awp: {
    id: 'awp',
    name: 'AWP Recon .338',
    slot: 'primary',
    roleClue: 'Sniper Bolt-Action · Dano Letal',
    cost: 4750,
    damage: 115,
    headshotMultiplier: 3.5,
    armorPenetration: 0.97,
    fireRateRpm: 48,
    automatic: false,
    magSize: 5,
    reserveAmmo: 20,
    reloadTimeSec: 3.1,
    recoilKick: 0.065,
    spreadRad: 0.001,
    adsSpreadMultiplier: 0.08,
    adsFov: 24,
    moveSpeedMultiplier: 0.82,
    rangeMeters: 140,
    keyBinding: '1',
  },
  mp5: {
    id: 'mp5',
    name: 'MP5-SD Viper',
    slot: 'primary',
    roleClue: 'SMG CQB · Alta Mobilidade',
    cost: 1500,
    damage: 27,
    headshotMultiplier: 2.6,
    armorPenetration: 0.65,
    fireRateRpm: 800,
    automatic: true,
    magSize: 30,
    reserveAmmo: 120,
    reloadTimeSec: 1.8,
    recoilKick: 0.014,
    spreadRad: 0.016,
    adsSpreadMultiplier: 0.45,
    adsFov: 58,
    moveSpeedMultiplier: 1.0,
    rangeMeters: 65,
    keyBinding: '1',
  },
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle .50',
    slot: 'secondary',
    roleClue: 'Pistola Pesada · Alta Penetração',
    cost: 700,
    damage: 54,
    headshotMultiplier: 3.2,
    armorPenetration: 0.88,
    fireRateRpm: 240,
    automatic: false,
    magSize: 7,
    reserveAmmo: 35,
    reloadTimeSec: 1.9,
    recoilKick: 0.042,
    spreadRad: 0.011,
    adsSpreadMultiplier: 0.35,
    adsFov: 58,
    moveSpeedMultiplier: 0.97,
    rangeMeters: 80,
    keyBinding: '2',
  },
  karambit: {
    id: 'karambit',
    name: 'Karambit Doppler',
    slot: 'melee',
    roleClue: 'Corpo a Corpo · Velocidade Máxima',
    cost: 0,
    damage: 55,
    headshotMultiplier: 1.8,
    armorPenetration: 0.9,
    fireRateRpm: 110,
    automatic: false,
    magSize: 1,
    reserveAmmo: 0,
    reloadTimeSec: 0,
    recoilKick: 0.01,
    spreadRad: 0,
    adsSpreadMultiplier: 1,
    adsFov: 72,
    moveSpeedMultiplier: 1.12,
    rangeMeters: 3.4,
    keyBinding: '3',
  },
};

export interface WallBox {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  material: 'sandstone' | 'concrete' | 'crate' | 'steel';
}

export interface ServerRegion {
  id: string;
  name: string;
  location: string;
  tickRate: number;
  basePingMs: number;
}

export const SERVER_REGIONS: ServerRegion[] = [
  { id: 'sa-east-1', name: 'SA-EAST-1', location: 'São Paulo · BR', tickRate: 128, basePingMs: 9 },
  { id: 'us-east-1', name: 'US-EAST-1', location: 'Virginia · US', tickRate: 128, basePingMs: 42 },
  { id: 'eu-west-1', name: 'EU-WEST-1', location: 'Frankfurt · DE', tickRate: 128, basePingMs: 78 },
];

// Tactical 5v5 Three-Lane Arena ("Mirage / Dust Sandstone Compound")
// Playable area: X in [-42, 42], Z in [-42, 42]
// CT Spawn at Z = -34, T Spawn at Z = +34
// Open paths >= 5m wide everywhere so players and bots never get stuck
export const ARENA_WALLS: WallBox[] = [
  // Central Mid Cover & Archway Pillars (leaves wide side lanes)
  { id: 'mid_pillar_w', x: -7.5, z: 0, w: 4.5, d: 4.5, h: 4.6, material: 'sandstone' },
  { id: 'mid_pillar_e', x: 7.5, z: 0, w: 4.5, d: 4.5, h: 4.6, material: 'sandstone' },
  { id: 'mid_crate_center', x: 0, z: 0, w: 2.6, d: 2.6, h: 1.7, material: 'crate' },

  // Bombsite A (West Lane) Structures
  { id: 'site_a_main', x: -22, z: -8, w: 6.5, d: 5.5, h: 4.4, material: 'sandstone' },
  { id: 'site_a_long', x: -24, z: 11, w: 5.5, d: 6.0, h: 4.2, material: 'sandstone' },
  { id: 'site_a_crate_1', x: -15, z: -14, w: 2.5, d: 2.5, h: 1.8, material: 'crate' },
  { id: 'site_a_crate_2', x: -16, z: 15, w: 2.5, d: 2.5, h: 1.8, material: 'crate' },

  // Bombsite B (East Lane) Structures
  { id: 'site_b_main', x: 22, z: 8, w: 6.5, d: 5.5, h: 4.4, material: 'concrete' },
  { id: 'site_b_short', x: 24, z: -11, w: 5.5, d: 6.0, h: 4.2, material: 'concrete' },
  { id: 'site_b_crate_1', x: 15, z: 14, w: 2.6, d: 2.6, h: 1.8, material: 'steel' },
  { id: 'site_b_crate_2', x: 16, z: -15, w: 2.6, d: 2.6, h: 1.8, material: 'crate' },

  // North CT-Side Tactical Cover (leaves X=0 spawn vista completely open!)
  { id: 'ct_bunker_w', x: -12, z: -22, w: 5.0, d: 3.2, h: 3.4, material: 'concrete' },
  { id: 'ct_bunker_e', x: 12, z: -22, w: 5.0, d: 3.2, h: 3.4, material: 'concrete' },

  // South T-Side Tactical Cover
  { id: 't_bunker_w', x: -12, z: 22, w: 5.0, d: 3.2, h: 3.4, material: 'sandstone' },
  { id: 't_bunker_e', x: 12, z: 22, w: 5.0, d: 3.2, h: 3.4, material: 'sandstone' },
];

export const ARENA_HALF_SIZE = 40;

export interface DamageResult {
  hpDamage: number;
  armorDamage: number;
  nextHp: number;
  nextArmor: number;
  lethal: boolean;
}

/**
 * Calculates CS:GO / Standoff style ballistic damage with armor penetration,
 * headshot multiplier, and distance falloff.
 */
export function calculateBallisticDamage(params: {
  weapon: WeaponSpec;
  isHeadshot: boolean;
  distanceMeters: number;
  currentHp: number;
  currentArmor: number;
}): DamageResult {
  const { weapon, isHeadshot, distanceMeters, currentHp, currentArmor } = params;

  const distRatio = Math.min(1, Math.max(0, distanceMeters / weapon.rangeMeters));
  const falloff = 1 - distRatio * 0.22;
  const rawDamage = weapon.damage * (isHeadshot ? weapon.headshotMultiplier : 1.0) * falloff;

  let hpDamage = rawDamage;
  let armorDamage = 0;

  if (currentArmor > 0) {
    const penetrated = rawDamage * weapon.armorPenetration;
    const absorbed = (rawDamage - penetrated) * 0.55;
    armorDamage = Math.min(currentArmor, Math.max(1, Math.round(absorbed)));
    hpDamage = penetrated;
  }

  const finalHpDamage = Math.max(1, Math.round(hpDamage));
  const nextHp = Math.max(0, currentHp - finalHpDamage);
  const nextArmor = Math.max(0, currentArmor - armorDamage);

  return {
    hpDamage: finalHpDamage,
    armorDamage,
    nextHp,
    nextArmor,
    lethal: nextHp <= 0,
  };
}

/**
 * Resolves 2D circle vs AABB collision on the XZ plane so actors smoothly slide along walls.
 */
export function resolveArenaCollision(
  x: number,
  z: number,
  radius: number,
  walls: WallBox[] = ARENA_WALLS,
  arenaLimit: number = ARENA_HALF_SIZE
): { x: number; z: number; collided: boolean } {
  let nx = Math.max(-arenaLimit + radius, Math.min(arenaLimit - radius, x));
  let nz = Math.max(-arenaLimit + radius, Math.min(arenaLimit - radius, z));
  let collided = nx !== x || nz !== z;

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const halfW = w.w * 0.5;
    const halfD = w.d * 0.5;
    const minX = w.x - halfW;
    const maxX = w.x + halfW;
    const minZ = w.z - halfD;
    const maxZ = w.z + halfD;

    const closestX = Math.max(minX, Math.min(nx, maxX));
    const closestZ = Math.max(minZ, Math.min(nz, maxZ));

    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = radius - dist;
        nx += (dx / dist) * overlap;
        nz += (dz / dist) * overlap;
      } else {
        // Inside box center fallback: push out along nearest edge
        const leftPen = Math.abs(nx - minX);
        const rightPen = Math.abs(maxX - nx);
        const topPen = Math.abs(nz - minZ);
        const bottomPen = Math.abs(maxZ - nz);
        const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
        if (minPen === leftPen) nx = minX - radius;
        else if (minPen === rightPen) nx = maxX + radius;
        else if (minPen === topPen) nz = minZ - radius;
        else nz = maxZ + radius;
      }
    }
  }

  return { x: nx, z: nz, collided };
}

/**
 * Checks if a 2D line segment (ax, az) -> (bx, bz) intersects any tall wall box.
 */
export function hasLineOfSight(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  walls: WallBox[] = ARENA_WALLS
): boolean {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    // Low crates (< 1.5m) don't block head-level line of sight
    if (w.h < 1.5) continue;
    const minX = w.x - w.w * 0.5;
    const maxX = w.x + w.w * 0.5;
    const minZ = w.z - w.d * 0.5;
    const maxZ = w.z + w.d * 0.5;

    if (segmentIntersectsAABB(ax, az, bx, bz, minX, minZ, maxX, maxZ)) {
      return false;
    }
  }
  return true;
}

export function segmentIntersectsAABB(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number
): boolean {
  let tmin = 0;
  let tmax = 1;
  const dx = x2 - x1;
  const dz = z2 - z1;

  if (Math.abs(dx) < 1e-6) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    const invDx = 1 / dx;
    let t1 = (minX - x1) * invDx;
    let t2 = (maxX - x1) * invDx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  if (Math.abs(dz) < 1e-6) {
    if (z1 < minZ || z1 > maxZ) return false;
  } else {
    const invDz = 1 / dz;
    let t1 = (minZ - z1) * invDz;
    let t2 = (maxZ - z1) * invDz;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  return tmin <= tmax;
}

export interface RoundEvaluationInput {
  ctAlive: number;
  tAlive: number;
  roundTimeRemainingSec: number;
  ctScore: number;
  tScore: number;
  roundsToWinMatch: number;
}

export interface RoundEvaluationResult {
  roundWinner: TeamId | null;
  nextCtScore: number;
  nextTScore: number;
  matchWinner: TeamId | null;
}

/**
 * Evaluates 5v5 round winner and match completion.
 */
export function evaluateRoundState(input: RoundEvaluationInput): RoundEvaluationResult {
  let roundWinner: TeamId | null = null;

  if (input.ctAlive <= 0 && input.tAlive <= 0) {
    roundWinner = 'CT';
  } else if (input.tAlive <= 0) {
    roundWinner = 'CT';
  } else if (input.ctAlive <= 0) {
    roundWinner = 'T';
  } else if (input.roundTimeRemainingSec <= 0) {
    // In tactical defuse mode, CT wins if time expires before T eliminates CT
    roundWinner = 'CT';
  }

  if (!roundWinner) {
    return {
      roundWinner: null,
      nextCtScore: input.ctScore,
      nextTScore: input.tScore,
      matchWinner: null,
    };
  }

  const nextCtScore = roundWinner === 'CT' ? input.ctScore + 1 : input.ctScore;
  const nextTScore = roundWinner === 'T' ? input.tScore + 1 : input.tScore;

  let matchWinner: TeamId | null = null;
  if (nextCtScore >= input.roundsToWinMatch) matchWinner = 'CT';
  else if (nextTScore >= input.roundsToWinMatch) matchWinner = 'T';

  return {
    roundWinner,
    nextCtScore,
    nextTScore,
    matchWinner,
  };
}

/**
 * Computes distinct movement vectors for the 4 bot archetypes:
 * - 'rusher': Pushes forward aggressively and strafes in CQB
 * - 'sniper': Holds long sightlines, kites backward if enemies close within 16m
 * - 'flanker': Orbits laterally around the target to attack from off-angles
 * - 'anchor': Patrols objective bombsite anchor points and holds cover
 */
export function computeBotArchetypeMove(params: {
  archetype: BotArchetype;
  botX: number;
  botZ: number;
  targetX: number;
  targetZ: number;
  hasLos: boolean;
  timeSec: number;
  botSeed: number;
}): { vx: number; vz: number; aimYaw: number } {
  const { archetype, botX, botZ, targetX, targetZ, hasLos, timeSec, botSeed } = params;
  const dx = targetX - botX;
  const dz = targetZ - botZ;
  const dist = Math.hypot(dx, dz) || 0.001;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  // Perpendicular right vector
  const perpX = -dirZ;
  const perpZ = dirX;
  const aimYaw = Math.atan2(-dx, -dz);

  const strafeSign = Math.sin(timeSec * 2.4 + botSeed * 3.1) >= 0 ? 1 : -1;

  if (archetype === 'rusher') {
    // Charges aggressively toward target, weaving side-to-side
    const forwardWeight = dist > 7 ? 0.92 : 0.25;
    const strafeWeight = dist > 7 ? 0.35 : 0.85;
    const rx = dirX * forwardWeight + perpX * strafeSign * strafeWeight;
    const rz = dirZ * forwardWeight + perpZ * strafeSign * strafeWeight;
    const len = Math.hypot(rx, rz) || 1;
    return { vx: rx / len, vz: rz / len, aimYaw };
  }

  if (archetype === 'sniper') {
    // Kites backward if enemy is closer than 18m; holds angle if at long range with LOS
    if (hasLos && dist < 18) {
      const rx = -dirX * 0.85 + perpX * strafeSign * 0.4;
      const rz = -dirZ * 0.85 + perpZ * strafeSign * 0.4;
      const len = Math.hypot(rx, rz) || 1;
      return { vx: rx / len, vz: rz / len, aimYaw };
    }
    if (hasLos && dist >= 18) {
      return { vx: perpX * strafeSign * 0.35, vz: perpZ * strafeSign * 0.35, aimYaw };
    }
    return { vx: dirX * 0.7, vz: dirZ * 0.7, aimYaw };
  }

  if (archetype === 'flanker') {
    // Orbits wide around the target to hit flanks
    const orbitDir = botSeed % 2 === 0 ? 1 : -1;
    const approach = dist > 14 ? 0.55 : -0.15;
    const rx = dirX * approach + perpX * orbitDir * 0.88;
    const rz = dirZ * approach + perpZ * orbitDir * 0.88;
    const len = Math.hypot(rx, rz) || 1;
    return { vx: rx / len, vz: rz / len, aimYaw };
  }

  // 'anchor': Defensive anchor holding lane and micro-peeking
  const peek = Math.sin(timeSec * 1.8 + botSeed);
  const forward = dist > 22 && !hasLos ? 0.65 : 0.0;
  const rx = dirX * forward + perpX * peek * 0.65;
  const rz = dirZ * forward + perpZ * peek * 0.65;
  const len = Math.hypot(rx, rz) || 1;
  return { vx: rx / len, vz: rz / len, aimYaw };
}
