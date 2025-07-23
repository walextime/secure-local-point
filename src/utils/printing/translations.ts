
import { PrintLanguages } from './types';

export const translations: PrintLanguages = {
  en: {
    errors: {
      saleNotFound: "Sale not found",
      storeInfoNotFound: "Store information not found",
      printWindowBlocked: "Could not open print window. Please check if pop-ups are blocked."
    },
    printTitle: "Print Receipt #",
    viewTitle: "Receipt #"
  },
  fr: {
    errors: {
      saleNotFound: "Vente non trouvée",
      storeInfoNotFound: "Informations du magasin non trouvées",
      printWindowBlocked: "Impossible d'ouvrir la fenêtre d'impression. Veuillez vérifier si les pop-ups sont bloqués."
    },
    printTitle: "Imprimer Reçu #",
    viewTitle: "Reçu #"
  }
};
