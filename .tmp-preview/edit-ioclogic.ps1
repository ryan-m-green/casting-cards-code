# Remove the deleted handlers' registrations and the duplicate encounter registrations.
$p = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCLogic.cs'
$lines = [System.IO.File]::ReadAllLines($p)

# line number (1-based) -> must contain this text
$expect = @{
  149 = 'IZipLibraryImportCommandHandler'
  151 = 'IUpsertCastPlayerNotesCommandHandler'
  152 = 'IUpsertLocationPlayerNotesCommandHandler'
  153 = 'IUpsertSublocationPlayerNotesCommandHandler'
  154 = 'IUpsertCampaignPlayerNotesCommandHandler'
  274 = 'IGetOrCreateStripeCustomerCommandHandler'
  280 = 'ICreateEncounterCommandHandler'
  281 = 'IAddCombatantToEncounterCommandHandler'
  282 = 'ICreateEncounterGroupCommandHandler'
  283 = 'IUpdateEncounterCombatantCommandHandler'
  284 = 'IRemoveEncounterCombatantCommandHandler'
  285 = 'IReorderEncounterSpotsCommandHandler'
  286 = 'IAdvanceEncounterTurnCommandHandler'
  287 = 'IEndEncounterCommandHandler'
  321 = 'IExportLibraryQueryHandler'
  325 = 'IGetImportTemplateQueryHandler'
  333 = 'IGetCastPlayerNotesQueryHandler'
  334 = 'IGetLocationPlayerNotesQueryHandler'
  335 = 'IGetSublocationPlayerNotesQueryHandler'
  336 = 'IGetCampaignPlayerNotesQueryHandler'
  384 = 'IGetCampaignEncountersQueryHandler'
  385 = 'IGetEncounterDetailQueryHandler'
  386 = 'IGetCampaignTrophiesQueryHandler'
}
# validate
foreach ($ln in $expect.Keys) {
  $actual = $lines[$ln - 1]
  if ($actual -notlike ('*' + $expect[$ln] + '*')) {
    throw "Line $ln does not contain '$($expect[$ln])'. Actual: $actual"
  }
}
$keep = for ($i = 0; $i -lt $lines.Count; $i++) { if (-not $expect.ContainsKey($i + 1)) { $lines[$i] } }
[System.IO.File]::WriteAllLines($p, $keep, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("IOCLogic.cs: removed " + $expect.Count + " lines; now " + $keep.Count + " lines")
