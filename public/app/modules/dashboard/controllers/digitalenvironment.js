/* Function for updating the devices with its subsystems
 * @parameters: String: device and subsystem (both gotten from the current saved model),
 *              Integer: currentAmountSubsystems (Used as key for the new subsystem) 
 * @return: void, the function just updates the database
 */
function updateDevicesWithSubsystems(savedModel, device, subsystem, latitude, longitude) { //add current one
    const auxDevSub = {};
    const auxLoc = {};
    const refDevicesWithSubsystems = firebase.database().ref(`devicesWithSubsystems/${savedModel}/${device}`);
    
    console.log('ref: ', refDevicesWithSubsystems);

    console.log('subsystem: ', subsystem);
    console.log(latitude);
    auxLoc.locationX = latitude;
    console.log(auxLoc);
    auxLoc.locationY = longitude;
    console.log('LOCATION OBJ: ', auxLoc);
    auxDevSub[subsystem] = auxLoc;
    //auxDevSub[subsystem].update(auxLoc);
    refDevicesWithSubsystems.update(auxDevSub);
}

dashboard.controller("digitalenvironmentController", ['$rootScope', '$scope', '$state', '$location', 'dashboardService', 'Flash','$firebaseArray','$firebaseObject','notification',
function ($rootScope, $scope, $state, $location, dashboardService, Flash, $firebaseArray, $firebaseObject, notification) {
    var vm = this;

    var ref = firebase.database().ref('models/');
    var modelList = $firebaseArray(ref);
    modelList.$loaded().then(() => {
        //console.log(modelList)
        $scope.models = modelList;
    });

      $scope.modal = function (model) {
          var ref = firebase.database().ref(`images/${model.imageFile}`);
          var imageObj = $firebaseObject(ref);
          imageObj.$loaded().then(function(){
              //console.log("image");
              //console.log(imageObj)
              $scope.imagemodel = imageObj.$value;
              $scope.modalmodel = model;
              //console.log($scope.modalmodel);
          });
      }
    }]);
