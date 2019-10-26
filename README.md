# Whatshidden

What's hidden? — Allows you to log and read deleted WhatsApp messages, as well as Image and Audio messages.

It uses an alternative method to some WhatsApp Android applications: instead of logging the Android notifications, it makes use of a modified version of WhatsApp web to log the messages. Scrapping is only used to get the QRCode.

As a result, **you won't need an Android phone** in order to see the recalled messages. Also, there is no message length limit, **you'll see the full message** and **you can see the images or listen to any audio message without entering WhatsApp** as they will download as soon as you receive the message, as long as your phone has a working internet connection.

All you need is a computer running 24/7. Ideally, something that can act as a server like a cheap Raspberry Pi or a VPS, but your day-to-day computer will work if you're one of those who leave the computer running all day.

### But.. I don't trust you!

You shouldn't. Yep, keep in mind you're scanning a QRCode and the app will have full access to your account.

That's why this project is completely open-source and you're downloading and running exactly the same (not either minified nor compiled) code you see here (via git clone), unlike some android apps out there which will log your notifications or will have access to your whole account too.

# Requirements
- **Node 10 or greather with npm** [[Download](https://nodejs.org/en/download/)]. You can check it by opening your terminal and typing `node -v` and `npm -v`.

For ARM architectures like most Raspberry Pi's you would need a chromium browser compatible with ARM and change the executablePath (I will add more info on this later, in the meantime and for reference see [issue #3](https://github.com/pmrt/whatshidden/issues/3)).

# Download and Installation

## Using git & npm

1. Head to the your desired directory: eg. `cd /home/pedro`
2. Download it by typing: `git clone https://github.com/pmrt/whatshidden.git`
3. Change your terminal directory to the folder you just downloaded: `cd whatshidden`
4. Install the dependencies: `npm i` or `npm install`
5. Run it for the first time: `npm start`
6. After closing the terminal the process will terminate. Generally after running it for the first time and scanning the QRCode, you would want to exit with `CTRL + C` and have it run again with `nohup` or any command dedicated to run processes 24/7. Type `nohup npm run start:verbose &`. This will run your process in background and it won't terminate after closing your session. You can check the process by typing: `tail -f logs/app.log`. For more info about nohup head to [here](https://www.computerhope.com/unix/unohup.htm)

## Using npm (without git)
1. Head to the repository https://github.com/pmrt/whatshidden and click on 'Download'
2. Follow the same steps from above - step 3. But with the correct directory name you just downloaded (it should be `whatshidden-master`)

### Important notes

- If you want more detailed logs (recommended) run it with `npm run start:verbose`

# Suggestions and Issues
If you find a bug or you have a suggestion don't even hesitate, just [open a new issue here!](https://github.com/pmrt/whatshidden/issues/new)

# Contact
For anything else you can reach me out via telegram [@pedromrtz](https://t.me/pedromrtz) or writing an email to [from@pedro.to](mailto:from@pedro.to) (You may need to check your spam folder, for the latter).

Please, use [Github issues](https://github.com/pmrt/whatshidden/issues/new) for suggestions, bugs or technical questions so other users can find and discuss them.