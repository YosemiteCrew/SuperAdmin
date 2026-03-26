/**
 * Design System Migration Shims
 *
 * Re-exports from @yosemite-crew/design-system for gradual migration.
 * Existing imports from @/app/ui continue working; new code should
 * import directly from @yosemite-crew/design-system.
 *
 * This file can be removed once all imports are migrated.
 */

// ── Primitives ──
export {
  Button,
  buttonVariants,
  Text,
  Card,
  cardVariants,
  Badge,
  badgeVariants,
  Input,
  inputVariants,
  FormField,
  Stack,
  Divider,
} from '@yosemite-crew/design-system';

export type {
  ButtonProps,
  TextProps,
  TextVariant,
  TextColor,
  CardProps,
  BadgeProps,
  InputProps,
  FormFieldProps,
  StackProps,
  DividerProps,
} from '@yosemite-crew/design-system';

// ── Compounds ──
export {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  ToastProvider,
  useToast as useDSToast,
  Tabs,
  TabList,
  TabTrigger,
  TabPanel,
  Tooltip,
  Table as DSTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@yosemite-crew/design-system';

export type {
  DialogProps,
  ToastProviderProps,
  TabsProps,
  TooltipProps,
  TableProps,
} from '@yosemite-crew/design-system';

// ── Tokens ──
export {
  colors,
  semanticColors,
  fontFamily,
  fontWeight,
  spacing,
  radii,
  shadows,
  cn,
} from '@yosemite-crew/design-system';

// ── Utilities ──
export {
  useReturnFocus,
  useEscapeKey,
  generateId,
  srOnlyClass,
} from '@yosemite-crew/design-system';
