
var HTTP = require("q-http");
var JAQUE = require("jaque");
HTTP.Server(
    JAQUE.Log(
        JAQUE.Error(
            JAQUE.FileTree(
                module.directory || __dirname,
                JAQUE.Cap(JAQUE.Content(
                    ["Hello, World!"],
                    "text/plain"
                ))
            )
        )
    )
)
.listen(8080)
.then(function () {
    console.log("Listening on 8080");
})
.end();

