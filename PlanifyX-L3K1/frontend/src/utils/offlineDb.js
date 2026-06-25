const DB_NAME = "planifyx-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "app_cache";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

function getValue(key) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  });
}

function setValue(key, value) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.put({ key, value });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  });
}

export function mapProductForOffline(product) {
  return {
    id: product.id,
    nom: product.nom,
    categorie: product.categorie || "Autre",
    prix: Number(product.prix_vente_ht || product.prix || 0),
    stock: Math.max(0, Number(product.quantite_stock || product.stock || 0)),
    codeBarres: product.code_barre || product.codeBarres || "",
    tauxTva: Number(product.taux_tva || 0),
    description: product.description || "",
    sousCategorie: product.sous_categorie || "",
    famille: product.famille || "",
    image: product.image || null,
  };
}

export function mapClientForOffline(client) {
  return {
    id: client.id,
    nom_complet: client.nom_complet || "",
    email: client.email || "",
    telephone: client.telephone || "",
    points_fidelite: Number(client.points_fidelite || 0),
    total_achats: Number(client.total_achats || 0),
    panier_moyen: Number(client.panier_moyen || 0),
  };
}

export async function saveOfflineProducts(products) {
  await setValue("products", products);
}

export async function getOfflineProducts() {
  return (await getValue("products")) || [];
}

export async function hasOfflineProducts() {
  const products = await getOfflineProducts();
  return products.length > 0;
}

export async function saveOfflineClients(clients) {
  await setValue("clients", clients);
}

export async function getOfflineClients() {
  return (await getValue("clients")) || [];
}

export async function hasOfflineClients() {
  const clients = await getOfflineClients();
  return clients.length > 0;
}

export async function getOfflineSales() {
  return (await getValue("sales_queue")) || [];
}

export async function getOfflineSaleById(localId) {
  const sales = await getOfflineSales();
  return sales.find((sale) => sale.localId === localId) || null;
}

export async function saveOfflineSale(salePayload) {
  const sales = await getOfflineSales();

  const newSale = {
    localId:
      window.crypto?.randomUUID?.() ||
      `offline-sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    ...salePayload,
  };

  sales.push(newSale);

  await setValue("sales_queue", sales);
  return newSale;
}

export async function replaceOfflineSales(sales) {
  await setValue("sales_queue", sales);
}

export async function deleteOfflineSale(localId) {
  const sales = await getOfflineSales();
  const updatedSales = sales.filter((sale) => sale.localId !== localId);

  await replaceOfflineSales(updatedSales);
}

export async function clearOfflineSales() {
  await setValue("sales_queue", []);
}

export async function updateOfflineProductStocksFromSale(items) {
  const products = await getOfflineProducts();

  const updatedProducts = products.map((product) => {
    const soldItem = items.find((item) => item.id === product.id);

    if (!soldItem) return product;

    return {
      ...product,
      stock: Math.max(0, Number(product.stock || 0) - Number(soldItem.quantite || 0)),
    };
  });

  await saveOfflineProducts(updatedProducts);
}