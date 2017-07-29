/**
 * Created by Donny on 17/3/22.
 */
(function (angular) {
    'use strict';

    angular.module('export-map', [
        'ui.bootstrap',
        'colorpicker.module',
        'export-map.config',
        'export-map.routers',
        'export-map.directives',
        'export-map.services',
        'export-map.controllers'
    ]);

})(angular);