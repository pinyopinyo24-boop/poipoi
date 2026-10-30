# AZ PC integration

This change connects the existing PC chat screens to the same AZ chat core,
account identity, correction memory and authorized tools. Existing routes remain
available, including the streaming response contract and image command.

- Natural requests use a bounded select / execute / observe loop. Each actual tool
  result is recorded before another action is selected. Missing inputs, failures,
  interrupted actions, pending approvals and step limits are distinct states.
- The PC screen accepts XLSX/PDF uploads and exposes downloads for generated XLSX,
  PDF and PPTX. Editing XLSX writes a separate copy; formulas recalculate in Excel
  when opened. PDF reports use a standard Japanese CID font and contain text.
- Source evolution discovers existing source context, can propose new source files,
  and preserves existing public exports. The full before/after contents are stored
  in account-owned previews. The PC review panel offers approve / reject actions.
- Applying a preview checks its ownership, expiration and original source hashes,
  rejects overwriting local edits, records a scoped Git commit and restores file
  contents after a failed application. Unrelated staged changes block application.
  Source deletion and dependency/configuration changes are not supported.
- APPLY_ONLY performs source validation and application. APPLY_AND_VERIFY also
  authorizes `tsc --noEmit`. Neither runs functional tests, a build or a restart.
  `tested` remains false; `typeChecked` reports the separate type-check outcome.
- The legacy self-evolution entry point accepts an authenticated context and routes
  through the same preview/approval API. Parameter-improvement simulation remains
  separate and explicitly reports `codeApplied: false`. Scheduled diagnosis does
  not grant itself approval. Real parameter application counts come from the applier.
- Commits include `[skip ci]` to avoid starting the repository's push-triggered
  test/build workflow without permission. Evolution commits also disable Git hooks.

## Validation status

Only source reading and diff/whitespace inspection were performed for this change.
No dependency installation, type checker, tests, build, running server, restart,
PC access or Android-device synchronization check was performed. GitHub changes
are not evidence that the Windows PC has received or successfully run this code.

Source discovery/application is bounded to five source files per proposal. The
business task loop is bounded to twelve decisions. These limits and unsupported
operations are reported rather than presented as completed work.
