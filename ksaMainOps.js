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
if (window.location.href.includes("&showUT") || window.location.href.includes("?showUT")) console.log(UT + " " + clock);
if (getParameterByName("setut") && getCookie("missionctrl")) UT = parseFloat(getParameterByName("setut"));
if (window.location.href.includes("&live") && getParameterByName("ut") && parseFloat(getParameterByName("ut")) < UT) UT = parseFloat(getParameterByName("ut"));

// handle history state changes
window.onpopstate = function(event) { 
  swapContent(event.state.Type, event.state.ID, event.state.UT); 

  // make sure a map dialog that was commanded to show does not
  if (mapDialogDelay) {
    clearTimeout(mapDialogDelay);
    mapDialogDelay = null;
  }
};

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
  if (currUT() >= 60571076 && currUT() <= 60772851) {
    if (checkCookies() && getCookie("missionctrl")) {}
    else {
      setupContentDown();
      return;
    }
  }

  // setup the clock
  $("#clock").html("<strong>Current Time @ KSC (UTC -" + UTC + ")</strong><br><span id='ksctime' style='font-size: 16px'></span>");

  // select the default sort options
  $('input:radio[name=roster]').filter('[id=name]').prop('checked', true);
  $('input:radio[name=inactive]').filter('[id=type]').prop('checked', true);
  
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
  
  // JQuery UI theme the buttons used to page through mission history
  // diabled by default, will enable as needed when vessel loads
  // NOTE: make sure this is always before dialog setup so the X close button does not get disabled
  $("button").button({disabled: true});

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
                    open: function(event, ui) { 

                      // don't allow the user to manipulate the map size while dialog is open
                      removeMapResizeButton(); 
                      $(".leaflet-control-zoom-fullscreen.fullscreen-icon").hide();
                    },
                    close: function(event, ui) { 
                      addMapResizeButton();
                      $(".leaflet-control-zoom-fullscreen.fullscreen-icon").show();
                    }
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
  else if (window.location.href.includes("active")) { swapContent("vessel", "ascensionmk1-9"); }
  else if (getParameterByName("body").length) { swapContent("body", getParameterByName("body")); }
  else if (getParameterByName("crew").length) { 
    if (getParameterByName("crew") == "crewFull") { swapContent("crewFull", getParameterByName("crew")); }
    else { swapContent("crew", getParameterByName("crew")); }
  } else { swapContent("body", "Kerbol-System"); }

  // check if this is a first-time visitor and act accordingly
  if (checkCookies()) {
    if (!getCookie("visitTime")) {
      setCookie("visitTime", currUT(), true);
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
function setupContentDown() {
  setTimeout(function() {
    $(".body").empty();
    document.documentElement.innerHTML = 'Error connecting to server! Please wait a few minutes and try again.';
  }, 5000);
}

// switch from one layout to another
function swapContent(newPageType, id, ut, flt) {
  if (!flt && isNaN(ut)) flt = ut;
  if (!ut) ut = "NaN";
  if (newPageType == "vessel" && pageType == "vessel" && strCurrentVessel == id) return;
  
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

  // remove any tooltips open
  Tipped.remove('.tipped');
  
  // not a total content swap, just new data
  if (pageType == newPageType) {
    if (newPageType == "body") { loadBody(id, flt); }
    if (newPageType == "vessel") { loadVessel(id, ut); }
    if (newPageType == "crew") { loadCrew(id); }
    return;
  }

  // hide the current content
  if (pageType == "body") {
    hideMap();
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
      if (surfaceTracksDataLoad.obtTrackDataLoad) layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
      surfaceTracksDataLoad.obtTrackDataLoad = null;
      strPausedVesselCalculation = strCurrentVessel;
      checkDataLoad()
    
    // we're heading to another body, which means we have to stop all calculations if any are in progress
    } else if (!layerControl.options.collapsed && (newPageType == "body" && id != strCurrentBody)) {
      if (surfaceTracksDataLoad.obtTrackDataLoad) layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
      surfaceTracksDataLoad.obtTrackDataLoad = null;
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
      if (layerPins) {
        layerPins.addTo(surfaceMap);
        layerControl.addOverlay(layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
      }
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
    if (isVesselUsingMap) { 
      if (layerPins) {
        surfaceMap.removeLayer(layerPins);
        layerControl.removeLayer(layerPins); 
      }
      $("#map").fadeIn(); 
    }
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
  menuSaveSelected = w2ui['menu'].find({selected: true});
  if (menuSaveSelected.length == 0) menuSaveSelected = null;
  if (updateEvent.Type.includes("menu")) {
    menuUpdate(updateEvent.Type.split(";")[1], updateEvent.ID);
  } else if (updateEvent.Type == "event") {
    loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
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
  if (!isMenuDataLoaded) return;
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
      
      // any ascent data is always accessible
      var ascentData = [];
      if (data[1] != "null") {
        data[1].split("|").forEach(function(item) { 
          var dataObj = rsToObj(item);
          ascentData.push(dataObj);
        });
      }
      object.ascentData = ascentData;

      // the various tables of the current record are next
      var dataTables = data[2].split("^");
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
      dataTables = data[3].split("^");
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
      data[4].split("|").forEach(function(item) { history.push({UT: parseFloat(item.split("~")[0]), Title: item.split("~")[1]}); });
      if (data[5].split("|") != "null") {
        data[5].split("|").forEach(function(item) { launches.push({UT: parseFloat(item.split("~")[0]), LaunchTime: parseFloat(item.split("~")[1])}); });
      }
      if (data[6].split("|") != "null") {
        data[6].split("|").forEach(function(item) { obtHist.push({UT: parseFloat(item.split("~")[0]), Period: parseFloat(item.split("~")[1])}); });
      }
      object.CurrentData.History = history;
      object.CurrentData.LaunchTimes = launches;
      object.CurrentData.OrbitalHistory = obtHist;

      // update the menu data so re-sorting is accurate
      var bodyRef = 3;
      if (object.CurrentData.CatalogData.SOI.split("|").length > 1) bodyRef = parseInt(object.CurrentData.CatalogData.SOI.split("|")[object.CurrentData.CatalogData.SOI.split("|").length-2].split(";")[1]);
      var craftMenuObj = craftsMenu.find(o => o.DB === object.ID);
      craftMenuObj.Name = object.CurrentData.CatalogData.Vessel;
      craftMenuObj.SOI = object.CurrentData.CatalogData.SOI;
      craftMenuObj.BodyRef = bodyRef;

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
      var missions = rsToObj(dataTables[1]);
      var ribbons = rsToObj(dataTables[2]);
      var history = rsToObj(dataTables[3]);
      object.FutureData = { Stats: stats,
                          History: history,
                          Missions: missions,
                          Ribbons: ribbons };

      // update the menu data so tooltips and re-sorting are accurate
      var crewMenuObj = crewMenu.find(o => o.DB === object.ID);
      crewMenuObj.Assignment = object.CurrentData.Stats.Assignment;
      crewMenuObj.Rank = object.CurrentData.Stats.Rank;
      crewMenuObj.Status = object.CurrentData.Stats.Status;
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

  // test for loading complete
  if (!opsCatalog.find(o => o.isLoading === true)) {
    console.log(opsCatalog);

    // if this user has cookies, badge anything that has been updated since their last visit
    // this is also run when an update is called for a crew or vessel and badges them then as well
    if (checkCookies()) {

      // get the time of the user's last visit
      var lastVisit = parseInt(getCookie("visitTime"));

      // go through all the inactive vessels to see if any have been updated since the last visit
      craftsMenu.forEach(function(item) {
        var refNumUT = currSOI(item);
        if (refNumUT[0] == -1 && lastVisit < refNumUT[1]) badgeMenuItem(item.DB, true, true);
      });

      // now check the active vessels and crew, which can have several fields with varying update times
      var crewUpdated = false;
      opsCatalog.forEach(function(item) {
        var latestUT = 0;
        if (item.Type == "vessel") {
          
          // find the latest UT update for the vessel
          Object.entries(item.CurrentData).forEach(function(items) {
            if (items[1] && items[1].UT && items[1].UT > latestUT) latestUT = items[1].UT;
          });
        } else {

          // same as for vessels but check for arrays and test accordingly
          Object.entries(item.CurrentData).forEach(function(items) {
            if (items[1] && !Array.isArray(items[1])) {
              if (items[1].UT && items[1].UT > latestUT) latestUT = items[1].UT;
            } else if (items[1] && Array.isArray(items[1])) {
              items[1].forEach(function(arrayItem) {
                if (arrayItem.UT && arrayItem.UT > latestUT) latestUT = arrayItem.UT;
              });
            }
          });
        }

        // if this UT is greater than when we last visited, but not greater than the current time, badge it
        if (lastVisit <= latestUT && latestUT <= currUT()) {
          badgeMenuItem(item.ID, true, true);

          // if we badged a crew member or vessel, we should re-sort the menu
          if (item.Type == "crew") crewUpdated = true;
        }
      });

      // update the visit time and menu
      setCookie("visitTime", currUT(), true);
      if (crewUpdated) {
        filterCrewMenu($("input[name=roster]").filter(":checked").val());
        w2ui['menu'].refresh();
      }
      
      // select in the menu what was loaded, if that is not already the current selection
      var menuID;
      if (getParameterByName("body")) { menuID = getParameterByName("body"); }
      if (getParameterByName("vessel")) { menuID = getParameterByName("vessel"); }
      if (getParameterByName("crew")) { menuID = getParameterByName("crew"); }
      if (crewUpdated || !menuSaveSelected || (menuSaveSelected && (menuSaveSelected[0].id != menuID))) {
        if (menuID && !window.location.href.includes("flt")) {
          w2ui['menu'].select(menuID);
          w2ui['menu'].expandParents(menuID);
          w2ui['menu'].scrollIntoView(menuID);
        } else w2ui['menu'].scrollIntoView();
      }
    }
  }
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

  // update the terminator & sun display if a marker exists and the current body has a solar day length (is not the sun)
  // drawn based on the technique from SCANSat
  // https://github.com/S-C-A-N/SCANsat/blob/dev/SCANsat/SCAN_Unity/SCAN_UI_MainMap.cs#L682-L704
  if (mapData && mapData.Name == "Kerbin" && sunMarker && bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).SolarDay) {

    // for now only for Kerbin, with no solar inclination
    var sunLon = -bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).RotIni - (((currUT() / bodyCatalog.find(o => o.Body === strCurrentBody.split("-")[0]).SolarDay) % 1) * 360);
    var sunLat = 0;
    if (sunLon < -180) { sunLon += 360; }

    // update the marker position
    sunMarker.setLatLng([sunLat, sunLon]);

    // calculate the new terminator line
    var sunLatCenter = (0 + 180 + 90) % 180 - 90;
    if (sunLatCenter >= 0) {
      var sunLonCenter = ((sunLon + 90) + 360 + 180) % 360 - 180;
    } else {
      var sunLonCenter = ((sunLon - 90) + 360 + 180) % 360 - 180;
    }
    var gamma = Math.abs(sunLatCenter) < 0.55 ? 100 : Math.tan(Math.radians(90 - Math.abs(sunLatCenter)));
    var terminatorPath = [];
    for (lon=0; lon<=360; lon++) {
      var crossingLat = Math.atan(gamma * Math.sin(Math.radians(lon - 180) - Math.radians(sunLonCenter)));
      terminatorPath.push([Math.degrees(crossingLat), lon-180]);
    }

    // close up the polygon
    terminatorPath.push([-90, 180]);
    terminatorPath.push([-90, -180]);

    // remove the previous layer if there is one before adding the new one
    if (terminator) layerSolar.removeLayer(terminator);
    terminator = L.polygon(terminatorPath, {stroke: false, fillOpacity: 0.5, fillColor: "#000000", interactive: false});
    layerSolar.addLayer(terminator);
  }

  // update any crew mission countdown that is active
  if (pageType == "crew" && !$('#dataField10').is(':empty')) $("#crewCountdown").html(formatTime($("#crewCountdown").attr("data")-currUT(true)));
  
  // update the dynamic orbit figure
  if (isGGBAppletLoaded) { ggbApplet.setValue("UT", currUT()); }
  
  // is there a loaded vessel we need to monitor?
  if (currentVesselData) {

    // does the vessel have ascent data and is it starting in the future?
    if (currentVesselData.ascentData.length && currentVesselData.ascentData[0].UT > currUT()) {

      // check if we need to transition into a realtime ascent state
      checkLaunchTime();
      if (strActiveAscent != strCurrentVessel                                                 // there is no ascent active yet
      && !currentVesselData.CraftData.PastEvent                                               // we are not looking at a past event
      && (L0Time-30 <= currUT()                                                               // we are within 30s of the launch
      && currentVesselData.ascentData[currentVesselData.ascentData.length-1].UT > currUT()-5  // and still within 5s of the end of the telemetry
      )) setupStreamingAscent();
    }

    // is the mission still active?
    // or is some archived telemetry attempting to play?
    if (!isMissionEnded() || (isMissionEnded() && !isAscentPaused)) {
    
      // update the MET or countdown
      $("#metCount").html(formatTime($("#metCount").attr("data")-currUT(true)));
      
      // update vessel surface map information if a vessel is on the map and calculations are not running
      if (vesselMarker && (layerControl && layerControl.options.collapsed)) {

        // is there an ascent going on?
        if (strActiveAscent == strCurrentVessel && !isAscentPaused) {

          // update the mission countdown/timer
          // UT source depends on current event state
          if (currentVesselData.CraftData.PastEvent) var utSrc = currentVesselData.ascentData[currentAscentData.ascentIndex].UT;
          else var utSrc = currUT(true);
          if (L0Time > utSrc) {
            $("#metCaption").html("Launch in:");
            $("#met").html(formatTime(L0Time-utSrc));
          } else {
            $("#metCaption").html("Mission Elapsed Time:");
            $("#met").html(formatTime(utSrc-L0Time));
          }

          // only perform interpolation if we are beyond the start of data and there is still data remaining
          if (currUT() >= currentVesselData.ascentData[0].UT && currentAscentData.ascentIndex < currentVesselData.ascentData.length-1) {
            interpStart = new Date().getTime();

            // set the FPS to default 30 if null
            if (!currentAscentData.FPS) currentAscentData.FPS = 30;
            else if (currentAscentData.FPS && currentAscentData.interpCount) {

              // check if we hit our target FPS and if so, increase it. Cap at 60
              // otherwise decrease. cap at 15
              if (currentAscentData.interpCount >= currentAscentData.FPS && currentAscentData.FPS < 60) currentAscentData.FPS += 2;
              else if (currentAscentData.interpCount < currentAscentData.FPS-2 && currentAscentData.FPS > 15) currentAscentData.FPS -= 2;
            }

            // interpolate between the current and next values using the current FPS
            currentAscentData.velocityDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Velocity-currentVesselData.ascentData[currentAscentData.ascentIndex].Velocity)/currentAscentData.FPS;
            currentAscentData.throttleDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Throttle-currentVesselData.ascentData[currentAscentData.ascentIndex].Throttle)/currentAscentData.FPS;
            currentAscentData.thrustDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Thrust-currentVesselData.ascentData[currentAscentData.ascentIndex].Thrust)/currentAscentData.FPS;
            currentAscentData.gravityDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Gravity-currentVesselData.ascentData[currentAscentData.ascentIndex].Gravity)/currentAscentData.FPS;
            currentAscentData.altitudeDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Altitude-currentVesselData.ascentData[currentAscentData.ascentIndex].Altitude)/currentAscentData.FPS;
            currentAscentData.apDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Apoapsis-currentVesselData.ascentData[currentAscentData.ascentIndex].Apoapsis)/currentAscentData.FPS;
            currentAscentData.qDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Q-currentVesselData.ascentData[currentAscentData.ascentIndex].Q)/currentAscentData.FPS;
            currentAscentData.peDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Periapsis-currentVesselData.ascentData[currentAscentData.ascentIndex].Periapsis)/currentAscentData.FPS;
            currentAscentData.incDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Inclination-currentVesselData.ascentData[currentAscentData.ascentIndex].Inclination)/currentAscentData.FPS;
            currentAscentData.massDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Mass-currentVesselData.ascentData[currentAscentData.ascentIndex].Mass)/currentAscentData.FPS;
            currentAscentData.fuelDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].TotalFuel-currentVesselData.ascentData[currentAscentData.ascentIndex].TotalFuel)/currentAscentData.FPS;
            currentAscentData.dstDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].DstDownrange-currentVesselData.ascentData[currentAscentData.ascentIndex].DstDownrange)/currentAscentData.FPS;
            currentAscentData.aoaDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].AoA-currentVesselData.ascentData[currentAscentData.ascentIndex].AoA)/currentAscentData.FPS;
            currentAscentData.pitchDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Pitch-currentVesselData.ascentData[currentAscentData.ascentIndex].Pitch)/currentAscentData.FPS;
            currentAscentData.rollDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Roll-currentVesselData.ascentData[currentAscentData.ascentIndex].Roll)/currentAscentData.FPS;
            currentAscentData.hdgDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Heading-currentVesselData.ascentData[currentAscentData.ascentIndex].Heading)/currentAscentData.FPS;
            currentAscentData.latDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Lat-currentVesselData.ascentData[currentAscentData.ascentIndex].Lat)/currentAscentData.FPS;
            currentAscentData.lonDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].Lon-currentVesselData.ascentData[currentAscentData.ascentIndex].Lon)/currentAscentData.FPS;

            // account for possible missing data
            if (currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel) currentAscentData.stageDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].StageFuel-currentVesselData.ascentData[currentAscentData.ascentIndex].StageFuel)/currentAscentData.FPS;
            else currentAscentData.stageDelta = null;
            if (currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled) currentAscentData.traveledDelta = (currentVesselData.ascentData[currentAscentData.ascentIndex+1].DstTraveled-currentVesselData.ascentData[currentAscentData.ascentIndex].DstTraveled)/currentAscentData.FPS;
            else currentAscentData.traveledDelta = null;

            // cancel the current interpolation timer & reset counter
            if (ascentInterpTimeout) {
              clearTimeout(ascentInterpTimeout);
              ascentInterpTimeout = null;
              currentAscentData.interpCount = 0;
            }

            // update all the data fields to clamp to the proper data each second
            // it will then continue to call itself to interpolate
            updateAscentData(true);

            // if this is happening now we need to keep sync to real time so any page load hang doesn't screw it up
            // otherwise we can just tick it up with the function call
            if (!currentVesselData.CraftData.PastEvent) currentAscentData.ascentIndex = (currUT(true)+1) - currentVesselData.ascentData[0].UT;
            else currentAscentData.ascentIndex++;
          
          // ascent has terminated
          } else if (currentAscentData.ascentIndex >= currentVesselData.ascentData.length-1) {

            // interpolation function timeout handle nulled after one last update
            updateAscentData(true);
            if (ascentInterpTimeout) {
              clearTimeout(ascentInterpTimeout);
              ascentInterpTimeout = null;
            }

            // one last surface track update
            updateSurfacePlot(currentVesselData.ascentData.length-1);

            // pause ascent hide the forward seek buttons & update control link
            isAscentPaused = true;
            $("#playbackCtrl").html("Reset Playback");
          }

        // orbital plot update, then
        } else if (currentVesselPlot) {
          var now = getPlotIndex();

          // update craft position and popup content
          var cardinal = getLatLngCompass(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng);
          vesselMarker.setLatLng(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng);
          $('#lat').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lat).format('0.0000') + "&deg;" + cardinal.Lat);
          $('#lng').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Latlng.lng).format('0.0000') + "&deg;" + cardinal.Lng);
          $('#alt').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Alt).format('0,0.000') + " km");
          $('#vel').html(numeral(currentVesselPlot.Data[now.ObtNum].Orbit[now.Index].Vel).format('0,0.000') + " km/s");

          // update Soi markers if they exist
          if (currentVesselPlot.Events.SoiEntry.Marker) {
            $('#soiEntryTime').html(formatTime(currentVesselPlot.Events.SoiEntry.UT - currUT(true)));
          } else if (currentVesselPlot.Events.SoiExit.Marker) {
            $('#soiExitTime').html(formatTime(currentVesselPlot.Events.SoiExit.UT - currUT(true)));
          }
          
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
  }
  
  // update any tooltips
  Tipped.refresh(".tip-update");  
  
  // ensure timer accuracy, even catch up if browser slows tab in background
  // http://www.sitepoint.com/creating-accurate-timers-in-javascript/
  var diff = (new Date().getTime() - clock.getTime()) - tickDelta;
  tickDelta += 1000;
  setTimeout(tick, 1000 - diff);
})();