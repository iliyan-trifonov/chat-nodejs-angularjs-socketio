'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    hat = require('hat');

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function(){
        //TODO: send message to all channels that this client left
        console.log('user disconnected');
    });

    socket.on('create channel', function (channel) {
        console.log('creating channel', channel);
        if (channels[channel]) {
            socket.emit('channel exists', channel);
            console.log('channel exists', channel);
            return false;
        }
        socket.join(channel, function (err) {
            if (err) {
                socket.emit('join channel err', err);
                console.log('join channel err', err);
                return false;
            }
            channels[channel] = {
                name: channel,
                password: null
            };
            socket.emit('joined channel', channel);
            console.log('joined channel', channel);
        });
    });

    socket.on('join channel', function (user, channel) {
        console.log('joining channel', user, channel);
        if (!channel) {
            console.log('join channel err', channel);
            socket.emit('join channel err', channel);
            return false;
        }
        //TODO: check here if channel is created and has a password, check the pass, emit error if needed
        socket.join(channel.name, function (err) {
            if (err) {
                console.log('join channel err', err);
                socket.emit('join channel err', err);
                return false;
            }

            if (!channels[channel.name]) {
                console.log('adding channel to the array', channel);
                channels[channel.name] = {
                    name: channel.name,
                    password: null
                };
            }

            socket.emit('joined channel', channel);
            console.log('joined channel', channel);
            io.to(channel.name).emit(
                'new channel message',
                {
                    text: 'User '+user.username+' joined the channel'
                }
            );
            console.log('sent message to channel', channel);
        });
    });

    socket.on('new message', function (message) {
        console.log('new message', message);
        io.to(message.channel).emit(
            'new message',
            {
                username: message.user.username,
                text: message.text
            }
        );
    });

    //TODO: genName(cb) for the username
    socket.on('create user', function () {
        var uuid = hat();
        clients[uuid] = {
            uuid: uuid,
            username: 'Anonymous' + (Math.floor(Math.random() * 10000) + 1000)
        };
        socket.emit('user created', clients[uuid]);
    });


});

/////////////////////////////////////////////////////

var channels = {};
var clients = {};
