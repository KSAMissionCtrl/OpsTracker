// get our platform properties for post-launch surveys
// http://stackoverflow.com/questions/11219582/how-to-detect-my-browser-version-and-operating-system-using-javascript
var nVer = navigator.appVersion;
var nAgt = navigator.userAgent;
var browserName  = navigator.appName;
var fullVersion  = ''+parseFloat(navigator.appVersion); 
var majorVersion = parseInt(navigator.appVersion,10);
var nameOffset,verOffset,ix;

// In Opera, the true version is after "Opera" or after "Version"
if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
 browserName = "Opera";
 fullVersion = nAgt.substring(verOffset+6);
 if ((verOffset=nAgt.indexOf("Version"))!=-1) 
   fullVersion = nAgt.substring(verOffset+8);
}

// In MSIE, the true version is after "MSIE" in userAgent
else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
 browserName = "Microsoft Internet Explorer";
 fullVersion = nAgt.substring(verOffset+5);
}

// In Chrome, the true version is after "Chrome" 
else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
 browserName = "Chrome";
 fullVersion = nAgt.substring(verOffset+7);
}

// In Safari, the true version is after "Safari" or after "Version" 
else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
 browserName = "Safari";
 fullVersion = nAgt.substring(verOffset+7);
 if ((verOffset=nAgt.indexOf("Version"))!=-1) 
   fullVersion = nAgt.substring(verOffset+8);
}

// In Firefox, the true version is after "Firefox" 
else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
 browserName = "Firefox";
 fullVersion = nAgt.substring(verOffset+8);
}

// In most other browsers, "name/version" is at the end of userAgent 
else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) < 
          (verOffset=nAgt.lastIndexOf('/')) ) 
{
 browserName = nAgt.substring(nameOffset,verOffset);
 fullVersion = nAgt.substring(verOffset+1);
 if (browserName.toLowerCase()==browserName.toUpperCase()) {
  browserName = navigator.appName;
 }
}

// trim the fullVersion string at semicolon/space if present
if ((ix=fullVersion.indexOf(";"))!=-1)
   fullVersion=fullVersion.substring(0,ix);
if ((ix=fullVersion.indexOf(" "))!=-1)
   fullVersion=fullVersion.substring(0,ix);
majorVersion = parseInt(''+fullVersion,10);
if (isNaN(majorVersion)) {
 fullVersion  = ''+parseFloat(navigator.appVersion); 
 majorVersion = parseInt(navigator.appVersion,10);
}
var browserDeets = browserName + " (v" + fullVersion + ") [" + navigator.appName + "] [" + navigator.userAgent + "]";
var OSName="Unknown OS";
if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";

// current game time is the difference between current real time minus number of ms since midnight on 9/13/16
// account for fact that game started during DST and also convert to seconds
UT = ((clock.getTime() - foundingMoment) / 1000);
if (clock.toString().search("Standard") >= 0) { UT -= 3600; UTC = 5; }
if (getParameterByName("showUT")) { console.log(UT + " " + clock); }

// handle history state changes
window.onpopstate = function(event) { swapContent(event.state.Type, event.state.ID, event.state.UT); };

// animate the size of the main content box
function raiseContent() {
  if ($("#contentBox").css("height") != "885px") {
    isContentMoving = true;
    $("#contentBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      $("#contentBox").css("height", "885px");
      $("#map").css("height", "885px");
      surfaceMap.invalidateSize();
      isContentMoving = false;
      
      // until I can figure out why the downsized map acts funky, only allow scrollwheel zoom on the big map
      surfaceMap.options.scrollWheelZoom = true;
    }, 400);
  }
}
function lowerContent() {
  if ($("#contentBox").css("height") != "480px") {
    $("#contentBox").css("height", "480px");
    $("#map").css("height", "480px");
    surfaceMap.invalidateSize();
    setTimeout(function() { 
      $("#contentBox").css("transform", "translateY(405px)"); 
      isContentMoving = true;
      setTimeout(function() { isContentMoving = false; }, 400);
      
      // until I figure out why the coordinates in the downsized map are messed up, hide the info control and don't allow scrollwheel zoom
      $(".leaflet-control-info").fadeOut();
      surfaceMap.options.scrollWheelZoom = false;
    }, 200);
  }
}

// called on page load
function setupContent() {

  // data load spinners
  $("#contentHeader").spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
  $("#menuBox").spin({ scale: 0.5, position: 'relative', top: '8px', left: '50%' });
  $("#launch").spin({ scale: 0.5, position: 'relative', top: '20px', left: '50%' });
  $("#maneuver").spin({ scale: 0.5, position: 'relative', top: '20px', left: '75%' });
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#figureDialog").spin({ position: 'relative', top: '45px', left: '50%' });

  // setup the clock
  $("#clock").html("<strong>Current Time @ KSC (UTC -" + UTC + ")</strong><br><span id='ksctime' style='font-size: 16px'>" + formatUTCTime(clock, true) + "</span>");

  // select the default crew roster sort
  $('input:radio[name=roster]').filter('[id=name]').prop('checked', true);
  
  // set up for AJAX requests
  // https://www.w3schools.com/xml/ajax_intro.asp
  // don't allow AJAX to cache data, which mainly screws up requests for updated vessel times for notifications
  $.ajaxSetup({ cache: false });
  
  // load data
  // event load then calls menu load
  initializeMap();
  loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  loadDB("loadBodyData.asp", loadBodyAJAX);
  loadDB("loadPartsData.asp", loadPartsAJAX);
  
  // setup the planet data dialog box
  // when it is closed, it will return to the top-left of the figure
  $("#figureDialog").dialog({autoOpen: false, 
                      closeOnEscape: true, 
                      resizable: false, 
                      width: "auto",
                      hide: { effect: "fade", duration: 300 }, 
                      show: { effect: "fade", duration: 300 },
                      position: { my: "left top", at: "left top", of: "#contentBox" },
                      close: function( event, ui ) { 
                        $(this).dialog("option", "position", { my: "left top", at: "left top", of: "#contentBox" }); 
                      }});
                      
  // setup the info dialog box that will contain vessel status notes
  // when it is closed, it will return to the center of the info box
  $("#infoDialog").dialog({autoOpen: false, 
                    closeOnEscape: true, 
                    resizable: true, 
                    title: "Additional Information",
                    width: 650,
                    height: 400,
                    hide: { effect: "fade", duration: 300 }, 
                    show: { effect: "fade", duration: 300 },
                    position: { my: "center", at: "center", of: "#infoBox" },
                    close: function( event, ui ) { 
                      $(this).dialog("option", "position", { my: "center", at: "center", of: "#infoBox" }); 
                      if (pageType == "vessel") { $(this).dialog("option", { width: 643, height: 400 }); }
                      else if (pageType == "crew") { $(this).dialog("option", { width: 490, height: 600 }); }
                    }});
  
  // setup the message dialog box that will notify the user about any surface map stuff
  $("#progressbar").progressbar({ value: 0 });
  $("#mapDialog").dialog({autoOpen: false, 
                    closeOnEscape: false, 
                    resizable: false, 
                    draggable: false,
                    dialogClass: "no-close",
                    width: 450,
                    height: "auto",
                    hide: { effect: "fade", duration: 300 }, 
                    show: { effect: "fade", duration: 300 },
                    position: { my: "center", at: "center", of: "#contentBox" }
                    });
  
  // setup the message dialog box that will notify the user about any general website stuff
  $("#siteDialog").dialog({autoOpen: false, 
                    closeOnEscape: false, 
                    resizable: false, 
                    draggable: false,
                    modal: true,
                    dialogClass: "no-close",
                    width: 620,
                    height: "auto",
                    hide: { effect: "fade", duration: 300 }, 
                    show: { effect: "fade", duration: 300 },
                    position: { my: "center", at: "center", of: "#contentBox" }
                    });
  
  // uncheck all the filter boxes
  $("#asteroid-filter").prop('checked', false);
  $("#debris-filter").prop('checked', false);
  $("#probe-filter").prop('checked', false);
  $("#ship-filter").prop('checked', false);
  $("#station-filter").prop('checked', false);

  // checkbox handling needed for dynamic figure & menu filters
  // ensure some start checked, then handle any changes
  $("#nodes").prop('checked', true);
  $("#labels").prop('checked', true);
  $("#ref").prop('checked', true);
  $("input").change(function () {
    if ($(this).attr("name") == "nodes") { toggleNodes($(this).is(":checked")); }
    if ($(this).attr("name") == "labels") { toggleLabels($(this).is(":checked")); }
    if ($(this).attr("name") == "orbits") { toggleOrbits($(this).is(":checked")); }
    if ($(this).attr("name") == "ref") { toggleRefLine($(this).is(":checked")); }
    if ($(this).attr("id").includes("menu")) { filterVesselMenu($(this).attr("name"), $(this).is(":checked")); }
    if ($(this).attr("id").includes("filter")) { filterVesselOrbits($(this).attr("name"), $(this).is(":checked")); }
  });

  // load page content
  if (getParameterByName("vessel").length) { swapContent("vessel", getParameterByName("vessel")); }
  else if (getParameterByName("body").length) { swapContent("body", getParameterByName("body")); }
  else if (getParameterByName("crew").length) { 
    if (getParameterByName("crew") == "crewFull") { swapContent("crewFull", getParameterByName("crew")); }
    else { swapContent("crew", getParameterByName("crew")); }
  } else { swapContent("body", "Kerbol-System"); }

  // check if this is a first-time visitor and act accordingly
  if (checkCookies()) {
    var user = getCookie("username");
    if (user == "") {
      setCookie("username", "kerbal", true);
      bNewUser = true;
      $("#siteDialog").html("<img src='http://www.kerbalspace.agency/KSA/wp-content/uploads/2016/01/KSAlogo_new_190x250.png' style='float: left; margin: 0px 5px 0px 0px; width: 25%'>The Operations Tracker is your view into everything that is happening right now at the Kerbal Space Agency. There is a lot to view and explore - we suggest starting with the Wiki to get an idea of all you can do here. We ask you take note the Operations Tracker is under <b>heavy ongoing development</b> and may at times be inaccessible for short periods. Please help us make this the best experience possible by <a href='https://github.com/KSAMissionCtrl/OpsTracker/issues' target='_blank'>submitting bug reports</a> if you come across any problems not listed in our <a href='https://github.com/KSAMissionCtrl/OpsTracker#known-issues' target='_blank'>Known Issues</a>. Enjoy exploring the Kerbol system with us <img src='http://www.kerbalspace.agency/KSA/wp-content/uploads/2017/12/jef2zahe.png'>");
      $("#siteDialog").dialog("option", "title", "Welcome, new visitor!");
      $("#siteDialog").dialog( "option", "buttons", [{
        text: "View wiki",
        click: function() { 
          window.open("https://github.com/KSAMissionCtrl/OpsTracker/wiki");
          $("#siteDialog").dialog("close");
        }
      },{
        text: "Close",
        click: function() { 
          $("#siteDialog").dialog("close");
        }
      }]);
      $("#siteDialog").dialog("open");
    }
  }
}

// switch from one layout to another
function swapContent(newPageType, id, ut) {
  if (!ut && !getParameterByName("ut")) { swapContent(newPageType, id, "NaN"); return; }
  if (!ut && getParameterByName("ut")) { swapContent(newPageType, id, parseInt(getParameterByName("ut"))); return; }
  
  // initial page load
  if (!pageType) {
    pageType = newPageType;
    if (newPageType == "body") {
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      loadBody(id);
    }
    if (newPageType == "vessel") {
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      lowerContent();
      $("#infoBox").fadeIn();
      $("#dataBox").fadeIn();
      loadVessel(id, ut);
    }
    if (newPageType == "crewFull") {
      $("#contentBox").spin(false);
      $("#contentBox").css("margin-top", "5px");
      $("#contentBox").fadeIn();
      $("#fullRoster").fadeIn();
      loadCrew(id);
    }
    if (newPageType == "crew") {
      $("#contentBox").spin(false);
      $("#contentBox").css("margin-top", "5px");
      $("#contentBox").fadeOut();
      $("#infoBox").fadeIn();
      $("#infoBox").css("height", "600px");
      $("#infoBox").css("width", "498px");
      $("#dataBox").fadeIn();
      $("#dataBox").css("transform", "translateX(-154px)");
      $("#dataBox").css("width", "449px");
      $("#crewFooter").fadeIn();
      $("#footer").fadeOut();
      $("#contentBox").fadeOut();
      $("#missionHistory").fadeOut();
      loadCrew(id);
    }
    return;
  } 
  
  // not a total content swap, just new data
  if (pageType == newPageType) {
    if (newPageType == "body") { loadBody(id); }
    if (newPageType == "vessel") { loadVessel(id, ut); }
    if (newPageType == "crew") { loadCrew(id); }
    return;
  }

  // hide the current content
  if (pageType == "body") {
    $("#figureOptions").fadeOut();
    $("#vesselOrbitTypes").fadeOut();
    $("#figure").fadeOut();
    $("#figureDialog").dialog("close");
    removeMapCloseButton();
  } else if (pageType == "vessel") {
  
    // some elements don't need to be hidden if switching to a crew page
    if (newPageType != "crew") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
      $("#contentBox").spin(false);
      $("#infoBox").spin(false);
      $("#dataField0").spin(false);
      swapTwitterSource();
    }
    $("#infoDialog").dialog("close");
    $("#mapDialog").dialog("close");
    if ($("#map").css("visibility") != "hidden" && !window.location.href.includes("&map")) $("#map").fadeOut();
    $("#content").fadeOut();
    removeVesselMapButtons();
    clearVesselPlots();
    
    // if a vessel orbital calculation is in progress, pause it as long as we are switching to a crew page or a body view of the same current one
    if (!layerControl.options.collapsed && (newPageType.includes("crew") || (newPageType == "body" && id.split("-")[0] == strCurrentBody))) {
      layerControl._collapse();
      layerControl.options.collapsed = true;
      layerControl.removeLayer(obtTrackDataLoad);
      obtTrackDataLoad = null;
      strPausedVesselCalculation = strCurrentVessel;
    
    // we're heading to another body, which means we have to stop all calculations if any are in progress
    } else if (!layerControl.options.collapsed && (newPageType == "body" && id.split("-")[0] != strCurrentBody)) {
      layerControl._collapse();
      layerControl.options.collapsed = true;
      layerControl.removeLayer(obtTrackDataLoad);
      obtTrackDataLoad = null;
      isOrbitRenderTerminated = true;
      clearVesselPlots();
      currentVesselPlot = null;
    }
  } else if (pageType == "crew") {
    if (newPageType == "body") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
    }
    $("#crewFooter").fadeOut();
    $("#footer").fadeIn();
    $("#infoDialog").dialog("close");
  } else if (pageType == "crewFull") {
    $("#fullRoster").fadeOut();
  }
  
  // show/load the new content
  pageType = newPageType;
  if (newPageType == "body") {
    raiseContent();
    setTimeout(function() { 
      if (!window.location.href.includes("&map")) {
        $("#figureOptions").fadeIn();
        if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) { $("#vesselOrbitTypes").fadeIn(); }
        $("#figure").fadeIn();
      }
      $("#contentBox").fadeIn();
      loadBody(id); 
    }, 600);
  } else if (newPageType == "vessel") {
    lowerContent();
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "400px");
    $("#infoBox").css("width", "650px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(0px)");
    $("#dataBox").css("width", "295px");
    $("#contentBox").fadeIn();
    $("#map").css("visibility", "visible");
    if (isVesselUsingMap) { $("#map").fadeIn(); }
    else { $("#content").fadeIn(); }
    loadVessel(id, ut);
  } else if (newPageType == "crew") {
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "600px");
    $("#infoBox").css("width", "498px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(-154px)");
    $("#dataBox").css("width", "449px");
    $("#crewFooter").fadeIn();
    $("#footer").fadeOut();
    $("#contentBox").fadeOut();
    $("#missionHistory").fadeOut();
    loadCrew(id);
  } else if (newPageType == "crewFull") {
    raiseContent();
    $("#infoBox").fadeOut();
    $("#dataBox").fadeOut();
    swapTwitterSource();
    $("#crewFooter").fadeOut();
    $("#footer").fadeIn();
    $("#contentBox").fadeIn();
    $("#fullRoster").spin({ position: 'relative', top: '50%', left: '50%' });
    
    // delay this a bit so the scroll bar doesn't pop up before the content move is complete
    setTimeout(function() { $("#fullRoster").fadeIn(); }, 250);
    loadCrew(id);
  }
}

// updates various content on the page depending on what update event has been triggered
function updatePage(updateEvent) {
  if (updateEvent.Type.includes("menu")) {
    if (updateEvent.Type.split(";")[1] == "soi") {
      console.log("menu soi update");
    } else if (updateEvent.Type.split(";")[1] == "name") {
      console.log("menu name update");
    } else if (updateEvent.Type.split(";")[1] == "crew") {
      console.log("menu crew update");
    } else { console.log("unknown menu update"); console.log(updateEvent); }
  } else if (updateEvent.Type == "event") {
    if (updateEvent.ID == "launch") {
      console.log("launch update");
    } else if (updateEvent.ID == "maneuver") {
      console.log("maneuver update");
    } else { console.log("unknown event update"); console.log(updateEvent); }
  } else if (updateEvent.Type.includes("vessel") && updateEvent.ID == strCurrentVessel) {
    if (updateEvent.Type.split(";")[1] == "orbit") {
      console.log("vessel orbit update");
    } else if (updateEvent.Type.split(";")[1] == "flightplan") {
      console.log("vessel flightplan update");
    } else if (updateEvent.Type.split(";")[1] == "data") {
      console.log("vessel data update");
    } else if (updateEvent.Type.split(";")[1] == "resources") {
      console.log("vessel resources update");
    } else if (updateEvent.Type.split(";")[1] == "crew") {
      console.log("vessel crew update");
    } else if (updateEvent.Type.split(";")[1] == "comms") {
      console.log("vessel comms update");
    } else if (updateEvent.Type.split(";")[1] == "ports") {
      console.log("vessel ports update");
    } else { console.log("unknown vessel update"); console.log(updateEvent); }
  }
}

// recursively check through updates so we get any that occur at the same time
function checkPageUpdate() {
  if (updatesList.length && currUT() >= updatesList[0].UT) {
    updatePage(updatesList.shift());
    updatesListSize = updatesList.length;
    checkPageUpdate();
  } else { return; }
}

function swapTwitterSource(swap, source) {
  if (swap && source) {
    $("#twitterTimelineSelection").html("Sources: <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "')\">KSA Main Feed</span> | <b>" + swap + "</b>");
    twitterSource = source;
  } else if (swap && !source) {
    if (twitterSource.split(";").length > 1) { src = twitterSource.split(";")[1]; }
    else { src = twitterSource; }
    $("#twitterTimelineSelection").html("Sources: <b>KSA Main Feed</b> | <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "', '" + src + "')\">" + swap + "</span>");
  } else if (!swap && !source) {
    $("#twitterTimelineSelection").html("Sources: <b>KSA Main Feed</b>");
  }
  if (!source) { source = "https://twitter.com/KSA_MissionCtrl"; }
  $("#twitterTimeline").html("<a class='twitter-timeline' data-chrome='nofooter noheader' data-height='500' href='"+ source + "'>Loading Tweets...</a> <script async src='https://platform.twitter.com/widgets.js' charset='utf-8'>");
}

// loop and update the page every second
// no longer using setInterval, as suggested via
// http://stackoverflow.com/questions/6685396/execute-the-first-time-the-setinterval-without-delay
(function tick() {

  // sort the update times if new ones have been added since our last check, then look for updates
  if (updatesList.length > updatesListSize) {
    updatesListSize = updatesList.length;
    updatesList.sort(function(a,b) {return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0);} );
    console.log(updatesList); 
  }
  checkPageUpdate();

  // update the clocks
  $('#ksctime').html(UTtoDateTime(currUT(), true));
  if (launchCountdown > 0) { $('#launchCountdown').html(formatTime(launchCountdown, false)); }
  else if (launchCountdown == 0) { $('#launchCountdown').html("LIFTOFF!!"); }
  if (maneuverCountdown > 0) { $('#maneuverCountdown').html(formatTime(maneuverCountdown, false)); }
  else if (maneuverCountdown == 0) { $('#maneuverCountdown').html("EXECUTE!!"); }
  launchCountdown--;
  maneuverCountdown--;
  
  // update the dynamic orbit figure
  if (isGGBAppletLoaded) { ggbApplet.setValue("UT", currUT()); }
  
  // is there a loaded vessel we need to monitor?
  if (currentVesselData) {
  
    // is the mission still active?
    if (!isMissionEnded()) {
    
      // update the MET or countdown
      $("#metCount").html(formatTime($("#metCount").attr("data")-currUT()));
      
      // update vessel surface map information if a vessel is on the map and calculations are not running
      if (vesselMarker && layerControl.options.collapsed) {
        var now = getPlotIndex();

        // update craft position and popup content
        var cardinal = getLatLngCompass(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng);
        vesselMarker.setLatLng(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng);
        $('#lat').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lat).format('0.0000') + "&deg;" + cardinal.Lat);
        $('#lng').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lng).format('0.0000') + "&deg;" + cardinal.Lng);
        $('#alt').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Alt).format('0,0.000') + " km");
        $('#vel').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Vel).format('0,0.000') + " km/s");
        
        // update the Ap/Pe markers if they exist, and check for passing
        if (currentVesselPlot.Events.Ap.Marker) {
          $('#apTime').html(formatTime(currentVesselPlot.Events.Ap.UT - currUT()));
          if (currentVesselPlot.Events.Ap.UT <= currUT()) {

            // just add on the time of an orbit to get the time for the next Ap
            currentVesselPlot.Events.Ap.UT += currentVesselData.Orbit.OrbitalPeriod;
            
            // remove the marker from the current layer and check if there is an orbit after this that is long enough to add the marker to
            currentVesselPlot.Data[now.ObtNum].Layer.removeLayer(currentVesselPlot.Events.Ap.Marker);
            if (now.ObtNum + 1 < currentVesselPlot.Data.length && 
                currUT() + currentVesselPlot.Data[now.ObtNum+1].Orbit.length > currentVesselPlot.Events.Ap.UT) {
            
              // subtract the new UT of the Ap from the starting UT of the next orbit to get the proper index
              currentVesselPlot.Events.Ap.Marker.setLatLng(currentVesselPlot.Data[now.ObtNum+1].Orbit[Math.floor(currentVesselPlot.Events.Ap.UT-currentVesselPlot.Data[now.ObtNum+1].StartUT)].Latlng);
              var strTimeDate = UTtoDateTime(currentVesselPlot.Events.Ap.UT);
              $('#apDate').html(strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1]);
              currentVesselPlot.Data[now.ObtNum+1].Layer.addLayer(currentVesselPlot.Events.Ap.Marker);
              
            // noplace else to go, so remove the marker from the map completely
            } else { 
              surfaceMap.removeLayer(currentVesselPlot.Events.Ap.Marker); 
              currentVesselPlot.Events.Ap.Marker = null;
            }
          }
        }
        if (currentVesselPlot.Events.Pe.Marker) {
          $('#peTime').html(formatTime(currentVesselPlot.Events.Pe.UT - currUT()));
          if (currentVesselPlot.Events.Pe.UT <= currUT()) {
            currentVesselPlot.Events.Pe.UT += currentVesselData.Orbit.OrbitalPeriod;
            currentVesselPlot.Data[now.ObtNum].Layer.removeLayer(currentVesselPlot.Events.Pe.Marker);
            if (now.ObtNum + 1 < currentVesselPlot.Data.length && 
                currUT() + currentVesselPlot.Data[now.ObtNum+1].Orbit.length > currentVesselPlot.Events.Pe.UT) {
              currentVesselPlot.Events.Pe.Marker.setLatLng(currentVesselPlot.Data[now.ObtNum+1].Orbit[Math.floor(currentVesselPlot.Events.Pe.UT-currentVesselPlot.Data[now.ObtNum+1].StartUT)].Latlng);
              var strTimeDate = UTtoDateTime(currentVesselPlot.Events.Pe.UT);
              $('#peDate').html(strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1]);
              currentVesselPlot.Data[now.ObtNum+1].Layer.addLayer(currentVesselPlot.Events.Pe.Marker);
            } else { 
              surfaceMap.removeLayer(currentVesselPlot.Events.Pe.Marker); 
              currentVesselPlot.Events.Pe.Marker = null;
            }
          }
        }
      }
    }
  }
  
  // update any tooltips
  Tipped.refresh(".tip-update");  
  
  // ensure timer accuracy, even catch up if browser slows tab in background
  // http://www.sitepoint.com/creating-accurate-timers-in-javascript/
  var diff = (new Date().getTime() - clock.getTime()) - tickDelta;
  tickDelta += 1000;
  setTimeout(tick, 1000 - diff);
})();