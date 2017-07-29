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