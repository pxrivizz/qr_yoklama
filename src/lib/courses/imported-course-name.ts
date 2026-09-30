export function importedCourseName(courseName?: string, branchCode?: string): string | undefined {
  const name = courseName?.trim();
  if (!name) return undefined;

  const rawBranch = branchCode?.trim();
  if (!rawBranch) return name;

  const branch = rawBranch.replace(/^şube\s*/iu, "").trim();
  if (!branch) return name;

  const suffix = `Şube ${branch}`;
  if (name.toLocaleLowerCase("tr-TR").endsWith(suffix.toLocaleLowerCase("tr-TR"))) {
    return name;
  }

  return `${name} - ${suffix}`;
}
