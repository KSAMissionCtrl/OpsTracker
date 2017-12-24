<%
response.expires=-1
bPastEvent = false

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'open craft database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\db" & request.querystring("craft") & ".mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create the tables
set rsCraftD = Server.CreateObject("ADODB.recordset")
set rsCraftS = Server.CreateObject("ADODB.recordset")
set rsResources = Server.CreateObject("ADODB.recordset")
set rsCrew = Server.CreateObject("ADODB.recordset")
set rsComms = Server.CreateObject("ADODB.recordset")
set rsPorts = Server.CreateObject("ADODB.recordset")
set rslaunchTimes = Server.CreateObject("ADODB.recordset")
set rsOrbit = Server.CreateObject("ADODB.recordset")

'query the data
rsCraftS.open "select * from [craft static data]", conn, 2
rsCraftD.open "select * from [craft dynamic data]", conn, 2
rsResources.open "select * from [craft resources]", conn, 2
rsCrew.open "select * from [crew manifest]", conn, 2
rsComms.open "select * from [craft comms]", conn, 2
rsPorts.open "select * from [craft ports]", conn, 2
rsOrbit.open "select * from [flight data]", conn, 2
rslaunchTimes.open "select * from [launch times]", conn, 2

'output the record in name/value pairs for each field
rsCraftS.movefirst
if not rsCraftS.bof then
  for each field in rsCraftS.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'select the dynamic craft data closest to this UT
dim actualUT
if not rsCraftD.eof then
  rsCraftD.MoveLast
  do until rsCraftD.fields.item("UT") <= UT
    rsCraftD.MovePrevious
    if rsCraftD.bof then exit do
  Loop
end if
actualUT = rsCraftD.fields.item("UT")

'if we have a UT that is not the current one to jump to, reset and look again
if request.querystring("utjump") <> "NaN" then
  if not rsCraftD.eof then
    rsCraftD.MoveLast
    do until rsCraftD.fields.item("UT") <= (request.querystring("utjump") * 1)
      rsCraftD.MovePrevious
      if rsCraftD.bof then exit do
    Loop
  end if
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsCraftD.bof then
  for each field in rsCraftD.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'if we jumped to another UT, check to see if it is the same record as the current UT. If not, we are looking at a past record
  'if it is a past record, reassign the UT time so all other records are pulled from the same past event
  if request.querystring("utjump") <> "NaN" then
    if rsCraftD.fields.item("UT") < actualUT then
      output = output & "PastEvent~true^"
      bPastEvent = true
      UT = request.querystring("utjump") * 1
    else
      output = output & "PastEvent~false^"
    end if
  else
    output = output & "PastEvent~false^"
  end if
else
  output = output & "null^"
end if

'select the resources data closest to this UT
if not rsResources.eof then
  rsResources.MoveLast
  do until rsResources.fields.item("UT") <= UT
    rsResources.MovePrevious
    if rsResources.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsResources.bof then
  for each field in rsResources.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'select the crew data closest to this UT
if not rsCrew.eof then
  rsCrew.MoveLast
  do until rsCrew.fields.item("UT") <= UT
    rsCrew.MovePrevious
    if rsCrew.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsCrew.bof then
  for each field in rsCrew.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'select the comms data closest to this UT
if not rsComms.eof then
  rsComms.MoveLast
  do until rsComms.fields.item("UT") <= UT
    rsComms.MovePrevious
    if rsComms.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsComms.bof then
  for each field in rsComms.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'select the orbital data closest to this UT
if not rsOrbit.eof then
  rsOrbit.MoveLast
  do until rsOrbit.fields.item("UT") <= UT
    rsOrbit.MovePrevious
    if rsOrbit.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsOrbit.bof then
  for each field in rsOrbit.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'select the ports data closest to this UT
if not rsPorts.eof then
  rsPorts.MoveLast
  do until rsPorts.fields.item("UT") <= UT
    rsPorts.MovePrevious
    if rsPorts.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsPorts.bof then
  for each field in rsPorts.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "*"
else
  output = output & "null*"
end if

'check for any future events if this is the current event
if not bPastEvent then
  if not rsCraftD.eof then rsCraftD.MoveNext
  if not rsCraftD.eof then 
    output = output & rsCraftD.fields.item("UT") & "~"
  else
    output = output & "null~"
  end if 
  if not rsResources.eof then rsResources.MoveNext
  if not rsResources.eof then 
    output = output & rsResources.fields.item("UT") & "~"
  else
    output = output & "null~"
  end if 
  if not rsCrew.eof then rsCrew.MoveNext
  if not rsCrew.eof then 
    output = output & rsCrew.fields.item("UT") & "~"
  else
    output = output & "null~"
  end if 
  if not rsComms.eof then rsComms.MoveNext
  if not rsComms.eof then 
    output = output & rsComms.fields.item("UT") & "~"
  else
    output = output & "null~"
  end if 
  if not rsPorts.eof then rsPorts.MoveNext
  if not rsPorts.eof then 
    output = output & rsPorts.fields.item("UT") & "*"
  else
    output = output & "null*"
  end if
else
  output = output & "null~null~null~null~null*"
end if

'now output all the events for the history paging
rsCraftD.MoveFirst
do until rsCraftD.eof
  output = output & rsCraftD.fields.item("UT") & "~" & rsCraftD.fields.item("CraftDescTitle") & "|"
  rsCraftD.MoveNext
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
'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
if not rsOrbit.eof then
  db = "..\..\database\dbCatalog.mdb"
  Dim conn2
  Set conn2 = Server.CreateObject("ADODB.Connection")
  sConnection2 = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

                "Data Source=" & server.mappath(db) &";" & _

                "Persist Security Info=False"
  conn2.Open(sConnection2)

  'create and open the tables
  set rsCrafts = Server.CreateObject("ADODB.recordset")
  rsCrafts.open "select * from Crafts where DB='" & request.querystring("craft") & "'", conn2, 1, 1

  'get the time we entered the current SOI
  index = -1
  locations = split(rsCrafts.fields.item("SOI"), "|")
  for each loc in locations
    values = split(loc, ";")
    if values(0)*1 <= UT then 
      index = index + 1
    end if
  next 

  'now find that point in the flight data
  response.write(UBound(locations))
  rsOrbit.MoveLast
  UT = split(locations(index), ";")
  do until rsOrbit.fields.item("UT") <= UT(0)*1
    rsOrbit.MovePrevious
    if rsOrbit.bof then exit do
  Loop
  
  'is there a future SOI?
  forwardUT = 0
  if index < UBound(locations) then forwardUT = split(locations(index+1), ";")(0)*1
  
  output = output & rsOrbit.fields.item("UT") & "~" & rsOrbit.fields.item("Orbital Period") & "|"
  rsOrbit.movenext  
  do until rsOrbit.eof
  
    'cancel out if we have reached the next SOI
    'otherwise continue to compile data
    if forwardUT > 0 and rsOrbit.fields.item("UT") >= forwardUT then exit do
    output = output & rsOrbit.fields.item("UT") & "~" & rsOrbit.fields.item("Orbital Period") & "|"
    rsOrbit.movenext  
  Loop
  output = left(output, len(output)-1)
  conn2.Close
  Set conn2 = nothing
else
  output = output & "null*"
end if

'post the final results
response.write(left(output, len(output)-1))

conn.Close
Set conn = nothing
%>