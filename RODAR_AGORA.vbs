Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

Dim logPath
logPath = objFSO.GetParentFolderName(WScript.ScriptFullName) & "\resultado_registro.txt"

Dim cmd
cmd = "cmd /c cd /d """ & objFSO.GetParentFolderName(WScript.ScriptFullName) & "\backend"" && node setup_whatsapp_channel.js EAAVbXzwMh1cBSYLtkDwsDINOMTeO2Y09nFkOyhuBMT6andTWa1g3nP76WhgwGC0mfhK8ipHcPTZBScC8NTPs3f3lBQZBvBzn3Oswvp3wpxbjOw9BQ7hhAU3jCex6mv0UcBN1S0ZCTPe8xfs6hbZBYOmcvJ7PKlhYFBxMV2WVnAiAGi658HoxLroOKhS7jObcxQZDZD > """ & logPath & """ 2>&1"

objShell.Run cmd, 0, True

MsgBox "Concluido! Verifique o arquivo resultado_registro.txt na pasta agent-one-mobile.", 64, "Agent One"
