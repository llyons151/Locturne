# Place picker (Leave the house setup)

Written 2026-10-09. The user's asks: tapping "Get to a place" with no place set should go
straight to a picker popup; the picker has to actually find places; research Mobbin for how
it should look; pure black background, not the off-blue.

## Why search "didn't work"

- Setup used `expo-location`'s `geocodeAsync`: Apple's *address* geocoder. It finds
  "12 Mill Road" but not "Planet Fitness" or "the library".
- In the web preview `geocodeAsync` and `reverseGeocodeAsync` don't exist at all, so every
  search came back "Nothing found" and "Use where I am" had no name.

Fix: Apple Maps search (`MKLocalSearch`, points of interest and addresses, ranked near the
last known position) in a local native module, `modules/place-search`. iOS's own service,
no key. The web preview uses OpenStreetMap's Photon (free, no key, CORS open), only because
browsers have no MapKit. Old iOS builds without the module fall back to the geocoder.

## Mobbin references (iOS)

Search sheet, as you type:
- [Citizen: Enter Address](https://mobbin.com/screens/fc8aba15-3228-40b3-a1b0-279a074d882b): pure black, round pin icons, name + grey address, hairlines.
- [Alta: location search](https://mobbin.com/screens/4c7e3e81-d1cf-4596-a5a3-91ae07ec5eae): black sheet, search field with clear button, results as you type.
- [Zomato: Select a location](https://mobbin.com/screens/81c2c4a1-58ea-4ec1-8b61-3284bd81a0e4): title + close, search, "Use your current location" as the first row.
- [Luma](https://mobbin.com/screens/9316b7b9-5dc7-466f-b743-67b67c66235e), [Moonlitt](https://mobbin.com/screens/c4f65697-b094-47bd-94ec-97aa34178861), [FocusFlight](https://mobbin.com/screens/4d0fffdc-5d26-4e99-8245-965f079444c3): tall sheet with grabber, keyboard up straight away.

Confirm:
- [Rivian: Location](https://mobbin.com/screens/b200106c-e4ad-42f1-9aef-f1dd6d31f1eb): map with pin and radius circle, name, address, Save.
- [Philips Hue: home location](https://mobbin.com/screens/d83d0f63-4999-4a19-97b8-261352483ca4): dark map, Save.

Common pattern: no Search button; results update as you type; current location first;
each result is icon, bold name, grey address; picking one confirms it on a map.

## What was built

- `/place-pick` (`src/features/place/place-pick.tsx`): a `formSheet` with a grabber, black.
  Centred title and close; search field (magnifier, spinner, clear); "Use where I am now"
  row; results as you type (300 ms debounce, latest query wins). Picking one shows a dark
  map snapshot with the check-in radius drawn on (`MKMapSnapshotter`), name, address, a
  "Call it" field and Save. Save closes the sheet.
- Routine: tapping "Get to a place" with no place opens the sheet (`?select=1`); saving
  selects the method, closing leaves the routine alone. "Pick/Change your place" opens the
  same sheet.
- `/place` keeps the morning check-in only (now black too); its setup path sends to the sheet.

Not yet checked on a device: the Swift module needs a new dev build.
