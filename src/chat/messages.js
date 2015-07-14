'use strict';

import moment from 'moment';

//TODO: add message ID to be able to edit/delete a message

class Message {
    constructor (text, username) {
        this.date = moment().format('D MMM HH:mm:ss');
        this.text = text;
        this.username = username;
    }

    getMessage () {
        //TODO: leave the formatting to the front-end: return the whole object instead
        let text = this.text;

        if (this.username) {
            text = '<strong>' + this.username + '</strong>: ' + text;
        }

        return this.date + ' ' + text;
    }
}

export default class Messages {
    constructor (limit = 100) {
        this.messages = [];
        this.limit = limit;
    }

    createArray (channelName) {
        if (!this.messages[channelName]) {
            this.messages[channelName] = [];
        }
    }

    addMessage (channelName, text, username) {
        this.createArray(channelName);

        let message = new Message(text, username);

        this.messages[channelName].push(message);

        if (this.messages[channelName].length > this.limit) {
            this.messages[channelName].shift();
        }

        return message;
    }

    getMessages (channelName) {
        this.createArray(channelName);

        let result = [];

        for (let message of this.messages[channelName]) {
            result.push(message.getMessage());
        }

        return result;
    }
}
