<!--#include file="aspUtils.asp"-->
<%
response.expires=-1
Call SetSecurityHeaders()

' Validate inputs
Dim dbName
dbName = ValidateDBName(request.querystring("db"))

If dbName = "" Then
    Call SendErrorResponse("Invalid parameters")
End If

'get ascent data from the vessel database using utility function
Set conn2 = GetIndividualDBConnection(dbName)

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