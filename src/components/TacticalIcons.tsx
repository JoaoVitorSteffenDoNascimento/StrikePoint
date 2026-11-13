import React from 'react';
import { WeaponId } from '../game/rules';

export function TitleEmblemSvg({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Outer Dark Silhouette Shield */}
      <path
        d="M32 4L8 14V30C8 46.5 18.2 56.8 32 60C45.8 56.8 56 46.5 56 30V14L32 4Z"
        fill="#0B0F17"
        stroke="#F59E0B"
        strokeWidth="2.5"
      />
      {/* Interior Structural Detail */}
      <path
        d="M32 9L13 17.2V29.8C13 43.2 21.1 51.9 32 54.8C42.9 51.9 51 43.2 51 29.8V17.2L32 9Z"
        fill="#161F30"
        stroke="#38BDF8"
        strokeWidth="1.2"
        strokeOpacity="0.65"
      />
      {/* Tactical Crosshair + Star Centerpiece */}
      <circle cx="32" cy="31" r="11" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="5 3" />
      <path
        d="M32 15V23M32 39V47M16 31H24M40 31H48"
        stroke="#F8FAFC"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <polygon points="32,25 34.2,29.2 38.8,29.8 35.4,33 36.2,37.5 32,35.2 27.8,37.5 28.6,33 25.2,29.8 29.8,29.2" fill="#F59E0B" />
    </svg>
  );
}

export function WeaponSilhouetteSvg({
  weaponId,
  className = 'w-24 h-8',
}: {
  weaponId: WeaponId;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 40" fill="none" className={className} aria-hidden="true">
      {weaponId === 'm4a1' && (
        <g>
          {/* Stock, Receiver, Handguard, Suppressor, Mag, Optic */}
          <path
            d="M8 16H28L32 13H74V16H94V14H114V19H94V18H74V22H58L61 34H51L49 22H36L32 29H25L28 21H8V16Z"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeWidth="1.6"
          />
          <rect x="44" y="8" width="12" height="5" rx="1" fill="#38BDF8" />
          <line x1="36" y1="16" x2="72" y2="16" stroke="#F8FAFC" strokeWidth="1.2" />
        </g>
      )}
      {weaponId === 'ak47' && (
        <g>
          <path
            d="M6 18L26 15H72L86 16H108V19H84L72 22H58L65 35H55L49 22H34L29 30H22L26 21L6 24V18Z"
            fill="#1E1B18"
            stroke="#F59E0B"
            strokeWidth="1.6"
          />
          <path d="M6 18L24 16V21L6 24V18Z" fill="#9A3412" />
          <line x1="32" y1="17" x2="68" y2="17" stroke="#FDE68A" strokeWidth="1.2" />
        </g>
      )}
      {weaponId === 'awp' && (
        <g>
          <path
            d="M4 17H28L34 15H82V16H118V19H82V22H60V28H48V22H32L27 29H19L22 22H4V17Z"
            fill="#142615"
            stroke="#A3E635"
            strokeWidth="1.6"
          />
          {/* Sniper Scope */}
          <path d="M36 9H70L74 7V13L70 11H36L33 13V7L36 9Z" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.4" />
        </g>
      )}
      {weaponId === 'mp5' && (
        <g>
          <path
            d="M16 16H34L38 13H72V15H96V19H72V22H56L59 34H51L48 22H36L32 29H25L28 20H16V16Z"
            fill="#0F172A"
            stroke="#22D3EE"
            strokeWidth="1.6"
          />
          <rect x="45" y="9" width="10" height="4" fill="#22D3EE" />
        </g>
      )}
      {weaponId === 'deagle' && (
        <g>
          <path
            d="M34 12H84L86 19H62L55 33H43L49 20H34V12Z"
            fill="#1E293B"
            stroke="#E2E8F0"
            strokeWidth="1.8"
          />
          <line x1="40" y1="15" x2="80" y2="15" stroke="#38BDF8" strokeWidth="1.5" />
        </g>
      )}
      {weaponId === 'karambit' && (
        <g>
          <circle cx="38" cy="24" r="6" stroke="#94A3B8" strokeWidth="2.2" fill="#0F172A" />
          <path d="M43 21L60 15L64 21L46 26Z" fill="#334155" stroke="#E2E8F0" strokeWidth="1.4" />
          <path d="M60 15C74 10 86 16 92 28C81 22 71 20 64 21Z" fill="#38BDF8" stroke="#F8FAFC" strokeWidth="1.4" />
        </g>
      )}
    </svg>
  );
}

export function HealthCrossSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#0B0F17" stroke="#10B981" strokeWidth="1.8" />
      <path d="M10 6H14V10H18V14H14V18H10V14H6V10H10V6Z" fill="#10B981" />
    </svg>
  );
}

export function ArmorShieldSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2L4 5.5V11.5C4 16.8 7.4 20.9 12 22C16.6 20.9 20 16.8 20 11.5V5.5L12 2Z"
        fill="#0B0F17"
        stroke="#38BDF8"
        strokeWidth="1.8"
      />
      <path
        d="M12 5L7 7.2V11.2C7 14.8 9.1 17.7 12 18.6C14.9 17.7 17 14.8 17 11.2V7.2L12 5Z"
        fill="#38BDF8"
      />
    </svg>
  );
}

export function HeadshotIconSvg({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="11" r="7" fill="#EF4444" stroke="#090B10" strokeWidth="1.5" />
      <circle cx="9.5" cy="10" r="1.5" fill="#090B10" />
      <circle cx="14.5" cy="10" r="1.5" fill="#090B10" />
      <path d="M9 18H15V21H9V18Z" fill="#EF4444" />
      <path d="M12 2V6M12 16V20M2 11H6M18 11H22" stroke="#F8FAFC" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
