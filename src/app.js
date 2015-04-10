'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    hat = require('hat'),
    moment = require('moment');

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
        for (var i in clients) {
            if (clients.hasOwnProperty(i)) {
                if (clients[i].socket.id === socket.id) {
                    clients[i].channels.forEach(function (channel) {
                        var message = formatChannelMessage(clients[i].username + ' left the channel');
                        io.to(channel).emit(
                            'new channel message',
                            message
                        );
                        addMessage(channel, message.text);
                    });
                    return;
                }
            }
        }
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
        //console.log('joining channel', user, channel);
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
                //console.log('adding channel to the array', channel);
                channels[channel.name] = {
                    name: channel.name,
                    password: null,
                    users: []
                };
            }

            //make a reference
            channels[channel.name].users[user.uuid] = clients[user.uuid];

            //console.log('uuid', user.uuid, 'clients', clients);

            clients[user.uuid].channels.push(channel.name);

            socket.emit('joined channel', channel);
            console.log('joined channel', channel);
            //console.log('sending message to channel', channel, 'from user', user.username);
            var message = formatChannelMessage(user.username + ' joined the channel');
            io.to(channel.name).emit(
                'new channel message',
                message
            );
            addMessage(channel.name, message.text);
            console.log('sent message to channel', channel, message.text);
        });
    });

    socket.on('new message', function (message) {
        console.log('new message', message);
        //TODO just emit if the user joined the channel or get the channel to send to from the user's socket
        var text = formatMessage(message.user, message.text);
        addMessage(message.channel, text.text);
        io.to(message.channel).emit(
            'new message',
            text
        );
    });

    //TODO: genName(cb) for the username
    socket.on('create user', function () {
        var uuid = hat();
        clients[uuid] = {
            uuid: uuid,
            username: 'Anonymous' + (Math.floor(Math.random() * 10000) + 1000),
            channels: [],
            socket: { id: socket.id }
        };
        console.log('created new user', clients[uuid]);
        socket.emit('user created', clients[uuid]);
    });

    socket.on('known user', function (user) {
        clients[user.uuid] = {
            uuid: user.uuid,
            username: user.username,
            channels: [],
            socket: { id: socket.id }
        };
        //socket.emit('known user ready', clients[uuid]);
    });

    socket.on('get channel users list', function (channel) {
        console.log('get channel users list', channel);
        if (!channel) {
            console.log('invalid channel name', channel);
            socket.emit('get channel users list error', 'invalid channel name');
            return false;
        }
        var users = [];
        //console.log('current channels', channels);
        for (var i in channels[channel].users) {
            if (channels[channel].users.hasOwnProperty(i)) {
                //console.log('adding user', channels[channel].users[i].username);
                users.push(channels[channel].users[i].username);
            }
        }
        console.log('users list to send', users);
        socket.emit('channel users list', users);
    });

    socket.on('leave channel', function (user, channel) {
        console.log('leave channel', user, channel);
        socket.leave(channel, function (err) {
            if (err) {
                console.log('leave channel err', err);
                socket.emit('leave channel err', err);
                return false;
            }

            console.log('channel left', channel);

            socket.emit('channel left', channel);

            var message = formatChannelMessage(user.username + ' left the channel');

            io.to(channel).emit(
                'new channel message',
                message
            );
            addMessage(channel, message.text);
        });
    });

    socket.on('update user', function (uuid, newUsername) {
        console.log('update user message', uuid, newUsername);
        var oldUsername = clients[uuid].username;
        clients[uuid].username = newUsername;
        socket.emit('user updated', uuid, oldUsername, newUsername);
        for (var i in clients[uuid].channels) {
            if (clients[uuid].channels.hasOwnProperty(i)) {
                var message = formatChannelMessage(oldUsername + ' renamed to ' + newUsername);
                io.to(clients[uuid].channels[i]).emit(
                    'new channel message',
                    message
                );
                addMessage(clients[uuid].channels[i], message.text);
            }
        }
    });

    socket.on('get messages', function (channel) {
        console.log('get messages', channel);
        var messages = getMessages(channel);
        console.log('messages', messages);
        socket.emit('channel messages', messages);
    });

});

/////////////////////////////////////////////////////

var channels = {};
var clients = {};
var messages = {};

function formatMessage(username, text) {
    return {
        text: moment().format('HH:mm:ss') +
            ' <strong>'+username+'</strong>: ' + text
    };
}

function formatChannelMessage(text) {
    return {
        text: moment().format('HH:mm:ss') + ' ' + text
    };
}

function addMessage(channel, text) {
    console.log('addMessage()', channel, text);
    if (!messages[channel]) {
        messages[channel] = [];
    }
    messages[channel].push(text);
    if (messages[channel].length > 100) {
        messages[channel].splice(0, 1);
    }
    console.log('messages for ' + channel, messages[channel]);
}

function getMessages(channel) {
    console.log('getMessages('+channel+')');
    var result = [];
    if (messages[channel]) {
        result = messages[channel];
    }
    console.log('result', result);
    return result;
}
