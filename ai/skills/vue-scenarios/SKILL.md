---
name: vue-scenarios
description: Write and fix webship-js scenarios for a Nuxt app with the Vue step pack (`@webship-js/vue-steps`) in the Webship Workspace — the pack's phrases for the app wiring a page up, its views, its forms and its error pages, how the steps name things (a link or a button by its name, from its start), the two lanes (with JavaScript and without), the traps found on a real app, and three example features that pass. Use when writing a feature for a Nuxt app, choosing the phrase for a link, a form or an error page, or reading why a Vue scenario failed.
---

# vue-scenarios

Scenarios for Nuxt apps in a Webship Workspace (`~/workspace`), a container-based workspace (DDEV by
default), with webship-js and [`@webship-js/vue-steps`](https://github.com/webship/vue-steps). An app of the
Vue builder (`cmd-vue-project.sh`) gets the pack with `bash cmd-tools-testing.sh <app>`; the suite runs in the
app's container (`bash cmd-tools-testing.sh <app> --run`).

A page arrives as the server's HTML; the app's scripts then wire it up in the browser. Every step of the
pack that acts waits for that first, when the page has an app and the browser runs JavaScript; a page
without an app, and every page in a browser without JavaScript, have nothing to wait for, and the run's log
says so.

## The phrases

Check them against the installed pack before you use them
(`grep -hE "^(Given|When|Then)\(" node_modules/@webship-js/vue-steps/tests/step-definitions/*.steps.js`).

**The page**

```gherkin
Given the page is wired up
Then the page should be wired up
Then the page should have been drawn in the browser only
When I wait for the page to be still
```

**Views**: a link by its name; how the last navigation ended; what screen readers were told.

```gherkin
When I use the "Posts" link
When I return to the previous view
Then the view should have changed in place
Then a new page should have loaded
Then the new view should be announced as "Posts"
Then the "Posts" link should be marked current
Then the view's address should be "/posts"
When I wait for the view's data to arrive
```

**Forms**: a form by the button that sends it; whether the app took it, or why it did not; how it was sent.

```gherkin
When I send the form with the "Send" button
Then the form should have gone through
Then the form should have been turned down with "Your message needs at least 10 characters."
Then the form should have been sent in place
Then the form should have led to a new page
```

**Error pages**

```gherkin
Then the view should be the 404 error page
Then the view should be the 404 error page saying "Post not found"
```

webship-js's own steps still go to an address (`Given I am on "/posts"`), read the page (`Then I should see
"Moving between pages"`), fill in fields and press keys. A button with a label and no text (an icon) is pressed
with `When I press "Add one to the count" by attr` (its `aria-label`).

## The traps

- **A name matches from its start.** Exactly, then without regard to case, then by its start (three
  characters or more); never a part in the middle. A failure lists the names it found.
- **A click before the app has wired the page up loads a whole page.** The pack's steps wait; a step of
  webship-js (`I click`, `I press`) does not: tag the scenario `@still-after-steps`, or add `When I wait for the
  page to be still` after it.
- **Links send no request when they are used:** the app fetched the view's code ahead for the links on the
  screen. Never assert a navigation by a request; `Then the view should have changed in place` reads what
  happened to the document.
- **The announcer follows the page's title, not the navigation:** Nuxt's announcer says the title each time the
  page's head is rendered. Give every view a title of its own (`useHead({ title })`), or two views announce the
  same.
- **An error page has no announcer:** Nuxt draws it without `app.vue`. A missing view reached inside the app
  shows the error page while the announcer, if any, still says an earlier title: assert the error with `Then
  the view should be the 404 error page`, never with the announcement.
- **A form turned down says why in an alert** (`role="alert"`). With JavaScript its answer is a 4xx, and the
  browser logs it as an error: keep webship-js's error mode at `warn` for a scenario that expects a refusal.
  Without JavaScript the server sends the browser back to the form, and the alert says it.
- **A view drawn in the browser only** (`ssr: false`) is empty without JavaScript: tag its scenario
  `@needs-javascript`.
- **No pages, no router:** an app without `app/pages/` (the official starter alone) answers every address with its
  `app.vue` and the status 200. An unknown address shows the error page only once the app has pages.
- **Two lanes.** `@needs-javascript` for a scenario that holds only with JavaScript, `@no-javascript` for one
  that holds only without it; never `@javascript`, which webship-js reads as "fail on any browser error".
- **No fixed waits.** The steps wait on the app's own signals; a Then step waits for what it expects.

## The examples

Three features that pass, each against the app it names:

- [`examples/views.feature`](examples/views.feature): the demo template
  (`bash cmd-vue-project.sh nxapp --install`), its views, its data and the browser's back.
- [`examples/contact.feature`](examples/contact.feature): the demo's contact form, taken and turned down (the
  same app).
- [`examples/starter.feature`](examples/starter.feature): the official starter alone
  (`bash cmd-vue-project.sh nxmin --template minimal --install`), its welcome page, at any address.

## The book

For any automated functional testing in this work (a Gherkin feature, a step definition, choosing a
step, a test run and its failures), read the book *Automated Functional Testing Recipes* first.

- **Where.** Use the first that exists: `.claude/automated-functional-testing-recipes/` in the project,
  `~/.claude/automated-functional-testing-recipes/` (installed by webship/webship-js-ai-agent,
  webship/webship-js-skills or webship/ai-agents), or
  https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
- **How.** Its `README.md` first, then the chapter that matches the task (one file per chapter,
  named by its subject), not the single complete file.
- **Which wins.** The installed webship-js package and the step pack are the source of truth for
  step phrasing. When they differ from the book, follow them and say so.
- **For Vue.** Start with `ch27-testing-spa.md` (an app that changes its views without page loads),
  `ch07-waiting-dynamic-content.md` (why a wait names its signal, never a time),
  `ch15-accessibility-testing.md` (names a person reads, the announcement of a new view) and
  `ch21-when-tests-go-bad.md` (flaky, brittle and slow scenarios).
