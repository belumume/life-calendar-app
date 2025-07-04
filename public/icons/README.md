# PWA Icons

This directory contains the icons for the Progressive Web App.

## Current Files

- `icon.svg` - Base SVG icon design
- `icon-192x192.png` - Placeholder for 192x192 PNG icon
- `icon-512x512.png` - Placeholder for 512x512 PNG icon

## Generating Real PNG Icons

The PNG files are currently placeholders. To generate proper icons:

1. **Option 1: Online Converter**
   - Visit a service like [CloudConvert](https://cloudconvert.com/svg-to-png) or [Convertio](https://convertio.co/svg-png/)
   - Upload `icon.svg`
   - Set dimensions to 192x192 and 512x512
   - Download and replace the placeholder files

2. **Option 2: Command Line (requires ImageMagick)**
   ```bash
   convert icon.svg -resize 192x192 icon-192x192.png
   convert icon.svg -resize 512x512 icon-512x512.png
   ```

3. **Option 3: Design Tool**
   - Open `icon.svg` in a design tool (Figma, Sketch, etc.)
   - Export as PNG at the required sizes

## Icon Requirements

- **icon-192x192.png**: Used for app installation on Android
- **icon-512x512.png**: Used for splash screens and high-res displays
- **apple-touch-icon.png**: 180x180 PNG in the public root directory for iOS

## Design Notes

The icon represents a life calendar with:
- Blue background (#1e40af) matching the app theme
- Calendar grid showing weeks
- Heart symbol representing life
- Some highlighted cells showing tracked progress