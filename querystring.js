// Query String Utilities

var QueryString = exports;
var urlDecode = process.binding('http_parser').urlDecode;


function charCode(c) {
  return c.charCodeAt(0);
}


// a safe fast alternative to decodeURIComponent
QueryString.unescapeBuffer = function(s, decodeSpaces) {
  var out = new Buffer(s.length);
  var state = 'CHAR'; // states: CHAR, HEX0, HEX1
  var n, m, hexchar;

  for (var inIndex = 0, outIndex = 0; inIndex <= s.length; inIndex++) {
    var c = s.charCodeAt(inIndex);
    switch (state) {
      case 'CHAR':
        switch (c) {
          case charCode('%'):
            n = 0;
            m = 0;
            state = 'HEX0';
            break;
          case charCode('+'):
            if (decodeSpaces) c = charCode(' ');
            // pass thru
          default:
            out[outIndex++] = c;
            break;
        }
        break;

      case 'HEX0':
        state = 'HEX1';
        hexchar = c;
        if (charCode('0') <= c && c <= charCode('9')) {
          n = c - charCode('0');
        } else if (charCode('a') <= c && c <= charCode('f')) {
          n = c - charCode('a') + 10;
        } else if (charCode('A') <= c && c <= charCode('F')) {
          n = c - charCode('A') + 10;
        } else {
          out[outIndex++] = charCode('%');
          out[outIndex++] = c;
          state = 'CHAR';
          break;
        }
        break;

      case 'HEX1':
        state = 'CHAR';
        if (charCode('0') <= c && c <= charCode('9')) {
          m = c - charCode('0');
        } else if (charCode('a') <= c && c <= charCode('f')) {
          m = c - charCode('a') + 10;
        } else if (charCode('A') <= c && c <= charCode('F')) {
          m = c - charCode('A') + 10;
        } else {
          out[outIndex++] = charCode('%');
          out[outIndex++] = hexchar;
          out[outIndex++] = c;
          break;
        }
        out[outIndex++] = 16 * n + m;
        break;
    }
  }

  // TODO support returning arbitrary buffers.

  return out.slice(0, outIndex - 1);
};


QueryString.unescape = function(s, decodeSpaces) {
  return QueryString.unescapeBuffer(s, decodeSpaces).toString();
};


QueryString.escape = function(str) {
  return encodeURIComponent(str);
};

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};


QueryString.stringify = QueryString.encode = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  obj = (obj === null) ? undefined : obj;

  switch (typeof obj) {
    case 'object':
      return Object.keys(obj).map(function(k) {
        if (Array.isArray(obj[k])) {
          return obj[k].map(function(v) {
            return QueryString.escape(stringifyPrimitive(k)) +
                   eq +
                   QueryString.escape(stringifyPrimitive(v));
          }).join(sep);
        } else {
          return QueryString.escape(stringifyPrimitive(k)) +
                 eq +
                 QueryString.escape(stringifyPrimitive(obj[k]));
        }
      }).join(sep);

    default:
      if (!name) return '';
      return QueryString.escape(stringifyPrimitive(name)) + eq +
             QueryString.escape(stringifyPrimitive(obj));
  }
};

// Parse a key=val string.
QueryString.parse = QueryString.decode = function(qs, sep, eq) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  qs.split(sep).forEach(function(kvp) {
    var x = kvp.split(eq);
    var k = QueryString.unescape(x[0], true);
    var v = QueryString.unescape(x.slice(1).join(eq), true);

    if (!(Object.prototype.hasOwnProperty.call(obj, k))) {
      obj[k] = v;
    } else if (!Array.isArray(obj[k])) {
      obj[k] = [obj[k], v];
    } else {
      obj[k].push(v);
    }
  });

  return obj;
};
