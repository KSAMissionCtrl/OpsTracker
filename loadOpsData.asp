<%
response.expires=-1

'convert the text strings into numbers
UT = int(request.querystring("ut") * 1)
pastUT = -1
if request.querystring("pastUT") <> "NaN" then pastUT = int(request.querystring("pastUT") * 1)

'header information that was passed in
output = request.querystring("db") & "Typ3" & request.querystring("type")

'have to open the catalog regardless
db = "..\..\database\dbCatalog.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create and open the tables
set rsCrafts = Server.CreateObject("ADODB.recordset")
set rsCrew = Server.CreateObject("ADODB.recordset")

'decide what we are loading
if request.querystring("type") = "crew" then
  rsCrew.open "select * from Crew where Kerbal='" & request.querystring("db") & "'", conn, 1, 1
  for each field in rsCrew.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "*"
  
  'get additional data from the individual database
  db = "..\..\database\db" & request.querystring("db") & ".mdb"
  Set conn = Server.CreateObject("ADODB.Connection")
  sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

                "Data Source=" & server.mappath(db) &";" & _

                "Persist Security Info=False"
  conn.Open(sConnection)

  'get the roster tables
  set rsKerbal = Server.CreateObject("ADODB.recordset")
  set rsMissions = Server.CreateObject("ADODB.recordset")
  set rsRibbons = Server.CreateObject("ADODB.recordset")
  set rsBackground = Server.CreateObject("ADODB.recordset")
  rsKerbal.open "select * from [kerbal stats]", conn, 1, 1
  rsMissions.open "select * from missions", conn, 1, 1
  rsRibbons.open "select * from ribbons", conn, 1, 1
  rsBackground.open "select * from [background]", conn, 1, 1

  'select the data closest to this UT
  rsKerbal.MoveLast
  do until rsKerbal.fields.item("UT") <= UT
    rsKerbal.MovePrevious
    if rsKerbal.bof then
      rsKerbal.MoveNext
      exit do
    end if
  Loop

  'output the record in name/value pairs for each field
  for each field in rsKerbal.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next

  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"

  'output the mission records up to the current UT
  if not rsMissions.eof then
    rsMissions.movefirst
    if rsMissions.fields.item("UT") > UT then
      output = output & "null|"
    else
      do until rsMissions.fields.item("UT") > UT
        for each field in rsMissions.fields
          output = output & replace(field.name, " ", "") & "~" & field.value & "`"
        next
        output = left(output, len(output)-1)
        output = output & "|"
        rsMissions.movenext
        if rsMissions.eof then exit do
      loop
    end if
  else
    output = output & "null|"
  end if
  output = left(output, len(output)-1)
  output = output & "^"

  'output the ribbon records up to the current UT
  if not rsRibbons.eof then
    rsRibbons.movefirst
    if rsRibbons.fields.item("UT") > UT then
      output = output & "null|"
    else
      do until rsRibbons.fields.item("UT") > UT
        for each field in rsRibbons.fields
          output = output & replace(field.name, " ", "") & "~" & field.value & "`"
        next
        output = left(output, len(output)-1)
        output = output & "|"
        rsRibbons.movenext
        if rsRibbons.eof then exit do
      loop
    end if
  else
    output = output & "null|"
  end if
  output = left(output, len(output)-1)
  output = output & "^"

  'select the background data closest to this UT
  rsBackground.MoveLast
  do until rsBackground.fields.item("UT") <= UT
    rsBackground.MovePrevious
    if rsBackground.bof then
    rsBackground.MoveNext
    exit do
  end if
Loop
  for each field in rsBackground.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "*"

  'check for future events
  if not rsKerbal.eof then rsKerbal.MoveNext
  if not rsKerbal.eof then 
    for each field in rsKerbal.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsMissions.eof then 
    for each field in rsMissions.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsRibbons.eof then 
    for each field in rsRibbons.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsBackground.eof then rsBackground.MoveNext
  if not rsBackground.eof then 
    for each field in rsBackground.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
elseif request.querystring("type") = "vessel" then
  rsCrafts.open "select * from Crafts where DB='" & request.querystring("db") & "'", conn, 1, 1
  for each field in rsCrafts.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "*"
  
  'get additional data from the individual database
  db = "..\..\database\db" & request.querystring("db") & ".mdb"
  Dim conn2
  Set conn2 = Server.CreateObject("ADODB.Connection")
  sConnection2 = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

                "Data Source=" & server.mappath(db) &";" & _

                "Persist Security Info=False"
  conn2.Open(sConnection2)

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

  'pour out any ascent data if it exists
  if not rsAscentData.eof then
    do
      for each field in rsAscentData.fields
        output = output & replace(field.name, " ", "") & "~" & field.value & "`"
      next
      output = left(output, len(output)-1)
      output = output & "|"
      rsAscentData.MoveNext
    loop until rsAscentData.eof
    output = left(output, len(output)-1)
    output = output & "*"
  else
    output = output & "null*"
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
    
    'if we jumped to another UT, check to see if it is the same record as the current UT. If not, we are looking at a past record
    'if it is a past record, reassign the pastUT time so all other records are pulled from the same time as this past vessel data update
    'this check is mainly for someone who tries to access a past record from memory or a general time period
    if pastUT >= 0 then
      if rsCraftData.fields.item("UT") < actualUT then
        output = output & "PastEvent~true^"
        bPastEvent = true
        pastUT = rsCraftData.fields.item("UT")
      else
        output = output & "PastEvent~false^"
      end if
    else
      output = output & "PastEvent~false^"
    end if
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
    for each field in rsResources.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
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
    for each field in rsComms.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
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

  'if the cursor was moved back to a viable record, we have a future event
  if not rsCraftData.eof then 
    for each field in rsCraftData.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsResources.eof then 
    for each field in rsResources.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsCrew.eof then 
    for each field in rsCrew.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsComms.eof then 
    for each field in rsComms.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if 
  if not rsOrbit.eof then 
    for each field in rsOrbit.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if
  if not rsPorts.eof then 
    for each field in rsPorts.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    output = left(output, len(output)-1)
    output = output & "*"
  else
    output = output & "null*"
  end if

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
  if not rsOrbit.eof then

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
    output = output & "*"
  else
    output = output & "null*"
  end if
  conn2.Close
  Set conn2 = nothing
end if

'post the final results and cleanup
response.write(left(output, len(output)-1))
conn.Close
Set conn = nothing
%>