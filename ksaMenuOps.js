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
                          type: currType(fields[3]),
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
                            needsSorting: false,
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

      // do not register an event if a surface map is loading
      if (ops.surface.isLoading) return;

      if (event.node.img.includes("body")) {
        if (event.node.parent.id == "inactiveVessels") swapContent("body", event.node.text.split(" ")[0] + "-System");
        else swapContent("body", event.node.text.split(" ")[0]);
      } 
      else if (event.node.img.includes("crew") && event.node.id != "crewFull") swapContent("crew", event.node.id);
      else if (event.node.img.includes("crew") && event.node.id == "crewFull") swapContent("crewFull", event.node.id);
        
      // when loading aircraft, ensure that it wasn't the aircraft Type folder that was clicked  and that a current load isn't already in progress
      else if (event.node.img.includes("aircraft") && event.node.parent.id != "inactiveVessels") loadFlt(event.node.id);

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
        var selectedId = event.node.id;
        w2ui['menu'].refresh();
        w2ui['menu'].select(selectedId);
        (function(id) {
          setTimeout(function() {
            w2ui['menu'].scrollIntoView(id);
          }, 50);
        })(selectedId);
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
  activeVesselCount();
  KSA_UI_STATE.isMenuDataLoaded = true;
  
  // begin loading the future data sets for all active vessels and crew
  loadOpsDataAJAX();
  
  // setup the rest of the menu according to the default filter & handle future filter changes
  // isMenuSorted flag will be set inside filterInactiveMenu after sorting completes
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

function filterInactiveMenu(id, selectId) {

  // set cursor to wait while sorting - use !important to override any CSS
  $('body, *').css('cursor', 'wait', 'important');
  $('body').addClass('wait-cursor');

  // use setTimeout to allow cursor change to render before sorting begins
  setTimeout(function() {
    
    // if a value was passed in, enable that radio option before we check to see what is selected
    if (id) $('input:radio[name=inactive]').filter('[id=' + id + ']').prop('checked', true);
    var currOption = $("input[name=inactive]").filter(":checked").val();

    // reset the count to 0
    w2ui['menu'].get('inactiveVessels').text = "Inactive Vessels (0)";

    // if the currently selected menu item is an inactive vessel, show it after the re-sort
    // also use selectId if passed (for vessels just moved from active to inactive)
    var selectedNode = w2ui['menu'].find({selected: true});
    if (selectId) selectedNode = selectId;
    else if (!selectedNode.length || (selectedNode.length && getParentSystem(selectedNode[0].id) != "inactive")) selectedNode = null;
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
                                                  text: capitalizeFirstLetter(item.type) + " (0)",
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
                                                  text: item.vessel + " (0)",
                                                  img: 'icon-folder',
                                                  count: null });
          }
        }
      });
      ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
      ops.craftsMenu.forEach(function(item) {
        if (currSOI(item)[0] == -1) {
          if (item.vessel != "null") addVesselByDate(item, item.vessel, false)
        }
      });
    } else if (currOption == "program") {

      // sort by filter option first to create folders, then re-sort by end date to add vessels
      ops.craftsMenu.sort(function(a,b) { return (a.program > b.program) ? 1 : ((b.program > a.program) ? -1 : 0); });
      ops.craftsMenu.forEach(function(item) {
        if (currSOI(item)[0] == -1) {
          if (item.program != "null" && !w2ui['menu'].find('inactiveVessels', { id: item.program }).length) {
            w2ui['menu'].add('inactiveVessels', { id: item.program,
                                                  text: item.program + " (0)",
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
      console.log(ops.craftsMenu)
      ops.craftsMenu.forEach(function(item) {
        if (currSOI(item)[0] == -1) addVesselByDate(item)
      });
    } else if (currOption == "end") {

      // sort by end date to add vessels
      ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
      ops.craftsMenu.forEach(function(item) {
        if (currSOI(item)[0] == -1) addVesselByDate(item)
      });
    } else if (currOption == "body") {

      // sort by filter option first to create folders, then re-sort by end date to add vessels
      ops.craftsMenu.sort(function(a,b) { return (a.bodyRef > b.bodyRef) ? 1 : ((b.bodyRef > a.bodyRef) ? -1 : 0); });
      ops.craftsMenu.forEach(function(item) {
        if (currSOI(item)[0] == -1) {
          if (item.bodyRef != "null" && !w2ui['menu'].find('inactiveVessels', { id: "refNum" + item.bodyRef }).length) {
            w2ui['menu'].add('inactiveVessels', { id: "refNum" + item.bodyRef,
                                                  text: ops.bodyCatalog.find(o => o.ID === item.bodyRef).Body + " (0)",
                                                  img: 'icon-body',
                                                  count: null });
          }
        }
      });
      ops.craftsMenu.sort(function(a,b) { return (a.end > b.end) ? 1 : ((b.end > a.end) ? -1 : 0); });
      ops.craftsMenu.forEach(function(item) {
        if (currSOI(item)[0] == -1) addVesselByDate(item, "refNum" + item.bodyRef)
      });
    }
    w2ui['menu'].refresh();
    if (selectedNode) selectMenuItem(selectedNode);

    // restore cursor to default
    $('body').removeClass('wait-cursor');
    $('body, *').css('cursor', '');
    
    // Set flag to indicate menu sorting is complete (only on initial page load)
    if (!KSA_UI_STATE.isMenuSorted) KSA_UI_STATE.isMenuSorted = true;
  }, 10);
}

function filterCrewMenu(id) {

  // set cursor to wait while sorting - use !important to override any CSS
  $('body, *').css('cursor', 'wait', 'important');
  $('body').addClass('wait-cursor');

  // use setTimeout to allow cursor change to render before sorting begins
  setTimeout(function() {
    // if a value was passed in, enable that radio option before we check to see what is selected
    if (id) $('input:radio[name=roster]').filter('[id=' + id + ']').prop('checked', true);
    var currOption = $("input[name=roster]").filter(":checked").val();

  // reset the count to 0
  w2ui['menu'].get('crew').text = "Crew Roster (0)";

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
      var folderID = null;
      if (item.UT <= currUT()) {
        if (item.name.charAt(0) <= "F") {
          folderID = 'a-f';
          if (!w2ui['menu'].find('crew', { id: 'a-f' }).length) {
            w2ui['menu'].add('crew', { id: 'a-f',
                                       text: "A - F (0)",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('a-f', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        } else if (item.name.charAt(0) <= "L") {
          folderID = 'g-l';
          if (!w2ui['menu'].find('crew', { id: 'g-l' }).length) {
            w2ui['menu'].add('crew', { id: 'g-l',
                                       text: "G - L (0)",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('g-l', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        } else if (item.name.charAt(0) <= "R") {
          folderID = 'm-r';
          if (!w2ui['menu'].find('crew', { id: 'm-r' }).length) {
            w2ui['menu'].add('crew', { id: 'm-r',
                                       text: "M - R (0)",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('m-r', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        } else {
          folderID = 's-z';
          if (!w2ui['menu'].find('crew', { id: 's-z' }).length) {
            w2ui['menu'].add('crew', { id: 's-z',
                                       text: "S - Z (0)",
                                       img: 'icon-folder' });
          }
          w2ui['menu'].add('s-z', { id: item.db,
                                    text: "<span>" + item.name + " Kerman</span>",
                                    img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
        }
        updateFolderCount(folderID);
      }
    });
  } else if (currOption == "status") {

    // sort by filter option first to create folders, then re-sort by name to add kerbals
    ops.crewMenu.sort(function(a,b) { return (a.status > b.status) ? 1 : ((b.status > a.status) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (!w2ui['menu'].find('crew', { id: item.status }).length) {
          w2ui['menu'].add('crew', { id: item.status,
                                     text: item.status + " (0)",
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
        updateFolderCount(item.status);
      }
    });
  } else if (currOption == "rank") {
    ops.crewMenu.sort(function(a,b) { return (a.rank > b.rank) ? 1 : ((b.rank > a.rank) ? -1 : 0); });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (!w2ui['menu'].find('crew', { id: item.rank }).length) {
          w2ui['menu'].add('crew', { id: item.rank,
                                     text: item.rank + " (0)",
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
        updateFolderCount(item.rank);
      }
    });
  } else if (currOption == "assignment") {
    ops.crewMenu.sort(function(a,b) { 
      var aAssign = a.assignment || "Unassigned";
      var bAssign = b.assignment || "Unassigned";
      return (aAssign > bAssign) ? 1 : ((bAssign > aAssign) ? -1 : 0);
    });
    ops.crewMenu.forEach(function(item) {
      if (item.UT <= currUT()) {
        if (item.assignment && !w2ui['menu'].find('crew', { id: item.assignment }).length) {
          w2ui['menu'].add('crew', { id: item.assignment,
                                     text: item.assignment + " (0)",
                                     img: 'icon-folder' });
        } else if (!item.assignment && !w2ui['menu'].find('crew', { id: 'Unassigned' }).length) {
          w2ui['menu'].add('crew', { id: 'Unassigned',
                                     text: "Unassigned (0)",
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
          updateFolderCount(item.assignment);
        } else {
          w2ui['menu'].add('Unassigned', { id: item.db,
                                     text: "<span>" + item.name + " Kerman</span>",
                                     img: 'icon-crew' });
          if (item.badged) badgeMenuItem(item.db, true, true);
          updateFolderCount('Unassigned');
        }
      }
    });
  }
  
  // preserve the selected item after refresh
  w2ui['menu'].refresh();
  if (KSA_TIMERS.menuRefresh) clearTimeout(KSA_TIMERS.menuRefresh);
  KSA_TIMERS.menuRefresh = setTimeout(function() {
    w2ui['menu'].scrollIntoView();
  }, 100);
  
  // if we are looking at the full crew roster, refresh the view
  // this may place an extra call to the first crew member if loading initially to full roster page but does no harm
  if (ops.pageType == "crewFull") {
    $('#fullRoster').empty(); 
    KSA_CATALOGS.crewList = extractIDs(w2ui['menu'].get('crew').nodes).split(";");
    loadDB("loadCrewData.asp?db=" + showFullRoster() + "&ut=" + currUT(), loadCrewAJAX);
  }

  // restore cursor to default
  $('body').removeClass('wait-cursor');
  $('body, *').css('cursor', '');
  }, 10);
}

// helper function to check if the selected menu item is visible in the viewport
function isMenuItemVisible(itemId) {
  try {
    // Get the scrollable container - it's the div with w2ui-sidebar-div class
    var $container = $('#menuBox').find('.w2ui-sidebar-div');
    if (!$container.length) return false; // if can't find container, scroll to be safe
    
    var container = $container[0];
    var $item = $container.find('.w2ui-node').filter(function() {
      return $(this).attr('id') === itemId;
    });
    
    if (!$item.length) return false; // if can't find item, scroll to be safe
    
    var item = $item[0];
    var containerTop = container.scrollTop;
    var containerBottom = containerTop + container.clientHeight;
    var itemTop = item.offsetTop;
    var itemBottom = itemTop + item.offsetHeight;
    
    // Item is visible if it's fully within the viewport
    return (itemTop >= containerTop && itemBottom <= containerBottom);
  } catch (e) {
    return false; // on error, scroll to be safe
  }
}

// hides the twitter widget to allow the menu to use the full height of the right-side content area, preserves event box
function menuResize() {
  if ($('#menuResize').html().includes("Expand")) {
    $('#twitterBox').fadeOut(250, "swing", function () { 
      ops.maxMenuHeight = 915; // 882
      var height = (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height); 
      setTimeout(function() { 
        w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&and;&and;Collapse Menu&and;&and;</div>';
        var selectedNode = w2ui['menu'].find({selected: true});
        var selectedId = (selectedNode.length > 0) ? selectedNode[0].id : null;
        w2ui['menu'].refresh();
        if (selectedId && w2ui['menu'].get(selectedId)) {
          w2ui['menu'].select(selectedId);
          w2ui['menu'].expandParents(selectedId);
          (function(id) {
            setTimeout(function() {
              if (!isMenuItemVisible(id)) w2ui['menu'].scrollIntoView(id);
            }, 50);
          })(selectedId);
        }
      }, 200);
    });
  } else {
    ops.maxMenuHeight = 340; // 340
    var height = (ops.maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px";
    $('#menuBox').css("height", height); 
    setTimeout(function() { 
      w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&or;&or;Expand Menu&or;&or;</div>';
      var selectedNode = w2ui['menu'].find({selected: true});
      var selectedId = (selectedNode.length > 0) ? selectedNode[0].id : null;
      w2ui['menu'].refresh();
      if (selectedId && w2ui['menu'].get(selectedId)) {
        w2ui['menu'].select(selectedId);
        w2ui['menu'].expandParents(selectedId);
        (function(id) {
          setTimeout(function() {
            if (!isMenuItemVisible(id)) w2ui['menu'].scrollIntoView(id);
          }, 50);
        })(selectedId);
      }
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
      var selectedNode = w2ui['menu'].find({selected: true});
      var selectedId = (selectedNode.length > 0) ? selectedNode[0].id : null;
      w2ui['menu'].refresh();
      if (selectedId && w2ui['menu'].get(selectedId)) {
        w2ui['menu'].select(selectedId);
        w2ui['menu'].expandParents(selectedId);
        (function(id) {
          setTimeout(function() {
            if (!isMenuItemVisible(id)) w2ui['menu'].scrollIntoView(id);
          }, 50);
        })(selectedId);
      }
    }, 200);
  } else {
    $('#filters').fadeOut(250);
    $("#menuBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      w2ui['menu'].topHTML = '<div id="filterDisplay" onclick="filterDisplay()">&or;&or;Show Filters&or;&or;</div>';
      var selectedNode = w2ui['menu'].find({selected: true});
      var selectedId = (selectedNode.length > 0) ? selectedNode[0].id : null;
      w2ui['menu'].refresh();
      if (selectedId && w2ui['menu'].get(selectedId)) {
        w2ui['menu'].select(selectedId);
        w2ui['menu'].expandParents(selectedId);
        (function(id) {
          setTimeout(function() {
            if (!isMenuItemVisible(id)) w2ui['menu'].scrollIntoView(id);
          }, 50);
        })(selectedId);
      }
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
    } else if (w2ui['menu'].get(id)) adjustCount(w2ui['menu'].get(id).parent.id, 1);    
  }
  else if (type == "crew") filterCrewMenu();
  else if (type == "name") w2ui['menu'].get(id).text = "<span>" + currName(ops.craftsMenu.find(o => o.db === id), true) + "</span>";
  else console.log("unknown menu update: " + type);
  var selectedNode = w2ui['menu'].find({selected: true});
  var selectedId = (selectedNode.length > 0) ? selectedNode[0].id : null;
  w2ui['menu'].refresh();
  if (selectedId && w2ui['menu'].get(selectedId)) {
    w2ui['menu'].select(selectedId);
    w2ui['menu'].expandParents(selectedId);
    (function(id) {
      setTimeout(function() {
        w2ui['menu'].scrollIntoView(id);
      }, 50);
    })(selectedId);
  }
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
    if (KSA_UI_STATE.isGGBAppletLoaded && !KSA_UI_STATE.isGGBAppletRefreshing) {
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
    
    // make sure this is badged after the menu is re-sorted, unless it is currently being viewed
    // if currently viewed, pass the ID to filterInactiveMenu so it can be selected after rebuild
    if (ops.pageType == "vessel" && ops.currentVessel.Catalog.DB == item.db) {
      item.badged = false;
      filterInactiveMenu(null, item.db);
    } else {
      item.badged = true;
      filterInactiveMenu();
    }

    // remove this from the active vessels list if it's on there and update the counts
    for (vessIndex=0; vessIndex<ops.activeVessels.length; vessIndex++) {
      if (ops.activeVessels[vessIndex].db == item.db) {
        ops.activeVessels.splice(vessIndex, 1);
        activeVesselCount()
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
  if (!menuItem) return strID;
  if (menuItem.text.includes("bold")) return null;
  if (menuItem.selected) return false;

  // bold the text to identify it has updated information and badge all parent folders
  menuItem.text = menuItem.text.replace("<span>", "<span style='font-weight: bold;'>");
  adjustCount(menuItem.parent.id, 1);
  if (!noRefresh) w2ui['menu'].refresh();

  // crew need a special flag to handle the resorting after data load
  if (menuItem.img == "icon-crew") ops.crewMenu.find(o => o.db === strID).badged = true;
  else ops.craftsMenu.find(o => o.db === strID).badged = true;

  // if selection is off, but the menu refreshed, just scroll into view the current selection
  // since multiple items may be badged in one pass, use a timer handle to avoid excessive scrolling
  if (noSelect && !noRefresh) {
    if (KSA_TIMERS.menuRefresh) clearTimeout(KSA_TIMERS.menuRefresh);
    KSA_TIMERS.menuRefresh = setTimeout(function() { w2ui['menu'].scrollIntoView(); }, 50);
  } else if (!noSelect) w2ui['menu'].scrollIntoView(strID);

  return true;
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
function addVesselByDate(item, parentFolder = "inactiveVessels", addMonths = true) {

  // get the current filter type to determine the wrap width
  if ($("input[name=inactive]").filter(":checked").val() == "vessel" || $("input[name=inactive]").filter(":checked").val() == "start" || $("input[name=inactive]").filter(":checked").val() == "end") {
    var wrapLimit = 210;
  } else {
    var wrapLimit = 180;
  }

  // get the date for this vessel and extract the month and year
  var dateUT = UTtoDateTime(item.end, true).split("@")[0];
  if ($("input[name=inactive]").filter(":checked").val() == "start") dateUT = UTtoDateTime(item.start, true).split("@")[0];
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
                                                                 text: year + "(0)",
                                                                 img: 'icon-folder',
                                                                 count: null });
        break;
      }
    }
    if (index == menuNodes.length) {
      w2ui['menu'].add(parentFolder, { id: parentFolder + year,
                                       text: year + "(0)",
                                       img: 'icon-folder', 
                                       count: null });
    }
  }

  if (addMonths) {

    // if this month does not have a menu entry, insert one
    // sort ascending
    if (!w2ui['menu'].find(parentFolder + year, { id: parentFolder + year + '-' + month }).length) {
      menuNodes = w2ui['menu'].get(parentFolder, parentFolder + year).nodes;
      for (index=0; index<menuNodes.length; index++) {
        if (parseInt(menuNodes[index].id.split("-")[1]) > parseInt(month)) {
          w2ui['menu'].insert(parentFolder + year, menuNodes[index].id, { id: parentFolder + year + '-' + month,
                                                                          text: monthNames[month-1] + " (0)",
                                                                          img: 'icon-folder',
                                                                          count: null });
          break;
        }
      }
      if (index == menuNodes.length) {
        w2ui['menu'].add(parentFolder + year, { id: parentFolder + year + '-' + month,
                                                text: monthNames[month-1] + " (0)",
                                                img: 'icon-folder',
                                                count: null });
      }
    }
  
    // add the vessel to this month/year
    w2ui['menu'].add(parentFolder + year + '-' + month, { id: item.db,
                                                          text: "<span>" + wrapText(wrapLimit, currName(item), 14) + "</span>",
                                                          img: 'icon-' + item.type,
                                                          count: null });
    updateFolderCount(parentFolder + year + '-' + month);
  }

  // otherwise just add to the year
  else {
    w2ui['menu'].add(parentFolder + year, { id: item.db,
                                            text: "<span>" + wrapText(wrapLimit, currName(item), 14) + "</span>",
                                            img: 'icon-' + item.type,
                                            count: null });    
    updateFolderCount(parentFolder + year);
  }

  // decide whether to highlight this menu item
  if (item.badged) badgeMenuItem(item.db, true, true);
}

// selects the item from the menu and also makes sure to remove any badges
function selectMenuItem(menuID, retryCount = 0) {
  var menuNode = w2ui['menu'].get(menuID);
  if (!menuNode) {
    
    // if the menu node doesn't exist yet, retry a few times in case the menu is still being populated
    if (retryCount < 20) {
      return setTimeout(selectMenuItem, 50, menuID, retryCount + 1);
    }
    console.log("improper menu id: " + menuID);
    return false;
  }
  w2ui['menu'].select(menuID);
  w2ui['menu'].expandParents(menuID);
  if (menuNode.text.includes("bold")) {
    menuNode.text = menuNode.text.replace(" style='font-weight: bold;'", "");
    if (menuNode.img.includes("crew")) ops.crewMenu.find(o => o.db === menuNode.id).badged = false;
    else ops.craftsMenu.find(o => o.db === menuNode.id).badged = false;
    adjustCount(menuNode.parent.id, -1);
    w2ui['menu'].refresh();
    w2ui['menu'].select(menuID);
    w2ui['menu'].expandParents(menuID);
    (function(id) {
      setTimeout(function() {
        w2ui['menu'].scrollIntoView(id);
      }, 50);
    })(menuID);
  } else {
    w2ui['menu'].scrollIntoView(menuID);
  }
  return true;
}

// iterate up through the parents to add a value to the number count
function updateFolderCount(folderID) {
  var nodeObj = w2ui['menu'].get(folderID);

  // get the current count number for the folder, inside (), and increment it then plug it back in
  var countVal = parseInt(nodeObj.text.split("(")[1].split(")")[0]);
  countVal++;
  nodeObj.text = nodeObj.text.split("(")[0] + "(" + countVal + ")";

  // keep going if there is a parent folder
  if (nodeObj.parent.name == "menu") return;
  else updateFolderCount(nodeObj.parent.id);
}

// determine what type the vessel currently is by starting from the end of the possibilites and working back until we find one within the current UT
// or if there is only one possibility just return that straight away
function currType(strType) {
  var types = strType.split("|");
  if (types.length > 1) {
    for (index=types.length-1; index>=0; index--) {
      if (types[index].split(";")[0] <= currUT()) return types[index].split(";")[1];
    }
  } else return strType;
}

// updates the numbers shown for vessels in a system
function activeVesselCount() {
  w2ui['menu'].get("activeVessels").text = "Active Vessels";
  var menuNodes = w2ui['menu'].find('activeVessels', { hidden: false });
  menuNodes.forEach(function(item) {
    if (item.text.includes("(")) item.text = item.text.split("(")[0].trim();
    if (item.img != "icon-body") increaseCount(item);
  });
}
function increaseCount(node) {
  if (node.parent && (node.parent.img == "icon-body" || node.parent.id == "activeVessels")) {
    if (!node.parent.text.includes("(")) node.parent.text += " (0)";
    node.parent.text = node.parent.text.split("(")[0] + "(" + (parseInt(node.parent.text.split("(")[1].split(")")[0]) + 1) + ")";
  }
  if (node.parent) increaseCount(node.parent);
  else return;
}