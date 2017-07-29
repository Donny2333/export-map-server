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