# Header action row verification

Allowance and Expenses now use a shared outlined period field with independent
selector and three-dot menu targets. The field and primary action share a row.
The action is a 48px circle on hover-capable devices and reveals its label on
hover or keyboard focus, expanding left within a reserved 176px slot (120px at
600px and below). Touch devices always show the label; reduced motion resizes
immediately. Recording handlers and financial/storage behavior are unchanged.

Build passed; the existing bundle-size advisory remains. Eight focused Chromium
scenarios passed, covering period selection/editing, keyboard focus restoration,
checklists, touch activation, 320px reflow, stable neighboring geometry during
expansion, and reduced-motion transition duration. A final four-scenario action
rerun passed after disabling touch transitions; two further touch viewport cases
passed with label-height/overflow assertions. Prettier and diff checks passed.

Inspected desktop before/expanded/reduced states and settled 320px touch viewport
captures for both pages. Native controls, accessible action names, Lora/body type
roles, semantic colors, existing radii and focus indicators remain. No remaining
layout or text clipping in the inspected settled states. Artifacts are under
/tmp/pomi-action-row, /tmp/pomi-action-final and /tmp/pomi-touch-viewport.

Motion review identified faded/clipped labels in full-page mobile PNGs despite
passing computed geometry. Disabling touch transitions and adding geometry
assertions did not resolve that capture discrepancy. Settled viewport screenshots
with screenshot animations disabled were inspected directly and show white,
fully visible two-line labels. They supersede the full-page touch PNGs as visual
evidence. The reviewer did not approve the earlier PNGs; no reviewer approval of
continuous motion is claimed.

**Not verified:** continuous frame timing/smoothness or rapid reversal via a
frame sequence, screen readers, full browser suite, non-Chromium browsers, native
200% zoom and RTL. The Impeccable capture launcher was unavailable; sparse
Playwright state captures were used instead. No animation-performance verdict is
inferred from them. Scoped interface verdict: approve settled layout/interaction
coverage above, with temporal-motion coverage explicitly excluded.
