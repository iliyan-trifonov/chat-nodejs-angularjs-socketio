(function (angular) {
    'use strict';

    angular.module('Chat', [
        'Chat.controllers',
        'Chat.services',
        'ngRoute',
        'ui.bootstrap'
    ])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider

            .when('/', {
                templateUrl: '/templates/index.html',
                controller: 'IndexCtrl'
            })

            .when('/channel', {
                templateUrl: '/templates/channel.html',
                controller: 'ChannelCtrl'
            })

            .when('/chat', {
                templateUrl: '/templates/chat.html',
                controller: 'ChatCtrl'
            })

            .otherwise({redirectTo: '/'});
    }])

    .run([
        '$window', 'Channel', '$location',
        function ($window, Channel, $location) {
            //TODO: service for localStorage get/set
            var user = JSON.parse($window.localStorage.getItem('user'));
            var channel = JSON.parse($window.localStorage.getItem('channel'));

            function checkChannel() {
                if (channel && channel.name) {
                    console.log('found saved channel, joining it..', channel);
                    socket.emit('join channel', user, channel);
                    socket.on('joined channel', function (channel) {
                        console.log('joined channel', channel);
                        Channel.name.set(channel.name);
                        console.log('channel name set', channel.name);
                        $location.path('/chat');
                        console.log('location path changed');
                    });
                } else {
                    console.log('no saved channel found');
                }
            }

            if (!user || !user.uuid) {
                console.log('user not found, creating..');
                socket.emit('create user');
                socket.on('user created', function (newUser) {
                    console.log('new user created', newUser);
                    user = newUser;
                    $window.localStorage.setItem('user', JSON.stringify(user));
                    checkChannel();
                });
            } else {
                console.log('saved user found', user);
                //TODO check if uuid exists and create new if not
                checkChannel();
            }
        }
    ])

    ;

})(angular);
