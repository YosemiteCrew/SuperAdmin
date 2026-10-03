import type { BusinessType } from '@/app/features/organizations/types';

import { organizationVisual } from './organizationVisual';

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
