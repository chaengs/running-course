<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI typography

- All visible UI text must be at least 16px (1rem with the current root size), including mobile layouts, helper text, placeholders, badges, and map controls/attribution.
- Preserve the user's larger browser font setting. Resize spacing and allow wrapping instead of shrinking text to fit.
- Check computed font sizes and horizontal overflow at mobile and desktop widths when changing typography.
