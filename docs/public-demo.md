# Public static demo

Entry: <https://yinbangguo0806-source.github.io/sdggez-pathmate/>.

This showcase is hosted on the contributor fork's GitHub Pages. It is the mobile
frontend with an opt-in `VITE_PUBLIC_DEMO=true` build flag, not a backend deployment.
Visitors select a role and press “開始體驗”; no account or installation is needed.
The login/password/register controls are omitted in this build, auth-token
reads/writes are disabled and the backend Axios client refuses all requests.
Normal builds keep the existing real-authentication behaviour.

Demo business changes remain in memory and reset on refresh. The persistent
banner identifies the public demo. The build has no map Key, so maps and live
routes explicitly report unavailable configuration. SOS, taxi, payment, weather,
remote monitoring and notification delivery are not real services. Do not enter
real personal information. The Python watch experiment is not deployed here.

## Build

Use Node 24 and the committed lockfile. In `existing_app`, install with `npm ci`,
then use these environment values for the build process:

- `VITE_PUBLIC_DEMO=true`
- `VITE_AMAP_KEY=` (empty)
- command: `npm run build:client -- --base=/sdggez-pathmate/`

Publish only `dist/client/` to the fork's `gh-pages` branch. Include `.nojekyll`
and a copy of `index.html` as `404.html` for direct SPA URLs. Never publish the
server, `.env.local`, credentials, real user data or the development directory.
The published `deployment.json` records the source commit and static asset hashes.

## Validation on 17 October 2026

- Lint, both TypeScript projects and the 26 focused regression tests passed.
- The public build passed with the project URL base path.
- A real browser opened the exact static build under `/sdggez-pathmate/`, entered
  the elder demo, refreshed and switched to the family demo. Backend requests: 0;
  failed network loads in the observed refresh/switch interval: 0; console errors: 0.
- These are frontend showcase checks, not database, provider, emergency-service,
  microphone, physical-handset or end-to-end acceptance.
