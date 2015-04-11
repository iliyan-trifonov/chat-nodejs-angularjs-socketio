'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    hat = require('hat'),
    moment = require('moment');

//remove these if using reverse proxy for static files
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
//remove these if using reverse proxy for static files

http.listen(3000, function () {
    console.log('listening on *:3000');
});

io.on('connection', function (socket) {

    console.info('a user connected');

    socket.on('disconnect', function(){
        console.info('a user disconnected');
        destroyUser(socket.id);
    });

    socket.on('create channel', function (channel) {
        console.info('socket:create channel', channel);
        if (channelExists(channel.name)) {
            socketError({
                type: 'channel exists',
                text: 'Channel ' + channel.name + ' already exists!'
            });
            return false;
        }
        socket.join(channel, function (err) {
            if (err) {
                socketError({
                    type: 'join channel err',
                    text: 'Could not join channel ' + channel + '! Error: ' + err
                });
                return false;
            }
            addChannel(channel);
            socket.emit('joined channel', channel);
            console.info('joined channel', channel);
        });
    });

    socket.on('join channel', function (user, channel) {
        console.log('socket:join channel', user, channel);
        //TODO: remove this for multichannel support
        removeUserFromAllChannels(user);
        if (channels[channel.name] && channels[channel.name].password !== channel.password) {
            socketError({
                type: 'join channel err',
                text: 'Could not join channel ' + channel.name + '! Wrong password!'
            });
        }
        socket.join(channel.name, function (err) {
            if (err) {
                socketError({
                    type: 'join channel err',
                    text: 'Could not join channel ' + channel.name + '! Error: ' + err
                });
                return false;
            }
            if (!channelExists(channel.name)) {
                addChannel(channel);
            }
            addUserToChannel(user.uuid, channel.name);
            sendMessageToChannel(channel.name, user.username + ' joined');
            socket.emit('joined channel', channel);
            console.log('joined channel', channel);
        });
    });

    socket.on('new message', function (message) {
        console.log('new message', message);
        var text = formatMessage(message.user, message.text);
        addMessage(message.channel, text.text);
        io.to(message.channel).emit(
            'new message',
            text
        );
    });

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
        console.info('socket: known user', user);
        user.channels = [];
        user.socketId = socket.id;
        addUser(user);
        console.info('known user added', user);
        //socket.emit('known user ready', clients[uuid]);
    });

    socket.on('get channel users list', function (channel) {
        console.log('socket:get channel users list', channel);
        if (!channelExists(channel)) {
            socketError({
                type: 'get channel users list err',
                text: 'Could not get channel users list! Channel doesn\'t exist!'
            });
            return false;
        }
        var users = getChannelUsers(channel);
        console.log('channel users list', users);
        socket.emit('channel users list', users);
    });

    socket.on('leave channel', function (user, channel) {
        console.log('leave channel', user, channel);
        socket.leave(channel, function (err) {
            if (err) {
                socketError({
                    type: 'leave channel err',
                    text: 'Could not leave channel ' + channel + '! Error: ' + err
                });
                return false;
            }
            removeUserFromChannel(user.uuid, channel);
            sendMessageToChannel(channel, user.username + ' left');
            console.log('channel left', channel);
            socket.emit('channel left', channel);
        });
    });

    socket.on('update user', function (uuid, newUsername) {
        console.info('socket:update user', uuid, newUsername);
        var oldUsername = clients[uuid].username;
        clients[uuid].username = newUsername;
        socket.emit('user updated', uuid, oldUsername, newUsername);
        var channels = getUserChannels(uuid);
        channels.forEach(function (channel) {
            var message = formatChannelMessage(oldUsername + ' renamed to ' + newUsername);
            sendMessageToChannel(channel, message);
        });
    });

    socket.on('get messages', function (channel) {
        console.info('socket:get messages', channel);
        var messages = getMessages(channel);
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
    console.info('getMessages('+channel+')');
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
    console.info('channels', channels);
    channels[channelName].users.push(uuid);
    clients[uuid].channels.push(channelName);
}

function removeUserFromChannel (uuid, channelName) {
    var index = channels[channelName].users.indexOf(uuid);
    channels[channelName].users.splice(index, 1);
    var user = clients[uuid];
    index = user.channels.indexOf(channelName);
    user.channels.splice(index, 1);
}

function destroyUser (socketId) {
    var user = findUserBySocketId(socketId);
    var channels = getUserChannels(user.uuid);

    channels.forEach(function (channelName) {
        removeUserFromChannel(user.uuid, channelName);
        sendMessageToChannel(channelName, user.username + ' left');
    });

    removeUser(user);
}

function findUserBySocketId (socketId) {
    return sockets[socketId];
}

function addChannel (channel) {
    channel.users = [];
    channels[channel.name] = channel;
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

function channelExists (channelName) {
    return channels[channelName];
}

function socketError (error) {
    //TODO: check for valid type and text values
    socket.emit('error', error);
    console.error('socket error', error);
}

function removeUserFromAllChannels (user) {
    var channels = getUserChannels(user.uuid);
    channels.forEach(function (channel) {
        removeUserFromChannel(user.uuid, channel);
        sendMessageToChannel(channel, user.username + ' left');
    });
}

function getChannelUsers (channelName) {
    var users = [];
    channels[channelName].users.forEach(function (uuid) {
        users.push(clients[uuid].username);
    });
    return users;
}
