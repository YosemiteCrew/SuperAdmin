const quote = (file) => `"${file.replaceAll('"', String.raw`\"`)}"`;
// secretlint resolves its arguments as globs, so Next.js dynamic-route filenames
// (e.g. `[[...path]]`, `[id]`) match nothing and it errors "Not found target
// files". Escaping the bracket metacharacters makes it treat them literally.
// (eslint v9 wants the literal path and breaks if escaped, so this is applied to
// the secretlint command only.)
const globEscape = (file) => file.replaceAll('[', String.raw`\[`).replaceAll(']', String.raw`\]`);
const quoteGlob = (file) => quote(globEscape(file));
const isAdminPath = (file) =>
  file.startsWith('apps/admin/') || file.includes('/apps/admin/');

const toAdminRelativePath = (file) => {
  if (file.startsWith('apps/admin/')) {
    return file.replace(/^apps\/admin\//, '');
  }
  const marker = '/apps/admin/';
  const index = file.indexOf(marker);
  return index >= 0 ? file.slice(index + marker.length) : file;
};

module.exports = {
  '**/*.{js,jsx,ts,tsx,mjs}': (files) => {
    const adminFiles = files
      .filter((file) => isAdminPath(file))
      .map((file) => toAdminRelativePath(file));

    const otherFiles = files.filter(
      (file) =>
        !isAdminPath(file) &&
        !file.includes('/packages/') &&
        !file.startsWith('packages/')
    );

    const commands = [];

    if (otherFiles.length > 0) {
      commands.push(
        `sh -c 'ESLINT_USE_FLAT_CONFIG=false eslint --fix --max-warnings=0 "$@"' -- ${otherFiles.map(quote).join(' ')}`
      );
    }

    if (adminFiles.length > 0) {
      commands.push(
        `pnpm --filter admin exec eslint --fix --max-warnings=0 ${adminFiles.map(quote).join(' ')}`
      );
    }

    commands.push(`prettier --write ${files.map(quote).join(' ')}`);
    return commands;
  },
  '**/*.{json,md,css,scss,html,yml,yaml}': (files) => [
    `prettier --write ${files.map(quote).join(' ')}`,
  ],
  '**/*.{js,jsx,ts,tsx,mjs,cjs,json,md,yml,yaml,env,txt,sh,properties}':
    (files) => [`secretlint --maskSecrets ${files.map(quoteGlob).join(' ')}`],
};
