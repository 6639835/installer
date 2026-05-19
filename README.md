![FlyByWire Simulations](https://raw.githubusercontent.com/flybywiresim/branding/1391fc003d8b5d439d01ad86e2778ae0bfc8b682/tails-with-text/FBW-Color-Light.svg#gh-dark-mode-only)
![FlyByWire Simulations](https://github.com/flybywiresim/branding/blob/master/tails-with-text/FBW-Color-Dark.svg#gh-light-mode-only)

# FlyByWire Simulations Installer

This repository contains the installer for FlyByWire Simulations projects such as the [A32NX](https://github.com/flybywiresim/a32nx).

## How to contribute

The installer is built with [Tauri](https://tauri.app/), [Rust](https://www.rust-lang.org/),
[TypeScript](https://www.typescriptlang.org/), and [React](https://reactjs.org/).

The project is organized as:

- `src-tauri/`: Rust desktop application, native commands, bundling config, and packaged resources.
- `src/renderer/`: React webview application.
- `src/renderer/platform/`: Tauri bridge and compatibility adapters replacing the old Electron APIs.
- `src/common/`: shared TypeScript constants.

### Requirements

Please make sure you have:

- [git](https://git-scm.com/downloads)
- [NodeJS 20](https://nodejs.org/en/)
- [Rust stable](https://www.rust-lang.org/tools/install)
- Tauri platform prerequisites for your OS

### Get started

First fork the project and install the dependencies

```shell script
npm install
```

Then run the development server using

```shell script
npm run dev
```

To build the package as an executable application, run

```shell script
npm run package
```

On Windows this builds an `.exe` installer. On Linux it builds `.AppImage`, `.deb`, and `.rpm` bundles. If you wish to target a specific bundle, run:

```shell
npm run package:win # packages for windows (.exe)
npm run package:linux # packages for all Linux targets (.AppImage, .deb, .rpm)
npm run package:appimage # packages as .AppImage
npm run package:deb # packages as .deb
npm run package:rpm # packages as .rpm
```
