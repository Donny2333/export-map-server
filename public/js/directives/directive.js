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