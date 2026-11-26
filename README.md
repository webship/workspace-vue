# @webship.co/workspace-vue

Vue for the [Webship Workspace](https://github.com/webship/workspace) dashboard: a builder that makes a Nuxt app with
Nuxt's create tool (or takes one from its repository), builds it and serves it from a container of its own with Nuxt's
own server, the [Vue step pack](https://github.com/webship/vue-steps) wired into the testing setup of that app, and its
AI items — two agents, a skill, a command and two prompts for building and testing Nuxt apps — each listed in the
workspace folder of its kind.

The app brings its own language in its own container. Node.js runs in the app's container, at the version of the
workspace rule (24); the app is made there with Nuxt's create tool (`nuxi init`, pinned to 4.1.0) from Nuxt's official
starter, built there (`nuxt build`), and served by Nuxt's own server (`node .output/server/index.mjs`). Nothing of
Node.js, npm or the create tool runs on the machine. The app is the official starter with the demo pages of the Vue
step pack, the starter alone, or an app of your own from its repository.

The workspace is container-based (DDEV by default): an app is a row like any other, so the row menus the core draws
(start, stop, launch, backup, clone, remove, tests) work on it; what does not apply to an app without a database is
listed under [What is different from a platform](#what-is-different-from-a-platform). The builder builds on DDEV by
default, and with `--runtime` on Docker Compose, Podman or a Kubernetes cluster: see [Runtimes](#runtimes).

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require vue --with-needs     # npm install into the dashboard
bash core/scripts/plugins.sh --activate vue --with-needs    # plugins.vue in settings.yml
bash core/scripts/plugins.sh --install vue                  # the builder, functions, args, AI items
bash core/scripts/plugins.sh --configure vue                # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is idempotent.
`--uninstall` removes what it placed; an AI item you edited stays.

Everything the plugin carries lands in the folder it belongs to, when that folder is an active workspace folder:

| What | Lands in |
| --- | --- |
| `cmd-vue-project.sh` | every active sites folder: `dev/`, `test/`, `sandboxes/`, `demos/` |
| The agents `vue-app-builder`, `vue-tester` | `ai-agents/` |
| The skill `vue-scenarios` | `ai-skills/` |
| The command `/vue-test` | `ai-commands/` |
| The prompts `vue-build-and-test`, `vue-scenarios-for-an-app` | `ai-prompts/` |

There they are listed like any other item of the folder, and installed into Claude Code from there.

## What it needs

A workspace starts empty, so the manifest says what else this plugin needs (`needs`):

- one sites folder, for the builder: `dev`, `test`, `sandboxes`, `demos` (`dev` is the one added when none is there). The folder also carries `cmd-tools-testing.sh` and the Users tools this plugin's hooks answer to.
- `ai-agents`, `ai-skills`, `ai-commands` and `ai-prompts`: the AI folders its agents, its skill, its command and its prompts are placed in.

`--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is
missing first:

```bash
bash core/scripts/plugins.sh --activate vue --with-needs   # dev and the four AI folders are required, activated and installed first
bash core/scripts/plugins.sh --install vue
```

Everything the builder runs for an app runs in the app's own container, through the container tool the workspace
already needs; the plugin asks for no command of its own on the machine. Making an app downloads the create tool, the
starter, the demo pages and the app's packages from the npm registry and from Nuxt's starter repository, in the
container.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-vue-project.sh` | The builder, in the Build list as **Vue (Nuxt app)**, installed into every sites folder |
| `scripts/functions/fun-vue.sh` | The bash functions behind it, sourced by bootstrap once installed; the names the core's tools look for (`set_vue_users`, `add_vue_users`, `cancel_vue_users`, `testing_configure_vue`) |
| `scripts/args/arg-vue.sh` | Its argparse; the Build form draws the builder's flags from it |
| `testing/site.feature` | The first feature the demo template gets when testing is set up |
| `ai/agents/vue-app-builder.md` | The agent that builds and fixes apps: the build in the container, names a person reads, a title for each view |
| `ai/agents/vue-tester.md` | The agent that writes and runs scenarios with the step pack, with JavaScript and without |
| `ai/skills/vue-scenarios/` | The skill: the step pack's phrases, the traps found on a real app, three example features |
| `ai/commands/vue-test.md` | The slash command `/vue-test <app>`: set up when missing, match every step, run, report |
| `ai/prompts/vue-build-and-test.md`, `vue-scenarios-for-an-app.md` | Two prompts: whole launch commands for a new session |
| `src/index.ts` | `register(api)`: what the assistant is told about Vue here |
| `features/vue.feature`, `features/vue-runtimes.feature` | Scenarios for the dashboard's own browser suite |

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## What is different from a platform

| | WordPress (a platform) | Vue |
| --- | --- | --- |
| What is built | A WordPress site | A Nuxt app: Nuxt's official starter with the step pack's demo pages, the starter alone, or an app from its repository, built for Nuxt's own server |
| Project | `--project-type=wordpress` | `--project-type=generic --webserver-type=generic`, no database: the app's own server serves it |
| The language | PHP, in the container tool's image | Node.js 24 in the app's container: DDEV's web container (`--nodejs-version`) on DDEV; on Docker Compose, Podman and Kubernetes the core's language stack (`rt_stack node 24`, Node.js's own image, and `rt_serve`) |
| Recognised by | The project type | On DDEV a file the builder writes, `.ddev/config.vue.yaml` (it also records where the app came from); on another runtime its claim, `platform: vue` in the `x-webship` block of `compose.yaml` |
| Accounts | WP-CLI | None of the workspace's: `--add-users` is taken and adds nothing |
| Testing | The WordPress pack | The Vue pack, which waits for the app to wire each page up, follows a change of view to the end of its navigation and sends a form the way the app does |

## The commands

Run it from a sites folder. `--help` is safe.

### Build and serve an app

```bash
cd ~/workspace/dev
bash cmd-vue-project.sh nxapp --install                      # a new app: the starter with the demo pages
bash cmd-vue-project.sh nxmin --install --template minimal   # the official starter alone: one welcome page
bash cmd-vue-project.sh nxown --install --source https://github.com/<you>/<app>.git --ref main
bash cmd-vue-project.sh nxapp --install --runtime docker     # on Docker Compose instead of DDEV
bash cmd-vue-project.sh nxapp --install --runtime kubernetes # on the workspace's Kubernetes cluster
```

| Flag | What it does |
| --- | --- |
| `--install` | Serve the built app and check that it answers at its address (`https://<name>.ddev.site` on DDEV) |
| `--runtime ddev\|docker\|podman\|kubernetes` | The container runtime to build on (default: DDEV, or `container.runtime` of `settings.yml`); see [Runtimes](#runtimes) |
| `--template demo\|minimal` | The template a new app is made from (default: `demo`, the official starter with the step pack's demo pages; `minimal`, the starter alone) |
| `--source <git url>` | A repository of a Nuxt app, instead of a new one |
| `--ref <branch or tag>` | A branch or a tag of that repository (default: its default branch) |
| `--path <folder>` | The folder of the app in that repository, for a repository of several apps |
| `--add-users` | Taken so that every builder accepts the same flags; the app has no accounts of the workspace's |
| `--launch` | Open the app in a browser when it is ready |

The builder deletes a project of the same name first, then makes a container with Node.js, makes the app in it with
`nuxi init app --template minimal` (or copies it from its repository), installs its packages, builds it with
`npm run build`, and with `--install` checks that its server answers.

**The demo template** is the official starter with the pages of the step pack's `demo/` over it, taken from the
pack's npm package at the release the builder pins (`@webship-js/vue-steps` 2.0.0): the demo the builder makes is the
one that release's features were proven on. It has a counter, an about page, posts loaded from a server route, a
contact form that works without JavaScript and is sent in place with it, a page drawn in the browser only, and Nuxt's
error page for a post that does not exist.

An app of your own must be a Nuxt app whose packages are its own:

- **Its package manager** is read from its lock file: npm (`package-lock.json`, or none), pnpm or yarn, the last two
  through Node.js's corepack. One installed with Bun is refused, with a message.
- **Its server:** the app must build for Nuxt's own server (the default preset), which leaves `.output/server/index.mjs`;
  a build that leaves none (a static preset, or one for a host's own servers) stops with a message.
- **Refused, with a message:** an app that takes packages of a workspace of its repository (`"workspace:"` in its
  `package.json`), and one that is not a Nuxt app.

The project's folder holds the app's source in `app/` and the built server in `app/.output/`. After a change to the
app, build it again in the container and restart the project, so its server loads the new build:

```bash
cd ~/workspace/dev/nxapp
ddev exec -d /var/www/html/app "npm run build"
ddev restart
```

### Test an app

```bash
bash cmd-tools-testing.sh nxapp                                  # webship-js, the step pack, a first feature
bash cmd-tools-testing.sh nxapp --run --path tests/features/site.feature
```

The testing setup adds `@webship-js/vue-steps` to the project, lists its step definitions in `cucumber.js`, and, for
the demo template, writes `tests/features/site.feature`. An app of your own gets no first feature: it has its own
names. It changes nothing in a project that is not an app of this builder.

The steps wait for the app to wire each page up, follow a change of view inside the app to the end of its navigation
(the router's navigation ended, the new view's title announced to screen readers, the page still), and send a form
either way: in place with JavaScript, with a page load without it.

```gherkin
Feature: The contact form
  Scenario: A message too short is turned down, and says why
    Given I am on "/contact"
    When I fill in "Your name" with "Ada"
    And I fill in "Your message" with "Too short"
    And I send the form with the "Send" button
    Then the form should have been turned down with "Your message needs at least 10 characters."
```

### Runtimes

The commands are the same on every runtime: the builder speaks DDEV's verbs, and on another runtime the core's layer
(Webship Workspace 1.0.32 or later, webship/workspace#694 and #841) gives each verb its meaning there: the language
stack builds the web image from Node.js's own image at version 24 and starts the app's server in it. The app has no
database, so on Kubernetes it needs core 1.0.35 or newer (webship/workspace#884).

| Runtime | The address of the app | Proven with this builder |
| --- | --- | --- |
| DDEV (the default) | `https://<name>.ddev.site` | PROOF-DDEV |
| Docker Compose (`--runtime docker`) | `http://127.0.0.1:<port>`, a free port kept in `compose.yaml` | PROOF-DOCKER |
| Podman (`--runtime podman`) | `http://127.0.0.1:<port>` | PROOF-PODMAN |
| Kubernetes (`--runtime kubernetes`) | `http://<node address>:<NodePort>` | PROOF-KUBERNETES |

A project of the builder is known by DDEV's file on DDEV and by its claim on another runtime, so the testing setup,
the Users tools (which say there are no accounts) and the dashboard's row work the same on each. Lando and Docksal are
runtimes of the workspace too, not proven with this builder yet: it says so and stops, before anything is made.

### Users

The app has no accounts of the workspace's. `cmd-tools-add-users.sh <name> vue` and
`cmd-tools-cancel-users.sh <name> vue` say so and change nothing.

## The AI items

| Item | Kind | What it is for |
| --- | --- | --- |
| `vue-app-builder` | agent | Builds and fixes Nuxt apps in their container: the build, names a person reads, a title for each view, forms that work without JavaScript |
| `vue-tester` | agent | Writes and runs scenarios with the step pack: looks at the pages in the browser first, never sleeps, never names a framework or platform in a step, runs with JavaScript and without |
| `vue-scenarios` | skill | The step pack's phrases, the traps found on a real app, three example features that pass on the demo template and on the starter alone |
| `/vue-test <app>` | command | Sets the pack up when missing, matches every step, runs, reports |
| `vue-build-and-test` | prompt | Builds an app and proves it with its first feature |
| `vue-scenarios-for-an-app` | prompt | Writes and runs the scenarios of one page of an app of the workspace |

Every item says the workspace is container-based (DDEV by default), and the agents and the skill send the reader to
the book *Automated Functional Testing Recipes* first.

## Develop it

```bash
npm install
npm test        # builds, then the unit tests: the manifest, the scripts, the AI items, the needs
npm run lint    # the TypeScript compiler, no output
```

CI runs the same on Node.js 24 and 26, checks that every shell script parses, and runs the plugin's webship-js
features against a dashboard with the plugin installed (the reusable workflow
`webship/workspace/.github/workflows/plugin-browser-suite.yml`). Before the features it builds the app the manifest
names (`featuresSite`: `cmd-vue-project.sh ci-vue --install --runtime docker`), so the scenarios of
`features/vue-runtimes.feature` tagged `@needs-runtime-docker` drive a real app on Docker Compose; the Podman and
Kubernetes ones run where such an app is.
`tests/fixtures/step-definitions.txt` holds the step definitions of the step pack at the version the testing hook pins
and of webship-js, read from their packages: every phrase an AI item shows must match one of them.

## License

ISC (see `LICENSE`).

## Logo

The logo of this plugin is pending the owner's decision: it comes before the first release. The Vue and Nuxt names are
trademarks of their owners; this plugin is not affiliated with or endorsed by them.
