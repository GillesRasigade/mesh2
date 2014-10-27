angular.module('components', [])

    .directive('whenScrolled', function() {
        return function(scope, elm, attr) {
            var raw = elm[0];
            elm.bind('scroll', function() {
                
                if ( mesh._data && mesh._data[scope.path] ) {
                    mesh._data[scope.path].scrollTop = raw.scrollTop;
                }
                
                if (raw.scrollTop + raw.offsetHeight + 3*screen.height/4 >= raw.scrollHeight ) {
                    scope.$apply(attr.whenScrolled);
                }
            });
        };
    })

    .directive('hello',function(){
        return {
            restrict: 'E',
            transclude: true,
            scope: {},
            template: '<div>World!</div>',
            replace: true
        }
    })
    
    .directive('signin',function(){
        return {
            restrict: 'E',
            transclude: true,
            scope: {},
            replace: true,
            template: mesh._profile ? '<a href="//plus.google.com/'+mesh._profile.id+'?prsrc=3" '+
                            'rel="publisher" target="_top" style="text-decoration:none;display:inline-block;color:#333;text-align:center; font:13px/16px arial,sans-serif;white-space:nowrap;">'+
                                //'<span style="display:inline-block;font-weight:bold;vertical-align:top;margin-right:5px; margin-top:10px;">'+(mesh._profile.name?mesh._profile.name:'...')+'</span>'+
                                '<span style="display:inline-block;vertical-align:top;margin-right:15px; margin-top:8px;"></span>'+
                                //'<img src="//ssl.gstatic.com/images/icons/gplus-32.png" alt="Google+" style="border:0;width:32px;height:32px;"/>'+
                                '<img src="'+mesh._profile.picture+'" alt="Google+" style="border:0;width:32px;height:32px;"/>'+
                        '</a>' : ''
        }
        
    })
    
    .directive('login',function(){
        return {
            restrict: 'E',
            transclude: true,
            scope: {},
            replace: true,
            template: '<span id="signinButton">\
              <span\
                class="g-signin"\
                data-callback="signinCallback"\
                data-clientid="562991447209-tk2pvo6gdatnja0adtiq52ngp846tire.apps.googleusercontent.com"\
                data-cookiepolicy="single_host_origin"\
                data-requestvisibleactions="http://schema.org/AddAction"\
                data-scope="https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.profile.emails.read">\
              </span>\
            </span>'
        }
        
    })