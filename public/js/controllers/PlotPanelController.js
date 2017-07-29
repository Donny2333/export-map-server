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