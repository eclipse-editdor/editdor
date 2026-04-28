Use these instructions for **all** code and answers generated for this repo.

## Project context

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Package manager: Yarn
- Testing: Vitest + React Testing Library
- Lint/format: ESLint + Prettier

## General coding rules

- Prefer **small, focused** changes.
- Follow existing project patterns and naming.
- Avoid `any`. Use proper TypeScript types; use type guards when needed.
- Prefer immutable data (`const`, `readonly`) and functional style where reasonable.
- Use optional chaining (`?.`) and nullish coalescing (`??`) where appropriate.
- Handle errors explicitly (try/catch around risky operations; user-friendly messages if UI-facing).
- Don’t invent files/APIs. If something is unknown, ask a clarifying question.

## TypeScript rules

- Apply the [typescript-instructions.md](./instructions/typescript.instructions.md) guidelines.
- Use TypeScript for all new code (`.ts` / `.tsx`).
- Keep types narrow; avoid over-widening (`string` vs specific unions).
- Keep functions pure when possible; avoid hidden side effects.

## React rules

- Apply the [react-instructions.md](./instructions/react.instructions.md) to all code.
- Add cleanup in effects; avoid memory leaks.
- Accessibility: semantic HTML first, proper labels/ARIA, keyboard support.

## Styling rules

- Use **Tailwind CSS** (avoid inline styles unless truly dynamic).
- Keep Tailwind class order consistent and readable.

## Exports & structure

- Prefer **named exports** for components and utilities (follow existing codebase conventions if a folder differs).
- Keep files organized by feature/domain when adding new code.

## When asked to refactor

- Preserve behavior unless explicitly asked to change it.
- Improve readability first, then performance.
- Avoid broad rewrites; refactor incrementally.
