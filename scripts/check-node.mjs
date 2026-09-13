const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (
  major < 22 ||
  (major === 22 && (minor < 22 || (minor === 22 && patch < 2)))
) {
  console.error(
    'Node.js >=22.22.2 is required. Run: nvm install && nvm use (or install a current Node LTS).',
  );
  process.exit(1);
}
