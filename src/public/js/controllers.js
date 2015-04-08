(function (angular) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {
            //...
        }
    ])

    .controller('ChannelCtrl', [
        '$scope', '$modal', '$location', 'Channel',
        function ($scope, $modal, $location, Channel) {
            $scope.createChannel = function () {
                var popup = $modal.open({
                    templateUrl: 'createChannel.html',
                    controller: 'CreateChannelCtrl',
                    size: 'sm'
                });

                popup.result.then(function (channelName) {
                    console.log('channel selected: ' + channelName);
                    socket.emit('create channel', channelName);
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
                    socket.emit('join channel', channelName);
                }, function () {
                    console.log('Modal dismissed');
                });
            };

            socket.on('joined channel', function (channel) {
                console.log('joined channel', channel);
                Channel.name.set(channel);
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
        '$scope', 'Channel',
        function ($scope, Channel) {
            console.log('ChatCtrl started');

            $scope.channel = Channel.name.get();

            $scope.text = '';

            socket.on('new message', function (message) {
                console.log('new message', message);
                $scope.$apply(function () {
                    $scope.text += message + "<br/>\n";
                });
            });

            $scope.sendMessage = function () {
                socket.emit('new message', {
                    channel: $scope.channel,
                    text: $scope.message
                });
                delete $scope.message;
            };
        }
    ])

    ;

})(angular);
