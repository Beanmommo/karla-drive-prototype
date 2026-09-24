import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const token = process.env.MAPBOX_ACCESS_TOKEN ?? process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
  if (token && !token.startsWith('pk.')) {
    throw new Error('Mapbox requires a public pk. token. Never include a secret token in the mobile app.');
  }
  return {
    ...config,
    name: config.name ?? 'Karla Drive',
    slug: config.slug ?? 'karla-drive-prototype',
    extra: { ...config.extra, mapboxAccessToken: token },
    plugins: [
      // Mods execute in reverse registration order; remove APNs last.
      ...(process.env.KARLA_PERSONAL_TEAM === '1' ? ['./plugins/withPersonalTeam'] : []),
      ...(config.plugins ?? []),
    ],
  };
};
