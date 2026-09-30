type GoogleNameProfile = {
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
};

export function googleProfileName(profile: GoogleNameProfile): string | null {
  const structuredName = [profile.given_name, profile.family_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  const displayName = profile.name?.trim() ?? "";

  if (!structuredName) return displayName || null;
  if (!displayName) return structuredName;

  // Bazı Google hesapları structured alanlardan yalnızca birini döndürür.
  // Bu durumda daha fazla ad parçasını koruyan gösterim adını tercih et.
  const structuredParts = structuredName.split(/\s+/u).filter(Boolean).length;
  const displayParts = displayName.split(/\s+/u).filter(Boolean).length;

  return displayParts > structuredParts ? displayName : structuredName;
}
