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

  Scenario: An address the app does not know shows its error page
    Given I am on "/no-such-page"
    Then the view should be the 404 error page saying "Page not found"
    And the response status code should be 404
