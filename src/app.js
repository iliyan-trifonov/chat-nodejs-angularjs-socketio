'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    hat = require('hat'),
    moment = require('moment'),
    log = require('custom-logger').config({ timestamp: "dd mmm HH:MM:ss" });

//remove these if using reverse proxy for static files
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
//remove these if using reverse proxy for static files

http.listen(3000, function () {
    log.info('listening on *:3000');
});

io.on('connection', function (socket) {

    log.info('a user connected');

    socket.on('disconnect', function(){
        log.info('a user disconnected');
        destroyUser(socket.id);
    });

    socket.on('create channel', function (channel) {
        log.info('socket:create channel', channel);
        if (channelExists(channel.name)) {
            socketError(socket, {
                type: 'channel exists',
                text: 'Channel ' + channel.name + ' already exists!'
            });
            return false;
        }
        var user = findUserBySocketId(socket.id);
        //TODO: remove this for multichannel support
        removeUserFromAllChannels(user);
        socket.join(channel, function (err) {
            if (err) {
                socketError(socket, {
                    type: 'join channel err',
                    text: 'Could not join channel ' + channel + '! Error: ' + err
                });
                return false;
            }
            addChannel(channel);
            socket.emit('joined channel', channel);
            log.info('joined channel', channel);
            //repeats with the join channel code below
            addUserToChannel(user.uuid, channel.name);
            sendMessageToChannel(channel.name, user.username + ' joined');
            socket.emit('joined channel', channel);
            log.info('joined channel', channel);
            //send the new users list to all users in the channel
            var users = getChannelUsers(channel.name);
            io.to(channel.name).emit('channel users list', users);
        });
    });

    socket.on('join channel', function (user, channel) {
        log.info('socket:join channel', user, channel);
        //TODO: remove this for multichannel support
        removeUserFromAllChannels(user);
        if (channels[channel.name] && channels[channel.name].password !== channel.password) {
            socketError(socket, {
                type: 'join channel err',
                text: 'Could not join channel ' + channel.name + '! Wrong password!'
            });
            return false;
        }
        socket.join(channel.name, function (err) {
            if (err) {
                socketError(socket, {
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
            log.info('joined channel', channel);
            //send the new users list to all users in the channel
            var users = getChannelUsers(channel.name);
            io.to(channel.name).emit('channel users list', users);
        });
    });

    socket.on('new message', function (message) {
        log.info('new message', message);
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
        log.info('created new user', clients[uuid]);
        socket.emit('user created', clients[uuid]);
    });

    socket.on('known user', function (user) {
        log.info('socket: known user', user);
        user.channels = [];
        user.socketId = socket.id;
        addUser(user);
        log.info('known user added', user);
        //socket.emit('known user ready', clients[uuid]);
    });

    socket.on('get channel users list', function (channel) {
        log.info('socket:get channel users list', channel);
        if (!channelExists(channel)) {
            socketError(socket, {
                type: 'get channel users list err',
                text: 'Could not get channel users list! Channel doesn\'t exist!'
            });
            return false;
        }
        var users = getChannelUsers(channel);
        log.info('channel users list', users);
        socket.emit('channel users list', users);
    });

    socket.on('leave channel', function (user, channel) {
        log.info('leave channel', user, channel);
        socket.leave(channel, function (err) {
            if (err) {
                socketError(socket, {
                    type: 'leave channel err',
                    text: 'Could not leave channel ' + channel + '! Error: ' + err
                });
                return false;
            }
            removeUserFromChannel(user.uuid, channel);
            sendMessageToChannel(channel, user.username + ' left');
            log.info('channel left', channel);
            socket.emit('channel left', channel);
            //send the new users list to all users in the channel
            var users = getChannelUsers(channel);
            io.to(channel).emit('channel users list', users);
        });
    });

    socket.on('update user', function (uuid, newUsername) {
        log.info('socket:update user', uuid, newUsername);
        var oldUsername = clients[uuid].username;
        clients[uuid].username = newUsername;
        socket.emit('user updated', uuid, oldUsername, newUsername);
        var channels = getUserChannels(uuid);
        channels.forEach(function (channel) {
            sendMessageToChannel(channel, oldUsername + ' renamed to ' + newUsername);
        });
    });

    socket.on('get messages', function (channel) {
        log.info('socket:get messages', channel);
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
    log.info('addMessage()', channel, text);
    if (!messages[channel]) {
        messages[channel] = [];
    }
    messages[channel].push(text);
    if (messages[channel].length > 100) {
        messages[channel].splice(0, 1);
    }
    //log.info('messages for ' + channel, messages[channel]);
}

function getMessages(channel) {
    log.info('getMessages('+channel+')');
    var result = [];
    if (messages[channel]) {
        result = messages[channel];
    }
    //log.info('result', result);
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
    log.info('channels', channels);
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
        //send the new users list to all users in the channel
        var users = getChannelUsers(channelName);
        io.to(channelName).emit('channel users list', users);
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
    log.info('sending message', message, channelName);
    io.to(channelName).emit(
        'new channel message',
        message
    );
    addMessage(channelName, message.text);
}

function channelExists (channelName) {
    return channels[channelName];
}

function socketError (socket, error) {
    //TODO: check for valid type and text values
    socket.emit('chat error', error);
    log.error('chat error', error);
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
