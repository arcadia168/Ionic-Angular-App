// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'ngCordova', 'ionic.service.core', 'ionic.service.push',
    'starter.controllers', 'starter.services', 'auth0', 'angular-storage', 'angular-jwt', 'ionic.contrib.ui.tinderCards'])

    .directive('noScroll', function() {
        return {
            restrict: 'A',
            link: function($scope, $element, $attr) {
                $element.on('touchmove', function(e) {
                    e.preventDefault();
                });
            }
        }
    })

    .config(function ($stateProvider, $urlRouterProvider, authProvider, $httpProvider, jwtInterceptorProvider,
                      $ionicConfigProvider, $compileProvider, $ionicAppProvider) {

        // Identify app
        $ionicAppProvider.identify({
            // The App ID for the server
            app_id: '17ad87a3',
            // The API key all services will use for this app
            api_key: '339c90fec399deb8b6ffc7c7c0e642544bee4c4c4e49faa3',
            // Your GCM sender ID/project number (Uncomment if using GCM)
            gcm_id: '299929618833',
            // If true, will attempt to send development pushes
            dev_push: true
        });

        $ionicConfigProvider.tabs.position('bottom');

        //$compileProvider.imgSrcSanitizationWhitelist('img/');

        //$compileProvider.imgSrcSanitizationWhitelist(/^\s(https|file|blob|cdvfile):|data:image\//);

        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(http|https|file|blob|cdvfile|content):|data:image\//);

        $httpProvider.interceptors.push(function ($rootScope) {
            return {
                request: function (config) {
                    $rootScope.$broadcast('loading:show');
                    return config
                },
                response: function (response) {
                    $rootScope.$broadcast('loading:hide');
                    return response
                }
            }
        });

        //add the auth0 jwt http interceptor
        jwtInterceptorProvider.tokenGetter = function (store, jwtHelper, auth) {
            var idToken = store.get('token');
            var refreshToken = store.get('refreshToken');
            // If no token return null
            if (!idToken || !refreshToken) {
                return null;
            }
            // If token is expired, get a new one
            if (jwtHelper.isTokenExpired(idToken)) {
                return auth.refreshIdToken(refreshToken).then(function (idToken) {
                    store.set('token', idToken);
                    return idToken;
                });
            } else {
                return idToken;
            }
        };

        $httpProvider.interceptors.push('jwtInterceptor');

        //$httpProvider.interceptors.push('authInterceptor');


        // Ionic uses AngularUI Router which uses the concept of states
        // Learn more here: https://github.com/angular-ui/ui-router
        // Set up the various states which the app can be in.
        // Each state's controller can be found in controllers.js
        $stateProvider

            //Set up the state which displays the login
            // This is the state where you'll show the login
            .state('login', {
                url: '/login',
                templateUrl: 'templates/login.html',
                controller: 'LoginCtrl'
            })

            // setup an abstract state for the tabs directive
            .state('tab', {
                url: "/tab",
                abstract: true,
                templateUrl: "templates/tabs.html",
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })

            .state('tab.rounds', {
                url: '/rounds',
                views: {
                    'tab-rounds': {
                        templateUrl: 'templates/tab-rounds.html',
                        controller: 'RoundsCtrl'
                    }
                },
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })
            .state('tab.round-detail', {
                url: '/rounds/:roundId',
                views: {
                    'tab-rounds': {
                        templateUrl: 'templates/round-detail.html',
                        controller: 'RoundDetailCtrl'
                    }
                },
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })
            .state('tab.leaguetable', {
                url: '/leaguetable',
                views: {
                    'tab-leaguetable': {
                        templateUrl: 'templates/tab-leaguetable.html',
                        controller: 'LeagueTableCtrl'
                    }
                },
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })
            .state('tab.rulebook',{
                url: '/rulebook',
                views: {
                    'tab-rulebook': {
                        templateUrl: 'templates/tab-rulebook.html',
                        abstract:   true
                    }
                }
            })
            .state('tab.rulebook.summary',{
                url: "/summary",
                views: {
                    'rulebook-summary': {
                        templateUrl: "templates/rulebook-summary.html",
                        controller: 'RulebookCtrl'
                    }
                }
            })
            .state('tab.rulebook.win', {
                url: "/win",
                views: {
                    'rulebook-win': {
                        templateUrl: "templates/rulebook-win.html"
                    }
                }
            })
            .state('tab.rulebook.lose',{
                url: "/lose",
                views: {
                    'rulebook-lose': {
                        templateUrl: "templates/rulebook-lose.html"
                    }
                }
            })
            .state('tab.rulebook.trade',{
                url: "/trade",
                views: {
                    'rulebook-trade': {
                        templateUrl: "templates/rulebook-trade.html"
                    }
                }
            })
            .state('tab.leaderboard', {
                url: '/leaderboard',
                views: {
                    'tab-leaderboard': {
                        templateUrl: 'templates/tab-leaderboard.html',
                        controller: 'LeaderboardCtrl'
                    }
                },
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })
            .state('tab.leaderboard-detail', {
                url: '/leaderboard/:privateLeagueId',
                views: {
                    'tab-leaderboard': {
                        templateUrl: 'templates/leaderboard-league-detail.html',
                        controller: 'LeaderboardLeagueDetailCtrl'
                    }
                },
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })
            .state('tab.settings', {
                url: '/settings',
                views: {
                    'tab-settings': {
                        templateUrl: 'templates/tab-settings.html',
                        controller: 'SettingsCtrl'
                    }
                },
                data: {
                    // This tells Auth0 that this state requires the user to be logged in.
                    // If the user isn't logged in and he tries to access this state
                    // he'll be redirected to the login page
                    requiresLogin: true
                }
            })
            .state('tab.settings-team', {
                url: '/settings/team',
                views: {
                    'tab-settings': {
                        templateUrl: 'templates/settings-team.html',
                        controller: 'SettingsCtrl'
                    }
                }
            })
            .state('tab.settings-about', {
                url: '/settings/about',
                views: {
                    'tab-settings': {
                        templateUrl: 'templates/settings-about.html',
                    }
                }
            })
            .state('tab.settings-privacy', {
                url: '/settings/privacy',
                views: {
                    'tab-settings': {
                        templateUrl: 'templates/settings-privacy.html',
                    }
                }
            })
            .state('tab.settings-cookies', {
                url: '/settings/cookies',
                views: {
                    'tab-settings': {
                        templateUrl: 'templates/settings-cookies.html',
                    }
                }
            })
            .state('tab.settings-tcs', {
                url: '/settings/tcs',
                views: {
                    'tab-settings': {
                        templateUrl: 'templates/settings-tcs.html',
                    }
                }
            });

// if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/login');

//Attempting to configure the use of Auth0
        authProvider.init({
            domain: 'yesgetin.eu.auth0.com',
            clientID: 'Ny44FwyaGBQvKOV9FxIRDX6JvogUm80j',
            loginState: 'login'
        });

    })

    .run(function ($ionicPlatform, $rootScope, $ionicLoading, auth, store, jwtHelper, $location, $ionicUser, $ionicPush) {

        // This hooks all auth events to check everything as soon as the app starts
        auth.hookEvents();

        $rootScope.$on('loading:show', function () {
            debugger;
            $ionicLoading.show(
                {
                    noBackdrop: true,
                    templateUrl: '/templates/loader.html'
                }
            );
        });

        $rootScope.$on('loading:hide', function () {
            $ionicLoading.hide()
        });

        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });

        // This events gets triggered on refresh or URL change
        $rootScope.$on('$locationChangeStart', function () {
            if (!auth.isAuthenticated) {
                var token = store.get('token');
                if (token) {
                    if (!jwtHelper.isTokenExpired(token)) {
                        auth.authenticate(store.get('profile'), token);
                    } else {
                        // Either show Login page or use the refresh token to get a new idToken
                        $location.path('/');
                    }
                }
            }
        });

        $rootScope.$on('$cordovaPush:tokenReceived', function(event, data) {
            console.log('Got token', data.token, data.platform);
            // Do something with the token
            //alert('THE DEVICE TOKEN FOR YOUR DEVICE IS: ' + JSON.stringify(data.token));
            //console.log('THE DEVICE TOKEN FOR YOUR DEVICE IS: ' + JSON.stringify(data.token));
        });

    });