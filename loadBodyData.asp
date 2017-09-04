<%
response.expires=-1

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\dbCatalog.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create and open the tables
set rsMoons = Server.CreateObject("ADODB.recordset")
set rsPlanets = Server.CreateObject("ADODB.recordset")
rsPlanets.open "select * from Planets", conn, 1, 1
rsMoons.open "select * from Moons", conn, 1, 1
do
  'output the record in name/value pairs for each field
  record = ""
  for each field in rsPlanets.fields
    record = record & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  record = left(record, len(record)-1)
  record = record & "|"
  response.write record
  
  'advance the recordset point and repeat
  rsPlanets.movenext
loop until rsPlanets.eof
do
  'output the record in name/value pairs for each field
  record = ""
  for each field in rsMoons.fields
    record = record & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  record = left(record, len(record)-1)
  record = record & "|"
  response.write record
  
  'advance the recordset point and repeat
  rsMoons.movenext
loop until rsMoons.eof
conn.Close
Set conn = nothing
%>