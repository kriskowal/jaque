
var HTTP = require("q-http");
var JAQUE = require("jaque");
HTTP.Server(JAQUE.Decorators([
    JAQUE.Log,
    JAQUE.Error
], JAQUE.End(JAQUE.Content(
    ["Hello, World!"],
    "text/plain"
))))
.listen(8080)
.then(function () {
    console.log("Listening on 8080");
})
.end();

