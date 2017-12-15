<%
response.expires=-1

'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\dbCatalog.mdb"
Dim connCatalog
Set connCatalog = Server.CreateObject("ADODB.Connection")
sConnection2 = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
connCatalog.Open(sConnection2)

'create the tables
set rsParts = Server.CreateObject("ADODB.recordset")

'query the data, ensure that bookmarking is enabled
rsParts.open "select * from parts", connCatalog, 1, 1
rsParts.movefirst

do until rsParts.eof
  for each field in rsParts.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last tilde and ouput
  output = left(output, len(output)-1)
  output = output & "^"
  rsParts.MoveNext
loop

'clean up and post the data
response.write(left(output, len(output)-1))

connCatalog.Close
Set connCatalog = nothing
%>