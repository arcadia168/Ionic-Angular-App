angular.module('starter.services', [])//'ionic', 'ionic.service.core', 'ionic.service.push'])

//Using a service to create  a globally accessible variable
    .factory('RunMode', [function(){

        //TO SET THE WHOLE APP TO RELEASE MODE CHANGE THIS HERE
        var debugRelease = 'release';//'debug'//'release';//'deviceDebug';

        var serverToUse = '';

        var runMode = {}; //object to be returned by the factory for use all over - this is a singleton (I think)

        if (debugRelease == 'release') {
            serverToUse = "http://nodejs-getin.rhcloud.com/api";
        } else if (debugRelease == 'deviceDebug') {
            //running the app on the device hosting server on mac
            //use the ip address of mac from router, port 8000 as usual
            var code = 'tonglofuva';
            var localTunnelUrl = 'https://' + code + '.localtunnel.me'; //THIS WILL CHANGE DYNAMICALLY, UPDATE ALWAYS
            console.log("Local tunnel url is: %s", localTunnelUrl);
            serverToUse = localTunnelUrl + "/api";
        } else { //inefficiency for the sake of ease of reading here
            serverToUse = "http://localhost:8000/api";
        }

        //Now assign the server being used to a property of the service
        runMode.server = function() {
            return serverToUse;
        };

        //return this object to quickly get which server to use
        return runMode;
    }])

    .factory('Rounds', ['$http', '$q', 'RunMode', function($http, $q, RunMode) {

        var SERVER = RunMode.server();
        console.log(SERVER);

        var rounds = [];

        return {
            all: function() {
                var deferred = $q.defer();

                //TODO: Replace the use of http with resource
                // Make a call to ye olde server
                $http.get(SERVER + '/rounds/'
                ).success(function(data){
                        rounds = data;
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                    });
                return deferred.promise;
            },
            remove: function(round) {
                rounds.splice(rounds.indexOf(round), 1);
            },
            get: function(roundId) {

                //TODO: Replace the use of http with resource

                var deferred = $q.defer();

                $http.get(SERVER + '/fixtures/' + roundId
                ).success(function(data){
                        rounds = data;
                        //debugger;
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;

            },

            //might need to take in the userid, although this may be global
            makePredictions: function(userid, round, predictions) {
                //make a call to server to send predictions away

                //prepend the predictions array with the necessary information
                predictions = "[{\"predictions\":" + JSON.stringify(predictions) + "}]";

                console.log('SENDING PREDICTIONS:' + predictions);

                //debugger;

                var deferred = $q.defer();

                //TODO: Implement getting the username from the session somehow
                //use dummy user sillybilly for now
                $http.post(SERVER + '/users/predictions/create/' + userid + '/' + round , predictions
                ).success(function(response){
                        console.log(response);
                        deferred.resolve();
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        alert("Something went wrong");
                        deferred.reject();
                    });
                return deferred.promise;
            },

            //might need to take in the userid, although this may be global
            updatePredictions: function(userid, predictions) {
                //make a call to server to send predictions away

                //prepend the predictions array with the necessary information
                predictions = JSON.stringify(predictions);

                console.log('UPDATING PREDICTIONS:' + predictions);

                //debugger;

                var deferred = $q.defer();

                $http.post(SERVER + '/users/predictions/update/' + userid, predictions
                ).success(function(response){
                        console.log(response);
                        deferred.resolve(); //TODO not sure this is necessary
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        //alert("Something went wrong");
                        deferred.reject(); //todo: implement ionic popup errors if promises get rejected.
                    });
                return deferred.promise;
            },

            getExistingPredictions: function(userid, round) {

                //make a call to the server to get the existing predictions made by a user
                //do this for a given round
                //debugger;

                var deferred = $q.defer();

                //TODO: Implement getting the username from the session somehow
                $http.get(SERVER + '/users/predictions/' + userid +  '/' + round
                ).success(function(response){
                        console.log("CURRENT USER PREDICTIONS:" + JSON.stringify(response));
                        deferred.resolve(response);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        alert("Something went wrong"); //TODO: Use an ionicPopUp for this
                        deferred.reject();
                    });
                return deferred.promise;
            }//,
            //deleteRoundPredictions: function(userid, round) {
            //
            //    //make a call to the server to get the existing predictions made by a user
            //    //debugger;
            //
            //    var deferred = $q.defer();
            //
            //    //TODO: Implement getting the username from the session somehow
            //    $http.delete(SERVER + '/users/predictions/clear/' + userid + '/' + round
            //    ).success(function(response){
            //            console.log("DELETED USER " + userid + "'S PREDICTIONS FOR ROUND " + round);
            //            deferred.resolve(response);
            //        }).error(function(){
            //            console.log("Error while making HTTP call.");
            //            alert("Something went wrong");
            //            deferred.reject();
            //        });
            //    return deferred.promise;
            //}
        }
    }])

    .factory('Leaderboard', ['$http', '$q', 'RunMode', function($http, $q, RunMode, auth) {

        //TODO: Sort out the formatting and indentation of these promise functions

        var SERVER = RunMode.server();
        console.log(SERVER);

        var userPrivateLeagues = [];
        var globalLeagueData = [];
        var roundDates = []
        var currentRound;

        return {
            overall: function(user_id, user_picture) {
                var deferred = $q.defer();

                //TODO: Replace the use of http with resource
                // Make a call to ye olde server
                $http.get(SERVER + '/leaderboard/'
                ).success(function(data){
                        //Process the data
                        //debugger;

                        globalLeagueData = data;
                        currentRound = data[data.length - 2];
                        console.log('current round is: ' + JSON.stringify(currentRound));

                        roundDates = data[data.length - 1];
                        roundDates.roundsList.unshift({roundNo: 'OVERALL SEASON'});

                        //Prepend 'Round' to each element
                        for (var i = 1; i < roundDates.roundsList.length; i++) {
                            roundDates.roundsList[i].roundNo = "Round " + roundDates.roundsList[i].roundNo;
                        }
                        debugger;

                        console.log('roundDates are: ' + JSON.stringify(roundDates));

                        data.splice(data.length -2, 2);
                        console.log('now removed currentRound from private leagues, last list item is:' + JSON.stringify(data[data.length -1]));
                        //roundDates = data[data.length - 1];
                        //console.log("The list of round dates is: " + roundDates);

                        deferred.resolve(globalLeagueData);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject(); //TODO: Remove these deferred.promise statements, not quite sure what they do.
                    });
                return deferred.promise;
            },
            all: function(user_id, user_picture) {
                var deferred = $q.defer();

                //TODO: Replace the use of http with resource
                // Make a call to ye olde server
                $http.get(SERVER + '/users/private_leagues/list/' + user_id
                ).success(function(data){
                        //debugger;

                        userPrivateLeagues = data;

                        //For each private league identify the user within that league and add details
                        //For each league will have to add data pertaining to logged in user to scope manually
                        for (var j = 0; j < userPrivateLeagues.length; j++) {
                            for (var k = 0; k < userPrivateLeagues[j].members.length; k++) {
                                if (userPrivateLeagues[j].members[k].user_id == user_id) {
                                    //then we have found the currently logged in user, add key to this object
                                    //debugger;
                                    userPrivateLeagues[j].thisUser = {
                                        //need pts, username and pick
                                        userSeasonPts: userPrivateLeagues[j].members[k].overallSeasonScore,  //todo: assign round pts
                                        userPos: k + 1,
                                        userPic: user_picture,
                                        userCurrentRoundScore: userPrivateLeagues[j].members[k].currentRoundScore
                                    };
                                    break;
                                }
                            }
                        }

                        deferred.resolve(userPrivateLeagues);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;
            },
            get: function(user_id, privateLeagueId) {
                var deferred = $q.defer();

                //TODO: Replace the use of http with resource
                $http.get(SERVER + '/users/private_leagues/get/' + user_id + '/' + privateLeagueId
                ).success(function(data){
                        console.log('\n Successfully retrieved private league info:' + JSON.stringify(data));
                        deferred.resolve(data[0]);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;
            },
            getCurrentRound: function() {
                if (currentRound) {
                    return currentRound.currentRound;
                } else {
                    console.log("ERROR: User requested current round when none was set");
                    return 'error no current round'
                }
            },
            getRoundDates: function() {
                if (roundDates) {
                    //Prepend this value to the array
                    debugger;
                    return roundDates.roundsList;
                } else {
                    console.log("ERROR: User requested round dates list when none was set");
                    return 'error no current round dates list.';
                }
            },
            createNewLeague: function(user_id, private_league_name) {

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now creating a private league with the name: " + private_league_name);


                $http.get(SERVER + '/users/private_leagues/create/' + user_id + '/' + private_league_name
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;
            },
            deleteLeague: function(user_id, private_league_id) {

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now deleting the private league: " + private_league_id);


                $http.delete(SERVER + '/users/private_leagues/delete/' + user_id + '/' + private_league_id
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;

            },
            leaveLeague: function(user_id, private_league_id) {

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now leaving the private league: " + private_league_id);


                $http.get(SERVER + '/users/private_leagues/remove/' + user_id + '/' + private_league_id + '/' + user_id
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject(); //should actually be reject
                    });
                return deferred.promise;
            },
            deleteMembers: function(user_id, members_to_delete, private_league_id) {

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                //console.log("Now removing member " + user_to_delete + " from the private league: " + private_league_id);
                members_to_delete = JSON.stringify(members_to_delete);

                $http.put(SERVER + '/users/private_leagues/remove/' + user_id + '/' + private_league_id, members_to_delete
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;

            },
            joinLeagueWithCode: function(joiningUser, privateLeagueCode) {

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now attempting to join the league with code: " + privateLeagueCode);

                //make the request to the server.
                $http.get(SERVER + '/users/private_leagues/join/' + joiningUser + '/' + privateLeagueCode
                ).success(function(data){
                        //if $http promise is fulfilled, fulfill service promise
                        deferred.resolve(data);
                    }).error(function(error){
                        console.log("Error while making HTTP call.");

                        //if an error occured, reject the promise todo: in front end use a popup to denote error
                        deferred.reject(error); //todo: go and replace all $http rejects with this.
                    });

                //return a promise
                return deferred.promise;

            },
            renameLeague: function(user_id, new_league_name, private_league_id) {

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now renaming league: " + private_league_id + " to " + new_league_name);


                $http.get(SERVER + "/users/private_leagues/rename/" + user_id + "/" + private_league_id + "/" + new_league_name
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;
            },
            changeCaptain: function(user_id, new_captain_id, private_league_id) {

                ///api/users/private_leagues/edit/captain/:user_id/:private_league_id/:new_captain_id

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now altering captain for league: " + private_league_id + " to " + new_captain_id);


                $http.get(SERVER + "/users/private_leagues/edit/captain/" + user_id + "/" + private_league_id + "/" + new_captain_id
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;
            },
            changeViceCaptain: function(user_id, new_vice_captain_id, private_league_id) {

                ///api/users/private_leagues/edit/captain/:user_id/:private_league_id/:new_captain_id

                var deferred = $q.defer();

                //TODO: Replace the use of http with resource

                //sends the user_id of the invited user and the league to which they have been invited
                console.log("Now altering captain for league: " + private_league_id + " to " + new_vice_captain_id);


                $http.get(SERVER + "/users/private_leagues/edit/captain/" + user_id + "/" + private_league_id + "/" + new_captain_id
                ).success(function(data){
                        deferred.resolve(data);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });

                return deferred.promise;
            }
        }
    }])

    .factory('LeagueTable', ['$http', '$q', 'RunMode', function($http, $q, RunMode) {

        var SERVER = RunMode.server();
        console.log(SERVER);

        return {
            all: function() {
                var deferred = $q.defer();

                debugger;

                //Retrieve the English Premiere League standings
                $http.get(SERVER + '/standings').success(
                    function(data) {
                        deferred.resolve(data);
                    }).error(
                    function(){
                        console.log("Error while making HTTP call.");
                        deferred.reject();
                    });
                return deferred.promise;
            }
        }
    }])

    .factory('User', ['$http', '$q', 'RunMode', function($http, $q, RunMode){

        var SERVER = RunMode.server();

        //store the current users data in this service so it is globally accessible
        //return this object once retrieved
        var currentUserData = {};
        var showTutorials = true;
        var firstTimeSignIn = false;
        var tutorialSeenCount = 0;

        return {
            sync: function(user) {

                //prepend the predictions array with the necessary information
                console.log('CHECKING SERVER FOR USER:' + user.nickname);

                //need to convert the user object into a JSON string
                user = JSON.stringify(user);

                var deferred = $q.defer();

                //use dummy user sillybilly for now
                $http.post(SERVER + '/users/sync/', user
                ).success(function(response){
                        console.log(response);
                        deferred.resolve(response); //TODO not sure this is necessary
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        alert("Something went wrong"); //TODO change this to be an ionic popup
                        deferred.reject();
                    });
                return deferred.promise;
            },
            getUserData: function(user_id) {

                //get the data for a particular user from the server

                var deferred = $q.defer();

                $http.get(SERVER + '/users/' + user_id
                ).success(function(response){
                        //console.log("function getUserData in the User service successfully synced data:");
                        //console.log(response); //should be the newly loggied in user, not the old!
                        ////assign the returned user data to the factory
                        currentUserData = response[0];
                        //console.log("The app has now updated the stored user data: " + JSON.stringify(currentUserData));
                        deferred.resolve(response);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        alert("Something went wrong"); //TODO: Replace this with an ionic popup
                        deferred.reject();
                    });
                return deferred.promise;
            },
            currentUser: function() {
                //simply return the user data of the user who is currently logged in
                return currentUserData;
            },
            clearCurrentUser: function() {
                //for use when logging out
                currentUserData = {};
                return "Stored user data cleared.";
                //to avoid having old user data after logging out and back in again
            },
            showTutorials: function() {
                showTutorials = true;
            },
            hideTutorials: function() {
                showTutorials = false;
            },
            setFirstTimeSignIn: function(){
                firstTimeSignIn = true;
            },
            firstTimeSignIn: function() {
                return firstTimeSignIn;
            },
            incrementTutorialSeenCount: function() {
                tutorialSeenCount++;
            },
            tutorialSeenCount: function(){
                return tutorialSeenCount;
            },
            tutorialsActiveCheck: function() {
                return showTutorials;
            },
            updateTeam: function(user_id, new_team) {

                //get the data for a particular user from the server

                var deferred = $q.defer();

                $http.get(SERVER + '/users/team/' + user_id + '/' + new_team
                ).success(function(response){
                        console.log(response); //should be the newly loggied in user, not the old!
                        //assign the returned user data to the factory
                        //currentUserData = response[0];
                        //console.log("The app has now updated the stored user data: " + JSON.stringify(currentUserData));
                        deferred.resolve(response);
                    }).error(function(){
                        console.log("Error while making HTTP call.");
                        alert("Something went wrong"); //TODO: Replace this with an ionic popup
                        deferred.reject();
                    });
                return deferred.promise;

            },
            filterTeam: function(team) {
                if (team.indexOf("United" > -1)) {
                    team = team.replace('United', 'Utd');
                    team = team.trim();
                }

                if (team.indexOf("Manchester" > -1)) {
                    team = team.replace('Manchester', 'Man');
                    team = team.trim();
                }

                if (team.indexOf("Albion" > -1)) {
                    team = team.replace('Albion', '');
                    team = team.trim();
                }

                if (team.indexOf("wich" > -1) && (team.indexOf('Norwich') == -1)) {
                    team = team.replace('wich', '');
                    team = team.trim();
                }

                if (team.indexOf("Hotspur" > -1)) {
                    team = team.replace('Hotspur', '');
                    team = team.trim();
                }

                if (team.indexOf("Queens Park Rangers" > -1)) {
                    team = team.replace('Queens Park Rangers', 'QPR');
                    team = team.trim();
                }

                if (team.indexOf("AFC" > -1)) {
                    team = team.replace("AFC", " ");
                    team = team.trim();
                }

                return team;
            }
        }
    }])

    .factory('SaveChanges', [function (){
        var saveChangesNeeded = false;

        //need to return an object to call objects on
        var saveChanges = {};

        //add functions
        saveChanges.saveChangesNeeded = function() {
            saveChangesNeeded = true;
        };

        saveChanges.saveChangesNotNeeded = function() {
            saveChangesNeeded = false;
        };

        //give access to the property
        saveChanges.check = function () {
            return saveChangesNeeded;
        };

        //saveChanges.makeUnsavedChanges = function () {
        //
        //    //ask if they are sure they want to go back if there are unsaved changes that would be lost
        //
        //    if (saveChanges.check()) {
        //        var confirmPopup = $ionicPopup.confirm({
        //            title: 'Unsaved Changes',
        //            template: 'Any unsaved changes to predictions will be lost'
        //        });
        //        confirmPopup.then(function (res) {
        //            if (res) {
        //                console.log('You are sure');
        //                //then go on back!
        //                //set save changes to false
        //                SaveChanges.saveChangesNotNeeded();
        //                $ionicHistory.goBack();
        //            } else {
        //                console.log('You are not sure');
        //                //stay in this view
        //            }
        //        });
        //    } else {
        //        //just go back
        //        $ionicHistory.goBack();
        //    }
        //};

        //return object to provide access to methods.
        return saveChanges;

    }]);

//.factory('_', [function () {
//    return $window._; // assumes underscore has already been loaded on the page
//}]);

//.factory('Teams', ['_', function (_) {
//
//}]);
