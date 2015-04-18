'use strict';

var config = require('./config.json'),
    winston = require('winston'),
    moment = require('moment'),
    log2console,
    log2graylog;

if (config.logger.enable) {
    winston.loggers.add('log2console', {
        console: {
            colorize: true,
            timestamp: function () {
                return moment().format("D MMM HH:mm:ss")
            },
            handleExceptions: true,
            humanReadableUnhandledException: true
        }
    });
    log2console = winston.loggers.get('log2console');
    if (config.logger.graylog2.enable) {
        var WinstonGraylog2 = require('winston-graylog2');
        winston.loggers.add('log2graylog', {
            transports: [
                new (WinstonGraylog2)({
                    name: 'Chat',
                    handleExceptions: true,
                    graylog: {
                        //TODO: put the facility in config
                        facility: 'NodeJS Chat App',
                        servers: [{
                            host: config.logger.graylog2.host,
                            port: config.logger.graylog2.port
                        }]
                    }
                })
            ]
        });
        log2graylog = winston.loggers.get('log2graylog');
        log('info', 'Using graylog2', config.logger.graylog2);
    }
}

function log(level, msg, meta) {
    if (!config.logger.enable) {
        return false;
    }
    if (!meta) {
        meta = {};
    }
    if (log2console) {
        log2console.log(level, msg, meta);
    }
    if (log2graylog) {
        log2graylog.log(level, msg + ' ' + JSON.stringify(meta), meta);
    }
}

exports.info = function (msg, meta) {
    log('info', msg, meta);
};

exports.error = function (msg, meta) {
    log('error', msg, meta);
};