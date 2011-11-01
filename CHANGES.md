
History
-------

## 1.2.1

-   Fixes to CookieJar for regarding expiration and domain
    and path matching.

## 1.2.0

-   Added ``Normalize`` middleware for request and response
    normalization.

## 1.1.0

-   Added ``RedirectTrap`` and ``CookieJar`` for HTTP
    clients.

    ```javascript
    var request = CookieJar(RedirectTrap(HTTP.request));
    ```

## 1.0.0 - Backward Incompatible Changes

-   ``End`` is now ``Cap``
-   ``PostContent`` is now ``ContentRequest``
-   ``PostJson`` is now ``JsonRequest``
-   ``FileConcat`` is gone.
-   ``ContentLength`` is gone, permanently.
-   Reversed the argument order for ``Headers`` middleware,
    now ``Headers(nextApp, headers)``

Additions and Upgrades

-   Completed ``{,Permanent,Temporary}{r,R}edirect{,Tree}``
-   Added ``Tap(app, tap)`` for intercepting requests
-   Added ``Trap(app, trap)`` for intercepting responses
-   Added ``Proxy(url|app(request):request)``
-   Added ``debug`` flag to ``Error`` middle-ware
-   Added ``Permanent`` and caused all downstream-ware to
    respect the ``request.permanent`` flag to make redirects
    permanent instead of temporary (default).
-   Synchronized Q for a fix to thenable promise
    assimilation.
-   Refurbished documentation and change log in Markdown
    format.
-   Added some unit tests.

## 0.1.21

-   Syntax fix that should have not made it to publication
    without testing.

## 0.1.20

-   Added support for redirecting entire subtrees where
    symbolic links are involved, optionally permanently.

## 0.1.19

-   Added an option to FileTree: redirectSymbolicLinks.
-   Synchronized dependencies for FS.readLink.

## 0.1.18

-   Synchronized dependencies for bug fix in IO stream close
    method.

## 0.1.17

-   Switched internal MIME extension checker to use the
    "mime" NPM package, which appears to be more thorough on
    close inspection.
-   Took advantage of Q-HTTP's ability to handle a promised
    body in the static file endware.

## 0.1.16

-   Synchronized dependency for q-fs bug fix for binary
    encoding.

## 0.1.12

-   Added ``Headers`` middleware for adding headers
    unspecified by an application.
-   Coordinated dependency revisions.
-   Fixed a bug in the file server; 404 responses are now
    delivered promptly.

## 0.1.11
-   Added ``text/cache-manifest`` to the ``.manifest`` MIME
    mapping.

## 0.1.10
-   WARNING: Removed ``ContentLength`` until further notice.
    It is presently broken.
-   Consolidated all content negotiation under a single
    implementation and expanded the negotiable parameters to
    include:
    -   ``ContentType``
    -   ``Language``
    -   ``Charset``
    -   ``Encoding``
    -   ``Host``
-   Host "negotiation" is now predicated on the host name
    and the port, separated by colons, and negotiation
    wildcards are accepted.
-   Added ``Select`` negotiation, wherein an app is selected
    and returned by a given function.
-   Added alternate log function and timestamp function
    parameters to Log middleware.
-   Redirectors now accept a default redirect to the same
    path, which is useful for a ``GET`` following a ``PUT``
    or ``POST``.
-   Aliased the ``ok`` application maker to ``content``.
    Both names will remain going forward.
-   Applications now receive and are obligated to route the
    response object in addition to the request object.
-   Renamed End route to Cap route. End is now deprecated.
-   Renamed PostContent and PostJson to ContentRequest and
    JsonRequest respectively.  The old names are depreacted
    aliases.
-   Added ``Time`` Middleware
-   Added ``visitor`` and ``tabs`` parameters, as in
    ``JSON.stringify``, to the ``Json`` middleware.
-   Withdrew ambition to implement pattern matcher; someone
    else's job.
-   Withdrew ambition to implement FileOverlay; better
    supported by chaining FileTree middleware end to end.

## 0.1.8

-   Improved the logging format

## 0.1.7

-   Replaced an assertion with a rejection, where Branch
    routers receive bad pathInfo.

## 0.1.6

-   Added FileConcat content app

## 0.1.5

-   Revised in coordination with q-http to be closer to JSGI
    compliance, using scriptName and pathInfo.
-   Added request inspector test server.
-   Fixed the README example code.
 
## 0.1.4

-   Synced dependencies

## 0.1.3

-   Attempted to bring all dependencies into the new world
    of n-util

## 0.1.2

-   Swapped util for n-util in response to new Node module
    name conflict.

## 0.1.0

-   Reorganized for NPM

## 0.0.1

-   Renamed ComponentMap back to Branch
-   Renamed Redirect to PermanentRedirect
-   Introduced TemporaryRedirect
-   Introduced PostJson

