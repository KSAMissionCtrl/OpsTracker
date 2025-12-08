<%
' ==============================================================================
' ASP Utility Functions for OpsTracker
' ==============================================================================
' This file contains shared utility functions for security, validation, and
' common database operations to reduce code duplication and improve security.
' ==============================================================================

' ------------------------------------------------------------------------------
' SECURITY & VALIDATION FUNCTIONS
' ------------------------------------------------------------------------------

' Validates and sanitizes database names against a whitelist pattern
' Returns empty string if invalid
Function ValidateDBName(dbName)
    ValidateDBName = ""
    
    ' Check if empty
    If IsEmpty(dbName) Or dbName = "" Then
        Exit Function
    End If
    
    ' Only allow alphanumeric characters, underscores, and hyphens
    ' Max length 50 characters
    Dim regex
    Set regex = New RegExp
    regex.Pattern = "^[a-zA-Z0-9_-]{1,50}$"
    regex.IgnoreCase = True
    
    If regex.Test(dbName) Then
        ValidateDBName = dbName
    End If
    
    Set regex = Nothing
End Function

' Validates and sanitizes numeric UT (Universal Time) values
' Returns -1 if invalid
Function ValidateUT(utValue)
    ValidateUT = -1
    
    If IsEmpty(utValue) Or utValue = "" Then
        Exit Function
    End If
    
    ' Check if it's numeric
    If IsNumeric(utValue) Then
        Dim numValue
        numValue = CDbl(utValue)
        
        ' Reasonable range check (positive number, not too large)
        If numValue >= 0 And numValue < 999999999999 Then
            ValidateUT = numValue
        End If
    End If
End Function

' Validates type parameter (crew, vessel, etc.)
Function ValidateType(typeValue)
    ValidateType = ""
    
    If IsEmpty(typeValue) Or typeValue = "" Then
        Exit Function
    End If
    
    ' Whitelist of allowed types
    Select Case LCase(typeValue)
        Case "crew", "vessel", "craft", "body", "event"
            ValidateType = LCase(typeValue)
        Case Else
            ValidateType = ""
    End Select
End Function

' SQL-safe string escaping (basic protection, but parameterized queries preferred)
Function EscapeSQL(inputStr)
    If IsNull(inputStr) Or IsEmpty(inputStr) Then
        EscapeSQL = ""
        Exit Function
    End If
    
    ' Replace single quotes with two single quotes (SQL escape)
    EscapeSQL = Replace(inputStr, "'", "''")
End Function

' HTML entity encoding to prevent XSS
Function HTMLEncode(inputStr)
    If IsNull(inputStr) Or IsEmpty(inputStr) Then
        HTMLEncode = ""
        Exit Function
    End If
    
    Dim output
    output = Server.HTMLEncode(inputStr)
    HTMLEncode = output
End Function

' ------------------------------------------------------------------------------
' DATABASE CONNECTION FUNCTIONS
' ------------------------------------------------------------------------------

' Creates a connection to the catalog database
Function GetCatalogConnection()
    Dim db, conn, sConnection
    db = "..\..\database\dbCatalog.mdb"
    
    Set conn = Server.CreateObject("ADODB.Connection")
    sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _
                  "Data Source=" & Server.MapPath(db) & ";" & _
                  "Persist Security Info=False"
    conn.Open(sConnection)
    
    Set GetCatalogConnection = conn
End Function

' Creates a connection to an individual database
' dbName should be pre-validated with ValidateDBName
Function GetIndividualDBConnection(dbName)
    Dim db, conn, sConnection
    
    ' Additional validation check
    If ValidateDBName(dbName) = "" Then
        Set GetIndividualDBConnection = Nothing
        Exit Function
    End If
    
    db = "..\..\database\db" & dbName & ".mdb"
    
    Set conn = Server.CreateObject("ADODB.Connection")
    sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _
                  "Data Source=" & Server.MapPath(db) & ";" & _
                  "Persist Security Info=False"
    conn.Open(sConnection)
    
    Set GetIndividualDBConnection = conn
End Function

' ------------------------------------------------------------------------------
' COMMON RECORDSET OPERATIONS
' ------------------------------------------------------------------------------

' Moves recordset to the record closest to specified UT (moving backwards)
' Returns True if successful, False if error
Function SeekToUT(rs, targetUT)
    On Error Resume Next
    SeekToUT = False
    
    If rs.EOF Then
        Exit Function
    End If
    
    rs.MoveLast
    If Err.Number <> 0 Then
        Exit Function
    End If
    
    Do Until rs.Fields.Item("UT") <= targetUT
        rs.MovePrevious
        If rs.BOF Then
            rs.MoveNext
            Exit Do
        End If
    Loop
    
    If Err.Number = 0 Then
        SeekToUT = True
    End If
End Function

' Outputs recordset fields as name~value` pairs
Function OutputRecordsetFields(rs)
    Dim output, field
    output = ""
    
    If Not rs.EOF Then
        For Each field In rs.Fields
            output = output & Replace(field.Name, " ", "") & "~" & field.Value & "`"
        Next
        
        ' Remove last delimiter
        If Len(output) > 0 Then
            output = Left(output, Len(output) - 1)
        End If
    End If
    
    OutputRecordsetFields = output
End Function

' ------------------------------------------------------------------------------
' ERROR LOGGING
' ------------------------------------------------------------------------------

' Logs errors to a file (optional, requires write permissions)
' For production, consider logging to Windows Event Log or database
Sub LogError(errorMessage, sourcePage)
    ' Basic error logging - can be enhanced
    ' Currently just ensures errors don't crash the page
    On Error Resume Next
    
    ' Could write to file here if permissions allow
    ' Set fso = Server.CreateObject("Scripting.FileSystemObject")
    ' Set logFile = fso.OpenTextFile(Server.MapPath("errors.log"), 8, True)
    ' logFile.WriteLine Now & " | " & sourcePage & " | " & errorMessage
    ' logFile.Close
    ' Set logFile = Nothing
    ' Set fso = Nothing
End Sub

' ------------------------------------------------------------------------------
' RESPONSE HELPERS
' ------------------------------------------------------------------------------

' Sends a JSON error response
Sub SendErrorResponse(errorMsg)
    Response.Clear
    Response.ContentType = "application/json"
    Response.Write "{""error"": """ & EscapeSQL(errorMsg) & """}"
    Response.End
End Sub

' Sets security headers for responses
Sub SetSecurityHeaders()
    Response.AddHeader "X-Content-Type-Options", "nosniff"
    Response.AddHeader "X-Frame-Options", "SAMEORIGIN"
    Response.AddHeader "X-XSS-Protection", "1; mode=block"
    
    ' Consider adding Content-Security-Policy in production
    ' Response.AddHeader "Content-Security-Policy", "default-src 'self'"
End Sub

%>
