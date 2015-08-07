(function (angular, socket) {
    'use strict';

    angular.module('Chat', [
        'Chat.controllers',
        'Chat.services',
        'Chat.directives',
        'ngRoute',
        'ngSanitize',
        'ui.bootstrap',
        'ngClipboard'
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

            .when('/join/:channel/:pass?', {
                controller: 'ChatCtrl',
                template: " "
            })

            .otherwise({redirectTo: '/'});
    }])

    .run([
        '$location', '$rootScope', 'Storage', 'Chat', '$log', 'ChatSocket', 'Popup',
        function ($location, $rootScope, Storage, Chat, $log, ChatSocket, Popup) {
            var user = Storage.user.get();
            var channel = Storage.channel.get();
            var disconnectedBefore = false;

            //TODO: use MenuCtrl surrounding the top menu only, no rootScope
            $rootScope.Storage = Storage;

            $rootScope.isConnected = false;

            ///socket messages

            //TODO: socket connect error messages to handle
            //TODO: move the socket init to a service or a main Ctrl

            socket.on('connect', function () {
                $log.info('socket:connect');

                $rootScope.$apply(function () {
                    $rootScope.isConnected = true;
                });

                if (disconnectedBefore) {
                    //reconnect to the user's channel
                    disconnectedBefore = false;
                    Popup.close();
                    var usr = Storage.user.get();
                    var chan = Storage.channel.get();
                    if (chan && chan.name && usr) {
                        $log.info('reconnecting after disconnect');
                        $location.path('/chat');
                        ChatSocket.user.known(usr);
                        ChatSocket.channel.join(usr, chan);
                    }
                } else {
                    //first load
                    if (!user || !user.uuid) {
                        Storage.user.set({});
                        Storage.channel.set({});
                        socket.emit('create user');
                    } else {
                        socket.emit('known user', user);
                        $log.info('called:known user', user);
                        //TODO: wait known user to return success
                        if (channel && channel.name) {
                            $rootScope.$apply(function () {
                                $location.path('/chat');
                            });
                            socket.emit('join channel', user, channel);
                            $log.info('called:join channel', channel);
                        }
                    }
                }

                //TODO: load the modal template in advance to be able to show it for unreachable server
                socket.on('disconnect', function () {
                    $log.error('socket:disconnect');
                    $rootScope.$apply(function () {
                        $rootScope.isConnected = false;
                    });
                    disconnectedBefore = true;
                    Popup.show('Error', 'You have been disconnected! Please wait or refresh the page.');
                });

            });

            socket.on('joined channel', function (channel) {
                $log.info('socket:joined channel', channel);
                Storage.channel.set(channel);
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
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('channel users list', users);
                });
            });

            //TODO: combine channel and user messages with a flag: message.channel = true/false

            socket.on('new channel message', function (message) {
                $log.info('socket:new channel message'/*, message*/);
                Chat.addText(message);
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('new channel message', message);
                });
            });

            socket.on('new message', function (message) {
                $log.info('socket:new message'/*, message*/);
                Chat.addText(message);
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('new message', message);
                });
            });

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
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('channel messages', messages);
                });
            });

            socket.on('chat error', function (error) {
                $log.error('socket:chat error', error);
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('chat error', error);
                });
                Popup.show('Error', error.text);
            });

            socket.on('error', function (err) {
                $log.error('socket:error', err);
                //...
            });

        }
    ])

    .value('Flags', function () {
        return {
            joinedChannel: false
        };
    })

    ;

})(angular, socket);
