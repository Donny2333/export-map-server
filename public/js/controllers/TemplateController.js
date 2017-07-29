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