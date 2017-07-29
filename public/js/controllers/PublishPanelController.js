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