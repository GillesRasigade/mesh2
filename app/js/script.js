var mesh = angular.module('mesh', ['components','ngResource','ngRoute','ngSanitize','firebase'])
    
.config(function($sceProvider) {
    // Completely disable SCE.  For demonstration purposes only!
    // Do not use in new projects.
    $sceProvider.enabled(false);
});

var serverKey = '12345';


/*mesh._auth = {};
mesh._auth.access_code = "ya29.mABQ9CHCyuhX9lIOQxQdlW22VB-Ad8B-oCmlV_L18ngmmlfJYa7cAVUk";*/

// Google OAuth2 authentication callback
(function() {
   var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
   po.src = 'https://apis.google.com/js/client:plusone.js';
   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
})();

var signinCallback = function (authResult) {
    
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
                console.log( profile );
                
                mesh._profile = profile;
                
                localStorage.setItem('profile',JSON.stringify(mesh._profile));
                
            });
        });
    
        window.location.hash = '#/';
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

// Save the auth data for reuse:
mesh._auth = JSON.parse(localStorage.getItem('auth'));
mesh._profile = JSON.parse(localStorage.getItem('profile'));

