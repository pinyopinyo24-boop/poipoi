#!/bin/bash

# PoiPoi Beta Android Build Script
# APK生成スクリプト

set -e

echo "================================"
echo "PoiPoi Beta Android Build"
echo "================================"
echo ""

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed"
    echo "Install with: npm install -g eas-cli"
    exit 1
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "❌ Expo CLI is not installed"
    echo "Install with: npm install -g expo-cli"
    exit 1
fi

echo "✅ EAS CLI and Expo CLI found"
echo ""

# Build type selection
BUILD_TYPE=${1:-preview}

case $BUILD_TYPE in
    development)
        echo "🔨 Building Development APK..."
        eas build --platform android --profile development
        ;;
    preview)
        echo "🔨 Building Preview APK..."
        eas build --platform android --profile preview
        ;;
    production)
        echo "🔨 Building Production AAB..."
        eas build --platform android --profile production
        ;;
    *)
        echo "❌ Invalid build type: $BUILD_TYPE"
        echo "Usage: ./build-android.sh [development|preview|production]"
        exit 1
        ;;
esac

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "Build artifacts will be available at:"
echo "https://expo.dev/builds"
echo ""
