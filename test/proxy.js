
var Q = require("q");
var HTTP = require("q-http");
var JAQUE = require("../jaque");

exports['test proxy'] = function (assert, done) {

    var requestProxy;
    var responseProxy;
    var requestActual;
    var responseActual;

    var server1 = HTTP.Server(
        JAQUE.Trap(
            JAQUE.Tap(
                JAQUE.Branch({
                    "foo": JAQUE.Branch({
                        "bar": JAQUE.Cap(JAQUE.Content(["Hello, World!"]))
                    })
                }),
                function (request) {
                    requestActual = request;
                }
            ),
            function (response) {
                responseActual = response;
                return response;
            }
        )
    );

    var server2 = HTTP.Server(
        JAQUE.Trap(
            JAQUE.Tap(
                JAQUE.ProxyTree("http://127.0.0.1:8080/foo/"),
                function (request) {
                    requestProxy = request;
                }
            ),
            function (response) {
                responseProxy = response;
                return response;
            }
        )
    );

    Q.when(server1.listen(8080))
    .wait(server2.listen(8081))
    .then(function () {
        return HTTP.read("http://127.0.0.1:8081/bar")
    })
    .then(function (content) {
        assert.equal(content, "Hello, World!", "content");
        assert.ok(requestActual, "request actual");
        assert.ok(responseActual, "response actual");
        assert.ok(requestProxy, "request proxy");
        assert.ok(responseProxy, "response proxy");
    })
    .fail(function (reason) {
        assert.ok(false, reason);
    })
    .fin(server1.stop)
    .fin(server2.stop)
    .fin(done)

};

if (require.main === module)
    require("test").run(exports);

