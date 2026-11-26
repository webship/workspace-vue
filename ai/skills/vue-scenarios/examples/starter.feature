Feature: The official starter
  The one welcome page of Nuxt's official starter. Built with `bash cmd-vue-project.sh nxmin --template minimal
  --install`, at the address of the app.

  # The welcome page says its name in the page's title only: its heading is a logo and a release number.
  @critical
  Scenario: The page is wired up by the app
    Given I am on the homepage
    When I wait until the page title contains "Welcome to Nuxt"
    Then the page should be wired up
    And I should see "Get started"

  # The starter has no pages folder, so it has no router: its app.vue answers every address, with the status 200.
  # An error page for an unknown address comes with the app's first page in app/pages/.
  Scenario: Every address shows the welcome page
    Given I am on "/no-such-page"
    Then the response status code should be 200
    And the page should be wired up
    And I should see "Get started"
