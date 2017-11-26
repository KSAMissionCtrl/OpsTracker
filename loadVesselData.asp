<%
response.expires=-1

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\db" & request.querystring("craft") & ".mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create the tables
set rsCraft = Server.CreateObject("ADODB.recordset")
set rsResources = Server.CreateObject("ADODB.recordset")
set rsCrew = Server.CreateObject("ADODB.recordset")
set rsComms = Server.CreateObject("ADODB.recordset")
set rsPorts = Server.CreateObject("ADODB.recordset")

'query the data
rsCraft.open "select * from [craft data]", conn, 2
rsResources.open "select * from [craft resources]", conn, 2
rsCrew.open "select * from [crew manifest]", conn, 2
rsComms.open "select * from [craft comms]", conn, 2
rsPorts.open "select * from [craft ports]", conn, 2

'select the craft data closest to this UT
if not rsCraft.eof then
  rsCraft.MoveLast
  do until rsCraft.fields.item("id") <= UT
    rsCraft.MovePrevious
    if rsCraft.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
if not rsCraft.bof then
  for each field in rsCraft.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "^"
else
  output = output & "null^"
end if

'select the resources data closest to this UT
if not rsResources.eof then
  rsResources.MoveLast
  do until rsResources.fields.item("id") <= UT
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
  do until rsCrew.fields.item("id") <= UT
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
  do until rsComms.fields.item("id") <= UT
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

'select the ports data closest to this UT
if not rsPorts.eof then
  rsPorts.MoveLast
  do until rsPorts.fields.item("id") <= UT
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

'check for any future events
if not rsCraft.eof then rsCraft.MoveNext
if not rsCraft.eof then 
  output = output & rsCraft.fields.item("ID") & "~"
else
  output = output & "null~"
end if 
if not rsResources.eof then rsResources.MoveNext
if not rsResources.eof then 
  output = output & rsResources.fields.item("ID") & "~"
else
  output = output & "null~"
end if 
if not rsCrew.eof then rsCrew.MoveNext
if not rsCrew.eof then 
  output = output & rsCrew.fields.item("ID") & "~"
else
  output = output & "null~"
end if 
if not rsComms.eof then rsComms.MoveNext
if not rsComms.eof then 
  output = output & rsComms.fields.item("ID") & "~"
else
  output = output & "null~"
end if 
if not rsPorts.eof then rsPorts.MoveNext
if not rsPorts.eof then 
  output = output & rsPorts.fields.item("ID") & "*"
else
  output = output & "null*"
end if

'now output all the events for the history paging
rsCraft.MoveFirst
do until rsCraft.eof
  output = output & rsCraft.fields.item("ID") & "~" & rsCraft.fields.item("CraftDescTitle") & "|"
  rsCraft.MoveNext
loop

'post the final results
response.write(left(output, len(output)-1))

conn.Close
Set conn = nothing
%>