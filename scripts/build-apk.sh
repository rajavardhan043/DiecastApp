#!/bin/bash
# Build Android APK - downloads portable JDK 21 if needed (Capacitor requires Java 21)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
JDK_DIR="$PROJECT_DIR/.jdk"

# Check for Java 21 (required by Capacitor)
USE_DOWNLOADED=false
if [ -d "$JDK_DIR/Contents/Home" ]; then
  if "$JDK_DIR/Contents/Home/bin/java" -version 2>&1 | grep -q "21"; then
    export JAVA_HOME="$JDK_DIR/Contents/Home"
    USE_DOWNLOADED=true
  fi
elif [ -d "$JDK_DIR" ]; then
  if "$JDK_DIR/bin/java" -version 2>&1 | grep -q "21"; then
    export JAVA_HOME="$JDK_DIR"
    USE_DOWNLOADED=true
  fi
fi

if [ "$USE_DOWNLOADED" = false ]; then
  JAVAC_21=$(/usr/libexec/java_home -v 21 2>/dev/null || true)
  if [ -n "$JAVAC_21" ] && [ -d "$JAVAC_21" ]; then
    export JAVA_HOME="$JAVAC_21"
  fi
fi

# Download portable JDK 21 if still no valid Java
if [ -z "$JAVA_HOME" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q "21"; then
  echo "Java 21 not found. Downloading portable JDK 21..."
  ARCH=$(uname -m)
  [ "$ARCH" = "arm64" ] && JDK_ARCH="aarch64" || JDK_ARCH="x64"
  JDK_URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_${JDK_ARCH}_mac_hotspot_21.0.5_11.tar.gz"
  JDK_TAR="$PROJECT_DIR/jdk.tar.gz"

  rm -rf "$JDK_DIR"
  echo "Downloading ~200MB - may take a few minutes..."
  if ! curl -f -L --connect-timeout 30 --retry 2 -o "$JDK_TAR" "$JDK_URL"; then
    echo "Download failed (network error). Install Java 21 from https://adoptium.net"
    echo "Then run: npm run build:android && cd android && ./gradlew assembleDebug"
    exit 1
  fi
  [ ! -s "$JDK_TAR" ] && { echo "Download failed (empty file)"; exit 1; }
  if ! file "$JDK_TAR" | grep -q "gzip"; then
    echo "Download failed - got $(file -b "$JDK_TAR") instead of gzip archive"
    echo "Try: brew install openjdk@21  OR  download from https://adoptium.net"
    exit 1
  fi
  mkdir -p "$JDK_DIR"
  tar -xzf "$JDK_TAR" -C "$JDK_DIR" --strip-components=1
  rm -f "$JDK_TAR"
  [ -d "$JDK_DIR/Contents/Home" ] && export JAVA_HOME="$JDK_DIR/Contents/Home" || export JAVA_HOME="$JDK_DIR"
  echo "JDK 21 ready."
fi
export PATH="$JAVA_HOME/bin:$PATH"

echo "Building APK..."
cd "$PROJECT_DIR"
npm run build:android
cd android
./gradlew assembleDebug --no-daemon

echo ""
echo "✓ APK built: android/app/build/outputs/apk/debug/app-debug.apk"
