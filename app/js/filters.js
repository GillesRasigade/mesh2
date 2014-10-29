mesh

// Filter files and folders by type:
.filter('type', function() {
  return function(items, type) {
        var result = [];
        angular.forEach(items, function(value, key) {
            
            if ( 'media' == type ) {
                type = [ 'image' , 'video' ];
            }
            
            
            if ( value.type == type || ( 'object' == typeof(type) && -1 !== type.indexOf(value.type) ) ) {
                result.push( value );
                
            }
        });
        return result;
    };
})

.filter('details', function() {
  return function(folder,$scope) {
        var text = '';
        
        // Date formatting:
        var date = folder.path.replace(/^.*\//,'').replace(/^(\d{4}-\d{2}-[^ ]*)? .*$/,'$1');
        if ( date.match(/^\d{4}-\d{2}-\d{2}.*/) ) {
            //text += ( new Date( date.replace(/,.*$/,'') ) ).toDateString();
            text += date + ' &nbsp; ';
        }
        
        // Other statistics:
        // ...
        var _folder = folder.path.replace(/^.*\//,'');
        if ( $scope.statistics && $scope.statistics[_folder] ) {
            if ( $scope.statistics[_folder].size ) {
                var size = $scope.statistics[_folder].size;
                var unit = 'ko';
                
                if ( size > 1000 ) { size /= 1000; unit = 'Mo'; }
                if ( size > 1000 ) { size /= 1000; unit = 'Go'; }
                if ( size > 1000 ) { size /= 1000; unit = 'To'; }
                
                text += '<i class="glyphicon glyphicon-hdd"></i>&nbsp;'+Math.floor(size) + '&nbsp;' + unit + ' &nbsp; ';
            }
            if ( $scope.statistics[_folder].directories ) {
                text += '<i class="glyphicon glyphicon-folder-open"></i>&nbsp;'+$scope.statistics[_folder].directories + ' &nbsp; ';
            }
            if ( $scope.statistics[_folder].images ) {
                text += '<i class="glyphicon glyphicon-picture"></i>&nbsp;'+$scope.statistics[_folder].images + ' &nbsp; ';
            }
            if ( $scope.statistics[_folder].videos ) {
                text += '<i class="glyphicon glyphicon-film"></i>&nbsp;'+$scope.statistics[_folder].videos + ' &nbsp; ';
            }
        }
        
        return text + '&nbsp;';
    };
})

.filter('thumb', function() {
    return function(path,width,height) {
        path = undefined !== path ? path : '';
        
        var url = '';
        if ( path.match(/(jpe?g|png)$/i) ) {
            var size = '';
            if ( width ) size += 'w='+width;
            if ( height ) size += '&h='+height;
        
            url += '/image/' + escape( path ) + '?'+size;
            
        } else if ( path.match(/(mp4|ogg|webm|avi|mov)$/i) ) {
        
            url += '/video/' + escape( path ) + '?';
            
        } else {
            
            url += '/thumb/' + escape( path ) + '/?';
        }
        
        url += '&access_token=' + mesh._auth.access_token;
            
        return url;
        
    };
})

.filter('server', function() {
    return function(url,$scope) {
        url = undefined !== url ? url : '';
        
        var api = 'http://' + ( $scope.server ? $scope.server : window.location.origin ) + ':8080/' + escape( serverKey );
        for ( var i in mesh._servers ) {
            if ( $scope.server === mesh._servers[i].id || $scope === mesh._servers[i].id ) {
                api = mesh._servers[i].api;
                break;
            }
        }
        
        return api + url;
        
    };
})

.filter('rm', function() {
    return function(text,path) {
        path = undefined !== path ? path : '';
        text = text.replace( new RegExp('^/?'+path+'/?') , '' );
        text = '' == text ? '&nbsp;' : text;
        return text;
    };
})

.filter('highlight', function() {
    return function(text,pattern) {
        if ( pattern ) {
            text = text.replace(new RegExp('('+pattern.replace(/ +/,'.*')+')','ig') , '<span class="highlight">$1</span>' );
        }
        return text;
    };
})

.filter('starred', function(){
    return function(path){
        return path.match('-star.') ? 'starred' : '';
    }
})