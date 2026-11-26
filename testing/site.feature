Feature: The app answers, changes its views and takes its form
  As the owner of the app
  I want its pages to open, its links to change the view in place and its form to answer
  So that a build that came out broken is caught before anything else is tested

  # Placed by the workspace's testing setup for the demo template, as a starting point: it is yours to change. The
  # steps wait for the app to wire each page up, follow a change of view to the end of its navigation, and send the
  # form the way the app does.

  @critical
  Scenario: The home page is wired up by the app
    Given I am on the homepage
    Then the page should be wired up
    And I should see "Welcome to the demo"

  @critical
  Scenario: A link changes the view in place, and the new view is announced
    Given I am on the homepage
    When I use the "Posts" link
    Then the view should have changed in place
    And the new view should be announced as "Posts"
    And the "Posts" link should be marked current

  @critical
  Scenario: A message is taken
    Given I am on "/contact"
    When I fill in "Your name" with "Ada"
    And I fill in "Your message" with "Hello from the first feature."
    And I send the form with the "Send" button
    Then the form should have gone through

  Scenario: A message too short is turned down
    Given I am on "/contact"
    When I fill in "Your name" with "Ada"
    And I fill in "Your message" with "Too short"
    And I send the form with the "Send" button
    Then the form should have been turned down with "Your message needs at least 10 characters."

  Scenario: A post that does not exist shows the error page
    Given I am on "/posts/9"
    Then the view should be the 404 error page saying "Post not found"
