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
        console.log('a user disconnected');
        var user = findUserBySocketId(socket.id);
        var channels = getUserChannels(user.uuid);

        channels.forEach(function (channelName) {
            removeUserFromChannel(user.uuid, channelName);
            sendMessageToChannel(channelName, user.username + ' left the channel');
        });

        delete clients[user.uuid];
        delete sockets[user.socketId];
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

        var chans = getUserChannels(user.uuid);

        chans.forEach(function (chan) {
            removeUserFromChannel(user.uuid, chan);
            sendMessageToChannel(chan, user.username + ' left/changed the channel');
        });

        //TODO: check here if channel is created and has a password, check the pass, emit error if needed
        socket.join(channel.name, function (err) {
            if (err) {
                console.log('join channel err', err);
                socket.emit('join channel err', err);
                return false;
            }

            if (!channels[channel.name]) {
                channels[channel.name] = {
                    name: channel.name,
                    password: null,
                    users: []
                };
                console.log('added channel to the array', channels[channel.name]);
            }

            addUserToChannel(user.uuid, channel.name);

            socket.emit('joined channel', channel);
            console.log('joined channel', channel);

            sendMessageToChannel(channel.name, user.username + ' joined the channel');
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
        var user = {
            uuid: uuid,
            username: 'Anonymous' + (Math.floor(Math.random() * 10000) + 1000),
            channels: [],
            socketId: socket.id
        };
        addUser(user);
        console.log('created new user', clients[uuid]);
        socket.emit('user created', clients[uuid]);
    });

    socket.on('known user', function (user) {
        var userToAdd = {
            uuid: user.uuid,
            username: user.username,
            channels: [],
            socketId: socket.id
        };
        addUser(userToAdd);
        console.log('known user added', userToAdd);
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
        channels[channel].users.forEach(function (uuid) {
            users.push(clients[uuid].username);
        });
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

            removeUserFromChannel(user.uuid, channel);

            sendMessageToChannel(channel, user.username + ' left the channel');
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
        //console.log('messages', messages);
        socket.emit('channel messages', messages);
    });

});

/////////////////////////////////////////////////////

var channels = {};
var clients = {};
var sockets = {};
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
    //console.log('messages for ' + channel, messages[channel]);
}

function getMessages(channel) {
    console.log('getMessages('+channel+')');
    var result = [];
    if (messages[channel]) {
        result = messages[channel];
    }
    //console.log('result', result);
    return result;
}

function addUser (user) {
    clients[user.uuid] = user;
    sockets[user.socketId] = clients[user.uuid];
}

function removeUser (user) {
    delete clients[user.uuid];
    delete sockets[user.socketId];
}

function addUserToChannel (uuid, channelName) {
    console.log('channels', channels);
    channels[channelName].users.push(uuid);
    clients[uuid].channels.push(channelName);
}

function removeUserFromChannel (uuid, channelName) {
    for (var i in channels[channelName].users) {
        if (channels[channelName].users.hasOwnProperty(i)) {
            if (channels[channelName].users[i] === uuid) {
                delete channels[channelName].users[i];
                //return;
            }
        }
    }
    var user = clients[uuid];
    for (var j in user.channels) {
        if (user.channels.hasOwnProperty(j)) {
            if (user.channels[j] === channelName) {
                delete user.channels[j];
                //return;
            }
        }
    }
}

function destroyUser (socketId) {
    var user = findUserBySocketId(socketId);

}

function findUserBySocketId (socketId) {
    return sockets[socketId];
}

function addChannel (channel) {
    channels[channel.name] = channel;
}

function removeChannel (channel) {
    delete channels[channel.name];
}

function removeChannelFromUser (uuid, channelName) {

}

function getUserChannels (uuid) {
    return clients[uuid].channels;
}

function sendMessageToChannel (channelName, text) {
    var message = formatChannelMessage(text);
    console.log('sending message', message, channelName);
    io.to(channelName).emit(
        'new channel message',
        message
    );
    addMessage(channelName, message.text);
}
