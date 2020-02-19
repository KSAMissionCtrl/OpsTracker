// refactor complete (except for calls to surface/vessel operations)

// current game time is the difference between current real time minus number of ms since midnight on 9/13/16
// account for fact that game started during DST and also convert to seconds
ops.UT = ((ops.clock.getTime() - foundingMoment) / 1000);
if (!ops.clock.isDstObserved()) { ops.UT -= 3600; ops.UTC = 5; }
if (getParameterByName("setut") && getCookie("missionctrl")) ops.UT = parseInt(getParameterByName("setut"));
if (window.location.href.includes("&live") && getParameterByName("ut") && parseInt(getParameterByName("ut")) < ops.UT) ops.UT = parseInt(getParameterByName("ut"));

// handle history state changes when user invokes forward/back button
window.onpopstate = function(event) { swapContent(event.state.type, event.state.id, event.state.UT); }

// animate the size of the main content box
function raiseContent(mapInvalTime = 1500) {
  if ($("#contentBox").css("height") != "885px") {
    isContentMoving = true;
    $("#contentBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      $("#contentBox").css("height", "885px");
      $("#map").css("height", "885px");
      if (ops.surface.map) setTimeout(function() { ops.surface.map.invalidateSize(); }, mapInvalTime);
      isContentMoving = false;
    }, 400);
  }
}
function lowerContent(mapInvalTime = 1900) {
  if ($("#contentBox").css("height") != "480px") {
    isContentMoving = true;
    $("#contentBox").css("height", "480px");
    $("#map").css("height", "480px");
    setTimeout(function() { 
      $("#contentBox").css("transform", "translateY(405px)"); 
      setTimeout(function() { isContentMoving = false; }, 400);
      if (ops.surface.map) setTimeout(function() { ops.surface.map.invalidateSize(); }, mapInvalTime);
    }, 400);
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

  // setup the clock
  $("#clock").html("<strong>Current Time @ KSC (UTC -" + ops.UTC + ")</strong><br><span id='ksctime' style='font-size: 16px'></span>");

  // select the default sort options
  $('input:radio[name=roster]').filter('[id=name]').prop('checked', true);
  $('input:radio[name=inactive]').filter('[id=type]').prop('checked', true);

  // set up for AJAX requests
  // https://www.w3schools.com/xml/ajax_intro.asp
  // don't allow AJAX to cache data, which mainly screws up requests for updated vessel times for notifications
  $.ajaxSetup({ cache: false });
  
  // even if we don't need it right away, likely to need it eventually so just set it up now with the rest of the page
  initializeMap();

  // load data
  loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  // menu data load comes after event data load completes
  loadDB("loadBodyData.asp", loadBodyAJAX);
  loadDB("loadPartsData.asp", loadPartsAJAX);
  
  // JQuery UI theme the buttons used to page through mission history
  // diabled by default, will enable as needed when vessel loads
  // NOTE: make sure this is always before dialog setup so the X close button does not get disabled
  $("button").button({disabled: true});

  // setup the planet data dialog box
  // when it is closed, it will return to the top-left of the figure
  $("#figureDialog").dialog({ autoOpen: false, 
                              closeOnEscape: true, 
                              resizable: false, 
                              width: "auto",
                              hide: { effect: "fade", duration: 300 }, 
                              show: { effect: "fade", duration: 300 },
                              position: { my: "left top", at: "left top", of: "#contentBox" },
                              close: function() { 
                                $(this).dialog("option", "position", { my: "left top", at: "left top", of: "#contentBox" }); 
                              }});
                      
  // setup the info dialog box that will contain vessel status notes
  $("#infoDialog").dialog({ autoOpen: false, 
                            closeOnEscape: true, 
                            resizable: false, 
                            draggable: false, 
                            title: "Additional Information",
                            hide: { effect: "fade", duration: 300 }, 
                            show: { effect: "fade", duration: 300 },
                            position: { my: "center", at: "center", of: "#infoBox" },
                            open: function() { 
                              if (ops.pageType == "vessel") $(this).dialog("option", { width: 643, height: 400 });
                              else if (ops.pageType == "crew") $(this).dialog("option", { width: 490, height: 600 });
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
                          open: function() { 

                            // don't allow the user to manipulate the map size while dialog is open
                            if (mapResizeButton) mapResizeButton.disable();
                            $(".leaflet-control-zoom-fullscreen.fullscreen-icon").hide();
                          },
                          close: function() { 
                            if (mapResizeButton) mapResizeButton.enable();
                            $(".leaflet-control-zoom-fullscreen.fullscreen-icon").show();
                          }
                          });

  // setup the message dialog box that will notify the user about any general website stuff
  $("#siteDialog").dialog({ autoOpen: false, 
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
  
  // uncheck all the GGB filter boxes
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
    if ($(this).attr("name") == "nodes") toggleNodes($(this).is(":checked"));
    if ($(this).attr("name") == "labels") toggleLabels($(this).is(":checked"));
    if ($(this).attr("name") == "orbits") toggleOrbits($(this).is(":checked"));
    if ($(this).attr("name") == "ref") toggleRefLine($(this).is(":checked"));
    if ($(this).attr("name") == "soi") toggleSOI($(this).is(":checked"));
    if ($(this).attr("id").includes("menu")) filterVesselMenu($(this).attr("name"), $(this).is(":checked"));
    if ($(this).attr("id").includes("filter")) filterVesselOrbits($(this).attr("name"), $(this).is(":checked"));
  });

  // load page content
  var paramUT = null;
  if (getParameterByName("ut")) paramUT = parseInt(getParameterByName("ut"));
  if (getParameterByName("vessel")) swapContent("vessel", getParameterByName("vessel"), paramUT);
  else if (getParameterByName("body")) swapContent("body", getParameterByName("body"), paramUT);
  else if (getParameterByName("crew")) { 
    if (getParameterByName("crew") == "crewFull") swapContent("crewFull", getParameterByName("crew"));
    else swapContent("crew", getParameterByName("crew"), paramUT);
  }
  else swapContent("body", "Kerbol-System");

  // check if this is a first-time visitor and act accordingly
  if (checkCookies()) {
    if (!getCookie("visitTime")) {
      setCookie("visitTime", currUT(), true);
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
  if (!ut) ut = currUT();

  // load flt data without having to pass a dummy value for ut
  if (!flt && isNaN(ut)) flt = ut;

  // ignore any attempts to change content layout if request is to load what is already loaded (if something is already loaded)
  if (ops.currentVessel && (newPageType == "vessel" && ops.pageType == "vessel" && ops.currentVessel.Catalog.DB == id)) return;
  if (ops.currentCrew && (newPageType == "crew" && ops.pageType == "crew" && ops.currentCrew.Background.Kerbal == id)) return;
  if (ops.bodyCatalog && (newPageType == "body" && ops.pageType == "body" && ops.bodyCatalog.find(o => o.selected === true).Body == id.replace("-System", ""))) {

    // in the case of a body already set, we can maybe hide the map
    hideMap();
    return;
  }

  // make sure any map dialog that was commanded to show does not
  if (mapDialogDelay) {
    clearTimeout(mapDialogDelay);
    mapDialogDelay = null;
  }

  // initial page load
  if (!ops.pageType) {
    ops.pageType = newPageType;
    if (newPageType == "body") {
      $("#contentBox").css('top', '40px');
      $("#contentBox").css('height', '885px');
      $("#contentBox").fadeIn();
      loadBody(id);
    }
    if (newPageType == "vessel") {

      // this doesn't need as much setup as crew since site layout is already set for this type of view
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
  if (ops.pageType == newPageType) {
    if (newPageType == "body") { loadBody(id, flt); }
    if (newPageType == "vessel") { loadVessel(id, ut); }
    if (newPageType == "crew") { loadCrew(id); }
    return;
  }

  // hide the current content
  if (ops.pageType == "body") {
    hideMap();
    $("#figureOptions").fadeOut();
    $("#vesselOrbitTypes").fadeOut();
    $("#figure").fadeOut();
    $("#figureDialog").dialog("close");
    removeMapCloseButton();
  } else if (ops.pageType == "vessel") {
  
    // some elements need to be hidden only if we are not switching to a crew page
    if (newPageType != "crew") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
      $("#contentBox").spin(false);
      $("#infoBox").spin(false);
      $("#dataField0").spin(false);
    }
    $("#infoDialog").dialog("close");
    $("#mapDialog").dialog("close");
    hideMap();
    $("#content").fadeOut();
    removeVesselMapButtons();
    clearSurfacePlots();
    
    // if a vessel orbital calculation is in progress, pause it
    if (!ops.surface.layerControl.options.collapsed) {
      if (surfaceTracksDataLoad.obtTrackDataLoad) ops.surface.layerControl.removeLayer(surfaceTracksDataLoad.obtTrackDataLoad);
      surfaceTracksDataLoad.obtTrackDataLoad = null;
      strPausedVesselCalculation = ops.currentVessel.Catalog.DB;
      checkDataLoad()
    }
  } else if (ops.pageType == "crew") {

    // some elements need to be hidden only if we are not switching to a vessel page
    if (newPageType != "vessel") {
      $("#infoBox").fadeOut();
      $("#dataBox").fadeOut();
    }
    $("#crewFooter").fadeOut();
    $("#footer").fadeIn();
    $("#infoDialog").dialog("close");
  } else if (ops.pageType == "crewFull") {
    $("#fullRoster").fadeOut();
  }
  
  // show/load the new content
  ops.pageType = newPageType;
  if (ops.pageType == "body") {

    // return the twitter feed to the main feed if alternate feed is loaded from vessel or crew
    if ($("#twitterTimelineSelection").html().includes("|")) swapTwitterSource();
    raiseContent();
    setTimeout(function() { 
      if (!window.location.href.includes("&map")) {
        $("#figureOptions").fadeIn();
        if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) $("#vesselOrbitTypes").fadeIn();
        $("#figure").fadeIn();
      }
      $("#contentBox").fadeIn();
      if (layerPins) {
        layerPins.addTo(ops.surface.map);
        ops.surface.layerControl.addOverlay(layerPins, "<img src='defPin.png' style='width: 10px; height: 14px; vertical-align: 1px;'> Custom Pins", "Ground Markers");
      }
      loadBody(id, flt); 
    }, 600);
  } else if (ops.pageType == "vessel") {
    lowerContent();
    $("#infoBox").fadeIn();
    $("#infoBox").css("height", "400px");
    $("#infoBox").css("width", "650px");
    $("#dataBox").fadeIn();
    $("#dataBox").css("transform", "translateX(0px)");
    $("#dataBox").css("width", "295px");
    $("#contentBox").fadeIn();
    loadVessel(id, ut);
  } else if (ops.pageType == "crew") {
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
  } else if (ops.pageType == "crewFull") {
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
  menuSaveSelected = w2ui['menu'].find({selected: true});
  if (menuSaveSelected.length == 0) menuSaveSelected = null;
  if (updateEvent.type.includes("menu")) menuUpdate(updateEvent.type.split(";")[1], updateEvent.id);
  else if (updateEvent.type == "event") loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX);
  else if (updateEvent.type == "object") {
    var obj = ops.updateData.find(o => o.id === updateEvent.id);
    if (!obj) console.log("unknown object" + updateEvent.id);
    else {
      if (obj.type == "crew") updateCrewData(obj);
      else if (obj.type == "vessel") updateVesselData(obj);
      else console.log("unknown update type" + obj.type);
    }
  }
}

// recursively check through updates so we get any that occur at the same time
function checkPageUpdate() {
  if (!isMenuDataLoaded) return;
  if (ops.updatesList.length && currUT() >= ops.updatesList[0].UT) {
    updatePage(ops.updatesList.shift());
    ops.updatesListSize = ops.updatesList.length;
    return checkPageUpdate();
  } else return;
}

function swapTwitterSource(swap, source) {
  if (swap && source) {
    $("#twitterTimelineSelection").html("Source: <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "')\">KSA Main Feed</span> | <b>" + swap + "</b>");
    ops.twitterSource = source;
  } else if (swap && !source) {
    if (ops.twitterSource.includes(";")) src = ops.twitterSource.split(";")[1];
    else src = ops.twitterSource;
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b> | <span class='fauxLink' onclick=\"swapTwitterSource('" + swap + "', '" + src + "')\">" + swap + "</span>");
  } else if (!swap && !source) {
    $("#twitterTimelineSelection").html("Source: <b>KSA Main Feed</b>");
  }
  if (!source) source = "https://twitter.com/KSA_MissionCtrl";
  $("#twitterTimeline").html("<a class='twitter-timeline' data-chrome='nofooter noheader' data-height='500' href='"+ source + "'>Loading Tweets...</a> <script async src='https://platform.twitter.com/widgets.js' charset='utf-8'>");
}

// loads future data for all active vessels and crew so they can be updated without fetch delay
function loadOpsDataAJAX(xhttp) {

  if (xhttp) {
  
    // header info uses "Typ3" as a unique identifier to parse out the craft id from the rest of the data
    // since I ran out of special character to use
    var object = ops.updateData.find(o => o.id === xhttp.responseText.split("Typ3")[0]);
    
    // decide what type of object we are parsing data for
    if (xhttp.responseText.includes("Typ3vessel")) {
      
      // separate the main data segments
      var data = xhttp.responseText.split("Typ3vessel")[1].split("*");

      // the various tables of the current record 
      var dataTables = data[2].split("^");
      var craft = rsToObj(dataTables[0]);
      var resources = rsToObj(dataTables[1]);
      var crew = rsToObj(dataTables[2]);
      var comms = rsToObj(dataTables[3]);
      var obt = rsToObj(dataTables[4]);
      var ports = rsToObj(dataTables[5]);

      // temp workaround
      // can reqrite ops load to send over these values in case of null records
      if (!crew) crew = {UT: 0};
      if (!resources) resources = {UT: 0};
      if (!comms) comms = {UT: 0};
      if (!obt) obt = {UT: 0};
      if (!ports) ports = {UT: 0};

      // only save the UT field so we can determine if any menu badging is required
      object.CurrentData = { CraftData: {UT: craft.UT},
                             Resources: {UT: resources.UT},
                             Manifest: {UT: crew.UT},
                             Comms: {UT: comms.UT},
                             Orbit: {UT: obt.UT},
                             Ports: {UT: ports.UT} };

      // any future events
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
      
    } else if (xhttp.responseText.includes("Typ3crew")) {
      var data = xhttp.responseText.split("Typ3crew")[1].split("*");

      // the various tables of the current record
      var dataTables = data[1].split("^");
      var stats = rsToObj(dataTables[0]);
      var history = rsToObj(dataTables[3]);
      
      // parse the missions and the ribbons
      var missions = [];
      var ribbons = [];
      if (dataTables[1] != "null") dataTables[1].split("|").forEach(function(item) { missions.push(rsToObj(item)); });
      if (dataTables[2] != "null") dataTables[2].split("|").forEach(function(item) { ribbons.push(rsToObj(item)); });
      missions.reverse();

      // only save the UT fields so we can determine if any menu badging is needed
      object.CurrentData = {  Stats: {UT: stats.UT},
                              History: {UT: history.UT},
                              Missions: missions,
                              Ribbons: ribbons };
      
      // any future events
      var dataTables = data[2].split("^");
      var stats = rsToObj(dataTables[0]);
      var missions = rsToObj(dataTables[1]);
      var ribbons = rsToObj(dataTables[2]);
      var history = rsToObj(dataTables[3]);
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
    if (updateUT) ops.updatesList.push({ type: "object", id: object.id, UT: updateUT });
  }
  
  // is there anything that has not been loaded yet?
  for (i=0; i<ops.updateData.length; i++) {
    if (!ops.updateData[i].isLoading && !ops.updateData[i].CurrentData) {
      ops.updateData[i].isLoading = true;
      loadDB("loadOpsData.asp?db=" + ops.updateData[i].id + "&UT=" + currUT() + "&type=" + ops.updateData[i].type + "&pastUT=NaN", loadOpsDataAJAX);
    }
  }

  // test for loading complete
  if (!ops.updateData.find(o => o.isLoading === true)) {

    // if this user has cookies, badge anything that has been updated since their last visit
    // this is also run when an update is called for a crew or vessel and badges them then as well
    if (checkCookies()) {

      // get the time of the user's last visit
      var lastVisit = parseInt(getCookie("visitTime"));

      // go through all the inactive vessels to see if any have been updated since the last visit
      ops.craftsMenu.forEach(function(item) {
        var refNumUT = currSOI(item);
        if (refNumUT[0] == -1 && lastVisit < refNumUT[1]) badgeMenuItem(item.db, true, true);
      });

      // now check the active vessels and crew, which can have several fields with varying update times
      ops.updateData.forEach(function(item) {
        var latestUT = 0;
        if (item.type == "vessel") {
          
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
        if (lastVisit <= latestUT && latestUT <= currUT()) badgeMenuItem(item.id, true, true);
      });

      // update the visit time
      setCookie("visitTime", currUT(), true);
      
      // select in the menu what was loaded, if that is not already the current selection
      var menuID;
      if (getParameterByName("body")) menuID = getParameterByName("body");
      if (getParameterByName("vessel")) menuID = getParameterByName("vessel");
      if (getParameterByName("crew")) menuID = getParameterByName("crew");
      if (!menuSaveSelected || (menuSaveSelected && (menuSaveSelected[0].id != menuID))) {
        if (menuID && !window.location.href.includes("flt")) selectMenuItem(menuID);
        else w2ui['menu'].scrollIntoView();
      }
    }
  }
}

// loop and update the page every second
// no longer using setInterval, as suggested via
// http://stackoverflow.com/questions/6685396/execute-the-first-time-the-setinterval-without-delay
(function tick() {

  // sort the update times if new ones have been added since our last check, then look for updates
  if (ops.updatesList.length > ops.updatesListSize) {
    ops.updatesListSize = ops.updatesList.length;
    ops.updatesList.sort(function(a,b) { return (a.UT > b.UT) ? 1 : ((b.UT > a.UT) ? -1 : 0); });
  }
  checkPageUpdate();

  // update the clocks
  $('#ksctime').html(UTtoDateTime(currUT(), true));
  if (!isNaN(launchCountdown) && launchCountdown - currUT() > 0) $('#launchCountdown').html(formatTime(launchCountdown - currUT(), false));
  else if (!isNaN(launchCountdown) && launchCountdown - currUT() <= 0) { 
    
    // cleanup the event data and prep for checking for new events
    $('#launchCountdown').html("LIFTOFF!!"); 
    launchCountdown = "null";
    setTimeout(function() { loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX); }, 5000);
  }
  if (!isNaN(maneuverCountdown) && maneuverCountdown - currUT() > 0) $('#maneuverCountdown').html(formatTime(maneuverCountdown - currUT(), false));
  else if (!isNaN(maneuverCountdown) && maneuverCountdown - currUT() <= 0) { 
    $('#maneuverCountdown').html("EXECUTE!!"); 
    maneuverCountdown = "null";
    setTimeout(function() { loadDB("loadEventData.asp?UT=" + currUT(), loadEventsAJAX); }, 5000);
  }

  // update the terminator & sun display if a marker exists and the current body has a solar day length (is not the sun)
  // drawn based on the technique from SCANSat
  // https://github.com/S-C-A-N/SCANsat/blob/dev/SCANsat/SCAN_Unity/SCAN_UI_MainMap.cs#L682-L704
  if (ops.surface.Data && ops.surface.Data.Name == "Kerbin" && sunMarker && ops.bodyCatalog.find(o => o.selected === true).SolarDay) {

    // for now only for Kerbin, with no solar inclination
    var sunLon = -ops.bodyCatalog.find(o => o.selected === true).RotIni - (((currUT() / ops.bodyCatalog.find(o => o.selected === true).SolarDay) % 1) * 360);
    var sunLat = 0;
    if (sunLon < -180) sunLon += 360;

    // update the marker position
    sunMarker.setLatLng([sunLat, sunLon]);

    // calculate the new terminator line
    var sunLatCenter = (0 + 180 + 90) % 180 - 90;
    if (sunLatCenter >= 0) var sunLonCenter = ((sunLon + 90) + 360 + 180) % 360 - 180;
    else var sunLonCenter = ((sunLon - 90) + 360 + 180) % 360 - 180;
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
  if (ops.pageType == "crew" && !$('#dataField10').is(':empty')) $("#crewCountdown").html(formatTime($("#crewCountdown").attr("data")-currUT()));
  
  // update the dynamic orbit figure
  if (isGGBAppletLoaded) ggbApplet.setValue("UT", currUT());
  
  // is there a loaded vessel we need to monitor?
  if (ops.currentVessel) {

    // does the vessel have ascent data and is it starting in the future?
    if (ops.currentVessel.AscentData.length && ops.currentVessel.AscentData[0] > currUT()) {

      // check if we need to transition into a realtime ascent state
      if (!ops.ascentData.active                                                            // there is no ascent active yet
      && !ops.currentVessel.CraftData.pastEvent                                             // we are not looking at a past event
      && (checkLaunchTime() && checkLaunchTime()-randomIntFromInterval(20,26) <= currUT()   // we are within 20-26s of the launch
      && ops.currentVessel.AscentData[ops.currentVessel.AscentData.length-1] > currUT()-5   // and still within 5s of the end of the telemetry
      )) {
        loadAscentData();
        ops.ascentData.active = true;
      }
    }

    // is the mission still active?
    // or is some archived telemetry attempting to play?
    if (!isMissionEnded() || (isMissionEnded() && !ops.ascentData.isPaused)) {
    
      // update the MET or countdown
      $("#metCount").html(formatTime($("#metCount").attr("data")-currUT()));
      
      // update vessel surface map information if a vessel is on the map and calculations are not running
      if (vesselMarker && (ops.surface.layerControl && ops.surface.layerControl.options.collapsed)) {

        // is there an ascent going on?
        if (ops.ascentData.active && !ops.ascentData.isPaused) {

          // update the mission countdown/timer
          // UT source depends on current event state
          if (ops.currentVessel.CraftData.pastEvent) var utSrc = ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].UT;
          else var utSrc = currUT();
          if (checkLaunchTime() > utSrc) {
            $("#metCaption").html("Launch in:");
            $("#met").html(formatTime(checkLaunchTime()-utSrc));
          } else {
            $("#metCaption").html("Mission Elapsed Time:");
            $("#met").html(formatTime(utSrc-checkLaunchTime()));
          }

          // only perform interpolation if we are beyond the start of data and there is still data remaining
          if (currUT() >= ops.ascentData.telemetry[0].UT && ops.activeAscentFrame.ascentIndex < ops.ascentData.telemetry.length-1) {
            interpStart = new Date().getTime();

            // set the FPS to default 30 if null
            if (!ops.activeAscentFrame.FPS) ops.activeAscentFrame.FPS = 30;
            else if (ops.activeAscentFrame.FPS && ops.activeAscentFrame.interpCount) {

              // check if we hit our target FPS and if so, increase it. Cap at 60
              // otherwise decrease. cap at 15
              if (ops.activeAscentFrame.interpCount >= ops.activeAscentFrame.FPS && ops.activeAscentFrame.FPS < 60) ops.activeAscentFrame.FPS += 2;
              else if (ops.activeAscentFrame.interpCount < ops.activeAscentFrame.FPS-2 && ops.activeAscentFrame.FPS > 15) ops.activeAscentFrame.FPS -= 2;
            }

            // interpolate between the current and next values using the current FPS
            ops.activeAscentFrame.velocityDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Velocity-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Velocity)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.throttleDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Throttle-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Throttle)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.thrustDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Thrust-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Thrust)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.gravityDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Gravity-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Gravity)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.altitudeDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Altitude-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Altitude)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.apDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Apoapsis-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Apoapsis)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.qDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Q-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Q)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.peDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Periapsis-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Periapsis)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.incDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Inclination-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Inclination)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.massDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Mass-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Mass)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.fuelDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].TotalFuel-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].TotalFuel)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.dstDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].DstDownrange-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstDownrange)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.aoaDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].AoA-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].AoA)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.pitchDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Pitch-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Pitch)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.rollDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Roll-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Roll)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.hdgDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Heading-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Heading)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.latDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Lat-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lat)/ops.activeAscentFrame.FPS;
            ops.activeAscentFrame.lonDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].Lon-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].Lon)/ops.activeAscentFrame.FPS;

            // account for possible missing data
            if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel) ops.activeAscentFrame.stageDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].StageFuel-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].StageFuel)/ops.activeAscentFrame.FPS;
            else ops.activeAscentFrame.stageDelta = null;
            if (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled) ops.activeAscentFrame.traveledDelta = (ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex+1].DstTraveled-ops.ascentData.telemetry[ops.activeAscentFrame.ascentIndex].DstTraveled)/ops.activeAscentFrame.FPS;
            else ops.activeAscentFrame.traveledDelta = null;

            // cancel the current interpolation timer & reset counter
            if (ascentInterpTimeout) {
              clearTimeout(ascentInterpTimeout);
              ascentInterpTimeout = null;
              ops.activeAscentFrame.interpCount = 0;
            }

            // update all the data fields to clamp to the proper data each second
            // it will then continue to call itself to interpolate
            updateAscentData(true);

            // if this is happening now we need to keep sync to real time so any page load hang doesn't screw it up
            // otherwise we can just tick it up with the function call
            if (!ops.currentVessel.CraftData.pastEvent) ops.activeAscentFrame.ascentIndex = (currUT()+1) - ops.ascentData.telemetry[0].UT;
            else ops.activeAscentFrame.ascentIndex++;
          
          // ascent has terminated
          } else if (ops.activeAscentFrame.ascentIndex >= ops.ascentData.telemetry.length-1) {

            // interpolation function timeout handle nulled after one last update
            updateAscentData(true);
            if (ascentInterpTimeout) {
              clearTimeout(ascentInterpTimeout);
              ascentInterpTimeout = null;
            }

            // one last surface track update
            updateSurfacePlot(ops.ascentData.telemetry.length-1);

            // pause ascent hide the forward seek buttons & update control link
            ops.ascentData.isPaused = true;
            $("#playbackCtrl").html("Reset Playback");

            // handle more stuff, only for live events
            ascentEnd();
          }

        // orbital plot update, then
        } else if (ops.currentVesselPlot && ops.currentVesselPlot.obtData.length) {
          var now = getPlotIndex();

          // update craft position and popup content
          var cardinal = getLatLngCompass(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng);
          vesselMarker.setLatLng(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng);
          $('#lat').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lat).format('0.0000') + "&deg;" + cardinal.lat);
          $('#lng').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].latlng.lng).format('0.0000') + "&deg;" + cardinal.lng);
          $('#alt').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].alt).format('0,0.000') + " km");
          $('#vel').html(numeral(ops.currentVesselPlot.obtData[now.obtNum].orbit[now.index].vel).format('0,0.000') + " km/s");

          // update Soi markers if they exist
          if (ops.currentVesselPlot.events.soiEntry.marker) {
            $('#soiEntryTime').html(formatTime(ops.currentVesselPlot.events.soiEntry.UT - currUT()));

            // if we've hit or exceeded the entry time, remove the vessel marker and update the entry marker popup
            if (ops.currentVesselPlot.events.soiEntry.UT-1 <= currUT()) {
              ops.currentVesselPlot.events.soiEntry.marker.closePopup();
              ops.surface.map.removeLayer(vesselMarker);
              vesselMarker = null;
              ops.currentVesselPlot.events.soiEntry.marker.bindPopup("<center>" + UTtoDateTime(currUT()).split("@")[0] + "<br>Telemetry data invalid due to aerobrake<br>Please stand by for update</center>", { autoClose: false });
              ops.currentVesselPlot.events.soiEntry.marker.openPopup();
            }
          }
          else if (ops.currentVesselPlot.events.soiExit.marker) $('#soiExitTime').html(formatTime(ops.currentVesselPlot.events.soiExit.UT - currUT()));

          // update the Ap/Pe markers if they exist, and check for passing
          if (ops.currentVesselPlot.events.ap.marker) {
            $('#apTime').html(formatTime(ops.currentVesselPlot.events.ap.UT - currUT()));
            if (ops.currentVesselPlot.events.ap.UT <= currUT()) {

              // just add on the time of an orbit to get the time for the next Ap
              ops.currentVesselPlot.events.ap.UT += ops.currentVessel.Orbit.OrbitalPeriod;
              
              // remove the marker from the current layer and check if there is an orbit after this that is long enough to add the marker to
              ops.currentVesselPlot.obtData[now.obtNum].layer.removeLayer(ops.currentVesselPlot.events.ap.marker);
              if (now.obtNum + 1 < ops.currentVesselPlot.obtData.length && 
                  currUT() + ops.currentVesselPlot.obtData[now.obtNum+1].orbit.length > ops.currentVesselPlot.events.ap.UT) {
              
                // subtract the new UT of the Ap from the starting UT of the next orbit to get the proper index
                ops.currentVesselPlot.events.ap.marker.setLatLng(ops.currentVesselPlot.obtData[now.obtNum+1].orbit[Math.floor(ops.currentVesselPlot.events.ap.UT-ops.currentVesselPlot.obtData[now.obtNum+1].StartUT)].Latlng);
                var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.ap.UT);
                $('#apDate').html(strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1]);
                ops.currentVesselPlot.obtData[now.obtNum+1].layer.addLayer(ops.currentVesselPlot.events.ap.marker);
                
              // noplace else to go, so remove the marker from the map completely
              } else { 
                ops.surface.map.removeLayer(ops.currentVesselPlot.events.ap.marker); 
                ops.currentVesselPlot.events.ap.marker = null;
              }
            }
          }
          if (ops.currentVesselPlot.events.pe.marker) {
            $('#peTime').html(formatTime(ops.currentVesselPlot.events.pe.UT - currUT(true)));
            if (ops.currentVesselPlot.events.pe.UT <= currUT()) {
              ops.currentVesselPlot.events.pe.UT += ops.currentVessel.Orbit.OrbitalPeriod;
              ops.currentVesselPlot.obtData[now.obtNum].layer.removeLayer(ops.currentVesselPlot.events.pe.marker);
              if (now.obtNum + 1 < ops.currentVesselPlot.obtData.length && 
                  currUT() + ops.currentVesselPlot.obtData[now.obtNum+1].orbit.length > ops.currentVesselPlot.events.pe.UT) {
                ops.currentVesselPlot.events.pe.marker.setLatLng(ops.currentVesselPlot.obtData[now.obtNum+1].orbit[Math.floor(ops.currentVesselPlot.events.pe.UT-ops.currentVesselPlot.obtData[now.obtNum+1].StartUT)].Latlng);
                var strTimeDate = UTtoDateTime(ops.currentVesselPlot.events.pe.UT);
                $('#peDate').html(strTimeDate.split("@")[0] + '<br>' + strTimeDate.split("@")[1]);
                ops.currentVesselPlot.obtData[now.obtNum+1].layer.addLayer(ops.currentVesselPlot.events.pe.marker);
              } else { 
                ops.surface.map.removeLayer(ops.currentVesselPlot.events.pe.marker); 
                ops.currentVesselPlot.events.pe.marker = null;
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
  var diff = (new Date().getTime() - ops.clock.getTime()) - ops.tickDelta;
  ops.tickDelta += 1000;
  setTimeout(tick, 1000 - diff);
})();