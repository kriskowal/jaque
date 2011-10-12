
Jaque
=====

Begin-, middle-, and end-ware for Q HTTP servers and
clients.

Lives at the intersection of Q, Jack, and Node.

Provides HTTP applications and adapters for routing, content
negotiation, hosting static files (with support for partial
byte ranges), proxying, routing, redirecting, logging,
timing, and the like.

I would have called this ``q-jack`` but ``jaque`` made me
chuckle inside.  It probably ought to have been ``jacques``,
but I didn't know as many French-speakers at the time.


The General Idea
================

    var JAQUE = require("jaque");
    var Q = require("q"); // from npm
    var HTTP = require("q-http"); // from npm

    var app = JAQUE.Branch({
        "": JAQUE.Method({
            "GET": function (request) {
                return {
                    "status": 200,
                    "headers": {"content-type": "text/plain"},
                    "body": ["Hello, World!\r\n"]
                };
            }
        })
    }, JAQUE.notFound);

    app = JAQUE.Decorators([
        JAQUE.Log,
        JAQUE.Error
    ], app);

    var server = HTTP.Server(app);
    var listening = server.listen(8080);
    Q.when(listening)
    .then(function () {
        console.log("Listening on 8080.");
    })
    .end();


Installation
============

    npm install jaque q q-http


The API
=======


## ``Cap(app, notFound)``

Makes a  Q-JSGI app that only responds when there is nothing
left on the path to route.  If the there is unprocessed data
on the path, the returned app either forwards to the
`notFound` app or returns a `404 Not Found` response.

@param {App} app a Q-JSGI application to respond to this
end of the routing chain.

@param {App} notFound (optional) defaults to the
`notFound` app.

@returns {App}


## ``Branch(paths, notFound)``

Makes a Q-JSGI app that branches requests based on the next
unprocessed path component.

@param {Object * App} paths a mapping from path components
(single file or directory names) to Q-JSGI applications for
subsequent routing.  The mapping may be a plain JavaScript
`Object` record, which must own the mapping properties, or
an object that has `has(key)` and `get(key)` methods in its
prototype chain.

@param {App} notFound a Q-JSGI application that handles
requests for which the next file name does not exist in
paths.

@returns {App}


## ``Method(methods, methodNotAllowed_opt)``

Negotiates based on HTTP method.

@param {Object * App} methods

@param {App} notAllowed (optional)

@returns {App}


## ``Accept(types, notAcceptable)``

Routes based on content negotiation, between the request's
`accept` header and the application's list of possible
content types.

@param {Object * App} types mapping content types to
apps that can handle them.

@param {App} notAcceptable

@returns {App}


## ``FirstFound(apps)``

Returns the response of the first application that returns a
non-404 resposne status.

@param {Array * App} apps a cascade of applications to try
successively until one of them returns a non-404 status.

@returns {App}


Sessions
--------

## ``CookieSession(Session)``

Creates a persistent session associated with the HTTP
client's cookie.  These sessions are intended to persist for
the duration that a user visits your site in the same
browser.

@param {Function(session):App} Session a function that
creates a new Q-JSGI application for each new session.
@returns {App}

## ``PathSession(Session)``

A Q-JSGI application that creates a session associated with
a unique path.  These sessions are intended to persist for
the duration that a user remains in a single browser window.

@param {Function(session):App} a function that creates a new
Q-JSGI application for each new session.  It receives an
object with the session's `id` and `lastAccess` `Date`.
@returns {App}


Content
-------


## ``Content(body, contentType="text/plain", status=200)``

Makes an app that returns a response with static content
from memory.

@param {Body} body a Q-JSGI response body
@param {String} contentType
@param {Number} status
@returns {App} a Q-JSGI app


## ``File(path, contentType)``

Hosts a single file, at a given path, with the given content
type.

@param {String} path
@param {String} contentType
@returns {App}


## ``FileTree(root, options)``

Hosts a file tree.

/!\ WARNING: does not yet verify that the canonical
path of the root contains the canonical path of the
requested file.

@param {String} path

@param {{notFound, file, directory, contentType}} options

@returns {App}


## ``Proxy(app)``, ``Proxy(url)``, ``ProxyTree(url)``

Defers to an HTTP proxy for the response.

If an application function is provided, it must accept the
original request and return the proxy request.  These can be
the same object, but the "url" property should at least be
revised.

If instead of an application, you provide a URL, all
requests proxy that exact URL.

If you use ProxyTree, the unrouted portion of the URL will
be fowarded to the proxy, resolved on the target URL.

## ``Redirect(path, status, tree)``

Or,

    TemporaryRedirect(path)
    PermanentRedirect(path)
    RedirectTree(path)
    TemporaryRedirectTree(path)
    PermanentRedirectTree(path)

Redirects.

Whether the redirect is temporary or permanent varies
in order of precedence.

-   whether the status is specified as an argument.
-   whether the request has passed through Permanent
    middleware.
-   the status implied by the function name.
-   temporary by default.

*Tree variants redirect the unrouted portition of the
requested URL, to redirect entire sub-hierarchies.

@param {String} path

@returns {App}


Middleware
----------

## ``Tap(app, tap)``

Taps requests.  If the tap returns a response, it is used
instead of forwarding to the application.


## ``Trap(app, trap)``

Traps responses, if the application returns a response.
Adds a headers object if one does not already exist so that
traps can depend on its presence.

The trap may return an alternate response.


## ``Error(app, debug)``

Decorates a JSGI application such that rejected response
promises get translated into `500` server error responses
with no content.

With ``debug``, the error and stack trace get sent to
the client.  This must be disabled in production.

@param {App} app

@returns {App}


## ``Log(app)``

Decorates a Q-JSGI application such that all requests and
responses are logged.

@param {App} app

@returns {App}


## ``Decorators(decorators, app)``

Wraps a Q-JSGI application in a sequence of decorators.

@param {Array * Decorator} decorators

@param {App} app

@returns {App}


## ``Permanent(app, future_opt)``

Adds a far-future expiration date (1 year) to responses and
configures any downstream applications to use permanent
instead of temporary redirects.

The optional ``future`` callback must return a ``Date``
object for the future expiration.


## ``Date(app, present_opt)``

Adds the "date" header to any response.

The optional ``present`` callback must return a ``Date`` for
the current time.


Adapters
--------

## ``Json(app)``

Wraps a Q-JSGI application such that the child application
may simply return an object, which will in turn be
serialized into a Q-JSGI response.

@param {Function(Request):Object} app an application that
accepts a request and returns a JSON serializable object.

@returns {App}


## ``ContentRequest(app)``

Wraps an app such that it expects to receive content in the
request body and passes that content as a string to as the
second argument to the wrapped JSGI app.

@param {Function(Request, Object):Response} app

@returns {App}


## ``JsonRequest(app, badRequest_opt)``

Wraps an app such that it expects to receive a JSON
object in the HTTP POST body, and passes that object to
the child app as a second argument.

@param {Function(Request, Object):Response} app

@param {App} badRequest

@returns {App}


## ``Inspect(callback(Request))``

@param {Function(Request):Object}

@returns {App}


Responders
----------

## ``badRequest(request)``

{App} an application that returns a 400 response.


## ``notFound(request)``

{App} an application that returns a 404 response.


## ``methodNotAllowed(request)``

{App} an application that returns a 405 response.


## ``notAcceptable(request)``

{App} an application that returns a 405 response.


## ``ok(content="", contentType="text/plain", status=200)``

Returns a Q-JSGI response with the given content.

@param {Body} content (optional) defaults to ``[""]``

@param {String} contentType (optional) defaults to
``"text/plain"``

@param {Number} status (optional) defaults to ``200``

@returns {Response}


## ``file(request, path, contentType)``
    
Constructs a JSGI response for a given path,
handling E-Tags and client-cache hits.

@param {Request} request

@param {String} path

@param {String} contentType

@returns {Response}


## ``redirect(request, location, status, tree)``

@param {String} location

@param {Number} status (optional) default is `301`

@returns {Response}


## ``json(content, options)``

@param {Object} content data to serialize as JSON

@param {{tabs}} options

@returns {Response}

