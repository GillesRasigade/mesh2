mesh

// Factories:
.factory('Directory', ['$resource',
  function($resource){
    return $resource(':serverKey/dir/:path', {}, {
      query: {method:'GET', params:{serverKey: serverKey,path:''}, isArray:true}
    });
}])

//Routes
.config(function($routeProvider) {
  $routeProvider
    .when('/logout', {
        controller:'LogoutController',
        templateUrl:'partials/login.html'
    })
    .when('/login', {
        controller:'LoginController',
        templateUrl:'partials/login.html'
    })
    .when('/about', {
        controller:'AboutController',
        templateUrl:'partials/about.html'
    })
    .when('/servers', {
        controller:'ServersController',
        templateUrl:'partials/servers.html'
    })
    .when('/:path*?', {
        controller:'ListController',
        templateUrl:'partials/list.html'
    })
    .otherwise({
        redirectTo:'/'
    });
})

.controller('ExampleController', ['$scope', function($scope) {
      $scope.counter = 0;
      $scope.change = function() {
        $scope.counter++;
      };
    }])

// Controllers
// http://stackoverflow.com/questions/11541695/redirecting-to-a-certain-route-based-on-condition
.controller('LogoutController', ['$scope','$location', function($scope,$location) {
    console.log( 'logout' )
    
    // Remove user authentication data:
    delete mesh._auth;
    localStorage.removeItem('auth');
    
    // User profile removing:
    delete mesh._profile;
    localStorage.removeItem('profile');
    document.getElementById('signin').innerHTML = '<signin></signin>';
    
    // Action on google api:
    if ( window.gapi ) gapi.auth.signOut();
    
    // Redirection to the login page:
    $location.path( '/login' );
}])
.controller('LoginController', ['$scope','$location', function($scope,$location) {
    console.log( 'login' )
    
    if ( window.gapi ) gapi.signin.go('signinButton')
    
}])
.controller('ListController', ['$scope','$location','$route','meshio', function($scope,$location,$route,meshio) {
    
    // Require the user to be logged in:
    if ( undefined === mesh._auth ) $location.path('/logout');
    
    // Application path definition:
    var path = $scope.path = '/' + $route.current.params.path ? $route.current.params.path : '';
    
    
}])
.controller('ListController', ['$scope','$rootScope','$filter','$location','$route','meshio', function($scope,$rootScope,$filter,$location,$route,meshio) {
    
    // Require the user to be logged in:
    if ( undefined === mesh._auth ) $location.path('/logout');
    
    // Application path definition:
    var path = '/';
    
    if ( $route.current.params.path ) path += $route.current.params.path;
    
    var server = path.replace(/\/([^\/]+).*/,'$1');
    path = path.replace('/'+server,'');
    
    $scope.data = {};
    $scope.folders = [];
    $scope.statistics = {};
    $scope.path = path;
    $scope.s = $rootScope.s ? $rootScope.s : '';
    $scope.server = '' !== server && server != path ? server : 'localhost';
    $scope.loaded = 0;
    $scope.limit = 100;
    $scope.total = -1;
    $scope.busy = false;
    $scope.scrollTop = 0;
    
    $scope.showImage = '';
    $scope.showVideo = '';
    
    $scope.servers = mesh._servers;
    
    $scope.search = function() {
        var delay = 500;
        var s = $scope.s;
        var _search = function(){
            
            // Search pattern unchanged for 250 ms:
            if ( s === $scope.s ) {
                //if ( $scope.busy ) setTimeout(_search,delay);
                $scope.folders = [];
                $scope.total = -1;
                $scope.loaded = 0;
                console.log( 'search for: ' , $scope.s );
                
                // $rootScope.s = $scope.s;
                
                $scope.load();
            } else {
                s = $scope.s;
            }
            
        }
        
        if ( window.searchTimeout ) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(_search,delay);
      };
    
    window.onkeypress = function(event){
        document.getElementById('s').focus();
    }
    
    $scope.breadcrumb = function() {
        
        var p = $scope.path.replace(/\/$/,'').split('/');
        var len = p.length;
        var breadcrumb = document.getElementById('breadcrumb');
        
        breadcrumb.innerHTML = '';
        var _path = '';
        angular.forEach(p,function(o,i){
            _path += (''==o?'':o+'/');
            
            if ( ''==o ) {
                
                breadcrumb.innerHTML += '\
                <li class="dropdown '+( i+1 == len ? 'active' : '' )+'">\
                    <a href="#/'+$scope.server+'/'+_path+'">'+
                        (''==o?'<b><i class="glyphicon glyphicon-hdd"></i> <sub>' + $scope.server + '</sub></b>' : o )+
                    '</a>\
                </li>';
                
            } else {
            
                breadcrumb.innerHTML += '\
                <li class="'+( i+1 == len ? 'active' : '' )+'">\
                    <a href="#/'+$scope.server+'/'+_path+'">'+
                        (''==o?'<b><i class="glyphicon glyphicon-hdd"></i> <sub>' + $scope.server + '</sub></b>' : o )+
                    '</a>\
                </li>';
            }
        });
        
        // Move the breadcrumb to the right:
        setTimeout(function(){
            document.getElementById('breadcrumb-parent').scrollLeft = 1e10
        },10);
    }
    
    $scope.reload = function() {
        $scope.folders = [];
        $scope.total = -1;
        $scope.loaded = 0;
        if ( mesh._data && mesh._data[$scope.server+':'+$scope.path] ) {
            delete mesh._data[$scope.server+':'+$scope.path];
        }
        console.log( 'Reloading...' );
        $scope.load();
    }
    
    // Load data for this controller:
    $scope.load = function( onScroll ) {
        if ( $scope.busy ) return;
        $scope.busy = true;
        
        if ( $scope.total == -1 || $scope.loaded < $scope.total ) {
        
            if ( !onScroll ) {
                var _class = document.getElementById('files-list').getAttribute('class') + '';
                if ( _class && -1 == _class.indexOf('fadeout') ) {
                    document.getElementById('files-list').setAttribute('class',_class+' fadeout');
                }
            }
            
            if ( $scope.total == -1 && !$scope.s && mesh._data && mesh._data[$scope.server+':'+$scope.path] ) {
                
                var _data = mesh._data[$scope.server+':'+$scope.path];
                $scope.total = _data.total;
                $scope.loaded = _data.loaded;
                $scope.folders = _data.folders;
                $scope.scrollTop = _data.scrollTop;
                
                console.log( 'Load from memory:' , _data );
                
                if ( _data.statistics ) $scope.statistics = _data.statistics;
                
                $scope.busy = false;
                
                var _class = document.getElementById('files-list').getAttribute('class') + ''
                document.getElementById('files-list').setAttribute('class',_class.replace(/ ?fadeout/,'') );
                
                if ( onScroll ) $scope.$apply();
                
                setTimeout(function(){
                    document.getElementById('list').scrollTop = $scope.scrollTop;
                },5);
                
                
                //console.log( 176 , 'Load from memory' , $scope.scrollTop , $scope );
                
            } else {
            
                meshio
                    .directory( $scope.path , $scope.loaded , $scope.limit , $scope.server , $scope.s )
                    .then(function( data ){
                        
                        $scope.folders = undefined !== $scope.folders ? $scope.folders : [];
                        
                        $scope.data = data;
                        $scope.folders = $scope.folders.concat( data.list );
                        
                        $scope.loaded += $scope.folders.length;
                        $scope.total = data.total;
                        
                        //console.log( 95 , $scope.folders );
                        
                        var _class = document.getElementById('files-list').getAttribute('class') + ''
                        document.getElementById('files-list').setAttribute('class',_class.replace(/ ?fadeout/,'') );
                        
                        if ( !$scope.s ) {
                            if ( !mesh._data ) mesh._data = {};
                            mesh._data[$scope.server+':'+$scope.path] = {
                                total: $scope.total,
                                loaded: $scope.loaded,
                                folders: $scope.folders,
                                scrollTop: $scope.scrollTop
                            }
                        }
                        
                        $scope.busy = false;
                        
                        if ( onScroll ) {
                            $scope.$apply();
                            
                        } else {
                            
                            document.getElementById('list').scrollTop = $scope.scrollTop;
                            
                            setTimeout(function(){
                                meshio
                                    .statistics( $scope.path , $scope.server )
                                    .then(function( data ){
                                        $scope.statistics = data;
                                        
                                        if ( !$scope.s && mesh._data && mesh._data[$scope.server+':'+$scope.path] ) {
                                            mesh._data[$scope.server+':'+$scope.path].statistics = $scope.statistics;
                                        }
                                        
                                    });
                            },50);
                        }
                    })
            }
        } else {
            $scope.busy = false;
        }
    };
    
    $scope.breadcrumb();
    
    $scope.load();
    
    processDragOverOrEnter = function(event) {
          if (event != null) {
            event.preventDefault();
            
            var element = angular.element( event.target );
            element.addClass('dragover');//.html('<i class="glyphicon glyphicon-cloud-upload"></i>')
            
          }
          
          event.dataTransfer.effectAllowed = 'copy';
          return false;
        };
    
    var element = angular.element( document.getElementById('add-files') );
    element.bind('dragover', processDragOverOrEnter);
    element.bind('dragenter', processDragOverOrEnter);
    element.bind('dragleave', function(event){
        if ( event ) {
            var element = angular.element( event.target );
            element.removeClass('dragover');
        }
    });
    element.bind('drop', function(event) {
        if (event != null) {
            event.preventDefault();
            var element = angular.element( event.target );
            element.removeClass('dragover');
        }
        meshio.upload( $scope.path , event.dataTransfer.files , $scope.server , function(){
            
            $scope.reload();
            
        });
        
        return false;
    });
    
    $scope.show = function ( type , object ) {
        
        switch ( type ) {
            case 'image':
                $scope.showPanel = true;
                var src = $filter('server')($filter('thumb')(object.path,1024,1024),$scope);
                var $img = angular.element(document.getElementById('show-image'));
                $img.addClass('fadeout');
                $img.attr('data-hashKey',object.$$hashKey);
                var img = new Image();
                img.onload = function(){
                    document.getElementById('show-'+type).src = src;
                    $img.removeClass('fadeout');
                }
                img.src = src;
                console.log( 'show ' + type , object , src );
                
                $scope.showVideo = '';
                
                break;
                
            case 'video':
                $scope.showPanel = true;
                var src = $filter('server')($filter('thumb')(object.path),$scope);
                var $video = angular.element(document.getElementById('video-src'));
                
                //$video.src = src;
                $video.attr('src',src);
                
                $scope.showVideo = src;
                
                document.getElementById('show-video').load();
                
                break;
        }
        
        $scope.$apply();
        
        console.log( 'show' , $scope );
    }
    
    $scope.hidePanel = function() {
        $scope.showPanel = !$scope.showPanel;
        document.getElementById('show-video').pause();
        $scope.$apply();
    }
    
    $scope.move = function ( dir ) {
        var $img = angular.element(document.getElementById('show-image'));
        var $$hashKey = $img.attr('data-hashKey');
        for ( var i = 0 ; i < $scope.loaded ; i++ ) {
            if ( $$hashKey == $scope.folders[i].$$hashKey ) {
                console.log( 2891 , $$hashKey , $scope.folders[i] , i+dir);
                
                for ( var j = i+dir ; ( j > 0 ) && ( j < $scope.loaded ) ; j+=dir ) {
                    console.log( 2890 , j );
                    if ( $scope.folders[j].$$hashKey ) {
                        i = j;
                        break;
                    }
                }
                console.log( 289 , i , $scope.folders[i] );
                i=i%$scope.loaded;
                break;
            }/* else if ( i+1 == $scope.loaded ) {
                $scope.load(true);
                return $scope.next();
            }*/
        }
        $scope.show( 'image' , $scope.folders[i] );
        console.log( 'next' , $$hashKey );
    }
    
    // List of actions for directories:
    $scope.reset = function( path ) {
        console.log( 'reset: ' , path );
    }
    
    $scope.rename = function( path ) {
        console.log( 'rename: ' , path );s
        
        var name = prompt( path , path.replace(/^.*\//,'') );
        if ( name ) {
            
            var found = false;
            
            for ( var i in $scope.folders ) {
                console.log( $scope.folders[i].path , $scope.folders[i].path.match( new RegExp('\/'+name+'$')) )
                if ( 'directory' == $scope.folders[i].type && $scope.folders[i].path.match( new RegExp('\/'+name+'$')) ) {
                    found = true;
                    break;
                }
            }
            
            if ( found ) {
                
                alert( 'Directory "' + name + '" already exists. Please choose another name' );
                return $scope.rename( path );
                
            } else {
                meshio
                    .rename( path , name , $scope.server )
                    .then(function( data ){
                        
                        console.log( data );
                        
                        //$scope.reload();
                        for ( var i in $scope.folders ) {
                            if ( 'directory' == $scope.folders[i].type && $scope.folders[i].path === path ) {
                                var npath = path.replace( /\/[^\/]+\/?$/ , '/'+name );
                                console.log( $scope.folders[i] , npath );
                                
                                if ( mesh._data[$scope.server+':'+path] ) {
                                    mesh._data[$scope.server+':'+npath] = mesh._data[$scope.server+':'+path];
                                    delete mesh._data[$scope.server+':'+path];
                                }
                                $scope.folders[i].path = npath;
                                mesh._data[$scope.server+':'+$scope.path].folders = $scope.folders;
                                
                                // Keep statisticsunchanged
                                if ( mesh._data[$scope.server+':'+$scope.path] ) {
                                    mesh._data[$scope.server+':'+$scope.path].statistics[npath.replace(/^.*\//,'')] =
                                        mesh._data[$scope.server+':'+$scope.path].statistics[path.replace(/^.*\//,'')]
                                }
                                
                                $scope.$apply;
                                
                                break;
                            }
                        }
                        
                    });
            }
        }
    }
    
    $scope.delete = function( path ) {
        console.log( 'delete: ' , path );
        
        if ( confirm('Are you sure ?') ) {
            meshio
                .delete( path , $scope.server )
                .then(function( data ){
                    
                    console.log( data );
                    
                    for ( var i in $scope.folders ) {
                        if ( $scope.folders[i].path === path ) {
                            console.log( $scope.folders[i] );
                            delete $scope.folders[i];
                            
                            if ( 'directory' == $scope.folders[i].type ) {
                                delete mesh._data[$scope.server+':'+path];
                                mesh._data[$scope.server+':'+$scope.path].folders = $scope.folders;
                            }
                            
                            $scope.loaded--;
                            $scope.total--;
                            $scope.$apply();
                        }
                    }
                    
                    
                    
                });
        }
    }
    
    /* File selection for upload */
    document.getElementById('select-files-for-upload').addEventListener('click',function(event){
        event.preventDefault();
        document.getElementById('fileselect').click();
    });
    
    document.getElementById('fileselect').addEventListener('change',function(event){
        meshio.upload( $scope.path , document.getElementById('fileselect').files , $scope.server , $scope.reload);
    });
    
    $scope.createDirectory = function () {
        console.log('Create directory...');
        
        var name = prompt('Directory name','');
        console.log('Directory name:' + name);
        
        if ( name ) {
            meshio
                .createDirectory( $scope.path , name , $scope.server )
                .then(function( data ){
                    
                    console.log( data );
                    
                    $scope.reload();
                    
                    
                });
        }
        
    }
    
    $scope.rotate = function ( image , rotate ) {
        meshio
            .rotate( image.path , rotate , $scope.server )
            .then(function( data ){
                
                // Get the image thumb:
                var $image = angular.element( document.getElementById( image.$$hashKey + '-thumb' ));
                var src = $filter('server')($filter('thumb')(image.path,1000,1000),$scope)+'&_='+(new Date).getTime();
                
                var img = new Image();
                img.onload = function () {
                    $image.css('background-image','url(' + src + ')' );
                }
                img.src = src;
                
                console.log( $image , src );
                
            });
    }
}])

.controller('ServersController', ['$scope','$rootScope','$location', function($scope,$rootScope,$location) {

    $scope.servers = $rootScope.servers;
    
    if ( undefined === $scope.servers ) {
        $scope.servers = mesh._servers;
    }
    
    console.log( 568 , $scope.servers );
    
    $scope.save = function() {
        
        console.log( $scope.servers );
        
        
        $rootScope.servers = mesh._servers = $scope.servers;
        
        localStorage.setItem( 'servers' , JSON.stringify( mesh._servers ) );
        
    }
    
}])

;