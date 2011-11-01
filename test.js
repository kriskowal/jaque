
var HTTP = require("q-http");
var JAQUE = require("jaque");
HTTP.Server(
    JAQUE.ParseQuery(
        JAQUE.Log(
            JAQUE.Error(
                JAQUE.Normalize(
                    function (request) {
                        return JSON.stringify(request.query, null, 4);
                    }
                )
            )
        )
    )
)
.listen(8080)
.then(function () {
    console.log("Listening on 8080");
})
.end();

