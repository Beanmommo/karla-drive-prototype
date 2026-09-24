const { withEntitlementsPlist } = require('expo/config-plugins');

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = function withPersonalTeam(config) {
  // Run after expo-notifications. Local notifications do not need APNs,
  // and free Apple Personal Teams cannot provision its push entitlement.
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
