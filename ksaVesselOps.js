// available content height: 480px (initially) / 885px (Max)
function loadVessel(vessel) {
  
  // show the actual name of the vessel - but we need to wait for the menu to load first so call ourselves again in a split second
  if (!isMenuDataLoaded) {
    setTimeout(function() {
      loadVessel(vessel);
    }, 250)
  } else {
    var strVesselName = w2ui['menu'].get(vessel).text;
    $("#contentHeader").html(strVesselName);
    document.title = "KSA Operations Tracker" + " - " + strVesselName;
    
    // modify the history so people can page back/forward
    // if this is the first page to load, replace the current history
    // don't create a new entry if this is the same page being reloaded
    if (!history.state) {
      history.replaceState({Type: "vessel", ID: vessel}, document.title, "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel);
    } else if (history.state.ID != vessel) {
      history.pushState({Type: "vessel", ID: vessel}, document.title, "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + vessel);
    }

    // tag loading
    //$("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (strVesselName.width('bold 32px arial')/2)) + 10) +'px' });
  
    // if this vessel is not in the current catalog, we need to load a new system
    // we can't call this function until the menu is loaded
    if (!orbitCatalog.length || !orbitCatalog.find(o => o.ID === vessel)) { loadBody(getParentSystem(vessel)); }
  }

  // no further loading needed if this is already the current vessel
  if (strCurrentVessel == vessel) { return; }
  strCurrentVessel = vessel;

  // ensure the info box and data box are clear and hide/empty the contents
  $("#infoBox").empty();
  for (fieldNum = 0; fieldNum < 17; fieldNum++) { 
    if ($("#dataField" + fieldNum).is(":visible")) { 
      $("#dataField" + fieldNum).empty(); 
      $("#dataField" + fieldNum).fadeOut(); 
    }
  }
  $("#figure").fadeOut();
  $("#map").fadeOut();
  $("#genericContent").empty();
  
  // loading spinners - activate!
  $("#infoBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
  $("#dataField0").html("&nbsp;");
  $("#dataField0").fadeIn();
  $("#dataField0").spin({ scale: 0.35, position: 'relative', top: '8px', left: '50%' });
  
  // put out the call for the vessel data
  loadDB("loadVesselData.asp?craft=" + strCurrentVessel + "&UT=" + currUT(), loadVesselDataAJAX);
}

// sends out the AJAX call for data to add any vessels to a GeoGebra figure/Leaflet library once it has loaded
// calls itself repeatedly in the event that the menu is not yet loaded
function loadVesselOrbits() {
  if (isMenuDataLoaded) {
    var strVessels = '';
    var menuNodes = w2ui['menu'].get(strCurrentSystem).nodes;
    if (menuNodes.length) {
      console.log(menuNodes);
      strVessels = extractVesselIDs(menuNodes);
      if (strVessels.length) { 
        loadDB("loadVesselOrbitData.asp?crafts=" + strVessels.substring(0, strVessels.length-1) + "&UT=" + currUT(), loadVesselOrbitsAJAX);
        if (pageType == "body") {
          $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
          $("#vesselLoaderMsg").fadeIn();
        }
        return true;
      } else { return false; }
    }
  } else { setTimeout(loadVesselOrbits, 250); }
}

// parses data that allows the GeoGebra figure and Leaflet map to display orbital/maneuver data for vessels in the current system view
function loadVesselOrbitsAJAX(xhttp) {

  // separate the vessels
  var vessels = xhttp.responseText.split("*");
  
  // parse the data blocks for each vessel
  vessels.forEach(function(item, index) {
  
    // parse the fields and create the table objects
    var dataBlocks = item.split("|");
    var strVesselDB = dataBlocks[0];
    var orbit = rsToObj(dataBlocks[1]);
    var flightplan = rsToObj(dataBlocks[2]);
    orbitCatalog.push({ ID: strVesselDB, Orbit: orbit, Flightplan: flightplan });
    if (orbitCatalog[orbitCatalog.length-1].Orbit) { addGGBOrbit(strVesselDB, orbit); }
    
    // check for future updates
    var updates = dataBlocks[3].split("~");
    if (updates[0] != "null") { updatesList.push({ Type: "vessel;orbit", ID: strVesselDB, UT: updates[0] }); }
    if (updates[1] != "null") { updatesList.push({ Type: "vessel;flightplan", ID: strVesselDB, UT: updates[0] }); }
  });
  console.log(orbitCatalog);
  isOrbitDataLoaded = true;
  isGGBAppletLoaded = true;
  isGGBAppletLoading = false;
  if (pageType == "body") {
    $("#vesselLoaderMsg").spin(false);
    $("#vesselLoaderMsg").fadeOut();
    $("#vesselOrbitTypes").fadeIn();
  }
  
  // make sure a quick figure switch doesn't declutter things too fast
  timeoutHandle = setTimeout(declutterGGB, 2500);
}

// parses data that shows up for the vessel currently selected in the menu
function loadVesselDataAJAX(xhttp) {
  
  // separate the data tables and update data
  var dataTables = xhttp.responseText.split("*")[0].split("^");
  var updates = xhttp.responseText.split("*")[1].split("~");
  
  // parse the fields and create the table objects
  var data = rsToObj(dataTables[0]);
  var resources = rsToObj(dataTables[1]);
  var crew = rsToObj(dataTables[2]);
  var comms = rsToObj(dataTables[3]);
  var ports = rsToObj(dataTables[4]);
  
  // check for future updates
  if (updates[0] != "null") { updatesList.push({ Type: "vessel;data", ID: strCurrentVessel, UT: updates[0] }); }
  if (updates[1] != "null") { updatesList.push({ Type: "vessel;resources", ID: strCurrentVessel, UT: updates[1] }); }
  if (updates[2] != "null") { updatesList.push({ Type: "vessel;crew", ID: strCurrentVessel, UT: updates[2] }); }
  if (updates[3] != "null") { updatesList.push({ Type: "vessel;comms", ID: strCurrentVessel, UT: updates[3] }); }
  if (updates[4] != "null") { updatesList.push({ Type: "vessel;ports", ID: strCurrentVessel, UT: updates[4] }); }
  
  // parse and sort the history
  var history = [];
  xhttp.responseText.split("*")[2].split("|").forEach(function(item, index) { history.push({UT: item.split("~")[0], Title: item.split("~")[1]}); });
  
  // store all the data
  currentVesselData = { Data: data, Resources: resources, Crew: crew, Comms: comms, Ports: ports, History: history };
  console.log(currentVesselData);
}
