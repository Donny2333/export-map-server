/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('SymbolController', ['$scope', '$rootScope', 'Auth', 'Symbol', function ($scope, $rootScope, Auth, Symbol) {
            var vm = $scope.vm = {
                symbols: [],
                pagination: {
                    totalItems: 0,
                    maxSize: 5,
                    pageNo: 1,
                    pageSize: 10,
                    maxPage: 1
                }
            };

            $scope.preview = function (symbol) {
                Symbol.getSymbolItemListFromDB({
                    styleId: symbol.styleId,
                    pageNo: 0,
                    pageSize: 16
                }).then(function (res) {
                    if (res.status === 200) {
                        $rootScope.$broadcast('mask:show', {
                            showMask: true,
                            template: '<symbol-panel></symbol-panel>',
                            overlay: {
                                styleId: symbol.styleId,
                                title: symbol.name,
                                data: res.data.result,
                                pagination: {
                                    totalItems: res.data.count,
                                    maxSize: 5,
                                    pageNo: 1,
                                    pageSize: 16,
                                    maxPage: Math.ceil(res.data.count / vm.pagination.pageSize)
                                }
                            }
                        })
                    }
                })
            };


            getStyleList(1, vm.pagination.pageNo - 1, vm.pagination.pageSize);


            function getStyleList(userId, pageNo, pageSize) {
                Symbol.getStyleList({
                    userId: Auth.getUserInfo().userId,
                    pageNo: pageNo,
                    pageSize: pageSize
                }).then(function (res) {
                    if (res.status === 200) {
                        res.data.result.map(function (data) {
                            vm.symbols.push({
                                styleId: data.Id,
                                name: data.Name,
                                detail: data.Detail
                            });
                        })
                    }
                })
            }
        }])
})(angular);