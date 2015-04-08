'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http);

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
        console.log('user disconnected');
    });

    socket.on('create channel', function (channel) {
        console.log('creating channel', channel);
        if (channels.indexOf(channel) !== -1) {
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
            channels.push(channel);
            socket.emit('joined channel', channel);
            console.log('joined channel', channel);
        });
    });

    socket.on('join channel', function (channel) {
        console.log('joining channel', channel);
        socket.join(channel, function (err) {
            if (err) {
                console.log('join channel err', err);
                socket.emit('join channel err', err);
            }

            if (channels.indexOf(channel) === -1) {
                console.log('adding channel to the array', channel);
                channels.push(channel);
            }

            socket.emit('joined channel', channel);
            io.to(channel).emit('new message', 'a user joined the channel');
            //socket.broadcast('new message', 'a user joined the channel');
            console.log('joined channel', channel);
            console.log('sent message to channel', channel);
        });
    });

    socket.on('new message', function (message) {
        console.log('new message', message);
        io.to(message.channel).emit('new message', message.text);
    });
});

/////////////////////////////////////////////////////

var channels = [];
var clients = [];
