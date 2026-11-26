Feature: A Nuxt app on Docker Compose, Podman and Kubernetes
  The builder builds on DDEV by default, and with --runtime on Docker Compose, Podman or a Kubernetes cluster. An app
  built there has the row a DDEV project has: its state, its own address and the runtime's menu, and its own server
  serves it.

  # Each scenario drives a real app of that runtime, built with cmd-vue-project.sh --runtime: the first running one
  # the workspace holds. Without one it is skipped, with the reason. In the plugin's CI the Docker Compose app is the
  # one the manifest's featuresSite builds: the demo template, ci-vue.

  @needs-runtime-docker @needs-platform-vue
  Scenario: A Nuxt app built on Docker Compose runs at its own address, with the DOCKER menu
    Given I am on the folder of the "docker" site
     Then the row of the "docker" site should show "Running"
      And the row of the "docker" site should link to the address of its runtime
      And the address of the "docker" site should answer
      And the row of the "docker" site should carry the "DOCKER" menu and no DDEV menu

  # The app wires the server's page up in the browser once its scripts have run: the route announcer the starter's
  # app.vue renders (Nuxt's <NuxtRouteAnnouncer />) is there from then on, and not in the server's HTML.
  @needs-runtime-docker @needs-platform-vue
  Scenario: The app on Docker Compose is the built Nuxt app, and it wires its page up
    Given I am on the folder of the "docker" site
     When I open "/" on the "docker" site
     Then ".nuxt-route-announcer" should be attached within 30 seconds

  @needs-runtime-podman @needs-platform-vue
  Scenario: A Nuxt app built on Podman runs at its own address, with the PODMAN menu
    Given I am on the folder of the "podman" site
     Then the row of the "podman" site should show "Running"
      And the row of the "podman" site should link to the address of its runtime
      And the address of the "podman" site should answer
      And the row of the "podman" site should carry the "PODMAN" menu and no DDEV menu

  @needs-runtime-podman @needs-platform-vue
  Scenario: The app on Podman is the built Nuxt app, and it wires its page up
    Given I am on the folder of the "podman" site
     When I open "/" on the "podman" site
     Then ".nuxt-route-announcer" should be attached within 30 seconds

  @needs-runtime-kubernetes @needs-platform-vue
  Scenario: A Nuxt app built on Kubernetes runs at the address of its node, with the K8S menu
    Given I am on the folder of the "kubernetes" site
     Then the row of the "kubernetes" site should show "Running"
      And the row of the "kubernetes" site should link to the address of its runtime
      And the address of the "kubernetes" site should answer
      And the row of the "kubernetes" site should carry the "K8S" menu and no DDEV menu

  @needs-runtime-kubernetes @needs-platform-vue
  Scenario: The app on Kubernetes is the built Nuxt app, and it wires its page up
    Given I am on the folder of the "kubernetes" site
     When I open "/" on the "kubernetes" site
     Then ".nuxt-route-announcer" should be attached within 30 seconds
