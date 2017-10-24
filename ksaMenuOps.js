function loadMenuAJAX(xhttp) {
  
  // stop the spinner
  $("#menuBox").spin(false);
  
  // parse the data
  var menuData = xhttp.responseText.split("^");
  var crafts = menuData[0].split("*");
  var crew = menuData[1].split("|");
  crafts.forEach(function(item, index) {
    var craft = {};
  
    // separate the fields of this craft
    var fields = item.split("`");
    fields.forEach(function(item, index) {
    
      // now get the name/value and assign the object
      var pair = item.split("~");
      craft[pair[0]] = pair[1];
    });
    craftsMenu.push(craft);
  });
  
  // crew members returned as null are not yet able to be shown until a later date
  crew.forEach(function(item, index) {
    var fields = item.split("~");
    if (fields[0] != "null") {
      crewMenu.push({Name: fields[0],
                     Status: fields[1],
                     Rank: fields[2],
                     Assignment: fields[3],
                     DB: fields[4]});
    }

    // upcoming event?
    if (fields[5] != "null") { updatesList.push({ Type: "menu;crew", ID: fields[4], UT: parseInt(fields[5]) }); }
  });
  
  // create the basic menu
  $('#menuBox').w2sidebar({
    name  : 'menu',
    img   : null,
    nodes : [ 
      { id: 'activeVessels', text: 'Active Vessels', expanded: false, group: true,
        nodes: [ 
          { id: 'Kerbol-System', text: 'Kerbol', img: 'icon-body' },
          { id: 'Moho', text: 'Moho', img: 'icon-body', hidden: true },
          { id: 'Eve-System', text: 'Eve', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Gilly', text: 'Gilly', img: 'icon-body', hidden: true }
            ]},
          { id: 'Kerbin-System', text: 'Kerbin', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Mun', text: 'Mun', img: 'icon-body', hidden: true },
              { id: 'Minmus', text: 'Minmus', img: 'icon-body', hidden: true }
            ]},
          { id: 'Duna-System', text: 'Duna', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Ike', text: 'Ike', img: 'icon-body', hidden: true }
            ]},
          { id: 'Dres', text: 'Dres', img: 'icon-body', hidden: true },
          { id: 'Sorlon', text: 'Sorlon', img: 'icon-body', hidden: true },
          { id: 'Jool-System', text: 'Jool', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Laythe', text: 'Laythe', img: 'icon-body', hidden: true },
              { id: 'Vall', text: 'Vall', img: 'icon-body', hidden: true },
              { id: 'Tylo', text: 'Tylo', img: 'icon-body', hidden: true },
              { id: 'Bop', text: 'Bop', img: 'icon-body', hidden: true },
              { id: 'Pol', text: 'Pol', img: 'icon-body', hidden: true }
            ]},
          { id: 'Sarnus-System', text: 'Sarnus', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Hale', text: 'Hale', img: 'icon-body', hidden: true },
              { id: 'Ovok', text: 'Ovok', img: 'icon-body', hidden: true },
              { id: 'Eeloo', text: 'Eeloo', img: 'icon-body', hidden: true },
              { id: 'Slate', text: 'Slate', img: 'icon-body', hidden: true },
              { id: 'Tekto', text: 'Tekto', img: 'icon-body', hidden: true }
            ]},
          { id: 'Urlum-System', text: 'Urlum', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Polta', text: 'Polta', img: 'icon-body', hidden: true },
              { id: 'Priax', text: 'Priax', img: 'icon-body', hidden: true },
              { id: 'Wal-System', text: 'Wal', img: 'icon-body', hidden: true,
                nodes: [
                  { id: 'Tal', text: 'Tal', img: 'icon-body', hidden: true }
                ]}
            ]},
          { id: 'Neidon-System', text: 'Neidon', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Thatmo', text: 'Thatmo', img: 'icon-body', hidden: true },
              { id: 'Nissee', text: 'Nissee', img: 'icon-body', hidden: true },
            ]},
          { id: 'Plock-System', text: 'Plock', img: 'icon-body', hidden: true,
            nodes: [
              { id: 'Karen', text: 'Karen', img: 'icon-body', hidden: true },
            ]}
        ]},
      { id: 'inactiveVessels', text: 'Inactive Vessels', expanded: false, group: true,
        nodes: [ 
          { id: 'aircraft', text: 'Aircraft', img: 'icon-aircraft', hidden: true },
          { id: 'asteroid', text: 'Asteroid', img: 'icon-asteroid', hidden: true },
          { id: 'base', text: 'Base', img: 'icon-base', hidden: true },
          { id: 'debris', text: 'Debris', img: 'icon-debris', hidden: true },
          { id: 'lander', text: 'Lander', img: 'icon-lander', hidden: true },
          { id: 'probe', text: 'Probe', img: 'icon-probe', hidden: true },
          { id: 'rover', text: 'Rover', img: 'icon-rover', hidden: true },
          { id: 'ship', text: 'Ship', img: 'icon-ship', hidden: true },
          { id: 'station', text: 'Station', img: 'icon-station', hidden: true }
        ]},
      { id: 'crew', text: 'Crew Roster', expanded: false, group: true,
        nodes: [ { id: 'crewFull', text: 'Full Roster', img: 'icon-crew'}]},
      { id: 'dsn', text: 'Deep Space Network', expanded: false, group: true,
        nodes: [ { id: 'dsnInfo', text: 'More Information', img: 'icon-dish'}]}
    ],
    onClick: function (event) {
      
      // the type of node image will tell us what to load
      if (event.node.img.includes("body")) {
      
        // don't load a body if another figure is being loaded
        if (isGGBAppletLoaded) {
        
          // do we need to reload the page because it's not a body view?
          if (pageType != "body") {
            window.location.href = "http://www.kerbalspace.agency/Tracker/tracker.asp?body=" + event.node.id;
          } else {
          
            // make sure this body isn't already loaded before refreshing the page
            if (strCurrentBody != event.node.id.split("-")[0]) { 

              // only allow non-system ids that are under the main category to load
              // otherwise load the parent id
              if (!event.node.id.includes("System")) {
                if (event.node.parent.id == "activeVessels") {
                  loadBody(event.node.id); 
                } else {
                  if (strCurrentBody != event.node.parent.id.split("-")[0]) {
                    loadBody(event.node.parent.id);
                  }
                }
              } else {
                loadBody(event.node.id); 
              }
            }
          }
        
        // deselect the item if another figure is loading to show user that click was not valid
        } else { console.log(event.id); }
      } else if (event.node.img.includes("crew")) {
      
        // do we need to reload the page because it's not a roster view?
        if (pageType != "crew") {
          window.location.href = "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + event.node.id;
        } else {
        
          // make sure this crew member isn't already loaded before refreshing the page
          if (strCurrentCrew != event.node.id) { loadCrew(event.node.id); }
        }
      } else if (event.node.img.includes("dish")) {
      
        // for now, we link to another page
        window.open("http://www.kerbalspace.agency/?p=3736");
        
      // anything else that isn't a folder is a vessel
      // except if the parent is the Inactive Vessels node as that's just a category node
      } else if (!event.node.img.includes("folder") && event.node.parent.id != "inactiveVessels") {
        
        // do we need to reload the page because it's not a vessel view?
        if (pageType != "vessel") {
          window.location.href = "http://www.kerbalspace.agency/Tracker/tracker.asp?vessel=" + event.node.id;
        } else {
        
          // make sure this vessel isn't already loaded before refreshing the page
          if (strCurrentVessel != event.node.id) { loadVessel(event.node.id); }
        }
      }
    },
    onExpand: function (event) {
    
      // wait a moment to allow menu to resize itself after showing the nodes
      if (event.target == 'crew') { setTimeout(function() { w2ui['menu'].scrollIntoView('crewFull'); }, 150); }
      else if (event.target == 'dsn') { setTimeout(function() { w2ui['menu'].scrollIntoView('dsnInfo'); }, 150); }
    },
    onRender: function (event) {
    
      // depending on the height of the event box, size the menu so the twitter widget isn't pushed off the bottom of the screen
      var maxHeight = 290;
      var height = (maxHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height);
    },
    bottomHTML: '<div id="menuResize" onclick="menuResize()">&or;&or;Expand Menu&or;&or;</div>',
    topHTML: '<div id="filterDisplay" onclick="filterDisplay()">&or;&or;Show Filters&or;&or;</div>',
  });
  
  // build the menu for active/inactive vessels
  craftsMenu.forEach(function(item, index) {
    
    // get the current body being orbited
    var refNum = -2;
    var refIndex;
    var soi = item.SOI.split("|");
    for (refIndex=0; refIndex<soi.length; refIndex++) {
      var pair = soi[refIndex].split(";");
      if (pair[0] > currUT()) { break; }
      refNum = pair[1];
    }
    
    // check for a future SOI update
    if (refIndex < soi.length) { updatesList.push({ Type: "menu;soi", ID: item.DB, UT: soi[refIndex].split(";")[0] }); }
    
    // if this vessel has more than one name, get the current one
    // also check for a future name update
    var strVesselName;
    if (item.Vessel.includes("|")) {
      var nameIndex;
      var names = item.Vessel.split("|");
      for (nameIndex=0; nameIndex<names.length; nameIndex++) {
        var pair = names[nameIndex].split(";");
        if (pair[0] > currUT()) { break; }
        refNum = pair[1];
      }
      if (nameIndex < names.length) { updatesList.push({ Type: "menu;name", ID: item.DB, UT: names[nameIndex].split(";")[0] }); }
    } else { strVesselName = item.Vessel; }
    
    // handle either an active or inactive vessel
    if (refNum >= 0) {
    
      // figure out which body this vessel belongs to
      var bodyRef;
      for (bodyRef=0; bodyRef<bodyCatalog.length; bodyRef++) { if (bodyCatalog[bodyRef].ID == refNum) { break; } }
      if (bodyRef == bodyCatalog.length) { console.log(strVesselName + " " + refNum); console.log(bodyCatalog); }
      
      // if this body has moons, it is defined as a system
      var strSys = "";
      if (bodyCatalog[bodyRef].Moons.length) { strSys = "-System"; }

      // if this body is not visible, make it so
      if (w2ui['menu'].get('activeVessels', bodyCatalog[bodyRef].Body + strSys).hidden) { 
        w2ui['menu'].set('activeVessels', bodyCatalog[bodyRef].Body + strSys, { hidden: false }); 
      }
      
      // get the nodes for this body and insert the vessel alphabetically, after any moons
      // or add it at the end if nothing to insert before
      var index;
      var menuNodes = w2ui['menu'].get('activeVessels', bodyCatalog[bodyRef].Body + strSys).nodes;
      for (index=0; index<menuNodes.length; index++) {
        if (!menuNodes[index].img.includes("body") && menuNodes[index].text > strVesselName) {
          w2ui['menu'].insert(bodyCatalog[bodyRef].Body + strSys, menuNodes[index].id, { id: item.DB,
                                                                                         text: strVesselName,
                                                                                         img: 'icon-' + item.Type });
          break;
        }
      }
      if (index == menuNodes.length) {
        w2ui['menu'].add(bodyCatalog[bodyRef].Body + strSys, { id: item.DB,
                                                               text: strVesselName,
                                                               img: 'icon-' + item.Type });
      }

      // enable & check the checkbox for this type of vessel
      $("#" + item.Type + "-menu").removeAttr("disabled");
      $("#" + item.Type + "-menu").prop('checked', true);
    } else if (refNum == -1) {
      
      // if this vessel type is not visible, make it so
      if (w2ui['menu'].get('inactiveVessels', item.Type).hidden) { 
        w2ui['menu'].set('inactiveVessels', item.Type, { hidden: false }); 
      }
      
      // get the date for this vessel and extract the month and year
      var dateUT = UTtoDateTime(soi[refIndex-1].split(";")[0], true).split(" ")[0];
      var month = dateUT.split("/")[0];
      var year = dateUT.split("/")[2];
      
      // if this year does not have a menu entry, insert one
      // sort descending
      var index;
      var menuNodes = w2ui['menu'].get('inactiveVessels', item.Type).nodes;
      if (!w2ui['menu'].find(item.Type, { id: item.Type + year }).length) {
        for (index=0; index<menuNodes.length; index++) {
          if (parseInt(menuNodes[index].text) < parseInt(year)) {
            w2ui['menu'].insert(item.Type, menuNodes[index].id, { id: item.Type + year,
                                                                  text: year,
                                                                  img: 'icon-folder'});
            break;
          }
        }
        if (index == menuNodes.length) {
          w2ui['menu'].add(item.Type, { id: item.Type + year,
                                        text: year,
                                        img: 'icon-folder'});
        }
      }

      // if this month does not have a menu entry, insert one
      // sort ascending
      var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      if (!w2ui['menu'].find(item.Type + year, { id: item.Type + year + '-' + month }).length) {
        menuNodes = w2ui['menu'].get(item.Type, item.Type + year).nodes;
        for (index=0; index<menuNodes.length; index++) {
          if (parseInt(menuNodes[index].id.split("-")[1]) > parseInt(month)) {
            w2ui['menu'].insert(item.Type + year, menuNodes[index].id, { id: item.Type + year + '-' + month,
                                                                         text: months[month-1],
                                                                         img: 'icon-folder'});
            break;
          }
        }
        if (index == menuNodes.length) {
          w2ui['menu'].add(item.Type + year, { id: item.Type + year + '-' + month,
                                               text: months[month-1],
                                               img: 'icon-folder'});
        }
      }
      
      // add the vessel to this month/year
      w2ui['menu'].add(item.Type + year + '-' + month, { id: item.DB,
                                                         text: strVesselName,
                                                         img: 'icon-' + item.Type });
      
    }
  });
  isMenuDataLoaded = true;
  
  // setup the crew menu & handle future changes
  filterCrewMenu("name");
  $('input:radio').change(function () {
    filterCrewMenu(this.id);
  });           
}

// show/hide all the menu items that are associated with the type of vessel checked/unchecked
function filterVesselMenu(id, checked) {
  var menuNodes = w2ui['menu'].find('activeVessels', { img: "icon-" + id });
  menuNodes.forEach(function(item, index) {
    if (checked) { w2ui['menu'].show(item.id); }
    else { w2ui['menu'].hide(item.id); }
  });
}

function filterCrewMenu(id) {

  // remove all but the first node
  if (w2ui['menu'].get('crew').nodes.length > 1) {
  
    // create a copy of the array so we can delete things one by one
    var del = w2ui['menu'].get('crew').nodes.slice(0);
    for (var i=1; i<del.length; i++) {
      w2ui['menu'].remove(del[i].id);
    }
  }

  // build the new menu depending on which filter was selected
  if (id == "name") {
  
    // sort the array as required
    // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value-in-javascript
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (item.Name.charAt(0) <= "F") {
        if (!w2ui['menu'].find('crew', { id: 'a-f' }).length) {
          w2ui['menu'].add('crew', { id: 'a-f',
                                     text: "A - F",
                                     img: 'icon-folder'});
        }
        w2ui['menu'].add('a-f', { id: item.DB,
                                  text: item.Name + " Kerman",
                                  img: 'icon-crew'});
      } else if (item.Name.charAt(0) <= "L") {
        if (!w2ui['menu'].find('crew', { id: 'g-l' }).length) {
          w2ui['menu'].add('crew', { id: 'g-l',
                                     text: "G - L",
                                     img: 'icon-folder'});
        }
        w2ui['menu'].add('g-l', { id: item.DB,
                                  text: item.Name + " Kerman",
                                  img: 'icon-crew'});
      } else if (item.Name.charAt(0) <= "R") {
        if (!w2ui['menu'].find('crew', { id: 'm-r' }).length) {
          w2ui['menu'].add('crew', { id: 'm-r',
                                     text: "M - R",
                                     img: 'icon-folder'});
        }
        w2ui['menu'].add('m-r', { id: item.DB,
                                  text: item.Name + " Kerman",
                                  img: 'icon-crew'});
      } else {
        if (!w2ui['menu'].find('crew', { id: 's-z' }).length) {
          w2ui['menu'].add('crew', { id: 's-z',
                                     text: "S - Z",
                                     img: 'icon-folder'});
        }
        w2ui['menu'].add('s-z', { id: item.DB,
                                  text: item.Name + " Kerman",
                                  img: 'icon-crew'});
      }
    });
  } else if (id == "status") {

    // sort by filter option first to create folders, then re-sort by name to add kerbals
    crewMenu.sort(function(a,b) {return (a.Status > b.Status) ? 1 : ((b.Status > a.Status) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (!w2ui['menu'].find('crew', { id: item.Status }).length) {
        w2ui['menu'].add('crew', { id: item.Status,
                                   text: item.Status,
                                   img: 'icon-folder'});
      }
    });
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      w2ui['menu'].add(item.Status, { id: item.DB,
                                      text: item.Name + " Kerman",
                                      img: 'icon-crew'});
    });
  } else if (id == "rank") {
    crewMenu.sort(function(a,b) {return (a.Rank > b.Rank) ? 1 : ((b.Rank > a.Rank) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (!w2ui['menu'].find('crew', { id: item.Rank }).length) {
        w2ui['menu'].add('crew', { id: item.Rank,
                                   text: item.Rank,
                                   img: 'icon-folder'});
      }
    });
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      w2ui['menu'].add(item.Rank, { id: item.DB,
                                    text: item.Name + " Kerman",
                                    img: 'icon-crew'});
    });
  } else if (id == "assignment") {
    crewMenu.sort(function(a,b) {return (a.Assignment > b.Assignment) ? 1 : ((b.Assignment > a.Assignment) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      if (!w2ui['menu'].find('crew', { id: item.Assignment }).length) {
        w2ui['menu'].add('crew', { id: item.Assignment,
                                   text: item.Assignment,
                                   img: 'icon-folder'});
      }
    });
    crewMenu.sort(function(a,b) {return (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0);} );
    crewMenu.forEach(function(item, index) {
      w2ui['menu'].add(item.Assignment, { id: item.DB,
                                          text: item.Name + " Kerman",
                                          img: 'icon-crew'});
    });
  }
}

// hides the twitter widget to allow the menu to use the full height of the right-side content area, preserves event box
function menuResize() {
  if ($('#menuResize').html().includes("Expand")) {
    $('#twitterBox').fadeOut(250, "swing", function () { 
      var maxHeight = 882;
      var height = (maxHeight - w2utils.getSize("#eventBox", 'height')) + "px";
      $('#menuBox').css("height", height); 
      setTimeout(function() { 
        w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&and;&and;Collapse Menu&and;&and;</div>';
        w2ui['menu'].refresh(); 
      }, 200);
    });
  } else {
    var maxHeight = 290;
    var height = (maxHeight - w2utils.getSize("#eventBox", 'height')) + "px";
    $('#menuBox').css("height", height); 
    setTimeout(function() { 
      w2ui['menu'].bottomHTML = '<div id="menuResize" onclick="menuResize()">&or;&or;Expand Menu&or;&or;</div>';
      w2ui['menu'].refresh(); 
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
    }, 200);
  } else {
    $('#filters').fadeOut(250);
    $("#menuBox").css("transform", "translateY(0px)");
    setTimeout(function() { 
      w2ui['menu'].topHTML = '<div id="filterDisplay" onclick="filterDisplay()">&or;&or;Show Filters&or;&or;</div>';
      w2ui['menu'].refresh(); 
    }, 200);
  }
}

// recursive function to pull vessels from nodes nested n deep
function extractVesselIDs(nodes) {

  // work through the nodes to determine what data we need to send for
  var strVessels = '';
  for (var i=0; i<nodes.length; i++) {
    
    // if this is a moon dig through its nodes, if it has any
    if (nodes[i].img.includes("body")) { 
      if (nodes[i].nodes.length) { strVessels += extractVesselIDs(nodes[i].nodes.slice(0)); }
      
    // it's a vessel, add it to the list
    } else { strVessels += nodes[i].id + ";"; }
  }
  return strVessels;
}

