/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
        if (window.ThaliPermissions) {
            // requestLocationPermission ensures that the application has
            // the required ACCESS_COARSE_LOCATION permission in Android.
            window.ThaliPermissions.requestLocationPermission(function () {
                console.log('Application has the required permission.');
                jxcore('app.js').loadMainFile(function(ret, err) {
                    app.loadedJXCore('deviceready');
                    jxcoreLoaded = true;
                });
            }, function (error) {
                console.log('Location permission not granted. Error: ' + error);
            });
        } else {
            jxcore('app.js').loadMainFile(function(ret, err) {
                app.loadedJXCore('deviceready');
                jxcoreLoaded = true;
            });
        }
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    },
    loadedJXCore: function(id) {
        var parentElement = document.getElementById(id);
        var receivedElement = parentElement.querySelector('.received');
        var loadedElement = parentElement.querySelector('.loaded');
        loadedElement.setAttribute('style', 'display:block;');
        receivedElement.setAttribute('style', 'display:none;');
        console.log('jxcore loaded');
        
        setNearbyPeersCallback();
    }
};

app.initialize();

var peersList = [];
var timeStampDiscoveryBefore;
var runningDiscoveryTest = false;

function addTextToLogArea(text) {
    var logArea = document.getElementById('logArea');
    logArea.value += (text + '\n');
}

function logDiscoveredDevice(peer, timeStampDiscoveryAfter) {
    addTextToLogArea('Discovered ' + peer.peerIdentifier);
    
    if (runningDiscoveryTest && timeStampDiscoveryBefore) {
        addTextToLogArea('Discovery test ended after ' + 
            (timeStampDiscoveryAfter - timeStampDiscoveryBefore) + ' ms!\n');

        runningDiscoveryTest = false;
        timeStampDiscoveryBefore = null;
    }
}

function setUpClientAndServer() {
    jxcore('setupClientAndServer').call();
    jxcore('setLogAreaCallback').call(addTextToLogArea);
    jxcore('setDiscoveredDeviceCallback').call(logDiscoveredDevice);
    
    addTextToLogArea('Start listening and advertising');
}

function setNearbyPeersCallback() {
    jxcore('setNearbyPeersCallback').call(function (peers) {
        var list = document.getElementById('peersList');
        var i, record;

        list.innerHTML = "";

        for (i = 0; i < peers.length; i++) {
            record = document.createElement("option");
            record.text = peers[i].peer.peerIdentifier;
            list.add(record);
        }
    });
}

function refreshNearbyPeers() {
    jxcore('refreshNearbyPeers').call();
}

function getSelectedPeer() {
    var list = document.getElementById('peersList');

    return {
        peerIdentifier: list.options[list.selectedIndex].text
    };
}

function connectToPeer() {
    var selectedPeer = getSelectedPeer();

    jxcore('connectToPeer').call(selectedPeer);
}

function connectToAllPeers() {
    var allPeers = document.getElementById('peersList').options;
    var i;

    for (i = 0; i < allPeers.length; i++) {
        jxcore('connectToPeer').call({
            peerIdentifier: allPeers[i].text
        });
    }
}

function sendDataToSelectedPeer() {
    sendData(getSelectedPeer());
}

function sendDataToAllPeers() {
    var allPeers = document.getElementById('peersList').options;
    var i;

    for (i = 0; i < allPeers.length; i++) {
        sendData({
            peerIdentifier: allPeers[i].text
        });
    }
}

function sendData(peer) {
    var e = document.getElementById('dataSize');
    var dataSize = 1024 * e.options[e.selectedIndex].value; // make it kiloBytes
    
    jxcore('sendData').call(peer, dataSize, function () {
        console.log('Send data called');
    });
}

function stopListeningAndAdvertising() {
    return new Promise(function(resolve, reject) {
        jxcore('stop').call(function (err) {
            addTextToLogArea('Stop listening and advertising');
            console.log('Stop called!');

            !!err ? reject(err) : resolve();
        });
    });
}

function runDiscoveryTest() {
    runningDiscoveryTest = true;

    stopListeningAndAdvertising()
        .then(function() {
            setUpClientAndServer();
            timeStampDiscoveryBefore = Date.now();
        });
};

function clearPeersList() {
    var list = document.getElementById('peersList');
    list.innerHTML = "";
}