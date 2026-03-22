<%
Dim qs
qs = Request.ServerVariables("QUERY_STRING")
If qs <> "" Then
    Response.Redirect "tracker.html?" & qs
Else
    Response.Redirect "tracker.html"
End If
%>
