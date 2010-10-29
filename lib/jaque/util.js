
/**
 * Utilities for HTTP protocol
 * @module
 */

/*whatsupdoc*/

/**
 * {Object * String} a mapping of HTTP status codes to
 * their standard descriptions.
 */
// Every standard HTTP code mapped to the appropriate message.
// Stolen from Rack which stole from Mongrel
exports.HTTP_STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Found',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Timeout',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Request Range Not Satisfiable',
    417 : 'Expectation Failed',
    422 : 'Unprocessable Entity',
    423 : 'Locked',
    424 : 'Failed Dependency',
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Timeout',
    505 : 'HTTP Version Not Supported',
    507 : 'Insufficient Storage'
};

/**
 * {Object * Number} a mapping from HTTP status descriptions
 * to HTTP status codes.
 */
exports.HTTP_STATUS_MESSAGES = {};
for (var code in exports.HTTP_STATUS_CODES)
    exports.HTTP_STATUS_MESSAGES[exports.HTTP_STATUS_CODES[code]] = +code;

/**
 * Determines whether an HTTP response should have a
 * response body, based on its status code.
 * @param {Number} status
 * @returns whether the HTTP response for the given status
 * code has content.
 */
exports.STATUS_WITH_NO_ENTITY_BODY = function (status) {
    return (status >= 100 && status <= 199) ||
        status == 204 || status == 304;
};

/**
 * @param {Number} status
 * @returns {Function(Request) :Response} a JSGI app that returns
 * a plain text response with the given status code.
 */
exports.appForStatus = function (status) {
    return function (request) {
        return exports.responseForStatus(status, request.method + " " + request.path);
    };
};

/**
 * @param {Number} status an HTTP status code
 * @param {String} message (optional) a message to include
 * in the response body.
 * @returns a JSGI HTTP response object with the given status
 * code and message as its body, if the status supports
 * a body.
 */
exports.responseForStatus = function(status, optMessage) {
    if (exports.HTTP_STATUS_CODES[status] === undefined)
        throw "Unknown status code";
    
    var message = exports.HTTP_STATUS_CODES[status];
    
    if (optMessage)
        message += ": " + optMessage;
    
    var content = message + "\r\n";
    
    var response = {
        "status": status,
        "headers": {}
    };

    // RFC 2616, 10.2.5:
    // The 204 response MUST NOT include a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    // RFC 2616, 10.3.5:
    // The 304 response MUST NOT contain a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    if (!exports.STATUS_WITH_NO_ENTITY_BODY(status)) {
        response.headers['content-length'] = content.length;
        response.headers['content-type'] = 'text/plain';
        response.body = [content];
    }

    return response;
};

