
/**
    Multiplexing Routing:
        Node
        Branch
        Patterns NYI
        Method
        Accept
        Language
    Trial Routing:
        FirstFound
    Decorators:
        ContentLength
        Error
        Log
        CookieSession
        PathSession
        Decorators
    Adapters:
        PostJson
        Json
        Inspect
    Producers:
        Content
        File
        FileTree
        FileOverlay NYI
        PermanentRedirect
        TemporaryRedirect
    Producer Functions:
        ok
        badRequest
        notFound
        methodNotAllowed
        notAcceptable
        file
        directory
        redirect
        json
    Utility:
        etag
        
*/


// narwhal
var Q = require("narwhal/promise-util");
var FS = require("narwhal/q-fs");
var N_UTIL = require("narwhal/util");
var MIME = require("mime"); // narwhal
var UUID = require("uuid"); // narwhal
var URL = require("url"); // node
var COOKIE = require("./cookie"); // jaque

// node
var SYS = require("sys");

// jaque
var J_UTIL = require("./util");
var MIME_TYPES = require("./mime-types");

exports.Node = function (app, notFound) {
    return exports.Branch({"": app}, notFound);
};

exports.Branch = function (paths, notFound) {
    if (!paths)
        paths = {};
    if (!notFound)
        notFound = exports.notFound;
    return function (request) {
        if (!request.location)
            request.location = "/";
        if (!request.course)
            request.course = request.path;
        if (!/^\//.test(request.course)) {
            // XXX TODO
        }
        var path = request.course.substring(1);
        var parts = path.split("/");
        var part = decodeURIComponent(parts.shift());
        if (N_UTIL.has(paths, part)) {
            request.location = request.location + part + "/";
            request.course = path.substring(part.length);
            return N_UTIL.get(paths, part)(request);
        }
        return notFound(request);
    };
};

exports.Patterns = function (patterns, notFound) {
    return Q.reject("pattern routing not yet implemented");
};

exports.Content = function (body, contentType, status) {
    return function (request) {
        return {
            "status": status,
            "headers": {
                "content-type": contentType
            },
            "body": body
        };
    };
};

exports.ok = function (content, contentType, status) {
    status = status || 200;
    content = content || [""];
    contentType = contentType || "text/plain";
    return {
        "status": status,
        "headers": {
            "content-type": contentType
        },
        "body": content
    };
};

exports.ContentLength = function (app) {
    return function (request) {
        return Q.when(app(request), function (response) {
            if (
                response.headers["content-length"] ||
                response.headers["transfer-encoding"]
            ) {
                return response;
            } else {
                return Q.when(response.body, function (body) {
                    if (Array.isArray(body)) {
                        return Q.when(Q.group(body), function (body) {
                            response.body = body;
                            response.headers["content-length"] = 
                                String(body.reduce(function (sum, value) {
                                    return sum + value.length;
                                }, 0));
                            return response;
                        });
                    } else if (true /* XXX */ || !body.read) {
                        return response;
                    } else {
                        // TODO BUG XXX (does not work for binary data)
                        return Q.when(body.read(), function (body) {
                            response.body = [body];
                            response.headers["content-length"] =
                                String(body.length);
                            return response;
                        });
                    }
                });
            }
        });
    };
};

exports.File = function (path, contentType) {
    return function (request) {
        return exports.file(request, path, contentType);
    };
};

exports.FileTree = function (root, options) {
    if (!options)
        options = {};
    options.notFound = options.notFound || exports.notFound;
    options.file = options.file || exports.file;
    options.directory = options.directory || exports.directory;
    return function (request) {
        if (!request.course)
            request.course = request.path;
        var path = FS.join(root, request.course.substring(1));
        // TODO FS.contains(FS.canonical(root), FS.canonical(path))
        return Q.when(FS.stat(path), function (stat) {
            if (!stat) {
                return options.notFound(request);
            } else if (stat.isFile()) {
                return options.file(request, path, options.contentType);
            } else if (stat.isDirectory()) {
                return options.directory(request, path, options.contentType);
            } else {
                return options.notFound(request);
            }
        }, function (reason) {
            return options.notFound(request);
        });
    };
};

exports.FileOverlay = function (roots, options) {
    throw new Error("NYI");
};

exports.file = function (request, path, contentType) {
    contentType = MIME_TYPES.mimeType(
        FS.extension(path),
        contentType
    );
    return Q.when(FS.stat(path), function (stat) {
        var etag = exports.etag(stat);
        if (etag === request.headers['if-none-match'])
            return J_UTIL.responseForStatus(304);
        return Q.when(FS.open(path), function (stream) {
            return {
                "status": 200,
                "headers": {
                    "content-type": contentType,
                    "etag": etag
                },
                "body": stream
            };
        });
    });
};

exports.etag = function (stat) {
    return [
        stat.ino,
        stat.size,
        Date.parse(stat.mtime)
    ].join("-");
};

exports.directory = function (request, path) {
    return Q.reject("directory listing not yet implemented");
};

exports.PermanentRedirect = function (path, status) {
    return function (request) {
        var location = URL.resolve(request.url, path);
        return exports.redirect(location, status);
    };
};

exports.TemporaryRedirect = function (path, status) {
    return function (request) {
        var location = URL.resolve(request.url, path);
        return exports.redirect(location, status || 307);
    };
};

exports.redirect = function (location, status) {
    status = status || 301;
    // TODO assure that the location is fully qualified

    return {
        "status": status,
        "headers": {
            "location": location,
            "content-type": "text/html"
        },
        "body": [
            'Go to <a href="' + location + '">' +
            location +
            "</a>"
        ]
    };
};

/// branch on HTTP method
exports.Method = function (methods, methodNotAllowed) {
    var keys = Object.keys(methods);
    if (!methodNotAllowed)
        methodNotAllowed = exports.methodNotAllowed;
    return function (request) {
        var method = request.method;
        if (N_UTIL.has(keys, method)) {
            return N_UTIL.get(methods, method)(request);
        } else {
            return methodNotAllowed(request);
        }
    };
};

/// branch on HTTP content negotiation
exports.Accept = function (types, notAcceptable) {
    var keys = Object.keys(types);
    if (!notAcceptable)
        notAcceptable = exports.notAcceptable;
    return function (request) {
        var accept = request.headers["accept"] || "";
        var type = MIME.bestMatch(keys, accept);
        if (N_UTIL.has(keys, type)) {
            return types[type](request);
        } else {
            return notAcceptable(request);
        }
    };
};

/// branch on Language
exports.Language = function (languages, noLanguage) {
    return Q.reject("Language branching not yet implemented");
};

exports.Error = function (app) {
    return function (request) {
        return Q.when(app(request), function (response) {
            return response;
        }, function (error) {
            return J_UTIL.responseForStatus(500, error);
        });
    };
};

exports.Log = function (app) {
    return function (request) {
        SYS.log(
            "=>     " + 
            request.method + " " +
            request.path + " "
        );
        return Q.when(app(request), function (response) {
            SYS.log(
                "<= " + 
                response.status + " " +
                request.method + " " +
                request.path + " " +
                (response.headers["content-length"] || "?")
            );
            return response;
        });
    };
};

// apply a series of decorators
exports.Decorators = function (decorators, app) {
    N_UTIL.reversed(decorators).forEach(function (Middleware) {
        app = Middleware(app);
    });
    return app;
};

exports.Json = function (app) {
    return function (request) {
        return Q.when(app(request), function (object) {
            return exports.json(object);
        });
    };
};

exports.json = function (content, options) {
    options = options || {};
    try {
        var json = JSON.stringify(content, null, options.tabs);
    } catch (exception) {
        return Q.reject(exception);
    }
    return exports.ok([json]);
};

exports.PostJson = function (app, badRequest) {
    if (!badRequest)
        badRequest = exports.badRequest;
    return exports.Method({"POST": function (request) {
        return Q.when(request.body, function (body) {
            return Q.when(body.read(), function (body) {
                try {
                    var object = JSON.parse(body);
                } catch (error) {
                    return badRequest(request, error);
                }
                return app(request, object);
            });
        });
    }});
};

exports.Inspect = function (app) {
    return exports.Method({"GET": function (request) {
        return Q.when(app(request), function (object) {
            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [SYS.inspect(object)]
            }
        });
    }});
};

exports.CookieSession = function (Session) {
    var sessions = {};
    function nextUuid() {
        while (true) {
            var uuid = UUID.uuid();
            if (!N_UTIL.has(sessions, uuid))
                return uuid;
        }
    }
    return function (request) {
        var cookie = COOKIE.parse(request.headers["cookie"]);
        var sessionIds = cookie["session.id"];
        if (!Array.isArray(sessionIds))
            sessionIds = [sessionIds];
        sessionIds = sessionIds.filter(function (sessionId) {
            return N_UTIL.has(sessions, sessionId);
        });
        // verifying cookie
        if (/^\/~session\//.test(request.course)) {
            if (cookie["session.id"])
                return exports.Redirect("../")(request);
            // TODO more flexible session error page
            return {
                "status": 404,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [
                    "Access requires cookies"
                ]
            }
        // session exists
        } else if (
            N_UTIL.has(cookie, "session.id") &&
            sessionIds.length
        ) {
            var session = sessions[sessionIds[0]];
            session.lastAccess = new Date();
            request.session = session;
            return session.route(request);
        // new session
        } else {
            var session = {
                "id": nextUuid(),
                "lastAccess": new Date()
            };
            sessions[session.id] = session;
            session.route = Session(session);
            var response = exports.Redirect(request.location + "~session/")(request);
            response.headers["set-cookie"] = COOKIE.format(
                "session.id", session.id, {
                    "path": request.location
                }
            );
            return response;
        }
    };
};

exports.PathSession = function (Session) {
    var sessions = {};
    function nextUuid() {
        while (true) {
            var uuid = UUID.uuid();
            if (!N_UTIL.has(sessions, uuid))
                return uuid;
        }
    }
    return function (request) {
        // TODO request.course and request.location
        if (request.course == "/") {
            // new session
            var session = {
                "id": nextUuid(),
                "lastAccess": new Date()
            };
            sessions[session.id] = session;
            session.route = Session(session);
            return exports.Json(function (request) {
                return session;
            })(request);
        } else if (N_UTIL.has(sessions, request.course.substring(1))) {
            return N_UTIL.get(sessions, request.course.substring(1)).route(request);
        } else {
            return exports.responseForStatus(404, "Session does not exist");
        }
    };
};

exports.FirstFound = function (cascade) {
    return function (request) {
        var i = 0, ii = cascade.length;
        function next() {
            var response = cascade[i++](request);
            if (i < ii) {
                return Q.when(response, function (response) {
                    if (response.status === 404) {
                        return next();
                    } else {
                        return response;
                    }
                });
            } else {
                return response;
            }
        }
        return next();
    };
};

exports.badRequest = J_UTIL.appForStatus(400);
exports.notFound = J_UTIL.appForStatus(404);
exports.methodNotAllowed = J_UTIL.appForStatus(405);
exports.notAcceptable = J_UTIL.appForStatus(406);

