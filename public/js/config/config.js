/**
 * Created by Donny on 17/4/26.
 */
(function (angular) {
    "use strict";

    var prodURL = 'https://172.30.1.246:9527/',
        devURL = 'http://192.168.250.44:9527/',
        testURL = 'http://192.168.100.105:9527/',
        Urls = {
            Prod_Cfg: {
                api: prodURL,
                img: 'http://172.30.1.246:9528/'
            },
            Dev_Cfg: {
                api: devURL,
                img: 'http://192.168.250.44:9528/'
            },
            Test_Cfg: {
                api: testURL,
                img: 'http://192.168.100.105:9528/'
            }
        };

    angular.module('export-map.config', [])

        .constant('URL_CFG', Urls.Dev_Cfg)

        .constant('APP_VERSION', {
            DEV: '1.0.0',
            RELEASE: '1.0.0'
        })

})(angular);