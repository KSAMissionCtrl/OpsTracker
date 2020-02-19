<%
response.expires=-1

'get ascent data from the vessel database
db = "..\..\database\db" & request.querystring("db") & ".mdb"
Dim conn2
Set conn2 = Server.CreateObject("ADODB.Connection")
sConnection2 = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn2.Open(sConnection2)

'create the tables
set rsAscentData = Server.CreateObject("ADODB.recordset")

'query the data
rsAscentData.open "select * from [ascent data]", conn2, 2

'pour out all ascent data
do
  for each field in rsAscentData.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  output = left(output, len(output)-1)
  output = output & "|"
  rsAscentData.MoveNext
loop until rsAscentData.eof

'post the final results and cleanup
response.write(left(output, len(output)-1))
conn2.Close
Set conn2 = nothing
%>