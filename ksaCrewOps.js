// refactor complete
// SECURITY: All user-supplied data from database is sanitized with sanitizeHTML()
// before insertion into DOM to prevent XSS attacks. Use sanitizeHTML() for any
// new code that inserts database content into HTML.

function loadCrew(crew) {
  
  // make sure the menu data is loaded before continuing
  if (!KSA_UI_STATE.isMenuSorted) return setTimeout(loadCrew, 50, crew);

  // Clear all certificate icons when loading a new crew member
  $('.change-indicator').remove();

  // modify the history so people can page back/forward
  // if this is the first page to load, replace the current history
  if (!history.state) {
    if (window.location.href.includes("&")) var strURL = window.location.href;
    else var strURL = "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + crew;
    history.replaceState({type: ops.pageType, id: crew}, document.title, strURL.replace("&live", "").replace("&reload", ""));
    
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

  // we know the menu is sorted so shortcut the check and find out if this crew member is in the menu
  // if they are they will be selected but if not then the full roster will be loaded instead
  if (ops.pageType == "crew" && !selectMenuItem(crew, 25)) {
    swapContent("crewFull", "crewFull");
    return
  }

  // load the data depending on our view
  $("#contentHeader").spin(false);
  $("#tags").fadeIn();
  if (ops.pageType == "crewFull") {
    $("#contentTitle").html("Full Roster");
    document.title = "KSA Operations Tracker - Full Roster";
    $("#fullRoster").empty();
    
    // get the full crew listing and start to show them all
    KSA_CATALOGS.crewList = extractIDs(w2ui['menu'].get('crew').nodes).split(";");
    loadDB("loadCrewData.asp?db=" + showFullRoster() + "&ut=" + currUT(), loadCrewAJAX);
  } else {

    // find the crew in the menu data
    var crewMenuObj = ops.crewMenu.find(o => o.db === crew);
    $("#contentTitle").html(sanitizeHTML(crewMenuObj.rank) + " " + sanitizeHTML(crewMenuObj.name) + " Kerman");
    document.title = "KSA Operations Tracker" + " - " + sanitizeHTML(crewMenuObj.rank) + " " + sanitizeHTML(crewMenuObj.name) + " Kerman";

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
    if (ops.currentCrew.Background.Deactivation && parseInt(ops.currentCrew.Background.Deactivation.split(";")[0]) < currUT()) {
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

    // Hash activation date and deactivation info (which affects service years and tooltip)
    addChangeIndicator("#dataField0", ops.currentCrew.Background.Kerbal, "Activation", ops.currentCrew.Background.Activation + '|' + (ops.currentCrew.Background.Deactivation || ''));
    
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
  
  Tipped.create('.tip', { 
    showOn: showOpt, 
    hideOnClickOutside: is_touch_device(), 
    hideOn: {element: 'mouseleave'},
    onShow: function(content, element) {
      // Remove change indicator from the parent dataField when tooltip is shown
      $(element).closest('[id^="dataField"]').find('.change-indicator').animate({
        opacity: 0,
        right: '-20px'
      }, 300, function() {
        $(this).remove();
      });
    }
  });
  Tipped.create('.tip-update', { 
    showOn: showOpt, 
    hideOnClickOutside: is_touch_device(), 
    detach: false, 
    hideOn: {element: 'mouseleave'},
    onShow: function(content, element) {
      // Remove change indicator from the parent dataField when tooltip is shown
      $(element).closest('[id^="dataField"]').find('.change-indicator').animate({
        opacity: 0,
        right: '-20px'
      }, 300, function() {
        $(this).remove();
      });
    }
  });
}

// returns the next crew member in the full roster that needs to be loaded
// matches the current menu sorting option for crew
function showFullRoster() {
  var crewID = KSA_CATALOGS.crewList.shift();
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
      const ribbonId = 'ribbon_' + item.Ribbon.replace(/[^a-zA-Z0-9]/g, '_') + '_' + item.UT;
      $("#dataField11").append("<div class='ribbon-wrapper' style='display: inline-block; position: relative;' id='" + ribbonId + "'><img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip ribbon-img' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'></div>");
    });
    $("#dataField12").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Hide Multiple Ribbons</span></center>");
  
  // use of display parameter is to force a show of ribbons upon initial crew load or crew update
  } else if ($("#dataField12").html().includes("Hide") || display) {
    $("#dataField12").empty();
    ops.currentCrew.Ribbons.forEach(function(item) {
    
      // only show this ribbon if it has not been supersceded by a later one
      if (!item.Override || (item.Override && item.Override > currUT())) {
        const ribbonId = 'ribbon_' + item.Ribbon.replace(/[^a-zA-Z0-9]/g, '_') + '_' + item.UT;
        $("#dataField11").append("<div class='ribbon-wrapper' style='display: inline-block; position: relative;' id='" + ribbonId + "'><img src='http://www.blade-edge.com/Roster/Ribbons/" + item.Ribbon + ".png' width='109px' class='tip ribbon-img' style='cursor: help' data-tipped-options=\"maxWidth: 150, position: 'top'\" title='<center>" + item.Title + "<hr>" + item.Desc + "<hr>Earned on " + UTtoDateTime(item.UT).split("@")[0].trim() + "</center>'></div>");
      } else {
        $("#dataField12").html("<center><span class='fauxLink' onclick='ribbonDisplayToggle()'>Show All Ribbons</span></center>");
      }
    });
  }

  // Apply indicators to any unseen ribbons from localStorage
  applyUnseenRibbonIndicators();

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
  
  Tipped.create('.tip', { 
    showOn: showOpt, 
    hideOnClickOutside: is_touch_device(), 
    hideOn: {element: 'mouseleave'},
    onShow: function(content, element) {
      // Remove change indicator from the parent dataField when tooltip is shown
      $(element).closest('[id^="dataField"]').find('.change-indicator').animate({
        opacity: 0,
        right: '-20px'
      }, 300, function() {
        $(this).remove();
      });
    }
  });
}

// Apply indicators to ribbons that haven't been seen yet and setup hover handlers
function applyUnseenRibbonIndicators() {
  if (!ops.currentCrew) return;
  
  const itemId = ops.currentCrew.Background.Kerbal;
  const isTemporary = KSA_UI_STATE.isLivePastUT;
  const storageKey = isTemporary ? `ksaOps_hashes_temp_${itemId}` : `ksaOps_hashes_${itemId}`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) return;
  
  const hashes = JSON.parse(stored);
  const unseenRibbons = hashes.UnseenRibbons || [];
  
  if (unseenRibbons.length === 0) return;
  
  // Add indicators to unseen ribbons that are currently visible in the DOM
  unseenRibbons.forEach(function(ribbonKey) {
    const ribbonId = '#ribbon_' + ribbonKey.replace(/[^a-zA-Z0-9]/g, '_');
    const $ribbon = $(ribbonId);
    
    // Only add if element exists and doesn't already have an indicator
    if ($ribbon.length && !$ribbon.find('.ribbon-new-indicator').length) {
      const indicator = '<i class="fa-solid fa-certificate fa-1xs fa-beat ribbon-new-indicator" style="position: absolute; left: 46px; bottom: 7px; color: #FFD800; pointer-events: none;"></i>';
      $ribbon.append(indicator);
    }
  });
  
  // Setup hover handler to remove from unseen list and hide indicator
  $('.ribbon-img').off('mouseenter.ribbonIndicator').on('mouseenter.ribbonIndicator', function() {
    const $wrapper = $(this).parent();
    const wrapperId = $wrapper.attr('id');
    
    // Convert DOM id back to ribbon key format
    // DOM id: ribbon_programs_genesis_2937600 -> key: programs\genesis_2937600
    if (wrapperId && wrapperId.startsWith('ribbon_')) {
      // Remove from unseen list in localStorage
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const hashes = JSON.parse(stored);
        if (hashes.UnseenRibbons) {
          // Find and remove any matching ribbon key (need to match by reconstructing possible keys)
          const idPart = wrapperId.substring(7); // Remove 'ribbon_' prefix
          hashes.UnseenRibbons = hashes.UnseenRibbons.filter(key => {
            const keyAsId = key.replace(/[^a-zA-Z0-9]/g, '_');
            return keyAsId !== idPart;
          });
          
          if (hashes.UnseenRibbons.length === 0) {
            delete hashes.UnseenRibbons;
          }
          localStorage.setItem(storageKey, JSON.stringify(hashes));
        }
      }
    }
    
    // Fade out and remove the indicator
    $(this).siblings('.ribbon-new-indicator').fadeOut(200, function() { $(this).remove(); });
  });
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
          // missions need to be placed at the front, ribbons at the end
          if (Array.isArray(ops.currentCrew[prop])) {
            if (prop === "Missions") {
              ops.currentCrew[prop].unshift(crew.FutureData[futureProp]);
            } else if (prop === "Ribbons") {
              ops.currentCrew[prop].push(crew.FutureData[futureProp]);
            }
          }
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
    
    Tipped.create('.tip', { 
      showOn: showOpt, 
      hideOnClickOutside: is_touch_device(), 
      detach: false, 
      hideOn: {element: 'mouseleave'},
      onShow: function(content, element) {
        // Remove change indicator from the parent dataField when tooltip is shown
        $(element).closest('[id^="dataField"]').find('.change-indicator').animate({
          opacity: 0,
          right: '-20px'
        }, 300, function() {
          $(this).remove();
        });
      }
    });
    Tipped.create('.tip-update', { 
      showOn: showOpt, 
      hideOnClickOutside: is_touch_device(), 
      detach: false, 
      hideOn: {element: 'mouseleave'},
      onShow: function(content, element) {
        // Remove change indicator from the parent dataField when tooltip is shown
        $(element).closest('[id^="dataField"]').find('.change-indicator').animate({
          opacity: 0,
          right: '-20px'
        }, 300, function() {
          $(this).remove();
        });
      }
    });
  }

  // update the menu data so tooltips and re-sorting are accurate
  // make note if the menu needs to be re-sorted
  var crewMenuObj = ops.crewMenu.find(o => o.db === crew.id);
  if (crewMenuObj.status != crew.FutureData.Stats.Status || 
      crewMenuObj.assignment != crew.FutureData.Stats.Assignment || 
      crewMenuObj.rank != crew.FutureData.Stats.Rank) crewMenuObj.needsSorting = true;
  crewMenuObj.assignment = crew.FutureData.Stats.Assignment;
  crewMenuObj.rank = crew.FutureData.Stats.Rank;
  crewMenuObj.status = crew.FutureData.Stats.Status;

  // fetch new future data. Add a second just to make sure we don't get the same current data
  crew.isLoading = true;
  loadDB("loadOpsData.asp?db=" + crew.id + "&UT=" + (currUT()+1) + "&type=" + crew.type + "&pastUT=NaN", loadOpsDataAJAX, {isRealTimeUpdate: true, id: crew.id});
}

function crewHeaderUpdate(update) {

  // only bother if this is a change because the header is set before data load
  if (update && !$("#contentTitle").html().includes(ops.currentCrew.Stats.Rank)) {
    flashUpdate("#contentHeader", "#77C6FF", "#FFF");
    $("#contentTitle").html(sanitizeHTML(ops.currentCrew.Stats.Rank) + " " + sanitizeHTML(ops.currentCrew.Background.FullName) + " Kerman");
    document.title = "KSA Operations Tracker" + " - " + sanitizeHTML(ops.currentCrew.Stats.Rank) + " " + sanitizeHTML(ops.currentCrew.Background.FullName) + " Kerman";
    addChangeIndicator("#contentTitle", ops.currentCrew.Background.Kerbal, "Rank", ops.currentCrew.Stats.Rank);
  }
}

function crewInfoUpdate(update) {

  // basic setups
  $("#infoImg").html("<img src='" + sanitizeHTML(ops.currentCrew.Stats.Image) + "'>");
  $("#infoTitle").html("Click Here for Background Information");
  $("#infoTitle").attr("class", "infoTitle crew");
  $("#infoDialog").dialog("option", "title", "Background Information");
  $("#infoDialog").dialog("option", {width: 490, height: 600});
  $("#partsImg").empty();

  // compose the background information
  // get the date of the birthday to display in MM/DD/YYYY format and also age calculation
  // if crew is deceased, the current date becomes the date they died so their age remains static
  if (ops.currentCrew.Background.Deactivation && parseInt(ops.currentCrew.Background.Deactivation.split(";")[0]) < currUT() && ops.currentCrew.Background.Deactivation.includes("Deceased")) {
    var currDate = KSA_CONSTANTS.FOUNDING_MOMENT + (parseInt(ops.currentCrew.Background.Deactivation.split(";")[0]) * 1000)
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
  strBackgrnd += "<p><b>Specialty:</b> " + sanitizeHTML(ops.currentCrew.Background.Speciality) + "</p><p><b>Hobbies:</b> " + sanitizeHTML(ops.currentCrew.Background.Hobbies) + "</p><p><b>Biography:</b> " + ops.currentCrew.Background.Bio + "</p><p><b>Service History:</b> " + ops.currentCrew.History.History + "</p>";
  $("#infoDialog").html(strBackgrnd);
  
  // Handle change detection for background info
  // Hash only the static content (Bio and History) - NOT the full strBackgrnd which includes
  // dynamically calculated age that changes every page load
  const itemId = ops.currentCrew.Background.Kerbal;
  const isTemporary = KSA_UI_STATE.isLivePastUT;
  const storageKey = isTemporary ? `ksaOps_hashes_temp_${itemId}` : `ksaOps_hashes_${itemId}`;
  const stored = localStorage.getItem(storageKey);
  const staticContent = ops.currentCrew.Background.Bio + '|' + ops.currentCrew.History.History;
  const currentHash = hashContent(staticContent);
  
  if (!stored) {
    // First time - save without indicator
    const hashes = { BackgroundInfo: currentHash };
    localStorage.setItem(storageKey, JSON.stringify(hashes));
  } else {
    const hashes = JSON.parse(stored);
    
    if (!hashes.BackgroundInfo) {
      // First time seeing background info - save without indicator
      hashes.BackgroundInfo = currentHash;
      localStorage.setItem(storageKey, JSON.stringify(hashes));
    } else if (hashes.BackgroundInfo !== currentHash) {
      // Content has changed - update hash AND show indicator (only if dialog is closed)
      hashes.BackgroundInfo = currentHash;
      localStorage.setItem(storageKey, JSON.stringify(hashes));
      
      // Add white certificate icon inline to the right (no-hover since dialog handles dismissal)
      // Don't show indicator if dialog is already open - user is already viewing the content
      if (!$("#infoDialog").dialog("isOpen")) {
        const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator no-hover" style="color: #FFFFFF; margin-left: 8px; cursor: pointer;" title="Background information updated since last visit"></i>';
        $("#infoTitle").append(icon);
      }
    }
  }
  
  // Setup handler to remove indicator when dialog is opened
  $("#infoDialog").off('dialogopen.crewInfo').on('dialogopen.crewInfo', function() {
    $('#infoTitle .change-indicator').fadeOut(200, function() { 
      $(this).remove();
      
      // Update the hash so it won't show again
      const hashes = JSON.parse(localStorage.getItem(storageKey) || '{}');
      hashes.BackgroundInfo = currentHash;
      localStorage.setItem(storageKey, JSON.stringify(hashes));
    });
  });

  // if there is a change in bio/service record (indicated by icon presence), flash the title
  if (update && $("#infoTitle .change-indicator").length) flashUpdate("#infoTitle", "#77C6FF", "#000");
}

function CrewMissionsUpdate(update) {

  // completed missions
  $("#dataField1").html("<b>Completed Missions:</b> " + ops.currentCrew.Missions.length);
  $("#dataField1").fadeIn();
  if (addChangeIndicator("#dataField1", ops.currentCrew.Background.Kerbal, "Missions", ops.currentCrew.Missions.length) && update) {
    flashUpdate("#dataField1", "#77C6FF", "#FFF");
    flashUpdate("#dataField10", "#77C6FF", "#FFF");
  }
  
  // mission days
  $("#dataField3").html("<b>Total Mission Days:</b> " + ops.currentCrew.Stats.TMD);
  $("#dataField3").fadeIn();
  if (addChangeIndicator("#dataField3", ops.currentCrew.Background.Kerbal, "TMD", ops.currentCrew.Stats.TMD) && update) flashUpdate("#dataField3", "#77C6FF", "#FFF");
  
  // docking operations?
  if (ops.currentCrew.Stats.Dockings) {
    $("#dataField2").html("<b>Docking Operations:</b> " + ops.currentCrew.Stats.Dockings);
    $("#dataField2").fadeIn();
    if (addChangeIndicator("#dataField2", ops.currentCrew.Background.Kerbal, "Dockings", ops.currentCrew.Stats.Dockings) && update) flashUpdate("#dataField2", "#77C6FF", "#FFF");
  } else $("#dataField2").fadeOut();
  
  // EVA time?
  if (ops.currentCrew.Stats.TEVA) {
    $("#dataField4").html("<b>Total EVA Time:</b> " + ops.currentCrew.Stats.TEVA);
    $("#dataField4").fadeIn();
    if (addChangeIndicator("#dataField4", ops.currentCrew.Background.Kerbal, "TEVA", ops.currentCrew.Stats.TEVA) && update) flashUpdate("#dataField4", "#77C6FF", "#FFF");
  } else $("#dataField4").fadeOut();

  // science collection?
  if (ops.currentCrew.Stats.Science) {
    $("#dataField5").html("<b>Total Science Collected:</b> " + ops.currentCrew.Stats.Science);
    $("#dataField5").fadeIn();
    if (addChangeIndicator("#dataField5", ops.currentCrew.Background.Kerbal, "Science", ops.currentCrew.Stats.Science) && update) flashUpdate("#dataField5", "#77C6FF", "#FFF");
  } else $("#dataField5").fadeOut();

  // distance traveled?
  if (ops.currentCrew.Stats.Distance) {
    var formattedDistance = numeral(ops.currentCrew.Stats.Distance).format('0,0.000');
    $("#dataField6").html("<b>Total Mission Distance Traveled:</b> " + formattedDistance + "km");
    $("#dataField6").fadeIn();
    if (addChangeIndicator("#dataField6", ops.currentCrew.Background.Kerbal, "Distance", formattedDistance) && update) flashUpdate("#dataField6", "#77C6FF", "#FFF");
  } else $("#dataField6").fadeOut();

  // mission list
  $("#dataField10").html("<b>Past Missions: </b><select id='missionSelect' style='width: 335px'><option value='' selected='selected'></option></select>");
  $("#dataField10").fadeIn();
  
  // Handle mission change detection
  const itemId = ops.currentCrew.Background.Kerbal;
  const isTemporary = KSA_UI_STATE.isLivePastUT;
  const storageKey = isTemporary ? `ksaOps_hashes_temp_${itemId}` : `ksaOps_hashes_${itemId}`;
  const stored = localStorage.getItem(storageKey);
  
  let newMissions = [];
  
  if (ops.currentCrew.Missions.length) {
    // Get the most recent (top) mission as reference
    const topMission = ops.currentCrew.Missions[0];
    const topMissionKey = topMission.Link + '_' + topMission.Title;
    const currentHash = hashContent(topMissionKey);
    let topMissionChanged = false;
    
    if (!stored) {
      // First time - save without indicators
      const hashes = { TopMission: currentHash, TopMissionKey: topMissionKey };
      localStorage.setItem(storageKey, JSON.stringify(hashes));
    } else {
      const hashes = JSON.parse(stored);
      
      if (!hashes.TopMission) {
        // First time seeing missions - save without indicators
        hashes.TopMission = currentHash;
        hashes.TopMissionKey = topMissionKey;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
      } else if (hashes.TopMission !== currentHash) {
        // Top mission changed - find all new missions above the old top one
        const oldTopMissionKey = hashes.TopMissionKey;
        for (let i = 0; i < ops.currentCrew.Missions.length; i++) {
          const missionKey = ops.currentCrew.Missions[i].Link + '_' + ops.currentCrew.Missions[i].Title;
          if (missionKey === oldTopMissionKey) break;
          newMissions.push(ops.currentCrew.Missions[i].Link);
        }
        // Merge new unread missions with any existing ones
        let mergedUnread = newMissions;
        if (hashes.NewMissions && Array.isArray(hashes.NewMissions)) {
          mergedUnread = [...new Set([...hashes.NewMissions, ...newMissions])];
        }
        // Update to new top mission
        hashes.TopMission = currentHash;
        hashes.TopMissionKey = topMissionKey;
        hashes.NewMissions = mergedUnread;
        newMissions = mergedUnread;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
        topMissionChanged = true;
      } else {
        // No change but check if we have stored new missions to display
        if (hashes.NewMissions && hashes.NewMissions.length > 0) {
          newMissions = hashes.NewMissions;
        }
      }
    }
    // Populate the dropdown with bolding for new missions
    ops.currentCrew.Missions.forEach(function(item) {
      const isNew = newMissions.includes(item.Link);
      const optionText = isNew ? '★ ' + item.Title : item.Title;
      const $option = $('<option>', {
        value: item.Link,
        text: optionText
      });
      if (isNew) $option.css('font-weight', 'bold');
      $("#missionSelect").append($option);
    });
    // Add 'Mark All Missions Read' if there are unread missions
    if (newMissions.length > 0) {
      const $markAll = $('<option>', {
        value: '__markAllRead__',
        text: '✔ Mark All Missions Read',
        style: 'font-weight:bold;color:#007bff;'
      });
      $('#missionSelect').prepend($markAll);
    }
    // Add change indicator only if the top mission changed
    if (topMissionChanged) {
      $('#dataField10 .change-indicator').remove();
      if ($('#dataField10').css('position') === 'static') {
        $('#dataField10').css('position', 'relative');
      }
      const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator no-hover" style="color: #000000; cursor: pointer; position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" title="New missions available" data-item-id="' + itemId + '" data-field-id="TopMission"></i>';
      $("#dataField10").append(icon);
    }
  } else {
    $("#missionSelect").append($('<option>', { value: '', text: 'No Missions Yet Completed' }));
  }
  
  // Setup handlers
  $("#missionSelect").off('focus.missionIndicator').on('focus.missionIndicator', function() {
    // Clear indicator when dropdown is opened
    $('#dataField10 .change-indicator').animate({
      opacity: 0,
      right: '-20px'
    }, 300, function() { $(this).remove(); });
  });
  
  $("#missionSelect").off('change.missionIndicator').on('change.missionIndicator', function () {
    const selectedValue = $("#missionSelect").val();
    if (selectedValue === '__markAllRead__') {
      // Clear all new mission indicators and styling
      const hashes = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (hashes.NewMissions) {
        delete hashes.NewMissions;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
      }
      // Remove bold styling from all options
      $("#missionSelect option").css('font-weight', 'normal').each(function() {
        const text = $(this).text();
        if (text.startsWith('★ ')) {
          $(this).text(text.substring(2));
        }
      });
      // Remove the mark all option
      $(this).find('option[value="__markAllRead__"]').remove();
      // Remove indicator if present
      $('#dataField10 .change-indicator').remove();
      // Reset selection
      $(this).val('');
      return;
    }
    // ...existing code for normal mission selection...
    if (selectedValue) {
      // Remove the selected mission from new missions list
      const hashes = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (hashes.NewMissions) {
        hashes.NewMissions = hashes.NewMissions.filter(m => m !== selectedValue);
        if (hashes.NewMissions.length === 0) {
          delete hashes.NewMissions;
        }
        localStorage.setItem(storageKey, JSON.stringify(hashes));
      }
      
      // Remove bold styling from the selected option
      $("#missionSelect option:selected").css('font-weight', 'normal').each(function() {
        const text = $(this).text();
        if (text.startsWith('★ ')) {
          $(this).text(text.substring(2));
        }
      });
      
      // open the mission in a new window/tab if it is a link
      // otherwise switch to the vessel ID
      if (selectedValue.startsWith("http")) window.open(selectedValue);
      else if (selectedValue.startsWith("flt")) loadFlt(selectedValue.replace("flt=", ""), false);
      else swapContent('vessel', selectedValue);
    }
  });
}

// use of saveTip attribute is so match can be made when update check runs since Tipped removes text from the title attribute
function crewStatusUpdate(update) {
  // Hash both status text and tooltip HTML
  $("#dataField7").html("<b>Current Status:</b> <u><span style='cursor:help' class='tip' data-tipped-options=\"maxWidth: 250, position: 'top'\" title='" + sanitizeHTML(ops.currentCrew.Stats.StatusHTML) + "' saveTip='" + sanitizeHTML(ops.currentCrew.Stats.StatusHTML) + "'>" + sanitizeHTML(ops.currentCrew.Stats.Status) + "</span></u>");
  $("#dataField7").fadeIn();
  if (addChangeIndicator("#dataField7", ops.currentCrew.Background.Kerbal, "Status", ops.currentCrew.Stats.Status + '|' + ops.currentCrew.Stats.StatusHTML) && update) flashUpdate("#dataField7", "#77C6FF", "#FFF");
}

// use of saveTip attribute is so match can be made when update check runs since Tipped removes text from the title attribute
function crewAssignmentUpdate(update) {
  if (ops.currentCrew.Stats.Assignment) {
    // Hash both assignment text and tooltip HTML
    $("#dataField8").html("<b>Current Assignment:</b> <u><span style='cursor:help' class='tip' data-tipped-options=\"maxWidth: 350, position: 'top'\" title='" + sanitizeHTML(ops.currentCrew.Stats.AssignmentHTML) + "' saveTip='" + sanitizeHTML(ops.currentCrew.Stats.AssignmentHTML) + "'>" + sanitizeHTML(ops.currentCrew.Stats.Assignment) + "</span></u>");
    $("#dataField8").fadeIn();
    if (addChangeIndicator("#dataField8", ops.currentCrew.Background.Kerbal, "Assignment", ops.currentCrew.Stats.Assignment + '|' + ops.currentCrew.Stats.AssignmentHTML) && update) flashUpdate("#dataField8", "#77C6FF", "#FFF");
  } else $("#dataField8").fadeOut();
}

function crewActiveMissionUpdate(update) {
  if (ops.currentCrew.Stats.Vessel) {
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
    if (addChangeIndicator("#dataField9", ops.currentCrew.Background.Kerbal, "Vessel", ops.currentCrew.Stats.Vessel) && update) flashUpdate("#dataField9", "#77C6FF", "#FFF");
  } else {
    $("#dataField9").empty();
    $("#dataField9").fadeOut();
  }
}

function crewRibbonsUpdate(update) {
  if (ops.currentCrew.Ribbons.length) {
    if (update && !$("#dataField11").html().includes('ribbons="' + ops.currentCrew.Ribbons.length)) flashUpdate("#dataField11", "#77C6FF", "#FFF");
    
    // Handle new ribbon detection BEFORE rendering
    const itemId = ops.currentCrew.Background.Kerbal;
    const isTemporary = KSA_UI_STATE.isLivePastUT;
    const storageKey = isTemporary ? `ksaOps_hashes_temp_${itemId}` : `ksaOps_hashes_${itemId}`;
    const stored = localStorage.getItem(storageKey);
    
    // Create a hash of current ribbons (ribbon name + UT)
    const currentRibbons = ops.currentCrew.Ribbons.map(r => r.Ribbon + '_' + r.UT);
    const currentHash = hashContent(JSON.stringify(currentRibbons));
    
    if (!stored) {
      // First time - save hash and list without indicators
      const hashes = { Ribbons: currentHash, RibbonsList: currentRibbons };
      localStorage.setItem(storageKey, JSON.stringify(hashes));
    } else {
      const hashes = JSON.parse(stored);
      
      if (!hashes.Ribbons) {
        // First time seeing ribbons - save hash and list without indicators
        hashes.Ribbons = currentHash;
        hashes.RibbonsList = currentRibbons;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
      } else if (hashes.Ribbons !== currentHash) {
        // Ribbons changed - find which are new and add to unseen list
        const storedRibbons = hashes.RibbonsList || [];
        const newRibbons = currentRibbons.filter(r => !storedRibbons.includes(r));
        
        // Merge new ribbons into existing unseen list (avoid duplicates)
        const existingUnseen = hashes.UnseenRibbons || [];
        const allUnseen = [...new Set([...existingUnseen, ...newRibbons])];
        
        hashes.Ribbons = currentHash;
        hashes.RibbonsList = currentRibbons;
        if (allUnseen.length > 0) {
          hashes.UnseenRibbons = allUnseen;
        }
        localStorage.setItem(storageKey, JSON.stringify(hashes));
      } else {
        // No change but make sure we have the list stored
        if (!hashes.RibbonsList) {
          hashes.RibbonsList = currentRibbons;
          localStorage.setItem(storageKey, JSON.stringify(hashes));
        }
      }
    }
    
    // Now render ribbons (which will apply indicators from UnseenRibbons)
    ribbonDisplayToggle(true);
    $("#crewFooter").fadeIn();
  } else { 
    $("#dataField11").html("<center>No Ribbons Yet Awarded</center>"); 
    $("#crewFooter").fadeOut();
    $("#dataField12").fadeOut();
  }
  $("#dataField11").fadeIn();
}

/**
 * Adds change indicator icon for crew member if content has changed
 * @param {string} elementId - jQuery selector for the element
 * @param {string} itemId - Crew member DB identifier
 * @param {string} fieldId - Field identifier for hash lookup
 * @param {*} currentContent - Current content to check against stored hash
 * @returns {boolean} - True if content has changed, false otherwise
 */
function addCrewChangeIndicator(elementId, itemId, fieldId, currentContent) {
  let contentChanged = false;
  
  try {
    // Remove any existing indicator first
    $(`${elementId} .change-indicator`).remove();
    
    // Crew logic: Simple temp vs perm based on isLivePastUT
    const usePermStorage = !KSA_UI_STATE.isLivePastUT;
    const storageKey = usePermStorage ? `ksaOps_hashes_${itemId}` : `ksaOps_hashes_temp_${itemId}`;
    const stored = localStorage.getItem(storageKey);
    const currentHash = hashContent(currentContent);
    
    if (!stored) {
      // First time seeing this crew member in this storage type - create hash storage
      const hashes = {};
      hashes[fieldId] = currentHash;
      localStorage.setItem(storageKey, JSON.stringify(hashes));
    } else {
      // Crew member has stored hashes - check if this field changed
      const hashes = JSON.parse(stored);
      
      if (!hashes[fieldId]) {
        // First time seeing this specific field - save it
        hashes[fieldId] = currentHash;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
      } else if (hashes[fieldId] !== currentHash) {
        // Content has changed - update hash and show indicator
        hashes[fieldId] = currentHash;
        localStorage.setItem(storageKey, JSON.stringify(hashes));
        contentChanged = true;
        
        // Add the certificate icon
        const icon = '<i class="fa-solid fa-certificate fa-2xs change-indicator" style="color: #000000; cursor: pointer; position: absolute; right: 5px; top: 50%; transform: translateY(-50%);" title="Updated since last visit" data-item-id="' + itemId + '" data-field-id="' + fieldId + '"></i>';
        
        if ($(elementId).css('position') === 'static') {
          $(elementId).css('position', 'relative');
        }
        
        $(elementId).append(icon);
      }
    }
  } catch (error) {
    handleError(error, 'addCrewChangeIndicator');
  }
  
  return contentChanged;
}