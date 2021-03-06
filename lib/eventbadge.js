var request = require('request');
var through = require('through');
var trumpet = require('trumpet');
var chalk   = require('chalk');
var Q       = require('q');

/** Wiggle CDN URL */
var wiggleRegEx = /^((http(s)?:)?\/\/)www.wigglestatic.com\/(.+)\?/;

/**
 * Fetches the events badge via a http request
 *
 * @param {String} url URL of event page
 * @returns {Object} Promise
 */
function getEventBadge (url) {
  var tr           = trumpet();
  var deferred     = Q.defer();
  var eventBadge   = null;
  var defaultBadge = 'images/brandpages/humanrace/event-logo';

  function read (buf) {
    var str    = buf.toString();
    var substr = null;
    var matches, req;

    // If the buffer is the 'src' element of out target element we need to
    // locate the part of the string we need
    if (str.match(/^src="/)) {
      // Returns the substring between 'src="' and '"'
      substr = str.substr(5, str.length - 6);
      // Check if this is a wiggle cdn source
      matches = substr.match(wiggleRegEx);
      // Strip wiggle cdn path from url if it exits by targeting capturing group
      eventBadge = matches ? matches[4] : substr;
    }
  }

  // Called once the stream has eneded
  function end () {
    // If we didn't find a suitable event eventBadge - use the default humanrace one
    eventBadge = eventBadge === null ? defaultBadge : eventBadge;

    // Resolve our deferred promise
    deferred.resolve(eventBadge);
  }

  // Kick off - Make request for url and pipe response through to Trumpet...

  request(url).on('error', function (err) {
    var message;
    switch (err.code) {
      case 'ENOTFOUND':
        message = url + ' is not available, or did not return a response - will use the default badge';
      break;
      default:
        message = err.message;
    }
    console.log(chalk.red('Error: ' + message));
    deferred.resolve(defaultBadge);
  }).pipe(tr);

  // ...pipe any matches for our selector into our read stream
  tr.createReadStream('#mainImageWrapper .mainImage', { outer: true }).pipe(through(read, end));

  // Return our deferred promise - we'll resolve this once our pipe has completed
  return deferred.promise;
}

module.exports = getEventBadge;
