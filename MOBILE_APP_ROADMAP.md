# Motion Mirror Mobile App Roadmap

## Goal

Turn Motion Mirror from a web coaching tool into a mobile-ready coaching platform, starting with the runner experience.

The first mobile app should solve the biggest current limit:

- reliable GPS while the phone is locked
- reliable GPS while the runner opens music or another app
- better Android/iPhone location permission handling
- better upload retry when cell service is weak

## Best First Version

Build the **Runner mobile app first**.

Keep these as web pages for now:

- Coach dashboard
- Profiles
- Saved run summaries
- Receipt downloads

This avoids rebuilding the whole product at once. The coach view already works well in the browser. The runner side is where native mobile matters.

## Recommended Build Shape

Use the existing Motion Mirror backend as the source of truth.

The mobile runner app should:

1. Open a session from a coach invite link.
2. Ask the runner for location permission.
3. Start/pause/stop a run.
4. Collect native GPS in the background.
5. Send location points to the existing `/api/location` endpoint.
6. Send pause/stop events to the existing `/api/pause` and `/api/stop` endpoints.
7. Show simple runner stats: time, distance, pace, average pace, elevation, connection/tracking status.

The coach dashboard should not need a full rebuild for this first phase.

## Suggested Tech

Use **React Native with Expo** for the runner app.

Why:

- good path for iPhone and Android
- better access to background location than the browser
- easier testing than fully native Swift/Kotlin
- can still talk to the current Node/Postgres backend
- good stepping stone before App Store / Play Store release

Alternative:

- Capacitor can wrap the current web app faster, but background GPS is the whole reason we are going mobile. React Native gives us a cleaner GPS foundation.

## What The Mobile App Needs

### Runner App Screens

- Join session
- Consent / privacy notice
- Free run / track mode start
- Tracking screen
- Pause / stop confirmation
- Connection warning if uploads are delayed

### Native GPS Requirements

- iOS background location permission
- Android foreground service for active tracking
- Android battery optimization warning
- queued location uploads when signal is poor
- retry failed uploads
- keep active elapsed time separate from wall-clock time

### Backend Requirements

The current backend already has the important endpoints:

- `POST /api/location`
- `POST /api/pause`
- `POST /api/stop`
- coach live session events
- saved profiles/runs

Likely backend additions:

- mobile app version field
- device type field: iOS / Android
- location source field: web / native
- last sync age
- runner upload queue count
- better debug data for failed sessions

## Cost Expectations

To test on your own phone:

- Expo development build: usually free
- Android testing: usually free
- iPhone testing on your own device may require an Apple Developer account eventually

To publish publicly:

- Apple Developer Program: about $99/year
- Google Play Console: about $25 one-time
- Render hosting/database: whatever your current Render plan costs
- Optional domain/email/tools later

## First Build Milestone

Milestone 1 should be:

> A private runner app that can join a Motion Mirror session and send native GPS points to the existing coach dashboard.

Success test:

- runner starts app
- coach sees runner connected
- coach sees live map movement
- phone locks
- runner keeps moving
- coach still sees updated location and pace
- runner stops
- coach can save the run

## What Not To Build First

Do not build these first:

- full coach mobile app
- payments/subscriptions
- public App Store release
- runner accounts
- client-facing history portal
- complex workout builder

Those can come later. The first mobile app should prove the native GPS foundation.

## Immediate Next Steps

1. Create a new `mobile-runner` app folder.
2. Set up Expo / React Native.
3. Add a session join screen.
4. Add native location permission flow.
5. Connect native GPS uploads to the current backend.
6. Test with one iPhone and one Android.
7. Add locked-phone/background tracking.
8. Run three real pilot sessions.

