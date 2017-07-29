/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('RepositoryController', ['$scope', 'Router', function ($scope, Router) {
            $scope.vm.segments = [{
                id: 0,
                icon: 'icon-about',
                name: '数据',
                sref: 'app.repository.data'
            }, {
                id: 1,
                icon: 'icon-layers',
                name: '模板',
                sref: 'app.repository.template'
            }, {
                id: 2,
                icon: 'icon-legend',
                name: '符号',
                sref: 'app.repository.symbol'
            }];

            $scope.go = function (segment) {
                var router = Router.get(1);
                router.sub = _.reverse(_.split(segment.sref, '.'))[0];
                Router.set(1, router);
            }
        }])
})(angular);