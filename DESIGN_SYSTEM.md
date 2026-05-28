# Design System Integration

This app uses `@yosemite-crew/design-system` as its shared component library.

## Status

**Phase: Initial Integration** — Migration shims in place, ready for gradual component swap.

## Setup

1. Install the package:
   ```bash
   pnpm add @yosemite-crew/design-system
   ```

2. Import styles in your global CSS:
   ```css
   @import '@yosemite-crew/design-system/css';
   ```

3. For Tailwind scanning, add to your CSS:
   ```css
   @source "../node_modules/@yosemite-crew/design-system/src";
   ```

## Migration Path

### Drop-in Replacements (same API)
- `Badge` → Design system `Badge` (identical tone API)

### API Changes Required
- `Primary/Secondary/Danger` buttons → `<Button variant="primary|secondary|danger">`
- `ModalBase` → `<Dialog>` with `DialogHeader`, `DialogBody`, `DialogFooter`
- `useToast` → `<ToastProvider>` + `useToast` (context-based)

### Stays in SuperAdmin (domain-specific)
- `Avatar`, `IconContainer`, `PageHeader`, `EmptyState`, `Breadcrumb`
- `StatCard`, `DetailCard`
- `GenericTable` (custom column generics)
- `Search`, `Select`, `Dropdown`, `OtpInput`
- `Loader`, `YosemiteLoader`

## Import Patterns

```tsx
// New code — import directly from design system
import { Button, Text, Badge } from '@yosemite-crew/design-system';

// During migration — use the shim file
import { Button, Badge } from '@/app/ui/ds-shims';

// Existing code — continues to work (unchanged)
import { Primary, Badge } from '@/app/ui';
```

## Storybook

The design system has its own Storybook with interactive docs:
```bash
# Clone the design system repo and run Storybook
cd design-system && pnpm storybook
```

## Resources

- [Design System Repo](https://github.com/eng-AhmedMahmoud/design-system)
- [Migration Docs](https://github.com/eng-AhmedMahmoud/design-system-docs)
