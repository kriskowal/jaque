
var HTTP = require("q-http");
var FS = require("q-fs");
var JAQUE = require("../jaque");

var fixture = FS.join(module.directory || __dirname, "fixtures", "1234.txt");

exports['test partial range request'] = function (assert, done) {
    HTTP.Server(JAQUE.Cap(JAQUE.File(fixture)))
    .listen(8080)
    .then(function (server) {
        return HTTP.read({
            "url": "http://127.0.0.1:8080/",
            "headers": {
                "range": "bytes=1-2"
            }
        }, function (response) {
            return response.status === 206;
        })
        .then(function (content) {
            assert.equal(content.toString('utf-8'), '23', '1234[1-2] = 23');
        }, function (error) {
            console.log(error);
            throw error;
        })
        .fin(server.stop)
    })
    .fin(done)
    .end();
};

if (require.main === module)
    require("test").run(exports);

