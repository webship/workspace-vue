#!/usr/bin/env bash

# Vue for the Webship Workspace: make a Nuxt app with the official starter (or take one from its repository), build
# it and serve it from a container of its own, and wire the Vue step pack into the testing setup of that app.
#
# Placed by `plugins.sh --install vue` in core/scripts/plugins/vue/functions/, where bootstrap sources it after the
# core's own functions. Everything runs in the project's containers, never on the host: Node.js is the app's
# language and runs in the app's own container, where the app is made (Nuxt's create tool, `nuxi init`, pinned),
# built (`nuxt build`) and served by its own Nitro server (`node .output/server/index.mjs`).
#   - DDEV (the default): a project with DDEV's generic web server and the Node.js of the workspace rule in its web
#     container; the app's server is a daemon of the web container, and the router sends the project's address to it
#     (.ddev/config.vue.yaml).
#   - Docker Compose, Podman and Kubernetes (--runtime docker, podman, kubernetes): the language stack of the core's
#     runtime layer (webship/workspace#841): Node.js's own image at the same major version (rt_stack node), and the
#     app's server as the web container's own (rt_serve); at http://127.0.0.1:<port>, or on Kubernetes (kind) at the
#     node's address and a NodePort, the project's folder mounted from the host. There is no database, so Kubernetes
#     needs core 1.0.35 or newer (webship/workspace#884).
# Lando and Docksal are not proven for it yet: asked for one, the builder says so and changes nothing.
#
# The project's folder: app/ (the Nuxt app: the official starter, the starter with the demo pages of the Vue step
# pack, or a repository cloned with --source) and app/.output/ (the built server, which is served). There is no
# database.
#
# The container tool has no project type for Nuxt, so a project of this builder is recognised by its mark
# (.ddev/config.vue.yaml on DDEV, `platform: vue` in compose.yaml elsewhere), and four names are the ones the core's
# tools look for:
#   set_vue_users          an empty list: the app has no accounts of the workspace's  (cmd-tools-add-users.sh)
#   add_vue_users          says so, and adds nothing                                    (the same tool)
#   cancel_vue_users       says so, and removes nothing                                 (cmd-tools-cancel-users.sh)
#   testing_configure_vue  the step pack in the testing stack                           (cmd-tools-testing.sh)

# The step pack an app is tested with, and the release line it is required at.
readonly VUE_STEPS_PACKAGE='@webship-js/vue-steps';
readonly VUE_STEPS_VERSION='^2.0.0';

# The release of the step pack whose demo pages the demo template takes: pinned, so the demo the builder makes is the
# one that pack's features were proven on.
readonly VUE_DEMO_PACK_VERSION='2.0.0';

# Nuxt's create tool (https://github.com/nuxt/cli), at the release the builder is proven with.
readonly VUE_NUXI_VERSION='4.1.0';

# Node.js, the app's language, at the major version of the workspace rule: DDEV's web container on DDEV, the stack's
# image (node:<version>-bookworm-slim) on another runtime.
readonly VUE_NODE_VERSION='24';

# The port the app's server listens on in the web container, and the app's folder.
readonly VUE_PORT='3000';
readonly VUE_APP='app';

# The templates a new app can be made from, and the runtimes an app is built on.
readonly VUE_TEMPLATES='demo minimal';
readonly VUE_RUNTIMES='ddev docker podman kubernetes';

# The app has no accounts of the workspace's: the list is empty.
function set_vue_users() {
  users=();
}

# The runtime of the project in this folder, or of a new build (--runtime, else the workspace's setting, else DDEV).
# A core without the runtime layer has DDEV only.
function vue_runtime() {
  if declare -f runtime_of > /dev/null ; then runtime_of ; else echo 'ddev' ; fi
}

# The address of the app in this folder: https://<name>.ddev.site on DDEV, http://127.0.0.1:<port> on Docker Compose
# and Podman, the node's address and a port on Kubernetes. Asked after `ddev config`.
function vue_url() {
  if declare -f rt_url > /dev/null ; then rt_url ; else echo "https://${PROJECT_NAME}.ddev.site" ; fi
}

# The project's folder in the web container.
function vue_root() {
  echo '/var/www/html' ;
}

# Is this folder a project of the Vue builder? On DDEV the builder leaves .ddev/config.vue.yaml in it; on another
# runtime it claims the project (`platform: vue` in the x-webship block).
function vue_is_project() {
  local project_path="$1";
  [ -f "${project_path}/.ddev/config.vue.yaml" ] && return 0 ;
  declare -f rt_is_platform > /dev/null && rt_is_platform "${project_path}" vue ;
}

# The command that serves the built app once it is there: Nuxt's own Nitro server, on VUE_PORT. No space before a `;`:
# in the supervisor configuration DDEV writes from it, " ;" starts a comment.
function vue_serve_command() {
  local root ; root="$(vue_root)" ;
  echo "while [ ! -f ${root}/${VUE_APP}/.output/server/index.mjs ]; do sleep 2; done; cd ${root}/${VUE_APP} && exec env PORT=${VUE_PORT} HOST=0.0.0.0 node .output/server/index.mjs" ;
}

# What DDEV is told about the app: the router sends the project's address to the app's server, which the web container
# runs as a daemon. The file also marks the project as one of this builder.
function vue_write_ddev_config() {
  local project_path="$1" made="$2" ;
  mkdir -p "${project_path}/.ddev" || return 1 ;
  cat > "${project_path}/.ddev/config.vue.yaml" <<YAMLEOF
# A Nuxt app in this project. Written by the Vue builder of the workspace; build again rather than editing by hand.
# The web container serves no files of its own: the router sends ports 80 and 443 of the project's address to the
# app's server, a daemon of the web container that runs the built app (${VUE_APP}/.output) with Nuxt's own server once
# it is there.
# app: ${made}
web_extra_exposed_ports:
  - name: vue
    container_port: ${VUE_PORT}
    http_port: 80
    https_port: 443
web_extra_daemons:
  - name: vue
    command: "bash -c '$(vue_serve_command)'"
    directory: $(vue_root)
YAMLEOF
}

# On another runtime than DDEV (webship/workspace#841): the plugin's claim, Node.js's own image as the stack, and the
# app's server as the web container's own, once the app is built.
function vue_runtime_config() {
  rt_claim vue || return 1 ;
  rt_stack node "${VUE_NODE_VERSION}" || return 1 ;
  rt_serve "${VUE_PORT}" "$(vue_serve_command)" ;
}

# Wait until the app's server answers (any answer of HTTP: an app of your own may ask for a sign-in at its root).
function vue_wait() {
  local attempt ;
  for attempt in $(seq 1 60) ; do
    if ddev exec "curl -sS -o /dev/null http://127.0.0.1:${VUE_PORT}/" < /dev/null > /dev/null 2>&1 ; then
      return 0 ;
    fi
    sleep 2 ;
  done
  echo "The app's server does not answer." ;
  return 1 ;
}

# The package manager of an app from its lock file: npm (package-lock.json, or none), pnpm or yarn, the last two through
# Node.js's corepack. Bun is not in the app's container.
function vue_package_manager() {
  local app="$1" ;
  if [ -f "${app}/pnpm-lock.yaml" ] ; then echo 'pnpm' ;
  elif [ -f "${app}/yarn.lock" ] ; then echo 'yarn' ;
  elif [ -f "${app}/bun.lock" ] || [ -f "${app}/bun.lockb" ] ; then echo 'bun' ;
  else echo 'npm' ; fi
}

# The command line of a package manager in the container: pnpm and yarn through corepack, without its prompt.
function vue_pm() {
  case "$1" in
    npm) echo 'npm' ;;
    *) echo "COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack $1" ;;
  esac
}

# The app in app/: a new one of Nuxt's create tool (the official starter; the demo template puts the demo pages of the
# Vue step pack over it, at the pack's pinned release), or the folder of a repository. An app of your own must be a Nuxt
# app whose packages are its own (not those of a workspace of its repository).
function vue_get_app() {
  local project_path="$1" template="$2" source="$3" ref="$4" app_path="$5" root ;
  root="$(vue_root)" ;
  if [ -z "${source}" ] ; then
    echo "Making a new app with Nuxt's create tool (nuxi ${VUE_NUXI_VERSION}): its official starter." ;
    ddev exec -d "${root}" "CI=true npx --yes nuxi@${VUE_NUXI_VERSION} init ${VUE_APP} --template minimal --packageManager npm --no-gitInit --no-install" < /dev/null \
      || { echo "nuxi init failed." ; return 1 ; } ;
    if [ "${template}" = 'demo' ] ; then
      echo "Putting the demo pages of ${VUE_STEPS_PACKAGE} ${VUE_DEMO_PACK_VERSION} over the starter." ;
      ddev exec -d "${root}" "rm -rf /tmp/vue-demo && mkdir -p /tmp/vue-demo && cd /tmp/vue-demo && npm pack --silent ${VUE_STEPS_PACKAGE}@${VUE_DEMO_PACK_VERSION} > /dev/null && tar -xzf ./*.tgz && test -d package/demo && cp -a package/demo/. ${root}/${VUE_APP}/ && rm -rf /tmp/vue-demo" < /dev/null \
        || { echo "The demo pages of ${VUE_STEPS_PACKAGE} ${VUE_DEMO_PACK_VERSION} could not be taken from npm." ; return 1 ; } ;
    fi
    echo "Installing the app's packages with npm." ;
    ddev exec -d "${root}/${VUE_APP}" "npm install --no-audit --no-fund" < /dev/null \
      || { echo "npm install failed." ; return 1 ; } ;
    return 0 ;
  fi
  echo "Getting the app: ${source}${ref:+ at ${ref}}${app_path:+, its folder ${app_path}/}" ;
  ddev exec "rm -rf /tmp/vue-source && git clone --quiet --depth 1 ${ref:+--branch '${ref}'} '${source}' /tmp/vue-source" < /dev/null \
    || { echo "The app could not be cloned from ${source}${ref:+ at ${ref}}." ; return 1 ; } ;
  ddev exec "test -f '/tmp/vue-source/${app_path:+${app_path}/}package.json' && mkdir -p ${root}/${VUE_APP} && cp -a '/tmp/vue-source/${app_path:+${app_path}/}.' ${root}/${VUE_APP}/ && rm -rf ${root}/${VUE_APP}/.git" < /dev/null \
    || { echo "${source}${app_path:+ (${app_path}/)} has no package.json: it is not the folder of an app." ; return 1 ; } ;
  ddev exec "rm -rf /tmp/vue-source" < /dev/null ;
  local app="${project_path}/${VUE_APP}" ;
  if ! grep -q '"nuxt"' "${app}/package.json" ; then
    echo "${source}${app_path:+ (${app_path}/)} is not a Nuxt app (its package.json does not list nuxt): this builder makes and serves Nuxt apps." ;
    return 1 ;
  fi
  if grep -q '"workspace:' "${app}/package.json" ; then
    echo "The app takes packages of a workspace of its repository (\"workspace:\" in its package.json), which are not copied with it: build it from a repository of its own." ;
    return 1 ;
  fi
  local pm ; pm="$(vue_package_manager "${app}")" ;
  if [ "${pm}" = 'bun' ] ; then
    echo "The app is installed with Bun (its lock file), which is not in the app's container: npm, pnpm and yarn are." ;
    return 1 ;
  fi
  echo "Installing the app's packages with ${pm}." ;
  ddev exec -d "${root}/${VUE_APP}" "$(vue_pm "${pm}") install" < /dev/null \
    || { echo "${pm} install failed." ; return 1 ; } ;
}

# Build an app from nothing: the project and its container, the app, its build, and with --install the app served and
# checked.
function vue_build() {
  trim_project_name ;
  local base_url runtime ;
  runtime="$(vue_runtime)" ;
  if [ "${RUNTIME:-_none_}" != '_none_' ] && [ "${RUNTIME}" != "${runtime}" ] ; then
    echo "--runtime ${RUNTIME} needs a Webship Workspace with the container runtimes (webship/workspace#694): update the workspace, or build on DDEV." ;
    exit 1 ;
  fi
  case " ${VUE_RUNTIMES} " in
    *" ${runtime} "*) ;;
    *) echo "A Nuxt app builds on DDEV, Docker Compose, Podman and Kubernetes for now (--runtime ddev, docker, podman or kubernetes), not on ${runtime}: that runtime is not proven for it yet. Nothing was changed." ; exit 1 ;;
  esac
  if [ "${runtime}" != 'ddev' ] && ! declare -f rt_serve > /dev/null ; then
    echo "Vue on ${runtime} needs a Webship Workspace whose runtimes take an application's own language and server (webship/workspace#841, core 1.0.32 or later): update the workspace, or build on DDEV." ;
    exit 1 ;
  fi
  local source="${SOURCE:-${app_source:-}}" ;
  local ref="${REF:-${app_source_ref:-}}" ;
  local app_path="${APP_PATH:-${app_source_path:-}}" ;
  local template="${TEMPLATE:-_none_}" ;
  [ "${template}" = '_none_' ] && template='' ;
  if [ -n "${template}" ] && [ -n "${source}" ] ; then
    echo "--template makes a new app, and --source takes an app of your own: give one of them. Nothing was changed." ;
    exit 1 ;
  fi
  [ -z "${source}" ] && template="${template:-demo}" ;
  case " ${VUE_TEMPLATES} " in
    *" ${template:-demo} "*) ;;
    *) echo "--template takes demo or minimal: the official starter with the step pack's demo pages, or the starter alone. Nothing was changed." ; exit 1 ;;
  esac
  if [ -n "${app_path}" ] && [ -z "${source}" ] ; then
    echo "--path names a folder of the repository given with --source: give --source too. Nothing was changed." ;
    exit 1 ;
  fi
  if [[ "${app_path}" == /* ]] || [[ "/${app_path}/" == */../* ]] || [[ "${app_path}" == *"'"* ]] || [[ "${source}${ref}" == *"'"* ]] ; then
    echo "--source, --ref and --path take a repository, a branch or tag, and a folder inside the repository. Nothing was changed." ;
    exit 1 ;
  fi
  if [ ${#PROJECT_NAME} -gt 40 ] || ! [[ "${PROJECT_NAME}" =~ ^[a-z0-9][a-z0-9-]*$ ]] ; then
    echo "The project name ${PROJECT_NAME} must be small letters, digits and dashes (its address and its containers take it). Nothing was changed." ;
    exit 1 ;
  fi
  local project_path="${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME}" ;
  local root ; root="$(vue_root)" ;
  local made ;
  if [ -n "${source}" ] ; then made="${source}${ref:+ (${ref})}${app_path:+, ${app_path}/}" ;
  elif [ "${template}" = 'demo' ] ; then made="the official starter of nuxi ${VUE_NUXI_VERSION}, with the demo pages of ${VUE_STEPS_PACKAGE} ${VUE_DEMO_PACK_VERSION}" ;
  else made="the official starter of nuxi ${VUE_NUXI_VERSION}" ; fi

  cd ${WORKSPACE_ROOT}/${doc_name} || exit 1 ;

  # A project of the same name goes first, with its containers.
  drop_database ;
  rm -rf "${PROJECT_NAME:?}" ;
  mkdir -p "${PROJECT_NAME}" ;
  cd "${project_path}" || exit 1 ;

  # A generic web server, no database, and Node.js in the app's container: the app's own server serves it.
  if [ "${runtime}" == 'ddev' ] ; then
    ddev config --project-type=generic --webserver-type=generic --docroot="" --project-name=${PROJECT_NAME} \
      --omit-containers=db --nodejs-version=$(ddev_nodejs_version) < /dev/null || exit 1 ;
    vue_write_ddev_config "${project_path}" "${made}" || exit 1 ;
  else
    # The runtime's own project: Docker Compose, Podman or Kubernetes, through the runtime layer.
    ddev config --project-type=generic --webserver-type=generic --docroot="" --project-name=${PROJECT_NAME} \
      --omit-containers=db --auto < /dev/null || exit 1 ;
    vue_runtime_config || { echo "The app's stack could not be written through the runtime layer." ; exit 1 ; } ;
  fi
  # The address is the runtime's to say, once the project is configured: never a written ddev.site.
  base_url="$(vue_url)" ;

  echo "Starting the project: Node.js ${VUE_NODE_VERSION} in the app's container." ;
  ddev_up start -y < /dev/null || exit 1 ;

  vue_get_app "${project_path}" "${template}" "${source}" "${ref}" "${app_path}" || exit 1 ;

  local pm ; pm="$(vue_package_manager "${project_path}/${VUE_APP}")" ;
  echo "Building the app: ${pm} run build." ;
  ddev exec -d "${root}/${VUE_APP}" "$(vue_pm "${pm}") run build" < /dev/null \
    || { echo "The app's build failed." ; exit 1 ; } ;
  if [ ! -f "${project_path}/${VUE_APP}/.output/server/index.mjs" ] ; then
    echo "The build left no ${VUE_APP}/.output/server/index.mjs: the app is not built for Nuxt's own server (a static or another preset?)." ;
    exit 1 ;
  fi

  [ "${ADD_USERS}" == 'yes' ] && echo "--add-users: the app has no accounts of the workspace's; nothing is added." ;

  if [ "${INSTALL}" == 'yes' ] ; then
    vue_wait || exit 1 ;
    echo "${doc_name} ${PROJECT_NAME} is served: the Nuxt app in ${VUE_APP}/ (${made}).";
    echo "Go to ${base_url}";
  else
    ddev stop < /dev/null ;
    echo "${doc_name} ${PROJECT_NAME} is ready: the Nuxt app in ${VUE_APP}/ (${made}).";
    if [ "${runtime}" = 'ddev' ] ; then
      echo "Serve it with: cd ${PROJECT_NAME} && ddev start   (or build with --install)";
    else
      echo "Serve it with Start in its row of the dashboard (or build with --install)";
    fi
  fi

  if [ "${LAUNCH}" == 'yes' ] ; then
    ddev launch ;
  fi

  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The app has no accounts of the workspace's: there is nothing to add, and nothing to remove.
function add_vue_users() {
  echo "The Nuxt app has no accounts of the workspace's, so there are none to add." ;
}

function cancel_vue_users() {
  echo "The Nuxt app has no accounts of the workspace's, so there are none to remove." ;
}

# The step pack in the testing stack of an app of this builder. The core's testing_configure calls this in the project
# folder once webship-js is scaffolded and before the dependencies are installed; for a project that is not an app of
# this builder it changes nothing.
#
# It adds the pack to package.json, lists its step definitions in cucumber.js after webship-js's own, and, for the demo
# template, writes a first feature when the project has none of its own. There is no users registry: the app has no
# accounts. Every part is skipped when it is already done, so a second run adds what the first missed and never resets
# a suite. The suite is the project's (its package.json, cucumber.js and tests/ are next to app/, not in it).
function testing_configure_vue() {
  local project_path="$1";
  vue_is_project "${project_path}" || return 0 ;
  if [ ! -f "${project_path}/cucumber.js" ] || [ ! -f "${project_path}/package.json" ] ; then
    echo "  Vue: cucumber.js is not here yet — run the testing setup again once webship-js is scaffolded." ;
    return 1 ;
  fi

  echo "Adding the Vue step pack (${VUE_STEPS_PACKAGE} ${VUE_STEPS_VERSION}).";

  python3 - "${project_path}" "${VUE_STEPS_PACKAGE}" "${VUE_STEPS_VERSION}" <<'PYEOF' || return 1
import json, re, sys

project, pack, version = sys.argv[1:4]

# package.json: the pack as a dev dependency, at the release line this plugin was proven on.
pkg_file = project + '/package.json'
pkg = json.load(open(pkg_file))
if pack not in pkg.get('dependencies', {}) and pack not in pkg.get('devDependencies', {}):
    pkg.setdefault('devDependencies', {})[pack] = version
    open(pkg_file, 'w').write(json.dumps(pkg, indent=2) + '\n')
    print('  package.json: %s %s' % (pack, version))

# cucumber.js: the pack's step definitions after webship-js's own.
cucumber_file = project + '/cucumber.js'
src = open(cucumber_file).read()
before = src

if ('node_modules/%s/' % pack) not in src:
    line = "'node_modules/%s/tests/step-definitions/*.js'," % pack
    core = re.search(r"^([ \t]*)'node_modules/webship-js/tests/step-definitions/[^']*',.*$", src, re.M)
    opening = re.search(r"^([ \t]*)require:[ \t]*\[[ \t]*$", src, re.M)
    if core:
        src = src[:core.end()] + '\n' + core.group(1) + line + src[core.end():]
    elif opening:
        src = src[:opening.end()] + '\n' + opening.group(1) + '  ' + line + src[opening.end():]
    else:
        sys.exit("  cucumber.js has no require list this can add to. Add this line to it:\n    " + line)
    print('  cucumber.js: the step definitions of %s' % pack)

if src != before:
    open(cucumber_file, 'w').write(src)
PYEOF

  # A first feature, for the demo template only (an app of your own has its own names), when the project has none
  # for the app yet.
  local feature="${WORKSPACE_SCRIPTS}/plugins/vue/site.feature" ;
  if [ -f "${feature}" ] && [ ! -f "${project_path}/tests/features/site.feature" ] ; then
    if [ -f "${project_path}/${VUE_APP}/app/pages/contact.vue" ] && [ -f "${project_path}/${VUE_APP}/server/api/contact.post.ts" ] ; then
      mkdir -p "${project_path}/tests/features" && cp "${feature}" "${project_path}/tests/features/site.feature" \
        && echo "  tests/features/site.feature: a first feature for the demo" ;
    else
      echo "  Vue: the app is not the demo template, so no first feature is written: write one from what its pages show." ;
    fi
  fi
}
