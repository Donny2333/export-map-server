/**
 * Created by Donny on 17/6/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('QueryPanelController', ['$scope', '$rootScope', 'Doc', function ($scope, $rootScope, Doc) {
            var vm = $scope.vm;
            vm.overlay.select = null;
            vm.overlay.field = [];
            vm.overlay.operator = [
                {
                    id: 0,
                    value: '='
                }, {
                    id: 1,
                    value: '<>'
                }, {
                    id: 2,
                    value: 'Like'
                }, {
                    id: 3,
                    value: '>'
                }, {
                    id: 4,
                    value: '>='
                }, {
                    id: 5,
                    value: 'And'
                }, {
                    id: 6,
                    value: '<'
                }, {
                    id: 7,
                    value: '<='
                }, {
                    id: 8,
                    value: 'Not'
                }, {
                    id: 9,
                    value: '_'
                }, {
                    id: 10,
                    value: '%'
                }, {
                    id: 11,
                    value: 'Is'
                }, {
                    id: 12,
                    value: 'Or'
                }];
            vm.overlay.param = [];
            vm.overlay.query = "";

            getLayerField();

            $scope.select = function (d) {
                vm.overlay.select = d;
                vm.overlay.query += d.value + ' ';
            };

            $scope.add = function (value) {
                vm.overlay.query += value + ' ';
            };

            $scope.getValues = function () {
                if (vm.overlay.select) {
                    vm.overlay.param = [];

                    Doc.getLayerFieldDistinctVal({
                        docId: vm.overlay.doc.docId,
                        name: vm.overlay.doc.name,
                        userId: vm.overlay.doc.userId,
                        layerIndex: vm.overlay.layer.id,
                        fldName: vm.overlay.select.value
                    }).then(function (res) {
                        res.data.result.map(function (value, index) {
                            vm.overlay.param.push({
                                id: index,
                                value: value
                            })
                        });
                    })
                }
            };

            $scope.clear = function () {
                vm.overlay.query = "";
            };

            $scope.commit = function () {
                Doc.queryDataOnLayer({
                    docId: vm.overlay.doc.docId,
                    name: vm.overlay.doc.name,
                    userId: vm.overlay.doc.userId,
                    layerIndex: vm.overlay.layer.id,
                    where: vm.overlay.query,
                    returnGeo: true,
                    pageNo: 1,
                    pageNum: 10
                }).then(function (res) {
                    if (res.data.status === 'ok') {
                        var data = [];
                        res.data.result && res.data.result.map(function (o) {
                            data.push(o);
                        });
                        $scope.closeMask();
                        $rootScope.$broadcast('map:toggleTable', {
                            table: {
                                layerIndex: vm.overlay.layer.id,
                                queryString: vm.overlay.query,
                                pageNo: 1,
                                pageSize: 10,
                                head: vm.overlay.layer.name,
                                data: data
                            },
                            pagination: {
                                totalItems: res.data.count,
                                maxSize: 5,
                                pageNo: 1,
                                pageSize: 10,
                                maxPage: Math.ceil(res.data.count / 10)
                            }
                        });
                    } else {
                        layer.open({
                            title: '查询失败',
                            content: res.data.msg
                        });
                    }
                });
            };

            function getLayerField() {
                Doc.getLayerField({
                    docId: vm.overlay.doc.docId,
                    userId: vm.overlay.doc.userId,
                    name: vm.overlay.doc.name,
                    layerIndex: vm.overlay.layer.id
                }).then(function (res) {
                    vm.overlay.field = [];
                    res.data.result.map(function (v, i) {
                        vm.overlay.field.push({
                            id: i,
                            value: v
                        })
                    });
                }, function (err) {
                    console.log(err);
                });
            }
        }])
})(angular);
