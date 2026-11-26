import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(PKG, 'scripts', 'functions', 'fun-vue.sh');
const read = (f: string) => fs.readFileSync(path.join(PKG, f), 'utf8');

// The cucumber.js webship-js scaffolds, as far as the testing hook reads it.
const SCAFFOLD = `module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.
      'tests/step-definitions/**/*.js',                                  // Your custom step definitions.
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost:8080',
    },
  },
};
`;

// A playwright.config.ts of an older scaffold: the hook has no reason to change it, so it stays as it is.
const PLAYWRIGHT = `const chromiumArgs: string[] = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-web-security',
];
`;

/** A project folder with the testing stack scaffolded, and the tooling folder the installer would have filled. */
function project(kind: 'demo' | 'own' | 'drupal') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-plugin-'));
  const dir = path.join(root, 'dev', 'app1');
  fs.mkdirSync(path.join(dir, '.ddev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ddev', 'config.yaml'), `name: app1\ntype: ${kind === 'drupal' ? 'drupal11' : 'generic'}\n`);
  if (kind !== 'drupal') {
    fs.writeFileSync(path.join(dir, '.ddev', 'config.vue.yaml'), '# A Nuxt app in this project.\n');
    fs.mkdirSync(path.join(dir, 'app', 'app', 'pages'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'app', 'app', 'pages', 'index.vue'), '<template><h1>Welcome</h1></template>\n');
    if (kind === 'demo') {
      fs.writeFileSync(path.join(dir, 'app', 'app', 'pages', 'contact.vue'), '<template><h1>Contact</h1></template>\n');
      fs.mkdirSync(path.join(dir, 'app', 'server', 'api'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'app', 'server', 'api', 'contact.post.ts'), 'export default defineEventHandler(() => ({}))\n');
    }
  }
  fs.writeFileSync(path.join(dir, 'cucumber.js'), SCAFFOLD);
  fs.writeFileSync(path.join(dir, 'playwright.config.ts'), PLAYWRIGHT);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app1', devDependencies: { 'webship-js': '^2.0.18' } }, null, 2));
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'vue'), { recursive: true });
  fs.copyFileSync(path.join(PKG, 'testing', 'site.feature'), path.join(scripts, 'plugins', 'vue', 'site.feature'));
  return { root, dir, scripts };
}

/** Run bash with the plugin's functions sourced and `ddev` replaced by a recorder. */
function bash(script: string, env: Record<string, string> = {}) {
  const fake = 'ddev() { echo "ddev $*" >> "${DDEV_LOG:-/dev/null}" ; return 0 ; }';
  return spawnSync('bash', ['-c', `${fake}\nsource ${FUNCTIONS}\n${script}`], { encoding: 'utf8', env: { ...process.env, ...env } });
}

test('the app has no accounts of the workspace: the list is empty, and adding or removing them says so', () => {
  let r = bash('set_vue_users ; echo "${#users[@]}"');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), '0');
  r = bash('add_vue_users ; cancel_vue_users');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /no accounts of the workspace's, so there are none to add/);
  assert.match(r.stdout, /no accounts of the workspace's, so there are none to remove/);
});

const hook = (p: { dir: string; root: string; scripts: string }) =>
  bash(`cd ${p.dir} && testing_configure_vue ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'app1' });

test('the testing hook adds the step pack and, for the demo template, a first feature, once', () => {
  const p = project('demo');
  const r = hook(p);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const pkg = JSON.parse(fs.readFileSync(path.join(p.dir, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.devDependencies['@webship-js/vue-steps'], '^2.0.0');
  assert.strictEqual(pkg.devDependencies['webship-js'], '^2.0.18', 'what was there stays');
  const cucumber = fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8');
  const lines = cucumber.split('\n');
  const core = lines.findIndex((l) => l.includes('node_modules/webship-js/tests/step-definitions'));
  assert.strictEqual(lines[core + 1], "      'node_modules/@webship-js/vue-steps/tests/step-definitions/*.js',", 'the pack is listed right after webship-js');
  const loaded = spawnSync(process.execPath, ['-e', `const c = require(${JSON.stringify(path.join(p.dir, 'cucumber.js'))}).default; console.log(JSON.stringify([c.require.length, c.paths]))`], { encoding: 'utf8' });
  assert.strictEqual(loaded.status, 0, loaded.stderr);
  assert.deepStrictEqual(JSON.parse(loaded.stdout), [3, ['tests/features/**/*.feature']]);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'playwright.config.ts'), 'utf8'), PLAYWRIGHT, 'the browser\'s arguments are the project\'s: a Nuxt app takes a form either way');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'utf8'), read('testing/site.feature'));
  assert.match(r.stdout, /tests\/features\/site\.feature: a first feature for the demo/);
  // Again, after a person changed the feature: nothing is doubled, nothing is reset.
  fs.writeFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'Feature: mine\n');
  const again = hook(p);
  assert.strictEqual(again.status, 0);
  assert.doesNotMatch(again.stdout, /package\.json:|cucumber\.js:|tests\/features\/site\.feature:/, 'a second run adds nothing');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), cucumber);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'utf8'), 'Feature: mine\n');
});

test('an app of your own gets the step pack, and no first feature: it has its own names', () => {
  const p = project('own');
  const r = hook(p);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), /@webship-js\/vue-steps\/tests\/step-definitions/);
  assert.ok(!fs.existsSync(path.join(p.dir, 'tests', 'features', 'site.feature')));
  assert.match(r.stdout, /the app is not the demo template, so no first feature is written/);
});

test('the testing hook waits for the testing stack: without cucumber.js it says to run the setup again', () => {
  const p = project('demo');
  fs.rmSync(path.join(p.dir, 'cucumber.js'));
  const r = hook(p);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /cucumber\.js is not here yet/);
});

test('the testing hook leaves any other project alone', () => {
  const p = project('drupal');
  const r = hook(p);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), SCAFFOLD);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'playwright.config.ts'), 'utf8'), PLAYWRIGHT);
  assert.ok(!fs.existsSync(path.join(p.dir, 'tests')));
});

const SERVE = 'while [ ! -f /var/www/html/app/.output/server/index.mjs ]; do sleep 2; done; cd /var/www/html/app && exec env PORT=3000 HOST=0.0.0.0 node .output/server/index.mjs';

test('the app\'s server waits for the build and runs Nuxt\'s own server on its port', () => {
  const r = bash('vue_serve_command');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), SERVE);
  assert.doesNotMatch(r.stdout, / ;/, 'no " ;", which starts a comment in the supervisor configuration DDEV writes from it');
});

test('on DDEV the router sends the address to the app\'s server, a daemon that waits for the build', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-ddev-'));
  const r = bash(`vue_write_ddev_config ${root} 'the official starter of nuxi 4.1.0'`);
  assert.strictEqual(r.status, 0, r.stderr);
  const yaml = fs.readFileSync(path.join(root, '.ddev', 'config.vue.yaml'), 'utf8');
  assert.match(yaml, /web_extra_exposed_ports:\n  - name: vue\n    container_port: 3000\n    http_port: 80\n    https_port: 443/);
  assert.ok(yaml.includes(`web_extra_daemons:\n  - name: vue\n    command: "bash -c '${SERVE}'"\n    directory: /var/www/html`), yaml);
  assert.doesNotMatch(yaml.split('command: ')[1].split('\n')[0], / ;/, 'no " ;" in the daemon\'s command');
  assert.match(yaml, /^# app: the official starter of nuxi 4\.1\.0$/m);
  assert.ok(!fs.existsSync(path.join(root, '.ddev', 'web-build')), 'the web image is DDEV\'s own: Node.js comes with the project\'s nodejs_version');
});

// What Nuxt's create tool writes for the minimal template, as far as the builder reads it.
const STARTER = '{"name":"nuxt-app","scripts":{"build":"nuxt build"},"dependencies":{"nuxt":"^4.4.2","vue":"^3.5.30","vue-router":"^5.0.4"}}';

/** A build of app1 in a fresh workspace folder, with `ddev` and the core's helpers recorded; `layer` stands for the
 * core's runtime layer (fun-runtime.sh), as far as the builder asks it. The recorder makes the files the commands in
 * the container would: the new app, the demo pages over it, the copied app (its package.json from PKGJSON, its lock
 * file LOCK), the build (none with NOOUTPUT). */
function build(opts: { layer?: string; env?: Record<string, string> } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-build-'));
  fs.mkdirSync(path.join(root, 'dev'), { recursive: true });
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'vue'), { recursive: true });
  const log = path.join(root, 'ddev.log');
  const app = path.join(root, 'dev', 'app1', 'app');
  const script = [
    'trim_project_name() { :; } ; drop_database() { :; } ; ddev_up() { ddev "$@" ; } ; ddev_nodejs_version() { echo 24 ; }',
    `ddev() { echo "ddev $*" >> ${log} ; case "$*" in`,
    `  *"nuxi@4.1.0 init app --template minimal"*) mkdir -p ${app}/app && printf '%s' '${STARTER}' > ${app}/package.json ;;`,
    `  *"npm pack --silent"*) mkdir -p ${app}/app/pages ${app}/server/api && touch ${app}/app/pages/contact.vue ${app}/server/api/contact.post.ts ;;`,
    `  *"cp -a '/tmp/vue-source/"*) mkdir -p ${app} && printf '%s' "$PKGJSON" > ${app}/package.json && { [ -z "$LOCK" ] || touch ${app}/$LOCK ; } ;;`,
    `  *" run build"*) [ -n "$NOOUTPUT" ] || { mkdir -p ${app}/.output/server && touch ${app}/.output/server/index.mjs ; } ;;`,
    'esac ; return 0 ; }',
    opts.layer || '',
    'PROJECT_NAME=app1',
    'vue_build',
  ].join('\n');
  const r = spawnSync('bash', ['-c', `source ${FUNCTIONS}\n${script}`], { encoding: 'utf8', env: { ...process.env, WORKSPACE_ROOT: root, WORKSPACE_SCRIPTS: scripts, doc_name: 'dev', INSTALL: 'yes', PKGJSON: '', LOCK: '', NOOUTPUT: '', ...(opts.env || {}) } });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  return { r, calls, root, log, project: path.join(root, 'dev', 'app1') };
}

test('a new app: the official starter with the demo pages of the pinned pack, built in the container, served at the project\'s address', () => {
  const b = build();
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /^ddev config --project-type=generic --webserver-type=generic --docroot= --project-name=app1 --omit-containers=db --nodejs-version=24$/m);
  assert.ok(fs.readFileSync(path.join(b.project, '.ddev', 'config.vue.yaml'), 'utf8').includes(SERVE), 'the daemon runs Nuxt\'s own server');
  assert.match(b.calls, /^ddev start -y$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html CI=true npx --yes nuxi@4\.1\.0 init app --template minimal --packageManager npm --no-gitInit --no-install$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html rm -rf \/tmp\/vue-demo && mkdir -p \/tmp\/vue-demo && cd \/tmp\/vue-demo && npm pack --silent @webship-js\/vue-steps@2\.0\.0 > \/dev\/null && tar -xzf \.\/\*\.tgz && test -d package\/demo && cp -a package\/demo\/\. \/var\/www\/html\/app\/ && rm -rf \/tmp\/vue-demo$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm install --no-audit --no-fund$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm run build$/m);
  const order = ['ddev start', 'nuxi@4.1.0 init', 'npm pack', 'npm install', 'npm run build'].map((s) => b.calls.indexOf(s));
  assert.deepStrictEqual([...order].sort((x, y) => x - y), order, 'made in the container once it runs, the pages over the starter, then installed and built');
  assert.match(b.calls, /curl -sS -o \/dev\/null http:\/\/127\.0\.0\.1:3000\//, '--install waits for the app\'s server');
  assert.match(b.r.stdout, /^Go to https:\/\/app1\.ddev\.site$/m);
  assert.match(b.r.stdout, /dev app1 is served: the Nuxt app in app\/ \(the official starter of nuxi 4\.1\.0, with the demo pages of @webship-js\/vue-steps 2\.0\.0\)\./);
  assert.doesNotMatch(b.calls, /^ddev stop/m, 'with --install the app stays served');
  assert.doesNotMatch(b.calls, /git clone|@latest/, 'nothing is cloned, nothing is taken at latest');
});

test('without --install the app is built and the project stopped; --template minimal is the starter alone', () => {
  const b = build({ env: { INSTALL: '', TEMPLATE: 'minimal' } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /nuxi@4\.1\.0 init app --template minimal /);
  assert.doesNotMatch(b.calls, /npm pack/, 'no demo pages');
  assert.match(b.calls, /^ddev stop$/m, 'ddev stop takes no -y');
  assert.match(b.r.stdout, /dev app1 is ready: the Nuxt app in app\/ \(the official starter of nuxi 4\.1\.0\)\./);
  assert.match(b.r.stdout, /Serve it with: cd app1 && ddev start/);
});

test('a build that leaves no server of Nuxt\'s own stops with a message, and serves nothing', () => {
  const b = build({ env: { NOOUTPUT: '1' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /The build left no app\/\.output\/server\/index\.mjs: the app is not built for Nuxt's own server/);
  assert.doesNotMatch(b.calls, /curl/, 'nothing is waited for');
});

const OWN = '{"name":"own","scripts":{"build":"nuxt build"},"dependencies":{"nuxt":"^4.2.0","vue":"^3.5.0"}}';

test('an app from a repository: its folder copied out, installed and built with its own package manager', () => {
  let b = build({ env: { SOURCE: 'https://example.com/apps.git', REF: 'main', APP_PATH: 'web', PKGJSON: OWN } });
  assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
  assert.match(b.calls, /git clone --quiet --depth 1 --branch 'main' 'https:\/\/example\.com\/apps\.git' \/tmp\/vue-source/);
  assert.match(b.calls, /test -f '\/tmp\/vue-source\/web\/package\.json' && mkdir -p \/var\/www\/html\/app && cp -a '\/tmp\/vue-source\/web\/\.' \/var\/www\/html\/app\/ && rm -rf \/var\/www\/html\/app\/\.git/);
  assert.doesNotMatch(b.calls, /nuxi@|npm pack/, 'no new app is made, and no demo page is added');
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm install$/m);
  assert.match(b.calls, /^ddev exec -d \/var\/www\/html\/app npm run build$/m);
  assert.match(fs.readFileSync(path.join(b.project, '.ddev', 'config.vue.yaml'), 'utf8'), /^# app: https:\/\/example\.com\/apps\.git \(main\), web\/$/m);
  // pnpm and yarn come through corepack, without its prompt.
  for (const [lock, pm] of [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn']]) {
    b = build({ env: { SOURCE: 'https://example.com/app.git', PKGJSON: OWN, LOCK: lock } });
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.match(b.calls, new RegExp(`^ddev exec -d /var/www/html/app COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack ${pm} install$`, 'm'));
    assert.match(b.calls, new RegExp(`^ddev exec -d /var/www/html/app COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack ${pm} run build$`, 'm'));
  }
});

test('an app that is not a Nuxt app, takes packages of its repository\'s workspace, or needs Bun stops the build with a message', () => {
  for (const [env, message] of [
    [{ PKGJSON: '{"dependencies":{"vue":"^3.5.0"},"devDependencies":{"vite":"^8.0.0"}}' }, /is not a Nuxt app \(its package\.json does not list nuxt\)/],
    [{ PKGJSON: '{"dependencies":{"nuxt":"^4.2.0","ui":"workspace:*"}}' }, /takes packages of a workspace of its repository/],
    [{ PKGJSON: OWN, LOCK: 'bun.lock' }, /installed with Bun \(its lock file\), which is not in the app's container/],
  ] as Array<[Record<string, string>, RegExp]>) {
    const b = build({ env: { SOURCE: 'https://example.com/app.git', ...env } });
    assert.strictEqual(b.r.status, 1, JSON.stringify(env));
    assert.match(b.r.stdout, message);
    assert.doesNotMatch(b.calls, / install$| run build$/m, 'nothing is installed or built');
  }
});

test('--template with --source, an unknown template, --path without --source, a path out of the repository, or a bad project name stop the build before anything is made', () => {
  for (const [env, message] of [
    [{ TEMPLATE: 'minimal', SOURCE: 'https://example.com/app.git' }, /--template makes a new app, and --source takes an app of your own: give one of them\./],
    [{ TEMPLATE: 'content' }, /--template takes demo or minimal/],
    [{ APP_PATH: 'web' }, /--path names a folder of the repository given with --source: give --source too\./],
    [{ SOURCE: 'https://example.com/app.git', APP_PATH: '../etc' }, /take a repository, a branch or tag, and a folder inside the repository/],
    [{ SOURCE: "https://example.com/app.git'; rm -rf /" }, /take a repository, a branch or tag, and a folder inside the repository/],
  ] as Array<[Record<string, string>, RegExp]>) {
    const b = build({ env });
    assert.strictEqual(b.r.status, 1, JSON.stringify(env));
    assert.match(b.r.stdout, message);
    assert.strictEqual(b.calls, '', 'no ddev command ran');
    assert.ok(!fs.existsSync(b.project), 'no project folder was made');
  }
  const b = spawnSync('bash', ['-c', `source ${FUNCTIONS}\ntrim_project_name() { :; } ; ddev() { echo ran ; } ; PROJECT_NAME=App_1 ; vue_build`], { encoding: 'utf8', env: { ...process.env, WORKSPACE_ROOT: os.tmpdir(), doc_name: 'dev' } });
  assert.strictEqual(b.status, 1);
  assert.match(b.stdout, /The project name App_1 must be small letters, digits and dashes/);
  assert.doesNotMatch(b.stdout, /^ran$/m);
});

/** The core's runtime layer, as far as the builder asks it: the runtime, the address, the claim, the stack. */
const layer = (rt: string, url: string) => [
  `runtime_of() { echo ${rt} ; }`,
  `rt_url() { echo ${url} ; }`,
  'rt_claim() { echo "rt_claim $*" >> "$WORKSPACE_ROOT/ddev.log" ; }',
  'rt_stack() { echo "rt_stack $*" >> "$WORKSPACE_ROOT/ddev.log" ; }',
  'rt_web_build() { echo "rt_web_build $*" >> "$WORKSPACE_ROOT/ddev.log" ; cat > /dev/null ; }',
  'rt_serve() { echo "rt_serve $1" >> "$WORKSPACE_ROOT/ddev.log" ; printf "%s\\n" "$2" > "$WORKSPACE_ROOT/serve.txt" ; }',
].join(' ; ');

test('on DDEV the build runs the same commands with the runtime layer as without it', () => {
  const without = build();
  const withLayer = build({ layer: layer('ddev', 'https://app1.ddev.site') });
  for (const b of [without, withLayer]) {
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.doesNotMatch(b.calls, /rt_claim|rt_stack|rt_serve/, 'the language stack is for the other runtimes');
  }
  assert.strictEqual(withLayer.calls.split(withLayer.root).join('ROOT'), without.calls.split(without.root).join('ROOT'), 'the same ddev commands, to the letter');
});

for (const [rt, url] of [['docker', 'http://127.0.0.1:43210'], ['podman', 'http://127.0.0.1:43211'], ['kubernetes', 'http://172.18.0.2:30080']]) {
  test(`on ${rt}: the claim, Node.js's own image at the workspace's version, Nuxt's own server; never a ddev.site`, () => {
    const b = build({ layer: layer(rt, url), env: { RUNTIME: rt } });
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.match(b.calls, /^ddev config --project-type=generic --webserver-type=generic --docroot= --project-name=app1 --omit-containers=db --auto$/m);
    assert.match(b.calls, /^rt_claim vue$/m);
    assert.match(b.calls, /^rt_stack node 24$/m);
    assert.match(b.calls, /^rt_serve 3000$/m);
    assert.doesNotMatch(b.calls, /rt_web_build/, 'Node.js\'s image and the stack\'s layer carry all the app needs');
    assert.strictEqual(fs.readFileSync(path.join(b.root, 'serve.txt'), 'utf8').trim(), SERVE);
    assert.ok(!fs.existsSync(path.join(b.project, '.ddev')), 'no .ddev folder: it would make the project a DDEV one');
    assert.ok(b.calls.indexOf('ddev config') < b.calls.indexOf('rt_claim vue'), 'the claim comes after the runtime\'s files are written');
    assert.match(b.calls, /nuxi@4\.1\.0 init app --template minimal/, 'the app is made in the container, as on DDEV');
    assert.match(b.calls, /npm pack --silent @webship-js\/vue-steps@2\.0\.0/, 'with the same demo pages');
    assert.match(b.r.stdout, new RegExp(`^Go to ${url.replace(/[.:/]/g, '\\$&')}$`, 'm'));
    assert.doesNotMatch(b.r.stdout, /ddev\.site/, 'no message names a DDEV address');
  });
}

test('--runtime on a core without the runtime layer is refused, and nothing is started', () => {
  const b = build({ env: { RUNTIME: 'docker' } });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /--runtime docker needs a Webship Workspace with the container runtimes \(webship\/workspace#694\)/);
  assert.strictEqual(b.calls, '', 'no ddev command ran');
  assert.ok(!fs.existsSync(b.project), 'no project folder was made');
});

for (const rt of ['lando', 'docksal']) {
  test(`a runtime this builder is not proven on (${rt}, the workspace's setting) stops the build before anything is made`, () => {
    const b = build({ layer: layer(rt, 'http://127.0.0.1:43212') });
    assert.strictEqual(b.r.status, 1);
    assert.match(b.r.stdout, new RegExp(`builds on DDEV, Docker Compose, Podman and Kubernetes for now \\(--runtime ddev, docker, podman or kubernetes\\), not on ${rt}`));
    assert.strictEqual(b.calls, '', 'no ddev command ran');
    assert.ok(!fs.existsSync(b.project), 'no project folder was made');
  });
}

test('a project of the builder is known by DDEV\'s file, else by the core\'s rt_is_platform', () => {
  let r = bash('rt_is_platform() { echo "asked $*" ; return 0 ; } ; vue_is_project /x/app1');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), 'asked /x/app1 vue');
  r = bash('rt_is_platform() { return 1 ; } ; vue_is_project /x/app1');
  assert.strictEqual(r.status, 1);
  const p = project('demo');
  assert.strictEqual(bash(`vue_is_project ${p.dir}`).status, 0, 'without the layer, .ddev/config.vue.yaml says so');
  fs.rmSync(path.join(p.dir, '.ddev', 'config.vue.yaml'));
  assert.strictEqual(bash(`vue_is_project ${p.dir}`).status, 1);
});

test('the package manager of an app is read from its lock file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-pm-'));
  const pm = () => bash(`vue_package_manager ${dir}`).stdout.trim();
  assert.strictEqual(pm(), 'npm', 'no lock file: npm');
  for (const [lock, wanted] of [['package-lock.json', 'npm'], ['yarn.lock', 'yarn'], ['pnpm-lock.yaml', 'pnpm'], ['bun.lockb', 'pnpm']]) {
    fs.writeFileSync(path.join(dir, lock), '');
    assert.strictEqual(pm(), wanted, lock);
  }
  const bun = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-pm-'));
  fs.writeFileSync(path.join(bun, 'bun.lock'), '');
  assert.strictEqual(bash(`vue_package_manager ${bun}`).stdout.trim(), 'bun');
  assert.strictEqual(bash('vue_pm npm').stdout.trim(), 'npm');
  assert.strictEqual(bash('vue_pm pnpm').stdout.trim(), 'COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm');
});

test('the builder takes the runtimes it is proven on and the two templates, and never a flag that would take the name PATH', () => {
  const args = read('scripts/args/arg-vue.sh');
  assert.match(args, /choices=\['ddev', 'docker', 'podman', 'kubernetes'\]/);
  assert.match(args, /dest='RUNTIME',\n\s+default="_none_"/);
  assert.match(args, /'--template',\n\s+dest='TEMPLATE',\n\s+default="_none_",\n\s+choices=\['demo', 'minimal'\]/);
  assert.match(args, /'--path',\n\s+dest='APP_PATH',/, '--path would otherwise set PATH');
  // A help text is a Python string in single quotes unless it holds one itself.
  for (const help of args.match(/help='[^\n]*/g) || []) assert.match(help, /^help='[^']*'\)?$/, help);
  const src = read('scripts/functions/fun-vue.sh');
  assert.match(src, /^readonly VUE_RUNTIMES='ddev docker podman kubernetes';$/m);
  assert.match(src, /^readonly VUE_TEMPLATES='demo minimal';$/m);
});

test('the first feature names no framework or platform in the words of a step', () => {
  const feature = read('testing/site.feature');
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  assert.ok(steps.length >= 10);
  for (const s of steps) assert.doesNotMatch(s.replace(/"[^"]*"/g, '""'), /vue|nuxt|vite|node|drupal|wordpress|joomla/i, s);
});
