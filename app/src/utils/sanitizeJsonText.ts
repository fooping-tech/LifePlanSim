export const sanitizeJsonText = (text: string): string => {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\uFF02]/g, '"') // “ ” „ ‟ ″ ＂
    .replace(/[\u2018\u2019\u201A\u201B\u2032\uFF07]/g, "'") // ‘ ’ ‚ ‛ ′ ＇
    .replace(/\u00A0/g, ' ') // nbsp
}

