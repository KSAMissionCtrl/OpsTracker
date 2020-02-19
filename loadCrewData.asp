<%
response.expires=-1
output = ""

'convert the text strings into numbers
UT = int(request.querystring("ut") * 1)

'open the catalog 
db = "..\..\database\dbCatalog.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create and open the tables
set rsCrew = Server.CreateObject("ADODB.recordset")

'who are we loading
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

'post the final results and cleanup
response.write(left(output, len(output)-1))
conn.Close
Set conn = nothing
%>