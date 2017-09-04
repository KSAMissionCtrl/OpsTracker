<%
response.expires=-1

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'get the crafts we are pulling info for
crafts = split(request.querystring("crafts"), ";")
for each craft in crafts

  'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
  db = "..\..\database\db" & craft & ".mdb"
  Dim conn
  Set conn = Server.CreateObject("ADODB.Connection")
  sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

                "Data Source=" & server.mappath(db) &";" & _

                "Persist Security Info=False"
  conn.Open(sConnection)

  'create the tables
  set rsCraft = Server.CreateObject("ADODB.recordset")
  set rsResources = Server.CreateObject("ADODB.recordset")
  set rsOrbit = Server.CreateObject("ADODB.recordset")
  set rsCrew = Server.CreateObject("ADODB.recordset")
  set rsFlightplan = Server.CreateObject("ADODB.recordset")
  set rsComms = Server.CreateObject("ADODB.recordset")
  set rsAscent = Server.CreateObject("ADODB.recordset")
  set rsPorts = Server.CreateObject("ADODB.recordset")

  'query the data
  rsCraft.open "select * from [craft data]", conn, 2
  rsResources.open "select * from [craft resources]", conn, 2
  rsOrbit.open "select * from [flight data]", conn, 2
  rsCrew.open "select * from [crew manifest]", conn, 2
  rsFlightplan.open "select * from flightplan", conn, 2
  rsComms.open "select * from [craft comms]", conn, 2
  rsAscent.open "select * from [ascent data]", conn, 2
  rsPorts.open "select * from [craft ports]", conn, 2

  conn.Close
  Set connCraft = nothing
next
%>