<!doctype html>

<html lang="en">
<head>
  <meta charset="utf-8">

  <!-- make sure page is not cached, since there are lots of JS updates during development -->
  <!-- http://cristian.sulea.net/blog/disable-browser-caching-with-meta-html-tags/ -->
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />

  <title>KSA Operations Tracker</title>
  
  <!-- Display the KSA favicon -->
  <link rel="shortcut icon" href="../images/KSA/favicon.png" type="image/x-icon" />

  <!-- use this image link to force reddit to use a certain image for its thumbnail -->
  <meta property="og:image" content="https://i.imgur.com/ugGunHB.png" />
  
  <!-- cache of Font Awesome -->
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.8.1/css/all.css" 
  integrity="sha384-50oBUHEmvpQ+1lW4y57PTFmhCaXp0ML5d60M1M7uH2+nqUivzIebhndOJK28anvf" 
  crossorigin="anonymous">

  <!-- CSS stylesheets 
  <link rel="stylesheet" href="https://unpkg.com/leaflet@0.5.1/dist/leaflet.css">
  <link rel="stylesheet" href="../lib/leaflet.ksp-src.css">
  <link rel="stylesheet" href="../lib/leaflet.label.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.4.0/dist/leaflet.css"
  integrity="sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA=="
  crossorigin=""/>
  -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"
  integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ=="
  crossorigin=""/>
  <link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Roboto:900">
  <link rel="stylesheet" href="../lib/jquery-ui.min.css">
  <link rel="stylesheet" href="../lib/tipped.css">
  <link rel="stylesheet" href="../lib/w2ui-1.5.rc1.css">
  <link rel="stylesheet" href="../lib/Control.FullScreen.css">
  <link rel="stylesheet" href="../lib/leaflet.groupedlayercontrol.min.css">
  <link rel="stylesheet" href="../lib/leaflet.rrose.css">
  <link rel="stylesheet" href="../lib/easy-button.css">
  <link rel="stylesheet" href="../lib/L.Control.MousePosition.css">
  <link rel="stylesheet" href="../lib/Leaflet.LinearMeasurement.css">
  <link rel="stylesheet" href="../lib/leaflet.contextmenu.min.css">
  <link rel="stylesheet" href="styles.css?v=1.0">

   <!-- allows for use of twitter JS API functions -->
   <script>window.twttr = (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0],
      t = window.twttr || {};
    if (d.getElementById(id)) return t;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);
  
    t._e = [];
    t.ready = function(f) {
      t._e.push(f);
    };
  
    return t;
  }(document, "script", "twitter-wjs"));</script>
</head>

<body onload='setupContent()'>

  <!-- hidden divs used to contain data to show in dynamic tooltip -->
  <div id='metTip' style='display: none'></div>
  <div id='avgVelTip' style='display: none'></div>
  <div id='periodTip' style='display: none'></div>
  <div id='distanceTip' style='display: none'></div>
  <div id='crewMissionTip' style='display: none'></div>

  <div id='contentContainer'>
    <div id='mainContent'>
      <div id='infoDialog'></div>
      <div id='figureDialog'></div>
      <div id='mapDialog'>
        <div id='dialogTxt' style='display:none'></div>
        <div id='progressbar' style='display:none'></div>
      </div>
      <div id='siteDialog'></div>
      <div id='contentHeader' class='header'>&nbsp;</div>
      <div id='contentBox'>
        <div id='map' class='map'></div>
        <div id='content'></div>
        <div id='fullRoster'></div>
      </div>
      <div id='infoBox' style='width: 650px; height: 400px;'>
        <div id='infoImg' class='overlay'></div>
        <div id='partsImg' class='overlay'></div>
        <div id='infoTitle' onclick='showInfoDialog()'></div>
      </div>
      <div id='dataBox' style='margin-left: 655px;'>
        <div id='dataField0' class='dataField'></div>
        <div id='dataField1' class='dataField'></div>
        <div id='dataField2' class='dataField'></div>
        <div id='dataField3' class='dataField'></div>
        <div id='dataField4' class='dataField'></div>
        <div id='dataField5' class='dataField'></div>
        <div id='dataField6' class='dataField'></div>
        <div id='dataField7' class='dataField'></div>
        <div id='dataField8' class='dataField'></div>
        <div id='dataField9' class='dataField'></div>
        <div id='dataField10' class='dataField'></div>
        <div id='dataField11' class='dataField'></div>
        <div id='dataField12' class='dataField'></div>
        <div id='dataField13' class='dataField'></div>
        <div id='dataField14' class='dataField'></div>
        <div id='dataField15' class='dataField'></div>
        <div id='dataField16' class='dataField'></div>
        <div id='missionHistory' style='margin-top: 0px'>
          <button id='prevEventButton' class='historyButton' onclick='prevHistoryButton()'>&lt;</button>
          <select id='prevEvent' style='margin: 2px; width: 52px'>
            <option>Prev Event(s)</option>
          </select>
          <span id='dataLabel' style='display: inline'>Loading Data...</span>
          <select id='nextEvent' style='margin: 2px; width: 52px'>
            <option>Next Event(s)</option>
          </select>
          <button id='nextEventButton' class='historyButton' onclick='nextHistoryButton()'>&gt;</button>
        </div>
      </div>
      <div id='crewFooter' style='text-align: center; margin-left: 503px; margin-top: 5px; display: none'>
        <a target='_blank' href='http://www.kerbalspace.agency'>KSA Home Page</a> | 
        Ribbons &amp; Stats by <a target='_blank' href='http://forum.kerbalspaceprogram.com/index.php?/topic/61065-105-final-frontier-kerbal-individual-merits-098-1882/'>Final Frontier</a> | 
        <a target='_blank' href='https://github.com/KSAMissionCtrl/OpsTracker/wiki'>Ops Tracker Wiki</a>
      </div>
      <div id='figureOptions' style='z-index: 2; color: white; position: absolute; top: 900px; left: 5px; display: none;'>
        <input class='checkboxes' name='nodes' id='nodes' type='checkbox'> <label for='nodes'>Show Nodes</label> 
        <input class='checkboxes' name='labels' id='labels' type='checkbox'> <label for='labels'>Show Names</label> 
        <input class='checkboxes' name='orbits' id='orbits' type='checkbox'> <label for='orbits'>Show Orbits</label>
        <input class='checkboxes' name='ref' id='ref' type='checkbox'> <label for='ref'>Show Reference Line</label>
        <input class='checkboxes' name='soi' id='soi' type='checkbox'> <label for='soi'>Show Spheres of Influence</label>
      </div>
      <div id='vesselLoaderMsg' style='z-index: 2; color: white; position: absolute; top: 900px; left: 795px; display: none;'>
        &nbsp;&nbsp;&nbsp;Loading Vessel Data...
      </div>
      <div id='vesselOrbitTypes' style='z-index: 2; border: 2px solid white; background-color: black; width: 80px; position: absolute; top: 819px; left: 867px; display: none;'>
        <input class='checkboxes' name='asteroid' id='asteroid-filter' type='checkbox' disabled> <label  id='asteroid-label' for='asteroid-filter'>Asteroid</label><br>
        <input class='checkboxes' name='debris' id='debris-filter' type='checkbox' disabled> <label  id='debris-label' for='debris-filter'>Debris</label><br>
        <input class='checkboxes' name='probe' id='probe-filter' type='checkbox' disabled> <label  id='probe-label' for='probe-filter'>Probe</label><br>
        <input class='checkboxes' name='ship' id='ship-filter' type='checkbox' disabled> <label  id='ship-label' for='ship-filter'>Ship</label><br>
        <input class='checkboxes' name='station' id='station-filter' type='checkbox' disabled> <label  id='station-label' for='station-filter'>Station</label>
      </div>
      <div id='footer' style='text-align: center; width: 955px; top: 930px; position: absolute;'><a target='_blank' href='http://www.kerbalspace.agency'>KSA Home Page</a> | 2D Orbit rendering: <a target='_blank' href='http://bit.ly/KSPTOT'>KSPTOT</a> | 3D Orbit Rendering: <a target='_blank' href='http://forum.kerbalspaceprogram.com/index.php?/topic/158826-3d-ksp-solar-system-scale-model-major-update-05202017/'>by Syntax</a> | <a target='_blank' href='https://github.com/KSAMissionCtrl/OpsTracker/wiki'>Ops Tracker Wiki</a></div>
    </div>
    <div id='sideContent'>
      
      <!-- Menu display -->
      
      <div id='menuHeader' class='header'>Operations Menu</div>
      <div id='filters'>
        <strong>Active Vessels:</strong> 
        <input class='checkboxes' name='asteroid' id='asteroid-menu' type='checkbox' disabled> <label for='asteroid-menu'>Asteroid</label>
        <input class='checkboxes' name='base' id='base-menu' type='checkbox' disabled> <label for='base-menu'>Base</label><br>
        <input class='checkboxes' name='debris' id='debris-menu' type='checkbox' disabled> <label for='debris-menu'>Debris</label>
        <input class='checkboxes' name='lander' id='lander-menu' type='checkbox' disabled> <label for='lander-menu'>Lander</label> 
        <input class='checkboxes' name='probe' id='probe-menu' type='checkbox' disabled> <label for='probe-menu'>Probe</label> 
        <input class='checkboxes' name='rover' id='rover-menu' type='checkbox' disabled> <label for='rover-menu'>Rover</label><br>
        <input class='checkboxes' name='ship' id='ship-menu' type='checkbox' disabled> <label for='ship-menu'>Ship</label> 
        <input class='checkboxes' name='station' id='station-menu' type='checkbox' disabled> <label for='station-menu'>Station</label> 
        <p><strong>Inactive Vessels: </strong> 
          <input type='radio' name='inactive' id='type' value='type'> <label for='type'>Type</label> 
          <input type='radio' name='inactive' id='vessel' value='vessel'> <label for='vessel'>Vessel</label><br>
          <input type='radio' name='inactive' id='program' value='program'> <label for='program'>Program</label> 
          <input type='radio' name='inactive' id='start' value='start'> <label for='start'>Start</label> 
          <input type='radio' name='inactive' id='end' value='end'> <label for='end'>End</label> 
          <input type='radio' name='inactive' id='body' value='body'> <label for='body'>Body</label> 
        <p><strong>Crew Roster: </strong> 
          <input type='radio' name='roster' id='name' value='name'> <label for='name'>Name</label> 
          <input type='radio' name='roster' id='status' value='status'> <label for='status'>Status</label> 
          <input type='radio' name='roster' id='rank' value='rank'> <label for='rank'>Rank</label> 
          <input type='radio' name='roster' id='assignment' value='assignment'> <label for='assignment'>Assignment</label>
        </div>
      <div id='menuBox'>&nbsp;</div>

      <!-- Events display -->

      <div id='eventBox'>
        <div id='clock'></div>
        <div id='launch'><strong>Next Launch</strong><br>None Scheduled</div>
        <div id='maneuver'><strong>Next Maneuver</strong><br>None Scheduled</div>
      </div>
      
      <!-- Twitter display -->

      <div id='twitterBox'><a href="https://twitter.com/KSA_MissionCtrl" class="twitter-follow-button" data-show-count="true">Follow @KSA_MissionCtrl</a><script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script></center>
      <div id='twitterTimelineSelection' style='font-size: 12px'>Source: <strong>KSA Main Feed</strong></div>
      <div id='twitterTimeline'><a class="twitter-timeline" data-chrome="nofooter noheader" data-height="500" href="https://twitter.com/KSA_MissionCtrl">Loading Tweets...</a> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></div>
      </div>
    </div>
  </div>
  <!-- JS files 
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.5.1/leaflet-src.js"></script>
  <script src="../lib/leaflet.ksp-src.js"></script>
  <script src="../lib/proj4js-combined.js"></script>
  <script src="../lib/proj4leaflet.js"></script>
  <script src="../lib/leaflet.label.js"></script>
  <script src="https://unpkg.com/leaflet@1.4.0/dist/leaflet.js"
  integrity="sha512-QVftwZFqvtRNi0ZyCtsznlKSWOStnDORoefr1enyq5mVL4tmKB3S/EnC3rRJcxCPavG10IcrVGSmPh6Qw5lwrg=="
  crossorigin=""></script>
  -->
  <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
  <script src="https://cdn.geogebra.org/apps/deployggb.js"></script>
  <script src="https://unpkg.com/leaflet@1.6.0/dist/leaflet.js"
  integrity="sha512-gZwIG9x3wUXg2hdXF6+rVkLF/0Vi9U8D2Ntg4Ga5I5BZpVkVxlJWbSQtXPSiUTtC0TjtGOmxa1AJPuV0CPthew=="
  crossorigin=""></script>  
  <script src="../lib/jquery-ui.min.js"></script>
  <script src="../lib/spin.min.js"></script>  
  <script src="../lib/jquery.spin.js"></script>
  <script src="../lib/numeral.min.js"></script>
  <script src="../lib/tipped.js"></script>
  <script src="../lib/w2ui-1.5.rc1.js"></script>
  <script src="../lib/Control.FullScreen.js"></script>
  <script src="../lib/leaflet.groupedlayercontrol.min.js"></script>
  <script src="../lib/leaflet.rrose-src.js"></script>
  <script src="../lib/easy-button.js"></script>
  <script src="../lib/sylvester.js"></script>
  <script src="../lib/crs.js"></script>
  <script src="../lib/tile.js"></script>
  <script src="../lib/L.Control.MousePosition.js"></script>
  <script src="../lib/Leaflet.LinearMeasurement.js"></script>
  <script src="../lib/twitTimelineMod.js"></script>
  <script src="../lib/leaflet.contextmenu.min.js"></script>
  <script src="../lib/leaflet.hotline.min.js"></script>
  <script src="helpFuncs.js"></script>
  <script src="ksaGlobals.js"></script>
  <script src="ksaEventOps.js"></script>
  <script src="ksaMenuOps.js"></script>
  <script src="ksaBodyOps.js"></script>
  <script src="ksaSurfaceOps.js"></script>
  <script src="ksaVesselOps.js"></script>
  <script src="ksaCrewOps.js"></script>
  <script src="ksaMainOps.js"></script>
</body>
</html>