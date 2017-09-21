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
1. Then click Init on both devices. This will create servers on both devices and start advertising and listening
   for advertisements.
1. Refresh list updates current nearby peers list. Clear list clears this list (for example when you know the peer is gone).
   Unfortunately, we can't be sure that we will get proper event when peer is gone.
1. Connect to peer button connects one device to another.
1. When you are sure you are connected with other device, you can send data to that device. The data size is also
   selectable below. 
1. Logs are gathered at the bottom of screen.
Note that device (especially iOS) should not go background as this is not handled by the app.
