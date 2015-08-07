'use strict';

class Channel {
    constructor (channel) {
        this.name = channel.name;
        this.password = channel.password || '';
        this.users = [];
    }

    getName () {
        return this.name;
    }

    getPassword () {
        return this.password;
    }

    addUser (uuid) {
        if (this.users.indexOf(uuid) === -1) {
            this.users.push(uuid);
        }
    }

    removeUser (uuid) {
        let index = this.users.indexOf(uuid);
        if (index !== -1) {
            this.users.splice(index, 1);
        }
    }

    getUsers () {
        return this.users;
    }

    validatePass (pass) {
        return this.password === pass;
    }
}

export default class Channels {
    constructor () {
        this.channels = {};
    }

    addChannel (channel) {
        this.channels[channel.name] = new Channel(channel);
    }

    getChannel (name) {
        return this.channels[name];
    }

    /*removeChannel (name) {
     delete this.channels[name];
     }*/
}
