
var HTTP = require("q-http");
var JAQUE = require("jaque");
HTTP.Server(JAQUE.End(JAQUE.Content(
    ["Hello, World!"],
    "text/plain"
))).listen(8080);

