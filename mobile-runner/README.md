# Motion Mirror Runner App

This folder is reserved for the native mobile runner app.

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

## First Real Test

The first successful mobile test is:

1. Coach opens the existing web dashboard.
2. Runner opens the native runner app.
3. Runner starts tracking.
4. Runner locks the phone.
5. Coach still sees live movement and pace.
6. Runner stops.
7. Coach can save the session.

