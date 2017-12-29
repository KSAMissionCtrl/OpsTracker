<%
response.expires=-1
UT = request.querystring("UT")*1

'open kerbal database. "db" was prepended because without it for some reason I had trouble connecting
'if the database fails to load, try the archive site instead
db = "..\..\database\db" & request.querystring("crew") & ".mdb"
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

'for some recordsets, we can just grab the specific one or few records we need right from the start
rsKerbal.open "select * from [kerbal stats]", conn, 1, 1
rsMissions.open "select * from missions", conn, 1, 1
rsRibbons.open "select * from ribbons", conn, 1, 1
rsBackground.open "select * from [background]", conn, 1, 1

'select the data closest to this UT
rsKerbal.MoveLast
do until rsKerbal.fields.item("UT") <= UT
  rsKerbal.MovePrevious
Loop

'output the record in name/value pairs for each field
for each field in rsKerbal.fields
  output = output & replace(field.name, " ", "") & "~" & field.value & "`"
next

'get rid of the last semicolon and ouput
output = left(output, len(output)-1)
output = output & "^"

'output the mission records up to the current UT
rsMissions.movefirst
do until rsMissions.fields.item("UT") > UT
  output = output & rsMissions.fields.item("Link") & ";" & rsMissions.fields.item("Title") & "|"
  rsMissions.movenext
  if rsMissions.eof then exit do
loop

'get rid of the last semicolon and ouput
output = left(output, len(output)-1)
output = output & "^"

'output the ribbon records up to the current UT
rsRibbons.movefirst
do until rsRibbons.fields.item("UT") > UT
  output = output & rsRibbons.fields.item("Ribbon") & ";" & rsRibbons.fields.item("Title") & ";" & rsRibbons.fields.item("Override") & "|"
  rsRibbons.movenext
  if rsRibbons.eof then exit do
loop

'get rid of the last semicolon and ouput
output = left(output, len(output)-1)
output = output & "^"

'select the data closest to this UT
rsBackground.MoveLast
do until rsBackground.fields.item("UT") <= UT
  rsBackground.MovePrevious
Loop

'output the record in name/value pairs for each field
for each field in rsBackground.fields
  output = output & replace(field.name, " ", "") & "~" & field.value & "`"
next

'get rid of the last semicolon and ouput
output = left(output, len(output)-1)
output = output & "^"

'check for future events
if not rsKerbal.eof then rsKerbal.MoveNext
if not rsKerbal.eof then 
  output = output & rsKerbal.fields.item("UT") & "~"
else
  output = output & "null~"
end if 
if not rsMissions.eof then rsMissions.MoveNext
if not rsMissions.eof then 
  output = output & rsMissions.fields.item("UT") & "~"
else
  output = output & "null~"
end if 
if not rsRibbons.eof then rsRibbons.MoveNext
if not rsRibbons.eof then 
  output = output & rsRibbons.fields.item("UT") & "~"
else
  output = output & "null~"
end if 
if not rsBackground.eof then rsBackground.MoveNext
if not rsBackground.eof then 
  output = output & rsBackground.fields.item("UT") & "~"
else
  output = output & "null~"
end if 

'get rid of the last semicolon and ouput
output = left(output, len(output)-1)
output = output & "^"

'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
conn.Close
Set conn = nothing
db = "..\..\database\dbCatalog.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create and open the tables
set rsCrew = Server.CreateObject("ADODB.recordset")
rsCrew.open "select * from Crew where Kerbal ='" & request.querystring("crew") & "'", conn, 1, 1

'output the record in name/value pairs for each field
for each field in rsCrew.fields
  output = output & replace(field.name, " ", "") & "~" & field.value & "`"
next

'post the final results
response.write(left(output, len(output)-1))

conn.Close
Set conn = nothing
%>