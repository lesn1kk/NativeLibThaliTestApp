'use strict';

var format = require('util').format;

var thaliMobile = require('thali/NextGeneration/thaliMobile');
var thaliMobileNativeWrapper = require('thali/NextGeneration/thaliMobileNativeWrapper');
var platform = require('thali/NextGeneration/utils/platform');
var net = require('net');
var Promise = require('bluebird');
var randomString = require('randomstring');

var nearbyPeers = [];
var sockets = {};
var logger;
var updateNearbyPeers;
var logDiscoveredDevice;
// process.env.DEBUG = 'thalisalti:acl';
process.env.SSDP_NT = 'random-ssdp-nt:' + require('./SSDP');

process
    .once('uncaughtException', function (error) {
        console.error(
            'uncaught exception, error: \'%s\', stack: \'%s\'',
            error.toString(), error.stack
        );
        process.exit(1);
    })
    .once('unhandledRejection', function (error, p) {
        console.error(
            'uncaught promise rejection, error: \'%s\', stack: \'%s\'',
            error.toString(), error.stack
        );
        process.exit(2);
    })
    .once('exit', function (code, signal) {
        console.log('process exited, code: \'%s\', signal: \'%s\'', code, signal);
    });

Mobile('setupClientAndServer').registerAsync(function () {
    var server = createServer();
    startAndListen(server, peerAvailabilityChangedHandler);
});

Mobile('setLogAreaCallback').registerAsync(function (cb) {
    logger = cb;
});

Mobile('setDiscoveredDeviceCallback').registerAsync(function (cb) {
    logDiscoveredDevice = cb;
});

Mobile('setNearbyPeersCallback').registerAsync(function (cb) {
    updateNearbyPeers = cb;
});

Mobile('refreshNearbyPeers').registerAsync(function () {
    updateNearbyPeers(nearbyPeers);
});

Mobile('connectToPeer').registerAsync(function (peer) {
    connectToPeer(peer)
        .then(function (connection) {
            connect(net, {port: connection.listeningPort})
                .then(function(sock) {
                    sockets[peer.peerIdentifier] = sock;

                    logger('Connected to ' + peer.peerIdentifier);
                });
        });
});

Mobile('sendData').registerAsync(function (selectedPeer, dataSize) {
    var data = randomString.generate(dataSize);

    logger('Sending ' + data.length + ' bytes' + ' to ' + selectedPeer.peerIdentifier);
    shiftData(sockets[selectedPeer.peerIdentifier], data);
});

Mobile('stop').registerSync(function () {
    stopListeningAndAdvertising();
});

function startAndListen(server, peerAvailabilityChangedHandler) {
    server.listen(0, function () {
        var applicationPort = server.address().port;

        Mobile('peerAvailabilityChanged')
            .registerToNative(peerAvailabilityChangedHandler);

        Mobile('startUpdateAdvertisingAndListening').callNative(applicationPort, function () {
            Mobile('startListeningForAdvertisements').callNative(function () {});
        });
    });
}

function createServer() {
    return net.createServer(function (socket) {
        var buffer = '';
        var timeStamp = -1;
        var syncTime = 0;

        socket.on('data', function (chunk) {
            buffer += chunk.toString();
            console.log('Server received (%d bytes):', chunk.length);

            timeStamp = parseInt(buffer.substring(buffer.indexOf(':timeStamp:')).replace(':timeStamp:', ''));

            if (timeStamp > -1) {
                syncTime = Date.now() - timeStamp;
                logger('Total data received: ' + buffer.length + ' bytes');
                logger('Time: ' + syncTime + ' ms');
                logger('Transfer rate: ' + (((buffer.length * 8) / (syncTime / 1000)) / 10e6)
                        .toFixed(5).toString() + ' Mbps\n');
                buffer = '';
            }
        });
        socket.on('error', function (error) {
            console.log('Socket error occured');
        });
    });
}

function connectToPeer(peer) {
    var connectMethod;

    if (platform.isAndroid) {
        connectMethod = androidConnectToPeer;
    } else if (platform.isIOS) {
        connectMethod = iOSConnectToPeer;
    }

    return new Promise(function(resolve, reject) {
        // Will return connection
        connectMethod(peer)
            .then(resolve)
            .catch(function(err) {
                console.log('Error during connecting to peer!');
                reject(err);
            });
    })
}

function androidConnectToPeer(peer) {
    return new Promise(function (resolve, reject) {
        Mobile('connect')
            .callNative(peer.peerIdentifier, function (error, connection) {
                if (!connection) {
                    return reject(new Error('connect returned no connection'));
                }
                connection = JSON.parse(connection);
                resolve(connection);
            });
    });
}

function iOSConnectToPeer(peer) {
    var originalSyncValue = randomString.generate();
    var multiConnectHandler;

    return new Promise(function (resolve, reject) {
        multiConnectHandler = function (syncValue, error, listeningPort) {
            console.log(
                'Got multiConnectResolved -' +
                'syncValue: \'%s\', error: \'%s\', listeningPort: \'%s\'',
                syncValue, error, listeningPort
            );

            if (error) {
                // Connection to a peer failed.
                // Return a fatal error to avoid retrying connecting to a peer that is not available anymore
                error = new Error(error);
                error.isFatal = true;
                return reject(error);
            }
            if (syncValue !== originalSyncValue) {
                console.log(
                    'multiConnectResolved received invalid ' +
                    'syncValue: \'%s\', originalSyncValue: \'%s\'',
                    syncValue, originalSyncValue
                );
                return;
            }

            var port = parseInt(listeningPort, 10);
            if (isNaN(port) || port != listeningPort) {
                return reject(new Error(format(
                    'listeningPort is not a valid number: \'%s\'', listeningPort
                )));
            }
            resolve({
                listeningPort: port
            });
        };

        thaliMobileNativeWrapper.emitter.on('_multiConnectResolved', multiConnectHandler);

        Mobile('multiConnect')
            .callNative(peer.peerIdentifier, originalSyncValue, function (error) {
                console.log('Got \'multiConnect\' callback');

                if (error) {
                    error = new Error(format(
                        'We got an error synchronously from multiConnect, ' +
                        'that really shouldn\'t happen: \'%s\'', error
                    ));
                    error.isFatal = true;
                    return reject(error);
                }
            });
    })
        .finally(function () {
            thaliMobileNativeWrapper.emitter.removeListener('_multiConnectResolved', multiConnectHandler);
        });
}

function peerAvailabilityChangedHandler(peerAsArray) {
    var peer = peerAsArray[0];

    console.log('Received peerAvailabilityChanged event with ' + JSON.stringify(peer));
    
    if (!peer.peerAvailable) {
        removeFromNearbyPeers(nearbyPeers, peer);
        return;
    }

    if (!isNearbyPeerAlreadyInArray(peer)) {
        nearbyPeers.push({
            peer: peer
        });

        updateNearbyPeers(nearbyPeers);

        logDiscoveredDevice(peer, Date.now());
    }
}

function removeFromNearbyPeers(nearbyPeers, peerToRemove) {
    var i;

    for (i = nearbyPeers.length - 1; i >= 0; i--) {
        if (nearbyPeers[i].peer.peerIdentifier === peerToRemove.peerIdentifier) {
            nearbyPeers.splice(i, 1);
        }
    }
}

function isNearbyPeerAlreadyInArray(peer) {
    var i;

    for (i = 0; i < nearbyPeers.length; i++) {
        if (nearbyPeers[i].peer.peerIdentifier === peer.peerIdentifier) {
            return true;
        }
    }

    return false;
}

function stopListeningAndAdvertising() {
    return new Promise(function (resolve, reject) {
        Mobile('stopListeningForAdvertisements').callNative(function (err) {
            if (err) reject('Should be able to call stopListeningForAdvertisements');

            Mobile('stopAdvertisingAndListening').callNative(function (err) {
                !err ? resolve() : reject('Should be able to call stopAdvertisingAndListening');
                
                sockets = {};
                nearbyPeers = [];
            });
        });
    });
}

function shiftData(sock, exchangeData) {
    return new Promise(function (resolve, reject) {
        sock.on('error', function (error) {
            console.log('Client socket error:', error.message, error.stack);
            reject(error);
        });

        sock.on('close', function () {
            resolve();
        });

        var rawData = new Buffer(exchangeData);
        sock.write(rawData, function () {
            sock.write(new Buffer(':timeStamp:' + Date.now()), function () {
                logger('Data flushed\n');
            })
        });
    });
}

function connect(module, options) {
    return new Promise(function (resolve, reject) {
        var connectErrorHandler = function (error) {
            console.log('Connection to the %d port on localhost failed: %s',
                options.port, error.stack);
            reject(error);
        };
        console.log('Connecting to the localhost:%d', options.port);
        var client = module.connect(options, function () {
            client.removeListener('error', connectErrorHandler);
            console.log('Connected to the localhost:%d', options.port);
            resolve(client);
        });
        client.once('error', connectErrorHandler);
    });
}