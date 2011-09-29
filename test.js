
var HTTP = require("q-http");
var JAQUE = require("jaque");
HTTP.Server(
    JAQUE.Log(
        JAQUE.Error(
            JAQUE.FileTree(
                module.directory || __dirname,
                {
                    redirectSymbolicLinks: true
                }
            )
        )
    )
)
.listen(8080)
.then(function () {
    console.log("Listening on 8080");
})
.end();

