'use strict';

var config = require('./config.json'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    Chat = require('./chat'),
    Logger = require('winston-console-graylog2-logger');

app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(3000, function () {
    console.info('Chat App listening on *:3000');
});

config.logger = config.logger || {};

var graylog2Cnf = config.logger.graylog2 || {};

graylog2Cnf.enable = graylog2Cnf.enable || false;
graylog2Cnf.host = graylog2Cnf.host || '127.0.0.1';
graylog2Cnf.port = graylog2Cnf.port || '12201';
graylog2Cnf.facility = graylog2Cnf.facility || 'My NodeJS App';

var log = new Logger({
    enable: !!config.logger.enable,
    graylog2: {
        enable: graylog2Cnf.enable,
        host: graylog2Cnf.host,
        port: graylog2Cnf.port,
        facility: graylog2Cnf.facility
    }
});

Chat.init(config, io, log);
