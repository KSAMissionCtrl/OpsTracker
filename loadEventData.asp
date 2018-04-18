<%

'http://www.sorenwinslow.com/SortArray.asp
'modified to sort by numeric in a delimited string
Sub SortArray(TheArr,AscDesc)
  TempVal = ""
  For x = 0 to UBound(TheArr)
    For y = x+1 to UBound(TheArr)
      If AscDesc = "Desc" Then
        If int(split(TheArr(x), ";")(0)) = int(split(TheArr(y), ";")(0)) then
          If int(split(TheArr(x), ";")(1)) < int(split(TheArr(y), ";")(1)) then
            TempVal = TheArr(y)
            TheArr(y) = TheArr(x)
            TheArr(x) = TempVal
          end if
        elseIf int(split(TheArr(x), ";")(0)) < int(split(TheArr(y), ";")(0)) then
          TempVal = TheArr(y)
          TheArr(y) = TheArr(x)
          TheArr(x) = TempVal
        End If
      Else
        If int(split(TheArr(x), ";")(0)) = int(split(TheArr(y), ";")(0)) then
          If int(split(TheArr(x), ";")(0)) > int(split(TheArr(y), ";")(0)) then
            TempVal = TheArr(x)
            TheArr(x) = TheArr(y)
            TheArr(y) = TempVal
          end if
        elseIf int(split(TheArr(x), ";")(0)) > int(split(TheArr(y), ";")(0)) then
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
    rsFlightplan.open "select * from flightplan", conn2, 1, 1
    rslaunchTimes.open "select * from [launch times]", conn2, 1, 1
   
    'open and get the latest records nearest to current UT
    if not rsFlightplan.eof then
      rsFlightplan.MoveLast
      do until rsFlightplan.fields.item("UT") <= UT
        rsFlightplan.MovePrevious
        if rsFlightplan.bof then exit do
      Loop
      
      'if we reached the beginning the first record is the next event for this craft
      if rsFlightplan.bof then rsFlightplan.MoveNext
      
      'only add the event if the actual execution time is still in the future
      if (rsFlightplan.fields.item("ExecuteUT") > UT) then
        maneuvers(maneuverIndex) = rsFlightplan.fields.item("UT") & ";" & rsFlightplan.fields.item("ExecuteUT") & ";" & rsCrafts.fields.item("DB") & ";" & rsCrafts.fields.item("Vessel") & ";" & rsFlightplan.fields.item("Desc")
        maneuverIndex = maneuverIndex + 1
      end if
    end if
    if not rslaunchTimes.eof then
      rslaunchTimes.MoveLast
      do until rslaunchTimes.fields.item("UT") <= UT
        rslaunchTimes.MovePrevious
        if rslaunchTimes.bof then exit do
      Loop

      'if we reached the beginning the first record is the next event for this craft
      if rslaunchTimes.bof then rslaunchTimes.MoveNext
        
      'only add the event if the actual launch time is still in the future
      if rslaunchTimes.fields.item("LaunchTime") > UT or isNull(rslaunchTimes.fields.item("LaunchTime")) then
        launchTime = rslaunchTimes.fields.item("LaunchTime")
        if isNull(rslaunchTimes.fields.item("LaunchTime")) then launchTime = "hold"
        launches(launchIndex) = rslaunchTimes.fields.item("UT") & ";" & launchTime & ";" & rsCrafts.fields.item("DB") & ";" & rsCrafts.fields.item("Vessel") & ";" & rsCrafts.fields.item("Desc")
        launchIndex = launchIndex + 1
      end if
    end if
    conn2.Close
    Set conn2 = nothing
  end if
  
  'advance the recordset point and repeat
  rsCrafts.movenext
loop until rsCrafts.eof

'resize the arrays down to just what was stored and sort them
ReDim preserve launches(launchIndex-1)
ReDim preserve maneuvers(maneuverIndex-1)
Call SortArray(launches,"Asc")
Call SortArray(maneuvers,"Asc")

'output the data
if UBound(launches) >= 0 then
  response.write(launches(0) & "|")
else
  response.write("null|")
end if
if UBound(launches) >= 1 then
  response.write(launches(1) & "^")
else
  response.write("null^")
end if
if UBound(maneuvers) >= 0 then
  response.write(maneuvers(0) & "|")
else
  response.write("null|")
end if
if UBound(maneuvers) >= 1 then
  response.write(maneuvers(1))
else
  response.write("null")
end if

conn.Close
Set conn = nothing
%>