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

'query the data based on mapRef value
if mapRef = "-1" then

  'get all records
  rsMap.open "select * from Bodies", conn, 2
  
  'output all records
  if not rsMap.eof then
    do until rsMap.eof
      recordOutput = ""
      for each field in rsMap.fields
        recordOutput = recordOutput & replace(field.name, " ", "") & "~" & field.value & "`"
      next

      'remove last backtick from record
      recordOutput = left(recordOutput, len(recordOutput)-1)
      output = output & recordOutput & "^"
      rsMap.movenext
    loop
    
    'remove last ^ separator
    output = left(output, len(output)-1)
  else
    output = output & "null"
  end if
else
  'get specific record
  rsMap.open "select * from Bodies where RefID=" & mapRef, conn, 2
  
  'output the record in name/value pairs for each field if a record exists for this time period
  if not rsMap.eof then
    for each field in rsMap.fields
      output = output & replace(field.name, " ", "") & "~" & field.value & "`"
    next
    
    'get rid of the last backtick and ouput
    output = left(output, len(output)-1)
  else
    output = output & "null"
  end if
end if

'post the final results
response.write(output)

conn.Close
Set conn = nothing
%>