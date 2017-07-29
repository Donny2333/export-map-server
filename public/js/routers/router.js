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