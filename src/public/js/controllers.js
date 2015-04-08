(function (angular) {
    'use strict';

    angular.module('Chat.controllers', [])

    .controller('IndexCtrl', [
        function () {
            //...
        }
    ])

    .controller('ChannelCtrl', [
        '$scope', '$modal',
        function ($scope, $modal) {
            $scope.createChannel = function () {
                var popup = $modal.open({
                    templateUrl: 'createChannel.html',
                    controller: 'CreateChannelCtrl',
                    size: 'sm'
                });

                popup.result.then(function (channelName) {
                    console.log('channel selected: ' + channelName);
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
                }, function () {
                    console.log('Modal dismissed');
                });
            };
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

    ;

})(angular);
