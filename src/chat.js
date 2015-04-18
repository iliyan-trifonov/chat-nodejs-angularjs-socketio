'use strict';

var hat = require('hat'),
    moment = require('moment'),
    log = require('./logger'),
    io;

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
    log.info('addMessage()', { channelName: channel, text: text });
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
    var result = [];
    if (messages[channel]) {
        result = messages[channel];
    }
    log.info('getMessages('+channel+')', { channelName: channel, result: result });
    return result;
}

function addUser (user) {
    clients[user.uuid] = user;
    sockets[user.socketId] = clients[user.uuid];
}

function removeUser (user) {
    if (!user || !user.uuid) {
        return false;
    }
    delete clients[user.uuid];
    delete sockets[user.socketId];
}

function addUserToChannel (uuid, channelName) {
    log.info('channels', { channels: channels });
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
    if (!socketId) {
        return false;
    }
    var user = findUserBySocketId(socketId);
    if (!user || !user.uuid) {
        return false;
    }
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
    //TODO: check when it happens to have a channel with users already populated
    log.info('Adding new channel', {
        channelName: channel.name,
        channelPassword: channel.password
    });
    channel.users = [];
    channels[channel.name] = channel;
}

function getUserChannels (uuid) {
    return clients[uuid].channels;
}

function sendMessageToChannel (channelName, text) {
    var message = formatChannelMessage(text);
    log.info('sending message', { channelName: channelName, text: message });
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

function handleChannelCreate (socket, channel) {
    if (!channel) {
        socketError(socket, {
            type: 'create channel err',
            text: 'Channel not set!'
        });
        return false;
    }
    if (channelExists(channel.name)) {
        socketError(socket, {
            type: 'channel exists',
            text: 'Channel ' + channel.name + ' already exists!'
        });
        return false;
    }
    var user = findUserBySocketId(socket.id);
    if (!user) {
        socketError(socket, {
            type: 'create channel err',
            text: 'Could not find user by this socket\'s id!'
        });
        return false;
    }
    //TODO: remove this for multichannel support
    removeUserFromAllChannels(user);
    joinChannel(socket, user, channel);
}

function handleChannelJoin (socket, user, channel) {
    if (!user || !channel) {
        socketError(socket, {
            type: 'join channel err',
            text: 'User or channel not set!'
        });
        return false;
    }
    /*//will not recreate the channel after server restart:
    if (!channelExists(channel.name)) {
        socketError(socket, {
            type: 'channel does not exist',
            text: 'Channel ' + channel.name + ' does not exist!'
        });
        return false;
    }*/
    //TODO: remove this for multichannel support
    removeUserFromAllChannels(user);
    if (channels[channel.name] && channels[channel.name].password !== channel.password) {
        socketError(socket, {
            type: 'join channel err',
            text: 'Could not join channel ' + channel.name + '! Wrong password!'
        });
        return false;
    }
    joinChannel(socket, user, channel);
}

function joinChannel (socket, user, channel) {
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
        log.info('joined channel', {
            chanelName: channel.name,
            channelPassword: channel.password,
            users: channel.users
        });
        //send the new users list to all users in the channel
        var users = getChannelUsers(channel.name);
        io.to(channel.name).emit('channel users list', users);
    });
}

function handleNewMessage (message) {
    var text = formatMessage(message.user, message.text);
    addMessage(message.channel, text.text);
    io.to(message.channel).emit(
        'new message',
        text
    );
}

function handleCreateUser (socket) {
    var uuid = hat();
    var user = {
        uuid: uuid,
        username: 'Anonymous' + (Math.floor(Math.random() * 10000) + 1000),
        channels: [],
        socketId: socket.id
    };
    addUser(user);
    log.info('created new user', { user: clients[uuid] });
    socket.emit('user created', clients[uuid]);
}

function handleKnownUser (socket, user) {
    if (!user || !user.uuid) {
        socketError(socket, {
            type: 'known user err',
            text: 'User not set!'
        });
        return false;
    }
    user.channels = [];
    user.socketId = socket.id;
    addUser(user);
    log.info('known user added', { user: user });
    //socket.emit('known user ready', clients[uuid]);
}

function handleGetChannelUsersList (socket, channel) {
    if (!channelExists(channel)) {
        socketError(socket, {
            type: 'get channel users list err',
            text: 'Could not get channel users list! Channel doesn\'t exist!'
        });
        return false;
    }
    var users = getChannelUsers(channel);
    log.info('channel users list', { users: users });
    socket.emit('channel users list', users);
}

function handleLeaveChannel (socket, user, channel) {
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
        log.info('channel left', { channelName: channel });
        socket.emit('channel left', channel);
        //send the new users list to all users in the channel
        var users = getChannelUsers(channel);
        io.to(channel).emit('channel users list', users);
    });
}

function handleUpdateUser (socket, uuid, newUsername) {
    var oldUsername = clients[uuid].username;
    clients[uuid].username = newUsername;
    socket.emit('user updated', uuid, oldUsername, newUsername);
    var channels = getUserChannels(uuid);
    channels.forEach(function (channel) {
        sendMessageToChannel(channel, oldUsername + ' renamed to ' + newUsername);
    });
}

function handleGetMessages (socket, channel) {
    var messages = getMessages(channel);
    socket.emit('channel messages', messages);
}

exports.init = function (socket) {
    io = socket;

    io.on('connection', function (socket) {
        log.info('socket:connection', { socketId: socket.id });

        socket.on('disconnect', function(){
            log.info('socket:disconnect', { socketId: socket.id });
            destroyUser(socket.id);
        });

        socket.on('create channel', function (channel) {
            log.info('socket:create channel', { channel: channel });
            handleChannelCreate(socket, channel);
        });

        socket.on('join channel', function (user, channel) {
            log.info('socket:join channel', { user: user, channel: channel });
            handleChannelJoin(socket, user, channel);
        });

        socket.on('new message', function (message) {
            log.info('socket:new message', {
                channelName: message.channel,
                user: message.user,
                text: message.text
            });
            handleNewMessage(message);
        });

        socket.on('create user', function () {
            log.info('socket:create user');
            handleCreateUser(socket);
        });

        socket.on('known user', function (user) {
            log.info('socket:known user', { user: user });
            handleKnownUser(socket, user);
        });

        socket.on('get channel users list', function (channel) {
            log.info('socket:get channel users list', { channelName: channel });
            handleGetChannelUsersList(socket, channel);
        });

        socket.on('leave channel', function (user, channel) {
            log.info('socket:leave channel', {user: user, channel: channel});
            handleLeaveChannel(socket, user, channel);
        });

        socket.on('update user', function (uuid, newUsername) {
            log.info('socket:update user', {uuid: uuid, newUsername: newUsername});
            handleUpdateUser(socket, uuid, newUsername);
        });

        socket.on('get messages', function (channel) {
            log.info('socket:get messages', { channelName: channel });
            handleGetMessages(socket, channel);
        });

    });
};
