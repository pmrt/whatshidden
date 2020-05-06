![Last stable version](https://img.shields.io/github/package-json/v/pmrt/whatshidden/master?label=last%20stable%20version&style=for-the-badge&labelColor=7c61f9&color=383838)

# Table of Contents

- [**I. Whatshidden**](#whatshidden)
- [**II. Requirements**](#requirements)
- [**III. Limitations**](#limitations)
- [**IV. Download and Usage**](#download-and-usage)
  - [**Download**](#download-using-git--npm)
  - [**Usage**](#usage)
  - [**Available arguments**](#available-arguments)
  - [**Available scripts**](#available-scripts)
- [**V. Update**](#update)
- [**VI. FAQ and Troubleshooting**](#faq)
  - [**FAQ**](#faq)
  - [**Troubleshooting**](#troubleshooting)
- [**VII. Suggestion and Issues**](#suggestions-and-issues)
- [**VIII. Contact**](#contact)
---

# Whatshidden

What's hidden? — Allows you to log and read deleted WhatsApp messages, as well as Image, Stickers and Audio messages.

It won't log any Android notification: the application makes use of a modified version of WhatsApp Web to log the messages instead. By using an alternative method, scrapping is only used to get the QRCode.

As a result, **you won't need an Android phone** in order to see the recalled messages. Also, there is no message length limit, **you'll see the full message** and **you can see images or listen to any audio message without entering WhatsApp** as they will be downloaded and decrypted as soon as you receive the message, as long as your phone has a working internet connection.

All you need is a computer running 24/7. Ideally, something that can act as a server like a cheap Raspberry Pi or a VPS, but your day-to-day computer will work just fine if you're one of those who leave the computer running all day.

### But.. I don't trust you!

You shouldn't. Yep, keep in mind you're scanning a QRCode and this application will have full access to your account.

That's why this project is completely open-source and you're downloading and running exactly the same (not either minified nor compiled) code you see here (via git clone), unlike some obscure android apps out there which will log your notifications or will have access to your whole account too.

# Requirements
- **Node v12.13.0 or greather with npm**. [[Download](https://nodejs.org/en/download/)][[How to update node](https://stackoverflow.com/questions/8191459/how-do-i-update-node-js)]. You can check it by opening your terminal and typing `node -v` and `npm -v`.
- _(For UNIX systems)_ Make sure you have installed the required **puppeteer dependencies** in your distro. Otherwise you'll get a `error while loading shared libraries` error. [[Check the list](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)]

For ARM architectures like most Raspberry Pi's, you will need a chromium browser compatible with ARM and change the browser's executable path ([see FAQ](#how-to-run-whatshidden-in-arm-architectures-like-most-raspberry-pis)).

Minimum 1GB RAM recommended (keep that in mind when buying a new Raspberry Pi).

# Limitations
### One session of WhatsApp Web at a time
WhatsApp Web only allows one session at a time: you can't use two sessions at the same time. So when you use WhatsApp Web while running Whatshidden it won't log any message.

**As a general recommendation** you shouldn't use other WhatsApp Web sessions while running the application but it can handle it in a situation where you really need it.

**_Important note: There's a bug in the current beta version which makes this check unreliable when using whatsapp web too much. [See #44](https://github.com/pmrt/whatshidden/issues/44) for tracking the issue._**


Whatshidden performs a status check every 15 min, if it detects that you have used other session in a check it'll schedule a refresh for the next check, that way you have a minimum of 15 minutes in which you can use WhatsApp Web (but it won't log any message). After that time, in the next check it'll recover the session and a pop-up will prompt you in your other session asking if you want to use it 'Here' (in that window) or 'Close session'. If you click on 'Here' or just refresh the page you can use WhatsApp Web again and Whatshidden won't log any message until it recovers the session in future checks. Otherwise, if you don't do anything, click on 'Close session' or you close the tab/window, Whatshidden will work again.

In the unlikely case after 100 consecutive unsucccessful attempts of Whatshidden trying to recover the session, it'll delete the session and terminate the process.

### It won't log messages of a given conversation while it is open
Whatshidden won't log any message of a conversation if you're in the same conversation at the same time on your phone. It's not a big deal since you are in the conversation and you can see the messages but it's something you have to keep in mind.

# Download and Usage

## Download using git & npm

1. Go to the your desired directory: e.g. `cd /home/pedro`
2. Download it by typing: `git clone https://github.com/pmrt/whatshidden.git`
3. Change your terminal directory to the folder you just downloaded: `cd whatshidden`
4. Install the dependencies: `npm i` or `npm install`
5. Run it for the first time: `npm start`
6. See usage

## Download using npm (without git)
1. Go to the repository https://github.com/pmrt/whatshidden (this page) and click on 'Clone or Download', then click on 'Download ZIP'
2. Follow the same steps above from step 3. But with the correct directory name you just downloaded (it should be `whatshidden-master`)

## Usage

- Initialize the application by running: `npm start`
- Scan the QRCode printed directly in the terminal with your WhatsApp app on your mobile phone
- When it displays a message that says `waiting for new messages` you can close the application with `CTRL + C` and run it again but this time in background with `nohup` or any other command which prevents your process from closing after ending your terminal session. Type: `nohup npm start &` if you're using `nohup`, the process will run in background: you can close your terminal. If you want to track the progress you can type in your terminal: `tail -f nohup.out` or `tail -f logs/app.log`. For more info about nohup head to [this article](https://www.computerhope.com/unix/unohup.htm)
- Every time you run the application, the process will try to restore your previous session
- Chat logs of the new messages will be stored in the 'chats' directory, in the root path

### Important notes

- **recommended** — If you want more detailed logs run it with `npm run start:verbose`. This command only works on unix systems as passing down environment variables is slightly different on Windows (see available scripts)

### Available arguments
You can pass arguments to the application by editing the package.json: ('starting' script).

**package.json**
```javascript
[...]
"scripts": {
  "start": "NODE_ENV=production npm run starting",
  "start:verbose": "NODE_ENV=production npm run start:dev",
  "start:dev": "LOG_LEVEL=verbose npm run starting",
  "starting": "node --experimental-modules --experimental-json-modules src/index.js -s -d -b /usr/bin/chromium-browser"
},
[...]
```
- **`-b, --browser <path>`** Use a different chromium browser with the provided executable path
- **`-s, --screenshot`** Take a screenshot of whatsapp web's page on each check and on errors related with the page. Screenshots are stored in your `logs` directory. Useful for debugging in headless mode.
- **`-d, --dumpio`** Print chromium logs

### Available scripts
As you can see, there're different ways to initialize the application:

##### Unix systems

- **`npm start`** Will initialize the application in production mode with _LOG_LEVEL=info_ (just the important things)
- **`npm start:verbose`** Will start the application in production mode with _LOG_LEVEL=verbose_ (more detailed logs)
- **`npm start:dev`** Intented just for development. It'll run the application in dev mode, with _LOG_LEVEL=verbose_ and displaying the chromium window (only available in graphical environments)

##### Windows (powershell)

- **`npm start`** Will initialize the application in production mode with _LOG_LEVEL=info_ (just the important things)
- **`$env:LOG_LEVEL='verbose';npm start`** Will start the application in production mode with _LOG_LEVEL=verbose_ (more detailed logs)
- **`$env:NODE_ENV='production';$env:LOG_LEVEL='verbose';npm start`** Intented just for development. It'll run the application in dev mode, with _LOG_LEVEL=verbose_ and displaying the chromium window (only available in graphical environments)

##### Windows (cmd)

- **`npm start`** Will initialize the application in production mode with _LOG_LEVEL=info_ (just the important things)
- **`set LOG_LEVEL=verbose && npm start`** Will start the application in production mode with _LOG_LEVEL=verbose_ (more detailed logs)
- **`set NODE_ENV=production && set LOG_LEVEL=verbose && npm start`** Intented just for development. It'll run the application in dev mode, with _LOG_LEVEL=verbose_ and displaying the chromium window (only available in graphical environments)

# Update
You can use `unsafe_update.sh`and `update.sh` to update your version to the last stable version (master branch) using git

- `unsafe_update.sh` will delete your changes to the files but not the gitignored files (like your chats, logs, etc.)
- `update.sh` will try to pull changes from master, if you have changed a file it'll fail

You'll need bash to run both scripts.

As an alternative method to `update.sh` (e.g. for windows) you can type `git pull` and then `npm install` in your terminal. Just copy the commands in the scripts.

# FAQ

### What are the chats with the following format `<my number>-<random number>` in my chats directory?
If you have a directory like e.g. _`3412345678-16593097`_ in your chats folder, don't worry: it's just a group with the format `<my number>-<group id>`

### How to close session
If you want to close your current session all you have to do is to terminate the process (with -2 SIGINT signal if possible, e.g. CTRL + C) and close the session from your phone in `configuration > Whatsapp Web` (where you scanned the QRCode)

The next time you run the application it'll attempt to use it, detect the invalid session and remove it. If you need to remove it manually, you can remove the `.data` directory by typing `rm -rf .data` in your terminal. The `.data` directory is in the root path of the application along with your chats and logs

### How to run Whatshidden in ARM architectures (like most Raspberry Pi's)

###### _Tested on Raspberry Pi 2 Model B_

You'll need raspbian stretch or greater (which includes a chromium-browser compatible with ARM). Run the application providing the chromium executable path with the `-b` (or `--browser`) argument as follows (remember, to pass arguments you need to edit your package.json, as seen in [**Available scripts**](#available-scripts)):

`npm run start:verbose -b chromium-browser` or `npm run start:verbose -b /usr/bin/chromium-browser`

## Troubleshooting

### I get a warning "npm does not support Node.js vX.Y.Z" when running `npm install` or `npm i`
Update npm with `npm install -g npm`. [Update Node](https://stackoverflow.com/questions/8191459/how-do-i-update-node-js) as well, if you haven't already done so.

### I get an error "error while loading shared libraries" and "failed to launch chrome!" when running `npm start`
If you get this error when running the application you'll need to install the puppeteer required dependencies for your (Unix) OS. [Check the required dependencies for your operating system here](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix).

E.g. for a debian based distro you should type the following command:
```
apt-get update && apt-get install gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```
..in your terminal to get all the dependencies you need

### I get an error "Running as root without --no-sandbox is not supported" when running `npm start`
Don't run the application as root, it's unsafe. Change to a non-root user with `su <your-username>`. E.g. `su pedro`

### I get an error "EACCES: premission denied open [..]" when running `npm start`
Whatshidden must have permissions to access to the application root directory. **Don't run it** from e.g. `/usr/bin`, **use a directory like** `/home/pedro` **instead** or give it enough permissions (just don't execute it as root).

### I get an error "NODE_ENV not recognized as an internal or external command" (or "LOG_LEVEL" environment variable instead of "NODE_ENV") when running `npm start`
If you're on Windows you can't use node scripts with environment variables directly (such as `npm run start:verbose` or `npm run start:dev`) as these pass the environment variables down to node in the Unix format.

See **_Windows (powershell)_** or **_Windows (cmd)_** in the [**Available scripts**](#available-scripts) section, depending on the terminal you're using.

# Suggestions and Issues
If you find a bug or you have a suggestion don't even hesitate, just [open a new issue here!](https://github.com/pmrt/whatshidden/issues/new)

# Contact
For anything else you can reach me out via telegram [@pedromrtz](https://t.me/pedromrtz) or writing an email to [from@pedro.to](mailto:from@pedro.to) (You may need to check your spam folder for the latter).

Please, use [Github issues](https://github.com/pmrt/whatshidden/issues) for suggestions, bugs or technical questions so other users can find and discuss them.