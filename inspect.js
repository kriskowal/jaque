
var HTTP = require("q-http");
var JAQUE = require("jaque");
HTTP.Server(JAQUE.Decorators([
    JAQUE.Log,
    JAQUE.Error
], JAQUE.Inspect(function (request) {
    return request;
}))).listen(8080);

