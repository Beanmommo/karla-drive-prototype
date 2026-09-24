# Local development and iPhone 16 simulator

Verified on 24 September 2026: the installed Karla Drive development build loads the current checkout on **iPhone 16 / iOS 18.5**, using Metro on port **8091** and local Supabase on port **55321**. Install the new native build on any other simulator before using the Practice feature.

The Practice feature adds native GPS, notifications, SQLite and maps. Install the updated development build before using it; see [practice-sessions.md](practice-sessions.md) for configuration and verification.

## Restart the existing setup

Run these commands from the repository root. Keep Docker Desktop running when using Supabase.

```sh
# This machine has nvm and Node 24 installed.
source "$HOME/.nvm/nvm.sh"
nvm use 24

# Safe to run when this project's database is already running.
npx supabase start

# List available devices; boot iPhone 16 only if it is shut down.
xcrun simctl list devices available
xcrun simctl boot "iPhone 16"
xcrun simctl bootstatus "iPhone 16" -b
open -a Simulator

# Keep this terminal running while using the app.
NODE_OPTIONS=--dns-result-order=ipv4first \
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321 \
npx expo start --dev-client --localhost --port 8091
```

If the device is already booted, skip `simctl boot`. In the Expo terminal, press **Shift+I** and choose **iPhone 16** explicitly; `i` can target a different recently opened simulator. Accept **Open in Karla Drive** if prompted. On a first launch, dismiss the developer-menu introduction and close the developer menu. The app opens with the koala logo and **Demo access** button.

The command overrides only the Supabase URL for this process. It retains the publishable key loaded from `.env.local`, and leaves the saved LAN configuration available for physical-phone development. `NODE_OPTIONS` makes Metro bind to IPv4 loopback: without it, this machine resolved `localhost` to `::1` while Expo generated a `127.0.0.1` launch URL.

For a deterministic launch from another terminal after Metro is ready:

```sh
xcrun simctl openurl "iPhone 16" \
  'exp+karla-drive-prototype://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091'
```

The development build must already be installed; see the installation section below if it is missing. Ordinary JavaScript, TypeScript, and asset changes are served by Metro without building a new binary.

## First-time prerequisites

- macOS, Xcode with its command-line tools selected, and an installed iOS simulator runtime. Check with `xcode-select -p`, `xcodebuild -version`, and `xcrun simctl list devices available`.
- Node 24 and npm. This run used **Node 24.20.0 / npm 11.19.0**, **Expo 57.0.24**, and **React Native 0.86.3**. Use `nvm install 24` if Node 24 is missing.
- Docker Desktop for the local database. It is optional for device-only demo storage.
- Expo account access for downloading or creating EAS development builds.

Install the locked JavaScript dependencies:

```sh
npm ci
```

There is no Bun lockfile in this project. For newly added dependencies, use `npx expo install <package>` to resolve SDK-compatible versions.

This Mac's **Xcode 16.4 / iOS 18.5** can run the existing simulator binary. Compiling SDK 57 locally requires a newer Xcode; the [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) lists Xcode **26.4+**. Use the existing EAS simulator profile to build in the cloud. Native `ios/` and `android/` directories are generated and ignored; configure native behavior in `app.json` and config plugins.

## Local Supabase and environment

From the repository root:

```sh
npx supabase start
npx supabase status
# Copy only if .env.local does not already exist.
test -f .env.local || cp .env.example .env.local
```

Set both variables in the ignored `.env.local` file:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
```

Only the public/publishable key belongs in the app. Do not use a service-role or secret key. Expo embeds `EXPO_PUBLIC_*` values in the client bundle.

| Service | Local address |
| --- | --- |
| Metro | `http://127.0.0.1:8091` |
| Supabase API | `http://127.0.0.1:55321` |
| Postgres | `127.0.0.1:55322` |
| Supabase Studio | `http://127.0.0.1:55323` |

`supabase/config.toml` sets the project ID to `karla-drive-prototype`, enables anonymous sign-in, and disables unused services. The `553xx` ports keep it separate from the other local `learner-drive` project on `543xx`. Run Supabase commands here so they target Karla Drive.

The migrations under `supabase/migrations/` define the local schema. After pulling new migrations into an existing local database, apply them with `npx supabase migration up --local`. Do not use `supabase db reset` as a normal restart: it recreates the database and deletes local records.

To run without Docker, leave **both** variables blank and omit the inline `EXPO_PUBLIC_SUPABASE_URL=...` override from the Metro command. The app then stores demo records in AsyncStorage. A partially configured connection is an error. Stop Metro and restart with `--clear` after switching storage modes.

For a physical phone, use the Mac's current LAN IP for Supabase, run Expo with `--lan` instead of `--localhost`, and keep both devices on the same network. `127.0.0.1` works for this Mac's iOS simulator, but points to the phone itself on a physical device. Android Emulator uses `10.0.2.2` to reach the host. See [learner-demo.md](learner-demo.md) for persistence and anonymous identity details; different simulator installations have separate identities and learner records.

## Install or refresh the native development build

The verified Practice development build is [bc7f5576](https://expo.dev/accounts/karla-drive/projects/karla-drive-prototype/builds/bc7f5576-65cd-401d-bc65-798f83cbab6d), installed on iPhone 16 / iOS 18.5 on 24 September 2026.

The app ID is `com.karladrive.prototype`. `eas.json` already defines **development-simulator**, extending the development profile with `ios.simulator: true`.

Download an existing build using the EAS CLI, selecting the iOS simulator build for that profile:

```sh
npx eas-cli@latest build:run --platform ios --profile development-simulator --simulator "iPhone 16"
```

If no compatible build exists, or native dependencies/configuration changed, create one:

```sh
npx eas-cli@latest build --platform ios --profile development-simulator
```

Accept the simulator-install prompt when the build finishes and select iPhone 16. Then start Metro using the restart command above. An iPhone-device `.ipa` cannot be installed in the simulator; it needs a simulator `.app` build.

Before the Practice feature was added, the existing development `.app` on the booted iPhone 16 Pro was reused. That older binary is no longer sufficient. After both devices have compatible native modules, a simulator app can still be copied this way:

```sh
karla_app_path="$(xcrun simctl get_app_container 'iPhone 16 Pro' com.karladrive.prototype app)"
xcrun simctl install "iPhone 16" "$karla_app_path"
```

Both simulators must be booted for these commands, and the source app must be compatible with the current native dependencies. This copies the binary, not the source simulator's app data. Use a device UDID from `simctl list` instead of its name if several runtimes have identically named devices.

## Verify and troubleshoot

```sh
npm run lint
npx tsc --noEmit
curl http://127.0.0.1:8091/status
curl http://127.0.0.1:55321/auth/v1/health
```

Metro should return `packager-status:running`; the Auth endpoint returns a GoTrue health response. Confirm the app renders in the simulator, then open **Demo access** to reach the demo flow. Lint and typecheck passed during this setup, and the iPhone 16 rendered the learners screen.

- **Could not connect to development server:** keep Metro running, verify port 8091, and open the deep link above. The previous Pro installation remembered port 8081. `lsof -nP -iTCP:8091 -sTCP:LISTEN` should show `127.0.0.1:8091`; an `::1` listener needs the IPv4 `NODE_OPTIONS` setting.
- **Port already occupied:** inspect it with `lsof` and reuse the server only if it belongs to this checkout. If choosing another port, change both the Expo command and the deep link.
- **Missing native module / incompatible runtime:** install a freshly built `development-simulator` binary after native dependency changes. Clearing Metro's cache cannot add native modules to an installed app.
- **Database requests fail:** verify Docker, the `55321` endpoint, the publishable key, and anonymous sign-in. Confirm `.env.local` is not pointing at another machine's old LAN IP.
- **Stop and resume:** Ctrl+C stops Metro. `npx supabase stop` from this repository stops its database services while retaining local data. Do not use `--no-backup` when preserving that data. Restart using the commands above.

## References

- [Expo iOS Simulator guide](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- [EAS builds for iOS Simulator](https://docs.expo.dev/tutorial/eas/ios-development-build-for-simulators/)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
