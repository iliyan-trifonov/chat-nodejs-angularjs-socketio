(function (angular) {
    'use strict';

    angular.module('Chat.services', [])

    .service('ChatSocket', [
        function () {
            return {
                'channel': {
                    'create': function (channelName) {

                    },
                    'join': function (channelName) {

                    }
                }
            };
        }
    ])

    .factory('Channel', [
        function () {
            var name = '';
            var joined = false;
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
                join: function () {
                    joined = true;
                },
                joined: function () {
                    return joined;
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
                    return text;
                },
                addText: function(newText) {
                    text += newText + '<br />\n';
                }
            }
        }
    ])

    ;

})(angular);
