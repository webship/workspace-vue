Feature: The views of the demo template
  The official starter with the step pack's demo pages: a home page with a counter, an about page, posts loaded
  from the server, a contact form and a page drawn in the browser only. Built with `bash cmd-vue-project.sh nxapp
  --install`, at the address of the app.

  @critical
  Scenario: A link changes the view in place, is announced, and marks the current link
    Given I am on the homepage
    And the page is wired up
    When I use the "Posts" link
    Then the view should have changed in place
    And the new view should be announced as "Posts"
    And the "Posts" link should be marked current
    And the view's address should be "/posts"

  Scenario: A view with data of its own, and the browser's back
    Given I am on "/posts"
    When I use the "Moving between pages" link
    Then the view should have changed in place
    And the new view should be announced as "Moving between pages"
    When I return to the previous view
    Then the view's address should be "/posts"

  # The latest post has no address of its own: a route middleware sends /posts/latest on to it.
  Scenario: A link whose view the app redirects ends where it was sent
    Given I am on "/posts"
    When I use the "The latest post" link
    Then the view should have changed in place
    And the view's address should be "/posts/3"
    And the new view should be announced as "Forms"

  Scenario: Data loaded again
    Given I am on "/posts"
    When I press "Load the posts again"
    And I wait for the view's data to arrive
    Then I should see "success" in the "#status" element

  Scenario: A page drawn in the browser only
    Given I am on "/client-only"
    Then the page should have been drawn in the browser only
    And I should see "rendered in the browser"
