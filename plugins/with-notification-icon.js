const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * notifee's default smallIcon falls back to the full-colour launcher icon,
 * which Android draws as a plain white blob in the status bar. Copies the
 * existing monochrome adaptive-icon layer in as a proper single-colour
 * notification icon instead of shipping a second source asset.
 */
module.exports = function withNotificationIcon(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/drawable'
      );
      fs.mkdirSync(resDir, { recursive: true });
      fs.copyFileSync(
        path.join(config.modRequest.projectRoot, 'assets/images/android-icon-monochrome.png'),
        path.join(resDir, 'ic_stat_notify.png')
      );
      return config;
    },
  ]);
};
