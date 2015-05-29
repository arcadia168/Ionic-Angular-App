angular.module('starter.controllers', [])

    .controller('LoginCtrl', function ($scope, auth, $state, $ionicPopup, User) {

        auth.signin({

            //THIS IS WHERE TO CONFIGURE THE AUTH0 OPTIONS SUCH AS CLOSABLE ETC...

            // This is a must for mobile projects
            popup: true,
            // Make the widget non closeable
            standalone: true,
            closable: false,
            // This asks for the refresh token
            // So that the user never has to log in again
            offline_mode: true,
            device: 'Phone'
        }, function () {
            // Login was successful

            //TODO: TEST THIS BY CREATING A NEW USER AND SEEING IF USER DATA GETS LOGGED
            //check to see if this user exists on the server already, if not, create this user using auth0 details
            User.sync(auth.profile).then(function () {
                //Once the user data has been synced, get the user data object from our server also
                //Have to do in this callback otherwise we attempt to get the user data before the sync has finished
                User.getUserData(auth.profile.user_id);

                //Testing the user global service
                var currentUser = User.currentUser();
                console.log("The current user data stored on our server is: " + JSON.stringify(currentUser));

                $state.go('tab.rounds');

                //show an alert for testing purposes
                $ionicPopup.alert({
                    title: 'Login successful!',
                    template: 'Welcome ' + auth.profile.nickname + '! <br> This version of the app is mainly used for testing the backend <br> (So be nice)'
                }).then(function (res) {
                    console.log(auth.profile);
                });
            });

        }, function (error) {
            // Oops something went wrong during login:
            console.log("There was an error logging in", JSON.stringify(error));
        });

    })

    .controller('LeagueTableCtrl', function ($scope, LeagueTable) {

        //First retrieve all of the league table data and add it to the scope
        LeagueTable.all().then(function (data) {
            debugger;
            $scope.standings = data.teams; //we only want the actual standings data

            //Go through and replace 'United' with 'Utd' and 'Manchester' with 'Man'
            //maybe make reusable
            angular.forEach($scope.standings, function (standing, key) {
                if (standing.stand_team_name.indexOf("United" > -1)) {
                    console.log("Standing with \'United\' in team name has been altered");
                    standing.stand_team_name = standing.stand_team_name.replace('United', 'Utd');
                }

                if (standing.stand_team_name.indexOf("Manchester" > -1)) {
                    console.log("Standing with \'Manchester\' in team name has been altered");
                    standing.stand_team_name = standing.stand_team_name.replace('Manchester', 'Man');
                }
            });
        });
    })

    .controller('RoundsCtrl', function ($scope, $ionicLoading, Rounds) {

        //only publicly accessible elements get added to the scope

        Rounds.all().then(function (data) {
            //debugger;
            $scope.rounds = data.rounds;
        });

        //debugger
        $scope.remove = function (round) {
            Rounds.remove(round);
        };

    })

    .controller('SaveCtrl', function ($scope, $ionicPopup, $ionicHistory, SaveChanges) {
        //function to check that user is ready to leave without saving changes
        $scope.makeUnsavedChanges = function () {

            //ask if they are sure they want to go back if there are unsaved changes that would be lost
            debugger;

            if (SaveChanges.check()) {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Unsaved Changes',
                    template: 'Any unsaved changes to predictions will be lost'
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        console.log('You are sure');
                        //then go on back!
                        //set save changes to false
                        SaveChanges.saveChangesNotNeeded();
                        $ionicHistory.goBack();
                    } else {
                        console.log('You are not sure');
                        //stay in this view
                    }
                });
            } else {
                //just go back
                $ionicHistory.goBack();
            }
        };
    })

    .controller('RoundDetailCtrl', function ($scope, $ionicPopup, $q, $stateParams, $timeout, $ionicActionSheet, Rounds, SaveChanges, auth, TDCardDelegate) {

        var _predictions = [];
        var updatePredictions = false; //flag to update predictions if some already exist.
        var user = auth.profile.user_id; //get the universally unique user_id
        var predictionMap = {
            0: 'NONE',
            1: 'HOME WIN',
            2: 'AWAY WIN',
            3: 'DRAW'
        };

        //create variables to tell the delete and clear buttons whether or not they should be enabled
        $scope.deleteDisabled = false;
        $scope.clearDisable = false;

        //set the need for changes to be saved to be false by default
        SaveChanges.saveChangesNotNeeded();

        //Get the data for this particular round from the server
        Rounds.get($stateParams.roundId).then(function (data) {

            //when first loading the page, clear out any local existing predictions.
            _predictions = [];

            //$ionicLoading.hide();
            $scope.fixtures = data;

            //clone into a separate array to use for the cards
            $scope.listFixtures = angular.copy(data);

            //every time a new set of fixtures is loaded, clear predictions
            _getExistingPredictions();

        });

        function _getExistingPredictions() {

            debugger;

            //go and get all of the predictions for the user
            Rounds.getExistingPredictions(user, $stateParams.roundId).then(function (data) {
                //clear existing predictions
                _predictions = [];

                debugger;

                $scope.existingPredictions = data;
                $scope.predictionsOnServer = data;

                var currentFixturePrediction = null;

                if ($scope.existingPredictions.length) {

                    //if the user has already made predictions on this round, then just show list view
                    $scope.cardView = false;

                    //as there are some predictions, enable the delete and clear buttons
                    $scope.deleteDisabled = false;
                    $scope.clearDisabled = false;

                    //now loop over fixtures and add in these predictions!
                    //todo: this is a bug, need to match predictions to fixtures using the fixture ids
                    //will need to use a nested loop

                    debugger;
                    console.log("Now matching existing predictions to thier corresponding fixtures.");

                    //outer loop - go over all of the listFixtures - iterate through the list of fixtures
                    for (var i = 0; i < $scope.listFixtures.length; i++) {

                        //for each fixture, iterate over all predictions and find matching one.
                        for (var j = 0; j < $scope.existingPredictions.length; j++) {

                            //find the corresponding fixture for the existing prediction
                            var currentExistingPrediction = $scope.existingPredictions[j].fixture

                            if (currentExistingPrediction == $scope.listFixtures[i]._id) {
                                currentFixturePrediction = predictionMap[$scope.existingPredictions[j].prediction];
                                $scope.listFixtures[i].prediction = currentFixturePrediction;
                            }
                        }
                    }

                    updatePredictions = true; //only set this if there are existing predictions!
                } else {
                    /*if there are no existing predictions on the server for this round for this user*/

                    //Then determing the first card details globally for the skip function
                    debugger;
                    $scope.currentCardFixture = $scope.fixtures[$scope.fixtures.length - 1];
                    console.log("The fixture for the first card is: " + JSON.stringify($scope.currentCardFixture));

                    $scope.currentCardIndex = $scope.fixtures.length - 1;
                    console.log("To begin with, the current card index is: " + $scope.currentCardIndex);

                    $scope.deleteDisabled = true;
                    $scope.clearDisabled = true;
                }

                for (var k = 0; k < $scope.existingPredictions.length; k++) {
                    _predictions.push({
                        fixture: $scope.existingPredictions[k].fixture,
                        prediction: $scope.existingPredictions[k].prediction
                    });
                }

            });
        }

        function _predictionExists(fixture) {

            var found = -1;

            for (var i = 0; i < _predictions.length; i++) {
                if (fixture == _predictions[i].fixture) {
                    //then the fixture has had a prediction made for it
                    found = i;
                    break; //breaks out of the inner loop
                }
            }

            return found;
        }

        function _addFixturePrediction(fixture, prediction) {

            //mark changes as requiring saving
            SaveChanges.saveChangesNeeded();

            //enable the clear button now that a prediction has been made
            if ($scope.clearDisabled) {
                $scope.clearDisabled = false;
            }

            //find out if the current fixture has a prediction and if so, the position in the list
            var existingPredictionPosition = _predictionExists(fixture);

            if (existingPredictionPosition != -1) {
                //then update this current fixture using the position in the predictions array

                //check to see if the prediction will actually be changed, if not, do nothing

                _predictions[existingPredictionPosition] = {fixture: fixture, prediction: prediction};
            } else { //else if a prediction for this fixture does not already exist...
                if (prediction != 0) { //don't add none predictions to the list
                    _predictions.push({fixture: fixture, prediction: prediction});
                }
            }

            //Now update the prediction within the fixtures array
            //Will have to find the correct prediction first, for loop
            for (var i = 0; i < $scope.listFixtures.length; i++) {
                //if matching fixture update the prediction
                if ($scope.listFixtures[i]._id == fixture) {
                    //then appropriately update the prediction
                    $scope.listFixtures[i].prediction = predictionMap[prediction];

                    if ($scope.cardView) {
                        $scope.fixtures[i].prediction = predictionMap[prediction];
                    }

                    break; //exit the loop
                }
            }
        }

        function _cardViewDoneCheck() {
            //if there are no elements left in the cards array, show list
            if ($scope.fixtures.length == 0) {
                console.log("Cards view is being replaced by list, list length is 0");

                //Get fixtures again
                $scope.cardView = false;
            }
        }

//clear out a single prediction at a time
        $scope.deleteSinglePrediction = function (fixture) {

            debugger;
            if (fixture.prediction && fixture.prediction != 'NONE') {
                //Warn the user about the loss of 2 points for completely withdrawing a fixture prediction
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Confirm Delete',
                    template: 'Are you sure you want to delete the prediction for this fixture? \n You\'ll lose 2 points!'
                });

                confirmPopup.then(function (res) {

                    if (res) {

                        debugger;

                        //delete the prediction from the private array
                        //find prediction for this fixture
                        for (var i = 0; i < _predictions.length; i++) {
                            if (fixture._id == _predictions[i].fixture) {
                                //set this prediction to be 0 - denoting no prediction
                                _predictions[i].prediction = 0;
                                break; //exit loop once updated.
                            }
                        }

                        //set prediction for given fixture to be 0
                        for (var i = 0; i < $scope.listFixtures.length; i++) {
                            if ($scope.listFixtures[i]._id == fixture._id) {
                                $scope.listFixtures[i].prediction = null;
                            }
                        }

                        //assume that a save will be needed and negate this if necessary
                        SaveChanges.saveChangesNeeded();

                        //check whether or not to disable the clear all button
                        if (_predictions.length == 0) {
                            $scope.clearDisabled = true;
                        }
                    }
                });
            } else {
                $ionicPopup.alert({
                    title: "Nothing to delete!",
                    template: "This fixture didn't have a prediction to delete!"
                });
            }
        };

//once predictions are all validated, and predict button send, send all predictions
        $scope.sendPredictions = function () { //TODO: Add username to the state params

            //mock out the username for now.

            var user = auth.profile.user_id;

            //TODO: Try to replace the below for loops with angular.forEach
            //Validate that predictions have been made for every fixture in this round

            //if predictions array contains every fixture id from the round

            //outer loop
            //iterate over each of the fixtures and ensure it exists within the list of predictions
            var validPredictions = true;
            var predictionsToUpdate = [];
            var predictionsToAdd = [];

            //after validating the predictions, see if the predictions are the same as those on server
            //if no changes have been made, don't bother and exit out and shout at the user

            //if the predictions are valid, send them off to the server
            if (validPredictions) {

                debugger;

                var diffFlag = false;

                for (var i = 0; i < _predictions.length; i++) {
                    //loop over and compare to

                    //if there are existing predictions, compare, if not then must be making new predictions
                    if ($scope.existingPredictions.length) {

                        var predictionExists = false;

                        for (var j = 0; j < $scope.existingPredictions.length; j++) {
                            //if the prediction for matching fixtures is different...
                            if (_predictions[i].fixture == $scope.existingPredictions[j].fixture){
                                //then the prediction existed previously and needs to be updated
                                predictionExists = true;

                                //Check if the prediction is different, and hence needs to be updated
                                if (_predictions[i].prediction != $scope.existingPredictions[j].prediction) {
                                    //trigger the diffFlag
                                    diffFlag = true; //there is a difference between the predictions on the server and new ones.
                                    break; //break out of the inner loop
                                }
                            }
                        }

                    } else {
                        //there are no existing predictions, so new values will always be different
                        diffFlag = true;
                    }

                    //Before iterating, heck to see if any new predictions have been made that aren't on the server
                    if (!predictionExists) {
                        console.log("A new prediction has been made.");
                        diffFlag = true;
                        break;
                    }
                }

                //Now check to see if new and old predictions are the same via the flag
                if (diffFlag == false) {
                    $ionicPopup.alert({
                        title: 'Predictions Unchanged!',
                        template: 'The predictions you are submitting are the same as those on the server, change some and try again.'
                    });

                    //exit the function
                    return;
                }

                debugger;

                //Send the validated predictions

                //check to see if we are making new predictions or updating old ones
                if (updatePredictions) {
                    //update existing predictions!
                    debugger;

                    //warn user that updating will mean points get lost
                    $ionicPopup.confirm({
                        title: 'Updating means less points!',
                        template: 'Are you sure you want to update? Doing so will mean you earn less points. \n Remember: Fixtures without predictions lose 6 points!'
                    }).then(function (res) {
                        if (res) {
                            //then continue as normal

                            //compare differences of new predictions to old ones, add to array of predictions to update
                            //loop over old predictions and compare to new
                            for (var i = 0; i < _predictions.length; i++) { //arrays are indexed by 0

                                var predictionExists = false;
                                var currentUpdatedPrediction = _predictions[i];

                                for (var j = 0; j < $scope.predictionsOnServer.length; j++) {

                                    var currentExistingPrediction = $scope.predictionsOnServer[j];

                                    //if fixture id is the same, but the prediction is different
                                    if (currentExistingPrediction.fixture == currentUpdatedPrediction.fixture) {

                                        //then the prediction exists within the list
                                        predictionExists = true;

                                        if (currentExistingPrediction.prediction != currentUpdatedPrediction.prediction) {

                                            //TODO: Here assign the fixture ID back into the prediction to be updated!!!
                                            debugger;
                                            currentUpdatedPrediction._id = currentExistingPrediction._id;

                                            //add this prediction to the list of predictions to be updated
                                            predictionsToUpdate.push(currentUpdatedPrediction);
                                        }
                                    }

                                }

                                //if after comparison the prediction did not exist on the server, then add it to list
                                if (!predictionExists) {
                                    //add to list to get sent to server before iterating...
                                    predictionsToAdd.push(currentUpdatedPrediction);
                                }
                            }

                            //once you have a list of predictions to update, async for loop and update
                            for (var i = 0, c = predictionsToUpdate.length; i < c; i++) {
                                // creating an Immiedately Invoked Function Expression (dogballs)
                                (function (prediction) {

                                    //call the async function
                                    Rounds.updatePrediction(user, prediction);

                                })(predictionsToUpdate[i]); //use dogballs (a closure)
                                // passing predictions[i] in as "path" in the closure
                            }

                            //Now send any predictions to be added
                            //once you have a list of predictions to update, async for loop and update
                            if (predictionsToAdd) {
                                Rounds.makePredictions(user, $stateParams.roundId, predictionsToAdd);
                            }

                            //mark changes as not being required.
                            SaveChanges.saveChangesNotNeeded();

                            //now enable the delete and clear buttons also
                            $scope.deleteDisabled = false;
                            $scope.clearDisabled = false;

                            //tell the user things have been updated
                            $ionicPopup.alert(
                                {
                                    title: 'Your predictions have been updated!',
                                    template: 'Let\'s hope Paul the octopus agrees...!'
                                }
                            );

                            //Now go and get the updated predictions from the server!
                            //Otherwise the updates don't get reset.
                            $timeout (function() {
                                _getExistingPredictions();
                            }, 1000);
                        }
                    });

                } else { //make a set of new predictions
                    Rounds.makePredictions(user, $stateParams.roundId, _predictions);

                    $ionicPopup.alert({
                        title: 'Your predictions have been made!',
                        template: 'Let\'s hope you do well!'
                    });

                    //changes have just been saved so no longer need this
                    SaveChanges.saveChangesNotNeeded();

                    $timeout (function() {
                        _getExistingPredictions();
                    }, 1000);

                    //enable the delete button
                    $scope.deleteDisabled = false;
                }
            }
        };

        function _predictionDiffCheck (fixture, predictionType) {
            for (var i = 0; i < $scope.listFixtures.length; i++) {
                if (($scope.listFixtures[i]._id == fixture) && ($scope.listFixtures[i].prediction == predictionMap[predictionType])) {
                    console.log("The prediction for this fixture is already the same, exiting.");
                    return 0; //prediction same
                }
            }

            //otherwise if not found return 1 for different
            console.log("This is an updated prediction, updating.");
            return 1;
        }

        $scope.predictHomeWin = function (fixture) {
            debugger;
            console.log("Predict home win");

            if (_predictionDiffCheck(fixture, 1)) {
                _addFixturePrediction(fixture, 1);
            }
        };

        $scope.predictAwayWin = function (fixture) {
            debugger;
            console.log("Predict away win");
            if (_predictionDiffCheck(fixture, 2)) {
                _addFixturePrediction(fixture, 2);
            }
        };

        $scope.predictDraw = function (fixture) {
            console.log("Predict draw")
            debugger;
            if (_predictionDiffCheck(fixture, 3)) {
                _addFixturePrediction(fixture, 3);
            }
        };

        $scope.cardDestroyed = function (index) {
            $scope.currentCardIndex = index - 1;
            $scope.fixtures.splice(index, 1); //is this a reference to the same fixtures array!?
            _cardViewDoneCheck();
        };

        $scope.cardSwipedLeft = function (fixtureId) {
            console.log('LEFT SWIPE - PREDICT HOME WIN');
            _addFixturePrediction(fixtureId, 2);
        };

        $scope.cardSwipedRight = function (fixtureId) {
            console.log('RIGHT SWIPE - PREDICT AWAY WIN');
            _addFixturePrediction(fixtureId, 1);
        };

        $scope.cardTapped = function (fixtureId, index) {
            console.log('PREDICT DRAW');
            debugger;
            _addFixturePrediction(fixtureId, 3);
            $timeout(function () {
                $scope.cardDestroyed(index);
            }, 500);
        };

        $scope.cardSkipped = function (index) {
            console.log("SKIP FIXTURE - NO PREDICTION");

            //Retrieve the fixture at this index
            var fix = $scope.fixtures[index]._id;

            _addFixturePrediction(fix, 0);

            $timeout(function () { //timeout may not be necessary
                $scope.cardDestroyed(index);
            }, 500);
        };

        $scope.cardView = true;
    })

    .controller('LeaderboardCtrl', function ($scope, $state, auth, $ionicPopup,Leaderboard) {
        //get all of the private leagues for the user from the private league service
        //call this  whenever the user's leagues need to be updated within the app
        function _getUserLeagues() {
            debugger;
            Leaderboard.overall().then(function(data) {

                //Assign the season overall leaderboard data to a scope variable
                $scope.overallLeague = data;
                console.log("The overall season league is: " + JSON.stringify($scope.overallLeague));

                //For each league will have to add data pertaining to logged in user to scope manually
                for (var i = 0; i < $scope.overallLeague.length; i++) {
                    if ($scope.overallLeague[i].username == auth.profile.nickname) {
                        //then we have found the currently logged in user, add key to this object
                        $scope.overallLeague.thisUser = {
                            //need pts, username and pick
                            userSeasonPts: $scope.overallLeague[i].overallSeasonScore, //todo: assign round pts
                            userPos: i + 1,
                            userPic: auth.profile.picture
                            //userRdPts: $scope.overallLeague[i].roundScores
                        }
                    }
                }

                Leaderboard.all(auth.profile.user_id).then(function (data) {
                    //debugger;
                    $scope.privateLeagues = data;

                    console.log(data);

                    //For each private league identify the user within that league and add details
                    //For each league will have to add data pertaining to logged in user to scope manually
                    for (var j = 0; j < $scope.privateLeagues.length; j++) {

                        //split league name into words, place in array
                        $scope.privateLeagues[j].privateLeagueName = $scope.privateLeagues[j].privateLeagueName.split(" ");
                        console.log("THE WORDS IN THE LEAGUE NAME ARE: " + $scope.privateLeagues[j].privateLeagueName.toString());

                        for (var k = 0; k < $scope.privateLeagues[j].members.length; k++) {
                            if ($scope.privateLeagues[j].members[k].username == auth.profile.nickname) {
                                //then we have found the currently logged in user, add key to this object
                                debugger;
                                $scope.privateLeagues[j].thisUser = {
                                    //need pts, username and pick
                                    userSeasonPts: $scope.privateLeagues[j].members[k].overallSeasonScore,  //todo: assign round pts
                                    userPos: k + 1,
                                    userPic: auth.profile.picture,
                                    userCurrentRoundScore: $scope.privateLeagues[j].members[k].currentRoundScore
                                }
                            }
                        }
                    }

                    ////work out which of the private leagues were made by user and which part of
                    //$scope.createdLeagues = [];
                    //
                    ////the private league's of which the user is only a member
                    //$scope.inLeagues = [];
                    //
                    //for (var i = 0; i < data.length; i++) {
                    //    if (data[i].creator = auth.profile.user_id) {
                    //        //then is a league created by the currently logged in user, so add to list
                    //        console.log('Now pushing private league ' + data[i] + ' on to user\'s created league\'s array');
                    //        $scope.createdLeagues.push(data[i]);
                    //    } else {
                    //        //the user is simply a participating member of this league
                    //        console.log('Now pushing private league ' + data[i] + ' on to user\'s member array');
                    //        $scope.inLeagues.push(data[i]);
                    //    }
                    //}

                    console.log('User\'s created leagues are: ' + $scope.createdLeagues);

                });
            })
        }

        //when page first loads
        _getUserLeagues();

        $scope.data = {};
        var cancelled = true;

        $scope.createNewLeague = function () {

            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.show({
                template: '<input type="text" ng-model="data.leagueName">',
                title: 'New Private League',
                subTitle: 'Enter the name for the new league',
                scope: $scope,
                buttons: [
                    {text: 'Cancel'},
                    {
                        text: '<b>Create</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if (!$scope.data.leagueName) {
                                //don't allow the user to close unless he enters a username
                                e.preventDefault();
                            } else {
                                cancelled = false;
                                return $scope.data.leagueName;
                            }
                        }
                    }
                ]
            });
            myPopup.then(function (res) {
                if (!cancelled) {
                    //use the data to call through to the user and pass through the provided username
                    Leaderboard.createNewLeague(auth.profile.user_id, $scope.data.leagueName).then(
                        function (res) {

                            //check the message that was returned...
                            console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'New Private League',
                                template: res //TODO: Alter the multiple uses of this
                            });

                            //reset flag
                            cancelled = true;
                        }
                    );
                }
            });
        };

        //function to join a private league using its code
        $scope.joinLeagueWithCode = function () {
            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.show({
                template: '<input type="text" ng-model="data.leagueToJoin">',
                title: 'Join league with code',
                subTitle: 'Enter the code of the private league to join.',
                scope: $scope,
                buttons: [
                    {text: 'Cancel'},
                    {
                        text: '<b>Join</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if (!$scope.data.leagueToJoin) {
                                //don't allow the user to close unless he enters a code
                                e.preventDefault();
                            } else {
                                cancelled = false;
                                return $scope.data.leagueToJoin;
                            }
                        }
                    }
                ]
            });
            myPopup.then(function (res) {

                if (!cancelled) {
                    //validate the code, check 8 characters and all numbers

                    console.log("Now attempting validation before sending code");

                    //check that the code is 7 characters long
                    var isnum = /^\d+$/.test($scope.data.leagueToJoin);

                    //check that the code contains only numbers
                    if (!isnum || $scope.data.leagueToJoin.length != 7) {
                        //then invalid code was entered
                        $ionicPopup.alert({
                            title: 'Error! Invalid League Code',
                            template: 'Please ensure you are entering a valid 7 digit numerical league code.'
                        });

                        return;
                    }

                    //use the data to call through to the user and pass through the provided username
                    Leaderboard.joinLeagueWithCode(auth.profile.user_id, $scope.data.leagueToJoin).then(
                        function (res) {

                            //check the message that was returned...
                            console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'Private League Joined',
                                template: 'Yes! Get In! You\'ve joined the private league ' + $scope.data.leagueToJoin
                            });

                            //reset flag
                            cancelled = true;

                            //TODO: look up how to take that user directly to that league now
                            //TODO: REFRESH  the page to display that new league
                            //Would have to go and get leagues again

                            console.log("Now attempting to refresh the page")
                            _getUserLeagues();
                        }
                    );
                }
            });
        };
    })

    .controller('LeaderboardLeagueDetailCtrl', function ($scope, PrivateLeagues, auth, $stateParams, $ionicPopup, $state,
                                                      $cordovaSocialSharing, User) {

        $scope.shouldShowDelete = false;

        //enable delete buttons
        $scope.toggleDelete = function () {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        };

        console.log('Now getting the private league with id: ' + $stateParams.league_id);//Get the data for this particular league from the server
        //Get the data for this particular round from the server

        //call this functino whenever the private leage data needs to be refreshed
        function _getPrivateLeagueData() {
            PrivateLeagues.get(auth.profile.user_id, $stateParams.privateLeagueId).then(function (data) {

                //$ionicLoading.hide();
                $scope.privateLeague = data[0];
                console.log('Retrieved private leauge:' + JSON.stringify(data));
            });
        }

        //when first loading in the tab, get league data
        _getPrivateLeagueData();

        //TODO: GO BACK AND ONLY EXPOSE DATA TO THE SCOPE VIA A DATA OBJECT IN THE SAME MANNER AS THIS
        //create scope variable to store provided usernames
        $scope.data = {};
        $scope.user_id = auth.profile.user_id;

        var cancelled = true;

        $scope.renameLeague = function () {
            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.show({
                template: '<input type="text" ng-model="data.newLeagueName">',
                title: 'Rename league',
                subTitle: 'Enter the new name for the league',
                scope: $scope,
                buttons: [
                    {text: 'Cancel'},
                    {
                        text: '<b>Rename</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if (!$scope.data.newLeagueName) {
                                //don't allow the user to close unless he enters a username
                                e.preventDefault();
                            } else {
                                cancelled = false;
                                return $scope.data.newLeagueName;
                            }
                        }
                    }
                ]
            });
            myPopup.then(function (res) {

                if (!cancelled) {
                    //validate the username, check not user's or existing member

                    console.log("Now attempting validation before renaming");

                    console.log("The creator of the private league is: " + $scope.privateLeague.creator);

                    //check that the user has not attempted to invite themselves
                    if ($scope.data.newLeagueName == $scope.privateLeague.privateLeagueName) {
                        console.log("The username of the creator of the private league is: " + $scope.privateLeague.creator);
                        console.log("You can only rename the league if you are giving it a new name.");

                        //then this user has already been invited
                        $ionicPopup.alert({
                            title: 'Error! League not renamed!',
                            template: 'To rename this league you must give it a new name.'
                        });

                        return
                    }

                    //use the data to call through to the user and pass through the provided username
                    PrivateLeagues.renameLeague(auth.profile.user_id, $scope.data.newLeagueName, $scope.privateLeague.privateLeagueId).then(
                        function (res) {

                            //check the message that was returned...
                            console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'Rename',
                                template: res
                            });

                            //reset flag
                            cancelled = true;

                            //Refresh the name of the league as stored on the server
                            _getPrivateLeagueData();

                        }
                    );
                }
            });
        };

        $scope.leaveLeague = function () {
            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.confirm({
                title: 'Confirm Leaving',
                template: 'Are you sure you want to leave this private league?'
            });
            myPopup.then(function (res) {
                if (res) {
                    //use the data to call through to the user and pass through the provided username
                    PrivateLeagues.leaveLeague(auth.profile.user_id, $scope.privateLeague.privateLeagueId).then(
                        function (res) {
                            //check the message that was returned...
                            console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'League Left',
                                template: 'The private league was left successfully!'
                            });

                            //update the local user data
                            User.getUserData();

                            //take the user back to the list of private leagues
                            $state.go('tab.scoreboard-private-leagues');
                        }
                    );
                }
            });
        };

        $scope.deleteMember = function (user_id_to_delete) {
            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.confirm({
                title: 'Confirm Deletion',
                template: 'Are you sure you want to remove the member from this private league?'
            });
            myPopup.then(function (res) {
                if (res) {
                    //use the data to call through to the user and pass through the provided username
                    PrivateLeagues.deleteMember(auth.profile.user_id, user_id_to_delete, $scope.privateLeague.privateLeagueId).then(
                        function (res) {
                            //check the message that was returned...
                            console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'Member Deleted',
                                template: 'The member was removed from the league successfully!'
                            });

                            //update the local user data
                            User.getUserData();

                            _getPrivateLeagueData();

                        }
                    );
                }
            });
        };

        $scope.deleteLeague = function () {
            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.confirm({
                title: 'Confirm Delete',
                template: 'Are you sure you want to delete this entire private league?'
            });
            myPopup.then(function (res) {

                if (res) {
                    //validate the username, check not user's or existing member

                    //TODO: Remove this is it is an unnecessary precaution
                    //check that the user has not attempted to invite themselves
                    if (!$scope.user_id == $scope.privateLeague.creator) {
                        console.log("The username of the creator of the private league is: " + $scope.privateLeague.creator);
                        console.log("Only the creator of a league can delete it!.");

                        //then this user has already been invited
                        $ionicPopup.alert({
                            title: 'Error! League not deleted!',
                            template: 'To delete this league you must have created it.'
                        });

                        return
                    }

                    //use the data to call through to the user and pass through the provided username
                    PrivateLeagues.deleteLeague(auth.profile.user_id, $scope.privateLeague.privateLeagueId).then(
                        function (res) {
                            //check the message that was returned...
                            console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'Deleted',
                                template: 'The private league was deleted successfully!'
                            });

                            //take the user back to the list of private leagues
                            $state.go('tab.scoreboard-private-leagues');
                        }
                    );
                }
            });
        };

        //Implementing sharing of the private league code - for an open invitation
        $scope.shareLeague = function () {
            //$cordovaSocialSharing.share("This is your message", "This is your subject", "www/imagefile.png", "http://blog.nraboy.com");
            console.log("Share functin invoked.");
            $cordovaSocialSharing.share("Join my Yes! Get In! Private league using code: \n\t" + $scope.privateLeague.privateLeagueCode, "Join my Yes! Get In! Private League", null, "http://www.yesgetin.com");
        };

        //$scope.shareViaTwitter = function(message, image, link) {
        //    $cordovaSocialSharing.canShareVia("twitter", message, image, link).then(function(result) {
        //        $cordovaSocialSharing.shareViaTwitter(message, image, link);
        //    }, function(error) {
        //        alert("Cannot share on Twitter");
        //    });
        //}

    })

    .controller('LeaderboardGlobalLeagueDetailCtrl', function ($scope, Scoreboard, auth) {

        //Get the global scoreboard
        //Get the data for scores for leaderboard
        Scoreboard.all().then(function (data) {
            $scope.scores = data;
        });

    })

    .controller('AccountCtrl', function ($scope, $state, User, auth, $ionicPopup, PrivateLeagues) {

        //hopefully this should get run every time the user navigates to this tab
        User.getUserData(auth.profile.user_id);
        $scope.userData = User.currentUser();

        //ionic list control values
        $scope.shouldShowDelete = false;
        $scope.shouldShowReorder = false;
        $scope.listCanSwipe = true;

        $scope.signOut = function () {

            //clear the stored user data in out service
            User.clearCurrentUser();

            //call the signout method on the auth service
            auth.signout();

            //need to manually display the login screen again
            auth.signin({
                // This is a must for mobile projects
                popup: true,
                // Make the widget non closeable
                standalone: true,
                closable: false,
                // This asks for the refresh token
                // So that the user never has to log in again
                offline_mode: true,
                device: 'Phone'
            }, function () {
                // Login was successful

                //check to see if this user exists on the server already, if not, create this user using auth0 details
                debugger;
                User.sync(auth.profile).then(function () {
                    //Once the user data has been synced, get the user data object from our server also
                    //Have to do in this callback otherwise we attempt to get the user data before the sync has finished
                    console.log('Logging in after logging out and sending user_id: ' + auth.profile.user_id);
                    User.getUserData(auth.profile.user_id).then(function (results) {
                        console.log("Getting the current user data from our server... : " + JSON.stringify(User.currentUser()));

                        //expose the user's invitations to the scope
                        $scope.userData = User.currentUser();

                        debugger;

                        console.log("Invitations are: " + $scope.userData.invitations);
                        console.log("Notifications are: " + $scope.userData.notifications);

                        $state.go('tab.rounds');

                        //show an alert for testing purposes
                        $ionicPopup.alert({
                            title: 'Login successful!',
                            template: 'Welcome ' + auth.profile.nickname + '!'
                        }).then(function (res) {
                            console.log(auth.profile);
                        });
                    });
                });
            }, function (error) {
                // Oops something went wrong during login:
                console.log("There was an error logging in", error);
            });
        };

        //function to accept an invitation
        //unique because a user can't be invited to the same private league more than once
        $scope.acceptInvitation = function (privateLeagueId) {
            //call the method in the service, passing in the user id of the logged in user (invitee)
            //as well as the private league id

            debugger;

            PrivateLeagues.acceptInvitation(auth.profile.user_id, privateLeagueId).then(function (response) {
                    //popup to let the user know they are now a member of that league
                    console.log("The response from the server was: " + JSON.stringify(response));
                    if (response == 200) {
                        //then everything went ok, let the user know
                        //show an alert for testing purposes
                        $ionicPopup.alert({
                            title: 'Invitation was Accepted!',
                            template: 'Go have a look at your new private league!'
                        });

                        //now delete the invitation from the user/reload the page!
                        //TODO: Replace all fors used to find with findWhere in underscore.js
                        for (var i = 0; i < $scope.userData.invitations.length; i++) {
                            if ($scope.userData.invitations[i].privateLeagueId == privateLeagueId) {
                                //then this invitation has been successfully removed from the server, so delete
                                $scope.userData.invitations.splice(i, 1); //this should now get removed from the view
                                //if not view updated, then scope.apply. - test this.
                            }
                        }

                    } else {
                        //print the error message that was returned instead todo: Use error objects properly for this?
                        $ionicPopup.alert({
                            title: 'Something went awry!',
                            template: response
                        });
                    }

                    //TODO: button to take the user directly to this league, $state.go(...)
                }
            );
        };

        $scope.rejectInvitation = function (invitedByUsername, privateLeagueId) {
            //call through to service and then server
            PrivateLeagues.rejectInvitation(auth.profile.user_id, invitedByUsername, privateLeagueId).then(
                function (response) {
                    //popup to let the user know they are now a member of that league
                    console.log("The response from the server was: " + JSON.stringify(response));
                    if (response == 202) {
                        //then everything went ok, let the user know
                        //show an alert for testing purposes
                        $ionicPopup.alert({
                            title: 'Invitation was rejected!',
                            template: 'Who needs friends anyway.'
                        });

                        //now delete the invitation from the user/reload the page!
                        //TODO: Replace all fors used to find with findWhere in underscore.js
                        for (var i = 0; i < $scope.userData.invitations.length; i++) {
                            if ($scope.userData.invitations[i].privateLeagueId == privateLeagueId) {
                                //then this invitation has been successfully removed from the server, so delete
                                $scope.userData.invitations.splice(i, 1); //this should now get removed from the view
                                //if not view updated, then scope.apply. - test this.
                            }
                        }

                    } else {
                        //print the error message that was returned instead todo: Use error objects properly for this?
                        $ionicPopup.alert({
                            title: 'Something went awry!',
                            template: response
                        });
                    }

                    //TODO: button to take the user directly to this league, $state.go(...)
                }
            );

            //popup to let user know of the result of that

        };

        //load the text of the notification into a modal/popup
        $scope.showNotification = function (notification_index) {
            //get the notification at the given index
            var notification_text = $scope.userData.notifications[notification_index].message;

            console.log("The notification text to display is: " + notification_text);

            //now display this text within a modal or popup
            $ionicPopup.alert({
                title: 'Notification!',
                template: notification_text
            });
        };

        //remove the desired notification from the user on the server
        $scope.deleteNotification = function (notification_id) {
            //call  through to the server, sending user_id and notification_id
            User.clearNotification(auth.profile.user_id, notification_id).then(
                function (res) {
                    console.log('Notification cleared');

                    //splice the notification out to remove from view for now
                    for (var i = 0; i < $scope.userData.notifications.length; i++) {
                        if ($scope.userData.notifications[i].notification_id == notification_id) {
                            $scope.userData.notifications.splice(i, 1); //TODO: implement some sort of model refresh from server for this.
                            //TODO: Refresh in the same way as the predictions get refreshed after changes are made.
                        }
                    }
                }
            );
        };

        //TODO: Update the user's info with a pull to refresh and push notifications
        $scope.doRefresh = function () {

            //Replace this with a manual check of new invitations and notifications
            $scope.userData = User.getUserData(auth.profile.user_id).then(function () {
                //TODO: Ionic popup if new notifications here
                $scope.$broadcast('scroll.refreshComplete');

                //renew the scope
                //$scope.userData = User.getUserData(); //TODO: may need to update the view
            });
        };
    });

