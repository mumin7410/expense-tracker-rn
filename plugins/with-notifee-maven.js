const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * notifee's own build.gradle tries to add its bundled `android/libs` maven
 * repo to every project via `rootProject.allprojects { repositories { ... } }`,
 * but under Expo's autolinking + configure-on-demand that addition never
 * reaches `:app` — its dependency resolution never sees the repo, so
 * `app.notifee:core:+` fails to resolve. Adding the same repo directly to the
 * root `allprojects` block here is the fix notifee's Android setup docs call
 * for on bare RN; Expo has no equivalent step, and android/build.gradle is
 * regenerated on every prebuild, so it has to happen through a plugin.
 */
module.exports = function withNotifeeMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const marker = '@notifee/react-native/android/libs';
    if (config.modResults.contents.includes(marker)) return config;

    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*{\s*repositories\s*{/,
      (match) => `${match}\n    maven { url "$rootDir/../node_modules/${marker}" }`
    );
    return config;
  });
};
