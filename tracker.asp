<!doctype html>

<html lang="en">
<head>
  <meta charset="utf-8">

  <title>KSA Operations Tracker</title>
  
  <!-- Display the KSA favicon -->
  <link rel="shortcut icon" href="../images/KSA/favicon.png" type="image/x-icon" />

  <!-- use this image link to force reddit to use a certain image for its thumbnail -->
  <meta property="og:image" content="http://i.imgur.com/B7r6B2F.png" />

  <!-- CSS stylesheets -->
  <link rel="stylesheet" href="../lib/jquery-ui.min.css">
  <link rel="stylesheet" href="../lib/tipped.css">
  <link rel="stylesheet" href="../lib/w2ui-1.5.rc1.css">
  <link rel="stylesheet" href="styles.css?v=1.0">
</head>

<body onload='setupContent()'>
  <div id='contentContainer'>
    <div id='mainContent'>
      <div id='contentHeader' class='header'>&nbsp;</div>
      <div id='infoBox' style='width: 650px; height: 400px;'>Info Box</div>
      <div id='dataBox' style='margin-left: 655px;'>
        <div id='dataField0' class='dataField'>Data</div>
        <div id='dataField1' class='dataField'>Data</div>
        <div id='dataField2' class='dataField'>Data</div>
        <div id='dataField3' class='dataField'>Data</div>
        <div id='dataField4' class='dataField'>Data</div>
        <div id='dataField5' class='dataField'>Data</div>
        <div id='dataField6' class='dataField'>Data</div>
        <div id='dataField7' class='dataField'>Data</div>
        <div id='dataField8' class='dataField'>Data</div>
        <div id='dataField9' class='dataField'>Data</div>
        <div id='dataField10' class='dataField'>Data</div>
        <div id='dataField11' class='dataField'>Data</div>
        <div id='dataField12' class='dataField'>Data</div>
        <div id='dataField13' class='dataField'>Data</div>
        <div id='dataField14' class='dataField'>Data</div>
        <div id='dataField15' class='dataField'>Data</div>
        <div id='dataField16' class='dataField' style='margin-bottom: 0px'>Data</div>
        <select name='prev' style='margin: 2px'>
        </select>
        <span id='missionStatus'>test text</span>
        <select name='next' style='margin: 2px'>
        </select>
      </div>
      <div id='crewFooter' style='text-align: center; margin-left: 503px; margin-top: 5px; display: none'>
        <a target='_blank' href='http://www.kerbalspace.agency'>KSA Home Page</a> | 
        Ribbons &amp; Stats by <a target='_blank' href='http://forum.kerbalspaceprogram.com/index.php?/topic/61065-105-final-frontier-kerbal-individual-merits-098-1882/'>Final Frontier</a> | 
        <a href='https://github.com/KSAMissionCtrl/FlightTracker/wiki/Crew-Roster-Documentation'>Crew Roster Wiki</a>
      </div>
      <div id='contentBox'>&nbsp;</div>
      <div id='figureOptions' style='color: white; position: absolute; top: 900px; left: 5px; display: none;'>
        <input class='checkboxes' name='nodes' id='nodes' type='checkbox'> <label for='nodes'>Show Nodes</label> 
        <input class='checkboxes' name='labels' id='labels' type='checkbox'> <label for='labels'>Show Names</label> 
        <input class='checkboxes' name='orbits' id='orbits' type='checkbox'> <label for='orbits'>Show Orbits</label>
        <input class='checkboxes' name='ref' id='ref' type='checkbox'> <label for='ref'>Show Reference Line</label>
      </div>
      <div id='vesselLoaderMsg' style='color: white; position: absolute; top: 900px; left: 795px; display: none;'>
        &nbsp;&nbsp;&nbsp;Loading Vessel Data...
      </div>
      <div id='vesselOrbitTypes' style='border: 2px solid white; background-color: black; width: 80px; position: absolute; top: 819px; left: 867px; display: none;'>
        <input class='checkboxes' name='asteroid' id='asteroid-filter' type='checkbox' disabled> <label  id='asteroid-label' for='asteroid-filter'>Asteroid</label><br>
        <input class='checkboxes' name='debris' id='debris-filter' type='checkbox' disabled> <label  id='debris-label' for='debris-filter'>Debris</label><br>
        <input class='checkboxes' name='probe' id='probe-filter' type='checkbox' disabled> <label  id='probe-label' for='probe-filter'>Probe</label><br>
        <input class='checkboxes' name='ship' id='ship-filter' type='checkbox' disabled> <label  id='ship-label' for='ship-filter'>Ship</label><br>
        <input class='checkboxes' name='station' id='station-filter' type='checkbox' disabled> <label  id='station-label' for='station-filter'>Station</label>
      </div>
      <div id='timeDate' style='cursor: pointer; position: absolute; top: 43px; left: 895px;'><img src='http://www.kerbalspace.agency/Tracker/timedate.png'></div>
      <div id='figureDialog'></div>
      <div id='map'></div>
      <div id='messageDialog'></div>
      <div id='footer' style='text-align: center; width: 955px; top: 930px; position: absolute;'><a target='_blank' href='http://www.kerbalspace.agency'>KSA Home Page</a> | 2D Orbit rendering: <a target='_blank' href='http://bit.ly/KSPTOT'>KSPTOT</a> | 3D Orbit Rendering: <a target='_blank' href='http://forum.kerbalspaceprogram.com/index.php?/topic/158826-3d-ksp-solar-system-scale-model-major-update-05202017/'>by Syntax</a> | <a target='_blank' href='https://github.com/KSAMissionCtrl/FlightTracker/wiki/Flight-Tracker-Documentation'>Flight Tracker Wiki</a></div>
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
        <p><strong>Crew Roster: </strong> 
        <input type='radio' name='roster' id='name'> <label for='name'>Name</label> 
        <input type='radio' name='roster' id='status'> <label for='status'>Status</label> 
        <input type='radio' name='roster' id='rank'> <label for='rank'>Rank</label> 
        <input type='radio' name='roster' id='assignment'> <label for='assignment'>Assignment</label>
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
      <div id='twitterDisplay' style='font-size: 12px'>Current Source: <strong>KSA Main Feed</strong></div>
  <a class="twitter-timeline" href="https://twitter.com/KSA_MissionCtrl" data-widget-id="598711760149852163" height="550" data-chrome="nofooter noheader">Tweets by @KSA_MissionCtrl</a> <script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+"://platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script></div>
    </div>
  </div>
  
  <!-- JS libraries -->
  <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
  <script src="https://cdn.geogebra.org/apps/deployggb.js"></script>
  <script src="../lib/jquery-ui.min.js"></script>
  <script src="../lib/spin.min.js"></script>  
  <script src="../lib/jquery.spin.js"></script>
  <script src="../lib/numeral.min.js"></script>
  <script src="../lib/tipped.js"></script>
  <script src="../lib/w2ui-1.5.rc1.js"></script>
  <script src="helpFuncs.js"></script>
  <script src="ksaEventOps.js"></script>
  <script src="ksaMenuOps.js"></script>
  <script src="ksaBodyOps.js"></script>
  <script src="ksaVesselOps.js"></script>
  <script src="ksaCrewOps.js"></script>
  <script src="ksaMainOps.js"></script>
</body>
</html>