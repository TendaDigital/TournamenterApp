![Tournamenter](midia/Tournamenter.png)

Tournamenter Manager runs local Tournamenter servers on Windows, Linux and macOS. Each server can use its own name, port, database, password, logo and extensions. The installer includes Electron, the Tournamenter server, its exported web interface and the OBR scoring plugin. Running an event requires only the computer and its local network.

## Run an event

Install Tournamenter from the Windows setup, the macOS disk image or the Linux Debian package. Linux also has an AppImage. Open **Servers → New Server**, enter an identifier and configure the server. Choose **Save**, turn on **Start server**, then choose **Open App**. Other computers, projectors and scoring tablets on the same network can use the LAN address in that menu. The host computer must allow incoming connections on the configured port.

The manager reads existing server definitions from `FileModels/servers` in the Tournamenter application data directory. Their database locations, passwords and selected extensions carry over. New servers start with OBR enabled. Deleting a server definition leaves the tournament database on disk. **Developer → Open AppData Folder** opens the data directory.

Use **Extension Manager** for additional trusted npm packages and GitHub repositories. Installation and updates of additional packages use the network. Their packages must include built runtime assets. The OBR plugin shipped in the installer is updated with the desktop application. The top-right menu opens the project releases page for application updates.

## Develop and package

Use Node.js 24 LTS or later and npm. Check out TournamenterApp, Tournamenter and tournamenter-obr as sibling directories. The companion repository names and tested commits are in [runtime-sources.json](runtime-sources.json). In each companion directory run the following commands.

```sh
npm ci
npm run build
```

From TournamenterApp run the following commands.

```sh
npm ci
npm test
npm run stage
npm start
```

The staging step installs each companion's locked production dependency tree into an application resource directory and includes its built assets. Use `npm run stage -- /path/to/core /path/to/obr` for other checkout locations. Repeat staging after a server or plugin change.

Run `npm run dist` on the target OS to create the native installer in `dist/`. The GitHub Actions workflow builds on Windows, Ubuntu, macOS Intel and macOS Apple Silicon. It installs or extracts each artifact, launches the resulting application with a temporary profile, starts a server with OBR, stores a team, reopens the manager and checks that the team persisted. The workflow attaches the installers to the successful run. The development builds have no verified publisher. Signed Windows distribution and notarized macOS distribution require the respective signing credentials.

`npm run smoke` exercises a staged development checkout. `npm run smoke -- /path/to/installed/executable` exercises an installer output. Linux headless builds can run the command with `xvfb-run -a`.
