(function (angular) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {
            //...
        }
    ])

    .controller('ChannelCtrl', [
        '$scope', '$modal', '$location', 'Channel', '$window',
        function ($scope, $modal, $location, Channel, $window) {

            var user = JSON.parse($window.localStorage.getItem('user'));

            //TODO: use 'resolve: {}' in modal to give a param that shows if we want to create or join
            $scope.createChannel = function () {
                var popup = $modal.open({
                    templateUrl: 'createChannel.html',
                    controller: 'CreateChannelCtrl',
                    size: 'sm'
                });

                popup.result.then(function (channelName) {
                    console.log('channel selected: ' + channelName);
                    socket.emit('create channel', {
                        name: channelName,
                        password: null
                    });
                }, function () {
                    console.log('Modal dismissed');
                });
            };

            $scope.joinChannel = function () {
                var popup = $modal.open({
                    templateUrl: 'joinChannel.html',
                    controller: 'JoinChannelCtrl',
                    size: 'sm'
                });

                popup.result.then(function (channelName) {
                    console.log('channel selected: ' + channelName);
                    var chan = {
                        "name": channelName,
                        "password": null
                    };
                    console.log('user, chan', user, chan);
                    socket.emit('join channel', user, chan);
                }, function () {
                    console.log('Modal dismissed');
                });
            };

            //repeats with the code in app.js:
            socket.on('joined channel', function (channel) {
                console.log('joined channel', channel);
                Channel.name.set(channel.name);
                $window.localStorage.setItem('channel', JSON.stringify(channel));
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
        '$scope', 'Channel', '$window', 'Chat',
        function ($scope, Channel, $window, Chat) {
            console.log('ChatCtrl started');

            //probably empty at this moment - wait for the socket channel joined event
            $scope.channel = Channel.name.get();

            var user = JSON.parse($window.localStorage.getItem('user'));

            $scope.users = [];

            //possible to be empty - channel name is set on socket received join message
            if ($scope.channel) {
                Channel.getUsers($scope.channel);
            }

            socket.on('channel users list', function (users) {
                console.log('channel users list event received', users);
                $scope.$apply(function () {
                    $scope.users = users;
                });
            });

            var chatContents = angular.element(document.querySelector('.chat_contents'));

            //TODO: put it in a service/factory to keep the messages on page change
            $scope.text = Chat.getText();
            //scroll on the next tick to have the dimensions right
            setTimeout(function () {
                scrollChatText();
            });

            $scope.$on('channel joined', function (event, name) {
                console.log('ChatCtrl: channel joined scope event received', name);
                $scope.channel = name;
                Channel.name.set(name);
                Channel.getUsers($scope.channel);
            });

            //TODO: directive for html adding - dom manipulation
            socket.on('new channel message', function (message) {
                console.log('new message received', message);
                $scope.$apply(function () {
                    $scope.text += '<i>' + message.text + '</i><br/>\n';
                });
                Chat.addText(message.text);
                scrollChatText();
            });

            //TODO: directive for html adding
            socket.on('new message', function (message) {
                console.log('new message received', message);
                $scope.$apply(function () {
                    $scope.text += '<strong>' + message.user + ':</strong> ' +
                        message.text + "<br/>\n";
                });
                Chat.addText(message.text);
                scrollChatText();
            });

            $scope.sendMessage = function () {
                console.log('sending new message');
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

            //TODO: move it to the Chat directive
            function scrollChatText() {
                chatContents.scrollTop(chatContents[0].scrollHeight);
            }
        }
    ])

    ;

})(angular);
