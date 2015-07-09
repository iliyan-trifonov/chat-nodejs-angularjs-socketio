'use strict';

import hat from 'hat';
import moment from 'moment';
import Channels from './channels';
import Users from './users';

//TODO: create an Adapter for using in-memory arrays as DB and then another one using Redis or MongoDB
//TODO: this will be done to abstract the storage from the classes

export default class Chat {
    constructor (cnf = {}, socket = null, logger = null) {
        if (!cnf || !socket || !logger) {
            throw new Error('Invalid Chat parameters!');
        }

        cnf.chat = cnf.chat || {};

        this.messagesLimit = cnf.chat.messages_limit || 100;

        this.log = logger;

        this.io = socket;

        this.channels = new Channels();
        this.users = new Users();
        this.messages = {};

        this.io.on('connection', socket => {
            this.log.info('socket:connection', { socketId: socket.id });
            this.assignUserSocketEvents(socket);
        });
    }

    assignUserSocketEvents (socket) {
        socket.on('disconnect', () => {
            this.log.info('socket:disconnect', { socketId: socket.id });
            this.destroyUser(socket);
        });

        socket.on('create channel', channel => {
            this.log.info('socket:create channel', { channel: channel });
            this.handleChannelCreate(socket, channel);
        });

        socket.on('join channel', (user, channel) => {
            this.log.info('socket:join channel', { user: user, channel: channel });
            this.handleChannelJoin(socket, user, channel);
        });

        socket.on('leave channel', (user, channel) => {
            this.log.info('socket:leave channel', {user: user, channel: channel});
            this.handleLeaveChannel(socket, user, channel);
        });

        socket.on('new message', message => {
            this.log.info('socket:new message', {
                channelName: message.channel,
                user: message.user,
                text: message.text
            });
            this.handleNewMessage(message);
        });

        socket.on('create user', () => {
            this.log.info('socket:create user');
            this.handleCreateUser(socket);
        });

        socket.on('known user', user => {
            this.log.info('socket:known user', { user: user });
            this.handleKnownUser(socket, user);
        });

        socket.on('get channel users list', channel => {
            this.log.info('socket:get channel users list', { channelName: channel });
            this.handleGetChannelUsersList(socket, channel);
        });

        socket.on('update user', (uuid, newUsername) => {
            this.log.info('socket:update user', {uuid: uuid, newUsername: newUsername});
            this.handleUpdateUser(socket, uuid, newUsername);
        });

        socket.on('get messages', channel => {
            this.log.info('socket:get messages', { channelName: channel });
            this.handleGetMessages(socket, channel);
        });
    }

    formatMessage (username, text) {
        return {
            //TODO: put the date format in config
            text: moment().format('D MMM HH:mm:ss') +
            ' <strong>'+username+'</strong>: ' + text
        };
    }

    formatChannelMessage (text) {
        return {
            //TODO: put the date format in config
            text: moment().format('D MMM HH:mm:ss') + ' ' + text
        };
    }

    addMessage (channel, text) {
        this.log.info('addMessage()', { channelName: channel, text: text });
        if (!this.messages[channel]) {
            this.messages[channel] = [];
        }
        this.messages[channel].push(text);
        if (this.messages[channel].length > this.messagesLimit) {
            this.messages[channel].shift();
        }
        //this.log.info('messages for ' + channel, messages[channel]);
    }

    getMessages (channel) {
        let result = [];
        if (this.messages[channel]) {
            result = this.messages[channel];
        }
        this.log.info('getMessages('+channel+')', { channelName: channel, result: result });
        return result;
    }

    addUser (user) {
        //this.clients[user.uuid] = user;
        //this.sockets[user.socketId] = this.clients[user.uuid];
        this.users.addUser(user);
    }

    removeUser (user) {
        if (!user || !user.uuid) {
            return false;
        }
        //delete this.sockets[user.socketId];
        //delete this.clients[user.uuid];
        this.users.removeUser(user.uuid);
    }

    addUserToChannel (uuid, channelName) {
        //this.channels[channelName].users.push(uuid);
        this.channels.getChannel(channelName).addUser(uuid);
        //this.clients[uuid].channels.push(channelName);
        this.users.getUser(uuid).addChannel(channelName);
    }

    removeUserFromChannel (socket, uuid, channelName, done) {
        socket.leave(channelName, err => {
            if (err) {
                this.socketError(socket, {
                    type: 'leave channel err',
                    text: 'Could not leave channel ' + channelName + '! Error: ' + err
                });
                return done(err);
            }

            //let index = this.channels[channelName].users.indexOf(uuid);
            //this.channels[channelName].users.splice(index, 1);
            this.channels.getChannel(channelName).removeUser(uuid);

            //let user = this.clients[uuid];
            //let index = user.channels.indexOf(channelName);
            //user.channels.splice(index, 1);
            this.users.getUser(uuid).removeChannel(channelName);
            //socket.emit('channel left', channelName);
            return done();
        });
    }

    destroyUser (socket) {
        if (!socket.id) {
            return false;
        }
        let user = this.findUserBySocketId(socket.id);
        if (!user || !user.uuid) {
            return false;
        }

        this.removeUserFromAllChannels(socket, user, err => {
            if (err) {
                //...
                return false;
            }
            this.removeUser(user);
        });
    }

    findUserBySocketId (socketId) {
        //return this.sockets[socketId];
        return this.users.getBySocketId(socketId);
    }

    addChannel (channel) {
        //TODO: check when it happens to have a channel with users already populated
        this.log.info('Adding new channel', {
            channelName: channel.name,
            channelPassword: channel.password
        });
        //channel.users = [];
        //this.channels[channel.name] = channel;
        this.channels.addChannel(channel);
    }

    getUserChannels (uuid) {
        //return this.clients[uuid].channels;
        return this.users.getUser(uuid).getChannels();
    }

    sendMessageToChannel (channelName, text) {
        let message = this.formatChannelMessage(text);
        this.log.info('sending message', { channelName: channelName, text: message });
        this.io.to(channelName).emit(
            'new channel message',
            message
        );
        this.addMessage(channelName, message.text);
    }

    channelExists (channelName) {
        //return this.channels[channelName];
        return this.channels.getChannel(channelName);
    }

    socketError (socket, error) {
        //TODO: check for valid type and text values
        socket.emit('chat error', error);
        this.log.error('chat error', error);
    }

    removeUserFromAllChannels (socket, user, done) {
        let channels = this.getUserChannels(user.uuid);
        let counter = channels.length;
        if (counter === 0) {
            return done();
        }
        channels.forEach(channel => {
            this.removeUserFromChannel(socket, user.uuid, channel, err => {
                if (err) {
                    return done(err);
                }
                //repeats with the same message from handleChannelLeave()
                this.sendMessageToChannel(channel, user.getName() + ' left');
                //send the new users list to all users in the channel
                let users = this.getChannelUsers(channel);
                this.io.to(channel).emit('channel users list', users);
                counter--;
                if (counter === 0) {
                    return done();
                }
            });
        });
    }

    getChannelUsers (channelName) {
        let users = [];
        /*this.channels[channelName].users.forEach(uuid => {
            users.push(this.clients[uuid].username);
        });*/
        this.channels.getChannel(channelName).getUsers().forEach(uuid => {
            //users.push(this.clients[uuid].username);
            users.push(this.users.getUser(uuid).getName());
        });
        return users;
    }

    handleChannelCreate (socket, channel) {
        if (!channel) {
            this.socketError(socket, {
                type: 'create channel err',
                text: 'Channel not set!'
            });
            return false;
        }
        if (this.channelExists(channel.name)) {
            this.socketError(socket, {
                type: 'channel exists',
                text: 'Channel ' + channel.name + ' already exists!'
            });
            return false;
        }
        let user = this.findUserBySocketId(socket.id);
        console.log('user from socketId', user);
        if (!user) {
            this.socketError(socket, {
                type: 'create channel err',
                text: 'Could not find user by this socket\'s id!'
            });
            return false;
        }
        //TODO: remove this for multichannel support
        this.removeUserFromAllChannels(socket, user, err => {
            if (err) {
                //...
                return false;
            }
            this.joinChannel(socket, user, channel);
        });
    }

    handleChannelJoin (socket, user, channel) {
        if (!user || !channel) {
            this.socketError(socket, {
                type: 'join channel err',
                text: 'User or channel not set!'
            });
            return false;
        }

        user = this.users.getUser(user.uuid);

        /*//with this the channel will not be recreated after server restart:
         if (!this.channelExists(channel.name)) {
         socketError(socket, {
         type: 'channel does not exist',
         text: 'Channel ' + channel.name + ' does not exist!'
         });
         return false;
         }*/

        let chan = this.channels.getChannel(channel.name);

        if (chan && !chan.validatePass(channel.password)) {
        /*if (this.channels[channel.name] &&
            this.channels[channel.name].password !== channel.password
        ) {*/
            this.socketError(socket, {
                type: 'join channel err',
                text: 'Could not join channel ' + channel.name + '! Wrong password!'
            });
            return false;
        }
        //TODO: remove this for multichannel support:
        this.removeUserFromAllChannels(socket, user, err => {
            if (err) {
                //...
                return false;
            }
            this.joinChannel(socket, user, channel);
        });
    }

    joinChannel (socket, user, channel) {
        socket.join(channel.name, err => {
            if (err) {
                this.socketError(socket, {
                    type: 'join channel err',
                    text: 'Could not join channel "' + channel.name + '"! Error: ' + err
                });
                return false;
            }
            if (!this.channelExists(channel.name)) {
                this.addChannel(channel);
            }
            this.addUserToChannel(user.uuid, channel.name);
            this.sendMessageToChannel(channel.name, user.getName() + ' joined');
            socket.emit('joined channel', channel);
            channel.users = this.getChannelUsers(channel.name);
            this.log.info('joined channel', {
                chanelName: channel.name,
                channelPassword: channel.password,
                users: channel.users
            });
            //send the new users list to all users in the channel
            this.io.to(channel.name).emit('channel users list', channel.users);
        });
    }

    handleNewMessage (message) {
        let text = this.formatMessage(message.user, message.text);
        this.addMessage(message.channel, text.text);
        this.io.to(message.channel).emit(
            'new message',
            text
        );
    }

    handleCreateUser (socket) {
        let uuid = hat();//makes the user unique
        //TODO: check and generate/use a non-existent username only
        let user = {
            uuid: uuid,
            //Anonymous1000-10000
            username: 'Anonymous' + (Math.floor(Math.random() * 9000) + 1000),
            channels: [],
            socketId: socket.id
        };
        this.addUser(user);
        //this.log.info('created new user', { user: this.clients[uuid] });
        this.log.info('created new user', { user: this.users.getUser(uuid) });
        socket.emit('user created', {
            uuid: uuid,
            //username: this.clients[uuid].username
            username: this.users.getUser(uuid).getName()
        });
    }

    handleKnownUser (socket, user) {
        if (!user || !user.uuid) {
            this.socketError(socket, {
                type: 'known user err',
                text: 'User not set!'
            });
            return false;
        }
        user.channels = [];
        user.socketId = socket.id;
        this.addUser(user);
        this.log.info('known user added', { user: user });
        //socket.emit('known user ready', clients[uuid]);
    }

    handleGetChannelUsersList (socket, channelName) {
        if (!this.channelExists(channelName)) {
            this.socketError(socket, {
                type: 'get channel users list err',
                text: 'Could not get users list for "'+channelName+'"! Channel doesn\'t exist!'
            });
            return false;
        }
        let users = this.getChannelUsers(channelName);
        this.log.info('channel users list', { users: users });
        socket.emit('channel users list', users);
    }

    handleLeaveChannel (socket, user, channelName) {
        socket.leave(channelName, err => {
            if (err) {
                this.socketError(socket, {
                    type: 'leave channel err',
                    text: 'Could not leave channel ' + channelName + '! Error: ' + err
                });
                return false;
            }

            user = this.users.getUser(user.uuid);

            this.removeUserFromChannel(socket, user.uuid, channelName, err => {
                if (err) {
                    //...
                    return false;
                }
                socket.emit('channel left', channelName);
                this.sendMessageToChannel(channelName, user.getName() + ' left');
                //send the new users list to all users in the channel
                let users = this.getChannelUsers(channelName);
                this.io.to(channelName).emit('channel users list', users);
                this.log.info('channel left', { channelName: channelName });
            });
        });
    }

    handleUpdateUser (socket, uuid, newUsername) {
        //let oldUsername = this.clients[uuid].username;
        //this.clients[uuid].username = newUsername;
        let user = this.users.getUser(uuid);
        let oldUsername = user.getName();
        user.setName(newUsername);
        socket.emit('user updated', uuid, oldUsername, newUsername);
        let channels = this.getUserChannels(uuid);
        channels.forEach(channel => {
            this.sendMessageToChannel(channel, oldUsername + ' renamed to ' + newUsername);
        });
    }

    handleGetMessages (socket, channel) {
        let messages = this.getMessages(channel);
        socket.emit('channel messages', messages);
    }
}
