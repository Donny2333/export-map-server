/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('ExplorerController', ['$scope', 'Router', function ($scope, Router) {
            $scope.vm.segments = [{
                id: 0,
                icon: 'icon-about',
                name: '图库',
                sref: 'app.explorer.files'
            }];

            $scope.go = function (segment) {
                var router = Router.get(0);
                router.sub = _.reverse(_.split(segment.sref, '.'))[0];
                Router.set(0, router);
            }
        }])
})(angular);