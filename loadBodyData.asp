<!--#include file="aspUtils.asp"-->
<%
response.expires=-1
Call SetSecurityHeaders()

'open catalog database using utility function
Set conn = GetCatalogConnection()

'create and open the tables
set rsMoons = Server.CreateObject("ADODB.recordset")
set rsPlanets = Server.CreateObject("ADODB.recordset")
rsPlanets.open "select * from Planets", conn, 1, 1
rsMoons.open "select * from Moons", conn, 1, 1
do
  'output the record in name/value pairs for each field
  record = ""
  for each field in rsPlanets.fields
    record = record & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  record = left(record, len(record)-1)
  record = record & "|"
  response.write record
  
  'advance the recordset point and repeat
  rsPlanets.movenext
loop until rsPlanets.eof
do
  'output the record in name/value pairs for each field
  record = ""
  for each field in rsMoons.fields
    record = record & replace(field.name, " ", "") & "~" & field.value & "`"
  next
  
  'get rid of the last semicolon and ouput
  record = left(record, len(record)-1)
  record = record & "|"
  response.write record
  
  'advance the recordset point and repeat
  rsMoons.movenext
loop until rsMoons.eof
conn.Close
Set conn = nothing
%>