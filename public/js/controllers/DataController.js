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