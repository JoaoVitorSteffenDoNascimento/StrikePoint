import React, { useRef } from 'react';
import {
  ARENA_HALF_SIZE,
  ARENA_WALLS,
  TeamId,
  WEAPONS,
  WeaponId,
} from '../game/rules';
import {
  ArmorShieldSvg,
  HeadshotIconSvg,
  HealthCrossSvg,
  WeaponSilhouetteSvg,
} from './TacticalIcons';

export interface KillfeedItem {
  id: string;
  killer: string;
  killerTeam: TeamId;
  victim: string;
  victimTeam: TeamId;
  weapon: WeaponId;
  headshot: boolean;
}

export interface RadarActor {
  id: string;
  team: TeamId;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  isSelf?: boolean;
}

interface TacticalHudProps {
  playerTeam: TeamId;
  hp: number;
  ghostHp: number;
  armor: number;
  ghostArmor: number;
  credits: number;
  activeSlot: 'primary' | 'secondary' | 'melee';
  primaryWeapon: WeaponId;
  magAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  isAds: boolean;
  ctScore: number;
  tScore: number;
  roundNumber: number;
  roundTimeSec: number;
  roundBanner: string | null;
  pingMs: number;
  regionName: string;
  muted: boolean;
  buyOpen: boolean;
  showTouchControls: boolean;
  hitmarkerState: 'none' | 'body' | 'head';
  hurtFlashAlpha: number;
  killfeed: KillfeedItem[];
  radarActors: RadarActor[];
  playerYaw: number;
  onSelectSlot: (slot: 'primary' | 'secondary' | 'melee') => void;
  onBuyWeapon: (weaponId: WeaponId) => void;
  onRefillArmor: () => void;
  onReload: () => void;
  onToggleAds: () => void;
  onJump: () => void;
  onToggleBuy: () => void;
  onToggleTouch: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onTouchMoveInput: (vx: number, vz: number) => void;
  onTouchLookDelta: (dx: number, dy: number) => void;
  onTouchFireChange: (firing: boolean) => void;
}

export function TacticalHud({
  playerTeam,
  hp,
  ghostHp,
  armor,
  ghostArmor,
  credits,
  activeSlot,
  primaryWeapon,
  magAmmo,
  reserveAmmo,
  isReloading,
  isAds,
  ctScore,
  tScore,
  roundNumber,
  roundTimeSec,
  roundBanner,
  pingMs,
  regionName,
  muted,
  buyOpen,
  showTouchControls,
  hitmarkerState,
  hurtFlashAlpha,
  killfeed,
  radarActors,
  playerYaw,
  onSelectSlot,
  onBuyWeapon,
  onRefillArmor,
  onReload,
  onToggleAds,
  onJump,
  onToggleBuy,
  onToggleTouch,
  onToggleMute,
  onPause,
  onRestart,
  onTouchMoveInput,
  onTouchLookDelta,
  onTouchFireChange,
}: TacticalHudProps) {
  const activeWeaponId: WeaponId =
    activeSlot === 'primary'
      ? primaryWeapon
      : activeSlot === 'secondary'
      ? 'deagle'
      : 'karambit';
  const weaponSpec = WEAPONS[activeWeaponId];

  const mins = Math.floor(roundTimeSec / 60);
  const secs = Math.floor(roundTimeSec % 60);
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const ctActors = radarActors.filter((a) => a.team === 'CT');
  const tActors = radarActors.filter((a) => a.team === 'T');

  // Touch joystick tracking refs
  const moveOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lookLastRef = useRef<{ x: number; y: number } | null>(null);
  const [stickOffset, setStickOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const selfActor = radarActors.find((a) => a.isSelf);
  const selfX = selfActor ? selfActor.x : 0;
  const selfZ = selfActor ? selfActor.z : 0;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden">
      {/* Peripheral Low-HP & Damage Vignette */}
      {(hp < 35 || hurtFlashAlpha > 0.02) && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: Math.max(hurtFlashAlpha, hp < 35 ? 0.55 : 0),
            background:
              'radial-gradient(circle at 50% 50%, transparent 52%, rgba(220, 38, 38, 0.65) 100%)',
          }}
        />
      )}

      {/* AWP Sniper Scope Overlay when ADS with AWP */}
      {isAds && activeWeaponId === 'awp' && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 1000 1000" className="w-full h-full">
            <defs>
              <mask id="scopeMask">
                <rect width="1000" height="1000" fill="white" />
                <circle cx="500" cy="500" r="340" fill="black" />
              </mask>
            </defs>
            <rect width="1000" height="1000" fill="#04070c" mask="url(#scopeMask)" />
            <circle cx="500" cy="500" r="340" stroke="#38bdf8" strokeWidth="3" fill="none" />
            <line x1="160" y1="500" x2="840" y2="500" stroke="#0f172a" strokeWidth="1.5" />
            <line x1="500" y1="160" x2="500" y2="840" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="500" cy="500" r="4" fill="#ef4444" />
          </svg>
        </div>
      )}

      {/* Exact (0,0) Center Crosshair & Hitmarker + Fast Reload Progress Cue */}
      <div
        className="fixed pointer-events-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {!(isAds && activeWeaponId === 'awp') && (
          <svg viewBox="0 0 48 48" className="w-11 h-11">
            {/* Outer Dynamic Tactical Reticle */}
            <line x1="24" y1="9" x2="24" y2="17" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="31" x2="24" y2="39" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="24" x2="17" y2="24" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <line x1="31" y1="24" x2="39" y2="24" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="24" r="1.6" fill="#F8FAFC" />

            {/* Hitmarker X Flash */}
            {hitmarkerState !== 'none' && (
              <g
                stroke={hitmarkerState === 'head' ? '#EF4444' : '#F8FAFC'}
                strokeWidth={hitmarkerState === 'head' ? '2.8' : '2.2'}
                strokeLinecap="round"
              >
                <line x1="14" y1="14" x2="19" y2="19" />
                <line x1="34" y1="14" x2="29" y2="19" />
                <line x1="14" y1="34" x2="19" y2="29" />
                <line x1="34" y1="34" x2="29" y2="29" />
              </g>
            )}
          </svg>
        )}

        {isReloading && (
          <div className="mt-1 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono-tabular text-amber-400 uppercase tracking-widest text-center">
            Recarregando...
          </div>
        )}
      </div>

      {/* CLUSTER 1 (TOP-CENTER): 5v5 Round Scoreboard, Timer & Alive Pips */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <div className="hud-panel rounded-lg px-3 py-1.5 flex items-center gap-2.5 sm:gap-4">
          {/* CT 5 Alive Pips (3 readable states: Full, Damaged, Hollow) */}
          <div className="hidden lg:flex items-center gap-1" aria-label="Operadores CT Vivos">
            {ctActors.map((op) => {
              const state = op.hp <= 0 ? 'empty' : op.hp < 55 ? 'damaged' : 'full';
              return (
                <span
                  key={op.id}
                  className={`w-3 h-4 rounded-xs border ${
                    state === 'full'
                      ? 'bg-sky-400 border-sky-200'
                      : state === 'damaged'
                      ? 'bg-amber-400 border-amber-200'
                      : 'bg-transparent border-slate-600'
                  }`}
                />
              );
            })}
          </div>

          {/* CT Score */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-sky-400 uppercase">CT</span>
            <span className="font-display text-2xl sm:text-3xl font-bold font-mono-tabular text-white leading-none">
              {ctScore}
            </span>
          </div>

          {/* Central Round Clock */}
          <div className="px-2.5 py-0.5 rounded bg-slate-950/90 border border-white/10 text-center">
            <div className="text-[9px] font-mono-tabular text-slate-400 uppercase tracking-wider">
              ROUND {roundNumber} · 5V5
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold font-mono-tabular text-amber-400 leading-tight">
              {timeFormatted}
            </div>
          </div>

          {/* T Score */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl sm:text-3xl font-bold font-mono-tabular text-white leading-none">
              {tScore}
            </span>
            <span className="text-[11px] font-bold text-orange-400 uppercase">T</span>
          </div>

          {/* T 5 Alive Pips */}
          <div className="hidden lg:flex items-center gap-1" aria-label="Operadores T Vivos">
            {tActors.map((op) => {
              const state = op.hp <= 0 ? 'empty' : op.hp < 55 ? 'damaged' : 'full';
              return (
                <span
                  key={op.id}
                  className={`w-3 h-4 rounded-xs border ${
                    state === 'full'
                      ? 'bg-orange-400 border-orange-200'
                      : state === 'damaged'
                      ? 'bg-amber-400 border-amber-200'
                      : 'bg-transparent border-slate-600'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Dedicated Server Telemetry Line */}
        <div className="text-[10px] font-mono-tabular text-slate-300 hud-stroke">
          {regionName.toUpperCase()} · 128-TICK · PING {pingMs}ms · EQUIPE {playerTeam}
        </div>

        {roundBanner && (
          <div className="mt-2 px-4 py-1.5 rounded bg-amber-500 text-slate-950 font-display text-lg font-bold uppercase tracking-wider shadow-lg">
            {roundBanner}
          </div>
        )}
      </div>

      {/* CLUSTER 2 (TOP-RIGHT): Utility Icon Buttons & Live Killfeed */}
      <div className="fixed top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Abrir Arsenal de Compra [B]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleBuy();
            }}
            className={`h-9 px-2.5 rounded hud-panel flex items-center gap-1.5 text-xs font-mono-tabular cursor-pointer transition-colors ${
              buyOpen ? 'border-amber-400 text-amber-400' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="font-bold text-emerald-400">${credits}</span>
            <span className="hidden md:inline">[B] Loja</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Alternar Controles Touch Mobile [T]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleTouch();
            }}
            className={`w-9 h-9 rounded hud-panel flex items-center justify-center text-xs font-mono-tabular cursor-pointer ${
              showTouchControls ? 'text-amber-400 border-amber-400' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="3" />
              <path d="M6 12h4M8 10v4" />
              <circle cx="15" cy="11" r="1" fill="currentColor" />
              <circle cx="18" cy="13" r="1" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Ativar Som [M]' : 'Silenciar Som [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 rounded hud-panel flex items-center justify-center text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              {muted ? (
                <path d="M11 5L6 9H2V15H6L11 19V5ZM23 9L17 15M17 9L23 15" />
              ) : (
                <path d="M11 5L6 9H2V15H6L11 19V5ZM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Reiniciar Partida [R]"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-9 h-9 rounded hud-panel flex items-center justify-center text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pausar Partida [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-9 h-9 rounded hud-panel flex items-center justify-center text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </div>

        {/* Live Killfeed (Top-Right) */}
        <div className="flex flex-col items-end gap-1 pointer-events-none">
          {killfeed.map((kf) => (
            <div
              key={kf.id}
              className="px-2.5 py-1 rounded bg-slate-950/85 border border-white/10 flex items-center gap-2 text-[11px] font-mono-tabular"
            >
              <span className={kf.killerTeam === 'CT' ? 'text-sky-400 font-semibold' : 'text-orange-400 font-semibold'}>
                {kf.killer}
              </span>
              <span className="text-slate-400 uppercase">[{WEAPONS[kf.weapon].name.split(' ')[0]}]</span>
              {kf.headshot && <HeadshotIconSvg className="w-3.5 h-3.5" />}
              <span className={kf.victimTeam === 'CT' ? 'text-sky-400 font-semibold' : 'text-orange-400 font-semibold'}>
                {kf.victim}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Buy / Arsenal Bar (when B is toggled) */}
      {buyOpen && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 hud-panel rounded-xl p-3 flex flex-wrap items-center gap-2 pointer-events-auto max-w-[94vw]">
          {(['m4a1', 'ak47', 'awp', 'mp5'] as WeaponId[]).map((wId) => {
            const spec = WEAPONS[wId];
            const active = primaryWeapon === wId;
            return (
              <button
                key={wId}
                type="button"
                onClick={() => onBuyWeapon(wId)}
                className={`px-3 py-2 rounded text-left cursor-pointer transition-colors ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-white/10'
                }`}
              >
                <div className="text-xs font-bold whitespace-nowrap">{spec.name}</div>
                <div className="text-[10px] font-mono-tabular">
                  ${spec.cost} · {spec.roleClue.split('·')[0]}
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onRefillArmor}
            className="px-3 py-2 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 hover:bg-sky-500/30 text-left cursor-pointer"
          >
            <div className="text-xs font-bold whitespace-nowrap">Kevlar + Capacete</div>
            <div className="text-[10px] font-mono-tabular">$650 · Blindagem 100</div>
          </button>
        </div>
      )}

      {/* CLUSTER 3 (BOTTOM-LEFT): Tactical Radar Minimap + Vitality HP/Armor Bars */}
      <div className="fixed bottom-3 left-3 flex items-end gap-2.5 pointer-events-none">
        {/* Live SVG Radar Projecting Real Level Geometry */}
        <div className="hidden sm:block w-24 h-24 lg:w-28 lg:h-28 rounded-lg hud-panel p-1.5 relative overflow-hidden">
          <svg viewBox="-42 -42 84 84" className="w-full h-full">
            <rect x="-40" y="-40" width="80" height="80" fill="#090d14" stroke="#334155" strokeWidth="1" />
            {/* Bombsites A & B */}
            <circle cx="-22" cy="0" r="4" fill="rgba(249, 115, 22, 0.25)" stroke="#f97316" strokeWidth="0.8" />
            <circle cx="22" cy="0" r="4" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" strokeWidth="0.8" />
            {/* Real Arena Walls */}
            {ARENA_WALLS.map((w) => (
              <rect
                key={w.id}
                x={w.x - w.w * 0.5}
                y={w.z - w.d * 0.5}
                width={w.w}
                height={w.d}
                fill="#475569"
              />
            ))}
            {/* Player Vision Cone */}
            <g transform={`translate(${selfX}, ${selfZ}) rotate(${(-playerYaw * 180) / Math.PI})`}>
              <polygon points="0,0 -8,-18 8,-18" fill="rgba(56, 189, 248, 0.22)" />
            </g>
            {/* 5v5 Actors */}
            {radarActors.map((a) => {
              if (a.hp <= 0) return null;
              const col = a.isSelf ? '#fde047' : a.team === 'CT' ? '#38bdf8' : '#f97316';
              return (
                <circle
                  key={a.id}
                  cx={Math.max(-39, Math.min(39, a.x))}
                  cy={Math.max(-39, Math.min(39, a.z))}
                  r={a.isSelf ? 2.6 : 2.1}
                  fill={col}
                />
              );
            })}
          </svg>
          <div className="absolute bottom-1 left-2 text-[9px] font-mono-tabular text-slate-400">
            RADAR A/B
          </div>
        </div>

        {/* Vitality Readout (Hero-to-Kicker 3:1 Scale + Delayed Trailing Ghost Bar) */}
        <div className="hud-panel rounded-lg px-3.5 py-2.5 flex flex-col gap-2 min-w-[180px]">
          <div className="flex items-center justify-between gap-4">
            {/* HP Readout */}
            <div className="flex items-center gap-2">
              <HealthCrossSvg className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  HP
                </div>
                <div
                  className={`font-display text-3xl font-bold font-mono-tabular leading-none ${
                    hp <= 25 ? 'text-rose-500' : 'text-white'
                  }`}
                >
                  {Math.round(hp)}
                </div>
              </div>
            </div>

            {/* Kevlar Armor Readout */}
            <div className="flex items-center gap-2">
              <ArmorShieldSvg className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  KEVLAR
                </div>
                <div className="font-display text-3xl font-bold font-mono-tabular text-sky-400 leading-none">
                  {Math.round(armor)}
                </div>
              </div>
            </div>
          </div>

          {/* Continuous HP Bar with Trailing Ghost Drain Bar */}
          <div className="w-full h-2 rounded-xs bg-slate-950 overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-amber-400/75 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, ghostHp))}%` }}
            />
            <div
              className={`absolute inset-y-0 left-0 ${
                hp <= 25 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, hp))}%` }}
            />
          </div>

          {/* Continuous Armor Bar with Trailing Ghost Bar */}
          <div className="w-full h-1.5 rounded-xs bg-slate-950 overflow-hidden relative">
            <div
              className="absolute inset-y-0 left-0 bg-sky-200/60 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, ghostArmor))}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-sky-400"
              style={{ width: `${Math.max(0, Math.min(100, armor))}%` }}
            />
          </div>
        </div>
      </div>

      {/* CLUSTER 4 (BOTTOM-RIGHT): Weapon Silhouette, Tabular Magazine/Reserve & Slot Switcher */}
      <div className="fixed bottom-3 right-3 flex flex-col items-end gap-1.5 pointer-events-auto">
        {/* Quick Slot Buttons [1] [2] [3] */}
        <div className="flex items-center gap-1">
          {(
            [
              { slot: 'primary', key: '1', label: WEAPONS[primaryWeapon].name.split(' ')[0] },
              { slot: 'secondary', key: '2', label: 'Deagle' },
              { slot: 'melee', key: '3', label: 'Karambit' },
            ] as const
          ).map((item) => {
            const active = activeSlot === item.slot;
            return (
              <button
                key={item.slot}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectSlot(item.slot);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono-tabular cursor-pointer transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'hud-panel text-slate-300 hover:bg-slate-800'
                }`}
              >
                [{item.key}] {item.label}
              </button>
            );
          })}
        </div>

        {/* Active Weapon Card */}
        <div className="hud-panel rounded-lg px-4 py-2 flex items-center gap-4">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              {weaponSpec.name}
            </span>
            <WeaponSilhouetteSvg weaponId={activeWeaponId} className="w-24 h-6 my-0.5" />
            <span className="text-[10px] text-slate-400">{weaponSpec.roleClue}</span>
          </div>

          <div className="border-l border-white/10 pl-4 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              MUNIÇÃO
            </div>
            {activeSlot === 'melee' ? (
              <div className="font-display text-3xl font-bold font-mono-tabular text-sky-400 leading-none">
                ∞
              </div>
            ) : (
              <div className="flex items-baseline justify-end gap-1 font-mono-tabular">
                <span
                  className={`font-display text-3xl font-bold leading-none ${
                    magAmmo <= 5 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {magAmmo}
                </span>
                <span className="text-sm text-slate-400">/ {reserveAmmo}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE / TOUCH DUAL-THUMBSTICK & ERGONOMIC ACTION PAD (>= 44px touch targets) */}
      {showTouchControls && (
        <>
          {/* Left Virtual Thumbstick (Movement) positioned cleanly above bottom-left HUD */}
          <div
            aria-label="Joystick Virtual de Movimento"
            className="fixed bottom-32 left-5 w-24 h-24 rounded-full border-2 border-white/25 bg-slate-950/65 flex items-center justify-center pointer-events-auto touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              moveOriginRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!moveOriginRef.current) return;
              const dx = e.clientX - moveOriginRef.current.x;
              const dy = e.clientY - moveOriginRef.current.y;
              const maxR = 34;
              const dist = Math.hypot(dx, dy);
              const clampedDist = Math.min(maxR, dist);
              const angle = Math.atan2(dy, dx);
              const ox = Math.cos(angle) * clampedDist;
              const oy = Math.sin(angle) * clampedDist;
              setStickOffset({ x: ox, y: oy });
              onTouchMoveInput(ox / maxR, -oy / maxR);
            }}
            onPointerUp={() => {
              moveOriginRef.current = null;
              setStickOffset({ x: 0, y: 0 });
              onTouchMoveInput(0, 0);
            }}
            onPointerCancel={() => {
              moveOriginRef.current = null;
              setStickOffset({ x: 0, y: 0 });
              onTouchMoveInput(0, 0);
            }}
          >
            <div
              className="w-10 h-10 rounded-full bg-amber-400/85 border border-white shadow-md pointer-events-none"
              style={{
                transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
              }}
            />
          </div>

          {/* Right Touch Aim Pad + Ergonomic Combat Buttons positioned cleanly above bottom-right weapon card */}
          <div
            aria-label="Touchpad de Mira"
            className="fixed top-16 right-4 bottom-48 w-44 pointer-events-auto touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              lookLastRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!lookLastRef.current) return;
              const dx = e.clientX - lookLastRef.current.x;
              const dy = e.clientY - lookLastRef.current.y;
              lookLastRef.current = { x: e.clientX, y: e.clientY };
              onTouchLookDelta(dx, dy);
            }}
            onPointerUp={() => {
              lookLastRef.current = null;
            }}
          />

          <div className="fixed bottom-32 right-4 flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              aria-label="Pular"
              onClick={onJump}
              className="w-11 h-11 rounded-full hud-panel text-[11px] font-bold text-slate-200 active:bg-slate-700 cursor-pointer"
            >
              PULO
            </button>
            <button
              type="button"
              aria-label="Recarregar Arma"
              onClick={onReload}
              className="w-11 h-11 rounded-full hud-panel text-[11px] font-bold text-amber-400 active:bg-slate-700 cursor-pointer"
            >
              REC
            </button>
            <button
              type="button"
              aria-label="Mirar ADS"
              onClick={onToggleAds}
              className={`w-11 h-11 rounded-full hud-panel text-[11px] font-bold cursor-pointer ${
                isAds ? 'bg-sky-500 text-slate-950' : 'text-sky-400'
              }`}
            >
              MIRA
            </button>
            <button
              type="button"
              aria-label="Disparar Arma"
              onPointerDown={() => onTouchFireChange(true)}
              onPointerUp={() => onTouchFireChange(false)}
              onPointerLeave={() => onTouchFireChange(false)}
              className="w-14 h-14 rounded-full bg-rose-600 active:bg-rose-500 border-2 border-rose-300 text-white font-display text-sm font-bold uppercase shadow-lg cursor-pointer"
            >
              FOGO
            </button>
          </div>
        </>
      )}
    </div>
  );
}
