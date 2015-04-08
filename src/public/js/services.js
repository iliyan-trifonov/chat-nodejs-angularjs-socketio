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
            return {
                name: {
                    get: function() {
                        return name;
                    },
                    set: function(newName) {
                        name = newName;
                    }
                }
            }
        }
    ])

    ;

})(angular);
