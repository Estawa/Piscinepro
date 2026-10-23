import React, { useState, useEffect, useMemo } from "react";
import {
  Droplet, Home, Activity, BookOpen, Thermometer, Plus, Trash2,
  ChevronRight, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp, Minus, Info, ShieldAlert, Timer, List, LineChart as LineChartIcon
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/* ---------------------------------------------------------------
   PALETTE — "carnet de laboratoire aquatique"
   Fond nuit-bassin, cartes ardoise-teal, accents test-strip.
--------------------------------------------------------------- */
const C = {
  ink: "#0B2429",
  surface: "#11343A",
  surfaceRaised: "#163F45",
  border: "#1F5057",
  teal: "#3FC7B4",
  tealSoft: "#1E4A4B",
  amber: "#E3A857",
  red: "#E2605A",
  textHi: "#EAF6F3",
  textLo: "#8FB6B1",
};

const FONT_DISPLAY = "'Space Grotesk', 'Segoe UI', ui-sans-serif, system-ui, sans-serif";
const FONT_BODY = "'Inter', 'Segoe UI', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace";

/* ---------------------------------------------------------------
   PARAMÈTRES DE RÉFÉRENCE (indicatifs — ordres de grandeur usuels)
--------------------------------------------------------------- */
const TREATMENTS = [
  { id: "galets", label: "Chlore lent (galets)" },
  { id: "chlore_choc", label: "Chlore choc / poudre" },
  { id: "javel9", label: "Javel liquide 9,6 %" },
  { id: "javel12_5", label: "Javel liquide 12,5 %" },
  { id: "brome", label: "Brome" },
  { id: "sel", label: "Sel (électrolyse)" },
  { id: "oxygene_actif", label: "Oxygène actif" },
  { id: "phmb", label: "PHMB (biguanide)" },
];

const PHMINUS_PRODUCTS = [
  { id: "poudre", label: "pH- en poudre (bisulfate de sodium)" },
  { id: "acide23", label: "Acide chlorhydrique 23 %" },
  { id: "acide33", label: "Acide chlorhydrique 33 %" },
];

const PHPLUS_PRODUCTS = [
  { id: "carbonate", label: "pH+ / carbonate de sodium (rapide)" },
  { id: "bicarbonate", label: "Bicarbonate de soude (doux, remonte aussi le TAC)" },
];

/* ---------------------------------------------------------------
   ÉTAT VISUEL — ce qu'un pisciniste regarde avant de sortir les tests
--------------------------------------------------------------- */
const ETATS_EAU = [
  { id: "claire", level: 0, label: "Eau claire", color: "#3FC7B4" },
  { id: "legere_verte", level: 1, label: "Légèrement verte", color: "#9ACB6B" },
  { id: "verte_foncee", level: 2, label: "Verte foncée", color: "#6E9A3F" },
  { id: "depot_leger", level: 3, label: "Léger dépôt au fond", color: "#E3A857" },
  { id: "depot_prononce", level: 4, label: "Dépôt prononcé (fond + parois)", color: "#DB7B3F" },
  { id: "depot_tres_prononce", level: 5, label: "Dépôt très prononcé", color: "#E2605A" },
];
function etatInfo(id) { return ETATS_EAU.find((e) => e.id === id) || ETATS_EAU[0]; }

function coutCompare(fraction, label, profil, volume) {
  const prixEau = Number(profil?.prixEau) || null;
  const cout = prixEau && volume ? Math.round(volume * fraction * prixEau) : null;
  return cout != null
    ? ` À titre de comparaison, ${label} de ton bassin de ${volume} m³ te coûterait environ ${cout} € rien qu'en eau (à ${prixEau} €/m³), sans compter le temps de re-remplissage et de ré-équilibrage.`
    : ` Indique le prix de l'eau dans ton Profil pour que je puisse comparer le coût d'une vidange à celui d'un traitement.`;
}

/* ---------------------------------------------------------------
   CHOC — explication claire, adaptée au produit réellement utilisé
--------------------------------------------------------------- */
function formatMl(ml) {
  if (ml >= 1000) return `${(Math.round(ml / 100) / 10).toString().replace(".", ",")} L`;
  return `${ml} mL`;
}

/* niveau : "leger" (début d'algues) ou "fort" (algues installées) */
function chocInstructions(profil, volume, niveau) {
  const t = profil?.traitement;
  const cible = niveau === "fort" ? 20 : 10; // mg/L de chlore libre visés pendant le choc
  const isJavel = t === "javel9" || t === "javel12_5";
  const pourc = t === "javel12_5" ? 12.5 : 9.6;
  const vol = Number(volume) || 0;

  const avant = "Avant le choc, vérifie ton pH : il doit être entre 7,0 et 7,2, sinon le chlore perd la majeure partie de son efficacité (corrige-le d'abord, attends 2 h).";
  const apres = `Pendant le choc : filtration en continu 24 à 48 h, brossage des parois et du fond chaque jour, et ${filterActionLabel(profil?.typeFiltre)} quand l'eau commence à s'éclaircir (les algues mortes le colmatent). Reteste le chlore libre après 24 h : s'il est déjà retombé sous 3 mg/L alors que l'eau est encore verte, refais la même dose.`;

  if (isJavel) {
    const dose = vol ? Math.round((100 * cible * vol) / pourc) : null;
    return `Comment faire le choc avec ta javel : la javel, c'est du chlore liquide (hypochlorite de sodium) — c'est exactement le même produit actif que le « chlore choc » vendu en magasin piscine, tu n'as rien d'autre à acheter. Un choc, c'est simplement mettre beaucoup de chlore d'un coup (environ ${cible} mg/L au lieu de 1 à 3) pour tuer les algues. ${dose ? `Pour ton bassin de ${vol} m³, verse environ ${formatMl(dose)} de javel à ${pourc.toString().replace(".", ",")} % en une seule fois.` : "Indique le volume de ton bassin dans le Profil pour que je te calcule la quantité exacte de javel."} ${avant} Verse la javel le soir (le soleil la détruit), lentement, devant les buses de refoulement, filtration en marche. Prends de la javel sans parfum ni additif, et la plus récente possible (elle perd de sa force en vieillissant, surtout au chaud). Ne la verse jamais en même temps que le pH- ou un acide : au moins 2 h d'écart. ${apres}`;
  }
  if (t === "galets" || t === "chlore_choc") {
    const grams = vol ? Math.round(vol * (niveau === "fort" ? 30 : 15)) : null;
    return `Comment faire le choc : il te faut du chlore « choc » à dissolution rapide (granulés ou pastilles choc) — les galets lents ne conviennent pas, ils se dissolvent trop doucement. ${grams ? `Pour ton bassin de ${vol} m³, compte environ ${grams} g (à ajuster selon la notice de ton produit).` : "Indique le volume de ton bassin dans le Profil pour que je te calcule la quantité."} ${avant} Dissous le produit dans un seau d'eau (le produit dans l'eau, jamais l'inverse) et verse le soir devant les refoulements. Tu peux aussi utiliser de la javel : c'est le même chlore, sous forme liquide. ${apres}`;
  }
  if (t === "sel") {
    return `Comment faire le choc : ton électrolyseur produit trop peu de chlore pour rattraper des algues. Mets-le en mode « boost » si tu l'as, et ajoute en plus un choc manuel : de la javel ou du chlore choc granulés (la javel convient très bien et ne gêne pas l'électrolyse). ${avant} ${apres}`;
  }
  if (t === "brome") {
    return `Comment faire le choc : avec le brome, on choque en général avec un oxydant (chlore choc non stabilisé ou oxygène actif choc) selon la notice de ton produit, pour régénérer le brome. ${avant} ${apres}`;
  }
  return `Comment faire le choc : avec ton traitement, suis la notice du produit « choc » associé. ${avant} ${apres}`;
}

/* ---------------------------------------------------------------
   FIN DE SAISON / HIVERNAGE — quand on ne se baigne plus
--------------------------------------------------------------- */
function buildHivernageSteps(profil, m, volume) {
  const etat = etatInfo(m.etatEau);
  const temp = m.temp !== "" && m.temp != null ? Number(m.temp) : null;
  const isEnterree = profil?.typeBassin === "enterre";
  const steps = [];

  if (etat.level > 0) {
    steps.push({
      title: "Hivernage · 1 · Rattrape l'eau une dernière fois avant de fermer",
      color: C.amber,
      text: `Même si tu ne te baignes plus, ne laisse pas l'eau verte tout l'hiver : les algues s'incrustent dans le liner et les joints, tachent, et au printemps tu aurais un vrai marécage à rattraper (bien plus de produit et de travail). Un seul bon traitement maintenant suffit — pas besoin d'un entretien de saison. Une fois l'eau redevenue claire, tu passes à l'hivernage ci-dessous.`,
    });
  }

  steps.push({
    title: "Hivernage · Faut-il continuer à traiter ?",
    color: C.teal,
    text: `Non, plus d'entretien « baignade ». Quand l'eau descend durablement sous 12 à 15 °C, les algues ne se développent quasiment plus : c'est le bon moment pour hiverner.${temp != null ? ` Ton eau est à ${temp} °C : ${temp <= 15 ? "tu peux hiverner dès que l'eau est claire." : "attends qu'elle descende encore un peu avant de tout couper, et garde une filtration de quelques heures par jour d'ici là."}` : ""} Deux façons de faire :
• Hivernage actif (le plus simple dans une région aux hivers doux) : tu laisses l'eau, une bâche, et la filtration tourne environ 3 à 4 h par jour (mode hors-gel si ta pompe l'a). Un petit contrôle du chlore une fois par mois, et une dose de javel si l'eau commence à tourner.
• Hivernage passif : après le dernier choc et une eau claire, pH vers 7,2, tu mets un produit d'hivernage (anti-algues longue durée), tu baisses le niveau sous les skimmers, tu vidanges pompe et filtre, tu mets les bouchons d'hivernage et des flotteurs, puis la bâche. Plus rien jusqu'au printemps.`,
  });

  steps.push({
    title: "Hivernage · La vider ?",
    color: isEnterree ? C.red : C.amber,
    text: isEnterree
      ? "Non, ne la vide surtout pas : une piscine enterrée vide peut se déformer, voire remonter sous la pression de la nappe et de la terre (liner qui se décolle ou se rétracte, structure abîmée). L'eau protège le bassin pendant l'hiver. On garde l'eau et on la traite au printemps."
      : "Ce n'est pas conseillé : un liner de hors-sol vidé se rétracte au froid et risque de ne plus se remettre en place, et tu gaspillerais toute l'eau pour la racheter au printemps. On garde l'eau, on hiverne, et on la remet en route au printemps. Seule exception : un petit bassin autoportant ou tubulaire prévu pour être démonté — là, tu peux le vider, le sécher et le ranger à l'abri.",
  });

  steps.push({
    title: "Hivernage · Et l'arroser avec ?",
    color: C.textLo,
    text: "Pas toute l'eau, mais tu peux utiliser celle que tu retires pour baisser le niveau (hivernage passif) : arrosage de pelouse, haies ou arbres. Attends pour ça que le chlore libre soit retombé quasiment à 0 (plusieurs jours sans aucun produit, idéalement au soleil) et jamais dans les jours qui suivent un choc ou un produit d'hivernage. Évite le potager et les plantes fragiles, et ne rejette pas d'eau chlorée dans un fossé, un ruisseau ou le réseau d'eaux pluviales.",
  });

  return steps;
}

function buildVisualStep(etatEauId, profil, volume) {
  const etat = etatInfo(etatEauId);
  const filtreAction = filterActionLabel(profil?.typeFiltre);
  const isEnterree = profil?.typeBassin === "enterre";

  const compareBlock = (fraction, label) =>
    coutCompare(fraction, label, profil, volume) +
    ` Un traitement choc renforcé revient en général à quelques dizaines d'euros de produits — c'est presque toujours le premier réflexe${isEnterree ? ", sauf piscine enterrée où une vidange totale fait courir un risque réel de déformation de structure ou de liner" : " ; ta piscine étant hors-sol, une vidange complète reste une option plus simple et moins risquée si le traitement ne suffit pas"}.`;

  if (etat.level === 0) {
    return { title: "Coup d'œil sur ton eau", color: etat.color, text: "Ton eau a l'air claire à l'œil — bon signe avant même de sortir les tests. Pense quand même à brosser les parois et le fond une fois par semaine : c'est le geste préventif qui empêche les algues de s'accrocher avant même de se voir. On regarde le détail des paramètres ci-dessous." };
  }
  if (etat.level === 1) {
    return {
      title: "Coup d'œil sur ton eau : légèrement verte",
      color: etat.color,
      text: "Ta piscine tire un peu vers le vert : c'est un début d'algues, encore facile à rattraper. Fais un choc au chlore le soir, brosse bien les parois et le fond pour décoller les algues avant qu'elles ne s'accrochent — répète ce brossage chaque jour tant que la teinte n'est pas repartie —, et laisse tourner la filtration en continu pendant 24 h. Recontrôle ensuite les paramètres ci-dessous.\n\n" + chocInstructions(profil, volume, "leger"),
    };
  }
  if (etat.level === 2) {
    return {
      title: "Coup d'œil sur ton eau : verte foncée",
      color: etat.color,
      text: `Les algues sont bien installées. Fais un choc renforcé (double dose), brosse énergiquement chaque jour — insiste sur les recoins et les marches, un simple passage ne suffira pas —, ajoute un floculant ou un clarifiant pour aider les particules à se regrouper, et ${filtreAction} plusieurs fois pendant le traitement (les algues mortes le colmatent vite). Compte 2 à 4 jours de filtration continue avant d'y voir plus clair.\n\n${chocInstructions(profil, volume, "fort")}`,
    };

  }
  if (etat.level === 3) {
    return {
      title: "Coup d'œil sur ton eau : léger dépôt au fond",
      color: etat.color,
      text: "Il y a un dépôt d'algues mortes ou de débris au fond. Aspire directement à l'égout (jamais à travers le filtre, pour ne pas le boucher), puis fais un choc au chlore et brosse le fond et les parois chaque jour jusqu'à ce que le dépôt disparaisse complètement. Reteste une fois l'eau limpide.",
    };
  }
  if (etat.level === 4) {
    return {
      title: "Coup d'œil sur ton eau : dépôt prononcé",
      color: etat.color,
      text: `Le dépôt gagne aussi les parois : c'est un traitement plus lourd — plusieurs chocs rapprochés, brossage systématique matin et soir à chaque passage, aspiration à l'égout et floculant. Ça se rattrape encore, mais ça va prendre plusieurs jours de travail assidu.${compareBlock(0.3, "renouveler environ 30 %")}`,
    };
  }
  return {
    title: "Coup d'œil sur ton eau : dépôt très prononcé",
    color: etat.color,
    text: `À ce stade, l'eau est vraiment dégradée. Tu peux tenter une dernière fois un traitement choc massif avec brossage matin et soir et floculant, mais si rien ne bouge après ça, une vidange partielle (30 à 50 % de l'eau) est souvent plus rapide et efficace qu'un enchaînement de chocs qui ne suffiront plus.${compareBlock(0.5, "une vidange totale")}${isEnterree ? " Pour une vidange totale, mieux vaut faire appel à un professionnel vu que ta piscine est enterrée, pour éviter tout risque de déformation." : ""}`,
  };
}


function dosePhPlus(produit, deltaPH, volM3) {
  if (!volM3 || volM3 <= 0 || deltaPH <= 0) return null;
  if (produit === "bicarbonate") return { qty: Math.round(volM3 * 175 * deltaPH), unit: "g", name: "bicarbonate de soude" };
  return { qty: Math.round(volM3 * 150 * deltaPH), unit: "g", name: "carbonate de sodium (pH+)" };
}

/* Dose de désinfectant nécessaire pour combler un écart (mg/L) sur un volume (m³) */
function doseDesinfectant(treatmentId, deltaMgL, volM3) {
  if (!volM3 || volM3 <= 0 || deltaMgL <= 0) return null;
  if (treatmentId === "javel9") return { qty: Math.round((100 * deltaMgL * volM3) / 9.6), unit: "mL", name: "javel à 9,6 %" };
  if (treatmentId === "javel12_5") return { qty: Math.round((100 * deltaMgL * volM3) / 12.5), unit: "mL", name: "javel à 12,5 %" };
  return { qty: Math.round(volM3 * 4 * deltaMgL), unit: "g", name: treatmentId === "brome" ? "brome" : "chlore (galets/poudre)" };
}

/* Dose de pH- nécessaire pour abaisser le pH de deltaPH points sur un volume (m³) */
function dosePhMinus(produit, deltaPH, volM3) {
  if (!volM3 || volM3 <= 0 || deltaPH <= 0) return null;
  if (produit === "acide23") return { qty: Math.round(volM3 * (deltaPH * 10) * 5), unit: "mL", name: "acide chlorhydrique 23 %" };
  if (produit === "acide33") return { qty: Math.round(volM3 * (deltaPH * 10) * 5 * (23 / 33)), unit: "mL", name: "acide chlorhydrique 33 %" };
  return { qty: Math.round(volM3 * 100 * deltaPH), unit: "g", name: "pH- en poudre" };
}

const RANGES = {
  temp: { min: 0, max: 34, idealMin: 24, idealMax: 28, unit: "°C", label: "Température", lowLabel: "Fraîche", lowColor: "#8FB6B1" },
  ph: { min: 6.4, max: 8.2, idealMin: 7.0, idealMax: 7.4, unit: "", label: "pH" },
  desinfectant: { min: 0, max: 6, idealMin: 1, idealMax: 3, unit: "mg/L", label: "Chlore libre" },
  desinfectantBrome: { min: 0, max: 8, idealMin: 3, idealMax: 5, unit: "mg/L", label: "Brome" },
  chloreTotal: { min: 0, max: 6, unit: "mg/L", label: "Chlore total" },
  tac: { min: 0, max: 240, idealMin: 80, idealMax: 120, unit: "mg/L", label: "TAC (alcalinité)" },
  stabilisant: { min: 0, max: 150, idealMin: 30, idealMax: 50, unit: "mg/L", label: "Stabilisant" },
  th: { min: 0, max: 600, idealMin: 100, idealMax: 400, unit: "mg/L", label: "Dureté (TH)" },
  sel: { min: 0, max: 8, idealMin: 3, idealMax: 5, unit: "g/L", label: "Sel" },
  orp: { min: 400, max: 900, idealMin: 650, idealMax: 800, unit: "mV", label: "Redox (ORP)" },
  tds: { min: 0, max: 3000, idealMax: 1500, unit: "mg/L", label: "TDS (sels dissous)" },
  phosphates: { min: 0, max: 2000, idealMax: 500, unit: "µg/L", label: "Phosphates" },
  fer: { min: 0, max: 3, idealMax: 0.3, unit: "mg/L", label: "Fer" },
  cuivre: { min: 0, max: 1, idealMax: 0.2, unit: "mg/L", label: "Cuivre" },
  turbidite: { min: 0, max: 5, idealMax: 1, unit: "NTU", label: "Turbidité" },
};

const TYPES_BASSIN = [
  { id: "hors_sol", label: "Hors-sol" },
  { id: "enterre", label: "Enterrée" },
];
const STRUCTURES = [
  { id: "liner", label: "Liner" },
  { id: "coque", label: "Coque polyester" },
  { id: "beton", label: "Béton / carrelée" },
];
const FILTRES = [
  { id: "sable", label: "Filtre à sable" },
  { id: "verre", label: "Filtre à verre" },
  { id: "cartouche", label: "Filtre à cartouche" },
];
const CHART_PARAMS = [
  { id: "ph", label: "pH" },
  { id: "desinfectant", label: "Chlore/Brome libre" },
  { id: "tac", label: "TAC" },
  { id: "temp", label: "Température" },
  { id: "stabilisant", label: "Stabilisant" },
  { id: "th", label: "Dureté" },
];

const USAGES = [
  { id: "baignade", label: "Oui, on se baigne" },
  { id: "hivernage", label: "Non, fin de saison / hiver" },
];

const EVENEMENTS = [
  { id: "aucun", label: "Rien de particulier" },
  { id: "forte_frequentation", label: "Forte fréquentation / fête à la piscine" },
  { id: "orage", label: "Orage / grosse pluie" },
  { id: "canicule", label: "Canicule / forte chaleur" },
  { id: "appoint", label: "Gros appoint d'eau / remplissage" },
];

function buildEventStep(evenementId, profil, volume) {
  if (!evenementId || evenementId === "aucun") return null;
  const dLabel = disinfectantLabel(profil?.traitement);
  if (evenementId === "forte_frequentation") {
    return {
      title: "Après une grosse baignade",
      color: C.amber,
      text: `Beaucoup de baigneurs, c'est beaucoup de crèmes solaires, de sueur et de matières organiques d'un coup : ton ${dLabel.toLowerCase()} se consomme plus vite et tes phosphates grimpent. Fais un petit choc le soir même, et reteste ton pH et ton ${dLabel.toLowerCase()} demain matin avant la prochaine baignade.`,
    };
  }
  if (evenementId === "orage") {
    return {
      title: "Après un orage",
      color: C.amber,
      text: "La pluie dilue ton eau — ton TAC, ton pH et ton chlore baissent souvent d'un coup — et le vent peut avoir apporté poussières, pollen ou débris qui nourrissent les algues. Reteste TAC, pH et chlore dès que possible, et prévois un petit choc préventif si le ciel est resté couvert plusieurs jours (moins de soleil = moins de dégradation naturelle, mais aussi moins de vigilance de ta part).",
    };
  }
  if (evenementId === "canicule") {
    return {
      title: "Pendant la canicule",
      color: C.amber,
      text: "La chaleur et les UV dégradent ton chlore plus vite, et l'évaporation concentre tous les autres paramètres (TAC, dureté, sel, stabilisant). Surveille ton chlore plus souvent qu'à l'habitude, augmente un peu ta durée de filtration, et pense à faire l'appoint d'eau si le niveau baisse visiblement.",
    };
  }
  if (evenementId === "appoint") {
    return {
      title: "Après un gros appoint d'eau",
      color: C.amber,
      text: "Un remplissage important dilue tous tes paramètres d'un coup — TAC, dureté, stabilisant, sel si tu es en électrolyse. Prévois de retester l'ensemble dans les 24 h et de réajuster progressivement plutôt que de tout corriger en une fois.",
    };
  }
  return null;
}

function filterActionLabel(typeFiltre) {
  return typeFiltre === "cartouche" ? "rince ou remplace ta cartouche de filtration" : "contre-lave ton filtre";
}


function statusOf(value, range) {
  if (value == null || value === "" || (range.idealMin == null && range.idealMax == null)) return "na";
  const v = Number(value);
  if (range.idealMin != null && v < range.idealMin) return "bas";
  if (range.idealMax != null && v > range.idealMax) return "haut";
  return "ok";
}
const STATUS_COLOR = { ok: C.teal, bas: C.amber, haut: C.red, na: C.textLo };
const STATUS_LABEL = { ok: "Dans la cible", bas: "Trop bas", haut: "Trop haut", na: "—" };

function usesDisinfectantField(t) { return ["galets", "chlore_choc", "javel9", "javel12_5", "brome", "sel"].includes(t); }
function disinfectantRange(t) { return t === "brome" ? RANGES.desinfectantBrome : RANGES.desinfectant; }
function disinfectantLabel(t) { return t === "brome" ? "Brome" : "Chlore"; }

/* ---------------------------------------------------------------
   STORAGE — localStorage du navigateur (persistant sur l'appareil)
--------------------------------------------------------------- */
async function loadPrenom() {
  try {
    const v = localStorage.getItem("piscine:prenom");
    return v || null;
  } catch { return null; }
}
async function savePrenom(prenom) {
  try { localStorage.setItem("piscine:prenom", prenom); } catch {}
}
async function loadProfil() {
  try {
    const v = localStorage.getItem("piscine:profil");
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
async function saveProfil(profil) {
  try { localStorage.setItem("piscine:profil", JSON.stringify(profil)); } catch {}
}
async function loadMesures() {
  try {
    const v = localStorage.getItem("piscine:mesures");
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}
async function saveMesures(mesures) {
  try { localStorage.setItem("piscine:mesures", JSON.stringify(mesures)); } catch {}
}

/* ---------------------------------------------------------------
   JAUGE — cadran demi-cercle, aiguille + bande cible
--------------------------------------------------------------- */
function Gauge({ value, range, label, size = 132 }) {
  const has = value !== "" && value != null && !Number.isNaN(Number(value));
  const v = has ? Number(value) : range.min;
  const clamped = Math.min(range.max, Math.max(range.min, v));
  const pct = (clamped - range.min) / (range.max - range.min);
  const angle = -90 + pct * 180;
  const st = has ? statusOf(v, range) : "na";
  const color = st === "bas" && range.lowColor ? range.lowColor : STATUS_COLOR[st];
  const stLabel = st === "bas" && range.lowLabel ? range.lowLabel : STATUS_LABEL[st];

  const idealStartPct = range.idealMin != null ? (range.idealMin - range.min) / (range.max - range.min) : 0;
  const idealEndPct = range.idealMax != null ? (range.idealMax - range.min) / (range.max - range.min) : 0;
  const arcPath = (p0, p1, r) => {
    const a0 = -90 + p0 * 180, a1 = -90 + p1 * 180;
    const toXY = (a) => [64 + r * Math.cos((a * Math.PI) / 180), 64 + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = toXY(a0), [x1, y1] = toXY(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const needleLen = 46;
  const nx = 64 + needleLen * Math.cos((angle * Math.PI) / 180);
  const ny = 64 + needleLen * Math.sin((angle * Math.PI) / 180);

  return (
    <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 128 76" width={size} height={size * 0.6}>
        <path d={arcPath(0, 1, 52)} stroke={C.border} strokeWidth="9" fill="none" strokeLinecap="round" />
        {range.idealMin != null && (
          <path d={arcPath(idealStartPct, idealEndPct, 52)} stroke={C.teal} strokeOpacity="0.55" strokeWidth="9" fill="none" strokeLinecap="round" />
        )}
        <line x1="64" y1="64" x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="64" cy="64" r="4.5" fill={color} />
      </svg>
      <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: C.textHi, marginTop: -6 }}>
        {has ? `${v}${range.unit}` : "—"}
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.textLo, textAlign: "center" }}>{label}</div>
      {has && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color, marginTop: 2, fontWeight: 600 }}>
          {stLabel}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   MOTEUR DE DIAGNOSTIC
--------------------------------------------------------------- */
function buildDiagnostic(profil, m) {
  if (!m) return null;
  const volume = Number(profil?.volume) || 0;
  const steps = [];
  const visualStep = buildVisualStep(m.etatEau, profil, volume);
  const eventStep = buildEventStep(m.evenement, profil, volume);
  const dRange = disinfectantRange(profil?.traitement);
  const dLabel = disinfectantLabel(profil?.traitement);

  const tacSt = statusOf(m.tac, RANGES.tac);
  const phSt = statusOf(m.ph, RANGES.ph);
  const desSt = usesDisinfectantField(profil?.traitement) ? statusOf(m.desinfectant, dRange) : "na";
  const combine = m.chloreTotal !== "" && m.desinfectant !== "" && m.chloreTotal != null && m.desinfectant != null
    ? Number(m.chloreTotal) - Number(m.desinfectant) : null;
  const stabSt = statusOf(m.stabilisant, RANGES.stabilisant);
  const thSt = statusOf(m.th, RANGES.th);
  const tempSt = statusOf(m.temp, RANGES.temp);

  // 1. TAC en premier : il conditionne la stabilité du pH
  if (tacSt === "bas") {
    const delta = RANGES.tac.idealMin + 20 - Number(m.tac);
    const grams = volume > 0 ? Math.round(volume * 1.7 * (delta / 10)) : null;
    steps.push({
      title: "1 · On relève d'abord ton TAC",
      color: C.amber,
      text: `Ton TAC est trop bas, et tant qu'il l'est, ton pH va bouger dans tous les sens et sera dur à stabiliser. Commence par ça : ajoute un rehausseur de TAC (bicarbonate de soude)${grams ? `, environ ${grams} g` : ""}, puis laisse tourner la filtration et attends 2 à 4 h avant de retester.`,
    });
  } else if (tacSt === "haut") {
    steps.push({
      title: "1 · On fait redescendre ton TAC",
      color: C.amber,
      text: "Ton TAC est trop haut : ton pH va avoir tendance à remonter tout seul et deviendra difficile à stabiliser. Utilise un réducteur de TAC (du pH- dosé finement, par petites touches), et reteste après quelques heures de filtration.",
    });
  }

  // 2. pH ensuite (une fois le TAC dans la cible)
  if (phSt === "bas") {
    const delta = 7.2 - Number(m.ph);
    const dose = dosePhPlus(profil?.produitPhPlus, delta, volume);
    steps.push({
      title: "2 · On remonte ton pH",
      color: C.amber,
      text: `Ton pH est trop bas : ton eau devient agressive, elle peut irriter la peau et les yeux et attaquer ton matériel. Ajoute ${dose ? `${dose.name}, environ ${dose.qty} ${dose.unit}` : "du pH+"}, filtration en marche${profil?.produitPhPlus === "bicarbonate" ? " (ça agit plus lentement, et ça remontera aussi un peu ton TAC)" : ""}, puis reteste 2 h après.`,
    });
  } else if (phSt === "haut") {
    const delta = Number(m.ph) - 7.2;
    const dose = dosePhMinus(profil?.produitPhMinus, delta, volume);
    steps.push({
      title: "2 · On baisse ton pH",
      color: C.amber,
      text: `Ton pH est trop haut : ton ${dLabel.toLowerCase()} perd en efficacité et ton eau risque de se troubler. Ajoute ${dose ? `${dose.name}, environ ${dose.qty} ${dose.unit}` : "du pH-"}, filtration en marche, puis reteste 2 h après. Pense à toujours verser l'acide dans l'eau — jamais l'inverse — et par petites quantités.`,
    });
  }

  // 3. Chlore combiné / chloramines
  if (combine != null && combine > 0.5) {
    const dose = doseDesinfectant(profil?.traitement, 5, volume);
    steps.push({
      title: "3 · Un choc s'impose",
      color: C.red,
      text: `L'écart entre ton chlore total et ton chlore libre dépasse 0,5 mg/L : ce sont des chloramines — cette odeur de "chlore" typique qui pique les yeux. Fais un choc${dose ? ` avec ${dose.name}, environ ${dose.qty} ${dose.unit}` : " au chlore"}, si possible en soirée bassin vide, puis relance la filtration en continu pendant 24 h.`,
    });
  }

  // 4. Désinfectant (chlore / brome)
  if (usesDisinfectantField(profil?.traitement)) {
    if (desSt === "bas") {
      const delta = dRange.idealMin + 1 - Number(m.desinfectant);
      const isSel = profil?.traitement === "sel";
      const dose = doseDesinfectant(profil?.traitement, delta, volume);
      steps.push({
        title: `4 · On remonte ton ${dLabel.toLowerCase()}`,
        color: C.amber,
        text: isSel
          ? "Ton chlore généré est trop bas : augmente un peu l'intensité de ton électrolyseur, par paliers, et vérifie ton taux de sel juste en dessous."
          : `Ton ${dLabel.toLowerCase()} est trop bas : ton eau n'est plus assez protégée contre les algues et les bactéries. Ajoute ${dose ? `${dose.name}, environ ${dose.qty} ${dose.unit}` : `du ${dLabel.toLowerCase()} d'entretien`}, et augmente un peu le temps de filtration aujourd'hui.`,
      });
    } else if (desSt === "haut") {
      steps.push({
        title: `4 · On laisse redescendre ton ${dLabel.toLowerCase()}`,
        color: C.amber,
        text: `Ton ${dLabel.toLowerCase()} est trop haut : arrête tout apport, laisse la filtration et le soleil faire baisser le taux (les UV dégradent le chlore), et reteste avant de te baigner.`,
      });
    }
  } else {
    steps.push({
      title: "4 · Ton désinfectant",
      color: C.textLo,
      text: `Avec ${TREATMENTS.find(t => t.id === profil?.traitement)?.label?.toLowerCase() || "ce traitement"}, le dosage suit surtout la notice du fabricant plutôt qu'une mesure de chlore classique. Continue à surveiller ton pH, ton TAC et la température ci-dessous.`,
    });
  }

  // 5. Stabilisant
  if (stabSt === "haut") {
    steps.push({
      title: "5 · Ton stabilisant est trop élevé",
      color: C.red,
      text: "Au-delà de 75 mg/L, le stabilisant \"verrouille\" ton chlore, qui devient inefficace même en bonne quantité. La seule solution, c'est de diluer en renouvelant une partie de l'eau de ton bassin.",
    });
  } else if (stabSt === "bas" && ["galets", "chlore_choc", "javel9", "javel12_5"].includes(profil?.traitement)) {
    const delta = 40 - Number(m.stabilisant);
    const grams = volume > 0 ? Math.round(volume * 2 * delta) : null;
    steps.push({
      title: "5 · Ton stabilisant est un peu bas",
      color: C.textLo,
      text: `Un peu de stabilisant (acide cyanurique) protégerait ton chlore des UV et ralentirait sa dégradation au soleil${["javel9", "javel12_5"].includes(profil?.traitement) ? " — utile en complément, la javel n'en contenant pas" : ""}. Tu peux en ajouter${grams ? ` environ ${grams} g` : ""}.`,
    });
  }

  // 6. Dureté
  if (thSt === "haut") {
    steps.push({ title: "6 · Ta dureté est élevée", color: C.textLo, text: "Tu risques une eau trouble et des dépôts calcaires sur tes parois et ta ligne d'eau. Un séquestrant de calcaire t'aidera à limiter l'entartrage entre deux vidanges partielles." });
  } else if (thSt === "bas") {
    steps.push({ title: "6 · Ta dureté est faible", color: C.textLo, text: "Ton eau est un peu douce, donc légèrement agressive pour tes équipements et tes joints. Tu peux ajouter un rehausseur de dureté calcique si ça reste bas dans la durée." });
  }

  // 7. Sel
  if (profil?.traitement === "sel" && m.sel !== "" && m.sel != null) {
    const selSt = statusOf(m.sel, RANGES.sel);
    if (selSt !== "ok" && selSt !== "na") {
      steps.push({
        title: "7 · Ton taux de sel",
        color: C.amber,
        text: selSt === "bas"
          ? "Ton taux de sel est trop bas : ton électrolyseur ne peut plus produire assez de chlore. Ajoute du sel spécial piscine par paliers, en le diluant bien avant de retester."
          : "Ton taux de sel est trop haut : tu risques une usure prématurée de la cellule et de la corrosion. Dilue en apportant de l'eau claire.",
      });
    }
  }

  // 8. Redox (ORP) — pour ceux qui ont une sonde/photomètre digital
  if (m.orp !== "" && m.orp != null) {
    const orpSt = statusOf(m.orp, RANGES.orp);
    if (orpSt === "bas") {
      steps.push({
        title: "8 · Ton redox (ORP) est bas",
        color: C.amber,
        text: "En dessous de 650 mV, ton chlore n'est pas assez actif pour bien désinfecter, même si le taux en mg/L te semblait correct. Vérifie ton pH (un pH trop haut réduit fortement l'efficacité du chlore) et envisage un choc si ce n'est pas déjà fait.",
      });
    }
  }

  // 9. TDS — sels dissous, utile avec une sonde digitale pour juger de l'ancienneté de l'eau
  if (m.tds !== "" && m.tds != null) {
    const tdsSt = statusOf(m.tds, RANGES.tds);
    if (tdsSt === "haut") {
      steps.push({
        title: "9 · Ton TDS est élevé",
        color: C.textLo,
        text: `Ton eau accumule beaucoup de sels dissous (résidus de traitements, matières organiques) : c'est le signe d'une eau âgée qui devient plus dure à équilibrer, même avec des dosages corrects.${coutCompare(0.3, "renouveler environ 30 %", profil, volume)}`,
      });
    }
  }

  // 10. Phosphates — la nourriture des algues
  if (m.phosphates !== "" && m.phosphates != null) {
    if (statusOf(m.phosphates, RANGES.phosphates) === "haut") {
      steps.push({
        title: "10 · Tes phosphates sont élevés",
        color: C.textLo,
        text: "Les phosphates nourrissent les algues, même quand le reste de l'eau est bien équilibré. Un traitement anti-phosphates limitera les récidives, surtout si tu as eu des épisodes d'algues répétés cette saison.",
      });
    }
  }

  // 11. Fer
  if (m.fer !== "" && m.fer != null) {
    if (statusOf(m.fer, RANGES.fer) === "haut") {
      steps.push({
        title: "11 · Ton taux de fer est élevé",
        color: C.textLo,
        text: "Au-delà de 0,3 mg/L, le fer risque de précipiter et de laisser des taches rousses sur les parois, surtout après un choc au chlore. Utilise un séquestrant de métaux avant de choquer, et évite de laisser le pH monter (ça favorise le dépôt).",
      });
    }
  }

  // 12. Cuivre
  if (m.cuivre !== "" && m.cuivre != null) {
    if (statusOf(m.cuivre, RANGES.cuivre) === "haut") {
      steps.push({
        title: "12 · Ton taux de cuivre est élevé",
        color: C.textLo,
        text: "Au-delà de 0,2 mg/L, le cuivre peut donner des reflets bleu-vert sur les cheveux clairs et sur les surfaces claires. Un séquestrant de métaux limite ce risque — fréquent avec une eau de forage ou une électrolyse au cuivre.",
      });
    }
  }

  // 13. Turbidité
  if (m.turbidite !== "" && m.turbidite != null) {
    if (statusOf(m.turbidite, RANGES.turbidite) === "haut") {
      steps.push({
        title: "13 · Ta turbidité dépasse 1 NTU",
        color: C.textLo,
        text: `Ton eau perd en limpidité, même si elle te paraît claire à l'œil. Pense à ${filterActionLabel(profil?.typeFiltre)}, vérifie ton temps de filtration, et envisage un floculant si ça persiste.`,
      });
    }
  }

  // Température — conseil, pas une action corrective
  if (tempSt === "haut") {
    steps.push({
      title: "Un point de vigilance sur la température",
      color: C.textLo,
      text: "Au-dessus de 28 °C, les algues et les bactéries se développent plus vite : augmente un peu le temps de filtration quotidien et contrôle ton chlore plus souvent, surtout après une grosse fréquentation.",
    });
  }

  const tempNum = m.temp !== "" && m.temp != null ? Number(m.temp) : null;
  const hivernage = m.usage === "hivernage";

  // Température basse — on l'explique au lieu de demander de la "remonter"
  if (tempSt === "bas" && !hivernage) {
    steps.push({
      title: "À propos de la température",
      color: C.textLo,
      text: tempNum != null && tempNum < 16
        ? `Ton eau à ${tempNum} °C est simplement froide : c'est normal en cette saison, et ce n'est pas un réglage chimique à corriger. Une eau froide freine même les algues. Seuls un chauffage (pompe à chaleur) ou une bâche/un abri pourraient la réchauffer. Si tu ne te baignes plus, indique-le ci-dessus (« Je ne m'en sers plus ») pour avoir les conseils de fin de saison et d'hivernage.`
        : "Ton eau est un peu fraîche pour la baignade (24 à 28 °C, c'est le confort habituel), mais ce n'est pas un problème de qualité d'eau et aucun produit ne la réchauffe. Si tu veux gagner quelques degrés : bâche à bulles la nuit, abri, ou pompe à chaleur.",
    });
  }

  if (hivernage) {
    // En fin de saison : on garde seulement ce qui sert au dernier choc (TAC, pH, chloramines)
    const utiles = etatInfo(m.etatEau).level > 0
      ? steps.filter((s) => /^[123] ·/.test(s.title))
      : [];
    const hiv = buildHivernageSteps(profil, m, volume);
    const [rattrapage, ...reste] = etatInfo(m.etatEau).level > 0 ? hiv : [null, ...hiv];
    const ordered = [rattrapage, ...utiles, ...reste].filter(Boolean);
    const filtrationHiv = tempNum != null ? (tempNum > 15 ? Math.max(4, Math.round(tempNum / 2)) : 3) : null;
    return { visualStep, eventStep, steps: ordered, allOk: false, filtrationH: etatInfo(m.etatEau).level > 0 ? null : filtrationHiv, hivernage: true };
  }

  const filtrationH = tempNum != null ? Math.max(4, Math.round(tempNum / 2)) : null;

  const allOk = [tacSt, phSt, desSt, stabSt, thSt].every((s) => s === "ok" || s === "na") && (combine == null || combine <= 0.5) && (etatInfo(m.etatEau).level === 0);

  return { visualStep, eventStep, steps, allOk, filtrationH, hivernage: false };
}

/* ---------------------------------------------------------------
   UI HELPERS
--------------------------------------------------------------- */
function TitleRow({ children }) {
  return (
    <div className="flex items-baseline justify-between">
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: C.textHi }}>{children}</div>
      <div style={{ fontSize: 9.5, color: C.textLo, letterSpacing: 0.3, whiteSpace: "nowrap", marginLeft: 8 }}>
        By C. Guilhem
      </div>
    </div>
  );
}

function Field({ label, unit, value, onChange, placeholder = "—", step = "0.1" }) {
  return (
    <label className="flex flex-col gap-1">
      <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>{label}{unit ? ` (${unit})` : ""}</span>
      <input
        type="number" inputMode="decimal" step={step} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_MONO, fontSize: 15 }}
      />
    </label>
  );
}

function TrendArrow({ curr, prev }) {
  if (curr == null || prev == null || curr === "" || prev === "") return null;
  const c = Number(curr), p = Number(prev);
  if (c === p) return <Minus size={13} color={C.textLo} />;
  return c > p ? <ArrowUp size={13} color={C.amber} /> : <ArrowDown size={13} color={C.teal} />;
}

/* ---------------------------------------------------------------
   APP
--------------------------------------------------------------- */
export default function PiscinePro() {
  const [ready, setReady] = useState(false);
  const [prenom, setPrenom] = useState(null);
  const [prenomDraft, setPrenomDraft] = useState("");
  const [tab, setTab] = useState("profil");
  const [profil, setProfil] = useState({ nom: "Ma piscine", volume: "", traitement: "galets", produitPhMinus: "poudre", produitPhPlus: "carbonate", prixEau: "", typeBassin: "enterre", structure: "liner", typeFiltre: "sable" });
  const [mesures, setMesures] = useState([]);
  const [draft, setDraft] = useState({
    etatEau: "claire", evenement: "aucun", usage: "baignade", temp: "", ph: "", desinfectant: "", chloreTotal: "", tac: "", stabilisant: "", th: "", sel: "", orp: "", tds: "", phosphates: "", fer: "", cuivre: "", turbidite: "",
  });
  const [expanded, setExpanded] = useState(null);
  const [carnetView, setCarnetView] = useState("liste");
  const [chartParam, setChartParam] = useState("ph");

  useEffect(() => {
    (async () => {
      const pr = await loadPrenom();
      const p = await loadProfil();
      const m = await loadMesures();
      if (pr) setPrenom(pr);
      if (p) setProfil(p);
      setMesures(m);
      if (m[0]?.usage) setDraft((d) => ({ ...d, usage: m[0].usage }));
      setReady(true);
      if (!p || p.volume === "") setTab("profil"); else setTab(m.length ? "diagnostic" : "mesure");
    })();
  }, []);

  async function handleSavePrenom() {
    const name = prenomDraft.trim();
    if (!name) return;
    await savePrenom(name);
    setPrenom(name);
  }

  const dernier = mesures[0] || null;
  const avantDernier = mesures[1] || null;
  const diag = useMemo(() => buildDiagnostic(profil, dernier), [profil, dernier]);
  const dRange = disinfectantRange(profil.traitement);
  const dLabel = disinfectantLabel(profil.traitement);
  const joursDepuisMesure = dernier ? Math.floor((Date.now() - new Date(dernier.date).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const REMINDER_DAYS = 4;

  async function handleSaveProfil() {
    await saveProfil(profil);
    setTab(mesures.length ? "diagnostic" : "mesure");
  }

  async function handleSaveMesure() {
    const entry = { id: Date.now(), date: new Date().toISOString(), ...draft };
    const next = [entry, ...mesures];
    setMesures(next);
    await saveMesures(next);
    setDraft({ etatEau: "claire", evenement: "aucun", usage: entry.usage || "baignade", temp: "", ph: "", desinfectant: "", chloreTotal: "", tac: "", stabilisant: "", th: "", sel: "", orp: "", tds: "", phosphates: "", fer: "", cuivre: "", turbidite: "" });
    setTab("diagnostic");
  }

  async function handleSetUsage(usage) {
    if (!dernier) return;
    const next = mesures.map((m, i) => (i === 0 ? { ...m, usage } : m));
    setMesures(next);
    setDraft((d) => ({ ...d, usage }));
    await saveMesures(next);
  }

  async function handleDelete(id) {
    const next = mesures.filter((m) => m.id !== id);
    setMesures(next);
    await saveMesures(next);
  }

  const tabs = [
    { id: "profil", label: "Profil", icon: Home },
    { id: "mesure", label: "Mesure", icon: Plus },
    { id: "diagnostic", label: "Diagnostic", icon: Activity },
    { id: "carnet", label: "Carnet", icon: BookOpen },
  ];

  if (ready && !prenom) {
    return (
      <div style={{ background: C.ink, minHeight: "100vh", fontFamily: FONT_BODY, color: C.textHi, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Droplet size={26} color={C.teal} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600 }}>Piscine Pro</div>
          <div style={{ fontSize: 10.5, color: C.textLo, letterSpacing: 0.4, marginBottom: 22 }}>By C. Guilhem</div>
          <div style={{ fontSize: 14, color: C.textLo, marginBottom: 16, lineHeight: 1.5 }}>
            Comment dois-je t'appeler, pour te parler de ton eau comme il faut ?
          </div>
          <input
            type="text" value={prenomDraft} placeholder="Ton prénom" autoFocus
            onChange={(e) => setPrenomDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSavePrenom()}
            className="w-full rounded-lg px-3 py-2.5 outline-none text-center"
            style={{ background: C.surface, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 16, marginBottom: 14 }}
          />
          <button onClick={handleSavePrenom}
            style={{ background: C.teal, color: C.ink, fontFamily: FONT_DISPLAY, fontWeight: 600, borderRadius: 12, padding: "12px 0", width: "100%" }}>
            C'est parti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.ink, minHeight: "100vh", fontFamily: FONT_BODY, color: C.textHi, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* HEADER */}
        <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Droplet size={18} color={C.teal} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, letterSpacing: -0.3 }}>Piscine Pro</div>
              <div style={{ fontSize: 10.5, color: C.textLo, letterSpacing: 0.4 }}>By C. Guilhem</div>
            </div>
          </div>
        </div>

        {joursDepuisMesure != null && joursDepuisMesure >= REMINDER_DAYS && (
          <button onClick={() => setTab("mesure")} className="flex items-center gap-2 w-full text-left"
            style={{ padding: "10px 18px", background: C.tealSoft, borderBottom: `1px solid ${C.border}` }}>
            <Info size={14} color={C.teal} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.textHi }}>
              Ça fait {joursDepuisMesure} jours que tu n'as pas testé ton eau, {prenom} — pense à une analyse.
            </span>
          </button>
        )}

        {/* CONTENT */}
        <div style={{ flex: 1, padding: "18px 18px 90px", overflowY: "auto" }}>
          {!ready ? (
            <div style={{ color: C.textLo, textAlign: "center", marginTop: 40 }}>Chargement du carnet…</div>
          ) : tab === "profil" ? (
            <div className="flex flex-col gap-4">
              <TitleRow>Réglages du bassin</TitleRow>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Nom du bassin</span>
                <input type="text" value={profil.nom} placeholder="ex. Piscine, N°3, Piscine du jardin 2"
                  onChange={(e) => setProfil({ ...profil, nom: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 15 }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Volume (m³)</span>
                <input type="number" inputMode="decimal" value={profil.volume} placeholder="ex. 45"
                  onChange={(e) => setProfil({ ...profil, volume: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_MONO, fontSize: 15 }} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Type de bassin</span>
                  <select value={profil.typeBassin} onChange={(e) => setProfil({ ...profil, typeBassin: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 outline-none"
                    style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                    {TYPES_BASSIN.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Structure</span>
                  <select value={profil.structure} onChange={(e) => setProfil({ ...profil, structure: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 outline-none"
                    style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                    {STRUCTURES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Type de filtre</span>
                <select value={profil.typeFiltre} onChange={(e) => setProfil({ ...profil, typeFiltre: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                  {FILTRES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Type de traitement</span>
                <select value={profil.traitement} onChange={(e) => setProfil({ ...profil, traitement: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                  {TREATMENTS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Prix de l'eau chez toi (€/m³)</span>
                <input type="number" inputMode="decimal" step="0.1" value={profil.prixEau} placeholder="ex. 4,50"
                  onChange={(e) => setProfil({ ...profil, prixEau: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_MONO, fontSize: 15 }} />
                <span style={{ fontSize: 11, color: C.textLo }}>Sert à comparer le coût d'une vidange à celui d'un traitement, en cas d'algues installées.</span>
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Produit pour remonter le pH</span>
                <select value={profil.produitPhPlus || "carbonate"} onChange={(e) => setProfil({ ...profil, produitPhPlus: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                  {PHPLUS_PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Produit pour baisser le pH</span>
                <select value={profil.produitPhMinus || "poudre"} onChange={(e) => setProfil({ ...profil, produitPhMinus: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                  {PHMINUS_PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <button onClick={handleSaveProfil}
                style={{ background: C.teal, color: C.ink, fontFamily: FONT_DISPLAY, fontWeight: 600, borderRadius: 12, padding: "12px 0", marginTop: 6 }}>
                Enregistrer le profil
              </button>
              <div className="flex items-start gap-2" style={{ background: C.surface, borderRadius: 12, padding: 12, marginTop: 4 }}>
                <Info size={15} color={C.textLo} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.textLo, lineHeight: 1.5 }}>
                  Le volume sert à estimer les quantités de produit à ajouter. Toutes tes données restent enregistrées sur cet appareil.
                </span>
              </div>
            </div>
          ) : tab === "mesure" ? (
            <div className="flex flex-col gap-4">
              <TitleRow>Nouvelle mesure</TitleRow>
              <div className="flex flex-col gap-1.5">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Coup d'œil sur l'eau, avant les tests</span>
                <div className="flex flex-col gap-1.5">
                  {ETATS_EAU.map((e) => {
                    const active = draft.etatEau === e.id;
                    return (
                      <button key={e.id} onClick={() => setDraft({ ...draft, etatEau: e.id })}
                        className="flex items-center gap-2" style={{
                          padding: "9px 12px", borderRadius: 10, textAlign: "left",
                          background: active ? C.tealSoft : C.surface,
                          border: `1px solid ${active ? C.teal : C.border}`,
                        }}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: e.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: active ? C.textHi : C.textLo }}>{e.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Tu utilises encore la piscine ?</span>
                <div className="grid grid-cols-2 gap-2">
                  {USAGES.map((u) => {
                    const active = draft.usage === u.id;
                    return (
                      <button key={u.id} onClick={() => setDraft({ ...draft, usage: u.id })}
                        style={{ padding: "9px 10px", borderRadius: 10, background: active ? C.tealSoft : C.surface, border: `1px solid ${active ? C.teal : C.border}`, fontSize: 12.5, color: active ? C.textHi : C.textLo }}>
                        {u.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>Un évènement récent ?</span>
                <select value={draft.evenement} onChange={(e) => setDraft({ ...draft, evenement: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: C.ink, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                  {EVENEMENTS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Température" unit="°C" value={draft.temp} onChange={(v) => setDraft({ ...draft, temp: v })} />
                <Field label="pH" value={draft.ph} onChange={(v) => setDraft({ ...draft, ph: v })} step="0.01" />
                {usesDisinfectantField(profil.traitement) && (
                  <>
                    <Field label={dLabel + " libre"} unit="mg/L" value={draft.desinfectant} onChange={(v) => setDraft({ ...draft, desinfectant: v })} />
                    <Field label={dLabel + " total"} unit="mg/L" value={draft.chloreTotal} onChange={(v) => setDraft({ ...draft, chloreTotal: v })} />
                  </>
                )}
                <Field label="TAC" unit="mg/L" value={draft.tac} onChange={(v) => setDraft({ ...draft, tac: v })} step="1" />
                <Field label="Stabilisant" unit="mg/L" value={draft.stabilisant} onChange={(v) => setDraft({ ...draft, stabilisant: v })} step="1" />
                <Field label="Dureté (TH)" unit="mg/L" value={draft.th} onChange={(v) => setDraft({ ...draft, th: v })} step="1" />
                {profil.traitement === "sel" && (
                  <Field label="Sel" unit="g/L" value={draft.sel} onChange={(v) => setDraft({ ...draft, sel: v })} />
                )}
              </div>
              <div className="flex flex-col gap-2" style={{ marginTop: 4 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textLo }}>
                  Avec une sonde, un photomètre ou un kit spécifique (optionnel)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Redox" unit="mV" value={draft.orp} onChange={(v) => setDraft({ ...draft, orp: v })} step="1" />
                  <Field label="TDS" unit="mg/L" value={draft.tds} onChange={(v) => setDraft({ ...draft, tds: v })} step="1" />
                  <Field label="Phosphates" unit="µg/L" value={draft.phosphates} onChange={(v) => setDraft({ ...draft, phosphates: v })} step="10" />
                  <Field label="Turbidité" unit="NTU" value={draft.turbidite} onChange={(v) => setDraft({ ...draft, turbidite: v })} step="0.1" />
                  <Field label="Fer" unit="mg/L" value={draft.fer} onChange={(v) => setDraft({ ...draft, fer: v })} step="0.05" />
                  <Field label="Cuivre" unit="mg/L" value={draft.cuivre} onChange={(v) => setDraft({ ...draft, cuivre: v })} step="0.05" />
                </div>
              </div>
              <button onClick={handleSaveMesure}
                style={{ background: C.teal, color: C.ink, fontFamily: FONT_DISPLAY, fontWeight: 600, borderRadius: 12, padding: "12px 0", marginTop: 4 }}>
                Enregistrer la mesure
              </button>
            </div>
          ) : tab === "diagnostic" ? (
            <div className="flex flex-col gap-5">
              {!dernier ? (
                <div style={{ color: C.textLo, textAlign: "center", marginTop: 30 }}>
                  Aucune mesure enregistrée pour l'instant.<br />Ajoute une première mesure pour obtenir ton diagnostic.
                </div>
              ) : (
                <>
                  <TitleRow>
                    Dernière mesure · {new Date(dernier.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </TitleRow>
                  <div className="flex flex-col gap-1.5">
                    <span style={{ fontSize: 12, color: C.textLo }}>Tu utilises encore la piscine ?</span>
                    <div className="grid grid-cols-2 gap-2">
                      {USAGES.map((u) => {
                        const active = (dernier.usage || "baignade") === u.id;
                        return (
                          <button key={u.id} onClick={() => handleSetUsage(u.id)}
                            style={{ padding: "8px 10px", borderRadius: 10, background: active ? C.tealSoft : C.surface, border: `1px solid ${active ? C.teal : C.border}`, fontSize: 12, color: active ? C.textHi : C.textLo }}>
                            {u.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {diag?.visualStep && (
                    <div style={{ background: C.surface, borderLeft: `3px solid ${diag.visualStep.color}`, borderRadius: 10, padding: 12 }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: diag.visualStep.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: C.textHi }}>{diag.visualStep.title}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: C.textLo, lineHeight: 1.55, whiteSpace: "pre-line" }}>{diag.visualStep.text}</div>
                    </div>
                  )}
                  {diag?.eventStep && (
                    <div style={{ background: C.surface, borderLeft: `3px solid ${diag.eventStep.color}`, borderRadius: 10, padding: 12 }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                        <AlertTriangle size={14} color={diag.eventStep.color} />
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: C.textHi }}>{diag.eventStep.title}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: C.textLo, lineHeight: 1.55, whiteSpace: "pre-line" }}>{diag.eventStep.text}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2" style={{ background: C.surface, borderRadius: 16, padding: 14 }}>
                    <Gauge value={dernier.temp} range={RANGES.temp} label="Temp." size={100} />
                    <Gauge value={dernier.ph} range={RANGES.ph} label="pH" size={100} />
                    <Gauge value={dernier.tac} range={RANGES.tac} label="TAC" size={100} />
                    {usesDisinfectantField(profil.traitement) && (
                      <Gauge value={dernier.desinfectant} range={dRange} label={dLabel} size={100} />
                    )}
                    <Gauge value={dernier.stabilisant} range={RANGES.stabilisant} label="Stabilisant" size={100} />
                    <Gauge value={dernier.th} range={RANGES.th} label="Dureté" size={100} />
                    {profil.traitement === "sel" && <Gauge value={dernier.sel} range={RANGES.sel} label="Sel" size={100} />}
                    {dernier.orp !== "" && dernier.orp != null && <Gauge value={dernier.orp} range={RANGES.orp} label="Redox" size={100} />}
                    {dernier.tds !== "" && dernier.tds != null && <Gauge value={dernier.tds} range={RANGES.tds} label="TDS" size={100} />}
                    {dernier.phosphates !== "" && dernier.phosphates != null && <Gauge value={dernier.phosphates} range={RANGES.phosphates} label="Phosphates" size={100} />}
                    {dernier.turbidite !== "" && dernier.turbidite != null && <Gauge value={dernier.turbidite} range={RANGES.turbidite} label="Turbidité" size={100} />}
                    {dernier.fer !== "" && dernier.fer != null && <Gauge value={dernier.fer} range={RANGES.fer} label="Fer" size={100} />}
                    {dernier.cuivre !== "" && dernier.cuivre != null && <Gauge value={dernier.cuivre} range={RANGES.cuivre} label="Cuivre" size={100} />}
                  </div>

                  {diag?.filtrationH && (
                    <div className="flex items-center gap-2" style={{ background: C.surface, borderRadius: 12, padding: 12 }}>
                      <Timer size={16} color={C.teal} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: C.textLo, lineHeight: 1.5 }}>
                        {diag.hivernage ? (
                          <>Avec ton eau à {dernier.temp} °C, en hivernage actif, environ <strong style={{ color: C.textHi }}>{diag.filtrationH} h</strong> de filtration par jour suffisent{Number(dernier.temp) > 15 ? " tant que l'eau n'est pas descendue sous 15 °C" : ""} — en mode hors-gel s'il gèle. En hivernage passif, la filtration est arrêtée et vidangée.</>
                        ) : (
                          <>Avec ton eau à {dernier.temp} °C, vise environ <strong style={{ color: C.textHi }}>{diag.filtrationH} h</strong> de filtration aujourd'hui (règle température ÷ 2) — idéalement réparties sur les heures les plus chaudes, entre 10 h et 20 h, quand les UV dégradent le plus le chlore.</>
                        )}
                      </span>
                    </div>
                  )}

                  {diag?.allOk ? (
                    <div className="flex items-center gap-2" style={{ background: C.tealSoft, borderRadius: 14, padding: 14 }}>
                      <CheckCircle2 size={20} color={C.teal} />
                      <span style={{ fontSize: 13.5 }}>Bravo {prenom}, ton eau est nickel aujourd'hui : tous les paramètres sont dans la cible. Garde ta filtration habituelle et profite du bassin !</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div style={{ fontSize: 13.5, color: C.textHi, lineHeight: 1.5 }}>
                        {diag.hivernage ? `${prenom}, tu ne te baignes plus : voici quoi faire pour passer l'hiver tranquille, dans l'ordre :` : `Salut ${prenom}, voici comment on remet ton eau au top, dans l'ordre :`}
                      </div>
                      {diag.steps.map((s, i) => (
                        <div key={i} style={{ background: C.surface, borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: 12 }}>
                          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                            {s.color === C.red && <AlertTriangle size={14} color={s.color} />}
                            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: C.textHi }}>{s.title}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: C.textLo, lineHeight: 1.55, whiteSpace: "pre-line" }}>{s.text}</div>
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: C.textLo, fontStyle: "italic", marginTop: 2 }}>
                        Quantités indicatives — vérifie toujours la notice du produit et reteste avant de te baigner.
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2" style={{ background: C.surface, borderRadius: 12, padding: 12 }}>
                    <ShieldAlert size={15} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: C.textLo, lineHeight: 1.5 }}>
                      Rappel sécurité : ne mélange jamais tes produits entre eux (chlore et pH-, javel et acide, floculant et chlore...), stocke-les séparément dans des contenants fermés et étiquetés, hors de portée des enfants, et verse toujours un produit dans l'eau — jamais l'inverse.
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <TitleRow>Carnet de suivi</TitleRow>
              </div>
              {mesures.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={() => setCarnetView("liste")} className="flex items-center gap-1.5"
                    style={{ padding: "6px 12px", borderRadius: 8, background: carnetView === "liste" ? C.tealSoft : C.surface, border: `1px solid ${carnetView === "liste" ? C.teal : C.border}` }}>
                    <List size={13} color={carnetView === "liste" ? C.teal : C.textLo} />
                    <span style={{ fontSize: 12, color: carnetView === "liste" ? C.textHi : C.textLo }}>Liste</span>
                  </button>
                  <button onClick={() => setCarnetView("graphique")} className="flex items-center gap-1.5"
                    style={{ padding: "6px 12px", borderRadius: 8, background: carnetView === "graphique" ? C.tealSoft : C.surface, border: `1px solid ${carnetView === "graphique" ? C.teal : C.border}` }}>
                    <LineChartIcon size={13} color={carnetView === "graphique" ? C.teal : C.textLo} />
                    <span style={{ fontSize: 12, color: carnetView === "graphique" ? C.textHi : C.textLo }}>Graphique</span>
                  </button>
                </div>
              )}
              {mesures.length === 0 ? (
                <div style={{ color: C.textLo, textAlign: "center", marginTop: 30 }}>Aucune mesure enregistrée pour l'instant.</div>
              ) : carnetView === "graphique" ? (
                <div className="flex flex-col gap-3">
                  <select value={chartParam} onChange={(e) => setChartParam(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 outline-none"
                    style={{ background: C.surface, color: C.textHi, border: `1px solid ${C.border}`, fontFamily: FONT_BODY, fontSize: 14 }}>
                    {CHART_PARAMS.map((p) => <option key={p.id} value={p.id}>{p.id === "desinfectant" ? dLabel + " libre" : p.label}</option>)}
                  </select>
                  {mesures.filter((m) => m[chartParam] !== "" && m[chartParam] != null).length < 2 ? (
                    <div style={{ color: C.textLo, textAlign: "center", marginTop: 20, fontSize: 13 }}>
                      Ajoute au moins 2 mesures avec ce paramètre pour voir un graphique.
                    </div>
                  ) : (
                    <div style={{ background: C.surface, borderRadius: 16, padding: "16px 8px 8px", height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mesures.slice().reverse().filter((m) => m[chartParam] !== "" && m[chartParam] != null).map((m) => ({
                          date: new Date(m.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                          value: Number(m[chartParam]),
                        }))}>
                          <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke={C.textLo} fontSize={10} />
                          <YAxis stroke={C.textLo} fontSize={10} width={32} />
                          <Tooltip contentStyle={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.textHi }} />
                          <Line type="monotone" dataKey="value" stroke={C.teal} strokeWidth={2} dot={{ r: 3, fill: C.teal }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                mesures.map((m, idx) => {
                  const prev = mesures[idx + 1];
                  const isOpen = expanded === m.id;
                  return (
                    <div key={m.id} style={{ background: C.surface, borderRadius: 12, overflow: "hidden" }}>
                      <button onClick={() => setExpanded(isOpen ? null : m.id)}
                        className="w-full flex items-center justify-between" style={{ padding: "12px 14px" }}>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-1.5">
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: etatInfo(m.etatEau).color, flexShrink: 0 }} />
                            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13 }}>
                              {new Date(m.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: C.textLo }}>
                            {etatInfo(m.etatEau).label}{m.evenement && m.evenement !== "aucun" ? ` · ${EVENEMENTS.find((e) => e.id === m.evenement)?.label}` : ""} · pH {m.ph || "—"} · TAC {m.tac || "—"}
                          </span>
                        </div>
                        <ChevronRight size={16} color={C.textLo} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {isOpen && (
                        <div style={{ padding: "0 14px 14px" }}>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ["Température", m.temp, prev?.temp, "°C"],
                              ["pH", m.ph, prev?.ph, ""],
                              [dLabel + " libre", m.desinfectant, prev?.desinfectant, "mg/L"],
                              [dLabel + " total", m.chloreTotal, prev?.chloreTotal, "mg/L"],
                              ["TAC", m.tac, prev?.tac, "mg/L"],
                              ["Stabilisant", m.stabilisant, prev?.stabilisant, "mg/L"],
                              ["Dureté", m.th, prev?.th, "mg/L"],
                              ["Sel", m.sel, prev?.sel, "g/L"],
                              ["Redox", m.orp, prev?.orp, "mV"],
                              ["TDS", m.tds, prev?.tds, "mg/L"],
                              ["Phosphates", m.phosphates, prev?.phosphates, "µg/L"],
                              ["Turbidité", m.turbidite, prev?.turbidite, "NTU"],
                              ["Fer", m.fer, prev?.fer, "mg/L"],
                              ["Cuivre", m.cuivre, prev?.cuivre, "mg/L"],
                            ].filter(([, v]) => v !== "" && v != null).map(([label, v, p, unit]) => (
                              <div key={label} className="flex items-center justify-between" style={{ fontSize: 12, padding: "4px 0" }}>
                                <span style={{ color: C.textLo }}>{label}</span>
                                <span className="flex items-center gap-1" style={{ fontFamily: FONT_MONO }}>
                                  {v}{unit} <TrendArrow curr={v} prev={p} />
                                </span>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => handleDelete(m.id)} className="flex items-center gap-1"
                            style={{ marginTop: 10, color: C.red, fontSize: 12 }}>
                            <Trash2 size={13} /> Supprimer cette mesure
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* TAB BAR */}
        <div style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: 480, background: C.surfaceRaised, borderTop: `1px solid ${C.border}`, display: "flex" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center gap-1" style={{ padding: "10px 0 12px" }}>
                <Icon size={19} color={active ? C.teal : C.textLo} />
                <span style={{ fontSize: 10, color: active ? C.teal : C.textLo, fontFamily: FONT_BODY }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
