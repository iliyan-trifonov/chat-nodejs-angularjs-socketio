(function (angular) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {
            //...
        }
    ])

    .controller('ChannelCtrl', [
        '$scope', '$location', 'Channel', 'Storage',
        function ($scope, $location, Channel, Storage) {

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

            $scope.$on('joined channel', function (event, channel) {
                Channel.name.set(channel.name);
                Storage.channel.set(channel);
                //$scope.$apply(function () {
                    $location.path('/chat');
                //});
            });
        }
    ])

    .controller('ChatCtrl', [
        '$scope', 'Channel', 'Chat', '$location', 'Storage', 'ChatSocket',
        function ($scope, Channel, Chat, $location, Storage, ChatSocket) {

            //TODO: put it in a directive
            setTimeout(function () {
                angular.element(
                    document.querySelector('#messageinput')
                ).focus();
            });

            var user = Storage.user.get();

            //TODO: put it in a directive
            var chatContents = angular.element(
                document.querySelector('.chat_contents')
            );

            $scope.channel = Channel.name.get();

            $scope.users = [];

            if ($scope.channel) {
                Channel.getUsers($scope.channel);
            }

            /*$scope.text = Chat.getText();
            if ($scope.text.length > 0) {
                setTimeout(function () {
                    scrollChatText();
                });
            } else {*/
                if ($scope.channel) {
                    ChatSocket.channel.getMessages($scope.channel);
                }
            /*}*/

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
                //$scope.$apply(function () {
                    $scope.channel = channel.name;
                //});
                Channel.name.set(channel.name);
                Channel.getUsers($scope.channel);
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
                Channel.name.set('');
                Storage.channel.set({});
                //TODO: check if $apply() is needed here
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

})(angular);
