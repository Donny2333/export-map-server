/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('EditController', ['$scope', 'Router', function ($scope, Router) {
            $scope.vm.segments = [{
                id: 0,
                icon: 'icon-about',
                name: '关于',
                sref: 'app.edit.info'
            }, {
                id: 1,
                icon: 'icon-layers',
                name: '内容',
                sref: 'app.edit.content'
            }];

            $scope.go = function (segment) {
                var router = Router.get(2);
                router.sub = _.reverse(_.split(segment.sref, '.'))[0];
                Router.set(2, router);
            }
        }])
})(angular);