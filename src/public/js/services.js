(function (angular, socket) {
    'use strict';

    angular.module('Chat.services', [])

    .service('ChatSocket', [
        function () {
            return {
                'user': {
                    'create': function () {
                        socket.emit('create user');
                    },
                    'known': function (user) {
                        socket.emit('known user', user);
                    },
                    'update': function (uuid, newUsername) {
                        socket.emit('update user', uuid, newUsername);
                    }
                },
                'channel': {
                    'create': function (channel) {

                    },
                    'join': function (user, channel) {
                        socket.emit('join channel', user, channel);
                    },
                    'getMessages': function (channel) {
                        socket.emit('get messages', channel);
                    },
                    'getUsers': function (channelName) {
                        socket.emit('get channel users list', channelName);
                    }
                }
            };
        }
    ])

    .factory('Chat', [
        '$location',
        function ($location) {
            var text = [];
            return {
                getText: function() {
                    return text.join('<br/>');
                },
                addText: function(newText) {
                    text.push(newText);
                },
                replaceText: function (newText) {
                    text = newText;
                },
                getInviteLink: function (channel) {
                    var url = $location.protocol() +
                        '://' +
                        $location.host() +
                        ':' +
                        $location.port() +
                        '/#/join/' +
                        channel.name;
                    return {
                        url: url +
                            (channel.password ? '/' + channel.password : ''),
                        text: url + (channel.password ? '/***' : '')
                    };
                }
            };
        }
    ])

    .service('Storage', [
        '$window',
        function ($window) {
            return {
                user: {
                    get: function () {
                        var user = {};
                        if ($window.localStorage.getItem('user')) {
                            user = JSON.parse($window.localStorage.getItem('user'));
                        }
                        //$log.info('Storage: get user', user);
                        return user;
                    },
                    set: function (user) {
                        //$log.info('Storage: setting new user', user);
                        $window.localStorage.setItem('user', JSON.stringify(user));
                    }
                },
                channel: {
                    get: function () {
                        var channel = {};
                        if ($window.localStorage.getItem('channel')) {
                            channel = JSON.parse($window.localStorage.getItem('channel'));
                        }
                        return channel;
                    },
                    set: function (channel) {
                        $window.localStorage.setItem('channel', JSON.stringify(channel));
                    }
                }
            };
        }
    ])

    ;

})(angular, socket);
