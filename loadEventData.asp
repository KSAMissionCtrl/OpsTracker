<%
response.expires=-1

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\dbEvents.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create the table
set rsLaunch = Server.CreateObject("ADODB.recordset")
set rsManeuver = Server.CreateObject("ADODB.recordset")

'query the data and pull up the UT closest to this one 
'check if recordset is empty first
rsLaunch.open "select * from Launches", conn, 1, 1
rsManeuver.open "select * from Maneuvers", conn, 1, 1
if not rsLaunch.eof then
  rsLaunch.MoveLast
  do until rsLaunch.fields.item("UT") <= UT
    rsLaunch.MovePrevious
    if rsLaunch.bof then exit do
  Loop
end if
if not rsManeuver.eof then
  rsManeuver.MoveLast
  do until rsManeuver.fields.item("UT") <= UT
    rsManeuver.MovePrevious
    if rsManeuver.bof then exit do
  Loop
end if

'output whatever we have found
if not rslaunch.bof then
  response.write(rsLaunch.fields.item("CraftLink") & "~" &_
                 rsLaunch.fields.item("CraftName") & "~" &_
                 datediff("s", "13-Sep-2016 00:00:00", rsLaunch.fields.item("EventDate")) & "~")
  if not isnull(rsLaunch.fields.item("Desc")) then
    response.write(rsLaunch.fields.item("Desc") & "~")
  else
    response.write("null~")
  end if
else
  response.write("null~null~null~null~")
end if

'is there a future event?
if not rsLaunch.eof then rsLaunch.MoveNext
if not rsLaunch.eof then 
  response.write(rsLaunch.fields.item("UT"))
else
  response.write("null")
end if 
response.write("|")
if not rsManeuver.bof then
  response.write(rsManeuver.fields.item("CraftLink") & "~" &_
                 rsManeuver.fields.item("CraftName") & "~" &_
                 datediff("s", "13-Sep-2016 00:00:00", rsManeuver.fields.item("EventDate")) & "~")
  if not isnull(rsManeuver.fields.item("Desc")) then
    response.write(rsManeuver.fields.item("Desc") & "~")
  else
    response.write("null~")
  end if
else
  response.write("null~null~null~null~")
end if
if not rsManeuver.eof then rsManeuver.MoveNext
if not rsManeuver.eof then 
  response.write(rsManeuver.fields.item("UT"))
else
  response.write("null")
end if
conn.Close
Set conn = nothing
%>