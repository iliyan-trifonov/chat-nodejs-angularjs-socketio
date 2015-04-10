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
                        console.log('Channel: setting new name', newName);
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
            var text = '';
            return {
                getText: function() {
                    console.log('Chat.getText() called', text);
                    return text;
                },
                addText: function(newText) {
                    text += newText + '<br />\n';
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
                        console.log('Storage: get user', user);
                        return user;
                    },
                    set: function (user) {
                        console.log('Storage: setting new user', user);
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
