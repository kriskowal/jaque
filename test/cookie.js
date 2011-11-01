
var HTTP = require("q-http");
var JAQUE = require("../jaque");

["localhost", "127.0.0.1"].forEach(function (host) {

    exports["test cookie " + host] = function (assert, done) {

        var server = HTTP.Server(function (request) {
            return {
                status: 200,
                headers: {
                    "set-cookie": "a=10; MaxAge=1"
                },
                body: [request.headers.cookie || ""]
            };
        });

        var request = JAQUE.Normalize(JAQUE.CookieJar(HTTP.request));

        server.listen(8080)
        .then(function (server) {
            return request("http://" + host + ":8080")
            .get("body")
            .invoke("read")
            .invoke("toString", "utf-8")
        })
        .then(function (content) {
            assert.equal(content, "", "no cookie first time");
            return request("http://" + host + ":8080")
            .get("body")
            .invoke("read")
            .invoke("toString", "utf-8")
        })
        .then(function (content) {
            assert.equal(content, "a=10", "cookie set second time");
        })
        .timeout(1000)
        .fin(server.stop)
        .fail(function (reason) {
            assert.ok(false, reason);
        })
        .fin(done)

    };

});

if (require.main === module)
    require("test").run(exports);

