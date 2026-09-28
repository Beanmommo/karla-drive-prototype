# Android deployment

Decision recorded on 28 September 2026. Status: planned.

Integrate Google Maps for Android, then prepare Karla Drive for Android release once the complete practice flow is verified on a physical Android device.

## Map integration

- Use Google Maps through the existing `react-native-maps` component to display generated routes and recorded traces on Android.
- Keep Mapbox for route generation and map matching, reusing the existing route geometry and stop markers.
- Open the Google Maps app for Android navigation, with platform-specific button labels, artwork, and map attribution. Keep Apple Maps on iPhone.
- Enable Maps SDK for Android in Google Cloud and configure its API key through Expo's `react-native-maps` config plugin. Restrict the key to `com.karladrive.prototype`, the appropriate signing certificate fingerprints, and the Maps SDK for Android. Supply the key to the EAS build environment and rebuild the Android binary.

## Release milestone

Google Maps integration is the next Android release milestone. The current Practice flow is restricted to iPhone, so release readiness also requires enabling and verifying Android foreground/background location, foreground-service notifications, and the practice entry flow.

Verify route preview, Google Maps handoff, recording while Maps is open or the screen is locked, Stop, review, saved history, and app restart on a physical Android device. Once these checks pass, prepare the Android release build and distribution through EAS.

This note records the intended release path; Google Maps integration and Android release have not yet been completed.

## References

- [Expo SDK 57: react-native-maps](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/)
- [Google Maps SDK for Android setup](https://developers.google.com/maps/documentation/android-sdk/get-api-key)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Current practice implementation](practice-sessions.md)
