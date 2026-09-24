import Constants from 'expo-constants';

export function mapboxToken(): string {
  const token: unknown = Constants.expoConfig?.extra?.mapboxAccessToken;
  return typeof token === 'string' && token.startsWith('pk.') ? token : '';
}
