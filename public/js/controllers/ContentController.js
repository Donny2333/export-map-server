/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('ContentController', ['$scope', '$rootScope', '$q', 'Symbol', function ($scope, $rootScope, $q, Symbol) {
            $scope.expandLayer = function (layer) {
                var i;
                if (layer.showChild) {
                    for (i = 0; i < layer.subLayerIds.length; i++) {
                        hide(layer.subLayerIds[i])
                    }
                } else {
                    for (i = 0; i < layer.subLayerIds.length; i++) {
                        expand(layer.subLayerIds[i])
                    }
                }
                layer.showChild = !layer.showChild;
            };

            //check状态
            $scope.hideLayer = function (layers, layer) {
                if (layer.ischeck === 2 || layer.ischeck === 3) {
                    choiceCheck(layer);
                } else {
                    cancelCheck(layer);
                }
                findChindById(layers, layer.pid);
                show_layers = [];
                chooseChecked($scope.$parent.vm.layers);
                $scope.$emit('map:change', {
                    layers: show_layers
                })
            };

            $scope.showPreview = function (layer) {
                layer.showPreview = !layer.showPreview;
                if (!layer.symbols) {
                    getLayerSymbols(layer);
                }
            };

            $scope.toggleTable = function (layer) {
                $rootScope.$broadcast('mask:show', {
                    showMask: true,
                    template: '<query-panel></query-panel>',
                    overlay: {
                        title: layer.name,
                        layer: layer,
                        doc: $scope.$parent.vm.doc
                    }
                });
            };

            $scope.changePreview = function (layer) {
                if (layer.symbols && layer.symbols.length) {
                    setSymbol(layer);
                } else {
                    getLayerSymbols(layer).then(function () {
                        setSymbol(layer);
                    }, function (err) {
                        console.log(err);
                    });
                }
            };

            function setSymbol(layer) {
                Symbol.getSymbolItemListFromDB({
                    styleId: 1,
                    pageNo: 0,
                    pageSize: 20,
                    geometryType: layer.geometryType
                }).then(function (res) {
                    if (res.status === 200) {
                        $rootScope.$broadcast('mask:show', {
                            showMask: true,
                            template: '<unique-panel></unique-panel>',
                            overlay: {
                                styleId: 1,
                                title: layer.name,
                                data: res.data.result,
                                layer: layer,
                                pagination: {
                                    totalItems: res.data.count,
                                    maxSize: 5,
                                    pageNo: 1,
                                    pageSize: 20,
                                    maxPage: Math.ceil(res.data.count / 10)
                                },
                                symbol: layer.symbols,
                                doc: $scope.$parent.vm.doc,
                                tab: layer.symbolType === 'Single symbol' ? 0 : 1
                            }
                        })
                    }
                }, function (err) {
                    console.log(err);
                });
            }

            $scope.deleteLayer = function (_layer) {
                layer.confirm('您确定要删除该图层？', {
                    btn: ['确定', '取消']
                }, function () {
                    layer.closeAll();
                    Symbol.RemoveLayerFromMap({
                        docId: $scope.$parent.vm.doc.docId,
                        userId: $scope.$parent.vm.doc.userId,
                        name: $scope.$parent.vm.doc.name,
                        layerIndex: _layer.id
                    }).then(function (res) {
                        if (res.data.status === "ok") {
                            //刷新内容
                            show_layers = [];
                            layer.msg('图层删除成功', {icon: 1});
                            chooseChecked($scope.$parent.vm.layers);
                            $scope.$emit('layer:change', {
                                layers: show_layers
                            })
                        } else {
                            layer.msg('图层删除失败', {icon: 2});
                        }
                    })
                }, function () {
                    layer.close();
                });
            };

            var show_layers = [];

            function chooseChecked(layers) {
                var i;
                for (i = 0; i < layers.length; i++) {
                    if (layers[i].ischeck === 1 || layers[i].ischeck === 3) {
                        show_layers.push(layers[i].id);
                    }
                    if (layers[i].subLayerIds !== null && layers[i].subLayerIds.length !== 0) {
                        chooseChecked(layers[i].subLayerIds)
                    }
                }
            }

            function getLayerSymbols(layer) {
                var deferred = $q.defer();

                Symbol.getLayerSymbolInfo({
                    docId: $scope.$parent.vm.doc.docId,
                    userId: $scope.$parent.vm.doc.userId,
                    name: $scope.$parent.vm.doc.name,
                    layerIndex: layer.id,
                    picHeight: 20,
                    picWidth: 20
                }).then(function (res) {
                    if (res.status === 200 && res.data.status === 'ok') {
                        layer.symbols = [];
                        layer.symbolType = res.data.result.Type;
                        switch (layer.symbolType) {
                            // 单一符号渲染
                            case 'Single symbol':
                                layer.symbols.push(res.data.result.RenderSymbolInfo);
                                break;

                            // 唯一值符号渲染
                            case 'Unique values':
                                layer.symbols = (res.data.result.UseDefaultSymbol ? [res.data.result.DefaultRenderSymbol] : [])
                                    .concat(res.data.result.RenderSymbols);
                                break;

                            default:
                                break;
                        }
                        deferred.resolve(layer.symbols);
                    }
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            }

            //父节点随子节点状态改变而变化
            function findChindById(layers, pid) {
                if (pid > 0) {
                    //判断是否找到父节点
                    var i;
                    var find = false;
                    for (i = 0; i < layers.length; i++) {
                        if (layers[i].id === pid) {
                            judgeCheck(layers[i]);
                            findChindById($scope.$parent.vm.layers, layers[i].pid);
                            find = true;
                            break;
                        }
                    }
                    //未找到父节点，递进继续查找
                    if (!find) {
                        for (i = 0; i < layers.length; i++) {
                            if (layers[i].subLayerIds !== null && layers[i].subLayerIds.length !== 0) {
                                findChindById(layers[i].subLayerIds, pid);
                            }
                        }
                    }
                }
            }

            //判断根据子节点判断状态并修改
            function judgeCheck(layer) {
                if (layer.subLayerIds !== null && layer.subLayerIds.length !== 0) {
                    var a = 0;
                    var b = 0;
                    for (var i = 0; i < layer.subLayerIds.length; i++) {
                        if (layer.subLayerIds[i].ischeck === 1) {
                            a++;
                        } else if (layer.subLayerIds[i].ischeck === 2) {
                            b++;
                        }
                    }
                    if (a === layer.subLayerIds.length) {
                        layer.ischeck = 1;
                    } else if (b === layer.subLayerIds.length) {
                        layer.ischeck = 2;
                    } else {
                        layer.ischeck = 3;
                    }
                }
            }

            function choiceCheck(layer) {
                layer.ischeck = 1;
                if (layer.subLayerIds !== null && layer.subLayerIds.length !== 0) {
                    for (var i = 0; i < layer.subLayerIds.length; i++) {
                        choiceCheck(layer.subLayerIds[i])
                    }
                }
            }

            function cancelCheck(layer) {
                layer.ischeck = 2;
                if (layer.subLayerIds !== null && layer.subLayerIds.length !== 0) {
                    for (var i = 0; i < layer.subLayerIds.length; i++) {
                        cancelCheck(layer.subLayerIds[i])
                    }
                }
            }

            function expand(layer) {
                layer.showSelf = true;
                if (layer.subLayerIds !== null && layer.subLayerIds.length !== 0) {
                    for (var i = 0; i < layer.subLayerIds.length; i++) {
                        expand(layer.subLayerIds[i]);
                    }
                }
            }

            function hide(layer) {
                layer.showSelf = false;
                if (layer.subLayerIds !== null && layer.subLayerIds.length !== 0) {
                    for (var i = 0; i < layer.subLayerIds.length; i++) {
                        hide(layer.subLayerIds[i]);
                    }
                }
            }
        }])
})(angular);