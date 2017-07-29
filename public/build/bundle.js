/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers', [])
        .controller('AppController', ['$scope', '$rootScope', '$state', '$timeout', '$q', 'Router', 'Auth', 'Doc', 'Data', 'URL_CFG', 'uuid',
            function ($scope, $rootScope, $state, $timeout, $q, Router, Auth, Doc, Data, URL_CFG, uuid) {
                var vm = $scope.vm = {
                    menus: Router.list().slice(0, 2),
                    showTable: false,
                    table: {},
                    pagination: {
                        totalItems: 0,
                        maxSize: 5,
                        pageNo: 1,
                        pageSize: 10,
                        maxPage: 1
                    }
                };

                var map = null;
                var highLightLayer = null;

                // 刷新浏览器回到图库页面
                if (!vm.doc || !vm.doc.docId) {
                    $state.go("app.explorer.files");
                }

                getUserGdb();

                $scope.go = function ($event, menu) {
                    $event.preventDefault();
                    $state.go([menu.sref, menu.sub].join('.'));
                };

                $scope.closeTable = function () {
                    vm.showTable = false;
                    map && map.removeLayer(highLightLayer);
                    $timeout(function () {
                        map && map.updateSize();
                    }, 0);
                };

                $scope.createOrClose = function () {
                    if (vm.doc && vm.doc.docId) {
                        // 关闭文档
                        document.getElementById('map').innerHTML = '';
                        vm.doc = {};
                        vm.layers = [];
                        vm.menus = Router.list().slice(0, 2);
                        map.removeLayer(map.getLayers().item(0));
                        $scope.closeTable();
                        $state.go('app.explorer.files');
                    } else {
                        // 新建文档
                        Doc.list({
                            pageNo: 0,
                            pageNum: 8,
                            tagName: "",
                            parentName: "模板",
                            typeRes: "Public",
                            mapType: "Template"
                        }).then(function (res) {
                            if (res.data.status === "ok" && res.data.result) {
                                var templates = [];
                                res.data.result.length > 0 && res.data.result.map(function (template) {
                                    templates.push({
                                        id: template.Id,
                                        title: template.Name,
                                        author: template.Author,
                                        update: template.UpdateTime.split(' ')[0],
                                        version: "1.0.0",
                                        img: URL_CFG.img + _.replace(template.PicPath, '{$}', 'big'),
                                        brief: template.Detail,
                                        detail: template.Detail2
                                    })
                                });
                                $rootScope.$broadcast('mask:show', {
                                    showMask: true,
                                    template: '<create-panel></create-panel>',
                                    overlay: {
                                        title: '',
                                        templates: templates,
                                        pagination: {
                                            totalItems: res.data.count,
                                            maxSize: 5,
                                            pageNo: 1,
                                            pageSize: 8,
                                            maxPage: Math.ceil(res.data.count / 12)
                                        },
                                        doc: {
                                            userId: Auth.getUserInfo().userId,
                                            autor: Auth.getUserInfo().name
                                        },
                                        choose: true,
                                        themeChoose1: true,
                                        themeChoose2: false,
                                        themeChoose3: false
                                    }
                                })
                            }
                        });
                    }
                };

                $scope.save = function () {

                };

                $scope.plot = function () {
                    var layers = [];
                    vm.layers.map(function (layer) {
                        layers.push({
                            id: layer.id,
                            name: layer.name,
                            checked: layer.defaultVisibility
                        })
                    });
                    console.log(layers);

                    $rootScope.$broadcast('mask:show', {
                        showMask: true,
                        template: '<plot-panel></plot-panel>',
                        overlay: {
                            title: '一键出图',
                            doc: vm.doc,
                            bbox: map.getView().calculateExtent(),
                            plot: {
                                title: '标题',
                                org: '地信科技',
                                author: Auth.getUserInfo().name,
                                layers: layers,
                                isVertical: false
                            }
                        }
                    })
                };

                $scope.publish = function () {
                    vm.doc.extent = map.getView().calculateExtent();
                    $rootScope.$broadcast('mask:show', {
                        showMask: true,
                        template: '<publish-panel></publish-panel>',
                        overlay: {
                            title: '地图发布',
                            doc: vm.doc
                        }
                    })
                };

                $scope.select = function (item) {
                    var center = [];
                    var zoom = 14;
                    var geoStr = JSON.parse(item.geoStr);

                    switch (item.geoType) {
                        case 'esriGeometryPoint':
                            center = [geoStr.x, geoStr.y];
                            center = ol.proj.transform(center, 'EPSG:' + geoStr.spatialReference.wkid, 'EPSG:' + vm.doc.srcID);
                            zoom = 16;
                            drawPoints([center], new ol.style.Style({
                                image: new ol.style.Icon({
                                    src: 'images/location.png',
                                    anchor: [.5, .85]
                                })
                            }));
                            break;

                        case 'esriGeometryPolyline':
                            var paths = geoStr.paths[0];
                            var pathX = [];
                            var pathY = [];
                            var lines = [];
                            _.map(paths, function (path) {
                                pathX.push(path[0]);
                                pathY.push(path[1]);
                                lines.push(ol.proj.transform(path, 'EPSG:' + geoStr.spatialReference.wkid, 'EPSG:' + vm.doc.srcID));
                            });
                            center = [(_.max(pathX) + _.min(pathX)) / 2, (_.max(pathY) + _.min(pathY)) / 2];
                            center = ol.proj.transform(center, 'EPSG:' + geoStr.spatialReference.wkid, 'EPSG:' + vm.doc.srcID);
                            drawPolyline(lines, new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    width: 6,
                                    color: 'red'
                                })
                            }));
                            break;

                        case 'esriGeometryPolygon':
                            var rings = geoStr.rings[0];
                            var centerX = [];
                            var centerY = [];
                            var polygon = [];
                            _.map(rings, function (ring) {
                                centerX.push(ring[0]);
                                centerY.push(ring[1]);
                                polygon.push(ol.proj.transform(ring, 'EPSG:' + geoStr.spatialReference.wkid, 'EPSG:' + vm.doc.srcID));
                            });
                            center = [(_.max(centerX) + _.min(centerX)) / 2, (_.max(centerY) + _.min(centerY)) / 2];
                            center = ol.proj.transform(center, 'EPSG:' + geoStr.spatialReference.wkid, 'EPSG:' + vm.doc.srcID);
                            zoom = 18;
                            drawPolygon([polygon], new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    width: 3,
                                    color: [255, 0, 0, 1]
                                }),
                                fill: new ol.style.Fill({
                                    color: [255, 0, 0, 0.4]
                                })
                            }));
                            break;

                        default:
                            break;
                    }
                    map && center.length === 2 && map.getView().animate({
                        center: center,
                        zoom: zoom,
                        duration: 600
                    });
                };

                $scope.pageChanged = function () {
                    Doc.queryDataOnLayer({
                        docId: vm.doc.docId,
                        name: vm.doc.name,
                        userId: vm.doc.userId,
                        layerIndex: vm.table.layerIndex,
                        where: vm.table.queryString,
                        returnGeo: true,
                        pageNo: vm.pagination.pageNo,
                        pageNum: vm.pagination.pageSize
                    }).then(function (res) {
                        var data = [];
                        res.data.result.map(function (o) {
                            data.push(o);
                        });
                        vm.table.data = data;
                    });
                };

                /**
                 * 监听"文档打开"事件
                 */
                $scope.$on('doc:open', function (event, value) {
                    vm.menus = Router.list();
                    vm.doc = value;
                    var extent = [parseFloat(vm.doc.xmin), parseFloat(vm.doc.ymin), parseFloat(vm.doc.xmax), parseFloat(vm.doc.ymax)];

                    $scope.closeTable();
                    getMapInfo().then(function (res) {
                        initMap(URL_CFG.api + 'MapService.svc/Export', extent);
                    });
                });

                /**
                 * 监听"图层更新"事件，如有图层更新，则重新获取图层列表信息
                 */
                $scope.$on('layer:change', function (event, value) {
                    getMapInfo().then(function (res) {
                        map.getLayers().item(0).setSource(new ol.source.ImageWMS({
                            url: URL_CFG.api + 'MapService.svc/Export',
                            attributions: '© <a href="http://www.dx-tech.com/">HGT</a>',
                            imageExtent: map.getView().calculateExtent(),
                            params: {
                                docId: vm.doc.docId,
                                userId: vm.doc.userId,
                                name: vm.doc.name,
                                random: uuid.create()
                            }
                        }));
                    });
                });

                /**
                 * 监听"地图更新"事件
                 */
                $scope.$on('map:change', function (event, value) {
                    var loading = layer.load(1, {
                        shade: [0.1, '#000']
                    });
                    Doc.setLayerVisible({
                        docId: vm.doc.docId,
                        userId: vm.doc.userId,
                        name: vm.doc.name,
                        layerIndex: value.layers,
                        isVisible: true
                    }).then(function (res) {
                        layer.closeAll('loading');
                        map.getLayers().item(0).setSource(new ol.source.ImageWMS({
                            url: URL_CFG.api + 'MapService.svc/Export',
                            attributions: '© <a href="http://www.dx-tech.com/">HGT</a>',
                            imageExtent: map.getView().calculateExtent(),
                            params: {
                                docId: vm.doc.docId,
                                userId: vm.doc.userId,
                                name: vm.doc.name,
                                random: uuid.create()
                            }
                        }));
                    })
                });

                /**
                 * 监听"表格开关"事件
                 */
                $scope.$on('map:toggleTable', function (event, value) {
                    if (value) {
                        vm.showTable = true;
                        vm.table = value.table;
                        vm.pagination = value.pagination;
                    } else {
                        $scope.vm.showTable = false;
                    }
                    $timeout(function () {
                        map && map.updateSize();
                    }, 0);
                });

                /**
                 * 监听"符号改变"事件
                 */
                $scope.$on('symbol:change', function (event, value) {
                    // Todo: change symbol
                });

                function initMap(url, extent) {
                    document.getElementById('map').innerHTML = '';
                    map = new ol.Map({
                        target: 'map',
                        layers: [new ol.layer.Image()],
                        controls: ol.control.defaults().extend([
                            new ol.control.ScaleLine()
                        ]),
                        view: new ol.View({
                            extent: extent,
                            random: uuid.create(),
                            center: [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
                            projection: new ol.proj.Projection({
                                code: 'EPSG:' + vm.doc.srcID,
                                // 简单区分坐标系
                                units: extent[0] < 150 && extent[0] > 50 ? 'degrees' : 'm'
                            })
                        })
                    });

                    // set map's resolution
                    var size = map.getSize();
                    var resolution = (extent[3] - extent[1]) / size[1];
                    map.getView().setResolution(resolution);

                    map.getLayers().item(0).setSource(new ol.source.ImageWMS({
                        url: url,
                        // ratio: 1,
                        imageExtent: extent,
                        attributions: '© <a href="http://www.dx-tech.com/">HGT</a>',
                        params: {
                            docId: vm.doc.docId,
                            userId: vm.doc.userId,
                            name: vm.doc.name,
                            random: uuid.create()
                        }
                    }));
                }

                function getUserGdb() {
                    Data.getUserGdbInfo({
                        userId: 1
                    }).then(function (res) {
                        if (res.status === 200) {
                            vm.gdbs = [];
                            res.data.result.map(function (gdb) {
                                vm.gdbs.push({
                                    name: gdb.Name,
                                    gdbPath: gdb.GdbPath
                                });
                            });
                        } else {
                            // Todo: 创建用户的gdb
                        }
                    });
                }

                function getMapInfo() {
                    var deferred = $q.defer();
                    var loading = layer.load(1, {
                        shade: [0.1, '#000']
                    });
                    Doc.getMapInfo({
                        docId: vm.doc.docId,
                        userId: vm.doc.userId,
                        name: vm.doc.name
                    }).then(function (res) {
                        if (res.data.status === "ok" && res.data.result) {
                            deferred.resolve(res);
                            vm.layers = res.data.result.layers;
                            for (var i = 0; i < vm.layers.length; i++) {
                                addShowAttribute(vm.layers[i]);
                            }
                            judgeCheckBox(vm.layers);
                            layer.closeAll('loading');
                        } else {
                            deferred.reject(res);
                            layer.closeAll('loading');
                            layer.open({
                                title: '地图打开失败',
                                content: res.data.msg
                            });
                        }
                    }, function (err) {
                        deferred.reject(err);
                    });
                    return deferred.promise;
                }

                function drawPoints(pts, style) {
                    if (highLightLayer) {
                        map && map.removeLayer(highLightLayer);
                    }
                    highLightLayer = new ol.layer.Vector({
                        source: new ol.source.Vector({
                            features: [new ol.Feature(new ol.geom.MultiPoint(pts))]
                        }),
                        style: style
                    });
                    map.addLayer(highLightLayer);
                }

                function drawPolyline(pts, style) {
                    if (highLightLayer) {
                        map && map.removeLayer(highLightLayer);
                    }
                    highLightLayer = new ol.layer.Vector({
                        source: new ol.source.Vector({
                            features: [new ol.Feature(new ol.geom.LineString(pts))]
                        }),
                        style: style
                    });
                    map.addLayer(highLightLayer);
                }

                function drawPolygon(pts, style) {
                    if (highLightLayer) {
                        map && map.removeLayer(highLightLayer);
                    }
                    highLightLayer = new ol.layer.Vector({
                        source: new ol.source.Vector({
                            features: [new ol.Feature(new ol.geom.Polygon(pts))]
                        }),
                        style: style
                    });
                    map.addLayer(highLightLayer);
                }

                function addShowAttribute(layer) {
                    layer.showChild = true; //是否显示子节点
                    layer.showSelf = true; //是否显示自己
                    layer.ischeck = 2; //1.选中, 2.未选中, 3.子节点未全部选中
                    if (layer.subLayerIds !== null && layer.subLayerIds.length !== 0) {
                        for (var i = 0; i < layer.subLayerIds.length; i++) {
                            addShowAttribute(layer.subLayerIds[i]);
                        }
                    }
                }

                var check = 1;

                function judgeCheckBox(layers) {
                    for (var i = 0; i < layers.length; i++) {
                        if (layers[i].defaultVisibility === true && layers[i].subLayerIds === null) {
                            layers[i].ischeck = 1;
                        } else if (layers[i].defaultVisibility === true && layers[i].subLayerIds !== null) {
                            check = 1;
                            layers[i].ischeck = check;
                            ischeck(layers[i].subLayerIds);
                            layers[i].ischeck = check;
                            judgeCheckBox(layers[i].subLayerIds);
                        }
                    }
                }

                function ischeck(layers) {
                    for (var i = 0; i < layers.length; i++) {
                        if (layers[i].defaultVisibility === false) {
                            check = 3;
                            return;
                        }
                        if (layers[i].subLayerIds !== null) {
                            ischeck(layers[i].subLayerIds);
                        }
                    }
                }
            }
        ])
})(angular);

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
/**
 * Created by Donny on 17/5/18.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('CreatePanelController', ['$scope', '$rootScope', '$q', '$timeout', 'Auth', 'Doc', 'Data', 'URL_CFG',
            function ($scope, $rootScope, $q, $timeout, Auth, Doc, Data, URL_CFG) {
                var vm = $scope.vm;
                var mapId = 0;
                vm.overlay.tab = vm.overlay.tab || 0;
                vm.overlay.nodes = [];
                vm.overlay.items = [];
                vm.overlay.setting = {
                    view: {
                        fontCss: setFontCss
                    },
                    callback: {
                        onClick: function (event, treeId, treeNode) {
                            if (!treeNode.items) {
                                getMapDataList({
                                    userId: Auth.getUserInfo().userId,
                                    typeRes: 'Users',
                                    srcID: vm.overlay.doc.srcID,
                                    geoType: treeNode.geometryType,
                                    pageNo: 0,
                                    pageNum: 10000
                                }).then(function (items) {
                                    treeNode.items = items;
                                    vm.overlay.items = items;
                                })
                            } else {
                                $timeout(function () {
                                    vm.overlay.items = treeNode.items;
                                }, 0);
                            }
                        }
                    }
                };

                function setFontCss(treeId, treeNode) {
                    if (treeNode.data === 'error') {
                        return {color: 'red'};
                    }
                    return treeNode.data ? {color: '#4c4c4c'} : {color: "#bfbfbf"};
                }

                $scope.pageChanged = function () {
                    getDocs(vm.overlay.pagination.pageNo - 1, vm.overlay.pagination.pageSize, "模板", "Public", "Template");
                };

                $scope.select = function (id) {
                    if (vm.overlay.tab === 0) {
                        vm.overlay.choose = false;
                    } else {
                        vm.overlay.themeChoose1 = false;
                        vm.overlay.themeChoose2 = true;
                    }
                    mapId = parseInt(id);
                    vm.overlay.doc.docId = parseInt(id);
                };

                $scope.create = function () {
                    var loading = layer.load(1, {
                        shade: [0.1, '#000']
                    });
                    if (vm.overlay.tab === 0) {
                        // 模版创建
                        Doc.create(vm.overlay.doc).then(function (res) {
                            if (res.data.status === "ok" && res.data.result) {
                                var doc = res.data.result;
                                vm.showMask = false;
                                $rootScope.$broadcast('doc:change');
                                $rootScope.$broadcast('doc:open', {
                                    docId: doc.Id,
                                    userId: doc.UserId,
                                    name: doc.Name,
                                    name2: doc.Name2,
                                    author: doc.Author,
                                    detail: doc.Detail,
                                    detail2: doc.Detail2,
                                    tagId: doc.TagId,
                                    xmin: doc.Xmin,
                                    ymin: doc.Ymin,
                                    xmax: doc.Xmax,
                                    ymax: doc.Ymax,
                                    srcID: doc.SrcID
                                });
                                layer.closeAll('loading');
                                layer.msg('地图创建成功', {icon: 1});
                            } else {
                                layer.closeAll('loading');
                                layer.msg('地图创建失败', {icon: 2});
                            }
                        });
                    } else {
                        // 专题创建
                        Doc.create(vm.overlay.doc).then(function (res) {
                            if (res.data.status === "ok" && res.data.result) {
                                var mapDoc = res.data.result;
                                vm.overlay.doc = {
                                    id: mapDoc.Id,
                                    userId: mapDoc.UserId,
                                    name: mapDoc.Name,
                                    name2: mapDoc.Name2,
                                    author: mapDoc.Author,
                                    update: mapDoc.UpdateTime.split(' ')[0],
                                    brief: mapDoc.Detail,
                                    detail: mapDoc.Detail2,
                                    tagName: mapDoc.TagName,
                                    xmin: mapDoc.Xmin,
                                    ymin: mapDoc.Ymin,
                                    xmax: mapDoc.Xmax,
                                    ymax: mapDoc.Ymax,
                                    srcID: mapDoc.SrcID
                                };
                                vm.overlay.themeChoose2 = false;
                                vm.overlay.themeChoose3 = true;
                                getThemeLayers(mapId);
                                layer.closeAll('loading');
                                layer.msg('地图创建成功', {icon: 1});
                            } else {
                                layer.closeAll('loading');
                                layer.msg('地图创建失败', {icon: 2});
                            }
                        });
                    }
                };

                $scope.confirm = function () {
                    var treeObj = $.fn.zTree.getZTreeObj("tree");
                    var nodes = treeObj.getNodes();
                    var result = true;
                    nodes.map(function (node) {
                        if (!node.data) {
                            result = false;
                        }
                    });
                    if (result) {
                        vm.showMask = false;
                        layer.msg('地图创建成功', {icon: 1});
                        $rootScope.$broadcast('doc:change');
                        $rootScope.$broadcast('doc:open', {
                            docId: vm.overlay.doc.id,
                            userId: vm.overlay.doc.userId,
                            name: vm.overlay.doc.name,
                            name2: vm.overlay.doc.name2,
                            author: vm.overlay.doc.author,
                            detail: vm.overlay.doc.detail,
                            detail2: vm.overlay.doc.detail2,
                            tagName: vm.overlay.doc.tagName,
                            xmin: vm.overlay.doc.xmin,
                            ymin: vm.overlay.doc.ymin,
                            xmax: vm.overlay.doc.xmax,
                            ymax: vm.overlay.doc.ymax,
                            srcID: vm.overlay.doc.srcID
                        });
                    } else {
                        layer.msg('请填充所有图层', {icon: 2});
                    }
                };

                $scope.add = function (item) {
                    var treeObj = $.fn.zTree.getZTreeObj("tree");
                    var node = treeObj.getSelectedNodes()[0];
                    if (node) {
                        var loading = layer.load(1, {
                            shade: [0.1, '#000']
                        });
                        Doc.setLayerData({
                            docId: vm.overlay.doc.id,
                            userId: vm.overlay.doc.userId,
                            name: vm.overlay.doc.name,
                            layerIndex: node.layerIndex,
                            dataId: item.Id
                        }).then(function (res) {
                            layer.closeAll('loading');
                            if (res.data.status === "ok" && res.data.result) {
                                node.data = item;
                                node.items.map(function (it) {
                                    if (it.Id === item.Id) {
                                        it.data = item;
                                    } else {
                                        it.data = null;
                                    }
                                });
                                treeObj.refresh();
                                treeObj.selectNode(node);
                            } else {
                                layer.open({
                                    title: '专题数据添加失败',
                                    content: res.data.msg
                                });
                            }
                        })
                    }
                };

                function getDocs(pageNo, pageSize, tagName, typeRes, mapType) {
                    Doc.list({
                        pageNo: pageNo,
                        pageNum: pageSize,
                        tagName: tagName || "",
                        typeRes: typeRes || "Public",
                        mapType: mapType || "MapServer"
                    }).then(function (res) {
                        if (res.data.status === "ok" && res.data.result) {
                            vm.overlay.templates = [];
                            res.data.result.length > 0 && res.data.result.map(function (template) {
                                vm.overlay.templates.push({
                                    id: template.Id,
                                    title: template.Name,
                                    author: template.Author,
                                    update: template.UpdateTime.split(' ')[0],
                                    version: "1.0.0",
                                    img: URL_CFG.img + _.replace(template.PicPath, '{$}', 'big'),
                                    brief: template.Detail,
                                    detail: template.Detail2
                                })
                            });
                            vm.overlay.pagination.totalItems = res.data.count;
                            vm.overlay.pagination.maxPage = Math.ceil(res.data.count / vm.overlay.pagination.pageSize);
                        } else {
                            console.log(res.data);
                        }
                    });
                }

                function getThemeLayers(mapId) {
                    Doc.getThemeLayers({
                        mapId: mapId
                    }).then(function (res) {
                        vm.overlay.nodes = [];
                        res.data.result.map(function (node) {
                            vm.overlay.nodes.push({
                                id: node.Id,
                                mapId: node.MapId,
                                name: node.Name,
                                name2: node.Name2,
                                detail: node.Detail,
                                layerIndex: node.LayerIndex,
                                geometryType: node.GeometryType,
                                data: null
                            })
                        })
                    })
                }

                function getMapDataList(param) {
                    var deferred = $q.defer();
                    Data.getMapDataList(param).then(function (res) {
                        if (res.status === 200) {
                            var items = [];
                            res.data.result.map(function (d) {
                                items.push(d);
                            });
                            deferred.resolve(items);
                        } else {
                            deferred.reject(res);
                        }
                    }, function (err) {
                        deferred.reject(err);
                    });
                    return deferred.promise;
                }

                Doc.getMapMenu({
                    parentId: -1
                }).then(function (res) {
                    if (res.data.status === "ok") {
                        vm.overlay.dropdown = res.data.result;
                    }
                });

                Doc.list({
                    pageNo: 0,
                    pageNum: 8,
                    tagName: "",
                    typeRes: "Public",
                    mapType: "Themes"
                }).then(function (res) {
                    if (res.data.status === "ok" && res.data.result) {
                        vm.overlay.themes = [];
                        res.data.result.length > 0 && res.data.result.map(function (theme) {
                            vm.overlay.themes.push({
                                id: theme.Id,
                                title: theme.Name,
                                author: theme.Author,
                                update: theme.UpdateTime.split(' ')[0],
                                version: "1.0.0",
                                img: URL_CFG.img + _.replace(theme.PicPath, '{$}', 'big'),
                                brief: theme.Detail,
                                detail: theme.Detail2
                            })
                        });
                        vm.overlay.pagination.totalItems = res.data.count;
                        vm.overlay.pagination.maxPage = Math.ceil(res.data.count / vm.overlay.pagination.pageSize);
                    }
                });
            }])
})(angular);
/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('DataController', ['$scope', '$rootScope', '$uibModal', 'Data', 'Doc', 'Auth',
            function ($scope, $rootScope, $uibModal, Data, Doc, Auth) {
                var vm = $scope.vm = {
                    data: [],
                    typeRes: {
                        id: 1,
                        data: [{
                            id: 0,
                            name: 'Users',
                            text: '用户数据'
                        }, {
                            id: 1,
                            name: 'Public',
                            text: '公共数据'
                        }]
                    },
                    keywords: {
                        id: 0,
                        data: [{
                            id: 0,
                            name: '',
                            text: '按名称'
                        }, {
                            id: 1,
                            name: '',
                            text: '按坐标系'
                        }]
                    },
                    pagination: {
                        totalItems: 0,
                        maxSize: 5,
                        pageNo: 1,
                        pageSize: 10,
                        maxPage: 1
                    }
                };


                $scope.$watch('vm.upload', function (value) {
                    if (value) {
                        console.log(value);
                        Data.uploadData({
                            userId: Auth.getUserInfo().userId,
                            fileName: value.fileName,
                            exeName: value.exeName,
                            fileContent: value.fileContent
                        }).then(function (res) {
                            if (res.data.status === 'ok') {
                                layer.msg('数据上传成功', {icon: 1});
                                $scope.change(0);
                            } else {
                                layer.msg('数据上传失败', {icon: 2});
                            }
                        }, function (err) {
                            layer.msg('数据上传失败', {icon: 2});
                        })
                    }
                });

                $scope.change = function (index) {
                    if (vm.typeRes.id !== index) {
                        vm.typeRes.id = index;
                        getMapDataList({
                            userId: Auth.getUserInfo().userId,
                            typeRes: vm.typeRes.data[vm.typeRes.id].name,
                            pageNo: vm.pagination.pageNo - 1,
                            pageSize: vm.pagination.pageSize
                        });
                    }
                };

                $scope.pageChanged = function () {
                    getMapDataList({
                        typeRes: vm.typeRes.data[vm.typeRes.id].name,
                        pageNo: vm.pagination.pageNo - 1,
                        pageSize: vm.pagination.pageSize
                    });
                };

                $scope.preview = function (data) {
                    $rootScope.$broadcast('mask:show', {
                        showMask: true,
                        template: '<map-panel></map-panel>',
                        overlay: {
                            title: data.Name,
                            docId: data.Id,
                            userId: data.UserId,
                            name: data.Name
                        }
                    })
                };

                $scope.add = function (data) {
                    if ($scope.$parent.vm.doc && $scope.$parent.vm.doc.docId) {
                        if (vm.typeRes.id) {
                            // 添加公共数据
                            var newLayer = {
                                userId: $scope.$parent.vm.doc.userId,
                                orgPath: data.GdbPath,
                                orgNames: data.Name,
                                userPath: $scope.$parent.vm.gdbs[0].gdbPath,
                                desNames: data.Name
                            };

                            var modalInstance = $uibModal.open({
                                ariaLabelledBy: 'modal-title',
                                ariaDescribedBy: 'modal-body',
                                templateUrl: 'myModalContent.html',
                                controller: 'ModalInstanceCtrl',
                                resolve: {
                                    newLayer: newLayer
                                }
                            });

                            modalInstance.result.then(function (newLayer) {
                                if (newLayer.id) {
                                    addLayer($scope.$parent.vm.doc.docId, $scope.$parent.vm.doc.userId, $scope.$parent.vm.doc.name, newLayer.id);
                                    console.log('Modal Confirmed at: ' + new Date());
                                }
                            }, function () {
                                console.info('Modal dismissed at: ' + new Date());
                            });
                        } else {
                            // 添加用户数据
                            addLayer($scope.$parent.vm.doc.docId, $scope.$parent.vm.doc.userId, $scope.$parent.vm.doc.name, data.Id);
                        }
                    } else {
                        layer.alert('无打开文档，数据添加失败');
                    }
                };

                getMapDataList({
                    userId: Auth.getUserInfo().userId,
                    typeRes: vm.typeRes.data[vm.typeRes.id].name,
                    pageNo: vm.pagination.pageNo - 1,
                    pageSize: vm.pagination.pageSize
                });

                function getMapDataList(param) {
                    vm.doc = $scope.$parent.vm.doc || {};
                    Data.getMapDataList({
                        dataId: param.dataId,
                        name: param.name,
                        userId: vm.typeRes.id ? '' : param.userId,
                        gdbPath: param.gdbPath,
                        typeRes: param.typeRes || 'public',
                        srcId: vm.doc.srcID,
                        pageNo: param.pageNo,
                        pageNum: param.pageSize
                    }).then(function (res) {
                        if (res.status === 200) {
                            vm.data = res.data.result;
                            vm.pagination.totalItems = res.data.count;
                            vm.pagination.maxPage = Math.ceil(res.data.count / vm.pagination.pageSize);
                        }
                    });
                }

                function addLayer(docId, userId, name, dataId) {
                    var loading = layer.load(1, {
                        shade: [0.1, '#000']
                    });
                    Doc.addLayerToMap({
                        docId: docId,
                        userId: userId,
                        name: name,
                        dataId: dataId
                    }).then(function (res) {
                        if (res.status === 200 && res.data.status === 'ok') {
                            layer.closeAll('loading');
                            $scope.$emit('layer:change', res.data);
                            layer.msg('数据添加成功', {icon: 1});
                        } else {
                            layer.closeAll('loading');
                            layer.open({
                                title: '数据添加失败',
                                content: res.data.msg
                            });
                        }
                    })
                }
            }

        ])

        .controller('ModalInstanceCtrl', ['$uibModalInstance', '$scope', 'newLayer', 'Data', function ($uibModalInstance, $scope, newLayer, Data) {
            var vm = $scope.vm = {
                newLayer: newLayer,
                error: false,
                errorMsg: ''
            };

            $scope.ok = function () {
                if (!vm.newLayer.orgNames.length) {
                    vm.error = true;
                    vm.errorMsg = '名称不能为空！';
                } else {
                    var loading = layer.load(1, {
                        shade: [0.1, '#000']
                    });
                    return Data.importDataFromPublic({
                        userId: vm.newLayer.userId,
                        orgPath: vm.newLayer.orgPath,
                        orgNames: vm.newLayer.orgNames,
                        userPath: vm.newLayer.userPath,
                        desNames: vm.newLayer.desNames
                    }).then(function (res) {
                        layer.closeAll('loading');
                        if (res.data.status === 'error') {
                            vm.error = true;
                            vm.errorMsg = res.data.msg;
                        } else if (res.data.status === 'ok') {
                            vm.newLayer.id = res.data.result[0].Id;
                            $uibModalInstance.close(vm.newLayer);
                            vm.error = false;
                        }
                    });
                }
            };

            $scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
                vm.error = false;
            };
        }]);
})(angular);
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
/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')

        .controller('FilesController', ['$scope', '$rootScope', 'Doc', 'Auth', 'URL_CFG', function ($scope, $rootScope, Doc, Auth, URL_CFG) {
            var vm = $scope.vm = {
                mapDoc: [],
                typeRes: {
                    id: 1,
                    data: [{
                        id: 0,
                        name: 'Users',
                        text: '用户数据'
                    }, {
                        id: 1,
                        name: 'Public',
                        text: '公共数据'
                    }]
                },
                pagination: {
                    totalItems: 0,
                    maxSize: 5,
                    pageNo: 1,
                    pageSize: 10,
                    maxPage: 1
                }
            };

            $scope.pageChanged = function () {
                getMapList(vm.pagination.pageNo - 1, vm.pagination.pageSize, "", "Public", "");
            };

            $scope.preview = function (mapdoc) {
                $scope.$emit('doc:open', {
                    docId: mapdoc.id,
                    userId: mapdoc.userId,
                    name: mapdoc.title,
                    name2: mapdoc.name2,
                    author: mapdoc.author,
                    detail: mapdoc.brief,
                    detail2: mapdoc.detail,
                    tagName: mapdoc.tagName,
                    xmin: mapdoc.xmin,
                    ymin: mapdoc.ymin,
                    xmax: mapdoc.xmax,
                    ymax: mapdoc.ymax,
                    srcID: mapdoc.srcID,
                    srcName: mapdoc.srcName,
                    minScale: mapdoc.minScale,
                    maxScale: mapdoc.maxScale,
                    mapType: mapdoc.mapType,
                    mapServerPath: mapdoc.mapServerPath,
                    mxdPath: mapdoc.mxdPath
                });
            };

            $scope.deleteMap = function (mapdoc) {
                layer.confirm('您确定要删除该地图文档？', {
                    btn: ['确定', '取消']
                }, function () {
                    layer.closeAll();
                    Doc.remove({
                        docId: mapdoc.id,
                        userId: mapdoc.userId,
                        name: mapdoc.title
                    }).then(function (res) {
                        if (res.data.status === "ok") {
                            layer.msg('地图删除成功', {icon: 1});
                            getMapList(vm.pagination.pageNo - 1, vm.pagination.pageSize, "", "Users", "");
                        }
                        else {
                            layer.msg('地图删除失败', {icon: 2});
                        }
                    })
                }, function () {
                    layer.close()
                });
            };

            /**
             * 监听"文档更新"事件
             */
            $scope.$on('doc:change', function (event, value) {
                vm.pagination = {
                    totalItems: 0,
                    maxSize: 5,
                    pageNo: 1,
                    pageSize: 10,
                    maxPage: 1
                };
                getMapList(vm.pagination.pageNo - 1, vm.pagination.pageSize, "", "Users", "");
            });

            getMapList(vm.pagination.pageNo - 1, vm.pagination.pageSize, "", "Users", "");

            function getMapList(pageNo, pageSize, tagName, typeRes, mapType) {
                Doc.list({
                    userId: Auth.getUserInfo().userId,
                    pageNo: pageNo,
                    pageNum: pageSize,
                    tagName: tagName || "",
                    typeRes: typeRes || "Public"
                    //mapType: mapType || "MapServer"
                }).then(function (res) {
                    if (res.data.status === "ok" && res.data.result) {
                        vm.mapDoc = [];
                        res.data.result.length > 0 && res.data.result.map(function (mapDoc) {
                            vm.mapDoc.push({
                                id: mapDoc.Id,
                                title: mapDoc.Name,
                                userId: mapDoc.UserId,
                                name2: mapDoc.Name2,
                                img: URL_CFG.img + _.replace(mapDoc.PicPath, '{$}', 'big'),
                                author: mapDoc.Author,
                                update: mapDoc.UpdateTime.split(' ')[0],
                                brief: mapDoc.Detail,
                                detail: mapDoc.Detail2,
                                tagName: mapDoc.TagName,
                                srcID: mapDoc.SrcID,
                                srcName: mapDoc.SrcName,
                                xmin: mapDoc.Xmin,
                                ymin: mapDoc.Ymin,
                                xmax: mapDoc.Xmax,
                                ymax: mapDoc.Ymax,
                                minScale: mapDoc.MinScale,
                                maxScale: mapDoc.MaxScale,
                                mapType: mapDoc.MapType,
                                mapServerPath: mapDoc.MapServerPath,
                                mxdPath: mapDoc.MxdPath,
                                typeRes: mapDoc.TypeRes,
                                version: "1.0.0"
                            })
                        });
                        vm.pagination.totalItems = res.data.count;
                        vm.pagination.maxPage = Math.ceil(res.data.count / vm.pagination.pageSize);
                    }
                });
            }
        }])
})(angular);
/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('HomeController', function () {

        })
})(angular);
/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('InfoController', function () {

        })
})(angular);
/**
 * Created by Donny on 17/5/18.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('MapPanelController', ['$scope', 'Auth', 'URL_CFG', function ($scope, Auth, URL_CFG) {
            var vm = $scope.vm;
            var extent = [vm.overlay.doc.xmin, vm.overlay.doc.ymin, vm.overlay.doc.xmax, vm.overlay.doc.ymax];
            var map = new ol.Map({
                controls: ol.control.defaults().extend([
                    new ol.control.ScaleLine()
                ]),
                layers: [new ol.layer.Image()],
                target: 'panel-map',
                view: new ol.View({
                    center: [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
                    // zoom: 15,
                    extent: extent,
                    projection: new ol.proj.Projection({
                        code: 'EPSG:' + vm.overlay.doc.srcID,
                        // set projection's units
                        units: extent[0] < 150 && extent[0] > 50 ? 'degrees' : 'm'
                    })
                })
            });

            // set map's resolution
            var size = map.getSize();
            var resolution = (extent[3] - extent[1]) / size[1];
            map.getView().setResolution(resolution);


            initMap(URL_CFG.api + 'MapService.svc/Export');

            function initMap(url) {
                map.getLayers().item(0).setSource(new ol.source.ImageWMS({
                    url: url,
                    attributions: '© <a href="http://www.dx-tech.com/">HGT</a>',
                    imageExtent: map.getView().calculateExtent(),
                    params: {
                        docId: vm.overlay.doc.id,
                        userId: 0,
                        name: vm.overlay.doc.title,
                        typeMapDoc: vm.overlay.typeMapDoc,
                        typeResouce: vm.overlay.typeResouce
                    }
                }));
            }
        }])
})(angular);
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
/**
 * Created by Donny on 17/7/17.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('PlotPanelController', ['$scope', 'Doc', 'URL_CFG', function ($scope, Doc, URL_CFG) {
            var vm = $scope.vm;
            var layerIds = compose(filter, map, join);

            vm.overlay.showImg = false;

            $scope.commit = function () {
                var loading = layer.load(1, {
                    shade: [0.1, '#000']
                });
                Doc.getMapLayerExport({
                    docId: vm.overlay.doc.docId,
                    userId: vm.overlay.doc.userId,
                    name: vm.overlay.doc.name,
                    extent: vm.overlay.bbox.join(','),
                    layerIds: layerIds(vm.overlay.plot.layers),
                    mapName: vm.overlay.plot.title,
                    mapOrg: vm.overlay.plot.org,
                    mapAuthor: vm.overlay.plot.author,
                    isVertical: vm.overlay.plot.isVertical,
                    pageForm: 'A4'
                }).then(function (res) {
                    if (res.data.status === 'ok') {
                        layer.closeAll('loading');
                        vm.overlay.plot.imgUrl = URL_CFG.img + 'RootData/TempData/' + res.data.result;
                        vm.overlay.showImg = true;
                    } else {
                        layer.msg('出图失败', {icon: 2});
                    }
                }, function () {
                    layer.msg('出图失败', {icon: 2});
                })
            };

            function compose(f, g, h) {
                return function (x) {
                    return h(g(f(x)));
                };
            }

            function filter(x) {
                return _.filter(x, 'checked');
            }

            function map(x) {
                return _.map(x, 'id');
            }

            function join(x) {
                return _.join(x, ',');
            }
        }])
})(angular);
/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('PublishController', function () {

        })
})(angular);
/**
 * Created by Donny on 17/5/23.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('PublishPanelController', ['$scope', 'Doc', function ($scope, Doc) {
            var vm = $scope.vm;

            $scope.publish = function () {
                var loading = layer.load(1, {
                    shade: [0.1, '#000']
                });
                Doc.publish({
                    docId: vm.overlay.doc.docId,
                    userId: vm.overlay.doc.userId,
                    name: vm.overlay.doc.name,
                    autor: vm.overlay.doc.autor,
                    tagName: vm.overlay.doc.tagName,
                    Xmin: vm.overlay.doc.extent[0],
                    Ymin: vm.overlay.doc.extent[1],
                    Xmax: vm.overlay.doc.extent[2],
                    Ymax: vm.overlay.doc.extent[3],
                    PublishName: vm.overlay.doc.publishName,
                    folerName: 'MapOnline',
                    detail: vm.overlay.doc.detail,
                    detail2: vm.overlay.doc.detail2
                }).then(function (res) {
                    if (res.data.result === 'OK') {
                        $scope.vm.showMask = false;
                        $scope.vm.overlay = {};
                        layer.closeAll('loading');
                        layer.msg('地图发布成功', {icon: 1});
                    } else {
                        layer.closeAll('loading');
                        layer.msg('地图发布失败', {icon: 2});
                    }
                })
            };

            Doc.getMapMenu({
                parentId: -1
            }).then(function (res) {
                if (res.data.status === "ok") {
                    vm.overlay.dropdown = res.data.result;
                }
            });
        }])
})(angular);
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
/**
 * Created by Donny on 17/5/16.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('TemplateController', ['$scope', '$rootScope', 'Doc', 'URL_CFG', function ($scope, $rootScope, Doc, URL_CFG) {
            var vm = $scope.vm = {
                templates: [],
                pagination: {
                    totalItems: 0,
                    maxSize: 5,
                    pageNo: 1,
                    pageSize: 10,
                    maxPage: 1
                }
            };

            $scope.pageChanged = function () {
                getTemplates(vm.pagination.pageNo - 1, vm.pagination.pageSize, "模板", "Public", "Template");
            };

            $scope.preview = function (doc) {
                $rootScope.$broadcast('mask:show', {
                    showMask: true,
                    template: '<map-panel></map-panel>',
                    overlay: {
                        title: doc.title,
                        doc: doc,
                        typeMapDoc: 'Template',
                        typeResouce: 'Public'
                    }
                })
            };

            getTemplates(vm.pagination.pageNo - 1, vm.pagination.pageSize, "模板", "Public", "Template");

            function getTemplates(pageNo, pageSize, tagName, typeRes, mapType) {
                Doc.list({
                    pageNo: pageNo,
                    pageNum: pageSize,
                    tagName: tagName || "",
                    typeRes: typeRes || "Public",
                    mapType: mapType || "MapServer"
                }).then(function (res) {
                    if (res.data.status === "ok" && res.data.result) {
                        vm.templates = [];
                        res.data.result.length > 0 && res.data.result.map(function (template) {
                            vm.templates.push({
                                id: template.Id,
                                title: template.Name,
                                author: template.Author,
                                update: template.UpdateTime.split(' ')[0],
                                version: "1.0.0",
                                img: URL_CFG.img + _.replace(template.PicPath, '{$}', 'big'),
                                brief: template.Detail,
                                detail: template.Detail2,
                                xmin: parseFloat(template.Xmin),
                                ymin: parseFloat(template.Ymin),
                                xmax: parseFloat(template.Xmax),
                                ymax: parseFloat(template.Ymax),
                                srcID: template.SrcID
                            })
                        });
                        vm.pagination.totalItems = res.data.count;
                        vm.pagination.maxPage = Math.ceil(res.data.count / vm.pagination.pageSize);
                    }
                    else {
                        console.log(res.data);
                    }
                });
            }
        }])
})(angular);
/**
 * Created by Donny on 17/5/19.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.controllers')
        .controller('UniquePanelController', ['$scope', '$rootScope', '$timeout', '$q', 'Doc', 'Symbol', function ($scope, $rootScope, $timeout, $q, Doc, Symbol) {
            var vm = $scope.vm;
            var _index = -1;

            vm.overlay.select = null;
            vm.overlay.table = {};
            vm.overlay.field = null;
            vm.overlay.menus = [];
            vm.overlay.uniqueList = [];
            vm.overlay.swipe = false;
            vm.overlay.columns = [
                {
                    checkbox: true,
                    align: 'center',
                    valign: 'middle'
                }, {
                    field: 'SymbolInfo',
                    title: 'Symbol',
                    align: 'center',
                    valign: 'middle',
                    width: '100px',
                    clickToSelect: false,
                    formatter: function (value) {
                        return value && '<img src="' + value.SymbolPreview + '"style="display:inline-block;height: 20px;width: 20px;cursor:pointer">';
                    },
                    events: {
                        'click img': function (e, value, row, index) {
                            // Todo: open symbol panel
                            $scope.$apply(function () {
                                vm.overlay.swipe = !vm.overlay.swipe;
                                vm.overlay.select = value;
                                _index = index;
                            });
                        }
                    }
                }, {
                    field: 'Value',
                    title: 'Value',
                    align: 'center',
                    valign: 'middle'
                }, {
                    field: 'Label',
                    title: 'Label',
                    align: 'center',
                    valign: 'middle'
                }
            ];

            getLayerSymbols(vm.overlay.layer).then(function (symbols) {
                // 渲染单一符号面板
                vm.overlay.select = symbols[0].SymbolInfo;

                // 渲染唯一值符号面板
                if (vm.overlay.tab === 1) {
                    vm.overlay.uniqueList = symbols;
                }
            });

            Doc.getLayerField({
                docId: vm.overlay.doc.docId,
                userId: vm.overlay.doc.userId,
                name: vm.overlay.doc.name,
                layerIndex: vm.overlay.layer.id
            }).then(function (res) {
                vm.overlay.menus = res.data.result;
            }, function (err) {
                console.log(err);
            });

            $scope.$watch('vm.overlay.tab', function (value) {
                if (value === 0 && vm.overlay.swipe) {
                    vm.overlay.select = vm.overlay.uniqueList[0].SymbolInfo;
                    $timeout(function () {
                        vm.overlay.swipe = false;
                    }, 0);
                }
            });

            $scope.selectSymbol = function (symbol) {
                angular.copy(symbol, vm.overlay.select);
            };

            $scope.change = function (value, name) {
                if (value.indexOf('rgb') >= 0) {
                    value = value.substr(4, value.length - 5);
                    vm.overlay.select[name] = value;
                }
            };

            $scope.pageChanged = function () {
                getSymbolItemListFromDB(vm.overlay.styleId, vm.overlay.pagination.pageNo - 1, vm.overlay.pagination.pageSize)
            };

            $scope.preview = function () {
                var param = _.merge(_.pick(vm.overlay.select, [
                    "StyleId",
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
                    docId: vm.overlay.doc.docId,
                    name: vm.overlay.doc.name,
                    userId: vm.overlay.doc.userId,
                    layerIndex: vm.overlay.layer.id
                });

                Symbol.getLayerSymbolInfo(param).then(function (res) {
                    switch (res.data.result.Type) {
                        // 单一符号渲染
                        case 'Single symbol':
                            vm.overlay.select.SymbolPreview = res.data.result.RenderSymbolInfo.SymbolInfo.SymbolPreview;
                            break;

                        // 唯一值符号渲染
                        case 'Unique values':
                            vm.overlay.select.SymbolPreview = res.data.result.RenderSymbols[0].SymbolInfo.SymbolPreview;
                            break;

                        default:
                            break;
                    }
                });
            };

            $scope.checkALl = function () {
                Doc.getLayerUniqueFieldVal({
                    docId: vm.overlay.doc.docId,
                    userId: vm.overlay.doc.userId,
                    name: vm.overlay.doc.name,
                    layerIndex: vm.overlay.layer.id,
                    fldName: vm.overlay.field,
                    picHeight: 20,
                    picWidth: 20
                }).then(function (res) {
                    var uniqueList = [];
                    var symbols = res.data.result.RenderSymbols;
                    var defaultSymbol = res.data.result.DefaultRenderSymbol;

                    if (defaultSymbol) {
                        uniqueList.push({
                            Value: defaultSymbol.Value,
                            Label: defaultSymbol.Label,
                            SymbolInfo: defaultSymbol.SymbolInfo
                        });
                    }
                    symbols.map(function (symbol) {
                        uniqueList.push({
                            Value: symbol.Value,
                            Label: symbol.Label,
                            SymbolInfo: symbol.SymbolInfo
                        })
                    });
                    vm.overlay.uniqueList = uniqueList;
                });
            };

            $scope.delete = function () {
                var selections = vm.overlay.table.bootstrapTable('getSelections');
                vm.overlay.table.bootstrapTable('remove', {
                    field: 'Value',
                    values: _.concat(_.map(selections, function (select) {
                        return select['Value'];
                    }))
                });
            };

            $scope.deleteAll = function () {
                vm.overlay.uniqueList = [];
            };

            $scope.commit = function () {
                var renderInfo;
                var loading = layer.load(1, {
                    shade: [0.1, '#000']
                });
                if (vm.overlay.tab === 0) {
                    // 单一符号渲染
                    renderInfo = {
                        Type: "Single symbol",
                        RenderSymbolInfo: {
                            Label: vm.overlay.symbol[0].Label,
                            Value: vm.overlay.symbol[0].Value,
                            SymbolInfo: (function (select) {
                                switch (select.SymbolType) {
                                    case 'Marker Symbols' :
                                        return {
                                            SymbolType: "Marker Symbols",
                                            Angle: select.Angle,
                                            Color: select.Color,
                                            Size: select.Size,
                                            StyleId: select.StyleId,
                                            SymbolName: select.SymbolName
                                        };

                                    case 'Line Symbols' :
                                        return {
                                            SymbolType: "Line Symbols",
                                            Width: select.Width,
                                            Color: select.Color,
                                            StyleId: select.StyleId,
                                            SymbolName: select.SymbolName
                                        };

                                    case 'Fill Symbols' :
                                        return {
                                            SymbolType: "Fill Symbols",
                                            OutlineWidth: select.OutlineWidth,
                                            OutlineColor: select.OutlineColor,
                                            FillColor: select.FillColor,
                                            StyleId: select.StyleId,
                                            SymbolName: select.SymbolName
                                        };
                                }
                            })(vm.overlay.select)
                        }
                    };
                } else {
                    // 唯一值符号渲染
                    var defaultSymbol = vm.overlay.uniqueList.shift();
                    var useDefault = defaultSymbol.Value === 'default';
                    renderInfo = {
                        Type: "Unique values",
                        UseDefaultSymbol: useDefault,
                        FieldList: [vm.overlay.field],
                        DefaultRenderSymbol: useDefault ? defaultSymbol : {
                            Label: '',
                            Value: '',
                            SymbolInfo: {}
                        },
                        RenderSymbols: useDefault ? vm.overlay.uniqueList : _.concat(defaultSymbol, vm.overlay.uniqueList)
                    };
                }

                Symbol.setLayerSymbolInfo({
                    docId: vm.overlay.doc.docId,
                    name: vm.overlay.doc.name,
                    userId: vm.overlay.doc.userId,
                    layerIndex: vm.overlay.layer.id,
                    RenderInfo: renderInfo
                }).then(function (res) {
                    if (res.data.result) {
                        $scope.closeMask();
                        layer.msg('符号设置成功', {icon: 1});
                        $rootScope.$broadcast('layer:change');
                    } else {
                        layer.closeAll('loading');
                        layer.msg('符号设置失败', {icon: 2});
                    }
                }, function (err) {
                    console.log(err);
                });
            };

            $scope.save = function () {
                console.log(vm.overlay.field);

                var list = [];
                angular.copy(vm.overlay.uniqueList, list);
                $timeout(function () {
                    vm.overlay.swipe = false;
                    list[_index].SymbolInfo = vm.overlay.select;
                    vm.overlay.uniqueList = list;
                }, 0);

                $timeout(function () {
                    vm.overlay.select = vm.overlay.uniqueList[0].SymbolInfo;
                }, 600);
            };

            function getLayerSymbols(layer) {
                var deferred = $q.defer();
                var symbols = [];

                Symbol.getLayerSymbolInfo({
                    docId: vm.overlay.doc.docId,
                    userId: vm.overlay.doc.userId,
                    name: vm.overlay.doc.name,
                    layerIndex: layer.id,
                    picHeight: 50,
                    picWidth: 50
                }).then(function (res) {
                    if (res.status === 200 && res.data.status === 'ok') {
                        switch (res.data.result.Type) {
                            // 单一符号渲染
                            case 'Single symbol':
                                symbols.push(res.data.result.RenderSymbolInfo);
                                break;

                            // 唯一值符号渲染
                            case 'Unique values':
                                symbols = (res.data.result.UseDefaultSymbol ? [res.data.result.DefaultRenderSymbol] : [])
                                    .concat(res.data.result.RenderSymbols);
                                vm.overlay.field = res.data.result.FieldList[0];
                                break;

                            default:
                                break;
                        }
                        deferred.resolve(symbols);
                    }
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            }

            function getSymbolItemListFromDB(styleId, pageNo, pageSize) {
                var symbolInfo = vm.overlay.select.SymbolInfo || {};
                Symbol.getSymbolItemListFromDB({
                    styleId: styleId,
                    pageNo: pageNo,
                    pageSize: pageSize,
                    geometryType: vm.overlay.layer && vm.overlay.layer.geometryType
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
/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.directives', [])
        .directive('myChart', function () {
            return {
                restrict: 'E',
                template: '<div ng-style="userStyle"></div>',
                replace: true,
                scope: {
                    data: '=',
                    userStyle: '='
                },
                link: function (scope, element, attrs) {
                    // 基于准备好的dom，初始化echarts实例
                    var myChat = echarts.init(element[0]);

                    // 使用刚指定的配置项和数据显示图表
                    myChat.setOption(scope.data);

                    //监听DOM元素
                    scope.$watch('data', function (value) {
                        if (value.series) {
                            // console.log(value);
                            myChat.setOption(scope.data);
                        }
                    });

                    scope.$watch('userStyle', function (value) {
                        if (value) {
                            // console.log(value);
                            myChat.resize();
                        }
                    })
                }
            };
        })

        .directive("fileread", [function () {
            return {
                scope: {
                    fileread: "="
                },
                link: function (scope, element, attributes) {
                    element.bind("change", function (changeEvent) {
                        var reader = new FileReader();
                        reader.onload = function (loadEvent) {
                            scope.$apply(function () {
                                var name = changeEvent.target.files[0].name;
                                var size = changeEvent.target.files[0].size;

                                if (size >= 10485760) {
                                    layer.alert('请选择小于10M的文件!');
                                } else {
                                    scope.fileread = {
                                        fileName: name.split('.')[0],
                                        exeName: name.split('.')[1],
                                        fileContent: loadEvent.target.result
                                    };
                                }
                            });
                        };
                        reader.readAsDataURL(changeEvent.target.files[0]);
                    });
                }
            }
        }])

        .directive('zTree', ['$parse', function ($parse) {
            return {
                restrict: 'AE',
                link: function (scope, element, attrs) {
                    var treeObj = undefined;
                    var setting = $parse(attrs.setting)(scope);
                    var zNodes = $parse(attrs.zNodes)(scope);

                    treeObj = $.fn.zTree.init(element, setting, zNodes);

                    scope.$watch(function () {
                        return $parse(attrs.zNodes)(scope);
                    }, function (value) {
                        if (value) {
                            treeObj = $.fn.zTree.init(element, setting, value);
                        }
                    });
                }
            }
        }])

        .directive('myTable', ['$window', '$parse', function ($window, $parse) {
            return {
                restrict: 'E',
                templateUrl: './tpls/mask/my-table.html',
                replace: true,
                transclude: true,
                scope: {
                    data: '=',
                    columns: '=',
                    menus: '=',
                    field: '=',
                    table: '=',
                    ngCheckAll: '=',
                    ngDelete: '=',
                    ngDeleteAll: '='
                },
                link: function (scope, element, attrs) {
                    var vm = scope.vm = {
                        checked: 0,
                        menus: []
                    };

                    scope.table = element.children("table");

                    scope.table.bootstrapTable({
                        // data: scope.data,
                        toolbar: '#toolbar',                //工具按钮用哪个容器
                        striped: true,                      //是否显示行间隔色
                        cache: false,                       //是否使用缓存，默认为true，所以一般情况下需要设置一下这个属性（*）
                        pagination: true,                   //是否显示分页（*）
                        sortable: false,                    //是否启用排序
                        search: true,                       //是否显示搜索框
                        sortOrder: "asc",                   //排序方式
                        pageNumber: 1,                      //初始化加载第一页，默认第一页
                        pageSize: 6,                        //每页的记录行数（*）
                        clickToSelect: true,                //是否启用点击选中行
                        buttonsClass: 'btn btn-default',
                        columns: scope.columns,
                        onCheck: function () {
                            scope.$apply(function () {
                                scope.vm.checked++;
                            });
                        },
                        onUncheck: function () {
                            scope.$apply(function () {
                                scope.vm.checked--;
                            });
                        },
                        onRefresh: function () {
                            scope.vm.checked = 0;
                        }
                    });

                    scope.$watch('data', function (value) {
                        if (value) {
                            scope.table && scope.table.bootstrapTable && scope.table.bootstrapTable('load', value);
                        }
                    });

                    scope.$watch('menus', function (value) {
                        if (value) {
                            vm.menus = value;
                        }
                    });

                    scope.select = function (menu) {
                        if (menu !== scope.field) {
                            scope.field = menu;
                        }
                    };

                    scope.$on("$destroy", function () {
                        if (scope.table) {
                            scope.table.bootstrapTable('removeAll');
                            scope.table.bootstrapTable('destroy');
                        }
                    });
                }
            }
        }])

        .directive('mask', ['$compile', function ($compile) {
            return {
                restrict: 'E',
                transclude: true,
                // replace: true,
                controller: 'MaskController',
                templateUrl: './tpls/mask/mask.html',
                link: function (scope, element, attrs) {
                    var mask;
                    var childScope;
                    scope.$watch('vm', function (value) {
                        if (value) {
                            if (value.showMask) {
                                // append child dynamically.
                                mask = element.children('#mask');
                                mask.html('');
                                childScope = scope.$new();
                                scope.vm.overlay = value.overlay;
                                mask.append($compile(value.template)(childScope));
                            } else {
                                // remove child.
                                mask = element.children('#mask');
                                mask.empty();
                                if (childScope) {
                                    childScope.$destroy();
                                }
                            }
                        }
                    });
                }
            }
        }])

        .directive('symbolPanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/symbolPanel.html',
                controller: 'SymbolPanelController'
            }
        })

        .directive('mapPanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/mapPanel.html',
                controller: 'MapPanelController'
            }
        })

        .directive('createPanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/createPanel.html',
                controller: 'CreatePanelController'
            }
        })

        .directive('uniquePanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/uniquePanel.html',
                controller: 'UniquePanelController'
            }
        })

        .directive('publishPanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/publishPanel.html',
                controller: 'PublishPanelController'
            }
        })

        .directive('queryPanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/queryPanel.html',
                controller: 'QueryPanelController'
            }
        })

        .directive('plotPanel', function () {
            return {
                restrict: 'E',
                require: '^mask',
                replace: true,
                templateUrl: './tpls/mask/plotPanel.html',
                controller: 'PlotPanelController'
            }
        })

})(angular);
/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.routers', ['ui.router'])
        .config(['$urlRouterProvider', '$stateProvider', function ($urlRouterProvider, $stateProvider) {
            $urlRouterProvider.otherwise('/app/explorer/files');

            $stateProvider
                .state('app', {
                    abstract: true,
                    url: '/app',
                    templateUrl: './tpls/app.html',
                    controller: 'AppController'
                })
                .state('app.explorer', {
                    abstract: true,
                    url: '/explorer',
                    templateUrl: './tpls/explorer/explorer.html',
                    controller: 'ExplorerController'
                })
                .state('app.explorer.files', {
                    parent: 'app.explorer',
                    url: '/files',
                    templateUrl: './tpls/explorer/files.html',
                    controller: 'FilesController'
                })
                .state('app.explorer.publish', {
                    parent: 'app.explorer',
                    url: '/publish',
                    templateUrl: './tpls/explorer/publish.html',
                    controller: 'PublishController'
                })
                .state('app.repository', {
                    abstract: true,
                    url: '/repository',
                    templateUrl: './tpls/repository/repository.html',
                    controller: 'RepositoryController'
                })
                .state('app.repository.data', {
                    parent: 'app.repository',
                    url: '/data',
                    templateUrl: './tpls/repository/data.html',
                    controller: 'DataController'
                })
                .state('app.repository.template', {
                    parent: 'app.repository',
                    url: '/template',
                    templateUrl: './tpls/repository/template.html',
                    controller: 'TemplateController'
                })
                .state('app.repository.symbol', {
                    parent: 'app.repository',
                    url: '/symbol',
                    templateUrl: './tpls/repository/symbol.html',
                    controller: 'SymbolController'
                })
                .state('app.edit', {
                    abstract: true,
                    url: '/edit',
                    templateUrl: './tpls/edit/edit.html',
                    controller: 'EditController'
                })
                .state('app.edit.info', {
                    parent: 'app.edit',
                    url: '/info',
                    templateUrl: './tpls/edit/info.html',
                    controller: 'InfoController'
                })
                .state('app.edit.content', {
                    parent: 'app.edit',
                    url: '/content',
                    templateUrl: './tpls/edit/content.html',
                    controller: 'ContentController'
                });
        }]);

})(angular);
/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map.services', [])
        .factory('uuid', function () {
            var uuid = {};

            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }

            uuid.create = function () {
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            };

            return uuid;
        })

        .factory('Router', function () {
            var menus = [{
                id: 0,
                img: "images/grid.png",
                name: "我的地图",
                sref: 'app.explorer',
                sub: 'files'
            }, {
                id: 1,
                img: "images/plus.png",
                name: "资源仓库",
                sref: 'app.repository',
                sub: 'data'
            }, {
                id: 2,
                img: "images/video.png",
                name: "地图编辑",
                sref: 'app.edit',
                sub: 'info'
            }];

            return {
                list: function () {
                    return menus;
                },

                get: function (id) {
                    return menus[id];
                },

                set: function (id, menu) {
                    menus[id] = menu;
                }
            }
        })

        .factory('Http', ["$q", "$http", function ($q, $http) {
            return {
                get: function (url) {
                    var deferred = $q.defer();

                    $http.get(url).then(function (res) {
                        deferred.resolve(res);
                    }, function (err) {
                        deferred.reject(err);
                    });

                    return deferred.promise;
                },
                post: function (url, param) {
                    var deferred = $q.defer();

                    $http.post(url, param).then(function (res) {
                        deferred.resolve(res);
                    }, function (err) {
                        deferred.reject(err);
                    });

                    return deferred.promise;
                }
            }
        }])

        .factory('Auth', ['Http', function (Http) {
            var _user = {
                userId: 1,
                name: '姚志武'
            };
            return {
                login: function () {

                },
                logout: function () {

                },
                getUserInfo: function () {
                    return _user;
                }
            }
        }])

        .factory("Doc", ["Http", 'URL_CFG', function (Http, URL_CFG) {
            return {
                list: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetMapDocList';
                    return Http.post(url, param);
                },
                getTypes: function (param) {
                    var url = URL_CFG.api + "MapService.svc/GetDocNames";
                    return Http.post(url, param);
                },
                getMapMenu: function (param) {
                    var url = URL_CFG.api + "MapService.svc/GetMapMenu";
                    return Http.post(url, param);
                },
                create: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/NewMapDoc';
                    return Http.post(url, param);
                },
                open: function (param) {
                    var url = '';
                    return Http.post(url, param);
                },
                remove: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/DeleteMapDoc';
                    return Http.post(url, param);
                },
                save: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/SaveMapDoc';
                    return Http.post(url, param);
                },
                close: function (param) {
                    var url = '';
                    return Http.post(url, param);
                },
                exportMap: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/Export';
                    return Http.post(url, param);
                },
                addLayerToMap: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/AddLayerToMap';
                    return Http.post(url, param);
                },
                getMapInfo: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetMapInfo';
                    return Http.post(url, param);
                },
                removeLayerFromMap: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/RemoveLayerFromMap';
                    return Http.post(url, param);
                },
                publish: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/PublishDoc';
                    return Http.post(url, param);
                },
                setLayerVisible: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/SetLayerVisible';
                    return Http.post(url, param);
                },
                getLayerField: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetLayerField';
                    return Http.post(url, param);
                },
                getLayerUniqueFieldVal: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetLayerUniqueFieldVal';
                    return Http.post(url, param);
                },
                queryDataOnLayer: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/QueryDataOnLayer';
                    return Http.post(url, param);
                },
                getThemeLayers: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetThemeLayers';
                    return Http.post(url, param);
                },
                setLayerData: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/SetLayerData';
                    return Http.post(url, param);
                },
                getLayerFieldDistinctVal: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetLayerFieldDistinctVal';
                    return Http.post(url, param);
                },
                getMapLayerExport: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetMapLayoutExport';
                    return Http.post(url, param);
                }
            }
        }])

        .factory("Data", ["Http", 'URL_CFG', function (Http, URL_CFG) {
            return {
                getMapDataList: function (param) {
                    var url = URL_CFG.api + 'DataService.svc/GetMapDataList';
                    return Http.post(url, param);
                },
                getUserGdbInfo: function (param) {
                    var url = URL_CFG.api + 'DataService.svc/GetUserGdbInfo';
                    return Http.post(url, param);
                },
                importDataFromPublic: function (param) {
                    var url = URL_CFG.api + 'DataService.svc/ImportDataFromPublic';
                    return Http.post(url, param);
                },
                uploadData: function (param) {
                    var url = URL_CFG.api + 'DataService.svc/UploadData';
                    return Http.post(url, param);
                }
            }
        }])

        .factory("Symbol", ["Http", 'URL_CFG', function (Http, URL_CFG) {
            return {
                getStyleList: function (param) {
                    var url = URL_CFG.api + 'MapSytleService.svc/GetStyleList';
                    return Http.post(url, param);
                },
                getSymbolItemListFromDB: function (param) {
                    var url = URL_CFG.api + 'MapSytleService.svc/GetSymbolItemListFromDB';
                    return Http.post(url, param);
                },
                getSymbolPreview: function (param) {
                    var url = URL_CFG.api + 'MapSytleService.svc/GetSymbolPreview';
                    return Http.post(url, param);
                },
                getLayerSymbolInfo: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/GetLayerSymbolInfo';
                    return Http.post(url, param);
                },
                setLayerSymbolInfo: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/SetLayerSymbolInfo';
                    return Http.post(url, param);
                },
                RemoveLayerFromMap: function (param) {
                    var url = URL_CFG.api + 'MapService.svc/RemoveLayerFromMap';
                    return Http.post(url, param);
                }
            }
        }])

})(angular);
/**
 * Created by Donny on 17/4/26.
 */
(function (angular) {
    "use strict";

    var prodURL = 'https://172.30.1.246:9527/',
        devURL = 'http://192.168.250.44:9527/',
        testURL = 'http://192.168.100.105:9527/',
        Urls = {
            Prod_Cfg: {
                api: prodURL,
                img: 'http://172.30.1.246:9528/'
            },
            Dev_Cfg: {
                api: devURL,
                img: 'http://192.168.250.44:9528/'
            },
            Test_Cfg: {
                api: testURL,
                img: 'http://192.168.100.105:9528/'
            }
        };

    angular.module('export-map.config', [])

        .constant('URL_CFG', Urls.Dev_Cfg)

        .constant('APP_VERSION', {
            DEV: '1.0.0',
            RELEASE: '1.0.0'
        })

})(angular);
/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map', [
        'ui.bootstrap',
        'colorpicker.module',
        'export-map.config',
        'export-map.routers',
        'export-map.directives',
        'export-map.services',
        'export-map.controllers'
    ]);

})(angular);