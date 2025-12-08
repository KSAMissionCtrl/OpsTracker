<!--#include file="aspUtils.asp"-->
<%
response.expires=-1
Call SetSecurityHeaders()

'open catalog database using utility function
Set connCatalog = GetCatalogConnection()

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