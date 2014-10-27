mesh

// Ref:
// - http://www.bennadel.com/blog/2612-using-the-http-service-in-angularjs-to-make-ajax-requests.htm
// - http://viralpatel.net/blogs/angularjs-service-factory-tutorial/
.service('meshio', function( $http, $q ) {
    
    this.request = function ( config ) {
        
        if ( !mesh._auth ) return window.location.hash = '#/login';
    
        // Parameter initialization:
        config = config ? config : {};
        config.params = config.params ? config.params : {};
        
        var url = 'http://' + ( config.server ? config.server : window.location.origin ) + ':8080/' + escape( serverKey );
        if ( mesh._servers && mesh._servers[config.server] ) {
            url = mesh._servers[config.server].api;
        }
        config.url = url + escape( config.url )
        
        config.params.access_token = mesh._auth.access_token;
    
        // Perform the request:
        var request = $http(config);

        // Returing the callbacks:
        return( request.then(
            
            function(response){             // SUCCESS
            
            // Return the
            return( response.data.data );
            
        }, function(response){              // ERROR
            
            if ( 401 === response.status ) {
                return window.location.hash = '#/logout';
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
        if ( mesh._servers && mesh._servers[server] ) {
            url = mesh._servers[server].api;
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
    
})
