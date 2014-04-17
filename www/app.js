//
//  Connect SDK Web App Sampler by LG Electronics
//
//  To the extent possible under law, the person who associated CC0 with
//  this sample app has waived all copyright and related or neighboring rights
//  to the sample app.
//
//  You should have received a copy of the CC0 legalcode along with this
//  work. If not, see http://creativecommons.org/publicdomain/zero/1.0/.
//

var app = {
    initialize: function () {
        if (!window.console) {
            alert("No console available; please install org.apache.cordova.console plugin");
        }
        
        console && console.log("initializing app");
        document.addEventListener("deviceready", this.cordovaReady.bind(this));
    },
    
    cordovaReady: function () {
        console && console.log("cordova is ready");
        
        this.startDiscovery();
        
        if (cordova.platformId === "ios") {
            $("#spacer").show();
        }
    },
    
    startDiscovery: function () {
        if (!window.ConnectSDK) {
            return;
        }
        
        var discoveryOptions = {
            capabilityFilters: [
                new ConnectSDK.CapabilityFilter(["WebAppLauncher.Launch"])
            ]
        };

        ConnectSDK.discoveryManager.startDiscovery(discoveryOptions);
        
        ConnectSDK.discoveryManager.on("startdiscovery", function () {
            $("#status").text("Searching for TVs");
        }, this);
        
        ConnectSDK.discoveryManager.on("stopdiscovery", function () {
            $("#status").text("Discovery stopped");
        }, this);
        
        ConnectSDK.discoveryManager.on("devicelistchanged", this.discoveryUpdate, this);
    },
    
    discoveryUpdate: function () {
        var numDevices = ConnectSDK.discoveryManager.getDeviceList().length;
        
        if (!this.device) {
            $("#status").text("TVs found: " + numDevices);
        }
    },
    
    pickDevice: function () {
        if (!window.ConnectSDK) {
            alert("Connect SDK is not available");
            return;
        }
        
        ConnectSDK.discoveryManager.pickDevice().success(function (device) {
            this.device = device;
            this.connectToDevice(device);
        }, this).error(function (err) {
            if (!err) {
                console && console.log("cancelled picker");
            } else {
                console && console.log("error picking device");
            }
        }, this);
    },
    
    connectToDevice: function (device) {
        if (device.isReady()) {
            this.deviceReady();
        } else {
            device.on("ready", this.deviceReady, this);
            device.on("disconnect", this.deviceDisconnect, this);
            
            device.connect();
        }
    },
            
    deviceReady: function () {
        this.device.off("ready"); // remove ready listeners
        
        // Set default web app id based on what kind of TV we're connected to
        var webAppId = "";
        
        if (this.device.hasService(ConnectSDK.Services.WebOSTV)) {
            webAppId = "SampleWebApp";
        } else if (this.device.hasService(ConnectSDK.Services.Chromecast)) {
            webAppId = "DDCEDE96";
        }
        
        $("#webAppIdField").val(webAppId);
        
        $("#webAppPanel").show();
    },
    
    deviceDisconnect: function () {
        $("#webAppPanel").hide();
        
        this.device.off("ready");
        this.device.off("disconnect");
        this.device = null;
    },
    
    launchClicked: function () {
        var webAppId = $("#webAppIdField").val();
        
        if (this.session) {
            this.cleanupSession();
        }
        
        // Launch web app
        this.device.getWebAppLauncher().launchWebApp(webAppId).success(function (webAppSession) {
            // Get a reference to the web app session
            // We should remember to release() it later to free up native resources
            this.session = webAppSession.acquire();
            
            // Add listeners
            this.session.on("message", this.handleMessage, this);
            this.session.on("disconnect", this.handleSessionDisconnect, this);
            
            // Connect to the web app
            this.session.connect()
                .success(this.handleSessionConnect, this)
                .error(this.handleSessionError, this);
            
            this.displaySessionStatus("Launched", "alert-info");
        }, this).error(function () {
            this.displaySessionStatus("Error launching web app", "alert-danger");
        });
    },
    
    displaySessionStatus: function (message, alertClass) {
        $("#session-status-text").text(message);
        $("#session-status").removeClass().addClass("alert alert-dismissable " + alertClass).show();
    },
    
    hideSessionStatus: function () {
        $("#session-status").hide();
    },
    
    handleSessionConnect: function () {
        this.displaySessionStatus("Connected", "alert-success");
        $("#session-div").show();
    },
    
    handleMessage: function (message) {
        var text = (typeof message === "string") ? message : JSON.stringify(message);
        this.displaySessionStatus("Got message: " + text, "alert-info");
    },
    
    handleSessionError: function (err) {
        this.displaySessionStatus("Error: " + err.message, "alert-danger");
        this.cleanupSession();
    },
    
    handleSessionDisconnect: function () {
        this.displaySessionStatus("Disconnected", "alert-warning");
        this.cleanupSession();
    },
    
    cleanupSession: function () {
        if (!this.session) {
            return;
        }
        
        // Clean up listeners
        this.session.off("message");
        this.session.off("disconnect");
        
        // Release session to free up memory
        this.session.release();
        this.session = null;
        
        $("#session-div").hide();
    },
    
    sendTextClicked: function () {
        var text = $("#messageTextField").val();
        
        this.session.sendText(text);
    },
    
    sendJSONClicked: function () {
        var text = $("#messageJSONField").val();
        var obj;
        
        try {
            obj = JSON.parse(text);
        } catch (e) {
            alert("JSON is not well-formed");
        }
        
        this.session.sendJSON(obj);
    }
};