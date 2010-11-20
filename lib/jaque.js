
/*whatsupdoc*/

/**
 * Provides tools for making, routing, adapting, and decorating
 * Q-JSGI web applications.
 *
 * Duck Types
 * ----------
 *
 * A Q-JSGI _app_ is a function that accepts a request and returns a
 * response.  The response may be promised.
 *
 * A Q-JSGI _request_ is an object or a promise for an object that has
 * the following properties:
 *
 * * `method` is the HTTP request method as a string.
 * * `path` is a string, guaranteed to start with `"/"`.
 * * `headers` is an object mapping lower-case HTTP headers to
 *   their corresponding values as strings.
 * * `body` is a Q-JSGI content body.
 *
 * A Q-JSGI _response_ is an object or a promise for an object that
 * has the following properties:
 *
 * * `status` is the HTTP response status code as a number.
 * * `headers` is an object mapping lower-case HTTP headers to their
 *   corresponding values as strings.
 * * `body` is a Q-JSGI content body.
 *
 * A Q-JSGI response and request content _body_ can be as simple as an
 * array of strings.  It can be a promise.  In general, it must be an
 * object that has a `forEach` method.  The `forEach` method accepts a
 * `write` function.  It goes without saying that `forEach` returns
 * `undefined`, but it can return a promise for `undefined` that will
 * resolve when it has made all of its `write` calls and the request
 * or response can be closed, re-used, or kept alive..  The `forEach`
 * function may call `write` with a `String` any number of times.  The
 * `String` may be promised.
 *
 * @module
 */

/*
    Multiplexing Routing:
        End
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
        FileConcat
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

var N_UTIL = require("n-util");
var Q = require("q-util");
var FS = require("q-fs");
var MIME = require("mimeparse");
var UUID = require("uuid");

// node
var URL = require("url");
var inspect = require("sys").inspect;

// jaque
var J_UTIL = require("./jaque/util");
var MIME_TYPES = require("./jaque/mime-types");
var COOKIE = require("./jaque/cookie");

/**
 * Makes a  Q-JSGI app that only responds when there is nothing left
 * on the path to route.  If the there is unprocessed data on the
 * path, the returned app either forwards to the `notFound` app or
 * returns a `404 Not Found` response.
 *
 * @param {App} app a Q-JSGI application to
 * respond to this end of the routing chain.
 * @param {App} notFound (optional) defaults
 * to the `notFound` app.
 * @returns {App}
 */
exports.End = function (app, notFound) {
    return exports.Branch({"": app}, notFound);
};

/**
 * Makes a Q-JSGI app that branches requests based on the next
 * unprocessed path component.
 * @param {Object * App} paths a mapping from path components (single
 * file or directory names) to Q-JSGI applications for subsequent
 * routing.  The mapping may be a plain JavaScript `Object` record,
 * which must own the mapping properties, or an object that has
 * `has(key)` and `get(key)` methods in its prototype chain.
 * @param {App} notFound a Q-JSGI application
 * that handles requests for which the next file name does not exist
 * in paths.
 * @returns {App}
 */
exports.Branch = function (paths, notFound) {
    if (!paths)
        paths = {};
    if (!notFound)
        notFound = exports.notFound;
    return function (request) {
        if (!/^\//.test(request.pathInfo)) {
            return Q.reject(
                "Cannot branch on partial paths.  The path must begin with " +
                "'/' at a Branch point. " + JSON.stringify(request.pathInfo) +
                " at " + JSON.stringify(request.scriptName)
            );
        }
        var path = request.pathInfo.substring(1);
        var parts = path.split("/");
        var part = decodeURIComponent(parts.shift());
        if (N_UTIL.has(paths, part)) {
            request.scriptName = request.scriptName + part + "/";
            request.pathInfo = path.substring(part.length);
            return N_UTIL.get(paths, part)(request);
        }
        return notFound(request);
    };
};

exports.Patterns = function (patterns, notFound) {
    return Q.reject("pattern routing not yet implemented");
};

/**
 * Makes an app that returns a response with static content
 * from memory.
 * @param {Body} body a Q-JSGI
 * response body
 * @param {String} contentType
 * @param {Number} status
 * @returns {App} a Q-JSGI app
 */
exports.Content = function (body, contentType, status) {
    return function (request) {
        return {
            "status": status || 200,
            "headers": {
                "content-type": contentType || "text/plain"
            },
            "body": body || ""
        };
    };
};

/**
 * Returns a Q-JSGI response with the given content.
 * @param {Body} content (optional) defaults to `[""]`
 * @param {String} contentType (optional) defaults to `"text/plain"`
 * @param {Number} status (optional) defaults to `200`
 * @returns {Response}
 */
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

/**
 * Decorates a Q-JSGI application, such that responses have a
 * `"content-length"` header.  This causes the response content to be
 * accumulated instead of streamed.  If a response already has a
 * `"content-length"` or `"transfer-encoding"` header, it is passed
 * through unaltered.
 *
 * @param {App} app
 * @returns {App}
 */
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
                        return Q.when(Q.shallow(body), function (body) {
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

/**
 * @param {String} path
 * @param {String} contentType
 * @returns {App}
 */
exports.File = function (path, contentType) {
    return function (request) {
        return exports.file(request, String(path), contentType);
    };
};

/**
 * Provides an app that responds with a concatenated
 * list of files, based on their paths.
 *
 * @param {Array*String} paths
 * @param {String} contentType
 * @returns {App}
 */
exports.FileConcat = function (fileNames, contentType) {
    return function (request) {
        return {
            "status": 200,
            "headers": {
                "content-type": contentType || "text/plain"
            },
            "body": {
                "forEach": function (write) {
                    return fileNames.map(function (fileName) {
                        return FS.open(fileName);
                    }).reduce(function (previousDone, file) {
                        return Q.when(previousDone, function (input) {
                            return Q.when(file, function (file) {
                                return file.forEach(write);
                            });
                        });
                    }, undefined);
                }
            }
        }
    };
};

/**
 * @param {String} path
 * @param {{notFound, file, directory, contentType}} options
 * @returns {App}
 */
exports.FileTree = function (root, options) {
    if (!options)
        options = {};
    options.notFound = options.notFound || exports.notFound;
    options.file = options.file || exports.file;
    options.directory = options.directory || exports.directory;
    return function (request) {
        var path = FS.join(root, request.pathInfo.substring(1));
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

/**
 * @param {Request} request
 * @param {String} path
 * @param {String} contentType
 * @returns {Response}
 */
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

/**
 * @param {Stat}
 * @returns {String}
 */
exports.etag = function (stat) {
    return [
        stat.ino,
        stat.size,
        Date.parse(stat.mtime)
    ].join("-");
};

/**
 * @param {Request} request
 * @param {String} path
 * @param {Response}
 */
exports.directory = function (request, path) {
    return Q.reject("directory listing not yet implemented");
};

/**
 * @param {String} path
 * @param {Number} status
 * @returns {App}
 */
exports.PermanentRedirect = function (path, status) {
    return function (request) {
        var location = URL.resolve(request.url, path);
        return exports.redirect(location, status);
    };
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `307`
 * @returns {App}
 */
exports.TemporaryRedirect = function (path, status) {
    return function (request) {
        var scriptInfo = URL.resolve(request.url, path);
        return exports.redirect(scriptInfo, status || 307);
    };
};

/**
 * @param {String} location
 * @param {Number} status (optional) default is `301`
 * @returns {Response}
 */
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
/**
 * @param {Object * App} methods
 * @param {App} notAllowed (optional)
 * @returns {App}
 */
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
/**
 * Routes based on content negotiation, between the request's `accept`
 * header and the application's list of possible content types.
 *
 * @param {Object * App} types mapping content types to apps that can
 * handle them.
 * @param {App} notAcceptable
 * @returns {App}
 */
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

/**
 * Decorates a JSGI application such that rejected response promises
 * get translated into `500` server error responses with no content.
 *
 * @param {App} app
 * @returns {App}
 */
exports.Error = function (app) {
    return function (request) {
        return Q.when(app(request), function (response) {
            return response;
        }, function (error) {
            return J_UTIL.responseForStatus(500, error);
        });
    };
};

/**
 * Decorates a Q-JSGI application such that all requests and responses
 * are logged.
 *
 * @param {App} app
 * @returns {App}
 */
exports.Log = function (app) {
    return function (request) {
        var remoteHost =
            request.remoteHost + ":" +
            request.remotePort;
        var requestLine = 
            request.method + " " +
            request.path + " " +
            "HTTP/" + request.version.join(".");
        console.log(
            new Date().toISOString() + " " +
            remoteHost + " " +
            "-->     " + 
            requestLine
        );
        return Q.when(app(request), function (response) {
            console.log(
                new Date().toISOString() + " " +
                remoteHost + " " +
                "<== " + 
                response.status + " " +
                requestLine + " " +
                (response.headers["content-length"] || "-")
            );
            return response;
        });
    };
};

/**
 * Wraps a Q-JSGI application in a sequence of decorators.
 * @param {Array * Decorator} decorators
 * @param {App} app
 * @returns {App}
 */
exports.Decorators = function (decorators, app) {
    N_UTIL.reversed(decorators).forEach(function (Middleware) {
        app = Middleware(app);
    });
    return app;
};

/**
 * Wraps a Q-JSGI application such that the child application may
 * simply return an object, which will in turn be serialized into a
 * Q-JSGI response.
 *
 * @param {Function(Request):Object} app an application that accepts a
 * request and returns a JSON serializable object.
 * @returns {App}
 */
exports.Json = function (app) {
    return function (request) {
        return Q.when(app(request), function (object) {
            return exports.json(object);
        });
    };
};

/**
 * @param {Object} content data to serialize as JSON
 * @param {{tabs}} options
 * @returns {Response}
 */
exports.json = function (content, options) {
    options = options || {};
    try {
        var json = JSON.stringify(content, null, options.tabs);
    } catch (exception) {
        return Q.reject(exception);
    }
    return exports.ok([json]);
};

/**
 * Wraps an app such that it expects to receive content
 * in the request body and passes that content as a string
 * to as the second argument to the wrapped JSGI app.
 *
 * @param {Function(Request, Object):Response} app
 * @returns {App}
 */
exports.PostContent = function (app) {
    return function (request) {
        return Q.when(request.body, function (body) {
            return Q.when(body.read(), function (body) {
                return app(request, body);
            });
        });
    };
};

/**
 * @param {Function(Request, Object):Response} app
 * @param {App} badRequest
 * @returns {App}
 */
exports.PostJson = function (app, badRequest) {
    if (!badRequest)
        badRequest = exports.badRequest;
    return exports.PostContent(function (request, body) {
        try {
            var object = JSON.parse(body);
        } catch (error) {
            return badRequest(request, error);
        }
        return app(request, object);
    });
};

/**
 * @param {Function(Request):Object}
 * @returns {App}
 */
exports.Inspect = function (app) {
    return exports.Method({"GET": function (request) {
        return Q.when(app(request), function (object) {
            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [inspect(object)]
            }
        });
    }});
};

/**
 * Creates a persistent session associated with the HTTP client's
 * cookie.  These sessions are intended to persist for the duration
 * that a user visits your site in the same browser.
 *
 * @param {Function(session):App} Session a function that creates a
 * new Q-JSGI application for each new session.
 * @returns {App}
 */
exports.CookieSession = function (Session) {
    var sessions = {};
    function nextUuid() {
        while (true) {
            var uuid = UUID.generate();
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
        if (/^\/~session\//.test(request.pathInfo)) {
            if (cookie["session.id"])
                return exports.TemporaryRedirect("../")(request);
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
            var response = exports.TemporaryRedirect(request.scriptInfo + "~session/")(request);
            response.headers["set-cookie"] = COOKIE.format(
                "session.id", session.id, {
                    "path": request.scriptInfo
                }
            );
            return response;
        }
    };
};

/**
 * A Q-JSGI application that creates a session associated with a
 * unique path.  These sessions are intended to persist for the
 * duration that a user remains in a single browser window.
 *
 * @param {Function(session):App} a function that creates a new Q-JSGI
 * application for each new session.  It receives an object with the
 * session's `id` and `lastAccess` `Date`.
 * @returns {App}
 */
exports.PathSession = function (Session) {
    var sessions = {};
    function nextUuid() {
        while (true) {
            var uuid = UUID.generate();
            if (!N_UTIL.has(sessions, uuid))
                return uuid;
        }
    }
    return function (request) {
        // TODO request.pathInfo and request.scriptInfo
        if (request.pathInfo == "/") {
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
        } else if (N_UTIL.has(sessions, request.pathInfo.substring(1))) {
            return N_UTIL.get(sessions, request.pathInfo.substring(1)).route(request);
        } else {
            return exports.responseForStatus(404, "Session does not exist");
        }
    };
};

/**
 * Returns the response of the first application that returns a
 * non-404 resposne status.
 *
 * @param {Array * App} apps a cascade of applications to try
 * successively until one of them returns a non-404 status.
 * @returns {App}
 */
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

/**
 * {App} an application that returns a 400 response.
 */
exports.badRequest = J_UTIL.appForStatus(400);
/**
 * {App} an application that returns a 404 response.
 */
exports.notFound = J_UTIL.appForStatus(404);
/**
 * {App} an application that returns a 405 response.
 */
exports.methodNotAllowed = J_UTIL.appForStatus(405);
/**
 * {App} an application that returns a 405 response.
 */
exports.notAcceptable = J_UTIL.appForStatus(406);

