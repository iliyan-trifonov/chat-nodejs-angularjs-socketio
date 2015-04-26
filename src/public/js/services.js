(function (angular, socket) {
    'use strict';

    angular.module('Chat.services', [])

    .service('ChatSocket', [
        function () {
            return {
                'user': {
                    'create': function () {
                        socket.emit('create user');
                    },
                    'known': function (user) {
                        socket.emit('known user', user);
                    },
                    'update': function (uuid, newUsername) {
                        socket.emit('update user', uuid, newUsername);
                    }
                },
                'channel': {
                    'create': function (channel) {

                    },
                    'join': function (user, channel) {
                        socket.emit('join channel', user, channel);
                    },
                    'getMessages': function (channel) {
                        socket.emit('get messages', channel);
                    },
                    'getUsers': function (channelName) {
                        socket.emit('get channel users list', channelName);
                    }
                }
            };
        }
    ])

    .factory('Chat', [
        '$location', '$routeParams', '$rootScope',
        function ($location, $routeParams, $rootScope) {
            var text = [];
            return {
                getText: function() {
                    return text.join('<br/>');
                },
                addText: function(newText) {
                    text.push(newText);
                },
                replaceText: function (newText) {
                    text = newText;
                },
                getInviteLink: function (channel) {
                    var url = $location.protocol() +
                        '://' +
                        $location.host() +
                        ':' +
                        $location.port() +
                        '/#/join/';
                    return {
                        url: url +
                            encodeURIComponent(channel.name) +
                            (channel.password ?
                                '/' + encodeURIComponent(channel.password) :
                                ''),
                        text: url + channel.name + (channel.password ? '/***' : '')
                    };
                },
                handleJoinUrl: function (user) {
                    var channel = $routeParams.channel;
                    var pass = $routeParams.pass || '';

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
                        $location.path('/');
                    } else {
                        if (!user || !user.uuid) {
                            //wait for user creation first
                            $rootScope.$on('user created', function (event, user) {
                                joinChannel(channel, pass, user);
                            });
                        } else {
                            joinChannel(channel, pass, user);
                        }
                    }
                }
            };
        }
    ])

    .service('Storage', [
        '$window',
        function ($window) {
            return {
                user: {
                    get: function () {
                        var user = {};
                        if ($window.localStorage.getItem('user')) {
                            user = JSON.parse($window.localStorage.getItem('user'));
                        }
                        //$log.info('Storage: get user', user);
                        return user;
                    },
                    set: function (user) {
                        //$log.info('Storage: setting new user', user);
                        $window.localStorage.setItem('user', JSON.stringify(user));
                    }
                },
                channel: {
                    get: function () {
                        var channel = {};
                        if ($window.localStorage.getItem('channel')) {
                            channel = JSON.parse($window.localStorage.getItem('channel'));
                        }
                        return channel;
                    },
                    set: function (channel) {
                        $window.localStorage.setItem('channel', JSON.stringify(channel));
                    }
                }
            };
        }
    ])

    .service('Popup', [
        '$modalStack', '$modal',
        function ($modalStack, $modal) {
            return {
                show: function (title, text) {
                    this.close();
                    $modal.open({
                        templateUrl: '/templates/modal.html',
                        controller: 'PopupCtrl',
                        size: 'sm',
                        resolve: {
                            title: function () {
                                return title;
                            },
                            body: function () {
                                return text;
                            }
                        }
                    });
                },
                close: function () {
                    $modalStack.dismissAll();
                }
            };
        }
    ])

    ;

})(angular, socket);
