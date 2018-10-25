
function loadCrew(crew) {
  
  // can't continue if menu data hasn't loaded. Try again in 250ms
  if (!isMenuDataLoaded) {
    setTimeout(function() {
      loadCrew(crew);
    }, 250)
    return;
  }

  // modify the history so people can page back/forward
  // if this is the first page to load, replace the current history
  if (!history.state) {
    if (window.location.href.includes("&")) var strURL = window.location.href;
    else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + crew;
    history.replaceState({Type: pageType, ID: crew}, document.title, strURL);
    
  // don't create a new entry if this is the same page being reloaded
  } else if (history.state.ID != crew) {
    history.pushState({Type: pageType, ID: crew}, document.title, "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + crew);
  }
  
  // load the data depending on our view
  if (pageType == "crewFull") {
    $("#contentHeader").html("Full Roster");
    $("#fullRoster").empty();
    
    // get the full crew listing and start to show them all
    crewList = extractIDs(w2ui['menu'].get('crew').nodes).split(";");
    strCurrentCrew = showFullRoster();
    loadCrewAJAX();
    document.title = "KSA Operations Tracker - Full Roster";
  } else {
    strCurrentCrew = crew;
    $("#contentHeader").html("&nbsp;");
    $("#contentHeader").spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
    
    // select and show it in the menu
    w2ui['menu'].select(strCurrentCrew);
    w2ui['menu'].expandParents(strCurrentCrew);
    w2ui['menu'].scrollIntoView(strCurrentCrew);
    
    // load the data
    loadCrewAJAX();
  }
}

function loadCrewAJAX(xhttp) {

  // if the call was made to get data, we should have data
  if (xhttp) {
  
    // parse out the data
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
    
    // store all the data
    currentCrewData = { Stats: stats,
                        History: history,
                        Background: catalog,
                        Missions: missions,
                        Ribbons: ribbons };
    
  // otherwise we are looking up the data in the catalog
  } else {
    var crew = opsCatalog.find(o => o.ID === strCurrentCrew);

    // extract the data if it is available
    if (crew && crew.CurrentData) {
      currentCrewData = crew.CurrentData;

    // get the data if it hasn't been loaded yet, then callback to wait for it to load
    } else if (crew && !crew.CurrentData && !crew.isLoading) {
      crew.isLoading = true;
      loadDB("loadOpsData.asp?db=" + strCurrentCrew + "&ut=" + currUT() + "&type=crew" + "&pastUT=NaN", loadOpsDataAJAX);
      return setTimeout(loadCrewAJAX, 100);
    
    // callback to check the catalog again if it's loading right now
    } else if (crew && !crew.CurrentData && crew.isLoading) {
      return setTimeout(loadCrewAJAX, 100);
    
    // if it's not in the catalog we need to do a data call for a deceased crew member
    } else if (!crew) {
      return loadDB("loadOpsData.asp?db=" + strCurrentCrew + "&ut=" + currUT() + "&type=crew" + "&pastUT=NaN", loadCrewAJAX);
    }
  }
  
  // what to do with it?
  // full crew roster show data in a tooltip for each crew member
  if (pageType == "crewFull") {
    
    // get the date for activation
    strTip = "<b>" + currentCrewData.Stats.Rank + " " + currentCrewData.Background.FullName + " Kerman<p>Activation Date:</b> " + UTtoDateTime(currentCrewData.Background.Activation).split("@")[0] + "<br><b>Mission Count:</b> " + currentCrewData.Missions.length + "<br><b>Ribbon Count:</b> " + currentCrewData.Ribbons.length + "<br><b>Current Status:</b><br>" + currentCrewData.Stats.Status;
    if (currentCrewData.Stats.Assignment) { 
      strTip += "<br><b>Current Assignment:</b><br>" + currentCrewData.Stats.Assignment; 
    } else {
      strTip += "<br><b>Current Assignment:</b><br>None"; 
    }
    $("#" + strCurrentCrew).html("<img src='" + currentCrewData.Stats.Image + "' class='tipped' style='width: 235px; cursor: pointer' title='" + strTip + "'>");
    
    // create the tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) { showOpt = 'click'; }
    else { showOpt = 'mouseenter'; }
    Tipped.create('.tipped', { showOn: showOpt, hideOnClickOutside: is_touch_device(), position: 'bottom', target: 'mouse', hideOn: {element: 'mouseleave'} });
    
    // call for another?
    strCurrentCrew = showFullRoster();
    if (strCurrentCrew) loadCrewAJAX();
  
  // individual crew page
  } else {
    
    crewHeaderUpdate();
    crewInfoUpdate();
    CrewMissionsUpdate();
    crewStatusUpdate();
    crewAssignmentUpdate();
    crewRibbonsUpdate();
    
    // activation date
    var minutes = 60;
    var hours = minutes * 60;
    var days = hours * 24;
    var years = days * 365;
    var service = (currUT() - currentCrewData.Background.Activation) / years;
    $("#dataField0").html("<b>Activation Date:</b> " + UTtoDateTime(currentCrewData.Background.Activation).split("@")[0] + " (Service Years: " + numeral(service).format('0.00') + ")");
    $("#dataField0").fadeIn();
    
    // hide the rest of the fields
    $("#dataField12").fadeOut();
    $("#dataField13").fadeOut();
    $("#dataField14").fadeOut();
    $("#dataField15").fadeOut();
    $("#dataField16").fadeOut();
    
    // create any tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) { showOpt = 'click'; }
    else { showOpt = 'mouseenter'; }
    Tipped.create('.tip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), hideOn: {element: 'mouseleave'} });
    
    // setup the twitter timeline
    swapTwitterSource('Crew Feed', currentCrewData.Background.Timeline);
  }
}

// display all current crew members
// matches the current menu sorting option for crew
function showFullRoster() {
  var crewID = crewList.shift();
  if (crewID) {
    $("#fullRoster").append("<div id='" + crewID + "' class='crewCard' onclick=\"swapContent('crew', '" + crewID + "')\"></div>&nbsp;");
    $("#" + crewID).spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
  }
  return crewID;
}

function ribbonDisplayToggle() {
  if ($("#dataField11").html().includes("Show")) {
      $("#dataField10").empty();
      currentCrewData.Ribbons.forEach(function(item, index) {
        $("#dataField10").append("<img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'>");
      });
    $("#dataField11").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Hide Multiple Ribbons</span></center>");
  } else if ($("#dataField11").html().includes("Hide")) {
      $("#dataField10").empty();
      currentCrewData.Ribbons.forEach(function(item, index) {
      
        // only show this ribbon if it has not been supersceded by a later one
        if (!item.Override || (item.Override && item.Override > currUT())) {
          $("#dataField10").append("<img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'>");
        }
      });
    $("#dataField11").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Show All Ribbons</span></center>");
  }

  // create any tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) { showOpt = 'click'; }
  else { showOpt = 'mouseenter'; }
  Tipped.create('.tip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), hideOn: {element: 'mouseleave'} });
}

function updateCrewData(crew) {

  // update the current data with the preloaded updated data
  // we do this regardless of whether the crew page is in view so that the full roster tooltips are updated
  for (var futureProp in crew.FutureData) {
    for (var prop in currentCrewData) {
    
      // only update data that exists and is current for this time 
      if (futureProp == prop && crew.FutureData[futureProp] && crew.FutureData[futureProp].UT <= currUT()) {
        
        // only history and info are classes that can be copied
        // missions and ribbons need to be pushed into the existing array
        if (Array.isArray(currentCrewData[prop])) {
          currentCrewData[prop].unshift(crew.FutureData[futureProp]);
        } else {
          currentCrewData[prop] = crew.FutureData[futureProp];
        }
      }
    }
  }

  // perform a live data update if we are looking at the crew in question at the moment
  if (pageType == "crew" && strCurrentCrew == crew.ID) {
    crewHeaderUpdate(true);
    crewInfoUpdate(true);
    CrewMissionsUpdate(true);
    crewStatusUpdate(true);
    crewAssignmentUpdate(true);
    crewRibbonsUpdate(true);
    console.log(crew);
    
    // create the tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) { showOpt = 'click'; }
    else { showOpt = 'mouseenter'; }
    Tipped.create('.tipped', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
    Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
  }

  // fetch new data. Add a second just to make sure we don't get the same current data
  crew.isLoading = true;
  loadDB("loadOpsData.asp?db=" + crew.ID + "&UT=" + (currUT()+1) + "&type=" + crew.Type + "&pastUT=NaN", loadOpsDataAJAX);
}

function crewHeaderUpdate(update) {
  if (update && !$("#contentHeader").html().includes(currentCrewData.Stats.Rank)) flashUpdate("#contentHeader", "#77C6FF", "#FFF");
  $("#contentHeader").html(currentCrewData.Stats.Rank + " " + currentCrewData.Background.FullName + " Kerman");
  document.title = "KSA Operations Tracker" + " - " + currentCrewData.Stats.Rank + " " + currentCrewData.Background.FullName + " Kerman";

  // for tag loading
  // $("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (crew.width('bold 32px arial')/2)) + 10) +'px' });
}

function crewInfoUpdate(update) {

  // basic setups
  $("#infoImg").html("<img src='" + currentCrewData.Stats.Image + "'>");
  $("#infoTitle").html("Click Here for Background Information");
  $("#infoTitle").attr("class", "infoTitle crew");
  $("#infoDialog").dialog("option", "title", "Background Information");
  $("#infoDialog").dialog("option", {width: 490, height: 600});
  $("#partsImg").empty();

  // if there is a change in bio/service record and the dialog is not open, flash the title
  if (update && !$("#infoDialog").dialog("isOpen") && (!$("#infoDialog").html().includes(currentCrewData.Background.Bio) || !$("#infoDialog").html().includes(currentCrewData.History.History))) {
    flashUpdate("#infoTitle", "#77C6FF", "#000");
  }
  
  // compose the background information
  // get the date of the birthday to display in MM/DD/YYYY format and also age calculation
  var bday = new Date(currentCrewData.Background.BirthDate);
  var minutes = 1000 * 60;
  var hours = minutes * 60;
  var days = hours * 24;
  var years = days * 365;
  var age = (Date.now() - bday.getTime()) / years;
  var strBackgrnd = "<b>Birth Date:</b> " + (bday.getUTCMonth() + 1) + "/" + bday.getUTCDate() + "/" + bday.getUTCFullYear() + " (Age: " + numeral(age).format('0.00') + ")";
  
  // family name with help icon for more info
  strBackgrnd += "<p><b>Family Name:</b> " + currentCrewData.Background.FamName + "&nbsp;<img src='qmark.png' style='margin-bottom: 10px; left: initial; cursor: help' class='tip' data-tipped-options=\"position: 'right', maxWidth: 135\" title='as a show of global unity, all adult kerbals take the surname of the first planetary leader'></p>";
  
  // rest of the bio stuff
  strBackgrnd += "<p><b>Specialty:</b> " + currentCrewData.Background.Speciality + "</p><p><b>Hobbies:</b> " + currentCrewData.Background.Hobbies + "</p><p><b>Biography:</b> " + currentCrewData.Background.Bio + "</p><p><b>Service History:</b> " + currentCrewData.History.History + "</p>";
  $("#infoDialog").html(strBackgrnd);
}

function CrewMissionsUpdate(update) {

  // completed missions
  if (update && !$("#dataField1").html().includes(currentCrewData.Missions.length)) {
    flashUpdate("#dataField1", "#77C6FF", "#FFF");
    flashUpdate("#dataField9", "#77C6FF", "#FFF");
  }
  $("#dataField1").html("<b>Completed Missions:</b> " + currentCrewData.Missions.length);
  $("#dataField1").fadeIn();
  
  // mission days
  if (update && !$("#dataField3").html().includes(currentCrewData.Stats.TMD)) flashUpdate("#dataField3", "#77C6FF", "#FFF");
  $("#dataField3").html("<b>Total Mission Days:</b> " + currentCrewData.Stats.TMD);
  $("#dataField3").fadeIn();
  
  // docking operations? Only for pilots
  if (currentCrewData.Stats.Dockings) {
    if (update && !$("#dataField2").html().includes(currentCrewData.Stats.Dockings)) flashUpdate("#dataField2", "#77C6FF", "#FFF");
    $("#dataField2").html("<b>Docking Operations:</b> " + currentCrewData.Stats.Dockings);
    $("#dataField2").fadeIn();
  } else $("#dataField2").fadeOut();
  
  // EVA time
  if (update && !$("#dataField4").html().includes(currentCrewData.Stats.TEVA)) flashUpdate("#dataField4", "#77C6FF", "#FFF");
  $("#dataField4").html("<b>Total EVA Time:</b> " + currentCrewData.Stats.TEVA);
  $("#dataField4").fadeIn();
  
  // science collection
  if (update && !$("#dataField5").html().includes(currentCrewData.Stats.Science)) flashUpdate("#dataField5", "#77C6FF", "#FFF");
  $("#dataField5").html("<b>Total Science Collected:</b> " + currentCrewData.Stats.Science);
  $("#dataField5").fadeIn();
  
  // distance traveled
  if (update && !$("#dataField6").html().includes(numeral(currentCrewData.Stats.Distance).format('0,0.000'))) flashUpdate("#dataField6", "#77C6FF", "#FFF");
  $("#dataField6").html("<b>Total Mission Distance Traveled:</b> " + numeral(currentCrewData.Stats.Distance).format('0,0.000') + "km");
  $("#dataField6").fadeIn();

  // mission list
  $("#dataField9").html("<b>Past Missions: </b><select id='missionSelect' style='width: 335px'><option value='' selected='selected'></option></select>");
  $("#dataField9").fadeIn();
  if (currentCrewData.Missions.length) {
    currentCrewData.Missions.forEach(function(item, index) {
      $("#missionSelect").append($('<option>', {
        value: item.Link,
        text: item.Title
      }));
    });
  } else { $("#missionSelect").append($('<option>', { value: '', text: 'No Missions Yet Completed' })); }
  $("#missionSelect").change(function () {
    if ($("#missionSelect").val()) { window.open($("#missionSelect").val()); }
  });
}

function crewStatusUpdate(update) {
  if (update && (!$("#dataField7").html().includes(currentCrewData.Stats.StatusHTML) || !$("#dataField7").html().includes(currentCrewData.Stats.Status))) flashUpdate("#dataField7", "#77C6FF", "#FFF");
  $("#dataField7").html("<b>Current Status:</b> <u><span style='cursor:help' class='tip' data-tipped-options=\"position: 'top'\" title='" + currentCrewData.Stats.StatusHTML + "'>" + currentCrewData.Stats.Status + "</span></u>");
  $("#dataField7").fadeIn();
}

function crewAssignmentUpdate(update) {
  if (currentCrewData.Stats.Assignment) {
    if (update && (!$("#dataField8").html().includes(currentCrewData.Stats.AssignmentHTML) || !$("#dataField8").html().includes(currentCrewData.Stats.Assignment))) flashUpdate("#dataField8", "#77C6FF", "#FFF");
    $("#dataField8").html("<b>Current Assignment:</b> <u><span style='cursor:help' class='tip' data-tipped-options=\"position: 'top'\" title='" + currentCrewData.Stats.AssignmentHTML + "'>" + currentCrewData.Stats.Assignment + "</span></u>");
    $("#dataField8").fadeIn();
  } else $("#dataField8").fadeOut();
}

function crewRibbonsUpdate(update) {
  if (currentCrewData.Ribbons.length) {
    if (update && !$("#dataField10").html().includes("ribbons=" + currentCrewData.Ribbons.length)) flashUpdate("#dataField10", "#77C6FF", "#FFF");
    $("#dataField10").empty();
    $("#dataField10").html("<span ribbons=" + currentCrewData.Ribbons.length + "></span>");
    currentCrewData.Ribbons.forEach(function(item) {
      
      // only show this ribbon if it has not been supersceded by a later one
      if (!item.Override || (item.Override && item.Override > currUT())) {
        $("#dataField10").append("<img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'>");
      } else {
        $("#dataField11").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Show All Ribbons</span></center>");
      }
    });

    // only show the option to display hidden ribbons if any are hidden
    if (currentCrewData.Ribbons.find(o => o.Override)) $("#dataField11").fadeIn();
    else $("#dataField11").fadeOut();
  } else { $("#dataField10").html("<center>No Ribbons Yet Awarded</center>"); }
  $("#dataField10").fadeIn();
}