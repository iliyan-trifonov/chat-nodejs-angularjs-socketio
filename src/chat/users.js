'use strict';

class User {
    constructor (user) {
        this.uuid = user.uuid;
        this.socketId = user.socketId;
        this.name = user.username;
        this.channels = [];
    }

    getUuid () {
        return this.uuid;
    }

    getName () {
        return this.name;
    }

    setName (name) {
        this.name = name;
    }

    addChannel (name) {
        if (this.channels.indexOf(name) === -1) {
            this.channels.push(name);
        }
    }

    removeChannel (name) {
        let index = this.channels.indexOf(name);
        if (index !== -1) {
            this.channels.splice(index, 1);
        }
    }

    getChannels () {
        return this.channels;
    }
}

export default class Users {
    constructor () {
        this.users = {};
        this.sockets = {};
    }

    addUser (user) {
        this.users[user.uuid] = new User(user);
        //connect the socket id with the user
        this.sockets[user.socketId] = this.users[user.uuid];
    }

    getUser (uuid) {
        return this.users[uuid];
    }

    getBySocketId (socketID) {
        return this.sockets[socketID];
    }

    removeUser (uuid) {
        let user = this.getUser(uuid);
        delete this.users[user.uuid];
        delete this.sockets[user.socketId];
    }
}
