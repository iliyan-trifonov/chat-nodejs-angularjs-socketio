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

            .when('/profile', {
                templateUrl: '/templates/profile.html',
                controller: 'ProfileCtrl'
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
        'Channel', '$location', '$rootScope', 'Storage', 'Chat', '$log',
        function (Channel, $location, $rootScope, Storage, Chat, $log) {

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

            //TODO: socket error messages to handle

            socket.on('joined channel', function (channel) {
                $log.info('socket:joined channel', channel);
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('joined channel', channel);
                });
            });

            socket.on('user created', function (newUser) {
                $log.info('socket:user created', newUser);
                user = newUser;
                Storage.user.set(user);
                Storage.channel.set({});
            });

            socket.on('channel users list', function (users) {
                $log.info('socket:channel users list', users);
                $rootScope.$broadcast('channel users list', users);
            });

            //TODO: combine channel and user messages with a flag: message.channel = true/false
            socket.on('new channel message', function (message) {
                $log.info('socket:new channel message'/*, message*/);
                Chat.addText(message.text);
                $rootScope.$broadcast('new channel message', message);
            });

            socket.on('new message', function (message) {
                $log.info('socket:new message'/*, message*/);
                Chat.addText(message.text);
                $rootScope.$broadcast('new message', message);
            });

            //TODO: rename it to left channel
            socket.on('channel left', function (channel) {
                $log.info('socket:channel left', channel);
                $rootScope.$broadcast('channel left', channel);
            });

            socket.on('user updated', function (uuid, oldUsername, newUsername) {
                $log.info('socket:user updated', uuid, oldUsername, newUsername);
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('user updated', uuid, oldUsername, newUsername);
                });
            });

            socket.on('channel messages', function (messages) {
                $log.info('socket:channel messages', 'len = ' + messages.length);
                $rootScope.$broadcast('channel messages', messages);
            });

        }
    ])

    ;

})(angular);
