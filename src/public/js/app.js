(function (angular) {
    'use strict';

    angular.module('Chat', [
        'Chat.controllers',
        'Chat.services',
        'ngRoute',
        'ngSanitize',
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
        '$window', 'Channel', '$location', '$rootScope',
        function ($window, Channel, $location, $rootScope) {
            //TODO: service for localStorage get/set
            var user = JSON.parse($window.localStorage.getItem('user'));
            var channel = JSON.parse($window.localStorage.getItem('channel'));

            function checkChannel() {
                console.log('checking for stored channel name');
                if (channel && channel.name) {
                    console.log('found saved channel', channel);
                    if (Channel.joined()) {
                        console.log('channel already joined', channel);
                        Channel.name.set(channel.name);
                        $location.path('/chat');
                    } else {
                        console.log('joining the saved channel', channel);
                        $location.path('/chat');
                        socket.emit('join channel', user, channel);
                        socket.on('joined channel', function (channel) {
                            console.log('joined channel', channel);
                            Channel.name.set(channel.name);
                            Channel.join();
                            $rootScope.$broadcast('channel joined', channel.name);
                        });
                    }
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
