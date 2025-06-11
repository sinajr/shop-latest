const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("../erviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const filePath = path.join(__dirname, "../public/products.json");
const rawData = fs.readFileSync(filePath, "utf-8");
const products = JSON.parse(rawData);

async function uploadProducts() {
  const batch = db.batch();
  const collectionRef = db.collection("products");

  for (const product of products) {
    if (!product.id) {
      console.warn("⚠️  Skipping product without an ID:", product);
      continue;
    }
    const docRef = collectionRef.doc(product.id);
    batch.set(docRef, product);
    console.log(`📦 Queued: ${product.name}`);
  }

  await batch.commit();
  console.log("✅ All products uploaded successfully.");
}

uploadProducts().catch((error) => {
  console.error("❌ Upload failed:", error);
});
