# WayFinder Expedition Log

An Electron desktop application for filling out and printing WayFinder Expedition Log forms.

## Features

- Beautiful React-based form interface using shadcn/ui components with Starfield-inspired color theme
- Pre-configured form fields from WayFinder Expedition Log PDF
- Local data persistence (saves forms as JSON files)
- Beautiful print output with clean HTML styling matching Starfield theme
- Form management (save, load, delete)
- Light and dark mode support

## Prerequisites

- Node.js (v18 or higher)
- Yarn package manager

## Setup

1. Install Node.js dependencies:
```bash
yarn install
```

The application uses a pre-configured `field-config.json` file that contains all form fields. This file is included in the repository and does not need to be generated.

## Development

Run the application in development mode:

```bash
yarn electron:dev
```

This will:
- Start the Vite dev server on http://localhost:5173
- Launch Electron when the server is ready
- Open DevTools automatically

## Building

### Development Build

Build the application for development:

```bash
yarn build
yarn electron:build
```

### Windows Installation Bundle

To build a Windows installer (NSIS):

```bash
yarn build
yarn electron:build:win
```

The installer will be created in the `release` directory.

**Note**: Building Windows installers requires running on Windows or using a Windows build environment. For cross-platform builds, consider using GitHub Actions or a CI/CD service.

## Usage

1. **Fill out the form**: All fields extracted from the PDF are available in the form
2. **Save**: Click "Save" to persist your form data locally
3. **Load**: Click "Saved Forms" to view and load previously saved forms
4. **Print**: Click "Print" to generate a beautifully formatted print-ready page
5. **Clear**: Click "Clear" to reset all form fields

## Project Structure

```
/src
  /main          - Electron main process
  /renderer      - React application
  /components    - shadcn/ui components
  /utils         - PDF extraction utilities
```

## Data Storage

Forms are saved in the Electron userData directory:
- macOS: `~/Library/Application Support/wayfinder-expedition-log/forms/`
- Windows: `%APPDATA%/wayfinder-expedition-log/forms/`
- Linux: `~/.config/wayfinder-expedition-log/forms/`

## Theme

The application features a Starfield-inspired color palette:
- **Light Mode**: Light gray background with dark blue primary accents
- **Dark Mode**: Dark blue space theme with gold highlights
- Toggle between themes using the theme button in the header

## Releases

Releases are available on GitHub under the [ghostweasellabs organization](https://github.com/ghostweasellabs).

### Installing from Release

1. Download the latest Windows installer from the [Releases page](https://github.com/ghostweasellabs/wayfinder-overload-app/releases)
2. Run the installer and follow the setup wizard
3. Launch the application from the Start menu or desktop shortcut

## License

MIT License - see [LICENSE](LICENSE) file for details.

