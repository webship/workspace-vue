Feature: The Vue plugin on the dashboard
  Once the plugin is activated and installed, the sites folders offer the Vue builder, each AI folder
  lists the items of its kind the plugin ships, and the Plugins page lists the plugin with what it ships.

  # Settings lists every plugin that was added; the package and what the plugin ships are on its own page.
  Scenario: Settings lists the plugin, and its own page names its package and what it ships
    Given I am on "/settings"
     Then I should see "Vue"
     When I go to "/settings/plugin/vue"
     Then I should see "@webship.co/workspace-vue"
      And I should see "cmd-vue-project.sh"
      And I should see "vue-app-builder"

  Scenario: A sites folder offers the Vue builder
    Given I am on "/dev"
     Then "option[value='cmd-vue-project.sh']" should be attached

  # The AI folders are searched by name: with every plugin on, a folder lists more than one page of items.
  Scenario: The AI Agents folder lists the agents the plugin ships
    Given I am on "/ai-agents?q=vue-"
     Then I should see "vue-app-builder"
      And I should see "vue-tester"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills?q=vue-scenarios"
     Then I should see "vue-scenarios"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands?q=vue-test"
     Then I should see "vue-test"

  Scenario: The AI Prompts folder lists the prompts the plugin ships
    Given I am on "/ai-prompts?q=vue-"
     Then I should see "vue-build-and-test"
      And I should see "vue-scenarios-for-an-app"
