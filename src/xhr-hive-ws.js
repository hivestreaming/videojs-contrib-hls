(function (videojs) {

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

        console.log("REQ " + url)

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

            console.log("CALLBACK")

            return callback.call(this, false, url);
        };

        var reqId = "hls"+requestCounter++

        var proxyRequest = new ProxyRequest(reqId, url, null)

        proxyRequests.set(reqId, request);

        HiveProxyConnector.RequesterAPI.sendRequest(proxyRequest, onMessage, self)

        return request

    }

    function onMessage(response) {

            console.log("ON MESSAGE PPLR")

            var id = response.requestId

            console.log("ON MESSAGE ID "+id)

            console.log("E "+proxyRequests.keys())

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

                console.log("ONP B")
                request.onprogress(hpe)
                console.log("ONP A")

                request.status = 200
                request.readyState = 4
                request.onreadystatechange()

                console.log("ONL B")
                request.onload()
                console.log("ONL A")

                proxyRequests.delete(id)

            }else{
                console.log("NO REQ")
            }

    }

    videojs.Hls.xhr = function (url, callback) {
        var
            options = {
                method: 'GET',
                timeout: 45 * 1000
            },
            request,
            abortTimeout;

        if (typeof callback !== 'function') {
            callback = function () {
            };
        }

        if (typeof url === 'object') {
            options = videojs.util.mergeOptions(options, url);
            url = options.url;
        }

        //request.open(options.method, url);
        //request.url = url;
        //request.requestTime = new Date().getTime();

        //if (options.responseType) {
        //  request.responseType = options.responseType;
        //}
        //if (options.withCredentials) {
        //  request.withCredentials = true;
        //}
        //if (options.timeout) {
        //  abortTimeout = window.setTimeout(function() {
        //    if (request.readyState !== 4) {
        //      request.timedout = true;
        //      request.abort();
        //    }
        //  }, options.timeout);
        //}

        request = newRequest(url, callback)

        //request.send(null);
        return request;
    };

})(window.videojs);
