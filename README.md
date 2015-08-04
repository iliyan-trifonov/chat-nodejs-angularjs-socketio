# chat-nodejs-angularjs-socketio

npm: [![Dependency Status](https://www.versioneye.com/user/projects/553a42d21d2989bdd50000a4/badge.svg?style=flat)](https://www.versioneye.com/user/projects/553a42d21d2989bdd50000a4)
Bower: [![Dependency Status](https://www.versioneye.com/user/projects/553a42ce1d2989f7ee0000db/badge.svg?style=flat)](https://www.versioneye.com/user/projects/553a42ce1d2989f7ee0000db)

Chat application built with NodeJS, AngularJS, Twitter Bootstrap and Socket.io. Uses ES6 syntax on the back-end.

See it in action [here](https://chat.iliyan-trifonov.com "Iliyan Trifonov's Chat App").

## Installation

Install the required NodeJS and Bower modules (`bower install` is ran automatically): 

    npm install

Copy src/config.json.dist to src/config.json and change it if needed. By default the settings in config.json will allow
console logging.

## Usage

Go to the project's root dir and run:
    
    npm start

You can also use `nodemon` while developing:

    nodemon src/app.js
    
On production use for example `forever`:

    forever src/app.js
    
Check [this repo](https://github.com/iliyan-trifonov/docker-node-nvm "Docker Node.js NVM") 
for a [Docker](https://www.docker.com/ "Docker LXC") image/container 
that can run Node.js applications.

## How it works

When you load the application's page for the first time a random username is generated for you.
It can be changed on the Profile page at any time.

Now you have to open the Channel page where you can create or join a channel. You can also provide a password for the
channel if you want it to be private and other users must provide the same password to join the channel.

You can close the page or refresh it at any time and you user and channel will be reloaded for you automatically.
Even when the server is restarted all users register and rejoin the channels without refreshing the pages in their
browsers.

The node application is created to handle multiple channels for every user but currently only one channel can be active
on the front-end. This will be a work in progress should the need arise.

The communication is 100% pure Socket.IO. The node server is providing only the static index.html and the sockets continue
from there.

When used behind a reverse proxy like Nginx, all static files in /public are loaded and cached by the proxy and the 
NodeJs application handles only the sockets' communication.

Socket.IO has a perfect fallback system which means if your server does not support web sockets, this application will
still work no matter what. This is the case with my demo link above which is behind CloudFlare+Nginx reverse proxy+NodeJS.
Soon CloudFlare will allow web sockets communication for all of their users.

The browser's local storage which is available in all modern browsers is used to store your user and channel settings.
On the back-end users, channels and messages are kept in arrays, not database but this can be changed to use for example
Redis or MongoDB if the application is going to be used by many people at once.
There is also a hard limit of 100 on messages which also can be changed in src/app.js.

For the logging the app is using my logging module 
[winston-console-graylog2-logger](https://github.com/iliyan-trifonov/winston-console-graylog2-logger "winston-console-graylog2-logger"). 
It provides simultaneous logging to the console and to a Graylog2 server.
