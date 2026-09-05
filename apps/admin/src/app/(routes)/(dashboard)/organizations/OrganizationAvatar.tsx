import { IoBusinessOutline, IoCutOutline, IoHomeOutline, IoMedkitOutline } from 'react-icons/io5';

import type { BusinessType } from '@/app/features/organizations/types';

type Visual = {
  Icon: typeof IoBusinessOutline;
  background: string;
  color: string;
};

/**
 * Warm-bone identity chip per business type. Every colour is a theme-aware
 * token, so the chip follows light and dark without a second definition.
 */
const TYPE_VISUALS: Record<BusinessType, Visual> = {
  HOSPITAL: {
    Icon: IoMedkitOutline,
    background: 'var(--blue-soft)',
    color: 'var(--blue-text)',
  },
  GROOMER: {
    Icon: IoCutOutline,
    background: 'var(--avatar-violet-bg)',
    color: 'var(--avatar-violet-ink)',
  },
  BOARDER: {
    Icon: IoHomeOutline,
    background: 'var(--avatar-amber-bg)',
    color: 'var(--avatar-amber-ink)',
  },
  BREEDER: {
    Icon: IoBusinessOutline,
    background: 'var(--avatar-green-bg)',
    color: 'var(--avatar-green-ink)',
  },
};

const FALLBACK: Visual = {
  Icon: IoBusinessOutline,
  background: 'var(--screen-2)',
  color: 'var(--ink-faint)',
};

export function organizationVisual(type: BusinessType): Visual {
  return TYPE_VISUALS[type] ?? FALLBACK;
}

export function OrganizationAvatar({
  type,
  size = 36,
}: Readonly<{ type: BusinessType; size?: number }>) {
  const { Icon, background, color } = organizationVisual(type);
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 44 ? 14 : 11,
        background,
        color,
      }}
    >
      <Icon size={size >= 44 ? 21 : 17} />
    </span>
  );
}
