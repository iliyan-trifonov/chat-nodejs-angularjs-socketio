(function (angular, socket) {
    'use strict';

    angular.module('Chat.directives', [])

    .directive('chatTitle', [
        '$timeout',
        function ($timeout) {
            return {
                restrict: 'E',
                templateUrl: '/templates/directives/chat-title.html',
                scope: {
                    user: '=',
                    channel: '=',
                    inviteLink: '=',
                    leaveChannel: '&'
                },
                link: function (scope) {
                    var copiedLinkTimeout;
                    scope.copyInviteLink = function () {
                        //hide the text if still animated
                        scope.$apply(function () {
                            scope.textCopied = false;
                        });
                        //show the text
                        scope.$apply(function () {
                            scope.textCopied = true;
                            $timeout.cancel(copiedLinkTimeout);
                            copiedLinkTimeout = $timeout(function () {
                                scope.textCopied = false;
                            }, 1E3);
                        });
                        return scope.inviteLink.url;
                    };
                }
            };
        }
    ])

    .directive('chatText', [
        function () {
            return {
                restrict: 'E',
                templateUrl: '/templates/directives/chat-text.html',
                scope: {
                    chatText: '='
                },
                link: function (scope, element, attrs) {
                    var chatContents = angular.element(
                        element[0].querySelector('.chat_contents')
                    );
                    scope.$watch(attrs.chatText, function () {
                        chatContents.scrollTop(chatContents[0].scrollHeight);
                    });
                }
            };
        }
    ])

    .directive('chatUsers', [
        function () {
            return {
                restrict: 'E',
                scope: {
                    users: '='
                },
                templateUrl: '/templates/directives/chat-users.html'
            };
        }
    ])

    .directive('chatMessage', [
        '$filter',
        function ($filter) {
            return {
                restrict: 'E',
                scope: {
                    channel: '=',
                    username: '=',
                    focusSendMessage: '='
                },
                templateUrl: '/templates/directives/chat-message.html',
                link: function (scope, element, attrs) {
                    scope.sendMessage = function () {
                        if (scope.message) {
                            socket.emit('new message', {
                                //TODO: channel and user can be omitted in single channel mode
                                channel: scope.channel,
                                user: scope.username,
                                text: $filter('linky')(scope.message, '_blank')
                            });
                            delete scope.message;
                        }
                    };

                    scope.messageKeyPressed = function (event) {
                        if (event.keyCode === 13 && scope.message) {
                            scope.sendMessage();
                        }
                    };

                    var messageInput = element.find('#messageinput');

                    function focusInput () {
                        messageInput.focus();
                    }

                    focusInput();

                    scope.$watch(attrs.focusSendMessage, function (value) {
                        if (value === true) {
                            scope.focusSendMessage = false;
                            focusInput();
                        }
                    });
                }
            };
        }
    ])

    .directive('profileForm', [
        function () {
            return {
                restrict: 'E',
                scope: {
                    username: '=',
                    updateUsername: '&'
                },
                templateUrl: '/templates/directives/profile-form.html',
                link: function (scope, element) {
                    element.find('#username').focus();
                }
            };
        }
    ])

    .directive('channelForm', [
        function () {
            return {
                restrict: 'E',
                templateUrl: '/templates/directives/channel-form.html',
                scope: {
                    channel: '=',
                    createChannel: '&',
                    joinChannel: '&'
                },
                link: function (scope, element) {
                    element.find('#name').focus();
                }
            };
        }
    ])

    .directive('allowedChars', [
        function () {
            return {
                restrict: 'A',
                require: 'ngModel',
                link: function (scope, element, attrs, modelCtrl) {
                    modelCtrl.$parsers.push(function (value) {
                        console.log('value', value);
                        var newValue = value.replace(/[^\u00BF-\u1FFF\u2C00-\uD7FF\w\-\_\.\ ]+/g, '');
                        if (newValue !== value) {
                            modelCtrl.$setViewValue(newValue);
                            modelCtrl.$render();
                        }
                        return newValue;
                    });
                }
            };
        }
    ])

    ;
})(angular, socket);
