---
description: Test a Nuxt app of the Webship Workspace with webship-js and the Vue step pack — set the testing stack up when it is missing, match every step, run the suite (or one feature, or one tag) in the app's container, and report what failed and why.
argument-hint: '<app> [tests/features/<name>.feature | @tag]'
---

# /vue-test

Test the Nuxt app named in: `$ARGUMENTS`

`$ARGUMENTS` stands for what was typed after the command. An AI CLI that does not fill it in reads the
same from the request: the name of the app, then, if anything, one feature path or one tag.

The first word is the app (its folder name in a sites folder of the workspace). What follows, if
anything, narrows the run: a path that starts with `tests/features/` is one feature (or one folder of
features), a word that starts with `@` is a tag expression. With nothing after the app, the whole suite
runs. With no app at all, stop and ask for one: list the candidates with
`ls -d ~/workspace/*/*/.ddev/config.vue.yaml ~/workspace/*/*/compose.yaml`.

The workspace is container-based (DDEV by default) and everything below runs in the app's container
through the workspace's own command. Never run `npx cucumber-js`, `npx playwright`, `node`, `npm` or `nuxi`
on the host for an app.

## 1. Find the app

```bash
ls ~/workspace/<folder>/<app>/.ddev/config.vue.yaml   # an app of cmd-vue-project.sh on DDEV
grep -n "platform: vue" ~/workspace/<folder>/<app>/compose.yaml   # the same on Docker Compose
```

`<folder>` is the sites folder the app is in (`dev`, `test`, `sandboxes`, `demos`). If `<folder>` has
no `cmd-tools-testing.sh`, stop and say that the folder is not a sites folder of this workspace.

## 2. Make sure the testing stack and the step pack are there

```bash
cd ~/workspace/<folder>
grep -c "@webship-js/vue-steps" <app>/cucumber.js
```

If `cucumber.js` is missing or does not name the step pack, set the stack up (it keeps what was changed):

```bash
bash cmd-tools-testing.sh <app>
```

## 3. Match every step, without a browser

```bash
bash cmd-tools-testing.sh <app> --dry-run                                        # the whole suite
bash cmd-tools-testing.sh <app> --dry-run --path tests/features/<name>.feature   # one feature
bash cmd-tools-testing.sh <app> --dry-run --tags "@critical"                     # one tag
```

Use the form that matches what was asked. An `Undefined` or `Ambiguous` step is a finding: name the
feature, the line and the phrase, show the closest phrase the pack defines
(`grep -hE "^(Given|When|Then)\(" <app>/node_modules/@webship-js/vue-steps/tests/step-definitions/*.steps.js`),
and stop before the real run.

## 4. Run

```bash
bash cmd-tools-testing.sh <app> --run                                            # the whole suite
bash cmd-tools-testing.sh <app> --run --path tests/features/<name>.feature       # one feature
bash cmd-tools-testing.sh <app> --run --tags "@critical"                         # one tag
```

Run it once. Do not add `--retry`, do not tag a scenario `@wip` and do not change a feature to make
the run pass.

## 5. Report

Say, in this order:

1. The app, its address (`https://<app>.ddev.site` on DDEV) and what was run (suite, feature or tag).
2. The totals the run printed: scenarios and steps, passed and failed, and the time.
3. For each failed scenario: the feature and line, the step that failed, the message (it names what it
   found: the names of the links or buttons, the status of the page, how the last navigation ended), and
   what it means for the app — a defect of the app, a link or button a person cannot name, a scenario
   that asserts something the app never did, a form turned down (its alert says why), or the
   environment (the app was stopped, or its build failed).
4. Where the report is: `~/workspace/<folder>/<app>/tests/reports/`.

A failing suite is a result: report it as it is. Never add a fixed wait, never create an account for a
scenario, and never write a framework or platform name into a step phrase. For writing or fixing
scenarios, use the `vue-scenarios` skill or hand over to the `vue-tester` agent; for changing the
app, to `vue-app-builder`.

Before you write or change a scenario, or read a failed run, read the book *Automated Functional
Testing Recipes* (its `README.md`, then the matching chapter):
`.claude/automated-functional-testing-recipes/` in the project,
`~/.claude/automated-functional-testing-recipes/`, or
https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
