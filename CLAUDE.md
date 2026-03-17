# Super Admin Dashboard — Claude Code Rules

## Git Workflow

- **Never commit and push without being explicitly asked.** Only commit when the user says to commit. Only push when the user says to push.
- After every push, **always check for PR review comments** using `gh api` and resolve them:
  1. Fetch all unresolved review threads on the PR
  2. Verify if each comment is still valid or already fixed
  3. Reply to each comment explaining the resolution
  4. Resolve the thread via GraphQL mutation
  5. Confirm zero unresolved threads remain

## Code Patterns

- **State management:** Zustand stores in `app/stores/`
- **Data layer:** Mock handlers in `app/services/mock/` (Axios + real API later)
- **Feature folders:** `app/features/{name}/pages/` and `app/features/{name}/components/`
- **Styling:** Tailwind CSS v4 + CSS variables + inline styles for design tokens
- **Font:** Satoshi (via `var(--font-satoshi)`)
- **Components:** Shared UI in `app/ui/` (primitives, inputs, overlays, tables, cards, layout)

## Design System References

- **Colors:** `#302F2E` (jet-500), `#595958` (jet-400), `#A09F9F` (jet-300), `#BFBFBE` (jet-200), `#EAEAEA` (jet-50), `#247AED` (brand blue), `#EA3729` (danger), `#F68523` (warning), `#33A57D` (success)
- **Input height:** 48px, border-radius: 16px, border: `1px solid #BFBFBE` (default), `#247AED` (focused/filled), `#EA3729` (error)
- **Icon sizes:** sm(16/32), md(18/32), lg(20/40), xl(24/48), 2xl(32/56)
- **Avatar sizes:** 16, 24, 32, 40, 48, 64, 100px

## Loading Strategy

- **Hard refresh / initial app load:** YosemiteLoader GIF (fullscreen, branded)
- **Page-to-page navigation:** Skeleton animation loaders (SkeletonListPage, SkeletonDetailPage)
- **Never** use inline YosemiteLoader for page loading states — always skeletons
