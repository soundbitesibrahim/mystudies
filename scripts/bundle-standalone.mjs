/**
 * Folds the standalone build's CSS and JS into the HTML, producing:
 *
 *   dist-standalone/academic-command-center.html  a complete document
 *   dist-standalone/artifact.html                 the same page as a fragment
 *
 * The fragment omits the document skeleton for hosts that supply their own.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'dist-standalone';

const escapeForScript = (code) =>
  // Stops a literal </script> inside the bundle from closing the tag early.
  code.replace(/<\/script>/gi, '<\\/script>');

const css = await fs.readFile(path.join(OUT, 'app.css'), 'utf8');
const js = await fs.readFile(path.join(OUT, 'app.js'), 'utf8');
const html = await fs.readFile(path.join(OUT, 'index.html'), 'utf8');

const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Academic Command Center';
const icon = html.match(/<link rel="icon"[^>]*>/)?.[0] ?? '';
const description =
  html.match(/<meta\s+name="description"[\s\S]*?>/)?.[0] ?? '';

const head = `    <title>${title}</title>
${icon ? `    ${icon}\n` : ''}${description ? `    ${description}\n` : ''}    <style>
${css}
    </style>`;

const body = `    <div id="root"></div>
    <script>
${escapeForScript(js)}
    </script>`;

const document = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b0d11" />
${head}
  </head>
  <body>
${body}
  </body>
</html>
`;

const fragment = `${head}
${body}
`;

await fs.writeFile(path.join(OUT, 'academic-command-center.html'), document);
await fs.writeFile(path.join(OUT, 'artifact.html'), fragment);
await fs.rm(path.join(OUT, 'index.html'), { force: true });
await fs.rm(path.join(OUT, 'app.js'), { force: true });
await fs.rm(path.join(OUT, 'app.css'), { force: true });

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} kB`;
console.log(`academic-command-center.html  ${kb(document)}`);
console.log(`artifact.html                 ${kb(fragment)}`);
