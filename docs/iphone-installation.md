# Install on a personal iPhone

This builds a standalone Release app locally with a free Apple Personal Team.
It does not require a simulator, EAS, TestFlight, or a paid Apple membership.
Free provisioning expires after seven days; rebuild and reinstall to renew it.

On 24 September 2026, the Release app was built with Xcode 27.0, installed on
an iPhone 13 running iOS 26.6.1, and launched after trusting the Personal Team
profile. That profile expires on 1 October 2026. The installed app includes
its JavaScript and Mapbox configuration, uses device-only demo storage, and
has background location enabled. Lint, typecheck, and code-signature checks
passed. GPS recording on an actual drive still requires device testing.

## Mac and iPhone setup

- Use Xcode 26.4 or newer for Expo SDK 57, and Node 24 with npm.
- Sign in through Xcode Settings → Accounts. Under your Personal Team, use
  Manage Certificates → + → Apple Development to create a signing identity.
- Connect the iPhone by USB, trust the Mac, and enable Developer Mode under
  Settings → Privacy & Security. Keep the phone unlocked during installation.
- Confirm the active Xcode and device with `xcodebuild -version` and
  `xcrun devicectl list devices`.

## Build and install

From the repository root, in a terminal dedicated to the phone build:

```sh
source "$HOME/.nvm/nvm.sh"
nvm use 24

export KARLA_PERSONAL_TEAM=1
export EXPO_PUBLIC_SUPABASE_URL=
export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

npm run lint
npx tsc --noEmit
npx expo prebuild --clean --platform ios
npx expo run:ios --device --configuration Release --no-bundler
```

Choose the connected physical iPhone when prompted. Expo generates `ios/` and
configures automatic signing using the installed development certificate.
The clean prebuild regenerates only the iOS project so Expo performs signing
setup again, including renewing an expired free provisioning profile. Do not
edit the generated native project by hand.

`KARLA_PERSONAL_TEAM=1` enables a config plugin that removes the APNs push
entitlement added by `expo-notifications`. The app's local notifications and
background location remain enabled. Omit this flag for normal EAS builds.
Run prebuild again when switching modes so generated entitlements match.

The empty Supabase variables override any local development connection and
use the app's existing on-device demo storage. Existing simulator or Supabase
records are not copied to the phone. Use a hosted Supabase URL and publishable
key instead if cloud persistence is wanted later.

Mapbox routing and road matching require a public `pk.` token. Supply
`MAPBOX_ACCESS_TOKEN` in the build shell or the ignored `.env.local` on the Mac.
Configuration is embedded at build time; the installed app does not read an
environment file or connect to Metro. Route generation still needs internet.

If iOS reports an untrusted developer, trust the development identity under
Settings → General → VPN & Device Management, then reopen the app. Allow
notifications and the requested precise/background location access when
testing practice recording.

## Verify

Open Karla Drive from its Home Screen icon, enter Demo access, and create a
learner. Disconnect the USB cable and confirm the app can be closed and
reopened. Check generated routes with internet access and confirm a saved
practice session remains after restarting the app.

References: [Expo local builds](https://docs.expo.dev/guides/local-app-development/),
[Developer Mode](https://docs.expo.dev/guides/ios-developer-mode/), and
[Apple Personal Team limits](https://developer.apple.com/help/account/basics/about-your-developer-account).
