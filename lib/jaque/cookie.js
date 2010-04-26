
var QS = require("jack/querystring");

exports.parse = function (cookie) {
    return QS.parseQuery(cookie, /[;,]/g);
};

exports.format = function (key, value, options) {
    var domain, path, expires, secure, httpOnly,
        cookie = encodeURIComponent(key) + "=", 
        meta = "";
    if (options) {
        if (options.domain)
            meta += "; domain=" + options.domain ;
        if (options.path)
            meta += "; path=" + options.path;
        if (options.expires)
            meta += "; expires=" + options.expires.toGMTString();
        if (options.secure)
            meta += "; secure";
        if (options.httpOnly)
            meta += "; HttpOnly";
    }
    if (Array.isArray(value)) {
        for (var i = 0, ii = value.length; i < ii; i++)
            cookie += encodeURIComponent(value[i]);
    } else {
        cookie += encodeURIComponent(value);
    }
    return cookie + meta;
};

