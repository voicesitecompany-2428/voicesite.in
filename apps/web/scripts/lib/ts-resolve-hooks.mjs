// scripts/lib/ts-resolve-hooks.mjs — module hooks registered by register-ts.mjs.
//
// resolve: `@/x` → src/x.ts (or src/x/index.ts); `./x` inside a .ts file →
//          ./x.ts. Everything else is Node's normal resolution.
// load:    .ts files are ES modules with TypeScript syntax, so Node does not
//          have to guess (which prints a reparse warning per file).

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

function asFile(base) {
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return pathToFileURL(candidate).href;
    }
    return null;
}

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
        const url = asFile(path.join(SRC, specifier.slice(2)));
        if (url) return nextResolve(url, context);
    } else if (
        (specifier.startsWith('./') || specifier.startsWith('../'))
        && context.parentURL?.endsWith('.ts')
    ) {
        const url = asFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
        if (url) return nextResolve(url, context);
    }
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
        return nextLoad(url, { ...context, format: 'module-typescript' });
    }
    return nextLoad(url, context);
}
