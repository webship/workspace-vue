/**
 * Vue for Webship Workspace: a plugin for Nuxt apps.
 *
 * What the package carries is placed by the installer from the manifest: the builder in the sites
 * folders, its functions, argparse and machine files (a first feature) under core/scripts/plugins/vue/,
 * its AI items (ai/) in the AI folders. The builder makes a Nuxt app with Nuxt's create tool (the
 * official starter, with the demo pages of the Vue step pack by default) or takes one from its
 * repository, builds it and serves it from a container of its own with Nuxt's own server: Node.js, the
 * app's language, runs in the app's container, never on the machine. The step pack
 * (@webship-js/vue-steps) goes into the testing setup of such an app with the core's
 * `cmd-tools-testing.sh <project>`. The dashboard needs nothing drawn for it: the builder is in the
 * Build list because it is a cmd-*-project.sh, the row menus are the core's, the AI items are listed
 * like any other. What register() adds is what the assistant is told.
 *
 * Everything the dashboard is asked for goes through `api`; this package requires nothing from the
 * dashboard's own files, so it can be installed from npm and removed without a trace.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';

/** The plugin's name, which its functions are named after. */
export const PLATFORM = 'vue';

/** The commands the installer places in every sites folder. */
export const COMMANDS = ['cmd-vue-project.sh'];

/** The agents the installer places in the AI Agents folder. */
export const AGENTS = ['vue-app-builder', 'vue-tester'];

/** The skill the installer places in the AI Skills folder (a folder each, with its SKILL.md). */
export const SKILLS = ['vue-scenarios'];

/** The slash command the installer places in the AI Commands folder. */
export const AI_COMMANDS = ['vue-test'];

/** The prompts the installer places in the AI Prompts folder: whole launch commands for a new session. */
export const PROMPTS = ['vue-build-and-test', 'vue-scenarios-for-an-app'];

/** What the assistant is told about Vue in this workspace. */
export function assistantContext(): string {
  return [
    'Vue (a plugin, @webship.co/workspace-vue): its builder makes a Nuxt app and serves it from a container of its own, with',
    '`bash cmd-vue-project.sh <name> --install` from a sites folder (dev, test, sandboxes, demos): the app is Nuxt\'s official',
    'starter (nuxi init, pinned) with the demo pages of the Vue step pack (--template minimal for the starter alone, or a',
    'repository of your own with --source, --ref and --path), built with `nuxt build` in the app\'s container, where Node.js runs,',
    'and served by Nuxt\'s own server at https://<name>.ddev.site. The app\'s source is in <name>/app/. There is no database, and',
    'the app has no accounts. `--runtime docker`, `podman` or `kubernetes` builds it on Docker Compose, Podman or a Kubernetes',
    'cluster instead of DDEV, at the address that runtime gives (the build prints it).',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the step pack @webship-js/vue-steps on such an app: its steps',
    'wait for the app to wire the page up, follow a change of view inside the app to the end of its navigation, and send a',
    'form either way (in place with JavaScript, with a page load without it).',
    `For building or fixing a Nuxt app (its build, its links and forms), hand over to the agent \`${AGENTS[0]}\`; for testing one, to \`${AGENTS[1]}\`.`,
    `The plugin also places the skill ${SKILLS.map((a) => `\`${a}\``).join(', ')} (the step pack's phrases) in ai-skills/,`,
    `the command ${AI_COMMANDS.map((a) => `\`/${a} <app>\``).join(', ')} in ai-commands/ and the prompts ${PROMPTS.map((a) => `\`${a}\``).join(' and ')} in ai-prompts/.`,
    'Never run node, npm, npx or nuxi on the host for a project.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}
