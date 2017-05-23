
var dashboard = angular.module('dashboard', ['ui.router', 'ngAnimate','ngMaterial','firebase']);

dashboard.factory('notification', function($firebaseArray, $firebaseObject) {

  return {

    send: function(message, user) {
      var ref = firebase.database().ref('users/'+user)
      var userDB = $firebaseObject(ref);
      userDB.$loaded().then(function(){
          userDB.haveNotification = true;
          userDB.$save().then(function(ref) {

          }, function(error) {
              console.log("Error:", error);
          });

      })


      var ref = firebase.database().ref('notifications/');

      var notificationsList = $firebaseArray(ref);
      notificationsList.$loaded().then(function(){
        var notificationAdd = {'user': user, 'message': message}
        notificationsList.$add(notificationAdd).then(function(ref) {

        });
      });
    }
  }

});

dashboard.config(["$stateProvider", function ($stateProvider) {


  $stateProvider.state('app.myaccount', {
    url: '/myaccount',
    templateUrl: 'app/modules/dashboard/views/myaccount.html',
    controller: 'myaccountController',
    controllerAs: 'vm',
    data: {
      pageTitle: 'My Account'
    }
  });


  $stateProvider.state('app.mybelongings', {
    url: '/mybelongings',
    templateUrl: 'app/modules/dashboard/views/mybelongings.html',
    controller: 'mybelongingsController',
    controllerAs: 'vm',
    data: {
      pageTitle: 'My belongings'
    }
  });

  $stateProvider.state('app.addbelonging', {
    url: '/addbelonging',
    templateUrl: 'app/modules/dashboard/views/addbelonging.html',
    controller: 'addbelongingController',
    controllerAs: 'vm',
    data: {
      pageTitle: 'Adicionar model'
    }
  });

  $stateProvider.state('app.search', {
    url: '/search',
    templateUrl: 'app/modules/dashboard/views/search.html',
    controller: 'searchController',
    controllerAs: 'vm',
    data: {
      pageTitle: 'Search'
    }
  });

  $stateProvider.state('app.digitalenvironment', {
    url: '/digitalenvironment',
    templateUrl: 'app/modules/dashboard/digital_environment/src/main/resources/templates/index.html',
    controller: 'digitalenvironmentController',
    controllerAs: 'vm',
    data: {
      pageTitle: 'Digital Environment'
    }
  });


}]);
