export function shortUnitLabel(slug: string): string {
  switch (slug) {
    case "dk":
      return "ДК";
    case "libraries":
      return "Библиотека";
    case "museums":
      return "Музей";
    case "ksc":
      return "КСЦ";
    case "sport":
      return "Спорт";
    default:
      return "Учреждение";
  }
}
