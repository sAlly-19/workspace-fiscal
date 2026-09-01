const { spawn, spawnSync } = require('child_process');

function runElectron(args, options = {}) {
  const electronPath = require('electron');
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '', ...(options.env || {}) };
  delete env.ELECTRON_RUN_AS_NODE;
  console.log('[electron-runner] ELECTRON_RUN_AS_NODE=' + JSON.stringify(env.ELECTRON_RUN_AS_NODE));
  return spawn(electronPath, args, { stdio: 'inherit', env, ...options });
}

const isBuild = process.argv.includes('--build');
if (isBuild) {
  console.log('[electron-runner] Building...');
  const build = spawnSync('npm', ['run', 'build:web'], { stdio: 'inherit', shell: true });
  if (build.status !== 0) process.exit(build.status);
  const buildEl = spawnSync('npm', ['run', 'build:electron'], { stdio: 'inherit', shell: true });
  if (buildEl.status !== 0) process.exit(buildEl.status);
}

const target = isBuild ? ['dist-electron/main.cjs'] : process.argv.slice(2).filter((a) => a !== '--build');
console.log('[electron-runner] launching electron with args:', target);
const child = runElectron(target);
child.on('close', (code) => process.exit(code || 0));
