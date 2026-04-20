export interface PriceTier {
  range: string;
  min: number;
  max: number;
  item: string;
}

export const ITALY_WAGE_PER_MINUTE = 0.20;
export const ITALY_MINUTES_PER_100G = 4.02;

export const PRICING_TIERS: PriceTier[] = [
  { range: "0 - 2 €", min: 0, max: 2, item: "Un caffè espresso al bancone + un cioccolatino, o un pacchetto di gomme da masticare." },
  { range: "2 - 4 €", min: 2, max: 4, item: "La colazione classica: un cappuccino e un cornetto al bar." },
  { range: "4 - 6 €", min: 4, max: 6, item: "Un panino dal kebabbaro o una bustina di carte Pokémon." },
  { range: "6 - 8 €", min: 6, max: 8, item: "Una pizza margherita da asporto o... un vasetto di Nutella gigante (900g)." },
  { range: "8 - 10 €", min: 8, max: 10, item: "Un cocktail (Spritz o Mojito) per l'aperitivo o un biglietto per il cinema." },
  { range: "10 - 12 €", min: 10, max: 12, item: "Un mese di abbonamento premium alla musica o un menu hamburger in un fast food." },
  { range: "12 - 14 €", min: 12, max: 14, item: "La combo del sabato sera: Pizza + Birra media in pizzeria (coperto incluso)." },
  { range: "14 - 16 €", min: 14, max: 16, item: "Una T-shirt o un mese di abbonamento Standard a servizi di streaming." },
  { range: "16 - 18 €", min: 16, max: 18, item: "Un libro appena uscito (novità in libreria) o un'ottima bottiglia di vino al supermercato." },
  { range: "18 - 20 €", min: 18, max: 20, item: "Capelli e barba dal barbiere o un pasto al fast food per due persone." },
  { range: "20 - 22 €", min: 20, max: 22, item: "Una cover di marca per lo smartphone o un powerbank di buona qualità." },
  { range: "22 - 24 €", min: 22, max: 24, item: "Una cena base in trattoria (un primo, acqua e caffè) o un biglietto per un concerto indie locale." },
  { range: "24 - 26 €", min: 24, max: 26, item: "Una felpa base o un maglione leggero in un negozio fast fashion." },
  { range: "26 - 28 €", min: 26, max: 28, item: "Un abbonamento mensile ai mezzi pubblici per studenti (nella maggior parte delle città medie)." },
  { range: "28 - 30 €", min: 28, max: 30, item: "Un mazzo di fiori dal fiorista o una torta artigianale in pasticceria da portare a una cena." },
  { range: "30 - 32 €", min: 30, max: 32, item: "Una cena All You Can Eat (sushi serale festivo o weekend, bevande escluse)." },
  { range: "32 - 34 €", min: 32, max: 34, item: "Un biglietto del treno andata/ritorno per una tratta regionale (es. Milano-Bologna)." },
  { range: "34 - 36 €", min: 34, max: 36, item: "Uno zainetto da tutti i giorni (es. un modello base Eastpak in sconto)." },
  { range: "36 - 38 €", min: 36, max: 38, item: "Un profumo commerciale in formato piccolo (30ml)." },
  { range: "38 - 40 €", min: 38, max: 40, item: "Un paio di jeans nuovi o circa metà serbatoio di benzina per un'utilitaria." },
  { range: "40 - 42 €", min: 40, max: 42, item: "Una cena completa in un buon ristorante (antipasto, primo o secondo, dolce e calice di vino)." },
  { range: "42 - 44 €", min: 42, max: 44, item: "Un biglietto d'ingresso a prezzo pieno per un grande parco divertimenti." },
  { range: "44 - 46 €", min: 44, max: 46, item: "Un abbonamento mensile 'Open' in una palestra commerciale." },
  { range: "46 - 48 €", min: 46, max: 48, item: "Una macchinetta del caffè a capsule (modelli base spesso in offerta)." },
  { range: "48 - 50 €", min: 48, max: 50, item: "Un biglietto per una partita di Serie A (settore curve/distinti) o un videogioco nuovo (scontato)." }
];

export function findMatchingTier(euroValue: number): PriceTier | null {
  if (euroValue <= 0) return null;
  
  if (euroValue > 50) {
    return { range: "> 50 €", min: 50, max: 99999, item: "Più di 50€. Ci compri tanta roba di lusso o una super spesa completa al supermercato!" };
  }

  return PRICING_TIERS.find(tier => euroValue >= tier.min && euroValue < tier.max) || PRICING_TIERS[PRICING_TIERS.length - 1];
}
