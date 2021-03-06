
// External modules and application variables definition:
var fs = require("fs-extra"),
    p = require("path"),
    im = require('imagemagick'),
    restify = require("restify"),
    mime = require("mime"),
    exec = require('child_process').exec,

    ffmpeg = require('fluent-ffmpeg'),

    server,
    config;

// Reload the configuration
loadConfig( 'config.json' );

// Determine if SSL is used
if (config.ssl.key && config.ssl.cert) {

    // Get CERT
    var https = {
        certificate: fs.readFileSync(config.ssl.cert),
        key: fs.readFileSync(config.ssl.key)
    };

    // Config server with SSL
    server = restify.createServer({
        name: "fsapi",
        certificate: https.certificate,
        key: https.key
    });

} else {

    // Config non-SSL Server
    server = restify.createServer({
        name: "fsapi"
    });

}

// Check and create temporary files directory:
if ( config.tmp && !fs.existsSync(config.tmp) ) {
    fs.mkdir( config.tmp , config.mode );
}

// Additional server config
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

// Regular Expressions
var commandRegEx = /^\/([a-zA-Z0-9_\.~-]+)\/([a-zA-Z0-9_\.~-]+)\/(.*)/,  // /{key}/{command}/{path}
    pathRegEx = /^\/([a-zA-Z0-9_\.~-]+)\/(.*)/;  // /{key}/{path}

function loadConfig( path ) {

    var _config = JSON.parse(fs.readFileSync(path, 'utf8'));

    config = _config;

}

/**
 * UnknownMethod handler
 */
function unknownMethodHandler(req, res) {
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With']; // added Origin & X-Requested-With

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  }
  else
    return res.send(new restify.MethodNotAllowedError());
}

server.on('MethodNotAllowed', unknownMethodHandler);

/**
 * Check Key (Called by checkReq)
 */
var checkKey = function (config, req) {
    // Loop through keys in config
    for (var i = 0, z = config.keys.length; i < z; i++) {
        if (config.keys[i] === req.params[0]) {
            return true;
        }
    }
    return false;
};

/**
 * Check IP (Called by checkReq)
 */

var checkIP = function (config, req) {
    var ip = req.connection.remoteAddress.split("."),
        curIP,
        b,
        block = [];
    for (var i=0, z=config.ips.length-1; i<=z; i++) {
        curIP = config.ips[i].split(".");
        b = 0;
        // Compare each block
        while (b<=3) {
            (curIP[b]===ip[b] || curIP[b]==="*") ? block[b] = true : block[b] = false;
            b++;
        }
        // Check all blocks
        if (block[0] && block[1] && block[2] && block[3]) {
            return true;
        }
    }
    return false;
};

/**
 * Check Google OAuth2 access token
 */
var checkToken = function ( req, callback , error ) {
    // REF: http://stackoverflow.com/questions/12296017/how-to-validate-a-oauth2-0-access-token-for-a-resource-server
    // Request: https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=1/fFBGRNJru1FQd44AzqT3Zg
    console.log( "checkToken" , req.params.access_token );
    if ( req.params.access_token ) {

        var cache = require('memory-cache');

        var _continue = function() {

            req.user = null;

            if ( tokeninfo.user ) {

                // Save the user parameters to the configuration:
                req.user = tokeninfo.user;

                /*if ( tokeninfo.user.base ) {
                    config.base = tokeninfo.user.base;
                    // Adapt the config.base for each logged in user.
                }*/
            }

            return callback( true );
        }

        var tokeninfo = cache.get('access_token:' + req.params.access_token);
        console.log( 146 , tokeninfo );
        if ( tokeninfo && tokeninfo.removeAddress === req.connection.remoteAddress ) {
            return _continue();

        } else {

            // Check access token here
            var https = require('https');

            // HTTP request:
            https.get('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + req.params.access_token,
                function(res){
                    res.on('data', function(d) {
                        var json = JSON.parse( d.toString() );
                        
			if ( -1 !== Object.keys(config.users).indexOf(json.email) ) {

                            if ( json.expires_in > 0 ) {

                                tokeninfo = {
                                    user: config.users[json.email],
                                    remoteAddress: req.connection.remoteAddress
                                };

                                //console.log( 'cache put: ' + req.params.access_token , tokeninfo )
                                cache.put( 'access_token:' + req.params.access_token , tokeninfo , json.expires_in*1000 )

                                //console.log( 'cache get: ' , cache.get('access_token:' + req.params.access_token) )


                                return _continue();
                            }

                        }
                        return error();

                    });
                });
        }

        return true;

    } else {

        console.log( 205 , req.connection.remoteAddress )

        if ( false && req.connection.remoteAddress.match(/127\.0\.\d+\.\d+/) ) {

            // Save the user parameters to the configuration:
            req.user = config.users['gilles.rasigade@gmail.com'];

            return callback( true );

        }
    }

    return error();
}


/**
 * Check Request
 * Checks Key and IP Address
 */

var checkReq = function (config, req, res, callback ) {

    // Set access control headers
    res.header('Access-Control-Allow-Origin', '*');

    // Check key and IP
    if(!checkKey(config, req) || !checkIP(config, req)) {
        res.send(401);
        return false;
    }

    // REF: http://stackoverflow.com/questions/12296017/how-to-validate-a-oauth2-0-access-token-for-a-resource-server
    // Request: https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=1/fFBGRNJru1FQd44AzqT3Zg
    // if ( config.googleOauth || !checkKey(config, req) )

    return checkToken(req,callback,function(){
        res.send(401);
        return false;
    });
};

/**
 * Response Error
 */

var resError = function (code, raw, res) {

    var codes = {
        100: "Unknown command",
        101: "Could not list files",
        102: "Could not read file",
        103: "Path does not exist",
        104: "Could not create copy",
        105: "File does not exist",
        106: "Not a file",
        107: "Could not write to file",
        108: "Could not delete object"
    };

    res.send({ "status": "error", "code": code, "message": codes[code], "raw": raw });
    return false;

};

/**
 * Response Success
 */

var resSuccess = function (data, res) {

    res.send({ "status": "success", "data": data });

};

/**
 * Merge function
 */

var merge = function (obj1,obj2) {
    var mobj = {},
        attrname;
    for (attrname in obj1) { mobj[attrname] = obj1[attrname]; }
    for (attrname in obj2) { mobj[attrname] = obj2[attrname]; }
    return mobj;
};

/**
 * Get Base Path
 */

var getBasePath = function (path) {
    var base_path = path.split("/");

    base_path.pop();
    return base_path.join("/");
};

/**
 * Check Path
 */

var checkPath = function (path) {
    var base_path = getBasePath(path);
    return fs.existsSync(base_path);
};

// Function to build item for output objects
var createItems = function ( req , res , path , files ) {

    // Ensure ending slash on path
    (path.slice(-1)!=="/") ? path = path + "/" : path = path;

    var output = {},
        output_dirs = [],
        output_files = [],
        current,
        relpath,
        link;

    var createItem = function (current, relpath, type, link) {

        console.log( 208 , relpath , relpath.replace(req.base,'').replace('//','/') );

        var item = {
            path: relpath.replace(req.base,'').replace(/\/+/,'/'),
            type: type,
            size: fs.lstatSync(current).size,
            atime: fs.lstatSync(current).atime.getTime(),
            mtime: fs.lstatSync(current).mtime.getTime(),
            link: link
        };

        for ( var i in config.types ) {
            if ( item.path.match( new RegExp( config.types[i] , 'i' ) ) ) {
                item.type = i;
                break;
            }
        }

        switch ( type ) {
            case 'directory':
                var child = exec('ls --directory "' + req.base + item.path + '" | wc -l',function (err, stdout, stderr) {
                    if (err) throw err;

                    item.directory = {
                        subdirectories: parseInt( stdout , 10 )
                    }
                })
                break;
        }

        return item;
    };

    // Sort alphabetically
    files.sort(function(a, b){

      if (a.indexOf('.') !== -1 || b.indexOf('.') !== -1 ||
        !a.match(/^\d{4}(-\d{2})?/) || !b.match(/^\d{4}(-\d{2})?/)) {
        if(a.toLowerCase() < b.toLowerCase()) return -1;
        if(a.toLowerCase() > b.toLowerCase()) return 1;
        return 0;
      }

      // Sort dated folders counter chronological order
      if(a.toLowerCase() > b.toLowerCase()) return -1;
      if(a.toLowerCase() < b.toLowerCase()) return 1;
      return 0;

      
    });

    // Loop through and create two objects
    // 1. Directories
    // 2. Files
    for (var i=0, z=files.length-1; i<=z; i++) {
        if ( files[i] ) {
            current = path + files[i];
            relpath = current.replace( req.user && req.user.base ? req.user.base : config.base ,"/");
            (fs.lstatSync(current).isSymbolicLink()) ? link = true : link = false;
            if ( !relpath.match(/\/\./) ) {

                // Check whether the user has access to this file:
                var isFiltered = ( req.user.allow && null === current.match( new RegExp( req.user.allow , "i" ) ) );

                if ( !isFiltered ) {

                    if ( req.params.tree ) {
                        if (fs.lstatSync(current).isDirectory()) {
                            output_dirs.push( relpath );
                            // output_dirs[ relpath ] = {};
                        }
                    } else if (fs.lstatSync(current).isDirectory()) {
                        //output_dirs[files[i]] = createItem(current,relpath,"directory",link);
                        output_dirs.push( createItem(current,relpath,"directory",link) );
                    } else {
                        //output_files[files[i]] = createItem(current,relpath,"file",link);
                        output_files.push( createItem(current,relpath,"file",link) );
                    }
                }
            }
        }
    }

    // Merge so we end up with alphabetical directories, then files
    // output = merge(output_dirs,output_files);
    output = output_dirs.concat(output_files)

    // Statistics about the current list of folders / files:
    var total = output.length;
    var offset = parseInt( req.params.offset ? req.params.offset : 0 , 10 );
    var limit = parseInt( req.params.limit ? req.params.limit : 1000 , 10 );
    output = output.slice(offset).slice(0,limit);

    // Send output
    resSuccess({
        total: total,
        offset: offset,
        limit: limit,
        list: output
    }, res);
}

/**
 * GET (Read)
 *
 * Commands:
 * dir - list contents of directory
 * file - return content of a file
 *
 */
server.get(commandRegEx, function (req, res, next) {

    // Check request
    checkReq(config, req, res, function(){

        if ( !req.user || !req.user.permissions || -1 === req.user.permissions.indexOf('GET') ) {
            res.send(403);
        }

        // Base definition
        var base = req.base = req.user && req.user.base ? req.user.base : config.base;

        // Set path
        var path = decodeURIComponent( unescape( base + "/" + req.params[2] ) );

        console.log( req.params[1] );

        switch (req.params[1]) {

            case 'certificate':

                // Check HTTPS activation:
                if (config.ssl.key && config.ssl.cert) {

                    res.setHeader('Content-disposition', 'attachment; filename=certificate.crt');
                    res.setHeader('Content-type', 'application/x-x509-ca-cert');


                    // Read certificate:
                    var certificate = fs.readFileSync(config.ssl.cert);
                    res.send( certificate );

                }
                return res.end();
                break;

            // Route for the users which need to accept self-signed certificate:
            case 'accept-certificate':


                res.setHeader('Content-type', "text/html");
                return res.end('<html><body><script type="text/javascript">window.close();</script></body></html>');
                break;

            case 'servers':
                // Send output
                resSuccess(config.servers, res);
                break;

            // List contents of directory
            case "_dir":
                fs.readdir(path, function (err, files) {
                    if (err) {
                        resError(101, err, res);
                    } else {

                        return createItems( req , res , path , files );

                        // Ensure ending slash on path
                        (path.slice(-1)!=="/") ? path = path + "/" : path = path;

                        var output = {},
                            output_dirs = [],
                            output_files = [],
                            current,
                            relpath,
                            link;

                        // Function to build item for output objects
                        var createItem = function (current, relpath, type, link) {

                            var item = {
                                path: relpath.replace('//','/'),
                                type: type,
                                size: fs.lstatSync(current).size,
                                atime: fs.lstatSync(current).atime.getTime(),
                                mtime: fs.lstatSync(current).mtime.getTime(),
                                link: link
                            };

                            switch ( type ) {
                                case 'directory':
                                    var child = exec('ls --directory "' + config.base + item.path + '" | wc -l',function (err, stdout, stderr) {
                                        if (err) throw err;

                                        item.directory = {
                                            subdirectories: parseInt( stdout , 10 )
                                        }
                                    })
                                    break;
                            }

                            return item;
                        };

                        // Sort alphabetically
                        files.sort();

                        // Loop through and create two objects
                        // 1. Directories
                        // 2. Files
                        for (var i=0, z=files.length-1; i<=z; i++) {
                            current = path + files[i];
                            relpath = current.replace(config.base,"");
                            (fs.lstatSync(current).isSymbolicLink()) ? link = true : link = false;
                            if ( !relpath.match(/\/\./) ) {
                                if (fs.lstatSync(current).isDirectory()) {
                                    //output_dirs[files[i]] = createItem(current,relpath,"directory",link);
                                    output_dirs.push( createItem(current,relpath,"directory",link) );
                                } else {
                                    //output_files[files[i]] = createItem(current,relpath,"file",link);
                                    output_files.push( createItem(current,relpath,"file",link) );
                                }
                            }
                        }

                        // Merge so we end up with alphabetical directories, then files
                        // output = merge(output_dirs,output_files);
                        output = output_dirs.concat(output_files)

                        // Statistics about the current list of folders / files:
                        var total = output.length;
                        var offset = parseInt( req.params.offset ? req.params.offset : 0 , 10 );
                        var limit = parseInt( req.params.limit ? req.params.limit : 1000 , 10 );
                        output = output.slice(offset).slice(0,limit);

                        // Send output
                        resSuccess({
                            total: total,
                            offset: offset,
                            limit: limit,
                            list: output
                        }, res);
                    }
                });
                break;

            case 'dir':

                var cmd = 'cd "'+path+'"; find . -maxdepth 1  | sed "s/^\\.\\///" ';

                path = path.replace(/\/+/,'/');

                if ( req.params.s && '' !== req.params.s ) {
                    var search = req.params.s.split(' ');
                    var searchCommand = '';
                    for ( var i in search ) {
                        if ( 'type:' === search[i].substr(0,5) ) {
                            searchCommand += ' -type ' + search[i].substr(5,1);
                            delete search[i];
                        } else {
                            search[i] = search[i].replace(/(\.|'|")/,'\\$1');
                        }
                    }

                    cmd = 'cd "'+path+'"; find . '+searchCommand+' -iregex ".*'+search.join('.*')+'[^/]*$" | head -250  | sed "s/\\.\\///" ';

                }

                //console.log( 500 , 'Command for dir: ' , cmd );
                var child = exec(cmd,function (err, stdout, stderr) {
                    if (err) throw err;
                    var files = stdout.split("\n");
                    //console.log( stdout );
                    return createItems(req,res,path,files);
                });

                break;

            case 'statistics':

                var type = fs.lstatSync(path).isDirectory() ? 'directory' : 'file';

                switch ( type ) {
                    case 'directory':

                        fs.readdir(path, function (err, files) {
                            if ( err ) { console.error( err ); throw err; }

                            req.stats = {};
                            console.log( 576 , path , 'reset stats' );

                            // Sort alphabetically
                            files.sort();

                            // Loop through and create two objects
                            // 1. Directories
                            // 2. Files
                            var f = function(){
                                console.log( 585 , files.length );
                                if ( files.length ) {
                                    file = files.shift();
                                    current = (path + '/' + file).replace(/\/+/g,'/');
                                    if ( !current.match(/\/\./) ) {
                                        if (fs.lstatSync(current).isDirectory()) {

                                            req.stats[file] = {};
                                                console.log( 'd' , file , req.stats[file] );

                                            var cmd = 'cd "'+current+'"; find . -type d | wc -l';
                                            var child = exec(cmd,function (err, stdout, stderr) {
                                                if ( err ) { console.error( err ); throw err; }

                                                console.log( 'd' , req.stats , file , req.stats[file] );
                                                req.stats[file].directories = parseInt( stdout , 10 ) - 1;

                                                var cmd = 'cd "'+current+'"; find . -type f -regextype posix-egrep -iregex ".*'+config.types.image+'" | wc -l';
                                                var child = exec(cmd,function (err, stdout, stderr) {
                                                    if ( err ) { console.error( err ); throw err; }

                                                    console.log( 'i' , file , req.stats , req.stats[file] );
                                                    req.stats[file].images =parseInt( stdout , 10 );

                                                    var cmd = 'cd "'+current+'"; find . -type f -regextype posix-egrep -iregex ".*'+config.types.video+'" | wc -l';
                                                    var child = exec(cmd,function (err, stdout, stderr) {
                                                        if ( err ) { console.error( err ); throw err; }

                                                        console.log( 'v' , file , req.stats , req.stats[file] );
                                                        req.stats[file].videos =parseInt( stdout , 10 );

                                                        var cmd = 'cd "'+current+'"'+"; du | tail -1 | sed 's/\t\.*$//'";
                                                        var child = exec(cmd,function (err, stdout, stderr) {
                                                            if ( err ) { console.error( err ); throw err; }

                                                            console.log( 'f' , req.stats[file] );
                                                            req.stats[file].size =parseInt( stdout , 10 );
                                                            f();
                                                        });
                                                    });
                                                });

                                            })
                                        } else f();
                                    } else f();
                                } else {
                                    // Send output
                                    resSuccess(req.stats, res);
                                }
                            }; f();

                        });

                        break;
                }
                break;

            // List contents of directory
            case "thumb":

                var searchThumb = function ( path , level , callback ) {

                    // console.log( 365 , path , level );

                    if ( level > 5 ) {
                        //resSuccess({}, res);
                        callback();
                        return false;
                    }

                    //console.log( 367 , path );

                    fs.readdir(path, function (err, files) {
                        if (err) {
                            //resError(101, err, res);
                            console.error( '387 - Error reading: ' , path , err );
                        } else {

                            // console.log( files ); return;
                            for (var i=0, z=files.length-1; i<=z; i++) {
                                // console.log( files[i] , files[i].match(/\.cover/) );
                                if ( files[i].match(/\.cover/) ) {
                                    console.log('read from .cover');
                                    var url = '/' + req.params[0] + '/image/' + escape( path.replace(req.base,'') + '/' +files[i] ) + '?w=512&h=512&access_token='+req.query['access_token'];
                                    res.writeHead(302, {
                                      'Location': url,
                                      'Content-Type': 'charset=utf-8'
                                    });

                                    return res.end();
                                }
                            }

                            for (var i=0, z=files.length-1; i<=z; i++) {
                                //console.log( 612 , files[i] , files[i].match( new RegExp( config.types.image , 'i' ) ) );
                                if ( files[i].match( new RegExp( config.types.image , 'i' ) ) ) {

                                    // console.log( 614 , path.replace(config.base,'') + '/' +files[i] );
                                    // Copy the file to the directory temporary folder:
                                    var absolute = path.replace(base,'') + '/' +files[i];
                                    var cover = absolute.replace(/\/[^\/]*(\.[^\.]+)$/,'/.cover$1');

                                    // console.log( 619 , config.base+absolute, config.base+cover );

                                    fs.copy(base+absolute, base+cover, function(err){
                                        if (err) throw err;
                                        var url = '/' + req.params[0] + '/image/' + escape( absolute ) + '?w=512&h=512&access_token='+req.query['access_token'];
                                        // console.log( 'URL:' , encodeURI( url ) , files[i] ,config.base );
                                        res.writeHead(302, {
                                          'Location': url,
                                          'Content-Type': 'charset=utf-8'
                                        });

                                        return res.end();
                                    });

                                    return true;
                                    //return  resSuccess(files[i], res);
                                }
                            }

                            // Thumb not found:
                            var i = 0 , f = function () {

                                if ( i < files.length ) {

                                    current = (path + files[i]).replace(/\/+/,'/');
                                    relpath = current.replace(base,"");

                                    i++;

                                    (fs.lstatSync(current).isSymbolicLink()) ? link = true : link = false;
                                    if ( null === relpath.match(/\/\./) ) {
                                        //console.log( 394 , current , fs.lstatSync(current).isDirectory() );
                                        if (fs.lstatSync(current).isDirectory()) {
                                            //console.log( 395 , current );
                                            //searchThumb(current+'/',level+1);
                                            return searchThumb(current+'/',level+1,f);
                                        }
                                    }

                                    return f();

                                } else {
                                    return callback();
                                }


                            }; return f();

                        }
                    });
                }

                searchThumb(path,0,function(){

                    //resSuccess({}, res);
                    res.writeHead(200, {'Content-Type': 'image/gif' });
                    res.end( 'GIF89a€ÿÿÿ!ù,D;' , 'binary' );

                });

                break;

            // Return contents of requested file
            case "file":
                fs.readFile(path, "utf8", function (err, data) {
                    if (err) {
                        resError(102, err, res);
                    } else {
                        resSuccess(data, res);
                    }
                });
                break;

            case 'download':

                var _download = function ( path ) {
                    // Read image parameters:
        	        var extension = p.extname(path).substr(1);
         	        var basename = p.basename(path,'.'+extension);
         	        var dirname = p.dirname(path);
         	        var mimetype = mime.lookup(path);

                    //console.log( extension , basename , dirname , mimetype );

                    res.setHeader('Content-disposition', 'attachment; filename=' + basename);
                    res.setHeader('Content-type', mimetype);

                    var filestream = fs.createReadStream(path);
                    filestream.pipe(res);
                }

                if (fs.lstatSync(path).isDirectory()) {

                    // REF: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
                    var guid = config.tmp + '/' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                        return v.toString(16);
                    }) + '.zip';

                    var child = exec('zip -r "' + guid + '" "' + path + '"',function (err, stdout, stderr) {

                        _download(guid);

                        fs.remove(guid);

                    });

                } else {

                    _download(path);

                }
                break;

            // Output the image content itself
            case "image":

                // Read image parameters:
    	        var extension = p.extname(path).substr(1);
     	        var basename = p.basename(path,'.'+extension);
     	        var dirname = p.dirname(path);

     	        // Image on fly resize:
     	        var _config = {
                    format: extension.toLowerCase(),
                    progressive: true
                }

                //console.log( 719 , _config );

     	        // Image manipulation parameters:
     	        if ( req.params.w ) _config.width = req.params.w;
     	        if ( req.params.h ) _config.height = req.params.h;

     	        if ( _config.width || _config.height ) {

     	            // Temporary image name:
     	            var tmp = ( config.tmp + '/' + dirname.replace(base,'') + '/' + basename +
                        ( _config.width ? '-w='+_config.width : '' ) +
                        ( _config.height ? '-h='+_config.height : '' ) +
                        '.'+extension ).replace(/\/+/g,'/');

     	            if ( config.tmp && fs.existsSync(tmp) ) {

     	                res.writeHead(200, {'Content-Type': 'image/' + extension.toLowerCase() });
                        res.end( fs.readFileSync(tmp) , 'binary' );

     	            } else {

     	                im.readMetadata( path , function(err, metadata){
     	                  //  //console.log( 490 , arguments );

     	                    // Read the metadata for image orientation:
     	                    var rotate = 0;
     	                    if ( metadata.exif && metadata.exif.orientation ) {
     	                        switch ( metadata.exif.orientation ) {
     	                            case 3:
                                        rotate = 180;
                                        break;
                                    case 6:
                                        rotate = 90;
                                        break;
                                    case 8:
                                        rotate = -90;
                                        break;
     	                        }
     	                    }

         	                // Read the image file:
         	                _config.srcData = fs.readFileSync(path);

                 	        im.resize( _config, function(err, stdout, stderr){
                 	            if ( err ) {
                 	                // Output the resized image:
                                    res.writeHead(200, {'Content-Type': 'image/' + extension.toLowerCase() });
                                    res.end(fs.readFileSync(path), 'binary');
                                    return;
                 	            }

                                // Create the tmp directory if not exist:
                                var tmpDir = p.dirname(tmp);
                                if ( !fs.existsSync(tmpDir) ) {
                                    fs.mkdirsSync(tmpDir);
                                }

                                // Write the image cache version:
                                fs.writeFileSync( tmp, stdout, 'binary' );

                                im.convert([tmp, '-rotate', rotate, tmp],  function(err, _stdout){
                                    if (err) throw err;

                                    // Output the resized image:
                                    res.writeHead(200, {'Content-Type': 'image/' + extension.toLowerCase() });
                                    res.end(fs.readFileSync(tmp), 'binary');

                                });
                            });
     	                });
     	            }

     	        } else {

                    // Direct image rendering:
     	            res.writeHead(200, {'Content-Type': 'image/' + extension.toLowerCase() });
                    res.end( fs.readFileSync(path) , 'binary' );

                    // Following code is working for base64 images output: (no image/ Content-Type header)
                    // var base64 = new Buffer(fs.readFileSync(path), 'binary').toString('base64');
                    // res.end( 'data:image/' + extension + ';base64,' + base64 );
     	        }

    	        break;

            case 'video':

                //console.log('streaming video...' , path );
                if (fs.existsSync(path)) {

                    var output = function( path ) {
                        fs.readFile(path, function (err, data) {
                            if (err) {
                                throw err;
                            }
                            var total;
                            total = data.length;

                            var range = req.headers.range;

                            var positions = range.replace(/bytes=/, "").split("-");
                            var start = parseInt(positions[0], 10);
                            // if last byte position is not present then it is the last byte of the video file.
                            var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
                            var chunksize = (end-start)+1;

                            res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total,
                                                 "Accept-Ranges": "bytes",
                                                 "Content-Length": chunksize,
                                                 "Content-Type":"video/mp4"});
                            res.end(data.slice(start, end+1), "binary");

                        });
                    }

                    if ( path.match(/\.(avi|mov)$/i) ) {

                        // Install ffmpeg on Ubuntu to use fluent-ffmpeg
                        // REF: https://launchpad.net/~mc3man/+archive/ubuntu/trusty-media
                        // REF: http://askubuntu.com/questions/445536/unable-to-locate-package-add-apt-repository-error

                        var tmp = decodeURIComponent( unescape( config.tmp + '/' + req.params[2].replace(/\.(avi|mov)$/i,'.webm') ));

                        if (fs.existsSync(tmp)) {

                            output(tmp);

                        } else {

                            var cmd = 'ffmpeg -y -i "'+path+'" "'+tmp+'"';

                            //console.log( 759 , path , tmp , cmd );

                            // Create the tmp directory if not exist:
                            var tmpDir = p.dirname(tmp);
                            if ( !fs.existsSync(tmpDir) ) {
                                fs.mkdirsSync(tmpDir);
                            }

                            var child = exec(cmd,function (err, stdout, stderr) {

                                output( tmp );

                            });
                        }

                        /*

                        // ffmpeg(path).run();
                        // make sure you set the correct path to your video file
                        var proc = ffmpeg( path )
                          // set video bitrate
                          .videoBitrate(1024)
                          // set target codec
                          .videoCodec('h264')
                          // set aspect ratio
                          .aspect('16:9')
                          // set size in percent
                          .size('50%')
                          // set fps
                          //.fps(24)
                          // set audio bitrate
                          //.audioBitrate('128k')
                          // set audio codec
                          //.audioCodec('libmp3lame')
                          // set number of audio channels
                          //.audioChannels(2)
                          // set custom option
                          //.addOption('-vtag', 'DIVX')
                          // set output format to force
                          .format('mp4')
                          // setup event handlers
                          .on('end', function() {
                            console.log('file has been converted succesfully');
                          })
                          .on('error', function(err) {
                            console.log('an error happened: ' + err.message);
                          })
                          // save to file
                          .save('/tmp/tmp.mp4');

                          */
                    } else {

                        output( path );

                    }

                }

                break;

            case 'tree':



                break;

            default:
                // Unknown command
                resError(100, null, res);
        }

        return next();
    });
});

/**
 * POST (Create)
 *
 * Commands:
 * dir - creates a new directory
 * file - creates a new file
 * copy - copies a file or dirextory (to path at param "destination")
 *
 */
server.post(commandRegEx, function (req, res, next) {

    // Check request
    checkReq(config, req, res, function(){

        if ( !req.user || !req.user.permissions || -1 === req.user.permissions.indexOf('POST') ) {
            res.send(403);
        }

        // Base definition
        var base = req.base = req.user && req.user.base ? req.user.base : config.base;

        // Set path
        var path = decodeURIComponent( unescape( base + "/" + req.params[2] ) );

        switch (req.params[1]) {

            // Creates a new directory
            case "dir":

                // Ensure base path
                if (checkPath(path)) {
                    // Base path exists, create directory
                    fs.mkdir(path, config.cmode, function () {
                        resSuccess(null, res);
                    });
                } else {
                    // Bad base path
                    resError(103, null, res);
                }
                break;

            // Creates a new file
            case "file":
                // Ensure base path
                if (checkPath(path)) {
                    // Base path exists, create file
                    fs.openSync(path, "w");
                    resSuccess(null, res);
                } else {
                    // Bad base path
                    resError(103, null, res);
                }
                break;

            case 'upload':

                console.log('Upload file: ');

                //console.log( path , req.files.file )
                var file = req.files.file;

                // Move the tmp file to the correctdirectory:
                fs.copy(file.path, path+'/'+file.name, function(err){

                  // Rename the file on upload:
                  exec("exiftool -r '-FileName<CreateDate' -d '%Y-%m-%d-%H:%M:%S%%-c.%%le' + '" + path+'/'+file.name + "'", 
                  function (err, stdout, stderr) {
                    resSuccess({}, res);
                  });

                  fs.remove(file.path);

                });

                break;

            // Copies a file or directory
            // Supply destination as full path with file or folder name at end
            // Ex: http://yourserver.com/{key}/copy/folder_a/somefile.txt, destination: /folder_b/somefile.txt
            case "copy":
                var destination = base + "/" + req.params.destination;
                if (checkPath(path) && checkPath(destination)) {
                    fs.copy(path, destination, function(err){
                        if (err) {
                            resError(104, err, res);
                        }
                        else {
                            resSuccess(null, res);
                        }
                    });
                } else {
                    // Bad base path
                    resError(103, null, res);
                }
                break;

            default:
                // Unknown command
                resError(100, null, res);
        }

        return next();
    });
});

/**
 * PUT (Update)
 *
 * Commands:
 * rename - renames a file or folder (using param "name")
 * save - saves contents to a file (using param "data")
 *
 */
server.put(commandRegEx, function (req, res, next) {

    // Check request
    checkReq(config, req, res, function(){

        if ( !req.user || !req.user.permissions || -1 === req.user.permissions.indexOf('PUT') ) {
            res.send(403);
        }

        // Base definition
        var base = req.base = req.user && req.user.base ? req.user.base : config.base;

        // Set path
        var path = decodeURIComponent( unescape( base + "/" + req.params[2] ) );

        switch (req.params[1]) {

            // Rename a file or directory
            case "rename":

                var base_path = getBasePath(path);

                fs.rename(path,base_path + "/" + req.params.name, function () {
                    resSuccess(null, res);

                    var tmp = config.tmp + '/' + decodeURIComponent( unescape( req.params[2] ));
                    // console.log('rename',tmp,tmp.replace(/[^\/]+$/,'') + '/' + req.params.name);
                    fs.rename(tmp,tmp.replace(/[^\/]+$/,'') + '/' + req.params.name, function () {

                    });


                });

                break;

            // Saves contents to a file
            case "save":

                // Make sure it exists
                if (fs.existsSync(path)) {
                    // Make sure it's a file
                    if (!fs.lstatSync(path).isDirectory()) {
                        // Write
                        fs.writeFile(path, req.params.data, function(err) {
                            if(err) {
                                resError(107, err, res);
                            } else {
                                resSuccess(null, res);
                            }
                        });
                    } else {
                        resError(106, null, res);
                    }
                } else {
                    resError(105, null, res);
                }

                break;

            // Rotate an image
            case "rotate":

                // Make sure it exists
                if (fs.existsSync(path)) {

                    var rotate = req.params.rotate;

                    var extension = p.extname(path).substr(1);
     	            var basename = p.basename(path,'.'+extension);
     	            var dirname = p.dirname(path);


                    console.log('Rotate:' , path , rotate );
                    im.convert([path, '-rotate', rotate, path],  function(err, _stdout){
                        if (err) throw err;

                        resSuccess(null, res);

                        // Remove cache files:
                        var tmp = config.tmp + '/' + decodeURIComponent( unescape ( req.params[2] )).replace( '.' + extension , '' );

                        // Remove the image cache versions
                        var cmd = 'rm -f ' + tmp.replace(/ /g,'\\ ') + '*;'
                        //console.log( cmd );
                        var child = exec(cmd,function (err, stdout, stderr) {});

                    });
                }

                break;

            case "cover":
                // Make sure it exists
                if (fs.existsSync(path) && fs.existsSync(base +'/'+req.params.target) ) {
                    var cover = req.params.target + '/' + decodeURIComponent( unescape( path.replace(/^.*\/[^\/]*(\.[^\.]+)$/,'.cover$1')));


                    console.log( 'cover copy' , path, base+'/'+cover );

                    fs.copy( path, base+'/'+cover, function(err){
                        if(err)throw err;
                        // console.log( 'rm -f ' + (config.tmp + '/' + cover.replace(/(-[^\/-]+)?\.[^\/\.]*$/,'*')).replace(/ /g,'\\ ') );
                        var child = exec('rm -f ' + (config.tmp + '/' + cover.replace(/(-[^\/-]+)?\.[^\/\.]*$/,'*')).replace(/ /g,'\\ '),function (err, stdout, stderr) {});

                        resSuccess(null, res);
                    });
                }
                break;

            default:
                // Unknown command
                resError(100, null, res);
        }

        return next();

    });

});

/**
 * DELETE
 */
server.del(pathRegEx, function (req, res, next) {

    // Check request
    checkReq(config, req, res, function() {

        if ( !req.user || !req.user.permissions || -1 === req.user.permissions.indexOf('DELETE') ) {
            res.send(403);
        }

        // Base definition
        var base = req.base = req.user && req.user.base ? req.user.base : config.base;

        // Set path
        var path = decodeURIComponent( unescape( base + "/" + req.params[1] ) );

        console.log( 'Removing: ' , path );

        // Make sure it exists
        if (fs.existsSync(path)) {

            // Remove file or directory
            fs.remove(path, function (err) {
                if (err) {
                    resError(108, err, res);
                } else {
                    resSuccess(null, res);

                    var tmp = config.tmp + '/' + req.params[1];
                    fs.remove(tmp, function () {});

                }
            });
        } else {
            resError(103, null, res);
        }

        return next();

    });

});

/**
 * START SERVER
 */
server.listen(config.port, function () {
    console.log("%s listening at %s", server.name, server.url);
});
