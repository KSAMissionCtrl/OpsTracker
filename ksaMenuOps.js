function loadMenuAJAX(xhttp) {
  
  // make sure the body catalog is loaded before continuing
  if (!bodyCatalog.length) return setTimeout(loadMenuAJAX, 100, xhttp);
  
  // stop the spinner
  $("#menuBox").spin(false);
  
  // parse the data
  var crafts = xhttp.responseText.split("^")[0].split("*");
  var crew = xhttp.responseText.split("^")[1].split("|");
  crafts.forEach(function(item, index) {
    var fields = item.split("~");

    // default body ref is Kerbin. If there is more than one SOI entry reset to the second to last ref num
    var bodyRef = 3;
    if (fields[2].split("|").length > 1) bodyRef = parseInt(fields[2].split("|")[fields[2].split("|").length-2].split(";")[1]);
    craftsMenu.push({DB: fields[0],
                     Name: fields[1],
                     SOI: fields[2],
                     Type: fields[3],
                     Start: parseInt(fields[4]),
                     End: parseInt(fields[5]),
                     Program: fields[6],
                     Vessel: fields[7],
                     BodyRef: bodyRef,
                     Badged: false});
  });
  crew.forEach(function(item, index) {
    var fields = item.split("~");
    crewMenu.push({Name: fields[0],
                   Status: fields[1],
                   Rank: fields[2],
                   Assignment: fields[3],
                   DB: fields[4],
                   UT: fields[5],
                   Badged: false});

    // check if crew has yet to be added
    if (parseInt(fields[5]) > currUT()) updatesList.push({ Type: "menu;crew", ID: fields[4], UT: parseInt(fields[5]) });

    // setup for full data load for any active crew
    if (fields[1] != "Deceased") {
      opsCatalog.push({ID: fields[4],
                       Type: "crew",
                       isLoading: false,
                       CurrentData: null,
                       FutureData: null});
    }
  });
  console.log(craftsMenu);
  console.log(crewMenu);
  
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
    onClick: function (event) {
      var checkNew = false;
      
      // the type of node image will tell us what to load
      ////////////
      // Load Body
      ////////////
      if (event.node.img.includes("body")) {
      
        // make sure this body isn't already loaded before refreshing the page if it is a body page
        if ((strCurrentBody != event.node.id && pageType == "body") || (strCurrentBody == event.node.id && pageType != "body") || (strCurrentBody != event.node.id && pageType != "body")) { 

          // only allow non-system ids that are under the main category to load
          // otherwise load the parent id
          if (!event.node.id.includes("System")) {
            if (event.node.parent.id == "activeVessels") {
              swapContent("body", event.node.id); 
            } else {
              if (strCurrentBody != event.node.parent.id.split("-")[0]) {
                swapContent("body", event.node.parent.id);
              }
            }
          } else {
            swapContent("body", event.node.id); 
          }
        
        // if the body is already loaded, hide the map if it's visible
        } else hideMap();

      //////////////////
      // Load Crew Page
      //////////////////
      } else if (event.node.img.includes("crew") && event.node.id != "crewFull") {
      
        // make sure this crew member isn't already loaded before refreshing the page if it is a crew page
        if ((strCurrentCrew != event.node.id && pageType == "crew") || (strCurrentCrew == event.node.id && pageType != "crew") || (strCurrentCrew != event.node.id && pageType != "crew")) { swapContent("crew", event.node.id); }

      ///////////////////
      // Load Full Roster
      ///////////////////
      } else if (event.node.img.includes("crew") && event.node.id == "crewFull") {
        checkNew = true;
        if (pageType != event.node.id) { swapContent("crewFull", event.node.id); }
        
      /////////////////
      // Load Aircraft
      /////////////////
      } else if (event.node.img.includes("aircraft") && event.node.parent.id != "inactiveVessels") {
        checkNew = true;

        // check that we are looking at the proper map (hardcoded to Kerbin), and load it if not
        // this will append the flight name to the URL and the path will be loaded
        if (!strCurrentBody || (strCurrentBody && !strCurrentBody.includes("Kerbin"))) {
          swapContent("body", "Kerbin-System", event.node.id);

          // don't let an accidental double-click load this twice
          strFltTrackLoading = event.node.id;
        }

        // however if the system is already set to Kerbin, just load the path straight to the map
        else {

          // don't try to load this if it is already being loaded
          if (strFltTrackLoading != event.node.id) {

            // if this isn't the right page type, set it up
            if (pageType != "body") swapContent("body", "Kerbin-System", event.node.id);
            setTimeout(showMap, 1000);

            // call for the aircraft track if it doesn't already exist
            var path = fltPaths.find(o => o.ID === event.node.id);
            if (!path) {
              surfaceTracksDataLoad.fltTrackDataLoad = L.layerGroup();
              layerControl._expand();
              layerControl.options.collapsed = false;
              layerControl.addOverlay(surfaceTracksDataLoad.fltTrackDataLoad, "<i class='fa fa-cog fa-spin'></i> Loading Data...", "Flight Tracks");
              loadDB("loadFltData.asp?data=" + event.node.id, loadFltDataAJAX);

            // if the data already exists...
            } else {
              
              // add it back to the map and the control if it has been removed
              if (path.Deleted) {
                layerControl.addOverlay(path.Layer, "<i class='fa fa-minus' style='color: " + path.Color + "'></i> " + path.Info.Title, "Flight Tracks");
                path.Layer.addTo(surfaceMap);
                path.Deleted = false;
                
              // just add it back to the map in case it was hidden
              } else if (!surfaceMap.hasLayer(path.Layer)) path.Layer.addTo(surfaceMap);
              showMap();
            }
          }
        }
        
      ////////////
      // Load DSN
      ///////////
      } else if (event.node.img.includes("dish")) {
        
        // for now, we link to another page for the DSN
        window.open("http://www.kerbalspace.agency/?p=3736");
      
      //////////////
      // Load Vessel
      //////////////
      // anything else that isn't a folder is a vessel
      // except if the parent is the Inactive Vessels node as that's just a category node
      } else if (!event.node.img.includes("folder") && event.node.parent.id != "inactiveVessels") {
        checkNew = true;
        
        // make sure this vessel isn't already loaded before refreshing the page if it is a vessel page
        if ((strCurrentVessel != event.node.id && pageType == "vessel") || (strCurrentVessel == event.node.id && pageType != "vessel") || (strCurrentVessel != event.node.id && pageType != "vessel")) { swapContent("vessel", event.node.id); }
      }
      
      // should we see if this is a bolded entry, if so adjust the count and return it to normal
      if (event.node.text.includes("bold")) {
        event.node.text = event.node.text.replace(" style='font-weight: bold;'", "");
        if (event.node.img.includes("crew")) crewMenu.find(o => o.DB === event.node.id).Badged = false;
        adjustCount(event.node.parent.id, -1);
        w2ui['menu'].refresh();
        w2ui['menu'].scrollIntoView(event.node.id);
      }
    },
    onExpand: function (event) {
    
      // wait a moment to allow menu to resize itself after showing the nodes
      if (event.target == 'crew') { setTimeout(function() { w2ui['menu'].scrollIntoView('crewFull'); }, 150); }
      else if (event.target == 'dsn') { setTimeout(function() { w2ui['menu'].scrollIntoView('dsnInfo'); }, 150); }
      else if (event.target == 'inactiveVessels') { setTimeout(function() { w2ui['menu'].scrollIntoView(event.object.nodes[0].id); }, 150); }
    },
    onRender: function (event) {
    
      // depending on the height of the event box, size the menu so the twitter widget isn't pushed off the bottom of the screen
      var maxHeight = 340;
      var height = (maxHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height);
    },
    bottomHTML: '<div id="menuResize" onclick="menuResize()">&or;&or;Expand Menu&or;&or;</div>',
    topHTML: '<div id="filterDisplay" onclick="filterDisplay()">&or;&or;Show Filters&or;&or;</div>',
  });
  
  // build the menu for active/inactive vessels
  craftsMenu.forEach(function(item) { addMenuItem(item) });
  isMenuDataLoaded = true;
  
  // begin loading the full data set for all active vessels and crew
  loadOpsDataAJAX();
  
  // setup the crew menu & handle future changes
  filterInactiveMenu();
  filterCrewMenu();
  $('input:radio[name=inactive]').change(function () { filterInactiveMenu(); });
  $('input:radio[name=roster]').change(function () { filterCrewMenu(); });
  
  // show what was loaded if there are no cookies, otherwise we need to wait for a cookie check after ops data load
  if (!checkCookies()) {
    var menuID;
    if (getParameterByName("body")) { menuID = getParameterByName("body"); }
    if (getParameterByName("vessel")) { menuID = getParameterByName("vessel"); }
    if (getParameterByName("crew")) { menuID = getParameterByName("crew"); }
    if (menuID && !window.location.href.includes("flt")) {
      w2ui['menu'].select(menuID);
      w2ui['menu'].expandParents(menuID);
      w2ui['menu'].scrollIntoView(menuID);
    }
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

// re-sort the inactive vessels menu based on the current selection, or choose a new one
function filterInactiveMenu(id) {
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
    for (var i=0; i<del.length; i++) {
      w2ui['menu'].remove(del[i].id);
    }
  }

  // build the new menu depending on which filter was selected
  if (currOption == "type") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    craftsMenu.sort(function(a,b) {return (a.Type > b.Type) ? 1 : ((b.Type > a.Type) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (!w2ui['menu'].find('inactiveVessels', { id: item.Type }).length) {
          w2ui['menu'].add('inactiveVessels', { id: item.Type,
                                                text: capitalizeFirstLetter(item.Type),
                                                img: 'icon-' + item.Type,
                                                count: null });
        }
      }
    });
    craftsMenu.sort(function(a,b) {return (a.End > b.End) ? 1 : ((b.End > a.End) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        addVesselByDate(item, item.Type)
      }
    });
  } else if (currOption == "vessel") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    craftsMenu.sort(function(a,b) {return (a.Vessel > b.Vessel) ? 1 : ((b.Vessel > a.Vessel) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Vessel != "null" && !w2ui['menu'].find('inactiveVessels', { id: item.Vessel }).length) {
          w2ui['menu'].add('inactiveVessels', { id: item.Vessel,
                                                text: item.Vessel,
                                                img: 'icon-folder',
                                                count: null });
        }
      }
    });
    craftsMenu.sort(function(a,b) {return (a.End > b.End) ? 1 : ((b.End > a.End) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Vessel != "null") addVesselByDate(item, item.Vessel)
      }
    });
  } else if (currOption == "program") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    craftsMenu.sort(function(a,b) {return (a.Program > b.Program) ? 1 : ((b.Program > a.Program) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Program != "null" && !w2ui['menu'].find('inactiveVessels', { id: item.Program }).length) {
          w2ui['menu'].add('inactiveVessels', { id: item.Program,
                                                text: item.Program,
                                                img: 'icon-folder',
                                                count: null });
        }
      }
    });
    craftsMenu.sort(function(a,b) {return (a.End > b.End) ? 1 : ((b.End > a.End) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Program != "null") addVesselByDate(item, item.Program)
      }
    });
  } else if (currOption == "start") {

    // sort by start date to add vessels
    craftsMenu.sort(function(a,b) {return (a.Start > b.Start) ? 1 : ((b.Start > a.Start) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Program != "null") addVesselByDate(item)
      }
    });
  } else if (currOption == "end") {

    // sort by start date to add vessels
    craftsMenu.sort(function(a,b) {return (a.End > b.End) ? 1 : ((b.End > a.End) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Program != "null") addVesselByDate(item)
      }
    });
  } else if (currOption == "body") {

    // sort by filter option first to create folders, then re-sort by end date to add vessels
    craftsMenu.sort(function(a,b) {return (a.BodyRef > b.BodyRef) ? 1 : ((b.BodyRef > a.BodyRef) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.BodyRef != "null" && !w2ui['menu'].find('inactiveVessels', { id: "refNum" + item.BodyRef }).length) {
          w2ui['menu'].add('inactiveVessels', { id: "refNum" + item.BodyRef,
                                                text: bodyCatalog.find(o => o.ID === item.BodyRef).Body,
                                                img: 'icon-body',
                                                count: null });
        }
      }
    });
    craftsMenu.sort(function(a,b) {return (a.End > b.End) ? 1 : ((b.End > a.End) ? -1 : 0);} );
    craftsMenu.forEach(function(item) {
      if (currSOI(item)[0] == -1) {
        if (item.Program != "null") addVesselByDate(item, "refNum" + item.BodyRef)
      }
    });
  }
  w2ui['menu'].refresh();
  
  if (selectedNode) {
    w2ui['menu'].select(selectedNode);
    w2ui['menu'].expandParents(selectedNode);
    w2ui['menu'].scrollIntoView(selectedNode);
  }
}

// re-sort the crew menu based on the current selection, or choose a new one
function filterCrewMenu(id) {
  if (id) $('input:radio[name=roster]').filter('[id=' + id + ']').prop('checked', true);
  var currOption = $("input[name=roster]").filter(":checked").val();

  // remove all but the first node
  if (w2ui['menu'].get('crew').nodes.length > 1) {
  
    // create a copy of the array so we can delete things one by one
    var del = w2ui['menu'].get('crew').nodes.slice(0);
    for (var i=1; i<del.length; i++) {
      w2ui['menu'].remove(del[i].id);
    }
  }

  // build the new menu depending on which filter was selected
  if (currOption == "name") {
  
    // sort the array as required
    // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value-in-javascript
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        if (item.Name.charAt(0) <= "F") {
          if (!w2ui['menu'].find('crew', { id: 'a-f' }).length) {
            w2ui['menu'].add('crew', { id: 'a-f',
                                      text: "A - F",
                                      img: 'icon-folder'});
          }
          w2ui['menu'].add('a-f', { id: item.DB,
                                    text: "<span>" + item.Name + " Kerman</span>",
                                    img: 'icon-crew'});
          if (item.Badged) badgeMenuItem(item.DB, true, true);
        } else if (item.Name.charAt(0) <= "L") {
          if (!w2ui['menu'].find('crew', { id: 'g-l' }).length) {
            w2ui['menu'].add('crew', { id: 'g-l',
                                      text: "G - L",
                                      img: 'icon-folder'});
          }
          w2ui['menu'].add('g-l', { id: item.DB,
                                    text: "<span>" + item.Name + " Kerman</span>",
                                    img: 'icon-crew'});
          if (item.Badged) badgeMenuItem(item.DB, true, true);
        } else if (item.Name.charAt(0) <= "R") {
          if (!w2ui['menu'].find('crew', { id: 'm-r' }).length) {
            w2ui['menu'].add('crew', { id: 'm-r',
                                      text: "M - R",
                                      img: 'icon-folder'});
          }
          w2ui['menu'].add('m-r', { id: item.DB,
                                    text: "<span>" + item.Name + " Kerman</span>",
                                    img: 'icon-crew'});
          if (item.Badged) badgeMenuItem(item.DB, true, true);
        } else {
          if (!w2ui['menu'].find('crew', { id: 's-z' }).length) {
            w2ui['menu'].add('crew', { id: 's-z',
                                      text: "S - Z",
                                      img: 'icon-folder'});
          }
          w2ui['menu'].add('s-z', { id: item.DB,
                                    text: "<span>" + item.Name + " Kerman</span>",
                                    img: 'icon-crew'});
          if (item.Badged) badgeMenuItem(item.DB, true, true);
        }
      }
    });
  } else if (currOption == "status") {

    // sort by filter option first to create folders, then re-sort by name to add kerbals
    crewMenu.sort(function(a,b) {return (a.Status > b.Status) ? 1 : ((b.Status > a.Status) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        if (!w2ui['menu'].find('crew', { id: item.Status }).length) {
          w2ui['menu'].add('crew', { id: item.Status,
                                     text: item.Status,
                                     img: 'icon-folder'});
        }
      }
    });
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        w2ui['menu'].add(item.Status, { id: item.DB,
                                        text: "<span>" + item.Name + " Kerman</span>",
                                        img: 'icon-crew'});
        if (item.Badged) badgeMenuItem(item.DB, true, true);
      }
    });
  } else if (currOption == "rank") {
    crewMenu.sort(function(a,b) {return (a.Rank > b.Rank) ? 1 : ((b.Rank > a.Rank) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        if (!w2ui['menu'].find('crew', { id: item.Rank }).length) {
          w2ui['menu'].add('crew', { id: item.Rank,
                                     text: item.Rank,
                                     img: 'icon-folder'});
        }
      }
    });
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        w2ui['menu'].add(item.Rank, { id: item.DB,
                                      text: "<span>" + item.Name + " Kerman</span>",
                                      img: 'icon-crew'});
        if (item.Badged) badgeMenuItem(item.DB, true, true);
      }
    });
  } else if (currOption == "assignment") {
    crewMenu.sort(function(a,b) {return (a.Assignment > b.Assignment) ? 1 : ((b.Assignment > a.Assignment) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        if (item.Assignment && !w2ui['menu'].find('crew', { id: item.Assignment }).length) {
          w2ui['menu'].add('crew', { id: item.Assignment,
                                     text: item.Assignment,
                                     img: 'icon-folder'});
        }
      }
    });
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.UT <= currUT()) {
        if (item.Assignment) {
          w2ui['menu'].add(item.Assignment, { id: item.DB,
                                              text: "<span>" + item.Name + " Kerman</span>",
                                              img: 'icon-crew'});
          if (item.Badged) badgeMenuItem(item.DB, true, true);
        }
      }
    });
  }
  
  // if we are looking at the full crew roster, refresh the view
  if (pageType == "crewFull") {
    $('#fullRoster').empty(); 
    crewList = extractIDs(w2ui['menu'].get('crew').nodes).split(";");
    strCurrentCrew = showFullRoster();
    loadCrewAJAX();
  }
}

// hides the twitter widget to allow the menu to use the full height of the right-side content area, preserves event box
function menuResize() {
  if ($('#menuResize').html().includes("Expand")) {
    $('#twitterBox').fadeOut(250, "swing", function () { 
      maxMenuHeight = 882;
      var height = (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height); 
      setTimeout(function() { 
        w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&and;&and;Collapse Menu&and;&and;</div>';
        w2ui['menu'].refresh(); 
      }, 200);
    });
  } else {
    maxMenuHeight = 340;
    var height = (maxMenuHeight - w2utils.getSize("#eventBox", 'height')) + "px";
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
    if (nodes[i].nodes.length) { strIDs += extractIDs(nodes[i].nodes.slice(0), moon); }
      
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
  if (!w2ui['menu'].get(nodeID).parent.id) {return null; }
  else if (w2ui['menu'].get(nodeID).parent.id == "inactiveVessels") { return "inactive"; }
  else if (w2ui['menu'].get(nodeID).parent.id.includes("System")) { return w2ui['menu'].get(nodeID).parent.id; }
  else { return getParentSystem(w2ui['menu'].get(nodeID).parent.id); }
}

// recursive function to find all parent nodes and increase/decrease their update count
function adjustCount(nodeID, adjust) {
  var node = w2ui['menu'].get(nodeID);
  if (node.count) {
    node.count += adjust;
    if (node.count <= 0) node.count = null;
  } else if (!node.count && adjust > 0) node.count = 1;
  if (node.parent.id) { 
    return adjustCount(node.parent.id, adjust);
  } else {
    w2ui['menu'].expand(node.id);
    return;
  }
}

function menuUpdate(type, ID) {
  if (type == "soi") {
    w2ui['menu'].remove(ID);
    
    // are we looking at it?
    if (pageType == "vessel" && strCurrentVessel == ID) {
      addMenuItem(craftsMenu.find(o => o.DB === ID));
      w2ui['menu'].select(ID);
      w2ui['menu'].expandParents(ID);
      w2ui['menu'].scrollIntoView(ID);
    } else {
      addMenuItem(craftsMenu.find(o => o.DB === ID), true);
      adjustCount(w2ui['menu'].get(ID).parent.id, 1);
    }
  } else if (type == "crew") {
    filterCrewMenu();
  } else if (type == "name") {
    w2ui['menu'].get(ID).text = "<span>" + currName(craftsMenu.find(o => o.DB === ID), true) + "</span>";
  } else console.log("unknown menu update: " + type);
  w2ui['menu'].refresh();
}

function addMenuItem(item, newAdd) {
  if (!newAdd) newAdd = false;

  // figure out what SOI this is in, if any, and whether it's switching to another status later
  var refNumUT = currSOI(item, true);

  // if this vessel has more than one name, get the current one
  // also check for a future name update
  var strVesselName = currName(item, true);

  // decide whether to highlight this menu item
  var strStyle = "<span>";
  if (newAdd) strStyle = "<span style='font-weight: bold;'>";
  
  // handle either an active or inactive vessel
  if (refNumUT[0] >= 0) {
  
    // figure out which body this vessel belongs to
    var body = bodyCatalog.find(o => o.ID === refNumUT[0]);
    if (!body) { console.log(bodyCatalog); console.log(refNumUT[0]); }

    // if this body has moons, it is defined as a system
    var strSys = "";
    if (body.Moons.length) { strSys = "-System"; }

    // if this body is not visible, make it so
    if (w2ui['menu'].get('activeVessels', body.Body + strSys).hidden) { 
      w2ui['menu'].set('activeVessels', body.Body + strSys, { hidden: false }); 
    }
    
    // get the nodes for this body and insert the vessel alphabetically, after any moons
    // or add it at the end if nothing to insert before
    var index;
    var menuNodes = w2ui['menu'].get('activeVessels', body.Body + strSys).nodes;
    for (index=0; index<menuNodes.length; index++) {
      var strMenuText = menuNodes[index].text.split(">")[1].split("<")[0];
      if (!menuNodes[index].img.includes("body") && strMenuText > strVesselName) {
        w2ui['menu'].insert(body.Body + strSys, menuNodes[index].id, { id: item.DB,
                                                                       text: strStyle + strVesselName + "</span>",
                                                                       img: 'icon-' + item.Type,
                                                                       count: null });
        break;
      }
    }
    if (index == menuNodes.length) {
      w2ui['menu'].add(body.Body + strSys, { id: item.DB,
                                             text: strStyle + strVesselName + "</span>",
                                             img: 'icon-' + item.Type,
                                             count: null });
    }

    // enable & check the checkbox for this type of vessel
    $("#" + item.Type + "-menu").removeAttr("disabled");
    $("#" + item.Type + "-menu").prop('checked', true);
    
    // as an active vessel, we will want to load all its data
    opsCatalog.push({ID: item.DB,
                     Type: "vessel",
                     isLoading: false,
                     CurrentData: null,
                     FutureData: null});

  // don't check on inactive vessels unless this is a new menu item being added
  // this avoids repeated filter calls during the initial menu load
  } else if (refNumUT[0] == -1 && newAdd) {
    
    // make sure this is badged after the menu is re-sorted
    item.Badged = true;
    filterInactiveMenu();
  }
}

// allows the user to see that a vessel/crew member has new data since the page was originally or last loaded
function badgeMenuItem(strID, noSelect, noRefresh) {
  if (!noRefresh) noRefresh = false;
  if (!noSelect) noSelect = false;
  var menuItem = w2ui['menu'].get(strID);

  // don't alter this item if it's already been badged, is currently selected or hasn't been found
  if (!menuItem) return;
  if (menuItem.text.includes("bold")) return;
  if (menuItem.selected) return;

  // bold the text to identify it has updated information and badge all parent folders
  menuItem.text = menuItem.text.replace("<span>", "<span style='font-weight: bold;'>");
  adjustCount(menuItem.parent.id, 1);
  if (!noRefresh) w2ui['menu'].refresh();

  // crew need a special flag to handle the resorting after data load
  if (menuItem.img == "icon-crew") crewMenu.find(o => o.DB === strID).Badged = true;

  // if selection is off, but the menu refreshed, just scroll into view the current selection
  if (noSelect && !noRefresh) w2ui['menu'].scrollIntoView();
  else if (!noSelect) w2ui['menu'].scrollIntoView(strID);
}

// get the current body being orbited for the current time
function currSOI(vessel, updateCheck, utCheck) {
  if (!updateCheck) updateCheck = false;
  if (!utCheck) utCheck = currUT();
  var refNum = -2;
  var refIndex;
  var refUT;

  // tricky but works to allow alternate string literal input rather than an object
  if (!vessel) {
    var soi = updateCheck.split("|");
    updateCheck = false;
  } else var soi = vessel.SOI.split("|");

  for (refIndex=0; refIndex<soi.length; refIndex++) {
    var pair = soi[refIndex].split(";");
    if (parseFloat(pair[0]) > utCheck) break;
    refNum = parseInt(pair[1]);
    refUT = parseInt(pair[0]);
  }

  // check for a future SOI update?
  if (updateCheck && refIndex < soi.length) { updatesList.push({ Type: "menu;soi", ID: vessel.DB, UT: parseInt(soi[refIndex].split(";")[0]) }); }
  return [refNum, refUT];
}

// checks if the vessel has more than one possible name, and returns the one for the given time
function currName(vessel, updateCheck, utCheck) {
  if (!updateCheck) updateCheck = false;
  if (!utCheck) utCheck = currUT();

  // tricky but works to allow alternate string literal input rather than an object
  if (!vessel) {
    var strNames = updateCheck;
    updateCheck = false;
  } else var strNames = vessel.Name;

  if (strNames.includes("|")) {
    var nameIndex;
    var names = strNames.split("|");
    for (nameIndex=0; nameIndex<names.length; nameIndex++) {
      var pair = names[nameIndex].split(";");
      if (parseFloat(pair[0]) > utCheck) break;
      strVesselName = pair[1];
    }
    if (updateCheck && nameIndex < names.length) { updatesList.push({ Type: "menu;name", ID: vessel.DB, UT: parseInt(names[nameIndex].split(";")[0]) }); }
  } else { strVesselName = strNames; }
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
function addVesselByDate(item, parentFolder) {
  if (!parentFolder) parentFolder = "inactiveVessels";

  // get the current filter type to determine the wrap width
  if ($("input[name=inactive]").filter(":checked").val() == "start" || $("input[name=inactive]").filter(":checked").val() == "end") {
    var wrapLimit = 210;
  } else {
    var wrapLimit = 180;
  }

  // get the date for this vessel and extract the month and year
  var dateUT = UTtoDateTime(item.End, true).split("@")[0];
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
  w2ui['menu'].add(parentFolder + year + '-' + month, { id: item.DB,
                                                      text: "<span>" + wrapText(wrapLimit, currName(item), 14) + "</span>",
                                                      img: 'icon-' + item.Type,
                                                      count: null });
  if (item.Badged) badgeMenuItem(item.DB, true, true);
}