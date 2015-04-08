mesh

// Ref:
// - http://www.bennadel.com/blog/2612-using-the-http-service-in-angularjs-to-make-ajax-requests.htm
// - http://viralpatel.net/blogs/angularjs-service-factory-tutorial/
.service('meshio', function( $http, $q ) {
    
    this.checkAuth = function () {
        return mesh._auth
            && mesh._auth.expires_at
            && 0 < parseInt(mesh._auth.expires_at,10)-(new Date()).getTime()/1000;
    }
    
    this.url = function ( config ) {
        
        var url = 'http://' + ( config.server ? config.server : window.location.origin ) + ':8080/' + escape( serverKey );
        
        for ( var i in mesh._servers ) {
            if ( config.server === mesh._servers[i].id ) {
                url = mesh._servers[i].api;
                break;
            }
        }
        
        url += escape( config.url )
        
        url += '?&access_token=' + mesh._auth.access_token;
        
        return url;
    }
    
    this.request = function ( config ) {
        
        if ( !mesh._offline && !mesh._auth ) return window.location.hash = '#/login';
    
        if ( false && mesh._offline ) {
            console.log( 'Service request offline' );
            return ( null );
        }
    
        // Parameter initialization:
        config = config ? config : {};
        config.params = config.params ? config.params : {};
        
        var url = 'http://' + ( config.server ? config.server : window.location.origin ) + ':8080/' + escape( serverKey );
        
        for ( var i in mesh._servers ) {
            if ( config.server === mesh._servers[i].id ) {
                url = mesh._servers[i].api;
                break;
            }
        }
        
        config.url = url + escape( config.url )
        
        // config.url = this.url ( config );
        
        if ( mesh._auth ) {
            config.params.access_token = mesh._auth.access_token;
        }
        
        // Perform the request:
        var request = $http(config);

        // Returing the callbacks:
        return( request.then(
            
            function(response){             // SUCCESS
            
            // Return the
            return( response.data.data );
            
        }, function(response,status){              // ERROR
            
            if ( 401 === response.status ) {
                return window.location.hash = '#/logout';
            }
            
            console.log(79,response.status,config);
            if ( 0 === response.status ) {
                $http.get( config.url ).
                  success(function(data, status, headers) {
                    // this callback will be called asynchronously
                    // when the response is available
                  }).
                  error(function(data, status, headers) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.
                    // console.log( 88 , data , status , headers , config );
                    if ( status === response.status ) {
                        if ( confirm('To access the server "'+config.server+'", you are requested to accept the self-signed certificate.\n\n Do you want to proceed right now ?') ) {
                            // window.location = config.url;
                            window.open(config.url,'Certificate acceptance');
                        }
                    }
                });
            }
            
            // The API response from the server should be returned in a
            // nomralized format. However, if the request was not handled by the
            // server (or what not handles properly - ex. server error), then we
            // may have to normalize it on our end, as best we can.
            if (
                ! angular.isObject( response.data ) ||
                ! response.data.message
                ) {

                return( $q.reject( "An unknown error occurred." ) );

            }

            // Otherwise, use expected error message.
            return( $q.reject( response.data.message ) );

            
        }) );

    }
    
    this.servers = function ( server ) {
        server = undefined !== server ? server : 'localhost';
        
        return ( this.request({
            server: server,
            method: "get",
            url: '/servers/'
        }));
    }
    
    this.directory = function ( path , offset , limit , server , search ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        search = undefined !== search ? search : '';
        
        
        var params = {}
        if ( offset ) params.offset = offset;
        if ( limit ) params.limit = limit;
        if ( search ) params.s = search;
 
        return ( this.request({
            server: server,
            method: "get",
            url: '/dir/' + path,
            params: params
        }));
    }
    
    this.tree = function ( path , server , search ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        search = undefined !== search ? search : '';
        
        var params = { tree: 1 }

        if ( search ) params.s = search;
 
        return ( this.request({
            server: server,
            method: "get",
            url: '/dir/' + path,
            params: params
        }));
    }
    
    this.download = function ( path , server ) {
        if ( path ) {
            
            window.location = this.url({
                server: server,
                method: "get",
                url: '/download/' + path
            });

        }
    }
    
    this.createDirectory = function ( path , name , server ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        
        if ( name ) {
            
            path += '/' + name;
        
            return ( this.request({
                server: server,
                method: "post",
                url: '/dir/' + path
            }));
            
        }
    }
    
    this.statistics = function ( path , server ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
 
        return ( this.request({
            server: server,
            method: "get",
            url: '/statistics/' + path,
        }));
    }
    
    this.thumb = function ( path ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        
        var params = {}
 
        return ( this.request({
            server: server,
            method: "get",
            url: '/thumb/' + path,
            params: params
        }));
    }
    
    this.cover = function ( path , target , server ) {
        
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        
        if ( target ) {
            var params = {
                target: target
            }
     
            return ( this.request({
                server: server,
                method: "put",
                url: '/cover/' + path,
                params: params
            }));
        }
    }
    
    this.rename = function ( path , name , server ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        
        if ( name ) {
            
            var params = {
                name: name
            }
    
            return ( this.request({
                server: server,
                method: "put",
                url: '/rename/' + path,
                params: params
            }));
        
        }
    }
    
    this.rotate = function ( path , rotate , server ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        rotate = parseInt( rotate , 10 );
        
        if ( 0 !== rotate ) {
            
            var params = {
                rotate: rotate
            }
    
            return ( this.request({
                server: server,
                method: "put",
                url: '/rotate/' + path,
                params: params
            }));
        
        }
    }
    
    this.delete = function ( path , server ) {
 
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
    
        return ( this.request({
            server: server,
            method: "delete",
            url: '/' + path
        }));
    }
    
    this.upload = function ( path , files , server , callback , index ) {
        console.log('Upload files: ' , files );
        
        path = undefined !== path ? path : '';
        server = undefined !== server ? server : 'localhost';
        index = undefined !== index ? index : 0;
        
        var $this = this;
        var length = files.length;
        var element = angular.element(document.getElementById('upload-progress'));
                
        var checkFileType = function ( file ) {
            
        }
        
        var totalSize = 0, totalDone = 0;
        for (i = 0; i < files.length; i++) {
            totalSize += files[i].size;
            totalDone += (i < index ? files[i].size : 0);
        }
        
        console.log( files[index] );
        
        var fd = new FormData();
        fd.enctype = 'multipart/form-data';
        fd.append('file', files[index]);
        
        var url = 'http://' + ( server ? server : window.location.origin ) + ':8080/' + escape( serverKey );
        for ( var i in mesh._servers ) {
            if ( server === mesh._servers[i].id ) {
                url = mesh._servers[i].api;
                break;
            }
        }
        
        var xhr = new XMLHttpRequest();
        //xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.open('POST', url + escape( '/upload/' + path ) + '?access_token='+mesh._auth.access_token );
        xhr.onload = function() {
            
            index++;
            
            if ( index >= length ) {
                
                element.css('margin-top','0%');
                
                console.log('Everything is uploaded');
                return callback();
                        
            } else {
                
                return $this.upload( path , files , server , callback , index );
                
            }
                
        }

        var uploadXHR = xhr.upload;
        uploadXHR.addEventListener('progress', function(ev) {

            if (ev.lengthComputable) {
                var percentLoaded = Math.round(parseFloat((totalDone + ev.loaded) / totalSize) * 100);
                
                
                element.css('margin-top',-percentLoaded+'%');
                
            }
        }, false);
        xhr.send(fd);
        
        return true;
        
        this.request({
            server: server,
            method: "post",
            url: '/upload/' + path,
            params: {
                files: [ files[index] ]
            }
        }).then(function(){
            console.log('uploaded');
        })
    }
    
    this.getSharedObject = function ( $location ) {
        
        var object = null;
        var search = $location.search();
        if ( search ) {
            // Get the share object:
            // var share = search.replace( /.*share=([^&$]*).*/ , '$1' );
            var share = search.share;
            
            if ( share ) {
                try {
                    object = JSON.parse( atob( share ) );
                } catch ( e ) {}
                
                delete search.share;
                $location.search( search );
            }
        }
        
        // Remove the search part:
        // window.history.pushState( 'reload' , 'Mesh²' , window.location.href.replace(/\?[^#]*/,'') );
        // setTimeout(function(){
        //     // window.history.pushState('page2', 'Title', window.location.href.replace(/\?[^#]*/,''));
            // var url = window.location.href.replace(/\?[^#]*/,'');
            // window.history.pushState({path:url},'', url);
        // },1000);
        
        return object;
    }
    
})

.factory("settings",function(){
        return {
            displayTree: false,
            search: false
        };
});