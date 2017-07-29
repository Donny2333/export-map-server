/**
 * Created by Donny on 17/5/18.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('SymbolPanelController', ['$scope', '$rootScope', '$http', 'Symbol', function ($scope, $rootScope, $http, Symbol) {
            var vm = $scope.vm;

            vm.overlay.types = {
                select: {
                    id: 0,
                    name: '全选',
                    value: ''
                },
                data: [{
                    id: 0,
                    name: '全选',
                    value: ''
                }, {
                    id: 1,
                    name: '点',
                    value: 'esriGeometryPoint'
                }, {
                    id: 2,
                    name: '线',
                    value: 'esriGeometryPolyline'
                }, {
                    id: 3,
                    name: '面',
                    value: 'esriGeometryPolygon'
                }]
            };
            vm.overlay.select = {};
            angular.copy(vm.overlay.data[0], vm.overlay.select);

            $scope.typeChanged = function (type) {
                vm.overlay.types.select = type;
                vm.overlay.pagination.pageNo = 1;
                getSymbolItemListFromDB(vm.overlay.styleId, vm.overlay.pagination.pageNo - 1, vm.overlay.pagination.pageSize)
            };

            $scope.pageChanged = function () {
                getSymbolItemListFromDB(vm.overlay.styleId, vm.overlay.pagination.pageNo - 1, vm.overlay.pagination.pageSize)
            };

            $scope.selectSymbol = function (symbol) {
                angular.copy(symbol, vm.overlay.select);
            };

            $scope.change = function (value, name) {
                if (value.indexOf('rgb') >= 0) {
                    value = value.substr(4, value.length - 5);
                    vm.overlay.select[name] = value;
                }
            };

            $scope.preview = function () {
                var param = _.merge(_.pick(vm.overlay.select, [
                    'StyleId',
                    'SymbolType',
                    'SymbolName',
                    'Color',
                    'Size',
                    'Angle',
                    'Width',
                    'OutlineColor',
                    'OutlineWidth',
                    'FillColor'
                ]), {
                    picHeight: 50,
                    picWidth: 50,
                    styleId: vm.overlay.styleId
                });
                Symbol.getSymbolPreview(param).then(function (res) {
                    if (res.status === 200) {
                        vm.overlay.select.SymbolPreview = res.data.result;
                    }
                })
            };

            function getSymbolItemListFromDB(styleId, pageNo, pageSize) {
                var symbolInfo = vm.overlay.select.SymbolInfo || {};
                Symbol.getSymbolItemListFromDB({
                    styleId: styleId,
                    pageNo: pageNo,
                    pageSize: pageSize,
                    geometryType: vm.overlay.types.select && vm.overlay.types.select.value
                }).then(function (res) {
                    if (res.status === 200) {
                        vm.overlay.data = res.data.result;
                        vm.overlay.pagination.totalItems = res.data.count;
                        vm.overlay.pagination.maxPage = Math.ceil(res.data.count / vm.overlay.pagination.pageSize);
                    }
                })
            }
        }])
})(angular);