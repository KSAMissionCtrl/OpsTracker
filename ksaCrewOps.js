// refactor complete
// SECURITY: All user-supplied data from database is sanitized with sanitizeHTML()
// before insertion into DOM to prevent XSS attacks. Use sanitizeHTML() for any
// new code that inserts database content into HTML.

function loadCrew(crew) {
  
  // make sure the menu data is loaded before continuing
  if (!isMenuDataLoaded) return setTimeout(loadCrew, 100, crew);

  // modify the history so people can page back/forward
  // if this is the first page to load, replace the current history
  if (!history.state) {
    if (window.location.href.includes("&")) var strURL = window.location.href;
    else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + crew;
    history.replaceState({type: ops.pageType, id: crew}, document.title, strURL);
    
  // don't create a new entry if this is the same page being reloaded
  } else if (history.state.id != crew) {
    history.pushState({type: ops.pageType, id: crew}, document.title, "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + crew);
  }
  
  // remove the current loaded crew
  if (ops.currentCrew) {
    ops.currentCrew.Ribbons.length = 0;
    ops.currentCrew.Missions.length = 0;
    ops.currentCrew = null;
  }

  // load the data depending on our view
  if (ops.pageType == "crewFull") {
    $("#contentHeader").html("Full Roster");
    $("#fullRoster").empty();
    document.title = "KSA Operations Tracker - Full Roster";
    
    // get the full crew listing and start to show them all
    crewList = extractIDs(w2ui['menu'].get('crew').nodes).split(";");
    loadDB("loadCrewData.asp?db=" + showFullRoster() + "&ut=" + currUT(), loadCrewAJAX);
  } else {
    $("#contentHeader").html("&nbsp;");
    $("#contentHeader").spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
    
    // select and show it in the menu
    selectMenuItem(crew);
    
    // load the data if there is no current crew loaded or the current crew loaded is not the crew that was selected
    // otherwise just go straight to displaying the data
    if (!ops.currentCrew || (ops.currentCrew && crew != ops.currentCrew.Background.Kerbal)) loadDB("loadCrewData.asp?db=" + crew + "&ut=" + currUT(), loadCrewAJAX);
    else loadCrewAJAX();
  }
}

function loadCrewAJAX(xhttp) {

  // parse out the data, if any was sent. If not, the data is already loaded
  if (xhttp) {
    var data = xhttp.responseText.split("*");
    
    // the crew catalog data is first
    var catalog = rsToObj(data[0]);
    
    // the various tables of the current record are next
    var dataTables = data[1].split("^");
    var stats = rsToObj(dataTables[0]);
    var history = rsToObj(dataTables[3]);
    
    // parse the missions and the ribbons
    var missions = [];
    var ribbons = [];
    if (dataTables[1] != "null") dataTables[1].split("|").forEach(function(item) { missions.push(rsToObj(item)); });
    if (dataTables[2] != "null") dataTables[2].split("|").forEach(function(item) { ribbons.push(rsToObj(item)); });
    missions.reverse();
    
    // store all the data
    ops.currentCrew = { Stats: stats,
                        History: history,
                        Background: catalog,
                        Missions: missions,
                        Ribbons: ribbons }
  }
    
  // what to do with it?
  // full crew roster show data in a tooltip for each crew member
  if (ops.pageType == "crewFull") {
    
    // compose and assign the portrait tooltip
    strTip = "<b>" + sanitizeHTML(ops.currentCrew.Stats.Rank) + " " + sanitizeHTML(ops.currentCrew.Background.FullName) + " Kerman<p>Activation Date:</b> " + UTtoDateTime(ops.currentCrew.Background.Activation).split("@")[0] + "<br><b>Mission Count:</b> " + ops.currentCrew.Missions.length + "<br><b>Ribbon Count:</b> " + ops.currentCrew.Ribbons.length + "<br><b>Current Status:</b><br>" + sanitizeHTML(ops.currentCrew.Stats.Status);
    if (ops.currentCrew.Stats.Assignment) strTip += "<br><b>Current Assignment:</b><br>" + sanitizeHTML(ops.currentCrew.Stats.Assignment);
    $("#" + ops.currentCrew.Background.Kerbal).html("<img src='" + sanitizeHTML(ops.currentCrew.Stats.Image) + "' class='tip' data-tipped-options=\"position: 'bottom', target: 'mouse'\" style='width: 235px; cursor: pointer' title='" + strTip + "'>");
    
    // remove the current loaded crew
    if (ops.currentCrew) {
      ops.currentCrew.Ribbons.length = 0;
      ops.currentCrew.Missions.length = 0;
      ops.currentCrew = null;
    }
  
    // call for another?
    var strCrewID = showFullRoster();
    if (strCrewID) loadDB("loadCrewData.asp?db=" + strCrewID + "&ut=" + currUT(), loadCrewAJAX);
  
  // individual crew page
  } else {
    crewHeaderUpdate();
    crewInfoUpdate();
    CrewMissionsUpdate();
    crewStatusUpdate();
    crewAssignmentUpdate();
    crewRibbonsUpdate();
    crewActiveMissionUpdate();

    // service length determined by deactivation?
    var strDeactiveTipOpen = "";
    var strDeactiveTipClose = "";
    if (ops.currentCrew.Background.Deactivation) {
      var serviceEnd = parseInt(ops.currentCrew.Background.Deactivation.split(";")[0]);
      strDeactiveTipOpen = "<u><span style='cursor:help' class='tip' data-tipped-options=\"position: 'top'\" title='" + ops.currentCrew.Background.Deactivation.split(";")[1] + " on " + UTtoDateTime(serviceEnd).split("@")[0] + "'>";
      strDeactiveTipClose = "</span></u>";
    } else var serviceEnd = currUT();
    
    // activation date
    var minutes = 60;
    var hours = minutes * 60;
    var days = hours * 24;
    var years = days * 365;
    var service = (serviceEnd - ops.currentCrew.Background.Activation) / years;
    $("#dataField0").html("<b>Activation Date:</b> " + UTtoDateTime(ops.currentCrew.Background.Activation).split("@")[0] + " (" + strDeactiveTipOpen + "Service Years: " + numeral(service).format('0.00') + strDeactiveTipClose + ")");
    $("#dataField0").fadeIn();
    
    // hide the rest of the fields
    $("#dataField13").fadeOut();
    $("#dataField14").fadeOut();
    $("#dataField15").fadeOut();
    $("#dataField16").fadeOut();
    
    // setup the twitter timeline
    swapTwitterSource('Crew Feed', ops.currentCrew.Background.Timeline);
  }

  // create any tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) showOpt = 'click';
  else showOpt = 'mouseenter';
  
  // Clean up old tooltips before creating new ones to prevent memory leaks
  try {
    Tipped.remove('.tip');
    Tipped.remove('.tip-update');
  } catch (error) {
    // Ignore errors if tooltips don't exist yet
  }
  
  Tipped.create('.tip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), hideOn: {element: 'mouseleave'} });
  Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
}

// returns the next crew member in the full roster that needs to be loaded
// matches the current menu sorting option for crew
function showFullRoster() {
  var crewID = crewList.shift();
  if (crewID) {

    // make a new crew card entry and start the spinner to show data is being fetched
    $("#fullRoster").append("<div id='" + crewID + "' class='crewCard' onclick=\"swapContent('crew', '" + crewID + "')\"></div>&nbsp;");
    $("#" + crewID).spin({ scale: 0.5, position: 'relative', top: '50%', left: '50%' });
  }
  return crewID;
}

function ribbonDisplayToggle(display = false) {
  $("#dataField11").empty();
  $("#dataField11").html("<span ribbons=" + ops.currentCrew.Ribbons.length + "></span>");
  if ($("#dataField12").html().includes("Show") && !display) {
    $("#dataField12").empty();
    ops.currentCrew.Ribbons.forEach(function(item) {
      $("#dataField11").append("<img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'>");
    });
    $("#dataField12").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Hide Multiple Ribbons</span></center>");
  
  // use of display parameter is to force a show of ribbons upon initial crew load or crew update
  } else if ($("#dataField12").html().includes("Hide") || display) {
    $("#dataField12").empty();
    ops.currentCrew.Ribbons.forEach(function(item) {
    
      // only show this ribbon if it has not been supersceded by a later one
      if (!item.Override || (item.Override && item.Override > currUT())) {
        $("#dataField11").append("<img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'>");
      } else {
        $("#dataField12").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Show All Ribbons</span></center>");
      }
    });
  }

  // only show the option to toggle hidden ribbons if text exists to do so
  if ($("#dataField12").html().length) $("#dataField12").fadeIn();
  else $("#dataField12").fadeOut();

  // create any tooltips
  // behavior of tooltips depends on the device
  if (is_touch_device()) showOpt = 'click';
  else showOpt = 'mouseenter';
  
  // Clean up old tooltip before creating new one to prevent memory leaks
  try {
    Tipped.remove('.tip');
  } catch (error) {
    // Ignore errors if tooltip doesn't exist yet
  }
  
  Tipped.create('.tip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), hideOn: {element: 'mouseleave'} });
}

function updateCrewData(crew) {

  // perform a live data update if we are looking at the crew in question at the moment
  if (ops.pageType == "crew" && ops.currentCrew.Background.Kerbal == crew.id) {

    // hide any open tooltips
    Tipped.remove('.tipped');
    
    // update the current data with the preloaded updated data
    // we do this regardless of whether the crew page is in view so that the full roster tooltips are updated
    for (var futureProp in crew.FutureData) {
      for (var prop in ops.currentCrew) {
      
        // only update data that exists and is current for this time 
        if (futureProp == prop && crew.FutureData[futureProp] && crew.FutureData[futureProp].UT <= currUT()) {
          
          // only history and info are classes that can be copied
          // missions and ribbons need to be pushed into the existing array
          if (Array.isArray(ops.currentCrew[prop])) ops.currentCrew[prop].unshift(crew.FutureData[futureProp]);
          else ops.currentCrew[prop] = crew.FutureData[futureProp];
        }
      }
    }

    crewHeaderUpdate(true);
    crewInfoUpdate(true);
    CrewMissionsUpdate(true);
    crewStatusUpdate(true);
    crewAssignmentUpdate(true);
    crewActiveMissionUpdate(true);
    crewRibbonsUpdate(true);
    
    // create the tooltips
    // behavior of tooltips depends on the device
    if (is_touch_device()) showOpt = 'click';
    else showOpt = 'mouseenter';
    
    // Clean up old tooltips before creating new ones to prevent memory leaks
    try {
      Tipped.remove('.tip');
      Tipped.remove('.tip-update');
    } catch (error) {
      // Ignore errors if tooltips don't exist yet
    }
    
    Tipped.create('.tip', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
    Tipped.create('.tip-update', { showOn: showOpt, hideOnClickOutside: is_touch_device(), detach: false, hideOn: {element: 'mouseleave'} });
  }

  // update the menu data so tooltips and re-sorting are accurate
  var crewMenuObj = ops.crewMenu.find(o => o.db === crew.id);
  crewMenuObj.assignment = crew.FutureData.Stats.Assignment;
  crewMenuObj.rank = crew.FutureData.Stats.Rank;
  crewMenuObj.status = crew.FutureData.Stats.Status;
  filterCrewMenu($("input[name=roster]").filter(":checked").val());
  w2ui['menu'].refresh();

  // scroll selection back into view?
  if (ops.currentCrew) selectMenuItem(ops.currentCrew.Background.Kerbal);

  // fetch new future data. Add a second just to make sure we don't get the same current data
  crew.isLoading = true;
  loadDB("loadOpsData.asp?db=" + crew.id + "&UT=" + (currUT()+1) + "&type=" + crew.type + "&pastUT=NaN", loadOpsDataAJAX);
}

function crewHeaderUpdate(update) {
  if (update && !$("#contentHeader").html().includes(ops.currentCrew.Stats.Rank)) flashUpdate("#contentHeader", "#77C6FF", "#FFF");
  $("#contentHeader").html(sanitizeHTML(ops.currentCrew.Stats.Rank) + " " + sanitizeHTML(ops.currentCrew.Background.FullName) + " Kerman");
  document.title = "KSA Operations Tracker" + " - " + sanitizeHTML(ops.currentCrew.Stats.Rank) + " " + sanitizeHTML(ops.currentCrew.Background.FullName) + " Kerman";

  // for tag loading
  // $("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (crew.width('bold 32px arial')/2)) + 10) +'px' });
}

function crewInfoUpdate(update) {

  // basic setups
  $("#infoImg").html("<img src='" + sanitizeHTML(ops.currentCrew.Stats.Image) + "'>");
  $("#infoTitle").html("Click Here for Background Information");
  $("#infoTitle").attr("class", "infoTitle crew");
  $("#infoDialog").dialog("option", "title", "Background Information");
  $("#infoDialog").dialog("option", {width: 490, height: 600});
  $("#partsImg").empty();

  // if there is a change in bio/service record and the dialog is not open, flash the title
  if (update && !$("#infoDialog").dialog("isOpen") && (!$("#infoDialog").html().includes(ops.currentCrew.Background.Bio) || !$("#infoDialog").html().includes(ops.currentCrew.History.History))) flashUpdate("#infoTitle", "#77C6FF", "#000");
  
  // compose the background information
  // get the date of the birthday to display in MM/DD/YYYY format and also age calculation
  // if crew is deceased, the current date becomes the date they died so their age remains static
  if (ops.currentCrew.Background.Deactivation && ops.currentCrew.Background.Deactivation.includes("Deceased")) {
    var currDate = foundingMoment + (parseInt(ops.currentCrew.Background.Deactivation.split(";")[0]) * 1000)
    var strAge = " (Age at Death: ";
  } else {
    var currDate = Date.now()
    var strAge = " (Current Age: ";
  }
  var bday = new Date(ops.currentCrew.Background.BirthDate);
  var minutes = 1000 * 60;
  var hours = minutes * 60;
  var days = hours * 24;
  var years = days * 365.2422;
  var age = (currDate - bday.getTime()) / years;
  var strBackgrnd = "<b>Birth Date:</b> " + (bday.getUTCMonth() + 1) + "/" + bday.getUTCDate() + "/" + bday.getUTCFullYear() + strAge + numeral(age).format('0.00') + ")";
  
  // family name with help icon for more info
  strBackgrnd += "<p><b>Family Name:</b> " + ops.currentCrew.Background.FamName + "&nbsp;<img src='qmark.png' style='margin-bottom: 10px; left: initial; cursor: help' class='tip' data-tipped-options=\"position: 'right', maxWidth: 135\" title='as a show of global unity, all adult kerbals take the surname of the first planetary leader'></p>";
  
  // rest of the bio stuff
  strBackgrnd += "<p><b>Specialty:</b> " + sanitizeHTML(ops.currentCrew.Background.Speciality) + "</p><p><b>Hobbies:</b> " + sanitizeHTML(ops.currentCrew.Background.Hobbies) + "</p><p><b>Biography:</b> " + sanitizeHTML(ops.currentCrew.Background.Bio) + "</p><p><b>Service History:</b> " + sanitizeHTML(ops.currentCrew.History.History) + "</p>";
  $("#infoDialog").html(strBackgrnd);
}

function CrewMissionsUpdate(update) {

  // completed missions
  if (update && !$("#dataField1").html().includes(ops.currentCrew.Missions.length)) {
    flashUpdate("#dataField1", "#77C6FF", "#FFF");
    flashUpdate("#dataField10", "#77C6FF", "#FFF");
  }
  $("#dataField1").html("<b>Completed Missions:</b> " + ops.currentCrew.Missions.length);
  $("#dataField1").fadeIn();
  
  // mission days
  if (update && !$("#dataField3").html().includes(ops.currentCrew.Stats.TMD)) flashUpdate("#dataField3", "#77C6FF", "#FFF");
  $("#dataField3").html("<b>Total Mission Days:</b> " + ops.currentCrew.Stats.TMD);
  $("#dataField3").fadeIn();
  
  // docking operations?
  if (ops.currentCrew.Stats.Dockings) {
    if (update && !$("#dataField2").html().includes(ops.currentCrew.Stats.Dockings)) flashUpdate("#dataField2", "#77C6FF", "#FFF");
    $("#dataField2").html("<b>Docking Operations:</b> " + ops.currentCrew.Stats.Dockings);
    $("#dataField2").fadeIn();
  } else $("#dataField2").fadeOut();
  
  // EVA time?
  if (ops.currentCrew.Stats.TEVA) {
    if (update && !$("#dataField4").html().includes(ops.currentCrew.Stats.TEVA)) flashUpdate("#dataField4", "#77C6FF", "#FFF");
    $("#dataField4").html("<b>Total EVA Time:</b> " + ops.currentCrew.Stats.TEVA);
    $("#dataField4").fadeIn();
  } else $("#dataField4").fadeOut();

  // science collection?
  if (ops.currentCrew.Stats.Science) {
    if (update && !$("#dataField5").html().includes(ops.currentCrew.Stats.Science)) flashUpdate("#dataField5", "#77C6FF", "#FFF");
    $("#dataField5").html("<b>Total Science Collected:</b> " + ops.currentCrew.Stats.Science);
    $("#dataField5").fadeIn();
  } else $("#dataField5").fadeOut();

  // distance traveled?
  if (ops.currentCrew.Stats.Distance) {
    if (update && !$("#dataField6").html().includes(numeral(ops.currentCrew.Stats.Distance).format('0,0.000'))) flashUpdate("#dataField6", "#77C6FF", "#FFF");
    $("#dataField6").html("<b>Total Mission Distance Traveled:</b> " + numeral(ops.currentCrew.Stats.Distance).format('0,0.000') + "km");
    $("#dataField6").fadeIn();
  } else $("#dataField6").fadeOut();

  // mission list
  $("#dataField10").html("<b>Past Missions: </b><select id='missionSelect' style='width: 335px'><option value='' selected='selected'></option></select>");
  $("#dataField10").fadeIn();
  if (ops.currentCrew.Missions.length) {
    ops.currentCrew.Missions.forEach(function(item) {
      $("#missionSelect").append($('<option>', {
        value: item.Link,
        text: item.Title
      }));
    });
  } else $("#missionSelect").append($('<option>', { value: '', text: 'No Missions Yet Completed' }));
  $("#missionSelect").change(function () {
    if ($("#missionSelect").val()) window.open($("#missionSelect").val());
  });
}

// use of saveTip attribute is so match can be made when update check runs since Tipped removes text from the title attribute
function crewStatusUpdate(update) {
  if (update && (!$("#dataField7").html().includes(ops.currentCrew.Stats.StatusHTML) || !$("#dataField7").html().includes(ops.currentCrew.Stats.Status))) flashUpdate("#dataField7", "#77C6FF", "#FFF");
  $("#dataField7").html("<b>Current Status:</b> <u><span style='cursor:help' class='tip' data-tipped-options=\"maxWidth: 250, position: 'top'\" title='" + sanitizeHTML(ops.currentCrew.Stats.StatusHTML) + "' saveTip='" + sanitizeHTML(ops.currentCrew.Stats.AssignmentHTML) + "'>" + sanitizeHTML(ops.currentCrew.Stats.Status) + "</span></u>");
  $("#dataField7").fadeIn();
}

// use of saveTip attribute is so match can be made when update check runs since Tipped removes text from the title attribute
function crewAssignmentUpdate(update) {
  if (ops.currentCrew.Stats.Assignment) {
    if (update && (!$("#dataField8").html().includes(ops.currentCrew.Stats.AssignmentHTML) || !$("#dataField8").html().includes(ops.currentCrew.Stats.Assignment))) flashUpdate("#dataField8", "#77C6FF", "#FFF");
    $("#dataField8").html("<b>Current Assignment:</b> <u><span style='cursor:help' class='tip' data-tipped-options=\"maxWidth: 350, position: 'top'\" title='" + sanitizeHTML(ops.currentCrew.Stats.AssignmentHTML) + "' saveTip='" + sanitizeHTML(ops.currentCrew.Stats.AssignmentHTML) + "'>" + sanitizeHTML(ops.currentCrew.Stats.Assignment) + "</span></u>");
    $("#dataField8").fadeIn();
  } else $("#dataField8").fadeOut();
}

function crewActiveMissionUpdate(update) {
  if (ops.currentCrew.Stats.Vessel) {
    if (update && ((!$("#dataField9").html().includes(ops.currentCrew.Stats.Vessel)) || ($("#dataField9").html().includes("tip-update") && !ops.currentCrew.Stats.MissionStart) || (!$("#dataField9").html().includes("tip-update") && ops.currentCrew.Stats.MissionStart))) flashUpdate("#dataField9", "#77C6FF", "#FFF");
    var crewVessel = ops.craftsMenu.find(o => o.db === ops.currentCrew.Stats.Vessel);
    if (ops.currentCrew.Stats.MissionStart > currUT()) {
      var strHTML = "<b>Future Mission Vessel:</b> <u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'crewMissionTip'\">";
      $("#crewMissionTip").html("Time to mission: <span data='" + ops.currentCrew.Stats.MissionStart + "' id='crewCountdown'>" + formatTime(ops.currentCrew.Stats.MissionStart-currUT()) + "</span>");
    } else {
      var strHTML = "<b>Current Mission Vessel:</b> <u><span style='cursor:help' class='tip-update' data-tipped-options=\"inline: 'crewMissionTip'\">";
      $("#crewMissionTip").html("Mission elapsed time: <span data='" + ops.currentCrew.Stats.MissionStart + "' id='crewCountdown'>" + formatTime(currUT()-ops.currentCrew.Stats.MissionStart) + "</span>");
    }
    strHTML += "<span class='fauxLink' onclick=\"swapContent('vessel','" + ops.currentCrew.Stats.Vessel + "')\">";
    strHTML += crewVessel.name + "</span></span></u>";
    $("#dataField9").html(strHTML);
    $("#dataField9").fadeIn();
  } else {
    $("#dataField9").empty();
    $("#dataField9").fadeOut();
  }
}

function crewRibbonsUpdate(update) {
  if (ops.currentCrew.Ribbons.length) {
    if (update && !$("#dataField11").html().includes('ribbons="' + ops.currentCrew.Ribbons.length)) flashUpdate("#dataField11", "#77C6FF", "#FFF");
    ribbonDisplayToggle(true)
  } else { $("#dataField11").html("<center>No Ribbons Yet Awarded</center>"); }
  $("#dataField11").fadeIn();
}