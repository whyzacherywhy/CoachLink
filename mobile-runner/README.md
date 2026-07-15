# Motion Mirror Runner App

This folder contains the first native mobile runner app scaffold.

The first version should be built as an Expo / React Native app that sends native GPS updates to the existing Motion Mirror backend.

## First Target

Build a private test app for runners.

It should:

- join a coach session from a link or session code
- ask for location permission
- start/pause/stop tracking
- keep GPS running while the phone is locked
- keep GPS running while the runner opens music
- upload points to `POST /api/location`
- notify the backend on pause and stop

## Backend To Use

Use the existing hosted Motion Mirror web app as the API server.

Production API:

```text
https://coachlink-81u4.onrender.com
```

Important endpoints:

```text
POST /api/location
POST /api/pause
POST /api/stop
GET  /api/sessions
```

## Install And Run

From this folder:

```sh
npm install
npm start
```

Then use Expo to open the app.

For serious iPhone background GPS testing, this will need a development build or TestFlight build. Expo Go is useful for quick screen checks, but it is not the final locked-phone GPS test.

## Current Build Status

The first app screen includes:

- session id input
- runner name input
- consent checkbox
- start free run
- start track mode
- pause
- stop confirmation
- local run stats
- GPS accuracy readout
- queued upload count
- location uploads to the existing Motion Mirror backend
- background location configuration for native builds

## First Real Test

The first successful mobile test is:

1. Coach opens the existing web dashboard.
2. Runner opens the native runner app.
3. Runner starts tracking.
4. Runner locks the phone.
5. Coach still sees live movement and pace.
6. Runner stops.
7. Coach can save the session.
