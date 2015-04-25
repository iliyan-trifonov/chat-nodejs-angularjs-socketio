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

            $scope.createChannel = function () {
                socket.emit('create channel', {
                    name: $scope.channel.name,
                    password: $scope.channel.password
                });
            };

            $scope.joinChannel = function () {
                socket.emit('join channel', user, {
                    name: $scope.channel.name,
                    password: $scope.channel.password
                });
            };
        }
    ])

    .controller('ChatCtrl', [
        '$scope', 'Chat', '$location', 'Storage', 'ChatSocket', '$routeParams', '$log', 'parseUrl', '$timeout',
        function ($scope, Chat, $location, Storage, ChatSocket, $routeParams, $log, parseUrl, $timeout) {

            //TODO: put it in a directive
            setTimeout(function () {
                angular.element(
                    document.querySelector('#messageinput')
                ).focus();
            });

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



                });
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
                setTimeout(function () {
                    angular.element(
                        document.querySelector('#messageinput')
                    ).focus();
                });
            });

            $scope.$on('channel users list', function (event, users) {
                //TODO: check if this needs $apply()
                $scope.$apply(function () {
                    $scope.users = users;
                });
            });


            //TODO: directive for html adding - dom manipulation
            //TODO: use the same body for user and channel message with
            //TODO: one flag: message.channel = true/false
            $scope.$on('new channel message', function (event, message) {
                //TODO: check if $apply() is needed here
                $scope.$apply(function () {
                    $scope.text = Chat.getText();
                });
                scrollChatText();
            });

            //TODO: directive for html adding
            $scope.$on('new message', function (event, message) {
                //TODO: check if $apply() is needed here
                $scope.$apply(function () {
                    $scope.text = Chat.getText();
                });
                scrollChatText();
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
                $scope.$apply(function () {
                    $scope.text = Chat.getText();
                    setTimeout(function () {
                        scrollChatText();
                    });
                });
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
