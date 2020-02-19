// refactor complete (except for surface ops related to aircraft selection)

function loadMenuAJAX(xhttp) {
  
  // make sure the body catalog is loaded before continuing
  if (!ops.bodyCatalog.length) return setTimeout(loadMenuAJAX, 100, xhttp);
  
  // stop the spinner
  $("#menuBox").spin(false);
  
  // parse the data
  var crafts = xhttp.responseText.split("^")[0].split("*");
  var crew = xhttp.responseText.split("^")[1].split("|");
  crafts.forEach(function(item) {
    var fields = item.split("~");

    // default body ref is Kerbin. If there is more than one SOI entry reset to the second to last ref num
    var bodyRef = 3;
    if (fields[2].split("|").length > 1) bodyRef = parseInt(fields[2].split("|")[fields[2].split("|").length-2].split(";")[1]);
    ops.craftsMenu.push({ db: fields[0],
                          name: fields[1],
                          soi: fields[2],
                          type: fields[3],
                          start: parseInt(fields[4]),
                          end: parseInt(fields[5]),
                          program: fields[6],
                          vessel: fields[7],
                          bodyRef: bodyRef,
                          badged: false });
  });
  crew.forEach(function(item) {
    var fields = item.split("~");
    ops.crewMenu.push({ name: fields[0],
                        status: fields[1],
                        rank: fields[2],
                        assignment: fields[3],
                        db: fields[4],
                        UT: parseInt(fields[5]),
                        badged: false });

    // check if crew has an activation date that is still in the future
    if (parseInt(fields[5]) > currUT()) ops.updatesList.push({ type: "menu;crew", id: fields[4], UT: parseInt(fields[5]) });

    // setup for full data load for any crew that is still active (no deactivation date)
    // or if the date exists, it is still in the future
    if (!fields[6] || (fields[6] && parseInt(fields[6].split(";")[0]) > currUT())) {
      ops.updateData.push({ id: fields[4],
                            type: "crew",
                            isLoading: false,
                            CurrentData: null,
                            FutureData: null });
    }
  });
  
  // create the basic menu
  $('#menuBox').w2sidebar({
    name  : 'menu',
    img   : null,
    nodes : [ 
      { id: 'activeVessels', text: 'Active Vessels', expanded: false, group: true, count: null,
        nodes: [ 
          { id: 'Kerbol-System', text: 'Kerbol', img: 'icon-body', count: null },
          { id: 'Moho', text: 'Moho', img: 'icon-body', hidden: true, count: null },
          { id: 'Eve-System', text: 'Eve', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Gilly', text: 'Gilly', img: 'icon-body', hidden: true, count: null }
            ]},
          { id: 'Kerbin-System', text: 'Kerbin', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Mun', text: 'Mun', img: 'icon-body', hidden: true, count: null },
              { id: 'Minmus', text: 'Minmus', img: 'icon-body', hidden: true, count: null }
            ]},
          { id: 'Duna-System', text: 'Duna', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Ike', text: 'Ike', img: 'icon-body', hidden: true, count: null }
            ]},
          { id: 'Dres', text: 'Dres', img: 'icon-body', hidden: true, count: null },
          { id: 'Sorlon', text: 'Sorlon', img: 'icon-body', hidden: true, count: null },
          { id: 'Jool-System', text: 'Jool', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Laythe', text: 'Laythe', img: 'icon-body', hidden: true, count: null },
              { id: 'Vall', text: 'Vall', img: 'icon-body', hidden: true, count: null },
              { id: 'Tylo', text: 'Tylo', img: 'icon-body', hidden: true, count: null },
              { id: 'Bop', text: 'Bop', img: 'icon-body', hidden: true, count: null },
              { id: 'Pol', text: 'Pol', img: 'icon-body', hidden: true, count: null }
            ]},
          { id: 'Sarnus-System', text: 'Sarnus', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Hale', text: 'Hale', img: 'icon-body', hidden: true, count: null },
              { id: 'Ovok', text: 'Ovok', img: 'icon-body', hidden: true, count: null },
              { id: 'Eeloo', text: 'Eeloo', img: 'icon-body', hidden: true, count: null },
              { id: 'Slate', text: 'Slate', img: 'icon-body', hidden: true, count: null },
              { id: 'Tekto', text: 'Tekto', img: 'icon-body', hidden: true, count: null }
            ]},
          { id: 'Urlum-System', text: 'Urlum', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Polta', text: 'Polta', img: 'icon-body', hidden: true, count: null },
              { id: 'Priax', text: 'Priax', img: 'icon-body', hidden: true, count: null },
              { id: 'Wal-System', text: 'Wal', img: 'icon-body', hidden: true, count: null,
                nodes: [
                  { id: 'Tal', text: 'Tal', img: 'icon-body', hidden: true, count: null }
                ]}
            ]},
          { id: 'Neidon-System', text: 'Neidon', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Thatmo', text: 'Thatmo', img: 'icon-body', hidden: true, count: null },
              { id: 'Nissee', text: 'Nissee', img: 'icon-body', hidden: true, count: null },
            ]},
          { id: 'Plock-System', text: 'Plock', img: 'icon-body', hidden: true, count: null,
            nodes: [
              { id: 'Karen', text: 'Karen', img: 'icon-body', hidden: true, count: null },
            ]}
        ]},
      { id: 'inactiveVessels', text: 'Inactive Vessels', expanded: false, group: true, count: null},
      { id: 'crew', text: 'Crew Roster', expanded: false, group: true, count: null,
        nodes: [ { id: 'crewFull', text: 'Full Roster', img: 'icon-crew'}]},
      { id: 'dsn', text: 'Deep Space Network', expanded: false, group: true, count: null,
        nodes: [ { id: 'dsnInfo', text: 'More Information', img: 'icon-dish'}]}
    ],

    // the type of node image will tell us what to load
    onClick: function (event) {
      
      if (event.node.img.includes("body")) swapContent("body", event.node.id);
      else if (event.node.img.includes("crew") && event.node.id != "crewFull") swapContent("crew", event.node.id);
      else if (event.node.img.includes("crew") && event.node.id == "crewFull") swapContent("crewFull", event.node.id);
        
      // when loading aircraft, ensure that it wasn't the aircraft Type folder that was clicked  
      else if (event.node.img.includes("aircraft") && event.node.parent.id != "inactiveVessels") {

        // check that we are looking at the proper map (hardcoded to Kerbin), and load it if not
        // this will append the flight name to the URL and the path will be loaded
        var currBody = ops.bodyCatalog.find(o => o.selected === true);
        if (!currBody || (currBody && currBody.Body != "Kerbin")) {
          swapContent("body", "Kerbin-System", event.node.id);

          // don't let an accidental double-click load this twice
          strFltTrackLoading = event.node.id;
        }

        // however if the system is already set to Kerbin, just load the path straight to the map
        else {

          // don't try to load this if it is already being loaded
          if (strFltTrackLoading != event.node.id) {

            // if this isn't the right page type, set it up
            if (ops.pageType != "body") swapContent("body", "Kerbin-System", event.node.id);
            setTimeout(showMap, 1000);

            // call for the aircraft track if it doesn't already exist
            var path = fltPaths.find(o => o.id === event.node.id);
            if (!path) {
              surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
              ops.surface.layerControl._expand();
              ops.surface.layerControl.options.collapsed = false;
              ops.surface.layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
              loadDB("loadFltData.asp?data=" + event.node.id, loadFltDataAJAX);

            // if the data already exists...
            } else {
              
              // add it back to the map and the control if it has been removed
              if (path.deleted) {
                ops.surface.layerControl.addOverlay(path.layer, "<i class='fa fa-minus' style='color: " + path.color + "'></i> " + path.info.Title, "Flight Tracks");
                path.layer.addTo(ops.surface.map);
                path.Deleted = false;
                
              // just add it back to the map in case it was hidden
              } else if (!ops.surface.map.hasLayer(path.layer)) path.layer.addTo(ops.surface.map);
              showMap();
            }
          }
        }
      }

      // for now, we link to another page for the DSN
      else if (event.node.img.includes("dish")) window.open("http://www.kerbalspace.agency/?p=3736");
      
      // anything else that isn't a folder is a vessel
      // except if the parent is the Inactive Vessels node as that's just a category node
      else if (!event.node.img.includes("folder") && event.node.parent.id != "inactiveVessels") swapContent("vessel", event.node.id);
      
      // if this is a bolded (badged) entry adjust the count and return it to normal
      if (event.node.text.includes("bold")) {
        event.node.text = event.node.text.replace(" style='font-weight: bold;'", "");
        if (event.node.img.includes("crew")) ops.crewMenu.find(o => o.db === event.node.id).badged = false;
        else ops.craftsMenu.find(o => o.db === event.node.id).badged = false;
        adjustCount(event.node.parent.id, -1);
        w2ui['menu'].refresh();
        w2ui['menu'].scrollIntoView(event.node.id);
      }
    },
    onExpand: function (event) {
    
      // wait a moment to allow menu contents to expand after showing the nodes
      if (event.target == 'crew') setTimeout(function() { w2ui['menu'].scrollIntoView('crewFull'); }, 150);
      else if (event.target == 'dsn') setTimeout(function() { w2ui['menu'].scrollIntoView('dsnInfo'); }, 150);
      else if (event.target == 'inactiveVessels') setTimeout(function() { w2ui['menu'].scrollIntoView(event.object.nodes[0].id); }, 150);
    },
    onRender: function () {
    
      // depending on the height of the event box, size the menu so the twitter widget isn't pushed off the bottom of the screen
      var maxHeight = 340;
      var height = (maxHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height);
    },
    bottomHTML: '<div id="menuResize" onclick="menuResize()">&or;&or;Expand Menu&or;&or;</div>',
    topHTML: '<div id="filterDisplay" onclick="filterDisplay()">&or;&or;Show Filters&or;&or;</div>',
  });
  
  // build the menu for active/inactive vessels
  ops.craftsMenu.forEach(function(item) { addMenuItem(item) });
  isMenuDataLoaded = true;
  
  // begin loading the future data sets for all active vessels and crew
  loadOpsDataAJAX();
  
  // setup the rest of the menu according to the default filter & handle future filter changes
  filterInactiveMenu();
  filterCrewMenu();
  $('input:radio[name=inactive]').change(function () { filterInactiveMenu(); });
  $('input:radio[name=roster]').change(function () { filterCrewMenu(); });
  
  // show what was loaded if there are no cookies, otherwise we need to wait for a cookie check after ops data load
  if (!checkCookies()) {
    if (getParameterByName("body")) var menuID = getParameterByName("body");
    if (getParameterByName("vessel")) var menuID = getParameterByName("vessel");
    if (getParameterByName("crew")) var menuID = getParameterByName("crew");

    // don't select the body if a flight is being loaded, that flight will be selected after it loads
    if (menuID && !window.location.href.includes("flt")) selectMenuItem(menuID);
  }
}

// show/hide all the menu items that are associated with the type of vessel checked/unchecked
function filterVesselMenu(id, checked) {
  var menuNodes = w2ui['menu'].find('activeVessels', { img: "icon-" + id });
  menuNodes.forEach(function(item) {
    if (checked) {
      w2ui['menu'].show(item.id);
      if (item.parent && item.parent.hidden) showParents(item.parent);
    } else w2ui['menu'].hide(item.id);
  });

  // hide also any parent nodes that are not showing any children
  hideEmptyNodes(w2ui['menu'].get('activeVessels').nodes);
}

function filterInactiveMenu(id) {

  // if a value was passed in, enable that radio option before we check to see what is selected
  if (id) $('input:radio[name=inactive]').filter('[id=' + id + ']').prop('checked', true);
  var currOption = $("input[name=inactive]").filter(":checked").val();

  // if the currently selected menu item is an inactive vessel, show it after the re-sort
  var selectedNode = w2ui['menu'].find({selected: true});
  if (!selectedNode.length || (selectedNode.length && getParentSystem(selectedNode[0].id) != "inactive")) selectedNode = null;
  else selectedNode = selectedNode[0].id;

  // remove all nodes
  if (w2ui['menu'].get('inactiveVessels').nodes.length) {
  
    // create a copy of the array so we can delete things one by one
    var del = w2ui['menu'].get('inactiveVessels').nodes.slice(0);
    for (var i=0; i<del.length; i++) w2ui['menu'].remove(del[i].id);
    del.length = 0;
  }

  // build the new menu depending on which filter was selected
  if (currOption == "type") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    ops.craftsMenu.sort(function(a,b) { return (a.type > b.type) ? 1 : ((b.type > a.type) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (!w2ui['menu'].find('inactiveVessels', { id: item.type }).length) {
          w2ui['menu'].add('inactiveVessels', { id: item.type,
                                                text: capitalizeFirstLetter(item.type),
                                                img: 'icon-' + item.type,
                                                count: null });
        }
      }
    });
    ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) { if (currSOI(item)[0] == -1) addVesselByDate(item, item.type) });
  } else if (currOption == "vessel") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    ops.craftsMenu.sort(function(a,b) { return (a.vessel > b.vessel) ? 1 : ((b.vessel > a.vessel) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.vessel != "null" && !w2ui['menu'].find('inactiveVessels', { id: item.vessel }).length) {
          w2ui['menu'].add('inactiveVessels', { id: item.vessel,
                                                text: item.vessel,
                                                img: 'icon-folder',
                                                count: null });
        }
      }
    });
    ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.vessel != "null") addVesselByDate(item, item.vessel)
      }
    });
  } else if (currOption == "program") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    ops.craftsMenu.sort(function(a,b) { return (a.program > b.program) ? 1 : ((b.program > a.program) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.program != "null" && !w2ui['menu'].find('inactiveVessels', { id: item.program }).length) {
          w2ui['menu'].add('inactiveVessels', { id: item.program,
                                                text: item.program,
                                                img: 'icon-folder',
                                                count: null });
        }
      }
    });
    ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.program != "null") addVesselByDate(item, item.program)
      }
    });
  } else if (currOption == "start") {

    // sort by start date to add vessels
    ops.craftsMenu.sort(function(a,b) { return (a.start > b.start) ? 1 : ((b.start > a.start) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.program != "null") addVesselByDate(item)
      }
    });
  } else if (currOption == "end") {

    // sort by start date to add vessels
    ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.program != "null") addVesselByDate(item)
      }
    });
  } else if (currOption == "body") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    ops.craftsMenu.sort(function(a,b) { return (a.bodyRef > b.bodyRef) ? 1 : ((b.bodyRef > a.bodyRef) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.bodyRef != "null" && !w2ui['menu'].find('inactiveVessels', { id: "refNum" + item.bodyRef }).length) {
          w2ui['menu'].add('inactiveVessels', { id: "refNum" + item.bodyRef,
                                                text: ops.bodyCatalog.find(o => o.ID === item.bodyRef).Body,
                                                img: 'icon-body',
                                                count: null });
        }
      }
    });
    ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
    ops.craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.program != "null") addVesselByDate(item, "refNum" + item.bodyRef)
      }
    });
  }
  w2ui['menu'].refresh();
  if (selectedNode) selectMenuItem(selectedNode);
}

function filterCrewMenu(id) {

  // if a value was passed in, enable that radio option before we check to see what is selected
  if (id) $('input:radio[name=roster]').filter('[id=' + id + ']').prop('checked', true);
  var currOption = $("input[name=roster]").filter(":checked").val();

  // remove all but the first node
  if (w2ui['menu'].get('crew').nodes.length > 1) {
  
    // create a copy of the array so we can delete things one by one
    var del = w2ui['menu'].get('crew').nodes.slice(0);
    for (var i=1; i<del.length; i++) w2ui['menu'].remove(del[i].id);
    del.length = 0;
  }

  // build the new menu depending on which filter was selected
  if (currOption == "name") {
  
    // sort the array as required
    // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value-in-javascript
    ops.crewMenu.sort(function(a,b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (item.name.charAt(0) <= "F") {
          if (!w2ui['menu'].find('crew', { id: 'a-f' }).length) {
            w2ui['menu'].add('crew', { id: 'a-f',
                                       text: "A - F",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('a-f', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        } else if (item.name.charAt(0) <= "L") {
          if (!w2ui['menu'].find('crew', { id: 'g-l' }).length) {
            w2ui['menu'].add('crew', { id: 'g-l',
                                       text: "G - L",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('g-l', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        } else if (item.name.charAt(0) <= "R") {
          if (!w2ui['menu'].find('crew', { id: 'm-r' }).length) {
            w2ui['menu'].add('crew', { id: 'm-r',
                                       text: "M - R",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('m-r', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        } else {
          if (!w2ui['menu'].find('crew', { id: 's-z' }).length) {
            w2ui['menu'].add('crew', { id: 's-z',
                                       text: "S - Z",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('s-z', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        }
      }
    });
  } else if (currOption == "status") {

    // sort by filter option first to create folders, then re-sort by name to add kerbals
    ops.crewMenu.sort(function(a,b) { return (a.status > b.status) ? 1 : ((b.status > a.status) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (!w2ui['menu'].find('crew', { id: item.status }).length) {
          w2ui['menu'].add('crew', { id: item.status,
                                     text: item.status,
                                     img: 'icon-folder' });
        }
      }
    });
    ops.crewMenu.sort(function(a,b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        w2ui['menu'].add(item.status, { id: item.db,
                                        text: "<span>" + item.name + " Kerman</span>",
                                        img: 'icon-crew' });
        if (item.badged) badgeMenuItem(item.db, true, true);
      }
    });
  } else if (currOption == "rank") {
    ops.crewMenu.sort(function(a,b) { return (a.rank > b.rank) ? 1 : ((b.rank > a.rank) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (!w2ui['menu'].find('crew', { id: item.rank }).length) {
          w2ui['menu'].add('crew', { id: item.rank,
                                     text: item.rank,
                                     img: 'icon-folder' });
        }
      }
    });
    ops.crewMenu.sort(function(a,b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        w2ui['menu'].add(item.rank, { id: item.db,
                                      text: "<span>" + item.name + " Kerman</span>",
                                      img: 'icon-crew' });
        if (item.badged) badgeMenuItem(item.db, true, true);
      }
    });
  } else if (currOption == "assignment") {
    ops.crewMenu.sort(function(a,b) { return (a.assignment > b.assignment) ? 1 : ((b.assignment > a.assignment) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (item.assignment && !w2ui['menu'].find('crew', { id: item.assignment }).length) {
          w2ui['menu'].add('crew', { id: item.assignment,
                                     text: item.assignment,
                                     img: 'icon-folder' });
        }
      }
    });
    ops.crewMenu.sort(function(a,b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (item.assignment) {
          w2ui['menu'].add(item.assignment, { id: item.db,
                                              text: "<span>" + item.name + " Kerman</span>",
                                              img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        }
      }
    });
  }
  
  // if we are looking at the full crew roster, refresh the view
  // this may place an extra call to the first crew member if loading initially to full roster page but does no harm
  if (ops.pageType == "crewFull") {
    $('#fullRoster').empty(); 
    crewList = extractIDs(w2ui['menu'].get('crew').nodes).split(";");
    loadDB("loadCrewData.asp?db=" + showFullRoster() + "&ut=" + currUT(), loadCrewAJAX);
  }
}

// hides the twitter widget to allow the menu to use the full height of the right-side content area, preserves event box
function menuResize() {
  if ($('#menuResize').html().includes("Expand")) {
    $('#twitterBox').fadeOut(250, "swing", function () { 
      ops.maxMenuHeight = 882;
      var height = (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height); 
      setTimeout(function() { 
        w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&and;&and;Collapse Menu&and;&and;</div>';
        w2ui['menu'].refresh(); 
      }, 200);
    });
  } else {
    ops.maxMenuHeight = 340;
    var height = (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px";
    $('#menuBox').css("height", height); 
    setTimeout(function() { 
      w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&or;&or;Expand Menu&or;&or;</div>';
      w2ui['menu'].refresh(); 
      w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id); 
      $('#twitterBox').fadeIn(250);
    }, 200);
  }
}

// drops the menu down to show the filter options hidden beneath
function filterDisplay() {
  if ($('#filterDisplay').html().includes("Show")) {
    $('#filters').fadeIn(250);
    $("#menuBox").css("transform", "translateY(" + w2utils.getSize("#filters", 'height') + "px)");
    setTimeout(function() { 
      w2ui['menu'].topHTML = '<div id="filterDisplay" onclick="filterDisplay()">&and;&and;Hide Filters&and;&and;</div>';
      w2ui['menu'].refresh(); 
      w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
    }, 200);
  } else {
    $('#filters').fadeOut(250);
    $("#menuBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      w2ui['menu'].topHTML = '<div id="filterDisplay" onclick="filterDisplay()">&or;&or;Show Filters&or;&or;</div>';
      w2ui['menu'].refresh(); 
      w2ui['menu'].scrollIntoView(w2ui['menu'].find({selected: true})[0].id);
    }, 200);
  }
}

// recursive function to pull vessels/crew from nodes nested n deep
// NOTE: returns a trailing ; that will lead to one extra empty array item!!
function extractIDs(nodes, moon) {

  // work through the nodes to determine what data we need to send for
  var strIDs = '';
  for (var i=0; i<nodes.length; i++) {
    
    // if this is a moon or folder dig through its nodes, if it has any
    if (nodes[i].nodes.length) strIDs += extractIDs(nodes[i].nodes.slice(0), moon);
      
    // do not add the full crew roster to the list, but maybe add moons
    else if (nodes[i].id != "crewFull") { 
      if (!nodes[i].img.includes("body")) {
        strIDs += nodes[i].id + ";"; 
      } else if (nodes[i].img.includes("body") && moon) {
        strIDs += "*" + nodes[i].id + ";"; 
      }
    }
  }
  return strIDs;
}

// recursive function to find the parent system of a node n deep
function getParentSystem(nodeID) {
  if (!w2ui['menu'].get(nodeID).parent.id) return null;
  else if (w2ui['menu'].get(nodeID).parent.id == "inactiveVessels") return "inactive";
  else if (w2ui['menu'].get(nodeID).parent.id.includes("System")) return w2ui['menu'].get(nodeID).parent.id;
  else return getParentSystem(w2ui['menu'].get(nodeID).parent.id);
}

// recursive function to find all parent nodes and increase/decrease their update count
function adjustCount(nodeID, adjust) {
  var node = w2ui['menu'].get(nodeID);
  if (node.count) {
    node.count += adjust;
    if (node.count <= 0) node.count = null;
  } else if (!node.count && adjust > 0) node.count = 1;

  if (node.parent.id) return adjustCount(node.parent.id, adjust);
  else {
    w2ui['menu'].expand(node.id);
    return;
  }
}

function menuUpdate(type, id) {
  if (type == "soi") {
    w2ui['menu'].remove(id);
    addMenuItem(ops.craftsMenu.find(o => o.db === id), true);
   
    // are we looking at it?
    if (ops.pageType == "vessel" && ops.currentVessel.Catalog.DB == id) {
      w2ui['menu'].select(id);
      w2ui['menu'].expandParents(id);
      w2ui['menu'].scrollIntoView(id);
    } else adjustCount(w2ui['menu'].get(id).parent.id, 1);    
  }
  else if (type == "crew") filterCrewMenu();
  else if (type == "name") w2ui['menu'].get(id).text = "<span>" + currName(ops.craftsMenu.find(o => o.db === id), true) + "</span>";
  else console.log("unknown menu update: " + type);
  w2ui['menu'].refresh();
}

function addMenuItem(item, newAdd = false) {

  // figure out what SOI this is in, if any, and whether it's switching to another status later
  var refNumUT = currSOI(item, true);

  // if this vessel has more than one name, get the current one
  // also check for a future name update
  var strVesselName = currName(item, true);

  // decide whether to highlight this menu item
  var strStyle = "<span>";
  if (newAdd) strStyle = "<span style='font-weight: bold;'>";
  
  // handle an active vessel
  if (refNumUT[0] >= 0) {
  
    // figure out which body this vessel belongs to
    var body = ops.bodyCatalog.find(o => o.ID === refNumUT[0]);
    if (!body) console.log(refNumUT);

    // if this body has moons, it is defined as a system
    var strSys = "";
    if (body.Moons.length) strSys = "-System";

    // if this body is not visible, make it so
    if (w2ui['menu'].get('activeVessels', body.Body + strSys).hidden) w2ui['menu'].set('activeVessels', body.Body + strSys, { hidden: false });
    
    // get the nodes for this body and insert the vessel alphabetically, after any moons
    // or add it at the end if nothing to insert before
    var index;
    var menuNodes = w2ui['menu'].get('activeVessels', body.Body + strSys).nodes;
    for (index=0; index<menuNodes.length; index++) {
      var strMenuText = menuNodes[index].text.split(">")[1].split("<")[0];
      if (!menuNodes[index].img.includes("body") && strMenuText > strVesselName) {
        w2ui['menu'].insert(body.Body + strSys, menuNodes[index].id, { id: item.db,
                                                                       text: strStyle + wrapText(210, strVesselName, 14) + "</span>",
                                                                       img: 'icon-' + item.type,
                                                                       count: null });
        break;
      }
    }    
    if (index == menuNodes.length) {
      w2ui['menu'].add(body.Body + strSys, { id: item.db,
                                             text: strStyle + wrapText(210, strVesselName, 14) + "</span>",
                                             img: 'icon-' + item.type,
                                             count: null });
    }

    // enable & check the checkbox for this type of vessel
    $("#" + item.type + "-menu").removeAttr("disabled");
    $("#" + item.type + "-menu").prop('checked', true);
    
    // as an active vessel, we will want to check for future data
    // also save to list so it can be checked for orbital data for body/surface views
    // check too if it has orbital data to render if the GGB figure is already loaded
    if (isGGBAppletLoaded && !isGGBAppletRefreshing) {
      loadDB("loadVesselOrbitData.asp?db=" + item.db + "&ut=" + currUT(), addGGBOrbitAJAX);
    }
    ops.activeVessels.push(item);
    ops.updateData.push({ id: item.db,
                          type: "vessel",
                          isLoading: false,
                          CurrentData: null,
                          FutureData: null });

  // don't check on inactive vessels unless this is a new menu item being added
  // this avoids repeated filter calls during the initial menu load
  } else if (refNumUT[0] == -1 && newAdd) {
    
    // make sure this is badged after the menu is re-sorted
    item.badged = true;
    filterInactiveMenu();

    // remove this from the active vessels list if it's on there
    for (vessIndex=0; vessIndex<ops.activeVessels.length; vessIndex++) {
      if (ops.activeVessels[vessIndex].db == item.db) {
        ops.activeVessels.splice(vessIndex, 1);
        break;
      }
    }

    // if this vessel type is no longer in use, disable the filter selection
    if (!ops.activeVessels.find(o => o.type === item.type)) {
      $("#" + item.type + "-menu").prop("disabled", true);
      $("#" + item.type + "-menu").prop('checked', false);
    }
  }
}

// allows the user to see that a vessel/crew member has new data since the page was originally or last loaded
function badgeMenuItem(strID, noSelect = false, noRefresh = false) {
  var menuItem = w2ui['menu'].get(strID);

  // don't alter this item if it hasn't been found, is already been badged or is currently selected
  if (!menuItem) return;
  if (menuItem.text.includes("bold")) return;
  if (menuItem.selected) return;

  // bold the text to identify it has updated information and badge all parent folders
  menuItem.text = menuItem.text.replace("<span>", "<span style='font-weight: bold;'>");
  adjustCount(menuItem.parent.id, 1);
  if (!noRefresh) w2ui['menu'].refresh();

  // crew need a special flag to handle the resorting after data load
  if (menuItem.img == "icon-crew") ops.crewMenu.find(o => o.db === strID).badged = true;
  else ops.craftsMenu.find(o => o.db === strID).badged = true;

  // if selection is off, but the menu refreshed, just scroll into view the current selection
  if (noSelect && !noRefresh) w2ui['menu'].scrollIntoView();
  else if (!noSelect) w2ui['menu'].scrollIntoView(strID);
}

// get the current body being orbited for the current time
function currSOI(vessel, updateCheck = false, utCheck) {
  if (!utCheck) utCheck = currUT();
  var refNum = -2;
  var refIndex;
  var refUT;
  
  // tricky but works to allow alternate string literal input rather than an object
  if (!vessel) {
    var soi = updateCheck.split("|");
    updateCheck = false;
  } else {
    if (!vessel.soi) console.log(vessel)
    var soi = vessel.soi.split("|");
  }

  for (refIndex=0; refIndex<soi.length; refIndex++) {
    var pair = soi[refIndex].split(";");
    if (parseFloat(pair[0]) > utCheck) break;
    refNum = parseInt(pair[1]);
    refUT = parseInt(pair[0]);
  }

  // check for a future SOI update?
  if (updateCheck && refIndex < soi.length) ops.updatesList.push({ type: "menu;soi", id: vessel.db, UT: parseInt(soi[refIndex].split(";")[0]) });
  return [refNum, refUT];
}

// checks if the vessel has more than one possible name, and returns the one for the given time
function currName(vessel, updateCheck = false, utCheck) {
  if (!utCheck) utCheck = currUT();

  // tricky but works to allow alternate string literal input rather than an object
  if (!vessel) {
    var strNames = updateCheck;
    updateCheck = false;
  } else var strNames = vessel.name;

  if (strNames.includes("|")) {
    var nameIndex;
    var names = strNames.split("|");
    for (nameIndex=0; nameIndex<names.length; nameIndex++) {
      var pair = names[nameIndex].split(";");
      if (parseFloat(pair[0]) > utCheck) break;
      strVesselName = pair[1];
    }
    if (updateCheck && nameIndex < names.length) { ops.updatesList.push({ type: "menu;name", id: vessel.db, UT: parseInt(names[nameIndex].split(";")[0]) }); }
  } else strVesselName = strNames;
  return strVesselName;
}

// recursively check through a menu node tree to hide anything that isn't showing child nodes
function hideEmptyNodes(nodes) {
  nodes.forEach(function(itemParent) {
    if (itemParent.nodes.length) {
      var hideNode = true;
      itemParent.nodes.forEach(function(itemChild) {
        if (itemChild.nodes.length) hideEmptyNodes(itemChild.nodes);
        else if (!itemChild.hidden) hideNode = false;
      });
      if (hideNode) w2ui['menu'].hide(itemParent.id);
    } else if (itemParent.text != "Kerbol") w2ui['menu'].hide(itemParent.id);
  });
}

// recursively work up a menu node tree to show all the parents of a node
function showParents(node) {
  w2ui['menu'].show(node.id);
  if (node.parent && node.parent != "activeVessels" && node.parent.hidden) showParents(node.parent);
}

// takes a craftsMenu item and adds it to the appropriate parent folder depending on the sort option chosen
function addVesselByDate(item, parentFolder = "inactiveVessels") {

  // get the current filter type to determine the wrap width
  if ($("input[name=inactive]").filter(":checked").val() == "start" || $("input[name=inactive]").filter(":checked").val() == "end") {
    var wrapLimit = 210;
  } else {
    var wrapLimit = 180;
  }

  // get the date for this vessel and extract the month and year
  var dateUT = UTtoDateTime(item.end, true).split("@")[0];
  var month = dateUT.split("/")[0];
  var year = dateUT.split("/")[2];
  
  // special case. See github issue: https://github.com/KSAMissionCtrl/OpsTracker/issues/61
  if (strVesselName == "Progeny Mk6 Block I Flight 7") { month--; }
  
  // if this year does not have a menu entry, insert one
  // sort descending
  var index;
  if (parentFolder != "inactiveVessels") var menuNodes = w2ui['menu'].get('inactiveVessels', parentFolder).nodes;
  else var menuNodes = w2ui['menu'].get(parentFolder).nodes;
  if (!w2ui['menu'].find(parentFolder, { id: parentFolder + year }).length) {
    for (index=0; index<menuNodes.length; index++) {
      if (parseInt(menuNodes[index].text) < parseInt(year)) {
        w2ui['menu'].insert(parentFolder, menuNodes[index].id, { id: parentFolder + year,
                                                                 text: year,
                                                                 img: 'icon-folder',
                                                                 count: null });
        break;
      }
    }
    if (index == menuNodes.length) {
      w2ui['menu'].add(parentFolder, { id: parentFolder + year,
                                       text: year,
                                       img: 'icon-folder', 
                                       count: null });
    }
  }

  // if this month does not have a menu entry, insert one
  // sort ascending
  if (!w2ui['menu'].find(parentFolder + year, { id: parentFolder + year + '-' + month }).length) {
    menuNodes = w2ui['menu'].get(parentFolder, parentFolder + year).nodes;
    for (index=0; index<menuNodes.length; index++) {
      if (parseInt(menuNodes[index].id.split("-")[1]) > parseInt(month)) {
        w2ui['menu'].insert(parentFolder + year, menuNodes[index].id, { id: parentFolder + year + '-' + month,
                                                                        text: monthNames[month-1],
                                                                        img: 'icon-folder',
                                                                        count: null });
        break;
      }
    }
    if (index == menuNodes.length) {
      w2ui['menu'].add(parentFolder + year, { id: parentFolder + year + '-' + month,
                                              text: monthNames[month-1],
                                              img: 'icon-folder',
                                              count: null });
    }
  }
  
  // add the vessel to this month/year
  // and decide whether to highlight this menu item
  w2ui['menu'].add(parentFolder + year + '-' + month, { id: item.db,
                                                        text: "<span>" + wrapText(wrapLimit, currName(item), 14) + "</span>",
                                                        img: 'icon-' + item.type,
                                                        count: null });
  if (item.badged) badgeMenuItem(item.db, true, true);
}

// selects the item from the menu and also makes sure to remove any badges
function selectMenuItem(menuID) {
  var menuNode = w2ui['menu'].get(menuID);
  w2ui['menu'].select(menuID);
  w2ui['menu'].expandParents(menuID);
  w2ui['menu'].scrollIntoView(menuID);
  if (menuNode.text.includes("bold")) {
    menuNode.text = menuNode.text.replace(" style='font-weight: bold;'", "");
    if (menuNode.img.includes("crew")) ops.crewMenu.find(o => o.db === menuNode.id).badged = false;
    else ops.craftsMenu.find(o => o.db === menuNode.id).badged = false;
    adjustCount(menuNode.parent.id, -1);
    w2ui['menu'].refresh();
    w2ui['menu'].scrollIntoView(menuNode.id);
  }
}