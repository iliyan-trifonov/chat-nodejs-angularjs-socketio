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
                    socket.emit('join channel', {
                        name: channelName,
                        password: null
                    });
                }, function () {
                    console.log('Modal dismissed');
                });
            };

            //repeats with the code in app.js:
            socket.on('joined channel', function (channel) {
                console.log('joined channel', channel);
                Channel.name.set(channel);
                $window.localStorage.setItem('channel', JSON.stringify({
                    name: channel,
                    password: null
                }));
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
        '$scope', 'Channel', '$window',
        function ($scope, Channel, $window) {
            console.log('ChatCtrl started');

            $scope.channel = Channel.name.get();

            //TODO: put it in a service/factory to keep the messages on page change
            $scope.text = '';

            socket.on('new message', function (message) {
                console.log('new message received', message);
                $scope.$apply(function () {
                    $scope.text += '<strong>' + message.username + ':</strong> ' +
                        message.text +
                        "<br/>\n";
                });
            });

            var user = JSON.parse($window.localStorage.getItem('user'));

            $scope.sendMessage = function () {
                console.log('sending new message');
                socket.emit('new message', {
                    channel: $scope.channel,
                    user: user,
                    text: $scope.message
                });
                delete $scope.message;
            };
        }
    ])

    ;

})(angular);
