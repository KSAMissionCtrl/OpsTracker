<%

'http://www.sorenwinslow.com/SortArray.asp
Sub SortArray(TheArr,AscDesc)
  TempVal = ""
  For x = 0 to UBound(TheArr)
    For y = x+1 to UBound(TheArr)
      If AscDesc = "Desc" Then
        If TheArr(x) < TheArr(y) then
          TempVal = TheArr(y)
          TheArr(y) = TheArr(x)
          TheArr(x) = TempVal
        End If
      Else
        If TheArr(x) > TheArr(y) then
          TempVal = TheArr(x)
          TheArr(x) = TheArr(y)
          TheArr(y) = TempVal
        End If
      End If
    Next
  Next
End Sub

response.expires=-1

'convert the text string into a number
UT = int(request.querystring("ut") * 1)

'open catalog database. "db" was prepended because without it for some reason I had trouble connecting
db = "..\..\database\dbCatalog.mdb"
Dim conn
Set conn = Server.CreateObject("ADODB.Connection")
sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

              "Data Source=" & server.mappath(db) &";" & _

              "Persist Security Info=False"
conn.Open(sConnection)

'create and open the tables
set rsCrafts = Server.CreateObject("ADODB.recordset")
rsCrafts.open "select * from Crafts", conn, 1, 1

'create properly-sized arrays
Dim launches()
Dim maneuvers()
ReDim launches(rsCrafts.RecordCount)
ReDim maneuvers(rsCrafts.RecordCount)
launchIndex = 0
maneuverIndex = 0

do

  'parse all the SOIs this craft has/will be in and find the one it is in currently
  ref = 0
  locations = split(rsCrafts.fields.item("SOI"), "|")
  for each loc in locations
    values = split(loc, ";")
    if values(0)*1 <= UT then 
      ref = values(1)
    end if
  next 
  
  'only bother moving further if this vessel is active
  if ref > -1 and rsCrafts.fields.item("Type") <> "aircraft" then
  
    'open the craft database
    db = "..\..\database\db" & rsCrafts.fields.item("DB") & ".mdb"
    Set conn2 = Server.CreateObject("ADODB.Connection")
    sConnection = "Provider=Microsoft.Jet.OLEDB.4.0;" & _

                  "Data Source=" & server.mappath(db) &";" & _

                  "Persist Security Info=False"
    conn2.Open(sConnection)
    set rsFlightplan = Server.CreateObject("ADODB.recordset")
    set rslaunchTimes = Server.CreateObject("ADODB.recordset")
    set rsData = Server.CreateObject("ADODB.recordset")
    
    'determine if this DB has tables older databases may not contain
    'not needed but kept for reference if required in the future
    hasLaunchTimes = false
    hasFlightplan = false
    hasData = false
    set adoxConn = CreateObject("ADOX.Catalog")  
    adoxConn.activeConnection = conn2
    for each table in adoxConn.tables 
      if lcase(table.name) = "launch times" then hasLaunchTimes = true
      if lcase(table.name) = "flightplan" then hasFlightplan = true
      if lcase(table.name) = "craft static data" then hasData = true
    next
    'trying to open a recordset that does not exist will kill the page
    
    'open and get the latest records nearest to current UT
    if hasFlightplan then
      rsFlightplan.open "select * from flightplan", conn2, 1, 1
      if not rsFlightplan.eof then
        rsFlightplan.MoveLast
        do until rsFlightplan.fields.item("UT") <= UT
          rsFlightplan.MovePrevious
          if rsFlightplan.bof then exit do
        Loop
        if not rsFlightplan.bof then
        
          'only add the event if the actual execution time is still in the future
          if (rsFlightplan.fields.item("ExecuteUT") > UT) then
            maneuvers(maneuverIndex) = rsFlightplan.fields.item("UT") & ";" & rsFlightplan.fields.item("ExecuteUT") & ";" & rsCrafts.fields.item("DB")
            maneuverIndex = maneuverIndex + 1
          end if
        end if
      end if
    end if
    if hasLaunchTimes and hasData then
      rsData.open "select * from [craft static data]", conn2, 1, 1
      
      'only bother looking at the launch table if a mission start time is not defined
      if isnull(rsData.fields.item("MissionStartTime")) then
        rslaunchTimes.open "select * from [launch times]", conn2, 1, 1
        if not rslaunchTimes.eof then
          rslaunchTimes.MoveLast
          do until rslaunchTimes.fields.item("UT") <= UT
            rslaunchTimes.MovePrevious
            if rslaunchTimes.bof then exit do
          Loop
          if not rslaunchTimes.bof then
            
            'only add the event if the actual launch time is still in the future
            if rslaunchTimes.fields.item("LaunchTime") > UT then
              launches(launchIndex) = rslaunchTimes.fields.item("UT") & ";" & rslaunchTimes.fields.item("LaunchTime") & ";" & rsCrafts.fields.item("DB")
              launchesIndex = launchesIndex + 1
            end if
          end if
        end if
      end if
    end if
    conn2.Close
    Set conn2 = nothing
  end if
  
  'advance the recordset point and repeat
  rsCrafts.movenext
loop until rsCrafts.eof

'resize the arrays down to just what was stored and sort them
ReDim preserve launches(launchesIndex)
ReDim preserve maneuvers(maneuverIndex)
Call SortArray(launches,"Asc")
Call SortArray(maneuvers,"Asc")

'for now, with no future anything, just return nulls
response.write("null~null~null~null~null|null~null~null~null~null")

conn.Close
Set conn = nothing
%>