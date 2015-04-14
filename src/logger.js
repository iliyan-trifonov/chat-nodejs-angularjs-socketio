'use strict';

var config = require('./config.json'),
    winston = require('winston'),
    moment = require('moment');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: function () {
                return moment().format("D MMM HH:MM:ss")
            },
            handleExceptions: true
        })
    ]
});

if (config.logger.graylog2.enable) {
    logger.add(require('winston-graylog2'), {
        name: 'Chat',
        facility: 'NodeJS Chat App',
        handleExceptions: true,
        graylog: {
            servers: [{
                host: config.logger.graylog2.host,
                port: config.logger.graylog2.port
            }]
        }
    });
    logger.info('Using graylog2');
}

exports.log = function (msg, meta) {
    if (!meta) {
        meta = null;
    }
    logger.log(msg, meta);
};

exports.info = function (msg, meta) {
    if (!meta) {
        meta = null;
    }
    logger.info(msg, meta);
};

exports.error = function (msg, meta) {
    if (!meta) {
        meta = null;
    }
    logger.error(msg, meta);
};
