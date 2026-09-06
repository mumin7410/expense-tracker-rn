const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Signs release builds with a real upload key instead of the debug key Expo
 * defaults to.
 *
 * The credentials are read from the environment at build time, never written
 * into a file: `android/` is regenerated on every prebuild, so anything baked
 * in here would be recreated on a machine that has no business holding the key.
 *
 * Missing environment fails the build on purpose. The alternative — quietly
 * falling back to the debug key — produces an APK that installs and runs and
 * looks completely fine, and that can never be updated because Play and Android
 * both key updates on the signing certificate. A build that stops is cheap; a
 * debug-signed APK in someone's hands is not.
 *
 *   SLIP_KEYSTORE_PATH, SLIP_KEYSTORE_PASSWORD, SLIP_KEY_ALIAS, SLIP_KEY_PASSWORD
 */
// `signingConfigs` is evaluated while configuring *any* build, so an
// unconditional throw here breaks `expo run:android` for everyone doing normal
// development. The check therefore only fires when a release task was actually
// asked for; a debug build gets the debug values it was always going to use.
const SIGNING_CONFIG = `
        release {
            def ksPath = System.getenv("SLIP_KEYSTORE_PATH")
            def wantsRelease = gradle.startParameter.taskNames.any {
                it.toLowerCase().contains("release")
            }
            if (!ksPath && wantsRelease) {
                throw new GradleException(
                    "SLIP_KEYSTORE_PATH is not set. A release build needs the upload key; " +
                    "source your keystore env file first (see docs/release.md). " +
                    "Refusing to fall back to the debug key.")
            }
            storeFile file(ksPath ?: 'debug.keystore')
            storePassword ksPath ? System.getenv("SLIP_KEYSTORE_PASSWORD") : 'android'
            keyAlias ksPath ? System.getenv("SLIP_KEY_ALIAS") : 'androiddebugkey'
            keyPassword ksPath ? System.getenv("SLIP_KEY_PASSWORD") : 'android'
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('SLIP_KEYSTORE_PATH')) return config;

    // Add the release entry alongside the generated `debug` one.
    const signingConfigs = /signingConfigs\s*\{/;
    if (!signingConfigs.test(contents)) {
      throw new Error('with-release-signing: no signingConfigs block in app/build.gradle');
    }
    contents = contents.replace(signingConfigs, (match) => `${match}${SIGNING_CONFIG}`);

    // Point buildTypes.release at it. Expo generates this pointing at `debug`,
    // which is the whole problem being fixed.
    const releaseBuildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/;
    if (!releaseBuildType.test(contents)) {
      throw new Error(
        'with-release-signing: buildTypes.release does not use signingConfigs.debug — ' +
          'the generated gradle changed shape, re-check this plugin'
      );
    }
    contents = contents.replace(releaseBuildType, '$1signingConfigs.release');

    config.modResults.contents = contents;
    return config;
  });
};
