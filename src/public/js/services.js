(function (angular) {
    'use strict';

    angular.module('Chat.services', [])

    .service('ChatSocket', [
        function () {
            return {
                'user': {
                    'create': function () {

                    },
                    'update': function (uuid, newUsername) {
                        socket.emit('update user', uuid, newUsername);
                    }
                },
                'channel': {
                    'create': function (channel) {

                    },
                    'join': function (channel) {

                    },
                    'getMessages': function (channel) {
                        socket.emit('get messages', channel);
                    }
                }
            };
        }
    ])

    .factory('Channel', [
        function () {
            var name = '';
            return {
                name: {
                    get: function() {
                        return name;
                    },
                    set: function(newName) {
                        //$log.info('Channel: setting new name', newName);
                        name = newName;
                    }
                },
                getUsers: function(channel) {
                    socket.emit('get channel users list', channel);
                }
            }
        }
    ])

    .factory('Chat', [
        function () {
            var text = [];
            return {
                getText: function() {
                    return text.join('<br/>');
                },
                addText: function(newText) {
                    text.push(newText);
                },
                replaceText: function (newText) {
                    //$log.info('Chat.replaceText() called', newText);
                    text = newText;
                }
            }
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
            }
        }
    ])

    ;

})(angular);
