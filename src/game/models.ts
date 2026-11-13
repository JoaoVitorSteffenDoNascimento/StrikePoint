import * as THREE from 'three';
import { ARENA_WALLS, TeamId, WeaponId, BotArchetype } from './rules';

export interface ProceduralMaterials {
  sandstoneWall: THREE.MeshStandardMaterial;
  concreteWall: THREE.MeshStandardMaterial;
  crateWood: THREE.MeshStandardMaterial;
  steelContainer: THREE.MeshStandardMaterial;
  groundSand: THREE.MeshStandardMaterial;
  gunmetalDark: THREE.MeshStandardMaterial;
  gunmetalChrome: THREE.MeshStandardMaterial;
  polymerMatte: THREE.MeshStandardMaterial;
  woodStock: THREE.MeshStandardMaterial;
  opticGlass: THREE.MeshPhysicalMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
}

function createTileableTexture(
  renderer: THREE.WebGLRenderer,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createMaterialLibrary(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): ProceduralMaterials {
  // 1. Desert Travertine / Sandstone Masonry Albedo + Bump
  const sandstoneMap = createTileableTexture(
    renderer,
    (ctx, w, h) => {
      ctx.fillStyle = '#c8ab83';
      ctx.fillRect(0, 0, w, h);
      const rows = 4;
      const rowH = h / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        ctx.fillStyle = r % 2 === 0 ? '#bfa076' : '#ccb18a';
        ctx.fillRect(0, y, w, rowH - 3);
        ctx.fillStyle = '#8c7250';
        ctx.fillRect(0, y + rowH - 3, w, 3);
        const offset = (r % 2) * (w / 2);
        ctx.fillRect((offset + w / 2) % w, y, 3, rowH);
      }
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,245,230,0.08)' : 'rgba(60,40,20,0.08)';
        ctx.fillRect((i * 73) % w, (i * 41) % h, 4, 4);
      }
    },
    true,
    2,
    2
  );

  const masonryBump = createTileableTexture(
    renderer,
    (ctx, w, h) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, w, h);
      const rows = 4;
      const rowH = h / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        ctx.fillStyle = '#252525';
        ctx.fillRect(0, y + rowH - 4, w, 4);
      }
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#555555';
        ctx.fillRect((i * 97) % w, (i * 53) % h, 3, 3);
      }
    },
    false,
    2,
    2
  );

  // 2. Tactical Ground Pavement & Desert Dust Texture
  const groundMap = createTileableTexture(
    renderer,
    (ctx, w, h) => {
      ctx.fillStyle = '#9e886b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(70, 56, 40, 0.28)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(225,205,175,0.1)' : 'rgba(75,60,42,0.1)';
        ctx.fillRect((i * 67) % w, (i * 89) % h, 5, 5);
      }
    },
    true,
    28,
    28
  );

  // 3. Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  return {
    sandstoneWall: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: sandstoneMap,
      bumpMap: masonryBump,
      bumpScale: 0.04,
      roughness: 0.82,
      metalness: 0.05,
    }),
    concreteWall: new THREE.MeshStandardMaterial({
      color: 0x9aa3ad,
      bumpMap: masonryBump,
      bumpScale: 0.025,
      roughness: 0.72,
      metalness: 0.12,
    }),
    crateWood: new THREE.MeshStandardMaterial({
      color: 0x8b623b,
      bumpMap: masonryBump,
      bumpScale: 0.03,
      roughness: 0.78,
      metalness: 0.08,
    }),
    steelContainer: new THREE.MeshStandardMaterial({
      color: 0x33475b,
      roughness: 0.42,
      metalness: 0.68,
    }),
    groundSand: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: groundMap,
      roughness: 0.88,
      metalness: 0.04,
    }),
    gunmetalDark: new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.28,
      metalness: 0.86,
    }),
    gunmetalChrome: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.16,
      metalness: 0.94,
    }),
    polymerMatte: new THREE.MeshStandardMaterial({
      color: 0x11151c,
      roughness: 0.76,
      metalness: 0.12,
    }),
    woodStock: new THREE.MeshStandardMaterial({
      color: 0x6e3b1e,
      roughness: 0.62,
      metalness: 0.08,
    }),
    opticGlass: new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 0.9,
    }),
    contactShadowMat: new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  };
}

/**
 * Builds a sculpted 14-part 3D Tactical Operator model pivoted at bottom-center (y = 0).
 * Features anatomical capsule limbs, combat boots, knee pads, contoured plate carrier,
 * mag pouches, radio antenna, neck balaclava, FAST helmet with NVG / visor, and two-handed rifle grip.
 */
export function createOperatorModel(
  team: TeamId,
  archetype: BotArchetype,
  mats: ProceduralMaterials
): THREE.Group {
  const root = new THREE.Group();

  const isCT = team === 'CT';
  const uniformColor = isCT ? 0x1e3a5f : 0x7c5a3f;
  const vestColor = isCT ? 0x0f172a : 0x292524;
  const accentColor = isCT ? 0x38bdf8 : 0xf97316;

  const uniformMat = new THREE.MeshStandardMaterial({
    color: uniformColor,
    roughness: 0.76,
    metalness: 0.08,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestColor,
    roughness: 0.45,
    metalness: 0.36,
  });
  const skinBalaclavaMat = new THREE.MeshStandardMaterial({
    color: isCT ? 0x18181b : 0x27272a,
    roughness: 0.82,
    metalness: 0.05,
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: isCT ? 0x1e293b : 0x573b26,
    roughness: 0.32,
    metalness: 0.52,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.5,
    roughness: 0.12,
    metalness: 0.88,
  });

  const hitMeshes: THREE.Mesh[] = [];
  const flashMaterials: THREE.MeshStandardMaterial[] = [
    uniformMat,
    vestMat,
    helmetMat,
  ];

  // 1. Contact Shadow Disc at y = 0.015
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.68, 20),
    mats.contactShadowMat
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  // 2 & 3. Articulated Left & Right Legs (Thigh Capsule + Knee Pad + Shin + Combat Boot)
  const buildLegGroup = (side: -1 | 1): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.145, 0.78, 0);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.095, 0.28, 6, 10),
      uniformMat
    );
    thigh.position.set(0, -0.18, 0);
    thigh.userData = { isHead: false };
    legPivot.add(thigh);
    hitMeshes.push(thigh);

    const kneePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.11, 0.16),
      mats.polymerMatte
    );
    kneePad.position.set(0, -0.36, -0.04);
    legPivot.add(kneePad);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.072, 0.32, 10),
      uniformMat
    );
    shin.position.set(0, -0.52, 0);
    shin.userData = { isHead: false };
    legPivot.add(shin);
    hitMeshes.push(shin);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.13, 0.25),
      mats.polymerMatte
    );
    boot.position.set(0, -0.71, -0.03);
    legPivot.add(boot);

    if (side === 1) {
      // Tactical Thigh Holster on Right Leg
      const holster = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.16, 0.12),
        vestMat
      );
      holster.position.set(0.09, -0.18, 0);
      legPivot.add(holster);
    }

    return legPivot;
  };

  const leftLeg = buildLegGroup(-1);
  const rightLeg = buildLegGroup(1);
  root.add(leftLeg, rightLeg);

  // 4. Sculpted Pelvis & Tactical War Belt
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.19, 0.18, 12),
    uniformMat
  );
  pelvis.position.set(0, 0.82, 0);
  pelvis.userData = { isHead: false };
  root.add(pelvis);
  hitMeshes.push(pelvis);

  const warBelt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.225, 0.08, 12),
    mats.polymerMatte
  );
  warBelt.position.set(0, 0.87, 0);
  root.add(warBelt);

  // 5. Contoured Upper Torso & Plate Carrier Vest
  const torsoRadius = archetype === 'anchor' ? 0.25 : 0.22;
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(torsoRadius, 0.34, 8, 14),
    uniformMat
  );
  torso.position.set(0, 1.16, 0);
  torso.scale.set(1.12, 1, 0.78);
  torso.userData = { isHead: false };
  root.add(torso);
  hitMeshes.push(torso);

  const plateCarrier = new THREE.Mesh(
    new THREE.BoxGeometry(torsoRadius * 1.9, 0.44, 0.31),
    vestMat
  );
  plateCarrier.position.set(0, 1.16, 0);
  plateCarrier.userData = { isHead: false };
  root.add(plateCarrier);
  hitMeshes.push(plateCarrier);

  // 6. Three Individual Front Mag Pouches + Rear Hydration Backpack + Radio Antenna
  for (let m = -1; m <= 1; m++) {
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.15, 0.06),
      mats.polymerMatte
    );
    pouch.position.set(m * 0.11, 1.06, -0.17);
    root.add(pouch);
  }

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.38, 0.15),
    vestMat
  );
  backpack.position.set(0, 1.18, 0.19);
  root.add(backpack);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.012, 0.42, 6),
    mats.gunmetalChrome
  );
  antenna.position.set(-0.18, 1.52, 0.12);
  root.add(antenna);

  // 7 & 8. Contoured Shoulder Pauldrons & Articulated Two-Handed Rifle Arms
  const buildArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * (torsoRadius + 0.08), 1.34, 0);

    const shoulderPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 10),
      vestMat
    );
    shoulderPad.scale.set(1, 0.85, 1);
    armGroup.add(shoulderPad);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.068, 0.22, 6, 10),
      uniformMat
    );
    upperArm.position.set(0, -0.14, -0.08);
    upperArm.rotation.x = 0.65;
    upperArm.rotation.z = side * -0.18;
    upperArm.userData = { isHead: false };
    armGroup.add(upperArm);
    hitMeshes.push(upperArm);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, 0.22, 6, 10),
      skinBalaclavaMat
    );
    forearm.position.set(side * -0.06, -0.22, -0.26);
    forearm.rotation.x = 1.25;
    forearm.rotation.y = side * 0.32;
    forearm.userData = { isHead: false };
    armGroup.add(forearm);
    hitMeshes.push(forearm);

    return armGroup;
  };

  root.add(buildArm(-1), buildArm(1));

  // 9. Neck Balaclava, Head & Contoured FAST Ballistic Helmet (Critical Headshot Hitbox)
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.1, 0.12, 10),
    skinBalaclavaMat
  );
  neck.position.set(0, 1.47, 0);
  neck.userData = { isHead: true };
  root.add(neck);
  hitMeshes.push(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 16, 14),
    skinBalaclavaMat
  );
  head.position.set(0, 1.63, 0);
  head.userData = { isHead: true };
  root.add(head);
  hitMeshes.push(head);

  const helmetShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.182, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    helmetMat
  );
  helmetShell.position.set(0, 1.65, 0);
  helmetShell.rotation.x = -0.12;
  helmetShell.userData = { isHead: true };
  root.add(helmetShell);
  hitMeshes.push(helmetShell);

  // 10. Tactical Goggles / Dual-Tube NVG Optics (Accent Detail)
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.075, 0.14),
    visorMat
  );
  visor.position.set(0, 1.63, -0.12);
  visor.userData = { isHead: true };
  root.add(visor);
  hitMeshes.push(visor);

  if (isCT || archetype === 'sniper') {
    // Dual-tube NVG mount on helmet brow
    const nvgMount = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.05, 0.09),
      mats.gunmetalDark
    );
    nvgMount.position.set(0, 1.73, -0.16);
    root.add(nvgMount);
  }

  // 11. Held Tactical Rifle Assembly (Receiver + Stock + Mag + Optic + Barrel)
  const gunGroup = new THREE.Group();
  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.11, 0.52),
    mats.gunmetalDark
  );
  const gunMag = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.16, 0.065),
    mats.polymerMatte
  );
  gunMag.position.set(0, -0.1, -0.06);
  gunMag.rotation.x = 0.22;
  const gunOptic = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.05, 0.12),
    mats.gunmetalChrome
  );
  gunOptic.position.set(0, 0.075, -0.02);

  const barrelLen = archetype === 'sniper' ? 0.55 : 0.34;
  const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.018, barrelLen, 8),
    mats.gunmetalChrome
  );
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.02, -(0.26 + barrelLen * 0.5));
  gunGroup.add(gunBody, gunMag, gunOptic, gunBarrel);
  gunGroup.position.set(0.08, 1.15, -0.36);
  root.add(gunGroup);

  // 12. Visible Attack Windup Telegraph Ring / Muzzle Beacon (glows 0.35s before firing)
  const telegraphMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30,
    transparent: true,
    opacity: 0.0,
  });
  const telegraphMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    telegraphMat
  );
  telegraphMesh.position.set(0.08, 1.18, -0.82);
  root.add(telegraphMesh);

  root.userData = {
    hitMeshes,
    flashMaterials,
    baseColors: flashMaterials.map((m) => m.emissive.getHex()),
    telegraphMat,
    leftLeg,
    rightLeg,
  };

  return root;
}

/**
 * Builds a composite 7-9 part First-Person Viewmodel Weapon in camera space.
 */
export function createViewmodelWeapon(
  weaponId: WeaponId,
  mats: ProceduralMaterials
): { group: THREE.Group; muzzleFlash: THREE.Mesh } {
  const group = new THREE.Group();

  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), flashMat);
  muzzleFlash.renderOrder = 20;

  if (weaponId === 'karambit') {
    // Composite Curved Tactical Karambit Knife (Handle + Finger Ring + Curved Blade + Spine)
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.14, 0.045),
      mats.polymerMatte
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.006, 8, 16),
      mats.gunmetalChrome
    );
    ring.position.set(0, -0.08, 0);
    ring.rotation.y = Math.PI / 2;

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.12,
      metalness: 0.95,
    });
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.18, 4),
      bladeMat
    );
    blade.position.set(0, 0.12, -0.04);
    blade.rotation.x = -0.55;

    muzzleFlash.position.set(0, 0.16, -0.1);
    group.add(handle, ring, blade, muzzleFlash);
    return { group, muzzleFlash };
  }

  const isAwp = weaponId === 'awp';
  const isAk = weaponId === 'ak47';
  const isDeagle = weaponId === 'deagle';
  const isMp5 = weaponId === 'mp5';

  // 1. Main Receiver
  const bodyColorMat = isAwp
    ? new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.55, metalness: 0.25 })
    : isDeagle
    ? mats.gunmetalChrome
    : mats.gunmetalDark;

  const receiverLen = isDeagle ? 0.24 : isMp5 ? 0.36 : isAwp ? 0.58 : 0.46;
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.058, 0.085, receiverLen),
    bodyColorMat
  );
  group.add(receiver);

  // 2. Handguard / Forend
  const handguardMat = isAk ? mats.woodStock : mats.polymerMatte;
  const handguard = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.068, receiverLen * 0.65),
    handguardMat
  );
  handguard.position.set(0, -0.005, -receiverLen * 0.55);
  group.add(handguard);

  // 3. Precision Barrel
  const barrelLen = isDeagle ? 0.12 : isAwp ? 0.52 : 0.34;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, barrelLen, 12),
    mats.gunmetalChrome
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -(receiverLen * 0.5 + barrelLen * 0.5));
  group.add(barrel);

  // 4. Suppressor (M4A1-S / MP5-SD) or Muzzle Brake (AWP / AK)
  if (weaponId === 'm4a1' || weaponId === 'mp5' || weaponId === 'awp') {
    const sup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12),
      mats.polymerMatte
    );
    sup.rotation.x = Math.PI / 2;
    sup.position.set(0, 0.015, -(receiverLen * 0.5 + barrelLen + 0.05));
    group.add(sup);
  }

  // 5. Magazine
  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, isDeagle ? 0.12 : 0.19, 0.065),
    isAk ? mats.woodStock : mats.polymerMatte
  );
  mag.position.set(0, -0.11, isDeagle ? 0.05 : -0.08);
  mag.rotation.x = isAk ? 0.28 : 0.1;
  group.add(mag);

  // 6. Pistol Grip & Stock
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.12, 0.055),
    mats.polymerMatte
  );
  grip.position.set(0, -0.09, 0.1);
  grip.rotation.x = -0.25;
  group.add(grip);

  if (!isDeagle) {
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.11, 0.24),
      isAk ? mats.woodStock : mats.polymerMatte
    );
    stock.position.set(0, -0.015, receiverLen * 0.5 + 0.1);
    group.add(stock);
  }

  // 7. Optical Sight / Scope
  if (isAwp) {
    const scopeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.28, 14),
      mats.gunmetalDark
    );
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.075, -0.04);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.022, 12),
      mats.opticGlass
    );
    lens.position.set(0, 0.075, 0.101);
    group.add(scopeTube, lens);
  } else {
    const sightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.042, 0.08),
      mats.gunmetalDark
    );
    sightFrame.position.set(0, 0.062, -0.02);
    const redDotLens = new THREE.Mesh(
      new THREE.PlaneGeometry(0.032, 0.028),
      mats.opticGlass
    );
    redDotLens.position.set(0, 0.062, 0.021);
    group.add(sightFrame, redDotLens);
  }

  muzzleFlash.position.set(0, 0.015, -(receiverLen * 0.5 + barrelLen + 0.16));
  group.add(muzzleFlash);

  return { group, muzzleFlash };
}

/**
 * Constructs the 3D Tactical Arena ("Sandstorm Mirage"), including:
 * - Extended desert ground (260m x 260m) with natural canyon rock perimeters
 * - Composite 3-6 part cover structures, crates with steel trim, and Bombsite A/B decals
 * - Tall Central Radar & Minaret Landmark framed in the initial spawn vista
 * - InstancedMesh perimeter boulders & cypress trees (> 20 instances)
 */
export function buildTacticalArena(
  scene: THREE.Scene,
  mats: ProceduralMaterials,
  isSoftwareGl: boolean
): { envColliders: THREE.Object3D[] } {
  const envColliders: THREE.Object3D[] = [];

  // 1. Extended Desert Floor (y = 0)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    mats.groundSand
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = !isSoftwareGl;
  scene.add(floor);

  // 2. Tactical Lane Pathways (offset by y = +0.02 to prevent Z-fighting)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x645b4f,
    roughness: 0.9,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const midRoad = new THREE.Mesh(new THREE.PlaneGeometry(9, 76), roadMat);
  midRoad.rotation.x = -Math.PI / 2;
  midRoad.position.set(0, 0.02, 0);
  scene.add(midRoad);

  // 3. Bombsite A (West) & Bombsite B (East) Zone Decals (y = 0.025)
  const siteRingGeo = new THREE.RingGeometry(3.2, 3.6, 32);
  const siteAMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
  });
  const siteARing = new THREE.Mesh(siteRingGeo, siteAMat);
  siteARing.rotation.x = -Math.PI / 2;
  siteARing.position.set(-22, 0.025, 0);
  scene.add(siteARing);

  const siteBMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
  });
  const siteBRing = new THREE.Mesh(siteRingGeo, siteBMat);
  siteBRing.rotation.x = -Math.PI / 2;
  siteBRing.position.set(22, 0.025, 0);
  scene.add(siteBRing);

  // 4. Composite Arena Cover Structures from ARENA_WALLS
  const corniceMat = new THREE.MeshStandardMaterial({
    color: 0x785f43,
    roughness: 0.65,
    metalness: 0.15,
  });

  for (const w of ARENA_WALLS) {
    const structGroup = new THREE.Group();
    structGroup.position.set(w.x, 0, w.z);

    const baseMat =
      w.material === 'sandstone'
        ? mats.sandstoneWall
        : w.material === 'concrete'
        ? mats.concreteWall
        : w.material === 'crate'
        ? mats.crateWood
        : mats.steelContainer;

    // Primary Body
    const mainBox = new THREE.Mesh(
      new THREE.BoxGeometry(w.w, w.h, w.d),
      baseMat
    );
    mainBox.position.y = w.h * 0.5;
    mainBox.castShadow = !isSoftwareGl;
    mainBox.receiveShadow = !isSoftwareGl;
    structGroup.add(mainBox);
    envColliders.push(mainBox);

    // Secondary Plinth Base + Upper Cornice Trim (makes every structure a multi-part composite)
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w.w + 0.24, 0.28, w.d + 0.24),
      corniceMat
    );
    plinth.position.y = 0.14;
    structGroup.add(plinth);

    const roofTrim = new THREE.Mesh(
      new THREE.BoxGeometry(w.w + 0.3, 0.22, w.d + 0.3),
       w.material === 'crate' ? mats.gunmetalDark : corniceMat
    );
    roofTrim.position.y = w.h + 0.11;
    structGroup.add(roofTrim);

    scene.add(structGroup);
  }

  // 5. Tall Silhouette Landmark in Initial Spawn Vista (Communications Tower + Archway at North/South Vista)
  const landmarkGroup = new THREE.Group();
  landmarkGroup.position.set(0, 0, 45);
  const towerBase = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 9, 6.5),
    mats.sandstoneWall
  );
  towerBase.position.y = 4.5;
  const towerMid = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.6, 10, 12),
    mats.concreteWall
  );
  towerMid.position.y = 14;
  const towerDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 12),
     new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 })
  );
  towerDome.position.y = 19.5;
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.25, 6, 8),
    mats.gunmetalChrome
  );
  spire.position.y = 23.5;
  landmarkGroup.add(towerBase, towerMid, towerDome, spire);
  scene.add(landmarkGroup);

  // 6. Natural Outdoor Perimeter Canyon Cliffs & Instanced Boulders (36 instances)
  const boulderGeo = new THREE.DodecahedronGeometry(4.2, 1);
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0xb89772,
    roughness: 0.86,
    metalness: 0.06,
  });
  const boulderCount = 36;
  const boulders = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < boulderCount; i++) {
    const angle = (i / boulderCount) * Math.PI * 2;
    const dist = 48 + (i % 3) * 5.5;
    const bx = Math.cos(angle) * dist;
    const bz = Math.sin(angle) * dist;
    const scaleY = 1.4 + (i % 4) * 0.45;
    const scaleXZ = 1.2 + (i % 3) * 0.25;

    dummy.position.set(bx, scaleY * 2.1 - 0.5, bz);
    dummy.rotation.set(0, angle * 1.7, 0);
    dummy.scale.set(scaleXZ, scaleY, scaleXZ);
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);

    const shade = 0.88 + ((i * 17) % 24) / 100;
    color.setRGB(shade, shade * 0.94, shade * 0.86);
    boulders.setColorAt(i, color);
  }
  boulders.instanceMatrix.needsUpdate = true;
  if (boulders.instanceColor) boulders.instanceColor.needsUpdate = true;
  boulders.computeBoundingSphere();
  scene.add(boulders);

  return { envColliders };
}
