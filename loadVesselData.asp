<!--#include file="aspUtils.asp"-->
<%
response.expires=-1
Call SetSecurityHeaders()

' Validate and sanitize inputs
Dim dbName, UT, pastUT, validatedUT
dbName = ValidateDBName(request.querystring("db"))
validatedUT = ValidateUT(request.querystring("ut"))

' Check for required parameters
If dbName = "" Or validatedUT = -1 Then
    Call SendErrorResponse("Invalid parameters")
End If

UT = validatedUT
pastUT = -1

'this used to do something but I can't figure out what the hell it was. Maybe not needed anymore
'if request.querystring("pastUT") <> "NaN" then pastUT = int(request.querystring("pastUT") * 1)

'header information that was passed in
output = dbName & "Typ3"

' Open catalog database using utility function
Set conn = GetCatalogConnection()

'create and open the tables
set rsCrafts = Server.CreateObject("ADODB.recordset")

'begin loading - using parameterized query
Set cmd = Server.CreateObject("ADODB.Command")
cmd.ActiveConnection = conn
cmd.CommandText = "SELECT * FROM Crafts WHERE DB=?"
cmd.Parameters.Append cmd.CreateParameter("@db", 200, 1, 255, dbName)
Set rsCrafts = cmd.Execute
for each field in rsCrafts.fields
  output = output & replace(field.name, " ", "") & "~" & field.value & "`"
next
output = left(output, len(output)-1)
output = output & "*"

'get additional data from the individual database using utility function
Set conn2 = GetIndividualDBConnection(dbName)

'create the tables
set rsCraftData = Server.CreateObject("ADODB.recordset")
set rsResources = Server.CreateObject("ADODB.recordset")
set rsCrew = Server.CreateObject("ADODB.recordset")
set rsComms = Server.CreateObject("ADODB.recordset")
set rsPorts = Server.CreateObject("ADODB.recordset")
set rslaunchTimes = Server.CreateObject("ADODB.recordset")
set rsOrbit = Server.CreateObject("ADODB.recordset")
set rsAscentData = Server.CreateObject("ADODB.recordset")

'query the data
rsCraftData.open "select * from [craft data]", conn2, 2
rsResources.open "select * from [craft resources]", conn2, 2
rsCrew.open "select * from [crew manifest]", conn2, 2
rsComms.open "select * from [craft comms]", conn2, 2
rsPorts.open "select * from [craft ports]", conn2, 2
rsOrbit.open "select * from [flight data]", conn2, 2
rslaunchTimes.open "select * from [launch times]", conn2, 2
rsAscentData.open "select * from [ascent data]", conn2, 2

'let the tracker know if ascent data exists
if not rsAscentData.eof then
  output = output & rsAscentData.fields.item("UT") & "~"
  rsAscentData.MoveLast
  output = output & rsAscentData.fields.item("UT")
  output = output & "*"
else
  output = output & "false*"
end if

'select the craft data closest to this UT
moveCount = 1
rsCraftData.MoveLast
do until rsCraftData.fields.item("UT") <= UT
  rsCraftData.MovePrevious
  if rsCraftData.bof then exit do
Loop
actualUT = rsCraftData.fields.item("UT")

'if we have a past UT to jump to, keep searching back
'take into account this record might suffice for the new UT
if pastUT >= 0 then
  if pastUT < rsCraftData.fields.item("UT") then
    do
      moveCount = moveCount + 1
      rsCraftData.MovePrevious
      if rsCraftData.bof then exit do
    Loop until rsCraftData.fields.item("UT") <= pastUT
  end if
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsCraftData.bof then
  for each field in rsCraftData.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'reset the pointer back to any future record
if not rsCraftData.eof then rsCraftData.Move moveCount

'select the resources data closest to this UT
moveCount = 1
if not rsResources.eof then
  rsResources.MoveLast
  do until rsResources.fields.item("UT") <= UT
    rsResources.MovePrevious
    if rsResources.bof then exit do
  Loop
end if
if not rsResources.bof and pastUT >= 0 then
  if pastUT < rsResources.fields.item("UT") then
    do
      moveCount = moveCount + 1
      rsResources.MovePrevious
      if rsResources.bof then exit do
    Loop until rsResources.fields.item("UT") <= pastUT
  end if
end if
if not rsResources.bof then
  NotNull = false
  for each field in rsResources.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    if field.name <> "UT" and field.value <> "" then NotNull = true
  next
  output = output & "NotNull~" & NotNull & "^"
else
  output = output & "null^"
end if
if not rsResources.eof then rsResources.Move moveCount

'select the crew data closest to this UT
moveCount = 1
if not rsCrew.eof then
  rsCrew.MoveLast
  do until rsCrew.fields.item("UT") <= UT
    rsCrew.MovePrevious
    if rsCrew.bof then exit do
  Loop
end if
if not rsCrew.bof and pastUT >= 0 then
  if pastUT < rsCrew.fields.item("UT") then
    do
      moveCount = moveCount + 1
      rsCrew.MovePrevious
      if rsCrew.bof then exit do
    Loop until rsCrew.fields.item("UT") <= pastUT
  end if
end if
if not rsCrew.bof then
  for each field in rsCrew.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if
if not rsCrew.eof then rsCrew.Move moveCount

'select the comms data closest to this UT
moveCount = 1
if not rsComms.eof then
  rsComms.MoveLast
  do until rsComms.fields.item("UT") <= UT
    rsComms.MovePrevious
    if rsComms.bof then exit do
  Loop
end if
if not rsComms.bof and pastUT >= 0 then
  if pastUT < rsComms.fields.item("UT") then
    do
      moveCount = moveCount + 1
      rsComms.MovePrevious
      if rsComms.bof then exit do
    Loop until rsComms.fields.item("UT") <= pastUT
  end if
end if
if not rsComms.bof then
  NotNull = false
  for each field in rsComms.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    if (field.name <> "UT" or field.name <> "Connection") and field.value <> "" then NotNull = true
  next
  output = output & "NotNull~" & NotNull & "^"
else
  output = output & "null^"
end if
if not rsComms.eof then rsComms.Move moveCount

'select the orbital data closest to this UT
moveCount = 1
if not rsOrbit.eof then
  rsOrbit.MoveLast
  do until rsOrbit.fields.item("UT") <= UT
    rsOrbit.MovePrevious
    if rsOrbit.bof then exit do
  Loop
end if
if not rsOrbit.bof and pastUT >= 0 then
  if pastUT < rsOrbit.fields.item("UT") then
    do
      moveCount = moveCount + 1
      rsOrbit.MovePrevious
      if rsOrbit.bof then exit do
    Loop until rsOrbit.fields.item("UT") <= pastUT
  end if
end if
if not rsOrbit.bof then
  for each field in rsOrbit.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if
if not rsOrbit.eof then rsOrbit.Move moveCount

'select the ports data closest to this UT
moveCount = 1
if not rsPorts.eof then
  rsPorts.MoveLast
  do until rsPorts.fields.item("UT") <= UT
    rsPorts.MovePrevious
    if rsPorts.bof then exit do
  Loop
end if
if not rsPorts.bof and pastUT >= 0 then
  if pastUT < rsPorts.fields.item("UT") then
    do
      moveCount = moveCount + 1
      rsPorts.MovePrevious
      if rsPorts.bof then exit do
    Loop until rsPorts.fields.item("UT") <= pastUT
  end if
end if
if not rsPorts.bof then
  for each field in rsPorts.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "*"
else
  output = output & "null*"
end if
if not rsPorts.eof then rsPorts.Move moveCount

'now output all the events for the history paging
rsCraftData.MoveFirst
do until rsCraftData.eof
  output = output & rsCraftData.fields.item("UT") & "~" & rsCraftData.fields.item("CraftDescTitle") & "|"
  rsCraftData.MoveNext
loop
output = left(output, len(output)-1)
output = output & "*"

'and all the events for the launch time history
if not rslaunchTimes.eof then
  rslaunchTimes.MoveFirst
  do until rslaunchTimes.eof
    output = output & rslaunchTimes.fields.item("UT") & "~" & rslaunchTimes.fields.item("LaunchTime") & "|"
    rslaunchTimes.MoveNext
  loop
  output = left(output, len(output)-1)
  output = output & "*"
else
  output = output & "null*"
end if

'aaaand now the orbital changes history so we can calculate orbit count
if not rsOrbit.bof then rsOrbit.moveFirst
if not rsOrbit.eof then
  do until rsOrbit.eof
    output = output & rsOrbit.fields.item("UT") & "~" & rsOrbit.fields.item("Orbital Period") & "|"
    rsOrbit.movenext  
  Loop
  output = left(output, len(output)-1)
  output = output & "*"
else
  output = output & "null*"
end if
conn2.Close
Set conn2 = nothing

'post the final results and cleanup
response.write(left(output, len(output)-1))
conn.Close
Set conn = nothing
%>