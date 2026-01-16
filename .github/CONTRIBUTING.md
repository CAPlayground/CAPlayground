# Contributing to CAPlayground

Thanks for your interest in contributing! This guide helps you get set up and submit changes.

## Getting Set Up

- Node.js 20+ and Bun (recommended) or npm
- Install deps:
  - bun install
  - or: npm install
- Run the app:
  - bun dev
  - or: npm run dev

## Project Structure

- `app/` — Next.js routes (editor lives at `editor/[id]/page.tsx`)
- `components/editor/` — Editor UI and context
- `components/ui/` — Reusable UI primitives
- `hooks/` — Custom hooks (e.g., `use-local-storage`)
- `lib/` — Types and utilities
- `styles/` — Global styles

## Branch & Commit Conventions

- Branch names: `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- Commits: conventional style
  - feat: add inspector theme toggle
  - fix: prevent number inputs from defaulting to 0
  - chore: upgrade deps

## Development Guidelines

- TypeScript required; keep strict types where practical
- Prefer small, focused PRs (I don't always have that much time)
- Keep UI state colocated; shared editor state goes in `EditorProvider` (`components/editor/editor-context.tsx`)
- Styling - tailwind CSS (utility-first). Use existing tokens/classes when possible
- Accessibility - label controls (`<Label htmlFor=...>`), `aria-*` on interactive elements
- Dark mode - verify both light/dark themes (uses `next-themes`)
- Persistence - editor auto-saves to `localStorage` via `useLocalStorage`

## Pull Request Checklist

- [ ] Linked issue (if applicable)
- [ ] Clear description of changes and rationale
- [ ] Screenshots/GIFs for visual changes
- [ ] Verified build: `bun build`
- [ ] Verified run: `bun dev` and exercised the changed areas
- [ ] No console errors; no type errors

## How to Submit a PR

1. Fork the repo and create a branch
2. Make changes, commit, and push
3. Open a PR against `main` with a descriptive title/body
4. Address review comments; squash if asked

## Reporting Bugs & Requesting Features

- Use GitHub Issues with a minimal repro, screenshots, and expected vs. actual behavior

## License

By contributing, you agree your contributions are licensed under the repository’s Creative Commons License.
