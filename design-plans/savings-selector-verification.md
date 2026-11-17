# Savings header selector verification

Implemented the header fund dropdown, independent fund actions menu, one plus
creation popover, page-level checklist/details switch, and selected-fund content.
Removed the expandable fund browser and footer actions. Preserved fund recovery,
financial calculations, historical checklists, and goal-free progress track.

Verified production build and all 43 unit tests. Browser checks cover Savings
selection, creation, dialog focus return, checklist/goal behavior, desktop/320px
alignment and overflow, Settings archive/delete/restore, and selector keyboard
navigation. Inspected rendered desktop and 320px captures. One transient Chromium
crash was resolved by rerunning; the Savings scenarios subsequently passed.

Not verified: the entire browser suite, screen-reader output, touch-device
interaction, 200% browser zoom, and continuous animation smoothness. Existing
production bundle-size advisory remains. No dependencies or schema changes.
