# Settings error feedback

## Changes

Settings now keeps backup, restore, and installation failures separate. Export
metadata and file-validation errors remain in Backup and restore. Restore write
failures appear inside the open confirmation dialog, above its actions; the
validated backup remains available for retry. Retry, dismissal, and new file
selection clear stale restore errors. Installation errors appear in Install
Pomi and clear on retry; ordinary prompt dismissal remains cancellation.

Existing busy states, confirmation, database replacement, and post-commit success
notifications remain. No financial rules, backup formats, dependencies, or public
interfaces changed. Settings paragraph styling now excludes error paragraphs so
existing semantic error colors apply consistently.

## Scoped self-review

- Accessibility: error alerts belong to the active operation, including inside
  the modal dialog. Native dialog focus restoration and recovery actions remain.
- Layout: existing panels, dialog spacing, wrapping, and responsive action rows
  are reused. Desktop (1440px) and narrow (320px) restore-error captures inspected.
- Writing: existing labels, destructive confirmation, and error messages retained.
- Typography: existing body/control scale retained; error text wraps naturally.
- Color: existing danger foreground/background tokens reused; browser assertions
  measure error text contrast against its rendered opaque background (4.5:1 floor).
- UI polish: no new surfaces, radii, shadows, motion, or decoration introduced.

## Verification

- `npm test`: all 37 unit tests passed.
- `npm run build`: passed with the existing bundle-size advisory.
- Initial focused browser run: all 12 Settings, notebook, and interface tests
  passed, covering offline use, backup/restore, keyboard behavior, responsive
  layout, enlarged text, and rendered contrast across six sections.
- Final strengthened Settings regression run: all four tests passed, including
  failure preserving the current balance, successful replacement on retry,
  cancellation/focus restoration, invalid/oversized file recovery, and measured
  restore/installation error contrast.
- Installation-error check also passed at 320px with effective 200% root text
  enlargement; its capture was inspected and no horizontal overflow occurred.
- Prettier checks and `git diff --check`: passed.

**Not verified:** physical-device browser zoom, non-Chromium engines, actual
screen-reader speech, and real OS installation dialogs (installation outcomes
were simulated). The Impeccable launcher could not start because its engine is
not installed and its cache directory is not writable; its loaded guidance was
used without installing or repairing the engine.
