const TURKISH_ASCII_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

function personNameTokens(value: string): string[] {
  return normalizePersonName(value).split(" ").filter(Boolean);
}

function tokenMatches(left: string, right: string): boolean {
  if (left === right) return true;

  // Öğrenci listelerinde "A. Yılmaz" gibi baş harfli adlar bulunabiliyor.
  // Baş harfi yalnızca diğer taraftaki tam kelimenin başıyla eşleştiriyoruz.
  return (
    (left.length === 1 && right.length > 1 && right.startsWith(left)) ||
    (right.length === 1 && left.length > 1 && left.startsWith(right))
  );
}

function everyTokenHasDistinctMatch(shorter: string[], longer: string[]): boolean {
  const usedLongerIndexes = new Set<number>();
  const tokensNeedingInitialMatch: string[] = [];

  // Önce tam kelimeleri ayır; bir baş harfin daha sonra ihtiyaç duyulan tam
  // kelimeyi tüketmesi ("A Ali" / "Ali Ahmet") hatalı ret üretmesin.
  for (const token of shorter) {
    const matchingIndex = longer.findIndex(
      (candidate, index) => !usedLongerIndexes.has(index) && token === candidate,
    );
    if (matchingIndex < 0) {
      tokensNeedingInitialMatch.push(token);
    } else {
      usedLongerIndexes.add(matchingIndex);
    }
  }

  return tokensNeedingInitialMatch.every((token) => {
    const matchingIndex = longer.findIndex(
      (candidate, index) => !usedLongerIndexes.has(index) && tokenMatches(token, candidate),
    );
    if (matchingIndex < 0) return false;
    usedLongerIndexes.add(matchingIndex);
    return true;
  });
}

export function normalizePersonName(value: string): string {
  return value
    .trim()
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (character) => TURKISH_ASCII_MAP[character] ?? character)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function arePersonNamesCompatible(accountName: string, rosterName: string): boolean {
  const accountTokens = personNameTokens(accountName);
  const rosterTokens = personNameTokens(rosterName);

  if (accountTokens.join(" ") === rosterTokens.join(" ")) return true;

  // "Nur Selin" / "Nurselin" gibi yalnızca boşluk kullanımı değişen adlar.
  if (
    accountTokens.length > 0 &&
    rosterTokens.length > 0 &&
    accountTokens.join("") === rosterTokens.join("")
  ) {
    return true;
  }

  // Öğrenci numarası aday kümesini zaten daralttığı için ad parçalarının sırası
  // kimlik kanıtı değildir: "Ahmet Can Kaya" ve "Kaya Ahmet Can" eşdeğerdir.
  // Yine de tek kelimelik profilleri otomatik eşleştirmeyerek yanlış pozitifleri önlüyoruz.
  if (accountTokens.length < 2 || rosterTokens.length < 2) return false;

  const [shorterTokens, longerTokens] =
    accountTokens.length <= rosterTokens.length
      ? [accountTokens, rosterTokens]
      : [rosterTokens, accountTokens];

  return everyTokenHasDistinctMatch(shorterTokens, longerTokens);
}
