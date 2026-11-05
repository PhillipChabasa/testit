# TESTIT

Medical question practice, AI prompt authoring, concept revision and Anki export.

Production: https://phillipchabasa.github.io/testit/

- `v2/` — React, TypeScript and Vite source; see [development instructions](v2/README.md).
- Repository root — tested static production build for the existing GitHub Pages branch configuration.
- `legacy/` — preserved original interface, Google integration and advanced legacy tools.
- `v2/ARCHITECTURE.md` — data compatibility, recovery and migration architecture.

## Updating

From `v2/`, run `npm ci`, `npm test`, `npm run build`, `npm run test:browser`, and `npm run test:release`. Browser checks use installed Microsoft Edge; set `TESTIT_BROWSER` for another compatible Chromium executable. After validation, `npm run release:stage` copies the build to the repository root. Review and publish the source and artifacts together.

The root stays on the same origin so existing browser data remains accessible. For updates, finish or suspend your session and use **Save & reload** when offered. Google synchronization remains in the original interface linked from Settings. Clinical content is not automatically verified or approved.
