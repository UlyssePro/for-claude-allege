const UNITS = [
  "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];

const TENS = [
  "", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt",
];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7 || ten === 9) {
    const teen = 10 + unit;
    if (unit === 0) return TENS[ten];
    if (unit === 1 && ten === 7) return `soixante et ${UNITS[teen]}`;
    return `${TENS[ten]}-${UNITS[teen]}`;
  }
  if (unit === 0) return TENS[ten];
  if (unit === 1 && ten !== 8) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let text = "";
  if (hundreds === 1) {
    text = "cent";
  } else if (hundreds > 1) {
    text = `${UNITS[hundreds]} cent`;
  }
  if (rest === 0) {
    if (hundreds > 1) text += "s";
    return text;
  }
  return text ? `${text} ${belowHundred(rest)}` : belowHundred(rest);
}

export function numberToFrenchWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  const rounded = Math.round(n);
  if (rounded === 0) return "zéro";

  const parts: string[] = [];
  if (rounded >= 1_000_000_000) {
    const billions = Math.floor(rounded / 1_000_000_000);
    parts.push(billions === 1 ? "un milliard" : `${numberToFrenchWords(billions)} milliards`);
  }
  if (rounded >= 1_000_000) {
    const millions = Math.floor((rounded % 1_000_000_000) / 1_000_000);
    parts.push(millions === 1 ? "un million" : `${numberToFrenchWords(millions)} millions`);
  }
  if (rounded >= 1_000) {
    const thousands = Math.floor((rounded % 1_000_000) / 1_000);
    parts.push(thousands === 1 ? "mille" : `${numberToFrenchWords(thousands)} mille`);
  }
  const remainder = rounded % 1_000;
  if (remainder > 0) {
    parts.push(belowThousand(remainder));
  }

  return parts.join(" ");
}

export default numberToFrenchWords;
