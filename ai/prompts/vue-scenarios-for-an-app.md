Write and run the webship-js scenarios of one Nuxt app of the workspace.

The launch command below is for Claude Code, the default; the text between the triple quotes can be given to another AI CLI as it is.

```
claude --permission-mode bypassPermissions """
Write webship-js scenarios for the Nuxt app <app> (its <page> page) and run them
# ~/workspace/<dev|test|sandboxes|demos> · https://<app>.ddev.site · container-based (DDEV by default)
# the steps wait for the app to wire the page up, follow a change of view to the end of its navigation and send a form the way the app does
# nothing on the host: no node, npm, npx or nuxi outside the app's container
# before writing: the book Automated Functional Testing Recipes (its README.md, then ch27-testing-spa.md and ch07-waiting-dynamic-content.md), from .claude/automated-functional-testing-recipes/ in the project, ~/.claude/automated-functional-testing-recipes/ or https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes

1. bash cmd-tools-testing.sh <app>
2. Open https://<app>.ddev.site/<page> in the Playwright MCP browser, in a tab of your own, and take a snapshot: note the
   name of each link, button and field, the view's title, and where each link goes; use one link and see whether the
   view changes in place and its title is announced.
3. Write tests/features/<page>.feature from the installed phrases only
   (grep -hE "^(Given|When|Then)\(" node_modules/@webship-js/vue-steps/tests/step-definitions/*.steps.js):
   no fixed wait, no framework or platform name in a step, no account created.
4. bash cmd-tools-testing.sh <app> --dry-run --path tests/features/<page>.feature
5. bash cmd-tools-testing.sh <app> --run --path tests/features/<page>.feature

If a command fails, show the line that failed and stop. A failing scenario is a result: say what the app did.
When the feature is green: how many scenarios and steps passed, and which links or buttons of the page a person cannot name.
"""
```
