angular.module('starter.controllers', ['ionic.service.core', 'ionic.service.push'])

    .controller('LeagueTableCtrl', function ($scope, LeagueTable) {

        //First retrieve all of the league table data and add it to the scope
        LeagueTable.all().then(function (data) {
            //////debugger;
            $scope.standings = data.teams; //we only want the actual standings data

            //Go through and replace 'United' with 'Utd' and 'Manchester' with 'Man'
            //maybe make reusable
            angular.forEach($scope.standings, function (standing, key) {
                if (standing.stand_team_name.indexOf("United" > -1)) {
                    //console.log("Standing with \'United\' in team name has been altered");
                    standing.stand_team_name = standing.stand_team_name.replace('United', 'Utd');
                }

                if (standing.stand_team_name.indexOf("Manchester" > -1)) {
                    //console.log("Standing with \'Manchester\' in team name has been altered");
                    standing.stand_team_name = standing.stand_team_name.replace('Manchester', 'Man');
                }
            });
        });
    })

    .controller('RoundsCtrl', function ($scope, Rounds, User, auth, $ionicLoading, $ionicDeploy, $ionicPopup) {

        //Refresh the user data to account for updated predictions
        ////debugger;
        User.getUserData(auth.profile.user_id).then(
            function(){
                $scope.user = User.currentUser();

                Rounds.all().then(function (data){

                    var today = new Date();

                    //used for testing past fixtures.
                    //var today = new Date(2016, 11, 11);

                    //////debugger;
                    $scope.rounds = data.rounds;
                    $scope.rounds = $scope.rounds.reverse();

                    ////debugger;
                    for (var i = 0; i < $scope.rounds.length; i++) {
                        var currentRoundFixtures = $scope.rounds[i].data;

                        //check if round is completed
                        var complete = true;
                        var inPast = true;
                        for (var j = 0; j < currentRoundFixtures.length; j++) {

                            currentRoundFixture = currentRoundFixtures[j];

                            var fixDateAsDate = new Date(currentRoundFixture.fixDate);

                            if (fixDateAsDate > today) {
                                inPast = false;
                            }
                        }

                        //if all of the fixtures are in the past, then round is complete
                        if (inPast == true) {
                            $scope.rounds[i].status = 'Complete'

                            ////debugger;
                            //fixed bug where round view would load in ALL fixtures from server.
                            $scope.rounds[i].roundLink = i+1;

                        } else {
                            //else if there are fixtures in future still in round
                            for (var l = 0; l < currentRoundFixtures.length; l++) {

                                currentRoundFixture = currentRoundFixtures[l];

                                //look for this fixture in user predictions
                                var predictionsMade = false;
                                for (var k = 0; k < $scope.user.predictions.length; k++) {
                                    //if user prediction matches one of the fixtures in the round
                                    if (($scope.user.predictions[k].fixture == currentRoundFixture._id) && ($scope.user.predictions[k].prediction != 0)) {
                                        predictionsMade = true;
                                        $scope.rounds[i].status = "Predictions Made";
                                        //console.log(JSON.stringify($scope.rounds[i]));

                                        //Set this round to go into the card view, round index
                                        // + 1 because index is base 0
                                        $scope.rounds[i].roundLink = i+1;

                                        break
                                    }
                                }

                                if (predictionsMade == false) {
                                    $scope.rounds[i].status = "Unpredicted";
                                    //console.log(JSON.stringify($scope.rounds[i]));

                                    //Set the round link
                                    $scope.rounds[i].roundLink = "cards/" + (i+1);

                                    break;
                                } else {
                                    break;
                                }
                            };
                        }

                        //todo: remove this, purely for testing complete round functionality
                        //$scope.rounds[i].status = 'Complete'
                    }
                });
            }
        );

        $scope.remove = function (round) {
            Rounds.remove(round);
        };

    })

        .controller('SaveCtrl', function ($scope, $ionicPopup, $ionicHistory, SaveChanges) {
        //function to check that user is ready to leave without saving changes
        $scope.makeUnsavedChanges = function () {

            //ask if they are sure they want to go back if there are unsaved changes that would be lost
            debugger;

            //console.log("THE CURRENT VIEW IS: " + JSON.stringify($ionicHistory.currentStateName()));

            var currentState = $ionicHistory.currentStateName();

            //If the back button is being clicked from round-detail, check for unsaved changes and alert user
            if (currentState == 'tab.round-detail' && SaveChanges.check()) {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Unsaved Changes',
                    template: 'Any unsaved changes to predictions will be lost'
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        //console.log('You are sure');
                        //then go on back!
                        //set save changes to false
                        SaveChanges.saveChangesNotNeeded();

                        $ionicHistory.goBack();
                    } else {
                        //console.log('You are not sure');
                        //stay in this view
                    }
                });
            } else if (currentState == 'tab.round-cards') {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'All fixtures need a prediction',
                    template: 'To ensure your predictions are registered you need to give predictions for all fixtures in this round. Tap OK to go back or CANCEL to stay and complete your predictions for this round'
                    });
                    confirmPopup.then(function (res) {
                    if (res) {

                                $ionicHistory.goBack();
                    }else {
                    //console.log('You are not sure');
                    //stay in this view
                    }
                });
            }else {
              //just go back
              $ionicHistory.goBack();
            }
      };
})
    .controller('RoundDetailCtrl', function ($scope, $state, $ionicPopup, $q, $stateParams, $timeout, $ionicActionSheet,
                                             Rounds, SaveChanges, auth, TDCardDelegate, User, $timeout, $ionicHistory) {

        var _predictions = [];
        var updatePredictions = false; //flag to update predictions if some already exist.
        var user = auth.profile.user_id; //get the universally unique user_id
        var predictionMap = {
            0: 'NONE',
            1: 'HOME WIN',
            2: 'AWAY WIN',
            3: 'DRAW',
            "AWAY WIN": 2,
            "HOME WIN": 1,
            "DRAW": 3
        };

        $scope.cardView = true;
        $scope.predictionMap = {
            0: 'NONE',
            1: 'HOME WIN',
            2: 'AWAY WIN',
            3: 'DRAW'
        };
        $scope.UpdatedUserPredictions = {
            predictions: []
        };
        $scope.saveChangesNeeded = false;
        $scope.fixCount = 0;
        $scope.currentRound = $stateParams.roundId;

        //$scope.$on('$ionicView.enter', function(){
        //    //if the scope says need to save set the global need to save after reentering the tab
        //    console.log("Round detail view re-entered from other tab.");
        //
        //    var diffFlag = false;
        //    debugger;
        //
        //    //before comparing lists of fixtures, sort by fixture id
        //    if ($scope.existingPredictions && $scope.UpdatedUserPredictions) {
        //        var existingPredictions = _sortByKey($scope.existingPredictions, "fixture");
        //        var userPredictions = _sortByKey($scope.listFixtures, "_id");
        //
        //        console.log("Sorted existing predictions are: " + JSON.stringify(existingPredictions));
        //        console.log("Sorted user predictions are: " + JSON.stringify(userPredictions));
        //
        //        //if the predictions array is different to the predictions on the server
        //        for (var i = 0; i < userPredictions.length; i++) {
        //            for (var j = 0; j < existingPredictions.length; j++) {
        //                if (userPredictions[i]._id == existingPredictions[j].fixture){
        //                    debugger;
        //                    if (predictionMap[userPredictions[i].prediction] != existingPredictions[j].prediction) {
        //                        debugger;
        //
        //                        //THIS CODE BLOCK IS NEVER ENTERED.
        //
        //                        SaveChanges.saveChangesNeeded();
        //                        console.log("SAVE CHANGES NEEDED AT LINE 191");
        //                        diffFlag = true;
        //                        break;
        //                    }
        //                }
        //
        //                if (diffFlag) {
        //                    break;
        //                }
        //            }
        //        }
        //    }
        //});


        //////debugger;
        function _checkAndShowTutorials() {
            //check to see if this is a new user
            if (User.tutorialsActiveCheck()) {
                //Show the tutorial pop up
                var tutorial = $ionicPopup.alert({
                    title: "MAKING AND UPDATING PREDICTIONS, \n SIMPLE!",
                    template: '<img class="tutorial-image" src=\'img/tutorial.png\'>',
                    okText: 'GOT IT'
                });

                //Disable any further popups - hack
                User.hideTutorials();

                //Increment the number of times the tutorials have been shown
                User.incrementTutorialSeenCount();
                //console.log(User.tutorialSeenCount());

            }
        }

        function _getExistingPredictions() {

            debugger;

            //go and get all of the predictions for the user
            Rounds.getExistingPredictions(user, $stateParams.roundId).then(function (data) {
                //clear existing predictions

                //Check if the tutorials need to be shown and if so, show them!
                ////debugger;
                _checkAndShowTutorials();

                _predictions = [];

                $scope.UpdatedUserPredictions.predictions = [];

                //////debugger;

                //if the user has made predictions previously, go straight to the list view
                //if (data != null) {
                //    $scope.existingPredictions = data;
                //    //go to the list view, new controller instance
                //    //console.log("User already predicted for this round, going to list view");
                //    //$state.go('tab.round-detail', {roundId : $stateParams.roundId});
                //}

                $scope.existingPredictions = data;

                var currentFixturePrediction = null;

                if ($scope.existingPredictions.length) {

                    //if the user has already made predictions on this round, then just show list view
                    ////debugger;
                    $scope.cardView = false;

                    //as there are some predictions, enable the delete and clear buttons
                    $scope.deleteDisabled = false;
                    $scope.clearDisabled = false;

                    //now loop over fixtures and add in these predictions!
                    //will need to use a nested loop

                    //////debugger;
                    //console.log("Now matching existing predictions to thier corresponding fixtures.");

                    //outer loop - go over all of the listFixtures - iterate through the list of fixtures
                    for (var i = 0; i < $scope.listFixtures.length; i++) {

                        //for each fixture, iterate over all predictions and find matching one.
                        for (var j = 0; j < $scope.existingPredictions.length; j++) {

                            //find the corresponding fixture for the existing prediction
                            var currentExistingPrediction = $scope.existingPredictions[j].fixture

                            if (currentExistingPrediction == $scope.listFixtures[i]._id) {
                                currentFixturePrediction = predictionMap[$scope.existingPredictions[j].prediction];
                                ////debugger;
                                $scope.listFixtures[i].prediction = currentFixturePrediction;
                                $scope.listFixtures[i].predictionWindow = $scope.existingPredictions[j].predictValue.predictWindow;

                                //set score for user's prediction for this fixture
                                if ($scope.listFixtures[i].fixResult.fixResult != 0 && $scope.existingPredictions[j].predictionResult == 'Correct') {
                                    $scope.listFixtures[i].predictionScore = $scope.existingPredictions[j].predictValue.correctPoints;
                                    $scope.listFixtures[i].predictionOutcome = 'Correct';
                                } else if ($scope.listFixtures[i].fixResult.fixResult != 0 && $scope.existingPredictions[j].predictionResult == 'Incorrect') {
                                    $scope.listFixtures[i].predictionScore = $scope.existingPredictions[j].predictValue.incorrectPoints;
                                    $scope.listFixtures[i].predictionOutcome = 'Incorrect';
                                }

                            }
                        }
                    }

                    updatePredictions = true; //only set this if there are existing predictions!
                } else {
                    /*if there are no existing predictions on the server for this round for this user*/
                    //$scope.cardView = true;

                    //Then determing the first card details globally for the skip function
                    //////debugger;
                    $scope.currentCardFixture = $scope.fixtures[$scope.fixtures.length - 1];
                    //console.log("The fixture for the first card is: " + JSON.stringify($scope.currentCardFixture));

                    $scope.currentCardIndex = $scope.fixtures.length - 1;
                    //console.log("To begin with, the current card index is: " + $scope.currentCardIndex);

                    $scope.deleteDisabled = true;
                    $scope.clearDisabled = true;
                }

                for (var k = 0; k < $scope.existingPredictions.length; k++) {
                    $scope.UpdatedUserPredictions.predictions.push({
                        fixture: $scope.existingPredictions[k].fixture,
                        prediction: $scope.existingPredictions[k].prediction
                    });
                }

            });
        }

        function _predictionExists(fixture) {

            var found = -1;

            for (var i = 0; i < $scope.UpdatedUserPredictions.predictions.length; i++) {
                if (fixture == $scope.UpdatedUserPredictions.predictions[i].fixture) {
                    //then the fixture has had a prediction made for it
                    found = i;
                    break; //breaks out of the inner loop
                }
            }

            return found;
        }

        function _addFixturePrediction(fixture, prediction) {

            //mark changes as requiring saving
            debugger;
            SaveChanges.saveChangesNeeded();
            console.log("SAVE CHANGES NEEDED AT LINE 347");
            $scope.saveChangesNeeded = true;

            //enable the clear button now that a prediction has been made
            if ($scope.clearDisabled) {
                $scope.clearDisabled = false;
            }

            //find out if the current fixture has a prediction and if so, the position in the list
            var existingPredictionPosition = _predictionExists(fixture);

            if (existingPredictionPosition != -1) {
                //then update this current fixture using the position in the predictions array

                //check to see if the prediction will actually be changed, if not, do nothing

                $scope.UpdatedUserPredictions.predictions[existingPredictionPosition] = {fixture: fixture, prediction: prediction};
            } else { //else if a prediction for this fixture does not already exist...
                if (prediction != 0) { //don't add none predictions to the list
                    $scope.UpdatedUserPredictions.predictions.push({fixture: fixture, prediction: prediction});
                }
            }

            //Now update the prediction within the fixtures array
            //Will have to find the correct prediction first, for loop
            for (var i = 0; i < $scope.listFixtures.length; i++) {
                //if matching fixture update the prediction
                if ($scope.listFixtures[i]._id == fixture) {
                    //then appropriately update the prediction
                    $scope.listFixtures[i].prediction = predictionMap[prediction];
                    //console.log($scope.listFixtures[i].prediction);

                    if ($scope.cardView) {
                        $scope.fixtures[i].prediction = predictionMap[prediction];
                        //console.log($scope.listFixtures[i].prediction);
                    }

                    break; //exit the loop
                }
            }
        }

        function _cardViewDoneCheck() {
            //if there are no elements left in the cards array, show list
            if ($scope.fixtures.length == 0) {
                //Send the predictions off to the server.
                //////debugger;
                $scope.sendPredictions();
            }
        }

        function _predictionDiffCheck(fixture, predictionType) {
            for (var i = 0; i < $scope.listFixtures.length; i++) {
                if (($scope.listFixtures[i]._id == fixture) && ($scope.listFixtures[i].prediction == predictionMap[predictionType])) {
                    //console.log("The prediction for this fixture is already the same, exiting.");
                    return 0; //prediction same
                }
            }

            //otherwise if not found return 1 for different
            //console.log("This is an updated prediction, updating.");
            return 1;
        }

        function _getFixResult(fixId) {
            for (var i = 0; i < $scope.listFixtures.length; i++) {
                if ($scope.listFixtures[i]._id == fixId) {
                    return $scope.listFixtures[i].fixResult.fixResult;
                }
            }

            return -1; //if not found.
        }

        function _sortByKey(array, key) {
            return array.sort(function(a, b) {
                var x = a[key]; var y = b[key];
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
        };

//set the need for changes to be saved to be false by default
        SaveChanges.saveChangesNotNeeded();

//Get the data for this particular round from the server
        Rounds.get($stateParams.roundId).then(function (data) {

            //when first loading the page, clear out any local existing predictions.
            $scope.UpdatedUserPredictions.predictions = [];

            //$ionicLoading.hide();
            $scope.fixtures = data;
            $scope.fixCount = $scope.fixtures.length;
            //console.log("fix count is " + $scope.fixCount);
            $scope.fixtures.reverse();

            for (var i = 0; i < $scope.fixtures.length; i++) {
                $scope.fixtures[i].homeTeam = User.filterTeam($scope.fixtures[i].homeTeam);
                $scope.fixtures[i].awayTeam = User.filterTeam($scope.fixtures[i].awayTeam);

                var today = new Date();

                var fixtureDate = new Date($scope.fixtures[i].fixDate);
                if (fixtureDate < today) {
                    $scope.fixtures.splice(i, 1); //delete from card view
                }
            }

            ////debugger;
            if ($scope.fixtures.length == 0) $scope.cardView = false;

            //clone into a separate array to use for the cards
            $scope.listFixtures = angular.copy(data);
            //$scope.listFixtures.reverse();

            ////debugger;
            var completeCount = 0;
            for (var i = 0; i < $scope.listFixtures.length; i++) {
                $scope.listFixtures[i].homeTeam = User.filterTeam($scope.listFixtures[i].homeTeam);
                $scope.listFixtures[i].awayTeam = User.filterTeam($scope.listFixtures[i].awayTeam);
                ////debugger;
                var today = new Date();
                //used for testing the behaviour of past fixtures
                //var today = new Date(2016, 11, 11);

                var fixtureDate = new Date($scope.fixtures[i].fixDate);
                if (fixtureDate < today) {
                    //$scope.listFixtures.splice(i, 1); //delete from card view
                    ////debugger;
                    $scope.listFixtures[i].status = 'Complete'; //delete from card view
                    //console.log('Fixture marked as complete here');
                    completeCount++;
                } else {
                    $scope.listFixtures[i].status = 'Ongoing';
                }

                //todo: REMOVE THIS, PURELY FOR TESTING
                //$scope.listFixtures[i].status = 'Complete';
            }

            if (completeCount == $scope.listFixtures.length) {
                $scope.allComplete = true;
            }

            //$scope.allComplete = true;

            //every time a new set of fixtures is loaded, clear predictions
            _getExistingPredictions();

        });

        $scope.deleteSinglePrediction = function (fixture) {

            //////debugger;
            if (fixture.prediction && fixture.prediction != 'NONE') {
                //Warn the user about the loss of 6 points for completely withdrawing a fixture prediction
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Confirm Delete',
                    template: 'Are you sure you want to delete the prediction for this fixture? \n Remember, you\'ll lose 6 points if left unpredicted!'
                });

                confirmPopup.then(function (res) {

                    if (res) {

                        //////debugger;

                        //delete the prediction from the private array
                        for (var i = 0; i < $scope.UpdatedUserPredictions.predictions.length; i++) {
                            if (fixture._id == $scope.UpdatedUserPredictions.predictions[i].fixture) {
                                //set this prediction to be 0 - denoting no prediction
                                $scope.UpdatedUserPredictions.predictions[i].prediction = 0;
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
                        ////debugger;
                        SaveChanges.saveChangesNeeded();
                        console.log("SAVE CHANGES NEEDED AT LINE 191");
                        $scope.saveChangesNeeded = true;
                    }
                });
            } else {
                $ionicPopup.alert({
                    title: "Nothing to delete!",
                    template: "This fixture didn't have a prediction to delete!"
                });
            }
        };

        $scope.sendPredictions = function () {

            ////debugger;
            var predictionsToUpdate = [];
            var predictionsToAdd = [];
            var diffFlag = false;

            //todo replace with the use of underscore contains
            //determine if the user has made changes upon pressing the submit button
            for (var i = 0; i < $scope.UpdatedUserPredictions.predictions.length; i++) {
                //if there are existing predictions, compare, if not then must be making new predictions
                if ($scope.existingPredictions.length) {
                    var predictionExists = false;
                    for (var j = 0; j < $scope.existingPredictions.length; j++) {
                        //if the prediction for matching fixtures is different...
                        ////////debugger;
                        if ($scope.UpdatedUserPredictions.predictions[i].fixture == $scope.existingPredictions[j].fixture) {
                            //then the prediction existed previously and needs to be updated
                            predictionExists = true;

                            //Check if the prediction is different, and hence needs to be updated
                            if ($scope.UpdatedUserPredictions.predictions[i].prediction != $scope.existingPredictions[j].prediction) {
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
                //Before iterating, check to see if any new predictions have been made that aren't on the server
                if (predictionExists == false) {
                    //console.log("A new prediction has been made.");
                    diffFlag = true;
                    break;
                }
            }

            //If no changes have been made, exit the function
            if (diffFlag == false) {
                $ionicPopup.alert({
                    title: 'Predictions Unchanged!',
                    template: 'There doesn\'t seem to be any changes to your predictions, update some and try again.'
                });

                //exit the function
                return;
            }
            else if (updatePredictions) {
                //Warn user that updating will mean points get lost
                $ionicPopup.confirm({
                    title: 'Confirm updates to predictions',
                    template: 'As the saying goes - change is good. Just tap OK to register your updates! Good luck :) \n Remember: Fixtures without predictions lose 6 points!'
                }).then(function (res) {
                    if (res) {

                        //compare differences of new predictions to old ones, add to array of predictions to update
                        for (var i = 0; i < $scope.UpdatedUserPredictions.predictions.length; i++) {
                            var predictionExists = false;
                            var currentUpdatedPrediction = $scope.UpdatedUserPredictions.predictions[i];

                            for (var j = 0; j < $scope.existingPredictions.length; j++) {

                                var currentExistingPrediction = $scope.existingPredictions[j];

                                //if fixture id is the same, but the prediction is different
                                if (currentExistingPrediction.fixture == currentUpdatedPrediction.fixture) {

                                    //then the prediction exists within the list
                                    predictionExists = true;

                                    if (currentExistingPrediction.prediction != currentUpdatedPrediction.prediction) {

                                        currentUpdatedPrediction._id = currentExistingPrediction._id;

                                        //add this prediction to the list of predictions to be updated
                                        predictionsToUpdate.push(currentUpdatedPrediction);
                                    }

                                    break;
                                }
                            }

                            //if after comparison the prediction did not exist on the server, then add it to list to create
                            if (!predictionExists) {
                                //////debugger;
                                predictionsToAdd.push(currentUpdatedPrediction);
                            }
                        }

                        //Send the predictions to be updated
                        //call the async function
                        //////debugger;
                        Rounds.updatePredictions(auth.profile.user_id, predictionsToUpdate).then(function(){
                            //Now send any predictions to be added
                            //once you have a list of predictions to update, async for loop and update
                            if (predictionsToAdd.length > 0) {
                                //console.log('There have been completely new predictions made, sending these to server.');
                                Rounds.makePredictions(auth.profile.user_id, $stateParams.roundId, predictionsToAdd).then(function(){
                                    //mark changes as not being required.
                                    SaveChanges.saveChangesNotNeeded();

                                    //tell the user things have been updated
                                    $ionicPopup.alert(
                                        {
                                            title: 'Your predictions have been updated!',
                                            template: 'Let\'s hope you chose wisely...!'
                                        }
                                    );

                                    //Now load any predictions down from the server
                                    _getExistingPredictions();
                                });
                            } else {
                                //mark changes as not being required.
                                SaveChanges.saveChangesNotNeeded();

                                //tell the user things have been updated
                                $ionicPopup.alert(
                                    {
                                        title: 'Your predictions have been updated!',
                                        template: 'Let\'s hope you chose wisely...!'
                                    }
                                );

                                //Now load any predictions down from the server
                                _getExistingPredictions();
                                //Return to home screen
                                $state.go('tab.rounds', {reload : true});
                            }
                        });
                    }
                });
            }
            else { //there are no existing predictions so simply make a fresh set of new predictions
                //////debugger;
                Rounds.makePredictions(user, $stateParams.roundId, $scope.UpdatedUserPredictions.predictions).then(function() {
                    $ionicPopup.alert({
                        title: 'Your predictions have been updated!',
                        template: 'Let\'s hope you do well!'
                    });

                    //changes have just been saved so no longer need this
                    SaveChanges.saveChangesNotNeeded();

                    //////debugger;
                    //Before returning to this screen, get updated user info (new predictions)
                    User.getUserData(user).then(function(){
                        //Now the round tab should reflect updated round predictions

                        //if user first time sign in - re-enable
                        ////debugger;
                        //console.log(User.tutorialSeenCount());
                        if (User.firstTimeSignIn() && (User.tutorialSeenCount() < 2)){
                            User.showTutorials();
                        }

                        //Return to home screen
                        $state.go('tab.rounds', {reload : true});
                    });
                });
            }
        };

        $scope.predictHomeWin = function (fixture) {
            ////debugger;
            //console.log("Predict home win");

            var result = _getFixResult(fixture._id);

            if ((fixture.status != 'Complete') && (_predictionDiffCheck(fixture._id, 1) && (result == 0))) {
                _addFixturePrediction(fixture._id, 1);
            }
        };

        $scope.predictAwayWin = function (fixture){
            ////debugger;

            var result = _getFixResult(fixture._id);

            console.log("Predict away win");
            if ((fixture.status != 'Complete') && (_predictionDiffCheck(fixture._id, 2) && (result == 0))) {
                _addFixturePrediction(fixture._id, 2);
            }
        };

        $scope.predictDraw = function (fixture) {
            console.log("Predict draw");

            ////debugger;

            var result = _getFixResult(fixture._id);

            if ((fixture.status != 'Complete') && (_predictionDiffCheck(fixture._id, 3) && (result == 0))) {
                _addFixturePrediction(fixture._id, 3);
            }
        };

        $scope.cardDestroyed = function (index) {
            ////debugger;
            $scope.currentCardIndex = index - 1;
            $scope.fixtures.splice(index, 1); //is this a reference to the same fixtures array!?
            _cardViewDoneCheck();
        };

        $scope.cardSwipedLeft = function (fixtureId) {
            //console.log('LEFT SWIPE - PREDICT HOME WIN');
            _addFixturePrediction(fixtureId, 1);
        };

        $scope.cardSwipedRight = function (fixtureId) {
            //console.log('RIGHT SWIPE - PREDICT AWAY WIN');
            _addFixturePrediction(fixtureId, 2);
        };

        $scope.cardTapped = function (fixtureId, index) {
            //console.log('PREDICT DRAW');
            //////debugger;
            ////debugger;
            _addFixturePrediction(fixtureId, 3);

            //console.log('Card tapped, button pressed: ' + $scope.dontSkip);


            $timeout(function () {
                //$scope.cardDestroyed(index);
                $scope.cardDestroyed(index);
            }, 500);

        };

        $scope.cardSkipped = function (index) {
            //console.log("SKIP FIXTURE - NO PREDICTION");

            //Retrieve the fixture at this index
            var fix = $scope.fixtures[index]._id;

            _addFixturePrediction(fix, 0);

            $timeout(function () { //timeout may not be necessary
                $scope.cardDestroyed(index);
            }, 500);
        };

        //fixture used to show a fixture fact when viewing cards
        $scope.showCardFixFact = function () {
            //simply show the first card
            $ionicPopup.alert({
                title: "Did You Know?",
                template: $scope.fixtures[$scope.fixtures.length - 1].fixtureFacts[0]
            });
        };

        $scope.showListFixFact = function (fixture) {
            $ionicPopup.alert({
                title: "Did You Know?",
                template: fixture.fixtureFacts[0]
            });

        };

        $scope.showTutorial = function() {
            //Show the tutorial pop up
            var tutorial = $ionicPopup.alert({
                title: "MAKING AND UPDATING PREDICTIONS, \n SIMPLE!",
                template: '<img class="tutorial-image" src=\'img/tutorial.png\'>',
                okText: 'GOT IT'
            });
        };

        $scope.showListTutorial = function() {
            //Show the tutorial pop up
            var tutorial = $ionicPopup.alert({
                title: "MAKING AND UPDATING PREDICTIONS, \n SIMPLE!",
                template: '<img class="tutorial-image" src=\'img/listsummodal.png\'>',
                okText: 'GOT IT'
            });
        }
    })

    .controller('LeaderboardCtrl', function ($scope, $state, auth, $ionicPopup, $ionicActionSheet, Leaderboard, SaveChanges) {

        //get all of the private leagues for the user from the private league service
        //call this  whenever the user's leagues need to be updated within the app
        function _getUserLeagues() {
            //////debugger;
            Leaderboard.overall(auth.profile.user_id, auth.profile.picture).then(function (data) {

                //Assign the season overall leaderboard data to a scope variable
                $scope.overallLeague = data;
                ////debugger;
                //console.log("The overall season league is: " + JSON.stringify($scope.overallLeague));

                //For each league will have to add data pertaining to logged in user to scope manually
                for (var i = 0; i < $scope.overallLeague.length; i++) {
                    if ($scope.overallLeague[i].user_id == auth.profile.user_id) {
                        //then we have found the currently logged in user, add key to this object
                        $scope.overallLeague.thisUser = {};
                        $scope.overallLeague.thisUser = {
                            //need pts, username and pick
                            userSeasonPts: $scope.overallLeague[i].overallSeasonScore, //todo: assign round pts
                            userPos: i + 1,
                            userPic: auth.profile.picture
                            //userRdPts: globalLeagueData[i].roundScores
                        };

                        //console.log('LOGGED IN USER DATA IN GLOBAL LEAGUE IS: ' + JSON.stringify($scope.overallLeague.thisUser));
                        break;
                    }
                }

                ////debugger;
                //for debugging
                console.log('\nOVERALL LEAGUE BEFORE SORTING: ');
                for (var k = 0; k < $scope.overallLeague.length; k++){
                    console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.overallLeague[k].overallSeasonScore);
                };

                //Once iterated over all of the members, sort them based on score
                ////debugger;
                $scope.overallLeague = sortByKey($scope.overallLeague, 'overallSeasonScore');
                $scope.overallLeague.reverse();

                //for debugging
                console.log('\nOVERALL LEAGUE AFTER SORTING: ');
                for (var k = 0; k < $scope.overallLeague.length; k++){
                    console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.overallLeague[k].overallSeasonScore);
                };

                //////debugger;
                Leaderboard.all(auth.profile.user_id, auth.profile.picture).then(function (data) {
                    ////////debugger;
                    $scope.privateLeagues = data;
                    //console.log(data);
                    ////debugger;

                    for (var i = 0; i < $scope.privateLeagues.length; i++) {
                        //split league name into words, place in array
                        $scope.privateLeagues[i].privateLeagueName = $scope.privateLeagues[i].privateLeagueName.split(" ");

                        //for debugging
                        console.log('\nLEAGUE ' + i + ' BEFORE SORTING: ');
                        for (var k = 0; k < $scope.privateLeagues[i].members.length; k++){
                            console.log('OverallSeasonScore for member ' + k + ' is: ' + $scope.privateLeagues[i].members[k].overallSeasonScore);
                        };

                        //Once iterated over all of the members, sort them based on score
                        ////debugger;
                        $scope.privateLeagues[i].members = sortByKey($scope.privateLeagues[i].members, 'overallSeasonScore');
                        $scope.privateLeagues[i].members.reverse();

                        //for debugging
                        console.log('\nLEAGUE ' + i + ' AFTER SORTING: ');
                        for (var k = 0; k < $scope.privateLeagues[i].members.length; k++){
                            console.log('OverallSeasonScore for member ' + k + ' is: ' + $scope.privateLeagues[i].members[k].overallSeasonScore);
                        };
                    }
                });
            })
        }

        //when page first loads
        _getUserLeagues();

        //action sheet
        $scope.leagueOptions = function () {

            // Show the action sheet
            var hideSheet = $ionicActionSheet.show({
                buttons: [
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-plus\'></i><p>Create New League</p></div>'},
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-trophy\'></i><p>Join League (Use Code)</p></div>'},
                ],
                titleText: 'Private Leagues',
                cancelText: 'Cancel',
                cancel: function() {
                    // add cancel code..
                },
                buttonClicked: function(index) {

                    //0 index is to rename the league
                    switch(index) {
                        case 0:
                            $scope.createNewLeague();
                            return true;
                            break;
                        case 1:
                            $scope.joinLeagueWithCode();
                            return true;
                            break;
                        default:
                            return true;
                    }
                }
            });
        };

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
                            //console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'New Private League',
                                template: 'New league created!' //TODO: Alter the multiple uses of this
                            }).then(
                                function(){
                                    //reset flag
                                    cancelled = true;

                                    $state.go($state.current, {}, {reload: true});
                                }
                            );
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

                    //console.log("Now attempting validation before sending code");

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

                    //todo: Check that the user has not already joined this league!
                    for(var i = 0; i < $scope.privateLeagues.length; i++) {
                        if ($scope.data.leagueToJoin == $scope.privateLeagues[i].privateLeagueCode) {
                            //then invalid code was entered
                            $ionicPopup.alert({
                                title: 'Error! League Already Joined',
                                template: 'You are already part of the league you are attempting to join.'
                            });
                            return;
                        }
                    }

                    //use the data to call through to the user and pass through the provided username
                    Leaderboard.joinLeagueWithCode(auth.profile.user_id, $scope.data.leagueToJoin).then(
                        function (res) {

                            //check the message that was returned...
                            //console.log(res);

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

                            //console.log("Now attempting to refresh the page");

                            //_getUserLeagues();
                            $state.go($state.current, {}, {reload: true});

                        }
                    );
                }
            });
        };

        function sortByKey(array, key) {
            return array.sort(function(a, b) {
                var x = a[key]; var y = b[key];
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
        };
    })

    .controller('LeaderboardLeagueDetailCtrl', function ($scope, auth, $stateParams, $ionicPopup, $state,
                                                         $cordovaSocialSharing ,$ionicActionSheet, User, Leaderboard, SaveChanges) {
        $scope.shouldShowDelete = false;
        $scope.currentRound = Leaderboard.getCurrentRound();
        //console.log($scope.currentRound);
        ////debugger;
        $scope.roundDates = Leaderboard.getRoundDates();
        $scope.roundInView = 'OVERALL SEASON'; //0 represents overall season round
        var _membersToDelete = [];
        $scope.newCaptainId = null;
        $scope.newViceCaptainId = null;
        $scope.currentUser = auth.profile;

        //enable delete buttons
        $scope.toggleDelete = function () {
            $scope.shouldShowDelete = !$scope.shouldShowDelete;
        };

        //console.log('Now getting the private league with id: ' + $stateParams.privateLeagueId);//Get the data for this particular league from the server
        //Get the data for this particular round from the server

        //call this functino whenever the private leage data needs to be refreshed
        function _getPrivateLeagueData() {

            if ($stateParams.privateLeagueId == 'global') {
                //Get the data for scores for gloabl leaderboard
                Leaderboard.overall().then(function (data) {

                    ////debugger;

                    //console.log("DATA RETRIEVED FOR THE GLOBAL LEAGUE IS: " + JSON.stringify(data));
                    $scope.privateLeague = {};
                    $scope.privateLeague.members = data;
                    $scope.privateLeague.privateLeagueName = 'Global League';


                    //iterate over members check if we are viewing overall season or round
                    for (var i = 0; i < $scope.privateLeague.members.length; i++){
                        //we are looking at a round, so organise
                        //iterate over round scores
                        if ($scope.roundInView.roundNo == 'OVERALL SEASON') {
                            $scope.privateLeague.members[i].roundInViewScore = $scope.privateLeague.members[i].overallSeasonScore;
                        } else {

                            var roundScoreSet = false;

                            for (var j = 0; j < $scope.privateLeague.members[i].roundScores.length; j++){
                                if ($scope.privateLeague.members[i].roundScores[j].roundNo == $scope.roundInView.roundNo.replace('Round ', '')) {
                                    //assign the score for the round in the current view to the member
                                    $scope.privateLeague.members[i].roundInViewScore = $scope.privateLeague.members[i].roundScores[j].roundScore;

                                    //break out of the inner loop and get next member
                                    break;
                                }
                            }

                            //if the user has not broken out of this loop by this point, assign 0
                            if (!roundScoreSet) {
                                $scope.privateLeague.members[i].roundInViewScore = 0;
                            }
                        }
                    }

                    //for debugging
                    console.log('\nOVERALL LEAGUE BEFORE SORTING: ');
                    for (var k = 0; k < $scope.privateLeague.members.length; k++){
                        console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.privateLeague.members[k].roundInViewScore);
                    };

                    //Once iterated over all of the members, sort them based on score
                    ////debugger;
                    $scope.privateLeague.members = sortByKey($scope.privateLeague.members, 'roundInViewScore');
                    $scope.privateLeague.members.reverse();

                    //for debugging
                    console.log('\nOVERALL LEAGUE AFTER SORTING: ');
                    for (var k = 0; k < $scope.privateLeague.members.length; k++){
                        console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.privateLeague.members[k].roundInViewScore);
                    };
                });
            } else {
                Leaderboard.get(auth.profile.user_id, $stateParams.privateLeagueId).then(function (data) {

                    ////debugger;

                    //$ionicLoading.hide();
                    $scope.privateLeague = data;
                    //$scope.privateLeague.privateLeagueName =  Array.prototype.join.call($scope.privateLeague.privateLeagueName, ' ');
                    //console.log('Retrieved private league:' + JSON.stringify($scope.privateLeague));

                    //iterate over members check if we are viewing overall season or round
                    for (var i = 0; i < $scope.privateLeague.members.length; i++){
                        //we are looking at a round, so organise
                        //iterate over round scores
                        if ($scope.roundInView.roundNo == 'OVERALL SEASON') {
                            $scope.privateLeague.members[i].roundInViewScore = $scope.privateLeague.members[i].overallSeasonScore;
                        } else {
                            var roundScoreSet = false;
                            for (var j = 0; j < $scope.privateLeague.members[i].roundScores.length; j++){
                                if ($scope.privateLeague.members[i].roundScores[j].roundNo == $scope.roundInView.roundNo.replace('Round ', '')) {
                                    //assign the score for the round in the current view to the member
                                    $scope.privateLeague.members[i].roundInViewScore = $scope.privateLeague.members[i].roundScores[j].roundScore;

                                    //break out of the inner loop and get next member
                                    break;
                                }
                            }

                            //if the user has not broken out of this loop by this point, assign 0
                            if (!roundScoreSet) {
                                $scope.privateLeague.members[i].roundInViewScore = 0;
                            }
                        }
                    }

                    //Once iterated over all of the members, sort them based on score
                    ////debugger;
                    ////debugger;
                    $scope.privateLeague.members = sortByKey($scope.privateLeague.members, 'roundInViewScore');
                    $scope.privateLeague.members.reverse();

                    //for debugging
                    for (var k = 0; k < $scope.privateLeague.members.length; k++){
                        console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.privateLeague.members[k].roundInViewScore);
                    };
                });
            }
        }

        //when first loading in the tab, get league data
        _getPrivateLeagueData();


        //TODO: GO BACK AND ONLY EXPOSE DATA TO THE SCOPE VIA A DATA OBJECT IN THE SAME MANNER AS THIS
        //create scope variable to store provided usernames
        $scope.data = {};
        $scope.user_id = auth.profile.user_id;

        var cancelled = true;

        $scope.editLeague = function () {

            // Show the action sheet
            var hideSheet = $ionicActionSheet.show({
                buttons: [
                    { text: "<div class=\'league-edit-btn share-edit-btn\'><i class=\'icon ion-share\'></i><div class='share-text-container'><p class='share-label'>Invite Friends</p><p class='share-explanation'>*Friends can join this league using league code: " + $scope.privateLeague.privateLeagueCode + "</p></div></div>"},
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-edit\'></i><p>Rename League</p></div>'},
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-person\'></i><p>Choose Captain</p></div>'},
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-person-stalker\'></i><p>Choose Vice Captain</p></div>'},
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-log-out\'></i><p>Leave Private League</p></div>'},
                    { text: '<div class=\'league-edit-btn\'><i class=\'icon ion-trash-a\'></i><p>Delete Members</p></div>'},
                ],
                destructiveText: 'Delete League',
                titleText: 'Private League Options',
                cancelText: 'Cancel',
                cancel: function() {
                    // add cancel code..
                },
                destructiveButtonClicked: function() {
                    if (auth.profile.user_id == $scope.privateLeague.captain) {
                        $scope.deleteLeague();
                    } else {
                        //then this user has already been invited
                        $ionicPopup.alert({
                            title: 'Access Denied!',
                            template: 'To delete this league you must be a team captain'
                        });
                    }
                    return true;
                },
                buttonClicked: function(index) {

                    //0 index is to rename the league
                    ////debugger;
                    switch(index) {
                        case 0:
                            $scope.shareLeague();
                            return true;
                            break;
                        case 1:
                            //console.log("The league captain is: " + $scope.privateLeague.captain);
                            if (auth.profile.user_id == $scope.privateLeague.captain) {
                                $scope.renameLeague();
                                return true;
                            } else {
                                //then this user has already been invited
                                $ionicPopup.alert({
                                    title: 'Access Denied!',
                                    template: 'To rename this league you must be a team captain'
                                });
                                return true;
                            }
                            break;
                        case 2:
                            if (auth.profile.user_id == $scope.privateLeague.captain && $scope.privateLeague.members.length > 1) {
                                $scope.changeLeagueCaptain();
                                return true;
                            } else if (auth.profile.user_id != $scope.privateLeague.captain) {
                                $ionicPopup.alert({
                                    title: 'Access Denied!',
                                    template: 'To choose a new captain for this league you must be a team captain'
                                });
                                return true
                            } else if ($scope.privateLeague.members.length == 1) {
                                $ionicPopup.alert({
                                    title: 'There\'s no one here!',
                                    template: 'To choose a new captain for this league there need to be other members!'
                                });
                                return true
                            }
                            break;
                        case 3:
                            if ((auth.profile.user_id == $scope.privateLeague.captain || auth.profile.user_id == $scope.privateLeague.viceCaptain) && $scope.privateLeague.members.length > 1) {
                                $scope.changeLeagueViceCaptain();
                                return true;
                            } else if (auth.profile.user_id != $scope.privateLeague.captain && auth.profile.user_id != $scope.privateLeague.viceCaptain) {
                                $ionicPopup.alert({
                                    title: 'Access Denied!',
                                    template: 'To choose a new captain for this league you must be a team captain.'
                                });
                                return true
                            } else if ($scope.privateLeague.members.length == 1) {
                                $ionicPopup.alert({
                                    title: 'There\'s no one here!',
                                    template: 'To choose a new captain for this league there need to be other members!'
                                });
                                return true
                            }
                            break;
                        case 4:
                            if (!(auth.profile.user_id == $scope.privateLeague.captain || auth.profile.user_id == $scope.privateLeague.viceCaptain)) {
                                $scope.leaveLeague();
                                return true;
                            } else {
                                //then this user has already been invited
                                $ionicPopup.alert({
                                    title: 'You\'re a captain!',
                                    template: 'To leave this league you must not be a team captain. \n' +
                                    'Make someone else one of the captains in your place!'
                                });
                                return true
                            }
                            break;
                        case 5:
                            //to delete members must be captain or vice captain and have more than one member
                            if ((auth.profile.user_id == $scope.privateLeague.captain || auth.profile.user_id == $scope.privateLeague.viceCaptain) && ($scope.privateLeague.members.length > 1)) {
                                $scope.deleteMembers();
                                return true;
                            } else {
                                //then this user has already been invited
                                $ionicPopup.alert({
                                    title: 'Access Denied!',
                                    template: 'To delete members you must be a team captain and well... have members!'
                                });
                                return true;
                            }
                            break;
                        default:
                            return true;
                    }
                }
            });
        };

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

                    //console.log("Now attempting validation before renaming");

                    //console.log("The captain of the private league is: " + $scope.privateLeague.captain);

                    //check that the user has not attempted to invite themselves
                    if ($scope.data.newLeagueName == $scope.privateLeague.privateLeagueName) {
                        //console.log("The username of the captain of the private league is: " + $scope.privateLeague.captain);
                        //console.log("You can only rename the league if you are giving it a new name.");

                        //then this user has already been invited
                        $ionicPopup.alert({
                            title: 'Error! League not renamed!',
                            template: 'To rename this league you must give it a new name.'
                        });

                        return
                    }

                    //use the data to call through to the user and pass through the provided username
                    Leaderboard.renameLeague(auth.profile.user_id, $scope.data.newLeagueName, $scope.privateLeague.privateLeagueId).then(
                        function (res) {

                            //check the message that was returned...
                            //console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'Rename',
                                template: 'League renamed!'
                            });

                            //reset flag
                            cancelled = true;

                            //Refresh the name of the league as stored on the server
                            _getPrivateLeagueData();

                            myPopup.close();

                            //Go back to the private league overview and force a refresh
                            $state.go('tab.leaderboard', {}, {reload: true});
                        }
                    );
                }
            });
        };

        $scope.leaveLeague = function () {
            ////debugger;

            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.confirm({
                title: 'Confirm Leaving',
                template: 'Are you sure you want to leave this private league?'
            });
            myPopup.then(function (res) {
                if (res) {
                    //use the data to call through to the user and pass through the provided username
                    Leaderboard.leaveLeague(auth.profile.user_id, $scope.privateLeague.privateLeagueId).then(
                        function (res) {
                            //check the message that was returned...
                            //console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'League Left',
                                template: 'The private league was left successfully!'
                            });

                            //update the local user data
                            User.getUserData();

                            //take the user back to the list of private leagues
                            //Go back to the private league overview and force a refresh
                            $state.go('tab.leaderboard', {}, {reload: true});
                        }
                    );
                }
            });
        };

        $scope.changeLeagueCaptain = function() {

            ////debugger;

            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.show({
                //templateUrl: '/templates/changeCaptain.html',
                template: "<div class=\"list\"><label ng-repeat=\"member in privateLeague.members track by $index\" class=\"item item-radio\" ng-if=\"member.user_id != privateLeague.captain && member.user_id != privateLeague.viceCaptain\"> <input ng-click=\"chooseNewCaptain(member.user_id)\" type=\"radio\" name=\"group\"> <div class=\"item-content\"> <img class=\"user-pic\" ng-if=\"member.pic != null\" ng-src=\"{{member.pic}}\">{{member.username}} </div> <i class=\"radio-icon ion-checkmark\"></i> </label> </div>",
                title: 'Choose New Captain',
                subTitle: 'Choose a league member to become the new captain.',
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel'
                    },
                    {
                        text: '<b>Choose</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if ($scope.newCaptainId == null) {
                                //don't allow the user to close unless he enters a username
                                e.preventDefault();
                            } else {
                                cancelled = false;
                                return;
                            }
                        }
                    }
                ]
            });
            myPopup.then(function (res) {

                if (!cancelled) {
                    var myPopup = $ionicPopup.confirm({
                        title: 'Confirm Captain Change',
                        template: 'Are you sure you want to make the selected member league captain? You\'ll just become an ordinary league member!'
                    });
                    myPopup.then(function (res) {
                        if (res) {

                            //console.log(\"Attempting to make member captain: " + JSON.stringify($scope.newCaptain));

                            //use the data to call through to the user and pass through the provided username
                            Leaderboard.changeCaptain(auth.profile.user_id, $scope.newCaptainId, $scope.privateLeague.privateLeagueId).then(
                                function (res) {
                                    //check the message that was returned...
                                    //console.log(res);

                                    //Confirm that the invitation has been sent
                                    $ionicPopup.alert({
                                        title: 'New Captain Chosen!',
                                        template: 'The member was made the captain of the league successfully!'
                                    });

                                    //Reset the list of members to be deleted
                                    $scope.newCaptainId = null;

                                    //Reload the information for this private league
                                    //_getPrivateLeagueData();

                                    //Refresh the tab
                                    $state.go($state.current, {}, {reload: true});
                                }
                            );
                        }
                    });
                }
            });
        };

        $scope.changeLeagueViceCaptain = function() {

            ////debugger;

            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.show({
                //templateUrl: '/templates/changeViceCaptain.html',
                template: "<div class=\"list\"><label ng-repeat=\"member in privateLeague.members track by $index\" class=\"item item-radio\" ng-if=\"member.user_id != privateLeague.captain && member.user_id != privateLeague.viceCaptain\"> <input ng-click=\"chooseNewViceCaptain(member.user_id)\" type=\"radio\" name=\"group\"> <div class=\"item-content\"> <img class=\"user-pic\" ng-if=\"member.pic != null\" ng-src=\"{{member.pic}}\">{{member.username}} </div> <i class=\"radio-icon ion-checkmark\"></i></label></div>",
                title: 'Choose New Vice Captain',
                subTitle: 'Choose a league member to become the new vice captain.',
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel'
                    },
                    {
                        text: '<b>Choose</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if ($scope.newViceCaptainId == null) {
                                //don't allow the user to close unless he enters a username
                                e.preventDefault();
                            } else {
                                cancelled = false;
                                return;
                            }
                        }
                    }
                ]
            });
            myPopup.then(function (res) {

                if (!cancelled) {
                    var myPopup = $ionicPopup.confirm({
                        title: 'Confirm Vice Captain Change',
                        template: 'Are you sure you want to make the selected member league vice captain?' +
                        ' If you\'re the vice captain, you\'ll just become an ordinary league member!'
                    });
                    myPopup.then(function (res) {
                        if (res) {

                            ////debugger;

                            //console.log("Attempting to make member captain: " + JSON.stringify($scope.newViceCaptain));

                            //use the data to call through to the user and pass through the provided username
                            Leaderboard.changeViceCaptain(auth.profile.user_id, $scope.newViceCaptainId, $scope.privateLeague.privateLeagueId).then(
                                function (res) {
                                    //check the message that was returned...
                                    //console.log(res);

                                    //Confirm that the invitation has been sent
                                    $ionicPopup.alert({
                                        title: 'New Vice Captain Chosen!',
                                        template: 'The member was made the vice captain of the league successfully!'
                                    });

                                    //Reset the list of members to be deleted
                                    $scope.newViceCaptainId = null;

                                    //Reload the information for this private league
                                    //_getPrivateLeagueData();

                                    //Refresh the tab
                                    $state.go($state.current, {}, {reload: true});
                                }
                            );
                        }
                    });
                }
            });
        };

        $scope.deleteMembers = function() {
            //show the user a prompt to type in a username and
            var myPopup = $ionicPopup.show({
                //templateUrl: '../templates/deleteMembers.html',
                template: "<ul class=\"list\"><li ng-repeat=\"member in privateLeague.members track by $index\" ng-if=\"member.user_id != privateLeague.creator && member.user_id != privateLeague.captain && member.user_id != privateLeague.viceCaptain && member.user_id != currentUser.user_id\" class=\"item item-checkbox\"><label class=\"checkbox\"><input ng-click=chooseMemberToDelete(member.user_id) type=\"checkbox\"></label>{{member.username}}</li></ul>",
                title: 'Delete League Members',
                subTitle: 'Choose members to delete from the league',
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel',
                        onTap: function(e){
                            _membersToDelete = [];
                            return;
                        }
                    },
                    {
                        text: '<b>Delete</b>',
                        type: 'button-assertive',
                        onTap: function (e) {
                            if (_membersToDelete.length == 0) {
                                //don't allow the user to close unless he enters a username
                                e.preventDefault();
                            } else {
                                cancelled = false;
                                return;
                            }
                        }
                    }
                ]
            });
            myPopup.then(function (res) {

                if (!cancelled) {
                    var myPopup = $ionicPopup.confirm({
                        title: 'Confirm Deletion',
                        template: 'Are you sure you want to remove the selected member(s) from this private league?'
                    });
                    myPopup.then(function (res) {
                        if (res) {

                            //console.log("Attempting to delte members: " + JSON.stringify(_membersToDelete));

                            //use the data to call through to the user and pass through the provided username
                            Leaderboard.deleteMembers(auth.profile.user_id, _membersToDelete, $scope.privateLeague.privateLeagueId).then(
                                function (res) {
                                    //check the message that was returned...
                                    //console.log(res);

                                    //Confirm that the invitation has been sent
                                    $ionicPopup.alert({
                                        title: 'Member(s) Deleted',
                                        template: 'The member was removed from the league successfully!'
                                    });

                                    //Reset the list of members to be deleted
                                    _membersToDelete = [];

                                    //update the local user data
                                    User.getUserData();

                                    //_getPrivateLeagueData();

                                    //Refresh the tab
                                    $state.go($state.current, {}, {reload: true});
                                }
                            );
                        }
                    });
                }
            });
        };

        $scope.chooseMemberToDelete = function(memberUserId) {
            //console.log("Adding user with id %s to list of members to delete", memberUserId);
            _membersToDelete.push(memberUserId);
            //console.log("List of members to delete is: " + JSON.stringify(_membersToDelete));
        };

        $scope.chooseNewViceCaptain = function(newViceCaptainId) {
            $scope.newViceCaptainId = newViceCaptainId;
        };

        $scope.chooseNewCaptain = function(newCaptainId) {
            $scope.newCaptainId = newCaptainId;
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
                    if (!$scope.user_id == $scope.privateLeague.captain) {
                        //console.log("The username of the captain of the private league is: " + $scope.privateLeague.captain);
                        //console.log("Only the captain of a league can delete it!.");

                        //then this user has already been invited
                        $ionicPopup.alert({
                            title: 'Error! League not deleted!',
                            template: 'To delete this league you must have created it.'
                        });

                        return
                    }

                    //use the data to call through to the user and pass through the provided username
                    Leaderboard.deleteLeague(auth.profile.user_id, $scope.privateLeague.privateLeagueId).then(
                        function (res) {
                            //check the message that was returned...
                            //console.log(res);

                            //Confirm that the invitation has been sent
                            $ionicPopup.alert({
                                title: 'Deleted',
                                template: 'The private league was deleted successfully!'
                            });

                            //take the user back to the list of private leagues
                            $state.go('tab.leaderboard', {}, {reload: true});
                        }
                    );
                }
            });
        };

        $scope.shareLeague = function () {
            //console.log("Share functin invoked.");
            $cordovaSocialSharing.share("Yes! Get In!  The new way to play fantasy football. Download the app, available on Android and iOS, to join my league with code: " + $scope.privateLeague.privateLeagueCode + "\n", null, null, "http://www.yesgetin.com");
        };

        $scope.memberRoundScore = function(memberIndex) {
            //console.log("ROUND IN VIEW IS: " + JSON.stringify($scope.roundInView));
            var i = 0;
            for (var i = 0; i < $scope.privateLeague.members[memberIndex].roundScores.length; i++) {
                if ($scope.privateLeague.members[memberIndex].roundScores[i].roundNo == $scope.roundInView.roundNo.replace('Round ', '')) {
                    //console.log('MEMBER ROUND SCORE IS: '
                    //    + $scope.privateLeague.members[memberIndex].roundScores[i].roundScore);
                    return $scope.privateLeague.members[memberIndex].roundScores[i].roundScore;
                }
            }
            return 0; //if no other thing returned
        };

        //updated the round in view score on members to enable angular to sort it
        $scope.reOrderMembers = function(){

            ////debugger;

            //iterate over members check if we are viewing overall season or round
            for (var i = 0; i < $scope.privateLeague.members.length; i++){
                //we are looking at a round, so organise
                //iterate over round scores
                if ($scope.roundInView.roundNo == 'OVERALL SEASON') {
                    $scope.privateLeague.members[i].roundInViewScore = $scope.privateLeague.members[i].overallSeasonScore;
                } else {
                    var roundScoreSet = false;
                    for (var j = 0; j < $scope.privateLeague.members[i].roundScores.length; j++){
                        if ($scope.privateLeague.members[i].roundScores[j].roundNo == $scope.roundInView.roundNo.replace('Round ', '')) {
                            //assign the score for the round in the current view to the member
                            $scope.privateLeague.members[i].roundInViewScore = $scope.privateLeague.members[i].roundScores[j].roundScore;

                            roundScoreSet = true;
                            //break out of the inner loop and get next member
                            break;
                        }
                    }
                    //if the user has not broken out of this loop by this point, assign 0
                    if (!roundScoreSet) {
                        $scope.privateLeague.members[i].roundInViewScore = 0;
                    }
                }
            }

            //for debugging
            console.log('\nROUND VIEW BEFORE SORTING: ');
            for (var k = 0; k < $scope.privateLeague.members.length; k++){
                console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.privateLeague.members[k].roundInViewScore);
            };

            //Once iterated over all of the members, sort them based on score
            ////debugger;
            $scope.privateLeague.members = sortByKey($scope.privateLeague.members, 'roundInViewScore');
            $scope.privateLeague.members.reverse();

            //for debugging
            console.log('\nROUND VIEW AFTER SORTING: ');
            for (var k = 0; k < $scope.privateLeague.members.length; k++){
                console.log('RoundInViewScore for member ' + k + ' is: ' + $scope.privateLeague.members[k].roundInViewScore);
            };
        };

        function sortByKey(array, key) {
            return array.sort(function(a, b) {
                var x = a[key]; var y = b[key];
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
        };
    })

    .controller('RulebookCtrl', function($scope, $state, SaveChanges) {

        //$state.go('tab.rulebook.win');
        $state.go('tab.rulebook.summary');
    })

    .controller('SettingsCtrl', function ($scope, $location, store, $state, User, auth, $ionicPopup, Leaderboard, SaveChanges, $ionicDeploy, $ionicLoading) {

        //hopefully this should get run every time the user navigates to this tab
        User.getUserData(auth.profile.user_id);
        $scope.userData = User.currentUser();
        $scope.userData.userTeam = User.filterTeam($scope.userData.userTeam);

        $scope.signOut = function () {

            //clear the stored user data in out service
            User.clearCurrentUser();

            //call the signout method on the auth service
            auth.signout();
            store.remove('profile');
            store.remove('token');
            store.remove('refreshToken');

            //need to manually display the login screen again
            auth.signin({
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

            }, function (profile, id_token, access_token, state, refresh_token) {
                // Login was successful
                store.set('profile', profile);
                store.set('token', id_token);
                store.set('refreshToken', refresh_token);
                $location.path('/');

                //check to see if this user exists on the server already, if not, create this user using auth0 details
                //////debugger;
                User.sync(auth.profile).then(function () {
                    //Once the user data has been synced, get the user data object from our server also
                    //Have to do in this callback otherwise we attempt to get the user data before the sync has finished
                    //console.log('Logging in after logging out and sending user_id: ' + auth.profile.user_id);
                    User.getUserData(auth.profile.user_id).then(function (results) {
                        //console.log("Getting the current user data from our server... : " + JSON.stringify(User.currentUser()));

                        //expose the user's invitations to the scope
                        $scope.userData = User.currentUser();

                        //////debugger;

                        //console.log("Invitations are: " + $scope.userData.invitations);
                        //console.log("Notifications are: " + $scope.userData.notifications);

                        $state.go('tab.rounds');

                        //show an alert for testing purposes
                        $ionicPopup.alert({
                            title: 'Login successful!',
                            template: 'Welcome ' + auth.profile.nickname + '!'
                        }).then(function (res) {
                            //console.log(auth.profile);
                        });
                    });
                });
            }, function (error) {
                // Oops something went wrong during login:
                //console.log("There was an error logging in", error);
            });
        };

        $scope.teams =
            [
                'Arsenal',
                'Aston Villa',
                'Bournemouth',
                'Chelsea',
                'Crystal Palace',
                'Everton',
                'Leicester City',
                'Liverpool',
                'Manchester City',
                'Manchester United',
                'Newcastle United',
                'Norwich City',
                'Southampton',
                'Stoke City',
                'Sunderland',
                'Swansea City',
                'Tottenham Hotspur',
                'Watford',
                'West Bromwich Albion',
                'West Ham United',
                'z0ther'
            ];

        $scope.updateTeam = function() {
            User.updateTeam(auth.profile.user_id, $scope.userData.userTeam).then(
                function(response, error) {
                    if (error) {
                        $ionicPopup.alert({
                            title : 'Something went wrong, try again',
                            template: 'Oops!'
                        });
                    } else {
                        $ionicPopup.alert({
                            title: 'Team Updated',
                            template: 'Your team has now been updated!'
                        });

                        User.getUserData(auth.profile.user_id).then(function() {
                            $scope.userData = User.currentUser();

                            $state.go('tab.settings', {refresh: true})
                        });
                    }
                }
            );
        }

        $scope.sendSupportEmail = function() {
            console.log("Support link clicked");

            //window.plugins.emailComposer.showEmailComposerWithCallback(
            //    function(result) {
            //        console.log("Response -> " + result);
            //    },
            //    "App Support or Feedback", // Subject
            //    "Hi! \n I'd like support with the Yes! Get In! app. \n " +
            //    + "I'm sending this email from: \n" +
            //    + "\tDevice: " + $cordovaDevice.getDevice()
            //    + "\n\tModel: " + $cordovaDevice.getModel()
            //    + "\n\tPlatform: " + $cordovaDevice.getPlatform()
            //    + "\n\tCordova Version: " + $cordovaDevice.getCordova()
            //    +"(Insert your message below):",// Body
            //    ["info@yesgetin.com"],    // To
            //    null,                    // CC
            //    null,                    // BCC
            //    false,                   // isHTML
            //    null,                    // Attachments
            //    null                    // Attachment Data
            //);

            if(window.plugins && window.plugins.emailComposer) {
                window.plugins.emailComposer.showEmailComposerWithCallback(function(result) {
                        console.log("Response -> " + result);
                    },
                    "Feedback for your App", // Subject
                    "",                      // Body
                    ["test@example.com"],    // To
                    null,                    // CC
                    null,                    // BCC
                    false,                   // isHTML
                    null,                    // Attachments
                    null);                   // Attachment Data
            }
        }

        $scope.checkForUpdates = function() {
            // Check Ionic Deploy for new code
            console.log('Ionic Deploy: Checking for updates');
            $ionicDeploy.check().then(
                function(hasUpdate) {
                    console.log('Ionic Deploy: Update available: ' + hasUpdate);

                    $ionicPopup.confirm({
                        title: 'Updates Available',
                        template: 'Would you like to apply the updates?'
                    }).then(
                        function(res) {
                            if(res) {
                                console.log('Attempting to update.');

                                $ionicLoading.show(
                                    {
                                        template: 'Updating... <ion-spinner></ion-spinner>'
                                    }
                                );

                                $ionicDeploy.update().then(
                                    function(res) {
                                        console.log('Ionic Deploy: Update Success! ', res);

                                        $ionicLoading.hide();

                                        $ionicPopup.alert(
                                            {
                                                title: 'Update Successful',
                                                template: 'The latest updates were applied successfully.'
                                            }
                                        );
                                    },
                                    function(err) {
                                        console.log('Ionic Deploy: Update error! ', err);

                                        $ionicPopup.alert(
                                            {
                                                title: 'Something went wrong...',
                                                template: 'Update failed with error: ' + err
                                            }
                                        );
                                    },
                                    function(prog) {
                                        console.log('Ionic Deploy: Progress... ', prog);

                                    }
                                );
                            } else {
                                console.log('Not updating, resuming execution.');
                            }
                        }
                    );
                }, function(err) {
                    console.error('Ionic Deploy: Unable to check for updates', err);

                    $ionicPopup.alert(
                        {
                            title: 'Something went wrong...',
                            template: 'Checking for updates failed with error: ' + err
                        }
                    );
                }
            );
        }
    })

    .controller('SignUpCtrl', function ($scope, $timeout, $location, store, $state, User, auth, $ionicPopup, Leaderboard, SaveChanges) {

        //When the user taps the sign up button show the Auth0 lock widget.
        $scope.logIn = function () {
            $state.go('login');
        }
    });

