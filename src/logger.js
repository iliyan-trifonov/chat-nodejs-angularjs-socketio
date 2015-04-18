'use strict';

var config = require('./config.json'),
    winston = require('winston'),
    moment = require('moment');

if (config.logger.enable) {
    var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                timestamp: function () {
                    return moment().format("D MMM HH:MM:ss")
                },
                handleExceptions: true,
                humanReadableUnhandledException: true
            })
        ]
    });
}

if (config.logger.graylog2.enable) {
    logger.add(require('winston-graylog2'), {
        name: 'Chat',
        handleExceptions: true,
        json: true,
        graylog: {
            //TODO: put the facility in config
            facility: 'NodeJS Chat App',
            servers: [{
                host: config.logger.graylog2.host,
                port: config.logger.graylog2.port
            }]
        }
    });
    logger.info('Using graylog2');
}

exports.log = function (msg, meta) {
    if (!config.logger.enable) {
        return false;
    }
    if (!meta) {
        meta = {};
    }
    logger.log(msg, meta);
};

exports.info = function (msg, meta) {
    if (!config.logger.enable) {
        return false;
    }
    if (!meta) {
        meta = {};
    }
    logger.info(msg, meta);
};

exports.error = function (msg, meta) {
    if (!config.logger.enable) {
        return false;
    }
    if (!meta) {
        meta = {};
    }
    logger.error(msg, meta);
};
