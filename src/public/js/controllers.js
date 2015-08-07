(function (angular, socket) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {}
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
        '$scope', 'Chat', '$location', 'Storage', 'ChatSocket', 'Flags',
        function ($scope, Chat, $location, Storage, ChatSocket, Flags) {

            var channel = Storage.channel.get();

            //reload the data when coming from another SPA page without refresh
            if (channel && channel.name && Flags.joinedChannel) {
                $scope.channel = channel.name;
                $scope.inviteLink = Chat.getInviteLink(channel);
                ChatSocket.channel.getUsers($scope.channel);
                ChatSocket.channel.getMessages($scope.channel);
            }

            $scope.user = Storage.user.get();
            $scope.users = [];
            $scope.focusSendMessage = true;

            if (/^\/join\/.+/.test($location.path())) {
                return Chat.handleJoinUrl($scope.user);
            }

            $scope.leaveChannel = function () {
                socket.emit(
                    'leave channel',
                    //TODO: remove these params
                    {
                        uuid: $scope.user.uuid,
                        username: $scope.user.username
                    },
                    $scope.channel
                );
            };

            ///socket messages

            $scope.$on('joined channel', function (event, channel) {
                $scope.channel = channel.name;
                $scope.inviteLink = Chat.getInviteLink(channel);
                ChatSocket.channel.getMessages($scope.channel);
                $scope.focusSendMessage = true;
                Flags.joinedChannel = true;
            });

            $scope.$on('channel users list', function (event, users) {
                $scope.users = users;
            });

            function showText () {
                $scope.chatText = Chat.getText();
            }

            $scope.$on('new channel message', function (event, message) {
                showText();
            });

            $scope.$on('new message', function (event, message) {
                showText();
            });

            $scope.$on('channel messages', function (event, messages) {
                Chat.replaceText(messages);
                showText();
            });

            $scope.$on('channel left', function (event, channel) {
                Storage.channel.set({});
                Flags.joinedChannel = false;
                $location.path('/channel');
            });
        }
    ])

    .controller('ProfileCtrl', [
        '$scope', 'ChatSocket', 'Storage', '$location', 'Popup',
        function ($scope, ChatSocket, Storage, $location, Popup) {

            var user = Storage.user.get();

            $scope.username = user.username;

            $scope.updateUsername = function () {
                ChatSocket.user.update(user.uuid, $scope.username);
            };

            $scope.$on('user updated', function (event, uuid, oldUsername, newUsername) {
                user.username = newUsername;
                Storage.user.set(user);
                if (Storage.channel.get().name) {
                    $location.path('/chat');
                } else {
                    Popup.show(
                        'User updated',
                        'The username was updated successfully!'
                    );
                }
            });
        }
    ])

    .controller('PopupCtrl', [
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
