<%
response.expires=-1

'convert the text string into a number
UT = int(request.querystring("ut") * 1)
  
'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\db" & request.querystring("db") & ".mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create the tables
set rsOrbit = Server.CreateObject("ADODB.recordset")
set rsFlightplan = Server.CreateObject("ADODB.recordset")

'query the data
rsOrbit.open "select * from [flight data]", conn, 2
rsFlightplan.open "select * from flightplan", conn, 2

'select the data closest to this UT
if not rsOrbit.eof then
  rsOrbit.MoveLast
  do until rsOrbit.fields.item("UT") <= UT
    rsOrbit.MovePrevious
    if rsOrbit.bof then exit do
  Loop
end if

'output the record in name/value pairs for each field if a record exists for this time period
output = request.querystring("db") & "*"
if not rsOrbit.bof then
  for each field in rsOrbit.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
  output = output & "|"
else
  output = output & "null|"
end if

'do the same for flight plan recordset
if not rsFlightplan.eof then
  rsFlightplan.MoveLast
  do until rsFlightplan.fields.item("UT") <= UT
    rsFlightplan.MovePrevious
    if rsFlightplan.bof then exit do
  Loop
end if
if not rsFlightplan.bof then 
  for each field in rsFlightplan.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "|"
else
  output = output & "null|"
end if

conn.Close
Set connCraft = nothing

'post the final results
response.write(left(output, len(output)-1))
%>