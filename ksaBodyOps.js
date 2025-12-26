// refactor complete
// SECURITY: All user-supplied data from database is sanitized with sanitizeHTML()
// before insertion into DOM to prevent XSS attacks. Use sanitizeHTML() for any
// new code that inserts database content into HTML.

// load a new GeoGebra figure into the main content window
function loadBody(body, flt) {
  if (!body) return;
  if (!body.includes("-")) body = body + "-System";
  
  // an attempt was made to load orbital data for an inactive vessel. Can. Not. Compute.
  if (body == "inactive") return;

  // can't continue if body data hasn't loaded
  if (!ops.bodyCatalog.length) return setTimeout(loadBody, 50, body);

  // if there is already a body loading then try calling back later
  if (ops.bodyCatalog.find(o => o.selected === true) && !KSA_UI_STATE.isGGBAppletLoaded) return setTimeout(loadBody, 50, body);

  // hide the map just in case it's open
  hideMap();

  // only do any of this if the current page is set to body
  // if not, a vessel page is changing the figure because the current vessel body was not loaded
  if (ops.pageType == "body") {

    // default to kerbol system
    if (!body || !body.length) body = "Kerbol-System";
    $("#contentHeader").html(sanitizeHTML(body.replace("-", " ")));
    document.title = "KSA Operations Tracker" + " - " + sanitizeHTML(body.replace("-", " "));
    
    // if this is the first page to load, replace the current history
    // don't create a new entry if this is the same page being reloaded
    if (!history.state) {
      if (window.location.href.includes("&")) var strURL = window.location.href;
      else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=" + body;
      history.replaceState({type: "body", id: body}, document.title, strURL); 
    } else if (history.state.id != body) {
      var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=" + body;
      if (flt) strURL += "&flt=" + flt;
      history.pushState({type: "body", id: body}, document.title, strURL); 
    }

    // for tag loading
    // $("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (body.width('bold 32px arial')/2)) + 10) +'px' });

    // if body was already loaded & we are switching to it then just exit at this point
    if (KSA_UI_STATE.isGGBAppletLoaded && ops.bodyCatalog.find(o => o.selected === true) && ops.bodyCatalog.find(o => o.selected === true).Body == body.split("-")[0]) { 

      // if it was loaded behind a vessel page, show all the details for a bit
      if (KSA_UI_STATE.isDirty) {
        ggbApplet.reset();
        KSA_UI_STATE.isDirty = false;
      }
      return;
    }
  
  // if this is a vessel page calling the load then set a flag to let us know the figure will need to be reset next time it is shown
  } else if (ops.pageType == "vessel") KSA_UI_STATE.isDirty = true;

  // update the current body & system
  if (ops.bodyCatalog.find(o => o.selected === true)) ops.bodyCatalog.find(o => o.selected === true).selected = false;
  ops.bodyCatalog.find(o => o.Body === body.split("-")[0]).selected = true;
  
  // hide and reset stuff
  $("#figureOptions").fadeOut();
  KSA_UI_STATE.isGGBAppletLoaded = false;

  // remove and add the GGB figure container
  $("#figure").remove();
  $("#contentBox").append("<div id='figure'></div>");
  
  // hide it if this isn't a body page
  if (ops.pageType != "body") $("#figure").hide();

  // setup GeoGebra
  // use a random number to always load a new file, never from cache
  var parameters = {"prerelease":false,
                    "width":w2utils.getSize("#contentBox", 'width'),
                    "height":885,
                    "showToolBar":false,
                    "borderColor":null,
                    "showMenuBar":false,
                    "showAlgebraInput":false,
                    "showResetIcon":true,
                    "enableLabelDrags":false,
                    "enableShiftDragZoom":true,
                    "enableRightClick":false,
                    "capturingThreshold":null,
                    "showToolBarHelp":false,
                    "errorDialogsActive":true,
                    "useBrowserForJS":true,
                    "filename":"ggb/" + body + ".ggb?" + Math.floor(Math.random() * 1000)};
  var views = {"is3D":1};
  var applet = new GGBApplet('5.0', parameters, views);
  applet.inject('figure');
  
  // restart spinner so it's on top of figure
  $("#contentBox").spin({ position: 'relative', top: '50%', left: '50%' });
}

// load the data for all the bodies in the Kerbol system
function loadBodyAJAX(xhttp) {

  // separate each of the bodies and their fields
  var bodies = xhttp.responseText.split("|");
  
  // push each body into the array and add the selection flag
  bodies.forEach(function(item) {
    if (item) {
      ops.bodyCatalog.push(rsToObj(item));
      ops.bodyCatalog[ops.bodyCatalog.length-1].selected = false;
    }
  });
}

// called by GGB figure after it finishes loading or after user clicks the reset
function ggbOnInit() {
  KSA_UI_STATE.isGGBAppletRefreshing = true;
  $("#figureDialog").dialog("close");

  // hide and disable vessel filters
  $("#vesselOrbitTypes").fadeOut();
  $("#asteroid-filter").prop("disabled", true);
  $("#debris-filter").prop("disabled", true);
  $("#probe-filter").prop("disabled", true);
  $("#ship-filter").prop("disabled", true);
  $("#station-filter").prop("disabled", true);

  // was nulled after initial orbit data load. Reset to array on load of new body
  ops.vesselsToLoad = [];

  // can't continue if menu data hasn't loaded. Try again in 50ms
  if (!KSA_UI_STATE.isMenuDataLoaded) return setTimeout(ggbOnInit, 50);
  
  // reset all the checkboxes
  $("#nodes").prop('checked', true);
  $("#labels").prop('checked', true);
  $("#orbits").prop('checked', true);
  $("#ref").prop('checked', true);
  $("#soi").prop('checked', true);

  // disable the spinner & show checkboxes if this is the first load and not a vessel page call
  if (!KSA_UI_STATE.isGGBAppletLoaded && ops.pageType == "body") { 
    $("#contentBox").spin(false); 
    $("#figureOptions").fadeIn();
  }

  // prepare to reload any orbiting objects
  ops.ggbOrbits.length = 0;
  
  // loop through and catalog all the pre-made objects
  var bodyIDs = [];
  for (obj=0; obj<ggbApplet.getObjectNumber(); obj++) {

    // is this a unique identifier? Look for a letter followed by a number
    // ignore "A" since in the GGB spreadsheet that row is used for column labels
    if (ggbApplet.getObjectName(obj).charAt(0) != "A" && (bodyIDs.indexOf(ggbApplet.getObjectName(obj).charAt(0)) == -1 && $.isNumeric(ggbApplet.getObjectName(obj).charAt(1)))) {
    
      // add this identifier to the orbits list only if we haven't used it yet
      ops.ggbOrbits.push({type: "body", id: ggbApplet.getObjectName(obj).charAt(0), showName: false, showNodes: false, isSelected: false, isHidden: false});
      bodyIDs.push(ggbApplet.getObjectName(obj).charAt(0));
    }
  }
  bodyIDs.length = 0;

  // bring figure body locations up to date
  ggbApplet.setValue("UT", currUT());
  
  // listen for any objects clicked on
  // this can be called twice if the figure is "dirty" underneath a vessel so make sure only call when figure still not yet fully loaded
  if (!KSA_UI_STATE.isGGBAppletLoaded) ggbApplet.registerClickListener("figureClick");

  // select and show it in the menu if this is the proper page type because
  // the figure can load after a vessel was already selected
  var currBody = ops.bodyCatalog.find(o => o.selected === true).Body;
  if (ops.pageType == "body" && !window.location.href.includes("flt")) selectMenuItem(currBody + "-System");
    
  // declutter the view after a few seconds
  // make sure a quick figure switch doesn't declutter things too fast
  clearTimeout(KSA_TIMERS.timeoutHandle);
  KSA_TIMERS.timeoutHandle = setTimeout(declutterGGB, 2500);

  // load additional data
  KSA_UI_STATE.isGGBAppletLoaded = true;
  loadMap(currBody);
  if (!loadVesselOrbits()) { 
    KSA_UI_STATE.isGGBAppletRefreshing = false;
    activateEventLinks();
  }
}

// adds to the figure the orbits of any vessels around this body
function loadVesselOrbits() {

  // we need to stop all AJAX calls if the body is being switched before we finish
  if (!KSA_UI_STATE.isGGBAppletLoaded) {
    ops.vesselsToLoad.length = 0;
    return;
  }

  // initialize if this is the first call
  if (!ops.vesselsToLoad.length) {

    // if the selected body has moons or is Kerbol then we need to append "-System" to get its menu nodes
    var strBodyName = ops.bodyCatalog.find(o => o.selected === true).Body;
    if (ops.bodyCatalog.find(o => o.selected === true).Moons || strBodyName == "Kerbol") strBodyName += "-System";

    // check if the body has any vessels in orbit around it
    var strVesselsToload = extractIDs(w2ui['menu'].get(strBodyName).nodes);
    if (strVesselsToload.length) {

      // stash the vessels in an array, show the loading spinner and make sure the GGB figure doesn't declutter yet
      ops.vesselsToLoad = strVesselsToload.substr(0, strVesselsToload.length-1).split(";");
      $("#vesselLoaderMsg").spin({ scale: 0.35, position: 'relative', top: '8px', left: '0px' });
      $("#vesselLoaderMsg").fadeIn();
      clearTimeout(KSA_TIMERS.timeoutHandle);
    } else {

      // no vessels to load
      return false;
    }
  }

  // load the vessel orbital data & discard the name to decrease the array size
  loadDB("loadVesselOrbitData.asp?db=" + ops.vesselsToLoad.shift() + "&ut=" + currUT(), addGGBOrbitAJAX);
  return true;
}

// creates an orbit on the GeoGebra figure if it is loaded
function addGGBOrbitAJAX(xhttp) {
  if (!KSA_UI_STATE.isGGBAppletLoaded) return;
  if (!KSA_UI_STATE.isGGBAppletRefreshing) ggbApplet.unregisterClickListener("figureClick");

  // parse data
  var vesselID = xhttp.responseText.split("*")[0];
  var orbitData = rsToObj(xhttp.responseText.split("*")[1].split("|")[0])

  // check to ensure the vessel has an orbital record
  if (orbitData) {

    // convert the vessel id to a variable name suitable for GeoGebra
    ggbID = vesselID.replace("-", "").replace(" ", "");

    // if this vessel is already drawn, does it need to be deleted?
    var vesselObj = ops.ggbOrbits.find(o => o.id === ggbID);
    if (vesselObj && !orbitData.Eph) {

      // just remove the visual aspects
      ggbApplet.deleteObject(ggbID + 'conic');
      ggbApplet.deleteObject(ggbID + 'penode');
      ggbApplet.deleteObject(ggbID + 'apnode');
      ggbApplet.deleteObject(ggbID + 'anode');
      ggbApplet.deleteObject(ggbID + 'dnode');
      ggbApplet.deleteObject(ggbID + 'position');

      // save the vessel type & remove from the array
      var strVesselType = vesselObj.type;
      for (idIndex=0; idIndex<ops.ggbOrbits.length; idIndex++){
        if (ops.ggbOrbits[idIndex].id == ggbID) {
          ops.ggbOrbits.splice(idIndex, 1);
          break;
        }
      }

      // if this vessel type is no longer in use, disable the filter selection
      if (!ops.ggbOrbits.find(o => o.type === strVesselType)) {
        $("#" + strVesselType + "-filter").prop("disabled", true);
        $("#" + strVesselType + "-label").css('color', "#C0C0C0");
        $("#" + strVesselType + "-filter").prop('checked', false);
      }

    // otherwise just add or edit the current orbit if orbit data exists
    } else if (orbitData.Eph) {

      // look up data in the body catalog of the body currently being orbited
      var bodyData = ops.bodyCatalog.find(o => o.selected === true);
      
      // type of vessel so we can color things appropriately
      var strVesselType = w2ui['menu'].get('activeVessels', vesselID).img.split("-")[1];
      
      // add this vessel type and id to the orbits array for filtering if it's not already there
      if (!vesselObj) ops.ggbOrbits.push({type: strVesselType, 
                                          id: ggbID, 
                                          db: vesselID,
                                          showName: false, 
                                          showNodes: false, 
                                          isSelected: false, 
                                          isHidden: false});

      // enable this vessel type in the filters menu
      $("#" + strVesselType + "-filter").removeAttr("disabled");
      $("#" + strVesselType + "-filter").prop('checked', true);
      $("#" + strVesselType + "-label").css('color', KSA_COLORS.orbitColors[strVesselType]);
      
      // load the vessel into the figure
      ggbApplet.evalCommand(ggbID + 'sma=' + orbitData.SMA);
      ggbApplet.evalCommand(ggbID + 'pe=' + (orbitData.Periapsis + bodyData.Radius));
      ggbApplet.evalCommand(ggbID + 'ap=' + (orbitData.Apoapsis + bodyData.Radius));
      ggbApplet.evalCommand(ggbID + 'ecc=' + orbitData.Eccentricity);
      ggbApplet.evalCommand(ggbID + 'inc=' + (Math.radians(orbitData.Inclination)));
      ggbApplet.evalCommand(ggbID + 'raan=' + (Math.radians(orbitData.RAAN)));
      ggbApplet.evalCommand(ggbID + 'arg=' + (Math.radians(orbitData.Arg)));
      ggbApplet.evalCommand(ggbID + 'period=' + orbitData.OrbitalPeriod);
      ggbApplet.evalCommand(ggbID + 'mean=' + toMeanAnomaly(Math.radians(orbitData.TrueAnom), orbitData.Eccentricity));
      ggbApplet.evalCommand(ggbID + 'smna=' + ggbID + 'sma sqrt(1 - ' + ggbID + 'ecc^2)');
      ggbApplet.evalCommand(ggbID + 'foci=' + ggbID + 'ap - ' + ggbID + 'pe');
      ggbApplet.evalCommand(ggbID + 'meanmotion=2pi / ' + ggbID + 'period');
      ggbApplet.evalCommand(ggbID + 'obtaxis=Line(origin, Vector((1; ' + ggbID + 'raan - pi / 2; pi / 2 - ' + ggbID + 'inc)))');
      ggbApplet.setVisible(ggbID + 'obtaxis', false);
      ggbApplet.evalCommand(ggbID + 'secondfocus=Rotate(Rotate((' + ggbID + 'foci; 0; 0), ' + ggbID + 'raan, zAxis), ' + ggbID + 'arg + pi, ' + ggbID + 'obtaxis)');
      ggbApplet.setVisible(ggbID + 'secondfocus', false);
      ggbApplet.evalCommand(ggbID + 'refpoint=Rotate(Rotate((' + ggbID + 'sma; 0; 0), ' + ggbID + 'raan, zAxis), ' + ggbID + 'arg - acos(-' + ggbID + 'ecc), ' + ggbID + 'obtaxis)');
      ggbApplet.setVisible(ggbID + 'refpoint', false);
      ggbApplet.evalCommand(ggbID + 'conic=Ellipse(origin, ' + ggbID + 'secondfocus, ' + ggbID + 'refpoint)');
      ggbApplet.setColor(ggbID + 'conic', hexToRgb(KSA_COLORS.orbitColors[strVesselType]).r, hexToRgb(KSA_COLORS.orbitColors[strVesselType]).g, hexToRgb(KSA_COLORS.orbitColors[strVesselType]).b);
      ggbApplet.evalCommand(ggbID + 'penode=Point(' + ggbID + 'conic, 0)');
      ggbApplet.setCaption(ggbID + 'penode', "Pe");
      ggbApplet.setLabelStyle(ggbID + 'penode', 3);
      ggbApplet.setLabelVisible(ggbID + 'penode', true);
      ggbApplet.setColor(ggbID + 'penode', 0, 153, 255);
      ggbApplet.setPointSize(ggbID + 'penode', 3);
      ggbApplet.setFixed(ggbID + 'penode', true, false);
      ggbApplet.evalCommand(ggbID + 'apnode=Point(' + ggbID + 'conic, 0.5)');
      ggbApplet.setCaption(ggbID + 'apnode', "Ap");
      ggbApplet.setLabelStyle(ggbID + 'apnode', 3);
      ggbApplet.setLabelVisible(ggbID + 'apnode', true);
      ggbApplet.setColor(ggbID + 'apnode', 0, 153, 255);
      ggbApplet.setPointSize(ggbID + 'apnode', 3);
      ggbApplet.setFixed(ggbID + 'apnode', true, false);
      ggbApplet.evalCommand(ggbID + 'anode=If(' + ggbID + 'inc != 0, Element({Intersect(xOyPlane, ' + ggbID + 'conic)}, 1), Point(' + ggbID + 'conic, ' + ggbID + 'raan / (2pi)))');
      ggbApplet.setCaption(ggbID + 'anode', "AN");
      ggbApplet.setLabelStyle(ggbID + 'anode', 3);
      ggbApplet.setLabelVisible(ggbID + 'anode', true);
      ggbApplet.setColor(ggbID + 'anode', 51, 255, 0);
      ggbApplet.setPointSize(ggbID + 'anode', 3);
      ggbApplet.setFixed(ggbID + 'anode', true, false);
      ggbApplet.evalCommand(ggbID + 'anodeta=If(' + ggbID + 'arg != 0, Angle(' + ggbID + 'penode, origin, ' + ggbID + 'anode), 0)');
      ggbApplet.evalCommand(ggbID + 'anodeea=If(' + ggbID + 'anodeta > pi, 2pi - acos((' + ggbID + 'ecc + cos(' + ggbID + 'anodeta)) / (1 + ' + ggbID + 'ecc cos(' + ggbID + 'anodeta))), acos((' + ggbID + 'ecc + cos(' + ggbID + 'anodeta)) / (1 + ' + ggbID + 'ecc cos(' + ggbID + 'anodeta))))');
      ggbApplet.evalCommand(ggbID + 'anodema=' + ggbID + 'anodeea - ' + ggbID + 'ecc sin(' + ggbID + 'anodeea)');
      ggbApplet.evalCommand(ggbID + 'dnode=If(' + ggbID + 'inc != 0, Element({Intersect(xOyPlane, ' + ggbID + 'conic)}, 2), Point(' + ggbID + 'conic, (' + ggbID + 'raan + pi) / (2pi)))');
      ggbApplet.setCaption(ggbID + 'dnode', "DN");
      ggbApplet.setLabelStyle(ggbID + 'dnode', 3);
      ggbApplet.setLabelVisible(ggbID + 'dnode', true);
      ggbApplet.setColor(ggbID + 'dnode', 51, 255, 0);
      ggbApplet.setPointSize(ggbID + 'dnode', 3);
      ggbApplet.setFixed(ggbID + 'dnode', true, false);
      ggbApplet.evalCommand(ggbID + 'maut=Mod(' + ggbID + 'mean + ' + ggbID + 'meanmotion (UT-' + orbitData.Eph + '), 2pi)');
      ggbApplet.evalCommand(ggbID + 'eaut=Iteration(M - (M - ' + ggbID + 'ecc sin(M) - ' + ggbID + 'maut) / (1 - ' + ggbID + 'ecc cos(M)), M, {' + ggbID + 'maut}, 20)');
      ggbApplet.evalCommand(ggbID + 'position=Point(' + ggbID + 'conic, ' + ggbID + 'eaut / (2pi))');
      ggbApplet.setCaption(ggbID + 'position', w2ui['menu'].get('activeVessels', vesselID).text.split(">")[1].split("<")[0]);
      ggbApplet.setLabelStyle(ggbID + 'position', 3);
      ggbApplet.setPointSize(ggbID + 'position', 2);
      ggbApplet.setLabelVisible(ggbID + 'position', true);
      ggbApplet.setColor(ggbID + 'position', hexToRgb(KSA_COLORS.orbitColors[strVesselType]).r, hexToRgb(KSA_COLORS.orbitColors[strVesselType]).g, hexToRgb(KSA_COLORS.orbitColors[strVesselType]).b);
    }
  }

  // if we update the figure, for some reason the click callback needs to be re-enabled
  // as of 10/24/21 this no longer is needed
  // if (!isGGBAppletRefreshing) ggbApplet.registerClickListener("figureClick");

  // callback if there is still data to load
  if (ops.vesselsToLoad && ops.vesselsToLoad.length) setTimeout(loadVesselOrbits, 1);
  else if (ops.vesselsToLoad && !ops.vesselsToLoad.length) {

    // nullify so any orbit updates after initial loading or GGB refresh don't repeat this code
    ops.vesselsToLoad = null;

    // finish cleaning up after body load
    KSA_UI_STATE.isGGBAppletRefreshing = false;
    activateEventLinks();
    $("#vesselLoaderMsg").spin(false);
    $("#vesselLoaderMsg").fadeOut();
    if ($("#figure").is(":visible") && ops.pageType == "body" && !window.location.href.includes("&map") && !KSA_UI_STATE.isMapShown) { 
      if (!$("#asteroid-filter").prop("disabled") || !$("#debris-filter").prop("disabled") || !$("#probe-filter").prop("disabled") || !$("#ship-filter").prop("disabled") || !$("#station-filter").prop("disabled")) $("#vesselOrbitTypes").fadeIn();
    }
    KSA_TIMERS.timeoutHandle = setTimeout(declutterGGB, 2500);
  }
}

// just show only orbits after displaying everything possible to not leave people overwhelmed intiially
function declutterGGB() {
  
  // hide figure elements
  ggbApplet.setVisible("RefLine", false);
  ops.ggbOrbits.forEach(function(item) { 
    if (item.type == "body") {
      ggbApplet.setVisible(item.id + "26", false);
      ggbApplet.setVisible(item.id + "27", false);
      ggbApplet.setVisible(item.id + "28", false);
      ggbApplet.setVisible(item.id + "32", false);
      ggbApplet.setVisible(item.id + "39", false);
      ggbApplet.setLabelVisible(item.id + "36", false);
    } else {

      // someone might have had a chance to select a vessel before now, so only affect unselected ones
      if (!item.isSelected) {
        ggbApplet.setVisible(item.id + "apnode", false);
        ggbApplet.setVisible(item.id + "penode", false);
        ggbApplet.setVisible(item.id + "anode", false);
        ggbApplet.setVisible(item.id + "dnode", false);
        ggbApplet.setLabelVisible(item.id + "position", false);
      }
    }
  });

  // uncheck the affected boxes
  $("#nodes").prop('checked', false);
  $("#labels").prop('checked', false);
  $("#ref").prop('checked', false);
  $("#soi").prop('checked', false);
  
  // nullify to let anyone else know this has already happened
  KSA_TIMERS.timeoutHandle = null;
}

// handle any objects that are clicked in the GeoGebra figure
function figureClick(object) {
  if (object == "RefLine") {
    ggbApplet.evalCommand("SetViewDirection((0,0,1), true)");
    return;
  }
  
  // clicked on a vessel/asteroid orbit or position
  if (object.includes("conic") || object.includes("position")) {
    $("#figureDialog").dialog("close");
    var clickedObj = ops.ggbOrbits.find(o => o.id === object.replace("position" , "").replace("conic", ""));

    // if we clicked on the position after the orbit was selected, then jump to the vessel view & remain selected
    if (clickedObj.isSelected && object.includes("position")) { 

      // use getValueString since we need the actual DB name with any hyphens
      swapContent("vessel", clickedObj.db);
      return;
    }
 
    // unselect any current body & select the orbit if there was nothing already selected or we didn't just unselect ourselves
    var selectedObj = unselectBody(object);
    if (!selectedObj || selectedObj.id != clickedObj.id) {
      ggbApplet.setLabelVisible(clickedObj.id + "position", true);
      ggbApplet.setVisible(clickedObj.id + "conic", true);
      clickedObj.showName = true;
      clickedObj.showNodes = true;
      clickedObj.isSelected = true;

      // only actually show nodes if orbits are shown
      if ($("#orbits").is(":checked") || ($("#nodes").is(":checked") && !$("#orbits").is(":checked"))) {
        ggbApplet.setVisible(clickedObj.id + "penode", true);
        ggbApplet.setVisible(clickedObj.id + "apnode", true);
        ggbApplet.setVisible(clickedObj.id + "anode", true);
        ggbApplet.setVisible(clickedObj.id + "dnode", true);
      }
    }
    return;
  }

  // clicked on a planet?
  if (object.includes("36") || object.includes("37")) {
    var selectedObj = unselectBody(object);
    var clickedObj = ops.ggbOrbits.find(o => o.id === object.charAt(0));
    clickedObj.isSelected = true;

    // compose the planet data if there's no previous selection or we didn't click on ourselves
    if (!selectedObj || (selectedObj && clickedObj.id != selectedObj.id)) {
      var strBodyName = ggbApplet.getCaption(object.charAt(0) + "36");
      var bodyData = ops.bodyCatalog.find(o => o.Body === strBodyName);
      var strHTML = "<table style='border: 0px; border-collapse: collapse;'><tr><td style='vertical-align: top; width: 256px;'>";
      if (bodyData.Image) {
        strHTML += "<img src='" + bodyData.Image + "' style='background-color:black;'>";
      } else {
        strHTML += "<img src='https://i.imgur.com/advRrs1.png'>";
      }
      strHTML += "<i><p>&quot;" + bodyData.Desc + "&quot;</p></i><p><b>- Kerbal Astronomical Society</b></p></td>";
      strHTML += "<td style='vertical-align: top; padding: 0px; margin-top: 0px'><b>Orbital Data</b>";
      strHTML += "<p>Apoapsis: " + bodyData.Ap + " m<br>";
      strHTML += "Periapsis: " + bodyData.Pe + " m<br>";
      strHTML += "Eccentricity: " + bodyData.Ecc + "<br>";
      strHTML += "Inclination: "+ bodyData.Inc + "&deg;<br>";
      strHTML += "Orbital period: " + formatTime(bodyData.ObtPeriod, false) + "<br>";
      strHTML += "Orbital velocity: " + bodyData.ObtVel + " m/s</p><p><b>Physical Data</b></p>";
      if (isNaN(bodyData.Radius)) {
        strHTML += "<p>Equatorial radius: " + bodyData.Radius + " <br>";
      } else {
        strHTML += "<p>Equatorial radius: " + numeral(parseInt(bodyData.Radius)*1000).format('0,0') + " m<br>";
      }
      strHTML += "Mass: " + bodyData.Mass.replace("+", "e") + " kg<br>";
      strHTML += "Density: " + bodyData.Density + " kg/m<sup>3</sup><br>";
      strHTML += "Surface gravity: " + bodyData.SurfaceG.split(":")[0] + " m/s<sup>2</sup> <i>(" + bodyData.SurfaceG.split(":")[1] + " g)</i><br>";
      strHTML += "Escape velocity: " + bodyData.EscapeVel + " m/s<br>";
      strHTML += "Rotational period: " + formatTime(bodyData.SolarDay, true) + "<br>";
      strHTML += "Atmosphere: " + bodyData.Atmo + "</p>";
      if (bodyData.Moons) strHTML += "<p><b>Moons</b></p><p>" + bodyData.Moons + "</p>";
      if (ops.surface.Data && ops.surface.Data.Name == strBodyName) {
        strHTML += "<p><span onclick='showMap()' style='cursor: pointer; color: blue; text-decoration: none;'>View Surface</span> | ";
      } else if (bodyData.Moons && !$("#contentHeader").html().includes(strBodyName)) {
        strHTML += "<span class='fauxLink' onclick='loadBody(&quot;" + strBodyName + "-System&quot;)'>View System</span> | ";
      }
      strHTML += "<span class='fauxLink' onclick='centerBody(&quot;" + object.charAt(0) + "&quot;)'>Focus View</span> | ";

      // no nodes to show unless body has an eccentric or inclined orbit
      if ((parseFloat(bodyData.Ecc) || parseFloat(bodyData.Inc)) && !$("#contentHeader").html().includes(strBodyName)) {
        if (clickedObj.showNodes) strHTML += "<span onclick='toggleBodyNodes(&quot;" + object + "&quot;)' style='cursor: pointer; color: blue;'>Hide Nodes</span> | ";
        else strHTML += "<span onclick='toggleBodyNodes(&quot;" + object + "&quot;)' style='cursor: pointer; color: blue;'>Show Nodes</span> | ";
      } 
      strHTML = strHTML.substring(0, strHTML.length-2);
      strHTML += "</p></td></tr></table>";
      $("#figureDialog").dialog("option", "title", strBodyName);
      $("#figureDialog").html(strHTML);
    }
    $("#figureDialog").dialog("open");

    // toggle the orbit if the orbits are hidden
    if (!$("#orbits").is(":checked")) {
      ggbApplet.setVisible(clickedObj.id + "23", !ggbApplet.getVisible(clickedObj.id + "23"));

      // if orbit is visible, only show the nodes if the box is checked or toggled for the object
      if (ggbApplet.getVisible(clickedObj.id + "23") && (clickedObj.showNodes || $("#nodes").is(":checked"))) {
        ggbApplet.setVisible(clickedObj.id + "26", true);
        ggbApplet.setVisible(clickedObj.id + "27", true);
        ggbApplet.setVisible(clickedObj.id + "28", true);
        ggbApplet.setVisible(clickedObj.id + "32", true);

      // hide the nodes if the orbit is not visible
      } else if (!ggbApplet.getVisible(clickedObj.id + "23")) {
        ggbApplet.setVisible(clickedObj.id + "26", false);
        ggbApplet.setVisible(clickedObj.id + "27", false);
        ggbApplet.setVisible(clickedObj.id + "28", false);
        ggbApplet.setVisible(clickedObj.id + "32", false);
      }
    }
  }
}

// find whatever other body is selected and unselect it
function unselectBody(clickedObj) {
  var selectedObj = ops.ggbOrbits.find(o => o.isSelected === true);
  if (selectedObj) {
    if (selectedObj.type != "body") {

      // if we click on the vessel that was selected, remove orbit if they are hidden
      // bodies have to handle this themseleves because they only have the position to click on, not the orbit
      if (clickedObj.includes(selectedObj.id) && !$("#orbits").is(":checked")) {
        ggbApplet.setVisible(selectedObj.id + "conic", false);
      }

      // bodies don't show labels when selected and they can have their own toggles for nodes so don't mess with either
      if (!$("#labels").is(":checked")) ggbApplet.setLabelVisible(selectedObj.id + "position", false);
      if (!$("#nodes").is(":checked") || ($("#nodes").is(":checked") && !$("#orbits").is(":checked"))) { 
        ggbApplet.setVisible(selectedObj.id + "penode", false);
        ggbApplet.setVisible(selectedObj.id + "apnode", false);
        ggbApplet.setVisible(selectedObj.id + "anode", false);
        ggbApplet.setVisible(selectedObj.id + "dnode", false);
      }
      selectedObj.showName = false;
      selectedObj.showNodes = false;
    }
    selectedObj.isSelected = false;
  }
  return selectedObj;
}

// change the view to center on the selected object
function centerBody(objectChar) {
  ggbApplet.evalCommand("CenterView((" + ggbApplet.getXcoord(objectChar + "36") + "," + ggbApplet.getYcoord(objectChar + "36") + "))");
}

function toggleBodyNodes(object) {
  if ($('#figureDialog').html().includes("Show Nodes")) {
    $('#figureDialog').html($('#figureDialog').html().replace("Show Nodes", "Hide Nodes"));
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") object = object.replace("D", "C");

    // show nodes only if orbit is visible
    if (ggbApplet.getVisible(object.charAt(0) + "23")) {
      ggbApplet.setVisible(object.charAt(0) + "26", true);
      ggbApplet.setVisible(object.charAt(0) + "27", true);
      ggbApplet.setVisible(object.charAt(0) + "28", true);
      ggbApplet.setVisible(object.charAt(0) + "32", true);
    }

    // https://stackoverflow.com/questions/12462318/find-a-value-in-an-array-of-objects-in-javascript
    ops.ggbOrbits.find(o => o.id === object.charAt(0)).showNodes = true;
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Polta") ops.ggbOrbits.find(o => o.id === "D").showNodes = true;
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") ops.ggbOrbits.find(o => o.id === "C").showNodes = true;
  } else {
    $('#figureDialog').html($('#figureDialog').html().replace("Hide Nodes", "Show Nodes"));
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") object = object.replace("D", "C");
    
    // only hide if the diagram checkbox is not checked
    if (!$("#nodes").is(":checked")) {
      ggbApplet.setVisible(object.charAt(0) + "26", false);
      ggbApplet.setVisible(object.charAt(0) + "27", false);
      ggbApplet.setVisible(object.charAt(0) + "28", false);
      ggbApplet.setVisible(object.charAt(0) + "32", false);
    }
    ops.ggbOrbits.find(o => o.id === object.charAt(0)).showNodes = false;
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Polta") ops.ggbOrbits.find(o => o.id === "D").showNodes = false;
    if (ggbApplet.getCaption(object.charAt(0) + "36") == "Priax") ops.ggbOrbits.find(o => o.id === "C").showNodes = false;
  }
}

// handle GeoGebra diagram display options
function toggleNodes(isChecked) {
  ops.ggbOrbits.forEach(function(item) { 

    // if the orbits are shown, affect all bodies or
    // if the orbits are not shown, affect all bodies with nodes enabled or bodies with orbits visible
    if (($("#orbits").is(":checked") && !item.showNodes && !item.isHidden) || (!$("#orbits").is(":checked") && (item.showNodes || (item.type == "body" && ggbApplet.getVisible(item.id + "23"))))) {
      if (item.type == "body") {
        ggbApplet.setVisible(item.id + "26", isChecked);
        ggbApplet.setVisible(item.id + "27", isChecked);
        ggbApplet.setVisible(item.id + "28", isChecked);
        ggbApplet.setVisible(item.id + "32", isChecked);

        // special case - don't let unchecking this box affect nodes when orbits are hidden but nodes are toggled on for body
        // this is needed because of the way showNodes is used slightly differently between bodies and vessels
        if (!isChecked && !$("#orbits").is(":checked") && item.showNodes) {
          ggbApplet.setVisible(item.id + "26", true);
          ggbApplet.setVisible(item.id + "27", true);
          ggbApplet.setVisible(item.id + "28", true);
          ggbApplet.setVisible(item.id + "32", true);
        }
      } else {

        // if the orbits box is unchecked the node visibility must match that of the conic visibility
        if (!$("#orbits").is(":checked")) var nodeVis = ggbApplet.getVisible(item.id + "conic");
        else var nodeVis = isChecked;

        ggbApplet.setVisible(item.id + "apnode", nodeVis);
        ggbApplet.setVisible(item.id + "penode", nodeVis);
        ggbApplet.setVisible(item.id + "anode", nodeVis);
        ggbApplet.setVisible(item.id + "dnode", nodeVis);
      }
    }
  });
}

function toggleLabels(isChecked) {
  ops.ggbOrbits.forEach(function(item) { 
    if (!item.showName) {
      if (item.type == "body") ggbApplet.setLabelVisible(item.id + "36", isChecked);
      else ggbApplet.setLabelVisible(item.id + "position", isChecked);
    }
  });
}

function toggleOrbits(isChecked) {
  ops.ggbOrbits.forEach(function(item) { 
    if (item.type == "body") ggbApplet.setVisible(item.id + "23", isChecked);
    else if (!item.isHidden && !item.isSelected) ggbApplet.setVisible(item.id + "conic", isChecked);
  });
  
  // we need to hide all nodes when hiding orbits, regardless of toggle, because nothing is selected
  if (!isChecked) {
    if ($("#nodes").is(":checked")) $("#nodes").prop('checked', false);
    ops.ggbOrbits.forEach(function(item) { 
      if (item.type == "body") {
        ggbApplet.setVisible(item.id + "26", false);
        ggbApplet.setVisible(item.id + "27", false);
        ggbApplet.setVisible(item.id + "28", false);
        ggbApplet.setVisible(item.id + "32", false);
      } else {
        ggbApplet.setVisible(item.id + "apnode", false);
        ggbApplet.setVisible(item.id + "penode", false);
        ggbApplet.setVisible(item.id + "anode", false);
        ggbApplet.setVisible(item.id + "dnode", false);
      }
    });
  }
  
  // if we're showing orbits and the nodes box is checked, we have to show all the nodes, regardless of toggle so can't call function
  else if ($("#nodes").is(":checked") && isChecked) { 
    ops.ggbOrbits.forEach(function(item) { 
      if (item.type == "body") {
        ggbApplet.setVisible(item.id + "26", true);
        ggbApplet.setVisible(item.id + "27", true);
        ggbApplet.setVisible(item.id + "28", true);
        ggbApplet.setVisible(item.id + "32", true);
      } else {
        ggbApplet.setVisible(item.id + "apnode", true);
        ggbApplet.setVisible(item.id + "penode", true);
        ggbApplet.setVisible(item.id + "anode", true);
        ggbApplet.setVisible(item.id + "dnode", true);
      }
    });
  }

  // else if the orbits are being shown, show nodes depending on the orbit setting
  else if (isChecked) {
    ops.ggbOrbits.forEach(function(item) { 
      if (item.showNodes) {
        if (item.type == "body") {
          ggbApplet.setVisible(item.id + "26", true);
          ggbApplet.setVisible(item.id + "27", true);
          ggbApplet.setVisible(item.id + "28", true);
          ggbApplet.setVisible(item.id + "32", true);
        } else {
          ggbApplet.setVisible(item.id + "apnode", true);
          ggbApplet.setVisible(item.id + "penode", true);
          ggbApplet.setVisible(item.id + "anode", true);
          ggbApplet.setVisible(item.id + "dnode", true);
        }
      }
    });
  }
}

function toggleRefLine(isChecked) {
  ggbApplet.setVisible("RefLine", isChecked);
}

function filterVesselOrbits(id, checked) {
  if (checked) {
    ops.ggbOrbits.forEach(function(item) {
      if (id == item.type) {
        ggbApplet.setVisible(item.id + "position", true);
        ggbApplet.setVisible(item.id + "penode", $("#nodes").is(':checked'));
        ggbApplet.setVisible(item.id + "apnode", $("#nodes").is(':checked'));
        ggbApplet.setVisible(item.id + "anode", $("#nodes").is(':checked'));
        ggbApplet.setVisible(item.id + "dnode", $("#nodes").is(':checked'));
        ggbApplet.setLabelVisible(item.id + "position", $("#labels").is(':checked'));
        item.isHidden = false;
        
        // only show orbit if orbits are checked
        if ($("#orbits").is(":checked")) ggbApplet.setVisible(item.id + "conic", true);
      }
    });
  } else {
    ops.ggbOrbits.forEach(function(item) {
      if (id == item.type) {
        ggbApplet.setVisible(item.id + "position", false);
        ggbApplet.setVisible(item.id + "conic", false);
        ggbApplet.setVisible(item.id + "penode", false);
        ggbApplet.setVisible(item.id + "apnode", false);
        ggbApplet.setVisible(item.id + "anode", false);
        ggbApplet.setVisible(item.id + "dnode", false);
        ggbApplet.setLabelVisible(item.id + "position", false);
        item.isHidden = true;
      }
    });
  }
}

function toggleSOI(isChecked) {
  ops.ggbOrbits.forEach(function(item) { 
    if (item.type == "body") {
      ggbApplet.setVisible(item.id + "39", isChecked);
    }
  });
}