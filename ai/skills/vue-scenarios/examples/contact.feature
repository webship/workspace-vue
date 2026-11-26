Feature: The demo's contact form
  The form posts to a server route without JavaScript, and is sent in place with it; a message too short is turned
  down with an alert. Built with `bash cmd-vue-project.sh nxapp --install`, at the address of the app.

  Background:
    Given I am on "/contact"
    And I fill in "Your name" with "Ada"

  @critical
  Scenario: A message is taken, in place
    When I fill in "Your message" with "Hello from the scenarios of the skill."
    And I send the form with the "Send" button
    Then the form should have been sent in place
    And the form should have gone through
    And I should see "Thanks, Ada: your message was sent."

  Scenario: A message too short is turned down, and says why
    When I fill in "Your message" with "Too short"
    And I send the form with the "Send" button
    Then the form should have been turned down with "Your message needs at least 10 characters."

  # The counter of the home page changes in place: the steps of webship-js do not wait for the app, the tag does, after
  # each step.
  @still-after-steps
  Scenario: A count that changes in place
    Given I am on the homepage
    When I press "Add one to the count" by attr
    Then I should see "1" in the "#count" element
