
// http://labs.apache.org/webarch/http/draft-fielding-http/p5-range.html#range.units

var assert = require("assert");
var J = require("../jaque");

var size = 10000;
var tests = [
    {
        description: "The first 500 bytes (byte offsets 0-499, inclusive)",
        input: "bytes=0-499",
        oracle: {begin: 0, end: 500}
    },
    {
        description: "The second 500 bytes (byte offsets 500-999, inclusive)",
        input: "bytes=500-999",
        oracle: {begin: 500, end: 1000}
    },
    {
        description: "The final 500 bytes (byte offsets 9500-9999, inclusive)",
        input: "bytes=-500",
        oracle: {begin: 9500, end: 10000}
    },
    {
        description: "The final 500 bytes (byte offsets 9500-9999, inclusive)",
        input: "bytes=9500-",
        oracle: {begin: 9500, end: 10000}
    },
    {
        description: "The first and last bytes only (bytes 0 and 9999)",
        input: "bytes=0-0,-1",
        oracle: {begin: 0, end: 1}
    },
    {
        description: "Legal but not canonical specification of the second 500 bytes (byte offsets 500-999, inclusive)",
        input: "bytes=500-600,601-999",
        oracle: {begin: 500, end: 1000}
    },
    {
        description: "Legal but not canonical specification of the second 500 bytes (byte offsets 500-999, inclusive)",
        input: "bytes=500-700,601-999",
        oracle: {begin: 500, end: 1000}
    }
];

tests.forEach(function (test) {
    exports['test ' + test.input] = function () {
        assert.deepEqual(J.interpretFirstRange(test.input, size), test.oracle, test.description);
    };
});

if (require.main === module)
    require("test").run(exports);

