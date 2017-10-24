function loadCrew(crew) {
  if (crew == "crewFull") { pageType = "crewFull"; }
  if (crew == "crew") { pageType = "crew"; }
  
  $("#contentHeader").html(crew);
  // for tag loading
  // $("#contentHeader").spin({ scale: 0.35, position: 'relative', top: '10px', left: (((955/2) + (crew.width('bold 32px arial')/2)) + 10) +'px' });
  document.title = "KSA Operations Tracker" + " - " + crew + "Kerman";
  strCurrentCrew = crew;
  history.pushState({Type: "crew", ID: crew}, document.title, "http://www.kerbalspace.agency/Tracker/tracker.asp?crew=" + crew);
  console.log("loaded");
}