(function(){

var app = angular.module("cafe" , ['ui.router','ngStorage']);

var graphUrl = "https://graph.facebook.com/v2.3/";

app.config(function($stateProvider, $urlRouterProvider) {
  //
  // For any unmatched url, redirect to /state1
  $urlRouterProvider.otherwise("/main");
  //
  // Now set up the states
  $stateProvider
    .state('main', {
      url: "/main",
      templateUrl: "tmpls/main.html",
      controller: "orderCtrl"
    })
    .state('order', {
      url: "/order",
      templateUrl: "tmpls/order.html",
      controller: "orderCtrl"
    })
    .state('fainon', {
      url: "/fainon",
      templateUrl: "tmpls/fainon.html",
      controller: "orderCtrl"
    });
});

app.run(function($rootScope, $localStorage) {
    if( $localStorage.user ){
      $rootScope.$apply(function(){
            $rootScope.loggedIn = true;
            window.AzureClient.currentUser = $localStorage.user;
            $rootScope.user = window.AzureClient.currentUser;
            $rootScope.fbdata = $localStorage.fbdata;
            $rootScope.fbtoken = $localStorage.fbtoken;  
            $rootScope.fbpicsrc = $localStorage.fbpicsrc;
      });
    }
    // RootScope
    $rootScope.login = function () {
      window.AzureClient.login("facebook").then(function () {
          $rootScope.$apply(function(){
              $rootScope.loggedIn = true;
              $rootScope.user = window.AzureClient.currentUser;
              $localStorage.user = window.AzureClient.currentUser;
          });
      }, function(error){
            alert(error);
      }).then(function () {
        return window.AzureClient.invokeApi("Helpers/facebook/token", {body :null , method : "get"});
      }).then(function (res) {
        $localStorage.fbtoken = res.result.accessToken;
        return res.result.accessToken;
      }).then(function(token){
        return $.get("https://graph.facebook.com/v2.3/me?access_token="+token);
      }).then(function (data) {
        $rootScope.$apply(function(){
          $localStorage.fbdata = data;
          $rootScope.fbdata = data;  
          $localStorage.fbpicsrc = "https://graph.facebook.com/v2.3/me/picture?type=large&access_token="+$localStorage.fbtoken;
          $rootScope.fbpicsrc = "https://graph.facebook.com/v2.3/me/picture?type=large&access_token="+$localStorage.fbtoken;
        });
        return $localStorage.fbtoken;
      });
    };
    $rootScope.logout = function () {
        window.AzureClient.logout();
        delete $localStorage.user;
        $localStorage.$reset();
        delete $rootScope.fbdata;
        delete $rootScope.fbpicsrc;
        delete $rootScope.fbtoken;
        $rootScope.loggedIn = false;
    };
});

window.AzureClient = new WindowsAzure.MobileServiceClient(
    "https://siebencafe.azure-mobile.net/",
    "HDGpuYoXFhGxnODiWlLhyoWiYLOuYA65"
);



app.controller("orderCtrl",['$scope' , '$rootScope' , '$localStorage' , function($scope, $rootScope, $localStorage) {
  $scope.orders = [];
  $scope.cafe = {
    body: {name: "Nothing selected!"},
    sugar: {name: "Nothing selected!"},
    extras: [],
    comments: ""
  };
  $scope.bodies = [ { name: "Freddo Espresso" , value: 7 } ,
                    { name: "Freddo Cappucino" , value: 1 },
                    { name: "Frappe", value: 2},
                    { name: "Espresso", value: 3},
                    { name: "Cappucino", value: 4},
                    { name: "Ελληνικό", value: 5},
                    { name: "Γαλλικός", value: 6} ];
  $scope.sugars = [ { name: "Πολύ Γλυκό" , value: 4 } ,
                    { name: "Γλυκό" , value: 1 },
                    { name: "Μέτριο", value: 2},
                    { name: "Μισή", value: 5},
                    { name: "Σκέτο", value: 3} ];
  $scope.extras = [ { name: "Με Γάλα" , value: 100 },
                    { name: "Μονό" , value: 101 },
                    { name: "Διπλό" , value: 102 },
                    { name: "Μέ Κανέλα" , value: 103 },
                    { name: "Με Σοκολάτα" , value: 104 },
                    { name: "Με Μαύρη Ζάχαρη" , value: 105 },
                    { name: "Με Αφρόγαλο" , value: 106 },
                    { name: "Με Κρέμα" , value: 107 },
                    { name: "Με Ζαχαρίνη" , value: 108 }];


  if( $localStorage.cafe != undefined ){
    $scope.cafe = $localStorage.cafe;
    for(var i in $scope.cafe.extras){
      for( var j in $scope.extras)
        if( $scope.extras[j].name == $scope.cafe.extras[i].name )
          $scope.extras[j].selected = true;
    }
  }

  $scope.addRemove = function (extra) {
      if( extra.selected ){
        $scope.cafe.extras.push(extra);
      }
      else{
        var i = $scope.cafe.extras.indexOf(extra);
        $scope.cafe.extras.splice(i, 1);
      }
  }

  $scope.insert = function () {
      var table = window.AzureClient.getTable("Order");
      var text = $scope.cafe.body.name + " " + $scope.cafe.sugar.name ;
      if( !$scope.cafe.body.value ){
        alert("You must select cafe!");
        return;
      }
      if( !$scope.cafe.sugar.value ){
        alert("You must select sugar baby!");
        return;
      }
      for( var i in $scope.cafe.extras ){
        text += " " + $scope.cafe.extras[i].name;
      }
      if( $scope.cafe.comments.length > 1)
        text += " ("+$scope.cafe.comments+")";

      var obj = {
        text : text,
        user : $rootScope.fbdata.name,
        userId : $rootScope.user.userId,
        complete : false
      };
      table.insert(obj).done(function(res){
        $localStorage.cafe = $scope.cafe;
        alert("Inserted! Your option has been saved... ^.^");
      });
  }

  $scope.getAll = function(){
    var table = window.AzureClient.getTable("Order");
    table.where({complete : false}).orderByDescending("__updatedAt").read().done(function(res){
      $scope.$apply(function(){
        $scope.orders = res;
      });
    });
  }
  var getImage = function(i){
    var lpic = graphUrl + $scope.data[i].object_id + "?access_token=" + $localStorage.fbtoken;
    $.get(lpic).then(function(result){
      $scope.$applyAsync(function(){
        $scope.data[i].lpic = result.images[0].source;
      });
    });
  }
  $scope.getFainonAll = function(){
    var fainonId = "662166840552032";
    var urlToHit = graphUrl + fainonId + "/feed?access_token=" + $localStorage.fbtoken;
    $.get(urlToHit).then(function(results){
      $scope.$apply(function(){
        var r = [];
        for(var i in results.data){
          if( results.data[i].type == "photo" ){
            r.push(results.data[i]);
          }
        }
        $scope.data = r;
        var today = new Date().getDay();
        for(var i in $scope.data){
          if( new Date($scope.data[i].created_time).getDay() == today ){
            $scope.data[i].simerino = true;
          }
          getImage(i);
        }
      });
    });

  }

  $scope.del = function(item){
    var table = window.AzureClient.getTable("Order");
    table.del(item).done(function(){
      $scope.getAll();
    });
  }

  var allowedUsers = ["Facebook:868748039884631","Facebook:10207217092088622"];

  $scope.orderComplete = function(){
    if( $rootScope.user ){
      if( allowedUsers.indexOf($rootScope.user.userId) > -1 ){
        window.AzureClient.invokeApi("Helpers/orderConfirm/" + $rootScope.fbdata.name , {body:null , method: "post"}).done(function(){
          $scope.getAll();
        });
      }
    }
  }



}]);


})();