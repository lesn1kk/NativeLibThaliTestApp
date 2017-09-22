# Overview #

This is a simple Thali native test application.

# Build instructions #

In order to build the application follow the steps:

1. Clone 2 GIT repos in the same location:
    * https://github.com/mlesnic/NativeLibThaliTestApp.git (master branch)
    * https://github.com/thaliproject/Thali_CordovaPlugin.git (master branch)
1. Enter the Thali_CordovaPlugin folder and run:
`./build.sh`
1. Enter the NativeLibThaliTestApp folder and run:
`./prepare.sh`
1. Now you can build the cordova app using command:
`cordova build android --device`
`cordova build ios --device`

# Run instructions #
1. First of all you need to wait for JxCore to load completely, this will be indicated by
   label at the top of screen.
1. Then click Setup client/server on both devices. This will create servers on both devices and start advertising and listening
   for advertisements.
1. Refresh list updates current nearby peers list. Clear list clears this list (for example when you know the peer is gone).
   Unfortunately, we can't be sure that we will get proper event when peer is gone. To make sure the list is clear, click Stop
1. Connect to peer button connects one device to another.
1. Connect to all peers makes device connect to all nearby peers
1. When you are sure you are connected with other device, you can send data to that device. The data size is also
   selectable below.
1. Send data to all peers does what it says.
1. Stop button stops listening and advertising and clears nearby peers list on server side.
1. Run discovery test tests time between starting listening and advertising and discovery of the one, nearby device.
   To run this test, you need to make sure the second device is already advertising, and the first one is not.
   This test has to be ran before devices discover each other.
   So the scenario is:
   Setup client/server on first device, do not do it on second one.
   Then when you want to measure discovery time, just click Run discovery test on second device.
1. Logs are gathered at the bottom of screen.
Note that device (especially iOS) should not go background as this is not handled by the app.
