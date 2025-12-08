<!--#include file="aspUtils.asp"-->
<%
response.expires=-1
Call SetSecurityHeaders()
flightDataStr = ""

' Validate inputs
Dim dataName
dataName = ValidateDBName(request.querystring("data"))

If dataName = "" Then
    Call SendErrorResponse("Invalid parameters")
End If

'open the database using validated input
db = "..\..\database\dbFlt" & dataName & ".mdb"
Dim connFlight
Set connFlight = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _
              "Data Source=" & server.mappath(db) &";" & _
              "Persist Security Info=False"
connFlight.Open(sConnection)

'create the tables
set rsMissionData = Server.CreateObject("ADODB.recordset")
set rsFlightData = Server.CreateObject("ADODB.recordset")

'query the data, ensure that bookmarking is enabled
rsMissionData.open "select * from [mission data]", connFlight, 1, 1
rsFlightData.open "select * from [flight data]", connFlight, 1, 1

'output the record in name/value pairs for each field
for each field in rsMissionData.fields
  flightDataStr = flightDataStr & replace(field.name, " ", "") & "~" & field.value & "`"
next

'get rid of the last semicolon and ouput
flightDataStr = left(flightDataStr, len(flightDataStr)-1)
flightDataStr = flightDataStr & "^"

do until rsFlightData.eof
  for each field in rsFlightData.fields
    flightDataStr = flightDataStr & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  flightDataStr = left(flightDataStr, len(flightDataStr)-1)
  
  'for now, use a low resolution since users can not zoom in much
  rsFlightData.move 5
  if not rsFlightData.eof then flightDataStr = flightDataStr & "|"
loop

connFlight.Close
Set connFlight = nothing
flightDataStr = flightDataStr & "^" & dataName
response.write flightDataStr
%>