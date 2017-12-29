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
set rsCrafts = Server.CreateObject("ADODB.recordset")
set rsCrew = Server.CreateObject("ADODB.recordset")
rsCrafts.open "select * from Crafts", conn, 1, 1
rsCrew.open "select * from Crew", conn, 1, 1
do

  'parse all the SOIs this craft has/will be in and find the one it is in currently, return that data
  ref = 0
  locations = split(rsCrafts.fields.item("SOI"), "|")
  for each loc in locations
    values = split(loc, ";")
    if values(0)*1 <= UT then 
      ref = values(1)
    end if
  next 
  
  'only bother moving further if this vessel is on the menu
  if ref > -2 then
  
    'output the record in name/value pairs for each field
    record = ""
    for each field in rsCrafts.fields
      record = record & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    
    'get rid of the last symbol and ouput
    record = left(record, len(record)-1)
    response.write record
  end if
  
  'advance the recordset point and repeat
  rsCrafts.movenext
  if not rsCrafts.eof then response.write("*")
loop until rsCrafts.eof
response.write("^")
do
  db = "..\..\database\db" & rsCrew.fields.item("Kerbal") & ".mdb"
  Set conn2 = Server.CreateObject("ADODB.Connection")
  sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

                "Data Source=" & server.mappath(db) &";" & _

                "Persist Security Info=False"
  conn2.Open(sConnection)
  set rsKerbal = Server.CreateObject("ADODB.recordset")
  
  'open and get the latest record nearest to current UT
  rsKerbal.open "select * from [kerbal stats]", conn2, 1, 1
  rsKerbal.MoveLast
  do until rsKerbal.fields.item("UT") <= UT
    rsKerbal.MovePrevious
    if rsKerbal.bof then exit do
  Loop
  if not rsKerbal.bof then
    response.write(rsCrew.fields.item("FullName") & "~" &_
                   rsKerbal.fields.item("Status") & "~" &_
                   rsKerbal.fields.item("Rank") & "~" &_
                   rsKerbal.fields.item("Assignment") & "~" &_
                   rsCrew.fields.item("Kerbal") & "~")
  else
    response.write("null~null~null~null~" & rsCrew.fields.item("Kerbal") & "~")
  end if
  
  'check for a future record
  if not rsKerbal.eof then rsKerbal.MoveNext
  if not rsKerbal.eof then 
    response.write(rsKerbal.fields.item("UT"))
  else
    response.write("null")
  end if
  conn2.Close
  Set conn2 = nothing
  rsCrew.movenext
  if not rsCrew.eof then response.write("|")
loop until rsCrew.eof
conn.Close
Set conn = nothing
%>