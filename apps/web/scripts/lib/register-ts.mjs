// scripts/lib/register-ts.mjs
// Lets a one-off script in scripts/*.ts reuse the app's own TypeScript modules
// (`@/lib/...`) under plain Node — no tsx, no vite-node, nothing added to
// package.json. Node 22 strips the types itself; this only teaches it the
// project's import style: the `@/` alias and extensionless relative imports.
//
// Run:  node --env-file=.env.local --import ./scripts/lib/register-ts.mjs scripts/<name>.ts
//
// Only for code with plain, erasable TypeScript (no enums, no namespaces) and
// no `server-only` import — which is why the scripts build the image library
// themselves instead of importing src/lib/menu/imageLibrary.ts.

import { register } from 'node:module';

register(new URL('./ts-resolve-hooks.mjs', import.meta.url));
