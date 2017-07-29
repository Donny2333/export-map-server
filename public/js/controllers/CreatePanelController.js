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