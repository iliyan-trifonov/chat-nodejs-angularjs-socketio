(function (angular) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {
            //...
        }
    ])

    .controller('ChannelCtrl', [
        '$scope', '$modal', '$location', 'Channel', 'Storage',
        function ($scope, $modal, $location, Channel, Storage) {

            var user = Storage.user.get();

            //TODO: don't use modals, create the form on /channel with the 2 buttons

            //TODO: use 'resolve: {}' in modal to give a param that shows if we want to create or join
            $scope.createChannel = function () {
                var popup = $modal.open({
                    templateUrl: 'createChannel.html',
                    controller: 'CreateChannelCtrl',
                    size: 'sm'
                });

                popup.result.then(function (channelName) {
                    socket.emit('create channel', {
                        name: channelName,
                        password: null
                    });
                });
            };

            $scope.joinChannel = function () {
                var popup = $modal.open({
                    templateUrl: 'joinChannel.html',
                    controller: 'JoinChannelCtrl',
                    size: 'sm'
                });

                popup.result.then(function (channelName) {
                    var chan = {
                        "name": channelName,
                        "password": null
                    };
                    socket.emit('join channel', user, chan);
                });
            };

            $scope.$on('joined channel', function (event, channel) {
                Channel.name.set(channel.name);
                Storage.channel.set(channel);
                $location.path('/chat');
            });
        }
    ])

    .controller('CreateChannelCtrl', [
        '$scope', '$modalInstance',
        function ($scope, $modalInstance) {
            $scope.ok = function () {
                $modalInstance.close($scope.channel);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    ])

    .controller('JoinChannelCtrl', [
        '$scope', '$modalInstance',
        function ($scope, $modalInstance) {
            $scope.ok = function () {
                $modalInstance.close($scope.channel);
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    ])

    .controller('ChatCtrl', [
        '$scope', 'Channel', 'Chat', '$location', 'Storage',
        function ($scope, Channel, Chat, $location, Storage) {

            console.log('ChatCtrl started');

            var user = Storage.user.get();
            var chatContents = angular.element(document.querySelector('.chat_contents'));

            $scope.channel = Channel.name.get();

            $scope.users = [];

            if ($scope.channel) {
                Channel.getUsers($scope.channel);
            }

            $scope.text = Chat.getText();
            setTimeout(function () {
                scrollChatText();
            });

            $scope.sendMessage = function () {
                socket.emit('new message', {
                    channel: $scope.channel,
                    user: user.username,
                    text: $scope.message
                });
                delete $scope.message;
            };

            $scope.messageKeyPressed = function (event) {
                if (event.keyCode === 13 && $scope.message) {
                    $scope.sendMessage();
                }
            };

            //TODO: move it to a directive
            function scrollChatText() {
                chatContents.scrollTop(chatContents[0].scrollHeight);
            }

            $scope.leaveChannel = function () {
                socket.emit(
                    'leave channel',
                    { username: user.username },
                    $scope.channel
                );
            };

            ///socket messages

            $scope.$on('joined channel', function (event, channel) {
                $scope.$apply(function () {
                    $scope.channel = channel.name;
                });
                Channel.name.set(channel.name);
                Channel.getUsers($scope.channel);
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
                    //TODO: use message.date - date added on the server
                    $scope.text += new Date()  +' <i>' + message.text + '</i><br/>\n';
                });
                Chat.addText(message.text);
                scrollChatText();
            });

            //TODO: directive for html adding
            $scope.$on('new message', function (event, message) {
                //TODO: check if $apply() is needed here
                $scope.$apply(function () {
                    $scope.text += new Date() + ' <strong>' + message.user + ':</strong> ' +
                    message.text + "<br/>\n";
                });
                Chat.addText(message.text);
                scrollChatText();
            });

            //TODO: rename to left channel
            $scope.$on('channel left', function (event, channel) {
                Channel.name.set('');
                Storage.channel.set({});
                //TODO: check if $apply() is needed here
                $scope.$apply(function () {
                    $location.path('/');
                });
            });

        }
    ])

    ;

})(angular);
