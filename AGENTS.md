# Project instructions

## Frontend scope

Apply these standards when creating, editing, or reviewing frontend interfaces,
components, or stylesheets. Preserve Pomi’s established identity and functionality
unless the user requests a redesign or behavior change.

Pomi uses React, TypeScript, plain CSS, Vite, and local IndexedDB storage. Make
changes in the existing stack; reuse established components and styles before
introducing new abstractions or dependencies.

## Design skills

Read the applicable installed skills before using them. Announce skill use briefly
when first applying a skill in the conversation. Skill files are currently under
`/home/aali/.agents/skills/<name>/SKILL.md`; use the session’s skill catalog if the
installation location changes.

- **Full page and component reviews:** Use `better-interface` to coordinate
  accessibility, layout, writing, typography, color, and UI polish. Load all six
  owning skills and consolidate their findings into one ranked report.
- **Visual polish and anti-patterns:** Apply `better-ui`, `improve-ui`, and
  `impeccable` guidance. Avoid excessive shadows, cluttered cards, arbitrary
  border radii, and generic decoration without a product purpose.
- **Design systems and interactions:** Use `ui-ux-pro-max` for responsive spacing,
  component hierarchy, and predictable state handling. Detect the project stack
  before running stack-specific searches.
- **Layout:** Use `better-layout` for grouping, alignment, reading order,
  responsive structure, and text growth.
- **Typography:** Use `better-typography` for type scales, line heights, wrapping,
  numerical alignment, and text resizing.
- **Color:** Use `better-colors` for semantic tokens and measured contrast.
- **Accessibility:** Use `better-accessibility` for semantics, keyboard behavior,
  focus, accessible names, forms, announcements, and reduced motion.
- **Microcopy:** Use `better-writing` for labels, instructions, errors, empty
  states, and confirmations.

Follow each skill’s workflow and boundaries. In particular, `improve-ui` is
read-only on product source and writes selected implementation plans only under
`design-plans/`. Do not use it as an implementation workflow. Review requests are
read-only unless the user also authorizes fixes. A standing requirement to use a
skill does not itself request an audit, redesign, or unrelated changes.

## Core design rules

- Use an 8pt spacing scale. Group with whitespace first; keep clear hierarchy and
  generous space between groups instead of boxing every element in borders.
- Maintain a clear type scale, unitless line heights, and balanced body text
  measures of 45–75 characters where the surface permits. Keep long-form text
  near 60–75 characters. Use tabular numerals for changing money values.
- Use cohesive semantic color tokens in the project’s existing notation. Meet
  WCAG AA: at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for required
  control boundaries and states. Measure rendered pairs; never estimate ratios.
  Avoid harsh pure black (`#000000`) and oversaturated gradients.
- Use semantic HTML and native controls. Give every control an accessible name,
  visible keyboard focus, and a working keyboard path. Use ARIA only where native
  semantics do not provide the needed behavior.
- Associate labels, hints, and errors with their fields. Announce saving results
  and errors appropriately. Manage focus when opening and closing dialogs and
  changing client-side routes.
- Provide concise, action-oriented labels, recoverable errors, and helpful empty
  states with a clear next action. Preserve established product terminology.
- Handle loading, saving, disabled, empty, error, and success states. Prevent
  duplicate submissions and preserve user input when saving fails.
- Support narrow screens, 200% zoom, text resizing, and reduced motion. Keep
  controls reachable above fixed navigation and prevent horizontal overflow at
  320 CSS pixels. Do not disable browser zoom.

## Before finishing UI work

1. Self-audit new or modified UI against `better-interface` and `impeccable`,
   including the applicable domain skills. Preserve the existing visual identity.
2. Fix layout shifts, overflow, missing interaction states, and verified
   accessibility issues within the authorized change scope before delivery.
3. Inspect the rendered result at relevant desktop and mobile widths when
   available. Check keyboard flow, focus visibility, wrapping, and realistic
   content. Follow applicable skill restrictions on visual inspection.
4. Run checks appropriate to the change. Pomi provides `npm test`,
   `npm run build`, and `npm run test:e2e`. Use focused tests where sufficient;
   documentation-only edits do not require application tests.
5. Report what changed, relevant verification results, and any remaining
   limitations. Mark checks that could not be performed as **Not verified**;
   never claim an audit passed without inspecting its stated coverage.
