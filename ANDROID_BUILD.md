# Building the Android APK

The app works **fully offline**. Your friends can add cars using their camera or gallery—no internet needed.

## Prerequisites

1. **Java 21** — [Download](https://adoptium.net/) (Capacitor requires Java 21)
2. **Android Studio** — [Download](https://developer.android.com/studio) (includes Android SDK)

## Build steps

**Easy way (auto-downloads Java if needed):**
```bash
npm run apk
```

**Manual way:**

1. **Build and sync**
   ```bash
   npm run build:android
   ```

2. **Build the APK**
   - **Option A:** Open Android Studio
     ```bash
     npm run android
     ```
     Then: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

   - **Option B:** Command line (requires Java 17)
     ```bash
     cd android && ./gradlew assembleDebug
     ```

3. **Find your APK**
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

## Sharing with friends

1. Send them the APK file (e.g. via WhatsApp, Google Drive)
2. They install it (enable "Install from unknown sources" if prompted)
3. They open the app and tap **+ Add a new car**
4. They can:
   - **Take a photo** with the camera
   - **Pick from gallery** to use existing photos
5. All data stays on their device—no account or internet required.

## Features in the app

- Add cars (camera or gallery, up to 10 at once)
- Edit car names
- Delete cars
- Filter by brand, search, sort
- Favorites
- Fully offline
