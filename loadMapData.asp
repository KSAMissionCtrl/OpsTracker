<%
response.expires=-1
hasTable = false

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'open craft database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\dbMaps.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create the tables
set rsMap = Server.CreateObject("ADODB.recordset")

'determine if this DB has the tables we need
set adoxConn = CreateObject("ADOX.Catalog")  
adoxConn.activeConnection = conn  
for each table in adoxConn.tables 
  if table.name = request.querystring("map") then hasTable = true
next

if hasTable then

  'query the data
  rsMap.open "select * from " & request.querystring("map"), conn, 2

  'select the data closest to this UT
  if not rsMap.eof then
    rsMap.MoveLast
    do until rsMap.fields.item("UT") <= UT
      rsMap.MovePrevious
      if rsMap.bof then exit do
    Loop
  end if

  'output the record in name/value pairs for each field if a record exists for this time period
  if not rsMap.bof then
    output = "Name~" & request.querystring("map") & "`"
    for each field in rsMap.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    
    'get rid of the last semicolon and ouput
    output = left(output, len(output)-1)
    output = output & "^"
  else
    output = output & "null^"
  end if

  'check for any future events if this is the current event
  if not rsMap.eof then rsMap.MoveNext
  if not rsMap.eof then 
    output = output & rsMap.fields.item("UT") & "~"
  else
    output = output & "null~"
  end if 

  'post the final results
  response.write(left(output, len(output)-1))
else
  response.write("null")
end if

conn.Close
Set conn = nothing
%>