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
        'Channel', '$location', '$rootScope', 'Storage',
        function (Channel, $location, $rootScope, Storage) {

            var user = Storage.user.get();
            var channel = Storage.channel.get();

            //TODO: use MenuCtrl surrounding the top menu only, no rootScope
            $rootScope.Channel = Channel;
            $rootScope.user = user.username;

            if (!user || !user.uuid) {
                Storage.user.set({});
                Storage.channel.set({});
                socket.emit('create user');
            } else {
                socket.emit('known user', user);
                if (channel && channel.name) {
                    $location.path('/chat');
                    socket.emit('join channel', user, channel);
                }
            }

            ///socket messages

            socket.on('joined channel', function (channel) {
                console.log('socket:joined channel', channel);
                $rootScope.$broadcast('joined channel', channel);
            });

            socket.on('user created', function (newUser) {
                console.log('socket:user created', newUser);
                user = newUser;
                Storage.user.set(user);
                Storage.channel.set({});
            });

            socket.on('channel users list', function (users) {
                console.log('socket:channel users list', users);
                $rootScope.$broadcast('channel users list', users);
            });

            //TODO: combine channel and user messages with a flag: message.channel = true/false
            socket.on('new channel message', function (message) {
                console.log('socket:new channel message', message);
                $rootScope.$broadcast('new channel message', message);
            });

            socket.on('new message', function (message) {
                console.log('socket:new message', message);
                $rootScope.$broadcast('new message', message);
            });

            //TODO: rename it to left channel
            socket.on('channel left', function (channel) {
                console.log('socket:channel left', channel);
                $rootScope.$broadcast('channel left', channel);
            });

        }
    ])

    ;

})(angular);
