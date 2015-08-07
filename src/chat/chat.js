'use strict';

import hat from 'hat';
import Channels from './channels';
import Messages from './messages';
import Users from './users';

//TODO: create an Adapter for using in-memory arrays as DB and then another one using Redis or MongoDB
//TODO: this will be done to abstract the storage from the classes

export default class Chat {
    constructor (cnf = {}, socket = null, logger = null) {
        if (!cnf || !socket || !logger) {
            throw new Error('Invalid Chat parameters!');
        }

        cnf.chat = cnf.chat || {};

        let messagesLimit = cnf.chat.messages_limit || 100;

        this.log = logger;

        this.io = socket;

        this.channels = new Channels();
        this.users = new Users();
        this.messages = new Messages(messagesLimit);

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

        socket.on('create channel', channelReq => {
            this.log.info('socket:create channel', { channel: channelReq });
            this.handleChannelCreate(socket, channelReq);
        });

        socket.on('join channel', (user, channelReq) => {
            this.log.info('socket:join channel', { user: user, channel: channelReq });
            this.handleChannelJoin(socket, user, channelReq);
        });

        socket.on('leave channel', (user, channel) => {
            this.log.info('socket:leave channel', {user: user, channel: channel});
            this.handleChannelLeave(socket, user, channel);
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

    /*formatMessage (username, text) {
        return {
            //TODO: put the date format in config
            text: moment().format('D MMM HH:mm:ss') +
            ' <strong>'+username+'</strong>: ' + text
        };
    }*/

    /*formatChannelMessage (text) {
        return {
            //TODO: put the date format in config
            text: moment().format('D MMM HH:mm:ss') + ' ' + text
        };
    }*/

    addMessage (channelName, text, username) {
        this.log.info('addMessage()', { channelName: channelName, text: text, username: username });
        /*if (!this.messages[channelName]) {
            this.messages[channelName] = [];
        }
        this.messages[channelName].push(text);
        if (this.messages[channelName].length > this.messagesLimit) {
            this.messages[channelName].shift();
        }*/
        return this.messages.addMessage(channelName, text, username);
        //this.log.info('messages for ' + channel, messages[channel]);
    }

    getMessages (channelName) {
        let result = [];
        /*if (this.messages[channelName]) {
            result = this.messages[channelName];
        }*/
        result = this.messages.getMessages(channelName);
        this.log.info('getMessages('+channelName+')', { channelName: channelName, result: result });
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
            this.log.error(
                'destroyUser: socket.id is invalid!',
                { socketId: socket.id }
            );
            return false;
        }

        let user = this.findUserBySocketId(socket.id);
        if (!user || !user.uuid) {
            this.log.error(
                'destroyUser: user not found by socket.id!',
                {
                    socketId: socket.id,
                    user: user ? user.uuid : null
                }
            );
            return false;
        }

        this.removeUserFromAllChannels(socket, user, err => {
            if (err) {
                this.log.error(
                    'destroyUser: removeUserFromAllChannels() error!',
                    {
                        socketId: socket.id,
                        user: user ? user.uuid : null,
                        error: err
                    }
                );
                return false;
            }
            this.removeUser(user);
        });
    }

    findUserBySocketId (socketId) {
        //return this.sockets[socketId];
        return this.users.getBySocketId(socketId);
    }

    addChannel (channelReq) {
        //TODO: check when it happens to have a channel with users already populated
        this.log.info('Adding new channel', {
            channelName: channelReq.name,
            channelPassword: channelReq.password
        });
        //channel.users = [];
        //this.channels[channel.name] = channel;
        this.channels.addChannel(channelReq);
    }

    getUserChannels (uuid) {
        //return this.clients[uuid].channels;
        return this.users.getUser(uuid).getChannels();
    }

    sendMessageToChannel (channelName, text) {
        //let message = this.formatChannelMessage(text);
        let message = this.messages.addMessage(channelName, text);
        this.log.info('sending message', { channelName: channelName, text: message.getMessage() });
        this.io.to(channelName).emit(
            'new channel message',
            message.getMessage()
        );
        //this.addMessage(channelName, message.text);
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

    handleChannelCreate (socket, channelReq) {
        if (!channelReq) {
            this.socketError(socket, {
                type: 'create channel err',
                text: 'Channel not set!'
            });
            return false;
        }
        if (this.channelExists(channelReq.name)) {
            this.socketError(socket, {
                type: 'channel exists',
                text: 'Channel ' + channelReq.name + ' already exists!'
            });
            return false;
        }
        let user = this.findUserBySocketId(socket.id);
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
            this.joinChannel(socket, user, channelReq);
        });
    }

    handleChannelJoin (socket, userReq, channelReq) {
        if (!userReq || !channelReq) {
            this.socketError(socket, {
                type: 'join channel err',
                text: 'User or channel not set!'
            });
            return false;
        }

        let user = this.users.getUser(userReq.uuid);

        /*//with this the channel will not be recreated after server restart:
         if (!this.channelExists(channel.name)) {
         socketError(socket, {
         type: 'channel does not exist',
         text: 'Channel ' + channel.name + ' does not exist!'
         });
         return false;
         }*/

        let channel = this.channels.getChannel(channelReq.name);

        if (channel && !channel.validatePass(channelReq.password)) {
        /*if (this.channels[channel.name] &&
            this.channels[channel.name].password !== channel.password
        ) {*/
            this.socketError(socket, {
                type: 'join channel err',
                text: 'Could not join channel ' + channel.getName() + '! Wrong password!'
            });
            return false;
        }
        //TODO: remove this for multichannel support:
        this.removeUserFromAllChannels(socket, user, err => {
            if (err) {
                //...
                return false;
            }
            this.joinChannel(socket, user, channelReq);
        });
    }

    joinChannel (socket, user, channelReq) {
        socket.join(channelReq.name, err => {
            if (err) {
                this.socketError(socket, {
                    type: 'join channel err',
                    text: 'Could not join channel "' + channelReq.name + '"! Error: ' + err
                });
                return false;
            }
            if (!this.channelExists(channelReq.name)) {
                this.addChannel(channelReq);
            }
            let channel = this.channels.getChannel(channelReq.name);
            this.addUserToChannel(user.getUuid(), channel.getName());
            this.sendMessageToChannel(channel.getName(), user.getName() + ' joined');
            socket.emit('joined channel', {
                name: channel.getName(),
                password: channel.getPassword()
            });
            let users = this.getChannelUsers(channel.getName());
            this.log.info('joined channel', {
                chanelName: channel.getName(),
                channelPassword: channel.getPassword(),
                users: users
            });
            //send the new users list to all users in the channel
            this.io.to(channel.getName()).emit('channel users list', users);
        });
    }

    handleNewMessage (message) {
        //let text = this.formatMessage(message.user, message.text);
        let m = this.addMessage(message.channel, message.text, message.user);
        this.io.to(message.channel).emit(
            'new message',
            m.getMessage()
        );
    }

    handleCreateUser (socket) {
        let uuid = hat();//makes the user unique
        //TODO: check and generate/use a non-existent username only
        let user = {
            uuid: uuid,
            //Anonymous1000-10000
            username: 'Anonymous' + (Math.floor(Math.random() * 9000) + 1000),
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

    handleKnownUser (socket, userReq) {
        if (!userReq || !userReq.uuid) {
            this.socketError(socket, {
                type: 'known user err',
                text: 'User not set!'
            });
            return false;
        }
        userReq.socketId = socket.id;
        this.addUser(userReq);
        this.log.info('known user added', { user: userReq });
        //socket.emit('known user ready', clients[uuid]);
        socket.emit('known user ready', {
            uuid: userReq.uuid,
            //username: this.clients[uuid].username
            username: this.users.getUser(userReq.uuid).getName()
        });
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

    handleChannelLeave (socket, userReq, channelName) {
        socket.leave(channelName, err => {
            if (err) {
                this.socketError(socket, {
                    type: 'leave channel err',
                    text: 'Could not leave channel ' + channelName + '! Error: ' + err
                });
                return false;
            }

            let user = this.users.getUser(userReq.uuid);

            this.removeUserFromChannel(socket, user.getUuid(), channelName, err => {
                if (err) {
                    this.log.error(
                        'handleChannelLeave() removeUserFromChannel error',
                        {
                            socketID: socket.id,
                            uuid: user.getUuid(),
                            channelName: channelName,
                            error: err
                        }
                    );
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

    handleGetMessages (socket, channelName) {
        let messages = this.getMessages(channelName);
        socket.emit('channel messages', messages);
    }
}
