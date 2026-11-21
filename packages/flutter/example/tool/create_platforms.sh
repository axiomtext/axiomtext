#!/usr/bin/env bash
# Creates the Android, iOS, macOS and web folders for the example app and adds the
# permissions AxiomText needs (photo library, camera, WebView on macOS).
# Run once on your Mac:   cd packages/flutter/example && ./tool/create_platforms.sh
set -euo pipefail
cd "$(dirname "$0")/.."

flutter create . --platforms=android,ios,macos,web --project-name axiomtext_example --org dev.axiomtext

plist=/usr/libexec/PlistBuddy
set_plist() { # file key value
  "$plist" -c "Delete :$2" "$1" >/dev/null 2>&1 || true
  "$plist" -c "Add :$2 string $3" "$1"
}
set_bool() { # file key value
  "$plist" -c "Delete :$2" "$1" >/dev/null 2>&1 || true
  "$plist" -c "Add :$2 bool $3" "$1"
}

# iOS: photo library and camera (image_picker).
set_plist ios/Runner/Info.plist NSPhotoLibraryUsageDescription "Add photos to your documents."
set_plist ios/Runner/Info.plist NSCameraUsageDescription "Take photos for your documents."

# macOS: the WebView needs the network-client entitlement even for bundled pages, and
# image_picker opens files the user chooses.
for file in macos/Runner/DebugProfile.entitlements macos/Runner/Release.entitlements; do
  set_bool "$file" com.apple.security.network.client true
  set_bool "$file" com.apple.security.files.user-selected.read-only true
done

echo "Done. Run: flutter run   (pick a device: Android, iOS, macOS or Chrome)"
