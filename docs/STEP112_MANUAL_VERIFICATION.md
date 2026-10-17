# STEP112 manual verification plan

No test suite, live API, mobile device, or database verification was run while preparing this plan.

## E2E scenarios to run in an authorized verification environment

1. Create an account/session, create a schedule item, set recurrence, and verify persisted occurrences after a server restart.
2. Update and delete a recurrence; verify ownership checks reject another user's schedule ID.
3. Request daily focus and per-schedule priority suggestions with the configured existing AI connection; verify unavailable credentials produce an error state.
4. Register an Android device, send a reminder through configured FCM, inspect notification history, then unregister the device.
5. Repeat the primary schedule flow with FCM and AI credentials absent; UI must show unavailable status and must not report delivery or analysis success.

## Portable Server verification

1. Build from a clean Windows machine with Node.js 20+, locked dependencies, and no repository-local signing key.
2. Run `pnpm run preflight:portable`; confirm missing artifacts/configuration are reported without exposing secret values.
3. Start through `PoiPoiPortable\\start.bat`, verify `/health` locally, and confirm static client assets load.
4. With an authorized test database, verify recurrence persistence across restart and backup/restore from a separately stored backup.
5. Repeat using a clean configuration with external services disabled; affected features must return explicit unavailable errors.

The above steps are a checklist, not an executed test report. Cross-platform package generation, OAuth/FCM grants, DB fixtures, backup retention, and mobile hardware are external prerequisites.
