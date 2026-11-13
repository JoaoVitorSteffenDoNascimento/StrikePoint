import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ARENA_HALF_SIZE,
  ARENA_WALLS,
  BotArchetype,
  SERVER_REGIONS,
  TeamId,
  WEAPONS,
  WeaponId,
  calculateBallisticDamage,
  computeBotArchetypeMove,
  evaluateRoundState,
  hasLineOfSight,
  resolveArenaCollision,
} from './game/rules';
import {
  ProceduralMaterials,
  buildTacticalArena,
  createMaterialLibrary,
  createOperatorModel,
  createViewmodelWeapon,
} from './game/models';
import { soundEngine } from './game/sound';
import {
  EndMatchSnapshot,
  GameOverModal,
  OperatorStatRow,
  PauseScoreboardModal,
  TitleScreenModal,
} from './components/GameModals';
import {
  KillfeedItem,
  RadarActor,
  TacticalHud,
} from './components/TacticalHud';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

interface SimOperator {
  id: string;
  name: string;
  team: TeamId;
  archetype: BotArchetype;
  roleLabel: string;
  weapon: WeaponId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  armor: number;
  kills: number;
  deaths: number;
  pingMs: number;
  isBot: boolean;
  seed: number;
  mesh: THREE.Group;
  hitFlashTimer: number;
  koTimer: number; // > 0 during KO topple animation
  windupTimer: number; // > 0 when telegraphing a shot
  fireCooldown: number;
  stepAccum: number;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  colorHex: number;
}

// Pre-allocated module-scope scratch objects (Zero GC in rAF loop)
const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _dummyObj = new THREE.Object3D();
const _pColor = new THREE.Color();

const BOT_ROSTER: Array<{
  name: string;
  team: TeamId;
  archetype: BotArchetype;
  roleLabel: string;
  weapon: WeaponId;
}> = [
  { name: 'Ghost-01', team: 'CT', archetype: 'sniper', roleLabel: 'Franco-Atirador', weapon: 'awp' },
  { name: 'Soap-TF', team: 'CT', archetype: 'rusher', roleLabel: 'Entry Fragger', weapon: 'm4a1' },
  { name: 'Gaz-Uk', team: 'CT', archetype: 'flanker', roleLabel: 'Flanqueador', weapon: 'mp5' },
  { name: 'Price-06', team: 'CT', archetype: 'anchor', roleLabel: 'Âncora Bombsite', weapon: 'm4a1' },
  { name: 'Viper-T', team: 'T', archetype: 'rusher', roleLabel: 'Assalto Rápido', weapon: 'ak47' },
  { name: 'Korsak', team: 'T', archetype: 'sniper', roleLabel: 'Sniper Longa Dist.', weapon: 'awp' },
  { name: 'Shadow-X', team: 'T', archetype: 'flanker', roleLabel: 'Lurker Tático', weapon: 'mp5' },
  { name: 'Raza-AK', team: 'T', archetype: 'anchor', roleLabel: 'Defensor de Rota', weapon: 'ak47' },
  { name: 'Volkov', team: 'T', archetype: 'rusher', roleLabel: 'Breacher', weapon: 'ak47' },
];

const PARTICLE_POOL_SIZE = 96;
const ROUNDS_TO_WIN_MATCH = 5;
const ROUND_DURATION_SEC = 95;

function detectIsMobileOrTouch(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const mobileUa =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const narrowScreen = window.innerWidth <= 920 || window.innerHeight <= 500;
  return Boolean(coarsePointer || mobileUa || narrowScreen || (hasTouch && window.innerWidth <= 1024));
}

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<GameState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [selectedRegion, setSelectedRegion] = useState<string>('sa-east-1');
  const [selectedTeam, setSelectedTeam] = useState<TeamId>('CT');
  const [primaryWeapon, setPrimaryWeapon] = useState<WeaponId>('m4a1');
  const [activeSlot, setActiveSlot] = useState<'primary' | 'secondary' | 'melee'>('primary');
  const [buyOpen, setBuyOpen] = useState<boolean>(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() =>
    detectIsMobileOrTouch()
  );
  const [muted, setMuted] = useState<boolean>(false);

  // Throttled HUD states
  const [hudState, setHudState] = useState({
    hp: 100,
    ghostHp: 100,
    armor: 100,
    ghostArmor: 100,
    credits: 4200,
    magAmmo: WEAPONS.m4a1.magSize,
    reserveAmmo: WEAPONS.m4a1.reserveAmmo,
    isReloading: false,
    isAds: false,
    ctScore: 0,
    tScore: 0,
    roundNumber: 1,
    roundTimeSec: ROUND_DURATION_SEC,
    roundBanner: null as string | null,
    pingMs: 9,
    wsConnected: false,
    hitmarkerState: 'none' as 'none' | 'body' | 'head',
    hurtFlashAlpha: 0,
    playerYaw: 0,
  });

  const [killfeed, setKillfeed] = useState<KillfeedItem[]>([]);
  const [radarActors, setRadarActors] = useState<RadarActor[]>([]);
  const [scoreboardRows, setScoreboardRows] = useState<OperatorStatRow[]>([]);
  const [endSnapshot, setEndSnapshot] = useState<EndMatchSnapshot | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Mutable Simulation Ref so 60Hz loop never tears down canvas on React updates
  const simRef = useRef({
    state: (initialAutostart ? 'playing' : 'title') as GameState,
    region: 'sa-east-1',
    playerTeam: 'CT' as TeamId,
    primaryWeapon: 'm4a1' as WeaponId,
    activeSlot: 'primary' as 'primary' | 'secondary' | 'melee',
    buyOpen: false,
    player: {
      x: 0,
      y: 0,
      z: -33,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      hp: 100,
      ghostHp: 100,
      armor: 100,
      ghostArmor: 100,
      credits: 4200,
      kills: 0,
      deaths: 0,
      headshots: 0,
      shotsFired: 0,
      shotsHit: 0,
      grounded: true,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      scaleY: 1,
      stepDist: 0,
      isAds: false,
      isReloading: false,
      reloadTimer: 0,
      fireCooldown: 0,
      recoilPitch: 0,
      recoilYaw: 0,
      trauma: 0,
      hurtFlash: 0,
      hitmarkerTimer: 0,
      hitmarkerType: 'none' as 'none' | 'body' | 'head',
      ammo: {
        primaryMag: WEAPONS.m4a1.magSize,
        primaryRes: WEAPONS.m4a1.reserveAmmo,
        secondaryMag: WEAPONS.deagle.magSize,
        secondaryRes: WEAPONS.deagle.reserveAmmo,
      },
    },
    match: {
      ctScore: 0,
      tScore: 0,
      roundNumber: 1,
      roundTimeSec: ROUND_DURATION_SEC,
      roundTransitionTimer: 0,
      roundBanner: null as string | null,
      hitstopTimer: 0,
    },
    input: {
      held: new Set<string>(),
      justPressed: new Set<string>(),
      mouseDown: false,
      mouseJustPressed: false,
      touchMoveX: 0,
      touchMoveZ: 0,
      touchFiring: false,
    },
    operators: [] as SimOperator[],
    pingMs: 9,
    wsConnected: false,
    rebuildViewmodel: null as ((wId: WeaponId) => void) | null,
    resetRoundActors: null as ((fullMatchReset: boolean) => void) | null,
  });

  // Sync body dataset state
  useEffect(() => {
    document.body.dataset.state = gameState;
    simRef.current.state = gameState;
    if (gameState !== 'playing' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [gameState]);

  // Dedicated Server WebSocket Connection & 128-Tick Ping Probe
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let pingInterval = 0;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        simRef.current.wsConnected = true;
        ws?.send(
          JSON.stringify({
            type: 'player:join',
            name: 'Você (Operador)',
            team: simRef.current.playerTeam,
            weapon: simRef.current.primaryWeapon,
            region: simRef.current.region,
            x: simRef.current.player.x,
            y: simRef.current.player.y,
            z: simRef.current.player.z,
            yaw: simRef.current.player.yaw,
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const s = simRef.current;
          if (msg.type === 'pong' && typeof msg.clientTs === 'number') {
            const rtt = Math.max(2, Date.now() - msg.clientTs);
            const regSpec =
              SERVER_REGIONS.find((r) => r.id === s.region) ||
              SERVER_REGIONS[0];
            s.pingMs = Math.round(regSpec.basePingMs + rtt * 0.35);
            return;
          }

          const syncRemotePeer = (peer: {
            id: string;
            name?: string;
            team?: TeamId;
            weapon?: WeaponId;
            x?: number;
            z?: number;
            yaw?: number;
            hp?: number;
            armor?: number;
          }) => {
            if (!peer || !peer.id) return;
            let op = s.operators.find((o) => o.id === peer.id);
            if (!op) {
              // Convert a bot slot on the same team into this live online player
              const candidate =
                s.operators.find((o) => o.isBot && o.team === (peer.team || 'T')) ||
                s.operators.find((o) => o.isBot);
              if (candidate) {
                candidate.id = peer.id;
                candidate.isBot = false;
                candidate.name = peer.name || `Online-${peer.id.slice(-3)}`;
                candidate.roleLabel = 'Jogador Online';
                op = candidate;
              }
            }
            if (op) {
              if (typeof peer.x === 'number') op.x = peer.x;
              if (typeof peer.z === 'number') op.z = peer.z;
              if (typeof peer.yaw === 'number') op.yaw = peer.yaw;
              if (typeof peer.hp === 'number') op.hp = peer.hp;
              if (typeof peer.armor === 'number') op.armor = peer.armor;
              op.mesh.position.set(op.x, 0, op.z);
              op.mesh.rotation.y = op.yaw;
            }
          };

          if (msg.type === 'room:init' && Array.isArray(msg.peers)) {
            msg.peers.forEach(syncRemotePeer);
          } else if (msg.type === 'player:joined' && msg.player) {
            syncRemotePeer(msg.player);
          } else if (msg.type === 'player:moved') {
            syncRemotePeer(msg);
          } else if (msg.type === 'player:shot') {
            const shooter = s.operators.find((o) => o.id === msg.id);
            if (shooter) {
              const dist = Math.hypot(s.player.x - shooter.x, s.player.z - shooter.z);
              soundEngine.playGunshot(shooter.weapon, dist);
            }
          } else if (msg.type === 'player:left' && msg.id) {
            const leaver = s.operators.find((o) => o.id === msg.id);
            if (leaver) {
              leaver.isBot = true;
              leaver.roleLabel = 'IA Substituta';
            }
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        simRef.current.wsConnected = false;
      };

      pingInterval = window.setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', clientTs: Date.now() }));
        }
      }, 2000);
    } catch {
      simRef.current.wsConnected = false;
    }

    return () => {
      window.clearInterval(pingInterval);
      ws?.close();
    };
  }, []);

  const getActiveWeaponId = useCallback((): WeaponId => {
    const s = simRef.current;
    return s.activeSlot === 'primary'
      ? s.primaryWeapon
      : s.activeSlot === 'secondary'
      ? 'deagle'
      : 'karambit';
  }, []);

  const handleSelectSlot = useCallback(
    (slot: 'primary' | 'secondary' | 'melee') => {
      const s = simRef.current;
      s.activeSlot = slot;
      s.player.isReloading = false;
      s.player.isAds = false;
      setActiveSlot(slot);
      const wId =
        slot === 'primary' ? s.primaryWeapon : slot === 'secondary' ? 'deagle' : 'karambit';
      s.rebuildViewmodel?.(wId);
    },
    []
  );

  const handleBuyWeapon = useCallback((wId: WeaponId) => {
    const s = simRef.current;
    const spec = WEAPONS[wId];
    if (s.player.credits >= spec.cost || s.primaryWeapon === wId) {
      if (s.primaryWeapon !== wId) {
        s.player.credits -= spec.cost;
      }
      s.primaryWeapon = wId;
      s.activeSlot = 'primary';
      s.player.ammo.primaryMag = spec.magSize;
      s.player.ammo.primaryRes = spec.reserveAmmo;
      s.player.isReloading = false;
      setPrimaryWeapon(wId);
      setActiveSlot('primary');
      setBuyOpen(false);
      s.buyOpen = false;
      s.rebuildViewmodel?.(wId);
      soundEngine.playReload();
    }
  }, []);

  const handleRefillArmor = useCallback(() => {
    const s = simRef.current;
    if (s.player.credits >= 650 && s.player.armor < 100) {
      s.player.credits -= 650;
      s.player.armor = 100;
      s.player.ghostArmor = 100;
      setBuyOpen(false);
      s.buyOpen = false;
      soundEngine.playReload();
    }
  }, []);

  const handleTriggerReload = useCallback(() => {
    const s = simRef.current;
    if (s.activeSlot === 'melee' || s.player.isReloading) return;
    const wId = s.activeSlot === 'primary' ? s.primaryWeapon : 'deagle';
    const spec = WEAPONS[wId];
    const curMag =
      s.activeSlot === 'primary' ? s.player.ammo.primaryMag : s.player.ammo.secondaryMag;
    const curRes =
      s.activeSlot === 'primary' ? s.player.ammo.primaryRes : s.player.ammo.secondaryRes;
    if (curMag < spec.magSize && curRes > 0) {
      s.player.isReloading = true;
      s.player.reloadTimer = spec.reloadTimeSec;
      s.player.isAds = false;
      soundEngine.playReload();
    }
  }, []);

  const handleStartMatch = useCallback(() => {
    const s = simRef.current;
    s.input.held.clear();
    s.input.justPressed.clear();
    s.input.mouseDown = false;
    s.input.mouseJustPressed = false;
    s.buyOpen = false;
    setBuyOpen(false);
    setEndSnapshot(null);
    s.resetRoundActors?.(true);
    s.rebuildViewmodel?.(getActiveWeaponId());
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'player:join',
          name: 'Operador Online',
          team: s.playerTeam,
          weapon: s.primaryWeapon,
          region: s.region,
          x: s.player.x,
          y: s.player.y,
          z: s.player.z,
          yaw: s.player.yaw,
        })
      );
    }
    document.body.dataset.state = 'playing';
    simRef.current.state = 'playing';
    setGameState('playing');
    if (!detectIsMobileOrTouch()) {
      const canvas = canvasMountRef.current?.querySelector('canvas');
      try {
        canvas?.requestPointerLock?.();
      } catch {
        // Ignore pointer lock rejection in headless/automated browsers
      }
    }
  }, [getActiveWeaponId]);

  // Mount Three.js WebGLRenderer & Scene ONCE
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyHorizonHex = 0xd8c3a5;
    scene.background = new THREE.Color(skyHorizonHex);
    scene.fog = new THREE.FogExp2(skyHorizonHex, 0.0085);

    // 2. Studio PBR Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // 3. Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x927452, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    sunLight.position.set(28, 46, -24);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 130;
      const d = 44;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    const camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.1,
      220
    );
    scene.add(camera);

    // Build Procedural Materials & Tactical Arena
    const mats: ProceduralMaterials = createMaterialLibrary(renderer, isSoftwareGl);
    const { envColliders } = buildTacticalArena(scene, mats, isSoftwareGl);

    // First-Person Viewmodel Weapon Holder attached to Camera
    const viewmodelHolder = new THREE.Group();
    camera.add(viewmodelHolder);
    let currentMuzzleFlash: THREE.Mesh | null = null;
    let muzzleFlashTimer = 0;

    const rebuildViewmodel = (wId: WeaponId) => {
      while (viewmodelHolder.children.length > 0) {
        viewmodelHolder.remove(viewmodelHolder.children[0]);
      }
      const { group, muzzleFlash } = createViewmodelWeapon(wId, mats);
      viewmodelHolder.add(group);
      currentMuzzleFlash = muzzleFlash;
    };
    simRef.current.rebuildViewmodel = rebuildViewmodel;
    rebuildViewmodel(simRef.current.primaryWeapon);

    // Zero-GC Pooled Particle Ring Buffer (InstancedMesh)
    const particleGeo = new THREE.DodecahedronGeometry(0.06, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleMesh = new THREE.InstancedMesh(
      particleGeo,
      particleMat,
      PARTICLE_POOL_SIZE
    );
    particleMesh.frustumCulled = false;
    scene.add(particleMesh);

    const particlePool: PooledParticle[] = Array.from(
      { length: PARTICLE_POOL_SIZE },
      () => ({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 1,
        colorHex: 0xfbbf24,
      })
    );
    let particleRingIdx = 0;

    const spawnParticles = (
      x: number,
      y: number,
      z: number,
      count: number,
      colorHex: number,
      speed = 4.5
    ) => {
      for (let i = 0; i < count; i++) {
        const p = particlePool[particleRingIdx];
        particleRingIdx = (particleRingIdx + 1) % PARTICLE_POOL_SIZE;
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = (Math.random() - 0.5) * speed;
        p.vy = Math.random() * speed * 0.75 + 0.8;
        p.vz = (Math.random() - 0.5) * speed;
        p.maxLife = 0.22 + Math.random() * 0.22;
        p.life = p.maxLife;
        p.scale = 0.7 + Math.random() * 0.9;
        p.colorHex = colorHex;
      }
    };

    // Spawn / Reset 5v5 Operators
    const operatorsGroup = new THREE.Group();
    scene.add(operatorsGroup);

    const resetRoundActors = (fullMatchReset: boolean) => {
      const s = simRef.current;
      if (fullMatchReset) {
        s.match.ctScore = 0;
        s.match.tScore = 0;
        s.match.roundNumber = 1;
        s.player.kills = 0;
        s.player.deaths = 0;
        s.player.headshots = 0;
        s.player.shotsFired = 0;
        s.player.shotsHit = 0;
        s.player.credits = 4200;
      }
      s.match.roundTimeSec = ROUND_DURATION_SEC;
      s.match.roundTransitionTimer = 0;
      s.match.roundBanner = null;

      // Spawn Player on an open corridor facing the central arena landmark
      const isPlayerCT = s.playerTeam === 'CT';
      s.player.x = 0;
      s.player.y = 0;
      s.player.z = isPlayerCT ? -33 : 33;
      s.player.vx = 0;
      s.player.vy = 0;
      s.player.vz = 0;
      s.player.yaw = isPlayerCT ? Math.PI : 0;
      s.player.pitch = 0;
      s.player.hp = 100;
      s.player.ghostHp = 100;
      s.player.armor = 100;
      s.player.ghostArmor = 100;
      s.player.isReloading = false;
      s.player.isAds = false;

      const pSpec = WEAPONS[s.primaryWeapon];
      s.player.ammo.primaryMag = pSpec.magSize;
      s.player.ammo.primaryRes = pSpec.reserveAmmo;
      s.player.ammo.secondaryMag = WEAPONS.deagle.magSize;
      s.player.ammo.secondaryRes = WEAPONS.deagle.reserveAmmo;

      // Rebuild 9 AI Operators to form exact 5v5 (5 CT vs 5 T)
      while (operatorsGroup.children.length > 0) {
        operatorsGroup.remove(operatorsGroup.children[0]);
      }

      const ctSlotsNeeded = isPlayerCT ? 4 : 5;
      const tSlotsNeeded = isPlayerCT ? 5 : 4;
      let ctCount = 0;
      let tCount = 0;
      const newOps: SimOperator[] = [];

      const extraRoster = [
        ...BOT_ROSTER,
        { name: 'price-ct', team: 'CT' as TeamId, archetype: 'rusher' as BotArchetype, roleLabel: 'Assalto', weapon: 'm4a1' as WeaponId },
      ];

      extraRoster.forEach((template, idx) => {
        if (template.team === 'CT' && ctCount >= ctSlotsNeeded) return;
        if (template.team === 'T' && tCount >= tSlotsNeeded) return;

        const teamIdx = template.team === 'CT' ? ctCount++ : tCount++;
        const ctOffsets = [-14, -6.5, 6.5, 14, -18];
        const tOffsets = [-15, -7.5, 0, 7.5, 15];
        const laneOffset =
          template.team === s.playerTeam
            ? ctOffsets[teamIdx % ctOffsets.length]
            : tOffsets[teamIdx % tOffsets.length];
        const spawnZ = template.team === 'CT' ? -31 : 31;
        const spawnYaw = template.team === 'CT' ? Math.PI : 0;

        const prevOp = fullMatchReset
          ? undefined
          : s.operators.find((o) => o.name === template.name);

        const mesh = createOperatorModel(template.team, template.archetype, mats);
        mesh.position.set(laneOffset, 0, spawnZ);
        mesh.rotation.y = spawnYaw;
        operatorsGroup.add(mesh);

        newOps.push({
          id: `bot_${idx}`,
          name: template.name,
          team: template.team,
          archetype: template.archetype,
          roleLabel: template.roleLabel,
          weapon: template.weapon,
          x: laneOffset,
          y: 0,
          z: spawnZ,
          yaw: spawnYaw,
          hp: 100,
          maxHp: 100,
          armor: 100,
          kills: prevOp ? prevOp.kills : 0,
          deaths: prevOp ? prevOp.deaths : 0,
          pingMs: 11 + (idx * 3) % 14,
          isBot: true,
          seed: idx + 1,
          mesh,
          hitFlashTimer: 0,
          koTimer: 0,
          windupTimer: 0,
          fireCooldown: 0.8 + (idx % 3) * 0.35,
          stepAccum: 0,
        });
      });

      s.operators = newOps;
    };

    simRef.current.resetRoundActors = resetRoundActors;
    resetRoundActors(true);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Input Event Listeners on window
    const onKeyDown = (e: KeyboardEvent) => {
      const s = simRef.current;
      const code = e.code;

      if (s.state === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        handleStartMatch();
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (s.state === 'playing') {
          setGameState('paused');
        } else if (s.state === 'paused') {
          setGameState('playing');
        }
        return;
      }

      if (!s.input.held.has(code)) {
        s.input.justPressed.add(code);
      }
      s.input.held.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.input.held.delete(e.code);
    };

    const clearInputs = () => {
      const s = simRef.current;
      s.input.held.clear();
      s.input.justPressed.clear();
      s.input.mouseDown = false;
      s.input.mouseJustPressed = false;
      s.input.touchFiring = false;
    };

    const onVisChange = () => {
      if (document.hidden) clearInputs();
    };

    let isDraggingLook = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      const s = simRef.current;
      if (s.state !== 'playing' || s.buyOpen) return;
      if (e.target !== renderer.domElement) return;

      // Immediately lock pointer on PC when clicking inside the game canvas
      if (document.pointerLockElement !== renderer.domElement && !detectIsMobileOrTouch()) {
        try {
          renderer.domElement.requestPointerLock?.();
        } catch {
          // Ignore pointer lock rejection in headless browsers
        }
      }

      if (e.button === 2) {
        s.player.isAds = !s.player.isAds;
        return;
      }
      if (e.button === 0) {
        s.input.mouseDown = true;
        s.input.mouseJustPressed = true;
        isDraggingLook = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const s = simRef.current;
      if (s.state !== 'playing' || s.buyOpen) return;
      const sens = s.player.isAds ? 0.0015 : 0.0026;

      if (document.pointerLockElement === renderer.domElement) {
        s.player.yaw -= e.movementX * sens;
        s.player.pitch = THREE.MathUtils.clamp(
          s.player.pitch - e.movementY * sens,
          -1.35,
          1.35
        );
      } else if (isDraggingLook || e.buttons === 1) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        s.player.yaw -= dx * sens * 1.4;
        s.player.pitch = THREE.MathUtils.clamp(
          s.player.pitch - dy * sens * 1.4,
          -1.35,
          1.35
        );
      }
    };

    const onMouseUp = () => {
      simRef.current.input.mouseDown = false;
      isDraggingLook = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onFirstTouch = () => {
      setShowTouchControls(true);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (detectIsMobileOrTouch()) {
        setShowTouchControls(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('touchstart', onFirstTouch, { passive: true });
    window.addEventListener('resize', onResize);

    // Software-WebGL Paced Animation Loop
    let frameId = 0;
    let lastTime = performance.now();
    let titleOrbitAngle = 0;
    let hudSyncTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const pushKillfeed = (item: KillfeedItem) => {
      setKillfeed((prev) => [item, ...prev.slice(0, 4)]);
    };

    function firePlayerWeapon() {
      const s = simRef.current;
      const p = s.player;
      const wId =
        s.activeSlot === 'primary'
          ? s.primaryWeapon
          : s.activeSlot === 'secondary'
          ? 'deagle'
          : 'karambit';
      const spec = WEAPONS[wId];

      if (s.activeSlot !== 'melee') {
        const mag =
          s.activeSlot === 'primary' ? p.ammo.primaryMag : p.ammo.secondaryMag;
        if (mag <= 0) {
          handleTriggerReload();
          return;
        }
        if (s.activeSlot === 'primary') p.ammo.primaryMag--;
        else p.ammo.secondaryMag--;
      }

      p.fireCooldown = 60 / spec.fireRateRpm;
      p.shotsFired++;
      soundEngine.playGunshot(wId, 0);

      // Visual Recoil & Muzzle Flash
      p.recoilPitch += spec.recoilKick;
      p.recoilYaw += (Math.random() - 0.5) * spec.recoilKick * 0.6;
      p.trauma = Math.min(1, p.trauma + spec.recoilKick * 5.5);
      muzzleFlashTimer = 0.045;

      // Raycast from Camera Center with Spread
      const spread = spec.spreadRad * (p.isAds ? spec.adsSpreadMultiplier : 1);
      const rx = (Math.random() - 0.5) * spread;
      const ry = (Math.random() - 0.5) * spread;

      _origin.copy(camera.position);
      _dir.set(rx, ry, -1).applyQuaternion(camera.quaternion).normalize();
      _raycaster.set(_origin, _dir);
      _raycaster.far = spec.rangeMeters;

      // Broadcast shot to WebSocket dedicated server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'player:shoot',
            weapon: wId,
            origin: [_origin.x, _origin.y, _origin.z],
            dir: [_dir.x, _dir.y, _dir.z],
          })
        );
      }

      // Check Wall Distance First
      const wallHits = _raycaster.intersectObjects(envColliders, false);
      const wallDist = wallHits.length > 0 ? wallHits[0].distance : Infinity;

      // Check Enemy Hitboxes
      let closestEnemy: SimOperator | null = null;
      let closestDist = wallDist;
      let hitPoint: THREE.Vector3 | null = null;
      let hitIsHead = false;

      for (const op of s.operators) {
        if (op.hp <= 0 || op.koTimer > 0 || op.team === s.playerTeam) continue;
        const hitMeshes = op.mesh.userData.hitMeshes as THREE.Mesh[];
        const hits = _raycaster.intersectObjects(hitMeshes, false);
        if (hits.length > 0 && hits[0].distance < closestDist) {
          closestDist = hits[0].distance;
          closestEnemy = op;
          hitPoint = hits[0].point;
          hitIsHead = Boolean(hits[0].object.userData.isHead);
        }
      }

      if (closestEnemy && hitPoint) {
        p.shotsHit++;
        const dmg = calculateBallisticDamage({
          weapon: spec,
          isHeadshot: hitIsHead,
          distanceMeters: closestDist,
          currentHp: closestEnemy.hp,
          currentArmor: closestEnemy.armor,
        });

        closestEnemy.hp = dmg.nextHp;
        closestEnemy.armor = dmg.nextArmor;
        closestEnemy.hitFlashTimer = 0.055;

        // Flash enemy materials white
        const flashMats = closestEnemy.mesh.userData
          .flashMaterials as THREE.MeshStandardMaterial[];
        flashMats.forEach((m) => m.emissive.setHex(0xffffff));

        p.hitmarkerTimer = 0.16;
        p.hitmarkerType = hitIsHead ? 'head' : 'body';
        soundEngine.playHitmarker(hitIsHead, dmg.lethal);

        spawnParticles(
          hitPoint.x,
          hitPoint.y,
          hitPoint.z,
          hitIsHead ? 18 : 8,
          hitIsHead ? 0xef4444 : 0xfbbf24,
          5.5
        );

        if (dmg.lethal) {
          closestEnemy.koTimer = 0.38;
          closestEnemy.deaths++;
          p.kills++;
          if (hitIsHead) p.headshots++;
          p.credits = Math.min(16000, p.credits + 300);
          // Brief sim hitstop on heavy kill/headshot
          s.match.hitstopTimer = hitIsHead ? 0.05 : 0.03;

          pushKillfeed({
            id: `kf_${Date.now()}_${Math.random()}`,
            killer: 'Você',
            killerTeam: s.playerTeam,
            victim: closestEnemy.name,
            victimTeam: closestEnemy.team,
            weapon: wId,
            headshot: hitIsHead,
          });
        }
      } else if (wallHits.length > 0) {
        const pt = wallHits[0].point;
        spawnParticles(pt.x, pt.y, pt.z, 5, 0xd6c3a5, 3.2);
      }
    }

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const s = simRef.current;
      const p = s.player;

      if (s.state === 'title') {
        // Live World Camera Tour over the 5v5 Sandstone Arena
        titleOrbitAngle += dt * 0.22;
        const radius = 28;
        camera.position.set(
          Math.sin(titleOrbitAngle) * radius,
          12.5 + Math.sin(titleOrbitAngle * 2) * 1.5,
          Math.cos(titleOrbitAngle) * radius
        );
        camera.lookAt(0, 2.2, 0);
        viewmodelHolder.visible = false;
      } else if (s.state === 'playing') {
        viewmodelHolder.visible = !(p.isAds && getActiveWeaponId() === 'awp');

        // Hitstop Timer (camera & flashes tick in real dt; physics pause during hitstop)
        if (s.match.hitstopTimer > 0) {
          s.match.hitstopTimer = Math.max(0, s.match.hitstopTimer - dt);
        }
        const simDt = s.match.hitstopTimer > 0 ? 0 : dt;

        // Process One-Shot Edge Inputs
        if (s.input.justPressed.has('Digit1')) handleSelectSlot('primary');
        if (s.input.justPressed.has('Digit2')) handleSelectSlot('secondary');
        if (s.input.justPressed.has('Digit3')) handleSelectSlot('melee');
        if (s.input.justPressed.has('KeyR')) handleTriggerReload();
        if (s.input.justPressed.has('KeyB')) {
          s.buyOpen = !s.buyOpen;
          setBuyOpen(s.buyOpen);
        }
        if (s.input.justPressed.has('KeyM')) {
          setMuted(soundEngine.toggleMute());
        }
        if (s.input.justPressed.has('KeyT')) {
          setShowTouchControls((prev) => !prev);
        }
        if (s.input.justPressed.has('Space')) {
          p.jumpBufferTimer = 0.12;
        }

        // Keyboard Camera Look Fallback (ArrowLeft / ArrowRight / Q / E)
        const turnSpeed = 2.1;
        if (s.input.held.has('ArrowLeft')) p.yaw += turnSpeed * dt;
        if (s.input.held.has('ArrowRight')) p.yaw -= turnSpeed * dt;
        if (s.input.held.has('ArrowUp'))
          p.pitch = THREE.MathUtils.clamp(p.pitch + 1.4 * dt, -1.2, 1.2);
        if (s.input.held.has('ArrowDown'))
          p.pitch = THREE.MathUtils.clamp(p.pitch - 1.4 * dt, -1.2, 1.2);

        // Reload Timer
        const activeWId = getActiveWeaponId();
        const activeSpec = WEAPONS[activeWId];
        if (p.isReloading) {
          p.reloadTimer -= simDt;
          if (p.reloadTimer <= 0) {
            p.isReloading = false;
            if (s.activeSlot === 'primary') {
              const needed = activeSpec.magSize - p.ammo.primaryMag;
              const take = Math.min(needed, p.ammo.primaryRes);
              p.ammo.primaryMag += take;
              p.ammo.primaryRes -= take;
            } else if (s.activeSlot === 'secondary') {
              const needed = activeSpec.magSize - p.ammo.secondaryMag;
              const take = Math.min(needed, p.ammo.secondaryRes);
              p.ammo.secondaryMag += take;
              p.ammo.secondaryRes -= take;
            }
          }
        }

        // Weapon Firing (Automatic vs Semi-Auto Edge Trigger)
        p.fireCooldown = Math.max(0, p.fireCooldown - simDt);
        const wantsFire = activeSpec.automatic
          ? s.input.mouseDown || s.input.touchFiring
          : s.input.mouseJustPressed || s.input.touchFiring;

        if (wantsFire && p.fireCooldown <= 0 && !p.isReloading && p.hp > 0) {
          firePlayerWeapon();
          if (!activeSpec.automatic) {
            s.input.touchFiring = false;
          }
        }

        s.input.justPressed.clear();
        s.input.mouseJustPressed = false;

        // Player Movement & Jump with Coyote Time + Input Buffering
        if (p.hp > 0 && simDt > 0) {
          let moveRight = s.input.touchMoveX;
          let moveForward = s.input.touchMoveZ;
          if (s.input.held.has('KeyW')) moveForward += 1;
          if (s.input.held.has('KeyS')) moveForward -= 1;
          if (s.input.held.has('KeyD')) moveRight += 1;
          if (s.input.held.has('KeyA')) moveRight -= 1;

          const inputLen = Math.hypot(moveRight, moveForward);
          if (inputLen > 1) {
            moveRight /= inputLen;
            moveForward /= inputLen;
          }

          const sinY = Math.sin(p.yaw);
          const cosY = Math.cos(p.yaw);
          const worldDirX = moveRight * cosY - moveForward * sinY;
          const worldDirZ = -moveRight * sinY - moveForward * cosY;

          const maxSpeed = 7.4 * activeSpec.moveSpeedMultiplier * (p.isAds ? 0.68 : 1.0);
          p.vx = THREE.MathUtils.damp(p.vx, worldDirX * maxSpeed, 14, simDt);
          p.vz = THREE.MathUtils.damp(p.vz, worldDirZ * maxSpeed, 14, simDt);

          const nextPos = resolveArenaCollision(
            p.x + p.vx * simDt,
            p.z + p.vz * simDt,
            0.55
          );
          const movedDist = Math.hypot(nextPos.x - p.x, nextPos.z - p.z);
          p.x = nextPos.x;
          p.z = nextPos.z;

          if (p.grounded) {
            p.coyoteTimer = 0.1;
            p.stepDist += movedDist;
            if (p.stepDist > 2.3) {
              p.stepDist = 0;
              soundEngine.playFootstep();
            }
          } else {
            p.coyoteTimer = Math.max(0, p.coyoteTimer - simDt);
          }

          p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - simDt);
          if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
            p.vy = 6.2;
            p.grounded = false;
            p.coyoteTimer = 0;
            p.jumpBufferTimer = 0;
            p.scaleY = 1.15;
          }

          // Variable jump cut when Space released early
          if (!s.input.held.has('Space') && p.vy > 0) {
            p.vy *= 0.55;
          }

          p.vy -= 17.5 * simDt;
          p.y += p.vy * simDt;
          if (p.y <= 0) {
            if (!p.grounded) {
              p.scaleY = 0.84;
            }
            p.y = 0;
            p.vy = 0;
            p.grounded = true;
          }
          p.scaleY = THREE.MathUtils.damp(p.scaleY, 1.0, 12, simDt);
        }

        // Exponential Damping on Recoil, Trauma Shake, Ghost Bars & FOV
        p.recoilPitch = THREE.MathUtils.damp(p.recoilPitch, 0, 10, dt);
        p.recoilYaw = THREE.MathUtils.damp(p.recoilYaw, 0, 10, dt);
        p.trauma = Math.max(0, p.trauma - dt * 2.2);
        p.hurtFlash = Math.max(0, p.hurtFlash - dt * 2.5);
        p.hitmarkerTimer = Math.max(0, p.hitmarkerTimer - dt);
        p.ghostHp = THREE.MathUtils.damp(p.ghostHp, p.hp, 3.5, dt);
        p.ghostArmor = THREE.MathUtils.damp(p.ghostArmor, p.armor, 3.5, dt);

        const targetFov = p.isAds ? activeSpec.adsFov : 72;
        if (Math.abs(camera.fov - targetFov) > 0.1) {
          camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 14, dt);
          camera.updateProjectionMatrix();
        }

        const shake = p.trauma * p.trauma * 0.035;
        const bobY = Math.sin(p.stepDist * 2.7) * 0.038 * (p.grounded ? 1 : 0);
        camera.position.set(p.x, p.y + 1.62 * p.scaleY + bobY, p.z);
        _euler.set(
          p.pitch + p.recoilPitch + (Math.random() - 0.5) * shake,
          p.yaw + p.recoilYaw + (Math.random() - 0.5) * shake,
          (Math.random() - 0.5) * shake * 0.5,
          'YXZ'
        );
        camera.quaternion.setFromEuler(_euler);

        // Smooth Viewmodel Weapon Sway & ADS Offset
        const targetVmX = p.isAds ? 0.0 : 0.22;
        const targetVmY = (p.isAds ? -0.14 : -0.21) + (p.isReloading ? -0.12 : 0) + bobY * 0.5;
        const targetVmZ = -0.38 + p.recoilPitch * 0.9;
        viewmodelHolder.position.x = THREE.MathUtils.damp(viewmodelHolder.position.x, targetVmX, 16, dt);
        viewmodelHolder.position.y = THREE.MathUtils.damp(viewmodelHolder.position.y, targetVmY, 16, dt);
        viewmodelHolder.position.z = THREE.MathUtils.damp(viewmodelHolder.position.z, targetVmZ, 18, dt);

        if (currentMuzzleFlash) {
          muzzleFlashTimer = Math.max(0, muzzleFlashTimer - dt);
          const mat = currentMuzzleFlash.material as THREE.MeshBasicMaterial;
          mat.opacity = muzzleFlashTimer > 0 ? 0.92 : 0;
          currentMuzzleFlash.rotation.z += dt * 25;
        }

        // Update 5v5 AI Operators (with Crowd Attack Token Pool <= 3 concurrent attackers)
        let activeAttackers = 0;
        const maxConcurrentAttackers = 3;
        const timeSec = now * 0.001;

        for (const op of s.operators) {
          // Clear Hit Flash
          if (op.hitFlashTimer > 0) {
            op.hitFlashTimer -= dt;
            if (op.hitFlashTimer <= 0) {
              const flashMats = op.mesh.userData
                .flashMaterials as THREE.MeshStandardMaterial[];
              const baseColors = op.mesh.userData.baseColors as number[];
              flashMats.forEach((m, idx) => m.emissive.setHex(baseColors[idx] || 0));
            }
          }

          // KO Topple Transition (0.38s) before lying flat
          if (op.hp <= 0) {
            if (op.koTimer > 0) {
              op.koTimer = Math.max(0, op.koTimer - dt);
              op.mesh.rotation.x = THREE.MathUtils.damp(
                op.mesh.rotation.x,
                -Math.PI / 2,
                10,
                dt
              );
              op.mesh.position.y = 0.2;
            } else {
              op.mesh.visible = false;
            }
            continue;
          }

          op.mesh.visible = true;
          op.mesh.rotation.x = 0;

          if (simDt <= 0 || !op.isBot) continue;

          // Find closest living enemy target (including Player if on opposite team)
          let targetX = 0;
          let targetZ = 0;
          let targetIsPlayer = false;
          let targetOp: SimOperator | null = null;
          let bestDist = Infinity;

          if (s.playerTeam !== op.team && p.hp > 0) {
            const d = Math.hypot(p.x - op.x, p.z - op.z);
            bestDist = d;
            targetX = p.x;
            targetZ = p.z;
            targetIsPlayer = true;
          }

          for (const other of s.operators) {
            if (other.team === op.team || other.hp <= 0) continue;
            const d = Math.hypot(other.x - op.x, other.z - op.z);
            if (d < bestDist) {
              bestDist = d;
              targetX = other.x;
              targetZ = other.z;
              targetIsPlayer = false;
              targetOp = other;
            }
          }

          const los =
            bestDist < 55 && hasLineOfSight(op.x, op.z, targetX, targetZ, ARENA_WALLS);

          const moveCmd = computeBotArchetypeMove({
            archetype: op.archetype,
            botX: op.x,
            botZ: op.z,
            targetX,
            targetZ,
            hasLos: los,
            timeSec,
            botSeed: op.seed,
          });

          const botSpeed =
            op.archetype === 'rusher' ? 5.6 : op.archetype === 'flanker' ? 5.2 : 4.3;
          const nextBot = resolveArenaCollision(
            op.x + moveCmd.vx * botSpeed * simDt,
            op.z + moveCmd.vz * botSpeed * simDt,
            0.55
          );
          const stepDelta = Math.hypot(nextBot.x - op.x, nextBot.z - op.z);
          op.x = nextBot.x;
          op.z = nextBot.z;
          op.yaw = moveCmd.aimYaw;
          op.stepAccum += stepDelta;

          op.mesh.position.set(op.x, 0, op.z);
          op.mesh.rotation.y = op.yaw;

          // Sync Leg Gait to Distance Traveled
          const leftLeg = op.mesh.userData.leftLeg as THREE.Mesh;
          const rightLeg = op.mesh.userData.rightLeg as THREE.Mesh;
          if (leftLeg && rightLeg) {
            const swing = Math.sin(op.stepAccum * 3.2) * 0.45;
            leftLeg.rotation.x = swing;
            rightLeg.rotation.x = -swing;
          }

          // Visible Attack Windup Telegraph (0.35s) & Token Pool Enforcement
          const telegraphMat = op.mesh.userData
            .telegraphMat as THREE.MeshBasicMaterial;
          op.fireCooldown = Math.max(0, op.fireCooldown - simDt);

          if (los && op.fireCooldown <= 0 && activeAttackers < maxConcurrentAttackers) {
            activeAttackers++;
            if (op.windupTimer <= 0) {
              op.windupTimer = 0.35;
            } else {
              op.windupTimer -= simDt;
              telegraphMat.opacity = 0.9;
              if (op.windupTimer <= 0) {
                // Execute Bot Burst
                telegraphMat.opacity = 0;
                op.fireCooldown = op.archetype === 'sniper' ? 2.1 : 0.95 + Math.random() * 0.5;
                soundEngine.playGunshot(op.weapon, bestDist);

                const hitChance = Math.max(0.16, 0.52 - bestDist * 0.006);
                if (Math.random() < hitChance) {
                  if (targetIsPlayer && p.hp > 0) {
                    const dmg = calculateBallisticDamage({
                      weapon: WEAPONS[op.weapon],
                      isHeadshot: false,
                      distanceMeters: bestDist,
                      currentHp: p.hp,
                      currentArmor: p.armor,
                    });
                    // Fair opening ramp & readable combat
                    const scaledDmg = Math.max(6, Math.round(dmg.hpDamage * 0.42));
                    p.hp = Math.max(0, p.hp - scaledDmg);
                    p.armor = dmg.nextArmor;
                    p.hurtFlash = 0.65;
                    p.trauma = Math.min(1, p.trauma + 0.35);
                    soundEngine.playPlayerHurt();

                    if (p.hp <= 0) {
                      p.deaths++;
                      op.kills++;
                      pushKillfeed({
                        id: `kf_${Date.now()}_${Math.random()}`,
                        killer: op.name,
                        killerTeam: op.team,
                        victim: 'Você',
                        victimTeam: s.playerTeam,
                        weapon: op.weapon,
                        headshot: false,
                      });
                    }
                  } else if (targetOp && targetOp.hp > 0) {
                    targetOp.hp = Math.max(0, targetOp.hp - 36);
                    targetOp.hitFlashTimer = 0.05;
                    if (targetOp.hp <= 0) {
                      targetOp.koTimer = 0.35;
                      targetOp.deaths++;
                      op.kills++;
                      pushKillfeed({
                        id: `kf_${Date.now()}_${Math.random()}`,
                        killer: op.name,
                        killerTeam: op.team,
                        victim: targetOp.name,
                        victimTeam: targetOp.team,
                        weapon: op.weapon,
                        headshot: false,
                      });
                    }
                  }
                }
              }
            }
          } else {
            op.windupTimer = 0;
            telegraphMat.opacity = 0;
          }
        }

        // Update Pooled Particles in-place (Zero GC)
        for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
          const pt = particlePool[i];
          if (pt.active) {
            pt.life -= dt;
            if (pt.life <= 0) {
              pt.active = false;
              _dummyObj.position.set(0, -100, 0);
              _dummyObj.scale.setScalar(0.001);
              _dummyObj.updateMatrix();
              particleMesh.setMatrixAt(i, _dummyObj.matrix);
            } else {
              pt.vy -= 12 * dt;
              pt.x += pt.vx * dt;
              pt.y = Math.max(0.05, pt.y + pt.vy * dt);
              pt.z += pt.vz * dt;
              const sRatio = (pt.life / pt.maxLife) * pt.scale;
              _dummyObj.position.set(pt.x, pt.y, pt.z);
              _dummyObj.scale.setScalar(sRatio);
              _dummyObj.updateMatrix();
              particleMesh.setMatrixAt(i, _dummyObj.matrix);
              _pColor.setHex(pt.colorHex);
              particleMesh.setColorAt(i, _pColor);
            }
          }
        }
        particleMesh.instanceMatrix.needsUpdate = true;
        if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

        // Round Timer & 5v5 Win Condition Check
        if (s.match.roundTransitionTimer > 0) {
          s.match.roundTransitionTimer -= dt;
          if (s.match.roundTransitionTimer <= 0) {
            s.match.roundNumber++;
            resetRoundActors(false);
          }
        } else {
          s.match.roundTimeSec = Math.max(0, s.match.roundTimeSec - simDt);

          let ctAlive = s.playerTeam === 'CT' && p.hp > 0 ? 1 : 0;
          let tAlive = s.playerTeam === 'T' && p.hp > 0 ? 1 : 0;
          for (const op of s.operators) {
            if (op.hp > 0) {
              if (op.team === 'CT') ctAlive++;
              else tAlive++;
            }
          }

          // If player was eliminated while teammates are fighting, fast-sim or resolve round after brief beat
          const evalRes = evaluateRoundState({
            ctAlive,
            tAlive,
            roundTimeRemainingSec: p.hp <= 0 ? 0 : s.match.roundTimeSec,
            ctScore: s.match.ctScore,
            tScore: s.match.tScore,
            roundsToWinMatch: ROUNDS_TO_WIN_MATCH,
          });

          if (p.hp <= 0 && ctAlive > 0 && tAlive > 0) {
            // Player died this round: award round to opposing team after 0.6s defeat beat
            evalRes.roundWinner = s.playerTeam === 'CT' ? 'T' : 'CT';
            evalRes.nextCtScore =
              evalRes.roundWinner === 'CT' ? s.match.ctScore + 1 : s.match.ctScore;
            evalRes.nextTScore =
              evalRes.roundWinner === 'T' ? s.match.tScore + 1 : s.match.tScore;
            if (evalRes.nextCtScore >= ROUNDS_TO_WIN_MATCH) evalRes.matchWinner = 'CT';
            if (evalRes.nextTScore >= ROUNDS_TO_WIN_MATCH) evalRes.matchWinner = 'T';
          }

          if (evalRes.roundWinner) {
            s.match.ctScore = evalRes.nextCtScore;
            s.match.tScore = evalRes.nextTScore;
            const playerWonRound = evalRes.roundWinner === s.playerTeam;
            p.credits = Math.min(16000, p.credits + (playerWonRound ? 3250 : 1900));
            soundEngine.playRoundEnd(playerWonRound);

            if (evalRes.matchWinner) {
              const regObj =
                SERVER_REGIONS.find((r) => r.id === s.region) || SERVER_REGIONS[0];
              setEndSnapshot({
                victory: evalRes.matchWinner === s.playerTeam,
                winnerTeam: evalRes.matchWinner,
                ctScore: s.match.ctScore,
                tScore: s.match.tScore,
                kills: p.kills,
                deaths: p.deaths,
                headshots: p.headshots,
                shotsFired: p.shotsFired,
                shotsHit: p.shotsHit,
                pingMs: s.pingMs,
                regionName: regObj.name,
              });
              setGameState('gameover');
            } else {
              s.match.roundBanner =
                evalRes.roundWinner === 'CT'
                  ? 'Round Vencido pela Força Tática CT!'
                  : 'Round Vencido pelo Sindicato T!';
              s.match.roundTransitionTimer = 2.4;
            }
          }
        }
      }

      // Throttled React HUD Sync (<= 10Hz) + WebSocket State Broadcast
      hudSyncTimer += dt;
      if (hudSyncTimer >= 0.1) {
        hudSyncTimer = 0;
        if (
          s.state === 'playing' &&
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({
              type: 'player:state',
              x: p.x,
              y: p.y,
              z: p.z,
              yaw: p.yaw,
              hp: p.hp,
              armor: p.armor,
              weapon: getActiveWeaponId(),
            })
          );
        }
        const curMag =
          s.activeSlot === 'primary' ? p.ammo.primaryMag : p.ammo.secondaryMag;
        const curRes =
          s.activeSlot === 'primary' ? p.ammo.primaryRes : p.ammo.secondaryRes;

        setHudState({
          hp: p.hp,
          ghostHp: p.ghostHp,
          armor: p.armor,
          ghostArmor: p.ghostArmor,
          credits: p.credits,
          magAmmo: curMag,
          reserveAmmo: curRes,
          isReloading: p.isReloading,
          isAds: p.isAds,
          ctScore: s.match.ctScore,
          tScore: s.match.tScore,
          roundNumber: s.match.roundNumber,
          roundTimeSec: s.match.roundTimeSec,
          roundBanner: s.match.roundBanner,
          pingMs: s.pingMs,
          wsConnected: s.wsConnected,
          hitmarkerState: p.hitmarkerTimer > 0 ? p.hitmarkerType : 'none',
          hurtFlashAlpha: p.hurtFlash,
          playerYaw: p.yaw,
        });

        const radarList: RadarActor[] = [
          {
            id: 'self',
            team: s.playerTeam,
            x: p.x,
            z: p.z,
            hp: p.hp,
            maxHp: 100,
            isSelf: true,
          },
          ...s.operators.map((op) => ({
            id: op.id,
            team: op.team,
            x: op.x,
            z: op.z,
            hp: op.hp,
            maxHp: op.maxHp,
          })),
        ];
        setRadarActors(radarList);

        const rows: OperatorStatRow[] = [
          {
            id: 'self',
            name: 'Você (Operador)',
            team: s.playerTeam,
            roleLabel: 'Capitão Tático',
            alive: p.hp > 0,
            kills: p.kills,
            deaths: p.deaths,
            pingMs: s.pingMs,
            isSelf: true,
          },
          ...s.operators.map((op) => ({
            id: op.id,
            name: op.name,
            team: op.team,
            roleLabel: op.roleLabel,
            alive: op.hp > 0,
            kills: op.kills,
            deaths: op.deaths,
            pingMs: op.pingMs,
          })),
        ];
        setScoreboardRows(rows);
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('touchstart', onFirstTouch);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [getActiveWeaponId, handleSelectSlot, handleStartMatch, handleTriggerReload]);

  const currentRegionObj =
    SERVER_REGIONS.find((r) => r.id === selectedRegion) || SERVER_REGIONS[0];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090b10]">
      {/* Isolated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        data-testid="tactical-webgl-viewport"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* STATE 1: TITLE SCREEN */}
      {gameState === 'title' && (
        <TitleScreenModal
          selectedRegion={selectedRegion}
          onSelectRegion={(id) => {
            setSelectedRegion(id);
            simRef.current.region = id;
            const reg = SERVER_REGIONS.find((r) => r.id === id);
            if (reg) simRef.current.pingMs = reg.basePingMs;
          }}
          selectedTeam={selectedTeam}
          onSelectTeam={(t) => {
            setSelectedTeam(t);
            simRef.current.playerTeam = t;
          }}
          selectedPrimary={primaryWeapon}
          onSelectPrimary={(w) => {
            setPrimaryWeapon(w);
            simRef.current.primaryWeapon = w;
          }}
          livePingMs={hudState.pingMs}
          wsConnected={hudState.wsConnected}
          onStartMatch={handleStartMatch}
        />
      )}

      {/* STATE 2: PLAYING HUD */}
      {gameState === 'playing' && (
        <TacticalHud
          playerTeam={selectedTeam}
          hp={hudState.hp}
          ghostHp={hudState.ghostHp}
          armor={hudState.armor}
          ghostArmor={hudState.ghostArmor}
          credits={hudState.credits}
          activeSlot={activeSlot}
          primaryWeapon={primaryWeapon}
          magAmmo={hudState.magAmmo}
          reserveAmmo={hudState.reserveAmmo}
          isReloading={hudState.isReloading}
          isAds={hudState.isAds}
          ctScore={hudState.ctScore}
          tScore={hudState.tScore}
          roundNumber={hudState.roundNumber}
          roundTimeSec={hudState.roundTimeSec}
          roundBanner={hudState.roundBanner}
          pingMs={hudState.pingMs}
          regionName={currentRegionObj.name}
          muted={muted}
          buyOpen={buyOpen}
          showTouchControls={showTouchControls}
          hitmarkerState={hudState.hitmarkerState}
          hurtFlashAlpha={hudState.hurtFlashAlpha}
          killfeed={killfeed}
          radarActors={radarActors}
          playerYaw={hudState.playerYaw}
          onSelectSlot={handleSelectSlot}
          onBuyWeapon={handleBuyWeapon}
          onRefillArmor={handleRefillArmor}
          onReload={handleTriggerReload}
          onToggleAds={() => {
            simRef.current.player.isAds = !simRef.current.player.isAds;
          }}
          onJump={() => {
            simRef.current.player.jumpBufferTimer = 0.12;
          }}
          onToggleBuy={() => {
            simRef.current.buyOpen = !simRef.current.buyOpen;
            setBuyOpen(simRef.current.buyOpen);
          }}
          onToggleTouch={() => setShowTouchControls((prev) => !prev)}
          onToggleMute={() => setMuted(soundEngine.toggleMute())}
          onPause={() => setGameState('paused')}
          onRestart={handleStartMatch}
          onTouchMoveInput={(vx, vz) => {
            simRef.current.input.touchMoveX = vx;
            simRef.current.input.touchMoveZ = vz;
          }}
          onTouchLookDelta={(dx, dy) => {
            const p = simRef.current.player;
            const sens = p.isAds ? 0.0022 : 0.004;
            p.yaw -= dx * sens;
            p.pitch = THREE.MathUtils.clamp(p.pitch - dy * sens, -1.25, 1.25);
          }}
          onTouchFireChange={(firing) => {
            simRef.current.input.touchFiring = firing;
          }}
        />
      )}

      {/* STATE 3: PAUSE & 5V5 SCOREBOARD MODAL */}
      {gameState === 'paused' && (
        <PauseScoreboardModal
          operators={scoreboardRows}
          ctScore={hudState.ctScore}
          tScore={hudState.tScore}
          regionName={currentRegionObj.name}
          pingMs={hudState.pingMs}
          onResume={() => setGameState('playing')}
          onRestart={handleStartMatch}
          onReturnTitle={() => setGameState('title')}
        />
      )}

      {/* STATE 4: VICTORY / GAME OVER MODAL */}
      {gameState === 'gameover' && endSnapshot && (
        <GameOverModal
          snapshot={endSnapshot}
          onPlayAgain={handleStartMatch}
          onReturnTitle={() => setGameState('title')}
        />
      )}
    </main>
  );
}
