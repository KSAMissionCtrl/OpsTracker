# KSA Operations Tracker
A means of dynamically displaying information online for vessels, bodies and crew in Kerbal Space Program

The following KSP mods/apps are used to provide the data the Operations Tracker requires:

* [KSPTOT](https://forum.kerbalspaceprogram.com/index.php?/topic/33568-winmaclinux-ksp-trajectory-optimization-tool-v164-new-vehicle-sizing-tool/)
* [Final Frontier](https://forum.kerbalspaceprogram.com/index.php?/topic/61065-181-final-frontier-kerbal-individual-merits-181-3479/)
* [VOID](https://forum.kerbalspaceprogram.com/index.php?/topic/150280-18x-void-unvoided-vessel-orbital-informational-display/)
* [FAR](https://forum.kerbalspaceprogram.com/index.php?/topic/179445-18-ferram-aerospace-research-continued-v015113-mach-271019/)
* [kOS](https://forum.kerbalspaceprogram.com/index.php?/topic/165628-181-kos-v1210-kos-scriptable-autopilot-system/)

The following JavaScript libraries are used:

* [JQuery](https://jquery.com/)
* [Leaflet](http://leafletjs.com/)
* [Leaflet.Kerbal](https://gitlab.com/IvanSanchez/Leaflet.Kerbal)
* [Sylvester](http://sylvester.jcoglan.com/)
* [Numeral](http://numeraljs.com/)
* [Tipped](http://www.tippedjs.com/)
* [Spin.js](http://fgnass.github.io/spin.js/)
* [Rrose](http://erictheise.github.io/rrose/)
* [Leaflet.Fullscreen](https://github.com/brunob/leaflet.fullscreen)
* [Leaflet.GroupedLayerControl](https://github.com/ismyrnow/Leaflet.groupedlayercontrol)
* [GeoGebra](https://wiki.geogebra.org/en/Reference:JavaScript)
* [JQuery UI](https://jqueryui.com/)
* [w2ui sidebar](http://w2ui.com/web/demo/sidebar)
* [Leaflet.EasyButton](https://github.com/CliffCloud/Leaflet.EasyButton)
* [Font Awesome](http://fontawesome.io/icons/)
* [Leaflet.LinearMeasurement](https://github.com/NLTGit/Leaflet.LinearMeasurement)
* [Leaflet.MousePosition](https://github.com/ardhi/Leaflet.MousePosition)
* [Leaflet.hotline](https://github.com/iosphere/Leaflet.hotline)
* [Leaflet.contextmenu](https://github.com/aratcliffe/Leaflet.contextmenu)

### Important Known Issues

- **Operations Tracker is currently in active development with work being done on the live page, so visiting at times may cause browser errors, failures to load, etc. However after it has been worked on it is left in a usable state, so try again later**
- Collapsing/Expanding the [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation) can sometimes cause the entire area to go blank the next time something in it is clicked on
- Ground tracks for aircraft can sometimes not be hovered over to display additional information for that point in the flight. Try zooming in closer or panning the map view around a bit

For other known issues, see the [open bug listing](https://github.com/KSAMissionCtrl/OpsTracker/issues?q=is%3Aissue+is%3Aopen+label%3Abug).

### Future Fixes/Changes/Additions

See all current bugs and future enhancements over in our [Issues Tracker](https://github.com/KSAMissionCtrl/OpsTracker/issues).

### Change Log

Versioning Key (v#1.#2.#3): #1=New features #2=Changes to existing features #3=Fixes to existing features

**v12.0.0** (2/18/20)

Fixes:
  - [Flight Paths](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting) that are removed from the [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) are by default actually just hidden in case they are requested again from the menu. However now they do not re-appear when the Surface Map is closed and re-opened
  - The Inclination field in the [Data Box](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#the-data-box) now properly matches prev/new data and no longer flashes and update notice when there really hasn't been any change
  - Long-standing issue with the Surface Map glitching out and not properly displaying when its size is changed has been resolved
  - Launch site/position markers are now properly removed when switching vessels to one with an orbital trajectory to calculate
  - Selecting the button to switch to the general Surface Map view from a vessel page now also selects the body in the menu
  - Source images for patches are no longer displayed at original sizes that could spill out of the page view
  - Vertical scrolling is disabled so scrollbars don't pop in and out briefly when the main content area is resizing
  - Mission patches now show when they are included
  - Names in the Active Vessels menu now wrap onto multiple lines if they are too long, just like Inactive Vessels
  - Vessel icon for orbital trajectories that have already been plotted are now re-displayed when the user switches back to that vessel
  - Updates that have nothing to do with new trajectory data no longer affect the [Orbital View](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View) and remove orbit lines
  - Flight tracks now wrap properly across the Surface Map when traveling from east to west
  - New method is used to determine if the KSC is operating under Daylight Savings Time so the [Clock](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) shows the proper UTC offset and displays the proper KSC local time for users living in countries that do not experience DST
  - After lift off of the final scheduled launch, the [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now properly updates even if no future launch is scheduled
  - When a vessel is removed from the Active Vessels menu, the [vessel filter](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation#filters) options are properly updated to disable that craft type if it is no longer available
  - Loading up a crew or vessel by a means other than directly clicking on them in the menu now clears update badges
  - Several instances where numerical strings were being compared to integers have been fixed to convert the strings to integers
  - Toggling hidden [crew ribbons](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Crew-Roster#crew-details) on/off no longer prevents the field from flashing if an update comes afterwards
  - Switching vessels too quickly no longer causes the trajectory render dialog box to still show up on a vessel that doesn't require it to be displayed
  - Vessels that update with orbital data which previously had none now have their orbits also added to the Orbial View
  - Clicking on the button to refresh the vessel's orbital plot now works
  - Detecting and updating upcoming launches for the Event Calendar has been completely rewritten. Again. Hopefully I got it right for all possible scenarios this time
  - Event Calendar is no longer called with double updates
  - Orbital View now properly updates to the body of a vessel even if it is inactive
  - Scheduled future events for vessels now updates properly when the craft data is updated
  
Changes:
  - Now that the map sizing issue is fixed, you no longer have to up-size the map in vessel view to get pop-up information on orbital trajectory lines with the mouse cursor
  - Launchsite/vessel position pop-up information now conforms with every other Lat/Lng display by showing a minus sign for S and W values. Even though this is a bit pendatic, it does clue the user in to what the Lat/Lng values mean when cardinal directions are not included
  - The pins used for the launchsite/vessel location are now more versatile in their use to mark the location of a vessel and no longer assumes the term "Launched" to describe a mission in progress
  - You can no longer size up the map while ascent data is being replayed or streamed. It can still go fullscreen though
  - Vessel patches no longer require a URL to link to
  - Live ascent data locks out history paging, then reloads it after the ascent has been completed. User can no longer look at a different vessel state except when the ascent telemetry is being replayed
  - Ascent data is now loaded on demand rather than every time the vessel gets an update, as a noticeable load delay began to appear for vessels with ascent data greater than 3 minutes. It is loaded once per vessel and stays loaded for that vessel until another vessel's ascent data is requested
  - Orbital View figures are now flat-shaded and do not have lighting. The lighting was unable to be changed to accurately depict the position of the body in relation to the sun. With functioning satellites in orbit this would be confusing to have the orbit appear to put the spacecraft over the dayside while the [Surface Map terminator layer](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control) might show it over the night side
  - Related vessels can now be mentioned at a certain time in the mission rather than from only right at the start, when vessels might still be a single craft
  - The Surface Map will now automatically work to keep an ascending vessel and KSC in view at all times. If the vessel moves to the edge of the map the map will shift to keep it in site. If KSC falls out of view the map will zoom out to bring both it and the vessel back into view. The user is still free to pan/zoom the map as they like, but panning the vessel or KSC out of view will snap it back to show both
  - Live telemetry data no longer loads at exactly the same time every time after final T-30s poll
  - The vessel [Info Box Dialog](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#the-info-box) can no longer be resized or dragged around the screen
  - The starting time denoted for a crew with a planned mission assignment now remains visible after launch and shows the current mission elapsed time
  - Selecting an orbit in Orbital View to make the position of its body visible when it is too small to easily see no longer pops up the label - the highlighted orbit line contrasting with the body sphere is enough to make it visible
  - Arrays are now properly zeroed out when they need to be re-used or are no longer in use to help curtail memory leakage
  - `currUT()` now defaults to an integer rather than a floating point result
  - Surface Map buttons that are not able to be used under certain conditions are not rendered as disabled rather than being removed
  - Crew stat for total EVA time is now hidden if it is 0
  
Additions:
  - Trajectory plotting for vessels can now determine when the vessel has already experienced an SOI event (SOI entry, SOI exit or atmospheric entry) and will not use the current orbital data to render a plot but inform the user that an update is coming
  - A new option for bodies in the Orbital View is available when you open their information dialogs. "Focus View" will center the 3D view on that body so that zooming in for a closer look at any orbits around it is easier to do

**v11.0.0** (10/24/19)

Fixes:
  - The checkboxes for displaying/hiding orbit types for the [Orbital View](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View) no longer sometimes appears over the [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map)
  - Orbital View now removes orbits of vessels that are no longer in orbit when the vessel is updated
  - Tooltips for crew pages are now recreated properly when an update happens while the page is loaded
  - The option to show all ribbons in [Crew Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Crew-Roster#crew-details) has been restored
  - Data fields for both crew and vessels that would flash to indicate updated data which actually did not contain any updated data now only flash when the data has actually been updated
  - Mission listing in the Crew Details is now visible again while an active mission is in effect for the crew member
  - When the [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) updates, it now fetches the next event
  - Event calendar scheduling code re-written to fix issues regarding finding the correct launch date to post following the launch of the current mission
  - The link to the current scheduled launch now properly activates once crew pages are loaded
  - Tooltips that were displayed when switching to another view, vessel or crew now are destroyed so they don't remain on the page
  - The [custom pins layer](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control) now no longer remain on the map when switching from the Surface Map to the map viewed for an individual vessel
  - Countdown to the current active mission on a crew page now updates
  - Final state of ascent telemetry is now properly shown for stuff like the image and status text that only updates once per second
  - If a vessel is currently being viewed when it switches to an Inactive state the menu now properly updates to show it under the Inactive section
  - Flag icon for the Surface Map now properly positions the bottom of its pole over the center of the location
  - Tooltip for the number of orbits now properly displays if vessel only has a single [flight data record](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Database-Documentation#flight-data-fields)
  - Number of orbits calculation now takes into account mission termination
  - Number of orbits calculation now calculates up to the current UT instead of the UT of the next update
  - Prev/Next history buttons are no longer clipping their text
  - Use of the [Orbit Filters](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View#vesselasteroid-filters) is now effective again
  - The distance measuring tool on the Surface Map now accurately calculates distance
  - When viewing the vessel listed in the Event Calendar as the next to launch, clicking on the calendar link for the vessel no longer reloads the page data
  
Changes:
  - Functions now use prpper JS default variables in their definitions
  - `UTtoDateTime` can now include an option to not return the full 4-digit year and instead just return a 2-digit year
  - A new URL parameter `&live` can be used by the public to define a UT they want to wind the clock of the Ops Tracker back to. The site will behave as if that is the current time. Can not be used to see into the future
  - Flag markers now show additional data and the format of what is shown has been changed. See the [DB reference](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Database-Documentation#fields)
  - When a [Surface Track](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#surface-tracks) is loaded and the current UT falls somewhere between the start and end times of the track, a popup appears at the location of the track that is the closest match to the current UT
  - When a Surface Track is loaded (not added) the map will resize to fit the track. If more than one track is loaded at once the map will resize to fit all tracks
  - When a vessel updates to no longer include orbital data (it was destroyed in some way) those fields can now detect this and hide with the update
  - MET/TBD tooltip is now constrained to the data fields box
  - Clicking on the crew icon for a vessel will switch to that crew members information page. They will have a current mission field that will let you switch back to the vessel you came from
  - When an empty record for Comms and Resources is found for the current update, these fields are now hidden with the update
  - The icons for omni/dish vessel comms now visually show when these links are connected to KSC or not. The tooltip always had this information but not on an individual basis nor was it constantly visible
  - Additional Resources is now labled Additional Information so that it is not confused with any extra resources that could be on the vessel
  - The vessel [Info Box](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#the-info-box) now closes automatically when starting playback of ascent telemetry
  - The page is no longer cached to help ensure that any updates are received by the viewer
  - Crew assignment/status tooltips are now constrained to the data fields box
  
Additions:
  - Crew that are deceased or retired are now recognized as such in that their Service Years is calculated up to the point of their death/retirement rather than up to the current time
  - The trajectory for vessels can now show when and where the vessel is expected to exit the SOI or come into contact with the atmosphere of Kerbin
  - During the display of ascent telemetry all fields can now be configured to show warning (yellow flashes) or error (red flashes) notifications to better help the viewer understand when the rocket performance is not in line with expectactions and what aspect(s) of the ascent is not going well

**v10.1.0** (6/3/19)

Changes:
  - The [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) is now smarter about how it loads launch event data and no longer requires the `UT` field in the Launches recordset to be set ahead of a previous launch to get the order of events to update properly. The `UT` field can (and should) now match the `UT` field for the Craft Data recordset where the change in launch time occurs

**v10.0.1** (6/2/19)

Fixes:
  - [Flight Plotting](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting) now displays the correct mouse-over data along the track if it is cut to wrap to the other side of the map
  
**v10.0.0** (5/28/19)

Fixes:
  - The [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) clock now shows proper KSC local time when viewed in other time zones
  - `currUT()` now always returns the current second when asking for an integer instead of a floating point value rather than sometimes rounding up to the next second
  - Clicking on an Event Calendar vessel link is no longer possible until the [Orbital View](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View) has finished loading in order to avoid an out of order loading error
  - Various issues resolved with out of order menu data loading
  - Various issues resolved when transitioning from one type of data view to another and lingering unused elements remain visible
  - Various issues resolved with map markers being quieried when they were not present
  - Going straight from a crew view to surface track no longer hangs page load
  - Loading straight to a surface track no longer hangs page load
  - `getParentSystem()` now properly handles a case of there being no parent system at all if the vesselID is null
  - Vessel that has gone from Active to Inactive no longer attempts to badge its update on the Active menu
  - Typo in default "Unknown Anomaly" text
  - Typo in "longitude" for surface map popup
  - Popup for surface tracks can now be closed after opening
  - Surface plot colors now properly cycle through to beginning and start anew
  - Closing the surface plot flight data playback popup now also stops the map from updating
  - Inactive Vessel sort options in the menu [Filters](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation#filters) now works all the time
  - History paging now looks at UT instead of Title so events that have the same Title don't screw it up
  - Displaying [Flight Data](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-data) will no longer cease to work for the first track loaded
  
Changes:
  - [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation) and Event Calendar vessel names that end up with only a single character or two (denoting a number) on a second line now bring down the word preceeding that number as well
  - When vessel orbital data is updated the Orbital View will now also redraw its 3D orbit
  - Yellow is now the first surface plot color, followed by red instead of vice-versa
  - Pink surface plot color is now much lighter for better contrast
  - CDN links updated to point to recent releases for FontAwesome (v5.8.1) and Leaflet (v4.0)
  - Opening up the Inactive Vessels menu will scroll to display the folders that expand
  - Resource icons in the [Data Box](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#the-data-box) will now show arrows to scroll when there are more than 5 resources included in the vessel
  
Additions:
  - Real-time ascent telemetry data can be displayed for any vessel making the flight up into space. Data switches over to static event updates at whatever point the telemetry data ends. After the telemetry run is over, the user can page back to the launch event to replay the telemetry and seek forward/backwards 10s or 30s while paused. Vessels can still include static updates of major events during ascent that can be paged through while an active ascent is happening. Returning to the most recent event in the [Vessel History](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#vessel-history) will bring back up the real-time telemetry if time remains
  - [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) now has additional layers to show airport and ground station locations
  - Part tooltips can now display the number that exist on a vessel
  - Part tooltips can now include special notes at the bottom that can apply to parts on various specific vessels
  - Launch videos can now be included as Additional Resources for the vessel Data Box

**v9.0.0** (10/24/18)

Fixes:
  - When checking the Show Orbits option, any nodes that were set to be visible will re-appear with the orbit conics
  - The [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) will no longer update twice in rapid succession due to multiple events firing of the same type
  - Crew menu no longer shows new crew that are loaded from the database but are supposed to be active yet
  - When switching vessels or away from the surface map view all popups on the map are now closed
  - When switching vessels with the surface map sized up, it will size back down
  - Total Mass in the Resources section of the Vessel Details [data box](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#the-data-box) now has properly formatted numbers
  - Flight plots loaded with the site are now properly selected in the menu instead of the body they are plotted on
  
Changes:
  - `rsToObj` helper function can now handle being passed a `null` value
  - GeoGebra figures no longer load from cache to ensure the latest diagram updates are pushed as soon as they are uploaded
  - You can now selectively show/hide as many orbits as you want when the Show Orbits option is unchecked in the Orbital View [display options](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View#display-options)
  - Crew pages, both the full roster and the individual crew pages, now update in real-time if any changes occur while they are being viewed
  - Crew current assignments can now be left empty. This will remove them from the roster sorting if the Assignment [menu filter](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation#filters) is selected
  - Cookie for the site no longer tracks just whether the person is new to the site, but also what time they last visited
  - When filtering Active Vessels, if unchecking filters removes all craft from a body, that body itself will now also be removed from the menu - except for Kerbol
  - `filterCrewMenu` function can now re-sort the menu based on the current selection, or be used to change to a specific selection
  - [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) borders have been enlarged so that when zoomed in popups on the edge of the map can be read and also don't always continuously "bump" the map edge while a moving vessel is being tracked
  - `orbitalCalc` function can now accept values to define the length of its batch calculations as well as the total length of its calculations, both of which have default values if they are ignored
  - While the orbital data is being calculated, the title of the dialog box displays the date and time of where the calculations are currently. This can allow the user to only render long orbits up to a known point before cancelling to display the data
  - The [flight plot](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting) additional information has been changed to include less information in the popup about the mission with the mission information now available in a dialog box
  - The surface map popup that includes data on the vessel's position and altitude during ascent now specifies the altitude as ASL to not only clarify the base altitude measurement but that this number is not downrange distance
  
Additions:
  - After the site has loaded, if new content is added to the menu or an update is pushed for any vessel/crew in the menu, if that vessel/crew in question is not selected a badge will appear next to all parent folders with the number of updated vessels/crew within. The vessel/crew in question will be bolded until clicked on
  - Upon loading the site, if cookies are enabled, any updates that occurred since the user's last visit will be noted with badges and bold titles as described above
  - The Inactive Vessels menu now has its own list of filters to be sorted in various ways to help making craft easier to find
  - `currName` and `currSOI` helper functions now handle parsing the strings that determine the current name and SOI of a vessel given a certain UT, allowing this data to be retrieved easier and from anywhere
  - When selecting a [flight plot](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting), new controls allow you to play back the flight progression. See the wiki link for details
  - < and > buttons now exist at the bottom of the Vessel Details [data box](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#the-data-box) to allow the user to quickly page through a vessel's history in succession. The drop-down list can still be used to jump directly to any event in the mission history

**v8.0.2** (5/8/18)

Fixes:
  - When watching a launch countdown that goes into a HOLD state, the countdown timer in the [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now no longers comes back up after a second
  - No longer storing a number as a string - could have potentially caused issues at some point
  - If multiple launche times are scheduled to be publicly visible at the same time the Ops Tracker now properly chooses the closest one to display in the Event Calendar rather than the last one

**v8.0.1** (4/18/18)

Fixes:
  - When more than one future launch or maneuver is scheduled the [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now shows the first scheduled event rather than the last

**v8.0.0** (4/15/18)

Fixes:
  - When adding a new [Flight Plot](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting) from the [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation) any previously-removed flights plots are no longer redrawn
  - If the GeoGebra figure loads before the menu data it will now wait for the AJAX call return rather than get hung up in a recursive function that prevents the site from operating normally
  - Moving quickly back/forward through the browser history no longer causes a dialog to appear asking to render orbital data when you are no longer even looking at a [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details) page
  - When data for the sun is loaded (looking at the Kerbol System figure) the sun marker no longer tries to update its position on the [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map)
  - Flight plots that have already been loaded can now be switched to and viewed via the operations menu when looking at other vessels/bodies/crew
  - Map interface no longer automatically hides 3 seconds after loading if the device uses a touchscreen
  - When viewing a flight plot with the additional details popup open and the plot is hidden via the [Layers Control](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control) the popup is closed
  - If a flight plot additional details popup is open when switching to a vessel or another body the popup is closed
  
Changes:
  - When viewing a [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map), clicking on the same planet as the map is now another way to hide the map (as opposed to using the close map button on the map itself)
  - Sun icon in the layers control is now a Font Awesome symbol rather than an image
  - Selecting (left-click) a flight plot on the surface map now also selects it in the operations menu

Additions:
  - A context menu has been added as a new [Map Interaction](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#map-interaction) - more will be done with this in later versions but for now adds a simple way to copy the current mouse position coordinates straight to the clipboard
  - You can now select a new option in the flight plot additional details popup that shows a color gradient signifying the altitude of the aircraft over the course of its flight. Only one path at a time can show this data so they remain diferrentiated by their colors. If a path is already showing this data when another is selected, that path will automatically revert to normal. Future plans for this feature, currently only a proof of concept, can be found in [this issue](https://github.com/KSAMissionCtrl/OpsTracker/issues/51).
  
**v7.0.0** (4/14/18)

Additions:
  - The surface map [Layers Control](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control) now has a new default layer that allows you to display the sun's current position along with the terminator line that separates night and day, showing which areas of the body are in darkness. This layer is updated every second.

**v6.2.1** (4/12/18)

Fixes:
  - Removing pins from [Flight Plots](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting) removes them from the layer also now not just the map, so they do not reappear if you show and hide the path
  - Viewing [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details) for an active vessel after the page was initially loaded for an inactive vessel now properly prompts for any orbital calculations that are needed
  - When a vessel is updated with new data as the page is being viewed, if new orbital data is included the current plot is now removed and the new plot drawn

**v6.2.0** (4/8/18)

Fixes:
  - Dialog for map now removes the map resize button everytime it pops up, not just the first time
  - Map no longer errors out due to an uninitialized control if the user mouses over it immediately upon page load
  - Map dialog asking for how to render orbits that are too long no longer assumes it will pop up all the time and closes when switching to another vessel. Re-opens if needed
  - Vessel marker popup no longer shows 00000 values for the vessel data when it is first opened after returning to an already-drawn plot
  - Twitter feed now shows for timelines that don't have a UT defining when they can be shown
  - Previously-rendered plots are now properly redrawn when the craft is visited again ([see wiki](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#orbital-tracking) for details)
  - Left-side buttons to control various map functions now properly show up when they are loaded
  
Changes:
  - [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) now shows full dates dates with times for each tweet, including new tweets loaded when more are requested
  - When a map dialog is open, the fullscreen control is now hidden along with the map resize button

**v6.1.0** (3/21/18)

Fixes:
  - Surface map loader is now more ready to handle loading between different bodies
  - Map controls hide completely when mouse if off the map - before there was a tiny container box visible in the upper-left
  - [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) now transitions better between full surface view and vessel view without having to make the map fullscreen to allow it to pan properly
  
Changes:
  - Updated Leaflet.Fullscreen plugin
  - Removed Leaflet.KSP from list of dependencies, added Leaflet.Kerbal
  - New known issue added: Starting from the default Kerbol System overview it has been sometimes impossible to select another body from the [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation). Selecting a vessel will fail to load the surface map when needed. No apparent errors are logged on page load or when attempting to select another body. Reloading the website should clear this up for now
  

**v6.0.0** (3/20/18)

Fixes:
  - Multiple popups can be displayed on the map again
  
Changes:
  - Clicking on the map no longer closes a popup. You must click on the X or again on the object that opened the popup
  - You can no longer pan off the edge of the map, the view will bounce back
  - Leaflet.Label has been replaced with the native tooltip ability for popping up text when hovering over [Labels](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control)
  
Additions:
  - [Measurement Control](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#measurement-control) allows for plotting surface lines on the map to get distances and bearings
  - A scale and mouse coordinate control have been placed in the bottom-left corner of the [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) 

**v5.0.0** (3/19/18)

Fixes:
  - Birthdays in [Crew Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Crew-Roster#crew-details) are no longer displayed 1 day early in the Additional Information window
  - [Clock](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now displays the proper UT offset
  - [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) no longers reloads when paging through the history of a vessel
  - [Parts Display](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#parts-display) has been re-implemented to support all browsers
  - Launch time information in the [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details) now properly displays relevant info in the tooltip during scrub/hold situations
  - Vessels that have future events now display properly
  
Changes:
  - The [Cursor Information Control](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#map-controls) has been removed as it was dependent on the Leaflet.KSP plugin used with the older map version. It will be back

Additions:
  - Leaflet has been upgraded to the latest version! This was largely dependent upon the work done by Ivan Sanchez and his [new maps library](https://gitlab.com/IvanSanchez/Leaflet.Kerbal). Map issues remain and will be addressed in future updates.

**v4.0.0** (2/15/18)

Fixes:
  - The tooltip for the mission launch time now changes from a countdown to launch to a count up in mission elapsed time when the countdown reaches 0 during a launch viewing
  - The twitter source no longer resets to the main feed only when a page is updated or swapped unless a crew or mission feed is loaded
  - After selecting a "Scheduled Event" from the Next Events dropdown box it is reset to allow the user to select it again
  
Additions:
  - None, this was an erroneous change to the major revision number thanks to failing to review the changes before submission and thinking a new addition was included. Can't edit the commit name to v3.1.1 so looks like we're now on v4

**v3.1.0** (2/1/18)

Fixes:
  - The local time shown in the tooltip for the Last Update field in [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details) now properly accounts for DST
  - [Vessel Filters](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View#vesselasteroid-filters) behavior has been tweaked again to prevent it from displaying atop the dynamic map after page load
  - Countdowns for the time to launch tooltips as well as Ap/Pe markers now also make proper use of the fix in v3.0.0 that kept the main clock in sync by no longer comparing a whole number to a decimal
  - Launchsite marker now removes itself from the [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) when it is viewed from a pre-launch vessel
  - When switching from a vessel that does have a mission [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) to one that does not, the default main feed is now loaded
  - Vessel Details page no longer schedules an update for an upcoming twitter mission timeline posting if the mission has ended
  - Additional Resources field on the Vessel Details page no longer prepends "undefined" to the list of resources
  - Planets other than Kerbin, Mun or Minmus with spacecraft in orbit will not attempt to load the dynamic map
  
Changes:
  - The [Orbital View](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View) now automatically hides sphere of influence bubbles when decluttering the view after initial load and the option to show/hide them has been added to the view options at the bottom
  - Last Update field in the Vessel Details view now specifies the time as UTC

**v3.0.0** (1/25/18)

Fixes:
  - The clock and any countdown timers are no longer sometimes 1s off each other because of a decimal to whole number comparison being done that would round the decimal up or down depending on when the page was loaded
  - Distance Traveled in the [Crew Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Crew-Roster#crew-details) is now formatted and labeled as kilometers
  - Option to show all ribbons for Crew Details no longer fades in/out with every change from one crew data to the next
  - The [Event Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now properly resizes itself if needed when new data is fetched for it after the page has finished its initial load
  - You can now select a flight track from a vessel or crew details page and the surface map will show properly
  - No longer comparing a string to an integer in several places, one of which was causing intermittent page load failures (removed Known Issue)
  - Vessels withe multiple names over a period of time will now have the proper name displayed in the menu
  - Active Vessels are once again properly sorted in alphabetical order
  - The currently-selected menu item is scrolled back into view when the [Menu Filters](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation#filters) are hidden
  - [Vessel Filters](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View#vesselasteroid-filters) no longer stay visible atop the [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) in instances where the data finished loading after the map was displayed
  - Various code optimizations

Changes:
  - Once an event is reached, the Event Calendar will fetch new event information after 5 seconds
  - During an ascent when viewing the dynamic map the info popup for the craft location no longer auto-hides after 5 seconds

Additions:
  - Now that all the data can be loaded intially, the update system has been overhauled so data can be loaded initially and cached for the next update so changes are instant, with the following update data loaded in the background. This also means active crew and vessels are displayed much faster when they are viewed. Deceased crew and inactive vessels still have their data fetched when viewed, and viewing past events requires a data fetch although the data for the next update of any active vessel remains cached regardless of whether a past event is being viewed or not. If you are looking at the vessel being updated there will be a visual indication of new data being displayed. Currently this does not happen for crew pages. This system is the groundwork for browser notifications

**v2.0.0** (1/14/18)

Fixes:
  - Browser history now only preserves URL parameters if it is the first time the page is loaded so what is shown in the URL bar remains consistent with past activity
  - Vessel names in the [Orbital View](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View) are no longer displaying HTML tags 
  - The content no longer reloads itself if you click on the menu item for a body that is already loaded
  - Surface tracks are no longer missing a plot point everytime the path wrapped around to the other side of the map
  
Changes:
  - Crew ribbons have a new back-end DB format for easier maintenence. Display is the same
  
Additions:
  - [Flight plotting](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#flight-plotting) is now supported when you select an aircraft from the Inactive Vessels list, allowing also for plots to be loaded with page load using the `&flt` command
  - Added and updated some Known Issues

**v1.1.1** (1/9/18)

Fixes:
  - When collapsing the menu the current selection is scrolled back into view
  - [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details) now give the option to see more information about a future upcoming event in the Mission History navigation dropdown
  - [Events Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) now properly swaps the page content without reloading instead of linking to an entirely new page when selecting the vessel displayed
  - The [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) could be hidden in some instances and not re-shown on page load
  - Additional Resources in the Vessel Details now properly links to each resource and loads it in a new tab

**v1.1.0** (1/9/18)

Fixes:
  - found some more strings that were being compared to numbers without first being converted into numbers themselves
  - `loadVessel()` was using a local variable named the same as a global and changed the name to avoid confusino

Changes:
  - [Events Calendar](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) and [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation) have been linked to update events so they provide new data when it is available for vessels. The Events Calendar updating is pretty obvious, but for items in the Operations Menu that could be hidden from view, the top-level will expand if it isn't already and badges will appear next to folders/bodies that contain updated vessels with a count of how many. The updated vessels themselves will have their names bolded
  - The events calendar can now show vessel names that take up more than one line

**v1.0.0** (1/4/18)   
(all fixes/changes/additions listed are based on v4.12 of the [Flight Tracker](https://github.com/KSAMissionCtrl/FlightTracker#change-log))

Fixes:
  - [Body Information Dialog](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Orbital-View#body-information-dialog) now displays body mass properly
  - [Clock](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Clock-&-Event-Calendar) is now always accurate to within 1-2 seconds rather than being anywhere from 40-90s slow
  - The shift to/from DST is now handled properly so times for events are all shown at the proper local and UTC values
  - Clock adjusts to no longer be one second off after page load is complete
  - [Surface tracks](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details#orbital-tracking) of orbital vessels no longer have a small gap between where one orbit ends and the next begins

Changes:
  - All pages unified into a single page that can dynamically adjust its content to display information on crew, vessels or bodies. This means the page can reload parts of itself independently rather than needing to reload the entire page when a small amount of information needs to be updated
  - Clicking on spacecraft no longer brings up an information window, but instead shows its orbital nodes and name. Clicking on its position again will load up its [Vessel Details](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Vessel-Details)
  - [Operations Menu](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Navigation#the-operations-menu) items no longer show tooltip discriptions of the vessels/crew (but looking to bring this back at some point)
  - Operations Menu now shows crew and vessels at the same time
  - Body information Dialog can be repositioned and updates if a new planet is selected, but if it is closed it opens up again in the default position
  - Clicking on a moon in the menu will load the figure of the planetary system in which it resides
  - Inactive Vessels are organized into folders sorted by year descending and then month ascending
  - Active Vessels are listed in alphabetical order
  - The [Twitter Feed](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Twitter-Feed) shown can be changed in some instances to view only tweets relevant to the vessel/crew member
  - Clicking for additional vessel/crew information no longer pulls up text but instead opens a dialog box containing the text, which can be moved and resized. When closed, it will re-open over top the vessel/crew image again next time
  - The [Surface Map](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map) when viewed in the vessel page can now be expanded to fill the entire content area in addition to going fullscreen
  - Full Roster view tooltips now show additional data for # of missions completed and ribbons earned
  - After all custom pins are loaded the map veiw will size to encompass them all at the smallest zoom level possible
  - [Layers control](https://github.com/KSAMissionCtrl/OpsTracker/wiki/Surface-Map#layers-control) stays open and does not collapse until all map layers are loaded, but still hides with the rest of map controls when the cursor is off the map
  - Detecting what to show using the `&layers` command is much more lenient. For example you can say `anomalies` or `anomaly`
  - The `&map` command to show the surface map of a body on page load no longer needs a value, is no longer required in conjunction with other commands and should always be placed at the end of the URL
  - Vessel orbits are always rendered in full by default, from 1 up to a max of 3. However you can cancel the calculations at anytime and what has been calculated will be rendered
  - After each full orbit is rendered it is immediately added to the map
  - If the view is changed to a body or crew while a vessel orbit is calculating, it will be paused. If you return to that vessel before any other, the calculation will pickup where it left off. Otherwise it will be tossed out and new calculations begun for a new vessel
  - Orbital calculation batch size has been reduced from 1500 to 1000 calculations to allow for smoother browser performance due to the slightly increased browser load brought on with the Geogebra figure

Additions:
  - When viewing a system that has vessels in orbit, they are dynamically loaded and added to the GeoGebra figure
  - Can show/hide the orbits of various types of vessels
  - Re-sorting the crew menu will also re-sort the Full Roster display if it is visible. If not then when loaded it will always sort crew in the same order as the current menu sort selection
  - Custom pins placed on the map through the `&loc` option will show up in their own map layer so they can be shown/hidden as a group
  - Map button when viewing a vessel that lets you jump to the planet/system overview and see all the orbit tracks
  - If a crew member has ribbons that have been superseded by higher achievements, the option is given to show all the ribbons earned, then also hide them again if wanted
  - Vessels can have additional sources of material listed that links to things like various reports on the mission, launch telemetry data, etc. These appear as file icons in the Data Box that can be clicked, with tooltips describing the nature of each
  - The Layers control in the upper-right of the map now contains a layer for each vessel orbit that is plotted, which allows the user to show/hide any orbits and their accompanying markers
  - After surface tracks are complete a button on the map will allow you to refresh them at any time (currently they will not refresh themselves at the end of a plot but eventually they will do so and this button will remain)
