// Regroupe js/skills-3d.js et les modules Three.js utilisés en un seul fichier minifié :
// une requête au lieu d'une quinzaine (CDN), sans code inutilisé.
// Usage : cd tools && npm install && npm run build
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
    entryPoints: [path.join(root, 'js/skills-3d.js')],
    outfile: path.join(root, 'js/skills-3d.min.js'),
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    alias: { 'three/addons': 'three/examples/jsm' },
    nodePaths: [path.join(root, 'tools/node_modules')],
    logLevel: 'info'
});
