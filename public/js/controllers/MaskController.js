/**
 * Created by Donny on 17/5/17.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('MaskController', ['$scope', '$rootScope', function ($scope, $rootScope) {
            $scope.vm = {
                showMask: false,
                overlay: {},
                template: ''
            };

            $scope.closeMask = function () {
                $scope.vm = {
                    showMask: false,
                    overlay: {},
                    template: ''
                }
            };

            /**
             * 监听"显示mask"事件
             */
            $rootScope.$on('mask:show', function (event, value) {
                if (value.showMask) {
                    $scope.vm = {
                        showMask: true,
                        overlay: value.overlay,
                        template: value.template.length ? value.template : $scope.vm.template
                    };
                }
            });

            /**
             * 监听"隐藏mask"事件
             */
            $rootScope.$on('mask:hide', function (event, value) {
                if (!value.showMask) {
                    $scope.closeMask();
                }
            });
        }])
})(angular);