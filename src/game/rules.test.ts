import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS,
  calculateBallisticDamage,
  resolveArenaCollision,
  hasLineOfSight,
  evaluateRoundState,
  computeBotArchetypeMove,
} from './rules';

test('AK-47 headshot is a 1-tap lethal kill against full armor at medium range', () => {
  const res = calculateBallisticDamage({
    weapon: WEAPONS.ak47,
    isHeadshot: true,
    distanceMeters: 25,
    currentHp: 100,
    currentArmor: 100,
  });
  assert.equal(res.lethal, true);
  assert.equal(res.nextHp, 0);
  assert.ok(res.hpDamage >= 100);
});

test('M4A1 body shot reduces both HP and Kevlar armor without instant kill', () => {
  const res = calculateBallisticDamage({
    weapon: WEAPONS.m4a1,
    isHeadshot: false,
    distanceMeters: 20,
    currentHp: 100,
    currentArmor: 100,
  });
  assert.equal(res.lethal, false);
  assert.ok(res.nextHp > 65 && res.nextHp < 85);
  assert.ok(res.nextArmor < 100);
});

test('resolveArenaCollision clamps player inside arena bounds and pushes out of walls', () => {
  const outOfBounds = resolveArenaCollision(55, -60, 0.6);
  assert.equal(outOfBounds.collided, true);
  assert.ok(outOfBounds.x <= 40);
  assert.ok(outOfBounds.z >= -40);

  // Mid West pillar is at (-7.5, 0) with w=4.5, d=4.5 -> minX = -9.75, maxX = -5.25
  const insideWall = resolveArenaCollision(-5.3, 0, 0.5);
  assert.equal(insideWall.collided, true);
  assert.ok(insideWall.x >= -5.25 + 0.49);
});

test('hasLineOfSight detects tall sandstone pillars and ignores low center crate', () => {
  // Blocked by mid_pillar_w at (-7.5, 0) (height 4.6m)
  assert.equal(hasLineOfSight(-7.5, -10, -7.5, 10), false);
  // Open central corridor across low mid_crate_center at (0, 0) (height 1.7m > 1.5m so it blocks too)
  assert.equal(hasLineOfSight(0, -10, 0, 10), false);
  // Open gap between center crate (x=0, w=2.6) and east pillar (x=7.5, w=4.5) -> x = 3.2 is clear
  assert.equal(hasLineOfSight(3.2, -25, 3.2, 25), true);
});

test('evaluateRoundState awards round and match victory accurately', () => {
  const ongoing = evaluateRoundState({
    ctAlive: 3,
    tAlive: 2,
    roundTimeRemainingSec: 45,
    ctScore: 4,
    tScore: 3,
    roundsToWinMatch: 5,
  });
  assert.equal(ongoing.roundWinner, null);
  assert.equal(ongoing.matchWinner, null);

  const ctWinsMatch = evaluateRoundState({
    ctAlive: 2,
    tAlive: 0,
    roundTimeRemainingSec: 30,
    ctScore: 4,
    tScore: 3,
    roundsToWinMatch: 5,
  });
  assert.equal(ctWinsMatch.roundWinner, 'CT');
  assert.equal(ctWinsMatch.nextCtScore, 5);
  assert.equal(ctWinsMatch.matchWinner, 'CT');
});

test('computeBotArchetypeMove produces genuinely distinct movement vectors for rusher, sniper, and flanker', () => {
  const baseParams = {
    botX: 0,
    botZ: 0,
    targetX: 0,
    targetZ: 12,
    hasLos: true,
    timeSec: 1.0,
    botSeed: 2,
  };
  const rusher = computeBotArchetypeMove({ ...baseParams, archetype: 'rusher' });
  const sniper = computeBotArchetypeMove({ ...baseParams, archetype: 'sniper' });
  const flanker = computeBotArchetypeMove({ ...baseParams, archetype: 'flanker' });

  // Target is +Z (dz = +12). Rusher moves forward (+vz), Sniper kites backward (-vz) when < 18m
  assert.ok(rusher.vz > 0, 'Rusher should push toward target');
  assert.ok(sniper.vz < 0, 'Sniper should kite backward when enemy is within 18m');
  assert.ok(Math.abs(flanker.vx) > Math.abs(rusher.vx), 'Flanker should emphasize lateral orbit movement');
});
