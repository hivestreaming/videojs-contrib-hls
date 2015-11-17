(function(videojs) {
  'use strict';

  var self = window.videojs.Hls
  /**
   * Creates and sends an XMLHttpRequest.
   * TODO - expose video.js core's XHR and use that instead
   *
   * @param options {string | object} if this argument is a string, it
   * is intrepreted as a URL and a simple GET request is
   * inititated. If it is an object, it should contain a `url`
   * property that indicates the URL to request and optionally a
   * `method` which is the type of HTTP request to send.
   * @param callback (optional) {function} a function to call when the
   * request completes. If the request was not successful, the first
   * argument will be falsey.
   * @return {object} the XMLHttpRequest that was initiated.
   */

  var requestCounter = 0

  var proxyRequests = new HashMap();

  function newRequest(url, callback) {

    var request = new HiveRequest();

    request.open('GET', url);
    request.url = url;
    request.requestTime = new Date().getTime();

    //console.log("REQ " + url)

    //var req = {
    //    url: url,
    //    headers: null
    //}

    request.onreadystatechange = function () {
      // wait until the request completes
      if (this.readyState !== 4) {
        return;
      }

      // request timeout
      if (request.timedout) {
        return callback.call(this, 'timeout', url);
      }

      // request aborted or errored
      if (this.status >= 400 || this.status === 0) {
        return callback.call(this, true, url);
      }

      if (this.response) {
        this.responseTime = new Date().getTime();
        this.roundTripTime = this.responseTime - this.requestTime;
        this.bytesReceived = this.response.byteLength || this.response.length;
        this.bandwidth = Math.floor((this.bytesReceived / this.roundTripTime) * 8 * 1000);
      }
      //console.log("CALLBACK")

      return callback.call(this, false, request);
    };

    var reqId = "hls"+requestCounter++

    var proxyRequest = new ProxyRequest(reqId, url, null)

    proxyRequests.set(reqId, request);

    HiveProxyConnector.RequesterAPI.sendRequest(proxyRequest, onMessage, self)

    return request

  }

  function onMessage(response) {

    //console.log("ON MESSAGE PPLR")

    var id = response.requestId

    //console.log("ON MESSAGE ID "+id)

    //console.log("E "+proxyRequests.keys())

    if(proxyRequests.has(id)){

      var request = proxyRequests.get(id)

      var hpe

      if (response.textData) {

        request.responseText = response.textData

        request.responseType = "text"

        hpe = {
          lengthComputable: true,
          total: response.textData.length,
          loaded: response.textData.length
        }

      } else {

        request.response = response.data.toBuffer()

        request.responseType = "arraybuffer"

        hpe = {
          lengthComputable: true,
          total: request.response.byteLength,
          loaded: request.response.byteLength
        }

      }

      //console.log("ONP B")
      request.onprogress(hpe)
      //console.log("ONP A")

      request.status = 200
      request.readyState = 4
      request.onreadystatechange()

      //console.log("ONL B")
      request.onload()
      //console.log("ONL A")

      proxyRequests.delete(id)

    }else{
      console.log("NO REQ")
    }

  }

  /**
   * A wrapper for videojs.xhr that tracks bandwidth.
   */
  videojs.Hls.xhr = function(options, callback) {
    // Add a default timeout for all hls requests
    options = videojs.mergeOptions({
       timeout: 45e3
     }, options);

    //var request = videojs.xhr(options, function(error, response) {
    //  if (!error && request.response) {
    //    request.responseTime = (new Date()).getTime();
    //    request.roundTripTime = request.responseTime - request.requestTime;
    //    request.bytesReceived = request.response.byteLength || request.response.length;
    //    if (!request.bandwidth) {
    //      request.bandwidth = Math.floor((request.bytesReceived / request.roundTripTime) * 8 * 1000);
    //    }
    //  }
    //
    //  // videojs.xhr now uses a specific code on the error object to signal that a request has
    //  // timed out errors of setting a boolean on the request object
    //  if (error || request.timedout) {
    //    request.timedout = request.timedout || (error.code === 'ETIMEDOUT');
    //  } else {
    //    request.timedout = false;
    //  }
    //
    //  // videojs.xhr no longer consider status codes outside of 200 and 0 (for file uris) to be
    //  // errors but the old XHR did so emulate that behavior
    //  if (!error && response.statusCode !== 200 && response.statusCode !== 0) {
    //    error = new Error('XHR Failed with a response of: ' +
    //      (request && (request.response || request.responseText)));
    //  }
    //
    //  callback(error, request);
    //});



    var request = newRequest(options.uri, callback)
    request.requestTime = (new Date()).getTime();

    return request;
  };
})(window.videojs);
