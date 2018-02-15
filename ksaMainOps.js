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
if (clock.toString().search("Standard") >= 0) UT -= 3600; UTC = 5;
if (window.location.href.includes("&showUT") || window.location.href.includes("?showUT")) console.log(UT + " " + clock);
if (getParameterByName("setut") && getCookie("missionctrl")) UT = parseFloat(getParameterByName("setut"));

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
    }, 400);
  }
}
function lowerContent() {
  if ($("#contentBox").css("height") != "480px") {
    isContentMoving = true;
    $("#contentBox").css("height", "480px");
    $("#map").css("height", "480px");
    surfaceMap.invalidateSize();
    setTimeout(function() { 
      $("#contentBox").css("transform", "translateY(405px)"); 
      setTimeout(function() { isContentMoving = false; }, 400);
      
      // until I figure out why the coordinates in the downsized map are messed up, hide the info control
      $(".leaflet-control-info").fadeOut();
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
                    close: function(event, ui) { 
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
                    position: { my: "center", at: "center", of: "#contentBox" },
                    open: function(event, ui) { removeMapResizeButton(); },
                    close: function(event, ui) { addMapResizeButton(); }
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
                    position: { my: "center", at: "center", of: "#mainContent" }
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
    if ($(this).attr("name") == "soi") { toggleSOI($(this).is(":checked")); }
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
function swapContent(newPageType, id, ut, flt) {
  if (!flt && isNaN(ut)) flt = ut;
  if (!ut) ut = "NaN";
  
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
    if (newPageType == "body") { loadBody(id, flt); }
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
    }
    $("#infoDialog").dialog("close");
    $("#mapDialog").dialog("close");
    if ($("#map").css("visibility") != "hidden" && !window.location.href.includes("&map")) $("#map").fadeOut();
    $("#content").fadeOut();
    removeVesselMapButtons();
    clearSurfacePlots();
    
    // if a vessel orbital calculation is in progress, pause it as long as we are switching to a crew page or a body view of the same current one
    if (!layerControl.options.collapsed && (newPageType.includes("crew") || (newPageType == "body" && id == strCurrentBody))) {
      if (obtTrackDataLoad) layerControl.removeLayer(obtTrackDataLoad);
      obtTrackDataLoad = null;
      strPausedVesselCalculation = strCurrentVessel;
      checkDataLoad()
    
    // we're heading to another body, which means we have to stop all calculations if any are in progress
    } else if (!layerControl.options.collapsed && (newPageType == "body" && id != strCurrentBody)) {
      if (obtTrackDataLoad) layerControl.removeLayer(obtTrackDataLoad);
      obtTrackDataLoad = null;
      isOrbitRenderTerminated = true;
      clearSurfacePlots();
      currentVesselPlot = null;
      checkDataLoad()
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
    if ($("#twitterTimelineSelection").html().includes("|")) swapTwitterSource();
    raiseContent();
    setTimeout(function() { 
      if (!window.location.href.includes("&map")) {
        $("#figureOptions").fadeIn();
        if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) { $("#vesselOrbitTypes").fadeIn(); }
        $("#figure").fadeIn();
      }
      $("#contentBox").fadeIn();
      loadBody(id, flt); 
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
    if ($("#twitterTimelineSelection").html().includes("|")) swapTwitterSource();
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
  console.log(updateEvent);
  if (updateEvent.Type.includes("menu")) {
    menuUpdate(updateEvent.Type.split(";")[1], updateEvent.ID);
  } else if (updateEvent.Type == "event") {
    if (updateEvent.ID == "launch") {
      writeLaunchInfo(updateEvent.Data);
    } else if (updateEvent.ID == "maneuver") {
      writeManeuverinfo(updateEvent.Data);
    } else { console.log("unknown event update"); console.log(updateEvent); }
  } else if (updateEvent.Type == "object") {
    var obj = opsCatalog.find(o => o.ID === updateEvent.ID);
    if (!obj) console.log("unknown update object" + obj);
    else {
      if (obj.Type == "crew") updateCrewData(obj);
      if (obj.Type == "vessel") updateVesselData(obj);
    }
  }
}

// recursively check through updates so we get any that occur at the same time
function checkPageUpdate() {
  if (updatesList.length && currUT() >= updatesList[0].UT) {
    updatePage(updatesList.shift());
    updatesListSize = updatesList.length;
    return checkPageUpdate();
  } else { return; }
}

function swapTwitterSource(swap, source) {
  if (swap && source) {
    $("#twitterTimelineSelection").html("Source: <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "')\">KSA Main Feed</span> | <b>" + swap + "</b>");
    twitterSource = source;
  } else if (swap && !source) {
    if (twitterSource.split(";").length > 1) { src = twitterSource.split(";")[1]; }
    else { src = twitterSource; }
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b> | <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "', '" + src + "')\">" + swap + "</span>");
  } else if (!swap && !source) {
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b>");
  }
  if (!source) { source = "https://twitter.com/KSA_MissionCtrl"; }
  $("#twitterTimeline").html("<a class='twitter-timeline' data-chrome='nofooter noheader' data-height='500' href='"+ source + "'>Loading Tweets...</a> <script async src='https://platform.twitter.com/widgets.js' charset='utf-8'>");
}

// loads data for all active vessels and crew so they can be updated
function loadOpsDataAJAX(xhttp) {

  if (xhttp) {
  
    // header info uses "Typ3" as a unique identifier to parse out the craft ID from the rest of the data
    // since I ran out of special character to use
    var object = opsCatalog.find(o => o.ID === xhttp.responseText.split("Typ3")[0]);
    
    // decide what type of object we are parsing data for
    if (xhttp.responseText.includes("Typ3vessel")) {
      
      // separate the main data segments
      var data = xhttp.responseText.split("Typ3vessel")[1].split("*");
      
      // the vessel catalog data is first
      var catalog = rsToObj(data[0]);
      
      // the various tables of the current record are next
      var dataTables = data[1].split("^");
      var craft = rsToObj(dataTables[0]);
      var resources = rsToObj(dataTables[1]);
      var crew = rsToObj(dataTables[2]);
      var comms = rsToObj(dataTables[3]);
      var obt = rsToObj(dataTables[4]);
      var ports = rsToObj(dataTables[5]);
      object.CurrentData = { CatalogData: catalog,
                             CraftData: craft,
                             Resources: resources,
                             Manifest: crew,
                             Comms: comms,
                             Orbit: obt,
                             Ports: ports,
                             History: null, LaunchTimes: null, OrbitalHistory: null };
      
      // followed by any future events
      dataTables = data[2].split("^");
      craft = rsToObj(dataTables[0]);
      resources = rsToObj(dataTables[1]);
      crew = rsToObj(dataTables[2]);
      comms = rsToObj(dataTables[3]);
      obt = rsToObj(dataTables[4]);
      ports = rsToObj(dataTables[5]);
      object.FutureData = { CraftData: craft,
                            Resources: resources,
                            Manifest: crew,
                            Comms: comms,
                            Orbit: obt,
                            Ports: ports };
      
      // parse and sort the histories and launch times
      var history = [];
      var launches = [];
      var obtHist = [];
      data[3].split("|").forEach(function(item) { history.push({UT: parseFloat(item.split("~")[0]), Title: item.split("~")[1]}); });
      if (data[4].split("|") != "null") {
        data[4].split("|").forEach(function(item) { launches.push({UT: parseFloat(item.split("~")[0]), LaunchTime: parseFloat(item.split("~")[1])}); });
      }
      if (data[5].split("|") != "null") {
        data[5].split("|").forEach(function(item) { obtHist.push({UT: parseFloat(item.split("~")[0]), Period: parseFloat(item.split("~")[1])}); });
      }
      object.CurrentData.History = history;
      object.CurrentData.LaunchTimes = launches;
      object.CurrentData.OrbitalHistory = obtHist;
    } else if (xhttp.responseText.includes("Typ3crew")) {
      var data = xhttp.responseText.split("Typ3crew")[1].split("*");
      
      // the crew catalog data is first
      var catalog = rsToObj(data[0]);
      
      // the various tables of the current record are next
      var dataTables = data[1].split("^");
      var stats = rsToObj(dataTables[0]);
      var history = rsToObj(dataTables[3]);
      
      // parse the missions and the ribbons
      var missions = [];
      var ribbons = [];
      if (dataTables[1] != "null") dataTables[1].split("|").forEach(function(item, index) { missions.push(rsToObj(item)); });
      if (dataTables[2] != "null") dataTables[2].split("|").forEach(function(item, index) { ribbons.push(rsToObj(item)); });
      missions.reverse();
      object.CurrentData = { Stats: stats,
                           History: history,
                           Background: catalog,
                           Missions: missions,
                           Ribbons: ribbons };
      
      // followed by any future events
      var dataTables = data[2].split("^");
      var stats = rsToObj(dataTables[0]);
      var history = rsToObj(dataTables[3]);
      
      // parse the missions and the ribbons
      var missions = [];
      var ribbons = [];
      if (dataTables[1] != "null") dataTables[1].split("|").forEach(function(item, index) { missions.push(rsToObj(item)); });
      if (dataTables[2] != "null") dataTables[2].split("|").forEach(function(item, index) { ribbons.push(rsToObj(item)); });
      missions.reverse();
      object.FutureData = { Stats: stats,
                          History: history,
                          Missions: missions,
                          Ribbons: ribbons };
    }
    object.isLoading = false;
    
    // determine if this object has a future event that we need to plan an update for
    var updateUT = null;
    for (var prop in object.FutureData) {
      if (object.FutureData[prop] && 
      ((object.FutureData[prop].UT && !updateUT) || (object.FutureData[prop].UT && object.FutureData[prop].UT < updateUT))) { 
        updateUT = object.FutureData[prop].UT
      }
    }
    if (updateUT) updatesList.push({ Type: "object", ID: object.ID, UT: updateUT });
  }
  
  // is there anything that has not been loaded yet?
  for (i=0; i<opsCatalog.length; i++) {
    if (!opsCatalog[i].isLoading && !opsCatalog[i].CurrentData) {
      opsCatalog[i].isLoading = true;
      loadDB("loadOpsData.asp?db=" + opsCatalog[i].ID + "&UT=" + currUT() + "&type=" + opsCatalog[i].Type + "&pastUT=NaN", loadOpsDataAJAX);
    }
  }
  if (!opsCatalog.find(o => o.isLoading === true)) console.log(opsCatalog);
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
  $('#ksctime').html(UTtoDateTime(currUT(true), true));
  if (!isNaN(launchCountdown) && launchCountdown - currUT(true) > 0) $('#launchCountdown').html(formatTime(launchCountdown - currUT(true), false));
  else if (!isNaN(launchCountdown) && launchCountdown - currUT(true) <= 0) { 
    
    // cleanup the event data and prep for checking for new events
    $('#launchCountdown').html("LIFTOFF!!"); 
    launchCountdown = "null";
    strCurrentLaunchVessel = null;
    setTimeout(function() { loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX); }, 5000);
  }
  if (!isNaN(maneuverCountdown) && maneuverCountdown - currUT(true) > 0) $('#maneuverCountdown').html(formatTime(maneuverCountdown - currUT(true), false));
  else if (!isNaN(maneuverCountdown) && maneuverCountdown - currUT(true) <= 0) { 
    $('#maneuverCountdown').html("EXECUTE!!"); 
    maneuverCountdown = "null";
    strCurrentManeuverVessel = null;
    setTimeout(function() { loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX); }, 5000);
  }
  
  // update the dynamic orbit figure
  if (isGGBAppletLoaded) { ggbApplet.setValue("UT", currUT()); }
  
  // is there a loaded vessel we need to monitor?
  if (currentVesselData) {
  
    // is the mission still active?
    if (!isMissionEnded()) {
    
      // update the MET or countdown
      $("#metCount").html(formatTime($("#metCount").attr("data")-currUT(true)));
      
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
          $('#apTime').html(formatTime(currentVesselPlot.Events.Ap.UT - currUT(true)));
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
          $('#peTime').html(formatTime(currentVesselPlot.Events.Pe.UT - currUT(true)));
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