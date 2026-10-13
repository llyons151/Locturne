#!/usr/bin/env bash
# Puts an ad hoc / development .ipa on Cloudflare R2 with an install page, so a phone can install it
# by opening a link (or scanning the QR code in the run summary). iOS installs over the air from an
# itms-services:// link to a manifest.plist; both it and the .ipa must be on HTTPS, which r2.dev is.
# Runs on the macOS runner (uses plutil). Usage: publish.sh <file.ipa> <profile>
set -euo pipefail

ipa=$1
profile=$2
: "${INSTALL_BUCKET:?}" "${INSTALL_BASE_URL:?}"
run=${GITHUB_RUN_NUMBER:-local}
sha=${GITHUB_SHA:-}
key="builds/$profile/$run"
base="$INSTALL_BASE_URL/$key"

work=$(mktemp -d)
unzip -p "$ipa" 'Payload/*.app/Info.plist' > "$work/Info.plist"
read_plist() { plutil -extract "$1" raw -o - "$work/Info.plist" 2>/dev/null || true; }
bundle=$(read_plist CFBundleIdentifier)
version=$(read_plist CFBundleShortVersionString)
build=$(read_plist CFBundleVersion)
title=$(read_plist CFBundleDisplayName)
title=${title:-$(read_plist CFBundleName)}
when=$(date -u '+%b %-d, %H:%M UTC')

cat > "$work/manifest.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key><string>software-package</string>
          <key>url</key><string>$base/$title.ipa</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key><string>$bundle</string>
        <key>bundle-version</key><string>$version</string>
        <key>kind</key><string>software</string>
        <key>title</key><string>$title</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
EOF

manifest_url=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$base/manifest.plist")
install="itms-services://?action=download-manifest&url=$manifest_url"

cat > "$work/index.html" <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$title $profile build</title>
<style>
  :root { color-scheme: light dark; --bg: #f4f4f6; --card: #fff; --text: #111; --muted: #6b6b73; --button: #111; --on-button: #fff; }
  @media (prefers-color-scheme: dark) { :root { --bg: #000; --card: #1c1c1e; --text: #f2f2f7; --muted: #8e8e93; --button: #f2f2f7; --on-button: #000; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--text);
         font: 16px/1.4 -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
  main { width: min(360px, calc(100% - 32px)); background: var(--card); border-radius: 24px; padding: 28px 24px; text-align: center; }
  h1 { margin: 0; font-size: 26px; }
  p { margin: 6px 0 0; color: var(--muted); }
  a.install { display: block; margin-top: 24px; padding: 15px; border-radius: 14px; background: var(--button);
              color: var(--on-button); font-weight: 600; text-decoration: none; }
  small { display: block; margin-top: 16px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>$title</h1>
  <p>$profile · $version ($build) · run $run</p>
  <p>$when${sha:+ · ${sha:0:7}}</p>
  <a class="install" href="$install">Install</a>
  <small>Open on your iPhone in Safari. Installs only on registered devices.</small>
</main>
</body>
</html>
EOF

npx --yes qrcode@1.5.4 -o "$work/qr.png" -w 360 "$INSTALL_BASE_URL/$profile.html" > /dev/null

put() { npx --yes wrangler@4 r2 object put "$INSTALL_BUCKET/$1" --remote --file "$2" --content-type "$3" ${4:+--cache-control "$4"}; }
put "$key/$title.ipa" "$ipa" application/octet-stream
put "$key/manifest.plist" "$work/manifest.plist" text/xml
put "$key/index.html" "$work/index.html" "text/html; charset=utf-8"
# The newest build of each profile is always at the same address, so a bookmark keeps working.
put "$profile.html" "$work/index.html" "text/html; charset=utf-8" no-store
put "$profile-qr.png" "$work/qr.png" image/png no-store

page="$INSTALL_BASE_URL/$profile.html"
echo "Install page: $page"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## $title $profile build $version ($build)"
    echo "Scan with your iPhone camera, or open [$page]($page) on the phone."
    echo
    echo "<img src=\"$INSTALL_BASE_URL/$profile-qr.png?run=$run\" width=\"240\" alt=\"QR code for the install page\">"
  } >> "$GITHUB_STEP_SUMMARY"
fi
