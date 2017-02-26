// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.s' is found in controllers.js
var appVersion = "1.0";
var app = angular.module('starter', ['ionic', 'ngCordova', 'ionic.service.core', 'ionic.service.push', 'ionic.service.deploy',
    'ionic.service.analytics', 'starter.controllers', 'starter.services', 'auth0', 'angular-storage', 'angular-jwt', 'ionic.contrib.ui.tinderCards']);

app.constant('$ionicLoadingConfig', {
    template: '<ion-spinner></ion-spinner> Loading...'
});

app.config(function ($stateProvider, $urlRouterProvider, authProvider, $httpProvider, jwtInterceptorProvider,
                     $ionicConfigProvider, $compileProvider, $ionicAppProvider) {

    // Identify app
    $ionicAppProvider.identify({
        // The App ID for the server
        app_id: '17ad87a3',
        // The public API key all services will use for this app
        api_key: 'f8917dfff3085d16c84a347669fff2e0750bbd0d34431531',
        // Your GCM sender ID/project number (Uncomment if using GCM)
        gcm_id: '299929618833'
        // If true, will attempt to send development pushes
        //dev_push: true
    });

    $ionicConfigProvider.tabs.position('bottom');
    $ionicConfigProvider.backButton.text('').previousTitleText(false);
    $ionicConfigProvider.views.transition('android');
    $ionicConfigProvider.views.maxCache(1000);
    //$ionicConfigProvider.views.forwardCache(true);
    $ionicConfigProvider.platform.android.navBar.alignTitle('centre');

    //Attempting to configure the use of Auth0
    authProvider.init({
        domain: 'yesgetin.eu.auth0.com',
        clientID: 'Ny44FwyaGBQvKOV9FxIRDX6JvogUm80j',
        loginUrl: 'login'
    });

    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(http|https|file|blob|cdvfile|content):|data:image\//);

    $httpProvider.interceptors.push(function ($rootScope) {
        return {
            request: function (config) {
                //check flag in service, if active don't show loader
                ////debugger;;
                //unless a request to our server, don't show it
                if (config.url.indexOf("http://nodejs-getin.rhcloud.com/api") > -1) {
                    console.log("Showing load for url: " + config.url);
                    $rootScope.$broadcast('loading:show');
                }
                return config
            },
            response: function (response) {
                $rootScope.$broadcast('loading:hide');
                return response
            }
        }
    });

    //add the auth0 jwt http interceptor
    //debugger;;
    var refreshingToken = null;
    jwtInterceptorProvider.tokenGetter = function (auth, store, $http, jwtHelper) {
        //notify app that chekcing for refresh token, don't show loader;
        //todo: this is seriously broken!!! use site to fix and try to get working with refresh token, use ionic deploy to deploy
        //debugger;;
        //tokenRefreshCheck.activateCheckingToken();

        var token = store.get('token');
        console.log("The regular token is: " + token);
        var refreshToken = store.get('refreshToken');
        console.log("The refresh token is: " + refreshToken);
        if (token) {
            if (!jwtHelper.isTokenExpired(token)) {
                //tokenRefreshCheck.deactivateCheckingToken();
                return store.get('token');
            } else {
                console.log("Attempting to get a refresh token");
                if (refreshingToken === null) {
                    refreshingToken = auth.refreshIdToken(refreshToken).then(function (idToken) {
                        store.set('token', idToken);
                        return idToken;
                    }).finally(function () {
                        refreshingToken = null;
                    });
                }
                ////debugger;;
                //tokenRefreshCheck.deactivateCheckingToken();
                return refreshingToken;
            }
        }
    };

    $httpProvider.interceptors.push('jwtInterceptor');

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
        .state('signup', {
            url: '/signup',
            templateUrl: 'templates/signup.html',
            controller: 'SignUpCtrl'
        })

        .state('newsignup', {
            url: '/newsignup',
            templateUrl: 'templates/newsignup.html',
            controller: 'newSignUpCtrl'
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
            cache: false,
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
        .state('tab.round-cards', {
            url: '/rounds/cards/:roundId',
            views: {
                'tab-rounds': {
                    templateUrl: 'templates/round-cards.html',
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
        .state('tab.rulebook', {
            url: '/rulebook',
            views: {
                'tab-rulebook': {
                    templateUrl: 'templates/tab-rulebook.html',
                    abstract: true
                }
            }
        })
        .state('tab.rulebook.summary', {
            url: "/summary",
            views: {
                'rulebook-summary': {
                    templateUrl: "templates/rulebook-summary.html"
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
        .state('tab.rulebook.lose', {
            url: "/lose",
            views: {
                'rulebook-lose': {
                    templateUrl: "templates/rulebook-lose.html"
                }
            }
        })
        .state('tab.rulebook.trade', {
            url: "/trade",
            views: {
                'rulebook-trade': {
                    templateUrl: "templates/rulebook-trade.html",
                    controller: 'RulebookCtrl'
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
                    controller: 'SettingsCtrl'
                }
            }
        })
        .state('tab.settings-privacy', {
            url: '/settings/privacy',
            views: {
                'tab-settings': {
                    templateUrl: 'templates/settings-privacy.html'
                }
            }
        })
        .state('tab.settings-cookies', {
            url: '/settings/cookies',
            views: {
                'tab-settings': {
                    templateUrl: 'templates/settings-cookies.html'
                }
            }
        })
        .state('tab.settings-tcs', {
            url: '/settings/tcs',
            views: {
                'tab-settings': {
                    templateUrl: 'templates/settings-tcs.html'
                }
            }
        });

// if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/signup');

});

app.run(function ($ionicPlatform, $rootScope, $ionicLoading, auth, User, store, jwtHelper, $location, $ionicAnalytics, $ionicPopup) {

    //Check for an internet connection
    if (window.Connection) {
        if (navigator.connection.type == Connection.NONE) {
            $ionicPopup.confirm({
                title: "No internet connection",
                content: "To experience full functionality, please connect to the internet!"
            })
                .then(function (result) {
                    if (!result) {
                        ionic.Platform.exitApp();
                    }
                });
        }
    }

    //Register for app analytics
    $ionicAnalytics.register();

    // This hooks all auth events to check everything as soon as the app starts
    auth.hookEvents();

    $rootScope.$on('loading:show', function () {
        $ionicLoading.show();
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
        cordova.getAppVersion(function (version) {
            appVersion = version;
        });

        document.addEventListener("offline", function () {
            alert("Your internet connecion seems to have dropped. Please reconnect to get full functionality");
        }, false);
        //document.addEventListener("online",function() {
        //alert("Yes! Get In! You're back online.");
        //},false);
        //ionic.Platform.fullscreen();
    });

    // Disable BACK button on home
    $ionicPlatform.registerBackButtonAction(function () {
        if ($state.current.name == "tab.rounds") {
            navigator.app.exitApp();
        }
        else {
            navigator.app.backHistory();
        }
    }, 100);

    // This events gets triggered on refresh or URL change
    var refreshingToken = null;
    $rootScope.$on('$locationChangeStart', function () {
        //stop loading screen from showing
        //debugger;;
        console.log("$locationChangeStart event triggered. ");
        //tokenRefreshCheck.activateCheckingToken();
        var token = store.get('token');
        console.log("Regular token: " + token);
        //console.log(token);
        var refreshToken = store.get('refreshToken');
        console.log("Refresh token: " + token);
        if (token) {
            if (!jwtHelper.isTokenExpired(token)) {
                console.log("Token expired, getting new token.");
                if (!auth.isAuthenticated) {
                    console.log("User not authenticated, authenticating.");
                    auth.authenticate(store.get('profile'), token);
                    //tokenRefreshCheck.deactivateCheckingToken();
                }
            } else {
                console.log("Token is not expired, checking the refresh token.");
                if (refreshToken) {
                    console.log("There is a refresh token.");
                    if (refreshingToken === null) {
                        console.log("Getting a new refresh token from auth service.");
                        refreshingToken = auth.refreshIdToken(refreshToken).then(function (idToken) {
                            console.log("Set the new tokens");
                            store.set('token', idToken);
                            auth.authenticate(store.get('profile'), idToken);
                        }).finally(function () {
                            console.log("Reset the temporary refreshing token variable");
                            refreshingToken = null;
                        });
                    }
                    //tokenRefreshCheck.deactivateCheckingToken();
                    return refreshingToken;
                } else {
                    console.log("There is no refresh token available, so asking user to log in again.");
                    //tokenRefreshCheck.deactivateCheckingToken();
                    $location.path('/login');
                }
            }
        }
    });

    //debugger;;
    //should be triggered after registered with push notification server
    $rootScope.$on('$cordovaPush:tokenReceived', function (event, data) {
        console.log('Got token', data.token, data.platform);

        //call backend token to register device token with user
        //debugger;;
        User.registerDeviceToken(auth.profile.user_id, data.token).then(function () {
            console.log("New device token was registered successfully registered against the user");
        });
    });
});

app.controller('LoginCtrl', function ($scope, $location, store, auth, $state, $ionicPopup, $ionicLoading, User, $ionicUser, $ionicPush) {

    auth.signin(
        {
            //THIS IS WHERE TO CONFIGURE THE AUTH0 OPTIONS SUCH AS CLOSABLE ETC...
            closable: false,
            popup: true,
            // Make the widget non closeable
            standalone: true,
            authParams: {
                scope: 'openid offline_access',
                device: 'Mobile device',
                // This is a must for mobile projects
                popup: true,
                // Make the widget non closeable
                standalone: true,
            }

        }, function (profile, idToken, access_token, state, refreshToken) {

            //debugger;;
            console.log('Profile is: ' + profile);
            //////debugger;;
            console.log('idToken is: ' + idToken);
            //////debugger;;
            console.log('refreshToken is: ' + refreshToken);

            // Success callback
            store.set('profile', profile);
            store.set('token', idToken);
            store.set('refreshToken', refreshToken);
            $location.path('/');

            console.log('registering push');

            // Login was successful
            User.sync(auth.profile).then(function (response) {
                //hide the loader

                $ionicPush.register({
                        canShowAlert: true, // Should new pushes show an alert on your
                        // screen?
                        canSetBadge: true, // Should new pushes be allowed to update app icon
                        // badges?
                        canPlaySound: true, // Should notifications be allowed to play a
                        // sound?
                        canRunActionsOnWake: true, // Whether to run auto actions outside the
                        // app,
                        onNotification: function (notification) {
                            console.log('notification received: ' + JSON.stringify(notification));
                        }
                    },
                    {
                        user_id: auth.profile.user_id,
                        name: auth.profile.nickname
                    }
                ).then(
                    function () {
                        console.log('registration successful');
                    },
                    function (err) {
                        console.log('registration failed');
                        console.log(err);
                    }
                );

                //Once the user data has been synced, get the user data object from our server also
                //Have to do in this callback otherwise we attempt to get the user data before the sync has finished
                //Check to see if the user is a new user, if so set service variable appropriately
                console.log("Response from the userSync method on the server is: " + response);

                //User.hideTutorials();

                if (response == 201) {
                    //then mark this user as being new and show them the tutorials
                    console.log("This user is a new user, activating tutorials.");
                    User.showTutorials();
                    User.setFirstTimeSignIn();
                } else if (response == 202) {
                    console.log("This is an existing user, so not showing any tutorials");
                    User.hideTutorials();
                }

                User.getUserData(auth.profile.user_id).then(
                    function () {
                        //Testing the user global service
                        //var currentUser = User.currentUser();
                        //console.log("The current user data stored on our server is: " + JSON.stringify(currentUser));

                        $state.go('tab.rounds');
                    }
                );
            });

        }, function (error) {
            // Oops something went wrong during login:
            console.log("There was an error logging in:" + JSON.stringify(error));
        });
});
