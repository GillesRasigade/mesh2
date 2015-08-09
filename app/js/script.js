var mesh = angular.module('mesh', ['components','ngResource','ngRoute','ngSanitize','firebase','ui.bootstrap'])
    
.config(function($sceProvider) {
    // Completely disable SCE.  For demonstration purposes only!
    // Do not use in new projects.
    $sceProvider.enabled(false);
});

var serverKey = '12345';

mesh._offline = false;
// window.onoffline = function(){
//     mesh._offline = true;
// }
// window.ononline = function(){
//     // mesh._offline = false;
// }



// mesh._auth = {};
// mesh._auth.access_code = "ya29.mABQ9CHCyuhX9lIOQxQdlW22VB-Ad8B-oCmlV_L18ngmmlfJYa7cAVUk";

// Google OAuth2 authentication callback
(function() {
   var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
   po.src = 'https://apis.google.com/js/client:plusone.js';
   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
})();

var signinCallback = function (authResult) {
    
    // console.log(33,authResult);
    
  if (authResult['status']['signed_in']) {
    // Update the app to reflect a signed in user
    // Hide the sign-in button now that the user is authorized, for example:
    document.getElementById('signinButton').setAttribute('style', 'display: none');
    
    // Go to the main controller:
    setTimeout(function(){
        
        // Start the application:
        mesh._auth = authResult;
        
        // Save the auth data for reuse:
        localStorage.setItem('auth',JSON.stringify(mesh._auth));
        
        // Set OAuth2 google token:
        gapi.auth.setToken(authResult);
        
        gapi.client.load('oauth2', 'v2', function() {
            var request = gapi.client.oauth2.userinfo.get();
            request.execute(function(profile){
                console.log( 44 , profile );
                
                mesh._profile = profile;
                
                localStorage.setItem('profile',JSON.stringify(mesh._profile));
                
            });
        });
        
        // redirect to the last opened folder or servers list:
        if ( localStorage.getItem( 'route' ) ) {
            window.location.hash = localStorage.getItem( 'route' );
        } else if ( window.location.hash ) {
            window.location.hash = window.location.hash.replace(/#\/[^?]*/,'#/servers');
        } else {
            window.location.hash = '#/servers';
        }
        
    },250);
    
    
    
  } else {
    // Update the app to reflect a signed out user
    // Possible error values:
    //   "user_signed_out" - User is signed-out
    //   "access_denied" - User denied access to your app
    //   "immediate_failed" - Could not automatically log in the user
    console.log('Sign-in state: ' + authResult['error']);
    
    // Go to the main controller:
  }
}

window.storage = {
    set: function ( item , value , callback ) {
        if ( window.chrome && chrome.storage && chrome.storage.local ) {
            var data = {};
            data[item] = value;
            chrome.storage.local.set(data);
        } else {
            localStorage.setItem(item,JSON.stringify(value));
        }
    },
    get: function ( item , callback ) {
        if ( window.chrome && chrome.storage && chrome.storage.local ) {
            chrome.storage.local.get(item,callback)
        } else {
            var value = localStorage.getItem(item);
            return callback( value ? JSON.parse(value) : null );
        }
    },
    remove: function ( item , callback ) {
        if ( window.chrome && chrome.storage && chrome.storage.local ) {
            chrome.storage.local.remove(item,callback)
        } else {
            var value = localStorage.removeItem(item);
            return callback();
        }
    }
}

// Save the auth data for reuse:
var f = [
    function() {
        storage.getItem('auth',function(result){
            mesh._auth = result;
            console.log( 109 , result );
            f[++i]();
        })
    },
    function() {
        storage.getItem('profile',function(result){
            mesh._profile = result;
            f[++i]();
        })
    },
    function() {
        storage.getItem('servers',function(result){
            mesh._servers = result;
            f[++i]();
        })
    },
    function() {
        storage.getItem('route',function(result){
            window.location.hash = result;
        })
    },
];
// f[0]();

mesh._auth = JSON.parse(localStorage.getItem('auth'));
mesh._profile = JSON.parse(localStorage.getItem('profile'));

mesh._servers = localStorage.getItem('servers');
if ( !mesh._servers ) {
    mesh._servers = [];
} else {
    mesh._servers = JSON.parse( mesh._servers );
}

if ( !window.location.hash.match('/\?/') ) {
    if ( localStorage.getItem( 'route' ) ) {
        window.location.hash = localStorage.getItem( 'route' );
    }
}

