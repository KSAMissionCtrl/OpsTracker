<!--#include file="aspUtils.asp"-->
<%
response.expires=-1
Call SetSecurityHeaders()
hasTable = false

' Validate inputs
Dim mapRef
mapRef = ValidateDBName(request.querystring("refID"))

If mapRef = "" Then
    Call SendErrorResponse("Invalid parameters")
End If

'open craft database using utility function
db = "..\..\database\dbMaps.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _
              "Data Source=" & server.mappath(db) &";" & _
              "Persist Security Info=False"
conn.Open(sConnection)

'create the tables
set rsMap = Server.CreateObject("ADODB.recordset")

'query the data 
rsMap.open "select * from Bodies where RefID=" & mapRef, conn, 2

'output the record in name/value pairs for each field if a record exists for this time period
if not rsMap.eof then
  for each field in rsMap.fields
    output = output & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  output = left(output, len(output)-1)
else
  output = output & "null"
end if

'post the final results
response.write(output)

conn.Close
Set conn = nothing
%>