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
