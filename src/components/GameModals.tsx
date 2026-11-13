import React from 'react';
import {
  SERVER_REGIONS,
  TeamId,
  WEAPONS,
  WeaponId,
} from '../game/rules';
import { TitleEmblemSvg, WeaponSilhouetteSvg } from './TacticalIcons';

export interface OperatorStatRow {
  id: string;
  name: string;
  team: TeamId;
  roleLabel: string;
  alive: boolean;
  kills: number;
  deaths: number;
  pingMs: number;
  isSelf?: boolean;
}

export interface EndMatchSnapshot {
  victory: boolean;
  winnerTeam: TeamId;
  ctScore: number;
  tScore: number;
  kills: number;
  deaths: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  pingMs: number;
  regionName: string;
}

interface TitleScreenProps {
  selectedRegion: string;
  onSelectRegion: (id: string) => void;
  selectedTeam: TeamId;
  onSelectTeam: (t: TeamId) => void;
  selectedPrimary: WeaponId;
  onSelectPrimary: (w: WeaponId) => void;
  livePingMs: number;
  wsConnected: boolean;
  onStartMatch: () => void;
}

export function TitleScreenModal({
  selectedRegion,
  onSelectRegion,
  selectedTeam,
  onSelectTeam,
  selectedPrimary,
  onSelectPrimary,
  livePingMs,
  wsConnected,
  onStartMatch,
}: TitleScreenProps) {
  const primaryOptions: WeaponId[] = ['m4a1', 'ak47', 'awp', 'mp5'];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-8 lg:p-12 pointer-events-none bg-gradient-to-r from-[#06090f]/92 via-[#06090f]/55 to-transparent">
      {/* Asymmetric Left Column over 35-40% Negative Space */}
      <div className="w-full max-w-lg pointer-events-auto flex flex-col gap-5 my-auto">
        {/* Custom Inline SVG Title Lockup */}
        <div className="flex items-center gap-4">
          <TitleEmblemSvg className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
          <div>
            <div className="text-xs font-mono-tabular tracking-widest text-amber-400 uppercase">
              5V5 TACTICAL BALLISTIC OPERATIONS
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white uppercase leading-none">
              STRIKEPOINT
            </h1>
          </div>
        </div>

        {/* Dedicated Low-Latency Server Selector */}
        <div className="hud-panel rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              Servidor Dedicado 128-Tick
            </span>
            <span className="font-mono-tabular text-emerald-400">
              {wsConnected ? `WS ONLINE · ${livePingMs}ms` : 'REDE LOCAL · 12ms'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SERVER_REGIONS.map((reg) => {
              const active = selectedRegion === reg.id;
              const displayPing = active ? livePingMs : reg.basePingMs;
              const city = reg.location.split('·')[0].trim();
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => onSelectRegion(reg.id)}
                  className={`px-3 py-2 rounded text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-white/10'
                  }`}
                >
                  <div className="text-xs font-bold whitespace-nowrap">{reg.name}</div>
                  <div
                    className={`text-[11px] font-mono-tabular whitespace-nowrap ${
                      active ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {city} · {displayPing}ms
                  </div>
                </button>
              );
            })}
          </div>

          {/* Faction / Team Selection */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelectTeam('CT')}
              className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                selectedTeam === 'CT'
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-white/10'
              }`}
            >
              Força Tática CT (5v5)
            </button>
            <button
              type="button"
              onClick={() => onSelectTeam('T')}
              className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                selectedTeam === 'T'
                  ? 'bg-orange-500 text-slate-950'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-white/10'
              }`}
            >
              Sindicato T (5v5)
            </button>
          </div>
        </div>

        {/* Primary Loadout Selector with Role Clues & Costs */}
        <div className="hud-panel rounded-lg p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              Arsenal Primário [Tecla 1]
            </span>
            <span className="font-mono-tabular text-slate-400">
              Secundária: Desert Eagle [2] · Karambit [3]
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {primaryOptions.map((wId) => {
              const spec = WEAPONS[wId];
              const active = selectedPrimary === wId;
              return (
                <button
                  key={wId}
                  type="button"
                  onClick={() => onSelectPrimary(wId)}
                  className={`p-2.5 rounded flex flex-col gap-1 text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-2 border-amber-400 text-white'
                      : 'bg-slate-900/85 border border-white/10 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold whitespace-nowrap truncate">
                      {spec.name}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-amber-400">
                      ${spec.cost}
                    </span>
                  </div>
                  <WeaponSilhouetteSvg weaponId={wId} className="w-20 h-6 my-0.5" />
                  <div className="text-[11px] text-slate-400 whitespace-nowrap truncate">
                    {spec.roleClue}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Start Action CTA */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStartMatch();
          }}
          className="w-full py-3.5 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display text-2xl font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg"
        >
          Entrar na Partida 5v5
        </button>
      </div>

      {/* Bottom Safe-Margin Flat Control Hint Line */}
      <div className="text-xs text-slate-300 font-mono-tabular tracking-wide">
        WASD Mover · Mouse Mirar/Atirar · Botão Direito Zoom ADS · 1/2/3 Armas · R Recarregar · B Arsenal · P Pausar · Touch Mobile Automático
      </div>
    </div>
  );
}

interface PauseModalProps {
  operators: OperatorStatRow[];
  ctScore: number;
  tScore: number;
  regionName: string;
  pingMs: number;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export function PauseScoreboardModal({
  operators,
  ctScore,
  tScore,
  regionName,
  pingMs,
  onResume,
  onRestart,
  onReturnTitle,
}: PauseModalProps) {
  const ctOps = operators.filter((o) => o.team === 'CT');
  const tOps = operators.filter((o) => o.team === 'T');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div
        role="dialog"
        aria-label="Pausa e Placar Tático 5v5"
        className="hud-panel rounded-xl w-full max-w-2xl p-6 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              Partida Pausada · Placar 5v5
            </h2>
            <p className="text-xs font-mono-tabular text-slate-400">
              Servidor {regionName} · 128-Tick · Latência {pingMs}ms
            </p>
          </div>
          <div className="flex items-center gap-4 font-display text-3xl font-bold font-mono-tabular">
            <span className="text-sky-400">CT {ctScore}</span>
            <span className="text-slate-500">:</span>
            <span className="text-orange-400">{tScore} T</span>
          </div>
        </div>

        {/* 5v5 Tactical Scoreboard Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* CT Team */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sky-400 font-bold uppercase tracking-wider pb-1 border-b border-white/10">
              <span>Força Tática CT</span>
              <span className="font-mono-tabular">K / D · PING</span>
            </div>
            {ctOps.map((op) => (
              <div
                key={op.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded ${
                  op.isSelf ? 'bg-sky-500/20 border border-sky-400/40 text-white' : 'bg-slate-900/70 text-slate-300'
                }`}
              >
                <div className="truncate">
                  <span className="font-semibold">{op.name}</span>
                  <span className="text-[11px] text-slate-400 ml-1.5">· {op.roleLabel}</span>
                </div>
                <div className="font-mono-tabular shrink-0 ml-2">
                  {op.kills}/{op.deaths} · {op.pingMs}ms
                </div>
              </div>
            ))}
          </div>

          {/* T Team */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-orange-400 font-bold uppercase tracking-wider pb-1 border-b border-white/10">
              <span>Sindicato T</span>
              <span className="font-mono-tabular">K / D · PING</span>
            </div>
            {tOps.map((op) => (
              <div
                key={op.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded ${
                  op.isSelf ? 'bg-orange-500/20 border border-orange-400/40 text-white' : 'bg-slate-900/70 text-slate-300'
                }`}
              >
                <div className="truncate">
                  <span className="font-semibold">{op.name}</span>
                  <span className="text-[11px] text-slate-400 ml-1.5">· {op.roleLabel}</span>
                </div>
                <div className="font-mono-tabular shrink-0 ml-2">
                  {op.kills}/{op.deaths} · {op.pingMs}ms
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onReturnTitle}
            className="px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Menu Principal
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Reiniciar Partida
          </button>
          <button
            type="button"
            onClick={onResume}
            className="px-6 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Retomar Partida
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  snapshot: EndMatchSnapshot;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export function GameOverModal({
  snapshot,
  onPlayAgain,
  onReturnTitle,
}: GameOverModalProps) {
  const hsPercent =
    snapshot.kills > 0 ? Math.round((snapshot.headshots / snapshot.kills) * 100) : 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div
        role="dialog"
        aria-label="Resultado da Partida 5v5"
        className="hud-panel rounded-xl w-full max-w-lg p-6 flex flex-col gap-5 text-center"
      >
        <div>
          <div className="text-xs font-mono-tabular uppercase tracking-widest text-amber-400">
            FIM DE PARTIDA 5V5 · SERVIDOR {snapshot.regionName} ({snapshot.pingMs}ms)
          </div>
          <h2
            className={`font-display text-5xl font-bold uppercase tracking-tight mt-1 ${
              snapshot.victory ? 'text-emerald-400' : 'text-rose-500'
            }`}
          >
            {snapshot.victory ? 'Vitória Tática' : 'Derrota em Combate'}
          </h2>
        </div>

        {/* 3 Tabular-Nums Mastery Stat Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/90 border border-white/10 rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Placar Final
            </div>
            <div className="font-display text-3xl font-bold font-mono-tabular text-white mt-0.5">
              {snapshot.ctScore} - {snapshot.tScore}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-white/10 rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Eliminações / KDA
            </div>
            <div className="font-display text-3xl font-bold font-mono-tabular text-amber-400 mt-0.5">
              {snapshot.kills} / {snapshot.deaths}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-white/10 rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">
              Headshots
            </div>
            <div className="font-display text-3xl font-bold font-mono-tabular text-sky-400 mt-0.5">
              {hsPercent}%
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onReturnTitle}
            className="px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Menu Principal
          </button>
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onPlayAgain();
            }}
            className="flex-1 py-3 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-xl font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Jogar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}
