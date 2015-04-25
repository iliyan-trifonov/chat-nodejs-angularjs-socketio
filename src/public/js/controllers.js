(function (angular, socket) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {
            //...
        }
    ])

    .controller('ChannelCtrl', [
        '$scope', '$location', 'Storage', '$timeout',
        function ($scope, $location, Storage, $timeout) {

            var user = Storage.user.get();

            $scope.channel = {
                name: '',
                password: ''
            };

            //TODO: add a loading indicator until the channel is joined and page changed or error is returned

            $scope.createChannel = function () {
                $location.path('/chat');
                $timeout(function () {
                    socket.emit('create channel', {
                        name: $scope.channel.name,
                        password: $scope.channel.password
                    });
                });
            };

            $scope.joinChannel = function () {
                $location.path('/chat');
                $timeout(function () {
                    socket.emit('join channel', user, {
                        name: $scope.channel.name,
                        password: $scope.channel.password
                    });
                });
            };
        }
    ])

    .controller('ChatCtrl', [
        '$scope', 'Chat', '$location', 'Storage', 'ChatSocket', '$routeParams', '$log', 'parseUrl', '$timeout',
        function ($scope, Chat, $location, Storage, ChatSocket, $routeParams, $log, parseUrl, $timeout) {

            focusMessageInput();

            var user = Storage.user.get();
            var channel = Storage.channel.get();

            //TODO: put it in a directive
            var chatContents = angular.element(
                document.querySelector('.chat_contents')
            );

            if (channel && channel.name) {
                $scope.channel = channel.name;
            }

            $scope.users = [];



            //TODO: put it in a directive
            function focusMessageInput () {
                $timeout(function () {
                    angular.element(
                        document.querySelector('#messageinput')
                    ).focus();
                });
            }

            function joinChatUrl () {
                var channel = $routeParams.channel;
                var pass = $routeParams.pass || '';

                $log.info('joining channel = "' + channel + '", pass = "' + pass + '"');

                //the same function as in the ChannelCtrl
                function joinChannel (channel, pass, user) {
                    //redirect from /join to /chat
                    $location.path('/chat');
                    socket.emit('join channel', user, {
                        name: channel,
                        password: pass
                    });
                }

                if (!channel) {
                    $log.info('No valid channel specified, redirecting to /');
                    $location.path('/');
                } else {
                    if (!user || !user.uuid) {
                        $log.info('Waiting for the user to be created');
                        $scope.$on('user created', function (event, user) {
                            joinChannel(channel, pass, user);
                        });
                    } else {
                        joinChannel(channel, pass, user);
                    }
                }
            }

            if (/^\/join\/.+/.test($location.path())) {
                $log.info('ChatCtrl: join chat url detected', $location.path());
                joinChatUrl();
            }

            $scope.sendMessage = function () {
                if ($scope.message) {
                    socket.emit('new message', {
                        channel: $scope.channel,
                        user: user.username,
                        text: $scope.message
                    });
                    delete $scope.message;
                }
            };

            $scope.messageKeyPressed = function (event) {
                if (event.keyCode === 13 && $scope.message) {
                    $scope.sendMessage();
                }
            };

            //TODO: put it in a directive
            function scrollChatText() {
                chatContents.scrollTop(chatContents[0].scrollHeight);
            }

            $scope.leaveChannel = function () {
                socket.emit(
                    'leave channel',
                    {
                        uuid: user.uuid,
                        username: user.username
                    },
                    $scope.channel
                );
            };

            ///socket messages

            $scope.$on('joined channel', function (event, channel) {
                $scope.channel = channel.name;
                ChatSocket.channel.getMessages($scope.channel);
                focusMessageInput();
            });

            $scope.$on('channel users list', function (event, users) {
                //TODO: check if this needs $apply()
                $scope.$apply(function () {
                    $scope.users = users;
                });
            });

            function showText () {
                //TODO: check if $apply() is needed here
                $scope.$apply(function () {
                    $scope.chatText = Chat.getText();
                    //TODO: check if $timeout() is needed here
                    $timeout(function () {
                        scrollChatText();
                    });
                });
            }

            //TODO: directive for html adding - dom manipulation
            //TODO: use the same body for user and channel message with
            //TODO: one flag: message.channel = true/false
            $scope.$on('new channel message', function (event, message) {
                showText();
            });

            //TODO: directive for html adding
            $scope.$on('new message', function (event, message) {
                showText();
            });

            //TODO: rename to left channel
            $scope.$on('channel left', function (event, channel) {
                Storage.channel.set({});
                //$scope.$apply(function () {
                    $location.path('/');
                //});
            });

            $scope.$on('channel messages', function (event, messages) {
                Chat.replaceText(messages);
                showText();
            });

        }
    ])

    .controller('ProfileCtrl', [
        '$scope', 'ChatSocket', 'Storage', '$location',
        function ($scope, ChatSocket, Storage, $location) {

            var user = Storage.user.get();

            $scope.username = user.username;

            $scope.updateUsername = function () {
                //$log.info('updateUsername() called');
                ChatSocket.user.update(user.uuid, $scope.username);
            };

            $scope.$on('user updated', function (event, uuid, oldUsername, newUsername) {
                user.username = newUsername;
                Storage.user.set(user);
                if (Storage.channel.get().name) {
                    //$scope.$apply(function () {
                        $location.path('/chat');
                    //});
                }
            });
        }
    ])

    .controller('ModalInstanceCtrl', [
        '$scope', '$modalInstance', 'title', 'body',
        function ($scope, $modalInstance, title, body) {
            $scope.title = title;
            $scope.body = body;

            $scope.ok = function () {
                $modalInstance.close();
            };
        }
    ])

    ;

})(angular, socket);
