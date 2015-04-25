(function (angular, socket) {
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
        '$location', '$rootScope', 'Storage', 'Chat', '$log', '$modal', '$modalStack', 'ChatSocket',
        function ($location, $rootScope, Storage, Chat, $log, $modal, $modalStack, ChatSocket) {

            $log.info('App run()');

            var user = Storage.user.get();
            var channel = Storage.channel.get();
            var disconnectedBefore = false;

            //TODO: use MenuCtrl surrounding the top menu only, no rootScope
            $rootScope.Storage = Storage;

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

            //TODO: socket connect error messages to handle
            //TODO: move the socket init to a service or a main Ctrl

            socket.on('joined channel', function (channel) {
                $log.info('socket:joined channel', channel);
                Storage.channel.set(channel);
                //$location.path('/chat');
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('joined channel', channel);
                });
            });

            socket.on('user created', function (newUser) {
                $log.info('socket:user created', newUser);
                user = newUser;
                Storage.user.set(user);
                Storage.channel.set({});
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('user created', user);
                });
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
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('channel left', channel);
                });
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

            socket.on('chat error', function (error) {
                $log.error('socket:chat error', error);
                $rootScope.$broadcast('chat error', error);
                //
                $modalStack.dismissAll();
                $modal.open({
                    templateUrl: 'myModalContent.html',
                    controller: 'ModalInstanceCtrl',
                    size: 'sm',
                    resolve: {
                        title: function () {
                            return 'Error';
                        },
                        body: function () {
                            return error.text;
                        }
                    }
                });
            });

            $rootScope.isConnected = false;
            socket.on('connect', function () {
                $log.info('socket:connect');
                $rootScope.$apply(function () {
                    $rootScope.isConnected = true;
                });
                //reconnect to the user's channel
                if (disconnectedBefore) {
                    disconnectedBefore = false;
                    $modalStack.dismissAll();
                    var user = Storage.user.get();
                    var channel = Storage.channel.get();
                    if (channel && channel.name && user) {
                        $log.info('reconnecting after disconnect');
                        $location.path('/chat');
                        ChatSocket.user.known(user);
                        ChatSocket.channel.join(user, channel);
                    }
                }
            });
            socket.on('disconnect', function () {
                $log.info('socket:disconnect');
                $rootScope.$apply(function () {
                    $rootScope.isConnected = false;
                });
                disconnectedBefore = true;
                $modalStack.dismissAll();
                $modal.open({
                    templateUrl: 'myModalContent.html',
                    controller: 'ModalInstanceCtrl',
                    size: 'sm',
                    resolve: {
                        title: function () {
                            return 'Error';
                        },
                        body: function () {
                            return 'You have been disconnected! Please refresh.';
                        }
                    }
                });
            });
            socket.on('error', function (err) {
                $log.info('socket:error', err);
                //...
            });

        }
    ])

    ;

})(angular, socket);
