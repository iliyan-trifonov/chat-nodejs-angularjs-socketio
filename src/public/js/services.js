'use strict';

angular.module('Chat.services', [])

.service('ChatSocket', [
    function () {
        return {
            'channel': {
                'create': function(channelName) {

                },
                'join': function(channelName) {

                }
            }
        };
    }
])

;
